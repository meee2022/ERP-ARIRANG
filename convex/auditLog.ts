import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { logAudit } from "./lib/audit";
import { assertUserPermission } from "./lib/permissions";

// ─── LOG ACTION MUTATION ──────────────────────────────────────────────────────

export const logAction = mutation({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    action: v.string(),
    module: v.string(),
    documentType: v.optional(v.string()),
    documentId: v.optional(v.string()),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await logAudit(ctx, args);
    return { success: true };
  },
});

// ─── GET AUDIT LOGS ───────────────────────────────────────────────────────────

export const getAuditLogs = query({
  args: {
    companyId: v.id("companies"),
    requesterUserId: v.id("users"),
    module: v.optional(v.string()),
    action: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    fromTimestamp: v.optional(v.number()),
    toTimestamp: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertUserPermission(ctx, args.requesterUserId, "settings", "view");
    let logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .take(args.limit ?? 200);

    if (args.module) {
      logs = logs.filter((l) => l.module === args.module);
    }
    if (args.action) {
      logs = logs.filter((l) => l.action === args.action);
    }
    if (args.userId) {
      logs = logs.filter((l) => l.userId === args.userId);
    }
    if (args.fromTimestamp) {
      logs = logs.filter((l) => l.timestamp >= args.fromTimestamp!);
    }
    if (args.toTimestamp) {
      logs = logs.filter((l) => l.timestamp <= args.toTimestamp!);
    }

    // Enrich with user name
    return Promise.all(
      logs.map(async (log) => {
        const user = await ctx.db.get(log.userId);
        return {
          ...log,
          userName: user?.name ?? "—",
          userEmail: user?.email ?? "—",
        };
      })
    );
  },
});
