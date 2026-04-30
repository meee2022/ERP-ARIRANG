import { query } from "./_generated/server";
import { v } from "convex/values";

// ─── CASH ACCOUNTS LIST ───────────────────────────────────────────────────────
// Priority: operationalType === "cash" | "bank"  (explicit, set by user)
// Fallback: name-based heuristic for accounts without operationalType set yet.
export const listCashAndBankAccounts = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    const all = await ctx.db
      .query("accounts")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return all.filter((a) => {
      const opType = (a as any).operationalType ?? "";
      // ① Explicit flag — always include
      if (opType === "cash" || opType === "bank") return true;
      // ② Fallback: name heuristic (supports legacy data without flag)
      const name = (a.nameAr ?? "").toLowerCase();
      const nameEn = ((a as any).nameEn ?? "").toLowerCase();
      return (
        name.includes("صندوق") || name.includes("نقد") || name.includes("بنك") ||
        nameEn.includes("cash") || nameEn.includes("bank")
      );
    });
  },
});

// ─── TRIAL BALANCE ────────────────────────────────────────────────────────────

export const getTrialBalance = query({
  args: {
    companyId: v.id("companies"),
    fromDate: v.string(),
    toDate: v.string(),
    branchId: v.optional(v.id("branches")),
    includeZero: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Get all posted journal entries in range
    let entries = await ctx.db
      .query("journalEntries")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .filter((q) => q.eq(q.field("postingStatus"), "posted"))
      .collect();

    if (args.branchId) {
      entries = entries.filter((e) => e.branchId === args.branchId);
    }

    const periodEntries = entries.filter(
      (e) => e.entryDate >= args.fromDate && e.entryDate <= args.toDate
    );
    const openingEntries = entries.filter((e) => e.entryDate < args.fromDate);

    // Aggregate by account
    const accountMap: Map<
      string,
      {
        accountId: string;
        openingDebit: number;
        openingCredit: number;
        periodDebit: number;
        periodCredit: number;
      }
    > = new Map();

    const processLines = async (
      entryIds: string[],
      isOpening: boolean
    ) => {
      for (const entryId of entryIds) {
        const lines = await ctx.db
          .query("journalLines")
          .withIndex("by_entry", (q) => q.eq("entryId", entryId as any))
          .collect();

        for (const line of lines) {
          const key = line.accountId as string;
          if (!accountMap.has(key)) {
            accountMap.set(key, {
              accountId: key,
              openingDebit: 0,
              openingCredit: 0,
              periodDebit: 0,
              periodCredit: 0,
            });
          }
          const acc = accountMap.get(key)!;
          if (isOpening) {
            acc.openingDebit += line.debit;
            acc.openingCredit += line.credit;
          } else {
            acc.periodDebit += line.debit;
            acc.periodCredit += line.credit;
          }
        }
      }
    };

    await processLines(openingEntries.map((e) => e._id as string), true);
    await processLines(periodEntries.map((e) => e._id as string), false);

    // Enrich with account info
    const result = [];
    for (const [accountId, data] of accountMap.entries()) {
      const account = await ctx.db.get(accountId as any);
      if (!account) continue;

      const closingDebit =
        data.openingDebit + data.periodDebit - data.openingCredit - data.periodCredit;
      const closingCredit = -closingDebit;

      if (!args.includeZero && data.openingDebit === 0 && data.openingCredit === 0 &&
          data.periodDebit === 0 && data.periodCredit === 0) {
        continue;
      }

      result.push({
        accountId,
        accountCode: (account as any).code,
        accountNameAr: (account as any).nameAr,
        accountNameEn: (account as any).nameEn,
        accountType: (account as any).accountType,
        openingDebit: Math.max(0, data.openingDebit - data.openingCredit),
        openingCredit: Math.max(0, data.openingCredit - data.openingDebit),
        periodDebit: data.periodDebit,
        periodCredit: data.periodCredit,
        closingDebit: Math.max(0, closingDebit),
        closingCredit: Math.max(0, closingCredit),
      });
    }

    result.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    return result;
  },
});

// ─── GENERAL LEDGER ───────────────────────────────────────────────────────────

export const getGeneralLedger = query({
  args: {
    accountId: v.id("accounts"),
    fromDate: v.string(),
    toDate: v.string(),
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account) return null;

    // Get all posted lines for this account
    const allLines = await ctx.db
      .query("journalLines")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .collect();

    const entriesWithLines = await Promise.all(
      allLines.map(async (line) => {
        const entry = await ctx.db.get(line.entryId);
        return entry ? { line, entry } : null;
      })
    );

    const valid = entriesWithLines.filter(
      (x) => x && x.entry.postingStatus === "posted"
    ) as Array<{ line: (typeof allLines)[0]; entry: any }>;

    if (args.branchId) {
      const filtered = valid.filter((x) => x.entry.branchId === args.branchId);
      valid.splice(0, valid.length, ...filtered);
    }

    // Opening balance: all transactions before fromDate
    const opening = valid
      .filter((x) => x.entry.entryDate < args.fromDate)
      .reduce(
        (acc, x) => ({ debit: acc.debit + x.line.debit, credit: acc.credit + x.line.credit }),
        { debit: 0, credit: 0 }
      );

    const openingBalance = opening.debit - opening.credit;

    // Period transactions
    const period = valid.filter(
      (x) => x.entry.entryDate >= args.fromDate && x.entry.entryDate <= args.toDate
    );

    period.sort((a, b) => a.entry.entryDate.localeCompare(b.entry.entryDate));

    let runningBalance = openingBalance;
    const ledgerLines = period.map((x) => {
      const movement = x.line.debit - x.line.credit;
      runningBalance += movement;
      return {
        entryDate: x.entry.entryDate,
        entryNumber: x.entry.entryNumber,
        description: x.line.description ?? x.entry.description,
        journalType: x.entry.journalType,
        debit: x.line.debit,
        credit: x.line.credit,
        runningBalance,
        entryId: x.entry._id,
      };
    });

    return {
      account,
      openingBalance,
      lines: ledgerLines,
      totalDebit: period.reduce((s, x) => s + x.line.debit, 0),
      totalCredit: period.reduce((s, x) => s + x.line.credit, 0),
      closingBalance: runningBalance,
    };
  },
});

// ─── CUSTOMER STATEMENT ───────────────────────────────────────────────────────

export const getCustomerStatement = query({
  args: {
    customerId: v.id("customers"),
    fromDate: v.string(),
    toDate: v.string(),
  },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer) return null;

    // All invoices (include unposted, exclude reversed/cancelled)
    const invoices = await ctx.db
      .query("salesInvoices")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .filter((q) => q.neq(q.field("postingStatus"), "reversed"))
      .collect();

    // Sales returns for this customer
    const returns = await ctx.db
      .query("salesReturns")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .filter((q) => q.neq(q.field("postingStatus"), "reversed"))
      .collect();

    // Cash receipts
    const receipts = await ctx.db
      .query("cashReceiptVouchers")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .filter((q) => q.neq(q.field("postingStatus"), "reversed"))
      .collect();

    // Outlet name cache
    const outletCache: Record<string, string> = {};
    const getOutletName = async (outletId: string | undefined) => {
      if (!outletId) return "";
      if (outletCache[outletId]) return outletCache[outletId];
      const outlet = await ctx.db.get(outletId as any);
      const name = outlet ? (outlet.nameEn || outlet.nameAr || "") : "";
      outletCache[outletId] = name;
      return name;
    };

    // Period filters
    const periodInvoices = invoices.filter(
      (i) => i.invoiceDate >= args.fromDate && i.invoiceDate <= args.toDate
        && i.documentStatus !== "cancelled"
    );
    const periodReturns = returns.filter(
      (r) => r.returnDate >= args.fromDate && r.returnDate <= args.toDate
        && r.documentStatus !== "cancelled"
    );
    const periodReceipts = receipts.filter(
      (r) => r.voucherDate >= args.fromDate && r.voucherDate <= args.toDate
    );

    // Opening balance (before fromDate)
    const openingInvoiceTotal = invoices
      .filter((i) => i.invoiceDate < args.fromDate && i.documentStatus !== "cancelled")
      .reduce((s, i) => s + (i.totalAmount ?? 0), 0);
    const openingReturnTotal = returns
      .filter((r) => r.returnDate < args.fromDate && r.documentStatus !== "cancelled")
      .reduce((s, r) => s + (r.totalAmount ?? 0), 0);
    const openingReceiptTotal = receipts
      .filter((r) => r.voucherDate < args.fromDate)
      .reduce((s, r) => s + r.amount, 0);
    const openingBalance = openingInvoiceTotal - openingReturnTotal - openingReceiptTotal;

    // Build transaction rows with outlet names
    const invoiceRows = await Promise.all(periodInvoices.map(async (i) => ({
      date: i.invoiceDate,
      type: "invoice" as const,
      journal: "Sales voucher",
      documentNo: i.externalInvoiceNumber || i.invoiceNumber,
      refNumber: i.invoiceNumber,
      subAccount: await getOutletName(i.customerOutletId as any),
      debit: i.totalAmount ?? 0,
      credit: 0,
      postingStatus: i.postingStatus,
      documentId: i._id,
    })));

    const returnRows = await Promise.all(periodReturns.map(async (r) => ({
      date: r.returnDate,
      type: "return" as const,
      journal: "Sales returned voucher",
      documentNo: r.returnNumber,
      refNumber: r.returnNumber,
      subAccount: await getOutletName(r.customerOutletId as any),
      debit: 0,
      credit: r.totalAmount ?? 0,
      postingStatus: r.postingStatus,
      documentId: r._id,
    })));

    const receiptRows = periodReceipts.map((r) => ({
      date: r.voucherDate,
      type: "receipt" as const,
      journal: "Cash receipt",
      documentNo: r.voucherNumber,
      refNumber: r.voucherNumber,
      subAccount: "",
      debit: 0,
      credit: r.amount,
      postingStatus: r.postingStatus,
      documentId: r._id,
    }));

    const transactions = [...invoiceRows, ...returnRows, ...receiptRows]
      .sort((a, b) => a.date.localeCompare(b.date));

    let runningBalance = openingBalance;
    const statement = transactions.map((t) => {
      runningBalance += t.debit - t.credit;
      return { ...t, balance: runningBalance };
    });

    return {
      customer,
      openingBalance,
      transactions: statement,
      totalDebit: transactions.reduce((s, t) => s + t.debit, 0),
      totalCredit: transactions.reduce((s, t) => s + t.credit, 0),
      closingBalance: runningBalance,
    };
  },
});

// ─── SUPPLIER STATEMENT ───────────────────────────────────────────────────────

export const getSupplierStatement = query({
  args: {
    supplierId: v.id("suppliers"),
    fromDate: v.string(),
    toDate: v.string(),
  },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) return null;

    const invoices = await ctx.db
      .query("purchaseInvoices")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .filter((q) => q.eq(q.field("postingStatus"), "posted"))
      .collect();

    const periodInvoices = invoices.filter(
      (i) => i.invoiceDate >= args.fromDate && i.invoiceDate <= args.toDate
    );

    const payments = await ctx.db
      .query("cashPaymentVouchers")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .filter((q) => q.eq(q.field("postingStatus"), "posted"))
      .collect();

    const periodPayments = payments.filter(
      (p) => p.voucherDate >= args.fromDate && p.voucherDate <= args.toDate
    );

    const openingInvoices = invoices.filter((i) => i.invoiceDate < args.fromDate);
    const openingPayments = payments.filter((p) => p.voucherDate < args.fromDate);
    const openingBalance =
      openingInvoices.reduce((s, i) => s + i.totalAmount, 0) -
      openingPayments.reduce((s, p) => s + p.amount, 0);

    const transactions = [
      ...periodInvoices.map((i) => ({
        date: i.invoiceDate,
        type: "invoice" as const,
        reference: i.invoiceNumber,
        description: `فاتورة مشتريات`,
        debit: 0,
        credit: i.totalAmount,
        documentId: i._id,
      })),
      ...periodPayments.map((p) => ({
        date: p.voucherDate,
        type: "payment" as const,
        reference: p.voucherNumber,
        description: `Cash Payment / سند صرف`,
        debit: p.amount,
        credit: 0,
        documentId: p._id,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    let runningBalance = openingBalance;
    const statement = transactions.map((t) => {
      runningBalance += t.credit - t.debit;
      return { ...t, balance: runningBalance };
    });

    return {
      supplier,
      openingBalance,
      transactions: statement,
      totalDebit: transactions.reduce((s, t) => s + t.debit, 0),
      totalCredit: transactions.reduce((s, t) => s + t.credit, 0),
      closingBalance: runningBalance,
    };
  },
});

export const getSalesDetailsReport = query({
  args: {
    fromDate: v.string(),
    toDate: v.string(),
    branchId: v.optional(v.id("branches")),
    customerId: v.optional(v.id("customers")),
    salesRepId: v.optional(v.id("salesReps")),
    vehicleId: v.optional(v.id("deliveryVehicles")),
    paymentMethod: v.optional(v.string()),
    postingStatus: v.optional(v.union(v.literal("unposted"), v.literal("posted"), v.literal("reversed"))),
    reviewStatus: v.optional(v.union(v.literal("draft"), v.literal("submitted"), v.literal("rejected"), v.literal("approved"))),
  },
  handler: async (ctx, args) => {
    let invoices = await ctx.db.query("salesInvoices").collect();

    invoices = invoices.filter(
      (invoice) =>
        invoice.invoiceDate >= args.fromDate &&
        invoice.invoiceDate <= args.toDate &&
        (!args.branchId || invoice.branchId === args.branchId) &&
        (!args.customerId || invoice.customerId === args.customerId) &&
        (!args.salesRepId || invoice.salesRepId === args.salesRepId) &&
        (!args.vehicleId || invoice.vehicleId === args.vehicleId) &&
        (!args.paymentMethod || invoice.paymentMethod === args.paymentMethod) &&
        (!args.postingStatus || invoice.postingStatus === args.postingStatus) &&
        (!args.reviewStatus || (invoice.reviewStatus ?? "draft") === args.reviewStatus)
    );

    invoices.sort((a, b) => {
      if (a.invoiceDate === b.invoiceDate) return String(a.invoiceNumber).localeCompare(String(b.invoiceNumber));
      return b.invoiceDate.localeCompare(a.invoiceDate);
    });

    const rows = await Promise.all(
      invoices.map(async (invoice) => {
        const customer = invoice.customerId ? await ctx.db.get(invoice.customerId) : null;
        const branch = await ctx.db.get(invoice.branchId);
        const salesRep = invoice.salesRepId ? await ctx.db.get(invoice.salesRepId) : null;
        const vehicle = invoice.vehicleId ? await ctx.db.get(invoice.vehicleId) : null;
        const creator = await ctx.db.get(invoice.createdBy);

        return {
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          externalInvoiceNumber: invoice.externalInvoiceNumber ?? null,
          invoiceDate: invoice.invoiceDate,
          invoiceType: invoice.invoiceType,
          paymentMethod: invoice.paymentMethod ?? null,
          customerNameAr: customer?.nameAr ?? "—",
          customerNameEn: customer?.nameEn ?? null,
          branchNameAr: branch?.nameAr ?? "—",
          branchNameEn: branch?.nameEn ?? null,
          salesRepNameAr: salesRep?.nameAr ?? invoice.salesRepName ?? null,
          salesRepNameEn: salesRep?.nameEn ?? null,
          vehicleCode: vehicle?.code ?? invoice.vehicleCode ?? null,
          vehicleDescriptionAr: vehicle?.descriptionAr ?? null,
          vehicleDescriptionEn: vehicle?.descriptionEn ?? null,
          subtotal: invoice.subtotal ?? 0,
          discountAmount: invoice.discountAmount ?? 0,
          vatAmount: invoice.vatAmount ?? 0,
          serviceCharge: invoice.serviceCharge ?? 0,
          totalAmount: invoice.totalAmount ?? 0,
          cashReceived: invoice.cashReceived ?? 0,
          cardReceived: invoice.cardReceived ?? 0,
          creditAmount: invoice.creditAmount ?? 0,
          documentStatus: invoice.documentStatus,
          reviewStatus: invoice.reviewStatus ?? "draft",
          postingStatus: invoice.postingStatus,
          paymentStatus: invoice.paymentStatus,
          createdByName: creator?.name ?? "—",
        };
      })
    );

    return {
      rows,
      totals: {
        invoiceCount: rows.length,
        subtotal: rows.reduce((sum, row) => sum + row.subtotal, 0),
        discountAmount: rows.reduce((sum, row) => sum + row.discountAmount, 0),
        vatAmount: rows.reduce((sum, row) => sum + row.vatAmount, 0),
        serviceCharge: rows.reduce((sum, row) => sum + row.serviceCharge, 0),
        totalAmount: rows.reduce((sum, row) => sum + row.totalAmount, 0),
        cashReceived: rows.reduce((sum, row) => sum + row.cashReceived, 0),
        cardReceived: rows.reduce((sum, row) => sum + row.cardReceived, 0),
        creditAmount: rows.reduce((sum, row) => sum + row.creditAmount, 0),
      },
    };
  },
});

export const getDailySalesReport = query({
  args: {
    fromDate: v.string(),
    toDate: v.string(),
    branchId: v.optional(v.id("branches")),
    salesRepId: v.optional(v.id("salesReps")),
    vehicleId: v.optional(v.id("deliveryVehicles")),
  },
  handler: async (ctx, args) => {
    let invoices = await ctx.db.query("salesInvoices").collect();

    invoices = invoices.filter(
      (invoice) =>
        invoice.invoiceDate >= args.fromDate &&
        invoice.invoiceDate <= args.toDate &&
        invoice.postingStatus !== "reversed" &&
        (!args.branchId || invoice.branchId === args.branchId) &&
        (!args.salesRepId || invoice.salesRepId === args.salesRepId) &&
        (!args.vehicleId || invoice.vehicleId === args.vehicleId)
    );

    // Sales returns in period
    let returns = await ctx.db.query("salesReturns").collect();
    returns = returns.filter(
      (r) =>
        r.returnDate >= args.fromDate &&
        r.returnDate <= args.toDate &&
        r.postingStatus !== "reversed" &&
        r.documentStatus !== "cancelled" &&
        (!args.branchId || r.branchId === args.branchId)
    );

    const grouped = new Map<
      string,
      {
        date: string;
        invoiceCount: number;
        grossSales: number;
        discountAmount: number;
        cashSales: number;
        creditSales: number;
        cashReturn: number;
        creditReturn: number;
        netSales: number;
      }
    >();

    const ensureDay = (date: string) => {
      if (!grouped.has(date)) {
        grouped.set(date, {
          date,
          invoiceCount: 0,
          grossSales: 0,
          discountAmount: 0,
          cashSales: 0,
          creditSales: 0,
          cashReturn: 0,
          creditReturn: 0,
          netSales: 0,
        });
      }
      return grouped.get(date)!;
    };

    for (const invoice of invoices) {
      const row = ensureDay(invoice.invoiceDate);
      row.invoiceCount += 1;
      row.grossSales += invoice.subtotal ?? 0;
      row.discountAmount += invoice.discountAmount ?? 0;
      row.netSales += invoice.totalAmount ?? 0;
      // Cash portion: cashReceived field, or full amount if cash_sale
      const isCash = invoice.invoiceType === "cash_sale" || invoice.paymentMethod === "cash";
      const isCredit = invoice.invoiceType === "credit_sale";
      if (isCash) row.cashSales += invoice.cashReceived ?? invoice.totalAmount ?? 0;
      else if (isCredit) row.creditSales += invoice.creditAmount ?? invoice.totalAmount ?? 0;
      else {
        // mixed: split by cashReceived / creditAmount
        row.cashSales += invoice.cashReceived ?? 0;
        row.creditSales += invoice.creditAmount ?? 0;
      }
    }

    for (const ret of returns) {
      const row = ensureDay(ret.returnDate);
      if (ret.refundMethod === "cash") {
        row.cashReturn += ret.totalAmount ?? 0;
      } else {
        row.creditReturn += ret.totalAmount ?? 0;
      }
      // Deduct returns from net
      row.netSales -= ret.totalAmount ?? 0;
    }

    const rows = Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));

    return {
      rows,
      totals: {
        dayCount: rows.length,
        invoiceCount: rows.reduce((sum, row) => sum + row.invoiceCount, 0),
        grossSales: rows.reduce((sum, row) => sum + row.grossSales, 0),
        discountAmount: rows.reduce((sum, row) => sum + row.discountAmount, 0),
        cashSales: rows.reduce((sum, row) => sum + row.cashSales, 0),
        creditSales: rows.reduce((sum, row) => sum + row.creditSales, 0),
        cashReturn: rows.reduce((sum, row) => sum + row.cashReturn, 0),
        creditReturn: rows.reduce((sum, row) => sum + row.creditReturn, 0),
        netSales: rows.reduce((sum, row) => sum + row.netSales, 0),
      },
    };
  },
});

export const getItemSalesReport = query({
  args: {
    fromDate: v.string(),
    toDate: v.string(),
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    let invoices = await ctx.db.query("salesInvoices").collect();
    invoices = invoices.filter(
      (invoice) =>
        invoice.invoiceDate >= args.fromDate &&
        invoice.invoiceDate <= args.toDate &&
        (!args.branchId || invoice.branchId === args.branchId)
    );

    const bucket = new Map<string, any>();

    for (const invoice of invoices) {
      const lines = await ctx.db
        .query("salesInvoiceLines")
        .withIndex("by_invoice", (q) => q.eq("invoiceId", invoice._id))
        .collect();

      for (const line of lines) {
        const item = await ctx.db.get(line.itemId);
        const key = String(line.itemId);
        if (!bucket.has(key)) {
          bucket.set(key, {
            itemId: line.itemId,
            itemCode: item?.code ?? "—",
            itemNameAr: item?.nameAr ?? "—",
            itemNameEn: item?.nameEn ?? null,
            quantitySold: 0,
            grossSales: 0,
            netSales: 0,
            invoiceCount: 0,
          });
        }

        const row = bucket.get(key);
        const lineGross = (line.quantity ?? 0) * (line.unitPrice ?? 0);
        row.quantitySold += line.quantity ?? 0;
        row.grossSales += lineGross;
        row.netSales += line.lineTotal ?? lineGross;
        row.invoiceCount += 1;
      }
    }

    const rows = Array.from(bucket.values())
      .map((row) => ({
        ...row,
        averageSellingPrice: row.quantitySold > 0 ? Math.round(row.netSales / row.quantitySold) : 0,
      }))
      .sort((a, b) => b.netSales - a.netSales);

    return {
      rows,
      totals: {
        itemCount: rows.length,
        quantitySold: rows.reduce((sum, row) => sum + row.quantitySold, 0),
        grossSales: rows.reduce((sum, row) => sum + row.grossSales, 0),
        netSales: rows.reduce((sum, row) => sum + row.netSales, 0),
      },
    };
  },
});

export const getTopSalesReport = query({
  args: {
    fromDate: v.string(),
    toDate: v.string(),
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    let invoices = await ctx.db.query("salesInvoices").collect();
    invoices = invoices.filter(
      (invoice) =>
        invoice.invoiceDate >= args.fromDate &&
        invoice.invoiceDate <= args.toDate &&
        (!args.branchId || invoice.branchId === args.branchId)
    );

    const customerMap = new Map<string, any>();
    const itemMap = new Map<string, any>();
    const salesRepMap = new Map<string, any>();

    for (const invoice of invoices) {
      if (invoice.customerId) {
        const customer = await ctx.db.get(invoice.customerId);
        const key = String(invoice.customerId);
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            id: invoice.customerId,
            code: customer?.code ?? "—",
            nameAr: customer?.nameAr ?? "—",
            nameEn: customer?.nameEn ?? null,
            invoiceCount: 0,
            totalSales: 0,
          });
        }
        const row = customerMap.get(key);
        row.invoiceCount += 1;
        row.totalSales += invoice.totalAmount ?? 0;
      }

      if (invoice.salesRepId || invoice.salesRepName) {
        const salesRep = invoice.salesRepId ? await ctx.db.get(invoice.salesRepId) : null;
        const key = String(invoice.salesRepId ?? invoice.salesRepName);
        if (!salesRepMap.has(key)) {
          salesRepMap.set(key, {
            id: invoice.salesRepId ?? null,
            code: salesRep?.code ?? null,
            nameAr: salesRep?.nameAr ?? invoice.salesRepName ?? "—",
            nameEn: salesRep?.nameEn ?? null,
            invoiceCount: 0,
            totalSales: 0,
          });
        }
        const row = salesRepMap.get(key);
        row.invoiceCount += 1;
        row.totalSales += invoice.totalAmount ?? 0;
      }

      const lines = await ctx.db
        .query("salesInvoiceLines")
        .withIndex("by_invoice", (q) => q.eq("invoiceId", invoice._id))
        .collect();

      for (const line of lines) {
        const item = await ctx.db.get(line.itemId);
        const key = String(line.itemId);
        if (!itemMap.has(key)) {
          itemMap.set(key, {
            id: line.itemId,
            code: item?.code ?? "—",
            nameAr: item?.nameAr ?? "—",
            nameEn: item?.nameEn ?? null,
            quantitySold: 0,
            totalSales: 0,
          });
        }
        const row = itemMap.get(key);
        row.quantitySold += line.quantity ?? 0;
        row.totalSales += line.lineTotal ?? 0;
      }
    }

    return {
      topCustomers: Array.from(customerMap.values()).sort((a, b) => b.totalSales - a.totalSales).slice(0, 10),
      topItems: Array.from(itemMap.values()).sort((a, b) => b.totalSales - a.totalSales).slice(0, 10),
      topSalesReps: Array.from(salesRepMap.values()).sort((a, b) => b.totalSales - a.totalSales).slice(0, 10),
      totals: {
        customerCount: customerMap.size,
        itemCount: itemMap.size,
        salesRepCount: salesRepMap.size,
        totalSales: invoices.reduce((sum, invoice) => sum + (invoice.totalAmount ?? 0), 0),
      },
    };
  },
});

export const getSalesBySalesRep = query({
  args: {
    fromDate: v.string(),
    toDate: v.string(),
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    let invoices = await ctx.db
      .query("salesInvoices")
      .filter((q) => q.eq(q.field("postingStatus"), "posted"))
      .collect();

    invoices = invoices.filter(
      (invoice) =>
        invoice.invoiceDate >= args.fromDate &&
        invoice.invoiceDate <= args.toDate &&
        (!args.branchId || invoice.branchId === args.branchId)
    );

    const grouped = new Map<string, any>();

    for (const invoice of invoices) {
      const key = invoice.salesRepId ?? `manual:${invoice.salesRepName ?? "unassigned"}`;
      if (!grouped.has(key)) {
        let salesRep = null;
        if (invoice.salesRepId) {
          salesRep = await ctx.db.get(invoice.salesRepId);
        }
        grouped.set(key, {
          salesRepId: invoice.salesRepId ?? null,
          salesRepCode: salesRep?.code ?? null,
          salesRepNameAr: salesRep?.nameAr ?? invoice.salesRepName ?? "غير محدد",
          salesRepNameEn: salesRep?.nameEn ?? invoice.salesRepName ?? "Unassigned",
          invoiceCount: 0,
          totalSales: 0,
          cashSales: 0,
          creditSales: 0,
        });
      }

      const row = grouped.get(key)!;
      row.invoiceCount += 1;
      row.totalSales += invoice.totalAmount ?? 0;
      if (invoice.invoiceType === "cash_sale" || invoice.invoiceType === "mixed_sale") {
        row.cashSales += invoice.totalAmount ?? 0;
      }
      if (invoice.invoiceType === "credit_sale" || invoice.invoiceType === "mixed_sale") {
        row.creditSales += invoice.creditAmount ?? 0;
      }
    }

    const rows = Array.from(grouped.values()).sort((a, b) =>
      String(a.salesRepNameAr).localeCompare(String(b.salesRepNameAr))
    );

    return {
      rows,
      totals: {
        invoiceCount: rows.reduce((sum, row) => sum + row.invoiceCount, 0),
        totalSales: rows.reduce((sum, row) => sum + row.totalSales, 0),
        cashSales: rows.reduce((sum, row) => sum + row.cashSales, 0),
        creditSales: rows.reduce((sum, row) => sum + row.creditSales, 0),
      },
    };
  },
});

export const getSalesByVehicle = query({
  args: {
    fromDate: v.string(),
    toDate: v.string(),
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    let invoices = await ctx.db
      .query("salesInvoices")
      .filter((q) => q.eq(q.field("postingStatus"), "posted"))
      .collect();

    invoices = invoices.filter(
      (invoice) =>
        invoice.invoiceDate >= args.fromDate &&
        invoice.invoiceDate <= args.toDate &&
        (!args.branchId || invoice.branchId === args.branchId)
    );

    const grouped = new Map<string, any>();

    for (const invoice of invoices) {
      const key = invoice.vehicleId ?? `manual:${invoice.vehicleCode ?? "unassigned"}`;
      if (!grouped.has(key)) {
        let vehicle = null;
        if (invoice.vehicleId) {
          vehicle = await ctx.db.get(invoice.vehicleId);
        }
        grouped.set(key, {
          vehicleId: invoice.vehicleId ?? null,
          vehicleCode: vehicle?.code ?? invoice.vehicleCode ?? "—",
          vehicleDescriptionAr: vehicle?.descriptionAr ?? "غير محدد",
          vehicleDescriptionEn: vehicle?.descriptionEn ?? "Unassigned",
          invoiceCount: 0,
          totalSales: 0,
          cashSales: 0,
          creditSales: 0,
        });
      }

      const row = grouped.get(key)!;
      row.invoiceCount += 1;
      row.totalSales += invoice.totalAmount ?? 0;
      if (invoice.invoiceType === "cash_sale" || invoice.invoiceType === "mixed_sale") {
        row.cashSales += invoice.totalAmount ?? 0;
      }
      if (invoice.invoiceType === "credit_sale" || invoice.invoiceType === "mixed_sale") {
        row.creditSales += invoice.creditAmount ?? 0;
      }
    }

    const rows = Array.from(grouped.values()).sort((a, b) =>
      String(a.vehicleCode).localeCompare(String(b.vehicleCode))
    );

    return {
      rows,
      totals: {
        invoiceCount: rows.reduce((sum, row) => sum + row.invoiceCount, 0),
        totalSales: rows.reduce((sum, row) => sum + row.totalSales, 0),
        cashSales: rows.reduce((sum, row) => sum + row.cashSales, 0),
        creditSales: rows.reduce((sum, row) => sum + row.creditSales, 0),
      },
    };
  },
});

// ─── AR AGING ─────────────────────────────────────────────────────────────────

export const getARaging = query({
  args: {
    companyId: v.id("companies"),
    asOfDate: v.string(),
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    let invoices = await ctx.db
      .query("salesInvoices")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .filter((q) => q.eq(q.field("postingStatus"), "posted"))
      .collect();

    if (args.branchId) {
      invoices = invoices.filter((i) => i.branchId === args.branchId);
    }

    // Only unpaid/partial credit invoices on or before asOfDate
    const outstanding = invoices.filter(
      (i) =>
        i.invoiceDate <= args.asOfDate &&
        i.creditAmount > 0 &&
        (i.paymentStatus === "unpaid" || i.paymentStatus === "partial")
    );

    const asOf = new Date(args.asOfDate);

    const buckets = {
      current: 0,
      days1_30: 0,
      days31_60: 0,
      days61_90: 0,
      days91Plus: 0,
    };

    const customerTotals: Map<string, { customer: any; buckets: typeof buckets }> = new Map();

    for (const inv of outstanding) {
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.invoiceDate);
      const daysPastDue = Math.floor(
        (asOf.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Compute actual outstanding: creditAmount minus total non-reversed allocations
      let outstanding_amount = inv.creditAmount;
      if (inv.paymentStatus === "partial") {
        const allocs = await ctx.db
          .query("receiptAllocations")
          .withIndex("by_invoice", (q) => q.eq("invoiceId", inv._id))
          .filter((q) => q.eq(q.field("isReversed"), false))
          .collect();
        const paid = allocs.reduce((s, a) => s + a.allocatedAmount, 0);
        outstanding_amount = Math.max(0, inv.creditAmount - paid);
      }
      if (outstanding_amount <= 0) continue;
      const customerId = inv.customerId ?? "unknown";
      if (!customerTotals.has(customerId)) {
        const customer = inv.customerId ? await ctx.db.get(inv.customerId) : null;
        customerTotals.set(customerId, {
          customer,
          buckets: { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days91Plus: 0 },
        });
      }

      const ct = customerTotals.get(customerId)!;

      if (daysPastDue <= 0) {
        ct.buckets.current += outstanding_amount;
        buckets.current += outstanding_amount;
      } else if (daysPastDue <= 30) {
        ct.buckets.days1_30 += outstanding_amount;
        buckets.days1_30 += outstanding_amount;
      } else if (daysPastDue <= 60) {
        ct.buckets.days31_60 += outstanding_amount;
        buckets.days31_60 += outstanding_amount;
      } else if (daysPastDue <= 90) {
        ct.buckets.days61_90 += outstanding_amount;
        buckets.days61_90 += outstanding_amount;
      } else {
        ct.buckets.days91Plus += outstanding_amount;
        buckets.days91Plus += outstanding_amount;
      }
    }

    return {
      summary: buckets,
      totalOutstanding: Object.values(buckets).reduce((s, v) => s + v, 0),
      byCustomer: Array.from(customerTotals.values()),
    };
  },
});

// ─── AP AGING ─────────────────────────────────────────────────────────────────

export const getAPaging = query({
  args: {
    companyId: v.id("companies"),
    asOfDate: v.string(),
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    let invoices = await ctx.db
      .query("purchaseInvoices")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .filter((q) => q.eq(q.field("postingStatus"), "posted"))
      .collect();

    if (args.branchId) {
      invoices = invoices.filter((i) => i.branchId === args.branchId);
    }

    const outstanding = invoices.filter(
      (i) =>
        i.invoiceDate <= args.asOfDate &&
        (i.paymentStatus === "unpaid" || i.paymentStatus === "partial")
    );

    const asOf = new Date(args.asOfDate);

    const buckets = {
      current: 0,
      days1_30: 0,
      days31_60: 0,
      days61_90: 0,
      days91Plus: 0,
    };

    const supplierTotals: Map<string, { supplier: any; buckets: typeof buckets }> = new Map();

    for (const inv of outstanding) {
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.invoiceDate);
      const daysPastDue = Math.floor(
        (asOf.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Compute actual outstanding: totalAmount minus total non-reversed payment allocations
      let outstandingAmount = inv.totalAmount;
      if (inv.paymentStatus === "partial") {
        const allocs = await ctx.db
          .query("paymentAllocations")
          .withIndex("by_invoice", (q) => q.eq("invoiceId", inv._id))
          .filter((q) => q.eq(q.field("isReversed"), false))
          .collect();
        const paid = allocs.reduce((s, a) => s + a.allocatedAmount, 0);
        outstandingAmount = Math.max(0, inv.totalAmount - paid);
      }
      if (outstandingAmount <= 0) continue;
      if (!supplierTotals.has(inv.supplierId)) {
        const supplier = await ctx.db.get(inv.supplierId);
        supplierTotals.set(inv.supplierId, {
          supplier,
          buckets: { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days91Plus: 0 },
        });
      }

      const st = supplierTotals.get(inv.supplierId)!;

      if (daysPastDue <= 0) {
        st.buckets.current += outstandingAmount;
        buckets.current += outstandingAmount;
      } else if (daysPastDue <= 30) {
        st.buckets.days1_30 += outstandingAmount;
        buckets.days1_30 += outstandingAmount;
      } else if (daysPastDue <= 60) {
        st.buckets.days31_60 += outstandingAmount;
        buckets.days31_60 += outstandingAmount;
      } else if (daysPastDue <= 90) {
        st.buckets.days61_90 += outstandingAmount;
        buckets.days61_90 += outstandingAmount;
      } else {
        st.buckets.days91Plus += outstandingAmount;
        buckets.days91Plus += outstandingAmount;
      }
    }

    return {
      summary: buckets,
      totalOutstanding: Object.values(buckets).reduce((s, v) => s + v, 0),
      bySupplier: Array.from(supplierTotals.values()),
    };
  },
});

// ─── SALES REPORT ─────────────────────────────────────────────────────────────

export const getSalesReport = query({
  args: {
    branchId: v.optional(v.id("branches")),
    fromDate: v.string(),
    toDate: v.string(),
    groupBy: v.union(
      v.literal("day"),
      v.literal("item"),
      v.literal("category"),
      v.literal("customer"),
      v.literal("salesRep")
    ),
  },
  handler: async (ctx, args) => {
    let invoices = args.branchId
      ? await ctx.db
          .query("salesInvoices")
          .withIndex("by_branch", (q) => q.eq("branchId", args.branchId!))
          .collect()
      : await ctx.db.query("salesInvoices").collect();

    invoices = invoices.filter(
      (i) =>
        i.postingStatus === "posted" &&
        i.invoiceDate >= args.fromDate &&
        i.invoiceDate <= args.toDate
    );

    if (args.groupBy === "day") {
      const byDay: Map<string, { date: string; total: number; count: number; vat: number }> =
        new Map();
      for (const inv of invoices) {
        if (!byDay.has(inv.invoiceDate)) {
          byDay.set(inv.invoiceDate, { date: inv.invoiceDate, total: 0, count: 0, vat: 0 });
        }
        const d = byDay.get(inv.invoiceDate)!;
        d.total += inv.totalAmount;
        d.count += 1;
        d.vat += inv.vatAmount;
      }
      return {
        groupBy: "day",
        data: Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date)),
        totalSales: invoices.reduce((s, i) => s + i.totalAmount, 0),
        invoiceCount: invoices.length,
      };
    }

    if (args.groupBy === "customer") {
      const byCustomer: Map<string, { customerId: string; customerName: string; total: number; count: number }> =
        new Map();
      for (const inv of invoices) {
        const key = inv.customerId ?? "walk_in";
        if (!byCustomer.has(key)) {
          const customer = inv.customerId ? await ctx.db.get(inv.customerId) : null;
          byCustomer.set(key, {
            customerId: key,
            customerName: customer?.nameAr ?? "عميل نقدي",
            total: 0,
            count: 0,
          });
        }
        const c = byCustomer.get(key)!;
        c.total += inv.totalAmount;
        c.count += 1;
      }
      return {
        groupBy: "customer",
        data: Array.from(byCustomer.values()).sort((a, b) => b.total - a.total),
        totalSales: invoices.reduce((s, i) => s + i.totalAmount, 0),
        invoiceCount: invoices.length,
      };
    }

    if (args.groupBy === "salesRep") {
      const byRep: Map<string, {
        salesRepId: string | null; repName: string; repCode: string | null;
        total: number; count: number; vat: number; discount: number;
      }> = new Map();

      for (const inv of invoices) {
        const key = inv.salesRepId ?? inv.salesRepName ?? "__none__";
        if (!byRep.has(key)) {
          const rep = inv.salesRepId ? await ctx.db.get(inv.salesRepId) : null;
          byRep.set(key, {
            salesRepId: inv.salesRepId ?? null,
            repName: rep?.nameAr ?? inv.salesRepName ?? (key === "__none__" ? "بدون مندوب" : key),
            repCode: rep?.code ?? null,
            total: 0, count: 0, vat: 0, discount: 0,
          });
        }
        const r = byRep.get(key)!;
        r.total += inv.totalAmount;
        r.count += 1;
        r.vat += inv.vatAmount;
        r.discount += inv.discountAmount;
      }

      return {
        groupBy: "salesRep",
        data: Array.from(byRep.values()).sort((a, b) => b.total - a.total),
        totalSales: invoices.reduce((s, i) => s + i.totalAmount, 0),
        invoiceCount: invoices.length,
      };
    }

    // Default grouped by item
    const allLines = [];
    for (const inv of invoices) {
      const lines = await ctx.db
        .query("salesInvoiceLines")
        .withIndex("by_invoice", (q) => q.eq("invoiceId", inv._id))
        .collect();
      allLines.push(...lines.map((l) => ({ ...l, invoiceDate: inv.invoiceDate })));
    }

    const byItem: Map<string, { itemId: string; itemName: string; qty: number; total: number; cost: number }> =
      new Map();
    for (const line of allLines) {
      const key = line.itemId;
      if (!byItem.has(key)) {
        const item = await ctx.db.get(line.itemId);
        byItem.set(key, {
          itemId: key,
          itemName: item?.nameAr ?? "—",
          qty: 0,
          total: 0,
          cost: 0,
        });
      }
      const b = byItem.get(key)!;
      b.qty += line.quantity;
      b.total += line.lineTotal;
      b.cost += line.costTotal;
    }

    return {
      groupBy: "item",
      data: Array.from(byItem.values()).sort((a, b) => b.total - a.total),
      totalSales: invoices.reduce((s, i) => s + i.totalAmount, 0),
      invoiceCount: invoices.length,
    };
  },
});

// ─── PURCHASE REPORT ──────────────────────────────────────────────────────────

export const getPurchaseReport = query({
  args: {
    branchId: v.optional(v.id("branches")),
    fromDate: v.string(),
    toDate: v.string(),
    groupBy: v.union(v.literal("day"), v.literal("supplier"), v.literal("item")),
  },
  handler: async (ctx, args) => {
    let invoices = args.branchId
      ? await ctx.db
          .query("purchaseInvoices")
          .withIndex("by_branch", (q) => q.eq("branchId", args.branchId!))
          .collect()
      : await ctx.db.query("purchaseInvoices").collect();

    invoices = invoices.filter(
      (i) =>
        i.postingStatus === "posted" &&
        i.invoiceDate >= args.fromDate &&
        i.invoiceDate <= args.toDate
    );

    const totalPurchases = invoices.reduce((s, i) => s + i.totalAmount, 0);

    if (args.groupBy === "day") {
      const byDay: Map<string, { date: string; total: number; count: number }> = new Map();
      for (const inv of invoices) {
        if (!byDay.has(inv.invoiceDate)) {
          byDay.set(inv.invoiceDate, { date: inv.invoiceDate, total: 0, count: 0 });
        }
        const d = byDay.get(inv.invoiceDate)!;
        d.total += inv.totalAmount;
        d.count += 1;
      }
      return {
        groupBy: "day",
        data: Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date)),
        totalPurchases,
        invoiceCount: invoices.length,
      };
    }

    if (args.groupBy === "item") {
      const allLines = [];
      for (const inv of invoices) {
        const lines = await ctx.db
          .query("purchaseInvoiceLines")
          .withIndex("by_invoice", (q) => q.eq("invoiceId", inv._id))
          .collect();
        allLines.push(...lines);
      }
      const byItem: Map<string, { itemId: string; itemName: string; qty: number; total: number }> =
        new Map();
      for (const line of allLines) {
        if (!line.itemId) continue; // skip non-stock lines
        const key = line.itemId as string;
        if (!byItem.has(key)) {
          const item = await ctx.db.get(line.itemId);
          const itemName = (item as any)?.nameAr ?? "—";
          byItem.set(key, { itemId: key, itemName, qty: 0, total: 0 });
        }
        const b = byItem.get(key)!;
        b.qty += line.quantity;
        b.total += line.lineTotal;
      }
      return {
        groupBy: "item",
        data: Array.from(byItem.values()).sort((a, b) => b.total - a.total),
        totalPurchases,
        invoiceCount: invoices.length,
      };
    }

    if (args.groupBy === "supplier") {
      const bySupplier: Map<string, { supplierId: string; supplierName: string; total: number; count: number }> =
        new Map();
      for (const inv of invoices) {
        if (!bySupplier.has(inv.supplierId)) {
          const supplier = await ctx.db.get(inv.supplierId);
          bySupplier.set(inv.supplierId, {
            supplierId: inv.supplierId,
            supplierName: supplier?.nameAr ?? "—",
            total: 0,
            count: 0,
          });
        }
        const s = bySupplier.get(inv.supplierId)!;
        s.total += inv.totalAmount;
        s.count += 1;
      }
      return {
        groupBy: "supplier",
        data: Array.from(bySupplier.values()).sort((a, b) => b.total - a.total),
        totalPurchases,
        invoiceCount: invoices.length,
      };
    }

    // Exhaustive: all groupBy values handled above
    return {
      groupBy: args.groupBy,
      data: [],
      totalPurchases,
      invoiceCount: invoices.length,
    };
  },
});

// ─── INVENTORY MOVEMENT REPORT ────────────────────────────────────────────────

export const getInventoryMovementReport = query({
  args: {
    itemId: v.optional(v.id("items")),
    warehouseId: v.optional(v.id("warehouses")),
    fromDate: v.string(),
    toDate: v.string(),
  },
  handler: async (ctx, args) => {
    let movements = await ctx.db.query("inventoryMovements").collect();

    movements = movements.filter(
      (m) =>
        m.postingStatus === "posted" &&
        m.movementDate >= args.fromDate &&
        m.movementDate <= args.toDate
    );

    if (args.warehouseId) {
      movements = movements.filter((m) => m.warehouseId === args.warehouseId);
    }

    const result = [];
    for (const movement of movements) {
      const lines = await ctx.db
        .query("inventoryMovementLines")
        .withIndex("by_movement", (q) => q.eq("movementId", movement._id))
        .collect();

      const filteredLines = args.itemId
        ? lines.filter((l) => l.itemId === args.itemId)
        : lines;

      if (filteredLines.length === 0) continue;

      for (const line of filteredLines) {
        const item = await ctx.db.get(line.itemId);
        result.push({
          movementDate: movement.movementDate,
          movementNumber: movement.movementNumber,
          movementType: movement.movementType,
          itemId: line.itemId,
          itemNameAr: item?.nameAr ?? "—",
          quantity: line.quantity,
          unitCost: line.unitCost,
          totalCost: line.totalCost,
          qtyBefore: line.qtyBefore,
          qtyAfter: line.qtyAfter,
        });
      }
    }

    result.sort((a, b) => a.movementDate.localeCompare(b.movementDate));
    return result;
  },
});

// ─── STOCK VALUATION REPORT ───────────────────────────────────────────────────

export const getStockValuationReport = query({
  args: {
    warehouseId: v.optional(v.id("warehouses")),
    companyId: v.optional(v.id("companies")),
  },
  handler: async (ctx, args) => {
    let balances = args.warehouseId
      ? await ctx.db
          .query("stockBalance")
          .withIndex("by_warehouse", (q) => q.eq("warehouseId", args.warehouseId!))
          .collect()
      : await ctx.db.query("stockBalance").collect();

    const result = [];
    let totalValue = 0;

    for (const balance of balances) {
      const item = await ctx.db.get(balance.itemId);
      const warehouse = await ctx.db.get(balance.warehouseId);

      if (!item || !item.isActive) continue;
      if (args.companyId && item.companyId !== args.companyId) continue;
      if (balance.quantity === 0) continue;

      totalValue += balance.totalValue;
      result.push({
        itemId: balance.itemId,
        itemCode: item.code,
        itemNameAr: item.nameAr,
        itemNameEn: item.nameEn,
        warehouseId: balance.warehouseId,
        warehouseNameAr: warehouse?.nameAr ?? "—",
        quantity: balance.quantity,
        avgCost: balance.avgCost,
        totalValue: balance.totalValue,
        lastUpdated: balance.lastUpdated,
      });
    }

    result.sort((a, b) => b.totalValue - a.totalValue);
    return { items: result, totalValue };
  },
});

// ─── CASH/BANK MOVEMENT ───────────────────────────────────────────────────────

export const getCashBankMovement = query({
  args: {
    accountId: v.id("accounts"),
    fromDate: v.string(),
    toDate: v.string(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account) return null;

    const lines = await ctx.db
      .query("journalLines")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .collect();

    const entriesWithLines = await Promise.all(
      lines.map(async (line) => {
        const entry = await ctx.db.get(line.entryId);
        return entry?.postingStatus === "posted" ? { line, entry } : null;
      })
    );

    const valid = entriesWithLines.filter(Boolean) as Array<{
      line: (typeof lines)[0];
      entry: any;
    }>;

    const opening = valid
      .filter((x) => x.entry.entryDate < args.fromDate)
      .reduce((acc, x) => acc + x.line.debit - x.line.credit, 0);

    const period = valid.filter(
      (x) => x.entry.entryDate >= args.fromDate && x.entry.entryDate <= args.toDate
    );

    period.sort((a, b) => a.entry.entryDate.localeCompare(b.entry.entryDate));

    let balance = opening;
    const movements = period.map((x) => {
      balance += x.line.debit - x.line.credit;
      return {
        date: x.entry.entryDate,
        entryNumber: x.entry.entryNumber,
        description: x.line.description ?? x.entry.description,
        debit: x.line.debit,
        credit: x.line.credit,
        balance,
      };
    });

    return {
      account,
      openingBalance: opening,
      movements,
      closingBalance: balance,
    };
  },
});

// ─── INCOME STATEMENT ─────────────────────────────────────────────────────────

export const getIncomeStatement = query({
  args: {
    companyId: v.id("companies"),
    startDate: v.string(),
    endDate: v.string(),
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    // Get all posted journal entries for the period
    let entries = await ctx.db
      .query("journalEntries")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .filter((q) => q.eq(q.field("postingStatus"), "posted"))
      .collect();

    if (args.branchId) {
      entries = entries.filter((e) => e.branchId === args.branchId);
    }

    const periodEntries = entries.filter(
      (e) => e.entryDate >= args.startDate && e.entryDate <= args.endDate
    );

    // Build a map of account movements
    const movementMap: Map<string, { debit: number; credit: number }> = new Map();

    for (const entry of periodEntries) {
      const lines = await ctx.db
        .query("journalLines")
        .withIndex("by_entry", (q) => q.eq("entryId", entry._id))
        .collect();
      for (const line of lines) {
        const key = line.accountId as string;
        if (!movementMap.has(key)) movementMap.set(key, { debit: 0, credit: 0 });
        const acc = movementMap.get(key)!;
        acc.debit += line.debit;
        acc.credit += line.credit;
      }
    }

    // Get revenue and expense accounts
    const revenueAccounts = await ctx.db
      .query("accounts")
      .withIndex("by_company_type", (q) =>
        q.eq("companyId", args.companyId).eq("accountType", "revenue")
      )
      .collect();

    const expenseAccounts = await ctx.db
      .query("accounts")
      .withIndex("by_company_type", (q) =>
        q.eq("companyId", args.companyId).eq("accountType", "expense")
      )
      .collect();

    const revenueRows = revenueAccounts
      .filter((a) => a.isPostable)
      .map((a) => {
        const mv = movementMap.get(a._id as string) ?? { debit: 0, credit: 0 };
        // Revenue: credit-normal → balance = credits - debits
        const balance = mv.credit - mv.debit;
        return {
          accountId: a._id as string,
          code: a.code,
          nameAr: a.nameAr,
          nameEn: a.nameEn ?? a.nameAr,
          accountSubType: a.accountSubType,
          balance,
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code));

    const expenseRows = expenseAccounts
      .filter((a) => a.isPostable)
      .map((a) => {
        const mv = movementMap.get(a._id as string) ?? { debit: 0, credit: 0 };
        // Expense: debit-normal → balance = debits - credits
        const balance = mv.debit - mv.credit;
        return {
          accountId: a._id as string,
          code: a.code,
          nameAr: a.nameAr,
          nameEn: a.nameEn ?? a.nameAr,
          accountSubType: a.accountSubType,
          balance,
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code));

    const totalRevenue = revenueRows.reduce((s, r) => s + r.balance, 0);
    const totalExpenses = expenseRows.reduce((s, r) => s + r.balance, 0);
    const netIncome = totalRevenue - totalExpenses;

    return {
      revenueAccounts: revenueRows,
      expenseAccounts: expenseRows,
      totalRevenue,
      totalExpenses,
      netIncome,
    };
  },
});

// ─── BALANCE SHEET ────────────────────────────────────────────────────────────

export const getBalanceSheet = query({
  args: {
    companyId: v.id("companies"),
    asOfDate: v.string(),
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    // Get all posted journal entries up to asOfDate
    let entries = await ctx.db
      .query("journalEntries")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .filter((q) => q.eq(q.field("postingStatus"), "posted"))
      .collect();

    if (args.branchId) {
      entries = entries.filter((e) => e.branchId === args.branchId);
    }

    const cumulativeEntries = entries.filter((e) => e.entryDate <= args.asOfDate);

    // Build cumulative movement map
    const movementMap: Map<string, { debit: number; credit: number }> = new Map();

    for (const entry of cumulativeEntries) {
      const lines = await ctx.db
        .query("journalLines")
        .withIndex("by_entry", (q) => q.eq("entryId", entry._id))
        .collect();
      for (const line of lines) {
        const key = line.accountId as string;
        if (!movementMap.has(key)) movementMap.set(key, { debit: 0, credit: 0 });
        const acc = movementMap.get(key)!;
        acc.debit += line.debit;
        acc.credit += line.credit;
      }
    }

    // Helper to calculate balance by account type
    const getBalance = (accountId: string, accountType: string) => {
      const mv = movementMap.get(accountId) ?? { debit: 0, credit: 0 };
      if (accountType === "asset") {
        return mv.debit - mv.credit; // debit-normal
      } else {
        return mv.credit - mv.debit; // credit-normal (liability, equity)
      }
    };

    // Get accounts by type
    const assetAccounts = await ctx.db
      .query("accounts")
      .withIndex("by_company_type", (q) =>
        q.eq("companyId", args.companyId).eq("accountType", "asset")
      )
      .collect();

    const liabilityAccounts = await ctx.db
      .query("accounts")
      .withIndex("by_company_type", (q) =>
        q.eq("companyId", args.companyId).eq("accountType", "liability")
      )
      .collect();

    const equityAccounts = await ctx.db
      .query("accounts")
      .withIndex("by_company_type", (q) =>
        q.eq("companyId", args.companyId).eq("accountType", "equity")
      )
      .collect();

    // Revenue/expense for net income calculation (cumulative to asOfDate)
    const revenueAccounts = await ctx.db
      .query("accounts")
      .withIndex("by_company_type", (q) =>
        q.eq("companyId", args.companyId).eq("accountType", "revenue")
      )
      .collect();

    const expenseAccountsList = await ctx.db
      .query("accounts")
      .withIndex("by_company_type", (q) =>
        q.eq("companyId", args.companyId).eq("accountType", "expense")
      )
      .collect();

    const totalRevenue = revenueAccounts
      .filter((a) => a.isPostable)
      .reduce((s, a) => {
        const mv = movementMap.get(a._id as string) ?? { debit: 0, credit: 0 };
        return s + (mv.credit - mv.debit);
      }, 0);

    const totalExpenses = expenseAccountsList
      .filter((a) => a.isPostable)
      .reduce((s, a) => {
        const mv = movementMap.get(a._id as string) ?? { debit: 0, credit: 0 };
        return s + (mv.debit - mv.credit);
      }, 0);

    const netIncome = totalRevenue - totalExpenses;

    // Map accounts to rows
    const mapAccounts = (accounts: any[], type: string) =>
      accounts
        .filter((a) => a.isPostable)
        .map((a) => ({
          accountId: a._id as string,
          code: a.code,
          nameAr: a.nameAr,
          nameEn: a.nameEn ?? a.nameAr,
          accountSubType: a.accountSubType,
          balance: getBalance(a._id as string, type),
        }))
        .sort((a: any, b: any) => a.code.localeCompare(b.code));

    const assetRows = mapAccounts(assetAccounts, "asset");
    const liabilityRows = mapAccounts(liabilityAccounts, "liability");
    const equityRows = mapAccounts(equityAccounts, "equity");

    const totalAssets = assetRows.reduce((s: number, r: any) => s + r.balance, 0);
    const totalLiabilities = liabilityRows.reduce((s: number, r: any) => s + r.balance, 0);
    const totalEquityAccounts = equityRows.reduce((s: number, r: any) => s + r.balance, 0);
    const totalEquity = totalEquityAccounts + netIncome;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;

    return {
      assets: {
        accounts: assetRows,
        total: totalAssets,
      },
      liabilities: {
        accounts: liabilityRows,
        total: totalLiabilities,
      },
      equity: {
        accounts: equityRows,
        retainedEarnings: netIncome,
        total: totalEquity,
      },
      totalAssets,
      totalLiabilitiesAndEquity,
      isBalanced,
    };
  },
});

// ─── CHEQUE REGISTER ──────────────────────────────────────────────────────────

export const getChequeRegister = query({
  args: {
    branchId: v.optional(v.id("branches")),
    chequeType: v.optional(v.union(v.literal("received"), v.literal("issued"))),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
    chequeStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let cheques = args.branchId
      ? await ctx.db
          .query("cheques")
          .withIndex("by_branch", (q) => q.eq("branchId", args.branchId!))
          .collect()
      : await ctx.db.query("cheques").collect();

    if (args.chequeType) cheques = cheques.filter((c) => c.chequeType === args.chequeType);
    if (args.fromDate) cheques = cheques.filter((c) => c.dueDate >= args.fromDate!);
    if (args.toDate) cheques = cheques.filter((c) => c.dueDate <= args.toDate!);
    if (args.chequeStatus) cheques = cheques.filter((c) => c.chequeStatus === args.chequeStatus);

    const enriched = await Promise.all(
      cheques.map(async (c) => {
        const customer = c.customerId ? await ctx.db.get(c.customerId) : null;
        const supplier = c.supplierId ? await ctx.db.get(c.supplierId) : null;
        return {
          ...c,
          customerName: customer?.nameAr,
          supplierName: supplier?.nameAr,
        };
      })
    );

    enriched.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return enriched;
  },
});

// ─── CASH / BANK MOVEMENT REPORT ─────────────────────────────────────────────
// Journal-line-based: matches Trial Balance & General Ledger exactly.
// Retrieves all posted journal lines for the given account, then:
//   - Lines before fromDate   → opening balance
//   - Lines within the period → daily movement table

export const getCashMovementReport = query({
  args: {
    companyId: v.id("companies"),
    accountId: v.id("accounts"),
    fromDate:  v.string(),
    toDate:    v.string(),
  },
  handler: async (ctx, { companyId, accountId, fromDate, toDate }) => {
    const account = await ctx.db.get(accountId);

    // All journal lines for this account (by_account index)
    const allLines = await ctx.db
      .query("journalLines")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();

    // Enrich with entry details (date, postingStatus, companyId) — batch
    const entryIds = [...new Set(allLines.map((l) => l.entryId))];
    const entryMap = new Map<string, { entryDate: string; postingStatus: string; companyId: string }>();
    await Promise.all(
      entryIds.map(async (id) => {
        const e = await ctx.db.get(id);
        if (e) entryMap.set(String(id), { entryDate: e.entryDate, postingStatus: e.postingStatus, companyId: String(e.companyId) });
      })
    );

    // Keep only posted lines that belong to this company
    const postedLines = allLines.filter((l) => {
      const e = entryMap.get(String(l.entryId));
      return e && e.postingStatus === "posted" && e.companyId === String(companyId);
    });

    // Use normalBalance from schema — debit-normal = asset/expense accounts
    // This replaces the old code.startsWith("1") heuristic.
    const isDebitNormal = account?.normalBalance === "debit";

    // Compute net movement: debit increases asset accounts, credit decreases
    const netOf = (l: { debit: number; credit: number }) =>
      isDebitNormal ? l.debit - l.credit : l.credit - l.debit;

    // Opening balance = net of all lines before fromDate
    const beforeLines = postedLines.filter((l) => {
      const e = entryMap.get(String(l.entryId));
      return e && e.entryDate < fromDate;
    });
    const openingBalance = beforeLines.reduce((s, l) => s + netOf(l), 0);

    // Period lines
    const periodLines = postedLines.filter((l) => {
      const e = entryMap.get(String(l.entryId));
      return e && e.entryDate >= fromDate && e.entryDate <= toDate;
    });

    // Build day map
    const dayMap = new Map<string, { debit: number; credit: number }>();
    for (const l of periodLines) {
      const date = entryMap.get(String(l.entryId))!.entryDate;
      if (!dayMap.has(date)) dayMap.set(date, { debit: 0, credit: 0 });
      const d = dayMap.get(date)!;
      d.debit  += l.debit;
      d.credit += l.credit;
    }

    const sortedDays = [...dayMap.keys()].sort();
    let running = openingBalance;
    const rows = sortedDays.map((date) => {
      const { debit, credit } = dayMap.get(date)!;
      const net = isDebitNormal ? debit - credit : credit - debit;
      running += net;
      return { date, debit, credit, net, balance: running };
    });

    const totalDebit  = periodLines.reduce((s, l) => s + l.debit,  0);
    const totalCredit = periodLines.reduce((s, l) => s + l.credit, 0);
    const closingBalance = running;

    return {
      accountNameAr: account?.nameAr ?? "",
      accountCode:   (account as any)?.code ?? "",
      openingBalance,
      rows,
      totalDebit,
      totalCredit,
      closingBalance,
    };
  },
});



// ─── VAT SUMMARY REPORT ───────────────────────────────────────────────────────
export const getVatSummary = query({
  args: {
    companyId: v.id("companies"),
    fromDate:  v.string(),
    toDate:    v.string(),
  },
  handler: async (ctx, args) => {
    // Sales VAT (output tax) — from posted sales invoices
    const salesInvoices = await ctx.db
      .query("salesInvoices")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .collect();

    const postedSales = salesInvoices.filter(
      (inv) =>
        inv.postingStatus === "posted" &&
        inv.invoiceDate >= args.fromDate &&
        inv.invoiceDate <= args.toDate
    );

    const outputVat    = postedSales.reduce((s, inv) => s + (inv.vatAmount ?? 0), 0);
    const salesNet     = postedSales.reduce((s, inv) => s + (inv.taxableAmount ?? inv.subtotal ?? 0), 0);
    const salesGross   = postedSales.reduce((s, inv) => s + (inv.totalAmount ?? 0), 0);
    const salesCount   = postedSales.length;

    // Purchase VAT (input tax) — from posted purchase invoices
    const purchaseInvoices = await ctx.db
      .query("purchaseInvoices")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .collect();

    const postedPurchases = purchaseInvoices.filter(
      (inv) =>
        inv.postingStatus === "posted" &&
        inv.invoiceDate >= args.fromDate &&
        inv.invoiceDate <= args.toDate
    );

    const inputVat      = postedPurchases.reduce((s, inv) => s + (inv.vatAmount ?? 0), 0);
    const purchasesNet  = postedPurchases.reduce((s, inv) => s + (inv.totalAmount ?? 0) - (inv.vatAmount ?? 0), 0);
    const purchasesGross= postedPurchases.reduce((s, inv) => s + (inv.totalAmount ?? 0), 0);
    const purchasesCount= postedPurchases.length;

    // Net VAT payable to authority
    const netVatPayable = outputVat - inputVat;

    return {
      period: { fromDate: args.fromDate, toDate: args.toDate },
      sales: {
        count:       salesCount,
        netAmount:   salesNet,
        grossAmount: salesGross,
        vatAmount:   outputVat,
        vatRate:     salesNet > 0 ? (outputVat / salesNet) * 100 : 0,
      },
      purchases: {
        count:        purchasesCount,
        netAmount:    purchasesNet,
        grossAmount:  purchasesGross,
        vatAmount:    inputVat,
        vatRate:      purchasesNet > 0 ? (inputVat / purchasesNet) * 100 : 0,
      },
      summary: {
        outputVat,
        inputVat,
        netVatPayable,
        isRefundable: netVatPayable < 0,
      },
    };
  },
});

// ─── Period Month-end Checklist ────────────────────────────────────────────────
export const getPeriodChecklist = query({
  args: {
    companyId: v.id("companies"),
    periodStartDate: v.string(),
    periodEndDate: v.string(),
  },
  handler: async (ctx, args) => {
    const { companyId, periodStartDate, periodEndDate } = args;

    // 1. Unposted sales invoices in period
    const allSalesInvoices = await ctx.db
      .query("salesInvoices")
      .filter((q) =>
        q.and(
          q.eq(q.field("companyId"), companyId),
          q.gte(q.field("invoiceDate"), periodStartDate),
          q.lte(q.field("invoiceDate"), periodEndDate),
          q.neq(q.field("documentStatus"), "cancelled")
        )
      )
      .collect();

    const unpostedSales = allSalesInvoices.filter((i) => i.postingStatus === "unposted");

    // 2. Unposted purchase invoices in period
    const allPurchaseInvoices = await ctx.db
      .query("purchaseInvoices")
      .filter((q) =>
        q.and(
          q.eq(q.field("companyId"), companyId),
          q.gte(q.field("invoiceDate"), periodStartDate),
          q.lte(q.field("invoiceDate"), periodEndDate),
          q.neq(q.field("documentStatus"), "cancelled")
        )
      )
      .collect();

    const unpostedPurchases = allPurchaseInvoices.filter((i) => i.postingStatus === "unposted");

    // 3. Trial balance — any accounts with non-zero balance (via journalEntries)
    const periodEntries = await ctx.db
      .query("journalEntries")
      .filter((q) =>
        q.and(
          q.eq(q.field("companyId"), companyId),
          q.gte(q.field("entryDate"), periodStartDate),
          q.lte(q.field("entryDate"), periodEndDate)
        )
      )
      .collect();

    const entryIds = periodEntries.map((e) => e._id as string);
    const accountTotals = new Map<string, number>();
    await Promise.all(entryIds.slice(0, 500).map(async (eid) => {
      const lines = await ctx.db
        .query("journalLines")
        .withIndex("by_entry", (q) => q.eq("entryId", eid as any))
        .collect();
      for (const line of lines) {
        const key = line.accountId as string;
        const cur = accountTotals.get(key) ?? 0;
        accountTotals.set(key, cur + (line.debit ?? 0) - (line.credit ?? 0));
      }
    }));
    const nonZeroAccounts = [...accountTotals.values()].filter((v) => Math.abs(v) > 0).length;

    // 4. Unposted wastage entries (skipped - table not in schema)
    const unpostedWastage: any[] = [];

    return {
      sales: {
        total: allSalesInvoices.length,
        unposted: unpostedSales.length,
        ok: unpostedSales.length === 0,
      },
      purchases: {
        total: allPurchaseInvoices.length,
        unposted: unpostedPurchases.length,
        ok: unpostedPurchases.length === 0,
      },
      trialBalance: {
        entryCount: periodEntries.length,
        nonZeroAccounts,
        ok: periodEntries.length > 0,
      },
      wastage: {
        unposted: unpostedWastage.length,
        ok: unpostedWastage.length === 0,
      },
      canClose:
        unpostedSales.length === 0 &&
        unpostedPurchases.length === 0 &&
        unpostedWastage.length === 0,
    };
  },
});

// ─── Route Sheet (Daily delivery manifest per vehicle) ────────────────────────
export const getRouteSheet = query({
  args: {
    companyId: v.id("companies"),
    date: v.string(),
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    // Fetch all invoices for the date (any posting status except cancelled)
    const allInvoices = await ctx.db
      .query("salesInvoices")
      .withIndex("by_branch_date", (q) => q.eq("branchId", args.branchId as any ?? ("" as any)))
      .filter((q) =>
        q.and(
          q.eq(q.field("invoiceDate"), args.date),
          q.neq(q.field("documentStatus"), "cancelled")
        )
      )
      .collect();
    
    // If no branchId or the branch query was skipped, collect all for the date
    const allByDate = args.branchId ? allInvoices : await ctx.db
      .query("salesInvoices")
      .filter((q) =>
        q.and(
          q.eq(q.field("invoiceDate"), args.date),
          q.eq(q.field("companyId"), args.companyId),
          q.neq(q.field("documentStatus"), "cancelled")
        )
      )
      .collect();

    const filtered = args.branchId ? allInvoices.filter(inv => inv.companyId === args.companyId) : allByDate;

    // Group by vehicle
    const vehicleMap = new Map<string, any>();

    for (const inv of filtered) {
      const vehicleKey = (inv.vehicleId as string) ?? `code:${inv.vehicleCode ?? "none"}`;
      if (!vehicleMap.has(vehicleKey)) {
        let vehicle: any = null;
        if (inv.vehicleId) vehicle = await ctx.db.get(inv.vehicleId as any);
        vehicleMap.set(vehicleKey, {
          vehicleId: inv.vehicleId ?? null,
          vehicleCode: vehicle?.code ?? inv.vehicleCode ?? "—",
          vehicleDescAr: vehicle?.descriptionAr ?? (inv.vehicleCode ?? "بدون مركبة"),
          vehicleDescEn: vehicle?.descriptionEn ?? (inv.vehicleCode ?? "No Vehicle"),
          driverName: vehicle?.driverName ?? null,
          invoices: [],
          totalAmount: 0,
          cashAmount: 0,
          creditAmount: 0,
          invoiceCount: 0,
        });
      }

      const group = vehicleMap.get(vehicleKey)!;
      group.invoices.push({
        _id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        externalInvoiceNumber: inv.externalInvoiceNumber ?? null,
        invoiceDate: inv.invoiceDate,
        invoiceType: inv.invoiceType,
        postingStatus: inv.postingStatus,
        documentStatus: inv.documentStatus,
        totalAmount: inv.totalAmount ?? 0,
        cashReceived: inv.cashReceived ?? 0,
        creditAmount: inv.creditAmount ?? 0,
        customerId: inv.customerId,
        branchId: inv.branchId,
        salesRepName: inv.salesRepName ?? null,
      });
      group.totalAmount  += inv.totalAmount ?? 0;
      group.cashAmount   += inv.cashReceived ?? 0;
      group.creditAmount += inv.creditAmount ?? 0;
      group.invoiceCount += 1;
    }

    // Enrich with customer names
    const allCustomerIds = new Set(filtered.map((i) => i.customerId).filter(Boolean));
    const customers = await Promise.all(
      [...allCustomerIds].map((id) => ctx.db.get(id as any))
    );
    const customerMap = new Map(customers.filter(Boolean).map((c) => [c!._id as string, c]));

    const vehicles = [...vehicleMap.values()].map((v) => ({
      ...v,
      invoices: v.invoices.map((inv: any) => ({
        ...inv,
        customerName: (customerMap.get(inv.customerId as string) as any)?.nameAr ?? "—",
      })),
    }));

    vehicles.sort((a, b) => (a.vehicleCode ?? "").localeCompare(b.vehicleCode ?? ""));

    return {
      date: args.date,
      vehicles,
      totals: {
        vehicleCount: vehicles.length,
        invoiceCount: vehicles.reduce((s, v) => s + v.invoiceCount, 0),
        totalAmount: vehicles.reduce((s, v) => s + v.totalAmount, 0),
        cashAmount: vehicles.reduce((s, v) => s + v.cashAmount, 0),
        creditAmount: vehicles.reduce((s, v) => s + v.creditAmount, 0),
      },
    };
  },
});

// ─── Inventory Aging Report ────────────────────────────────────────────────────
export const getInventoryAging = query({
  args: {
    companyId: v.id("companies"),
    warehouseId: v.optional(v.id("warehouses")),
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().slice(0, 10);

    // Get all stock balances
    const stockBalances = await ctx.db
      .query("stockBalance")
      .collect();

    // Get all GRN lines for receipt dates (last receipt date per item/warehouse)
    // Note: grnLines doesn't have companyId, so we collect all and filter via GRN headers
    const allGrnLines = await ctx.db
      .query("grnLines")
      .collect();
    
    // Fetch all GRN headers to get company/date/warehouse info
    const grnIds = [...new Set(allGrnLines.map((l) => l.grnId as string))];
    const grnHeaders = new Map<string, any>();
    await Promise.all(grnIds.slice(0, 500).map(async (id) => {
      const grn = await ctx.db.get(id as any);
      if (grn) grnHeaders.set(id, grn);
    }));
    
    // Filter lines by company via GRN header
    const grnLines = allGrnLines.filter((l) => {
      const header = grnHeaders.get(l.grnId as string);
      return header && header.companyId === args.companyId;
    });

    // Build map: itemId+warehouseId → last GRN date
    const lastReceiptMap = new Map<string, string>();
    for (const line of grnLines) {
      const header = grnHeaders.get(line.grnId as string);
      const warehouseId = header?.warehouseId;
      const grnDate = header?.receiptDate;
      if (!warehouseId || !grnDate) continue;
      const key = `${line.itemId}:${warehouseId}`;
      const current = lastReceiptMap.get(key);
      if (!current || grnDate > current) {
        lastReceiptMap.set(key, grnDate);
      }
    }

    // Get items
    const items = await ctx.db
      .query("items")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
    const itemMap = new Map(items.map((i) => [i._id as string, i]));

    // Get warehouses
    const warehouses = await ctx.db
      .query("warehouses")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
    const whMap = new Map(warehouses.map((w) => [w._id as string, w]));

    // Filter by warehouse if requested
    const relevant = stockBalances.filter((sb) => {
      if (args.warehouseId && sb.warehouseId !== args.warehouseId) return false;
      // Only show items with positive stock
      return (sb.quantity ?? 0) > 0;
    });

    // Build result
    const rows = relevant.map((sb) => {
      const item = itemMap.get(sb.itemId as string);
      if (!item) return null;
      const wh = whMap.get(sb.warehouseId as string);
      const totalQty = sb.quantity ?? 0;
      const avgCost = sb.avgCost ?? 0;
      const stockValue = totalQty * avgCost;

      const lastReceipt = lastReceiptMap.get(`${sb.itemId}:${sb.warehouseId}`) ?? null;
      let agingDays = 0;
      if (lastReceipt) {
        const msPerDay = 1000 * 60 * 60 * 24;
        agingDays = Math.floor((new Date(today).getTime() - new Date(lastReceipt).getTime()) / msPerDay);
      }

      const agingBucket =
        agingDays <= 7  ? "0-7"  :
        agingDays <= 14 ? "8-14" :
        agingDays <= 30 ? "15-30":
        agingDays <= 60 ? "31-60": "60+";

      return {
        itemId: sb.itemId,
        code: item.code,
        nameAr: item.nameAr,
        nameEn: item.nameEn ?? item.nameAr,
        warehouseId: sb.warehouseId,
        warehouseName: wh?.nameAr ?? wh?.nameEn ?? "—",
        totalQty,
        avgCost,
        stockValue,
        lastReceiptDate: lastReceipt,
        agingDays,
        agingBucket,
        reorderPoint: item.reorderPoint ?? 0,
      };
    }).filter(Boolean);

    // Sort: oldest first
    rows.sort((a: any, b: any) => b.agingDays - a.agingDays);

    // Bucket summary
    const buckets: Record<string, { count: number; value: number }> = {
      "0-7": { count: 0, value: 0 },
      "8-14": { count: 0, value: 0 },
      "15-30": { count: 0, value: 0 },
      "31-60": { count: 0, value: 0 },
      "60+": { count: 0, value: 0 },
    };
    for (const r of rows as any[]) {
      buckets[r.agingBucket].count++;
      buckets[r.agingBucket].value += r.stockValue;
    }

    return { rows, buckets, asOfDate: today };
  },
});
