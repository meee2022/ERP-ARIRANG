import { internalMutation } from "./_generated/server";

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
