// @ts-nocheck
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { postJournalEntry, updateStockBalance } from "./lib/posting";
import { requirePostingRules } from "./postingRules";

// ─── LIST WASTAGE ENTRIES ─────────────────────────────────────────────────────
export const listWastageEntries = query({
  args: {
    companyId: v.id("companies"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("wastageEntries")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .take(args.limit ?? 100);

    return entries;
  },
});

// ─── GET ONE ENTRY WITH LINES ─────────────────────────────────────────────────
export const getWastageEntry = query({
  args: { id: v.id("wastageEntries") },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.id);
    if (!entry) return null;
    const lines = await ctx.db
      .query("wastageLines")
      .withIndex("by_entry", (q) => q.eq("wastageEntryId", args.id))
      .collect();
    return { ...entry, lines };
  },
});

// ─── CREATE WASTAGE ENTRY ─────────────────────────────────────────────────────
export const createWastageEntry = mutation({
  args: {
    companyId:   v.id("companies"),
    branchId:    v.id("branches"),
    warehouseId: v.id("warehouses"),
    entryDate:   v.string(),
    periodId:    v.id("accountingPeriods"),
    reason:      v.string(),
    notes:       v.optional(v.string()),
    createdBy:   v.id("users"),
    lines: v.array(v.object({
      itemId:   v.id("items"),
      quantity: v.number(),
      uomId:    v.id("unitOfMeasure"),
      unitCost: v.number(),
      notes:    v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const { lines, ...header } = args;

    // Generate entry number
    const count = await ctx.db
      .query("wastageEntries")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
    const entryNumber = `WST-${String(count.length + 1).padStart(5, "0")}`;

    const totalCost = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);

    const entryId = await ctx.db.insert("wastageEntries", {
      ...header,
      entryNumber,
      totalCost,
      postingStatus: "unposted",
      createdAt: Date.now(),
    });

    for (const line of lines) {
      const lineCost = line.quantity * line.unitCost;
      await ctx.db.insert("wastageLines", {
        wastageEntryId: entryId,
        warehouseId: args.warehouseId,
        ...line,
        totalCost: lineCost,
      });
    }

    return { entryId, entryNumber, totalCost };
  },
});

// ─── POST WASTAGE ENTRY ───────────────────────────────────────────────────────
/** Deducts stock and posts: DR Wastage Expense / CR Inventory */
export const postWastageEntry = mutation({
  args: {
    entryId: v.id("wastageEntries"),
    userId:  v.id("users"),
    wastageExpenseAccountId: v.optional(v.id("accounts")),
    inventoryAccountId:      v.optional(v.id("accounts")),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new Error("سجل الهدر غير موجود");
    if (entry.postingStatus === "posted") throw new Error("مرحل مسبقاً");

    // Auto-fetch posting rules if accounts not provided
    const rules = (!args.wastageExpenseAccountId || !args.inventoryAccountId)
      ? await requirePostingRules(ctx, entry.companyId)
      : null;

    const wastageAccountId   = args.wastageExpenseAccountId ?? rules?.wastageExpenseAccountId;
    const inventoryAccountId = args.inventoryAccountId      ?? rules?.inventoryAccountId;

    if (!wastageAccountId)   throw new Error("حساب مصروف الهدر غير محدد — ضبط قواعد الترحيل");
    if (!inventoryAccountId) throw new Error("حساب المخزون غير محدد — ضبط قواعد الترحيل");

    const lines = await ctx.db
      .query("wastageLines")
      .withIndex("by_entry", (q) => q.eq("wastageEntryId", args.entryId))
      .collect();

    const journalLines: any[] = [];

    for (const line of lines) {
      // Deduct from stock
      await updateStockBalance(
        ctx,
        line.itemId,
        entry.warehouseId,
        -line.quantity,
        0,
        "wastage"
      );

      // DR Wastage Expense
      journalLines.push({
        accountId:   wastageAccountId,
        description: `هدر - ${entry.entryNumber}`,
        debit:  Math.round(line.totalCost * 100),
        credit: 0,
      });
      // CR Inventory
      journalLines.push({
        accountId:   inventoryAccountId,
        description: `تخفيض مخزون - هدر ${entry.entryNumber}`,
        debit:  0,
        credit: Math.round(line.totalCost * 100),
      });
    }

    // Get base currency
    const baseCurrency = await ctx.db.query("currencies").filter((q) => q.eq(q.field("isBase"), true)).first();
    if (!baseCurrency) throw new Error("لا توجد عملة أساسية محددة في النظام");

    const journalEntryId = await postJournalEntry(
      ctx,
      {
        companyId:       entry.companyId,
        branchId:        entry.branchId,
        journalType:     "auto_inventory",
        entryDate:       entry.entryDate,
        periodId:        entry.periodId,
        currencyId:      baseCurrency._id,
        exchangeRate:    1,
        sourceType:      "wastageEntry",
        sourceId:        entry._id,
        description:     `هدر وتالف - ${entry.entryNumber}`,
        isAutoGenerated: true,
        createdBy:       args.userId,
      },
      journalLines
    );

    await ctx.db.patch(args.entryId, {
      postingStatus:  "posted",
      journalEntryId,
      updatedAt:      Date.now(),
    });

    return { success: true, journalEntryId };
  },
});

// ─── WASTAGE STATS ────────────────────────────────────────────────────────────
export const getWastageStats = query({
  args: { companyId: v.id("companies"), fromDate: v.string(), toDate: v.string() },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("wastageEntries")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const inRange = entries.filter(
      (e) => e.entryDate >= args.fromDate && e.entryDate <= args.toDate
    );

    const totalCost    = inRange.reduce((s, e) => s + e.totalCost, 0);
    const postedCount  = inRange.filter((e) => e.postingStatus === "posted").length;
    const pendingCount = inRange.filter((e) => e.postingStatus === "unposted").length;

    // By reason
    const byReason: Record<string, number> = {};
    for (const e of inRange) {
      byReason[e.reason] = (byReason[e.reason] ?? 0) + e.totalCost;
    }

    return { totalCost, totalEntries: inRange.length, postedCount, pendingCount, byReason };
  },
});
