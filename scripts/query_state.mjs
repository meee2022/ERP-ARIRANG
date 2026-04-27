import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env.local") });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const COMPANY_ID = "s577b7bqztmzw5gcsm29427y99855f1s";

const [items, suppliers] = await Promise.all([
  client.query("items:getAllItems", { companyId: COMPANY_ID }),
  client.query("suppliers:getAll", { companyId: COMPANY_ID }),
]);

console.log("=== MASTER ITEMS (" + items.length + ") ===");
items.forEach(i => console.log(`  ${i._id} | ${i.code} | ${i.nameEn || i.nameAr} | ${i.itemType} | pt=${i.purchaseType||''}`));

console.log("\n=== SUPPLIERS (" + suppliers.length + ") ===");
suppliers.forEach(s => console.log(`  ${s._id} | ${s.nameEn || s.nameAr}`));

// Now get all supplierItems for each supplier
let allSI = [];
for (const s of suppliers) {
  const catalog = await client.query("supplierItems:getSupplierCatalog", { supplierId: s._id });
  for (const si of catalog) {
    allSI.push({ ...si, supplierName: s.nameEn || s.nameAr });
  }
}

const unresolved = allSI.filter(si => si.isUnresolved || !si.itemId);
const resolved = allSI.filter(si => !si.isUnresolved && si.itemId);

console.log(`\n=== SUPPLIER CATALOG: ${allSI.length} total | ${resolved.length} linked | ${unresolved.length} UNRESOLVED ===`);
console.log("\n--- UNRESOLVED ---");
unresolved.forEach(si => console.log(`  ${si._id} | [${si.supplierName}] | ${si.supplierItemName} | uom=${si.purchaseUom} | price=${si.lastPrice}`));
