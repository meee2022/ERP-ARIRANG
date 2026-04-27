import { query } from "./_generated/server";
import { v } from "convex/values";

// ─── getDashboardExtended ─────────────────────────────────────────────────────
// Additional KPIs: AR/AP outstanding, overdue, low-stock, 7-day trends.
export const getDashboardExtended = query({
  args: {
    companyId: v.id("companies"),
    today:     v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, { companyId, today }) => {

    // ── AR Outstanding: posted sales invoices with unpaid/partial status ──────
    const allSalesInvoices = await ctx.db
      .query("salesInvoices")
      .order("desc")
      .take(1000);

    const companySales = allSalesInvoices.filter((i) => i.companyId === companyId);

    const arOutstanding = companySales
      .filter((i) => i.postingStatus === "posted" && (i.paymentStatus === "unpaid" || i.paymentStatus === "partial"))
      .reduce((s, i) => s + i.creditAmount, 0);

    // ── Overdue: posted credit sales where dueDate < today and not paid ───────
    const overdueInvoices = companySales.filter(
      (i) =>
        i.postingStatus === "posted" &&
        (i.paymentStatus === "unpaid" || i.paymentStatus === "partial") &&
        i.dueDate !== undefined &&
        i.dueDate < today
    );
    const overdueCount  = overdueInvoices.length;
    const overdueAmount = overdueInvoices.reduce((s, i) => s + i.creditAmount, 0);

    // ── AP Outstanding: posted purchase invoices with unpaid/partial status ───
    const allPurchaseInvoices = await ctx.db
      .query("purchaseInvoices")
      .order("desc")
      .take(1000);

    const companyPI = allPurchaseInvoices.filter((i) => i.companyId === companyId);

    const apOutstanding = companyPI
      .filter((i) => i.postingStatus === "posted" && (i.paymentStatus === "unpaid" || i.paymentStatus === "partial"))
      .reduce((s, i) => s + i.totalAmount, 0);

    // ── Low stock items: quantity <= reorderPoint (where reorderPoint is set) ──
    const allItems = await ctx.db
      .query("items")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .collect();

    const itemsWithReorder = allItems.filter((it) => it.reorderPoint !== undefined && it.reorderPoint > 0);

    let lowStockCount = 0;
    for (const item of itemsWithReorder) {
      const balances = await ctx.db
        .query("stockBalance")
        .withIndex("by_item", (q) => q.eq("itemId", item._id))
        .collect();
      const totalQty = balances.reduce((s, b) => s + b.quantity, 0);
      if (totalQty <= (item.reorderPoint ?? 0)) lowStockCount++;
    }

    // ── 7-day sales trend ─────────────────────────────────────────────────────
    // Build date labels for last 7 days
    const sevenDayTrend: { date: string; sales: number; receipts: number; payments: number }[] = [];

    for (let d = 6; d >= 0; d--) {
      const dt = new Date(today);
      dt.setDate(dt.getDate() - d);
      const dateStr = dt.toISOString().split("T")[0];

      const daySales = companySales
        .filter((i) => i.invoiceDate === dateStr && i.postingStatus === "posted")
        .reduce((s, i) => s + i.totalAmount, 0);

      sevenDayTrend.push({ date: dateStr, sales: daySales, receipts: 0, payments: 0 });
    }

    // ── 7-day receipts & payments ─────────────────────────────────────────────
    const allReceipts = await ctx.db.query("cashReceiptVouchers").order("desc").take(500);
    const allPayments = await ctx.db.query("cashPaymentVouchers").order("desc").take(500);

    const companyReceipts = allReceipts.filter((r) => r.companyId === companyId && r.postingStatus === "posted");
    const companyPayments = allPayments.filter((p) => p.companyId === companyId && p.postingStatus === "posted");

    for (const day of sevenDayTrend) {
      day.receipts = companyReceipts
        .filter((r) => r.voucherDate === day.date)
        .reduce((s, r) => s + r.amount, 0);
      day.payments = companyPayments
        .filter((p) => p.voucherDate === day.date)
        .reduce((s, p) => s + p.amount, 0);
    }

    // ── Pending purchase invoices (unposted) ──────────────────────────────────
    const pendingPurchases = companyPI.filter((i) => i.postingStatus === "unposted").length;

    // ── Delta context: yesterday + month-to-date daily avg ────────────────────
    // All derived from already-loaded arrays — zero extra DB queries.
    const yesterdayDt = new Date(today);
    yesterdayDt.setDate(yesterdayDt.getDate() - 1);
    const yesterday = yesterdayDt.toISOString().split("T")[0];

    // First day of current month
    const monthStartDt = new Date(today);
    monthStartDt.setDate(1);
    const monthStart = monthStartDt.toISOString().split("T")[0];

    // Days elapsed in month before today (for daily average denominator)
    const daysElapsed = Math.max(
      Math.round((new Date(today).getTime() - new Date(monthStart).getTime()) / 86_400_000),
      1
    );

    // Yesterday figures (from already-loaded arrays)
    const yesterdaySales = companySales
      .filter((i) => i.invoiceDate === yesterday && i.postingStatus === "posted")
      .reduce((s, i) => s + i.totalAmount, 0);

    const yesterdayReceipts = companyReceipts
      .filter((r) => r.voucherDate === yesterday)
      .reduce((s, r) => s + r.amount, 0);

    const yesterdayPayments = companyPayments
      .filter((p) => p.voucherDate === yesterday)
      .reduce((s, p) => s + p.amount, 0);

    // Month-to-date totals (monthStart..yesterday inclusive, excluding today)
    const mtdSales = companySales
      .filter((i) => i.invoiceDate >= monthStart && i.invoiceDate < today && i.postingStatus === "posted")
      .reduce((s, i) => s + i.totalAmount, 0);

    const mtdReceipts = companyReceipts
      .filter((r) => r.voucherDate >= monthStart && r.voucherDate < today)
      .reduce((s, r) => s + r.amount, 0);

    const mtdPayments = companyPayments
      .filter((p) => p.voucherDate >= monthStart && p.voucherDate < today)
      .reduce((s, p) => s + p.amount, 0);

    // Daily averages for the current month so far
    const mtdDailySales    = mtdSales    / daysElapsed;
    const mtdDailyReceipts = mtdReceipts / daysElapsed;
    const mtdDailyPayments = mtdPayments / daysElapsed;

    return {
      arOutstanding,
      apOutstanding,
      overdueCount,
      overdueAmount,
      lowStockCount,
      pendingPurchases,
      sevenDayTrend,
      // delta context
      yesterdaySales,
      yesterdayReceipts,
      yesterdayPayments,
      mtdDailySales,
      mtdDailyReceipts,
      mtdDailyPayments,
    };
  },
});

// ─── getDashboardStats ────────────────────────────────────────────────────────
// Returns all KPIs for the dashboard: counts, today's money flows, cash on hand,
// pending invoices. Efficient: uses withIndex for every table scan.
export const getDashboardStats = query({
  args: {
    companyId: v.id("companies"),
    branchId:  v.optional(v.id("branches")),
    date:      v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    const { companyId, branchId, date } = args;

    // ── Counts ──────────────────────────────────────────────────────────────
    const [customerRows, supplierRows, itemRows, accountRows] = await Promise.all([
      ctx.db.query("customers").withIndex("by_company", (q) => q.eq("companyId", companyId)).collect(),
      ctx.db.query("suppliers").withIndex("by_company", (q) => q.eq("companyId", companyId)).collect(),
      ctx.db.query("items").withIndex("by_company", (q) => q.eq("companyId", companyId)).collect(),
      ctx.db.query("accounts").withIndex("by_company", (q) => q.eq("companyId", companyId)).collect(),
    ]);

    const customerCount = customerRows.length;
    const supplierCount = supplierRows.length;
    const itemCount     = itemRows.length;
    const accountCount  = accountRows.length;

    // ── Today's Sales (posted invoices with invoiceDate = today) ────────────
    // salesInvoices has by_branch index; we need companyId scope.
    // Use take(500) ordered desc (recent first) then filter client-side for today.
    // This is the safest approach given available indexes (no by_company_date index).
    const recentInvoices = await ctx.db
      .query("salesInvoices")
      .order("desc")
      .take(500);

    const companyInvoicesToday = recentInvoices.filter(
      (i) =>
        i.companyId === companyId &&
        i.invoiceDate === date &&
        i.postingStatus === "posted"
    );
    const todaySales = companyInvoicesToday.reduce((s, i) => s + i.totalAmount, 0);

    // ── Pending invoices (unposted) ──────────────────────────────────────────
    const allCompanyInvoices = recentInvoices.filter((i) => i.companyId === companyId);
    const pendingInvoices = allCompanyInvoices.filter(
      (i) => i.postingStatus === "unposted"
    ).length;

    // ── Today's Cash Receipts ────────────────────────────────────────────────
    const recentReceipts = await ctx.db
      .query("cashReceiptVouchers")
      .order("desc")
      .take(300);

    const todayReceipts = recentReceipts
      .filter(
        (r) =>
          r.companyId === companyId &&
          r.voucherDate === date &&
          r.postingStatus === "posted"
      )
      .reduce((s, r) => s + r.amount, 0);

    // ── Today's Cash Payments ────────────────────────────────────────────────
    const recentPayments = await ctx.db
      .query("cashPaymentVouchers")
      .order("desc")
      .take(300);

    const todayPayments = recentPayments
      .filter(
        (p) =>
          p.companyId === companyId &&
          p.voucherDate === date &&
          p.postingStatus === "posted"
      )
      .reduce((s, p) => s + p.amount, 0);

    // ── Cash on Hand ─────────────────────────────────────────────────────────
    // Strategy: find all cashBox accounts (glAccountId) in cashBoxes table,
    // then sum journalLines debit - credit for those accounts.
    // Fallback: sum currentBalance directly from cashBoxes.
    const cashBoxes = await ctx.db
      .query("cashBoxes")
      .filter((q) => q.eq(q.field("companyId"), companyId))
      .collect();

    // Use currentBalance from cashBoxes (maintained by the posting engine)
    const cashOnHand = cashBoxes.reduce((s, cb) => s + cb.currentBalance, 0);

    return {
      customerCount,
      supplierCount,
      itemCount,
      accountCount,
      todaySales,
      todayReceipts,
      todayPayments,
      cashOnHand,
      pendingInvoices,
    };
  },
});

// ─── getRecentActivity ────────────────────────────────────────────────────────
// Fetches the most recent operations across document types and merges them.
export const getRecentActivity = query({
  args: {
    companyId: v.id("companies"),
    limit:     v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { companyId } = args;
    const limit = args.limit ?? 10;
    const perType = 5; // fetch 5 of each type then merge & take top N

    // ── Sales Invoices ───────────────────────────────────────────────────────
    const rawInvoices = await ctx.db
      .query("salesInvoices")
      .order("desc")
      .take(50);

    const companyInvoices = rawInvoices
      .filter((i) => i.companyId === companyId)
      .slice(0, perType);

    const invoiceItems = await Promise.all(
      companyInvoices.map(async (inv) => {
        const customer = inv.customerId ? await ctx.db.get(inv.customerId) : null;
        const name = customer
          ? (customer.nameAr || customer.nameEn || "—")
          : "—";
        return {
          type:           "sales_invoice" as const,
          documentNumber: inv.invoiceNumber,
          amount:         inv.totalAmount,
          date:           inv.invoiceDate,
          timestamp:      inv.createdAt,
          description:    name,
        };
      })
    );

    // ── Cash Receipts ────────────────────────────────────────────────────────
    const rawReceipts = await ctx.db
      .query("cashReceiptVouchers")
      .order("desc")
      .take(50);

    const companyReceipts = rawReceipts
      .filter((r) => r.companyId === companyId)
      .slice(0, perType);

    const receiptItems = companyReceipts.map((r) => ({
      type:           "cash_receipt" as const,
      documentNumber: r.voucherNumber,
      amount:         r.amount,
      date:           r.voucherDate,
      timestamp:      r.createdAt,
      description:    r.receivedFrom,
    }));

    // ── Cash Payments ────────────────────────────────────────────────────────
    const rawPayments = await ctx.db
      .query("cashPaymentVouchers")
      .order("desc")
      .take(50);

    const companyPayments = rawPayments
      .filter((p) => p.companyId === companyId)
      .slice(0, perType);

    const paymentItems = companyPayments.map((p) => ({
      type:           "cash_payment" as const,
      documentNumber: p.voucherNumber,
      amount:         p.amount,
      date:           p.voucherDate,
      timestamp:      p.createdAt,
      description:    p.paidTo,
    }));

    // ── Goods Receipt Notes ──────────────────────────────────────────────────
    const rawGRN = await ctx.db
      .query("goodsReceiptNotes")
      .order("desc")
      .take(50);

    const companyGRN = rawGRN
      .filter((g) => g.companyId === companyId)
      .slice(0, perType);

    const grnItems = await Promise.all(
      companyGRN.map(async (grn) => {
        const supplier = await ctx.db.get(grn.supplierId);
        const name = supplier ? (supplier.nameAr || supplier.nameEn || "—") : "—";
        // GRN has no totalAmount — sum grnLines
        const lines = await ctx.db
          .query("grnLines")
          .withIndex("by_grn", (q) => q.eq("grnId", grn._id))
          .collect();
        const total = lines.reduce((s, l) => s + l.totalCost, 0);
        return {
          type:           "grn" as const,
          documentNumber: grn.grnNumber,
          amount:         total,
          date:           grn.receiptDate,
          timestamp:      grn.createdAt,
          description:    name,
        };
      })
    );

    // ── Bank Transfers ───────────────────────────────────────────────────────
    const rawTransfers = await ctx.db
      .query("bankTransfers")
      .order("desc")
      .take(50);

    const companyTransfers = rawTransfers
      .filter((t) => t.companyId === companyId)
      .slice(0, perType);

    const transferItems = await Promise.all(
      companyTransfers.map(async (t) => {
        const [fromAcc, toAcc] = await Promise.all([
          ctx.db.get(t.fromAccountId),
          ctx.db.get(t.toAccountId),
        ]);
        const fromName = fromAcc ? (fromAcc.accountName || "—") : "—";
        const toName   = toAcc   ? (toAcc.accountName   || "—") : "—";
        return {
          type:           "bank_transfer" as const,
          documentNumber: t.transferNumber,
          amount:         t.amount,
          date:           t.transferDate,
          timestamp:      t.createdAt,
          description:    `${fromName} → ${toName}`,
        };
      })
    );

    // ── Merge & Sort ─────────────────────────────────────────────────────────
    const all = [
      ...invoiceItems,
      ...receiptItems,
      ...paymentItems,
      ...grnItems,
      ...transferItems,
    ];

    all.sort((a, b) => b.timestamp - a.timestamp);

    return all.slice(0, limit);
  },
});
