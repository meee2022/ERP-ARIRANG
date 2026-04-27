import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  validatePeriodOpen,
  generateDocumentNumber,
  postJournalEntry,
  reverseJournalEntry,
  updateStockBalance,
  buildPurchaseInvoiceJournal,
  JournalLineInput,
} from "./lib/posting";
import { assertUserPermission, assertUserBranch } from "./lib/permissions";
import { logAudit } from "./lib/audit";
import { assertPeriodOpen } from "./lib/fiscalControl";



// ─── GET GRN BY ID (detail + print view) ─────────────────────────────────────

export const getGRNById = query({
  args: { grnId: v.id("goodsReceiptNotes") },
  handler: async (ctx, args) => {
    const grn = await ctx.db.get(args.grnId);
    if (!grn) return null;

    const lines = await ctx.db
      .query("grnLines")
      .withIndex("by_grn", (q) => q.eq("grnId", args.grnId))
      .collect();

    const enrichedLines = await Promise.all(
      lines.map(async (line) => {
        const item = await ctx.db.get(line.itemId);
        const uom = await ctx.db.get(line.uomId);
        return {
          ...line,
          itemNameAr: item?.nameAr ?? "",
          itemNameEn: (item as any)?.nameEn ?? item?.nameAr ?? "",
          itemCode: item?.code ?? "",
          uomNameAr: uom?.nameAr ?? "",
        };
      })
    );

    const supplier = await ctx.db.get(grn.supplierId);
    const warehouse = await ctx.db.get(grn.warehouseId);
    const branch = await ctx.db.get(grn.branchId);
    const company = await ctx.db.get(grn.companyId);

    return {
      ...grn,
      lines: enrichedLines,
      supplierNameAr: supplier?.nameAr ?? "",
      supplierCode: (supplier as any)?.code ?? "",
      warehouseNameAr: warehouse?.nameAr ?? "",
      branchNameAr: branch?.nameAr ?? "",
      branchNameEn: (branch as any)?.nameEn ?? branch?.nameAr ?? "",
      companyNameAr: company?.nameAr ?? "",
      companyNameEn: (company as any)?.nameEn ?? company?.nameAr ?? "",
      companyAddress: (company as any)?.address ?? "",
    };
  },
});

// ─── LIST GRNs ────────────────────────────────────────────────────────────────

export const listGRNs = query({
  args: {
    companyId: v.id("companies"),
    branchId: v.optional(v.id("branches")),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
  },
  handler: async (ctx, { companyId, branchId, fromDate, toDate }) => {
    let grns = await ctx.db
      .query("goodsReceiptNotes")
      .filter(q => q.eq(q.field("companyId"), companyId))
      .order("desc")
      .take(200);
    if (branchId) grns = grns.filter(g => g.branchId === branchId);
    if (fromDate) grns = grns.filter(g => g.receiptDate >= fromDate!);
    if (toDate) grns = grns.filter(g => g.receiptDate <= toDate!);
    return Promise.all(grns.map(async g => {
      const supplier = await ctx.db.get(g.supplierId);
      const warehouse = await ctx.db.get(g.warehouseId);
      return {
        ...g,
        supplierName: supplier ? (supplier.nameAr || "") : "",
        warehouseName: warehouse ? (warehouse.nameAr || "") : "",
      };
    }));
  },
});

// ─── CREATE GRN ───────────────────────────────────────────────────────────────



export const createGRN = mutation({

  args: {

    companyId: v.id("companies"),

    branchId: v.id("branches"),

    poId: v.optional(v.id("purchaseOrders")),

    supplierId: v.id("suppliers"),

    receiptDate: v.string(),

    periodId: v.id("accountingPeriods"),

    warehouseId: v.id("warehouses"),

    currencyId: v.id("currencies"),

    exchangeRate: v.number(),

    notes: v.optional(v.string()),

    createdBy: v.id("users"),

    lines: v.array(

      v.object({

        poLineId: v.optional(v.id("purchaseOrderLines")),

        itemId: v.id("items"),

        quantity: v.number(),

        uomId: v.id("unitOfMeasure"),

        unitCost: v.number(),

        totalCost: v.number(),

      })

    ),

  },

  handler: async (ctx, args) => {

    // Permission check before any DB writes (createGRN)
    const user = await assertUserPermission(ctx, args.createdBy, "purchases", "create");
    assertUserBranch(user, args.branchId);

    await validatePeriodOpen(ctx, args.periodId);



    const fiscalYear = await ctx.db

      .query("fiscalYears")

      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))

      .filter((q) => q.eq(q.field("status"), "open"))

      .first();



    let grnNumber = `GRN-${Date.now()}`;

    if (fiscalYear) {

      grnNumber = await generateDocumentNumber(ctx, args.branchId, fiscalYear._id, "GRN");

    }



    const grnId = await ctx.db.insert("goodsReceiptNotes", {

      companyId: args.companyId,

      branchId: args.branchId,

      grnNumber,

      poId: args.poId,

      supplierId: args.supplierId,

      receiptDate: args.receiptDate,

      periodId: args.periodId,

      warehouseId: args.warehouseId,

      currencyId: args.currencyId,

      exchangeRate: args.exchangeRate,

      documentStatus: "draft",

      postingStatus: "unposted",

      notes: args.notes,

      createdBy: args.createdBy,

      createdAt: Date.now(),

    });



    for (const line of args.lines) {

      await ctx.db.insert("grnLines", {

        grnId,

        poLineId: line.poLineId,

        itemId: line.itemId,

        quantity: line.quantity,

        uomId: line.uomId,

        unitCost: line.unitCost,

        totalCost: line.totalCost,

        invoicedQty: 0,

      });

    }



    await logAudit(ctx, {
      companyId: args.companyId,
      userId: args.createdBy,
      action: "create",
      module: "purchases",
      documentType: "goodsReceiptNote",
      documentId: String(grnId),
    });

    return { grnId, grnNumber };

  },

});



// ─── APPROVE GRN ──────────────────────────────────────────────────────────────



export const approveGRN = mutation({

  args: {

    grnId: v.id("goodsReceiptNotes"),

    userId: v.id("users"),

  },

  handler: async (ctx, args) => {

    const grn = await ctx.db.get(args.grnId);

    if (!grn) throw new Error("إذن الاستلام غير موجود");

    if (grn.documentStatus !== "draft") {

      throw new Error("يمكن اعتماد المسودات فقط");

    }

    // Permission check: requires purchases.edit
    await assertUserPermission(ctx, args.userId, "purchases", "edit");

    await ctx.db.patch(args.grnId, {
      documentStatus: "approved",
      approvedBy: args.userId,
      approvedAt: Date.now(),
    });

    await logAudit(ctx, {
      companyId: grn.companyId,
      userId: args.userId,
      action: "approve",
      module: "purchases",
      documentType: "grn",
      documentId: String(args.grnId),
    });

    return { success: true };

  },

});



// ─── POST GRN ─────────────────────────────────────────────────────────────────



export const postGRN = mutation({

  args: {

    grnId: v.id("goodsReceiptNotes"),

    userId: v.id("users"),

    inventoryAccountId: v.id("accounts"),

    apAccruedAccountId: v.id("accounts"),

  },

  handler: async (ctx, args) => {

    const grn = await ctx.db.get(args.grnId);

    if (!grn) throw new Error("إذن الاستلام غير موجود");

    if (grn.documentStatus !== "approved") {

      throw new Error("يجب اعتماد إذن الاستلام أولاً");

    }

    if (grn.postingStatus === "posted") {

      throw new Error("إذن الاستلام مرحل مسبقاً");

    }

    if (grn.postingStatus === "reversed") {

      throw new Error("لا يمكن ترحيل إذن استلام معكوس");

    }



    await validatePeriodOpen(ctx, grn.periodId);



    const lines = await ctx.db

      .query("grnLines")

      .withIndex("by_grn", (q) => q.eq("grnId", args.grnId))

      .collect();



    // Update stock for each line

    for (const line of lines) {

      await updateStockBalance(

        ctx,

        line.itemId,

        grn.warehouseId,

        line.quantity,

        line.unitCost,

        "purchase_receipt"

      );



      // Update item lastCost

      await ctx.db

        .query("items")

        .filter((q) => q.eq(q.field("_id"), line.itemId))

        .first()

        .then(async (item) => {

          if (item) {

            await ctx.db.patch(item._id, { lastCost: line.unitCost });

          }

        });

    }



    // Build journal: DR Inventory, CR AP Accrued

    const totalValue = lines.reduce((s, l) => s + l.totalCost, 0);

    const journalLines = [

      {

        accountId: args.inventoryAccountId,

        description: `استلام بضاعة - ${grn.grnNumber}`,

        debit: totalValue,

        credit: 0,

      },

      {

        accountId: args.apAccruedAccountId,

        subAccountType: "supplier",

        subAccountId: grn.supplierId,

        description: `استلام بضاعة - ${grn.grnNumber}`,

        debit: 0,

        credit: totalValue,

      },

    ];



    const fiscalYear = await ctx.db

      .query("fiscalYears")

      .withIndex("by_company", (q) => q.eq("companyId", grn.companyId))

      .filter((q) => q.eq(q.field("status"), "open"))

      .first();



    const journalEntryId = await postJournalEntry(

      ctx,

      {

        companyId: grn.companyId,

        branchId: grn.branchId,

        journalType: "auto_inventory",

        entryDate: grn.receiptDate,

        periodId: grn.periodId,

        currencyId: grn.currencyId,

        exchangeRate: grn.exchangeRate,

        sourceType: "goodsReceiptNote",

        sourceId: grn._id,

        description: `إذن استلام بضاعة ${grn.grnNumber}`,

        isAutoGenerated: true,

        createdBy: args.userId,

      },

      journalLines

    );



    await ctx.db.patch(args.grnId, {

      postingStatus: "posted",

      journalEntryId,

      postedBy: args.userId,

      postedAt: Date.now(),

    });



    // Log inventory movement

    const movementId = await ctx.db.insert("inventoryMovements", {

      companyId: grn.companyId,

      branchId: grn.branchId,

      movementNumber: `IM-${grn.grnNumber}`,

      movementType: "purchase_receipt",

      movementDate: grn.receiptDate,

      periodId: grn.periodId,

      warehouseId: grn.warehouseId,

      sourceType: "goodsReceiptNote",

      sourceId: grn._id,

      documentStatus: "confirmed",

      postingStatus: "posted",

      journalEntryId,

      createdBy: args.userId,

      createdAt: Date.now(),

    });



    for (const line of lines) {

      await ctx.db.insert("inventoryMovementLines", {

        movementId,

        itemId: line.itemId,

        quantity: line.quantity,

        uomId: line.uomId,

        unitCost: line.unitCost,

        totalCost: line.totalCost,

        qtyBefore: 0,

        qtyAfter: line.quantity,

        avgCostBefore: 0,

        avgCostAfter: line.unitCost,

      });

    }



    await logAudit(ctx, {
      companyId: grn.companyId,
      userId: args.userId,
      action: "post",
      module: "purchases",
      documentType: "goodsReceiptNote",
      documentId: String(args.grnId),
    });

    return { success: true, journalEntryId };

  },

});

// ─── REVERSE GRN ─────────────────────────────────────────────────────────────

export const reverseGRN = mutation({
  args: {
    grnId: v.id("goodsReceiptNotes"),
    userId: v.id("users"),
    reversalDate: v.string(),
    reversalPeriodId: v.id("accountingPeriods"),
  },
  handler: async (ctx, args) => {
    const grn = await ctx.db.get(args.grnId);
    if (!grn) throw new Error("إذن الاستلام غير موجود");
    if (grn.postingStatus !== "posted") throw new Error("يمكن عكس الإذن المرحّل فقط");
    if (!grn.journalEntryId) throw new Error("لا يوجد قيد محاسبي مرتبط");

    await assertUserPermission(ctx, args.userId, "purchases", "post");
    await validatePeriodOpen(ctx, args.reversalPeriodId);

    // Reverse journal entry
    await reverseJournalEntry(ctx, grn.journalEntryId, args.reversalDate, args.reversalPeriodId, args.userId);

    // Reverse inventory: subtract quantities that were added on post
    const lines = await ctx.db
      .query("grnLines")
      .withIndex("by_grn", (q) => q.eq("grnId", args.grnId))
      .collect();

    for (const line of lines) {
      await updateStockBalance(ctx, line.itemId, grn.warehouseId, -line.quantity, line.unitCost, "grn_reversal");
    }

    await ctx.db.patch(args.grnId, { postingStatus: "reversed" });

    await logAudit(ctx, {
      companyId: grn.companyId,
      userId: args.userId,
      action: "reverse",
      module: "purchases",
      documentType: "goodsReceiptNote",
      documentId: String(args.grnId),
    });

    return { success: true };
  },
});

export const createPurchaseInvoice = mutation({

  args: {

    companyId: v.id("companies"),

    branchId: v.id("branches"),

    supplierInvoiceNo: v.optional(v.string()),

    supplierId: v.id("suppliers"),

    invoiceType: v.union(

      v.literal("stock_purchase"),

      v.literal("expense_purchase"),

      v.literal("mixed")

    ),

    invoiceDate: v.string(),

    dueDate: v.string(),
    periodId: v.id("accountingPeriods"),
    grnId: v.optional(v.id("goodsReceiptNotes")),

    poId: v.optional(v.id("purchaseOrders")),

    currencyId: v.id("currencies"),

    exchangeRate: v.number(),

    notes: v.optional(v.string()),

    createdBy: v.id("users"),

    lines: v.array(

      v.object({

        grnLineId: v.optional(v.id("grnLines")),

        itemId: v.optional(v.id("items")),

        description: v.optional(v.string()),

        lineType: v.union(

          v.literal("stock_item"),

          v.literal("expense_item"),

          v.literal("service")

        ),

        quantity: v.number(),

        uomId: v.optional(v.id("unitOfMeasure")),

        unitPrice: v.number(),

        vatRate: v.number(),

        vatAmount: v.number(),

        lineTotal: v.number(),

        accountId: v.id("accounts"),
        costCenterId: v.optional(v.id("costCenters")),

      })

    ),

  },

  handler: async (ctx, args) => {

    // Permission check before any DB writes (createPurchaseInvoice)
    const user = await assertUserPermission(ctx, args.createdBy, "purchases", "create");
    assertUserBranch(user, args.branchId);

    await validatePeriodOpen(ctx, args.periodId);

    const fiscalYear = await ctx.db

      .query("fiscalYears")

      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))

      .filter((q) => q.eq(q.field("status"), "open"))

      .first();



    let invoiceNumber = `PI-${Date.now()}`;

    if (fiscalYear) {

      invoiceNumber = await generateDocumentNumber(ctx, args.branchId, fiscalYear._id, "PI");

    }



    let subtotal = 0;

    let vatAmount = 0;

    for (const line of args.lines) {

      subtotal += line.lineTotal - line.vatAmount;

      vatAmount += line.vatAmount;

    }

    const totalAmount = subtotal + vatAmount;



    const invoiceId = await ctx.db.insert("purchaseInvoices", {

      companyId: args.companyId,

      branchId: args.branchId,

      invoiceNumber,

      supplierInvoiceNo: args.supplierInvoiceNo,

      supplierId: args.supplierId,

      invoiceType: args.invoiceType,

      invoiceDate: args.invoiceDate,

      dueDate: args.dueDate,

      periodId: args.periodId,

      grnId: args.grnId,

      poId: args.poId,

      currencyId: args.currencyId,

      exchangeRate: args.exchangeRate,

      subtotal,

      vatAmount,

      totalAmount,

      documentStatus: "draft",

      postingStatus: "unposted",

      paymentStatus: "unpaid",

      notes: args.notes,

      createdBy: args.createdBy,

      createdAt: Date.now(),

    });



    for (const line of args.lines) {

      await ctx.db.insert("purchaseInvoiceLines", {

        invoiceId,

        grnLineId: line.grnLineId,

        itemId: line.itemId,

        description: line.description,

        lineType: line.lineType,

        quantity: line.quantity,

        uomId: line.uomId,

        unitPrice: line.unitPrice,

        vatRate: line.vatRate,

        vatAmount: line.vatAmount,

        lineTotal: line.lineTotal,

        accountId: line.accountId,

        costCenterId: line.costCenterId,

      });

    }



    await logAudit(ctx, {
      companyId: args.companyId,
      userId: args.createdBy,
      action: "create",
      module: "purchases",
      documentType: "purchaseInvoice",
      documentId: String(invoiceId),
    });

    return { invoiceId, invoiceNumber };

  },

});



// ─── APPROVE PURCHASE INVOICE ─────────────────────────────────────────────────



export const approvePurchaseInvoice = mutation({

  args: {

    invoiceId: v.id("purchaseInvoices"),

    userId: v.id("users"),

  },

  handler: async (ctx, args) => {

    const invoice = await ctx.db.get(args.invoiceId);

    if (!invoice) throw new Error("الفاتورة غير موجودة");

    if (invoice.documentStatus !== "draft") {

      throw new Error("يمكن اعتماد المسودات فقط");

    }

    // Permission check: requires purchases.edit
    await assertUserPermission(ctx, args.userId, "purchases", "edit");

    await ctx.db.patch(args.invoiceId, {
      documentStatus: "approved",
      approvedBy: args.userId,
      approvedAt: Date.now(),
    });

    await logAudit(ctx, {
      companyId: invoice.companyId,
      userId: args.userId,
      action: "approve",
      module: "purchases",
      documentType: "purchaseInvoice",
      documentId: String(args.invoiceId),
    });

    return { success: true };

  },

});



// ─── POST PURCHASE INVOICE ────────────────────────────────────────────────────



export const postPurchaseInvoice = mutation({

  args: {

    invoiceId: v.id("purchaseInvoices"),

    userId: v.id("users"),

    apAccountId: v.id("accounts"),

    vatReceivableAccountId: v.id("accounts"),

  },

  handler: async (ctx, args) => {

    const invoice = await ctx.db.get(args.invoiceId);

    if (!invoice) throw new Error("الفاتورة غير موجودة");

    if (invoice.documentStatus !== "approved") {

      throw new Error("يجب اعتماد الفاتورة أولاً");

    }

    if (invoice.postingStatus === "posted") {

      throw new Error("الفاتورة مرحلة مسبقاً");

    }



    await validatePeriodOpen(ctx, invoice.periodId);

    await assertPeriodOpen(ctx, invoice.invoiceDate, invoice.companyId);

    const lines = await ctx.db

      .query("purchaseInvoiceLines")

      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))

      .collect();



    // Update stock for stock items if GRN is present

    if (invoice.grnId) {

      const grnLines = await ctx.db

        .query("grnLines")

        .withIndex("by_grn", (q) => q.eq("grnId", invoice.grnId!))

        .collect();



      for (const grnLine of grnLines) {

        // Find matching invoice line

        const invoiceLine = lines.find(

          (l) => l.grnLineId === grnLine._id && l.lineType === "stock_item"

        );

        if (invoiceLine) {

          // Update avg cost with actual invoice price (if different from GRN cost)

          await updateStockBalance(

            ctx,

            grnLine.itemId,

            invoice.grnId as unknown as any,

            0, // no quantity change — stock already updated at GRN posting

            invoiceLine.unitPrice,

            "purchase_receipt"

          );

        }

      }

    }



    const journalLines = buildPurchaseInvoiceJournal(

      invoice,

      lines.map((l) => ({

        lineType: l.lineType,

        lineTotal: l.lineTotal,

        vatAmount: l.vatAmount,

        accountId: l.accountId ?? undefined,

        costCenterId: l.costCenterId ?? undefined,

      })),

      args.apAccountId,

      args.vatReceivableAccountId

    );



    const journalEntryId = await postJournalEntry(

      ctx,

      {

        companyId: invoice.companyId,

        branchId: invoice.branchId,

        journalType: "auto_purchase",

        entryDate: invoice.invoiceDate,

        periodId: invoice.periodId,

        currencyId: invoice.currencyId,

        exchangeRate: invoice.exchangeRate,

        sourceType: "purchaseInvoice",

        sourceId: invoice._id,

        description: `فاتورة مشتريات ${invoice.invoiceNumber}`,

        isAutoGenerated: true,

        createdBy: args.userId,

      },

      journalLines

    );



    await ctx.db.patch(args.invoiceId, {

      postingStatus: "posted",

      journalEntryId,

    });



    // Mark GRN as invoiced

    if (invoice.grnId) {

      await ctx.db.patch(invoice.grnId, { documentStatus: "invoiced" });

    }



    return { success: true, journalEntryId };

  },

});



// ─── CANCEL PURCHASE INVOICE ──────────────────────────────────────────────────



export const cancelPurchaseInvoice = mutation({

  args: {

    invoiceId: v.id("purchaseInvoices"),

    userId: v.id("users"),

    reason: v.optional(v.string()),

  },

  handler: async (ctx, args) => {

    const invoice = await ctx.db.get(args.invoiceId);

    if (!invoice) throw new Error("الفاتورة غير موجودة");

    if (invoice.postingStatus === "posted") {

      throw new Error("لا يمكن إلغاء فاتورة مرحلة");

    }

    await ctx.db.patch(args.invoiceId, {

      documentStatus: "cancelled",

    });

    return { success: true };

  },

});



// ─── REVERSE PURCHASE INVOICE ─────────────────────────────────────────────────



export const reversePurchaseInvoice = mutation({

  args: {

    invoiceId: v.id("purchaseInvoices"),

    userId: v.id("users"),

    reversalDate: v.string(),

    reversalPeriodId: v.id("accountingPeriods"),

  },

  handler: async (ctx, args) => {

    const invoice = await ctx.db.get(args.invoiceId);

    if (!invoice) throw new Error("الفاتورة غير موجودة");

    if (invoice.postingStatus !== "posted") {

      throw new Error("يمكن عكس الفواتير المرحلة فقط");

    }

    if (!invoice.journalEntryId) {

      throw new Error("لا يوجد قيد محاسبي");

    }



    await reverseJournalEntry(

      ctx,

      invoice.journalEntryId,

      args.reversalDate,

      args.reversalPeriodId,

      args.userId

    );



    await ctx.db.patch(args.invoiceId, { postingStatus: "reversed" });

    return { success: true };

  },

});



// ─── GET PURCHASE INVOICE ─────────────────────────────────────────────────────



export const getPurchaseInvoice = query({

  args: { invoiceId: v.id("purchaseInvoices") },

  handler: async (ctx, args) => {

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) return null;

    const lines = await ctx.db
      .query("purchaseInvoiceLines")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    const supplier = await ctx.db.get(invoice.supplierId);
    const branch   = await ctx.db.get(invoice.branchId);
    const company  = await ctx.db.get(invoice.companyId);

    const enrichedLines = await Promise.all(
      lines.map(async (line) => {
        const item = line.itemId ? await ctx.db.get(line.itemId) : null;
        const uom  = line.uomId  ? await ctx.db.get(line.uomId)  : null;
        return {
          ...line,
          itemCode:   item?.code ?? "",
          itemNameAr: item?.nameAr ?? "",
          itemNameEn: (item as any)?.nameEn ?? item?.nameAr ?? "",
          uomNameAr:  uom?.nameAr ?? "",
        };
      })
    );

    return {
      ...invoice,
      lines: enrichedLines,
      supplierNameAr:   supplier?.nameAr ?? "",
      supplierNameEn:   (supplier as any)?.nameEn ?? supplier?.nameAr ?? "",
      supplierAddress:  (supplier as any)?.address ?? "",
      supplierVatNumber:(supplier as any)?.taxNumber ?? "",
      branchNameAr:     branch?.nameAr ?? "",
      branchNameEn:     (branch as any)?.nameEn ?? branch?.nameAr ?? "",
      companyNameAr:    company?.nameAr ?? "",
      companyNameEn:    (company as any)?.nameEn ?? company?.nameAr ?? "",
      companyAddress:   (company as any)?.address ?? "",
      companyVatNumber: (company as any)?.taxNumber ?? "",
    };
  },
});

export const deleteDraftPurchaseInvoice = mutation({
  args: {
    invoiceId: v.id("purchaseInvoices"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error("الفاتورة غير موجودة");
    if (invoice.documentStatus !== "draft") {
      throw new Error("يمكن حذف فواتير المشتريات في حالة المسودة فقط");
    }
    if (invoice.postingStatus !== "unposted") {
      throw new Error("لا يمكن حذف فاتورة مرحلة أو معكوسة");
    }

    const user = await assertUserPermission(ctx, args.userId, "purchases", "delete");
    assertUserBranch(user, invoice.branchId);

    const lines = await ctx.db
      .query("purchaseInvoiceLines")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    for (const line of lines) {
      await ctx.db.delete(line._id);
    }

    await ctx.db.delete(args.invoiceId);

    await logAudit(ctx, {
      companyId: invoice.companyId,
      userId: args.userId,
      action: "delete",
      module: "purchases",
      documentType: "purchaseInvoice",
      documentId: String(args.invoiceId),
    });

    return { success: true };
  },
});



// ─── QUICK POST PURCHASE INVOICE (auto-resolves accounts by code) ────────────

export const quickPostPurchaseInvoice = mutation({
  args: {
    invoiceId: v.id("purchaseInvoices"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error("الفاتورة غير موجودة");

    // Permission check before any processing
    const user = await assertUserPermission(ctx, args.userId, "purchases", "post");
    assertUserBranch(user, invoice.branchId);

    if (invoice.postingStatus === "posted") throw new Error("الفاتورة مرحلة مسبقاً");
    if (invoice.documentStatus === "cancelled") throw new Error("لا يمكن ترحيل فاتورة ملغاة");
    if (invoice.totalAmount === 0) throw new Error("لا يمكن ترحيل فاتورة بمبلغ صفر");

    await validatePeriodOpen(ctx, invoice.periodId);

    const lines = await ctx.db
      .query("purchaseInvoiceLines")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    if (lines.length === 0) throw new Error("لا توجد أصناف في الفاتورة");

    // Resolve COGS/Purchases account by code 5101
    const cogsAccount = await ctx.db
      .query("accounts")
      .withIndex("by_company_code", (q) =>
        q.eq("companyId", invoice.companyId).eq("code", "5101")
      )
      .first();
    if (!cogsAccount) throw new Error("لم يُعثر على حساب تكلفة البضاعة المباعة (كود 5101). أضفه في دليل الحسابات.");

    // Resolve supplier's payable account from supplier record
    const supplier = await ctx.db.get(invoice.supplierId);
    if (!supplier) throw new Error("المورد غير موجود");
    const supplierAccountId = supplier.accountId;

    // Build journal lines: DR COGS/Purchases (5101), CR Supplier payable
    const journalLines: JournalLineInput[] = [
      {
        accountId: cogsAccount._id,
        description: `مشتريات - ${invoice.invoiceNumber}`,
        debit: invoice.totalAmount,
        credit: 0,
        foreignDebit: 0,
        foreignCredit: 0,
      },
      {
        accountId: supplierAccountId,
        subAccountType: "supplier",
        subAccountId: String(invoice.supplierId),
        description: `ذمم مورد - ${invoice.invoiceNumber}`,
        debit: 0,
        credit: invoice.totalAmount,
        foreignDebit: 0,
        foreignCredit: 0,
      },
    ];

    const journalEntryId = await postJournalEntry(
      ctx,
      {
        companyId: invoice.companyId,
        branchId: invoice.branchId,
        journalType: "auto_purchase",
        entryDate: invoice.invoiceDate,
        periodId: invoice.periodId,
        currencyId: invoice.currencyId,
        exchangeRate: invoice.exchangeRate,
        sourceType: "purchaseInvoice",
        sourceId: invoice._id,
        description: `فاتورة مشتريات ${invoice.invoiceNumber}`,
        isAutoGenerated: true,
        createdBy: args.userId,
      },
      journalLines
    );

    // Update invoice status
    await ctx.db.patch(args.invoiceId, {
      documentStatus: "approved",
      postingStatus: "posted",
      journalEntryId,
      postedBy: args.userId,
      postedAt: Date.now(),
    });

    await logAudit(ctx, {
      companyId: invoice.companyId,
      userId: args.userId,
      action: "post",
      module: "purchases",
      documentType: "purchaseInvoice",
      documentId: String(args.invoiceId),
    });

    return { success: true, journalEntryId };
  },
});

// ─── LIST BY COMPANY ──────────────────────────────────────────────────────────

export const listByCompany = query({
  args: {
    companyId: v.id("companies"),
    branchId: v.optional(v.id("branches")),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
    postingStatus: v.optional(
      v.union(v.literal("unposted"), v.literal("posted"), v.literal("reversed"))
    ),
    supplierId: v.optional(v.id("suppliers")),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("purchaseInvoices")
      .filter((q2) => q2.eq(q2.field("companyId"), args.companyId))
      .order("desc")
      .take(200);

    const filtered = all.filter((inv) => {
      if (args.branchId && inv.branchId !== args.branchId) return false;
      if (args.fromDate && inv.invoiceDate < args.fromDate) return false;
      if (args.toDate && inv.invoiceDate > args.toDate) return false;
      if (args.postingStatus && inv.postingStatus !== args.postingStatus) return false;
      if (args.supplierId && inv.supplierId !== args.supplierId) return false;
      return true;
    });

    return Promise.all(
      filtered.map(async (inv) => {
        const supplier = await ctx.db.get(inv.supplierId);
        return {
          ...inv,
          supplierName: supplier ? (supplier.nameAr || "") : "—",
        };
      })
    );
  },
});

// ─── LIST PURCHASE INVOICES ───────────────────────────────────────────────────



export const listPurchaseInvoices = query({

  args: {

    branchId: v.optional(v.id("branches")),

    fromDate: v.optional(v.string()),

    toDate: v.optional(v.string()),

    supplierId: v.optional(v.id("suppliers")),

    documentStatus: v.optional(v.string()),

    postingStatus: v.optional(v.string()),

    paymentStatus: v.optional(v.string()),

  },

  handler: async (ctx, args) => {

    let invoices = args.branchId

      ? await ctx.db

          .query("purchaseInvoices")

          .withIndex("by_branch", (q) => q.eq("branchId", args.branchId!))

          .collect()

      : await ctx.db.query("purchaseInvoices").collect();



    if (args.fromDate) {

      invoices = invoices.filter((i) => i.invoiceDate >= args.fromDate!);

    }

    if (args.toDate) {

      invoices = invoices.filter((i) => i.invoiceDate <= args.toDate!);

    }

    if (args.supplierId) {

      invoices = invoices.filter((i) => i.supplierId === args.supplierId);

    }

    if (args.documentStatus) {

      invoices = invoices.filter((i) => i.documentStatus === args.documentStatus);

    }

    if (args.postingStatus) {

      invoices = invoices.filter((i) => i.postingStatus === args.postingStatus);

    }

    if (args.paymentStatus) {

      invoices = invoices.filter((i) => i.paymentStatus === args.paymentStatus);

    }



    invoices.sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));



    const enriched = await Promise.all(

      invoices.map(async (inv) => {

        const supplier = await ctx.db.get(inv.supplierId);

        return { ...inv, supplierName: supplier?.nameAr ?? "—" };

      })

    );



    return enriched;

  },

});





