// @ts-nocheck
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { PRODUCTION_ITEMS_SEED } from "./productionItemsSeed";

// ═══════════════════════════════════════════════════════════════════
// RECIPES
// ═══════════════════════════════════════════════════════════════════

export const listRecipes = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("recipes")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

export const getRecipe = query({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

export const getRecipeLines = query({
  args: { recipeId: v.id("recipes") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("recipeLines")
      .withIndex("by_recipe", (q) => q.eq("recipeId", args.recipeId))
      .collect();
  },
});

/** Full recipe with lines + resolved item/uom names */
export const getRecipeWithDetails = query({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    const recipe = await ctx.db.get(args.id);
    if (!recipe) return null;

    const lines = await ctx.db
      .query("recipeLines")
      .withIndex("by_recipe", (q) => q.eq("recipeId", args.id))
      .collect();

    const outputItem = await ctx.db.get(recipe.outputItemId);
    const yieldUom   = await ctx.db.get(recipe.yieldUomId);

    const enrichedLines = await Promise.all(
      lines.map(async (line) => {
        const item = await ctx.db.get(line.itemId);
        const uom  = await ctx.db.get(line.uomId);
        return { ...line, item, uom };
      })
    );

    return { ...recipe, outputItem, yieldUom, lines: enrichedLines };
  },
});

/** All recipes with summary stats (cost, line count) */
export const listRecipesWithStats = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const recipes = await ctx.db
      .query("recipes")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    return Promise.all(
      recipes.map(async (r) => {
        const lines = await ctx.db
          .query("recipeLines")
          .withIndex("by_recipe", (q) => q.eq("recipeId", r._id))
          .collect();

        const outputItem = await ctx.db.get(r.outputItemId);
        const yieldUom   = await ctx.db.get(r.yieldUomId);

        const totalCost = lines.reduce(
          (sum, l) => sum + (l.unitCost ?? 0) * l.grossQuantity,
          0
        );
        const costPerUnit = r.yieldQuantity > 0 ? totalCost / r.yieldQuantity : 0;

        return {
          ...r,
          outputItem,
          yieldUom,
          lineCount: lines.length,
          totalCost,
          costPerUnit,
        };
      })
    );
  },
});

export const createRecipe = mutation({
  args: {
    companyId:     v.id("companies"),
    code:          v.string(),
    nameAr:        v.string(),
    nameEn:        v.optional(v.string()),
    outputItemId:  v.id("items"),
    yieldQuantity: v.number(),
    yieldUomId:    v.id("unitOfMeasure"),
    notes:         v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("recipes")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .filter((q) => q.eq(q.field("code"), args.code))
      .first();
    if (existing) throw new Error("DUPLICATE_CODE");

    return ctx.db.insert("recipes", {
      ...args,
      version: 1,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const updateRecipe = mutation({
  args: {
    id:            v.id("recipes"),
    nameAr:        v.optional(v.string()),
    nameEn:        v.optional(v.string()),
    yieldQuantity: v.optional(v.number()),
    yieldUomId:    v.optional(v.id("unitOfMeasure")),
    notes:         v.optional(v.string()),
    isActive:      v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const patch: Record<string, unknown> = {};
    Object.entries(updates).forEach(([k, v]) => {
      if (v !== undefined) patch[k] = v;
    });
    await ctx.db.patch(id, patch);
  },
});

export const upsertRecipeLine = mutation({
  args: {
    recipeId:      v.id("recipes"),
    lineId:        v.optional(v.id("recipeLines")),
    itemId:        v.id("items"),
    quantity:      v.number(),
    uomId:         v.id("unitOfMeasure"),
    wastePct:      v.number(),
    grossQuantity: v.number(),
    unitCost:      v.optional(v.number()),
    sortOrder:     v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { lineId, ...data } = args;
    if (lineId) {
      await ctx.db.patch(lineId, data);
      return lineId;
    }
    return ctx.db.insert("recipeLines", data);
  },
});

export const deleteRecipeLine = mutation({
  args: { id: v.id("recipeLines") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ═══════════════════════════════════════════════════════════════════
// PRODUCTION ORDERS
// ═══════════════════════════════════════════════════════════════════

export const listProductionOrders = query({
  args: {
    companyId: v.id("companies"),
    status:    v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("productionOrders")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId));

    const orders = await q.collect();

    // Resolve recipe + outputItem names
    return Promise.all(
      orders
        .filter((o) => !args.status || o.status === args.status)
        .map(async (order) => {
          const recipe     = await ctx.db.get(order.recipeId);
          const outputItem = await ctx.db.get(order.outputItemId);
          const uom        = await ctx.db.get(order.yieldUomId);
          return { ...order, recipe, outputItem, uom };
        })
    );
  },
});

export const getProductionOrder = query({
  args: { id: v.id("productionOrders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) return null;
    const lines = await ctx.db
      .query("productionOrderLines")
      .withIndex("by_order", (q) => q.eq("orderId", args.id))
      .collect();
    const enrichedLines = await Promise.all(
      lines.map(async (l) => {
        const item = await ctx.db.get(l.itemId);
        const uom  = await ctx.db.get(l.uomId);
        return { ...l, item, uom };
      })
    );
    const recipe     = await ctx.db.get(order.recipeId);
    const outputItem = await ctx.db.get(order.outputItemId);
    return { ...order, recipe, outputItem, lines: enrichedLines };
  },
});

export const createProductionOrder = mutation({
  args: {
    companyId:   v.id("companies"),
    branchId:    v.id("branches"),
    orderNumber: v.string(),
    recipeId:    v.id("recipes"),
    outputItemId:v.id("items"),
    plannedQty:  v.number(),
    yieldUomId:  v.id("unitOfMeasure"),
    plannedDate: v.string(),
    warehouseId: v.optional(v.id("warehouses")),
    notes:       v.optional(v.string()),
    createdBy:   v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const { createdBy, ...rest } = args;

    // Copy recipe lines as order lines
    const recipe = await ctx.db.get(args.recipeId);
    if (!recipe) throw new Error("RECIPE_NOT_FOUND");

    const recipeLines = await ctx.db
      .query("recipeLines")
      .withIndex("by_recipe", (q) => q.eq("recipeId", args.recipeId))
      .collect();

    // Scale factor: plannedQty / recipe yieldQuantity
    const scale = args.plannedQty / (recipe.yieldQuantity || 1);

    // Calculate material cost
    const materialCost = recipeLines.reduce(
      (sum, l) => sum + (l.unitCost ?? 0) * l.grossQuantity * scale,
      0
    );

    const orderId = await ctx.db.insert("productionOrders", {
      ...rest,
      status: "planned",
      materialCost,
      totalCost: materialCost,
      createdAt: now,
      updatedAt: now,
    });

    // Insert order lines from recipe lines
    await Promise.all(
      recipeLines.map((line, idx) =>
        ctx.db.insert("productionOrderLines", {
          orderId,
          recipeLineId: line._id,
          itemId: line.itemId,
          requiredQty: line.grossQuantity * scale,
          uomId: line.uomId,
          unitCost: line.unitCost,
          totalCost: (line.unitCost ?? 0) * line.grossQuantity * scale,
          sortOrder: idx,
        })
      )
    );

    return orderId;
  },
});

export const updateOrderStatus = mutation({
  args: {
    id:            v.id("productionOrders"),
    status:        v.union(
      v.literal("planned"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    actualQty:     v.optional(v.number()),
    completedDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

// ═══════════════════════════════════════════════════════════════════
// LEGACY RECIPE MIGRATION
// ═══════════════════════════════════════════════════════════════════

/** Build a code→item lookup using THREE layers:
 *  1. legacyItems.mappedItemId (the manual mapping from old code to ERP item)
 *  2. items.externalCode       (set during automated imports)
 *  3. items.code               (direct code match as last resort)
 */
async function buildItemLookup(ctx: any, companyId: any): Promise<Map<string, any>> {
  // Layer 1: legacyItems mapping table (old code → mappedItemId)
  const legacyItems = await ctx.db.query("legacyItems").take(10000);
  // mappedItemId is stored as a string (Convex doc ID)
  const codeToItemId = new Map<string, string>();
  for (const li of legacyItems) {
    if (li.mappedItemId) codeToItemId.set(li.itemCode.toUpperCase(), li.mappedItemId);
  }

  // Layer 2 & 3: all items in this company
  const allItems = await ctx.db
    .query("items")
    .withIndex("by_company", (q: any) => q.eq("companyId", companyId))
    .take(5000);

  // Build item ID → item object map
  const itemsById = new Map<string, any>();
  for (const item of allItems) itemsById.set(item._id, item);

  // Final lookup: legacy code → item object (via mappedItemId first, then externalCode, then code)
  const lookup = new Map<string, any>();
  for (const item of allItems) {
    if (item.externalCode) lookup.set(item.externalCode.toUpperCase(), item);
    lookup.set(item.code.toUpperCase(), item);
  }
  // Override with legacy mapping (highest priority)
  for (const [legacyCode, itemId] of codeToItemId) {
    const item = itemsById.get(itemId);
    if (item) lookup.set(legacyCode, item);
  }

  return lookup;
}

/** Diagnostic: show mapping coverage between legacyRecipes codes and ERP items */
export const diagnoseMigrationMapping = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    // Get all legacyItems to see how many have mappedItemId set
    const legacyItems = await ctx.db.query("legacyItems").take(10000);
    const totalLegacyItems = legacyItems.length;
    const mappedCount     = legacyItems.filter((li: any) => !!li.mappedItemId).length;

    // Sample of unmapped FG codes (starting with 3) and RM codes (starting with 1)
    const unmappedFG = legacyItems
      .filter((li: any) => !li.mappedItemId && li.itemCode?.startsWith("3"))
      .slice(0, 5)
      .map((li: any) => ({ code: li.itemCode, name: li.itemName }));

    const unmappedRM = legacyItems
      .filter((li: any) => !li.mappedItemId && li.itemCode?.startsWith("1"))
      .slice(0, 5)
      .map((li: any) => ({ code: li.itemCode, name: li.itemName }));

    // Sample of legacyRecipes FG codes
    const legacyRecipes = await ctx.db.query("legacyRecipes").take(100);
    const fgSample = [...new Set(legacyRecipes.map((r: any) => r.fgCode))].slice(0, 5);
    const rmSample = [...new Set(legacyRecipes.map((r: any) => r.componentCode))].slice(0, 5);

    // Sample of ERP items
    const erpItems = await ctx.db
      .query("items")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .take(10);
    const erpSample = erpItems.map((i: any) => ({
      code: i.code, externalCode: i.externalCode, name: i.nameAr,
    }));

    return {
      legacyItems: { total: totalLegacyItems, mapped: mappedCount, unmapped: totalLegacyItems - mappedCount },
      unmappedFGSamples: unmappedFG,
      unmappedRMSamples: unmappedRM,
      legacyRecipeFGSamples: fgSample,
      legacyRecipeRMSamples: rmSample,
      erpItemSamples: erpSample,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// PRODUCTION ITEMS IMPORT (SFG + RM from backup data)
// ═══════════════════════════════════════════════════════════════════

/** Preview which of the 258 production items already exist in ERP vs need importing */
export const previewProductionItemsImport = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const allItems = await ctx.db
      .query("items")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .take(5000);

    // Build lookup by code and externalCode
    const existingCodes = new Set<string>();
    for (const item of allItems) {
      existingCodes.add(item.code.toUpperCase());
      if (item.externalCode) existingCodes.add(item.externalCode.toUpperCase());
    }

    const allUoms = await ctx.db
      .query("unitOfMeasure")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .take(500);
    const uomCodes = new Set(allUoms.map((u: any) => u.code.toUpperCase()));

    let toImport = 0, alreadyExists = 0, missingUom = 0;
    const missing: any[] = [];
    const uomsMissing = new Set<string>();

    for (const seed of PRODUCTION_ITEMS_SEED) {
      if (existingCodes.has(seed.code.toUpperCase())) {
        alreadyExists++;
      } else {
        toImport++;
        if (!uomCodes.has(seed.uomCode.toUpperCase())) {
          missingUom++;
          uomsMissing.add(seed.uomCode);
        }
        if (missing.length < 20) missing.push({ code: seed.code, nameEn: seed.nameEn, itemType: seed.itemType, uomCode: seed.uomCode });
      }
    }

    return {
      total: PRODUCTION_ITEMS_SEED.length,
      toImport,
      alreadyExists,
      missingUom,
      uomsMissing: [...uomsMissing],
      missingExamples: missing,
    };
  },
});

/** Import SFG + RM items from the Production Transfer Report backup data */
export const importProductionItems = mutation({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Load existing items to avoid duplicates
    const allItems = await ctx.db
      .query("items")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .take(5000);
    const existingCodes = new Set<string>();
    for (const item of allItems) {
      existingCodes.add(item.code.toUpperCase());
      if (item.externalCode) existingCodes.add(item.externalCode.toUpperCase());
    }

    // Load UOMs — match by code (case-insensitive)
    const allUoms = await ctx.db
      .query("unitOfMeasure")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .take(500);
    const uomsByCode = new Map<string, any>();
    for (const uom of allUoms) uomsByCode.set(uom.code.toUpperCase(), uom);
    // Fallback = first base UOM, then first UOM
    const baseUom = allUoms.find((u: any) => u.isBase) ?? allUoms[0];

    // Load company branch (needed for categoryId lookup)
    const companies = await ctx.db.query("companies").take(1);
    const company = companies[0];

    // Optional: try to find matching categories (categoryId is optional in schema)
    const categories = await ctx.db
      .query("itemCategories")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .take(100);
    const sfgCat = categories.find((c: any) =>
      c.nameEn?.toLowerCase().includes('sfg') || c.nameEn?.toLowerCase().includes('semi')
    ) ?? categories.find((c: any) =>
      c.nameEn?.toLowerCase().includes('production') || c.nameAr?.includes('إنتاج')
    ) ?? categories[0] ?? null;

    const rmCat = categories.find((c: any) =>
      c.nameEn?.toLowerCase().includes('raw') || c.nameAr?.includes('خام')
    ) ?? categories[0] ?? null;

    // Map itemType strings to schema enum values
    function toItemType(seedType: string): string {
      if (seedType === 'SFG')  return 'semi_finished';
      if (seedType === 'PACK') return 'raw_material';
      return 'raw_material'; // RM default
    }

    const results = { imported: 0, skipped: 0, errors: [] as string[] };

    for (const seed of PRODUCTION_ITEMS_SEED) {
      if (existingCodes.has(seed.code.toUpperCase())) {
        results.skipped++;
        continue;
      }

      // Match UOM: try exact code, then remove spaces, then fallback to baseUom
      const uom = uomsByCode.get(seed.uomCode.toUpperCase())
        ?? uomsByCode.get(seed.uomCode.trim().toUpperCase())
        ?? baseUom;
      if (!uom) { results.errors.push(`No UOM found and no fallback for ${seed.code}`); continue; }

      const category = seed.itemType === 'SFG' ? sfgCat : rmCat;
      // categoryId is optional in schema — proceed even if null

      try {
        const insertDoc: any = {
          companyId:          args.companyId,
          code:               seed.code,
          nameAr:             seed.nameEn,   // English used for both until Arabic added
          nameEn:             seed.nameEn,
          itemType:           toItemType(seed.itemType),
          baseUomId:          uom._id,
          costingMethod:      "weighted_average",
          standardCost:       seed.standardCost,
          lastCost:           seed.standardCost,
          allowNegativeStock: false,
          isActive:           true,
          externalCode:       seed.code,
          externalSource:     "production_transfer_report",
          notes:              `Legacy ${seed.itemType} | Observers2 code: ${seed.code}`,
          createdAt:          now,
        };
        // Only attach categoryId if we found one
        if (category?._id) insertDoc.categoryId = category._id;

        await ctx.db.insert("items", insertDoc);
        existingCodes.add(seed.code.toUpperCase());
        results.imported++;
      } catch (e: any) {
        results.errors.push(`${seed.code}: ${e.message}`);
      }
    }

    return results;
  },
});

/** Preview what will happen when migrating legacyRecipes → recipes + recipeLines */
export const previewLegacyRecipeMigration = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    // Load all legacy recipe rows (one row = one ingredient line)
    const legacyRows = await ctx.db.query("legacyRecipes").take(10000);

    // Build smart item lookup: legacy code → ERP item
    const itemsByCode = await buildItemLookup(ctx, args.companyId);

    // Load all UOMs for this company
    const allUoms = await ctx.db
      .query("unitOfMeasure")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .take(500);
    const uomsByCode = new Map<string, any>();
    for (const uom of allUoms) uomsByCode.set(uom.code.toUpperCase(), uom);

    // Load existing recipe codes to detect duplicates
    const existingRecipes = await ctx.db
      .query("recipes")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .take(5000);
    const existingCodes = new Set(existingRecipes.map((r: any) => r.code.toUpperCase()));

    // Group legacy rows by fgCode
    const groups = new Map<string, any[]>();
    for (const row of legacyRows) {
      if (!groups.has(row.fgCode)) groups.set(row.fgCode, []);
      groups.get(row.fgCode)!.push(row);
    }

    const previews: any[] = [];
    let countReady = 0, countExists = 0, countNoOutput = 0, countPartial = 0;

    for (const [fgCode, rows] of groups) {
      const fgName = rows[0]?.fgName ?? fgCode;
      const outputItem = itemsByCode.get(fgCode.toUpperCase());
      const alreadyExists = existingCodes.has(fgCode.toUpperCase());

      const missingIngredients: string[] = [];
      const missingUoms: string[] = [];

      for (const row of rows) {
        if (!itemsByCode.get(row.componentCode.toUpperCase())) {
          missingIngredients.push(row.componentCode);
        }
        if (row.componentUom && !uomsByCode.get(row.componentUom.toUpperCase())) {
          if (!missingUoms.includes(row.componentUom)) missingUoms.push(row.componentUom);
        }
      }

      let status: string;
      if (alreadyExists) { status = "already_exists"; countExists++; }
      else if (!outputItem) { status = "no_output_item"; countNoOutput++; }
      else if (missingIngredients.length > 0) { status = "partial"; countPartial++; }
      else { status = "ready"; countReady++; }

      previews.push({
        fgCode, fgName, lineCount: rows.length, status,
        outputItemId: outputItem?._id,
        outputItemName: outputItem?.nameAr,
        outputItemBaseUomId: outputItem?.baseUomId,
        missingIngredients,
        missingUoms,
      });
    }

    return {
      recipes: previews.sort((a, b) => {
        const order = ["ready", "partial", "no_output_item", "already_exists"];
        return order.indexOf(a.status) - order.indexOf(b.status);
      }),
      summary: {
        total: groups.size,
        ready: countReady,
        partial: countPartial,
        noOutputItem: countNoOutput,
        alreadyExists: countExists,
      },
    };
  },
});

/** Migrate legacyRecipes → recipes + recipeLines for recipes with status "ready" */
export const migrateLegacyRecipes = mutation({
  args: {
    companyId: v.id("companies"),
    onlyFgCodes: v.optional(v.array(v.string())), // if empty, migrate ALL ready ones
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Load all legacy recipe rows
    const legacyRows = await ctx.db.query("legacyRecipes").take(10000);

    // Build smart item lookup: legacy code → ERP item (via legacyItems.mappedItemId first)
    const itemsByCode = await buildItemLookup(ctx, args.companyId);

    // Load all UOMs
    const allUoms = await ctx.db
      .query("unitOfMeasure")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .take(500);
    const uomsByCode = new Map<string, any>();
    for (const uom of allUoms) uomsByCode.set(uom.code.toUpperCase(), uom);
    // Fallback UOM = first base UOM
    const baseUom = allUoms.find((u: any) => u.isBase) ?? allUoms[0];

    // Load existing recipe codes
    const existingRecipes = await ctx.db
      .query("recipes")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .take(5000);
    const existingCodes = new Set(existingRecipes.map((r: any) => r.code.toUpperCase()));

    // Group by fgCode
    const groups = new Map<string, any[]>();
    for (const row of legacyRows) {
      if (!groups.has(row.fgCode)) groups.set(row.fgCode, []);
      groups.get(row.fgCode)!.push(row);
    }

    const results: any[] = [];

    for (const [fgCode, rows] of groups) {
      // Skip if specific codes requested and this isn't one of them
      if (args.onlyFgCodes && args.onlyFgCodes.length > 0) {
        if (!args.onlyFgCodes.includes(fgCode)) continue;
      }

      // Skip already existing
      if (existingCodes.has(fgCode.toUpperCase())) {
        results.push({ fgCode, status: "skipped_exists" });
        continue;
      }

      const fgName = rows[0]?.fgName ?? fgCode;
      const outputItem = itemsByCode.get(fgCode.toUpperCase());

      if (!outputItem) {
        results.push({ fgCode, status: "skipped_no_output_item" });
        continue;
      }

      // Create the recipe
      const yieldUomId = outputItem.baseUomId ?? baseUom?._id;
      if (!yieldUomId) {
        results.push({ fgCode, status: "skipped_no_uom" });
        continue;
      }

      const recipeId = await ctx.db.insert("recipes", {
        companyId: args.companyId,
        code: fgCode,
        nameAr: fgName,
        nameEn: fgName,
        outputItemId: outputItem._id,
        yieldQuantity: 1,
        yieldUomId,
        version: 1,
        isActive: true,
        notes: "Migrated from legacy system (Observers2)",
        createdAt: now,
      });

      // Create ingredient lines
      let linesMigrated = 0;
      let linesSkipped = 0;

      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx];
        const ingredientItem = itemsByCode.get(row.componentCode.toUpperCase());
        if (!ingredientItem) { linesSkipped++; continue; }

        const uomCode = row.componentUom?.toUpperCase() ?? "";
        const lineUom = uomsByCode.get(uomCode) ?? (ingredientItem.baseUomId
          ? allUoms.find((u: any) => u._id === ingredientItem.baseUomId)
          : baseUom);

        if (!lineUom) { linesSkipped++; continue; }

        const qty = row.quantity ?? 0;
        await ctx.db.insert("recipeLines", {
          recipeId,
          itemId: ingredientItem._id,
          quantity: qty,
          uomId: lineUom._id,
          wastePct: 0,
          grossQuantity: qty,
          unitCost: row.unitCost ?? 0,
          sortOrder: idx,
        });
        linesMigrated++;
      }

      // Mark legacyRecipes rows as "mapped"
      for (const row of rows) {
        await ctx.db.patch(row._id, {
          reviewStatus: "mapped",
          mappedOutputItemId: outputItem._id,
          updatedAt: new Date().toISOString(),
          updatedBy: "migration",
        });
      }

      results.push({
        fgCode, fgName, status: "migrated",
        recipeId, linesMigrated, linesSkipped,
      });
    }

    const migrated = results.filter((r) => r.status === "migrated").length;
    const skipped  = results.filter((r) => r.status !== "migrated").length;
    return { results, summary: { migrated, skipped } };
  },
});

// ═══════════════════════════════════════════════════════════════════
// AUTO-DISCOVER MISSING LEGACY ITEMS
// ═══════════════════════════════════════════════════════════════════

/** Scan legacyRecipes and find ALL fgCodes (SFG) + componentCodes (RM) not yet in items table */
export const discoverMissingItemsPreview = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const legacyRows = await ctx.db.query("legacyRecipes").take(10000);

    const allItems = await ctx.db
      .query("items")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .take(5000);
    const existingCodes = new Set<string>();
    for (const item of allItems) {
      existingCodes.add(item.code.toUpperCase());
      if (item.externalCode) existingCodes.add(item.externalCode.toUpperCase());
    }

    // Collect unique codes from legacyRecipes
    const fgMap = new Map<string, string>(); // code → name
    const rmMap = new Map<string, string>(); // code → name
    for (const row of legacyRows) {
      if (row.fgCode && !fgMap.has(row.fgCode))
        fgMap.set(row.fgCode, row.fgName ?? row.fgCode);
      if (row.componentCode && !rmMap.has(row.componentCode))
        rmMap.set(row.componentCode, row.componentName ?? row.componentCode);
    }

    const missingSFG = [...fgMap.entries()]
      .filter(([code]) => !existingCodes.has(code.toUpperCase()))
      .map(([code, name]) => ({ code, name, itemType: "SFG" }));
    const missingRM = [...rmMap.entries()]
      .filter(([code]) => !existingCodes.has(code.toUpperCase()))
      .map(([code, name]) => ({ code, name, itemType: "RM" }));

    return {
      totalMissing: missingSFG.length + missingRM.length,
      missingSFGCount: missingSFG.length,
      missingRMCount: missingRM.length,
      examples: [...missingSFG.slice(0, 15), ...missingRM.slice(0, 15)],
      allMissingSFG: missingSFG,
      allMissingRM: missingRM,
    };
  },
});

/** Create all items discovered from legacyRecipes that are not yet in the items table */
export const importMissingLegacyItems = mutation({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const now = Date.now();

    const legacyRows = await ctx.db.query("legacyRecipes").take(10000);

    const allItems = await ctx.db
      .query("items")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .take(5000);
    const existingCodes = new Set<string>();
    for (const item of allItems) {
      existingCodes.add(item.code.toUpperCase());
      if (item.externalCode) existingCodes.add(item.externalCode.toUpperCase());
    }

    // Get UOMs
    const allUoms = await ctx.db
      .query("unitOfMeasure")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .take(500);
    const baseUom = allUoms.find((u: any) => u.isBase) ?? allUoms[0];
    if (!baseUom) return { imported: 0, skipped: 0, errors: ["No UOM found"] };

    // Collect unique codes
    const fgMap = new Map<string, string>();
    const rmMap = new Map<string, string>();
    for (const row of legacyRows) {
      if (row.fgCode && !fgMap.has(row.fgCode))
        fgMap.set(row.fgCode, row.fgName ?? row.fgCode);
      if (row.componentCode && !rmMap.has(row.componentCode))
        rmMap.set(row.componentCode, row.componentName ?? row.componentCode);
    }

    let imported = 0, skipped = 0;
    const errors: string[] = [];

    // Import missing SFG items (3000xxx → semi_finished)
    for (const [code, name] of fgMap) {
      if (existingCodes.has(code.toUpperCase())) { skipped++; continue; }
      try {
        await ctx.db.insert("items", {
          companyId:          args.companyId,
          code,
          nameAr:             name,
          nameEn:             name,
          itemType:           "semi_finished",
          baseUomId:          baseUom._id,
          costingMethod:      "weighted_average",
          standardCost:       0,
          lastCost:           0,
          allowNegativeStock: false,
          isActive:           true,
          externalCode:       code,
          externalSource:     "legacy_recipes_autodiscover",
          notes:              `Auto-discovered SFG from legacyRecipes | Observers2 code: ${code}`,
          createdAt:          now,
        });
        existingCodes.add(code.toUpperCase());
        imported++;
      } catch (e: any) {
        errors.push(`SFG ${code}: ${e.message}`);
      }
    }

    // Import missing RM items (1000xxx → raw_material)
    for (const [code, name] of rmMap) {
      if (existingCodes.has(code.toUpperCase())) { skipped++; continue; }
      try {
        await ctx.db.insert("items", {
          companyId:          args.companyId,
          code,
          nameAr:             name,
          nameEn:             name,
          itemType:           "raw_material",
          baseUomId:          baseUom._id,
          costingMethod:      "weighted_average",
          standardCost:       0,
          lastCost:           0,
          allowNegativeStock: false,
          isActive:           true,
          externalCode:       code,
          externalSource:     "legacy_recipes_autodiscover",
          notes:              `Auto-discovered RM from legacyRecipes | Observers2 code: ${code}`,
          createdAt:          now,
        });
        existingCodes.add(code.toUpperCase());
        imported++;
      } catch (e: any) {
        errors.push(`RM ${code}: ${e.message}`);
      }
    }

    return { imported, skipped, errors, total: fgMap.size + rmMap.size };
  },
});

// ═══════════════════════════════════════════════════════════════════
// PRODUCTION COST REPORT
// ═══════════════════════════════════════════════════════════════════

export const productionCostSummary = query({
  args: {
    companyId: v.id("companies"),
    fromDate:  v.optional(v.string()),
    toDate:    v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("productionOrders")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const filtered = orders.filter((o) => {
      if (args.fromDate && o.plannedDate < args.fromDate) return false;
      if (args.toDate   && o.plannedDate > args.toDate)   return false;
      return true;
    });

    const enriched = await Promise.all(
      filtered.map(async (o) => {
        const recipe     = await ctx.db.get(o.recipeId);
        const outputItem = await ctx.db.get(o.outputItemId);
        const uom        = await ctx.db.get(o.yieldUomId);
        return { ...o, recipe, outputItem, uom };
      })
    );

    const totalProduced     = enriched
      .filter((o) => o.status === "completed")
      .reduce((s, o) => s + (o.actualQty ?? o.plannedQty), 0);
    const totalMaterialCost = enriched.reduce((s, o) => s + (o.materialCost ?? 0), 0);
    const completed         = enriched.filter((o) => o.status === "completed").length;
    const avgCostPerUnit    = totalProduced > 0 ? totalMaterialCost / totalProduced : 0;

    return {
      orders: enriched,
      kpis: { totalProduced, totalMaterialCost, avgCostPerUnit, completed },
    };
  },
});

// ─── RECIPE COST AUTO-RECALCULATION ──────────────────────────────────────────
/** Refreshes unitCost on every recipeLine using current weighted-average stock
 *  cost. Returns a summary of how many lines were updated. */
export const recalculateAllRecipeCosts = mutation({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    // Load all recipes for this company
    const recipes = await ctx.db
      .query("recipes")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Load ALL stock balances (to get avgCost per item)
    const allStockBalances = await ctx.db.query("stockBalance").collect();

    // Build itemId -> avgCost map (average across all warehouses, weighted by qty)
    const costMap = new Map<string, number>();
    const totalQtyMap = new Map<string, number>();
    for (const sb of allStockBalances) {
      const key = sb.itemId as string;
      const prev = costMap.get(key) ?? 0;
      const prevQty = totalQtyMap.get(key) ?? 0;
      const newQty  = prevQty + sb.quantity;
      costMap.set(key, newQty > 0 ? (prev * prevQty + sb.avgCost * sb.quantity) / newQty : sb.avgCost);
      totalQtyMap.set(key, newQty);
    }

    let updatedLines = 0;
    let updatedRecipes = 0;

    for (const recipe of recipes) {
      const lines = await ctx.db
        .query("recipeLines")
        .withIndex("by_recipe", (q) => q.eq("recipeId", recipe._id))
        .collect();

      let changed = false;
      for (const line of lines) {
        const newCost = costMap.get(line.itemId as string) ?? line.unitCost ?? 0;
        if (Math.abs((line.unitCost ?? 0) - newCost) > 0.0001) {
          await ctx.db.patch(line._id, { unitCost: newCost });
          updatedLines++;
          changed = true;
        }
      }
      if (changed) updatedRecipes++;
    }

    return { updatedRecipes, updatedLines, totalRecipes: recipes.length };
  },
});
