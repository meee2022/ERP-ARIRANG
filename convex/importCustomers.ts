import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { EXCEL_CUSTOMER_GROUPS, EXCEL_CUSTOMER_ACCOUNTS } from "./excelCustomerData";

// ─────────────────────────────────────────────────────────────────────────────
//  importCustomersFromExcel
//  Idempotent UPSERT of customer groups + customer accounts from Excel source.
//  Safe to re-run: matches by normalizedName within company, never duplicates.
//
//  Strategy:
//  1. Find or create a default "Trade Receivables" account for customers
//  2. Upsert 32 GROUP parent accounts (isGroupParent=true)
//  3. Upsert 176 individual customer branch accounts
//  4. Link each account to its group via customerGroupNorm
// ─────────────────────────────────────────────────────────────────────────────

export const importCustomersFromExcel = mutation({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args) => {
    const company = args.companyId
      ? await ctx.db.get(args.companyId)
      : await ctx.db.query("companies").first();
    if (!company) throw new Error("No company found");
    const companyId = company._id;

    // ── Find or create a placeholder Trade Receivables account ───────────────
    let trAccountId = await (async () => {
      // Look for existing trade receivable / accounts receivable
      const accs = await ctx.db
        .query("accounts")
        .withIndex("by_company", (q) => q.eq("companyId", companyId))
        .collect();

      // Try operational type first
      const byOpType = accs.find(
        (a) => a.operationalType === "trade_receivable" && a.isPostable
      );
      if (byOpType) return byOpType._id;

      // Try by name / code
      const byName = accs.find(
        (a) =>
          a.isPostable &&
          (a.nameEn?.toLowerCase().includes("receiv") ||
           a.nameAr?.includes("مدينون") ||
           a.code?.startsWith("12"))
      );
      if (byName) return byName._id;

      // Use any asset postable account as fallback
      const fallback = accs.find((a) => a.accountType === "asset" && a.isPostable);
      if (fallback) return fallback._id;

      throw new Error(
        "No suitable receivables account found. Please create a Trade Receivables account first."
      );
    })();

    // ── Helper: upsert a single customer row ─────────────────────────────────
    async function upsertCustomer(opts: {
      norm: string;
      display: string;
      code: string;
      groupNorm: string;
      groupDisplay: string;
      isGroupParent: boolean;
      branchCount?: number;
    }) {
      // Check by normalizedName
      const existing = await ctx.db
        .query("customers")
        .withIndex("by_company_normalized", (q) =>
          q.eq("companyId", companyId).eq("normalizedName", opts.norm)
        )
        .first();

      const patch = {
        normalizedName: opts.norm,
        customerGroup: opts.groupDisplay || undefined,
        customerGroupNorm: opts.groupNorm || undefined,
        isGroupParent: opts.isGroupParent,
        branchCount: opts.branchCount,
        isActive: true,
      };

      if (existing) {
        await ctx.db.patch(existing._id, patch);
        return { id: existing._id, action: "updated" };
      }

      // Also check by code to avoid code conflicts
      const byCode = await ctx.db
        .query("customers")
        .withIndex("by_company_code", (q) =>
          q.eq("companyId", companyId).eq("code", opts.code)
        )
        .first();

      const finalCode = byCode ? opts.code + "_X" : opts.code;

      const id = await ctx.db.insert("customers", {
        companyId,
        code: finalCode,
        nameAr: opts.display,
        nameEn: opts.display,
        accountId: trAccountId,
        creditLimit: 0,
        creditDays: 30,
        createdAt: Date.now(),
        normalizedName: opts.norm,
        customerGroup: opts.groupDisplay || undefined,
        customerGroupNorm: opts.groupNorm || undefined,
        isGroupParent: opts.isGroupParent,
        branchCount: opts.branchCount,
        isActive: true,
      });
      return { id, action: "created" };
    }

    // ── Step 1: Upsert group parents ──────────────────────────────────────────
    let groupsCreated = 0, groupsUpdated = 0;
    const groupDisplayByNorm: Record<string, string> = {};

    for (const g of EXCEL_CUSTOMER_GROUPS) {
      groupDisplayByNorm[g.norm] = g.display;
      const r = await upsertCustomer({
        norm: g.norm,
        display: g.display,
        code: "GRP-" + g.code,
        groupNorm: g.norm,
        groupDisplay: g.display,
        isGroupParent: true,
        branchCount: g.branchCount,
      });
      if (r.action === "created") groupsCreated++;
      else groupsUpdated++;
    }

    // ── Step 2: Upsert individual branch/customer accounts ───────────────────
    let accountsCreated = 0, accountsUpdated = 0;

    for (const a of EXCEL_CUSTOMER_ACCOUNTS) {
      const groupDisplay = groupDisplayByNorm[a.groupNorm] ?? a.groupNorm;
      const r = await upsertCustomer({
        norm: a.norm,
        display: a.display,
        code: a.code,
        groupNorm: a.groupNorm,
        groupDisplay,
        isGroupParent: false,
      });
      if (r.action === "created") accountsCreated++;
      else accountsUpdated++;
    }

    return {
      message: "Customer import complete",
      groups: { created: groupsCreated, updated: groupsUpdated },
      accounts: { created: accountsCreated, updated: accountsUpdated },
      total: groupsCreated + groupsUpdated + accountsCreated + accountsUpdated,
    };
  },
});
