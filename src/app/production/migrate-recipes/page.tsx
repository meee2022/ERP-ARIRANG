// @ts-nocheck
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  FlaskConical, CheckCircle2, AlertTriangle, XCircle,
  RefreshCw, Play, Info, ArrowLeft, Package, Database,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import Link from "next/link";

const STATUS_CFG: Record<string, { label: string; labelAr: string; cls: string; bg: string; icon: any }> = {
  ready:           { label: "Ready",              labelAr: "جاهز للترحيل",       cls: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  partial:         { label: "Partial",             labelAr: "بعض المكونات ناقصة", cls: "text-amber-700",   bg: "bg-amber-50 border-amber-200",     icon: AlertTriangle },
  no_output_item:  { label: "Output item missing", labelAr: "الصنف غير موجود",    cls: "text-red-600",     bg: "bg-red-50 border-red-200",         icon: XCircle },
  already_exists:  { label: "Already migrated",   labelAr: "مرحّل مسبقاً",       cls: "text-blue-700",   bg: "bg-blue-50 border-blue-200",       icon: Info },
};

export default function MigrateRecipesPage() {
  const { isRTL } = useI18n();

  const [importingItems, setImportingItems]   = useState(false);
  const [importResult, setImportResult]       = useState<any>(null);
  const [showItemsDetail, setShowItemsDetail] = useState(false);

  const [importingMissing, setImportingMissing] = useState(false);
  const [missingImportResult, setMissingImportResult] = useState<any>(null);

  const [migrating, setMigrating]         = useState(false);
  const [migrateResult, setMigrateResult] = useState<any>(null);
  const [filterStatus, setFilterStatus]   = useState<string>("all");

  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const itemsPreview = useQuery(
    api.production.previewProductionItemsImport,
    companyId ? { companyId } : "skip"
  );
  const missingItemsPreview = useQuery(
    api.production.discoverMissingItemsPreview,
    companyId ? { companyId } : "skip"
  );
  const recipesPreview = useQuery(
    api.production.previewLegacyRecipeMigration,
    companyId ? { companyId } : "skip"
  );

  const importItems        = useMutation(api.production.importProductionItems);
  const importMissingItems = useMutation(api.production.importMissingLegacyItems);
  const migrateAll         = useMutation(api.production.migrateLegacyRecipes);

  const loading = !companyId || itemsPreview === undefined || missingItemsPreview === undefined || recipesPreview === undefined;
  if (loading) return <LoadingState />;

  const filtered = recipesPreview.recipes.filter((r: any) =>
    filterStatus === "all" ? true : r.status === filterStatus
  );

  async function handleImportItems() {
    if (!companyId) return;
    setImportingItems(true);
    setImportResult(null);
    try {
      const res = await importItems({ companyId });
      setImportResult(res);
    } catch (e: any) {
      setImportResult({ error: e.message });
    } finally {
      setImportingItems(false);
    }
  }

  async function handleImportMissingItems() {
    if (!companyId) return;
    setImportingMissing(true);
    setMissingImportResult(null);
    try {
      const res = await importMissingItems({ companyId });
      setMissingImportResult(res);
    } catch (e: any) {
      setMissingImportResult({ error: e.message });
    } finally {
      setImportingMissing(false);
    }
  }

  async function handleMigrateRecipes() {
    if (!companyId) return;
    setMigrating(true);
    setMigrateResult(null);
    try {
      const res = await migrateAll({ companyId });
      setMigrateResult(res);
    } catch (e: any) {
      setMigrateResult({ error: e.message });
    } finally {
      setMigrating(false);
    }
  }

  const step1Done  = itemsPreview.toImport === 0 || !!importResult?.imported;
  const step2Ready = recipesPreview.summary.ready > 0;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={isRTL ? "ترحيل الوصفات من النظام القديم" : "Migrate Recipes from Legacy System"}
        subtitle={isRTL
          ? "استيراد الأصناف والوصفات من نظام Observers2"
          : "Import items and recipes from Observers2 system"}
        icon={FlaskConical}
        iconColor="var(--brand-700)"
      />

      <Link href="/production/recipes"
        className="inline-flex items-center gap-1.5 text-[12px] text-[color:var(--brand-700)] hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" />
        {isRTL ? "رجوع إلى الوصفات" : "Back to Recipes"}
      </Link>

      {/* ─── STEP 1: Import Production Items ─────────────────────── */}
      <div className={`bg-white rounded-xl border overflow-hidden ${step1Done ? "border-emerald-200" : "border-[color:var(--ink-100)]"}`}>

        <div className="px-5 py-4 flex items-center justify-between gap-4 border-b border-[color:var(--ink-100)]">
          <div className="flex items-center gap-3">
            <span className={`h-8 w-8 rounded-full flex items-center justify-center text-[13px] font-bold border ${step1Done ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-[color:var(--brand-50)] text-[color:var(--brand-700)] border-[color:var(--brand-200)]"}`}>
              {step1Done ? "✓" : "1"}
            </span>
            <div>
              <p className="font-semibold text-[14px] text-[color:var(--ink-900)]">
                {isRTL ? "الخطوة 1: استيراد أصناف الإنتاج" : "Step 1: Import Production Items"}
              </p>
              <p className="text-[11px] text-[color:var(--ink-400)]">
                {isRTL
                  ? "استيراد 30 صنف SFG + 228 مادة خام من تقرير Production Transfer"
                  : "Import 30 SFG items + 228 raw materials from Production Transfer Report"}
              </p>
            </div>
          </div>
          <button onClick={() => setShowItemsDetail(!showItemsDetail)} className="text-[color:var(--ink-400)]">
            {showItemsDetail ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        <div className="px-5 py-4">
          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: isRTL ? "إجمالي الأصناف" : "Total Items",    value: itemsPreview.total,        numCls: "text-[color:var(--brand-700)]" },
              { label: isRTL ? "موجود بالفعل" : "Already Exists",  value: itemsPreview.alreadyExists, numCls: "text-emerald-700" },
              { label: isRTL ? "سيتم استيراده" : "To Import",       value: itemsPreview.toImport,      numCls: "text-amber-700" },
            ].map((k) => (
              <div key={k.label} className="rounded-lg p-3 border border-[color:var(--ink-100)] bg-[color:var(--ink-50)]">
                <p className={`text-xl font-bold ${k.numCls}`}>{k.value}</p>
                <p className="text-[11px] text-[color:var(--ink-400)]">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Missing UOMs warning */}
          {itemsPreview.missingUom > 0 && (
            <div className="rounded-lg p-3 border border-amber-200 bg-amber-50 mb-4">
              <p className="text-[12px] text-amber-700">
                ⚠️ {isRTL ? "وحدات قياس غير موجودة في النظام" : "UOMs not found in system"}:{" "}
                {itemsPreview.uomsMissing.join(", ")}
              </p>
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <div className={`rounded-lg p-3 border mb-4 ${importResult.error ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
              {importResult.error
                ? <p className="text-[13px] text-red-600">❌ {importResult.error}</p>
                : <p className="text-[13px] text-emerald-700">
                    ✅ {isRTL ? `تم استيراد ${importResult.imported} صنف` : `Imported ${importResult.imported} items`}
                    {importResult.skipped > 0 && ` (${importResult.skipped} ${isRTL ? "تم تخطيها" : "skipped"})`}
                    {importResult.errors?.length > 0 && ` · ${importResult.errors.length} ${isRTL ? "خطأ" : "errors"}`}
                  </p>}
            </div>
          )}

          {/* Action button */}
          {itemsPreview.toImport > 0 && !importResult && (
            <button
              onClick={handleImportItems}
              disabled={importingItems}
              className="btn-primary flex items-center gap-2 disabled:opacity-50">
              {importingItems
                ? <><RefreshCw className="h-4 w-4 animate-spin" />{isRTL ? "جارٍ الاستيراد..." : "Importing..."}</>
                : <><Package className="h-4 w-4" />{isRTL ? `استيراد ${itemsPreview.toImport} صنف` : `Import ${itemsPreview.toImport} items`}</>}
            </button>
          )}

          {/* Collapsible detail */}
          {showItemsDetail && itemsPreview.missingExamples?.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr style={{ background: "#6b1523" }}>
                    {["Code", "Name", "Type", "UOM"].map(h =>
                      <th key={h} className="px-3 py-2 text-start font-semibold text-white/80">{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {itemsPreview.missingExamples.map((item: any) => (
                    <tr key={item.code} className="border-b border-[color:var(--ink-100)] hover:bg-[color:var(--ink-50)]">
                      <td className="px-3 py-1.5 font-mono text-[color:var(--brand-700)]">{item.code}</td>
                      <td className="px-3 py-1.5 text-[color:var(--ink-900)]">{item.nameEn}</td>
                      <td className="px-3 py-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${item.itemType === 'SFG' ? "bg-violet-50 text-violet-700" : "bg-emerald-50 text-emerald-700"}`}>
                          {item.itemType}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-[color:var(--ink-400)]">{item.uomCode}</td>
                    </tr>
                  ))}
                  {itemsPreview.toImport > 20 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-center text-[11px] text-[color:var(--ink-400)]">
                        ...و {itemsPreview.toImport - 20} صنف آخر
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ─── STEP 1.5: Auto-discover missing items ───────────────── */}
      {missingItemsPreview && missingItemsPreview.totalMissing > 0 && (
        <div className={`bg-white rounded-xl border overflow-hidden ${missingImportResult?.imported > 0 ? "border-emerald-200" : "border-amber-200"}`}>

          <div className="px-5 py-4 border-b border-[color:var(--ink-100)] flex items-center gap-3">
            <span className="h-8 w-8 rounded-full flex items-center justify-center text-[13px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              {missingImportResult?.imported > 0 ? "✓" : "!"}
            </span>
            <div>
              <p className="font-semibold text-[14px] text-amber-700">
                {isRTL ? "أصناف ناقصة — اكتُشفت تلقائياً من الوصفات القديمة" : "Missing Items — Auto-discovered from legacy recipes"}
              </p>
              <p className="text-[11px] text-[color:var(--ink-400)]">
                {isRTL
                  ? `${missingItemsPreview.missingSFGCount} صنف SFG + ${missingItemsPreview.missingRMCount} مادة خام غير موجودة في النظام`
                  : `${missingItemsPreview.missingSFGCount} SFG items + ${missingItemsPreview.missingRMCount} raw materials not in ERP`}
              </p>
            </div>
          </div>

          <div className="px-5 py-4">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: isRTL ? "إجمالي الناقص" : "Total Missing",       value: missingItemsPreview.totalMissing,    numCls: "text-amber-700" },
                { label: isRTL ? "SFG (نصف مصنّع)" : "SFG (Semi-finished)", value: missingItemsPreview.missingSFGCount, numCls: "text-violet-700" },
                { label: isRTL ? "مواد خام" : "Raw Materials",              value: missingItemsPreview.missingRMCount,  numCls: "text-emerald-700" },
              ].map((k) => (
                <div key={k.label} className="rounded-lg p-3 border border-[color:var(--ink-100)] bg-[color:var(--ink-50)]">
                  <p className={`text-xl font-bold ${k.numCls}`}>{k.value}</p>
                  <p className="text-[11px] text-[color:var(--ink-400)]">{k.label}</p>
                </div>
              ))}
            </div>

            {/* Sample table */}
            {missingItemsPreview.examples?.length > 0 && (
              <div className="rounded-lg border border-[color:var(--ink-100)] overflow-hidden mb-4">
                <table className="w-full text-[11.5px]">
                  <thead style={{ background: "#6b1523" }}>
                    <tr>
                      {["Code", "Name", "Type"].map(h =>
                        <th key={h} className="px-3 py-2 text-start font-semibold text-white/80">{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {missingItemsPreview.examples.map((item: any) => (
                      <tr key={item.code} className="border-b border-[color:var(--ink-100)] hover:bg-[color:var(--ink-50)]">
                        <td className="px-3 py-1.5 font-mono text-[color:var(--brand-700)]">{item.code}</td>
                        <td className="px-3 py-1.5 text-[color:var(--ink-900)]">{item.name}</td>
                        <td className="px-3 py-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${item.itemType === 'SFG' ? "bg-violet-50 text-violet-700" : "bg-emerald-50 text-emerald-700"}`}>
                            {item.itemType}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {missingItemsPreview.totalMissing > 30 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-center text-[11px] text-[color:var(--ink-400)]">
                          ...و {missingItemsPreview.totalMissing - 30} صنف آخر
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Result */}
            {missingImportResult && (
              <div className={`rounded-lg p-3 border mb-4 ${missingImportResult.error ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
                {missingImportResult.error
                  ? <p className="text-[13px] text-red-600">❌ {missingImportResult.error}</p>
                  : <p className="text-[13px] text-emerald-700">
                      ✅ {isRTL
                        ? `تم استيراد ${missingImportResult.imported} صنف ناقص (${missingImportResult.skipped} موجود مسبقاً)`
                        : `Imported ${missingImportResult.imported} missing items (${missingImportResult.skipped} already existed)`}
                      {missingImportResult.errors?.length > 0 && (
                        <span className="text-amber-600"> · {missingImportResult.errors.length} errors</span>
                      )}
                    </p>}
              </div>
            )}

            {/* Action button */}
            {!missingImportResult && (
              <button
                onClick={handleImportMissingItems}
                disabled={importingMissing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 transition-colors">
                {importingMissing
                  ? <><RefreshCw className="h-4 w-4 animate-spin" />{isRTL ? "جارٍ الاستيراد..." : "Importing..."}</>
                  : <><Database className="h-4 w-4" />{isRTL
                      ? `استيراد ${missingItemsPreview.totalMissing} صنف ناقص`
                      : `Import ${missingItemsPreview.totalMissing} missing items`}</>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── STEP 2: Migrate Recipes ─────────────────────────────── */}
      <div className={`bg-white rounded-xl border overflow-hidden ${migrateResult?.summary?.migrated > 0 ? "border-emerald-200" : "border-[color:var(--ink-100)]"}`}>

        <div className="px-5 py-4 border-b border-[color:var(--ink-100)] flex items-center gap-3">
          <span className="h-8 w-8 rounded-full flex items-center justify-center text-[13px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
            {migrateResult?.summary?.migrated > 0 ? "✓" : "2"}
          </span>
          <div>
            <p className="font-semibold text-[14px] text-[color:var(--ink-900)]">
              {isRTL ? "الخطوة 2: ترحيل الوصفات" : "Step 2: Migrate Recipes"}
            </p>
            <p className="text-[11px] text-[color:var(--ink-400)]">
              {isRTL ? "تحويل بيانات الوصفات القديمة إلى وصفات الإنتاج الجديدة" : "Convert legacy recipe data to new production recipes"}
            </p>
          </div>
        </div>

        <div className="px-5 py-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { key: "ready",          label: isRTL ? "جاهز"         : "Ready",          value: recipesPreview.summary.ready,         numCls: "text-emerald-700", borderActive: "border-emerald-400" },
              { key: "partial",        label: isRTL ? "ناقص مكونات"  : "Partial",         value: recipesPreview.summary.partial,       numCls: "text-amber-700",   borderActive: "border-amber-400" },
              { key: "no_output_item", label: isRTL ? "صنف مفقود"    : "Missing Output",  value: recipesPreview.summary.noOutputItem,  numCls: "text-red-600",     borderActive: "border-red-400" },
              { key: "already_exists", label: isRTL ? "موجود مسبقاً" : "Already Exists",  value: recipesPreview.summary.alreadyExists, numCls: "text-blue-700",    borderActive: "border-blue-400" },
            ].map((k) => (
              <button key={k.key}
                onClick={() => setFilterStatus(filterStatus === k.key ? "all" : k.key)}
                className={`rounded-lg p-3 border text-start transition-all bg-[color:var(--ink-50)] hover:bg-white ${filterStatus === k.key ? k.borderActive : "border-[color:var(--ink-100)]"}`}>
                <p className={`text-xl font-bold ${k.numCls}`}>{k.value}</p>
                <p className="text-[11px] text-[color:var(--ink-400)]">{k.label}</p>
              </button>
            ))}
          </div>

          {/* Migrate button */}
          {step2Ready && !migrateResult && (
            <button
              onClick={handleMigrateRecipes}
              disabled={migrating}
              className="btn-primary flex items-center gap-2 mb-4 disabled:opacity-50">
              {migrating
                ? <><RefreshCw className="h-4 w-4 animate-spin" />{isRTL ? "جارٍ الترحيل..." : "Migrating..."}</>
                : <><Play className="h-4 w-4" />{isRTL ? `ترحيل ${recipesPreview.summary.ready} وصفة` : `Migrate ${recipesPreview.summary.ready} recipes`}</>}
            </button>
          )}

          {!step2Ready && recipesPreview.summary.noOutputItem > 0 && (
            <div className="rounded-lg p-3 border border-amber-200 bg-amber-50 mb-4">
              <p className="text-[12px] text-amber-700">
                ⚠️ {isRTL
                  ? `لازم تستورد الأصناف الناقصة أولاً (${recipesPreview.summary.noOutputItem} وصفة ناقص صنفها)`
                  : `Import the missing items first (${recipesPreview.summary.noOutputItem} recipes have no output item)`}
              </p>
            </div>
          )}

          {/* Migrate result */}
          {migrateResult && (
            <div className={`rounded-lg p-3 border mb-4 ${migrateResult.error ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
              {migrateResult.error
                ? <p className="text-red-600">❌ {migrateResult.error}</p>
                : <>
                    <p className="text-[13px] font-semibold text-emerald-700">
                      ✅ {isRTL ? `تم ترحيل ${migrateResult.summary.migrated} وصفة بنجاح` : `Migrated ${migrateResult.summary.migrated} recipes`}
                    </p>
                    {migrateResult.summary.skipped > 0 && (
                      <p className="text-[11px] mt-1 text-[color:var(--ink-500)]">
                        {isRTL ? `${migrateResult.summary.skipped} وصفة تم تخطيها` : `${migrateResult.summary.skipped} skipped`}
                      </p>
                    )}
                    <Link href="/production/recipes" className="inline-block mt-2 text-[12px] underline text-[color:var(--brand-700)]">
                      {isRTL ? "عرض الوصفات ←" : "View Recipes →"}
                    </Link>
                  </>}
            </div>
          )}

          {/* Recipes table */}
          <div className="rounded-lg border border-[color:var(--ink-100)] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[color:var(--ink-100)] flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[color:var(--ink-900)]">
                {isRTL ? "تفاصيل الوصفات" : "Recipe Details"}
                <span className="ms-2 text-[11px] text-[color:var(--ink-400)]">({filtered.length})</span>
              </span>
              {filterStatus !== "all" && (
                <button onClick={() => setFilterStatus("all")} className="text-[11px] hover:underline text-[color:var(--brand-700)]">
                  {isRTL ? "إلغاء الفلتر" : "Clear"}
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead style={{ background: "#6b1523" }}>
                  <tr>
                    {[isRTL?"كود":"Code", isRTL?"الاسم":"Name", isRTL?"مكونات":"Ing.", isRTL?"الصنف":"ERP Item", isRTL?"الحالة":"Status", isRTL?"ملاحظات":"Notes"]
                      .map(h => <th key={h} className="px-3 py-2 text-start font-semibold text-white/80">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r: any) => {
                    const cfg = STATUS_CFG[r.status] ?? STATUS_CFG.ready;
                    const Icon = cfg.icon;
                    return (
                      <tr key={r.fgCode} className="hover:bg-[color:var(--ink-50)] border-b border-[color:var(--ink-100)]">
                        <td className="px-3 py-2 font-mono text-[11px] text-[color:var(--brand-700)]">{r.fgCode}</td>
                        <td className="px-3 py-2 text-[color:var(--ink-900)]">{r.fgName}</td>
                        <td className="px-3 py-2 tabular-nums text-center text-[color:var(--ink-700)]">{r.lineCount}</td>
                        <td className="px-3 py-2 text-[11px] text-[color:var(--ink-400)]">
                          {r.outputItemName ?? <span className="text-red-500">—</span>}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${cfg.bg} ${cfg.cls}`}>
                            <Icon className="h-3 w-3" />
                            {isRTL ? cfg.labelAr : cfg.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[10.5px] text-red-500">
                          {r.missingIngredients?.length > 0
                            ? `${isRTL?"ناقص:":"Missing:"} ${r.missingIngredients.slice(0,2).join(", ")}${r.missingIngredients.length>2?"...":""}`
                            : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
