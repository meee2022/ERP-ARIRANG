import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Safety: only these table names are allowed for clear operations ──────────
const ALLOWED_LEGACY_TABLES = [
  "legacyItems",
  "legacyRecipes",
  "legacyInventorySnapshot",
  "legacyPLSnapshot",
  "legacyStaffSnapshot",
] as const;
type LegacyTableName = typeof ALLOWED_LEGACY_TABLES[number];

// ─── Clear (truncate) a legacy table ─────────────────────────────────────────

export const clearLegacyTable = mutation({
  args: {
    tableName: v.string(),
  },
  handler: async (ctx, args) => {
    // Safety check: only allow clearing legacy* tables
    if (!ALLOWED_LEGACY_TABLES.includes(args.tableName as LegacyTableName)) {
      throw new Error(
        `clearLegacyTable: tableName '${args.tableName}' is not in the allowed list. ` +
        `Allowed: ${ALLOWED_LEGACY_TABLES.join(", ")}`
      );
    }

    const tableName = args.tableName as LegacyTableName;
    // Use take(2000) to stay well within Convex's 4096-read limit per mutation.
    // The caller should loop until deleted === 0 for large tables.
    const rows = await (ctx.db.query(tableName) as any).take(2000);
    let deleted = 0;
    for (const row of rows) {
      await ctx.db.delete(row._id);
      deleted++;
    }

    console.log(`[clearLegacyTable] Deleted ${deleted} records from ${tableName}`);
    return { tableName, deleted };
  },
});

// ─── Batch Insert: legacyItems ───────────────────────────────────────────────

export const insertLegacyItems = mutation({
  args: {
    items: v.array(
      v.object({
        itemCode: v.string(),
        itemName: v.string(),
        itemGroup: v.optional(v.string()),
        itemType: v.optional(v.string()),
        uom: v.optional(v.string()),
        unitPrice: v.optional(v.number()),
        notes: v.optional(v.string()),
        sourceFile: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    let count = 0;
    for (const item of args.items) {
      await ctx.db.insert("legacyItems", item);
      count++;
    }
    return count;
  },
});

// ─── Batch Insert: legacyRecipes ─────────────────────────────────────────────

export const insertLegacyRecipes = mutation({
  args: {
    recipes: v.array(
      v.object({
        fgCode: v.string(),
        fgName: v.optional(v.string()),
        componentCode: v.string(),
        componentName: v.optional(v.string()),
        componentUom: v.optional(v.string()),
        quantity: v.optional(v.number()),
        unitCost: v.optional(v.number()),
        lineTotal: v.optional(v.number()),
        sourceFile: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    let count = 0;
    for (const recipe of args.recipes) {
      await ctx.db.insert("legacyRecipes", recipe);
      count++;
    }
    return count;
  },
});

// ─── Batch Insert: legacyInventorySnapshot ───────────────────────────────────

export const insertLegacyInventorySnapshot = mutation({
  args: {
    rows: v.array(
      v.object({
        snapshotDate: v.optional(v.string()),
        branchName: v.optional(v.string()),
        itemCode: v.string(),
        itemName: v.optional(v.string()),
        itemType: v.optional(v.string()),
        category: v.optional(v.string()),
        uom: v.optional(v.string()),
        unitPrice: v.optional(v.number()),
        openingQty: v.optional(v.number()),
        totalReceivedQty: v.optional(v.number()),
        totalOutQty: v.optional(v.number()),
        balanceQty: v.optional(v.number()),
        balanceValue: v.optional(v.number()),
        sourceFile: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    let count = 0;
    for (const row of args.rows) {
      await ctx.db.insert("legacyInventorySnapshot", row);
      count++;
    }
    return count;
  },
});

// ─── Batch Insert: legacyPLSnapshot ──────────────────────────────────────────

export const insertLegacyPLSnapshot = mutation({
  args: {
    rows: v.array(
      v.object({
        branchName: v.optional(v.string()),
        periodLabel: v.optional(v.string()),
        metricName: v.string(),
        excelValue: v.optional(v.number()),
        extraLabel: v.optional(v.string()),
        sourceFile: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    let count = 0;
    for (const row of args.rows) {
      await ctx.db.insert("legacyPLSnapshot", row);
      count++;
    }
    return count;
  },
});

// ─── Batch Insert: legacyStaffSnapshot ───────────────────────────────────────

export const insertLegacyStaff = mutation({
  args: {
    rows: v.array(
      v.object({
        employeeNo: v.string(),
        employeeName: v.string(),
        position: v.optional(v.string()),
        category: v.optional(v.string()),
        location: v.optional(v.string()),
        basic: v.optional(v.number()),
        allowances: v.optional(v.number()),
        totalPackage: v.optional(v.number()),
        notes: v.optional(v.string()),
        sourceFile: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    let count = 0;
    for (const row of args.rows) {
      await ctx.db.insert("legacyStaffSnapshot", row);
      count++;
    }
    return count;
  },
});

// ─── Debug: Find potentially blank legacyItems ───────────────────────────────

export const findBlankLegacyItems = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("legacyItems").take(100000);
    const JUNK_CODES = new Set(["0", "(blank)", "blank", "n/a", "-", ""]);
    const blank = all.filter(
      (r) => {
        const code = (r.itemCode ?? "").trim().toLowerCase();
        const name = (r.itemName ?? "").trim().toLowerCase();
        return !r.itemCode || JUNK_CODES.has(code) || !r.itemName || JUNK_CODES.has(name);
      }
    );
    return blank.map((r) => ({
      id: r._id,
      itemCode: r.itemCode,
      itemName: r.itemName,
      itemType: r.itemType,
      sourceFile: r.sourceFile,
    }));
  },
});

// ─── Fix 2: Delete blank legacyItems (empty itemCode / itemName) ─────────────

export const deleteBlankLegacyItems = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("legacyItems").take(100000);
    // "Blank" = itemCode/itemName is empty, whitespace-only, junk ("0"), or placeholder ("(blank)")
    const JUNK_CODES = new Set(["0", "(blank)", "blank", "n/a", "-", ""]);
    const toDelete = all.filter(
      (r) => {
        const code = (r.itemCode ?? "").trim().toLowerCase();
        const name = (r.itemName ?? "").trim().toLowerCase();
        return !r.itemCode || JUNK_CODES.has(code) || !r.itemName || JUNK_CODES.has(name);
      }
    );
    const deleted: string[] = [];
    for (const r of toDelete) {
      deleted.push(`id=${r._id} itemCode=${JSON.stringify(r.itemCode)} itemName=${JSON.stringify(r.itemName)}`);
      await ctx.db.delete(r._id);
    }
    console.log(`[deleteBlankLegacyItems] Deleted ${deleted.length} blank records:`, deleted);
    return { deleted: deleted.length, details: deleted };
  },
});

// ─── Fix 3: Fix itemType=null/undefined/'unknown' based on itemCode prefix ────

export const fixUnknownItemTypes = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("legacyItems").take(100000);
    // Target: itemType is 'unknown', null, or undefined — but NOT junk/placeholder codes
    const JUNK_CODES = new Set(["0", "(blank)", "blank", "n/a", "-", ""]);
    const targets = all.filter(
      (r) =>
        (r.itemType === "unknown" || r.itemType == null) &&
        !JUNK_CODES.has((r.itemCode ?? "").trim().toLowerCase())
    );
    const updated: string[] = [];
    const skipped: string[] = [];
    for (const r of targets) {
      const code = r.itemCode.replace(/\D/g, ""); // strip non-digits to get numeric prefix
      let newType: string | null = null;
      if (code.startsWith("1")) {
        newType = "RAW";
      } else if (code.startsWith("2")) {
        newType = "PAK";
      } else if (code.startsWith("3")) {
        newType = "SFG";
      } else if (code.startsWith("4")) {
        newType = "FG";
      }
      if (!newType) {
        skipped.push(`code=${r.itemCode} (cannot determine type)`);
        continue;
      }
      updated.push(`id=${r._id} code=${r.itemCode} ${r.itemType ?? "null"} → ${newType}`);
      await ctx.db.patch(r._id, { itemType: newType });
    }
    console.log(`[fixUnknownItemTypes] Updated ${updated.length} / ${targets.length} records:`, updated);
    if (skipped.length > 0) console.log(`[fixUnknownItemTypes] Skipped:`, skipped);
    return { total: targets.length, updated: updated.length, skipped: skipped.length, details: updated };
  },
}); 

// ─── Query: Record Counts for All Legacy Tables ───────────────────────────────

export const getLegacyCounts = query({
  args: {},
  handler: async (ctx) => {
    const [items, recipes, inventory, pl, staff] = await Promise.all([
      ctx.db.query("legacyItems").take(100000),
      ctx.db.query("legacyRecipes").take(100000),
      ctx.db.query("legacyInventorySnapshot").take(100000),
      ctx.db.query("legacyPLSnapshot").take(100000),
      ctx.db.query("legacyStaffSnapshot").take(100000),
    ]);
    return {
      legacyItems: items.length,
      legacyRecipes: recipes.length,
      legacyInventorySnapshot: inventory.length,
      legacyPLSnapshot: pl.length,
      legacyStaffSnapshot: staff.length,
    };
  },
});

// =============================================================================
// ─── PROMOTE-TO-CORE PIPELINE ─────────────────────────────────────────────────
// =============================================================================
// These mutations move data from legacy (staging) tables into the real core
// tables: items, stockBalance (via opening_stock movements), etc.
//
// Rules:
//   - Idempotent: re-running the same promote will skip already-promoted items
//     (detected via externalCode uniqueness check).
//   - Safe: never deletes or overwrites existing core data without a check.
//   - Traceable: promoted items get externalCode + externalSource fields,
//     and opening stock movements get a migrationRunId for auditability.
// =============================================================================

// ─── Preview: what would be promoted? ────────────────────────────────────────

export const getMigrationPreview = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    // Fetch all legacy items with reviewStatus = "mapped" or without a status
    const allLegacyItems = await ctx.db.query("legacyItems").take(100000);

    // Fetch existing items in core to detect duplicates
    const coreItems = await ctx.db
      .query("items")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Build a set of existing external codes for fast lookup
    const existingExternalCodes = new Set(
      coreItems.map((i) => i.externalCode).filter(Boolean)
    );
    const existingCoreCodes = new Set(coreItems.map((i) => i.code));

    const ready: any[] = [];
    const skipped: any[] = [];
    const conflicts: any[] = [];

    for (const li of allLegacyItems) {
      if (!li.itemCode || !li.itemName) {
        skipped.push({ itemCode: li.itemCode, reason: "missing_code_or_name" });
        continue;
      }
      // Already promoted?
      if (existingExternalCodes.has(li.itemCode)) {
        skipped.push({ itemCode: li.itemCode, reason: "already_promoted" });
        continue;
      }
      // Code conflict with a manually-created core item?
      if (existingCoreCodes.has(li.itemCode)) {
        conflicts.push({ itemCode: li.itemCode, itemName: li.itemName, reason: "code_conflict_in_core" });
        continue;
      }
      ready.push({
        itemCode: li.itemCode,
        itemName: li.itemName,
        itemGroup: li.itemGroup,
        itemType: li.itemType,
        uom: li.uom,
        unitPrice: li.unitPrice,
        reviewStatus: li.reviewStatus,
      });
    }

    return {
      totalLegacyItems: allLegacyItems.length,
      readyToPromote: ready.length,
      alreadyPromoted: skipped.filter((s) => s.reason === "already_promoted").length,
      conflicts: conflicts.length,
      skippedInvalid: skipped.filter((s) => s.reason === "missing_code_or_name").length,
      readyList: ready.slice(0, 50), // preview first 50
      conflictList: conflicts,
    };
  },
});

// ─── Promote a single legacy item to core ────────────────────────────────────

export const promoteItemToCore = mutation({
  args: {
    legacyItemId: v.id("legacyItems"),
    companyId: v.id("companies"),
    // Required core fields that legacy data doesn't have
    baseUomId: v.id("unitOfMeasure"),
    itemType: v.union(
      v.literal("raw_material"),
      v.literal("semi_finished"),
      v.literal("finished_good"),
      v.literal("service"),
      v.literal("expense_item")
    ),
    categoryId: v.optional(v.id("itemCategories")),
    inventoryAccountId: v.optional(v.id("accounts")),
    cogsAccountId: v.optional(v.id("accounts")),
    revenueAccountId: v.optional(v.id("accounts")),
    // Migration source label
    externalSource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const legacy = await ctx.db.get(args.legacyItemId);
    if (!legacy) throw new Error("Legacy item not found");
    if (!legacy.itemCode || !legacy.itemName) {
      throw new Error("Legacy item has no code or name — cannot promote");
    }

    // Idempotency: check if already promoted
    const existing = await ctx.db
      .query("items")
      .withIndex("by_external_code", (q) => q.eq("externalCode", legacy.itemCode))
      .first();
    if (existing) {
      return { status: "skipped", reason: "already_promoted", itemId: existing._id };
    }

    // Check code conflict in core
    const codeConflict = await ctx.db
      .query("items")
      .withIndex("by_company_code", (q) =>
        q.eq("companyId", args.companyId).eq("code", legacy.itemCode)
      )
      .first();
    if (codeConflict) {
      throw new Error(
        `Code conflict: item code "${legacy.itemCode}" already exists in core items. ` +
        `Either rename the legacy item or the existing core item first.`
      );
    }

    // Insert into core items
    const itemId = await ctx.db.insert("items", {
      companyId: args.companyId,
      code: legacy.itemCode,
      nameAr: legacy.itemName,
      nameEn: legacy.itemName, // use same name for EN as a starting point
      categoryId: args.categoryId,
      itemType: args.itemType,
      baseUomId: args.baseUomId,
      costingMethod: "weighted_average",
      sellingPrice: legacy.unitPrice,
      standardCost: legacy.unitPrice,
      inventoryAccountId: args.inventoryAccountId,
      cogsAccountId: args.cogsAccountId,
      revenueAccountId: args.revenueAccountId,
      allowNegativeStock: false,
      isActive: true,
      notes: legacy.notes,
      externalCode: legacy.itemCode,
      externalSource: args.externalSource ?? "legacy_excel",
      createdAt: Date.now(),
    });

    // Mark legacy item as promoted
    await ctx.db.patch(args.legacyItemId, {
      reviewStatus: "mapped",
      mappedItemId: itemId,
      updatedAt: new Date().toISOString(),
      updatedBy: "promote_pipeline",
    });

    return { status: "promoted", itemId };
  },
});

// ─── Batch promote legacy items to core ──────────────────────────────────────

export const promoteItemsBatch = mutation({
  args: {
    companyId: v.id("companies"),
    // Default fallback values applied to all items in this batch
    defaultBaseUomId: v.id("unitOfMeasure"),
    defaultItemType: v.union(
      v.literal("raw_material"),
      v.literal("semi_finished"),
      v.literal("finished_good"),
      v.literal("service"),
      v.literal("expense_item")
    ),
    defaultCategoryId: v.optional(v.id("itemCategories")),
    defaultInventoryAccountId: v.optional(v.id("accounts")),
    defaultCogsAccountId: v.optional(v.id("accounts")),
    defaultRevenueAccountId: v.optional(v.id("accounts")),
    externalSource: v.optional(v.string()),
    // Max items to process in one batch (Convex mutation limit)
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 100); // cap at 100 per mutation

    // Get legacy items not yet promoted
    const allLegacy = await ctx.db.query("legacyItems").take(10000);
    const notPromoted = allLegacy.filter(
      (li) => li.reviewStatus !== "mapped" && li.itemCode && li.itemName
    );

    // Build set of already-promoted external codes
    const coreItems = await ctx.db
      .query("items")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
    const promotedCodes = new Set(
      coreItems.map((i) => i.externalCode).filter(Boolean)
    );
    const existingCoreCodes = new Set(coreItems.map((i) => i.code));

    const batch = notPromoted
      .filter((li) => !promotedCodes.has(li.itemCode))
      .slice(0, limit);

    const results = {
      promoted: 0,
      skipped: 0,
      conflicts: 0,
      errors: [] as string[],
    };

    for (const legacy of batch) {
      try {
        if (existingCoreCodes.has(legacy.itemCode)) {
          results.conflicts++;
          continue;
        }

        const itemId = await ctx.db.insert("items", {
          companyId: args.companyId,
          code: legacy.itemCode,
          nameAr: legacy.itemName,
          nameEn: legacy.itemName,
          categoryId: args.defaultCategoryId,
          itemType: args.defaultItemType,
          baseUomId: args.defaultBaseUomId,
          costingMethod: "weighted_average",
          sellingPrice: legacy.unitPrice,
          standardCost: legacy.unitPrice,
          inventoryAccountId: args.defaultInventoryAccountId,
          cogsAccountId: args.defaultCogsAccountId,
          revenueAccountId: args.defaultRevenueAccountId,
          allowNegativeStock: false,
          isActive: true,
          notes: legacy.notes,
          externalCode: legacy.itemCode,
          externalSource: args.externalSource ?? "legacy_excel",
          createdAt: Date.now(),
        });

        await ctx.db.patch(legacy._id, {
          reviewStatus: "mapped",
          mappedItemId: itemId,
          updatedAt: new Date().toISOString(),
          updatedBy: "batch_promote",
        });

        existingCoreCodes.add(legacy.itemCode); // prevent double-insert in same batch
        results.promoted++;
      } catch (e: any) {
        results.errors.push(`${legacy.itemCode}: ${e?.message ?? e}`);
      }
    }

    return {
      ...results,
      totalProcessed: batch.length,
      remaining: notPromoted.length - batch.length,
    };
  },
});

// ─── Promote inventory snapshot to Opening Stock ──────────────────────────────

export const promoteInventorySnapshot = mutation({
  args: {
    companyId: v.id("companies"),
    branchId: v.id("branches"),
    warehouseId: v.id("warehouses"),
    periodId: v.id("accountingPeriods"),
    createdBy: v.id("users"),
    // All snapshot rows for this warehouse will become opening stock
    // branchName: used to filter the snapshot rows
    branchName: v.optional(v.string()),
    // Optional: label for traceability
    migrationRunId: v.optional(v.string()),
    // Max rows to process
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 100, 200);

    // Get the snapshot rows for this branch
    let snapshots = await ctx.db
      .query("legacyInventorySnapshot")
      .take(10000);

    if (args.branchName) {
      snapshots = snapshots.filter((s) => s.branchName === args.branchName);
    }

    // Only rows with a mappedItemId (already linked to a core item)
    const mappedRows = snapshots.filter(
      (s) => s.mappedItemId && (s.balanceQty ?? 0) > 0
    ).slice(0, limit);

    if (mappedRows.length === 0) {
      return {
        status: "no_rows",
        message: "No mapped inventory snapshot rows found. Promote items first, then link them.",
        totalRows: snapshots.length,
      };
    }

    // Get base currency
    const baseCurrency = await ctx.db
      .query("currencies")
      .filter((q) => q.eq(q.field("isBase"), true))
      .first();
    if (!baseCurrency) throw new Error("No base currency found. Run seedInitialData first.");

    // Get a fallback UOM
    const fallbackUom = await ctx.db
      .query("unitOfMeasure")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .first();

    const runId = args.migrationRunId ?? `OS-${Date.now()}`;
    let processed = 0;
    let errors: string[] = [];

    // Create one movement header for the entire batch
    const movementId = await ctx.db.insert("inventoryMovements", {
      companyId: args.companyId,
      branchId: args.branchId,
      movementNumber: `OS-${runId}`,
      movementType: "opening_stock",
      movementDate: new Date().toISOString().split("T")[0],
      periodId: args.periodId,
      warehouseId: args.warehouseId,
      sourceType: "migrationOpeningStock",
      sourceId: runId,
      documentStatus: "confirmed",
      postingStatus: "posted",
      migrationRunId: runId,
      notes: `Opening stock from legacy migration run ${runId}`,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });

    for (const snap of mappedRows) {
      try {
        const itemId = snap.mappedItemId as any;
        const item = await ctx.db.get(itemId);
        if (!item) {
          errors.push(`${snap.itemCode}: mappedItemId not found in core items`);
          continue;
        }

        const qty = snap.balanceQty ?? 0;
        const unitCost = snap.unitPrice ?? (snap.balanceValue && qty > 0 ? snap.balanceValue / qty : 0);
        const totalCost = Math.round(qty * unitCost);

        // Get or create stock balance
        const existingBalance = await ctx.db
          .query("stockBalance")
          .withIndex("by_item_warehouse", (q) =>
            q.eq("itemId", itemId).eq("warehouseId", args.warehouseId)
          )
          .unique();

        if (existingBalance && existingBalance.quantity > 0) {
          errors.push(`${snap.itemCode}: stock balance already exists — skipped`);
          continue;
        }

        const uomId = (item as any).baseUomId ?? fallbackUom?._id;
        if (!uomId) {
          errors.push(`${snap.itemCode}: no UOM found`);
          continue;
        }

        // Insert movement line
        await ctx.db.insert("inventoryMovementLines", {
          movementId,
          itemId,
          quantity: qty,
          uomId,
          unitCost,
          totalCost,
          qtyBefore: 0,
          qtyAfter: qty,
          avgCostBefore: 0,
          avgCostAfter: unitCost,
        });

        // Upsert stock balance
        if (existingBalance) {
          await ctx.db.patch(existingBalance._id, {
            quantity: qty,
            avgCost: unitCost,
            totalValue: totalCost,
            lastUpdated: Date.now(),
          });
        } else {
          await ctx.db.insert("stockBalance", {
            itemId,
            warehouseId: args.warehouseId,
            quantity: qty,
            avgCost: unitCost,
            totalValue: totalCost,
            lastUpdated: Date.now(),
          });
        }

        // Mark snapshot row as promoted
        await ctx.db.patch(snap._id, {
          reviewStatus: "mapped",
          updatedAt: new Date().toISOString(),
          updatedBy: "opening_stock_promote",
        });

        processed++;
      } catch (e: any) {
        errors.push(`${snap.itemCode}: ${e?.message ?? e}`);
      }
    }

    return {
      status: "done",
      migrationRunId: runId,
      movementId,
      processed,
      errors,
      remaining: mappedRows.length - processed,
    };
  },
});
