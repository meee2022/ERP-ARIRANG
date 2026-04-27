/**
 * Full Excel Import Script
 * Reads CK.xlsx, WH.xlsx, Staff Master.xlsx and imports everything into Convex
 * 
 * Run after `npx convex dev` is running:
 *   node scripts/import_all.mjs
 */

import { ConvexHttpClient } from "convex/browser";
import XLSX from "xlsx";
import fs from "fs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env.local") });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) { console.error("Missing NEXT_PUBLIC_CONVEX_URL in .env.local"); process.exit(1); }

const client = new ConvexHttpClient(CONVEX_URL);
const ROOT = resolve(__dirname, "../../");

// ─── helpers ──────────────────────────────────────────────────────────────────
function toNum(v) { const n = Number(v); return isNaN(n) ? 0 : n; }
function toStr(v) { return v == null || v === "" ? "" : String(v).trim(); }
function excelDateToStr(serial) {
  if (!serial || typeof serial !== "number") return "";
  const d = XLSX.SSF.parse_date_code(serial);
  if (!d) return "";
  const mm = String(d.m).padStart(2, "0");
  const dd = String(d.d).padStart(2, "0");
  return `${d.y}-${mm}-${dd}`;
}

async function upsert(fn, args) {
  try { await client.mutation(fn, args); return true; }
  catch (e) { console.warn(`  ✗ ${fn}: ${e.message?.slice(0, 80)}`); return false; }
}

// ─── 1. MATERIALS from CK RM-PM List ─────────────────────────────────────────
async function importMaterials(wb, branchTag) {
  const ws = wb.Sheets["RM-PM List"];
  if (!ws) return;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  // row 1 = header, data starts row 2 (index 2)
  let ok = 0;
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    const matId = r[4];
    if (!matId || typeof matId !== "number") continue;
    // last few columns hint at category
    let category = "";
    for (let c = r.length - 1; c >= r.length - 8; c--) {
      if (r[c] && typeof r[c] === "string" && r[c].trim()) { category = r[c].trim(); break; }
    }
    const mat = {
      materialId: String(matId),
      type: toStr(r[2]) || "RAW",
      group: toStr(r[3]) || "General",
      description: toStr(r[5]),
      baseUnit: toStr(r[6]) || "EA",
      basePrice: toNum(r[7]),
      packSize: toStr(r[8]) || "1",
      purchUnit: toStr(r[9]) || "EA",
      purchPrice: toNum(r[10]),
      conversion: toNum(r[11]) || 1,
      category: category || branchTag,
    };
    if (!mat.description) continue;
    if (await upsert("operations:upsertMaterial", mat)) ok++;
  }
  console.log(`  Materials (${branchTag}): ${ok} inserted/updated`);
}

// ─── 2. SFG PRODUCTS from SFG Recipe ─────────────────────────────────────────
async function importSFG(wb) {
  const ws = wb.Sheets["SFG Recipe"];
  if (!ws) return;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  // Build product map: productId -> { meta, ingredients[] }
  const products = new Map();
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    const prodId = r[1];
    if (!prodId || typeof prodId !== "number") continue;
    const key = String(prodId);
    if (!products.has(key)) {
      products.set(key, {
        productId: key,
        description: toStr(r[2]),
        uom: toStr(r[3]) || "EA",
        unitCost: toNum(r[4]),
        foodCost: toNum(r[5]),
        pkgCost: toNum(r[6]),
        quantity: toNum(r[7]),
        ingredients: [],
      });
    }
    // ingredient: cols 9-14
    const matId = r[9];
    if (matId && typeof matId === "number") {
      products.get(key).ingredients.push({
        materialId: String(matId),
        materialDescription: toStr(r[10]),
        baseUnit: toStr(r[11]) || "EA",
        unitCost: toNum(r[12]),
        quantity: toNum(r[13]),
        cost: toNum(r[14]),
      });
    }
  }
  let ok = 0;
  for (const p of products.values()) {
    if (!p.description) continue;
    if (await upsert("operations:upsertSFG", p)) ok++;
  }
  console.log(`  SFG Products: ${ok} inserted/updated`);
}

// ─── 3. FG PRODUCTS from FG Recipe ───────────────────────────────────────────
async function importFG(wb) {
  const ws = wb.Sheets["FG Recipe"];
  if (!ws) return;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  // FG List for selling price & GP%
  const fgListWs = wb.Sheets["FG List & Sales"];
  const fgList = new Map();
  if (fgListWs) {
    const lr = XLSX.utils.sheet_to_json(fgListWs, { header: 1, defval: "" });
    for (let i = 2; i < lr.length; i++) {
      const r = lr[i];
      const pid = r[4]; // FG product col 4
      if (pid && typeof pid === "number") {
        fgList.set(String(pid), {
          sellingUnit: toStr(r[9]) || "EA",
          sellingPrice: toNum(r[10]),
          gpPercent: toNum(r[11]),
          conversion: toNum(r[8]) || 1,
        });
      }
    }
  }
  const products = new Map();
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    const prodId = r[1];
    if (!prodId || typeof prodId !== "number") continue;
    const key = String(prodId);
    if (!products.has(key)) {
      const extra = fgList.get(key) || {};
      products.set(key, {
        productId: key,
        description: toStr(r[2]),
        uom: toStr(r[3]) || "EA",
        unitCost: toNum(r[4]),
        foodCost: toNum(r[5]),
        pkgCost: toNum(r[6]),
        conversion: extra.conversion || toNum(r[7]) || 1,
        sellingUnit: extra.sellingUnit || "EA",
        sellingPrice: extra.sellingPrice || 0,
        gpPercent: extra.gpPercent || 0,
        ingredients: [],
      });
    }
    const matId = r[9];
    if (matId && typeof matId === "number") {
      products.get(key).ingredients.push({
        materialId: String(matId),
        materialDescription: toStr(r[10]),
        baseUnit: toStr(r[11]) || "EA",
        unitCost: toNum(r[12]),
        quantity: toNum(r[13]),
        cost: toNum(r[14]),
      });
    }
  }
  let ok = 0;
  for (const p of products.values()) {
    if (!p.description) continue;
    if (await upsert("operations:upsertFG", p)) ok++;
  }
  console.log(`  FG Products: ${ok} inserted/updated`);
}

// ─── 4. STAFF ─────────────────────────────────────────────────────────────────
async function importStaff(wb) {
  const ws = wb.Sheets["Staff Master"];
  if (!ws) return;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  // Row 1 = header (index 1), data from index 2
  let ok = 0;
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    const empNo = toStr(r[0]);
    if (!empNo || empNo === "Emp. No") continue;
    const staff = {
      empNo,
      company: toStr(r[1]) || "Common",
      firstName: toStr(r[6]),
      lastName: (toStr(r[7]) + " " + toStr(r[8])).trim(),
      position: toStr(r[9]),
      category: toStr(r[10]) || "Worker",
      location: toStr(r[11]) || "Central Kitchen",
      nationality: toStr(r[12]),
      workStatus: toStr(r[13]) || "Yes",
      joiningDate: excelDateToStr(r[4]) || toStr(r[4]),
      basicSalary: toNum(r[16]),
      foodAllowance: toNum(r[17]),
      hra: toNum(r[18]),
      tra: toNum(r[19]),
      otherAllowance: toNum(r[20]),
      presentDayCost: toNum(r[21]),
      vacationDayCost: toNum(r[22]),
      vacationDays: toNum(r[15]) || 21,
      tripsPerYear: toNum(r[14]) || 0.5,
    };
    if (!staff.firstName && !staff.position) continue;
    if (await upsert("operations:upsertStaff", staff)) ok++;
  }
  console.log(`  Staff: ${ok} inserted/updated`);
}

// ─── 5. EVENTS ────────────────────────────────────────────────────────────────
async function importEvents(wb) {
  const ws = wb.Sheets["Event & Catering"];
  if (!ws) return;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  let ok = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0] || typeof r[0] !== "number") continue; // no serial no
    const dateStr = excelDateToStr(r[1]) || toStr(r[1]);
    const event = {
      entryId: `EV-${String(r[0]).padStart(5, "0")}`,
      date: dateStr,
      branchId: toStr(r[2]) || "CK",
      invoiceNo: toStr(r[3]),
      code: toStr(r[4]),
      particular: toStr(r[5]),
      unit: toStr(r[6]) || "EA",
      price: toNum(r[7]),
      quantity: toNum(r[8]),
      amount: toNum(r[9]),
      paymentStatus: toStr(r[10]) || "Pending",
      dueDays: toStr(r[11]) || "",
    };
    if (!event.particular) continue;
    if (await upsert("operations:upsertEvent", event)) ok++;
  }
  console.log(`  Events: ${ok} inserted/updated`);
}

// ─── 6. PETTY CASH ────────────────────────────────────────────────────────────
async function importPettyCash(wb) {
  const ws = wb.Sheets["Petty Cash"];
  if (!ws) return;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  let ok = 0, count = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    // detect rows with a date serial
    const dateVal = r[1];
    const descVal = r[3] || r[4];
    const amount = r[6] || r[7];
    if (!dateVal || typeof dateVal !== "number" || !descVal) continue;
    count++;
    const pc = {
      entryId: `PC-${count.toString().padStart(5, "0")}`,
      date: excelDateToStr(dateVal),
      branchId: toStr(r[2]) || "CK",
      description: toStr(descVal),
      category: toStr(r[5]) || "Other Cost",
      amount: toNum(amount),
      approvedBy: toStr(r[8]) || "Manager",
      docNo: toStr(r[0]) || `PC-${count}`,
    };
    if (!pc.description) continue;
    if (await upsert("operations:upsertPettyCash", pc)) ok++;
  }
  console.log(`  Petty Cash: ${ok} inserted/updated`);
}

// ─── 7. WH STOCK from Mat.Mgmt. ──────────────────────────────────────────────
async function importWhStock(wb, branchId) {
  const ws = wb.Sheets["Mat.Mgmt."];
  if (!ws) return;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  // Find the month/year from header area
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Data starts after multi-row header, find first row with a material ID
  let dataStart = 0;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][4] && typeof rows[i][4] === "number" && rows[i][4] > 100000) {
      dataStart = i; break;
    }
  }
  // We need the RM-PM list to cross-reference material IDs
  const rmRows = XLSX.utils.sheet_to_json(wb.Sheets["RM-PM List"] || {}, { header: 1, defval: "" });
  const matMap = new Map();
  for (let i = 2; i < rmRows.length; i++) {
    const r = rmRows[i];
    if (r[4] && typeof r[4] === "number") {
      matMap.set(r[4], { base: toNum(r[7]) }); // basePrice
    }
  }

  let ok = 0;
  for (let i = dataStart; i < rows.length; i++) {
    const r = rows[i];
    const matId = r[4];
    if (!matId || typeof matId !== "number") continue;
    // Col 7 = Opening Stock, 8 = Total Received
    // Mat.Mgmt has: openingStock at col 7, qtyReceived col 8, balance col 10
    // Physical inventory cols vary per month. Take col 12 as physical.
    const opening = toNum(r[7]);
    const received = toNum(r[8]);
    const balance = toNum(r[10]);
    const physical = toNum(r[12]) || balance;
    const basePrice = (matMap.get(matId) || {}).base || 0;
    const varianceQty = physical - balance;
    const stock = {
      branchId,
      materialId: String(matId),
      month,
      year,
      openingStock: opening,
      qtyReceived: received,
      qtyOut: opening + received - balance,
      qtyBalance: balance,
      physicalInventory: physical,
      varianceQty,
      varianceValue: varianceQty * basePrice,
    };
    if (await upsert("operations:upsertInventoryStock", stock)) ok++;
  }
  console.log(`  ${branchId} Stock: ${ok} inserted/updated`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Starting full Excel import...\n");

  // ── CK.xlsx ──
  const ckPath = resolve(ROOT, "CK.xlsx");
  if (fs.existsSync(ckPath)) {
    console.log("📂 CK.xlsx");
    const ckWb = XLSX.readFile(ckPath);
    await importMaterials(ckWb, "CK");
    await importSFG(ckWb);
    await importFG(ckWb);
    await importStaff(ckWb);
    await importEvents(ckWb);
    await importPettyCash(ckWb);
    await importWhStock(ckWb, "CK");
  } else {
    console.warn("⚠ CK.xlsx not found at", ckPath);
  }

  // ── WH.xlsx ──
  const whPath = resolve(ROOT, "WH.xlsx");
  if (fs.existsSync(whPath)) {
    console.log("\n📂 WH.xlsx");
    const whWb = XLSX.readFile(whPath);
    await importMaterials(whWb, "WH");
    await importWhStock(whWb, "WH");
  } else {
    console.warn("⚠ WH.xlsx not found at", whPath);
  }

  // ── Staff Master.xlsx ──
  const staffPath = resolve(ROOT, "Staff Master.xlsx");
  if (fs.existsSync(staffPath)) {
    console.log("\n📂 Staff Master.xlsx");
    const staffWb = XLSX.readFile(staffPath);
    await importStaff(staffWb);
  }

  console.log("\n✅ Import complete!");
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
