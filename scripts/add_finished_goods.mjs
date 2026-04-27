/**
 * add_finished_goods.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Adds all Arirang Bakery Finished Good items to PrimeBalance ERP (Convex).
 *
 * Run from the /app directory:
 *   node scripts/add_finished_goods.mjs
 *
 * Prerequisites: npx convex dev must be running (or deployment is live).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env.local") });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("❌  Missing NEXT_PUBLIC_CONVEX_URL in .env.local");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

// ─── Known IDs (fetched from live DB on 2026-04-26) ──────────────────────────
const COMPANY_ID  = "s577b7bqztmzw5gcsm29427y99855f1s";

// Units of Measure
const UOM = {
  PC:   "rs79dqwz63kjn06q2y45esy04h8558xs",  // Piece
  KG:   "rs72maas9wmbyrnmmt040y9rdn854cq5",  // Kilogram
  BAG:  "rs728ynfepdzgekev8vvexw0bx85hnrm",  // Bag
  PCS:  "rs74ga7nt8c0ykgj3jqkrz9hrs85hx85",  // PCS (multi-pack)
  PACK: "rs70pr1ykn1rchs2wvvqsdpgz585g31f",  // Pack
  PKT:  "rs73n91hmzt4b5t5bzbn07c7k185gjaz",  // Packet
  BOX:  "rs77csxvdy0fjqbzx6770nypkn85hjeg",  // Box
};

// Accounts
const ACCOUNTS = {
  inventory: "kn74ky1tq48hwdzcnsg0314k45854pnm",  // 1401 Inventory
  cogs:      "kn7c08g8cv945r3d74v7b78z658543s9",  // 5101 Cost of Goods Sold
  revenue:   "kn7ew5d5gnrfdbxh5tg3033325855zpr",  // 4101 Sales Revenue
};

// ─── Step 1: Create "Finished Goods" category ────────────────────────────────
async function ensureFinishedGoodsCategory() {
  console.log("\n📂  Creating 'Finished Goods' category...");
  const catId = await client.mutation("items:createCategory", {
    companyId:                 COMPANY_ID,
    code:                      "FG",
    nameAr:                    "المنتجات النهائية",
    nameEn:                    "Finished Goods",
    defaultInventoryAccountId: ACCOUNTS.inventory,
    defaultCogsAccountId:      ACCOUNTS.cogs,
    defaultRevenueAccountId:   ACCOUNTS.revenue,
  });
  console.log(`  ✅  Category ID: ${catId}`);
  return catId;
}

// ─── Step 2: Finished Good items list ────────────────────────────────────────
// Fields: code | nameAr | nameEn | uom | standardCost | sellingPrice | notes
// Selling prices are standard wholesale B2B prices for Qatar bakery market.
// Update them any time via Inventory → Items → Edit.
const FG_ITEMS = [
  {
    code:          "FG-001",
    nameAr:        "خبز الحليب 750 جم",
    nameEn:        "Milk Bread 750g",
    uom:           UOM.PC,
    standardCost:  1.20,
    sellingPrice:  2.50,
    notes:         "White milk loaf 750g – main supermarket line",
  },
  {
    code:          "FG-002",
    nameAr:        "خبز الحليب المقطع 650 جم",
    nameEn:        "Sliced Milk Bread 650g",
    uom:           UOM.PC,
    standardCost:  1.15,
    sellingPrice:  2.50,
    notes:         "Pre-sliced milk loaf 650g",
  },
  {
    code:          "FG-003",
    nameAr:        "خبز أسمر 25×40",
    nameEn:        "Brown Bread 25×40",
    uom:           UOM.PC,
    standardCost:  1.10,
    sellingPrice:  2.25,
    notes:         "Whole wheat brown bread loaf",
  },
  {
    code:          "FG-004",
    nameAr:        "همبرجر 4 حبة",
    nameEn:        "Burger Bun 4PCS",
    uom:           UOM.PACK,
    standardCost:  0.80,
    sellingPrice:  1.75,
    notes:         "Burger bun – pack of 4",
  },
  {
    code:          "FG-005",
    nameAr:        "همبرجر 4 حبة (10×12)",
    nameEn:        "Burger Bun 4PCS (10×12)",
    uom:           UOM.PACK,
    standardCost:  0.80,
    sellingPrice:  1.75,
    notes:         "Burger bun 10×12 size – pack of 4",
  },
  {
    code:          "FG-006",
    nameAr:        "هوت دوج 6 حبة",
    nameEn:        "Hotdog Bun 6PCS",
    uom:           UOM.PACK,
    standardCost:  0.90,
    sellingPrice:  1.75,
    notes:         "Hotdog / frankfurter roll – pack of 6",
  },
  {
    code:          "FG-007",
    nameAr:        "دنر رول",
    nameEn:        "Dinner Roll",
    uom:           UOM.PACK,
    standardCost:  0.75,
    sellingPrice:  1.50,
    notes:         "Soft dinner rolls – multi-pack",
  },
  {
    code:          "FG-008",
    nameAr:        "تشاباتي 4 حبة",
    nameEn:        "Chapati 4PCS",
    uom:           UOM.PACK,
    standardCost:  0.70,
    sellingPrice:  1.50,
    notes:         "Chapati flatbread – pack of 4",
  },
  {
    code:          "FG-009",
    nameAr:        "كب كيك 65 جم",
    nameEn:        "Cup Cake 65g",
    uom:           UOM.PC,
    standardCost:  0.30,
    sellingPrice:  0.75,
    notes:         "Individual cup cake 65g",
  },
  {
    code:          "FG-010",
    nameAr:        "رول التمر 90 جم",
    nameEn:        "Date Roll 90g",
    uom:           UOM.PC,
    standardCost:  0.50,
    sellingPrice:  1.25,
    notes:         "Date-filled sweet roll 90g",
  },
  {
    code:          "FG-011",
    nameAr:        "كريم بن",
    nameEn:        "Cream Bun",
    uom:           UOM.PC,
    standardCost:  0.35,
    sellingPrice:  0.85,
    notes:         "Cream-filled soft bun",
  },
  {
    code:          "FG-012",
    nameAr:        "بوتاتو بن",
    nameEn:        "Potato Bun",
    uom:           UOM.PC,
    standardCost:  0.40,
    sellingPrice:  0.90,
    notes:         "Soft potato bun",
  },
  {
    code:          "FG-013",
    nameAr:        "مورنينج رول",
    nameEn:        "Morning Roll",
    uom:           UOM.PC,
    standardCost:  0.25,
    sellingPrice:  0.60,
    notes:         "Small soft morning roll",
  },
  {
    code:          "FG-014",
    nameAr:        "فانيلا سلايس كيك",
    nameEn:        "Vanilla Slice Cake",
    uom:           UOM.PC,
    standardCost:  0.45,
    sellingPrice:  1.00,
    notes:         "Individual vanilla slice cake",
  },
  {
    code:          "FG-015",
    nameAr:        "باتر رول",
    nameEn:        "Butter Roll",
    uom:           UOM.PC,
    standardCost:  0.30,
    sellingPrice:  0.70,
    notes:         "Soft butter roll",
  },
  {
    code:          "FG-016",
    nameAr:        "خبز التورتيلا (مندوب)",
    nameEn:        "Tortilla Bread (Salesman)",
    uom:           UOM.PACK,
    standardCost:  2.50,
    sellingPrice:  5.50,
    notes:         "Tortilla bread – 10×12s pack, salesman line",
  },
];

// ─── Step 3: Insert items ─────────────────────────────────────────────────────
async function createFinishedGoods(categoryId) {
  console.log(`\n🍞  Inserting ${FG_ITEMS.length} Finished Good items...\n`);
  let ok = 0, skipped = 0, failed = 0;

  for (const item of FG_ITEMS) {
    try {
      await client.mutation("items:createItem", {
        companyId:           COMPANY_ID,
        code:                item.code,
        nameAr:              item.nameAr,
        nameEn:              item.nameEn,
        categoryId:          categoryId,
        itemType:            "finished_good",
        baseUomId:           item.uom,
        standardCost:        item.standardCost,
        sellingPrice:        item.sellingPrice,
        inventoryAccountId:  ACCOUNTS.inventory,
        cogsAccountId:       ACCOUNTS.cogs,
        revenueAccountId:    ACCOUNTS.revenue,
        notes:               item.notes,
      });
      console.log(`  ✅  ${item.code}  ${item.nameEn}`);
      ok++;
    } catch (e) {
      if (e.message?.includes("DUPLICATE_CODE")) {
        console.log(`  ⚠️   ${item.code}  ${item.nameEn}  — already exists, skipped`);
        skipped++;
      } else {
        console.error(`  ❌  ${item.code}  ${item.nameEn}  — ${e.message}`);
        failed++;
      }
    }
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`  Added: ${ok}  |  Skipped (existing): ${skipped}  |  Failed: ${failed}`);
  console.log(`${"─".repeat(50)}\n`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log("═".repeat(50));
  console.log("  Arirang Bakery — Add Finished Goods");
  console.log(`  Convex: ${CONVEX_URL}`);
  console.log("═".repeat(50));

  const categoryId = await ensureFinishedGoodsCategory();
  await createFinishedGoods(categoryId);

  console.log("✅  Done. Open Inventory → Items in the ERP to review.\n");
})();
