import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { assertUserPermission } from "./lib/permissions";

export const getAll = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("suppliers")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

/** Returns suppliers with their live item counts */
export const getWithStats = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const suppliers = await ctx.db
      .query("suppliers")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const result = await Promise.all(
      suppliers.map(async (s) => {
        const items = await ctx.db
          .query("supplierItems")
          .withIndex("by_supplier", (q) => q.eq("supplierId", s._id))
          .collect();
        const unresolvedCount = items.filter((i) => i.isUnresolved).length;
        return {
          ...s,
          itemCount: items.length,
          unresolvedCount,
        };
      })
    );

    return result;
  },
});

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    code: v.string(),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    accountId: v.id("accounts"),
    phone: v.optional(v.string()),
    mobile: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    taxNumber: v.optional(v.string()),
    paymentTerms: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.createdBy) {
      await assertUserPermission(ctx, args.createdBy, "purchases", "create");
    }
    const existing = await ctx.db
      .query("suppliers")
      .withIndex("by_company_code", (q) =>
        q.eq("companyId", args.companyId).eq("code", args.code)
      )
      .first();
    if (existing) throw new Error("DUPLICATE_CODE");
    const { createdBy: _cb, ...rest } = args;
    return ctx.db.insert("suppliers", {
      ...rest,
      normalizedName: args.nameAr.trim().toUpperCase(),
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("suppliers"),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    phone: v.optional(v.string()),
    mobile: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    taxNumber: v.optional(v.string()),
    paymentTerms: v.optional(v.number()),
    notes: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      await assertUserPermission(ctx, args.userId, "purchases", "edit");
    }
    const { id, userId: _uid, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const toggleActive = mutation({
  args: { id: v.id("suppliers") },
  handler: async (ctx, args) => {
    const s = await ctx.db.get(args.id);
    if (!s) throw new Error("NOT_FOUND");
    await ctx.db.patch(args.id, { isActive: !s.isActive });
  },
});

export const deleteSupplier = mutation({
  args: { id: v.id("suppliers") },
  handler: async (ctx, args) => {
    // Cascade-delete all supplierItems linked to this supplier
    const linked = await ctx.db
      .query("supplierItems")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.id))
      .collect();
    for (const si of linked) {
      await ctx.db.delete(si._id);
    }
    await ctx.db.delete(args.id);
    return { deleted: 1, supplierItemsDeleted: linked.length };
  },
});
