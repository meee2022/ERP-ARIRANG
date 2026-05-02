// @ts-nocheck
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { generateDocumentNumber, postJournalEntry } from "./lib/posting";
import { assertUserPermission, assertUserBranch } from "./lib/permissions";
import { logAudit } from "./lib/audit";

// ═══════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════

export const listStockTakes = query({
  args: {
    companyId: v.id("companies"),
    warehouseId: v.optional(v.id("warehouses")),
    status: v.optional(v.string()),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let takes = await ctx.db
      .query("stockTakes")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .order("desc")
      .take(200);

    if (args.warehouseId) takes = takes.filter((t) => t.warehouseId === args.warehouseId);
    if (args.status)      takes = takes.filter((t) => t.status === args.status);
    if (args.fromDate)    takes = takes.filter((t) => t.takeDate >= args.fromDate);
    if (args.toDate)      takes = takes.filter((t) => t.takeDate <= args.toDate);

    return Promise.all(
      takes.map(async (t: any) => {
        const wh   = await ctx.db.get(t.warehouseId);
        const user = await ctx.db.get(t.createdBy);
        return {
          ...t,
          warehouseName:   wh?.nameAr ?? "—",
          warehouseNameEn: (wh as any)?.nameEn ?? wh?.nameAr ?? "—",
          createdByName:   (user as any)?.name ?? "—",
        };
      })
    );
  },
});

export const getStockTakeById = query({
  args: { takeId: v.id("stockTakes") },
  handler: async (ctx, args) => {
    const take = await ctx.db.get(args.takeId);
    if (!take) return null;

    const lines = await ctx.db
      .query("stockTakeLines")
      .withIndex("by_take", (q) => q.eq("takeId", args.takeId))
      .collect();

    const enriched = await Promise.all(
      lines.map(async (line: any) => {
        const item = await ctx.db.get(line.itemId);
        const uom  = await ctx.db.get(line.uomId);
        return {
          ...line,
          itemCode:   (item as any)?.code ?? "—",
          itemNameAr: item?.nameAr ?? "",
          itemNameEn: (item as any)?.nameEn ?? item?.nameAr ?? "",
          uomNameAr:  uom?.nameAr ?? "",
          uomNameEn:  (uom as any)?.nameEn ?? uom?.nameAr ?? "",
          categoryId: (item as any)?.categoryId ?? null,
        };
      })
    );

    const wh      = await ctx.db.get(take.warehouseId);
    const branch  = await ctx.db.get(take.branchId);
    const company = await ctx.db.get(take.companyId);
    const creator = await ctx.db.get(take.createdBy);

    return {
      ...take,
      lines: enriched.sort((a: any, b: any) => (a.itemCode || "").localeCompare(b.itemCode || "")),
      warehouseNameAr: wh?.nameAr ?? "—",
      warehouseNameEn: (wh as any)?.nameEn ?? wh?.nameAr ?? "—",
      branchNameAr:    branch?.nameAr ?? "—",
      branchNameEn:    (branch as any)?.nameEn ?? branch?.nameAr ?? "—",
      companyNameAr:   company?.nameAr ?? "—",
      companyNameEn:   (company as any)?.nameEn ?? company?.nameAr ?? "—",
      createdByName:   (creator as any)?.name ?? "—",
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

// ─── Create a new stock take (snapshots all warehouse items) ───────────────
export const createStockTake = mutation({
  args: {
    companyId: v.id("companies"),
    branchId: v.id("branches"),
    warehouseId: v.id("warehouses"),
    takeDate: v.string(),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await assertUserPermission(ctx, args.createdBy, "inventory", "create");
    assertUserBranch(user, args.branchId);

    // Block creating a new take when one is already in progress for this warehouse
    const existing = await ctx.db
      .query("stockTakes")
      .withIndex("by_warehouse", (q) => q.eq("warehouseId", args.warehouseId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "draft"),
          q.eq(q.field("status"), "in_progress"),
          q.eq(q.field("status"), "pending_review"),
        )
      )
      .first();
    if (existing) {
      throw new Error(`يوجد جرد مفتوح لهذا المخزن (${existing.takeNumber}). أكمله أو ألغيه أولاً.`);
    }

    // Generate take number
    const fiscalYear = await ctx.db
      .query("fiscalYears")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .filter((q) => q.eq(q.field("status"), "open"))
      .first();

    let takeNumber = `ST-${Date.now()}`;
    if (fiscalYear) {
      try {
        takeNumber = await generateDocumentNumber(ctx, args.branchId, fiscalYear._id, "ST");
      } catch {
        takeNumber = `ST-${Date.now()}`;
      }
    }

    // Snapshot all stock balances for this warehouse
    const balances = await ctx.db
      .query("stockBalance")
      .withIndex("by_warehouse", (q) => q.eq("warehouseId", args.warehouseId))
      .collect();

    // Insert header
    const takeId = await ctx.db.insert("stockTakes", {
      companyId: args.companyId,
      branchId: args.branchId,
      warehouseId: args.warehouseId,
      takeNumber,
      takeDate: args.takeDate,
      status: "draft",
      totalItems: balances.length,
      countedItems: 0,
      itemsWithVariance: 0,
      totalVarianceQty: 0,
      totalVarianceValue: 0,
      shortageValue: 0,
      excessValue: 0,
      notes: args.notes,
      adjustmentCreated: false,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });

    // Insert one line per balanced item
    for (const bal of balances) {
      const item: any = await ctx.db.get(bal.itemId);
      if (!item) continue;
      // Skip inactive items
      if (item.isActive === false) continue;

      await ctx.db.insert("stockTakeLines", {
        takeId,
        itemId: bal.itemId,
        uomId: item.baseUomId,
        systemQty: bal.quantity,
        physicalQty: undefined,
        variance: 0,
        unitCost: bal.avgCost ?? item.lastCost ?? item.standardCost ?? 0,
        varianceValue: 0,
        counted: false,
      });
    }

    await logAudit(ctx, {
      companyId: args.companyId,
      userId: args.createdBy,
      action: "create",
      module: "inventory",
      documentType: "stockTake",
      documentId: String(takeId),
    });

    return { takeId, takeNumber };
  },
});

// ─── Update one line's physical count (auto-save) ──────────────────────────
export const updateLineCount = mutation({
  args: {
    lineId: v.id("stockTakeLines"),
    physicalQty: v.optional(v.number()),
    reason: v.optional(v.string()),
    notes: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const line = await ctx.db.get(args.lineId);
    if (!line) throw new Error("سطر الجرد غير موجود");

    const take = await ctx.db.get(line.takeId);
    if (!take) throw new Error("الجرد غير موجود");
    if (take.status === "completed" || take.status === "cancelled") {
      throw new Error("لا يمكن تعديل جرد مكتمل أو ملغي");
    }

    await assertUserPermission(ctx, args.userId, "inventory", "edit");

    const physicalQty = args.physicalQty;
    const isCounted = physicalQty !== undefined && physicalQty !== null;
    const variance  = isCounted ? physicalQty - line.systemQty : 0;
    const varianceValue = Math.round(variance * line.unitCost * 100) / 100;

    await ctx.db.patch(args.lineId, {
      physicalQty: isCounted ? physicalQty : undefined,
      variance,
      varianceValue,
      reason: args.reason as any,
      notes: args.notes,
      counted: isCounted,
      countedAt: isCounted ? Date.now() : undefined,
      countedBy: isCounted ? args.userId : undefined,
    });

    // Recompute header totals + auto-promote to in_progress
    await recomputeTakeTotals(ctx, line.takeId);
    if (take.status === "draft" && isCounted) {
      await ctx.db.patch(line.takeId, { status: "in_progress" });
    }
  },
});

// ─── Bulk update (Excel import) ────────────────────────────────────────────
export const bulkUpdateCounts = mutation({
  args: {
    takeId: v.id("stockTakes"),
    counts: v.array(v.object({
      itemCode: v.string(),
      physicalQty: v.number(),
    })),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const take = await ctx.db.get(args.takeId);
    if (!take) throw new Error("الجرد غير موجود");
    if (take.status === "completed" || take.status === "cancelled") {
      throw new Error("لا يمكن تعديل جرد مكتمل أو ملغي");
    }
    await assertUserPermission(ctx, args.userId, "inventory", "edit");

    const lines = await ctx.db
      .query("stockTakeLines")
      .withIndex("by_take", (q) => q.eq("takeId", args.takeId))
      .collect();

    let updated = 0, notFound = 0;
    for (const c of args.counts) {
      // Find by item code (need to look up item first)
      let matchedLine: any = null;
      for (const line of lines) {
        const item: any = await ctx.db.get(line.itemId);
        if (item?.code === c.itemCode) {
          matchedLine = line;
          break;
        }
      }
      if (!matchedLine) { notFound++; continue; }

      const variance = c.physicalQty - matchedLine.systemQty;
      const varianceValue = Math.round(variance * matchedLine.unitCost * 100) / 100;
      await ctx.db.patch(matchedLine._id, {
        physicalQty: c.physicalQty,
        variance,
        varianceValue,
        counted: true,
        countedAt: Date.now(),
        countedBy: args.userId,
      });
      updated++;
    }

    await recomputeTakeTotals(ctx, args.takeId);
    if (take.status === "draft" && updated > 0) {
      await ctx.db.patch(args.takeId, { status: "in_progress" });
    }
    return { updated, notFound };
  },
});

// ─── Submit for Review ─────────────────────────────────────────────────────
export const submitForReview = mutation({
  args: { takeId: v.id("stockTakes"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const take = await ctx.db.get(args.takeId);
    if (!take) throw new Error("الجرد غير موجود");
    if (take.status !== "draft" && take.status !== "in_progress") {
      throw new Error("يمكن إرسال المسودات أو الجرد قيد التنفيذ فقط للمراجعة");
    }
    await assertUserPermission(ctx, args.userId, "inventory", "edit");

    if (take.countedItems === 0) {
      throw new Error("لا يمكن إرسال جرد بدون عد أي أصناف");
    }

    await ctx.db.patch(args.takeId, {
      status: "pending_review",
      submittedBy: args.userId,
      submittedAt: Date.now(),
    });
  },
});

// ─── Admin: Approve (with or without auto-adjustment) ──────────────────────
export const approveStockTake = mutation({
  args: {
    takeId: v.id("stockTakes"),
    userId: v.id("users"),
    createAdjustment: v.boolean(),
    inventoryAccountId:    v.optional(v.id("accounts")),
    varianceAccountId:     v.optional(v.id("accounts")),
  },
  handler: async (ctx, args) => {
    const take = await ctx.db.get(args.takeId);
    if (!take) throw new Error("الجرد غير موجود");
    if (take.status !== "pending_review") {
      throw new Error("يجب إرسال الجرد للمراجعة أولاً");
    }
    // Admin-only: require posting permission
    await assertUserPermission(ctx, args.userId, "inventory", "post");

    let journalEntryId: any = undefined;

    if (args.createAdjustment && (take.shortageValue !== 0 || take.excessValue !== 0)) {
      if (!args.inventoryAccountId || !args.varianceAccountId) {
        throw new Error("اختر حساب المخزون وحساب فروقات الجرد لإنشاء التسوية");
      }

      // Find an open period for the take date
      const periods = await ctx.db
        .query("accountingPeriods")
        .withIndex("by_company_status", (q) =>
          q.eq("companyId", take.companyId).eq("status", "open"))
        .collect();
      const period = periods.find((p: any) => take.takeDate >= p.startDate && take.takeDate <= p.endDate);
      if (!period) throw new Error(`لا توجد فترة محاسبية مفتوحة بتاريخ ${take.takeDate}`);

      // Net variance value: positive = excess, negative = shortage
      const netVariance = take.totalVarianceValue;

      const lines: any[] = [];
      if (netVariance > 0) {
        // Excess: Dr Inventory, Cr Variance income
        lines.push({
          accountId: args.inventoryAccountId,
          description: `Stock take excess - ${take.takeNumber}`,
          debit: netVariance, credit: 0,
        });
        lines.push({
          accountId: args.varianceAccountId,
          description: `Stock take excess - ${take.takeNumber}`,
          debit: 0, credit: netVariance,
        });
      } else if (netVariance < 0) {
        // Shortage: Dr Variance expense, Cr Inventory
        const amt = Math.abs(netVariance);
        lines.push({
          accountId: args.varianceAccountId,
          description: `Stock take shortage - ${take.takeNumber}`,
          debit: amt, credit: 0,
        });
        lines.push({
          accountId: args.inventoryAccountId,
          description: `Stock take shortage - ${take.takeNumber}`,
          debit: 0, credit: amt,
        });
      }

      if (lines.length > 0) {
        // Get default currency
        const defaultCurrency = await ctx.db.query("currencies").first();
        const currencyId = defaultCurrency?._id;
        if (!currencyId) throw new Error("لا توجد عملة افتراضية في النظام");

        journalEntryId = await postJournalEntry(
          ctx,
          {
            companyId: take.companyId,
            branchId: take.branchId,
            journalType: "adjustment",
            entryDate: take.takeDate,
            periodId: period._id,
            currencyId,
            exchangeRate: 1,
            sourceType: "stockTake",
            sourceId: take._id,
            description: `تسوية جرد المخزون - ${take.takeNumber}`,
            isAutoGenerated: true,
            createdBy: args.userId,
          },
          lines
        );

        // Update stockBalance for each line that has variance
        const stkLines = await ctx.db
          .query("stockTakeLines")
          .withIndex("by_take", (q) => q.eq("takeId", args.takeId))
          .collect();
        for (const line of stkLines) {
          if (!line.counted || line.variance === 0) continue;
          const bal = await ctx.db
            .query("stockBalance")
            .withIndex("by_item_warehouse", (q) =>
              q.eq("itemId", line.itemId).eq("warehouseId", take.warehouseId))
            .first();
          if (bal) {
            const newQty = bal.quantity + line.variance;
            const newValue = newQty * bal.avgCost;
            await ctx.db.patch(bal._id, {
              quantity: newQty,
              totalValue: newValue,
              lastUpdated: Date.now(),
            });
          }
        }
      }
    }

    await ctx.db.patch(args.takeId, {
      status: "completed",
      reviewedBy: args.userId,
      reviewedAt: Date.now(),
      adjustmentJournalEntryId: journalEntryId,
      adjustmentCreated: !!journalEntryId,
    });

    await logAudit(ctx, {
      companyId: take.companyId,
      userId: args.userId,
      action: "approve",
      module: "inventory",
      documentType: "stockTake",
      documentId: String(args.takeId),
    });
  },
});

// ─── Admin: Reject (back to in_progress) ──────────────────────────────────
export const rejectStockTake = mutation({
  args: {
    takeId: v.id("stockTakes"),
    reason: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const take = await ctx.db.get(args.takeId);
    if (!take) throw new Error("الجرد غير موجود");
    if (take.status !== "pending_review") {
      throw new Error("يمكن رفض الجرد فقط أثناء المراجعة");
    }
    await assertUserPermission(ctx, args.userId, "inventory", "post");

    await ctx.db.patch(args.takeId, {
      status: "in_progress",
      rejectionReason: args.reason,
      reviewedBy: args.userId,
      reviewedAt: Date.now(),
    });
  },
});

// ─── Cancel (admin or creator while not completed) ────────────────────────
export const cancelStockTake = mutation({
  args: { takeId: v.id("stockTakes"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const take = await ctx.db.get(args.takeId);
    if (!take) throw new Error("الجرد غير موجود");
    if (take.status === "completed") {
      throw new Error("لا يمكن إلغاء جرد مكتمل");
    }
    await assertUserPermission(ctx, args.userId, "inventory", "edit");

    await ctx.db.patch(args.takeId, { status: "cancelled" });
  },
});

// ─── Delete a draft (header + lines) ──────────────────────────────────────
export const deleteStockTake = mutation({
  args: { takeId: v.id("stockTakes"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const take = await ctx.db.get(args.takeId);
    if (!take) throw new Error("الجرد غير موجود");
    if (take.status !== "draft" && take.status !== "cancelled") {
      throw new Error("يمكن حذف المسودات أو الملغية فقط");
    }
    await assertUserPermission(ctx, args.userId, "inventory", "delete");

    const lines = await ctx.db
      .query("stockTakeLines")
      .withIndex("by_take", (q) => q.eq("takeId", args.takeId))
      .collect();
    for (const l of lines) await ctx.db.delete(l._id);
    await ctx.db.delete(args.takeId);
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER — Recompute header totals from lines
// ═══════════════════════════════════════════════════════════════════════════
async function recomputeTakeTotals(ctx: any, takeId: any) {
  const lines = await ctx.db
    .query("stockTakeLines")
    .withIndex("by_take", (q: any) => q.eq("takeId", takeId))
    .collect();

  let countedItems = 0;
  let itemsWithVariance = 0;
  let totalVarianceQty = 0;
  let totalVarianceValue = 0;
  let shortageValue = 0;
  let excessValue = 0;

  for (const l of lines) {
    if (l.counted) {
      countedItems++;
      if (l.variance !== 0) itemsWithVariance++;
      totalVarianceQty   += l.variance;
      totalVarianceValue += l.varianceValue;
      if (l.varianceValue < 0) shortageValue += Math.abs(l.varianceValue);
      else if (l.varianceValue > 0) excessValue += l.varianceValue;
    }
  }

  await ctx.db.patch(takeId, {
    countedItems,
    itemsWithVariance,
    totalVarianceQty: Math.round(totalVarianceQty * 100) / 100,
    totalVarianceValue: Math.round(totalVarianceValue * 100) / 100,
    shortageValue: Math.round(shortageValue * 100) / 100,
    excessValue:   Math.round(excessValue * 100) / 100,
  });
}
