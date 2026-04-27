import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const getBySupplier = query({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, { supplierId }) => {
    const rows = await ctx.db
      .query("supplierItems")
      .withIndex("by_supplier", (q) => q.eq("supplierId", supplierId))
      .collect();

    return await Promise.all(
      rows.map(async (row) => {
        // itemId is now optional — only fetch if linked
        const item = row.itemId ? await ctx.db.get(row.itemId) : null;
        return { ...row, item };
      })
    );
  },
});

export const add = mutation({
  args: {
    supplierId: v.id("suppliers"),
    companyId: v.id("companies"),
    itemId: v.optional(v.id("items")),
    supplierItemCode: v.optional(v.string()),
    supplierPrice: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Prevent duplicate: same supplier + same itemId (if provided)
    if (args.itemId) {
      const existing = await ctx.db
        .query("supplierItems")
        .withIndex("by_supplier_item", (q) =>
          q.eq("supplierId", args.supplierId).eq("itemId", args.itemId)
        )
        .first();
      if (existing) throw new Error("هذا الصنف مضاف مسبقاً للمورد.");
    }

    return await ctx.db.insert("supplierItems", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { supplierItemId: v.id("supplierItems") },
  handler: async (ctx, { supplierItemId }) => {
    await ctx.db.delete(supplierItemId);
  },
});

/** Get all supplier catalog rows for a specific item (which suppliers supply it, at what prices) */
export const getByItem = query({
  args: { itemId: v.id("items") },
  handler: async (ctx, { itemId }) => {
    const all = await ctx.db.query("supplierItems").collect();
    const filtered = all.filter((si) => si.itemId === itemId);
    return await Promise.all(
      filtered.map(async (row) => {
        const supplier = await ctx.db.get(row.supplierId);
        return { ...row, supplier };
      })
    );
  },
});

/** Get supplier catalog for a given supplier — used for invoice line suggestions */
export const getSupplierCatalog = query({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, { supplierId }) => {
    const rows = await ctx.db
      .query("supplierItems")
      .withIndex("by_supplier", (q) => q.eq("supplierId", supplierId))
      .collect();

    return await Promise.all(
      rows.map(async (row) => {
        const item = row.itemId ? await ctx.db.get(row.itemId) : null;
        return {
          _id: row._id,
          supplierId: row.supplierId,
          itemId: row.itemId ?? null,
          supplierItemName: row.supplierItemName ?? null,
          purchaseUom: row.purchaseUom ?? null,
          stockUom: row.stockUom ?? null,
          avgPrice: row.avgPrice ?? null,
          lastPrice: row.lastPrice ?? null,
          purchaseCount: row.purchaseCount ?? 0,
          lastPurchaseDate: row.lastPurchaseDate ?? null,
          isUnresolved: row.isUnresolved ?? false,
          item,
        };
      })
    );
  },
});

/** Create a new supplier-item link manually (from the item form) */
export const createLink = mutation({
  args: {
    companyId: v.id("companies"),
    supplierId: v.id("suppliers"),
    itemId: v.id("items"),
    supplierItemName: v.optional(v.string()),
    purchaseUom: v.optional(v.string()),
    lastPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("supplierItems")
      .withIndex("by_supplier_item", (q) =>
        q.eq("supplierId", args.supplierId).eq("itemId", args.itemId)
      )
      .first();
    if (existing) throw new Error("هذا الصنف مرتبط بالفعل بهذا المورد.");

    return ctx.db.insert("supplierItems", {
      companyId: args.companyId,
      supplierId: args.supplierId,
      itemId: args.itemId,
      supplierItemName: args.supplierItemName,
      normalizedItemName: (args.supplierItemName ?? "").toUpperCase().trim(),
      purchaseUom: args.purchaseUom,
      lastPrice: args.lastPrice,
      supplierPrice: args.lastPrice,
      isUnresolved: false,
      createdAt: Date.now(),
    });
  },
});

/** Link an unresolved supplierItem to an internal catalog item */
export const linkItem = mutation({
  args: {
    supplierItemId: v.id("supplierItems"),
    itemId: v.id("items"),
  },
  handler: async (ctx, { supplierItemId, itemId }) => {
    const si = await ctx.db.get(supplierItemId);
    if (!si) throw new Error("NOT_FOUND");

    // Check not already linked to this item by another supplierItem for the same supplier
    const dup = await ctx.db
      .query("supplierItems")
      .withIndex("by_supplier_item", (q) =>
        q.eq("supplierId", si.supplierId).eq("itemId", itemId)
      )
      .first();
    if (dup && dup._id !== supplierItemId) throw new Error("هذا الصنف مرتبط بالفعل بمورد آخر.");

    await ctx.db.patch(supplierItemId, { itemId, isUnresolved: false });
  },
});
