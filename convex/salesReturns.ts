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

// ─── CREATE SALES RETURN ──────────────────────────────────────────────────────

export const createSalesReturn = mutation({
  args: {
    companyId: v.id("companies"),
    branchId: v.id("branches"),
    originalInvoiceId: v.id("salesInvoices"),
    customerId: v.id("customers"),
    customerOutletId: v.optional(v.id("customerOutlets")),
    returnDate: v.string(),
    reason: v.optional(v.string()),
    currencyId: v.id("currencies"),
    periodId: v.id("accountingPeriods"),
    createdBy: v.id("users"),
    warehouseId: v.id("warehouses"),
    lines: v.array(
      v.object({
        itemId: v.id("items"),
        originalLineId: v.optional(v.id("salesInvoiceLines")),
        quantity: v.number(),
        unitPrice: v.number(),
        uomId: v.id("unitOfMeasure"),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Permission check
    const user = await assertUserPermission(ctx, args.createdBy, "sales", "create");
    assertUserBranch(user, args.branchId);

    if (args.lines.length === 0) {
      throw new Error("يجب إضافة صنف واحد على الأقل في المرتجع");
    }

    // Validate original invoice exists and is posted
    const originalInvoice = await ctx.db.get(args.originalInvoiceId);
    if (!originalInvoice) throw new Error("الفاتورة الأصلية غير موجودة");
    if (originalInvoice.postingStatus !== "posted") {
      throw new Error("يمكن إنشاء مرتجع للفواتير المرحلة فقط");
    }

    await validatePeriodOpen(ctx, args.periodId);

    // Validate return quantities vs original invoice lines
    const originalLines = await ctx.db
      .query("salesInvoiceLines")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.originalInvoiceId))
      .collect();

    for (const line of args.lines) {
      if (line.quantity <= 0) throw new Error("الكمية المرتجعة يجب أن تكون أكبر من الصفر");
      if (line.originalLineId) {
        const origLine = originalLines.find((ol) => ol._id === line.originalLineId);
        if (origLine && line.quantity > origLine.quantity) {
          throw new Error(`الكمية المرتجعة (${line.quantity}) تتجاوز الكمية الأصلية (${origLine.quantity})`);
        }
      }
    }

    // Generate return number
    const fiscalYear = await ctx.db
      .query("fiscalYears")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .filter((q) => q.eq(q.field("status"), "open"))
      .first();

    let returnNumber = `SR-${Date.now()}`;
    if (fiscalYear) {
      returnNumber = await generateDocumentNumber(ctx, args.branchId, fiscalYear._id, "SR");
    }

    // Calculate totals + fetch unitCost from original invoice lines
    let grandTotal = 0;
    const processedLines: Array<typeof args.lines[0] & {
      lineTotal: number; unitCost: number;
    }> = [];

    for (const line of args.lines) {
      const lineTotal = Math.round(line.quantity * line.unitPrice);
      grandTotal += lineTotal;

      // Get actual cost from original invoice line (set during posting)
      let unitCost = 0;
      if (line.originalLineId) {
        const origLine = await ctx.db.get(line.originalLineId as any);
        unitCost = (origLine as any)?.unitCost ?? 0;
      }
      // Fallback: current average cost from stockBalance
      if (unitCost === 0) {
        const stock = await ctx.db
          .query("stockBalance")
          .withIndex("by_item_warehouse", (q: any) => q.eq("itemId", line.itemId))
          .first();
        unitCost = (stock as any)?.avgCost ?? 0;
      }

      processedLines.push({ ...line, lineTotal, unitCost });
    }

    // Insert salesReturn
    const returnId = await ctx.db.insert("salesReturns", {
      companyId: args.companyId,
      branchId: args.branchId,
      returnNumber,
      originalInvoiceId: args.originalInvoiceId,
      returnDate: args.returnDate,
      periodId: args.periodId,
      customerId: args.customerId,
      customerOutletId: args.customerOutletId,
      currencyId: args.currencyId,
      exchangeRate: 1,
      warehouseId: args.warehouseId,
      returnReason: args.reason,
      subtotal: grandTotal,
      vatAmount: 0,
      totalAmount: grandTotal,
      refundMethod: "credit_note",
      documentStatus: "draft",
      postingStatus: "unposted",
      notes: args.reason,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });

    // Insert salesReturnLines with correct unitCost
    for (const line of processedLines) {
      await ctx.db.insert("salesReturnLines", {
        returnId,
        originalLineId: line.originalLineId,
        itemId: line.itemId,
        quantity: line.quantity,
        uomId: line.uomId,
        unitPrice: line.unitPrice,
        vatRate: 0,
        vatAmount: 0,
        lineTotal: line.lineTotal,
        unitCost: line.unitCost,   // ✅ real cost, not 0
      });
    }

    await logAudit(ctx, {
      companyId: args.companyId,
      userId: args.createdBy,
      action: "create",
      module: "sales",
      documentType: "salesReturn",
      documentId: String(returnId),
    });

    return { returnId, returnNumber };
  },
});

// ─── POST SALES RETURN ────────────────────────────────────────────────────────

export const postSalesReturn = mutation({
  args: {
    returnId: v.id("salesReturns"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const ret = await ctx.db.get(args.returnId);
    if (!ret) throw new Error("المرتجع غير موجود");

    // Permission check
    const user = await assertUserPermission(ctx, args.userId, "sales", "post");
    assertUserBranch(user, ret.branchId);

    if (ret.postingStatus === "posted") throw new Error("المرتجع مرحّل مسبقاً");
    if (ret.postingStatus === "reversed") throw new Error("لا يمكن ترحيل مرتجع معكوس");
    if (ret.documentStatus === "cancelled") throw new Error("لا يمكن ترحيل مرتجع ملغى");

    await validatePeriodOpen(ctx, ret.periodId);
    await assertPeriodOpen(ctx, ret.returnDate, ret.companyId);

    const lines = await ctx.db
      .query("salesReturnLines")
      .withIndex("by_return", (q) => q.eq("returnId", args.returnId))
      .collect();

    if (lines.length === 0) throw new Error("لا توجد أصناف في المرتجع");

    // Resolve Sales Revenue account: posting rules → account type → common codes
    const postingRulesRet = await ctx.db
      .query("postingRules")
      .withIndex("by_company", (q) => q.eq("companyId", ret.companyId))
      .first();

    let revenueAccount: any = postingRulesRet?.defaultRevenueAccountId
      ? await ctx.db.get(postingRulesRet.defaultRevenueAccountId)
      : null;

    if (!revenueAccount) {
      revenueAccount = await ctx.db
        .query("accounts")
        .withIndex("by_company_type", (q) =>
          q.eq("companyId", ret.companyId).eq("accountType", "income")
        )
        .filter((q) => q.and(q.eq(q.field("isPostable"), true), q.eq(q.field("isActive"), true)))
        .first();
    }

    if (!revenueAccount) throw new Error("لم يُعثر على حساب إيرادات المبيعات. يرجى ضبط قواعد الترحيل من إعدادات الترحيل.");

    // Resolve Customer account
    const customer = await ctx.db.get(ret.customerId!);
    if (!customer) throw new Error("العميل غير موجود");
    const customerAccountId = customer.accountId;

    // Sales Return Journal:
    // DEBIT:  Revenue (per-line account) — reversing the original credit
    // CREDIT: Customer Account (AR)      — reducing what customer owes
    // DEBIT:  Inventory account          — items come back to stock at cost
    // CREDIT: COGS account               — reversing the original COGS

    // Build per-line revenue reversal (use original invoice line accounts where available)
    const journalLines: JournalLineInput[] = [];
    let totalRevenueReversed = 0;
    let totalCOGSReversed    = 0;

    for (const line of lines) {
      const lineNet = line.lineTotal - line.vatAmount;

      // Resolve revenue account: prefer original line's account, else fall back to 4101
      let lineRevenueAccountId = revenueAccount._id;
      if (line.originalLineId) {
        const origLine = await ctx.db.get(line.originalLineId as any);
        if ((origLine as any)?.revenueAccountId) {
          lineRevenueAccountId = (origLine as any).revenueAccountId;
        }
      }

      if (lineNet > 0) {
        journalLines.push({
          accountId: lineRevenueAccountId,
          description: `عكس إيراد - ${ret.returnNumber}`,
          debit: lineNet,
          credit: 0,
          foreignDebit: 0,
          foreignCredit: 0,
        });
        totalRevenueReversed += lineNet;
      }

      // COGS reversal: Dr. Inventory / Cr. COGS
      const costAmount = Math.round(line.unitCost * line.quantity);
      if (costAmount > 0) {
        const item = await ctx.db.get(line.itemId);

        // Resolve COGS account: original line → item
        let cogsAccountId: any = null;
        if (line.originalLineId) {
          const origLine = await ctx.db.get(line.originalLineId as any);
          cogsAccountId = (origLine as any)?.cogsAccountId ?? null;
        }
        if (!cogsAccountId) cogsAccountId = (item as any)?.cogsAccountId ?? null;

        const inventoryAccountId = (item as any)?.inventoryAccountId ?? null;

        if (inventoryAccountId && cogsAccountId) {
          // Dr. Inventory (items physically returned to warehouse)
          journalLines.push({
            accountId: inventoryAccountId,
            description: `مخزون مرتجع - ${ret.returnNumber}`,
            debit: costAmount,
            credit: 0,
            foreignDebit: 0,
            foreignCredit: 0,
          });
          // Cr. COGS (reverse the cost that was expensed on sale)
          journalLines.push({
            accountId: cogsAccountId,
            description: `عكس تكلفة مبيعات - ${ret.returnNumber}`,
            debit: 0,
            credit: costAmount,
            foreignDebit: 0,
            foreignCredit: 0,
          });
          totalCOGSReversed += costAmount;
        }
      }
    }

    // VAT reversal (if any)
    if (ret.vatAmount > 0) {
      // TODO: add VAT payable reversal when VAT is applicable
    }

    // CR: Customer AR — total amount returned (net + VAT)
    journalLines.push({
      accountId: customerAccountId,
      subAccountType: "customer",
      subAccountId: String(ret.customerId),
      description: `مرتجع مبيعات - ${ret.returnNumber}`,
      debit: 0,
      credit: ret.totalAmount,
      foreignDebit: 0,
      foreignCredit: 0,
    });

    const journalEntryId = await postJournalEntry(
      ctx,
      {
        companyId: ret.companyId,
        branchId: ret.branchId,
        journalType: "auto_sales",
        entryDate: ret.returnDate,
        periodId: ret.periodId,
        currencyId: ret.currencyId,
        exchangeRate: ret.exchangeRate,
        sourceType: "salesReturn",
        sourceId: ret._id,
        description: `مرتجع مبيعات ${ret.returnNumber}`,
        isAutoGenerated: true,
        createdBy: args.userId,
      },
      journalLines
    );

    // Inventory movement: items coming BACK to warehouse (positive quantity)
    const movementId = await ctx.db.insert("inventoryMovements", {
      companyId: ret.companyId,
      branchId: ret.branchId,
      movementNumber: `IM-${ret.returnNumber}`,
      movementType: "sales_return",
      movementDate: ret.returnDate,
      periodId: ret.periodId,
      warehouseId: ret.warehouseId,
      sourceType: "salesReturn",
      sourceId: ret._id,
      documentStatus: "confirmed",
      postingStatus: "posted",
      journalEntryId,
      createdBy: args.userId,
      createdAt: Date.now(),
    });

    for (const line of lines) {
      // Items return to warehouse — positive quantity change, at COST (not selling price)
      const stockUpdate = await updateStockBalance(
        ctx,
        line.itemId,
        ret.warehouseId,
        line.quantity, // positive = items coming back
        line.unitCost, // ✅ cost price, not selling price
        "sales_return"
      );

      await ctx.db.insert("inventoryMovementLines", {
        movementId,
        itemId: line.itemId,
        quantity: line.quantity,
        uomId: line.uomId,
        unitCost: line.unitPrice,
        totalCost: line.lineTotal,
        qtyBefore: stockUpdate.qtyBefore,
        qtyAfter: stockUpdate.qtyAfter,
        avgCostBefore: stockUpdate.avgCostBefore,
        avgCostAfter: stockUpdate.avgCostAfter,
      });
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
      module: "sales",
      documentType: "salesReturn",
      documentId: String(args.returnId),
    });

    return { success: true, journalEntryId };
  },
});

// ─── REVERSE SALES RETURN ─────────────────────────────────────────────────────

export const reverseSalesReturn = mutation({
  args: {
    returnId: v.id("salesReturns"),
    userId: v.id("users"),
    reversalDate: v.string(),
    reversalPeriodId: v.id("accountingPeriods"),
  },
  handler: async (ctx, args) => {
    const ret = await ctx.db.get(args.returnId);
    if (!ret) throw new Error("مرتجع المبيعات غير موجود");
    if (ret.postingStatus !== "posted") throw new Error("يمكن عكس المرتجعات المرحّلة فقط");
    if (!ret.journalEntryId) throw new Error("لا يوجد قيد محاسبي مرتبط");

    await assertUserPermission(ctx, args.userId, "sales", "post");
    await validatePeriodOpen(ctx, args.reversalPeriodId);

    // Reverse journal entry
    await reverseJournalEntry(ctx, ret.journalEntryId, args.reversalDate, args.reversalPeriodId, args.userId);

    // Reverse inventory: items that came back to warehouse now go out again
    const lines = await ctx.db
      .query("salesReturnLines")
      .withIndex("by_return", (q) => q.eq("returnId", args.returnId))
      .collect();

    for (const line of lines) {
      await updateStockBalance(ctx, line.itemId, ret.warehouseId, -line.quantity, line.unitCost, "sales_return_reversal");
    }

    await ctx.db.patch(args.returnId, { postingStatus: "reversed" });

    await logAudit(ctx, {
      companyId: ret.companyId,
      userId: args.userId,
      action: "reverse",
      module: "sales",
      documentType: "salesReturn",
      documentId: String(args.returnId),
    });

    return { success: true };
  },
});

// ─── LIST SALES RETURNS ───────────────────────────────────────────────────────

export const listSalesReturns = query({
  args: {
    companyId: v.id("companies"),
    branchId: v.optional(v.id("branches")),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let returns = await ctx.db
      .query("salesReturns")
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
        const customer        = ret.customerId        ? await ctx.db.get(ret.customerId)        : null;
        const originalInvoice = ret.originalInvoiceId ? await ctx.db.get(ret.originalInvoiceId) : null;
        const company         = await ctx.db.get(ret.companyId);
        const branch          = ret.branchId ? await ctx.db.get(ret.branchId) : null;
        const createdByUser   = ret.createdBy ? await ctx.db.get(ret.createdBy as any) : null;
        const receivedByUser  = (ret as any).receivedBy ? await ctx.db.get((ret as any).receivedBy) : null;

        return {
          ...ret,
          customerName:          (customer as any)?.nameAr ?? (customer as any)?.nameEn ?? "—",
          customerCode:          (customer as any)?.code ?? "—",
          originalInvoiceNumber: (originalInvoice as any)?.invoiceNumber ?? "—",
          originalInvoiceDate:   (originalInvoice as any)?.invoiceDate   ?? null,
          companyNameAr:         (company as any)?.nameAr ?? "",
          companyNameEn:         (company as any)?.nameEn ?? "",
          branchNameAr:          (branch as any)?.nameAr ?? "",
          branchNameEn:          (branch as any)?.nameEn ?? "",
          createdByName:         (createdByUser as any)?.name ?? "—",
          receivedByName:        (receivedByUser as any)?.name ?? null,
        };
      })
    );
  },
});

// ─── GET SALES RETURN ─────────────────────────────────────────────────────────

export const getSalesReturn = query({
  args: { returnId: v.id("salesReturns") },
  handler: async (ctx, args) => {
    const ret = await ctx.db.get(args.returnId);
    if (!ret) return null;

    const lines = await ctx.db
      .query("salesReturnLines")
      .withIndex("by_return", (q) => q.eq("returnId", args.returnId))
      .collect();

    const enrichedLines = await Promise.all(
      lines.map(async (line) => {
        const item = await ctx.db.get(line.itemId);
        return { ...line, itemNameAr: (item as any)?.nameAr ?? "", itemNameEn: (item as any)?.nameEn ?? "", itemCode: (item as any)?.code ?? "" };
      })
    );

    const customer        = ret.customerId        ? await ctx.db.get(ret.customerId)        : null;
    const originalInvoice = ret.originalInvoiceId ? await ctx.db.get(ret.originalInvoiceId) : null;
    const company         = await ctx.db.get(ret.companyId);
    const branch          = ret.branchId ? await ctx.db.get(ret.branchId) : null;

    return {
      ...ret,
      lines: enrichedLines,
      customerNameAr:  (customer as any)?.nameAr ?? "",
      customerNameEn:  (customer as any)?.nameEn ?? "",
      customerAddress: (customer as any)?.address ?? "",
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

// ─── GET POSTED SALES INVOICES (for return creation dropdown) ─────────────────

export const getPostedSalesInvoices = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const invoices = await ctx.db
      .query("salesInvoices")
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
        const customer = inv.customerId ? await ctx.db.get(inv.customerId) : null;
        const salesRep = (inv as any).salesRepId ? await ctx.db.get((inv as any).salesRepId) : null;
        return {
          ...inv,
          customerName: customer?.nameAr ?? "—",
          customerNameEn: customer?.nameEn ?? "",
          salesRepName: (inv as any).salesRepName ?? salesRep?.nameAr ?? "",
          vehicleCode: (inv as any).vehicleCode ?? "",
          invoiceDate: (inv as any).invoiceDate ?? "",
          externalInvoiceNumber: (inv as any).externalInvoiceNumber ?? "",
        };
      })
    );
  },
});

// ─── GET SALES INVOICE LINES (for return form) ────────────────────────────────

export const getSalesInvoiceLines = query({
  args: { invoiceId: v.id("salesInvoices") },
  handler: async (ctx, args) => {
    const lines = await ctx.db
      .query("salesInvoiceLines")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    return Promise.all(
      lines.map(async (line) => {
        const item = await ctx.db.get(line.itemId);
        const uom = await ctx.db.get(line.uomId);
        return { ...line, item, uom };
      })
    );
  },
});
