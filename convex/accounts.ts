import { query, mutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { assertUserPermission } from "./lib/permissions";

type JournalLineDoc = Doc<"journalLines">;
type JournalEntryDoc = Doc<"journalEntries">;
type BankAccountDoc = Doc<"bankAccounts">;
type CashBoxDoc = Doc<"cashBoxes">;
type FixedAssetDoc = Doc<"fixedAssets">;

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

    const { createdBy: _createdBy, ...rest } = args;
    void _createdBy;
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
  args: { id: v.id("accounts"), userId: v.id("users") },
  handler: async (ctx, args) => {
    await assertUserPermission(ctx, args.userId, "finance", "edit");
    const acc = await ctx.db.get(args.id);
    if (!acc) throw new Error("NOT_FOUND");
    await ctx.db.patch(args.id, { isActive: !acc.isActive });
  },
});

export const getAccountDetails = query({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account) return null;

    const children = await ctx.db
      .query("accounts")
      .withIndex("by_parent", (q) => q.eq("parentId", args.accountId))
      .collect();

    const lines = await ctx.db
      .query("journalLines")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .collect();

    const postedPairs = (
      await Promise.all(
        lines.map(async (line) => {
          const entry = await ctx.db.get(line.entryId);
          if (!entry || entry.postingStatus !== "posted") return null;
          return { line, entry };
        })
      )
    ).filter(
      (item): item is { line: JournalLineDoc; entry: JournalEntryDoc } => item !== null
    );

    postedPairs.sort((a, b) => {
      const dateCompare = b.entry.entryDate.localeCompare(a.entry.entryDate);
      if (dateCompare !== 0) return dateCompare;
      return b.entry._creationTime - a.entry._creationTime;
    });

    const totalDebit = postedPairs.reduce((sum, item) => sum + item.line.debit, 0);
    const totalCredit = postedPairs.reduce((sum, item) => sum + item.line.credit, 0);
    const balance = totalDebit - totalCredit;

    return {
      account,
      childrenCount: children.length,
      totalDebit,
      totalCredit,
      balance,
      transactionCount: postedPairs.length,
      lastEntries: postedPairs.slice(0, 20).map(({ line, entry }) => ({
        entryId: entry._id,
        entryNumber: entry.entryNumber,
        entryDate: entry.entryDate,
        journalType: entry.journalType,
        description: line.description ?? entry.description,
        debit: line.debit,
        credit: line.credit,
        sourceType: entry.sourceType,
      })),
    };
  },
});

export const deleteAccount = mutation({
  args: {
    id: v.id("accounts"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await assertUserPermission(ctx, args.userId, "finance", "delete");

    const account = await ctx.db.get(args.id);
    if (!account) throw new Error("NOT_FOUND");

    const child = await ctx.db
      .query("accounts")
      .withIndex("by_parent", (q) => q.eq("parentId", args.id))
      .first();
    if (child) throw new Error("ACCOUNT_HAS_CHILDREN");

    const journalLine = await ctx.db
      .query("journalLines")
      .withIndex("by_account", (q) => q.eq("accountId", args.id))
      .first();
    if (journalLine) throw new Error("ACCOUNT_HAS_TRANSACTIONS");

    const allCustomers = await ctx.db
      .query("customers")
      .withIndex("by_company", (q) => q.eq("companyId", account.companyId))
      .collect();
    if (allCustomers.some((item) => item.accountId === args.id)) {
      throw new Error("ACCOUNT_IN_USE_BY_CUSTOMER");
    }

    const allSuppliers = await ctx.db
      .query("suppliers")
      .withIndex("by_company", (q) => q.eq("companyId", account.companyId))
      .collect();
    if (allSuppliers.some((item) => item.accountId === args.id)) {
      throw new Error("ACCOUNT_IN_USE_BY_SUPPLIER");
    }

    const allItems = await ctx.db
      .query("items")
      .withIndex("by_company", (q) => q.eq("companyId", account.companyId))
      .collect();
    if (
      allItems.some((item) =>
        item.inventoryAccountId === args.id ||
        item.cogsAccountId === args.id ||
        item.revenueAccountId === args.id ||
        item.expenseAccountId === args.id
      )
    ) {
      throw new Error("ACCOUNT_IN_USE_BY_ITEM");
    }

    const allCategories = await ctx.db
      .query("itemCategories")
      .withIndex("by_company", (q) => q.eq("companyId", account.companyId))
      .collect();
    if (
      allCategories.some((item) =>
        item.defaultInventoryAccountId === args.id ||
        item.defaultCogsAccountId === args.id ||
        item.defaultRevenueAccountId === args.id
      )
    ) {
      throw new Error("ACCOUNT_IN_USE_BY_CATEGORY");
    }

    const postingRules = await ctx.db
      .query("postingRules")
      .withIndex("by_company", (q) => q.eq("companyId", account.companyId))
      .first();
    if (
      postingRules &&
      Object.values(postingRules).some((value) => value === args.id)
    ) {
      throw new Error("ACCOUNT_IN_USE_BY_POSTING_RULES");
    }

    const allBanks = await ctx.db
      .query("bankAccounts")
      .withIndex("by_company", (q) => q.eq("companyId", account.companyId))
      .collect()
      .catch(() => []);
    if (allBanks.some((item: BankAccountDoc) => item.glAccountId === args.id)) {
      throw new Error("ACCOUNT_IN_USE_BY_BANK");
    }

    const allBranches = await ctx.db
      .query("branches")
      .withIndex("by_company", (q) => q.eq("companyId", account.companyId))
      .collect();
    const allCashBoxes = (
      await Promise.all(
        allBranches.map((branch) =>
          ctx.db
            .query("cashBoxes")
            .withIndex("by_branch", (q) => q.eq("branchId", branch._id))
            .collect()
        )
      )
    ).flat();
    if (allCashBoxes.some((item: CashBoxDoc) => item.glAccountId === args.id)) {
      throw new Error("ACCOUNT_IN_USE_BY_CASHBOX");
    }

    const allAssets = await ctx.db
      .query("fixedAssets")
      .withIndex("by_company", (q) => q.eq("companyId", account.companyId))
      .collect()
      .catch(() => []);
    if (
      allAssets.some((item: FixedAssetDoc) =>
        item.assetAccountId === args.id ||
        item.depreciationExpenseAccountId === args.id ||
        item.accumulatedDepreciationAccountId === args.id
      )
    ) {
      throw new Error("ACCOUNT_IN_USE_BY_FIXED_ASSET");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// ── Nuclear cleanup: wipe ALL old short-code accounts + every trace of them ─────
// "Old" = code shorter than 11 digits (legacy demo accounts).
// This is intentionally destructive — designed for test/migration scenarios only.
export const cleanupOldAccounts = mutation({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await assertUserPermission(ctx, args.userId, "finance", "delete");

    // 1. Collect all old accounts
    const allAccounts = await ctx.db
      .query("accounts")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const oldAccounts = allAccounts.filter((a) => a.code.length < 11);
    if (oldAccounts.length === 0) return { deletedAccounts: 0, deletedLines: 0, deletedEntries: 0 };

    const oldIds = new Set(oldAccounts.map((a) => a._id));

    // 2. Pre-fetch all referencing data in parallel
    const [customers, suppliers, items, categories, banks, postingRules, branches, fixedAssets] =
      await Promise.all([
        ctx.db.query("customers").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect(),
        ctx.db.query("suppliers").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect(),
        ctx.db.query("items").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect(),
        ctx.db.query("itemCategories").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect(),
        ctx.db.query("bankAccounts").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect().catch(() => [] as Doc<"bankAccounts">[]),
        ctx.db.query("postingRules").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).first(),
        ctx.db.query("branches").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect(),
        ctx.db.query("fixedAssets").withIndex("by_company", (q) => q.eq("companyId", args.companyId)).collect().catch(() => [] as Doc<"fixedAssets">[]),
      ]);

    const cashBoxes = (
      await Promise.all(
        branches.map((b) =>
          ctx.db.query("cashBoxes").withIndex("by_branch", (q) => q.eq("branchId", b._id)).collect()
        )
      )
    ).flat();

    // 3. Clear references in customers / suppliers
    await Promise.all([
      ...customers
        .filter((c) => c.accountId && oldIds.has(c.accountId))
        .map((c) => ctx.db.patch(c._id, { accountId: undefined })),
      ...suppliers
        .filter((s) => s.accountId && oldIds.has(s.accountId))
        .map((s) => ctx.db.patch(s._id, { accountId: undefined })),
    ]);

    // 4. Clear references in items
    await Promise.all(
      items.map((item) => {
        const patch: Record<string, undefined> = {};
        if (item.inventoryAccountId && oldIds.has(item.inventoryAccountId)) patch.inventoryAccountId = undefined;
        if (item.cogsAccountId      && oldIds.has(item.cogsAccountId))      patch.cogsAccountId      = undefined;
        if (item.revenueAccountId   && oldIds.has(item.revenueAccountId))   patch.revenueAccountId   = undefined;
        if (item.expenseAccountId   && oldIds.has(item.expenseAccountId))   patch.expenseAccountId   = undefined;
        return Object.keys(patch).length > 0 ? ctx.db.patch(item._id, patch) : null;
      }).filter(Boolean)
    );

    // 5. Clear references in item categories
    await Promise.all(
      categories.map((cat) => {
        const patch: Record<string, undefined> = {};
        if (cat.defaultInventoryAccountId && oldIds.has(cat.defaultInventoryAccountId)) patch.defaultInventoryAccountId = undefined;
        if (cat.defaultCogsAccountId      && oldIds.has(cat.defaultCogsAccountId))      patch.defaultCogsAccountId      = undefined;
        if (cat.defaultRevenueAccountId   && oldIds.has(cat.defaultRevenueAccountId))   patch.defaultRevenueAccountId   = undefined;
        return Object.keys(patch).length > 0 ? ctx.db.patch(cat._id, patch) : null;
      }).filter(Boolean)
    );

    // 6. Clear posting rules
    if (postingRules) {
      const rulesPatch: Record<string, undefined> = {};
      for (const [key, val] of Object.entries(postingRules)) {
        if (typeof val === "string" && oldIds.has(val as any)) {
          rulesPatch[key] = undefined;
        }
      }
      if (Object.keys(rulesPatch).length > 0) {
        await ctx.db.patch(postingRules._id, rulesPatch);
      }
    }

    // 7. Clear bank accounts
    await Promise.all(
      banks
        .filter((b) => oldIds.has(b.glAccountId))
        .map((b) => ctx.db.patch(b._id, { glAccountId: undefined as any }))
    );

    // 8. Clear cash boxes
    await Promise.all(
      cashBoxes
        .filter((cb) => oldIds.has(cb.glAccountId))
        .map((cb) => ctx.db.patch(cb._id, { glAccountId: undefined as any }))
    );

    // 9. Clear fixed assets
    await Promise.all(
      fixedAssets.map((fa) => {
        const patch: Record<string, undefined> = {};
        if (fa.assetAccountId && oldIds.has(fa.assetAccountId)) patch.assetAccountId = undefined;
        if (fa.depreciationExpenseAccountId && oldIds.has(fa.depreciationExpenseAccountId)) patch.depreciationExpenseAccountId = undefined;
        if (fa.accumulatedDepreciationAccountId && oldIds.has(fa.accumulatedDepreciationAccountId)) patch.accumulatedDepreciationAccountId = undefined;
        return Object.keys(patch).length > 0 ? ctx.db.patch(fa._id, patch) : null;
      }).filter(Boolean)
    );

    // 10. Delete all journal lines referencing old accounts, track affected entries
    let deletedLines = 0;
    const affectedEntryIds = new Set<string>();

    for (const acc of oldAccounts) {
      const lines = await ctx.db
        .query("journalLines")
        .withIndex("by_account", (q) => q.eq("accountId", acc._id))
        .collect();
      for (const line of lines) {
        affectedEntryIds.add(line.entryId);
        await ctx.db.delete(line._id);
        deletedLines++;
      }
    }

    // 11. For each affected journal entry: delete if it now has zero lines, else leave
    let deletedEntries = 0;
    for (const entryId of affectedEntryIds) {
      const remaining = await ctx.db
        .query("journalLines")
        .withIndex("by_entry", (q) => q.eq("entryId", entryId as any))
        .first();
      if (!remaining) {
        await ctx.db.delete(entryId as any);
        deletedEntries++;
      }
    }

    // 12. Delete accounts (children before parents via topological sort)
    const byId = new Map(oldAccounts.map((a) => [a._id, a]));
    const sorted: typeof oldAccounts = [];
    const visited = new Set<string>();

    function visit(acc: (typeof oldAccounts)[0]) {
      if (visited.has(acc._id)) return;
      visited.add(acc._id);
      oldAccounts.filter((a) => a.parentId === acc._id).forEach(visit);
      sorted.push(acc);
    }
    oldAccounts.forEach((a) => {
      if (!a.parentId || !byId.has(a.parentId)) visit(a);
    });

    for (const acc of sorted) {
      await ctx.db.delete(acc._id);
    }

    return {
      deletedAccounts: oldAccounts.length,
      deletedLines,
      deletedEntries,
    };
  },
});
