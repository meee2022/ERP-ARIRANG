/**
 * Fiscal Period Control
 *
 * assertPeriodOpen(ctx, date, companyId):
 *   - If no fiscal years exist at all → skip validation (backward compat)
 *   - If fiscal years exist but none covers the date as "open" → throw
 *   - If the period covering the date is closed → throw
 */

import { MutationCtx, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export async function assertPeriodOpen(
  ctx: QueryCtx | MutationCtx,
  date: string,
  companyId: Id<"companies">
): Promise<void> {
  // Check if any fiscal years exist at all for this company
  const anyYear = await ctx.db
    .query("fiscalYears")
    .withIndex("by_company", (q) => q.eq("companyId", companyId))
    .first();

  // Backward compat: if no fiscal years configured, skip all validation
  if (!anyYear) return;

  // Find an open fiscal year covering the date
  const allYears = await ctx.db
    .query("fiscalYears")
    .withIndex("by_company", (q) => q.eq("companyId", companyId))
    .collect();

  const openYear = allYears.find(
    (y) =>
      y.status === "open" &&
      date >= y.startDate &&
      date <= y.endDate
  );

  if (!openYear) {
    throw new Error(
      `لا توجد سنة مالية مفتوحة تغطي تاريخ ${date}. يرجى التحقق من إعدادات السنوات المالية.`
    );
  }

  // Find a period within that year covering the date
  const periods = await ctx.db
    .query("accountingPeriods")
    .withIndex("by_fiscal_year", (q) => q.eq("fiscalYearId", openYear._id))
    .collect();

  const matchingPeriod = periods.find(
    (p) => date >= p.startDate && date <= p.endDate
  );

  if (!matchingPeriod) {
    throw new Error(
      `لا توجد فترة محاسبية تغطي تاريخ ${date} في السنة المالية ${openYear.nameAr}.`
    );
  }

  if (matchingPeriod.status !== "open") {
    throw new Error(
      `الفترة المحاسبية "${matchingPeriod.name}" مغلقة. لا يمكن الترحيل في فترة مغلقة.`
    );
  }
}
