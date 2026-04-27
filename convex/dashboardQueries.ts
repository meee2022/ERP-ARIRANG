import { query } from "./_generated/server";
import { v } from "convex/values";

export const getDashboardSummary = query({
  args: {
    companyId: v.id("companies"),
    branchId: v.optional(v.id("branches")),
    fromDate: v.string(),
    toDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Sales invoices for date range (whole month)
    const allInvoices = await ctx.db
      .query("salesInvoices")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .order("desc")
      .take(500);

    const branchFiltered = args.branchId
      ? allInvoices.filter((i) => i.branchId === args.branchId)
      : allInvoices;

    const monthInvoices = branchFiltered.filter(
      (i) => i.invoiceDate >= args.fromDate && i.invoiceDate <= args.toDate
    );

    const todaySales = monthInvoices
      .filter((i) => i.invoiceDate === args.toDate && i.postingStatus === "posted")
      .reduce((s, i) => s + i.totalAmount, 0);

    const monthSales = monthInvoices
      .filter((i) => i.postingStatus === "posted")
      .reduce((s, i) => s + i.totalAmount, 0);

    // Cash receipts
    const allReceipts = await ctx.db
      .query("cashReceiptVouchers")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .order("desc")
      .take(200);

    const todayReceipts = allReceipts
      .filter((r) => r.voucherDate === args.toDate && r.postingStatus === "posted")
      .reduce((s, r) => s + r.amount, 0);

    // Total AR (unpaid/partial credit invoices)
    const unpaidSales = await ctx.db
      .query("salesInvoices")
      .filter((q) =>
        q.and(
          q.eq(q.field("companyId"), args.companyId),
          q.or(
            q.eq(q.field("paymentStatus"), "unpaid"),
            q.eq(q.field("paymentStatus"), "partial")
          )
        )
      )
      .collect();
    const totalAR = unpaidSales.reduce((s, i) => s + i.creditAmount, 0);

    // Total AP (unpaid/partial purchase invoices)
    const unpaidPurchases = await ctx.db
      .query("purchaseInvoices")
      .filter((q) =>
        q.and(
          q.eq(q.field("companyId"), args.companyId),
          q.or(
            q.eq(q.field("paymentStatus"), "unpaid"),
            q.eq(q.field("paymentStatus"), "partial")
          )
        )
      )
      .collect();
    const totalAP = unpaidPurchases.reduce((s, i) => s + i.totalAmount, 0);

    // Cheques due within 7 days
    const today = args.toDate;
    const todayDate = new Date(today);
    const in7Days = new Date(todayDate.getTime() + 7 * 86400000)
      .toISOString()
      .split("T")[0];

    const dueCheques = await ctx.db
      .query("cheques")
      .filter((q) =>
        q.and(
          q.eq(q.field("companyId"), args.companyId),
          q.lte(q.field("dueDate"), in7Days),
          q.gte(q.field("dueDate"), today),
          q.or(
            q.eq(q.field("chequeStatus"), "received"),
            q.eq(q.field("chequeStatus"), "issued")
          )
        )
      )
      .collect();
    const dueChequeAmount = dueCheques.reduce((s, c) => s + c.amount, 0);

    // Recent invoices (last 10)
    const recentInvoices = await ctx.db
      .query("salesInvoices")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .order("desc")
      .take(10);

    // Enrich with customer names
    const enrichedInvoices = await Promise.all(
      recentInvoices.map(async (inv) => {
        const customer = inv.customerId ? await ctx.db.get(inv.customerId) : null;
        return { ...inv, customerName: customer?.nameAr ?? "—" };
      })
    );

    // Recent journal entries (last 5)
    const recentJournals = await ctx.db
      .query("journalEntries")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .order("desc")
      .take(5);

    return {
      todaySales,
      monthSales,
      todayReceipts,
      totalAR,
      totalAP,
      dueChequeAmount,
      dueChequeCount: dueCheques.length,
      recentInvoices: enrichedInvoices,
      recentJournals,
    };
  },
});
