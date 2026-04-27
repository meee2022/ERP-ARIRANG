/**
 * seedDemoItems — Idempotent demo items seed for testing
 *
 * Creates:
 *  - 1 Unit of Measure (piece / قطعة) if not already existing
 *  - 1 Item Category (general / عام)
 *  - 6 demo items with codes, names, costs
 *
 * Safe to run multiple times (skips existing items by code).
 * Demo-only — requires company email to end with @demo.local.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const seedDemoItems = mutation({
  args: {},
  handler: async (ctx) => {
    const company = await ctx.db.query("companies").first();
    if (!company) return { error: "No company found — run seedInitialData first" };

    // Production guard
    if (!company.email?.endsWith("@demo.local")) {
      return { error: "This mutation only runs on demo deployments" };
    }

    const results: string[] = [];

    // ── 1. Ensure a UoM exists ────────────────────────────────────────────────
    let uom = await ctx.db.query("unitOfMeasure").first();
    if (!uom) {
      const uomId = await ctx.db.insert("unitOfMeasure", {
        code: "PCS",
        nameAr: "قطعة",
        nameEn: "Piece",
        isBase: true,
        companyId: company._id,
        isActive: true,
        conversionFactor: 1,
      });
      uom = await ctx.db.get(uomId) as any;
      results.push("✅ Created UoM: PCS / قطعة");
    } else {
      results.push(`ℹ️ UoM exists: ${uom.code}`);
    }

    // ── 2. Ensure a category exists ───────────────────────────────────────────
    let category = await ctx.db
      .query("itemCategories")
      .filter((q) => q.eq(q.field("companyId"), company._id))
      .first();
    if (!category) {
      const catId = await ctx.db.insert("itemCategories", {
        code: "GEN",
        nameAr: "عام",
        nameEn: "General",
        companyId: company._id,
        isActive: true,
      });
      category = await ctx.db.get(catId) as any;
      results.push("✅ Created category: GEN / عام");
    } else {
      results.push(`ℹ️ Category exists: ${category.code}`);
    }

    // ── 3. Find inventory asset account ──────────────────────────────────────
    const inventoryAccount = await ctx.db
      .query("accounts")
      .filter((q) =>
        q.and(
          q.eq(q.field("companyId"), company._id),
          q.eq(q.field("operationalType"), "inventory_asset")
        )
      )
      .first();

    const cogsAccount = await ctx.db
      .query("accounts")
      .filter((q) =>
        q.and(
          q.eq(q.field("companyId"), company._id),
          q.eq(q.field("accountType"), "expense")
        )
      )
      .first();

    // ── 4. Demo items ─────────────────────────────────────────────────────────
    const DEMO_ITEMS = [
      {
        code: "DEMO-001",
        nameAr: "منتج تجريبي أول",
        nameEn: "Demo Product A",
        itemType: "finished_good" as const,
        standardCost: 50,
        sellingPrice: 75,
      },
      {
        code: "DEMO-002",
        nameAr: "منتج تجريبي ثاني",
        nameEn: "Demo Product B",
        itemType: "finished_good" as const,
        standardCost: 25,
        sellingPrice: 40,
      },
      {
        code: "DEMO-003",
        nameAr: "مواد خام أ",
        nameEn: "Raw Material A",
        itemType: "raw_material" as const,
        standardCost: 15,
        sellingPrice: 0,
      },
      {
        code: "DEMO-004",
        nameAr: "مواد خام ب",
        nameEn: "Raw Material B",
        itemType: "raw_material" as const,
        standardCost: 8,
        sellingPrice: 0,
      },
      {
        code: "DEMO-005",
        nameAr: "بضاعة للبيع أ",
        nameEn: "Merchandise A",
        itemType: "finished_good" as const,
        standardCost: 100,
        sellingPrice: 150,
      },
      {
        code: "DEMO-006",
        nameAr: "بضاعة للبيع ب",
        nameEn: "Merchandise B",
        itemType: "finished_good" as const,
        standardCost: 60,
        sellingPrice: 90,
      },
    ];

    let created = 0;
    let skipped = 0;

    for (const item of DEMO_ITEMS) {
      // Check if already exists
      const existing = await ctx.db
        .query("items")
        .filter((q) =>
          q.and(
            q.eq(q.field("companyId"), company._id),
            q.eq(q.field("code"), item.code)
          )
        )
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("items", {
        code: item.code,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        itemType: item.itemType,
        companyId: company._id,
        categoryId: category?._id as Id<"itemCategories"> | undefined,
        baseUomId: uom!._id as Id<"unitOfMeasure">,
        standardCost: item.standardCost,
        lastCost: item.standardCost,
        sellingPrice: item.sellingPrice || undefined,
        inventoryAccountId: inventoryAccount?._id as Id<"accounts"> | undefined,
        cogsAccountId: cogsAccount?._id as Id<"accounts"> | undefined,
        isActive: true,
        allowNegativeStock: false,
        costingMethod: "weighted_average" as const,
        externalCode: `LEGACY-${item.code}`,
        externalSource: "demo_seed",
        createdAt: Date.now(),
      });
      created++;
    }

    results.push(`✅ Created ${created} demo items, skipped ${skipped} existing`);

    return {
      success: true,
      company: company.nameAr,
      created,
      skipped,
      uomId: uom!._id,
      categoryId: category?._id,
      log: results,
    };
  },
});

// ─── Query: preview what seedDemoItems will do ────────────────────────────────
export const getDemoItemsStatus = query({
  args: {},
  handler: async (ctx) => {
    const company = await ctx.db.query("companies").first();
    if (!company) return { ready: false, reason: "No company" };

    if (!company.email?.endsWith("@demo.local")) {
      return { ready: false, reason: "Not a demo deployment" };
    }

    const items = await ctx.db
      .query("items")
      .filter((q) => q.eq(q.field("companyId"), company._id))
      .collect();

    const demoCodes = ["DEMO-001", "DEMO-002", "DEMO-003", "DEMO-004", "DEMO-005", "DEMO-006"];
    const existingCodes = items.map((i) => i.code);
    const toCreate = demoCodes.filter((c) => !existingCodes.includes(c));

    return {
      ready: true,
      totalItems: items.length,
      activeItems: items.filter((i) => i.isActive).length,
      demoToCreate: toCreate.length,
      demoAlreadyExist: demoCodes.length - toCreate.length,
      itemList: items.slice(0, 10).map((i) => ({ code: i.code, name: i.nameAr, isActive: i.isActive })),
    };
  },
});
