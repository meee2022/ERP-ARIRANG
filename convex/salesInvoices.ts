import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  validatePeriodOpen,
  generateDocumentNumber,
  postJournalEntry,
  reverseJournalEntry,
  updateStockBalance,
  buildSalesInvoiceJournal,
  JournalLineInput,
} from "./lib/posting";
import { assertUserPermission, assertUserBranch } from "./lib/permissions";
import { logAudit } from "./lib/audit";
import { assertPeriodOpen } from "./lib/fiscalControl";
import { requirePostingRules } from "./postingRules";

// ─── CREATE SALES INVOICE ─────────────────────────────────────────────────────

export const createSalesInvoice = mutation({
  args: {
    companyId: v.id("companies"),
    branchId: v.id("branches"),
    invoiceType: v.union(
      v.literal("cash_sale"),
      v.literal("credit_sale"),
      v.literal("mixed_sale")
    ),
    paymentMethod: v.optional(
      v.union(
        v.literal("cash"),
        v.literal("hand"),
        v.literal("main_safe"),
        v.literal("cash_sales_safe"),
        v.literal("card"),
        v.literal("transfer"),
        v.literal("credit")
      )
    ),
    customerId: v.optional(v.id("customers")),
    invoiceDate: v.string(),
    dueDate: v.optional(v.string()),
    periodId: v.id("accountingPeriods"),
    currencyId: v.id("currencies"),
    exchangeRate: v.number(),
    externalInvoiceNumber: v.optional(v.string()),
    costCenterId: v.optional(v.id("costCenters")),
    warehouseId: v.id("warehouses"),
    salesRepId: v.optional(v.id("salesReps")),
    salesRepName: v.optional(v.string()),
    vehicleId: v.optional(v.id("deliveryVehicles")),
    vehicleCode: v.optional(v.string()),
    discountAmount: v.number(),
    serviceCharge: v.number(),
    cashReceived: v.number(),
    cardReceived: v.number(),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    lines: v.array(
      v.object({
        itemId: v.id("items"),
        description: v.optional(v.string()),
        quantity: v.number(),
        uomId: v.id("unitOfMeasure"),
        unitPrice: v.number(),
        discountPct: v.number(),
        discountAmount: v.number(),
        vatRate: v.number(),
        vatAmount: v.number(),
        lineTotal: v.number(),
        revenueAccountId: v.optional(v.id("accounts")),
        cogsAccountId: v.optional(v.id("accounts")),
        costCenterId: v.optional(v.id("costCenters")),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Permission check — must happen before any DB writes
    const user = await assertUserPermission(ctx, args.createdBy, "sales", "create");
    const effectiveBranchId =
      user.role === "admin"
        ? args.branchId
        : user.branchIds.includes(args.branchId)
          ? args.branchId
          : user.branchIds.length === 1
            ? user.branchIds[0]
            : args.branchId;
    assertUserBranch(user, effectiveBranchId);

    if (args.lines.length === 0) {
      throw new Error("يجب إضافة صنف واحد على الأقل");
    }

    if (
      (args.invoiceType === "credit_sale" || args.invoiceType === "mixed_sale") &&
      !args.customerId
    ) {
      throw new Error("يجب تحديد العميل لفواتير الآجل أو المختلطة");
    }

    await validatePeriodOpen(ctx, args.periodId);

    // Calculate totals
    let subtotal = 0;
    let vatAmount = 0;
    for (const line of args.lines) {
      subtotal += line.lineTotal - line.vatAmount;
      vatAmount += line.vatAmount;
    }
    const taxableAmount = subtotal - args.discountAmount;
    const totalAmount = taxableAmount + vatAmount + args.serviceCharge;
    const creditAmount = totalAmount - args.cashReceived - args.cardReceived;

    // Generate invoice number
    const fiscalYear = await ctx.db
      .query("fiscalYears")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .filter((q) => q.eq(q.field("status"), "open"))
      .first();

    let invoiceNumber = `SI-DRAFT-${Date.now()}`;
    if (fiscalYear) {
      invoiceNumber = await generateDocumentNumber(
        ctx,
        effectiveBranchId,
        fiscalYear._id,
        "SI"
      );
    }

    const invoiceId = await ctx.db.insert("salesInvoices", {
      companyId: args.companyId,
      branchId: effectiveBranchId,
      invoiceNumber,
      invoiceType: args.invoiceType,
      paymentMethod: args.paymentMethod,
      customerId: args.customerId,
      invoiceDate: args.invoiceDate,
      dueDate: args.dueDate,
      periodId: args.periodId,
      currencyId: args.currencyId,
      exchangeRate: args.exchangeRate,
      externalInvoiceNumber: args.externalInvoiceNumber,
      costCenterId: args.costCenterId,
      warehouseId: args.warehouseId,
      salesRepId: args.salesRepId,
      salesRepName: args.salesRepName,
      vehicleId: args.vehicleId,
      vehicleCode: args.vehicleCode,
      subtotal,
      discountAmount: args.discountAmount,
      taxableAmount,
      vatAmount,
      serviceCharge: args.serviceCharge,
      totalAmount,
      cashReceived: args.cashReceived,
      cardReceived: args.cardReceived,
      creditAmount: Math.max(0, creditAmount),
      documentStatus: "draft",
      reviewStatus: "draft",
      postingStatus: "unposted",
      paymentStatus:
        args.invoiceType === "cash_sale" ? "not_applicable" : "unpaid",
      createdBy: args.createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    for (let i = 0; i < args.lines.length; i++) {
      const line = args.lines[i];
      await ctx.db.insert("salesInvoiceLines", {
        invoiceId,
        lineNumber: i + 1,
        itemId: line.itemId,
        description: line.description,
        quantity: line.quantity,
        uomId: line.uomId,
        unitPrice: line.unitPrice,
        discountPct: line.discountPct,
        discountAmount: line.discountAmount,
        vatRate: line.vatRate,
        vatAmount: line.vatAmount,
        lineTotal: line.lineTotal,
        serviceChargeRate: 0,
        serviceChargeAmt: 0,
        unitCost: 0, // filled at posting time
        costTotal: 0,
        revenueAccountId: line.revenueAccountId,
        cogsAccountId: line.cogsAccountId,
        costCenterId: line.costCenterId,
      });
    }

    await logAudit(ctx, {
      companyId: args.companyId,
      userId: args.createdBy,
      action: "create",
      module: "sales",
      documentType: "salesInvoice",
      documentId: String(invoiceId),
    });

    return { invoiceId, invoiceNumber };
  },
});

// ─── APPROVE SALES INVOICE ────────────────────────────────────────────────────

export const approveSalesInvoice = mutation({
  args: {
    invoiceId: v.id("salesInvoices"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error("الفاتورة غير موجودة");
    if (invoice.documentStatus !== "draft") {
      throw new Error("يمكن اعتماد المسودات فقط");
    }

    await ctx.db.patch(args.invoiceId, {
      documentStatus: "approved",
      reviewStatus: "approved",
      rejectionReason: undefined,
      approvedBy: args.userId,
      reviewedBy: args.userId,
      reviewedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ─── POST SALES INVOICE ───────────────────────────────────────────────────────

export const postSalesInvoice = mutation({
  args: {
    invoiceId: v.id("salesInvoices"),
    userId: v.id("users"),
    // All account args are now optional — system auto-fetches from posting rules
    cashAccountId:      v.optional(v.id("accounts")),
    cardAccountId:      v.optional(v.id("accounts")),
    arAccountId:        v.optional(v.id("accounts")),
    vatPayableAccountId:v.optional(v.id("accounts")),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error("الفاتورة غير موجودة");
    if (invoice.documentStatus !== "approved") {
      throw new Error("يجب اعتماد الفاتورة أولاً قبل الترحيل");
    }
    if (invoice.postingStatus === "posted") {
      throw new Error("الفاتورة مرحلة مسبقاً");
    }
    if (invoice.totalAmount === 0) {
      throw new Error("لا يمكن ترحيل فاتورة بمبلغ صفر");
    }

    await validatePeriodOpen(ctx, invoice.periodId);
    await assertPeriodOpen(ctx, invoice.invoiceDate, invoice.companyId);

    // ── Auto-load posting rules if any account arg is missing ──
    const rules = (!args.cashAccountId || !args.arAccountId || !args.vatPayableAccountId)
      ? await requirePostingRules(ctx, invoice.companyId)
      : null;

    const cashAccountId       = args.cashAccountId       ?? rules?.cashSalesAccountId;
    const cardAccountId       = args.cardAccountId       ?? rules?.cardSalesAccountId ?? cashAccountId;
    const arAccountId         = args.arAccountId         ?? rules?.arAccountId;
    const vatPayableAccountId = args.vatPayableAccountId ?? rules?.vatPayableAccountId;

    if (!cashAccountId)       throw new Error("حساب الصندوق غير محدد — يرجى ضبط قواعد الترحيل");
    if (!arAccountId)         throw new Error("حساب الذمم المدينة غير محدد — يرجى ضبط قواعد الترحيل");
    if (!vatPayableAccountId) throw new Error("حساب ضريبة القيمة المضافة غير محدد — يرجى ضبط قواعد الترحيل");

    // Get all lines
    const lines = await ctx.db
      .query("salesInvoiceLines")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    if (lines.length === 0) {
      throw new Error("لا توجد أصناف في الفاتورة");
    }

    // Update stock & fill cost on each line
    const updatedLines = [];
    for (const line of lines) {
      const stockUpdate = await updateStockBalance(
        ctx,
        line.itemId,
        invoice.warehouseId,
        -line.quantity, // negative = outbound
        0,
        "sales_issue"
      );

      const unitCost = stockUpdate.avgCostBefore;
      const costTotal = Math.round(line.quantity * unitCost);

      await ctx.db.patch(line._id, {
        unitCost,
        costTotal,
      });

      updatedLines.push({ ...line, unitCost, costTotal });
    }

    // Build journal lines
    const journalLines = buildSalesInvoiceJournal(
      invoice,
      updatedLines,
      cashAccountId!,
      cardAccountId!,
      arAccountId!,
      vatPayableAccountId!
    );

    // Add inventory credit lines
    for (const line of updatedLines) {
      if (line.cogsAccountId && line.costTotal > 0) {
        // Find inventory account from item
        const item = await ctx.db.get(line.itemId);
        if (item?.inventoryAccountId) {
          journalLines.push({
            accountId: item.inventoryAccountId,
            description: `مخزون - ${invoice.invoiceNumber}`,
            debit: 0,
            credit: line.costTotal,
            costCenterId: line.costCenterId ?? invoice.costCenterId ?? undefined,
          });
        }
      }
    }

    // Post the journal entry
    const journalEntryId = await postJournalEntry(
      ctx,
      {
        companyId: invoice.companyId,
        branchId: invoice.branchId,
        journalType: "auto_sales",
        entryDate: invoice.invoiceDate,
        periodId: invoice.periodId,
        currencyId: invoice.currencyId,
        exchangeRate: invoice.exchangeRate,
        costCenterId: invoice.costCenterId ?? undefined,
        sourceType: "salesInvoice",
        sourceId: invoice._id,
        description: `فاتورة مبيعات ${invoice.invoiceNumber}`,
        isAutoGenerated: true,
        createdBy: args.userId,
      },
      journalLines
    );

    // Determine payment status
    let paymentStatus: "not_applicable" | "unpaid" | "partial" | "paid" =
      "not_applicable";
    if (invoice.invoiceType !== "cash_sale") {
      if (invoice.creditAmount <= 0) {
        paymentStatus = "paid";
      } else if (invoice.cashReceived > 0 || invoice.cardReceived > 0) {
        paymentStatus = "partial";
      } else {
        paymentStatus = "unpaid";
      }
    }

    await ctx.db.patch(args.invoiceId, {
      postingStatus: "posted",
      journalEntryId,
      postedBy: args.userId,
      postedAt: Date.now(),
      paymentStatus,
      updatedAt: Date.now(),
    });

    // Log inventory movement
    const movementId = await ctx.db.insert("inventoryMovements", {
      companyId: invoice.companyId,
      branchId: invoice.branchId,
      movementNumber: `IM-${invoice.invoiceNumber}`,
      movementType: "sales_issue",
      movementDate: invoice.invoiceDate,
      periodId: invoice.periodId,
      warehouseId: invoice.warehouseId,
      sourceType: "salesInvoice",
      sourceId: invoice._id,
      documentStatus: "confirmed",
      postingStatus: "posted",
      journalEntryId,
      createdBy: args.userId,
      createdAt: Date.now(),
    });

    for (const line of updatedLines) {
      await ctx.db.insert("inventoryMovementLines", {
        movementId,
        itemId: line.itemId,
        quantity: line.quantity,
        uomId: line.uomId,
        unitCost: line.unitCost,
        totalCost: line.costTotal,
        qtyBefore: 0,
        qtyAfter: 0,
        avgCostBefore: 0,
        avgCostAfter: line.unitCost,
      });
    }

    return { success: true, journalEntryId };
  },
});

// ─── CANCEL SALES INVOICE ─────────────────────────────────────────────────────

export const cancelSalesInvoice = mutation({
  args: {
    invoiceId: v.id("salesInvoices"),
    userId: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error("الفاتورة غير موجودة");
    if (invoice.postingStatus === "posted") {
      throw new Error("لا يمكن إلغاء فاتورة مرحلة. استخدم العكس بدلاً من ذلك");
    }
    if (invoice.documentStatus === "cancelled") {
      throw new Error("الفاتورة ملغاة مسبقاً");
    }

    await ctx.db.patch(args.invoiceId, {
      documentStatus: "cancelled",
      cancelledBy: args.userId,
      notes: args.reason ? `${invoice.notes ?? ""} | سبب الإلغاء: ${args.reason}` : invoice.notes,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const deleteDraftSalesInvoice = mutation({
  args: {
    invoiceId: v.id("salesInvoices"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error("الفاتورة غير موجودة");
    if (invoice.documentStatus !== "draft") {
      throw new Error("يمكن حذف الفواتير في حالة المسودة فقط");
    }
    if (invoice.postingStatus !== "unposted") {
      throw new Error("لا يمكن حذف فاتورة غير مرحلة فقط");
    }

    const user = await assertUserPermission(ctx, args.userId, "sales", "delete");
    assertUserBranch(user, invoice.branchId);

    const lines = await ctx.db
      .query("salesInvoiceLines")
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
      module: "sales",
      documentType: "salesInvoice",
      documentId: String(args.invoiceId),
    });

    return { success: true };
  },
});

export const submitSalesInvoiceForReview = mutation({
  args: {
    invoiceId: v.id("salesInvoices"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error("الفاتورة غير موجودة");
    if (invoice.documentStatus !== "draft" || invoice.postingStatus !== "unposted") {
      throw new Error("يمكن إرسال مسودات الفواتير غير المرحلة فقط للمراجعة");
    }

    const user = await assertUserPermission(ctx, args.userId, "sales", "edit");
    assertUserBranch(user, invoice.branchId);

    if (String(invoice.createdBy) !== String(args.userId) && user.role === "sales") {
      throw new Error("لا يمكنك إرسال إلا فواتيرك فقط");
    }

    await ctx.db.patch(args.invoiceId, {
      reviewStatus: "submitted",
      submittedBy: args.userId,
      submittedAt: Date.now(),
      rejectionReason: undefined,
      updatedAt: Date.now(),
    });

    await logAudit(ctx, {
      companyId: invoice.companyId,
      userId: args.userId,
      action: "submit_review",
      module: "sales",
      documentType: "salesInvoice",
      documentId: String(args.invoiceId),
    });

    return { success: true };
  },
});

export const rejectSalesInvoice = mutation({
  args: {
    invoiceId: v.id("salesInvoices"),
    userId: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error("الفاتورة غير موجودة");
    if (invoice.postingStatus !== "unposted") {
      throw new Error("لا يمكن رفض فاتورة مرحلة");
    }
    if (invoice.reviewStatus !== "submitted" && invoice.documentStatus !== "draft") {
      throw new Error("الفاتورة ليست في حالة مراجعة");
    }

    const reviewer = await assertUserPermission(ctx, args.userId, "sales", "post");
    assertUserBranch(reviewer, invoice.branchId);

    await ctx.db.patch(args.invoiceId, {
      reviewStatus: "rejected",
      rejectionReason: args.reason,
      reviewedBy: args.userId,
      reviewedAt: Date.now(),
      updatedAt: Date.now(),
    });

    await logAudit(ctx, {
      companyId: invoice.companyId,
      userId: args.userId,
      action: "reject",
      module: "sales",
      documentType: "salesInvoice",
      documentId: String(args.invoiceId),
    });

    return { success: true };
  },
});

export const resubmitRejectedSalesInvoice = mutation({
  args: {
    invoiceId: v.id("salesInvoices"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error("الفاتورة غير موجودة");
    if (invoice.reviewStatus !== "rejected" || invoice.postingStatus !== "unposted") {
      throw new Error("يمكن إعادة إرسال الفواتير المرفوضة فقط");
    }

    const user = await assertUserPermission(ctx, args.userId, "sales", "edit");
    assertUserBranch(user, invoice.branchId);
    if (String(invoice.createdBy) !== String(args.userId) && user.role === "sales") {
      throw new Error("لا يمكنك إعادة إرسال إلا فواتيرك فقط");
    }

    await ctx.db.patch(args.invoiceId, {
      reviewStatus: "submitted",
      submittedBy: args.userId,
      submittedAt: Date.now(),
      rejectionReason: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const listMobileSalesInvoices = query({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    branchId: v.optional(v.id("branches")),
    bucket: v.optional(v.union(
      v.literal("drafts"),
      v.literal("submitted"),
      v.literal("rejected"),
      v.literal("recent")
    )),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("المستخدم غير موجود");

    let invoices = await ctx.db
      .query("salesInvoices")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .collect();

    if (user.role === "sales") {
      invoices = invoices.filter((invoice) => String(invoice.createdBy) === String(args.userId));
    }

    if (args.branchId) {
      invoices = invoices.filter((invoice) => invoice.branchId === args.branchId);
    }

    if (args.bucket === "drafts") {
      invoices = invoices.filter((invoice) => invoice.reviewStatus !== "submitted" && invoice.reviewStatus !== "approved" && invoice.documentStatus === "draft");
    } else if (args.bucket === "submitted") {
      invoices = invoices.filter((invoice) => invoice.reviewStatus === "submitted");
    } else if (args.bucket === "rejected") {
      invoices = invoices.filter((invoice) => invoice.reviewStatus === "rejected");
    } else if (args.bucket === "recent") {
      invoices = invoices.slice(0, 15);
    }

    invoices.sort((a, b) => b.updatedAt - a.updatedAt);

    return Promise.all(
      invoices.slice(0, 50).map(async (invoice) => {
        const customer = invoice.customerId ? await ctx.db.get(invoice.customerId) : null;
        const branch = await ctx.db.get(invoice.branchId);
        return {
          ...invoice,
          customerName: customer?.nameAr ?? "—",
          customerNameEn: customer?.nameEn ?? null,
          branchName: branch?.nameAr ?? "—",
          branchNameEn: branch?.nameEn ?? null,
        };
      })
    );
  },
});

export const listSalesReviewQueue = query({
  args: {
    companyId: v.id("companies"),
    branchId: v.optional(v.id("branches")),
    reviewStatus: v.optional(v.union(v.literal("submitted"), v.literal("rejected"), v.literal("approved"), v.literal("draft"))),
  },
  handler: async (ctx, args) => {
    let invoices = await ctx.db
      .query("salesInvoices")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .collect();

    if (args.branchId) {
      invoices = invoices.filter((invoice) => invoice.branchId === args.branchId);
    }

    if (args.reviewStatus) {
      invoices = invoices.filter((invoice) => (invoice.reviewStatus ?? "draft") === args.reviewStatus);
    } else {
      invoices = invoices.filter((invoice) => invoice.reviewStatus === "submitted");
    }

    invoices.sort((a, b) => b.updatedAt - a.updatedAt);

    return Promise.all(
      invoices.map(async (invoice) => {
        const customer = invoice.customerId ? await ctx.db.get(invoice.customerId) : null;
        const branch = await ctx.db.get(invoice.branchId);
        const creator = await ctx.db.get(invoice.createdBy);
        return {
          ...invoice,
          customerName: customer?.nameAr ?? "—",
          customerNameEn: customer?.nameEn ?? null,
          branchName: branch?.nameAr ?? "—",
          branchNameEn: branch?.nameEn ?? null,
          createdByName: creator?.name ?? "—",
        };
      })
    );
  },
});

// ─── REVERSE SALES INVOICE ────────────────────────────────────────────────────

export const reverseSalesInvoice = mutation({
  args: {
    invoiceId: v.id("salesInvoices"),
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
      throw new Error("لا يوجد قيد محاسبي مرتبط بهذه الفاتورة");
    }

    // Reverse the journal entry
    await reverseJournalEntry(
      ctx,
      invoice.journalEntryId,
      args.reversalDate,
      args.reversalPeriodId,
      args.userId
    );

    // Restore stock for each line
    const lines = await ctx.db
      .query("salesInvoiceLines")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    for (const line of lines) {
      await updateStockBalance(
        ctx,
        line.itemId,
        invoice.warehouseId,
        line.quantity, // positive = return to stock
        line.unitCost,
        "sales_return"
      );
    }

    await ctx.db.patch(args.invoiceId, {
      postingStatus: "reversed",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ─── GET SALES INVOICE ────────────────────────────────────────────────────────

export const getSalesInvoice = query({
  args: { invoiceId: v.id("salesInvoices") },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) return null;

    const lines = await ctx.db
      .query("salesInvoiceLines")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    const customer = invoice.customerId
      ? await ctx.db.get(invoice.customerId)
      : null;

    const enrichedLines = await Promise.all(
      lines.map(async (line) => {
        const item = await ctx.db.get(line.itemId);
        const uom = await ctx.db.get(line.uomId);
        return { ...line, item, uom };
      })
    );

    return { ...invoice, lines: enrichedLines, customer };
  },
});

// ─── LIST SALES INVOICES ──────────────────────────────────────────────────────

export const listSalesInvoices = query({
  args: {
    branchId: v.optional(v.id("branches")),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
    documentStatus: v.optional(v.string()),
    postingStatus: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
    customerId: v.optional(v.id("customers")),
    invoiceType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let invoices = args.branchId
      ? await ctx.db
          .query("salesInvoices")
          .withIndex("by_branch", (q) => q.eq("branchId", args.branchId!))
          .collect()
      : await ctx.db.query("salesInvoices").collect();

    if (args.fromDate) {
      invoices = invoices.filter((i) => i.invoiceDate >= args.fromDate!);
    }
    if (args.toDate) {
      invoices = invoices.filter((i) => i.invoiceDate <= args.toDate!);
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
    if (args.customerId) {
      invoices = invoices.filter((i) => i.customerId === args.customerId);
    }
    if (args.invoiceType) {
      invoices = invoices.filter((i) => i.invoiceType === args.invoiceType);
    }

    // Sort by date descending
    invoices.sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));

    // Enrich with customer names
    const enriched = await Promise.all(
      invoices.map(async (inv) => {
        const customer = inv.customerId ? await ctx.db.get(inv.customerId) : null;
        return {
          ...inv,
          customerName: customer?.nameAr ?? "—",
          externalInvoiceNumber: inv.externalInvoiceNumber ?? null,
        };
      })
    );

    return enriched;
  },
});

// ─── LIST BY COMPANY (for invoices list page) ─────────────────────────────────

export const listByCompany = query({
  args: {
    companyId: v.id("companies"),
    branchId: v.optional(v.id("branches")),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
    postingStatus: v.optional(
      v.union(v.literal("unposted"), v.literal("posted"), v.literal("reversed"))
    ),
    paymentStatus: v.optional(
      v.union(
        v.literal("not_applicable"),
        v.literal("unpaid"),
        v.literal("partial"),
        v.literal("paid")
      )
    ),
    invoiceType: v.optional(
      v.union(
        v.literal("cash_sale"),
        v.literal("credit_sale"),
        v.literal("mixed_sale")
      )
    ),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("salesInvoices")
      .filter((q2) => q2.eq(q2.field("companyId"), args.companyId))
      .order("desc")
      .take(200);

    const filtered = all.filter((inv) => {
      if (args.branchId && inv.branchId !== args.branchId) return false;
      if (args.fromDate && inv.invoiceDate < args.fromDate) return false;
      if (args.toDate && inv.invoiceDate > args.toDate) return false;
      if (args.postingStatus && inv.postingStatus !== args.postingStatus) return false;
      if (args.paymentStatus && inv.paymentStatus !== args.paymentStatus) return false;
      if (args.invoiceType && inv.invoiceType !== args.invoiceType) return false;
      return true;
    });

    return Promise.all(
      filtered.map(async (inv) => {
        const customer = inv.customerId ? await ctx.db.get(inv.customerId) : null;
        const branch = await ctx.db.get(inv.branchId);
        const salesRep = inv.salesRepId ? await ctx.db.get(inv.salesRepId) : null;
        const vehicle = inv.vehicleId ? await ctx.db.get(inv.vehicleId) : null;
        return {
          ...inv,
          customerName: customer?.nameAr ?? "—",
          branchName: branch?.nameAr ?? "—",
          branchNameEn: branch?.nameEn ?? null,
          salesRepName: inv.salesRepName ?? salesRep?.nameAr ?? null,
          salesRepNameEn: salesRep?.nameEn ?? null,
          vehicleCode: inv.vehicleCode ?? vehicle?.code ?? null,
          externalInvoiceNumber: inv.externalInvoiceNumber ?? null,
          vehicleLabelAr: vehicle?.descriptionAr ?? null,
          vehicleLabelEn: vehicle?.descriptionEn ?? null,
        };
      })
    );
  },
});

// ─── QUICK POST SALES INVOICE (auto-resolves accounts by code) ───────────────

export const quickPostSalesInvoice = mutation({
  args: {
    invoiceId: v.id("salesInvoices"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error("الفاتورة غير موجودة");

    // Permission check before any processing
    const user = await assertUserPermission(ctx, args.userId, "sales", "post");
    assertUserBranch(user, invoice.branchId);

    if (invoice.postingStatus === "posted") throw new Error("الفاتورة مرحلة مسبقاً");
    if (invoice.documentStatus === "cancelled") throw new Error("لا يمكن ترحيل فاتورة ملغاة");
    if (invoice.totalAmount === 0) throw new Error("لا يمكن ترحيل فاتورة بمبلغ صفر");

    await validatePeriodOpen(ctx, invoice.periodId);

    const lines = await ctx.db
      .query("salesInvoiceLines")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    if (lines.length === 0) throw new Error("لا توجد أصناف في الفاتورة");

    // Resolve revenue account by code 4101
    const revenueAccount = await ctx.db
      .query("accounts")
      .withIndex("by_company_code", (q) =>
        q.eq("companyId", invoice.companyId).eq("code", "4101")
      )
      .first();
    if (!revenueAccount) throw new Error("لم يُعثر على حساب إيرادات المبيعات (كود 4101). أضفه في دليل الحسابات.");

    // Resolve AR or Cash account from customer
    let debitAccountId: Id<"accounts">;
    if (invoice.invoiceType === "cash_sale" || !invoice.customerId) {
      // 1) Try posting rules first
      const rules = await ctx.db
        .query("postingRules")
        .withIndex("by_company", (q) => q.eq("companyId", invoice.companyId))
        .first();
      let cashAccountId = rules?.cashSalesAccountId ?? rules?.mainCashAccountId;

      // 2) Fallback: find by subtype cash_bank
      if (!cashAccountId) {
        const cashAccount = await ctx.db
          .query("accounts")
          .withIndex("by_company_type", (q) =>
            q.eq("companyId", invoice.companyId).eq("accountType", "asset")
          )
          .filter((q) =>
            q.and(
              q.eq(q.field("accountSubType"), "cash_bank"),
              q.eq(q.field("isPostable"), true),
              q.eq(q.field("isActive"), true)
            )
          )
          .first();
        cashAccountId = cashAccount?._id;
      }

      // 3) Fallback: find by common cash account codes (1101, 1100, 1001)
      if (!cashAccountId) {
        for (const code of ["1101", "1100", "1001", "1010"]) {
          const acc = await ctx.db
            .query("accounts")
            .withIndex("by_company_code", (q) =>
              q.eq("companyId", invoice.companyId).eq("code", code)
            )
            .first();
          if (acc?.isPostable && acc?.isActive) { cashAccountId = acc._id; break; }
        }
      }

      if (!cashAccountId) throw new Error("لم يُعثر على حساب الصندوق/البنك. يرجى ضبط قواعد الترحيل أو إضافة حساب من نوع صندوق/بنك في دليل الحسابات.");
      debitAccountId = cashAccountId;
    } else {
      // Credit sale: use customer's linked account
      const customer = await ctx.db.get(invoice.customerId);
      if (!customer) throw new Error("العميل غير موجود");
      debitAccountId = customer.accountId;
    }

    // Update stock for each line
    const updatedLines = [];
    for (const line of lines) {
      const stockUpdate = await updateStockBalance(
        ctx,
        line.itemId,
        invoice.warehouseId,
        -line.quantity,
        0,
        "sales_issue"
      );
      const unitCost = stockUpdate.avgCostBefore;
      const costTotal = Math.round(line.quantity * unitCost);
      await ctx.db.patch(line._id, { unitCost, costTotal });
      updatedLines.push({ ...line, unitCost, costTotal });
    }

    // Build journal lines: DR debit account, CR revenue account
    const journalLines: JournalLineInput[] = [
      {
        accountId: debitAccountId,
        subAccountType: invoice.customerId ? "customer" : undefined,
        subAccountId: invoice.customerId ? String(invoice.customerId) : undefined,
        description: `${invoice.invoiceType === "cash_sale" ? "نقد" : "ذمم عميل"} - ${invoice.invoiceNumber}`,
        debit: invoice.totalAmount,
        credit: 0,
        foreignDebit: 0,
        foreignCredit: 0,
      },
      {
        accountId: revenueAccount._id,
        description: `إيراد مبيعات - ${invoice.invoiceNumber}`,
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
        journalType: "auto_sales",
        entryDate: invoice.invoiceDate,
        periodId: invoice.periodId,
        currencyId: invoice.currencyId,
        exchangeRate: invoice.exchangeRate,
        sourceType: "salesInvoice",
        sourceId: invoice._id,
        description: `فاتورة مبيعات ${invoice.invoiceNumber}`,
        isAutoGenerated: true,
        createdBy: args.userId,
      },
      journalLines
    );

    // Update invoice
    await ctx.db.patch(args.invoiceId, {
      documentStatus: "approved",
      postingStatus: "posted",
      journalEntryId,
      postedBy: args.userId,
      postedAt: Date.now(),
      paymentStatus: invoice.invoiceType === "cash_sale" ? "not_applicable" : "unpaid",
      updatedAt: Date.now(),
    });

    // Log inventory movement
    const movementId = await ctx.db.insert("inventoryMovements", {
      companyId: invoice.companyId,
      branchId: invoice.branchId,
      movementNumber: `IM-${invoice.invoiceNumber}`,
      movementType: "sales_issue",
      movementDate: invoice.invoiceDate,
      periodId: invoice.periodId,
      warehouseId: invoice.warehouseId,
      sourceType: "salesInvoice",
      sourceId: invoice._id,
      documentStatus: "confirmed",
      postingStatus: "posted",
      journalEntryId,
      createdBy: args.userId,
      createdAt: Date.now(),
    });

    for (const line of updatedLines) {
      await ctx.db.insert("inventoryMovementLines", {
        movementId,
        itemId: line.itemId,
        quantity: line.quantity,
        uomId: line.uomId,
        unitCost: line.unitCost,
        totalCost: line.costTotal,
        qtyBefore: 0,
        qtyAfter: 0,
        avgCostBefore: 0,
        avgCostAfter: line.unitCost,
      });
    }

    await logAudit(ctx, {
      companyId: invoice.companyId,
      userId: args.userId,
      action: "post",
      module: "sales",
      documentType: "salesInvoice",
      documentId: String(args.invoiceId),
    });

    return { success: true, journalEntryId };
  },
});

// ─── GET INVOICE BY ID (full detail for print view) ──────────────────────────

export const getInvoiceById = query({
  args: { invoiceId: v.id("salesInvoices") },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) return null;

    // Enrich lines
    const lines = await ctx.db
      .query("salesInvoiceLines")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    const enrichedLines = await Promise.all(
      lines.map(async (line) => {
        const item = await ctx.db.get(line.itemId);
        const uom = await ctx.db.get(line.uomId);
        return {
          ...line,
          itemNameAr: item?.nameAr ?? "",
          itemNameEn: item?.nameEn ?? item?.nameAr ?? "",
          itemCode: item?.code ?? "",
          uomNameAr: uom?.nameAr ?? "",
          uomNameEn: uom?.nameEn ?? uom?.nameAr ?? "",
        };
      })
    );

    // Customer
    const customer = invoice.customerId ? await ctx.db.get(invoice.customerId) : null;
    const salesRep = invoice.salesRepId ? await ctx.db.get(invoice.salesRepId) : null;
    const vehicle = invoice.vehicleId ? await ctx.db.get(invoice.vehicleId) : null;

    // Branch
    const branch = await ctx.db.get(invoice.branchId);

    // Company
    const company = await ctx.db.get(invoice.companyId);

    return {
      ...invoice,
      lines: enrichedLines,
      customerNameAr: customer?.nameAr ?? null,
      customerNameEn: customer?.nameEn ?? null,
      customerCode: customer?.code ?? null,
      salesRepNameAr: salesRep?.nameAr ?? invoice.salesRepName ?? null,
      salesRepNameEn: salesRep?.nameEn ?? null,
      vehicleCode: vehicle?.code ?? invoice.vehicleCode ?? null,
      vehicleDescriptionAr: vehicle?.descriptionAr ?? null,
      vehicleDescriptionEn: vehicle?.descriptionEn ?? null,
      customerAddress: customer?.address ?? null,
      customerPhone: (customer as any)?.phone ?? null,
      customerVatNumber: (customer as any)?.taxNumber ?? null,
      branchNameAr: branch?.nameAr ?? null,
      branchNameEn: branch?.nameEn ?? null,
      companyNameAr: company?.nameAr ?? null,
      companyNameEn: company?.nameEn ?? null,
      companyAddress: company?.address ?? null,
      companyPhone: (company as any)?.phone ?? null,
      companyVatNumber: (company as any)?.taxNumber ?? null,
    };
  },
});

// ─── SALES INVOICE SUMMARY ────────────────────────────────────────────────────

export const getSalesInvoiceSummary = query({
  args: {
    branchId: v.optional(v.id("branches")),
    periodId: v.optional(v.id("accountingPeriods")),
  },
  handler: async (ctx, args) => {
    let invoices = args.branchId
      ? await ctx.db
          .query("salesInvoices")
          .withIndex("by_branch", (q) => q.eq("branchId", args.branchId!))
          .collect()
      : await ctx.db.query("salesInvoices").collect();

    if (args.periodId) {
      invoices = invoices.filter((i) => i.periodId === args.periodId);
    }

    const postedInvoices = invoices.filter((i) => i.postingStatus === "posted");

    const totalSales = postedInvoices.reduce((s, i) => s + i.totalAmount, 0);
    const totalVat = postedInvoices.reduce((s, i) => s + i.vatAmount, 0);
    const totalCash = postedInvoices.reduce((s, i) => s + i.cashReceived + i.cardReceived, 0);
    const totalCredit = postedInvoices.reduce((s, i) => s + i.creditAmount, 0);
    const countDraft = invoices.filter((i) => i.documentStatus === "draft").length;
    const countApproved = invoices.filter((i) => i.documentStatus === "approved").length;
    const countPosted = postedInvoices.length;

    return {
      totalSales,
      totalVat,
      totalCash,
      totalCredit,
      countDraft,
      countApproved,
      countPosted,
      invoiceCount: invoices.length,
    };
  },
});

// ─── Bulk Post Sales Invoices ─────────────────────────────────────────────────
export const bulkPostSalesInvoices = mutation({
  args: {
    companyId: v.id("companies"),
    invoiceIds: v.array(v.id("salesInvoices")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const results: { invoiceId: string; success: boolean; error?: string }[] = [];

    for (const invoiceId of args.invoiceIds) {
      try {
        const invoice = await ctx.db.get(invoiceId);
        if (!invoice) { results.push({ invoiceId, success: false, error: "not_found" }); continue; }
        if (invoice.postingStatus !== "unposted") { results.push({ invoiceId, success: false, error: "already_posted" }); continue; }
        if (invoice.documentStatus === "cancelled") { results.push({ invoiceId, success: false, error: "cancelled" }); continue; }

        // Run posting
        const { requirePostingRules } = await import("./postingRules");
        const { buildSalesInvoiceJournal, postJournalEntry, updateStockBalance } = await import("./lib/posting");

        const rules = await requirePostingRules(ctx, invoice.companyId);
        const currency = await ctx.db.query("currencies")
          .filter((q) => q.eq(q.field("isBase"), true)).first();
        if (!currency) throw new Error("No base currency");

        const cashAccountId  = rules.cashSalesAccountId!;
        const arAccountId    = rules.arAccountId!;
        const vatAccountId   = rules.vatPayableAccountId!;
        const cardAccountId  = rules.cardSalesAccountId ?? cashAccountId;

        const lines = await ctx.db.query("salesInvoiceLines")
          .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
          .collect();

        const enrichedLines = await Promise.all(lines.map(async (l: any) => {
          const item = l.itemId ? (await ctx.db.get(l.itemId) as any) : null;
          return { ...l, itemCode: item?.code, itemNameAr: item?.nameAr ?? "", itemNameEn: item?.nameEn };
        }));

        const journalLines = buildSalesInvoiceJournal(
          invoice as any,
          enrichedLines,
          cashAccountId,
          cardAccountId,
          arAccountId,
          vatAccountId,
        );

        const entryId = await postJournalEntry(
          ctx,
          {
            companyId: invoice.companyId,
            branchId: invoice.branchId,
            periodId: invoice.periodId,
            journalType: "auto_sales" as const,
            entryDate: invoice.invoiceDate,
            description: `فاتورة مبيعات ${invoice.invoiceNumber}`,
            sourceType: "salesInvoice",
            sourceId: String(invoiceId),
            currencyId: currency._id,
            exchangeRate: invoice.exchangeRate ?? 1,
            isAutoGenerated: true,
            createdBy: args.userId,
          },
          journalLines
        );

        // Update stock
        for (const line of enrichedLines) {
          if (!line.itemId || !invoice.warehouseId) continue;
          await updateStockBalance(
            ctx,
            line.itemId as any,
            invoice.warehouseId,
            -(line.quantity ?? 0),
            line.unitCost ?? 0,
            "sales_issue"
          );
        }

        await ctx.db.patch(invoiceId, {
          postingStatus: "posted",
          journalEntryId: entryId,
          postedAt: Date.now(),
          postedBy: args.userId,
        });

        results.push({ invoiceId, success: true });
      } catch (e: any) {
        results.push({ invoiceId, success: false, error: e.message ?? "error" });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed    = results.filter((r) => !r.success).length;
    return { results, succeeded, failed };
  },
});

// ─── UPDATE DRAFT SALES INVOICE ───────────────────────────────────────────────
export const updateDraftSalesInvoice = mutation({
  args: {
    invoiceId: v.id("salesInvoices"),
    userId: v.id("users"),
    invoiceDate: v.string(),
    dueDate: v.optional(v.string()),
    externalInvoiceNumber: v.optional(v.string()),
    invoiceType: v.union(v.literal("cash_sale"), v.literal("credit_sale")),
    paymentMethod: v.optional(v.string()),
    customerId: v.optional(v.id("customers")),
    warehouseId: v.id("warehouses"),
    salesRepId: v.optional(v.id("salesReps")),
    vehicleId: v.optional(v.id("vehicles")),
    discountAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
    lines: v.array(v.object({
      itemId: v.id("items"),
      quantity: v.number(),
      unitPrice: v.number(),
      uomId: v.id("unitOfMeasure"),
      discount: v.optional(v.number()),
      notes: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error("الفاتورة غير موجودة");
    if (invoice.documentStatus !== "draft") throw new Error("يمكن تعديل المسودات فقط");
    if (invoice.postingStatus !== "unposted") throw new Error("لا يمكن تعديل فاتورة مرحلة");

    const user = await assertUserPermission(ctx, args.userId, "sales", "edit");
    assertUserBranch(user, invoice.branchId);

    // Recalculate totals
    const subtotal = args.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const discount = args.discountAmount ?? 0;
    const netAmount = Math.max(0, subtotal - discount);
    const vatRate = 0.05;
    const vatAmount = Math.round(netAmount * vatRate * 100) / 100;
    const totalAmount = Math.round((netAmount + vatAmount) * 100) / 100;

    let cashReceived = 0, cardReceived = 0, creditAmount = 0;
    if (args.invoiceType === "cash_sale") {
      cashReceived = totalAmount;
    } else {
      creditAmount = totalAmount;
    }

    // Update invoice header
    await ctx.db.patch(args.invoiceId, {
      invoiceDate: args.invoiceDate,
      dueDate: args.dueDate,
      externalInvoiceNumber: args.externalInvoiceNumber,
      invoiceType: args.invoiceType,
      paymentMethod: args.paymentMethod as any,
      customerId: args.customerId,
      warehouseId: args.warehouseId,
      salesRepId: args.salesRepId,
      vehicleId: args.vehicleId as any, // deliveryVehicles id
      discountAmount: discount,
      subtotal,
      vatAmount,
      totalAmount,
      cashReceived,
      cardReceived,
      creditAmount,
      notes: args.notes,
    });

    // Delete old lines
    const oldLines = await ctx.db
      .query("salesInvoiceLines")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();
    await Promise.all(oldLines.map((l) => ctx.db.delete(l._id)));

    // Insert new lines
    for (let i = 0; i < args.lines.length; i++) {
      const l = args.lines[i];
      const lineTotal = Math.round(l.quantity * l.unitPrice * 100) / 100;
      await ctx.db.insert("salesInvoiceLines", {
        invoiceId: args.invoiceId,
        lineNumber: i + 1,
        itemId: l.itemId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        uomId: l.uomId,
        discountPct: 0,
        discountAmount: l.discount ?? 0,
        lineTotal,
        vatRate,
        vatAmount: Math.round(lineTotal * vatRate * 100) / 100,
        serviceChargeRate: 0,
        serviceChargeAmt: 0,
        unitCost: 0,
        costTotal: 0,
      });
    }

    await logAudit(ctx, { companyId: invoice.companyId, userId: args.userId, action: "update", module: "sales", documentType: "salesInvoice", documentId: String(args.invoiceId), details: JSON.stringify({ before: invoice.totalAmount, after: totalAmount }) });

    return { invoiceId: args.invoiceId, totalAmount };
  },
});
