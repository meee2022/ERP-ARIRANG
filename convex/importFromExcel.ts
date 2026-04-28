import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { EXCEL_SUPPLIERS, EXCEL_ITEMS, EXCEL_SUP_ITEMS } from "./excelData";

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 1 — Import / upsert categories + UOMs + items from Excel source
//  Safe to re-run: fully idempotent.
// ─────────────────────────────────────────────────────────────────────────────

/** Category definitions inferred from Excel purchase types */
const CATEGORIES = [
  // RM sub-categories
  { code: "RM",       nameAr: "مواد خام",           nameEn: "Raw Materials",           parent: null },
  { code: "RM-FLOUR", nameAr: "دقيق ومسحوق",         nameEn: "Flour & Grain",           parent: "RM" },
  { code: "RM-SWEET", nameAr: "سكر ومحليات",         nameEn: "Sweeteners",              parent: "RM" },
  { code: "RM-FATS",  nameAr: "زيوت ودهون",          nameEn: "Fats & Oils",             parent: "RM" },
  { code: "RM-DAIRY", nameAr: "ألبان وبيض",           nameEn: "Dairy & Eggs",            parent: "RM" },
  { code: "RM-LEAV",  nameAr: "خمائر ومحسنات",       nameEn: "Leavening & Improvers",   parent: "RM" },
  { code: "RM-FILL",  nameAr: "نكهات وحشوات",        nameEn: "Flavors & Fillings",      parent: "RM" },
  { code: "RM-PRES",  nameAr: "مواد حفظ",            nameEn: "Preservatives",           parent: "RM" },
  { code: "RM-OTH",   nameAr: "مواد خام أخرى",       nameEn: "Other Raw Materials",     parent: "RM" },
  // PACK sub-categories
  { code: "PACK",     nameAr: "مواد تعبئة وتغليف",   nameEn: "Packaging",               parent: null },
  { code: "PACK-DISP",nameAr: "عبوات ومستلزمات",     nameEn: "Packaging & Disposables", parent: "PACK" },
  { code: "PACK-PPE", nameAr: "معدات وقاية شخصية",   nameEn: "PPE & Hygiene",           parent: "PACK" },
  { code: "PACK-PURCH",nameAr: "منتجات مشتراة",      nameEn: "Purchased Goods",         parent: "PACK" },
  // OTHERS
  { code: "OTHERS",   nameAr: "مستلزمات أخرى",       nameEn: "Others",                  parent: null },
  { code: "OTH-CLEAN",nameAr: "مواد تنظيف",          nameEn: "Cleaning Supplies",       parent: "OTHERS" },
] as const;

const CATEGORY_MAP: Record<string, string> = {
  flour:                  "RM-FLOUR",
  sweeteners:             "RM-SWEET",
  fats_oils:              "RM-FATS",
  dairy_eggs:             "RM-DAIRY",
  leavening_improvers:    "RM-LEAV",
  flavors_fillings:       "RM-FILL",
  preservatives:          "RM-PRES",
  other_rm:               "RM-OTH",
  packaging_disposables:  "PACK-DISP",
  ppe_hygiene:            "PACK-PPE",
  purchased_goods:        "PACK-PURCH",
  cleaning_supplies:      "OTH-CLEAN",
  misc:                   "OTHERS",
};

const ITEM_TYPE_MAP: Record<string, "raw_material" | "semi_finished" | "finished_good" | "expense_item"> = {
  RM:     "raw_material",
  PACK:   "expense_item",
  OTHERS: "expense_item",
};

export const importItemsFromExcel = mutation({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args) => {
    const company = args.companyId
      ? await ctx.db.get(args.companyId)
      : await ctx.db.query("companies").first();
    if (!company) throw new Error("No company found.");
    const cid = company._id;

    // ── 1. Upsert categories ────────────────────────────────────────────────
    const catIdByCode = new Map<string, Id<"itemCategories">>();
    for (const cat of CATEGORIES) {
      const existing = await ctx.db
        .query("itemCategories")
        .withIndex("by_company", (q) => q.eq("companyId", cid))
        .filter((q) => q.eq(q.field("code"), cat.code))
        .first();
      if (existing) {
        catIdByCode.set(cat.code, existing._id);
      } else {
        const parentId = cat.parent ? catIdByCode.get(cat.parent) : undefined;
        const id = await ctx.db.insert("itemCategories", {
          companyId: cid,
          code: cat.code,
          nameAr: cat.nameAr,
          nameEn: cat.nameEn,
          parentId,
          isActive: true,
        });
        catIdByCode.set(cat.code, id);
      }
    }

    // ── 2. Collect unique UOMs and upsert them ──────────────────────────────
    const uomCodes = new Set(EXCEL_ITEMS.map((i) => i.uom).filter(Boolean));
    const uomIdByCode = new Map<string, Id<"unitOfMeasure">>();

    const allUoms = await ctx.db
      .query("unitOfMeasure")
      .withIndex("by_company", (q) => q.eq("companyId", cid))
      .collect();
    for (const u of allUoms) uomIdByCode.set(u.code, u._id);

    for (const code of uomCodes) {
      if (uomIdByCode.has(code)) continue;
      const id = await ctx.db.insert("unitOfMeasure", {
        companyId: cid,
        code,
        nameAr: code,
        nameEn: code,
        isBase: false,
        conversionFactor: 1,
        isActive: true,
      });
      uomIdByCode.set(code, id);
    }

    // Need a fallback UOM
    const fallbackUom = allUoms.find((u) => u.isBase) ?? allUoms[0];
    if (!fallbackUom) throw new Error("No UOM found. Run importSuppliersAndItems first.");

    // ── 3. Upsert items ─────────────────────────────────────────────────────
    // Build existing items index by normalizedName
    const existingItems = await ctx.db
      .query("items")
      .withIndex("by_company", (q) => q.eq("companyId", cid))
      .collect();
    const itemByNorm = new Map<string, Id<"items">>();
    for (const it of existingItems) {
      const norm = it.normalizedName ?? (it.nameEn ?? it.nameAr).trim().toUpperCase();
      itemByNorm.set(norm, it._id);
    }

    let created = 0, updated = 0;

    // Get or create inventory/expense account stubs
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_company", (q) => q.eq("companyId", cid))
      .collect();
    const invAccount   = accounts.find((a) => a.code === "1401") ?? accounts.find((a) => /inventory/i.test(a.nameEn ?? ""));
    const cogsAccount  = accounts.find((a) => a.code === "5001") ?? accounts.find((a) => /cost of goods/i.test(a.nameEn ?? ""));
    const expAccount   = accounts.find((a) => a.code === "5201") ?? accounts.find((a) => /packing|packaging/i.test(a.nameEn ?? ""));

    // Build existing codes to avoid duplicates
    const usedCodes = new Set(existingItems.map((i) => i.code));
    let codeSeq = existingItems.length + 1;
    function nextCode(prefix: string) {
      let code = `${prefix}-${String(codeSeq).padStart(3, "0")}`;
      while (usedCodes.has(code)) {
        codeSeq++;
        code = `${prefix}-${String(codeSeq).padStart(3, "0")}`;
      }
      usedCodes.add(code);
      codeSeq++;
      return code;
    }

    for (const exItem of EXCEL_ITEMS) {
      const catCode = CATEGORY_MAP[exItem.category] ?? "OTHERS";
      const catId   = catIdByCode.get(catCode);
      const uomId   = uomIdByCode.get(exItem.uom) ?? fallbackUom._id;
      const convexType = ITEM_TYPE_MAP[exItem.type] ?? "raw_material";

      // Master-data fields — NO history from Excel
      // standardCost uses lastPrice as a reference hint, NOT an averaged cost from history
      const patch = {
        purchaseType:     exItem.type as "RM" | "PACK" | "OTHERS",
        purchaseCategory: exItem.category,
        normalizedName:   exItem.norm,
        categoryId:       catId,
        // lastCost intentionally omitted — populated from real purchase invoices only
        externalSource:   "excel_import",
      };

      if (itemByNorm.has(exItem.norm)) {
        await ctx.db.patch(itemByNorm.get(exItem.norm)!, patch);
        updated++;
      } else {
        const prefix = exItem.type === "RM" ? "RM" : exItem.type === "PACK" ? "PK" : "OT";
        const code = nextCode(prefix);
        await ctx.db.insert("items", {
          companyId: cid,
          code,
          nameAr: exItem.display,
          nameEn: exItem.display,
          baseUomId: uomId,
          itemType: convexType,
          costingMethod: "weighted_average",
          allowNegativeStock: false,
          isActive: true,
          createdAt: Date.now(),
          standardCost: exItem.avgPrice ?? undefined,
          inventoryAccountId: invAccount?._id,
          cogsAccountId: cogsAccount?._id,
          ...patch,
        });
        created++;
      }
    }

    return {
      message: "Items import complete",
      categories: CATEGORIES.length,
      uoms: uomCodes.size,
      items: { created, updated },
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 2 — Import / upsert suppliers from Excel source
// ─────────────────────────────────────────────────────────────────────────────
export const importSuppliersFromExcel = mutation({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args) => {
    const company = args.companyId
      ? await ctx.db.get(args.companyId)
      : await ctx.db.query("companies").first();
    if (!company) throw new Error("No company found.");
    const cid = company._id;

    const apAccount = await ctx.db
      .query("accounts")
      .withIndex("by_company", (q) => q.eq("companyId", cid))
      .filter((q) => q.eq(q.field("code"), "2101"))
      .first();
    if (!apAccount) throw new Error("AP account 2101 not found. Run importSuppliersAndItems first.");

    // Build existing suppliers index
    const existingSups = await ctx.db
      .query("suppliers")
      .withIndex("by_company", (q) => q.eq("companyId", cid))
      .collect();
    const supByNorm = new Map<string, Id<"suppliers">>();
    for (const s of existingSups) {
      const norm = s.normalizedName ?? s.nameAr.trim().toUpperCase();
      supByNorm.set(norm, s._id);
    }

    const usedCodes = new Set(existingSups.map((s) => s.code));
    let seq = existingSups.length + 1;
    function nextCode() {
      let c = `SUP-${String(seq).padStart(3, "0")}`;
      while (usedCodes.has(c)) { seq++; c = `SUP-${String(seq).padStart(3, "0")}`; }
      usedCodes.add(c); seq++;
      return c;
    }

    let created = 0, updated = 0;
    for (const es of EXCEL_SUPPLIERS) {
      // Only master-data fields — NO purchase history from Excel
      const patch = {
        normalizedName: es.norm,
        // totalPurchases / purchaseRows / lastPurchaseDate intentionally omitted
        // Those fields must only be populated from real ERP transactions
      };
      if (supByNorm.has(es.norm)) {
        await ctx.db.patch(supByNorm.get(es.norm)!, patch);
        updated++;
      } else {
        await ctx.db.insert("suppliers", {
          companyId: cid,
          code: nextCode(),
          nameAr: es.display,
          nameEn: es.display,
          accountId: apAccount._id,
          isActive: true,
          createdAt: Date.now(),
          ...patch,
        });
        created++;
      }
    }

    return { message: "Suppliers import complete", created, updated };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 3 — Import / upsert supplier-item mappings from Excel source
// ─────────────────────────────────────────────────────────────────────────────
export const importSupplierItemsFromExcel = mutation({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args) => {
    const company = args.companyId
      ? await ctx.db.get(args.companyId)
      : await ctx.db.query("companies").first();
    if (!company) throw new Error("No company found.");
    const cid = company._id;

    // Build lookup maps
    const [allSups, allItems] = await Promise.all([
      ctx.db.query("suppliers").withIndex("by_company", (q) => q.eq("companyId", cid)).collect(),
      ctx.db.query("items").withIndex("by_company", (q) => q.eq("companyId", cid)).collect(),
    ]);

    const supByNorm = new Map<string, Id<"suppliers">>();
    for (const s of allSups) supByNorm.set(s.normalizedName ?? s.nameAr.trim().toUpperCase(), s._id);

    const itemByNorm = new Map<string, Id<"items">>();
    for (const i of allItems) itemByNorm.set(i.normalizedName ?? (i.nameEn ?? i.nameAr).trim().toUpperCase(), i._id);

    let created = 0, updated = 0, skipped = 0;

    for (const row of EXCEL_SUP_ITEMS) {
      const supplierId = supByNorm.get(row.supplier);
      const itemId     = itemByNorm.get(row.item);

      if (!supplierId) { skipped++; continue; }

      const itemNorm = row.item;

      // Match by normalizedItemName within supplier
      const existing = await ctx.db
        .query("supplierItems")
        .withIndex("by_supplier_normalized_name", (q) =>
          q.eq("supplierId", supplierId).eq("normalizedItemName", itemNorm)
        )
        .first();

      // Master-data fields only — NO history fields from Excel
      // avgPrice and purchaseCount are transaction-derived and must remain null
      // lastPrice kept as "reference price" — last known import price, clearly labeled
      const patch = {
        supplierItemName:   row.item,
        normalizedItemName: itemNorm,
        purchaseUom:        row.uom || undefined,
        stockUom:           row.uom || undefined,
        // lastPrice stored as reference price from Excel — NOT a real transaction price
        lastPrice:          row.lastPrice ?? undefined,
        supplierPrice:      row.lastPrice ?? undefined,
        // avgPrice intentionally omitted — must come from real purchase invoices
        // purchaseCount intentionally omitted — must come from real purchase invoices
        isUnresolved:       !itemId,
        ...(itemId ? { itemId } : {}),
      };

      if (existing) {
        await ctx.db.patch(existing._id, patch);
        updated++;
      } else {
        await ctx.db.insert("supplierItems", {
          supplierId,
          companyId: cid,
          createdAt: Date.now(),
          ...patch,
        });
        created++;
      }
    }

    return {
      message: "Supplier-items import complete",
      created,
      updated,
      skipped,
      unresolved: EXCEL_SUP_ITEMS.filter((r) => !itemByNorm.get(r.item)).length,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
//  cleanHistoryFields
//  One-time cleanup: nulls out all purchase-history fields that were mistakenly
//  written from the Excel import file.  These fields must only be populated from
//  real ERP transactions going forward.
// ─────────────────────────────────────────────────────────────────────────────
export const cleanHistoryFields = mutation({
  args: {},
  handler: async (ctx) => {
    // ── 1. Suppliers: clear totalPurchases, purchaseRows, lastPurchaseDate ───
    const suppliers = await ctx.db.query("suppliers").collect();
    let suppliersPatched = 0;
    for (const s of suppliers) {
      const dirty = (s as any).totalPurchases != null
        || (s as any).purchaseRows != null
        || (s as any).lastPurchaseDate != null;
      if (dirty) {
        await ctx.db.patch(s._id, {
          totalPurchases:   undefined,
          purchaseRows:     undefined,
          lastPurchaseDate: undefined,
        } as any);
        suppliersPatched++;
      }
    }

    // ── 2. SupplierItems: clear avgPrice, purchaseCount, lastPurchaseDate ────
    const siRows = await ctx.db.query("supplierItems").collect();
    let siPatched = 0;
    for (const si of siRows) {
      const dirty = (si as any).avgPrice != null
        || (si as any).purchaseCount != null
        || (si as any).lastPurchaseDate != null;
      if (dirty) {
        await ctx.db.patch(si._id, {
          avgPrice:         undefined,
          purchaseCount:    undefined,
          lastPurchaseDate: undefined,
        } as any);
        siPatched++;
      }
    }

    // ── 3. Items: clear lastCost (must come from real purchase invoices) ─────
    const items = await ctx.db.query("items").collect();
    let itemsPatched = 0;
    for (const item of items) {
      if ((item as any).lastCost != null) {
        await ctx.db.patch(item._id, { lastCost: undefined } as any);
        itemsPatched++;
      }
    }

    return {
      message: "History fields cleared — ready for real ERP data",
      suppliersPatched,
      supplierItemsPatched: siPatched,
      itemsPatched,
    };
  },
});
