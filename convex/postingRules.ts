// @ts-nocheck
import { query, mutation, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";

/**
 * Internal helper — call from inside a mutation handler to fetch posting rules.
 * Throws a descriptive Arabic + English error if rules are not configured yet.
 */
export async function requirePostingRules(ctx: MutationCtx, companyId: Id<"companies">) {
  const rules = await ctx.db
    .query("postingRules")
    .withIndex("by_company", (q) => q.eq("companyId", companyId))
    .first();
  if (!rules) {
    throw new Error(
      "قواعد الترحيل غير مُعدَّة — يرجى الذهاب إلى الإعدادات → قواعد الترحيل وضبطها أولاً. " +
      "(Posting rules not configured — go to Settings → Posting Rules to set them up first.)"
    );
  }
  return rules;
}

/** Get posting rules for a company (returns null if not configured yet) */
export const getPostingRules = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("postingRules")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .first();
  },
});

/** Save / update posting rules */
export const savePostingRules = mutation({
  args: {
    companyId: v.id("companies"),
    // Sales
    cashSalesAccountId:               v.optional(v.id("accounts")),
    cardSalesAccountId:               v.optional(v.id("accounts")),
    arAccountId:                      v.optional(v.id("accounts")),
    defaultRevenueAccountId:          v.optional(v.id("accounts")),
    cogsAccountId:                    v.optional(v.id("accounts")),
    inventoryAccountId:               v.optional(v.id("accounts")),
    vatPayableAccountId:              v.optional(v.id("accounts")),
    // Purchases
    apAccountId:                      v.optional(v.id("accounts")),
    vatReceivableAccountId:           v.optional(v.id("accounts")),
    purchaseAccountId:                v.optional(v.id("accounts")),
    // Treasury
    mainCashAccountId:                v.optional(v.id("accounts")),
    bankAccountId:                    v.optional(v.id("accounts")),
    // Payroll
    salaryExpenseAccountId:           v.optional(v.id("accounts")),
    salaryPayableAccountId:           v.optional(v.id("accounts")),
    // Fixed Assets
    depreciationExpenseAccountId:     v.optional(v.id("accounts")),
    accumulatedDepreciationAccountId: v.optional(v.id("accounts")),
    // Production
    wipAccountId:                     v.optional(v.id("accounts")),
    // Wastage
    wastageExpenseAccountId:          v.optional(v.id("accounts")),
  },
  handler: async (ctx, args) => {
    const { companyId, ...fields } = args;
    const existing = await ctx.db
      .query("postingRules")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .first();

    const data = { ...fields, updatedAt: Date.now() };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    } else {
      return await ctx.db.insert("postingRules", { companyId, ...data });
    }
  },
});

/** Auto-seed posting rules by matching account codes for Arirang Bakery */
export const autoDetectPostingRules = mutation({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const allAccounts = await ctx.db
      .query("accounts")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .take(500);

    // Build code → account map
    const byCode = new Map<string, any>();
    for (const a of allAccounts) byCode.set(a.code, a);

    // Helper: find first account matching any of these codes or name keywords
    function findAccount(codes: string[], keywords: string[] = []): string | undefined {
      for (const code of codes) {
        const a = byCode.get(code);
        if (a?.isPostable && a?.isActive) return a._id;
      }
      for (const kw of keywords) {
        const found = allAccounts.find(
          (a) => a.isPostable && a.isActive &&
            (a.nameAr?.includes(kw) || a.nameEn?.toLowerCase().includes(kw.toLowerCase()))
        );
        if (found) return found._id;
      }
      return undefined;
    }

    const rules = {
      // Sales
      cashSalesAccountId:               findAccount(["1010001","1010","1001"], ["صندوق","كاش","cash box"]),
      cardSalesAccountId:               findAccount(["1010002","1020"], ["بطاقة","card","pos"]),
      arAccountId:                      findAccount(["1100","1110","1101"], ["ذمم عملاء","receivable"]),
      defaultRevenueAccountId:          findAccount(["4100","4110","4000","4001"], ["مبيعات","revenue","sales"]),
      cogsAccountId:                    findAccount(["5100","5110","5000","5001"], ["تكلفة","cogs","cost of"]),
      inventoryAccountId:               findAccount(["1300","1310","1200"], ["مخزون","inventory","stock"]),
      vatPayableAccountId:              findAccount(["2200","2210","2300"], ["ضريبة مستحقة","vat payable","output tax"]),
      // Purchases
      apAccountId:                      findAccount(["2100","2110","2001"], ["ذمم موردين","payable","supplier"]),
      vatReceivableAccountId:           findAccount(["1400","1410","1500"], ["ضريبة مدخلات","vat receivable","input tax"]),
      purchaseAccountId:                findAccount(["5200","5210","5000"], ["مشتريات","purchases"]),
      // Treasury
      mainCashAccountId:                findAccount(["1010","1010001","1001"], ["صندوق رئيسي","main cash","petty cash"]),
      bankAccountId:                    findAccount(["1020","1021","1030"], ["بنك","bank"]),
      // Payroll
      salaryExpenseAccountId:           findAccount(["5300","5310","5400"], ["رواتب","salaries","payroll"]),
      salaryPayableAccountId:           findAccount(["2150","2160","2200"], ["رواتب مستحقة","accrued salaries"]),
      // Fixed Assets
      depreciationExpenseAccountId:     findAccount(["5500","5510","5600"], ["استهلاك","depreciation"]),
      accumulatedDepreciationAccountId: findAccount(["1600","1610","1620"], ["مجمع استهلاك","accumulated"]),
      // Production
      wipAccountId:                     findAccount(["1350","1360"], ["تحت التشغيل","wip","work in progress"]),
      // Wastage
      wastageExpenseAccountId:          findAccount(["5700","5710","5800"], ["هدر","تالف","wastage","spoilage"]),
    };

    const existing = await ctx.db
      .query("postingRules")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .first();

    const data = { ...rules, updatedAt: Date.now() };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return { action: "updated", rules };
    } else {
      await ctx.db.insert("postingRules", { companyId: args.companyId, ...data });
      return { action: "created", rules };
    }
  },
});
