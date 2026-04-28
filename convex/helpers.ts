import { query } from "./_generated/server";
import { v } from "convex/values";

// Returns the open accounting period that contains the given date for a company.
// Updated to work with the fiscal year system:
//  1. If fiscal years exist, find the open fiscal year covering the date, then find its open period.
//  2. Falls back to searching all open periods (backward compat for installs without fiscal years).
export const getOpenPeriod = query({
  args: {
    companyId: v.id("companies"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if any fiscal years are configured
    const anyYear = await ctx.db
      .query("fiscalYears")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .first();

    if (anyYear) {
      // Fiscal years exist — find open year covering the date
      const allYears = await ctx.db
        .query("fiscalYears")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .collect();

      const openYear = allYears.find(
        (y) =>
          y.status === "open" &&
          args.date >= y.startDate &&
          args.date <= y.endDate
      );

      if (!openYear) return null;

      // Find open period within this year covering the date
      const periods = await ctx.db
        .query("accountingPeriods")
        .withIndex("by_fiscal_year", (q) => q.eq("fiscalYearId", openYear._id))
        .collect();

      const exact = periods.find(
        (p) => p.status === "open" && args.date >= p.startDate && args.date <= p.endDate
      );
      if (exact) return exact;

      // Fallback: first open period in year
      return periods.find((p) => p.status === "open") ?? null;
    }

    // No fiscal years — legacy path: search all open periods
    const openPeriods = await ctx.db
      .query("accountingPeriods")
      .withIndex("by_company_status", (q) =>
        q.eq("companyId", args.companyId).eq("status", "open")
      )
      .take(50);

    if (openPeriods.length === 0) return null;

    const exact = openPeriods.find(
      (p) => args.date >= p.startDate && args.date <= p.endDate
    );
    if (exact) return exact;

    return openPeriods[0];
  },
});

// Temporary helper until auth is built: returns the first active admin user for a company.
export const getDefaultUser = query({
  args: {
    companyId: v.optional(v.id("companies")),
  },
  handler: async (ctx, args) => {
    const adminUsers = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .filter((q) => q.eq(q.field("isActive"), true))
      .take(10);

    if (adminUsers.length === 0) return null;
    return adminUsers[0];
  },
});

// Returns the first active currency (base currency) for convenience.
export const getDefaultCurrency = query({
  args: {},
  handler: async (ctx) => {
    const baseByFlag = await ctx.db
      .query("currencies")
      .filter((q) => q.eq(q.field("isBase"), true))
      .first();
    if (baseByFlag) return baseByFlag;

    const qar = await ctx.db
      .query("currencies")
      .withIndex("by_code", (q) => q.eq("code", "QAR"))
      .first();
    if (qar) return qar;

    return await ctx.db
      .query("currencies")
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
  },
});

// Returns the base currency (isBase=true) — preferred over getDefaultCurrency
// for new code since it uses the canonical flag instead of hardcoded code.
export const getBaseCurrency = query({
  args: {},
  handler: async (ctx) => {
    // Try the isBase flag first (set by seedInitialData)
    const base = await ctx.db
      .query("currencies")
      .filter((q) => q.eq(q.field("isBase"), true))
      .first();
    if (base) return base;
    // Fallback: QAR by code
    const byCode = await ctx.db
      .query("currencies")
      .withIndex("by_code", (q) => q.eq("code", "QAR"))
      .first();
    if (byCode) return byCode;
    // Last resort: first active currency
    return await ctx.db.query("currencies").filter((q) => q.eq(q.field("isActive"), true)).first();
  },
});
