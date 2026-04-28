import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { assertUserPermission } from "./lib/permissions";

export const getAll = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("customers")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

/** Returns only group-parent accounts (isGroupParent=true) — used in dropdowns */
export const getGroups = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("customers")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
    return all.filter((c) => c.isGroupParent === true);
  },
});

/** Returns branch accounts for a given group norm (isGroupParent=false, same customerGroupNorm) */
export const getBranchesByGroup = query({
  args: { companyId: v.id("companies"), groupNorm: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("customers")
      .withIndex("by_company_group", (q) =>
        q.eq("companyId", args.companyId).eq("customerGroupNorm", args.groupNorm)
      )
      .collect();
    return all.filter((c) => !c.isGroupParent);
  },
});

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    branchId: v.optional(v.id("branches")),
    code: v.string(),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    accountId: v.id("accounts"),
    phone: v.optional(v.string()),
    mobile: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    creditLimit: v.number(),
    creditDays: v.number(),
    currencyId: v.optional(v.id("currencies")),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.createdBy) {
      await assertUserPermission(ctx, args.createdBy, "sales", "create");
    }
    const existing = await ctx.db
      .query("customers")
      .withIndex("by_company_code", (q) =>
        q.eq("companyId", args.companyId).eq("code", args.code)
      )
      .first();
    if (existing) throw new Error("DUPLICATE_CODE");
    const { createdBy: _cb, ...rest } = args;
    return ctx.db.insert("customers", {
      ...rest,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("customers"),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    phone: v.optional(v.string()),
    mobile: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    creditLimit: v.number(),
    creditDays: v.number(),
    notes: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      await assertUserPermission(ctx, args.userId, "sales", "edit");
    }
    const { id, userId: _uid, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const toggleActive = mutation({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    const c = await ctx.db.get(args.id);
    if (!c) throw new Error("NOT_FOUND");
    await ctx.db.patch(args.id, { isActive: !c.isActive });
  },
});

export const remove = mutation({
  args: { id: v.id("customers"), userId: v.id("users") },
  handler: async (ctx, args) => {
    await assertUserPermission(ctx, args.userId, "sales", "delete");
    await ctx.db.delete(args.id);
  },
});
