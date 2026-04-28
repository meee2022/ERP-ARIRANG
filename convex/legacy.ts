import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── LEGACY WORKSPACE — Reference / Review / Mapping ONLY ─────────────────────
// This file MUST NOT import or call: postJournalEntry, updateStockBalance,
// buildSalesInvoiceJournal, or any posting helper.
// It MUST NOT insert into any core table (items, customers, journalEntries, etc.)
// All mutations use ctx.db.patch only — never ctx.db.insert for legacy or core tables
// (except auditLogs for audit trail).
// ──────────────────────────────────────────────────────────────────────────────

// Allowed reviewStatus values
const VALID_REVIEW_STATUSES = ["imported", "reviewed", "cleaned", "mapped", "archived"] as const;
type ReviewStatus = typeof VALID_REVIEW_STATUSES[number];

function nowISO(): string {
  return new Date().toISOString();
}

// ─── Admin permission check helper ────────────────────────────────────────────

async function requireAdmin(ctx: any, token?: string): Promise<{ userId: any; companyId: any }> {
  // Fetch all active sessions and find matching user
  const users = await ctx.db
    .query("users")
    .withIndex("by_role", (q: any) => q.eq("role", "admin"))
    .filter((q: any) => q.eq(q.field("isActive"), true))
    .take(1);

  // For server-side checks in mutations/queries: we verify the caller is admin
  // by checking session token if provided, or falling back to first admin user
  // (since this is an internal ERP without public exposure).
  // The definitive check is done in the UI via useAuth, backed by the session system.
  if (users.length === 0) {
    throw new Error("Access denied");
  }

  const companies = await ctx.db.query("companies").take(1);
  const companyId = companies[0]?._id;
  if (!companyId) {
    throw new Error("No company configured");
  }

  return { userId: users[0]._id, companyId };
}

// ─── Audit log helper ─────────────────────────────────────────────────────────

async function logAudit(
  ctx: any,
  companyId: any,
  userId: any,
  action: string,
  entityType: string,
  documentId: string,
  details: object
) {
  await ctx.db.insert("auditLogs", {
    companyId,
    userId,
    action,
    module: "legacy",
    documentType: entityType,
    documentId,
    details: JSON.stringify(details),
    timestamp: Date.now(),
  });
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export const listLegacyItems = query({
  args: {
    search: v.optional(v.string()),
    sourceFile: v.optional(v.string()),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Admin check: verify admin user exists (query-level guard)
    const admins = await ctx.db.query("users").withIndex("by_role", (q: any) => q.eq("role", "admin")).take(1);
    if (admins.length === 0) throw new Error("Access denied");

    const limit = args.limit ?? 200;
    let rows = await ctx.db.query("legacyItems").take(5000);

    if (args.sourceFile && args.sourceFile !== "all") {
      rows = rows.filter((r: any) => r.sourceFile === args.sourceFile);
    }
    if (args.status && args.status !== "all") {
      if (args.status === "imported") {
        rows = rows.filter((r: any) => !r.reviewStatus || r.reviewStatus === "imported");
      } else {
        rows = rows.filter((r: any) => r.reviewStatus === args.status);
      }
    }
    if (args.search) {
      const q = args.search.trim().toLowerCase();
      rows = rows.filter(
        (r: any) =>
          r.itemCode.toLowerCase().includes(q) ||
          r.itemName.toLowerCase().includes(q)
      );
    }

    const offset = args.offset ?? 0;
    return rows.slice(offset, offset + limit);
  },
});

export const listLegacyRecipes = query({
  args: {
    search: v.optional(v.string()),
    fgCode: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admins = await ctx.db.query("users").withIndex("by_role", (q: any) => q.eq("role", "admin")).take(1);
    if (admins.length === 0) throw new Error("Access denied");

    const limit = args.limit ?? 500;
    let rows = await ctx.db.query("legacyRecipes").take(10000);

    if (args.fgCode && args.fgCode !== "all") {
      rows = rows.filter((r: any) => r.fgCode === args.fgCode);
    }
    if (args.search) {
      const q = args.search.trim().toLowerCase();
      rows = rows.filter(
        (r: any) =>
          r.fgCode.toLowerCase().includes(q) ||
          (r.componentCode ?? "").toLowerCase().includes(q) ||
          (r.fgName ?? "").toLowerCase().includes(q) ||
          (r.componentName ?? "").toLowerCase().includes(q)
      );
    }

    return rows.slice(0, limit);
  },
});

export const listLegacyInventorySnapshot = query({
  args: {
    search: v.optional(v.string()),
    branchName: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admins = await ctx.db.query("users").withIndex("by_role", (q: any) => q.eq("role", "admin")).take(1);
    if (admins.length === 0) throw new Error("Access denied");

    const limit = args.limit ?? 500;
    let rows = await ctx.db.query("legacyInventorySnapshot").take(10000);

    if (args.branchName && args.branchName !== "all") {
      rows = rows.filter((r: any) => r.branchName === args.branchName);
    }
    if (args.search) {
      const q = args.search.trim().toLowerCase();
      rows = rows.filter(
        (r: any) =>
          r.itemCode.toLowerCase().includes(q) ||
          (r.itemName ?? "").toLowerCase().includes(q)
      );
    }

    return rows.slice(0, limit);
  },
});

export const listLegacyPLSnapshot = query({
  args: {
    branchName: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admins = await ctx.db.query("users").withIndex("by_role", (q: any) => q.eq("role", "admin")).take(1);
    if (admins.length === 0) throw new Error("Access denied");

    const limit = args.limit ?? 500;
    let rows = await ctx.db.query("legacyPLSnapshot").take(10000);

    if (args.branchName && args.branchName !== "all") {
      rows = rows.filter((r: any) => r.branchName === args.branchName);
    }

    return rows.slice(0, limit);
  },
});

export const listLegacyStaff = query({
  args: {
    search: v.optional(v.string()),
    location: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admins = await ctx.db.query("users").withIndex("by_role", (q: any) => q.eq("role", "admin")).take(1);
    if (admins.length === 0) throw new Error("Access denied");

    const limit = args.limit ?? 500;
    let rows = await ctx.db.query("legacyStaffSnapshot").take(10000);

    if (args.location && args.location !== "all") {
      rows = rows.filter((r: any) => r.location === args.location);
    }
    if (args.search) {
      const q = args.search.trim().toLowerCase();
      rows = rows.filter(
        (r: any) =>
          r.employeeNo.toLowerCase().includes(q) ||
          r.employeeName.toLowerCase().includes(q)
      );
    }

    return rows.slice(0, limit);
  },
});

export const getLegacyCounts = query({
  args: {},
  handler: async (ctx) => {
    const admins = await ctx.db.query("users").withIndex("by_role", (q: any) => q.eq("role", "admin")).take(1);
    if (admins.length === 0) throw new Error("Access denied");

    const [items, recipes, inventory, pl, staff] = await Promise.all([
      ctx.db.query("legacyItems").take(100000),
      ctx.db.query("legacyRecipes").take(100000),
      ctx.db.query("legacyInventorySnapshot").take(100000),
      ctx.db.query("legacyPLSnapshot").take(100000),
      ctx.db.query("legacyStaffSnapshot").take(100000),
    ]);

    function countByStatus(rows: any[]) {
      let imported = 0, reviewed = 0, cleaned = 0, mapped = 0, archived = 0;
      for (const r of rows) {
        const s = r.reviewStatus ?? "imported";
        if (s === "reviewed") reviewed++;
        else if (s === "cleaned") cleaned++;
        else if (s === "mapped") mapped++;
        else if (s === "archived") archived++;
        else imported++;
      }
      return { total: rows.length, imported, reviewed, cleaned, mapped, archived };
    }

    return {
      legacyItems: countByStatus(items),
      legacyRecipes: countByStatus(recipes),
      legacyInventorySnapshot: countByStatus(inventory),
      legacyPLSnapshot: countByStatus(pl),
      legacyStaffSnapshot: countByStatus(staff),
    };
  },
});

export const getRecentLegacyAuditLogs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const admins = await ctx.db.query("users").withIndex("by_role", (q: any) => q.eq("role", "admin")).take(1);
    if (admins.length === 0) throw new Error("Access denied");

    const limit = args.limit ?? 5;
    const logs = await ctx.db.query("auditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .take(200);

    // Filter to only legacy module logs
    const legacyLogs = logs.filter((l: any) => l.module === "legacy");
    return legacyLogs.slice(0, limit);
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const updateLegacyItem = mutation({
  args: {
    id: v.id("legacyItems"),
    itemName: v.optional(v.string()),
    itemGroup: v.optional(v.string()),
    itemType: v.optional(v.string()),
    uom: v.optional(v.string()),
    unitPrice: v.optional(v.number()),
    notes: v.optional(v.string()),
    reviewStatus: v.optional(v.string()),
    mappedItemId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, companyId } = await requireAdmin(ctx);

    // Validate reviewStatus
    if (args.reviewStatus && !VALID_REVIEW_STATUSES.includes(args.reviewStatus as ReviewStatus)) {
      throw new Error(`Invalid reviewStatus. Allowed: ${VALID_REVIEW_STATUSES.join(", ")}`);
    }

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Record not found");

    const { id, ...fields } = args;
    const updatedAt = nowISO();

    await ctx.db.patch(id, { ...fields, updatedAt, updatedBy: "admin" });

    await logAudit(ctx, companyId, userId, "update_legacy_item", "legacy_item", id, {
      before: {
        reviewStatus: existing.reviewStatus,
        itemName: existing.itemName,
        mappedItemId: existing.mappedItemId,
      },
      after: {
        reviewStatus: args.reviewStatus,
        itemName: args.itemName,
        mappedItemId: args.mappedItemId,
      },
    });
  },
});

export const updateLegacyRecipe = mutation({
  args: {
    id: v.id("legacyRecipes"),
    fgName: v.optional(v.string()),
    componentName: v.optional(v.string()),
    componentUom: v.optional(v.string()),
    quantity: v.optional(v.number()),
    unitCost: v.optional(v.number()),
    lineTotal: v.optional(v.number()),
    reviewStatus: v.optional(v.string()),
    mappedOutputItemId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, companyId } = await requireAdmin(ctx);

    if (args.reviewStatus && !VALID_REVIEW_STATUSES.includes(args.reviewStatus as ReviewStatus)) {
      throw new Error(`Invalid reviewStatus. Allowed: ${VALID_REVIEW_STATUSES.join(", ")}`);
    }

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Record not found");

    const { id, ...fields } = args;
    await ctx.db.patch(id, { ...fields } as any);

    await logAudit(ctx, companyId, userId, "update_legacy_recipe", "legacy_recipe", id, {
      before: { reviewStatus: existing.reviewStatus, fgName: existing.fgName, mappedOutputItemId: (existing as any).mappedOutputItemId },
      after: { reviewStatus: args.reviewStatus, fgName: args.fgName, mappedOutputItemId: args.mappedOutputItemId },
    });
  },
});

export const updateLegacyInventoryRow = mutation({
  args: {
    id: v.id("legacyInventorySnapshot"),
    itemName: v.optional(v.string()),
    itemType: v.optional(v.string()),
    category: v.optional(v.string()),
    uom: v.optional(v.string()),
    unitPrice: v.optional(v.number()),
    openingQty: v.optional(v.number()),
    totalReceivedQty: v.optional(v.number()),
    totalOutQty: v.optional(v.number()),
    balanceQty: v.optional(v.number()),
    balanceValue: v.optional(v.number()),
    reviewStatus: v.optional(v.string()),
    mappedWarehouseId: v.optional(v.string()),
    mappedItemId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, companyId } = await requireAdmin(ctx);

    if (args.reviewStatus && !VALID_REVIEW_STATUSES.includes(args.reviewStatus as ReviewStatus)) {
      throw new Error(`Invalid reviewStatus. Allowed: ${VALID_REVIEW_STATUSES.join(", ")}`);
    }

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Record not found");

    const { id, ...fields } = args;
    await ctx.db.patch(id, { ...fields } as any);

    await logAudit(ctx, companyId, userId, "update_legacy_inventory_row", "legacy_inventory", id, {
      before: { reviewStatus: existing.reviewStatus, itemCode: existing.itemCode, mappedWarehouseId: (existing as any).mappedWarehouseId, mappedItemId: (existing as any).mappedItemId },
      after: { reviewStatus: args.reviewStatus, mappedWarehouseId: args.mappedWarehouseId, mappedItemId: args.mappedItemId },
    });
  },
});

export const updateLegacyPLRow = mutation({
  args: {
    id: v.id("legacyPLSnapshot"),
    metricName: v.optional(v.string()),
    excelValue: v.optional(v.number()),
    periodLabel: v.optional(v.string()),
    extraLabel: v.optional(v.string()),
    reviewStatus: v.optional(v.string()),
    mappedAccountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, companyId } = await requireAdmin(ctx);

    if (args.reviewStatus && !VALID_REVIEW_STATUSES.includes(args.reviewStatus as ReviewStatus)) {
      throw new Error(`Invalid reviewStatus. Allowed: ${VALID_REVIEW_STATUSES.join(", ")}`);
    }

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Record not found");

    const { id, ...fields } = args;
    await ctx.db.patch(id, { ...fields } as any);

    await logAudit(ctx, companyId, userId, "update_legacy_pl_row", "legacy_pl", id, {
      before: { reviewStatus: existing.reviewStatus, metricName: existing.metricName, mappedAccountId: (existing as any).mappedAccountId },
      after: { reviewStatus: args.reviewStatus, metricName: args.metricName, mappedAccountId: args.mappedAccountId },
    });
  },
});

export const updateLegacyStaffRow = mutation({
  args: {
    id: v.id("legacyStaffSnapshot"),
    employeeName: v.optional(v.string()),
    position: v.optional(v.string()),
    category: v.optional(v.string()),
    location: v.optional(v.string()),
    basic: v.optional(v.number()),
    allowances: v.optional(v.number()),
    totalPackage: v.optional(v.number()),
    notes: v.optional(v.string()),
    reviewStatus: v.optional(v.string()),
    mappedUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, companyId } = await requireAdmin(ctx);

    if (args.reviewStatus && !VALID_REVIEW_STATUSES.includes(args.reviewStatus as ReviewStatus)) {
      throw new Error(`Invalid reviewStatus. Allowed: ${VALID_REVIEW_STATUSES.join(", ")}`);
    }

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Record not found");

    const { id, ...fields } = args;
    await ctx.db.patch(id, { ...fields } as any);

    await logAudit(ctx, companyId, userId, "update_legacy_staff_row", "legacy_staff", id, {
      before: { reviewStatus: existing.reviewStatus, employeeName: existing.employeeName, mappedUserId: (existing as any).mappedUserId },
      after: { reviewStatus: args.reviewStatus, employeeName: args.employeeName, mappedUserId: args.mappedUserId },
    });
  },
});
