import { query } from "./_generated/server";
import { v } from "convex/values";

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

    const invoices = await ctx.db
      .query("salesInvoices")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .filter((q) => q.eq(q.field("postingStatus"), "posted"))
      .collect();

    const periodInvoices = invoices.filter(
      (i) => i.invoiceDate >= args.fromDate && i.invoiceDate <= args.toDate
    );

    const receipts = await ctx.db
      .query("cashReceiptVouchers")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .filter((q) => q.eq(q.field("postingStatus"), "posted"))
      .collect();

    const periodReceipts = receipts.filter(
      (r) => r.voucherDate >= args.fromDate && r.voucherDate <= args.toDate
    );

    // Opening balance (before fromDate)
    const openingInvoices = invoices.filter((i) => i.invoiceDate < args.fromDate);
    const openingReceipts = receipts.filter((r) => r.voucherDate < args.fromDate);
    const openingInvoiceTotal = openingInvoices.reduce((s, i) => s + i.creditAmount, 0);
    const openingReceiptTotal = openingReceipts.reduce((s, r) => s + r.amount, 0);
    const openingBalance = openingInvoiceTotal - openingReceiptTotal;

    const transactions = [
      ...periodInvoices.map((i) => ({
        date: i.invoiceDate,
        type: "invoice" as const,
        reference: i.invoiceNumber,
        description: `فاتورة مبيعات`,
        debit: i.creditAmount,
        credit: 0,
        documentId: i._id,
      })),
      ...periodReceipts.map((r) => ({
        date: r.voucherDate,
        type: "receipt" as const,
        reference: r.voucherNumber,
        description: `سند قبض`,
        debit: 0,
        credit: r.amount,
        documentId: r._id,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));

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
        description: `سند صرف`,
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

      const outstanding_amount = inv.creditAmount;

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
      const outstandingAmount = inv.totalAmount;

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
      v.literal("customer")
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


