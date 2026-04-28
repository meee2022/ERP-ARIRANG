import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { assertUserPermission } from "./lib/permissions";

export const getAll = query({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args) => {
    const q = ctx.db.query("branches");
    if (args.companyId) {
      return await q.withIndex("by_company", (idx) => idx.eq("companyId", args.companyId!)).collect();
    }
    return await q.collect();
  },
});

export const getById = query({
  args: { id: v.id("branches") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    companyId: v.id("companies"),
    code: v.string(),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await assertUserPermission(ctx, args.userId, "settings", "edit");
    return await ctx.db.insert("branches", {
      companyId: args.companyId,
      code: args.code,
      nameAr: args.nameAr,
      nameEn: args.nameEn ?? "",
      address: args.address,
      phone: args.phone,
      isActive: args.isActive ?? true,
      createdAt: Date.now(),
    });
  },
});

export const getDefaultBranch = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("branches")
      .withIndex("by_company", (idx) => idx.eq("companyId", args.companyId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
  },
});

export const update = mutation({
  args: {
    userId: v.id("users"),
    id: v.id("branches"),
    nameAr: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await assertUserPermission(ctx, args.userId, "settings", "edit");
    const { id, userId: _userId, ...rest } = args;
    const updates: Record<string, unknown> = {};
    if (rest.nameAr !== undefined) updates.nameAr = rest.nameAr;
    if (rest.nameEn !== undefined) updates.nameEn = rest.nameEn;
    if (rest.address !== undefined) updates.address = rest.address;
    if (rest.phone !== undefined) updates.phone = rest.phone;
    if (rest.isActive !== undefined) updates.isActive = rest.isActive;
    await ctx.db.patch(id, updates);
    return id;
  },
});
