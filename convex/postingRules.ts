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
      cashSalesAccountId:               findAccount(["11010010000","1101","1010001","1010","1001"], ["cash in hand","صندوق نقدي","كاش","cash box"]),
      cardSalesAccountId:               findAccount(["11010020000","1103","1010002","1020"], ["pos","card","بطاقة"]),
      arAccountId:                      findAccount(["11030000000","1201","1100","1110"], ["local customer","credit sales","ذمم مدينة","ذمم عملاء","accounts receivable"]),
      defaultRevenueAccountId:          findAccount(["41000000000","43000000000","4101","4100","4000"], ["products sales","total sales","إيرادات مبيعات","sales revenue"]),
      cogsAccountId:                    findAccount(["51000000000","5101","5100","5000"], ["cost of product sold","تكلفة البضاعة","cogs","cost of goods"]),
      inventoryAccountId:               findAccount(["11070030000","1301","1300","1200"], ["finished products","مخزون","inventory","stock"]),
      vatPayableAccountId:              findAccount(["2201","2200","2210"], ["vat payable","ضريبة مستحقة","output vat"]),
      // Purchases
      apAccountId:                      findAccount(["21040000000","2101","2100","2001"], ["suppliers","ذمم دائنة","ذمم موردين","accounts payable"]),
      vatReceivableAccountId:           findAccount(["2202","1400","1410"], ["input vat","vat receivable","ضريبة المدخلات"]),
      purchaseAccountId:                findAccount(["53000000000","5200","5210"], ["purchases","مشتريات"]),
      // Treasury
      mainCashAccountId:                findAccount(["11010010000","1101","1010","1001"], ["cash in hand","صندوق نقدي","صندوق رئيسي","main cash"]),
      bankAccountId:                    findAccount(["11010020000","1102","1020","1021"], ["banks","بنك","bank"]),
      // Payroll
      salaryExpenseAccountId:           findAccount(["61010020000","5201","5300","5400"], ["salaries - transfer","salaries","رواتب","payroll"]),
      salaryPayableAccountId:           findAccount(["21060000000","2301","2150"], ["salaries payable","رواتب مستحقة","salary payable"]),
      // Fixed Assets
      depreciationExpenseAccountId:     findAccount(["66010010000","66010020000","66010030000","5301","5500"], ["depreciation of","مصروف الإهلاك","depreciation expense"]),
      accumulatedDepreciationAccountId: findAccount(["12020020000","12030020000","12040020000","1401","1600"], ["depreciation for","depreciation of building","مجمع الإهلاك","accumulated depreciation"]),
      // Production
      wipAccountId:                     findAccount(["13010000000","11070020000","1350","1360"], ["work in progress","product under manufacturing","تحت التشغيل","wip"]),
      // Wastage
      wastageExpenseAccountId:          findAccount(["67020000000","5700","5710"], ["damage items","هدر","تالف","wastage","spoilage"]),
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
