import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { assertUserPermission } from "./lib/permissions";

export const getAll = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("accounts")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    code: v.string(),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    parentId: v.optional(v.id("accounts")),
    accountType: v.union(
      v.literal("asset"),
      v.literal("liability"),
      v.literal("equity"),
      v.literal("revenue"),
      v.literal("expense")
    ),
    accountSubType: v.string(),
    isPostable: v.boolean(),
    requiresCostCenter: v.boolean(),
    requiresSubAccount: v.boolean(),
    normalBalance: v.union(v.literal("debit"), v.literal("credit")),
    operationalType: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Permission check before any DB writes
    await assertUserPermission(ctx, args.createdBy, "finance", "create");

    const existing = await ctx.db
      .query("accounts")
      .withIndex("by_company_code", (q) =>
        q.eq("companyId", args.companyId).eq("code", args.code)
      )
      .first();
    if (existing) throw new Error("DUPLICATE_CODE");

    const { createdBy, ...rest } = args;
    return ctx.db.insert("accounts", {
      ...rest,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("accounts"),
    nameAr: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    accountSubType: v.optional(v.string()),
    isPostable: v.optional(v.boolean()),
    requiresCostCenter: v.optional(v.boolean()),
    operationalType: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const patch: Record<string, unknown> = {};
    if (updates.nameAr           !== undefined) patch.nameAr           = updates.nameAr;
    if (updates.nameEn           !== undefined) patch.nameEn           = updates.nameEn;
    if (updates.accountSubType   !== undefined) patch.accountSubType   = updates.accountSubType;
    if (updates.isPostable       !== undefined) patch.isPostable       = updates.isPostable;
    if (updates.requiresCostCenter !== undefined) patch.requiresCostCenter = updates.requiresCostCenter;
    if (updates.operationalType  !== undefined) patch.operationalType  = updates.operationalType;
    if (updates.notes            !== undefined) patch.notes            = updates.notes;
    await ctx.db.patch(id, patch);
  },
});

/** Lightweight mutation to set operationalType on any existing account */
export const setOperationalType = mutation({
  args: {
    id: v.id("accounts"),
    operationalType: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, { id, operationalType, userId }) => {
    await assertUserPermission(ctx, userId, "finance", "edit");
    await ctx.db.patch(id, { operationalType });
  },
});

export const toggleActive = mutation({
  args: { id: v.id("accounts") },
  handler: async (ctx, args) => {
    const acc = await ctx.db.get(args.id);
    if (!acc) throw new Error("NOT_FOUND");
    await ctx.db.patch(args.id, { isActive: !acc.isActive });
  },
});
