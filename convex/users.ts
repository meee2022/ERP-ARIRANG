import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { hashPassword } from "./lib/crypto";
import { logAudit } from "./lib/audit";
import { assertUserPermission } from "./lib/permissions";

// ─── List Users ───────────────────────────────────────────────────────────────
// Returns all users WITHOUT passwordHash — never expose it to the frontend.

export const listUsers = query({
  args: {
    companyId: v.optional(v.id("companies")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      await assertUserPermission(ctx, args.userId, "users", "view");
    }
    const users = await ctx.db.query("users").take(500);
    // Strip passwordHash from every record
    return users.map(({ passwordHash: _ph, ...rest }) => rest);
  },
});

// ─── Create User ──────────────────────────────────────────────────────────────

export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("accountant"),
      v.literal("cashier"),
      v.literal("sales"),
      v.literal("warehouse"),
      v.literal("viewer")
    ),
    branchIds: v.array(v.id("branches")),
    createdBy: v.id("users"),
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    // Permission check — only users with 'create' on 'users' module
    await assertUserPermission(ctx, args.createdBy, "users", "create");

    // Email uniqueness check
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    if (existing) {
      throw new Error("Email already registered");
    }

    // Password length validation
    if (!args.password || args.password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // Hash password
    const { hash } = await hashPassword(args.password);

    // Insert user
    const newUserId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      passwordHash: hash,
      role: args.role,
      branchIds: args.branchIds,
      isActive: true,
      createdAt: Date.now(),
    });

    // Audit log
    await logAudit(ctx, {
      companyId: args.companyId,
      userId: args.createdBy,
      action: "create",
      module: "users",
      documentType: "user",
      documentId: newUserId,
    });

    return newUserId;
  },
});

// ─── Update User ──────────────────────────────────────────────────────────────

export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("admin"),
        v.literal("manager"),
        v.literal("accountant"),
        v.literal("cashier"),
        v.literal("sales"),
        v.literal("warehouse"),
        v.literal("viewer")
      )
    ),
    branchIds: v.optional(v.array(v.id("branches"))),
    isActive: v.optional(v.boolean()),
    updatedBy: v.id("users"),
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    // Permission check
    await assertUserPermission(ctx, args.updatedBy, "users", "edit");

    // Prevent admin from changing their own role or deactivating themselves
    if (args.userId === args.updatedBy) {
      if (args.role !== undefined) {
        throw new Error("cannotEditOwnRole");
      }
      if (args.isActive === false) {
        throw new Error("Cannot deactivate your own account");
      }
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.role !== undefined) updates.role = args.role;
    if (args.branchIds !== undefined) updates.branchIds = args.branchIds;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.userId, updates);

    await logAudit(ctx, {
      companyId: args.companyId,
      userId: args.updatedBy,
      action: "edit",
      module: "users",
      documentType: "user",
      documentId: args.userId,
    });

    return args.userId;
  },
});

// ─── Reset Password ───────────────────────────────────────────────────────────

export const resetPassword = mutation({
  args: {
    userId: v.id("users"),
    newPassword: v.string(),
    resetBy: v.id("users"),
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    // Only admin can reset passwords — checked via assertUserPermission on 'users' 'edit'
    await assertUserPermission(ctx, args.resetBy, "users", "edit");

    if (!args.newPassword || args.newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    const { hash } = await hashPassword(args.newPassword);
    await ctx.db.patch(args.userId, { passwordHash: hash });

    await logAudit(ctx, {
      companyId: args.companyId,
      userId: args.resetBy,
      action: "edit",
      module: "users",
      documentType: "user",
      documentId: args.userId,
      details: JSON.stringify({ action: "password_reset" }),
    });

    return { success: true };
  },
});

// ─── Soft Delete (Deactivate) User ────────────────────────────────────────────

export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
    deletedBy: v.id("users"),
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    await assertUserPermission(ctx, args.deletedBy, "users", "delete");

    // Cannot deactivate yourself
    if (args.userId === args.deletedBy) {
      throw new Error("Cannot deactivate your own account");
    }

    await ctx.db.patch(args.userId, { isActive: false });

    await logAudit(ctx, {
      companyId: args.companyId,
      userId: args.deletedBy,
      action: "delete",
      module: "users",
      documentType: "user",
      documentId: args.userId,
    });

    return { success: true };
  },
});
