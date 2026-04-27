import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { assertUserPermission } from "./lib/permissions";
import { logAudit } from "./lib/audit";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate monthly period ranges between two YYYY-MM-DD dates (inclusive). */
function generateMonthlyPeriods(
  startDate: string,
  endDate: string
): Array<{ periodNumber: number; name: string; startDate: string; endDate: string }> {
  const periods: Array<{ periodNumber: number; name: string; startDate: string; endDate: string }> = [];

  let current = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");
  let periodNumber = 1;

  while (current <= end) {
    const year = current.getUTCFullYear();
    const month = current.getUTCMonth(); // 0-based

    const periodStart = new Date(Date.UTC(year, month, 1));
    const periodEnd = new Date(Date.UTC(year, month + 1, 0)); // last day of month

    const actualStart = periodStart < new Date(startDate + "T00:00:00Z")
      ? startDate
      : periodStart.toISOString().slice(0, 10);

    const actualEnd = periodEnd > end
      ? endDate
      : periodEnd.toISOString().slice(0, 10);

    const monthNames = [
      "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
      "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
    ];

    periods.push({
      periodNumber,
      name: `${monthNames[month]} ${year}`,
      startDate: actualStart,
      endDate: actualEnd,
    });

    periodNumber++;
    // Move to first day of next month
    current = new Date(Date.UTC(year, month + 1, 1));
  }

  return periods;
}

// ─── CREATE FISCAL YEAR ───────────────────────────────────────────────────────

export const createFiscalYear = mutation({
  args: {
    companyId: v.id("companies"),
    code: v.string(),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    await assertUserPermission(ctx, args.createdBy, "settings", "create");

    // Validate dates
    if (args.startDate >= args.endDate) {
      throw new Error("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");
    }

    // Only one open year at a time
    const openYear = await ctx.db
      .query("fiscalYears")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .filter((q) => q.eq(q.field("status"), "open"))
      .first();

    if (openYear) {
      throw new Error("يوجد سنة مالية مفتوحة بالفعل. يجب إغلاقها قبل إنشاء سنة جديدة");
    }

    // No overlap with existing years
    const existingYears = await ctx.db
      .query("fiscalYears")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    for (const fy of existingYears) {
      const noOverlap = args.endDate < fy.startDate || args.startDate > fy.endDate;
      if (!noOverlap) {
        throw new Error(`تتداخل مع السنة المالية: ${fy.nameAr} (${fy.startDate} - ${fy.endDate})`);
      }
    }

    const fiscalYearId = await ctx.db.insert("fiscalYears", {
      companyId: args.companyId,
      code: args.code,
      nameAr: args.nameAr,
      nameEn: args.nameEn,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "open",
    });

    // Auto-generate monthly periods
    const periods = generateMonthlyPeriods(args.startDate, args.endDate);
    for (const period of periods) {
      await ctx.db.insert("accountingPeriods", {
        fiscalYearId,
        companyId: args.companyId,
        periodNumber: period.periodNumber,
        name: period.name,
        startDate: period.startDate,
        endDate: period.endDate,
        status: "open",
      });
    }

    await logAudit(ctx, {
      companyId: args.companyId,
      userId: args.createdBy,
      action: "create",
      module: "settings",
      documentType: "fiscalYear",
      documentId: fiscalYearId,
      details: JSON.stringify({ nameAr: args.nameAr, startDate: args.startDate, endDate: args.endDate, periodsCreated: periods.length }),
    });

    return fiscalYearId;
  },
});

// ─── LIST FISCAL YEARS ────────────────────────────────────────────────────────

export const listFiscalYears = query({
  args: { companyId: v.id("companies"), userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (args.userId) {
      await assertUserPermission(ctx, args.userId, "settings", "view");
    }
    return await ctx.db
      .query("fiscalYears")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .collect();
  },
});

// ─── GET FISCAL YEAR WITH PERIODS ─────────────────────────────────────────────

export const getFiscalYearWithPeriods = query({
  args: { fiscalYearId: v.id("fiscalYears"), userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (args.userId) {
      await assertUserPermission(ctx, args.userId, "settings", "view");
    }
    const fiscalYear = await ctx.db.get(args.fiscalYearId);
    if (!fiscalYear) return null;

    const periods = await ctx.db
      .query("accountingPeriods")
      .withIndex("by_fiscal_year", (q) => q.eq("fiscalYearId", args.fiscalYearId))
      .order("asc")
      .collect();

    return { ...fiscalYear, periods };
  },
});

// ─── CLOSE PERIOD ─────────────────────────────────────────────────────────────

export const closePeriod = mutation({
  args: {
    periodId: v.id("accountingPeriods"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await assertUserPermission(ctx, args.userId, "settings", "edit");

    const period = await ctx.db.get(args.periodId);
    if (!period) throw new Error("الفترة المحاسبية غير موجودة");

    if (period.status === "closed" || period.status === "locked") {
      throw new Error("الفترة مغلقة بالفعل");
    }

    // Parent year must be open
    const year = await ctx.db.get(period.fiscalYearId);
    if (!year || year.status !== "open") {
      throw new Error("لا يمكن إغلاق فترة في سنة مالية مغلقة");
    }

    await ctx.db.patch(args.periodId, {
      status: "closed",
      closedBy: args.userId,
      closedAt: Date.now(),
    });

    await logAudit(ctx, {
      companyId: period.companyId,
      userId: args.userId,
      action: "edit",
      module: "settings",
      documentType: "accountingPeriod",
      documentId: args.periodId,
      details: JSON.stringify({ action: "closePeriod", periodName: period.name }),
    });
  },
});

// ─── REOPEN PERIOD ────────────────────────────────────────────────────────────

export const reopenPeriod = mutation({
  args: {
    periodId: v.id("accountingPeriods"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await assertUserPermission(ctx, args.userId, "settings", "edit");

    const period = await ctx.db.get(args.periodId);
    if (!period) throw new Error("الفترة المحاسبية غير موجودة");

    if (period.status === "open") {
      throw new Error("الفترة مفتوحة بالفعل");
    }
    if (period.status === "locked") {
      throw new Error("الفترة مقفلة ولا يمكن إعادة فتحها");
    }

    // Parent year must be open
    const year = await ctx.db.get(period.fiscalYearId);
    if (!year || year.status !== "open") {
      throw new Error("لا يمكن إعادة فتح فترة في سنة مالية مغلقة");
    }

    await ctx.db.patch(args.periodId, {
      status: "open",
    });

    await logAudit(ctx, {
      companyId: period.companyId,
      userId: args.userId,
      action: "edit",
      module: "settings",
      documentType: "accountingPeriod",
      documentId: args.periodId,
      details: JSON.stringify({ action: "reopenPeriod", periodName: period.name }),
    });
  },
});

// ─── CLOSE FISCAL YEAR ────────────────────────────────────────────────────────

export const closeFiscalYear = mutation({
  args: {
    fiscalYearId: v.id("fiscalYears"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await assertUserPermission(ctx, args.userId, "settings", "edit");

    const year = await ctx.db.get(args.fiscalYearId);
    if (!year) throw new Error("السنة المالية غير موجودة");
    if (year.status === "closed" || year.status === "locked") {
      throw new Error("السنة المالية مغلقة بالفعل");
    }

    // Sequential closing: no older open year allowed
    const olderOpenYear = await ctx.db
      .query("fiscalYears")
      .withIndex("by_company", (q) => q.eq("companyId", year.companyId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "open"),
          q.lt(q.field("startDate"), year.startDate)
        )
      )
      .first();

    if (olderOpenYear) {
      throw new Error(`يجب إغلاق السنة المالية الأقدم أولاً: ${olderOpenYear.nameAr}`);
    }

    // Close all open periods in this year
    const openPeriods = await ctx.db
      .query("accountingPeriods")
      .withIndex("by_fiscal_year", (q) => q.eq("fiscalYearId", args.fiscalYearId))
      .filter((q) => q.eq(q.field("status"), "open"))
      .collect();

    for (const period of openPeriods) {
      await ctx.db.patch(period._id, {
        status: "closed",
        closedBy: args.userId,
        closedAt: Date.now(),
      });
    }

    // Close the fiscal year
    await ctx.db.patch(args.fiscalYearId, {
      status: "closed",
      closedBy: args.userId,
      closedAt: Date.now(),
    });

    await logAudit(ctx, {
      companyId: year.companyId,
      userId: args.userId,
      action: "edit",
      module: "settings",
      documentType: "fiscalYear",
      documentId: args.fiscalYearId,
      details: JSON.stringify({ action: "closeFiscalYear", nameAr: year.nameAr, periodsClosedCount: openPeriods.length }),
    });
  },
});
