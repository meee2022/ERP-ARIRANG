import { query } from "./_generated/server";
import { v } from "convex/values";

export const globalSearch = query({
  args: {
    companyId: v.id("companies"),
    q: v.string(),
  },
  handler: async (ctx, { companyId, q }) => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];

    const results: Array<{
      type: string;
      label: string;
      sub: string;
      href: string;
      badge: string;
    }> = [];

    // ── Sales Invoices ──────────────────────────────────────────────────────
    const salesInvoices = await ctx.db
      .query("salesInvoices")
      .filter((q) => q.eq(q.field("companyId"), companyId))
      .order("desc")
      .take(500);

    for (const inv of salesInvoices) {
      const num = (inv.invoiceNumber ?? "").toLowerCase();
      const ext = (inv.externalInvoiceNumber ?? "").toLowerCase();
      if (num.includes(term) || ext.includes(term)) {
        results.push({
          type: "salesInvoice",
          label: inv.invoiceNumber,
          sub: inv.externalInvoiceNumber ? `Customer No: ${inv.externalInvoiceNumber}` : inv.invoiceDate,
          href: `/sales/invoices/${inv._id}`,
          badge: "فاتورة مبيعات",
        });
      }
      if (results.length >= 10) break;
    }

    // ── Cash Receipts ────────────────────────────────────────────────────────
    if (results.length < 10) {
      const receipts = await ctx.db
        .query("cashReceiptVouchers")
        .filter((q) => q.eq(q.field("companyId"), companyId))
        .order("desc")
        .take(300);

      for (const r of receipts) {
        const num = (r.voucherNumber ?? "").toLowerCase();
        const ref = (r.referenceNumber ?? "").toLowerCase();
        if (num.includes(term) || ref.includes(term)) {
          results.push({
            type: "receipt",
            label: r.voucherNumber,
            sub: ref ? `Ref: ${r.referenceNumber}` : r.voucherDate,
            href: `/treasury/receipts/${r._id}`,
            badge: "سند قبض",
          });
        }
        if (results.length >= 10) break;
      }
    }

    // ── Cash Payments ────────────────────────────────────────────────────────
    if (results.length < 10) {
      const payments = await ctx.db
        .query("cashPaymentVouchers")
        .filter((q) => q.eq(q.field("companyId"), companyId))
        .order("desc")
        .take(300);

      for (const p of payments) {
        const num = (p.voucherNumber ?? "").toLowerCase();
        const ref = (p.referenceNumber ?? "").toLowerCase();
        if (num.includes(term) || ref.includes(term)) {
          results.push({
            type: "payment",
            label: p.voucherNumber,
            sub: ref ? `Ref: ${p.referenceNumber}` : p.voucherDate,
            href: `/treasury/payments/${p._id}`,
            badge: "سند صرف",
          });
        }
        if (results.length >= 10) break;
      }
    }

    // ── Purchase Invoices ────────────────────────────────────────────────────
    if (results.length < 10) {
      const purchases = await ctx.db
        .query("purchaseInvoices")
        .filter((q) => q.eq(q.field("companyId"), companyId))
        .order("desc")
        .take(300);

      for (const p of purchases) {
        const num = (p.invoiceNumber ?? "").toLowerCase();
        const sup = ((p as any).supplierInvoiceNumber ?? "").toLowerCase();
        if (num.includes(term) || sup.includes(term)) {
          results.push({
            type: "purchaseInvoice",
            label: p.invoiceNumber,
            sub: sup ? `Supplier No: ${(p as any).supplierInvoiceNumber}` : (p as any).invoiceDate ?? "",
            href: `/purchases/invoices/${p._id}`,
            badge: "فاتورة مشتريات",
          });
        }
        if (results.length >= 10) break;
      }
    }

    // ── Customers ────────────────────────────────────────────────────────────
    if (results.length < 10) {
      const customers = await ctx.db
        .query("customers")
        .filter((q) => q.eq(q.field("companyId"), companyId))
        .take(300);

      for (const c of customers) {
        const ar = (c.nameAr ?? "").toLowerCase();
        const en = ((c as any).nameEn ?? "").toLowerCase();
        const code = (c.code ?? "").toLowerCase();
        if (ar.includes(term) || en.includes(term) || code.includes(term)) {
          results.push({
            type: "customer",
            label: c.nameAr,
            sub: (c as any).nameEn ?? c.code ?? "",
            href: `/sales/customers/${c._id}`,
            badge: "عميل",
          });
        }
        if (results.length >= 10) break;
      }
    }

    return results.slice(0, 10);
  },
});
