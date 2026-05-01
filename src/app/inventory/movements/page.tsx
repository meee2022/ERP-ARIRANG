// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/useAppStore";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { LoadingState } from "@/components/ui/data-display";
import {
  RotateCcw, Search, ChevronDown, ChevronUp, ArrowRight,
  Package, TrendingUp, TrendingDown,
} from "lucide-react";
import { formatDateShort } from "@/lib/utils";

function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function todayISO() { return new Date().toISOString().split("T")[0]; }

// ── Type config ───────────────────────────────────────────────────────────────
const TYPE_CFG: Record<string, { ar: string; en: string; bg: string; color: string; border: string }> = {
  purchase_receipt: { ar: "استلام شراء",    en: "Purchase Receipt",  bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  sales_issue:      { ar: "إصدار مبيعات",   en: "Sales Issue",       bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  sales_return:     { ar: "مرتجع مبيعات",   en: "Sales Return",      bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  purchase_return:  { ar: "مرتجع مشتريات",  en: "Purchase Return",   bg: "#fefce8", color: "#a16207", border: "#fde68a" },
  adjustment_in:    { ar: "تسوية زيادة",    en: "Adjustment In",     bg: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe" },
  adjustment_out:   { ar: "تسوية نقص",      en: "Adjustment Out",    bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  transfer_out:     { ar: "تحويل صادر",     en: "Transfer Out",      bg: "var(--brand-50)", color: "var(--brand-700)", border: "var(--brand-100)" },
  transfer_in:      { ar: "تحويل وارد",     en: "Transfer In",       bg: "#f0fdfa", color: "#0f766e", border: "#99f6e4" },
  opening_stock:    { ar: "رصيد افتتاحي",   en: "Opening Stock",     bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  wastage:          { ar: "هدر وتالف",      en: "Wastage",           bg: "#fef2f2", color: "#9f1239", border: "#fecdd3" },
};

// ── Movement Lines (expanded row) ─────────────────────────────────────────────
function MovementLines({ movementId, isRTL }: { movementId: string; isRTL: boolean }) {
  const lines = useQuery(api.inventory.getMovementLines, { movementId: movementId as any });

  if (lines === undefined) return (
    <tr><td colSpan={7} className="px-6 py-3 text-center text-[11px] text-[color:var(--ink-400)]">
      {isRTL ? "جارٍ التحميل..." : "Loading..."}
    </td></tr>
  );

  if (lines.length === 0) return (
    <tr><td colSpan={7} className="px-6 py-3 text-center text-[11px] text-[color:var(--ink-400)]">
      {isRTL ? "لا توجد أصناف" : "No items"}
    </td></tr>
  );

  return (
    <>
      {lines.map((line: any, i: number) => (
        <tr key={line._id} className={`bg-[color:var(--brand-50)] ${i < lines.length - 1 ? "border-b border-[color:var(--brand-100)]" : ""}`}>
          <td className="px-6 py-2.5 ps-10" colSpan={2}>
            <div className="flex items-center gap-2">
              <Package className="h-3.5 w-3.5 text-[color:var(--ink-400)] shrink-0" />
              <span className="font-mono text-[10px] text-[color:var(--ink-400)] bg-white px-1.5 py-0.5 rounded border border-[color:var(--ink-100)]">
                {line.itemCode ?? "—"}
              </span>
              <span className="text-[12px] font-medium text-[color:var(--ink-800)]">
                {isRTL ? (line.itemNameAr || line.itemNameEn) : (line.itemNameEn || line.itemNameAr)}
              </span>
            </div>
          </td>
          <td className="px-6 py-2.5" colSpan={2}>
            <span className={`text-[12px] font-bold tabular-nums ${line.quantity > 0 ? "text-emerald-700" : "text-red-600"}`}>
              {line.quantity > 0 ? "+" : ""}{line.quantity?.toFixed(3)}
            </span>
          </td>
          <td className="px-6 py-2.5 text-[11px] text-[color:var(--ink-400)] tabular-nums" colSpan={3}>
            {line.unitCost > 0 ? `${line.unitCost?.toFixed(3)} × ${line.quantity?.toFixed(3)} = ${(line.unitCost * line.quantity)?.toFixed(3)}` : "—"}
          </td>
        </tr>
      ))}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InventoryMovementsPage() {
  const { t, isRTL } = useI18n();
  const selectedBranch = useAppStore((s) => s.selectedBranch);

  const [fromDate,    setFromDate]    = useState(startOfMonthISO());
  const [toDate,      setToDate]      = useState(todayISO());
  const [search,      setSearch]      = useState("");
  const [typeFilter,  setTypeFilter]  = useState("all");
  const [expandedId,  setExpandedId]  = useState<string | null>(null);

  const companies = useQuery(api.seed.getCompanies, {});
  const company   = companies?.[0];

  const movements = useQuery(
    api.inventory.getInventoryMovements,
    company ? { companyId: company._id, fromDate, toDate,
      branchId: selectedBranch !== "all" ? (selectedBranch as any) : undefined } : "skip"
  );

  const loading  = movements === undefined;
  const filtered = (movements ?? []).filter((m: any) => {
    if (typeFilter !== "all" && m.movementType !== typeFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (m.movementNumber || "").toLowerCase().includes(s) ||
           (m.warehouseName  || "").toLowerCase().includes(s) ||
           (m.notes          || "").toLowerCase().includes(s);
  });

  const totalMovements = filtered.length;
  const totalLines     = filtered.reduce((s: number, m: any) => s + (m.lineCount ?? 0), 0);

  function typeCfg(type: string) { return TYPE_CFG[type] ?? { ar: type, en: type, bg: "#f8f8f8", color: "#555", border: "#ddd" }; }
  function typeLabel(type: string) { const c = typeCfg(type); return isRTL ? c.ar : c.en; }

  const toggleExpand = (id: string) => setExpandedId((prev) => prev === id ? null : id);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm"
          style={{ background: "linear-gradient(135deg,var(--brand-50),var(--brand-100))", border: "1px solid var(--brand-100)" }}>
          <RotateCcw className="h-6 w-6" style={{ color: "var(--brand-700)" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[color:var(--ink-900)]">
            {isRTL ? "سجل حركات المخزون" : "Inventory Movement Log"}
          </h1>
          <p className="text-sm text-[color:var(--ink-400)] mt-0.5">
            {isRTL ? "كل حركات المخزون في مكان واحد — مشتريات، مبيعات، تحويلات، تسويات" : "All stock movements in one place — purchases, sales, transfers, adjustments"}
          </p>
        </div>
        {totalMovements > 0 && (
          <span className="ms-auto text-[12px] font-bold px-3 py-1 rounded-full border"
            style={{ background: "var(--brand-50)", color: "var(--brand-700)", borderColor: "var(--brand-100)" }}>
            {totalMovements} {isRTL ? "حركة" : "movements"}
          </span>
        )}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <FilterPanel>
        <FilterField label={isRTL ? "من" : "From"}>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input-field h-9 w-auto" />
        </FilterField>
        <FilterField label={isRTL ? "إلى" : "To"}>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input-field h-9 w-auto" />
        </FilterField>
        <FilterField label={isRTL ? "النوع" : "Type"}>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field h-9 w-auto">
            <option value="all">{isRTL ? "الكل" : "All"}</option>
            {Object.entries(TYPE_CFG).map(([key, cfg]) => (
              <option key={key} value={key}>{isRTL ? cfg.ar : cfg.en}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label={isRTL ? "بحث" : "Search"}>
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[color:var(--ink-400)] ${isRTL ? "right-3" : "left-3"}`} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={isRTL ? "رقم الحركة أو المستودع..." : "Movement # or warehouse..."}
              className={`input-field h-9 ${isRTL ? "pr-9" : "pl-9"}`} />
          </div>
        </FilterField>
      </FilterPanel>

      {/* ── KPI strip ───────────────────────────────────────────────────── */}
      {totalMovements > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-3">
          {[
            { label: isRTL ? "إجمالي الحركات" : "Total Movements", value: totalMovements, icon: RotateCcw },
            { label: isRTL ? "إجمالي الأسطر"  : "Total Lines",     value: totalLines,     icon: Package  },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white rounded-xl border border-[color:var(--brand-100)] px-4 py-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "var(--brand-50)" }}>
                <Icon className="h-4 w-4" style={{ color: "var(--brand-700)" }} />
              </div>
              <div>
                <p className="text-[18px] font-bold text-[color:var(--ink-900)] leading-none tabular-nums">{value}</p>
                <p className="text-[11px] text-[color:var(--ink-400)] mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[color:var(--ink-100)] overflow-hidden shadow-sm">
        {loading ? (
          <LoadingState label={isRTL ? "جارٍ التحميل..." : "Loading..."} />
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--brand-50)" }}>
              <RotateCcw className="h-7 w-7" style={{ color: "var(--brand-700)" }} />
            </div>
            <p className="text-[14px] font-semibold text-[color:var(--ink-600)]">
              {isRTL ? "لا توجد حركات في هذه الفترة" : "No movements in this period"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr style={{ background: "#6b1523" }}>
                  <th className="px-6 py-3 text-start font-semibold text-white/80 text-[11px] uppercase tracking-wide w-10" />
                  <th className="px-6 py-3 text-start font-semibold text-white/80 text-[11px] uppercase tracking-wide">{isRTL ? "رقم الحركة" : "Movement No"}</th>
                  <th className="px-6 py-3 text-start font-semibold text-white/80 text-[11px] uppercase tracking-wide">{isRTL ? "النوع" : "Type"}</th>
                  <th className="px-6 py-3 text-start font-semibold text-white/80 text-[11px] uppercase tracking-wide">{isRTL ? "التاريخ" : "Date"}</th>
                  <th className="px-6 py-3 text-start font-semibold text-white/80 text-[11px] uppercase tracking-wide">{isRTL ? "المستودع / المسار" : "Warehouse / Route"}</th>
                  <th className="px-6 py-3 text-center font-semibold text-white/80 text-[11px] uppercase tracking-wide">{isRTL ? "أسطر" : "Lines"}</th>
                  <th className="px-6 py-3 text-center font-semibold text-white/80 text-[11px] uppercase tracking-wide">{isRTL ? "الترحيل" : "Posting"}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m: any, idx: number) => {
                  const cfg       = typeCfg(m.movementType);
                  const isExpanded = expandedId === m._id;
                  const isTransfer = m.movementType === "transfer_out" || m.movementType === "transfer_in";
                  const destName   = isRTL
                    ? m.destinationWarehouseName
                    : (m.destinationWarehouseNameEn || m.destinationWarehouseName);
                  const srcName    = isRTL ? m.warehouseName : (m.warehouseNameEn || m.warehouseName);

                  return (
                    <React.Fragment key={m._id}>
                      <tr
                        onClick={() => toggleExpand(m._id)}
                        className={`border-b border-[color:var(--ink-50)] transition-colors cursor-pointer
                          ${isExpanded ? "bg-[color:var(--brand-50)]" : idx % 2 === 0 ? "hover:bg-[color:var(--ink-50)]" : "bg-[#fafafa] hover:bg-[color:var(--ink-50)]"}`}
                      >
                        {/* Expand toggle */}
                        <td className="px-3 py-3.5 text-center">
                          <div className="h-5 w-5 rounded-md flex items-center justify-center mx-auto transition-colors"
                            style={{ background: isExpanded ? "var(--brand-100)" : "var(--ink-50)" }}>
                            {isExpanded
                              ? <ChevronUp  className="h-3 w-3" style={{ color: "var(--brand-700)" }} />
                              : <ChevronDown className="h-3 w-3 text-[color:var(--ink-400)]" />}
                          </div>
                        </td>

                        {/* Movement number */}
                        <td className="px-6 py-3.5">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md border"
                            style={{ background: "var(--brand-50)", color: "var(--brand-700)", borderColor: "var(--brand-100)" }}>
                            {m.movementNumber}
                          </span>
                        </td>

                        {/* Type badge */}
                        <td className="px-6 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                            style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                            {typeLabel(m.movementType)}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-6 py-3.5 text-[color:var(--ink-500)] tabular-nums">
                          {formatDateShort(m.movementDate)}
                        </td>

                        {/* Warehouse / Route */}
                        <td className="px-6 py-3.5">
                          {isTransfer && destName ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-[color:var(--ink-800)]">{srcName ?? "—"}</span>
                              <ArrowRight className="h-3.5 w-3.5 text-[color:var(--brand-700)] shrink-0" />
                              <span className="font-medium text-[color:var(--ink-800)]">{destName}</span>
                            </div>
                          ) : (
                            <span className="font-medium text-[color:var(--ink-800)]">{srcName ?? "—"}</span>
                          )}
                          {m.notes && (
                            <p className="text-[10px] text-[color:var(--ink-400)] mt-0.5 truncate max-w-[220px]">{m.notes}</p>
                          )}
                        </td>

                        {/* Line count */}
                        <td className="px-6 py-3.5 text-center">
                          <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-2 rounded-full text-[11px] font-bold"
                            style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}>
                            {m.lineCount ?? 0}
                          </span>
                        </td>

                        {/* Posting status */}
                        <td className="px-6 py-3.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            m.postingStatus === "posted"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${m.postingStatus === "posted" ? "bg-emerald-500" : "bg-amber-400"}`} />
                            {m.postingStatus === "posted" ? (isRTL ? "مرحّل" : "Posted") : (isRTL ? "معلق" : "Pending")}
                          </span>
                        </td>
                      </tr>

                      {/* Expanded lines */}
                      {isExpanded && (
                        <MovementLines movementId={m._id} isRTL={isRTL} />
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
