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

const ACCENT = "#22d3ee";

const STATUS_CFG: Record<string, { label: string; labelAr: string; color: string; bg: string; icon: any }> = {
  ready:           { label: "Ready",              labelAr: "جاهز للترحيل",       color: "#34d399", bg: "#34d39920", icon: CheckCircle2 },
  partial:         { label: "Partial",             labelAr: "بعض المكونات ناقصة", color: "#fbbf24", bg: "#fbbf2420", icon: AlertTriangle },
  no_output_item:  { label: "Output item missing", labelAr: "الصنف غير موجود",    color: "#f87171", bg: "#f8717120", icon: XCircle },
  already_exists:  { label: "Already migrated",   labelAr: "مرحّل مسبقاً",       color: "#60a5fa", bg: "#60a5fa20", icon: Info },
};

export default function MigrateRecipesPage() {
  const { isRTL } = useI18n();

  // Step 1: Import seed items state
  const [importingItems, setImportingItems]   = useState(false);
  const [importResult, setImportResult]       = useState<any>(null);
  const [showItemsDetail, setShowItemsDetail] = useState(false);

  // Step 1.5: Auto-discover + import missing items
  const [importingMissing, setImportingMissing] = useState(false);
  const [missingImportResult, setMissingImportResult] = useState<any>(null);

  // Step 2: Migrate recipes state
  const [migrating, setMigrating]     = useState(false);
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

  const step1Done = itemsPreview.toImport === 0 || !!importResult?.imported;
  const step2Ready = recipesPreview.summary.ready > 0;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={isRTL ? "ترحيل الوصفات من النظام القديم" : "Migrate Recipes from Legacy System"}
        subtitle={isRTL
          ? "استيراد الأصناف والوصفات من نظام Observers2"
          : "Import items and recipes from Observers2 system"}
        icon={FlaskConical}
        iconColor={ACCENT}
      />

      <Link href="/production/recipes"
        className="inline-flex items-center gap-1.5 text-[12px] hover:underline"
        style={{ color: ACCENT }}>
        <ArrowLeft className="h-3.5 w-3.5" />
        {isRTL ? "رجوع إلى الوصفات" : "Back to Recipes"}
      </Link>

      {/* ─── STEP 1: Import Production Items ─────────────────────── */}
      <div className="rounded-xl border overflow-hidden"
        style={{ background: "var(--card)", borderColor: step1Done ? "#34d39930" : "rgba(255,255,255,0.1)" }}>

        <div className="px-5 py-4 flex items-center justify-between gap-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <span className="h-8 w-8 rounded-full flex items-center justify-center text-[13px] font-bold"
              style={{ background: step1Done ? "#34d39920" : "#22d3ee20", color: step1Done ? "#34d399" : ACCENT,
                border: `1px solid ${step1Done ? "#34d39940" : "#22d3ee40"}` }}>
              {step1Done ? "✓" : "1"}
            </span>
            <div>
              <p className="font-semibold text-[14px]" style={{ color: "var(--foreground)" }}>
                {isRTL ? "الخطوة 1: استيراد أصناف الإنتاج" : "Step 1: Import Production Items"}
              </p>
              <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                {isRTL
                  ? "استيراد 30 صنف SFG + 228 مادة خام من تقرير Production Transfer"
                  : "Import 30 SFG items + 228 raw materials from Production Transfer Report"}
              </p>
            </div>
          </div>
          <button onClick={() => setShowItemsDetail(!showItemsDetail)}
            style={{ color: "var(--muted-foreground)" }}>
            {showItemsDetail ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        <div className="px-5 py-4">
          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: isRTL ? "إجمالي الأصناف" : "Total Items",    value: itemsPreview.total,        color: ACCENT },
              { label: isRTL ? "موجود بالفعل" : "Already Exists",  value: itemsPreview.alreadyExists, color: "#34d399" },
              { label: isRTL ? "سيتم استيراده" : "To Import",       value: itemsPreview.toImport,      color: "#fbbf24" },
            ].map((k) => (
              <div key={k.label} className="rounded-lg p-3 border border-white/8" style={{ background: "var(--background)" }}>
                <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
                <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{k.label}</p>
              </div>
            ))}
          </div>

          {/* Missing UOMs warning */}
          {itemsPreview.missingUom > 0 && (
            <div className="rounded-lg p-3 border border-yellow-500/30 mb-4" style={{ background: "#fbbf2410" }}>
              <p className="text-[12px]" style={{ color: "#fbbf24" }}>
                ⚠️ {isRTL ? "وحدات قياس غير موجودة في النظام" : "UOMs not found in system"}:{" "}
                {itemsPreview.uomsMissing.join(", ")}
              </p>
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <div className={`rounded-lg p-3 border mb-4 ${importResult.error ? "border-red-500/30" : "border-green-500/30"}`}
              style={{ background: importResult.error ? "#f8717110" : "#34d39910" }}>
              {importResult.error
                ? <p className="text-[13px]" style={{ color: "#f87171" }}>❌ {importResult.error}</p>
                : <p className="text-[13px]" style={{ color: "#34d399" }}>
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
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold disabled:opacity-50"
              style={{ background: ACCENT, color: "#0f172a" }}>
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
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    {["Code", "Name", "Type", "UOM"].map(h =>
                      <th key={h} className="px-3 py-2 text-start font-semibold"
                        style={{ color: "var(--muted-foreground)" }}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {itemsPreview.missingExamples.map((item: any) => (
                    <tr key={item.code} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td className="px-3 py-1.5 font-mono" style={{ color: ACCENT }}>{item.code}</td>
                      <td className="px-3 py-1.5" style={{ color: "var(--foreground)" }}>{item.nameEn}</td>
                      <td className="px-3 py-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                          style={{ background: item.itemType === 'SFG' ? "#a78bfa20" : "#34d39920",
                            color: item.itemType === 'SFG' ? "#a78bfa" : "#34d399" }}>
                          {item.itemType}
                        </span>
                      </td>
                      <td className="px-3 py-1.5" style={{ color: "var(--muted-foreground)" }}>{item.uomCode}</td>
                    </tr>
                  ))}
                  {itemsPreview.toImport > 20 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-center text-[11px]"
                        style={{ color: "var(--muted-foreground)" }}>
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
        <div className="rounded-xl border overflow-hidden"
          style={{ background: "var(--card)", borderColor: missingImportResult?.imported > 0 ? "#34d39930" : "#fbbf2430" }}>

          <div className="px-5 py-4 border-b border-white/8 flex items-center gap-3">
            <span className="h-8 w-8 rounded-full flex items-center justify-center text-[13px] font-bold"
              style={{ background: "#fbbf2420", color: "#fbbf24", border: "1px solid #fbbf2440" }}>
              {missingImportResult?.imported > 0 ? "✓" : "!"}
            </span>
            <div>
              <p className="font-semibold text-[14px]" style={{ color: "#fbbf24" }}>
                {isRTL ? "أصناف ناقصة — اكتُشفت تلقائياً من الوصفات القديمة" : "Missing Items — Auto-discovered from legacy recipes"}
              </p>
              <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
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
                { label: isRTL ? "إجمالي الناقص" : "Total Missing", value: missingItemsPreview.totalMissing, color: "#fbbf24" },
                { label: isRTL ? "SFG (نصف مصنّع)" : "SFG (Semi-finished)", value: missingItemsPreview.missingSFGCount, color: "#a78bfa" },
                { label: isRTL ? "مواد خام" : "Raw Materials", value: missingItemsPreview.missingRMCount, color: "#34d399" },
              ].map((k) => (
                <div key={k.label} className="rounded-lg p-3 border border-white/8" style={{ background: "var(--background)" }}>
                  <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
                  <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{k.label}</p>
                </div>
              ))}
            </div>

            {/* Sample table */}
            {missingItemsPreview.examples?.length > 0 && (
              <div className="rounded-lg border border-white/8 overflow-hidden mb-4">
                <table className="w-full text-[11.5px]">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      {["Code", "Name", "Type"].map(h =>
                        <th key={h} className="px-3 py-2 text-start font-semibold" style={{ color: "var(--muted-foreground)" }}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {missingItemsPreview.examples.map((item: any) => (
                      <tr key={item.code} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td className="px-3 py-1.5 font-mono" style={{ color: ACCENT }}>{item.code}</td>
                        <td className="px-3 py-1.5" style={{ color: "var(--foreground)" }}>{item.name}</td>
                        <td className="px-3 py-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                            style={{ background: item.itemType === 'SFG' ? "#a78bfa20" : "#34d39920",
                              color: item.itemType === 'SFG' ? "#a78bfa" : "#34d399" }}>
                            {item.itemType}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {missingItemsPreview.totalMissing > 30 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-center text-[11px]"
                          style={{ color: "var(--muted-foreground)" }}>
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
              <div className={`rounded-lg p-3 border mb-4 ${missingImportResult.error ? "border-red-500/30" : "border-green-500/30"}`}
                style={{ background: missingImportResult.error ? "#f8717110" : "#34d39910" }}>
                {missingImportResult.error
                  ? <p className="text-[13px]" style={{ color: "#f87171" }}>❌ {missingImportResult.error}</p>
                  : <p className="text-[13px]" style={{ color: "#34d399" }}>
                      ✅ {isRTL
                        ? `تم استيراد ${missingImportResult.imported} صنف ناقص (${missingImportResult.skipped} موجود مسبقاً)`
                        : `Imported ${missingImportResult.imported} missing items (${missingImportResult.skipped} already existed)`}
                      {missingImportResult.errors?.length > 0 && (
                        <span style={{ color: "#fbbf24" }}> · {missingImportResult.errors.length} errors</span>
                      )}
                    </p>}
              </div>
            )}

            {/* Action button */}
            {!missingImportResult && (
              <button
                onClick={handleImportMissingItems}
                disabled={importingMissing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold disabled:opacity-50"
                style={{ background: "#fbbf24", color: "#0f172a" }}>
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
      <div className="rounded-xl border overflow-hidden"
        style={{ background: "var(--card)", borderColor: migrateResult?.summary?.migrated > 0 ? "#34d39930" : "rgba(255,255,255,0.1)" }}>

        <div className="px-5 py-4 border-b border-white/8 flex items-center gap-3">
          <span className="h-8 w-8 rounded-full flex items-center justify-center text-[13px] font-bold"
            style={{ background: "#a78bfa20", color: "#a78bfa", border: "1px solid #a78bfa40" }}>
            {migrateResult?.summary?.migrated > 0 ? "✓" : "2"}
          </span>
          <div>
            <p className="font-semibold text-[14px]" style={{ color: "var(--foreground)" }}>
              {isRTL ? "الخطوة 2: ترحيل الوصفات" : "Step 2: Migrate Recipes"}
            </p>
            <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
              {isRTL ? "تحويل بيانات الوصفات القديمة إلى وصفات الإنتاج الجديدة" : "Convert legacy recipe data to new production recipes"}
            </p>
          </div>
        </div>

        <div className="px-5 py-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { key: "ready",          label: isRTL ? "جاهز"         : "Ready",          value: recipesPreview.summary.ready,         color: "#34d399" },
              { key: "partial",        label: isRTL ? "ناقص مكونات"  : "Partial",         value: recipesPreview.summary.partial,       color: "#fbbf24" },
              { key: "no_output_item", label: isRTL ? "صنف مفقود"    : "Missing Output",  value: recipesPreview.summary.noOutputItem,  color: "#f87171" },
              { key: "already_exists", label: isRTL ? "موجود مسبقاً" : "Already Exists",  value: recipesPreview.summary.alreadyExists, color: "#60a5fa" },
            ].map((k) => (
              <button key={k.key}
                onClick={() => setFilterStatus(filterStatus === k.key ? "all" : k.key)}
                className="rounded-lg p-3 border text-start transition-all"
                style={{ background: "var(--background)", borderColor: filterStatus === k.key ? k.color : "rgba(255,255,255,0.08)" }}>
                <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
                <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{k.label}</p>
              </button>
            ))}
          </div>

          {/* Migrate button */}
          {step2Ready && !migrateResult && (
            <button
              onClick={handleMigrateRecipes}
              disabled={migrating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold mb-4 disabled:opacity-50"
              style={{ background: "#a78bfa", color: "#0f172a" }}>
              {migrating
                ? <><RefreshCw className="h-4 w-4 animate-spin" />{isRTL ? "جارٍ الترحيل..." : "Migrating..."}</>
                : <><Play className="h-4 w-4" />{isRTL ? `ترحيل ${recipesPreview.summary.ready} وصفة` : `Migrate ${recipesPreview.summary.ready} recipes`}</>}
            </button>
          )}

          {!step2Ready && recipesPreview.summary.noOutputItem > 0 && (
            <div className="rounded-lg p-3 border border-yellow-500/30 mb-4" style={{ background: "#fbbf2410" }}>
              <p className="text-[12px]" style={{ color: "#fbbf24" }}>
                ⚠️ {isRTL
                  ? `لازم تستورد الأصناف الناقصة أولاً (${recipesPreview.summary.noOutputItem} وصفة ناقص صنفها)`
                  : `Import the missing items first (${recipesPreview.summary.noOutputItem} recipes have no output item)`}
              </p>
            </div>
          )}

          {/* Migrate result */}
          {migrateResult && (
            <div className={`rounded-lg p-3 border mb-4 ${migrateResult.error ? "border-red-500/30" : "border-green-500/30"}`}
              style={{ background: migrateResult.error ? "#f8717110" : "#34d39910" }}>
              {migrateResult.error
                ? <p style={{ color: "#f87171" }}>❌ {migrateResult.error}</p>
                : <>
                    <p className="text-[13px] font-semibold" style={{ color: "#34d399" }}>
                      ✅ {isRTL ? `تم ترحيل ${migrateResult.summary.migrated} وصفة بنجاح` : `Migrated ${migrateResult.summary.migrated} recipes`}
                    </p>
                    {migrateResult.summary.skipped > 0 && (
                      <p className="text-[11px] mt-1" style={{ color: "var(--muted-foreground)" }}>
                        {isRTL ? `${migrateResult.summary.skipped} وصفة تم تخطيها` : `${migrateResult.summary.skipped} skipped`}
                      </p>
                    )}
                    <Link href="/production/recipes" className="inline-block mt-2 text-[12px] underline" style={{ color: ACCENT }}>
                      {isRTL ? "عرض الوصفات ←" : "View Recipes →"}
                    </Link>
                  </>}
            </div>
          )}

          {/* Recipes table */}
          <div className="rounded-lg border border-white/8 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/8 flex items-center justify-between">
              <span className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>
                {isRTL ? "تفاصيل الوصفات" : "Recipe Details"}
                <span className="ms-2 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                  ({filtered.length})
                </span>
              </span>
              {filterStatus !== "all" && (
                <button onClick={() => setFilterStatus("all")} className="text-[11px] hover:underline" style={{ color: ACCENT }}>
                  {isRTL ? "إلغاء الفلتر" : "Clear"}
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {[isRTL?"كود":"Code", isRTL?"الاسم":"Name", isRTL?"مكونات":"Ing.", isRTL?"الصنف":"ERP Item", isRTL?"الحالة":"Status", isRTL?"ملاحظات":"Notes"]
                      .map(h => <th key={h} className="px-3 py-2 text-start font-semibold" style={{ color: "var(--muted-foreground)" }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r: any) => {
                    const cfg = STATUS_CFG[r.status] ?? STATUS_CFG.ready;
                    const Icon = cfg.icon;
                    return (
                      <tr key={r.fgCode} className="hover:bg-white/4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td className="px-3 py-2 font-mono text-[11px]" style={{ color: ACCENT }}>{r.fgCode}</td>
                        <td className="px-3 py-2" style={{ color: "var(--foreground)" }}>{r.fgName}</td>
                        <td className="px-3 py-2 tabular-nums text-center" style={{ color: "var(--foreground)" }}>{r.lineCount}</td>
                        <td className="px-3 py-2 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                          {r.outputItemName ?? <span style={{ color: "#f87171" }}>—</span>}
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold"
                            style={{ color: cfg.color, background: cfg.bg }}>
                            <Icon className="h-3 w-3" />
                            {isRTL ? cfg.labelAr : cfg.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[10.5px]" style={{ color: "#f87171" }}>
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
