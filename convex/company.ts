/**
 * company.ts — Central company settings mutations & queries.
 *
 * Provides a single source of truth for company branding data
 * (name, logo, address, phone, tax number) used across the entire system:
 * print pages, PDF documents, reports, and the top nav.
 */
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { assertUserPermission } from "./lib/permissions";

/* ── Queries ──────────────────────────────────────────────────────── */

/**
 * Returns the first (and only) company record in the DB.
 * All authenticated pages call this via useCompanySettings().
 */
export const getCompany = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (args.userId) {
      await assertUserPermission(ctx, args.userId, "settings", "view");
    }
    const companies = await ctx.db.query("companies").collect();
    return companies[0] ?? null;
  },
});

/* ── Mutations ────────────────────────────────────────────────────── */

/**
 * Update editable company branding fields.
 * Only patches fields that are explicitly passed (undefined = untouched).
 */
export const updateCompany = mutation({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    nameAr: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    taxNumber: v.optional(v.string()),
  },
  handler: async (ctx, { companyId, userId, ...fields }) => {
    await assertUserPermission(ctx, userId, "settings", "edit");
    // Build a patch object with only the keys the caller provided
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) patch[k] = v;
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(companyId, patch);
    }
    return companyId;
  },
});

/**
 * Generate a short-lived upload URL for uploading a company logo
 * directly from the browser to Convex storage.
 * After the upload completes the client calls saveLogoUrl to persist.
 */
export const generateLogoUploadUrl = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await assertUserPermission(ctx, args.userId, "settings", "edit");
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * After a successful upload, retrieve the permanent public URL
 * from Convex storage and persist it on the company record.
 */
export const saveLogoUrl = mutation({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    storageId: v.string(),
  },
  handler: async (ctx, { companyId, userId, storageId }) => {
    await assertUserPermission(ctx, userId, "settings", "edit");
    const url = await ctx.storage.getUrl(storageId as any);
    if (!url) throw new Error("Failed to get URL for uploaded logo");
    await ctx.db.patch(companyId, { logoUrl: url });
    return url;
  },
});

/**
 * Remove the company logo (set logoUrl to undefined).
 */
export const removeLogo = mutation({
  args: { companyId: v.id("companies"), userId: v.id("users") },
  handler: async (ctx, { companyId, userId }) => {
    await assertUserPermission(ctx, userId, "settings", "edit");
    await ctx.db.patch(companyId, { logoUrl: undefined });
  },
});
