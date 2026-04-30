import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { assertUserPermission } from "./lib/permissions";
import {
  postJournalEntry,
  JournalLineInput,
} from "./lib/posting";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Calculate total accumulated depreciation for an asset from past entries */
async function getAccumulatedDepreciation(
  ctx: any,
  assetId: Id<"fixedAssets">
): Promise<number> {
  const entries = await ctx.db
    .query("assetDepreciationEntries")
    .withIndex("by_asset", (q: any) => q.eq("assetId", assetId))
    .collect();
  return entries.reduce((sum: number, e: any) => sum + e.depreciationAmount, 0);
}

/** Calculate monthly depreciation for an asset */
function calcMonthlyDepreciation(
  purchaseCost: number,
  salvageValue: number,
  usefulLifeMonths: number
): number {
  const depreciableBase = purchaseCost - salvageValue;
  if (depreciableBase <= 0 || usefulLifeMonths <= 0) return 0;
  return Math.round((depreciableBase / usefulLifeMonths) * 100) / 100;
}

/** Check if asset is eligible for depreciation in the given period */
function isEligibleForPeriod(
  asset: any,
  year: number,
  month: number
): boolean {
  if (asset.status === "inactive" || asset.status === "fully_depreciated") return false;
  const startDate = asset.inServiceDate ?? asset.purchaseDate;
  const periodStart = new Date(year, month - 1, 1);
  return new Date(startDate) <= periodStart;
}

// ─── ASSET REGISTER QUERIES ──────────────────────────────────────────────────

export const getFixedAssets = query({
  args: {
    companyId: v.id("companies"),
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let rows = await ctx.db
      .query("fixedAssets")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    if (args.status) {
      rows = rows.filter((r) => r.status === args.status);
    }
    if (args.category) {
      rows = rows.filter((r) => r.category === args.category);
    }
    if (args.search && args.search.trim()) {
      const s = args.search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.assetCode.toLowerCase().includes(s) ||
          r.nameAr.toLowerCase().includes(s) ||
          (r.nameEn ?? "").toLowerCase().includes(s)
      );
    }

    // Enrich with accumulated depreciation and book value
    const enriched = await Promise.all(
      rows.map(async (asset) => {
        const accDepr = await getAccumulatedDepreciation(ctx, asset._id);
        const bookValue = asset.purchaseCost - accDepr;
        return { ...asset, accumulatedDepreciation: accDepr, bookValue };
      })
    );

    return enriched.sort((a, b) => a.assetCode.localeCompare(b.assetCode));
  },
});

export const getFixedAssetById = query({
  args: { id: v.id("fixedAssets") },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.id);
    if (!asset) return null;
    const accDepr = await getAccumulatedDepreciation(ctx, asset._id);
    const bookValue = asset.purchaseCost - accDepr;
    return { ...asset, accumulatedDepreciation: accDepr, bookValue };
  },
});

// ─── ASSET MUTATIONS ─────────────────────────────────────────────────────────

export const createFixedAsset = mutation({
  args: {
    companyId: v.id("companies"),
    assetCode: v.string(),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    category: v.optional(v.string()),
    purchaseDate: v.number(),
    inServiceDate: v.optional(v.number()),
    purchaseCost: v.number(),
    salvageValue: v.number(),
    usefulLifeMonths: v.number(),
    depreciationMethod: v.string(),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    costCenterId: v.optional(v.id("costCenters")),
    assetAccountId: v.optional(v.id("accounts")),
    depreciationExpenseAccountId: v.optional(v.id("accounts")),
    accumulatedDepreciationAccountId: v.optional(v.id("accounts")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.userId) await assertUserPermission(ctx, args.userId, "finance", "create");
    // Check unique code
    const existing = await ctx.db
      .query("fixedAssets")
      .withIndex("by_company_code", (q) =>
        q.eq("companyId", args.companyId).eq("assetCode", args.assetCode)
      )
      .first();
    if (existing) throw new Error("DUPLICATE_ASSET_CODE");

    const now = Date.now();
    return ctx.db.insert("fixedAssets", {
      companyId: args.companyId,
      assetCode: args.assetCode,
      nameAr: args.nameAr,
      nameEn: args.nameEn,
      category: args.category,
      purchaseDate: args.purchaseDate,
      inServiceDate: args.inServiceDate,
      purchaseCost: args.purchaseCost,
      salvageValue: args.salvageValue ?? 0,
      usefulLifeMonths: args.usefulLifeMonths,
      depreciationMethod: args.depreciationMethod ?? "straight_line",
      status: "active",
      location: args.location,
      notes: args.notes,
      costCenterId: args.costCenterId,
      assetAccountId: args.assetAccountId,
      depreciationExpenseAccountId: args.depreciationExpenseAccountId,
      accumulatedDepreciationAccountId: args.accumulatedDepreciationAccountId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateFixedAsset = mutation({
  args: {
    id: v.id("fixedAssets"),
    assetCode: v.optional(v.string()),
    nameAr: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    category: v.optional(v.string()),
    purchaseDate: v.optional(v.number()),
    inServiceDate: v.optional(v.number()),
    purchaseCost: v.optional(v.number()),
    salvageValue: v.optional(v.number()),
    usefulLifeMonths: v.optional(v.number()),
    depreciationMethod: v.optional(v.string()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    costCenterId: v.optional(v.id("costCenters")),
    assetAccountId: v.optional(v.id("accounts")),
    depreciationExpenseAccountId: v.optional(v.id("accounts")),
    accumulatedDepreciationAccountId: v.optional(v.id("accounts")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { id, userId, ...updates }) => {
    if (userId) await assertUserPermission(ctx, userId, "finance", "edit");
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("NOT_FOUND");

    // Check unique code if changing
    if (updates.assetCode && updates.assetCode !== existing.assetCode) {
      const dup = await ctx.db
        .query("fixedAssets")
        .withIndex("by_company_code", (q) =>
          q.eq("companyId", existing.companyId).eq("assetCode", updates.assetCode!)
        )
        .first();
      if (dup) throw new Error("DUPLICATE_ASSET_CODE");
    }

    const patch: Record<string, any> = { updatedAt: Date.now() };
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) patch[key] = val;
    }
    await ctx.db.patch(id, patch);
  },
});

export const archiveFixedAsset = mutation({
  args: { id: v.id("fixedAssets"), userId: v.optional(v.id("users")) },
  handler: async (ctx, { id, userId }) => {
    if (userId) await assertUserPermission(ctx, userId, "finance", "edit");
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("NOT_FOUND");
    await ctx.db.patch(id, { status: "inactive", updatedAt: Date.now() });
  },
});

// ─── DEPRECIATION ────────────────────────────────────────────────────────────

export const previewDepreciationRun = query({
  args: {
    companyId: v.id("companies"),
    periodYear: v.number(),
    periodMonth: v.number(),
  },
  handler: async (ctx, args) => {
    const assets = await ctx.db
      .query("fixedAssets")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const preview = [];
    for (const asset of assets) {
      if (!isEligibleForPeriod(asset, args.periodYear, args.periodMonth)) continue;

      const accDepr = await getAccumulatedDepreciation(ctx, asset._id);
      const bookValueBefore = asset.purchaseCost - accDepr;
      const monthlyDepr = calcMonthlyDepreciation(
        asset.purchaseCost,
        asset.salvageValue,
        asset.usefulLifeMonths
      );

      // Never depreciate below salvage value
      const maxDepr = Math.max(0, bookValueBefore - asset.salvageValue);
      const depreciationAmount = Math.min(monthlyDepr, maxDepr);

      if (depreciationAmount <= 0) continue;

      preview.push({
        assetId: asset._id,
        assetCode: asset.assetCode,
        nameAr: asset.nameAr,
        nameEn: asset.nameEn,
        category: asset.category,
        bookValueBefore,
        depreciationAmount,
        bookValueAfter: bookValueBefore - depreciationAmount,
        depreciationExpenseAccountId: asset.depreciationExpenseAccountId,
        accumulatedDepreciationAccountId: asset.accumulatedDepreciationAccountId,
      });
    }

    return preview;
  },
});

export const createDepreciationRun = mutation({
  args: {
    companyId: v.id("companies"),
    periodYear: v.number(),
    periodMonth: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Prevent duplicate draft/posted run for same period
    const existingRun = await ctx.db
      .query("assetDepreciationRuns")
      .withIndex("by_company_period", (q) =>
        q.eq("companyId", args.companyId).eq("periodYear", args.periodYear).eq("periodMonth", args.periodMonth)
      )
      .first();
    if (existingRun) {
      throw new Error("DUPLICATE_RUN");
    }

    const assets = await ctx.db
      .query("fixedAssets")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const now = Date.now();
    const runId = await ctx.db.insert("assetDepreciationRuns", {
      companyId: args.companyId,
      runDate: now,
      periodYear: args.periodYear,
      periodMonth: args.periodMonth,
      status: "draft",
      notes: args.notes,
      createdAt: now,
    });

    let entryCount = 0;
    for (const asset of assets) {
      if (!isEligibleForPeriod(asset, args.periodYear, args.periodMonth)) continue;

      const accDepr = await getAccumulatedDepreciation(ctx, asset._id);
      const bookValueBefore = asset.purchaseCost - accDepr;
      const monthlyDepr = calcMonthlyDepreciation(
        asset.purchaseCost,
        asset.salvageValue,
        asset.usefulLifeMonths
      );
      const maxDepr = Math.max(0, bookValueBefore - asset.salvageValue);
      const depreciationAmount = Math.min(monthlyDepr, maxDepr);

      if (depreciationAmount <= 0) continue;

      await ctx.db.insert("assetDepreciationEntries", {
        companyId: args.companyId,
        runId,
        assetId: asset._id,
        periodYear: args.periodYear,
        periodMonth: args.periodMonth,
        depreciationAmount,
        bookValueBefore,
        bookValueAfter: bookValueBefore - depreciationAmount,
        createdAt: now,
      });
      entryCount++;

      // Check if fully depreciated after this entry
      const newBookValue = bookValueBefore - depreciationAmount;
      if (newBookValue <= asset.salvageValue) {
        await ctx.db.patch(asset._id, {
          status: "fully_depreciated",
          updatedAt: now,
        });
      }
    }

    return { runId, entryCount };
  },
});

export const postDepreciationRun = mutation({
  args: {
    runId: v.id("assetDepreciationRuns"),
    userId: v.id("users"),
    branchId: v.id("branches"),
    periodId: v.id("accountingPeriods"),
    currencyId: v.id("currencies"),
  },
  handler: async (ctx, args) => {
    await assertUserPermission(ctx, args.userId, "finance", "post");
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error("RUN_NOT_FOUND");
    if (run.status === "posted") throw new Error("RUN_ALREADY_POSTED");

    const entries = await ctx.db
      .query("assetDepreciationEntries")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();

    if (entries.length === 0) throw new Error("NO_ENTRIES");

    const entryDate = `${run.periodYear}-${String(run.periodMonth).padStart(2, "0")}-28`;

    for (const entry of entries) {
      const asset = await ctx.db.get(entry.assetId);
      if (!asset) continue;

      if (!asset.depreciationExpenseAccountId || !asset.accumulatedDepreciationAccountId) {
        throw new Error(
          `MISSING_ACCOUNTS:${asset.assetCode}:${asset.nameAr}`
        );
      }

      const descEn = `Monthly depreciation for ${asset.assetCode} - ${run.periodMonth}/${run.periodYear}`;
      const descAr = `إهلاك شهري - ${asset.assetCode} - ${asset.nameAr} - ${run.periodMonth}/${run.periodYear}`;

      const journalLines: JournalLineInput[] = [
        {
          accountId: asset.depreciationExpenseAccountId,
          description: descAr,
          debit: Math.round(entry.depreciationAmount * 100),
          credit: 0,
          costCenterId: asset.costCenterId ?? undefined,
        },
        {
          accountId: asset.accumulatedDepreciationAccountId,
          description: descAr,
          debit: 0,
          credit: Math.round(entry.depreciationAmount * 100),
          costCenterId: asset.costCenterId ?? undefined,
        },
      ];

      const journalEntryId = await postJournalEntry(
        ctx,
        {
          companyId: run.companyId,
          branchId: args.branchId,
          journalType: "auto_depreciation",
          entryDate,
          periodId: args.periodId,
          currencyId: args.currencyId,
          exchangeRate: 1,
          costCenterId: asset.costCenterId ?? undefined,
          sourceType: "depreciation_run",
          sourceId: args.runId,
          description: descEn,
          isAutoGenerated: true,
          createdBy: args.userId,
        },
        journalLines
      );

      await ctx.db.patch(entry._id, { journalEntryId });
    }

    await ctx.db.patch(args.runId, { status: "posted" });
    return { success: true, entriesPosted: entries.length };
  },
});

export const getDepreciationRuns = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const runs = await ctx.db
      .query("assetDepreciationRuns")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Enrich with counts and totals
    const enriched = await Promise.all(
      runs.map(async (run) => {
        const entries = await ctx.db
          .query("assetDepreciationEntries")
          .withIndex("by_run", (q) => q.eq("runId", run._id))
          .collect();
        const totalDepreciation = entries.reduce((s, e) => s + e.depreciationAmount, 0);
        return {
          ...run,
          assetCount: entries.length,
          totalDepreciation,
        };
      })
    );

    return enriched.sort((a, b) => {
      if (a.periodYear !== b.periodYear) return b.periodYear - a.periodYear;
      return b.periodMonth - a.periodMonth;
    });
  },
});

export const getDepreciationRunDetails = query({
  args: { runId: v.id("assetDepreciationRuns") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return null;

    const entries = await ctx.db
      .query("assetDepreciationEntries")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();

    const enriched = await Promise.all(
      entries.map(async (entry) => {
        const asset = await ctx.db.get(entry.assetId);
        return {
          ...entry,
          assetCode: asset?.assetCode ?? "",
          assetNameAr: asset?.nameAr ?? "",
          assetNameEn: asset?.nameEn ?? "",
          category: asset?.category,
        };
      })
    );

    return { ...run, entries: enriched };
  },
});

// ─── REPORTS ─────────────────────────────────────────────────────────────────

export const getAssetRegisterReport = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const assets = await ctx.db
      .query("fixedAssets")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const rows = await Promise.all(
      assets.map(async (asset) => {
        const accDepr = await getAccumulatedDepreciation(ctx, asset._id);
        return {
          assetCode: asset.assetCode,
          nameAr: asset.nameAr,
          nameEn: asset.nameEn,
          category: asset.category,
          purchaseCost: asset.purchaseCost,
          accumulatedDepreciation: accDepr,
          bookValue: asset.purchaseCost - accDepr,
          status: asset.status,
          purchaseDate: asset.purchaseDate,
          usefulLifeMonths: asset.usefulLifeMonths,
          salvageValue: asset.salvageValue,
          location: asset.location,
        };
      })
    );

    return rows.sort((a, b) => a.assetCode.localeCompare(b.assetCode));
  },
});

export const getDepreciationScheduleReport = query({
  args: {
    companyId: v.id("companies"),
    assetId: v.optional(v.id("fixedAssets")),
    category: v.optional(v.string()),
    fromYear: v.optional(v.number()),
    fromMonth: v.optional(v.number()),
    toYear: v.optional(v.number()),
    toMonth: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let entries = args.assetId
      ? await ctx.db
          .query("assetDepreciationEntries")
          .withIndex("by_asset", (q) => q.eq("assetId", args.assetId!))
          .collect()
      : await ctx.db
          .query("assetDepreciationEntries")
          .filter((q) => q.eq(q.field("companyId"), args.companyId))
          .collect();

    // Period filters
    if (args.fromYear && args.fromMonth) {
      entries = entries.filter(
        (e) =>
          e.periodYear > args.fromYear! ||
          (e.periodYear === args.fromYear! && e.periodMonth >= args.fromMonth!)
      );
    }
    if (args.toYear && args.toMonth) {
      entries = entries.filter(
        (e) =>
          e.periodYear < args.toYear! ||
          (e.periodYear === args.toYear! && e.periodMonth <= args.toMonth!)
      );
    }

    // Enrich
    const enriched = await Promise.all(
      entries.map(async (entry) => {
        const asset = await ctx.db.get(entry.assetId);
        if (args.category && asset?.category !== args.category) return null;

        // Get running accumulated depreciation up to this period
        const allEntries = await ctx.db
          .query("assetDepreciationEntries")
          .withIndex("by_asset", (q) => q.eq("assetId", entry.assetId))
          .collect();
        const accDeprUpToPeriod = allEntries
          .filter(
            (e) =>
              e.periodYear < entry.periodYear ||
              (e.periodYear === entry.periodYear && e.periodMonth <= entry.periodMonth)
          )
          .reduce((s, e) => s + e.depreciationAmount, 0);

        return {
          assetCode: asset?.assetCode ?? "",
          assetNameAr: asset?.nameAr ?? "",
          assetNameEn: asset?.nameEn ?? "",
          category: asset?.category,
          periodYear: entry.periodYear,
          periodMonth: entry.periodMonth,
          depreciationAmount: entry.depreciationAmount,
          accumulatedDepreciation: accDeprUpToPeriod,
          bookValueAfter: (asset?.purchaseCost ?? 0) - accDeprUpToPeriod,
        };
      })
    );

    return enriched
      .filter(Boolean)
      .sort((a: any, b: any) => {
        const cmp = a.assetCode.localeCompare(b.assetCode);
        if (cmp !== 0) return cmp;
        if (a.periodYear !== b.periodYear) return a.periodYear - b.periodYear;
        return a.periodMonth - b.periodMonth;
      });
  },
});

export const getAssetBookValueSummary = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const assets = await ctx.db
      .query("fixedAssets")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const categoryMap: Record<
      string,
      { totalCost: number; accDepr: number; netBookValue: number; count: number }
    > = {};

    for (const asset of assets) {
      const cat = asset.category || "—";
      if (!categoryMap[cat]) {
        categoryMap[cat] = { totalCost: 0, accDepr: 0, netBookValue: 0, count: 0 };
      }
      const accDepr = await getAccumulatedDepreciation(ctx, asset._id);
      categoryMap[cat].totalCost += asset.purchaseCost;
      categoryMap[cat].accDepr += accDepr;
      categoryMap[cat].netBookValue += asset.purchaseCost - accDepr;
      categoryMap[cat].count++;
    }

    return Object.entries(categoryMap)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => a.category.localeCompare(b.category));
  },
});
