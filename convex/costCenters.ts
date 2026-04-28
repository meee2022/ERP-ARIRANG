import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { assertUserPermission } from "./lib/permissions";

// ─── getCostCenters ───────────────────────────────────────────────────────────
export const getCostCenters = query({
  args: {
    userId: v.optional(v.id("users")),
    companyId: v.id("companies"),
    activeOnly: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { userId, companyId, activeOnly, search }) => {
    if (userId) {
      await assertUserPermission(ctx, userId, "settings", "view");
    }
    let rows = await ctx.db
      .query("costCenters")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .collect();

    if (activeOnly) {
      rows = rows.filter((r) => r.isActive);
    }

    if (search && search.trim().length > 0) {
      const s = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.code.toLowerCase().includes(s) ||
          r.nameAr.toLowerCase().includes(s) ||
          (r.nameEn ?? "").toLowerCase().includes(s)
      );
    }

    return rows.sort((a, b) => a.code.localeCompare(b.code));
  },
});

// ─── createCostCenter ─────────────────────────────────────────────────────────
export const createCostCenter = mutation({
  args: {
    userId: v.id("users"),
    companyId: v.id("companies"),
    code: v.string(),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    parentId: v.optional(v.id("costCenters")),
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    await assertUserPermission(ctx, args.userId, "settings", "create");
    // Check unique code per company
    const existing = await ctx.db
      .query("costCenters")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    if (existing.some((r) => r.code === args.code)) {
      throw new Error("DUPLICATE_CODE");
    }

    const now = Date.now();
    return ctx.db.insert("costCenters", {
      companyId: args.companyId,
      branchId: args.branchId,
      code: args.code,
      nameAr: args.nameAr,
      nameEn: args.nameEn,
      parentId: args.parentId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ─── updateCostCenter ─────────────────────────────────────────────────────────
export const updateCostCenter = mutation({
  args: {
    userId: v.id("users"),
    id: v.id("costCenters"),
    code: v.optional(v.string()),
    nameAr: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, userId, ...updates }) => {
    await assertUserPermission(ctx, userId, "settings", "edit");
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("NOT_FOUND");

    // If code is changing, check uniqueness
    if (updates.code && updates.code !== existing.code) {
      const siblings = await ctx.db
        .query("costCenters")
        .withIndex("by_company", (q) => q.eq("companyId", existing.companyId))
        .collect();
      if (siblings.some((r) => r._id !== id && r.code === updates.code)) {
        throw new Error("DUPLICATE_CODE");
      }
    }

    const patch: Record<string, any> = { updatedAt: Date.now() };
    if (updates.code !== undefined) patch.code = updates.code;
    if (updates.nameAr !== undefined) patch.nameAr = updates.nameAr;
    if (updates.nameEn !== undefined) patch.nameEn = updates.nameEn;
    if (updates.isActive !== undefined) patch.isActive = updates.isActive;

    await ctx.db.patch(id, patch);
  },
});

// ─── archiveCostCenter ────────────────────────────────────────────────────────
export const archiveCostCenter = mutation({
  args: { id: v.id("costCenters"), userId: v.id("users") },
  handler: async (ctx, { id, userId }) => {
    await assertUserPermission(ctx, userId, "settings", "edit");
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("NOT_FOUND");
    await ctx.db.patch(id, { isActive: false, updatedAt: Date.now() });
  },
});

// ─── getCostCenterMovement ────────────────────────────────────────────────────
// Returns all journal lines that have a costCenterId, enriched with entry header data.
export const getCostCenterMovement = query({
  args: {
    userId: v.optional(v.id("users")),
    companyId: v.id("companies"),
    fromDate: v.string(),
    toDate: v.string(),
    costCenterId: v.optional(v.id("costCenters")),
    accountId: v.optional(v.id("accounts")),
  },
  handler: async (ctx, { userId, companyId, fromDate, toDate, costCenterId, accountId }) => {
    if (userId) {
      await assertUserPermission(ctx, userId, "reports", "view");
    }
    // 1. Get posted journal entries in date range
    const entries = await ctx.db
      .query("journalEntries")
      .withIndex("by_branch_date")
      .collect();

    const filtered = entries.filter(
      (e) =>
        e.companyId === companyId &&
        e.postingStatus === "posted" &&
        e.entryDate >= fromDate &&
        e.entryDate <= toDate
    );

    const entryMap = new Map(filtered.map((e) => [e._id, e]));

    // 2. Get all lines for these entries
    const lines: any[] = [];
    for (const entry of filtered) {
      const entryLines = await ctx.db
        .query("journalLines")
        .withIndex("by_entry", (q) => q.eq("entryId", entry._id))
        .collect();
      for (const line of entryLines) {
        if (!line.costCenterId) continue; // only lines with cost center
        if (costCenterId && line.costCenterId !== costCenterId) continue;
        if (accountId && line.accountId !== accountId) continue;
        lines.push({
          date: entry.entryDate,
          entryNumber: entry.entryNumber,
          description: line.description || entry.description,
          accountId: line.accountId,
          costCenterId: line.costCenterId,
          debit: line.debit,
          credit: line.credit,
        });
      }
    }

    // Also include header-level costCenterId (entries where costCenterId is set but lines don't have it)
    for (const entry of filtered) {
      if (!entry.costCenterId) continue;
      if (costCenterId && entry.costCenterId !== costCenterId) continue;
      const entryLines = await ctx.db
        .query("journalLines")
        .withIndex("by_entry", (q) => q.eq("entryId", entry._id))
        .collect();
      for (const line of entryLines) {
        if (line.costCenterId) continue; // already included above
        if (accountId && line.accountId !== accountId) continue;
        lines.push({
          date: entry.entryDate,
          entryNumber: entry.entryNumber,
          description: line.description || entry.description,
          accountId: line.accountId,
          costCenterId: entry.costCenterId,
          debit: line.debit,
          credit: line.credit,
        });
      }
    }

    return lines.sort((a, b) => a.date.localeCompare(b.date));
  },
});

// ─── getCostCenterPL ──────────────────────────────────────────────────────────
// For each cost center, sum revenue and expense accounts to produce P&L.
export const getCostCenterPL = query({
  args: {
    userId: v.optional(v.id("users")),
    companyId: v.id("companies"),
    fromDate: v.string(),
    toDate: v.string(),
  },
  handler: async (ctx, { userId, companyId, fromDate, toDate }) => {
    if (userId) {
      await assertUserPermission(ctx, userId, "reports", "view");
    }
    // 1. Get all accounts to know which are revenue/expense
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .collect();
    const accountMap = new Map(accounts.map((a) => [a._id, a]));

    // 2. Get all cost centers
    const costCenters = await ctx.db
      .query("costCenters")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .collect();

    // 3. Get posted journal entries in range
    const entries = await ctx.db
      .query("journalEntries")
      .withIndex("by_branch_date")
      .collect();

    const filtered = entries.filter(
      (e) =>
        e.companyId === companyId &&
        e.postingStatus === "posted" &&
        e.entryDate >= fromDate &&
        e.entryDate <= toDate
    );

    // 4. Aggregate by cost center
    const ccTotals: Record<string, { revenue: number; expenses: number }> = {};

    for (const entry of filtered) {
      const entryLines = await ctx.db
        .query("journalLines")
        .withIndex("by_entry", (q) => q.eq("entryId", entry._id))
        .collect();

      for (const line of entryLines) {
        const ccId = line.costCenterId || entry.costCenterId;
        if (!ccId) continue;

        const account = accountMap.get(line.accountId);
        if (!account) continue;

        if (!ccTotals[ccId]) ccTotals[ccId] = { revenue: 0, expenses: 0 };

        if (account.accountType === "revenue") {
          // Revenue: credit - debit (net credit is revenue)
          ccTotals[ccId].revenue += line.credit - line.debit;
        } else if (account.accountType === "expense") {
          // Expense: debit - credit (net debit is expense)
          ccTotals[ccId].expenses += line.debit - line.credit;
        }
      }
    }

    return costCenters
      .filter((cc) => ccTotals[cc._id])
      .map((cc) => ({
        costCenterId: cc._id,
        code: cc.code,
        nameAr: cc.nameAr,
        nameEn: cc.nameEn,
        revenue: ccTotals[cc._id]?.revenue ?? 0,
        expenses: ccTotals[cc._id]?.expenses ?? 0,
        netResult: (ccTotals[cc._id]?.revenue ?? 0) - (ccTotals[cc._id]?.expenses ?? 0),
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
  },
});
