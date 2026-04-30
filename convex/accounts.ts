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

export const cleanupOldAccounts = mutation({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await assertUserPermission(ctx, args.userId, "finance", "delete");

    const all = await ctx.db
      .query("accounts")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Old accounts = code shorter than 11 digits
    const old = all.filter((a) => a.code.length < 11);
    if (old.length === 0) return { deleted: 0, skipped: 0 };

    // Topological sort: children before parents
    const byId = new Map(old.map((a) => [a._id, a]));
    const result: typeof old = [];
    const visited = new Set<string>();

    function visit(acc: (typeof old)[0]) {
      if (visited.has(acc._id)) return;
      visited.add(acc._id);
      old.filter((a) => a.parentId === acc._id).forEach(visit);
      result.push(acc);
    }
    old.forEach((a) => { if (!a.parentId || !byId.has(a.parentId)) visit(a); });

    let deleted = 0;
    let skipped = 0;

    for (const acc of result) {
      const line = await ctx.db
        .query("journalLines")
        .withIndex("by_account", (q) => q.eq("accountId", acc._id))
        .first();
      if (line) { skipped++; continue; }

      const child = await ctx.db
        .query("accounts")
        .withIndex("by_parent", (q) => q.eq("parentId", acc._id))
        .first();
      if (child) { skipped++; continue; }

      await ctx.db.delete(acc._id);
      deleted++;
    }

    return { deleted, skipped };
  },
});
