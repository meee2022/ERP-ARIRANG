// @ts-nocheck
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertUserPermission } from "./lib/permissions";
import { logAudit } from "./lib/audit";
import { generateDocumentNumber, postJournalEntry, buildCashPaymentJournal, validatePeriodOpen } from "./lib/posting";
import { assertPeriodOpen } from "./lib/fiscalControl";

// ─── Commission Report Query ───────────────────────────────────────────────
export const getCommissionReport = query({
  args: {
    companyId: v.id("companies"),
    fromDate: v.string(),
    toDate: v.string(),
    branchId: v.optional(v.id("branches")),
    salesRepId: v.optional(v.id("salesReps")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let invoices = await ctx.db
      .query("salesInvoices")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .collect();

    invoices = invoices.filter(
      (inv) =>
        inv.invoiceDate >= args.fromDate &&
        inv.invoiceDate <= args.toDate &&
        // ── Only APPROVED invoices count for commission ──
        // (drafts haven't been reviewed; cancelled obviously not paid)
        inv.documentStatus === "approved" &&
        inv.reviewStatus !== "rejected" &&
        (!args.branchId  || inv.branchId === args.branchId) &&
        (!args.salesRepId || inv.salesRepId === args.salesRepId) &&
        (!args.status    || inv.commissionStatus === args.status) &&
        (inv.commissionAmount ?? 0) > 0
    );

    // Aggregate by sales rep
    const repMap = new Map<string, any>();

    for (const inv of invoices) {
      if (!inv.salesRepId) continue;
      const key = String(inv.salesRepId);
      if (!repMap.has(key)) {
        const rep: any = await ctx.db.get(inv.salesRepId);
        repMap.set(key, {
          salesRepId: inv.salesRepId,
          salesRepCode: rep?.code ?? "—",
          salesRepNameAr: rep?.nameAr ?? "—",
          salesRepNameEn: rep?.nameEn ?? "—",
          commissionRate: rep?.commissionRate ?? 0,
          invoiceCount: 0,
          totalSales: 0,
          totalCommission: 0,
          pendingCommission: 0,
          approvedCommission: 0,
          paidCommission: 0,
          invoices: [],
        });
      }
      const row = repMap.get(key);
      row.invoiceCount += 1;
      row.totalSales += inv.totalAmount ?? 0;
      const amt = inv.commissionAmount ?? 0;
      row.totalCommission += amt;
      if (inv.commissionStatus === "paid") row.paidCommission += amt;
      else if (inv.commissionStatus === "approved") row.approvedCommission += amt;
      else row.pendingCommission += amt;

      row.invoices.push({
        invoiceId: inv._id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        totalAmount: inv.totalAmount,
        commissionRate: inv.commissionRate,
        commissionAmount: inv.commissionAmount,
        commissionStatus: inv.commissionStatus ?? "pending",
      });
    }

    const rows = Array.from(repMap.values()).sort((a, b) => b.totalCommission - a.totalCommission);

    const totals = {
      repCount: rows.length,
      invoiceCount: rows.reduce((s, r) => s + r.invoiceCount, 0),
      totalSales: rows.reduce((s, r) => s + r.totalSales, 0),
      totalCommission: rows.reduce((s, r) => s + r.totalCommission, 0),
      pendingCommission: rows.reduce((s, r) => s + r.pendingCommission, 0),
      approvedCommission: rows.reduce((s, r) => s + r.approvedCommission, 0),
      paidCommission: rows.reduce((s, r) => s + r.paidCommission, 0),
    };

    return { rows, totals };
  },
});

// ─── Approve Commission for Invoices ───────────────────────────────────────
export const approveCommissions = mutation({
  args: {
    invoiceIds: v.array(v.id("salesInvoices")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await assertUserPermission(ctx, args.userId, "sales", "edit");
    let count = 0;
    for (const id of args.invoiceIds) {
      const inv = await ctx.db.get(id);
      if (!inv || (inv.commissionAmount ?? 0) <= 0) continue;
      if (inv.commissionStatus === "paid") continue;
      await ctx.db.patch(id, {
        commissionStatus: "approved",
        commissionApprovedBy: args.userId,
        commissionApprovedAt: Date.now(),
      });
      count++;
    }
    return { approvedCount: count };
  },
});

// ─── Mark Commissions as Paid (LEGACY — flag only, no voucher) ─────────────
export const markCommissionsPaid = mutation({
  args: {
    invoiceIds: v.array(v.id("salesInvoices")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await assertUserPermission(ctx, args.userId, "sales", "edit");
    let count = 0;
    for (const id of args.invoiceIds) {
      const inv = await ctx.db.get(id);
      if (!inv || (inv.commissionAmount ?? 0) <= 0) continue;
      await ctx.db.patch(id, {
        commissionStatus: "paid",
        commissionPaidAt: Date.now(),
      });
      count++;
    }
    return { paidCount: count };
  },
});

// ─── Pay Commissions via a Cash Payment Voucher (PROPER ACCOUNTING) ────────
// Creates ONE cash payment voucher per sales rep covering all selected invoices,
// then posts it to the GL:
//   Dr: Sales Commission Expense
//   Cr: Cash (selected safe)
// All selected invoices get linked to the voucher and marked as "paid".
export const payCommissionsViaVoucher = mutation({
  args: {
    invoiceIds: v.array(v.id("salesInvoices")),
    cashAccountId:    v.id("accounts"), // safe to deduct from
    expenseAccountId: v.id("accounts"), // commission expense account
    voucherDate: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await assertUserPermission(ctx, args.userId, "sales", "edit");
    await assertUserPermission(ctx, args.userId, "treasury", "create");

    if (args.invoiceIds.length === 0) {
      throw new Error("لم يتم اختيار أي فواتير");
    }

    // Validate target accounts exist
    const cashAcc = await ctx.db.get(args.cashAccountId);
    const expAcc  = await ctx.db.get(args.expenseAccountId);
    if (!cashAcc) throw new Error("حساب الخزينة غير موجود");
    if (!expAcc)  throw new Error("حساب المصروف غير موجود");
    if (!cashAcc.isPostable) throw new Error("حساب الخزينة غير قابل للترحيل");
    if (!expAcc.isPostable)  throw new Error("حساب المصروف غير قابل للترحيل");

    // Group invoices by sales rep
    const repGroups = new Map<string, { repId: string; repName: string; companyId: any; branchId: any; currencyId: any; total: number; invoices: any[] }>();

    for (const id of args.invoiceIds) {
      const inv = await ctx.db.get(id);
      if (!inv) continue;
      if (!inv.salesRepId) continue;
      if ((inv.commissionAmount ?? 0) <= 0) continue;
      if (inv.commissionStatus === "paid") continue;
      // Safety: never pay commission for unapproved or rejected invoices
      if (inv.documentStatus !== "approved") {
        throw new Error(`الفاتورة ${inv.invoiceNumber} غير معتمدة — لا يمكن صرف عمولتها`);
      }
      if (inv.reviewStatus === "rejected") {
        throw new Error(`الفاتورة ${inv.invoiceNumber} مرفوضة — لا يمكن صرف عمولتها`);
      }

      const key = String(inv.salesRepId);
      if (!repGroups.has(key)) {
        const rep: any = await ctx.db.get(inv.salesRepId);
        repGroups.set(key, {
          repId: inv.salesRepId,
          repName: rep?.nameAr ?? rep?.nameEn ?? "Sales Rep",
          companyId: inv.companyId,
          branchId: inv.branchId,
          currencyId: inv.currencyId,
          total: 0,
          invoices: [],
        });
      }
      const g = repGroups.get(key)!;
      g.total += inv.commissionAmount ?? 0;
      g.invoices.push(inv);
    }

    if (repGroups.size === 0) {
      throw new Error("لا توجد عمولات قابلة للصرف من الفواتير المختارة");
    }

    // Find a valid open period
    const findPeriod = async (companyId: any, date: string) => {
      const periods = await ctx.db
        .query("accountingPeriods")
        .withIndex("by_company_status", (q) => q.eq("companyId", companyId).eq("status", "open"))
        .collect();
      return periods.find((p: any) => date >= p.startDate && date <= p.endDate);
    };

    const results: { voucherId: any; voucherNumber: string; repName: string; amount: number; invoiceCount: number }[] = [];

    for (const [, g] of repGroups) {
      const period = await findPeriod(g.companyId, args.voucherDate);
      if (!period) {
        throw new Error(`لا توجد فترة محاسبية مفتوحة بتاريخ ${args.voucherDate} للمندوب ${g.repName}`);
      }

      // Validate fiscal control
      await validatePeriodOpen(ctx, period._id);
      await assertPeriodOpen(ctx, args.voucherDate, g.companyId);

      // Generate voucher number
      const fiscalYear = await ctx.db
        .query("fiscalYears")
        .withIndex("by_company", (q) => q.eq("companyId", g.companyId))
        .filter((q) => q.eq(q.field("status"), "open"))
        .first();

      let voucherNumber = `CPV-${Date.now()}`;
      if (fiscalYear) {
        try {
          voucherNumber = await generateDocumentNumber(ctx, g.branchId, fiscalYear._id, "CPV");
        } catch {
          voucherNumber = `CPV-${Date.now()}`;
        }
      }

      const amount = Math.round(g.total * 100) / 100;

      // Create voucher
      const voucherId = await ctx.db.insert("cashPaymentVouchers", {
        companyId: g.companyId,
        branchId: g.branchId,
        voucherNumber,
        voucherDate: args.voucherDate,
        periodId: period._id,
        paidTo: `عمولة مبيعات - ${g.repName}`,
        paymentType: "expense_payment",
        cashAccountId: args.cashAccountId,
        amount,
        currencyId: g.currencyId,
        exchangeRate: 1,
        paymentMethod: "cash",
        reference: `Commission for ${g.invoices.length} invoice(s)`,
        documentStatus: "approved",
        postingStatus: "unposted",
        allocationStatus: "unallocated",
        notes: `صرف عمولة المبيعات للمندوب ${g.repName} عن ${g.invoices.length} فاتورة`,
        createdBy: args.userId,
        createdAt: Date.now(),
      });

      // Build journal: Dr commission expense, Cr cash
      const journalLines = buildCashPaymentJournal(
        {
          _id: voucherId,
          voucherNumber,
          cashAccountId: args.cashAccountId,
          amount,
          paymentType: "expense_payment",
        },
        args.expenseAccountId
      );

      // Post journal
      const journalEntryId = await postJournalEntry(
        ctx,
        {
          companyId: g.companyId,
          branchId: g.branchId,
          journalType: "auto_payment",
          entryDate: args.voucherDate,
          periodId: period._id,
          currencyId: g.currencyId,
          exchangeRate: 1,
          sourceType: "cashPaymentVoucher",
          sourceId: voucherId,
          description: `صرف عمولة مبيعات - ${g.repName} (${voucherNumber})`,
          isAutoGenerated: true,
          createdBy: args.userId,
        },
        journalLines
      );

      await ctx.db.patch(voucherId, { postingStatus: "posted", journalEntryId });

      // Mark invoices paid + link them to the voucher
      for (const inv of g.invoices) {
        await ctx.db.patch(inv._id, {
          commissionStatus: "paid",
          commissionPaidAt: Date.now(),
          commissionVoucherId: voucherId,
        });
      }

      await logAudit(ctx, {
        companyId: g.companyId,
        userId: args.userId,
        action: "create",
        module: "treasury",
        documentType: "commissionPayout",
        documentId: String(voucherId),
      });

      results.push({
        voucherId,
        voucherNumber,
        repName: g.repName,
        amount,
        invoiceCount: g.invoices.length,
      });
    }

    return { vouchers: results };
  },
});

// ─── Backfill commissions for existing invoices (one-time helper) ──────────
export const backfillCommissions = mutation({
  args: { companyId: v.id("companies"), userId: v.id("users") },
  handler: async (ctx, args) => {
    await assertUserPermission(ctx, args.userId, "sales", "edit");
    const invoices = await ctx.db
      .query("salesInvoices")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .collect();

    let updated = 0;
    for (const inv of invoices) {
      if (inv.commissionAmount && inv.commissionAmount > 0) continue; // already has
      if (!inv.salesRepId) continue;
      const rep: any = await ctx.db.get(inv.salesRepId);
      if (!rep?.commissionRate || rep.commissionRate <= 0) continue;
      const amt = Math.round((inv.totalAmount ?? 0) * (rep.commissionRate / 100) * 100) / 100;
      if (amt <= 0) continue;
      await ctx.db.patch(inv._id, {
        commissionRate: rep.commissionRate,
        commissionAmount: amt,
        commissionStatus: "pending",
      });
      updated++;
    }
    return { updated };
  },
});
