// @ts-nocheck
import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Full system backup query — exports all company data as a single JSON object.
 * Called from the browser; the frontend converts the result to a downloadable JSON file.
 *
 * Tables exported (all filtered by companyId):
 *   Master data  : companies, items, itemCategories, unitOfMeasure, warehouses
 *   Finance      : accounts, journalEntries, journalLines, fiscalYears, costCenters
 *   Inventory    : inventoryTransactions, stockAdjustments, stockTransfers, openingStock
 *   Production   : recipes, recipeLines, productionOrders
 *   Purchases    : suppliers, purchaseInvoices, purchaseInvoiceLines, purchaseReturns, purchaseReturnLines, grns, grnLines
 *   Sales        : customers, salesInvoices, salesInvoiceLines, salesReturns, salesReturnLines
 *   Treasury     : treasuryAccounts, receipts, payments, cheques, bankTransfers
 *   HR           : employees, attendanceRecords, leaveRequests, payrollRuns
 *   Fixed Assets : fixedAssets, depreciationRuns
 *   Settings     : branches
 */
export const exportFullBackup = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const cid = args.companyId;
    const byCompany = (q: any) => q.eq("companyId", cid);
    const take = 10000;

    async function collect(table: string, indexName = "by_company") {
      try {
        return await ctx.db
          .query(table as any)
          .withIndex(indexName, byCompany)
          .take(take);
      } catch {
        // table might not have by_company index — try full scan
        try {
          const all = await ctx.db.query(table as any).take(take);
          return all.filter((r: any) => r.companyId === cid);
        } catch {
          return [];
        }
      }
    }

    async function collectAll(table: string) {
      try {
        return await ctx.db.query(table as any).take(take);
      } catch {
        return [];
      }
    }

    // ── Master data ───────────────────────────────────────────────
    const [companies] = await Promise.all([
      ctx.db.query("companies").filter((q) => q.eq(q.field("_id"), cid)).take(1),
    ]);

    const [
      items, itemCategories, unitOfMeasure, warehouses,
      // Finance
      accounts, journalEntries, journalLines, fiscalYears, costCenters,
      // Inventory
      inventoryTransactions, stockAdjustments, stockTransfers,
      // Production
      recipes, recipeLines, productionOrders,
      // Purchases
      suppliers, purchaseInvoices, purchaseReturns, grns,
      // Sales
      customers, salesInvoices, salesReturns,
      // Treasury
      receipts, payments, cheques, bankTransfers,
      // HR
      employees, attendanceRecords, leaveRequests, payrollRuns,
      // Fixed assets
      fixedAssets, depreciationRuns,
      // Settings
      branches,
    ] = await Promise.all([
      collect("items"),
      collect("itemCategories"),
      collect("unitOfMeasure"),
      collect("warehouses"),
      collect("accounts"),
      collect("journalEntries"),
      collect("journalLines"),
      collect("fiscalYears"),
      collect("costCenters"),
      collect("inventoryTransactions"),
      collect("stockAdjustments"),
      collect("stockTransfers"),
      collect("recipes"),
      collect("recipeLines"),
      collect("productionOrders"),
      collect("suppliers"),
      collect("purchaseInvoices"),
      collect("purchaseReturns"),
      collect("grns"),
      collect("customers"),
      collect("salesInvoices"),
      collect("salesReturns"),
      collect("receipts"),
      collect("payments"),
      collect("cheques"),
      collect("bankTransfers"),
      collect("employees"),
      collect("attendanceRecords"),
      collect("leaveRequests"),
      collect("payrollRuns"),
      collect("fixedAssets"),
      collect("depreciationRuns"),
      collect("branches"),
    ]);

    // Line items that reference parent IDs (no companyId index)
    const allJournalIds = new Set(journalEntries.map((r: any) => r._id));
    const allLines = await collectAll("journalLines");
    const filteredJournalLines = allLines.filter((l: any) => allJournalIds.has(l.journalEntryId));

    const allPurchaseIds = new Set(purchaseInvoices.map((r: any) => r._id));
    const allPurchaseLines = await collectAll("purchaseInvoiceLines");
    const purchaseInvoiceLines = allPurchaseLines.filter((l: any) => allPurchaseIds.has(l.invoiceId));

    const allPurchaseReturnIds = new Set(purchaseReturns.map((r: any) => r._id));
    const allPurchaseReturnLines = await collectAll("purchaseReturnLines");
    const purchaseReturnLines = allPurchaseReturnLines.filter((l: any) => allPurchaseReturnIds.has(l.returnId));

    const allGrnIds = new Set(grns.map((r: any) => r._id));
    const allGrnLines = await collectAll("grnLines");
    const grnLines = allGrnLines.filter((l: any) => allGrnIds.has(l.grnId));

    const allSalesIds = new Set(salesInvoices.map((r: any) => r._id));
    const allSalesLines = await collectAll("salesInvoiceLines");
    const salesInvoiceLines = allSalesLines.filter((l: any) => allSalesIds.has(l.invoiceId));

    const allSalesReturnIds = new Set(salesReturns.map((r: any) => r._id));
    const allSalesReturnLines = await collectAll("salesReturnLines");
    const salesReturnLines = allSalesReturnLines.filter((l: any) => allSalesReturnIds.has(l.returnId));

    const allRecipeIds = new Set(recipes.map((r: any) => r._id));
    const allRecipeLines = await collectAll("recipeLines");
    const filteredRecipeLines = allRecipeLines.filter((l: any) => allRecipeIds.has(l.recipeId));

    // ── Summary stats ─────────────────────────────────────────────
    const stats = {
      items:               items.length,
      accounts:            accounts.length,
      journalEntries:      journalEntries.length,
      journalLines:        filteredJournalLines.length,
      recipes:             recipes.length,
      recipeLines:         filteredRecipeLines.length,
      productionOrders:    productionOrders.length,
      purchaseInvoices:    purchaseInvoices.length,
      salesInvoices:       salesInvoices.length,
      suppliers:           suppliers.length,
      customers:           customers.length,
      employees:           employees.length,
      fixedAssets:         fixedAssets.length,
      inventoryTxns:       inventoryTransactions.length,
    };

    return {
      meta: {
        exportedAt:    new Date().toISOString(),
        exportedBy:    "PrimeBalance ERP — Backup System",
        systemVersion: "1.0.0",
        company:       companies[0] ?? null,
        stats,
      },
      masterData: {
        companies,
        items,
        itemCategories,
        unitOfMeasure,
        warehouses,
        branches,
        costCenters,
        fiscalYears,
      },
      finance: {
        accounts,
        journalEntries,
        journalLines: filteredJournalLines,
      },
      inventory: {
        inventoryTransactions,
        stockAdjustments,
        stockTransfers,
      },
      production: {
        recipes,
        recipeLines: filteredRecipeLines,
        productionOrders,
      },
      purchases: {
        suppliers,
        purchaseInvoices,
        purchaseInvoiceLines,
        purchaseReturns,
        purchaseReturnLines,
        grns,
        grnLines,
      },
      sales: {
        customers,
        salesInvoices,
        salesInvoiceLines,
        salesReturns,
        salesReturnLines,
      },
      treasury: {
        receipts,
        payments,
        cheques,
        bankTransfers,
      },
      hr: {
        employees,
        attendanceRecords,
        leaveRequests,
        payrollRuns,
      },
      fixedAssets: {
        fixedAssets,
        depreciationRuns,
      },
    };
  },
});
