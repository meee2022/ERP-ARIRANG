import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// ─────────────────────────────────────────────────────────────────────────────
//  importSuppliersAndItems
//  Run once to seed suppliers and items extracted from the April 2026 Excel.
//  Safe to re-run: skips any record whose code already exists.
// ─────────────────────────────────────────────────────────────────────────────

export const importSuppliersAndItems = mutation({
  args: {},
  handler: async (ctx) => {
    // ── 1. Get company ────────────────────────────────────────────────────────
    const company = await ctx.db.query("companies").first();
    if (!company) throw new Error("No company found. Run seedInitialData first.");
    const companyId = company._id;

    // ── 2. Get AP account (code 2101) ─────────────────────────────────────────
    const apAccount = await ctx.db
      .query("accounts")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .filter((q) => q.eq(q.field("code"), "2101"))
      .first();
    if (!apAccount) throw new Error("AP account 2101 not found. Run seedInitialData first.");
    const apAccountId = apAccount._id;

    // ── 3. Helper: upsert UOM ─────────────────────────────────────────────────
    const uomIds: Record<string, any> = {};
    const uomDefs = [
      { code: "KG",   nameAr: "كيلوجرام",   nameEn: "Kilogram" },
      { code: "BAG",  nameAr: "كيس",         nameEn: "Bag" },
      { code: "CRT",  nameAr: "كرتون",       nameEn: "Carton" },
      { code: "PCS",  nameAr: "قطعة",        nameEn: "Piece" },
      { code: "LTR",  nameAr: "لتر",         nameEn: "Liter" },
      { code: "BOX",  nameAr: "صندوق",       nameEn: "Box" },
      { code: "TIN",  nameAr: "علبة",        nameEn: "Tin" },
      { code: "PACK", nameAr: "عبوة",        nameEn: "Pack" },
      { code: "PAIR", nameAr: "زوج",         nameEn: "Pair" },
      { code: "SET",  nameAr: "طقم",         nameEn: "Set" },
    ];

    for (const u of uomDefs) {
      const existing = await ctx.db
        .query("unitOfMeasure")
        .withIndex("by_company", (q) => q.eq("companyId", companyId))
        .filter((q) => q.eq(q.field("code"), u.code))
        .first();
      if (existing) {
        uomIds[u.code] = existing._id;
      } else {
        uomIds[u.code] = await ctx.db.insert("unitOfMeasure", {
          companyId,
          code: u.code,
          nameAr: u.nameAr,
          nameEn: u.nameEn,
          isBase: true,
          conversionFactor: 1,
          isActive: true,
        });
      }
    }

    // ── 4. Suppliers ──────────────────────────────────────────────────────────
    const supplierDefs = [
      { code: "SUP-001", nameAr: "ADINSA TRD.",   nameEn: "ADINSA TRD." },
      { code: "SUP-002", nameAr: "AL FONDOKIA",    nameEn: "AL FONDOKIA" },
      { code: "SUP-003", nameAr: "AL WAJBA",       nameEn: "AL WAJBA" },
      { code: "SUP-004", nameAr: "AMOUDI",         nameEn: "AMOUDI" },
      { code: "SUP-005", nameAr: "Al Ajmera",      nameEn: "Al Ajmera" },
      { code: "SUP-006", nameAr: "BRADMA",         nameEn: "BRADMA" },
      { code: "SUP-007", nameAr: "CASH",           nameEn: "CASH" },
      { code: "SUP-008", nameAr: "ETIHAD",         nameEn: "ETIHAD" },
      { code: "SUP-009", nameAr: "GULF STREAM",    nameEn: "GULF STREAM" },
      { code: "SUP-010", nameAr: "HOLLANDI",       nameEn: "HOLLANDI" },
      { code: "SUP-011", nameAr: "MAAS",           nameEn: "MAAS" },
      { code: "SUP-012", nameAr: "QFM",            nameEn: "QFM" },
      { code: "SUP-013", nameAr: "QNITED",         nameEn: "QNITED" },
      { code: "SUP-014", nameAr: "RAMELIE",        nameEn: "RAMELIE" },
      { code: "SUP-015", nameAr: "RAWABI",         nameEn: "RAWABI" },
      { code: "SUP-016", nameAr: "REALPACK",       nameEn: "REALPACK" },
      { code: "SUP-017", nameAr: "VALENCIA",       nameEn: "VALENCIA" },
      { code: "SUP-018", nameAr: "WEST BAY",       nameEn: "WEST BAY" },
    ];

    let suppCreated = 0, suppSkipped = 0;
    for (const s of supplierDefs) {
      const existing = await ctx.db
        .query("suppliers")
        .withIndex("by_company_code", (q) =>
          q.eq("companyId", companyId).eq("code", s.code)
        )
        .first();
      if (existing) { suppSkipped++; continue; }
      await ctx.db.insert("suppliers", {
        companyId,
        code: s.code,
        nameAr: s.nameAr,
        nameEn: s.nameEn,
        accountId: apAccountId,
        isActive: true,
        createdAt: Date.now(),
      });
      suppCreated++;
    }

    // ── 5. Items ──────────────────────────────────────────────────────────────
    const itemDefs: { code: string; nameEn: string; type: "raw_material" | "finished_good" | "expense_item"; uom: string }[] = [
      { code: "ITM-001", nameEn: "ANTISEPTIC LIQUID DETTOL 6*2LTR",      type: "expense_item",   uom: "CRT"  },
      { code: "ITM-002", nameEn: "APPLE FILLING ( 2.7Kg )",              type: "raw_material",   uom: "KG"   },
      { code: "ITM-003", nameEn: "AREEJ MARGARINE (25Kg )",              type: "raw_material",   uom: "BAG"  },
      { code: "ITM-004", nameEn: "BAKE XL ECO IMPROVER 10KG",           type: "raw_material",   uom: "BAG"  },
      { code: "ITM-005", nameEn: "BAKING PAPER (1X500 Pcs)",             type: "raw_material",   uom: "CRT"  },
      { code: "ITM-006", nameEn: "BAKING POWDER (10Kg )",                type: "raw_material",   uom: "BAG"  },
      { code: "ITM-007", nameEn: "BAKING POWDER (25Kg )",                type: "raw_material",   uom: "BAG"  },
      { code: "ITM-008", nameEn: "BREAD IMPROVER (10Kg )",               type: "raw_material",   uom: "BAG"  },
      { code: "ITM-009", nameEn: "BREAD WIRE 10KG PACK",                 type: "finished_good",  uom: "CRT"  },
      { code: "ITM-010", nameEn: "BROWN BREAD 25x40",                    type: "finished_good",  uom: "KG"   },
      { code: "ITM-011", nameEn: "BURGER BUN 4 PCS (10x12)",             type: "finished_good",  uom: "KG"   },
      { code: "ITM-012", nameEn: "BUTTER ROLL 12x9Inch",                 type: "finished_good",  uom: "KG"   },
      { code: "ITM-013", nameEn: "CAKE GEL (1 Pack X 5Kg)",              type: "raw_material",   uom: "PACK" },
      { code: "ITM-014", nameEn: "CALCIUM PROPIONATE (20KG)",            type: "raw_material",   uom: "BAG"  },
      { code: "ITM-015", nameEn: "CHAKKI ATTA FLOUR ( 50Kg )",           type: "raw_material",   uom: "BAG"  },
      { code: "ITM-016", nameEn: "CHAPATI 4PCS SET PLASTIC",             type: "finished_good",  uom: "KG"   },
      { code: "ITM-017", nameEn: "CHINA PAPER STICKER 6CM*6CM 2",        type: "finished_good",  uom: "PCS"  },
      { code: "ITM-018", nameEn: "CHOCKLATE FILLING ( 5Kg )",            type: "raw_material",   uom: "PCS"  },
      { code: "ITM-019", nameEn: "CINNAMON POWDER (1Kg )",               type: "raw_material",   uom: "KG"   },
      { code: "ITM-020", nameEn: "CLING FILM 1X45CM 5KG (JMBO)",         type: "expense_item",   uom: "PCS"  },
      { code: "ITM-021", nameEn: "COTTON GLOVES (10PAIR/PKT)",           type: "expense_item",   uom: "CRT"  },
      { code: "ITM-022", nameEn: "COTTON GLOVES 50*12 PAIR",             type: "expense_item",   uom: "CRT"  },
      { code: "ITM-023", nameEn: "CREAM CHEESE (1Kg )",                  type: "raw_material",   uom: "KG"   },
      { code: "ITM-024", nameEn: "CROISSANT BUTTER ( 10KG )",            type: "raw_material",   uom: "CRT"  },
      { code: "ITM-025", nameEn: "CUP CAKE 65 G 10KG/ROLL",              type: "finished_good",  uom: "KG"   },
      { code: "ITM-026", nameEn: "CUP CAKE PAPER (16X1000pcs) 9.5CM",   type: "raw_material",   uom: "CRT"  },
      { code: "ITM-027", nameEn: "CUP CAKE PAPER (20X1000pcs) 9.5CM",   type: "raw_material",   uom: "CRT"  },
      { code: "ITM-028", nameEn: "CUP CAKE PAPER (25X1000pcs) 9.5CM",   type: "raw_material",   uom: "CRT"  },
      { code: "ITM-029", nameEn: "CREAM BUN PLASTIC 10KG/ROLL",          type: "finished_good",  uom: "KG"   },
      { code: "ITM-030", nameEn: "DATE ROLL 90 G PLASTIC",               type: "finished_good",  uom: "KG"   },
      { code: "ITM-031", nameEn: "DATES PASTE",                          type: "raw_material",   uom: "CRT"  },
      { code: "ITM-032", nameEn: "DATES PASTE ( 1Kg*12 )",               type: "raw_material",   uom: "CRT"  },
      { code: "ITM-033", nameEn: "DINNER ROLL",                          type: "finished_good",  uom: "KG"   },
      { code: "ITM-034", nameEn: "DINNER ROLL 7x14",                     type: "finished_good",  uom: "KG"   },
      { code: "ITM-035", nameEn: "DRY YEAST (500g X 20)",                type: "raw_material",   uom: "CRT"  },
      { code: "ITM-036", nameEn: "DETERGENT SUPPER EXCEL 25KG",          type: "expense_item",   uom: "BAG"  },
      { code: "ITM-037", nameEn: "ENGLISH CAKE TRAY/PAN CAKE 800PCS",    type: "finished_good",  uom: "PCS"  },
      { code: "ITM-038", nameEn: "FACE MASK 1X50PCS",                    type: "expense_item",   uom: "BOX"  },
      { code: "ITM-039", nameEn: "FINE BRAN FLOUR (30KG)",               type: "raw_material",   uom: "BAG"  },
      { code: "ITM-040", nameEn: "FLEX SEED (15 KG)",                    type: "raw_material",   uom: "BAG"  },
      { code: "ITM-041", nameEn: "FLOUR NO.1 (50Kg)",                    type: "raw_material",   uom: "BAG"  },
      { code: "ITM-042", nameEn: "FOOD FLAVOR - BANANA 1LTR",            type: "raw_material",   uom: "PCS"  },
      { code: "ITM-043", nameEn: "FRESH EGG (1Ctn X 360)",               type: "raw_material",   uom: "CRT"  },
      { code: "ITM-044", nameEn: "GARBAGE BAG 124*140 10S",              type: "expense_item",   uom: "CRT"  },
      { code: "ITM-045", nameEn: "GARBAGE BAG 95*140 10S",               type: "expense_item",   uom: "CRT"  },
      { code: "ITM-046", nameEn: "GHEE (15L )",                          type: "raw_material",   uom: "TIN"  },
      { code: "ITM-047", nameEn: "GLUTEN (25Kg )",                       type: "raw_material",   uom: "BAG"  },
      { code: "ITM-048", nameEn: "HAIR NET 10*100 PCS",                  type: "expense_item",   uom: "CRT"  },
      { code: "ITM-049", nameEn: "HAND GLOVES",                          type: "expense_item",   uom: "PAIR" },
      { code: "ITM-050", nameEn: "HAND GLOVES BABY (10PAIR/PKT)",        type: "expense_item",   uom: "CRT"  },
      { code: "ITM-051", nameEn: "HAND GLOVES RUBBER 90GM PAIR",         type: "expense_item",   uom: "PAIR" },
      { code: "ITM-052", nameEn: "HAND WASH LIQUID 4X5LTR",              type: "expense_item",   uom: "CRT"  },
      { code: "ITM-053", nameEn: "HOTDOG 6 PCS (18x9)",                  type: "finished_good",  uom: "KG"   },
      { code: "ITM-054", nameEn: "ICE CUBE 25 KG",                       type: "raw_material",   uom: "BAG"  },
      { code: "ITM-055", nameEn: "INSTANT YEAST 20*500GM",               type: "expense_item",   uom: "PCS"  },
      { code: "ITM-056", nameEn: "KITCHEN APRON (10X100PCS)",            type: "expense_item",   uom: "CRT"  },
      { code: "ITM-057", nameEn: "KITCHEN APRON (5PCS)",                 type: "expense_item",   uom: "SET"  },
      { code: "ITM-058", nameEn: "MAXI ROLL 2PLY 400GRM (1X6)",          type: "expense_item",   uom: "CRT"  },
      { code: "ITM-059", nameEn: "MICRO FIBER TOWEL",                    type: "expense_item",   uom: "PCS"  },
      { code: "ITM-060", nameEn: "MILK BREAD 750 G",                     type: "finished_good",  uom: "KG"   },
      { code: "ITM-061", nameEn: "MILK BREAD 750 G (10x16+2)",           type: "finished_good",  uom: "KG"   },
      { code: "ITM-062", nameEn: "MILK POWDER (25Kg )",                  type: "raw_material",   uom: "BAG"  },
      { code: "ITM-063", nameEn: "MORNING ROLL 25x40",                   type: "finished_good",  uom: "KG"   },
      { code: "ITM-064", nameEn: "MULTICEREAL FLOUR ( 25Kg )",           type: "raw_material",   uom: "BAG"  },
      { code: "ITM-065", nameEn: "MUNNA BUTTER (20Kg) Veg Shortning",    type: "raw_material",   uom: "CRT"  },
      { code: "ITM-066", nameEn: "PALM OIL (17L)",                       type: "raw_material",   uom: "PCS"  },
      { code: "ITM-067", nameEn: "PALM OIL (18L)",                       type: "raw_material",   uom: "PCS"  },
      { code: "ITM-068", nameEn: "PLAIN ROLL FOR ENGLISH CAKE 10KG/ROLL",type: "finished_good",  uom: "KG"   },
      { code: "ITM-069", nameEn: "PLASTIC SCRAPER",                      type: "expense_item",   uom: "PCS"  },
      { code: "ITM-070", nameEn: "POTASIUM SORBATE",                     type: "raw_material",   uom: "CRT"  },
      { code: "ITM-071", nameEn: "POTATO BUN 6 PCS PLASTIC",             type: "finished_good",  uom: "KG"   },
      { code: "ITM-072", nameEn: "PURATOS GOAL 10KG",                    type: "expense_item",   uom: "BAG"  },
      { code: "ITM-073", nameEn: "RED COLOR BOTTLE FOSTER 6*12*28ML",    type: "raw_material",   uom: "CRT"  },
      { code: "ITM-074", nameEn: "ROGANA POWDER (10Kg )",                type: "raw_material",   uom: "BAG"  },
      { code: "ITM-075", nameEn: "ROSE WATER 12*500ML",                  type: "raw_material",   uom: "BOX"  },
      { code: "ITM-076", nameEn: "SALT ( 25Kg )",                        type: "raw_material",   uom: "BAG"  },
      { code: "ITM-077", nameEn: "SESAME SEEDS ( 15Kg )",                type: "raw_material",   uom: "BAG"  },
      { code: "ITM-078", nameEn: "SLICED MILK BREAD 650 G",              type: "finished_good",  uom: "KG"   },
      { code: "ITM-079", nameEn: "SOLVENT",                              type: "expense_item",   uom: "PCS"  },
      { code: "ITM-080", nameEn: "STEEL WOOL",                           type: "expense_item",   uom: "PCS"  },
      { code: "ITM-081", nameEn: "STRAWBERRY FILLING ( 5Kg )",           type: "raw_material",   uom: "PCS"  },
      { code: "ITM-082", nameEn: "STRAWBERRY FILLING ( 5Kg X4)",         type: "raw_material",   uom: "CRT"  },
      { code: "ITM-083", nameEn: "STROM HAND WASH LIQUID 4X5LTR",        type: "expense_item",   uom: "CRT"  },
      { code: "ITM-084", nameEn: "SUGAR (50Kg )",                        type: "raw_material",   uom: "BAG"  },
      { code: "ITM-085", nameEn: "SUGAR POWDER (25Kg )",                 type: "raw_material",   uom: "BAG"  },
      { code: "ITM-086", nameEn: "SUGAR POWDER (50Kg )",                 type: "raw_material",   uom: "BAG"  },
      { code: "ITM-087", nameEn: "SUPPLE SCRAPER 16*12CM",               type: "expense_item",   uom: "PCS"  },
      { code: "ITM-088", nameEn: "TUTTY FRUTY MIX (15KG)",               type: "raw_material",   uom: "BAG"  },
      { code: "ITM-089", nameEn: "VANILLA ESSENCE 28ml*12",              type: "raw_material",   uom: "CRT"  },
      { code: "ITM-090", nameEn: "VANILLA ESSENCE 28ml*6*12",            type: "raw_material",   uom: "CRT"  },
      { code: "ITM-091", nameEn: "VANILLA POWDER",                       type: "raw_material",   uom: "KG"   },
      { code: "ITM-092", nameEn: "VANILLA SLICE CAKE 65G (7x4)",         type: "finished_good",  uom: "KG"   },
      { code: "ITM-093", nameEn: "VINYL GLOVES (10X100P) L",             type: "expense_item",   uom: "CRT"  },
      { code: "ITM-094", nameEn: "VINYL GLOVES (12X100P) L",             type: "expense_item",   uom: "CRT"  },
      { code: "ITM-095", nameEn: "WHEAT FLOUR T45 A GRADE 25KG",         type: "raw_material",   uom: "BAG"  },
      { code: "ITM-096", nameEn: "WHEAT FLOUR T55 A GRADE 25KG",         type: "raw_material",   uom: "BAG"  },
      { code: "ITM-097", nameEn: "ZEDO PLUS (25Kg )",                    type: "raw_material",   uom: "BAG"  },
    ];

    let itemCreated = 0, itemSkipped = 0;
    for (const item of itemDefs) {
      const existing = await ctx.db
        .query("items")
        .withIndex("by_company_code", (q) =>
          q.eq("companyId", companyId).eq("code", item.code)
        )
        .first();
      if (existing) { itemSkipped++; continue; }
      const baseUomId = uomIds[item.uom] ?? uomIds["PCS"];
      await ctx.db.insert("items", {
        companyId,
        code: item.code,
        nameAr: item.nameEn, // English name used for both until Arabic names are added
        nameEn: item.nameEn,
        itemType: item.type,
        baseUomId,
        costingMethod: "weighted_average",
        allowNegativeStock: false,
        isActive: true,
        createdAt: Date.now(),
      });
      itemCreated++;
    }

    return {
      message: "Import complete",
      uoms: uomDefs.length,
      suppliers: { created: suppCreated, skipped: suppSkipped },
      items: { created: itemCreated, skipped: itemSkipped },
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
//  importSupplierCatalog
//  UPSERT all 28 suppliers + 215 supplier-item catalog rows.
//  Safe to re-run: fully idempotent.
//  Matches suppliers by normalizedName; matches catalog items by normalizedItemName.
//  Unmatched items are imported with isUnresolved=true.
// ─────────────────────────────────────────────────────────────────────────────

const SUPPLIER_MASTER_DATA = [
  { supplier: "MAAS", display: "MAAS", totalPurchases: 164128.5, lastPurchaseDate: "2026-03-24", purchaseRows: 427 },
  { supplier: "AMOUDI", display: "AMOUDI", totalPurchases: 113806.0, lastPurchaseDate: "2026-04-22", purchaseRows: 396 },
  { supplier: "AL AJMERA", display: "Al Ajmera", totalPurchases: 125967.0, lastPurchaseDate: "2026-04-22", purchaseRows: 283 },
  { supplier: "VALENCIA", display: "VALENCIA", totalPurchases: 110459.0, lastPurchaseDate: "2026-04-22", purchaseRows: 271 },
  { supplier: "ETIHAD", display: "ETIHAD", totalPurchases: 94125.0, lastPurchaseDate: "2026-03-02", purchaseRows: 229 },
  { supplier: "HOLLANDI", display: "HOLLANDI", totalPurchases: 100208.0, lastPurchaseDate: "2026-04-22", purchaseRows: 220 },
  { supplier: "RAWABI", display: "RAWABI", totalPurchases: 60843.0, lastPurchaseDate: "2026-04-22", purchaseRows: 215 },
  { supplier: "QFM", display: "QFM", totalPurchases: 924224.0, lastPurchaseDate: "2026-04-21", purchaseRows: 123 },
  { supplier: "GULF STREAM", display: "GULF STREAM", totalPurchases: 20850.0, lastPurchaseDate: "2026-04-22", purchaseRows: 44 },
  { supplier: "AL WAJBA", display: "AL WAJBA", totalPurchases: 15884.0, lastPurchaseDate: "2026-04-21", purchaseRows: 29 },
  { supplier: "WEST BAY", display: "WEST BAY", totalPurchases: 5675.0, lastPurchaseDate: "2026-04-22", purchaseRows: 25 },
  { supplier: "QNITED", display: "QNITED", totalPurchases: 24847.0, lastPurchaseDate: "2026-04-16", purchaseRows: 21 },
  { supplier: "BRADMA", display: "BRADMA", totalPurchases: 9661.0, lastPurchaseDate: "2026-04-21", purchaseRows: 20 },
  { supplier: "CASH", display: "CASH", totalPurchases: 2400.0, lastPurchaseDate: "2026-04-22", purchaseRows: 13 },
  { supplier: "SANA FOOD", display: "SANA FOOD", totalPurchases: 2350.0, lastPurchaseDate: "2026-01-26", purchaseRows: 13 },
  { supplier: "PRINT CARE", display: "PRINT CARE", totalPurchases: 8150.0, lastPurchaseDate: "2026-04-20", purchaseRows: 9 },
  { supplier: "RAMELIE", display: "RAMELIE", totalPurchases: 6170.0, lastPurchaseDate: "2026-04-12", purchaseRows: 8 },
  { supplier: "REALPACK", display: "REALPACK", totalPurchases: 2421.0, lastPurchaseDate: "2026-04-22", purchaseRows: 6 },
  { supplier: "AL FONDOKIA", display: "AL FONDOKIA", totalPurchases: 1957.0, lastPurchaseDate: "2026-03-08", purchaseRows: 5 },
  { supplier: "ROYAL PACK", display: "ROYAL PACK", totalPurchases: 1160.0, lastPurchaseDate: "2026-01-13", purchaseRows: 4 },
  { supplier: "CASH/DELTA", display: "Cash/delta", totalPurchases: 1120.0, lastPurchaseDate: "2026-04-18", purchaseRows: 4 },
  { supplier: "CASH/ROBBY", display: "CASH/ROBBY", totalPurchases: 360.0, lastPurchaseDate: "2026-04-18", purchaseRows: 2 },
  { supplier: "AL SAFA", display: "Al SAFA", totalPurchases: 333.0, lastPurchaseDate: "2025-12-07", purchaseRows: 2 },
  { supplier: "ADINSA TRD.", display: "ADINSA TRD.", totalPurchases: 295.0, lastPurchaseDate: "2026-03-08", purchaseRows: 2 },
  { supplier: "HALIL FOR TRAD.", display: "HALIL FOR TRAD.", totalPurchases: 1100.0, lastPurchaseDate: "2026-02-19", purchaseRows: 1 },
  { supplier: "ABDUL RAHMAN/CASH", display: "Abdul Rahman/Cash", totalPurchases: 480.0, lastPurchaseDate: "2026-04-15", purchaseRows: 1 },
  { supplier: "HOTPACK", display: "HOTPACK", totalPurchases: 330.0, lastPurchaseDate: "2026-04-01", purchaseRows: 1 },
  { supplier: "FIRDOUS", display: "FIRDOUS", totalPurchases: 312.0, lastPurchaseDate: "2025-12-06", purchaseRows: 1 },
] as const;

const SUPPLIER_CATALOG_DATA = [
  { supplier: "ABDUL RAHMAN/CASH", item: "FRESH EGG (1CTN X 360)", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 96.0, lastPrice: 96.0, purchaseCount: 1, lastPurchaseDate: "2026-04-15" },
  { supplier: "ADINSA TRD.", item: "WHEAT FLOUR T45 A GRADE 25KG", purchaseUom: "BAG", stockUom: "BAG", avgPrice: 150.0, lastPrice: 150.0, purchaseCount: 1, lastPurchaseDate: "2026-03-08" },
  { supplier: "ADINSA TRD.", item: "WHEAT FLOUR T55 A GRADE 25KG", purchaseUom: "BAG", stockUom: "BAG", avgPrice: 150.0, lastPrice: 150.0, purchaseCount: 1, lastPurchaseDate: "2026-03-08" },
  { supplier: "AL AJMERA", item: "AREEJ MARGARINE (25KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 287.6923, lastPrice: 285.0, purchaseCount: 65, lastPurchaseDate: "2026-04-22" },
  { supplier: "AL AJMERA", item: "MUNNA BUTTER (20KG ) (VEG SHORTNING)", purchaseUom: "CRT", stockUom: "KG", avgPrice: 158.4746, lastPrice: 135.0, purchaseCount: 59, lastPurchaseDate: "2026-04-22" },
  { supplier: "AL AJMERA", item: "BREAD IMPROVER (10KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 150.0, lastPrice: 150.0, purchaseCount: 42, lastPurchaseDate: "2026-04-22" },
  { supplier: "AL AJMERA", item: "SESAME SEEDS ( 15KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 139.4444, lastPrice: 132.0, purchaseCount: 36, lastPurchaseDate: "2026-04-20" },
  { supplier: "AL AJMERA", item: "FRESH EGG (1CTN X 360)", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 162.1429, lastPrice: 155.0, purchaseCount: 35, lastPurchaseDate: "2026-04-22" },
  { supplier: "AL AJMERA", item: "MAXI ROLL 2PLY 400GRM (1X6)", purchaseUom: "CRT", stockUom: "CRT", avgPrice: 19.75, lastPrice: 19.0, purchaseCount: 12, lastPurchaseDate: "2026-04-20" },
  { supplier: "AL AJMERA", item: "CALCIUM PROPIONATE (20KG)", purchaseUom: "BAG", stockUom: "KG", avgPrice: 335.0, lastPrice: 335.0, purchaseCount: 8, lastPurchaseDate: "2026-03-24" },
  { supplier: "AL AJMERA", item: "VINYL GLOVES (10X100P) L", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 53.75, lastPrice: 50.0, purchaseCount: 8, lastPurchaseDate: "2026-03-18" },
  { supplier: "AL AJMERA", item: "MILK POWDER (25KG)", purchaseUom: "BAG", stockUom: "KG", avgPrice: 235.0, lastPrice: 245.0, purchaseCount: 5, lastPurchaseDate: "2026-04-22" },
  { supplier: "AL AJMERA", item: "DATES PASTE", purchaseUom: "CRT", stockUom: "KG", avgPrice: 108.0, lastPrice: 108.0, purchaseCount: 4, lastPurchaseDate: "2026-03-24" },
  { supplier: "AL AJMERA", item: "VINYL GLOVES (12X100P) L", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 65.0, lastPrice: 65.0, purchaseCount: 3, lastPurchaseDate: "2026-03-28" },
  { supplier: "AL AJMERA", item: "FLOUR NO.1 (50KG)", purchaseUom: "BAG", stockUom: "KG", avgPrice: 125.0, lastPrice: 125.0, purchaseCount: 2, lastPurchaseDate: "2026-02-08" },
  { supplier: "AL AJMERA", item: "POTASIUM SORBATE", purchaseUom: "KG", stockUom: "KG", avgPrice: 28.0, lastPrice: 28.0, purchaseCount: 1, lastPurchaseDate: "2026-02-07" },
  { supplier: "AL AJMERA", item: "DATES PASTE ( 1KG*12 )", purchaseUom: "CRT", stockUom: "KG", avgPrice: 108.0, lastPrice: 108.0, purchaseCount: 1, lastPurchaseDate: "2026-04-09" },
  { supplier: "AL AJMERA", item: "CINNAMON POWDER (1KG )", purchaseUom: "KG", stockUom: "KG", avgPrice: 30.0, lastPrice: 30.0, purchaseCount: 1, lastPurchaseDate: "2026-03-12" },
  { supplier: "AL AJMERA", item: "CREAM CHEESE (1KG )", purchaseUom: "KG", stockUom: "KG", avgPrice: 26.0, lastPrice: 26.0, purchaseCount: 1, lastPurchaseDate: "2026-02-08" },
  { supplier: "AL FONDOKIA", item: "BREAD WIRE 10KG PACK", purchaseUom: "CRT", stockUom: "KG", avgPrice: 320.0, lastPrice: 320.0, purchaseCount: 3, lastPurchaseDate: "2026-03-07" },
  { supplier: "AL FONDOKIA", item: "PLASTIC SCRAPER", purchaseUom: "PCS", stockUom: "PCS", avgPrice: 10.0, lastPrice: 10.0, purchaseCount: 1, lastPurchaseDate: "2026-03-08" },
  { supplier: "AL FONDOKIA", item: "SUPPLE SCRAPER 16*12CM", purchaseUom: "PCS", stockUom: "PCS", avgPrice: 7.0, lastPrice: 7.0, purchaseCount: 1, lastPurchaseDate: "2026-03-08" },
  { supplier: "AL SAFA", item: "CUP CAKE PAPER (1000 PCS) 9CM", purchaseUom: "PKT", stockUom: "PCS", avgPrice: 9.51, lastPrice: 9.5, purchaseCount: 2, lastPurchaseDate: "2025-12-07" },
  { supplier: "AL WAJBA", item: "CREAM CHEESE ( 1KG )", purchaseUom: "KG", stockUom: "KG", avgPrice: 22.0, lastPrice: 22.0, purchaseCount: 18, lastPurchaseDate: "2026-01-24" },
  { supplier: "AL WAJBA", item: "CREAM CHEESE (1KG )", purchaseUom: "KG", stockUom: "KG", avgPrice: 22.0, lastPrice: 22.0, purchaseCount: 11, lastPurchaseDate: "2026-04-21" },
  { supplier: "AMOUDI", item: "HOTDOG 6 PCS (18X9)", purchaseUom: "KG", stockUom: "KG", avgPrice: 13.1573, lastPrice: 13.0, purchaseCount: 89, lastPurchaseDate: "2026-04-22" },
  { supplier: "AMOUDI", item: "BURGER BUN 4 PCS (10X12)", purchaseUom: "KG", stockUom: "KG", avgPrice: 13.1566, lastPrice: 13.0, purchaseCount: 83, lastPurchaseDate: "2026-04-22" },
  { supplier: "AMOUDI", item: "MILK BREAD 750 G", purchaseUom: "KG", stockUom: "KG", avgPrice: 13.0, lastPrice: 13.0, purchaseCount: 51, lastPurchaseDate: "2026-03-26" },
  { supplier: "AMOUDI", item: "MORNING ROLL 25X40", purchaseUom: "KG", stockUom: "KG", avgPrice: 13.0857, lastPrice: 13.0, purchaseCount: 35, lastPurchaseDate: "2026-04-21" },
  { supplier: "AMOUDI", item: "MILK BREAD 750 G (10X16+2)", purchaseUom: "KG", stockUom: "KG", avgPrice: 13.3333, lastPrice: 13.0, purchaseCount: 24, lastPurchaseDate: "2026-04-21" },
  { supplier: "AMOUDI", item: "HOTDOG 6 PCS", purchaseUom: "KG", stockUom: "KG", avgPrice: 13.0, lastPrice: 13.0, purchaseCount: 24, lastPurchaseDate: "2025-12-31" },
  { supplier: "AMOUDI", item: "BURGER BUN 4 PCS", purchaseUom: "KG", stockUom: "KG", avgPrice: 13.0, lastPrice: 13.0, purchaseCount: 21, lastPurchaseDate: "2025-12-31" },
  { supplier: "AMOUDI", item: "VANILLA SLICE CAKE 65G (7X4)", purchaseUom: "KG", stockUom: "KG", avgPrice: 13.1538, lastPrice: 13.0, purchaseCount: 13, lastPurchaseDate: "2026-04-20" },
  { supplier: "AMOUDI", item: "CREAM BUN PLASTIC 10KG/ROLL", purchaseUom: "KG", stockUom: "KG", avgPrice: 16.0833, lastPrice: 16.0, purchaseCount: 12, lastPurchaseDate: "2026-04-18" },
  { supplier: "AMOUDI", item: "CUP CAKE 65 G 10KG/ROLL", purchaseUom: "KG", stockUom: "KG", avgPrice: 16.0, lastPrice: 16.0, purchaseCount: 10, lastPurchaseDate: "2026-03-25" },
  { supplier: "AMOUDI", item: "BROWN BREAD 25X40", purchaseUom: "KG", stockUom: "KG", avgPrice: 13.2, lastPrice: 13.0, purchaseCount: 5, lastPurchaseDate: "2026-04-19" },
  { supplier: "AMOUDI", item: "DINNER ROLL", purchaseUom: "KG", stockUom: "KG", avgPrice: 13.0, lastPrice: 13.0, purchaseCount: 5, lastPurchaseDate: "2026-02-17" },
  { supplier: "AMOUDI", item: "VANILLA SLICE CAKE 65 G", purchaseUom: "KG", stockUom: "KG", avgPrice: 13.0, lastPrice: 13.0, purchaseCount: 5, lastPurchaseDate: "2025-12-31" },
  { supplier: "AMOUDI", item: "CHAPATI 4PCS SET PLASTIC", purchaseUom: "KG", stockUom: "KG", avgPrice: 13.5, lastPrice: 13.0, purchaseCount: 4, lastPurchaseDate: "2026-04-09" },
  { supplier: "AMOUDI", item: "DINNER ROLL 7X14", purchaseUom: "KG", stockUom: "KG", avgPrice: 13.3333, lastPrice: 13.0, purchaseCount: 3, lastPurchaseDate: "2026-04-08" },
  { supplier: "AMOUDI", item: "TUBE ROLL", purchaseUom: "KG", stockUom: "KG", avgPrice: 7.0, lastPrice: 7.0, purchaseCount: 2, lastPurchaseDate: "2026-01-05" },
  { supplier: "AMOUDI", item: "PLAIN MUFFIN PLASTIC (10KG/ROLL)", purchaseUom: "BAG", stockUom: "KG", avgPrice: 15.0, lastPrice: 15.0, purchaseCount: 2, lastPurchaseDate: "2025-12-13" },
  { supplier: "AMOUDI", item: "BROWN BREAD", purchaseUom: "KG", stockUom: "KG", avgPrice: 13.0, lastPrice: 13.0, purchaseCount: 2, lastPurchaseDate: "2025-12-30" },
  { supplier: "AMOUDI", item: "BUTTER ROLL 12X9INCH", purchaseUom: "KG", stockUom: "KG", avgPrice: 13.0, lastPrice: 13.0, purchaseCount: 2, lastPurchaseDate: "2026-03-11" },
  { supplier: "AMOUDI", item: "PLAIN ROLL FOR ENGLISH CAKE (10KG/ROLL", purchaseUom: "KG", stockUom: "GM", avgPrice: 15.0, lastPrice: 15.0, purchaseCount: 1, lastPurchaseDate: "2026-02-07" },
  { supplier: "AMOUDI", item: "DATE ROLL 90 G PLASTIC", purchaseUom: "KG", stockUom: "GM", avgPrice: 13.0, lastPrice: 13.0, purchaseCount: 1, lastPurchaseDate: "2026-02-15" },
  { supplier: "AMOUDI", item: "POTATO BUN 6 PCS PLASTIC", purchaseUom: "KG", stockUom: "GM", avgPrice: 13.0, lastPrice: 13.0, purchaseCount: 1, lastPurchaseDate: "2026-02-15" },
  { supplier: "AMOUDI", item: "SLICED MILK BREAD 650 G", purchaseUom: "KG", stockUom: "GM", avgPrice: 11.5, lastPrice: 11.5, purchaseCount: 1, lastPurchaseDate: "2026-03-02" },
  { supplier: "BRADMA", item: "SOUS CHEF HAZELNUT 5KG", purchaseUom: "PCS", stockUom: "KG", avgPrice: 130.0, lastPrice: 130.0, purchaseCount: 6, lastPurchaseDate: "2025-12-20" },
  { supplier: "BRADMA", item: "PALM OIL (18L)", purchaseUom: "PCS", stockUom: "LTR", avgPrice: 103.25, lastPrice: 100.0, purchaseCount: 4, lastPurchaseDate: "2026-04-21" },
  { supplier: "BRADMA", item: "ZATHER POWDER 1KG", purchaseUom: "KG", stockUom: "KG", avgPrice: 10.0, lastPrice: 10.0, purchaseCount: 3, lastPurchaseDate: "2025-12-08" },
  { supplier: "BRADMA", item: "APPLE FILLING ( 2.7KG )", purchaseUom: "KG", stockUom: "KG", avgPrice: 65.0, lastPrice: 65.0, purchaseCount: 2, lastPurchaseDate: "2026-02-28" },
  { supplier: "BRADMA", item: "SALT ( 25KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 18.0, lastPrice: 18.0, purchaseCount: 2, lastPurchaseDate: "2026-03-28" },
  { supplier: "BRADMA", item: "VANILLA POWDER 10KG", purchaseUom: "BAG", stockUom: "KG", avgPrice: 390.0, lastPrice: 390.0, purchaseCount: 1, lastPurchaseDate: "2025-12-03" },
  { supplier: "BRADMA", item: "SUGAR (50KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 110.0, lastPrice: 110.0, purchaseCount: 1, lastPurchaseDate: "2026-04-01" },
  { supplier: "BRADMA", item: "FLEX SEED (15 KG)", purchaseUom: "BAG", stockUom: "KG", avgPrice: 140.0, lastPrice: 140.0, purchaseCount: 1, lastPurchaseDate: "2026-04-11" },
  { supplier: "CASH", item: "HAND GLOVES BABY (10PAIR/PKT)", purchaseUom: "CRT", stockUom: "PAIR", avgPrice: 280.0, lastPrice: 280.0, purchaseCount: 4, lastPurchaseDate: "2026-04-04" },
  { supplier: "CASH", item: "HAND GLOVES RUBBER 120 GM PAIR", purchaseUom: "PAIR", stockUom: "PAIR", avgPrice: 5.0, lastPrice: 5.0, purchaseCount: 2, lastPurchaseDate: "2026-01-15" },
  { supplier: "CASH", item: "IMPULSE SEALER FOR PP/PE BAG (METAL BODY) 12\" 2PCS", purchaseUom: "PCS", stockUom: "PCS", avgPrice: 110.0, lastPrice: 110.0, purchaseCount: 2, lastPurchaseDate: "2026-01-14" },
  { supplier: "CASH", item: "HAND GLOVES MEDICAL (VINYL)", purchaseUom: "PKT", stockUom: "PKT", avgPrice: 6.5, lastPrice: 6.5, purchaseCount: 2, lastPurchaseDate: "2026-01-12" },
  { supplier: "CASH", item: "HAND GLOVES", purchaseUom: "PAIR", stockUom: "PAIR", avgPrice: 5.0, lastPrice: 5.0, purchaseCount: 1, lastPurchaseDate: "2026-04-22" },
  { supplier: "CASH", item: "MICRO FIVER TOWEL", purchaseUom: "PCS", stockUom: "PCS", avgPrice: 3.0, lastPrice: 3.0, purchaseCount: 1, lastPurchaseDate: "2026-03-08" },
  { supplier: "CASH", item: "STEEL WOOL", purchaseUom: "PCS", stockUom: "PCS", avgPrice: 5.0, lastPrice: 5.0, purchaseCount: 1, lastPurchaseDate: "2026-03-08" },
  { supplier: "CASH/DELTA", item: "COTTON GLOVES (10PAIR/PKT)", purchaseUom: "CRT", stockUom: "PAIR", avgPrice: 280.0, lastPrice: 280.0, purchaseCount: 4, lastPurchaseDate: "2026-04-18" },
  { supplier: "CASH/ROBBY", item: "CUP CAKE PAPER (25X1000PCS) 9.5CM", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 180.0, lastPrice: 180.0, purchaseCount: 2, lastPurchaseDate: "2026-04-18" },
  { supplier: "ETIHAD", item: "MILK POWDER ( 25KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 216.5854, lastPrice: 220.0, purchaseCount: 41, lastPurchaseDate: "2026-02-28" },
  { supplier: "ETIHAD", item: "GLUTEN (25KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 221.4634, lastPrice: 220.0, purchaseCount: 41, lastPurchaseDate: "2026-03-02" },
  { supplier: "ETIHAD", item: "AREEJ MARGARINE (25KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 293.5, lastPrice: 295.0, purchaseCount: 40, lastPurchaseDate: "2026-03-02" },
  { supplier: "ETIHAD", item: "MILK POWDER (25KG)", purchaseUom: "BAG", stockUom: "KG", avgPrice: 219.7436, lastPrice: 220.0, purchaseCount: 39, lastPurchaseDate: "2026-03-02" },
  { supplier: "ETIHAD", item: "AREEJ MARGARINE ( 25KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 295.0, lastPrice: 295.0, purchaseCount: 19, lastPurchaseDate: "2025-12-23" },
  { supplier: "ETIHAD", item: "GLUTEN ( 25KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 221.6667, lastPrice: 220.0, purchaseCount: 18, lastPurchaseDate: "2025-12-30" },
  { supplier: "ETIHAD", item: "SESAME SEEDS (1KG)", purchaseUom: "KG", stockUom: "KG", avgPrice: 13.0, lastPrice: 13.0, purchaseCount: 16, lastPurchaseDate: "2026-01-25" },
  { supplier: "ETIHAD", item: "SESAME SEEDS (1KG )", purchaseUom: "KG", stockUom: "KG", avgPrice: 13.0, lastPrice: 13.0, purchaseCount: 14, lastPurchaseDate: "2025-12-31" },
  { supplier: "ETIHAD", item: "FLOUR NO.1 (50KG) (JAMILA)", purchaseUom: "BAG", stockUom: "KG", avgPrice: 105.0, lastPrice: 105.0, purchaseCount: 1, lastPurchaseDate: "2025-12-02" },
  { supplier: "FIRDOUS", item: "PALM OIL (18L)", purchaseUom: "TIN", stockUom: "KG", avgPrice: 79.0, lastPrice: 79.0, purchaseCount: 1, lastPurchaseDate: "2025-12-06" },
  { supplier: "GULF STREAM", item: "CALCIUM PROPIONATE (20KG)", purchaseUom: "BAG", stockUom: "KG", avgPrice: 350.0, lastPrice: 350.0, purchaseCount: 29, lastPurchaseDate: "2026-04-22" },
  { supplier: "GULF STREAM", item: "POTASIUM SORBATE ( 5 KG*2 )", purchaseUom: "CRT", stockUom: "KG", avgPrice: 550.0, lastPrice: 550.0, purchaseCount: 13, lastPurchaseDate: "2026-01-26" },
  { supplier: "GULF STREAM", item: "POTASIUM SORBATE", purchaseUom: "CRT", stockUom: "KG", avgPrice: 550.0, lastPrice: 550.0, purchaseCount: 2, lastPurchaseDate: "2026-02-25" },
  { supplier: "HALIL FOR TRAD.", item: "CROISSANT BUTTER ( 10KG )", purchaseUom: "CRT", stockUom: "KG", avgPrice: 110.0, lastPrice: 110.0, purchaseCount: 1, lastPurchaseDate: "2026-02-19" },
  { supplier: "HOLLANDI", item: "ZEDO PLUS (25KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 350.0, lastPrice: 350.0, purchaseCount: 42, lastPurchaseDate: "2026-04-22" },
  { supplier: "HOLLANDI", item: "ZEDO PLUS (25KG)", purchaseUom: "BAG", stockUom: "KG", avgPrice: 350.0, lastPrice: 350.0, purchaseCount: 32, lastPurchaseDate: "2026-01-26" },
  { supplier: "HOLLANDI", item: "BREAD IMPROVER (15KG)", purchaseUom: "BAG", stockUom: "KG", avgPrice: 260.0, lastPrice: 260.0, purchaseCount: 32, lastPurchaseDate: "2026-01-26" },
  { supplier: "HOLLANDI", item: "ZEDO PLUS ( 25KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 350.0, lastPrice: 350.0, purchaseCount: 23, lastPurchaseDate: "2025-12-31" },
  { supplier: "HOLLANDI", item: "BREAD IMPROVER ( 15KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 260.0, lastPrice: 260.0, purchaseCount: 23, lastPurchaseDate: "2025-12-31" },
  { supplier: "HOLLANDI", item: "CAKE GEL (1 PACK X 5KG)", purchaseUom: "PACK", stockUom: "KG", avgPrice: 72.0, lastPrice: 72.0, purchaseCount: 20, lastPurchaseDate: "2026-04-18" },
  { supplier: "HOLLANDI", item: "CHOCKLATE FILLING ( 5KG )", purchaseUom: "PCS", stockUom: "KG", avgPrice: 90.0, lastPrice: 90.0, purchaseCount: 11, lastPurchaseDate: "2026-04-07" },
  { supplier: "HOLLANDI", item: "MULTICEREAL FLOUR ( 25KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 450.0, lastPrice: 450.0, purchaseCount: 7, lastPurchaseDate: "2026-03-14" },
  { supplier: "HOLLANDI", item: "APPLE FILLING ( 2.7KG )", purchaseUom: "KG", stockUom: "KG", avgPrice: 67.8571, lastPrice: 65.0, purchaseCount: 7, lastPurchaseDate: "2026-04-16" },
  { supplier: "HOLLANDI", item: "FOOD FLAVOR - BANANA 1LTR", purchaseUom: "PCS", stockUom: "LTR", avgPrice: 58.0, lastPrice: 58.0, purchaseCount: 7, lastPurchaseDate: "2026-03-18" },
  { supplier: "HOLLANDI", item: "BREAD IMPROVER (10KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 260.0, lastPrice: 260.0, purchaseCount: 4, lastPurchaseDate: "2026-02-23" },
  { supplier: "HOLLANDI", item: "BAKING POWDER ( 10KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 78.0, lastPrice: 78.0, purchaseCount: 4, lastPurchaseDate: "2025-12-20" },
  { supplier: "HOLLANDI", item: "BAKING POWDER (25KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 78.0, lastPrice: 78.0, purchaseCount: 2, lastPurchaseDate: "2026-04-18" },
  { supplier: "HOLLANDI", item: "MUNNA BUTTER (20KG ) (VEG SHORTNING)", purchaseUom: "PCS", stockUom: "KG", avgPrice: 125.0, lastPrice: 125.0, purchaseCount: 1, lastPurchaseDate: "2026-02-07" },
  { supplier: "HOLLANDI", item: "OPEL MARGARINE 10KG", purchaseUom: "PCS", stockUom: "KG", avgPrice: 125.0, lastPrice: 125.0, purchaseCount: 1, lastPurchaseDate: "2025-12-01" },
  { supplier: "HOLLANDI", item: "FLOUR (MULTICEREAL) (25KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 450.0, lastPrice: 450.0, purchaseCount: 1, lastPurchaseDate: "2026-01-24" },
  { supplier: "HOLLANDI", item: "CHOCKLATE FILLING ( 5KG ) 8%", purchaseUom: "PCS", stockUom: "KG", avgPrice: 110.0, lastPrice: 110.0, purchaseCount: 1, lastPurchaseDate: "2025-12-04" },
  { supplier: "HOLLANDI", item: "SAPTULA STAINLESS STEEL 60MM", purchaseUom: "PCS", stockUom: "PCS", avgPrice: 29.0, lastPrice: 29.0, purchaseCount: 1, lastPurchaseDate: "2025-12-03" },
  { supplier: "HOLLANDI", item: "BAKING POWDER (10KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 78.0, lastPrice: 78.0, purchaseCount: 1, lastPurchaseDate: "2026-04-02" },
  { supplier: "HOTPACK", item: "CUP CAKE PAPER (20X1000PCS) 9.5CM", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 330.0, lastPrice: 330.0, purchaseCount: 1, lastPurchaseDate: "2026-04-01" },
  { supplier: "MAAS", item: "SUGAR (50KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 98.6875, lastPrice: 98.0, purchaseCount: 48, lastPurchaseDate: "2026-03-24" },
  { supplier: "MAAS", item: "PALM OIL (18L)", purchaseUom: "PCS", stockUom: "LTR", avgPrice: 79.4444, lastPrice: 78.0, purchaseCount: 36, lastPurchaseDate: "2026-03-15" },
  { supplier: "MAAS", item: "FRESH EGG (1CTN X 360)", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 166.1765, lastPrice: 168.0, purchaseCount: 34, lastPurchaseDate: "2026-01-25" },
  { supplier: "MAAS", item: "SALT ( 25KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 11.9032, lastPrice: 11.0, purchaseCount: 31, lastPurchaseDate: "2026-03-15" },
  { supplier: "MAAS", item: "BAKING PAPER (1X500 PCS)", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 65.0, lastPrice: 65.0, purchaseCount: 26, lastPurchaseDate: "2026-03-18" },
  { supplier: "MAAS", item: "FRESH EGG ( 1CTN X 360 )", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 152.4091, lastPrice: 138.0, purchaseCount: 22, lastPurchaseDate: "2026-01-31" },
  { supplier: "MAAS", item: "VINYL GLOVES (10X100P) L", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 50.0, lastPrice: 50.0, purchaseCount: 21, lastPurchaseDate: "2026-02-02" },
  { supplier: "MAAS", item: "SUGAR ( 50KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 102.0, lastPrice: 102.0, purchaseCount: 18, lastPurchaseDate: "2026-01-31" },
  { supplier: "MAAS", item: "GHEE (15L )", purchaseUom: "TIN", stockUom: "LTR", avgPrice: 95.5294, lastPrice: 94.0, purchaseCount: 17, lastPurchaseDate: "2026-03-24" },
  { supplier: "MAAS", item: "GHEE (14L )", purchaseUom: "TIN", stockUom: "LTR", avgPrice: 96.0, lastPrice: 96.0, purchaseCount: 14, lastPurchaseDate: "2026-01-19" },
  { supplier: "MAAS", item: "CHAKKI ATTA FLOUR ( 50KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 121.5714, lastPrice: 113.0, purchaseCount: 14, lastPurchaseDate: "2026-03-18" },
  { supplier: "MAAS", item: "SUGAR POWDER (50KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 130.0, lastPrice: 130.0, purchaseCount: 14, lastPurchaseDate: "2026-02-21" },
  { supplier: "MAAS", item: "MAXI ROLL 2PLY 400GRM (1X6)", purchaseUom: "CRT", stockUom: "CRT", avgPrice: 16.9231, lastPrice: 17.0, purchaseCount: 13, lastPurchaseDate: "2026-02-09" },
  { supplier: "MAAS", item: "GARBAGE BAG 124*140 10S", purchaseUom: "CRT", stockUom: "CRT", avgPrice: 38.0, lastPrice: 38.0, purchaseCount: 10, lastPurchaseDate: "2026-03-15" },
  { supplier: "MAAS", item: "GHEE ( 15L )", purchaseUom: "TIN", stockUom: "LTR", avgPrice: 94.8889, lastPrice: 96.0, purchaseCount: 9, lastPurchaseDate: "2026-01-29" },
  { supplier: "MAAS", item: "COTTON GLOVES 600 PAIR", purchaseUom: "CRT", stockUom: "PAIR", avgPrice: 412.5, lastPrice: 410.0, purchaseCount: 8, lastPurchaseDate: "2026-01-17" },
  { supplier: "MAAS", item: "DATES PASTE ( 5KG*3 )", purchaseUom: "CRT", stockUom: "KG", avgPrice: 127.0, lastPrice: 128.0, purchaseCount: 8, lastPurchaseDate: "2026-01-13" },
  { supplier: "MAAS", item: "VANILLA POWDER 10KG", purchaseUom: "BAG", stockUom: "KG", avgPrice: 395.0, lastPrice: 395.0, purchaseCount: 7, lastPurchaseDate: "2026-01-29" },
  { supplier: "MAAS", item: "TORTILA BREAD (SALESMAN) 10X12S)", purchaseUom: "CRT", stockUom: "CRT", avgPrice: 70.0, lastPrice: 70.0, purchaseCount: 6, lastPurchaseDate: "2026-01-26" },
  { supplier: "MAAS", item: "CLING FILM 1X45CM 5KG (JMBO)", purchaseUom: "PCS", stockUom: "KG", avgPrice: 42.3333, lastPrice: 43.0, purchaseCount: 6, lastPurchaseDate: "2026-03-18" },
  { supplier: "MAAS", item: "TORTILA ( SUPPLY TO YASMINE PALACE REST.) 10X12S", purchaseUom: "CRT", stockUom: "CRT", avgPrice: 70.0, lastPrice: 70.0, purchaseCount: 5, lastPurchaseDate: "2025-12-10" },
  { supplier: "MAAS", item: "STRAWBERRY FILLING ( 5KG*4 )", purchaseUom: "CRT", stockUom: "KG", avgPrice: 116.0, lastPrice: 116.0, purchaseCount: 5, lastPurchaseDate: "2026-01-19" },
  { supplier: "MAAS", item: "SUGAR POWDER ( 50KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 130.0, lastPrice: 130.0, purchaseCount: 5, lastPurchaseDate: "2025-12-27" },
  { supplier: "MAAS", item: "CUP CAKE PAPER (16X1000PCS) 9.5CM", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 137.25, lastPrice: 135.0, purchaseCount: 4, lastPurchaseDate: "2026-03-16" },
  { supplier: "MAAS", item: "GHEE ( 14L )", purchaseUom: "TIN", stockUom: "LTR", avgPrice: 96.0, lastPrice: 96.0, purchaseCount: 4, lastPurchaseDate: "2025-12-31" },
  { supplier: "MAAS", item: "FACE MASK 1X50PCS", purchaseUom: "BOX", stockUom: "BOX", avgPrice: 3.4375, lastPrice: 3.25, purchaseCount: 4, lastPurchaseDate: "2026-02-07" },
  { supplier: "MAAS", item: "HAIR NET 10*100 PCS", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 33.0, lastPrice: 33.0, purchaseCount: 4, lastPurchaseDate: "2026-02-19" },
  { supplier: "MAAS", item: "STROM HAND WASH LIQUID 4X5LTR", purchaseUom: "CRT", stockUom: "LTR", avgPrice: 32.0, lastPrice: 32.0, purchaseCount: 4, lastPurchaseDate: "2026-02-12" },
  { supplier: "MAAS", item: "STRAWBERRY FILLING ( 5KG )", purchaseUom: "PCS", stockUom: "KG", avgPrice: 29.0, lastPrice: 29.0, purchaseCount: 3, lastPurchaseDate: "2026-03-16" },
  { supplier: "MAAS", item: "HAND GLOVES RUBBER 90GM PAIR", purchaseUom: "PAIR", stockUom: "PAIR", avgPrice: 5.0, lastPrice: 5.0, purchaseCount: 3, lastPurchaseDate: "2026-02-12" },
  { supplier: "MAAS", item: "VANILLA ESSENSE 28ML*12", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 11.5, lastPrice: 11.5, purchaseCount: 3, lastPurchaseDate: "2026-01-25" },
  { supplier: "MAAS", item: "TORTILA BREAD - SALESMAN) 10X12S)", purchaseUom: "CRT", stockUom: "CRT", avgPrice: 84.0, lastPrice: 98.0, purchaseCount: 2, lastPurchaseDate: "2025-12-31" },
  { supplier: "MAAS", item: "COTTON GLOVES 50*12 PAIR", purchaseUom: "CRT", stockUom: "PAIR", avgPrice: 209.1, lastPrice: 8.2, purchaseCount: 2, lastPurchaseDate: "2026-02-28" },
  { supplier: "MAAS", item: "KITCHEN APRON (10X100PCS)", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 48.0, lastPrice: 48.0, purchaseCount: 2, lastPurchaseDate: "2025-12-29" },
  { supplier: "MAAS", item: "BAKING POWDER ( 10KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 78.0, lastPrice: 78.0, purchaseCount: 2, lastPurchaseDate: "2025-12-31" },
  { supplier: "MAAS", item: "BAKING POWDER (10KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 78.0, lastPrice: 78.0, purchaseCount: 2, lastPurchaseDate: "2026-01-08" },
  { supplier: "MAAS", item: "GARBAGE BAG 95*110 20PKT", purchaseUom: "CRT", stockUom: "CRT", avgPrice: 38.0, lastPrice: 38.0, purchaseCount: 2, lastPurchaseDate: "2026-01-24" },
  { supplier: "MAAS", item: "VANILLA POWDER", purchaseUom: "BAG", stockUom: "KG", avgPrice: 395.0, lastPrice: 395.0, purchaseCount: 1, lastPurchaseDate: "2026-02-11" },
  { supplier: "MAAS", item: "SUGAR POWDER (25KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 66.0, lastPrice: 66.0, purchaseCount: 1, lastPurchaseDate: "2026-03-15" },
  { supplier: "MAAS", item: "DATES PASTE", purchaseUom: "CRT", stockUom: "KG", avgPrice: 125.0, lastPrice: 125.0, purchaseCount: 1, lastPurchaseDate: "2026-02-03" },
  { supplier: "MAAS", item: "TUTTY FRUTY MIX (15KG)", purchaseUom: "BAG", stockUom: "KG", avgPrice: 110.0, lastPrice: 110.0, purchaseCount: 1, lastPurchaseDate: "2025-12-24" },
  { supplier: "MAAS", item: "PAPER CUP (20X50 PCS)X6", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 26.0, lastPrice: 26.0, purchaseCount: 1, lastPurchaseDate: "2026-01-29" },
  { supplier: "MAAS", item: "CINNAMON POWDER (1KG )", purchaseUom: "KG", stockUom: "KG", avgPrice: 20.0, lastPrice: 20.0, purchaseCount: 1, lastPurchaseDate: "2025-12-23" },
  { supplier: "MAAS", item: "BLEACH LIQUID 6X3.78 LTR CLOROX", purchaseUom: "CRT", stockUom: "LTR", avgPrice: 88.0, lastPrice: 88.0, purchaseCount: 1, lastPurchaseDate: "2026-01-26" },
  { supplier: "MAAS", item: "BLEACH LIQUID 6X3.78LTR CLOROX", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 88.0, lastPrice: 88.0, purchaseCount: 1, lastPurchaseDate: "2026-01-26" },
  { supplier: "MAAS", item: "SESAME SEEDS ( 1KG )", purchaseUom: "KG", stockUom: "KG", avgPrice: 17.0, lastPrice: 17.0, purchaseCount: 1, lastPurchaseDate: "2025-12-24" },
  { supplier: "PRINT CARE", item: "CHINA PAPER STICKER 6CM*6CM 2", purchaseUom: "PCS", stockUom: "PCS", avgPrice: 0.0911, lastPrice: 0.09, purchaseCount: 9, lastPurchaseDate: "2026-04-20" },
  { supplier: "QFM", item: "FLOUR NO.1 (50KG)", purchaseUom: "BAG", stockUom: "KG", avgPrice: 140.0, lastPrice: 140.0, purchaseCount: 65, lastPurchaseDate: "2026-04-21" },
  { supplier: "QFM", item: "PALM OIL (18L)", purchaseUom: "TIN", stockUom: "KG", avgPrice: 81.8974, lastPrice: 77.0, purchaseCount: 39, lastPurchaseDate: "2026-04-19" },
  { supplier: "QFM", item: "SUGAR (50KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 104.4, lastPrice: 102.0, purchaseCount: 10, lastPurchaseDate: "2026-04-21" },
  { supplier: "QFM", item: "WHITE SUGER 50KG", purchaseUom: "BAG", stockUom: "KG", avgPrice: 102.0, lastPrice: 102.0, purchaseCount: 5, lastPurchaseDate: "2025-12-31" },
  { supplier: "QFM", item: "FINE BRAN FLOUR (30KG)", purchaseUom: "BAG", stockUom: "KG", avgPrice: 32.5, lastPrice: 66.0, purchaseCount: 4, lastPurchaseDate: "2026-04-21" },
  { supplier: "QNITED", item: "CROISSANT BUTTER ( 10KG )", purchaseUom: "CRT", stockUom: "KG", avgPrice: 129.0, lastPrice: 125.0, purchaseCount: 15, lastPurchaseDate: "2026-04-16" },
  { supplier: "QNITED", item: "ROGANA POWDER ( 10KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 176.0, lastPrice: 176.0, purchaseCount: 3, lastPurchaseDate: "2026-01-18" },
  { supplier: "QNITED", item: "ROGANA POWDER (10KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 183.6667, lastPrice: 176.0, purchaseCount: 3, lastPurchaseDate: "2026-04-14" },
  { supplier: "RAMELIE", item: "SOLVENENT", purchaseUom: "PCS", stockUom: "PCS", avgPrice: 200.0, lastPrice: 165.0, purchaseCount: 8, lastPurchaseDate: "2026-04-12" },
  { supplier: "RAWABI", item: "SUGAR (50KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 103.2609, lastPrice: 100.0, purchaseCount: 23, lastPurchaseDate: "2026-04-14" },
  { supplier: "RAWABI", item: "GHEE (15L )", purchaseUom: "TIN", stockUom: "LTR", avgPrice: 98.2273, lastPrice: 96.0, purchaseCount: 22, lastPurchaseDate: "2026-04-22" },
  { supplier: "RAWABI", item: "CHAKKI ATTA FLOUR ( 50KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 120.0, lastPrice: 120.0, purchaseCount: 17, lastPurchaseDate: "2026-04-20" },
  { supplier: "RAWABI", item: "PALM OIL (18L)", purchaseUom: "PCS", stockUom: "LTR", avgPrice: 95.4, lastPrice: 95.0, purchaseCount: 15, lastPurchaseDate: "2026-04-22" },
  { supplier: "RAWABI", item: "SALT ( 25KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 17.0667, lastPrice: 17.0, purchaseCount: 15, lastPurchaseDate: "2026-04-21" },
  { supplier: "RAWABI", item: "BUTTER BLOCK (25KG) - UNSALTED", purchaseUom: "BAG", stockUom: "KG", avgPrice: 200.0, lastPrice: 200.0, purchaseCount: 10, lastPurchaseDate: "2026-01-06" },
  { supplier: "RAWABI", item: "SUGAR POWDER (50KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 131.0, lastPrice: 131.0, purchaseCount: 10, lastPurchaseDate: "2026-04-19" },
  { supplier: "RAWABI", item: "FRESH EGG ( 1CTN X 360 )", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 158.8889, lastPrice: 145.0, purchaseCount: 9, lastPurchaseDate: "2025-12-27" },
  { supplier: "RAWABI", item: "FRESH EGG (1CTN X 360)", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 173.75, lastPrice: 175.0, purchaseCount: 8, lastPurchaseDate: "2026-02-02" },
  { supplier: "RAWABI", item: "GARBAGE BAG 124*140 10S", purchaseUom: "CRT", stockUom: "CRT", avgPrice: 55.0, lastPrice: 55.0, purchaseCount: 8, lastPurchaseDate: "2026-04-13" },
  { supplier: "RAWABI", item: "AREEJ MARGARINE ( 25KG ) - UNSALTED", purchaseUom: "BAG", stockUom: "KG", avgPrice: 200.0, lastPrice: 200.0, purchaseCount: 5, lastPurchaseDate: "2025-12-31" },
  { supplier: "RAWABI", item: "GARBAGE BAG 95*140 10S", purchaseUom: "CRT", stockUom: "CRT", avgPrice: 50.0, lastPrice: 48.0, purchaseCount: 5, lastPurchaseDate: "2026-04-13" },
  { supplier: "RAWABI", item: "PALM OIL (17L)", purchaseUom: "PCS", stockUom: "LTR", avgPrice: 110.0, lastPrice: 110.0, purchaseCount: 4, lastPurchaseDate: "2026-04-07" },
  { supplier: "RAWABI", item: "VINYL GLOVES (10X100P) L", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 72.0, lastPrice: 72.0, purchaseCount: 4, lastPurchaseDate: "2026-04-21" },
  { supplier: "RAWABI", item: "BAKING POWDER (1KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 17.0, lastPrice: 17.0, purchaseCount: 4, lastPurchaseDate: "2026-01-21" },
  { supplier: "RAWABI", item: "BAKING PAPER (1X500 PCS)", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 101.5, lastPrice: 73.0, purchaseCount: 4, lastPurchaseDate: "2026-04-16" },
  { supplier: "RAWABI", item: "STRAWBERRY FILLING ( 5KG X4)", purchaseUom: "CRT", stockUom: "KG", avgPrice: 102.0, lastPrice: 100.0, purchaseCount: 4, lastPurchaseDate: "2026-04-19" },
  { supplier: "RAWABI", item: "VANILLA POWDER", purchaseUom: "KG", stockUom: "KG", avgPrice: 32.0, lastPrice: 32.0, purchaseCount: 3, lastPurchaseDate: "2026-04-12" },
  { supplier: "RAWABI", item: "SUGAR POWDER ( 50KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 131.0, lastPrice: 131.0, purchaseCount: 3, lastPurchaseDate: "2025-12-30" },
  { supplier: "RAWABI", item: "CLING FILM 1X45CM 5KG (JMBO)", purchaseUom: "PCS", stockUom: "KG", avgPrice: 50.6667, lastPrice: 42.0, purchaseCount: 3, lastPurchaseDate: "2026-04-22" },
  { supplier: "RAWABI", item: "FACE MASK 1X50PCS", purchaseUom: "BOX", stockUom: "BOX", avgPrice: 46.25, lastPrice: 60.0, purchaseCount: 3, lastPurchaseDate: "2026-04-11" },
  { supplier: "RAWABI", item: "MAXI ROLL 2PLY 400GRM (1X6)", purchaseUom: "CRT", stockUom: "CRT", avgPrice: 16.0, lastPrice: 16.0, purchaseCount: 3, lastPurchaseDate: "2026-01-21" },
  { supplier: "RAWABI", item: "HAIR NET 10*100 PCS", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 45.0, lastPrice: 35.0, purchaseCount: 3, lastPurchaseDate: "2026-04-09" },
  { supplier: "RAWABI", item: "GARBAGE BAG 95*110 20PKT", purchaseUom: "CRT", stockUom: "CRT", avgPrice: 48.0, lastPrice: 48.0, purchaseCount: 3, lastPurchaseDate: "2025-12-25" },
  { supplier: "RAWABI", item: "FLOUR NO.1 (50KG)", purchaseUom: "BAG", stockUom: "KG", avgPrice: 140.0, lastPrice: 135.0, purchaseCount: 2, lastPurchaseDate: "2026-03-05" },
  { supplier: "RAWABI", item: "AREEJ MARGARINE ( 25KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 295.0, lastPrice: 295.0, purchaseCount: 2, lastPurchaseDate: "2025-12-25" },
  { supplier: "RAWABI", item: "BAKING POWDER (25KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 365.0, lastPrice: 365.0, purchaseCount: 2, lastPurchaseDate: "2026-02-22" },
  { supplier: "RAWABI", item: "DATES PASTE ( 5KG*3 )", purchaseUom: "CRT", stockUom: "KG", avgPrice: 90.0, lastPrice: 90.0, purchaseCount: 2, lastPurchaseDate: "2026-01-21" },
  { supplier: "RAWABI", item: "RED COLOR BOTTLE FOSTER 6*12*28ML", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 31.5, lastPrice: 31.5, purchaseCount: 2, lastPurchaseDate: "2026-03-30" },
  { supplier: "RAWABI", item: "VANILLA ESSENSE 28ML*6*12", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 31.5, lastPrice: 31.5, purchaseCount: 2, lastPurchaseDate: "2026-03-30" },
  { supplier: "RAWABI", item: "VANILLA ESSENSE 28ML*12", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 16.0, lastPrice: 12.0, purchaseCount: 2, lastPurchaseDate: "2026-03-02" },
  { supplier: "RAWABI", item: "VANILLA POWDER 1KG", purchaseUom: "KG", stockUom: "KG", avgPrice: 47.0, lastPrice: 47.0, purchaseCount: 1, lastPurchaseDate: "2025-12-20" },
  { supplier: "RAWABI", item: "VINYL GLOVES (12X100P) L", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 72.0, lastPrice: 72.0, purchaseCount: 1, lastPurchaseDate: "2026-04-16" },
  { supplier: "RAWABI", item: "PURATOS GOAL 10KG", purchaseUom: "BAG", stockUom: "KG", avgPrice: 128.0, lastPrice: 128.0, purchaseCount: 1, lastPurchaseDate: "2026-03-05" },
  { supplier: "RAWABI", item: "ANTISEPTIC LIQUID DETTOL 6*2LTR", purchaseUom: "CRT", stockUom: "LTR", avgPrice: 28.0, lastPrice: 28.0, purchaseCount: 1, lastPurchaseDate: "2026-03-02" },
  { supplier: "RAWABI", item: "KITCHEN APRON (10X100PCS)", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 55.0, lastPrice: 55.0, purchaseCount: 1, lastPurchaseDate: "2026-02-22" },
  { supplier: "RAWABI", item: "KITCHEN APRON (5PCS)", purchaseUom: "SET", stockUom: "PCS", avgPrice: 5.0, lastPrice: 5.0, purchaseCount: 1, lastPurchaseDate: "2026-02-22" },
  { supplier: "RAWABI", item: "TUTTY FRUTY MIX (15KG)", purchaseUom: "BAG", stockUom: "KG", avgPrice: 98.0, lastPrice: 98.0, purchaseCount: 1, lastPurchaseDate: "2026-03-28" },
  { supplier: "RAWABI", item: "ZATHER POWDER 5KG", purchaseUom: "CRT", stockUom: "KG", avgPrice: 45.0, lastPrice: 45.0, purchaseCount: 1, lastPurchaseDate: "2025-12-09" },
  { supplier: "RAWABI", item: "DETERGENT SUPPER EXCEL 25 KG", purchaseUom: "BAG", stockUom: "KG", avgPrice: 65.0, lastPrice: 65.0, purchaseCount: 1, lastPurchaseDate: "2026-04-20" },
  { supplier: "RAWABI", item: "ROSE WATER 12*500ML", purchaseUom: "BOX", stockUom: "PCS", avgPrice: 35.0, lastPrice: 35.0, purchaseCount: 1, lastPurchaseDate: "2026-03-15" },
  { supplier: "RAWABI", item: "HAND WASH LIQUID 4X5LTR", purchaseUom: "CRT", stockUom: "LTR", avgPrice: 27.0, lastPrice: 27.0, purchaseCount: 1, lastPurchaseDate: "2026-03-08" },
  { supplier: "RAWABI", item: "ROSE WATER 500ML", purchaseUom: "PCS", stockUom: "PCS", avgPrice: 3.0, lastPrice: 3.0, purchaseCount: 1, lastPurchaseDate: "2025-12-31" },
  { supplier: "RAWABI", item: "INSTANT YEAST 20*500GM", purchaseUom: "PCS", stockUom: "PCS", avgPrice: 6.5, lastPrice: 6.5, purchaseCount: 1, lastPurchaseDate: "2026-03-05" },
  { supplier: "REALPACK", item: "ENGLISH CAKE TRAY/PAN CAKE 800PCS", purchaseUom: "PCS", stockUom: "PCS", avgPrice: 0.7025, lastPrice: 0.56, purchaseCount: 4, lastPurchaseDate: "2026-04-22" },
  { supplier: "REALPACK", item: "BAKING PAPER (1X500 PCS)", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 75.0, lastPrice: 75.0, purchaseCount: 1, lastPurchaseDate: "2026-04-08" },
  { supplier: "REALPACK", item: "KITCHEN APRON (10X100PCS)", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 60.0, lastPrice: 60.0, purchaseCount: 1, lastPurchaseDate: "2026-04-21" },
  { supplier: "ROYAL PACK", item: "CUP CAKE PAPER (12X1000PCS) 9.5CM", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 145.0, lastPrice: 145.0, purchaseCount: 2, lastPurchaseDate: "2026-01-13" },
  { supplier: "ROYAL PACK", item: "CUP CAKE PAPER (16X1000PCS) 9.5CM", purchaseUom: "CRT", stockUom: "PCS", avgPrice: 145.0, lastPrice: 145.0, purchaseCount: 2, lastPurchaseDate: "2025-12-11" },
  { supplier: "SANA FOOD", item: "CHAPATI - RADISSON BLUE HOTEL", purchaseUom: "PKT", stockUom: "PKT", avgPrice: 1.25, lastPrice: 1.25, purchaseCount: 13, lastPurchaseDate: "2026-01-26" },
  { supplier: "VALENCIA", item: "DRY YEAST (500G X 20)", purchaseUom: "CRT", stockUom: "KG", avgPrice: 115.8462, lastPrice: 115.0, purchaseCount: 104, lastPurchaseDate: "2026-04-22" },
  { supplier: "VALENCIA", item: "GLUTEN (25KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 220.0, lastPrice: 220.0, purchaseCount: 60, lastPurchaseDate: "2026-04-22" },
  { supplier: "VALENCIA", item: "MUNNA BUTTER (20KG ) (VEG SHORTNING)", purchaseUom: "CRT", stockUom: "KG", avgPrice: 145.0, lastPrice: 145.0, purchaseCount: 44, lastPurchaseDate: "2026-01-26" },
  { supplier: "VALENCIA", item: "MUNNA BUTTER ( 20KG ) ( VEG SHORTNING )", purchaseUom: "CRT", stockUom: "KG", avgPrice: 145.0, lastPrice: 145.0, purchaseCount: 25, lastPurchaseDate: "2025-12-31" },
  { supplier: "VALENCIA", item: "GLUTEN ( 25KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 220.0, lastPrice: 220.0, purchaseCount: 15, lastPurchaseDate: "2025-12-31" },
  { supplier: "VALENCIA", item: "MILK POWDER (25KG)", purchaseUom: "BAG", stockUom: "KG", avgPrice: 232.5, lastPrice: 210.0, purchaseCount: 14, lastPurchaseDate: "2026-04-19" },
  { supplier: "VALENCIA", item: "APPLE FILLING ( 2.7KG )", purchaseUom: "BAG", stockUom: "KG", avgPrice: 61.67, lastPrice: 61.67, purchaseCount: 6, lastPurchaseDate: "2026-01-12" },
  { supplier: "VALENCIA", item: "BAKE XL ECO IMPROVER 10KG", purchaseUom: "BAG", stockUom: "KG", avgPrice: 185.0, lastPrice: 185.0, purchaseCount: 2, lastPurchaseDate: "2026-04-12" },
  { supplier: "VALENCIA", item: "PALM OIL (18L)", purchaseUom: "PCS", stockUom: "LTR", avgPrice: 95.0, lastPrice: 95.0, purchaseCount: 1, lastPurchaseDate: "2026-03-15" },
  { supplier: "WEST BAY", item: "ICE CUBE 25 KG", purchaseUom: "BAG", stockUom: "KG", avgPrice: 12.5, lastPrice: 12.5, purchaseCount: 25, lastPurchaseDate: "2026-04-22" },
] as const;

export const importSupplierCatalog = mutation({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args) => {
    // ── Resolve company ───────────────────────────────────────────────────────
    const company = args.companyId
      ? await ctx.db.get(args.companyId)
      : await ctx.db.query("companies").first();
    if (!company) throw new Error("No company found.");
    const companyId = company._id;

    // ── AP account fallback ───────────────────────────────────────────────────
    const apAccount = await ctx.db
      .query("accounts")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .filter((q) => q.eq(q.field("code"), "2101"))
      .first();
    if (!apAccount) throw new Error("AP account 2101 not found.");
    const apAccountId = apAccount._id;

    // ── Build items lookup (normalizedName -> itemId) ─────────────────────────
    const allItems = await ctx.db
      .query("items")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .collect();
    const itemByNorm = new Map<string, typeof allItems[0]["_id"]>();
    for (const it of allItems) {
      const norm = (it.nameEn ?? it.nameAr).trim().toUpperCase();
      itemByNorm.set(norm, it._id);
    }

    // ── UPSERT suppliers ──────────────────────────────────────────────────────
    let suppCreated = 0, suppUpdated = 0;
    const supplierIdByNorm = new Map<string, Id<"suppliers">>();

    for (const s of SUPPLIER_MASTER_DATA) {
      const norm = s.supplier.trim().toUpperCase();
      const existing = await ctx.db
        .query("suppliers")
        .withIndex("by_company_normalized", (q) =>
          q.eq("companyId", companyId).eq("normalizedName", norm)
        )
        .first();

      if (existing) {
        // Update stats; do NOT overwrite user-maintained nameAr if already customized
        await ctx.db.patch(existing._id, {
          totalPurchases: s.totalPurchases,
          lastPurchaseDate: s.lastPurchaseDate,
          purchaseRows: s.purchaseRows,
          normalizedName: norm,
        });
        supplierIdByNorm.set(norm, existing._id);
        suppUpdated++;
      } else {
        // Generate a safe unique code
        const code = "IMP-" + norm.replace(/[^A-Z0-9]/g, "").slice(0, 12);
        const codeExists = await ctx.db
          .query("suppliers")
          .withIndex("by_company_code", (q) =>
            q.eq("companyId", companyId).eq("code", code)
          )
          .first();
        const finalCode = codeExists ? code + "-" + Date.now() : code;

        const newId = await ctx.db.insert("suppliers", {
          companyId,
          code: finalCode,
          nameAr: s.display,
          nameEn: s.display,
          accountId: apAccountId,
          isActive: true,
          createdAt: Date.now(),
          normalizedName: norm,
          totalPurchases: s.totalPurchases,
          lastPurchaseDate: s.lastPurchaseDate,
          purchaseRows: s.purchaseRows,
        });
        supplierIdByNorm.set(norm, newId);
        suppCreated++;
      }
    }

    // ── UPSERT supplier-item catalog rows ─────────────────────────────────────
    let siCreated = 0, siUpdated = 0, siUnresolved = 0;

    for (const row of SUPPLIER_CATALOG_DATA) {
      const suppNorm = row.supplier.trim().toUpperCase();
      const suppId = supplierIdByNorm.get(suppNorm);
      if (!suppId) continue; // shouldn't happen

      const itemNorm = row.item.trim().toUpperCase();
      const linkedItemId = itemByNorm.get(itemNorm);
      const isUnresolved = !linkedItemId;

      // Match by normalizedItemName within this supplier
      const existing = await ctx.db
        .query("supplierItems")
        .withIndex("by_supplier_normalized_name", (q) =>
          q.eq("supplierId", suppId).eq("normalizedItemName", itemNorm)
        )
        .first();

      const patch = {
        supplierItemName: row.item,
        normalizedItemName: itemNorm,
        purchaseUom: row.purchaseUom,
        stockUom: row.stockUom,
        avgPrice: row.avgPrice,
        lastPrice: row.lastPrice,
        purchaseCount: row.purchaseCount,
        lastPurchaseDate: row.lastPurchaseDate,
        isUnresolved,
        ...(linkedItemId ? { itemId: linkedItemId } : {}),
        supplierPrice: row.lastPrice,
      };

      if (existing) {
        await ctx.db.patch(existing._id, patch);
        siUpdated++;
      } else {
        await ctx.db.insert("supplierItems", {
          supplierId: suppId,
          companyId,
          ...patch,
          createdAt: Date.now(),
        });
        siCreated++;
      }

      if (isUnresolved) siUnresolved++;
    }

    return {
      message: "Supplier catalog import complete",
      suppliers: { created: suppCreated, updated: suppUpdated },
      supplierItems: { created: siCreated, updated: siUpdated, unresolved: siUnresolved },
    };
  },
});
