import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";

// One-shot admin mutation: deletes ALL documents from ALL tables
// Used to clear legacy data before schema migration
export const deleteAllTables = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "companies", "branches", "users", "currencies", "exchangeRates",
      "fiscalYears", "accountingPeriods", "documentSequences", "taxClasses",
      "accounts", "costCenters", "customers", "suppliers",
      "itemCategories", "unitOfMeasure", "items", "warehouses",
      "stockBalance", "recipes", "recipeLines",
      "salesInvoices", "salesInvoiceLines", "salesReturns", "salesReturnLines",
      "purchaseOrders", "purchaseOrderLines", "goodsReceiptNotes", "grnLines",
      "purchaseInvoices", "purchaseInvoiceLines", "purchaseReturns", "purchaseReturnLines",
      "bankAccounts", "cashBoxes", "cashReceiptVouchers", "cashPaymentVouchers",
      "cheques", "bankTransfers", "journalEntries", "journalLines",
      "receiptAllocations", "paymentAllocations",
      "inventoryMovements", "inventoryMovementLines",
      "stockAdjustments", "stockAdjustmentLines", "auditLogs",
    ] as const;

    const counts: Record<string, number> = {};
    for (const table of tables) {
      const docs = await ctx.db.query(table as any).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
      counts[table] = docs.length;
    }
    return counts;
  },
});


// ── Reset transactional data only (keep master data) ──────────────────────────
// Deletes: journals, invoices, vouchers, cheques, stock movements, production orders
// Keeps:   accounts, customers, suppliers, items, warehouses, settings, users
export const resetTransactionalData = mutation({
  args: { confirm: v.literal("RESET") },
  handler: async (ctx) => {
    const transactionalTables = [
      // Journal / GL
      "journalLines",
      "journalEntries",
      // Sales
      "salesInvoiceLines",
      "salesInvoices",
      "salesReturnLines",
      "salesReturns",
      // Purchases
      "purchaseOrderLines",
      "purchaseOrders",
      "grnLines",
      "goodsReceiptNotes",
      "purchaseInvoiceLines",
      "purchaseInvoices",
      "purchaseReturnLines",
      "purchaseReturns",
      // Treasury
      "cashReceiptVouchers",
      "cashPaymentVouchers",
      "cheques",
      "bankTransfers",
      "receiptAllocations",
      "paymentAllocations",
      // Inventory
      "inventoryMovementLines",
      "inventoryMovements",
      "stockAdjustmentLines",
      "stockAdjustments",
      "stockBalance",
      // Production
      "productionOrderLines",
      "productionOrders",
      // Audit
      "auditLogs",
    ] as const;

    const counts: Record<string, number> = {};
    for (const table of transactionalTables) {
      const docs = await (ctx.db.query(table as any) as any).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
      counts[table] = docs.length;
    }

    // Reset document sequence counters back to 0
    const seqs = await ctx.db.query("documentSequences").collect();
    for (const seq of seqs) {
      await ctx.db.patch(seq._id, { currentNumber: 0 });
    }
    counts["documentSequences_reset"] = seqs.length;

    return counts;
  },
});
