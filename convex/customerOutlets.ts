import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { assertUserPermission } from "./lib/permissions";

// Returns only active outlets (used by invoice form dropdown)
export const getAll = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customerOutlets")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Returns ALL outlets including inactive (used by management UI)
export const getAllForManagement = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customerOutlets")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("customerOutlets") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const create = mutation({
  args: {
    customerId: v.id("customers"),
    code: v.string(),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    address: v.optional(v.string()),
    contactPerson: v.optional(v.string()),
    phone: v.optional(v.string()),
    deliveryNotes: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      await assertUserPermission(ctx, args.userId, "sales", "create");
    }
    return await ctx.db.insert("customerOutlets", {
      customerId: args.customerId,
      code: args.code,
      nameAr: args.nameAr,
      nameEn: args.nameEn,
      address: args.address,
      contactPerson: args.contactPerson,
      phone: args.phone,
      deliveryNotes: args.deliveryNotes,
      isActive: args.isActive ?? true,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("customerOutlets"),
    code: v.optional(v.string()),
    nameAr: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    address: v.optional(v.string()),
    contactPerson: v.optional(v.string()),
    phone: v.optional(v.string()),
    deliveryNotes: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      await assertUserPermission(ctx, args.userId, "sales", "edit");
    }
    const { id, userId: _uid, ...fields } = args;
    const updates: Record<string, unknown> = {};
    if (fields.code !== undefined) updates.code = fields.code;
    if (fields.nameAr !== undefined) updates.nameAr = fields.nameAr;
    if (fields.nameEn !== undefined) updates.nameEn = fields.nameEn;
    if (fields.address !== undefined) updates.address = fields.address;
    if (fields.contactPerson !== undefined) updates.contactPerson = fields.contactPerson;
    if (fields.phone !== undefined) updates.phone = fields.phone;
    if (fields.deliveryNotes !== undefined) updates.deliveryNotes = fields.deliveryNotes;
    if (fields.isActive !== undefined) updates.isActive = fields.isActive;
    await ctx.db.patch(id, updates);
    return id;
  },
});

export const toggleActive = mutation({
  args: { id: v.id("customerOutlets"), userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (args.userId) {
      await assertUserPermission(ctx, args.userId, "sales", "edit");
    }
    const outlet = await ctx.db.get(args.id);
    if (!outlet) throw new Error("Outlet not found");
    await ctx.db.patch(args.id, { isActive: !outlet.isActive });
    return args.id;
  },
});
