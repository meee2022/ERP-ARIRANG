// @ts-nocheck
/**
 * Production Requests + Plans Module
 * ─────────────────────────────────────────────────────────────────────────────
 * Workflow:
 *   Sales reps submit daily production requests for items they need produced.
 *   Production manager sees an aggregated view (item × total + per-rep breakdown),
 *   adjusts quantities, and approves into a Plan.
 *   Optionally converts the Plan into actual Production Orders.
 *
 * Tables: productionRequests, productionRequestLines, productionPlans, productionPlanLines
 */
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Constants ────────────────────────────────────────────────────────────────
// Daily deadline for sales reps to submit requests (24-h, branch local time).
// After this hour passes for the production date, requests are auto-locked.
const DEFAULT_DEADLINE_HOUR = 18; // 6:00 PM

// ─── Helpers ──────────────────────────────────────────────────────────────────
function nowMs() { return Date.now(); }

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

/** Generate next sequential number — PR-001-2026 / PP-001-2026 */
async function nextSequence(ctx: any, prefix: string, branchId: string) {
  const year = new Date().getFullYear();
  const tableName = prefix === "PR" ? "productionRequests" : "productionPlans";
  const all = await ctx.db
    .query(tableName)
    .withIndex("by_branch", (q: any) => q.eq("branchId", branchId))
    .collect();
  const yearPrefix = `${prefix}-`;
  const yearSuffix = `-${year}`;
  let max = 0;
  for (const r of all) {
    const num: string = r.requestNumber ?? r.planNumber ?? "";
    if (num.startsWith(yearPrefix) && num.endsWith(yearSuffix)) {
      const n = parseInt(num.slice(yearPrefix.length, num.length - yearSuffix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  const next = String(max + 1).padStart(3, "0");
  return `${prefix}-${next}-${year}`;
}

/** Check if requests for productionDate are locked (past deadline or in past) */
function isLockedForDate(productionDate: string, deadlineHour = DEFAULT_DEADLINE_HOUR) {
  const today = todayISO();
  // Past dates → locked
  if (productionDate < today) return true;
  // Today → locked if hour passed deadline
  if (productionDate === today) {
    const now = new Date();
    if (now.getHours() >= deadlineHour) return true;
  }
  return false;
}

// ═════════════════════════════════════════════════════════════════════════════
// QUERIES — Sales Rep
// ═════════════════════════════════════════════════════════════════════════════

/** Get all my requests with their lines. */
export const getMyRequests = query({
  args: {
    salesRepId: v.id("salesReps"),
    fromDate: v.optional(v.string()),
    toDate:   v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let requests = await ctx.db
      .query("productionRequests")
      .withIndex("by_rep_date", (q) => q.eq("salesRepId", args.salesRepId))
      .collect();

    if (args.fromDate) requests = requests.filter((r) => r.productionDate >= args.fromDate!);
    if (args.toDate)   requests = requests.filter((r) => r.productionDate <= args.toDate!);

    requests.sort((a, b) => b.productionDate.localeCompare(a.productionDate));

    // Attach lines
    const enriched = await Promise.all(requests.map(async (r) => {
      const lines = await ctx.db
        .query("productionRequestLines")
        .withIndex("by_request", (q) => q.eq("requestId", r._id))
        .collect();
      const linesWithItems = await Promise.all(lines.map(async (l) => {
        const item = await ctx.db.get(l.itemId);
        return {
          ...l,
          itemCode:  (item as any)?.code   ?? "",
          itemNameAr: (item as any)?.nameAr ?? "",
          itemNameEn: (item as any)?.nameEn ?? "",
        };
      }));
      const totalQty = linesWithItems.reduce((s, l) => s + l.requestedQty, 0);
      return {
        ...r,
        lines: linesWithItems,
        lineCount: linesWithItems.length,
        totalQty,
        isLocked: isLockedForDate(r.productionDate),
      };
    }));

    return enriched;
  },
});

/** Get one request with full details (for editing). */
export const getRequestById = query({
  args: { requestId: v.id("productionRequests") },
  handler: async (ctx, { requestId }) => {
    const req = await ctx.db.get(requestId);
    if (!req) return null;
    const lines = await ctx.db
      .query("productionRequestLines")
      .withIndex("by_request", (q) => q.eq("requestId", requestId))
      .collect();
    const linesWithItems = await Promise.all(lines.map(async (l) => {
      const item = await ctx.db.get(l.itemId);
      return {
        ...l,
        itemCode:  (item as any)?.code   ?? "",
        itemNameAr: (item as any)?.nameAr ?? "",
        itemNameEn: (item as any)?.nameEn ?? "",
      };
    }));
    return { ...req, lines: linesWithItems, isLocked: isLockedForDate(req.productionDate) };
  },
});

/** Get the rep's existing draft/submitted request for a date (returns null if none). */
export const getMyRequestForDate = query({
  args: {
    salesRepId:     v.id("salesReps"),
    productionDate: v.string(),
  },
  handler: async (ctx, args) => {
    const reqs = await ctx.db
      .query("productionRequests")
      .withIndex("by_rep_date", (q) =>
        q.eq("salesRepId", args.salesRepId).eq("productionDate", args.productionDate))
      .collect();
    // Return the first non-cancelled request (one rep should have one per date)
    const active = reqs.find((r) => r.status !== "cancelled");
    if (!active) return null;
    const lines = await ctx.db
      .query("productionRequestLines")
      .withIndex("by_request", (q) => q.eq("requestId", active._id))
      .collect();
    const linesWithItems = await Promise.all(lines.map(async (l) => {
      const item = await ctx.db.get(l.itemId);
      return {
        ...l,
        itemCode:  (item as any)?.code   ?? "",
        itemNameAr: (item as any)?.nameAr ?? "",
        itemNameEn: (item as any)?.nameEn ?? "",
      };
    }));
    return { ...active, lines: linesWithItems, isLocked: isLockedForDate(active.productionDate) };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// MUTATIONS — Sales Rep
// ═════════════════════════════════════════════════════════════════════════════

/** Create or update a request (upsert by salesRep+date). Stays as draft. */
export const upsertRequest = mutation({
  args: {
    companyId:      v.id("companies"),
    branchId:       v.id("branches"),
    salesRepId:     v.id("salesReps"),
    productionDate: v.string(),
    notes:          v.optional(v.string()),
    createdBy:      v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (isLockedForDate(args.productionDate)) {
      throw new Error("Cannot create/edit request: deadline has passed for this date");
    }

    // Look for existing active request for this rep+date
    const existing = await ctx.db
      .query("productionRequests")
      .withIndex("by_rep_date", (q) =>
        q.eq("salesRepId", args.salesRepId).eq("productionDate", args.productionDate))
      .collect();
    const active = existing.find((r) => r.status === "draft" || r.status === "submitted");
    if (active) {
      if (active.status === "consolidated") {
        throw new Error("This request is already consolidated and cannot be edited");
      }
      await ctx.db.patch(active._id, {
        notes: args.notes,
        updatedAt: nowMs(),
      });
      return active._id;
    }

    const requestNumber = await nextSequence(ctx, "PR", args.branchId);
    const id = await ctx.db.insert("productionRequests", {
      companyId:      args.companyId,
      branchId:       args.branchId,
      requestNumber,
      salesRepId:     args.salesRepId,
      productionDate: args.productionDate,
      status:         "draft",
      notes:          args.notes,
      createdBy:      args.createdBy,
      createdAt:      nowMs(),
      updatedAt:      nowMs(),
    });
    return id;
  },
});

/** Add or update a line in a request. */
export const upsertRequestLine = mutation({
  args: {
    requestId:    v.id("productionRequests"),
    lineId:       v.optional(v.id("productionRequestLines")),  // omit to insert
    itemId:       v.id("items"),
    requestedQty: v.number(),
    uomId:        v.optional(v.id("unitOfMeasure")),
    notes:        v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new Error("Request not found");
    if (req.status === "consolidated") throw new Error("Request is locked (consolidated)");
    if (isLockedForDate(req.productionDate)) throw new Error("Deadline has passed");
    if (args.requestedQty <= 0) throw new Error("Quantity must be greater than zero");

    if (args.lineId) {
      await ctx.db.patch(args.lineId, {
        itemId: args.itemId,
        requestedQty: args.requestedQty,
        uomId: args.uomId,
        notes: args.notes,
      });
      await ctx.db.patch(args.requestId, { updatedAt: nowMs() });
      return args.lineId;
    }

    const id = await ctx.db.insert("productionRequestLines", {
      requestId:    args.requestId,
      itemId:       args.itemId,
      requestedQty: args.requestedQty,
      uomId:        args.uomId,
      notes:        args.notes,
    });
    await ctx.db.patch(args.requestId, { updatedAt: nowMs() });
    return id;
  },
});

/** Remove a request line. */
export const removeRequestLine = mutation({
  args: { lineId: v.id("productionRequestLines") },
  handler: async (ctx, { lineId }) => {
    const line = await ctx.db.get(lineId);
    if (!line) return;
    const req = await ctx.db.get(line.requestId);
    if (req?.status === "consolidated") throw new Error("Request is locked (consolidated)");
    if (req && isLockedForDate(req.productionDate)) throw new Error("Deadline has passed");
    await ctx.db.delete(lineId);
    if (req) await ctx.db.patch(req._id, { updatedAt: nowMs() });
  },
});

/** Submit the request to production manager (status: draft → submitted). */
export const submitRequest = mutation({
  args: { requestId: v.id("productionRequests") },
  handler: async (ctx, { requestId }) => {
    const req = await ctx.db.get(requestId);
    if (!req) throw new Error("Request not found");
    if (req.status !== "draft" && req.status !== "submitted") {
      throw new Error(`Cannot submit a request that is ${req.status}`);
    }
    if (isLockedForDate(req.productionDate)) {
      throw new Error("Deadline has passed — cannot submit");
    }
    const lines = await ctx.db
      .query("productionRequestLines")
      .withIndex("by_request", (q) => q.eq("requestId", requestId))
      .collect();
    if (lines.length === 0) throw new Error("Cannot submit an empty request");
    await ctx.db.patch(requestId, {
      status: "submitted",
      submittedAt: nowMs(),
      updatedAt: nowMs(),
    });
  },
});

/** Pull back to draft (rep wants to edit again before deadline). */
export const reopenRequest = mutation({
  args: { requestId: v.id("productionRequests") },
  handler: async (ctx, { requestId }) => {
    const req = await ctx.db.get(requestId);
    if (!req) throw new Error("Request not found");
    if (req.status === "consolidated") throw new Error("Already consolidated by manager");
    if (isLockedForDate(req.productionDate)) throw new Error("Deadline has passed");
    await ctx.db.patch(requestId, { status: "draft", updatedAt: nowMs() });
  },
});

/** Cancel a request entirely. */
export const cancelRequest = mutation({
  args: { requestId: v.id("productionRequests") },
  handler: async (ctx, { requestId }) => {
    const req = await ctx.db.get(requestId);
    if (!req) throw new Error("Request not found");
    if (req.status === "consolidated") throw new Error("Already consolidated — cannot cancel");
    await ctx.db.patch(requestId, { status: "cancelled", updatedAt: nowMs() });
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// QUERIES — Production Manager
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Get the aggregated view of all submitted requests for a given production date.
 * Returns:
 *   - rows: each item with totalRequested + per-rep breakdown
 *   - requests: the full submitted requests
 *   - kpis: totals for dashboard
 */
export const getAggregatedView = query({
  args: {
    branchId:       v.id("branches"),
    productionDate: v.string(),
  },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("productionRequests")
      .withIndex("by_branch_date", (q) =>
        q.eq("branchId", args.branchId).eq("productionDate", args.productionDate))
      .collect();

    // Only include submitted (and not yet consolidated)
    const eligible = requests.filter((r) => r.status === "submitted");

    if (eligible.length === 0) {
      return {
        rows: [],
        requests: [],
        kpis: {
          requestCount: 0,
          repCount: 0,
          itemCount: 0,
          totalQty: 0,
          isLocked: isLockedForDate(args.productionDate),
        },
      };
    }

    // Fetch all reps in one go
    const repIds = [...new Set(eligible.map((r) => r.salesRepId))];
    const reps = await Promise.all(repIds.map((id) => ctx.db.get(id as any)));
    const repById = new Map(repIds.map((id, i) => [id as string, reps[i]]));

    // Build aggregate by item
    const itemMap = new Map<string, {
      itemId: string;
      itemCode: string;
      itemNameAr: string;
      itemNameEn: string;
      totalRequestedQty: number;
      uomId: string | null;
      breakdown: Array<{
        repId: string;
        repCode: string;
        repName: string;
        requestId: string;
        requestNumber: string;
        qty: number;
        notes: string | null;
      }>;
    }>();

    const enrichedRequests: any[] = [];

    for (const req of eligible) {
      const lines = await ctx.db
        .query("productionRequestLines")
        .withIndex("by_request", (q) => q.eq("requestId", req._id))
        .collect();
      const rep: any = repById.get(req.salesRepId as string);
      const reqTotal = lines.reduce((s, l) => s + l.requestedQty, 0);
      enrichedRequests.push({
        ...req,
        repCode: rep?.code ?? "",
        repName: rep?.nameAr ?? "—",
        lineCount: lines.length,
        totalQty: reqTotal,
      });

      for (const line of lines) {
        const itemKey = line.itemId as string;
        if (!itemMap.has(itemKey)) {
          const item: any = await ctx.db.get(line.itemId);
          itemMap.set(itemKey, {
            itemId: itemKey,
            itemCode: item?.code ?? "",
            itemNameAr: item?.nameAr ?? "",
            itemNameEn: item?.nameEn ?? "",
            totalRequestedQty: 0,
            uomId: (line.uomId as string) ?? (item?.baseUomId as string) ?? null,
            breakdown: [],
          });
        }
        const agg = itemMap.get(itemKey)!;
        agg.totalRequestedQty += line.requestedQty;
        agg.breakdown.push({
          repId: req.salesRepId as string,
          repCode: rep?.code ?? "",
          repName: rep?.nameAr ?? "—",
          requestId: req._id as string,
          requestNumber: req.requestNumber,
          qty: line.requestedQty,
          notes: line.notes ?? null,
        });
      }
    }

    const rows = Array.from(itemMap.values()).sort(
      (a, b) => b.totalRequestedQty - a.totalRequestedQty
    );

    const totalQty = rows.reduce((s, r) => s + r.totalRequestedQty, 0);

    return {
      rows,
      requests: enrichedRequests,
      kpis: {
        requestCount: eligible.length,
        repCount: repIds.length,
        itemCount: rows.length,
        totalQty,
        isLocked: isLockedForDate(args.productionDate),
      },
    };
  },
});

/** Get an existing draft Plan for a date (so manager can resume). */
export const getDraftPlan = query({
  args: {
    branchId:       v.id("branches"),
    productionDate: v.string(),
  },
  handler: async (ctx, args) => {
    const plans = await ctx.db
      .query("productionPlans")
      .withIndex("by_branch_date", (q) =>
        q.eq("branchId", args.branchId).eq("productionDate", args.productionDate))
      .collect();
    const draft = plans.find((p) => p.status === "draft");
    if (!draft) return null;
    const lines = await ctx.db
      .query("productionPlanLines")
      .withIndex("by_plan", (q) => q.eq("planId", draft._id))
      .collect();
    return { ...draft, lines };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// MUTATIONS — Production Manager
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Approve a Plan from the aggregated view.
 * - Creates a productionPlan
 * - Creates productionPlanLines from provided items
 * - Marks the source requests as "consolidated"
 * - If convertToOrders=true, also creates productionOrders for each line that has a recipe
 */
export const approvePlan = mutation({
  args: {
    companyId:      v.id("companies"),
    branchId:       v.id("branches"),
    productionDate: v.string(),
    notes:          v.optional(v.string()),
    approvedBy:     v.optional(v.id("users")),
    convertToOrders: v.boolean(),
    lines: v.array(v.object({
      itemId:            v.id("items"),
      totalRequestedQty: v.number(),
      approvedQty:       v.number(),
      uomId:             v.optional(v.id("unitOfMeasure")),
      recipeId:          v.optional(v.id("recipes")),
      sourceRequestIds:  v.array(v.id("productionRequests")),
      notes:             v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    if (args.lines.length === 0) {
      throw new Error("Cannot approve an empty plan");
    }

    const planNumber = await nextSequence(ctx, "PP", args.branchId);
    const totalRequestedQty = args.lines.reduce((s, l) => s + l.totalRequestedQty, 0);
    const totalApprovedQty  = args.lines.reduce((s, l) => s + l.approvedQty, 0);

    // Collect all unique source request IDs
    const allSourceIds = new Set<string>();
    for (const l of args.lines) {
      for (const id of l.sourceRequestIds) allSourceIds.add(id as string);
    }

    const planId = await ctx.db.insert("productionPlans", {
      companyId:         args.companyId,
      branchId:          args.branchId,
      planNumber,
      productionDate:    args.productionDate,
      status:            args.convertToOrders ? "converted" : "approved",
      totalRequestedQty,
      totalApprovedQty,
      requestCount:      allSourceIds.size,
      notes:             args.notes,
      approvedBy:        args.approvedBy,
      approvedAt:        nowMs(),
      convertedAt:       args.convertToOrders ? nowMs() : undefined,
      createdBy:         args.approvedBy,
      createdAt:         nowMs(),
      updatedAt:         nowMs(),
    });

    // Insert plan lines
    for (let i = 0; i < args.lines.length; i++) {
      const l = args.lines[i];
      let productionOrderId: any = undefined;

      // Optionally create a Production Order for this line
      if (args.convertToOrders && l.approvedQty > 0 && l.recipeId) {
        const recipe: any = await ctx.db.get(l.recipeId);
        if (recipe) {
          const orderNumber = `PO-${planNumber}-${String(i + 1).padStart(2, "0")}`;
          productionOrderId = await ctx.db.insert("productionOrders", {
            companyId:    args.companyId,
            branchId:     args.branchId,
            orderNumber,
            recipeId:     l.recipeId,
            outputItemId: recipe.outputItemId ?? l.itemId,
            plannedQty:   l.approvedQty,
            yieldUomId:   l.uomId ?? recipe.yieldUomId,
            plannedDate:  args.productionDate,
            status:       "planned",
            notes:        `Auto-generated from plan ${planNumber}`,
            createdBy:    args.approvedBy,
            createdAt:    nowMs(),
            updatedAt:    nowMs(),
          });
        }
      }

      await ctx.db.insert("productionPlanLines", {
        planId,
        itemId:            l.itemId,
        totalRequestedQty: l.totalRequestedQty,
        approvedQty:       l.approvedQty,
        uomId:             l.uomId,
        recipeId:          l.recipeId,
        productionOrderId,
        sourceRequestIds:  l.sourceRequestIds,
        notes:             l.notes,
        sortOrder:         i,
      });
    }

    // Mark source requests as consolidated
    for (const reqId of allSourceIds) {
      await ctx.db.patch(reqId as any, {
        status:             "consolidated",
        consolidatedAt:     nowMs(),
        consolidatedPlanId: planId,
        updatedAt:          nowMs(),
      });
    }

    // ── Generate distribution records (per-rep allocation) ──────────────────
    // For each plan line, find each rep's contribution and allocate proportionally
    const planLinesAll = await ctx.db
      .query("productionPlanLines")
      .withIndex("by_plan", (q) => q.eq("planId", planId))
      .collect();

    for (const planLine of planLinesAll) {
      const sourceReqs = planLine.sourceRequestIds as string[];
      if (sourceReqs.length === 0) continue;

      // Build per-rep contribution — merge same rep across multiple requests
      const repMap = new Map<string, { repId: string; requestId: string; requestedQty: number }>();

      for (const reqId of sourceReqs) {
        const req: any = await ctx.db.get(reqId as any);
        if (!req) continue;
        const reqLines = await ctx.db
          .query("productionRequestLines")
          .withIndex("by_request", (q) => q.eq("requestId", reqId as any))
          .collect();
        const matchLine = reqLines.find((l) => (l.itemId as string) === (planLine.itemId as string));
        if (matchLine) {
          const repId = req.salesRepId as string;
          if (repMap.has(repId)) {
            repMap.get(repId)!.requestedQty += matchLine.requestedQty;
          } else {
            repMap.set(repId, { repId, requestId: reqId, requestedQty: matchLine.requestedQty });
          }
        }
      }

      const repContribs = Array.from(repMap.values());
      const totalContrib = repContribs.reduce((s, r) => s + r.requestedQty, 0);

      for (const contrib of repContribs) {
        // If production covered all requests → give each rep exactly what they asked for
        // If shortage → proportional allocation
        const allocatedQty = planLine.approvedQty >= totalContrib
          ? contrib.requestedQty
          : Math.round(planLine.approvedQty * (contrib.requestedQty / totalContrib) * 100) / 100;
        if (allocatedQty <= 0) continue;

        await ctx.db.insert("productionDistributions", {
          planId,
          planLineId:   planLine._id,
          salesRepId:   contrib.repId as any,
          requestId:    contrib.requestId as any,
          itemId:       planLine.itemId,
          uomId:        planLine.uomId,
          requestedQty: contrib.requestedQty,
          allocatedQty,
          status:       "pending",
          createdAt:    nowMs(),
        });
      }
    }

    return { planId, planNumber, ordersCreated: args.convertToOrders };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// QUERIES — Plans History
// ═════════════════════════════════════════════════════════════════════════════

export const listPlans = query({
  args: {
    branchId: v.id("branches"),
    fromDate: v.optional(v.string()),
    toDate:   v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let plans = await ctx.db
      .query("productionPlans")
      .withIndex("by_branch", (q) => q.eq("branchId", args.branchId))
      .collect();
    if (args.fromDate) plans = plans.filter((p) => p.productionDate >= args.fromDate!);
    if (args.toDate)   plans = plans.filter((p) => p.productionDate <= args.toDate!);
    plans.sort((a, b) => b.productionDate.localeCompare(a.productionDate));
    return plans;
  },
});

export const getPlanById = query({
  args: { planId: v.id("productionPlans") },
  handler: async (ctx, { planId }) => {
    const plan = await ctx.db.get(planId);
    if (!plan) return null;
    const lines = await ctx.db
      .query("productionPlanLines")
      .withIndex("by_plan", (q) => q.eq("planId", planId))
      .collect();
    const enriched = await Promise.all(lines.map(async (l) => {
      const item: any = await ctx.db.get(l.itemId);
      return {
        ...l,
        itemCode:  item?.code ?? "",
        itemNameAr: item?.nameAr ?? "",
        itemNameEn: item?.nameEn ?? "",
      };
    }));
    return { ...plan, lines: enriched };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// UTILITY: Default deadline info (for UI)
// ═════════════════════════════════════════════════════════════════════════════

export const getDeadlineInfo = query({
  args: { productionDate: v.string() },
  handler: async (_ctx, { productionDate }) => {
    return {
      deadlineHour: DEFAULT_DEADLINE_HOUR,
      isLocked: isLockedForDate(productionDate),
      today: todayISO(),
      tomorrow: tomorrowISO(),
    };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// DISTRIBUTION — Queries
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Get full distribution sheet for a plan.
 * Returns rows grouped by salesRep, each with items and their allocations.
 */
export const getDistributionSheet = query({
  args: { planId: v.id("productionPlans") },
  handler: async (ctx, { planId }) => {
    const plan = await ctx.db.get(planId);
    if (!plan) return null;

    const dists = await ctx.db
      .query("productionDistributions")
      .withIndex("by_plan", (q) => q.eq("planId", planId))
      .collect();

    if (dists.length === 0) return { plan, reps: [], totals: { pending: 0, dispatched: 0, confirmed: 0, total: 0 } };

    // Group by rep
    const repMap = new Map<string, {
      repId: string; repCode: string; repName: string; repNameEn: string;
      items: any[]; totalRequested: number; totalAllocated: number;
      allDispatched: boolean; allConfirmed: boolean;
    }>();

    for (const d of dists) {
      const repId = d.salesRepId as string;
      if (!repMap.has(repId)) {
        const rep: any = await ctx.db.get(d.salesRepId);
        repMap.set(repId, {
          repId,
          repCode: rep?.code ?? "",
          repName: rep?.nameAr ?? "—",
          repNameEn: rep?.nameEn || rep?.nameAr || "—",
          items: [],
          totalRequested: 0,
          totalAllocated: 0,
          allDispatched: true,
          allConfirmed: true,
        });
      }
      const repEntry = repMap.get(repId)!;
      const item: any = await ctx.db.get(d.itemId);
      const uom: any  = d.uomId ? await ctx.db.get(d.uomId) : null;

      repEntry.items.push({
        distributionId: d._id,
        itemId:        d.itemId,
        itemCode:      item?.code ?? "",
        itemNameAr:    item?.nameAr ?? "—",
        itemNameEn:    item?.nameEn || item?.nameAr || "—",
        uomNameAr:     uom?.nameAr ?? "",
        uomNameEn:     uom?.nameEn || uom?.nameAr || "",
        requestedQty:  d.requestedQty,
        allocatedQty:  d.allocatedQty,
        status:        d.status,
        dispatchedAt:  d.dispatchedAt,
        confirmedAt:   d.confirmedAt,
        notes:         d.notes,
      });
      repEntry.totalRequested += d.requestedQty;
      repEntry.totalAllocated += d.allocatedQty;
      if (d.status !== "dispatched" && d.status !== "confirmed") repEntry.allDispatched = false;
      if (d.status !== "confirmed") repEntry.allConfirmed = false;
    }

    const reps = Array.from(repMap.values()).sort((a, b) => a.repCode.localeCompare(b.repCode));

    const totals = {
      pending:    dists.filter((d) => d.status === "pending").length,
      dispatched: dists.filter((d) => d.status === "dispatched").length,
      confirmed:  dists.filter((d) => d.status === "confirmed").length,
      total:      dists.length,
    };

    return { plan, reps, totals };
  },
});

/**
 * Get my distribution items (what was allocated to me) — for the sales rep view.
 */
export const getMyDistributions = query({
  args: {
    salesRepId: v.id("salesReps"),
    fromDate:   v.optional(v.string()),
    toDate:     v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const dists = await ctx.db
      .query("productionDistributions")
      .withIndex("by_rep", (q) => q.eq("salesRepId", args.salesRepId))
      .collect();

    // Enrich with plan + item info
    const enriched = await Promise.all(dists.map(async (d) => {
      const plan: any = await ctx.db.get(d.planId);
      const item: any = await ctx.db.get(d.itemId);
      const uom: any  = d.uomId ? await ctx.db.get(d.uomId) : null;
      return {
        ...d,
        productionDate: plan?.productionDate ?? "",
        planNumber:     plan?.planNumber ?? "",
        itemCode:       item?.code ?? "",
        itemNameAr:     item?.nameAr ?? "—",
        itemNameEn:     item?.nameEn || item?.nameAr || "—",
        uomNameAr:      uom?.nameAr ?? "",
      };
    }));

    let result = enriched;
    if (args.fromDate) result = result.filter((d) => d.productionDate >= args.fromDate!);
    if (args.toDate)   result = result.filter((d) => d.productionDate <= args.toDate!);
    result.sort((a, b) => b.productionDate.localeCompare(a.productionDate));
    return result;
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// DISTRIBUTION — Mutations
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Reset + regenerate distributions for a plan.
 * Deletes existing records then recreates them with deduplication fix.
 */
export const resetDistributionsForPlan = mutation({
  args: { planId: v.id("productionPlans") },
  handler: async (ctx, { planId }) => {
    // Delete existing
    const existing = await ctx.db
      .query("productionDistributions")
      .withIndex("by_plan", (q) => q.eq("planId", planId))
      .collect();
    for (const d of existing) await ctx.db.delete(d._id);

    // Regenerate with deduplication
    const planLines = await ctx.db
      .query("productionPlanLines")
      .withIndex("by_plan", (q) => q.eq("planId", planId))
      .collect();

    let generated = 0;

    for (const planLine of planLines) {
      const sourceReqs = planLine.sourceRequestIds as string[];
      if (sourceReqs.length === 0) continue;

      const repMap = new Map<string, { repId: string; requestId: string; requestedQty: number }>();

      for (const reqId of sourceReqs) {
        const req: any = await ctx.db.get(reqId as any);
        if (!req) continue;
        const reqLines = await ctx.db
          .query("productionRequestLines")
          .withIndex("by_request", (q) => q.eq("requestId", reqId as any))
          .collect();
        const matchLine = reqLines.find((l) => (l.itemId as string) === (planLine.itemId as string));
        if (matchLine) {
          const repId = req.salesRepId as string;
          if (repMap.has(repId)) {
            repMap.get(repId)!.requestedQty += matchLine.requestedQty;
          } else {
            repMap.set(repId, { repId, requestId: reqId, requestedQty: matchLine.requestedQty });
          }
        }
      }

      const repContribs = Array.from(repMap.values());
      const totalContrib = repContribs.reduce((s, r) => s + r.requestedQty, 0);

      for (const contrib of repContribs) {
        const allocatedQty = planLine.approvedQty >= totalContrib
          ? contrib.requestedQty
          : Math.round(planLine.approvedQty * (contrib.requestedQty / totalContrib) * 100) / 100;
        if (allocatedQty <= 0) continue;

        await ctx.db.insert("productionDistributions", {
          planId,
          planLineId:   planLine._id,
          salesRepId:   contrib.repId   as any,
          requestId:    contrib.requestId as any,
          itemId:       planLine.itemId,
          uomId:        planLine.uomId,
          requestedQty: contrib.requestedQty,
          allocatedQty,
          status:       "pending",
          createdAt:    nowMs(),
        });
        generated++;
      }
    }

    return { deleted: existing.length, generated };
  },
});

/**
 * Backfill: generate distribution records for an existing plan that was approved
 * before the distribution feature was added. Safe to call multiple times —
 * skips if distributions already exist.
 */
export const generateDistributionsForPlan = mutation({
  args: { planId: v.id("productionPlans") },
  handler: async (ctx, { planId }) => {
    // Skip if already generated
    const existing = await ctx.db
      .query("productionDistributions")
      .withIndex("by_plan", (q) => q.eq("planId", planId))
      .collect();
    if (existing.length > 0) return { generated: 0, skipped: true };

    const planLines = await ctx.db
      .query("productionPlanLines")
      .withIndex("by_plan", (q) => q.eq("planId", planId))
      .collect();

    let generated = 0;

    for (const planLine of planLines) {
      const sourceReqs = planLine.sourceRequestIds as string[];
      if (sourceReqs.length === 0) continue;

      // Merge same rep across multiple requests → one entry per rep per item
      const repMap = new Map<string, { repId: string; requestId: string; requestedQty: number }>();

      for (const reqId of sourceReqs) {
        const req: any = await ctx.db.get(reqId as any);
        if (!req) continue;
        const reqLines = await ctx.db
          .query("productionRequestLines")
          .withIndex("by_request", (q) => q.eq("requestId", reqId as any))
          .collect();
        const matchLine = reqLines.find((l) => (l.itemId as string) === (planLine.itemId as string));
        if (matchLine) {
          const repId = req.salesRepId as string;
          if (repMap.has(repId)) {
            repMap.get(repId)!.requestedQty += matchLine.requestedQty;
          } else {
            repMap.set(repId, { repId, requestId: reqId, requestedQty: matchLine.requestedQty });
          }
        }
      }

      const repContribs = Array.from(repMap.values());
      const totalContrib = repContribs.reduce((s, r) => s + r.requestedQty, 0);

      for (const contrib of repContribs) {
        const allocatedQty = planLine.approvedQty >= totalContrib
          ? contrib.requestedQty
          : Math.round(planLine.approvedQty * (contrib.requestedQty / totalContrib) * 100) / 100;
        if (allocatedQty <= 0) continue;

        await ctx.db.insert("productionDistributions", {
          planId,
          planLineId:   planLine._id,
          salesRepId:   contrib.repId   as any,
          requestId:    contrib.requestId as any,
          itemId:       planLine.itemId,
          uomId:        planLine.uomId,
          requestedQty: contrib.requestedQty,
          allocatedQty,
          status:       "pending",
          createdAt:    nowMs(),
        });
        generated++;
      }
    }

    return { generated, skipped: false };
  },
});

/** Manager marks items as dispatched to a rep. */
export const markDispatched = mutation({
  args: {
    distributionIds: v.array(v.id("productionDistributions")),
  },
  handler: async (ctx, { distributionIds }) => {
    const now = nowMs();
    for (const id of distributionIds) {
      await ctx.db.patch(id, { status: "dispatched", dispatchedAt: now });
    }
    return { updated: distributionIds.length };
  },
});

/** Rep confirms they received their items. */
export const confirmReceipt = mutation({
  args: {
    distributionIds: v.array(v.id("productionDistributions")),
  },
  handler: async (ctx, { distributionIds }) => {
    const now = nowMs();
    for (const id of distributionIds) {
      const d = await ctx.db.get(id);
      if (!d) continue;
      if (d.status === "pending") throw new Error("Items not dispatched yet");
      await ctx.db.patch(id, { status: "confirmed", confirmedAt: now });
    }
    return { confirmed: distributionIds.length };
  },
});
