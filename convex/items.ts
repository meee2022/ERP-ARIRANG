import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { assertUserPermission } from "./lib/permissions";

// ─── ITEMS ────────────────────────────────────────────────────────────────────

export const getAllItems = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("items")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

/** Returns only finished goods items (sellable products) for sales invoices */
export const getSellableItems = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("items")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .filter((q) => q.eq(q.field("itemType"), "finished_good"))
      .collect();
  },
});

/** Returns all items enriched with supplier catalog stats (supplierCount, avgPrice, lastPrice, purchaseCount) */
export const getAllItemsWithStats = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const [items, supplierItems] = await Promise.all([
      ctx.db.query("items").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect(),
      ctx.db.query("supplierItems").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect(),
    ]);

    // Build stats map: itemId -> aggregated stats
    const statsMap = new Map<string, { supplierIds: Set<string>; refPrices: number[] }>();
    for (const si of supplierItems) {
      if (!si.itemId) continue;
      const key = si.itemId as string;
      if (!statsMap.has(key)) statsMap.set(key, { supplierIds: new Set(), refPrices: [] });
      const s = statsMap.get(key)!;
      s.supplierIds.add(si.supplierId as string);
      // lastPrice is the reference price imported from Excel — use it as a pricing hint
      if (si.lastPrice != null) s.refPrices.push(si.lastPrice);
    }

    return items.map((item) => {
      const s = statsMap.get(item._id as string);
      if (!s) return { ...item, supplierCount: 0, refPrice: null as number | null, lastCostFromInvoice: null as number | null };
      // refPrice = average of lastPrice (reference prices from import) across all suppliers of this item
      const refPrice = s.refPrices.length
        ? Math.round((s.refPrices.reduce((a, b) => a + b) / s.refPrices.length) * 100) / 100
        : null;
      return { ...item, supplierCount: s.supplierIds.size, refPrice, lastCostFromInvoice: null };
    });
  },
});

export const getAllCategories = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("itemCategories")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

export const getAllUnits = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("unitOfMeasure")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

export const getAllWarehouses = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("warehouses")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

export const createItem = mutation({
  args: {
    companyId: v.id("companies"),
    code: v.string(),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    categoryId: v.optional(v.id("itemCategories")),
    itemType: v.union(
      v.literal("raw_material"),
      v.literal("semi_finished"),
      v.literal("finished_good"),
      v.literal("service"),
      v.literal("expense_item")
    ),
    baseUomId: v.id("unitOfMeasure"),
    sellingPrice: v.optional(v.number()),
    standardCost: v.optional(v.number()),
    reorderPoint: v.optional(v.number()),
    inventoryAccountId: v.optional(v.id("accounts")),
    cogsAccountId: v.optional(v.id("accounts")),
    revenueAccountId: v.optional(v.id("accounts")),
    notes: v.optional(v.string()),
    purchaseType: v.optional(v.union(v.literal("RM"), v.literal("PACK"), v.literal("OTHERS"))),
    purchaseCategory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("items")
      .withIndex("by_company_code", (q) =>
        q.eq("companyId", args.companyId).eq("code", args.code)
      )
      .first();
    if (existing) throw new Error("DUPLICATE_CODE");
    return ctx.db.insert("items", {
      companyId: args.companyId,
      code: args.code,
      nameAr: args.nameAr,
      nameEn: args.nameEn,
      categoryId: args.categoryId,
      itemType: args.itemType,
      baseUomId: args.baseUomId,
      costingMethod: "weighted_average",
      sellingPrice: args.sellingPrice,
      standardCost: args.standardCost,
      reorderPoint: args.reorderPoint,
      inventoryAccountId: args.inventoryAccountId,
      cogsAccountId: args.cogsAccountId,
      revenueAccountId: args.revenueAccountId,
      purchaseType: args.purchaseType,
      purchaseCategory: args.purchaseCategory,
      allowNegativeStock: false,
      isActive: true,
      notes: args.notes,
      createdAt: Date.now(),
    });
  },
});

export const updateItem = mutation({
  args: {
    id: v.id("items"),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    categoryId: v.optional(v.id("itemCategories")),
    itemType: v.optional(v.union(
      v.literal("raw_material"),
      v.literal("semi_finished"),
      v.literal("finished_good"),
      v.literal("service"),
      v.literal("expense_item")
    )),
    baseUomId: v.optional(v.id("unitOfMeasure")),
    sellingPrice: v.optional(v.number()),
    standardCost: v.optional(v.number()),
    reorderPoint: v.optional(v.number()),
    notes: v.optional(v.string()),
    purchaseType: v.optional(v.union(v.literal("RM"), v.literal("PACK"), v.literal("OTHERS"))),
    purchaseCategory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const toggleItemActive = mutation({
  args: { id: v.id("items") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("NOT_FOUND");
    await ctx.db.patch(args.id, { isActive: !item.isActive });
  },
});

export const deleteItem = mutation({
  args: { id: v.id("items") },
  handler: async (ctx, args) => {
    // Cascade-delete all supplierItem links for this item
    const all = await ctx.db.query("supplierItems").collect();
    const linked = all.filter((si) => si.itemId === args.id);
    for (const si of linked) {
      await ctx.db.patch(si._id, { itemId: undefined, isUnresolved: true } as any);
    }
    await ctx.db.delete(args.id);
    return { deleted: 1, supplierItemsUnlinked: linked.length };
  },
});

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

export const createCategory = mutation({
  args: {
    companyId: v.id("companies"),
    code: v.string(),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    parentId: v.optional(v.id("itemCategories")),
    defaultInventoryAccountId: v.optional(v.id("accounts")),
    defaultCogsAccountId: v.optional(v.id("accounts")),
    defaultRevenueAccountId: v.optional(v.id("accounts")),
  },
  handler: async (ctx, args) => {
    // Check for duplicate code
    const existing = await ctx.db
      .query("itemCategories")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
    const dup = existing.find((c) => c.code === args.code);
    if (dup) return dup._id; // idempotent — return existing
    return ctx.db.insert("itemCategories", {
      companyId: args.companyId,
      code: args.code,
      nameAr: args.nameAr,
      nameEn: args.nameEn,
      parentId: args.parentId,
      defaultInventoryAccountId: args.defaultInventoryAccountId,
      defaultCogsAccountId: args.defaultCogsAccountId,
      defaultRevenueAccountId: args.defaultRevenueAccountId,
      isActive: true,
    });
  },
});

// ─── WAREHOUSES ───────────────────────────────────────────────────────────────

export const createWarehouse = mutation({
  args: {
    companyId: v.id("companies"),
    branchId: v.id("branches"),
    code: v.string(),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    warehouseType: v.union(v.literal("main"), v.literal("transit"), v.literal("waste")),
    isActive: v.optional(v.boolean()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      const u = await assertUserPermission(ctx, args.userId, "inventory", "create");
    }
    const existing = await ctx.db
      .query("warehouses")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .filter((q) => q.eq(q.field("code"), args.code))
      .first();
    if (existing) throw new Error("DUPLICATE_CODE");
    return ctx.db.insert("warehouses", {
      companyId: args.companyId,
      branchId: args.branchId,
      code: args.code,
      nameAr: args.nameAr,
      nameEn: args.nameEn,
      warehouseType: args.warehouseType,
      isActive: args.isActive ?? true,
    });
  },
});

export const updateWarehouse = mutation({
  args: {
    id: v.id("warehouses"),
    nameAr: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      await assertUserPermission(ctx, args.userId, "inventory", "edit");
    }
    const { id, userId: _uid, ...updates } = args;
    const filtered: Record<string, unknown> = {};
    if (updates.nameAr !== undefined) filtered.nameAr = updates.nameAr;
    if (updates.nameEn !== undefined) filtered.nameEn = updates.nameEn;
    if (updates.isActive !== undefined) filtered.isActive = updates.isActive;
    await ctx.db.patch(id, filtered);
  },
});

export const toggleWarehouseActive = mutation({
  args: { id: v.id("warehouses"), userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (args.userId) {
      await assertUserPermission(ctx, args.userId, "inventory", "edit");
    }
    const wh = await ctx.db.get(args.id);
    if (!wh) throw new Error("NOT_FOUND");
    await ctx.db.patch(args.id, { isActive: !wh.isActive });
  },
});
