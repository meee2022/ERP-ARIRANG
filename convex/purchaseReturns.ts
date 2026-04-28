import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  validatePeriodOpen,
  generateDocumentNumber,
  postJournalEntry,
  reverseJournalEntry,
  updateStockBalance,
  JournalLineInput,
} from "./lib/posting";
import { assertUserPermission, assertUserBranch } from "./lib/permissions";
import { logAudit } from "./lib/audit";
import { assertPeriodOpen } from "./lib/fiscalControl";

// ─── CREATE PURCHASE RETURN ───────────────────────────────────────────────────

export const createPurchaseReturn = mutation({
  args: {
    companyId: v.id("companies"),
    branchId: v.id("branches"),
    originalInvoiceId: v.id("purchaseInvoices"),
    supplierId: v.id("suppliers"),
    returnDate: v.string(),
    reason: v.optional(v.string()),
    currencyId: v.id("currencies"),
    periodId: v.id("accountingPeriods"),
    createdBy: v.id("users"),
    warehouseId: v.optional(v.id("warehouses")),
    lines: v.array(
      v.object({
        itemId: v.optional(v.id("items")),
        quantity: v.number(),
        unitPrice: v.number(),
        uomId: v.optional(v.id("unitOfMeasure")),
        accountId: v.id("accounts"),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Permission check
    const user = await assertUserPermission(ctx, args.createdBy, "purchases", "create");
    assertUserBranch(user, args.branchId);

    if (args.lines.length === 0) {
      throw new Error("يجب إضافة صنف واحد على الأقل في المرتجع");
    }

    // Validate original invoice exists and is posted
    const originalInvoice = await ctx.db.get(args.originalInvoiceId);
    if (!originalInvoice) throw new Error("فاتورة الشراء الأصلية غير موجودة");
    if (originalInvoice.postingStatus !== "posted") {
      throw new Error("يمكن إنشاء مرتجع للفواتير المرحلة فقط");
    }

    await validatePeriodOpen(ctx, args.periodId);

    // Validate quantities vs original invoice lines
    const originalLines = await ctx.db
      .query("purchaseInvoiceLines")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.originalInvoiceId))
      .collect();

    for (const line of args.lines) {
      if (line.quantity <= 0) throw new Error("الكمية المرتجعة يجب أن تكون أكبر من الصفر");
    }

    // Generate return number
    const fiscalYear = await ctx.db
      .query("fiscalYears")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .filter((q) => q.eq(q.field("status"), "open"))
      .first();

    let returnNumber = `PR-${Date.now()}`;
    if (fiscalYear) {
      returnNumber = await generateDocumentNumber(ctx, args.branchId, fiscalYear._id, "PR");
    }

    // Calculate totals
    let grandTotal = 0;
    const processedLines = args.lines.map((line) => {
      const lineTotal = Math.round(line.quantity * line.unitPrice);
      grandTotal += lineTotal;
      return { ...line, lineTotal };
    });

    // Insert purchaseReturn
    const returnId = await ctx.db.insert("purchaseReturns", {
      companyId: args.companyId,
      branchId: args.branchId,
      returnNumber,
      originalInvoiceId: args.originalInvoiceId,
      supplierId: args.supplierId,
      returnDate: args.returnDate,
      periodId: args.periodId,
      warehouseId: args.warehouseId,
      currencyId: args.currencyId,
      exchangeRate: 1,
      vatAmount: 0,
      totalAmount: grandTotal,
      documentStatus: "draft",
      postingStatus: "unposted",
      notes: args.reason,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });

    // Insert purchaseReturnLines
    for (const line of processedLines) {
      await ctx.db.insert("purchaseReturnLines", {
        returnId,
        itemId: line.itemId,
        quantity: line.quantity,
        uomId: line.uomId,
        unitCost: line.unitPrice,
        lineTotal: line.lineTotal,
        accountId: line.accountId,
      });
    }

    await logAudit(ctx, {
      companyId: args.companyId,
      userId: args.createdBy,
      action: "create",
      module: "purchases",
      documentType: "purchaseReturn",
      documentId: String(returnId),
    });

    return { returnId, returnNumber };
  },
});

// ─── POST PURCHASE RETURN ─────────────────────────────────────────────────────

export const postPurchaseReturn = mutation({
  args: {
    returnId: v.id("purchaseReturns"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const ret = await ctx.db.get(args.returnId);
    if (!ret) throw new Error("المرتجع غير موجود");

    // Permission check
    const user = await assertUserPermission(ctx, args.userId, "purchases", "post");
    assertUserBranch(user, ret.branchId);

    if (ret.postingStatus === "posted") throw new Error("المرتجع مرحّل مسبقاً");
    if (ret.postingStatus === "reversed") throw new Error("لا يمكن ترحيل مرتجع معكوس");
    if (ret.documentStatus === "cancelled") throw new Error("لا يمكن ترحيل مرتجع ملغى");

    await validatePeriodOpen(ctx, ret.periodId);
    await assertPeriodOpen(ctx, ret.returnDate, ret.companyId);

    const lines = await ctx.db
      .query("purchaseReturnLines")
      .withIndex("by_return", (q) => q.eq("returnId", args.returnId))
      .collect();

    if (lines.length === 0) throw new Error("لا توجد أصناف في المرتجع");

    // Resolve COGS/Purchases account (5101)
    const cogsAccount = await ctx.db
      .query("accounts")
      .withIndex("by_company_code", (q) =>
        q.eq("companyId", ret.companyId).eq("code", "5101")
      )
      .first();
    if (!cogsAccount) {
      throw new Error("لم يُعثر على حساب المشتريات/التكلفة (كود 5101). أضفه في دليل الحسابات.");
    }

    // Resolve Supplier account
    const supplier = await ctx.db.get(ret.supplierId);
    if (!supplier) throw new Error("المورد غير موجود");
    const supplierAccountId = supplier.accountId;

    // Purchase Return Journal:
    // DEBIT: Supplier Account — reversing the original credit (AP)
    // CREDIT: COGS/Purchases (5101) — reversing the original debit
    const journalLines: JournalLineInput[] = [
      {
        accountId: supplierAccountId,
        subAccountType: "supplier",
        subAccountId: String(ret.supplierId),
        description: `مرتجع مشتريات - ${ret.returnNumber}`,
        debit: ret.totalAmount,
        credit: 0,
        foreignDebit: 0,
        foreignCredit: 0,
      },
      {
        accountId: cogsAccount._id,
        description: `مرتجع مشتريات - ${ret.returnNumber}`,
        debit: 0,
        credit: ret.totalAmount,
        foreignDebit: 0,
        foreignCredit: 0,
      },
    ];

    const journalEntryId = await postJournalEntry(
      ctx,
      {
        companyId: ret.companyId,
        branchId: ret.branchId,
        journalType: "auto_purchase",
        entryDate: ret.returnDate,
        periodId: ret.periodId,
        currencyId: ret.currencyId,
        exchangeRate: ret.exchangeRate,
        sourceType: "purchaseReturn",
        sourceId: ret._id,
        description: `مرتجع مشتريات ${ret.returnNumber}`,
        isAutoGenerated: true,
        createdBy: args.userId,
      },
      journalLines
    );

    // Inventory movement: items going OUT back to supplier (negative quantity)
    if (ret.warehouseId) {
      const movementId = await ctx.db.insert("inventoryMovements", {
        companyId: ret.companyId,
        branchId: ret.branchId,
        movementNumber: `IM-${ret.returnNumber}`,
        movementType: "purchase_return",
        movementDate: ret.returnDate,
        periodId: ret.periodId,
        warehouseId: ret.warehouseId,
        sourceType: "purchaseReturn",
        sourceId: ret._id,
        documentStatus: "confirmed",
        postingStatus: "posted",
        journalEntryId,
        createdBy: args.userId,
        createdAt: Date.now(),
      });

      for (const line of lines) {
        if (line.itemId && line.uomId) {
          const stockUpdate = await updateStockBalance(
            ctx,
            line.itemId,
            ret.warehouseId,
            -line.quantity, // negative = items going OUT back to supplier
            line.unitCost,
            "purchase_return"
          );

          await ctx.db.insert("inventoryMovementLines", {
            movementId,
            itemId: line.itemId,
            quantity: line.quantity,
            uomId: line.uomId,
            unitCost: line.unitCost,
            totalCost: line.lineTotal,
            qtyBefore: stockUpdate.qtyBefore,
            qtyAfter: stockUpdate.qtyAfter,
            avgCostBefore: stockUpdate.avgCostBefore,
            avgCostAfter: stockUpdate.avgCostAfter,
          });
        }
      }
    }

    // Mark return as posted
    await ctx.db.patch(args.returnId, {
      postingStatus: "posted",
      journalEntryId,
      documentStatus: "approved",
      postedBy: args.userId,
      postedAt: Date.now(),
    });

    await logAudit(ctx, {
      companyId: ret.companyId,
      userId: args.userId,
      action: "post",
      module: "purchases",
      documentType: "purchaseReturn",
      documentId: String(args.returnId),
    });

    return { success: true, journalEntryId };
  },
});

// ─── REVERSE PURCHASE RETURN ──────────────────────────────────────────────────

export const reversePurchaseReturn = mutation({
  args: {
    returnId: v.id("purchaseReturns"),
    userId: v.id("users"),
    reversalDate: v.string(),
    reversalPeriodId: v.id("accountingPeriods"),
  },
  handler: async (ctx, args) => {
    const ret = await ctx.db.get(args.returnId);
    if (!ret) throw new Error("مرتجع المشتريات غير موجود");
    if (ret.postingStatus !== "posted") throw new Error("يمكن عكس المرتجعات المرحّلة فقط");
    if (!ret.journalEntryId) throw new Error("لا يوجد قيد محاسبي مرتبط");

    await assertUserPermission(ctx, args.userId, "purchases", "post");
    await validatePeriodOpen(ctx, args.reversalPeriodId);

    // Reverse journal entry
    await reverseJournalEntry(ctx, ret.journalEntryId, args.reversalDate, args.reversalPeriodId, args.userId);

    // Reverse inventory: items that left warehouse (went back to supplier) now return in
    if (ret.warehouseId) {
      const lines = await ctx.db
        .query("purchaseReturnLines")
        .withIndex("by_return", (q) => q.eq("returnId", args.returnId))
        .collect();

      for (const line of lines) {
        if (line.itemId && line.uomId) {
          await updateStockBalance(ctx, line.itemId, ret.warehouseId, line.quantity, line.unitCost, "purchase_return_reversal");
        }
      }
    }

    await ctx.db.patch(args.returnId, { postingStatus: "reversed" });

    await logAudit(ctx, {
      companyId: ret.companyId,
      userId: args.userId,
      action: "reverse",
      module: "purchases",
      documentType: "purchaseReturn",
      documentId: String(args.returnId),
    });

    return { success: true };
  },
});

// ─── LIST PURCHASE RETURNS ────────────────────────────────────────────────────

export const listPurchaseReturns = query({
  args: {
    companyId: v.id("companies"),
    branchId: v.optional(v.id("branches")),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let returns = await ctx.db
      .query("purchaseReturns")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .order("desc")
      .take(200);

    if (args.branchId) {
      returns = returns.filter((r) => r.branchId === args.branchId);
    }
    if (args.fromDate) {
      returns = returns.filter((r) => r.returnDate >= args.fromDate!);
    }
    if (args.toDate) {
      returns = returns.filter((r) => r.returnDate <= args.toDate!);
    }

    return Promise.all(
      returns.map(async (ret) => {
        const supplier = await ctx.db.get(ret.supplierId);
        const originalInvoice = ret.originalInvoiceId
          ? await ctx.db.get(ret.originalInvoiceId)
          : null;
        return {
          ...ret,
          supplierName: supplier?.nameAr ?? "—",
          originalInvoiceNumber: originalInvoice?.invoiceNumber ?? "—",
        };
      })
    );
  },
});

// ─── GET PURCHASE RETURN ──────────────────────────────────────────────────────

export const getPurchaseReturn = query({
  args: { returnId: v.id("purchaseReturns") },
  handler: async (ctx, args) => {
    const ret = await ctx.db.get(args.returnId);
    if (!ret) return null;

    const lines = await ctx.db
      .query("purchaseReturnLines")
      .withIndex("by_return", (q) => q.eq("returnId", args.returnId))
      .collect();

    const enrichedLines = await Promise.all(
      lines.map(async (line) => {
        const item = line.itemId ? await ctx.db.get(line.itemId) : null;
        return { ...line, itemNameAr: (item as any)?.nameAr ?? "", itemNameEn: (item as any)?.nameEn ?? "", itemCode: (item as any)?.code ?? "" };
      })
    );

    const supplier        = await ctx.db.get(ret.supplierId);
    const originalInvoice = ret.originalInvoiceId ? await ctx.db.get(ret.originalInvoiceId) : null;
    const company         = await ctx.db.get(ret.companyId);
    const branch          = ret.branchId ? await ctx.db.get(ret.branchId) : null;

    return {
      ...ret,
      lines: enrichedLines,
      supplierNameAr:  (supplier as any)?.nameAr ?? "",
      supplierNameEn:  (supplier as any)?.nameEn ?? "",
      supplierAddress: (supplier as any)?.address ?? "",
      originalInvoiceNumber: (originalInvoice as any)?.invoiceNumber ?? null,
      originalInvoiceDate:   (originalInvoice as any)?.invoiceDate   ?? null,
      companyNameAr:   (company as any)?.nameAr ?? "",
      companyNameEn:   (company as any)?.nameEn ?? "",
      companyAddress:  (company as any)?.address ?? "",
      companyVatNumber:(company as any)?.taxNumber ?? "",
      branchNameAr:    (branch as any)?.nameAr ?? "",
      branchNameEn:    (branch as any)?.nameEn ?? "",
    };
  },
});

// ─── GET POSTED PURCHASE INVOICES (for return creation dropdown) ──────────────

export const getPostedPurchaseInvoices = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const invoices = await ctx.db
      .query("purchaseInvoices")
      .filter((q) =>
        q.and(
          q.eq(q.field("companyId"), args.companyId),
          q.eq(q.field("postingStatus"), "posted")
        )
      )
      .order("desc")
      .take(200);

    return Promise.all(
      invoices.map(async (inv) => {
        const supplier = await ctx.db.get(inv.supplierId);
        return {
          ...inv,
          supplierName: supplier?.nameAr ?? "—",
        };
      })
    );
  },
});

// ─── GET PURCHASE INVOICE LINES (for return form) ─────────────────────────────

export const getPurchaseInvoiceLines = query({
  args: { invoiceId: v.id("purchaseInvoices") },
  handler: async (ctx, args) => {
    const lines = await ctx.db
      .query("purchaseInvoiceLines")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    return Promise.all(
      lines.map(async (line) => {
        const item = line.itemId ? await ctx.db.get(line.itemId) : null;
        const account = await ctx.db.get(line.accountId);
        return { ...line, item, account };
      })
    );
  },
});
