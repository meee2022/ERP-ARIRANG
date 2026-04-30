/**
 * RBAC — Role-Based Access Control
 *
 * Defines role→permission mappings and provides helpers:
 *  - ROLE_PERMISSIONS: the permission map
 *  - hasPermission(role, module, permission): pure check
 *  - assertPermission(ctx, token, module, permission): throws if denied (use in mutations)
 *  - assertBranchAccess(user, branchId): throws if user lacks branch access
 *
 * NOTE: "viewer" is not yet in the DB schema — it is reserved for future use.
 *       Admin role bypasses all checks.
 */

import { MutationCtx, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Permission = "create" | "edit" | "delete" | "post" | "view";

export type Module =
  | "sales"
  | "purchases"
  | "treasury"
  | "inventory"
  | "finance"
  | "reports"
  | "settings"
  | "users"
  | "hr"
  | "production";

export type AppRole =
  | "admin"
  | "manager"
  | "accountant"
  | "cashier"
  | "sales"
  | "warehouse"
  | "viewer";

// ─── Permission Map ───────────────────────────────────────────────────────────

const ALL_PERMISSIONS: Permission[] = ["create", "edit", "delete", "post", "view"];
const ALL_MODULES: Module[] = ["sales", "purchases", "treasury", "inventory", "finance", "reports", "settings", "users", "hr", "production"];

type PermissionMap = Partial<Record<Module, Permission[]>>;

export const ROLE_PERMISSIONS: Record<AppRole, PermissionMap> = {
  admin: Object.fromEntries(ALL_MODULES.map((m) => [m, ALL_PERMISSIONS])) as PermissionMap,

  manager: {
    sales: ALL_PERMISSIONS,
    purchases: ALL_PERMISSIONS,
    treasury: ALL_PERMISSIONS,
    inventory: ALL_PERMISSIONS,
    finance: ["view", "create", "post"],
    reports: ALL_PERMISSIONS,
    settings: ["view"],
    users: ["view", "create", "edit"],
    hr: ALL_PERMISSIONS,
    production: ALL_PERMISSIONS,
  },

  accountant: {
    finance: ALL_PERMISSIONS,
    treasury: ALL_PERMISSIONS,
    reports: ALL_PERMISSIONS,
    purchases: ALL_PERMISSIONS,
    sales: ["view", "edit", "post"],
    inventory: ["view"],
    settings: ["view"],
    users: [],
    hr: ["view"],
    production: ["view"],
  },

  cashier: {
    treasury: ["view", "create", "post"],
    sales: ["view", "create"],
    reports: ["view"],
    inventory: ["view"],
    settings: [],
    users: [],
    finance: [],
    purchases: [],
    hr: [],
    production: ["view"],
  },

  sales: {
    sales: ["view", "create", "edit", "delete"],
    reports: [],
    inventory: ["view"],
    purchases: [],
    treasury: [],
    finance: [],
    settings: [],
    users: [],
    hr: [],
    production: ["view"],
  },

  warehouse: {
    inventory: ALL_PERMISSIONS,
    purchases: ["view", "create", "edit"],
    reports: [],
    sales: ["view"],
    treasury: [],
    finance: [],
    settings: [],
    users: [],
    hr: [],
    production: ALL_PERMISSIONS,
  },

  viewer: {
    sales: ["view"],
    purchases: ["view"],
    treasury: ["view"],
    inventory: ["view"],
    finance: ["view"],
    reports: ["view"],
    settings: ["view"],
    users: ["view"],
    hr: ["view"],
  },
};

// ─── Pure Permission Check ────────────────────────────────────────────────────

export function hasPermission(
  role: AppRole,
  module: Module,
  permission: Permission
): boolean {
  if (role === "admin") return true;
  const perms = ROLE_PERMISSIONS[role]?.[module];
  if (!perms) return false;
  return perms.includes(permission);
}

// ─── Backend Assertion Helpers ────────────────────────────────────────────────

/**
 * Resolve the session token to a user record.
 * Returns the user or throws if session is invalid.
 */
async function resolveUser(ctx: QueryCtx | MutationCtx, token: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();

  if (!session || !session.isActive || session.expiresAt < Date.now()) {
    throw new Error("Session expired or invalid");
  }

  const user = await ctx.db.get(session.userId);
  if (!user || !user.isActive) {
    throw new Error("User not found or inactive");
  }

  return user;
}

/**
 * Assert that the user identified by `token` has the given permission on a module.
 * Throws "Permission denied" if not.
 */
export async function assertPermission(
  ctx: QueryCtx | MutationCtx,
  token: string,
  module: Module,
  permission: Permission
): Promise<void> {
  const user = await resolveUser(ctx, token);
  const role = user.role as AppRole;
  if (!hasPermission(role, module, permission)) {
    throw new Error(
      `Permission denied: role '${role}' cannot '${permission}' in module '${module}'`
    );
  }
}

/**
 * Assert that the user has access to a given branch.
 * Admin bypasses this check.
 * Throws "Branch access denied" if not.
 */
export function assertBranchAccess(
  user: { role: string; branchIds: Id<"branches">[] },
  branchId: Id<"branches">
): void {
  if (user.role === "admin") return; // admin has access to all branches
  if (!user.branchIds.includes(branchId)) {
    throw new Error("Branch access denied");
  }
}

// ─── User-ID-Based Helpers (for mutations that receive userId/createdBy) ───────

/**
 * Assert that the user with the given ID has permission on a module.
 * Reads the user record directly (no session token required).
 * Throws if the user is not found, inactive, or lacks permission.
 * Returns the user record for further checks (e.g., branch access).
 */
export async function assertUserPermission(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  module: Module,
  permission: Permission
) {
  const user = await ctx.db.get(userId);
  if (!user || !user.isActive) {
    throw new Error("Authentication required");
  }
  const role = user.role as AppRole;
  if (!hasPermission(role, module, permission)) {
    throw new Error(
      `Permission denied: role '${role}' cannot '${permission}' in module '${module}'`
    );
  }
  return user;
}

/**
 * Assert that the user has access to a specific branch.
 * Admin role bypasses this check.
 */
export function assertUserBranch(
  user: { role: string; branchIds: Id<"branches">[] },
  branchId: Id<"branches">
): void {
  if (user.role === "admin") return;
  if (!user.branchIds.includes(branchId)) {
    throw new Error("Branch access denied");
  }
}

/**
 * Assert permission AND branch access in one call.
 */
export async function assertPermissionAndBranch(
  ctx: QueryCtx | MutationCtx,
  token: string,
  module: Module,
  permission: Permission,
  branchId: Id<"branches">
): Promise<void> {
  const user = await resolveUser(ctx, token);
  const role = user.role as AppRole;
  if (!hasPermission(role, module, permission)) {
    throw new Error(
      `Permission denied: role '${role}' cannot '${permission}' in module '${module}'`
    );
  }
  assertBranchAccess(user, branchId);
}
