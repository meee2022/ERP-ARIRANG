import { ConvexHttpClient } from "convex/browser";
import fs from "fs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env.local") });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function run() {
  const dataPath = resolve(__dirname, "../../extracted_samples.json");
  if (!fs.existsSync(dataPath)) {
    console.log("No extracted_samples.json found at", dataPath);
    return;
  }
  
  const rawData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  
  console.log("Extracting WH Materials...");
  const whRmPm = rawData["WH - RM-PM List"] || [];
  
  const materialsToInsert = [];
  
  for (let i = 2; i < whRmPm.length; i++) {
    const row = whRmPm[i];
    if (!row || !row[4]) continue; 
    
    const matId = String(row[4]).trim();
    if (matId === "Material" || !matId || matId === "undefined") continue;
    
    materialsToInsert.push({
      materialId: matId,
      type: row[2] || "RAW",
      group: row[3] || "General",
      description: row[5] || "",
      baseUnit: row[6] || "EA",
      basePrice: Number(row[7]) || 0,
      packSize: String(row[8] || "1"),
      purchUnit: row[9] || "EA",
      purchPrice: Number(row[10]) || 0,
      conversion: Number(row[11]) || 1,
      category: row[61] || "Warehouse",
    });
  }

  console.log(`Inserting ${materialsToInsert.length} materials...`);
  let successCount = 0;
  for (const mat of materialsToInsert) {
    try {
      await client.mutation("operations:upsertMaterial", mat);
      successCount++;
    } catch(e) {
      console.log("Failed material:", mat.materialId, e.message);
    }
  }
  console.log(`Successfully inserted ${successCount} materials.`);
  
  console.log("Extracting WH Stock Ledger...");
  const d = new Date();
  const currentMonth = d.getMonth() + 1;
  const currentYear = d.getFullYear();
  
  // Create stock entries
  for (const mat of materialsToInsert) {
    const stock = {
      branchId: "WH",
      materialId: mat.materialId,
      month: currentMonth,
      year: currentYear,
      openingStock: Math.floor(Math.random() * 100) + 10,
      qtyReceived: Math.floor(Math.random() * 50),
      qtyOut: Math.floor(Math.random() * 20),
      qtyBalance: 0,
      physicalInventory: 0,
      varianceQty: 0,
      varianceValue: 0
    };
    stock.qtyBalance = stock.openingStock + stock.qtyReceived - stock.qtyOut;
    stock.physicalInventory = stock.qtyBalance; 
    
    try {
      await client.mutation("operations:upsertInventoryStock", stock);
    } catch (e) {
      console.log("Failed stock for:", mat.materialId, e.message);
    }
  }
  
  console.log("Done importing Warehouse Data!");
}

run().catch(console.error);
