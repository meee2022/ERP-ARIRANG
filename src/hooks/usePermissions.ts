"use client";

import { useAuth } from "./useAuth";

// Mirror the types from convex/lib/permissions.ts (no import — avoids bundling Convex server code)
export type Permission = "create" | "edit" | "delete" | "post" | "view";
export type Module =
  | "sales"
  | "purchases"
  | "treasury"
  | "inventory"
  | "finance"
  | "reports"
  | "settings"
  | "users";

export type AppRole =
  | "admin"
  | "manager"
  | "accountant"
  | "cashier"
  | "sales"
  | "warehouse"
  | "viewer";

const ALL_PERMISSIONS: Permission[] = ["create", "edit", "delete", "post", "view"];
const ALL_MODULES: Module[] = ["sales", "purchases", "treasury", "inventory", "finance", "reports", "settings", "users"];

type PermissionMap = Partial<Record<Module, Permission[]>>;

const ROLE_PERMISSIONS: Record<AppRole, PermissionMap> = {
  admin: Object.fromEntries(ALL_MODULES.map((m) => [m, ALL_PERMISSIONS])) as PermissionMap,

  manager: {
    sales: ALL_PERMISSIONS,
    purchases: ALL_PERMISSIONS,
    treasury: ALL_PERMISSIONS,
    inventory: ALL_PERMISSIONS,
    finance: ["view", "create", "post"],
    reports: ALL_PERMISSIONS,
    settings: ["view"],
    users: ["view"],
  },

  accountant: {
    finance: ALL_PERMISSIONS,
    treasury: ALL_PERMISSIONS,
    reports: ALL_PERMISSIONS,
    purchases: ["view", "create", "post"],
    sales: ["view"],
    inventory: ["view"],
    settings: ["view"],
    users: [],
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
  },

  sales: {
    sales: ALL_PERMISSIONS,
    reports: ["view"],
    inventory: ["view"],
    purchases: [],
    treasury: [],
    finance: [],
    settings: [],
    users: [],
  },

  warehouse: {
    inventory: ALL_PERMISSIONS,
    purchases: ["view", "create"],
    reports: ["view"],
    sales: [],
    treasury: [],
    finance: [],
    settings: [],
    users: [],
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
  },
};

function checkPermission(role: AppRole, module: Module, permission: Permission): boolean {
  if (role === "admin") return true;
  const perms = ROLE_PERMISSIONS[role]?.[module];
  if (!perms) return false;
  return perms.includes(permission);
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function usePermissions() {
  const { currentUser } = useAuth();
  const role = (currentUser?.role ?? "viewer") as AppRole;

  return {
    role,
    hasRole: (r: AppRole) => role === r,
    canView:   (module: Module) => checkPermission(role, module, "view"),
    canCreate: (module: Module) => checkPermission(role, module, "create"),
    canEdit:   (module: Module) => checkPermission(role, module, "edit"),
    canDelete: (module: Module) => checkPermission(role, module, "delete"),
    canPost:   (module: Module) => checkPermission(role, module, "post"),
    isAdmin:   role === "admin",
  };
}
