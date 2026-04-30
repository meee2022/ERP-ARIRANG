import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertUserPermission } from "./lib/permissions";

export const listSalesReps = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("salesReps")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

export const createSalesRep = mutation({
  args: {
    companyId: v.id("companies"),
    branchId: v.optional(v.id("branches")),
    code: v.string(),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      await assertUserPermission(ctx, args.userId, "sales", "create");
    }
    const existing = await ctx.db
      .query("salesReps")
      .withIndex("by_company_code", (q) =>
        q.eq("companyId", args.companyId).eq("code", args.code)
      )
      .first();
    if (existing) throw new Error("DUPLICATE_CODE");
    const { userId: _userId, ...rest } = args;
    return await ctx.db.insert("salesReps", {
      ...rest,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const updateSalesRep = mutation({
  args: {
    id: v.id("salesReps"),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
    branchId: v.optional(v.id("branches")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      await assertUserPermission(ctx, args.userId, "sales", "edit");
    }
    const { id, userId: _userId, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const toggleSalesRepActive = mutation({
  args: { id: v.id("salesReps"), userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (args.userId) {
      await assertUserPermission(ctx, args.userId, "sales", "edit");
    }
    const rep = await ctx.db.get(args.id);
    if (!rep) throw new Error("NOT_FOUND");
    await ctx.db.patch(args.id, { isActive: !rep.isActive });
  },
});

export const listVehicles = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const vehicles = await ctx.db
      .query("deliveryVehicles")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    return Promise.all(
      vehicles.map(async (vehicle) => {
        const salesRep = vehicle.assignedSalesRepId
          ? await ctx.db.get(vehicle.assignedSalesRepId)
          : null;
        return {
          ...vehicle,
          salesRepNameAr: salesRep?.nameAr ?? null,
          salesRepNameEn: salesRep?.nameEn ?? null,
        };
      })
    );
  },
});

export const createVehicle = mutation({
  args: {
    companyId: v.id("companies"),
    branchId: v.optional(v.id("branches")),
    code: v.string(),
    plateNumber: v.optional(v.string()),
    descriptionAr: v.optional(v.string()),
    descriptionEn: v.optional(v.string()),
    assignedSalesRepId: v.optional(v.id("salesReps")),
    notes: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      await assertUserPermission(ctx, args.userId, "sales", "create");
    }
    const existing = await ctx.db
      .query("deliveryVehicles")
      .withIndex("by_company_code", (q) =>
        q.eq("companyId", args.companyId).eq("code", args.code)
      )
      .first();
    if (existing) throw new Error("DUPLICATE_CODE");
    const { userId: _userId, ...rest } = args;
    return await ctx.db.insert("deliveryVehicles", {
      ...rest,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const updateVehicle = mutation({
  args: {
    id: v.id("deliveryVehicles"),
    branchId: v.optional(v.id("branches")),
    plateNumber: v.optional(v.string()),
    descriptionAr: v.optional(v.string()),
    descriptionEn: v.optional(v.string()),
    assignedSalesRepId: v.optional(v.id("salesReps")),
    notes: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      await assertUserPermission(ctx, args.userId, "sales", "edit");
    }
    const { id, userId: _userId, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const toggleVehicleActive = mutation({
  args: { id: v.id("deliveryVehicles"), userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (args.userId) {
      await assertUserPermission(ctx, args.userId, "sales", "edit");
    }
    const vehicle = await ctx.db.get(args.id);
    if (!vehicle) throw new Error("NOT_FOUND");
    await ctx.db.patch(args.id, { isActive: !vehicle.isActive });
  },
});
export const deleteVehicle = mutation({
  args: { id: v.id("deliveryVehicles"), userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (args.userId) {
      await assertUserPermission(ctx, args.userId, "sales", "edit");
    }
    await ctx.db.delete(args.id);
  },
});

export const deleteSalesRep = mutation({
  args: { id: v.id("salesReps"), userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (args.userId) {
      await assertUserPermission(ctx, args.userId, "sales", "edit");
    }
    await ctx.db.delete(args.id);
  },
});
