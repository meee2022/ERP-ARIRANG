// @ts-nocheck
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import { Scale, TrendingDown, Search, Trophy, Users, ChevronDown, ChevronUp } from "lucide-react";

const ACCENT = "#f59e0b";

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--card)", borderColor: "rgba(255,255,255,0.1)" }}>
      <div className="flex items-center gap-3 p-4">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}20` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div>
          <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{label}</p>
          <p className="text-[20px] font-bold tabular-nums" style={{ color }}>{value}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Supplier Price Row ────────────────────────────────────────────────────────
function SupplierRow({ supplier, minPrice, isRTL, rank }: any) {
  const isBest = supplier.lastPrice === minPrice;
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-xl"
      style={{ background: isBest ? "#34d39910" : "transparent", border: isBest ? "1px solid #34d39930" : "1px solid transparent" }}>
      {isBest && <Trophy className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
      {!isBest && <div className="w-3.5 h-3.5 shrink-0 rounded-full text-[9px] font-bold flex items-center justify-center"
        style={{ background: "#ffffff15", color: "var(--muted-foreground)" }}>{rank}</div>}
      <span className="flex-1 text-[12px] truncate" style={{ color: "var(--foreground)" }}>
        {supplier.supplierName}
      </span>
      {supplier.leadDays != null && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full"
          style={{ background: "#60a5fa15", color: "#60a5fa" }}>
          {supplier.leadDays}{isRTL ? " يوم" : "d"}
        </span>
      )}
      <span className="text-[13px] font-bold tabular-nums shrink-0"
        style={{ color: isBest ? "#34d399" : "var(--foreground)" }}>
        {(supplier.lastPrice).toFixed(2)} {supplier.currency}
      </span>
    </div>
  );
}

// ─── Item Card ─────────────────────────────────────────────────────────────────
function ItemCard({ item, isRTL }: { item: any; isRTL: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const savingColor = item.savingPct >= 15 ? "#f87171" : item.savingPct >= 8 ? ACCENT : "#34d399";

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--card)", borderColor: "rgba(255,255,255,0.08)" }}>
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:opacity-80 transition-opacity"
        style={{ background: "var(--background)" }}
      >
        <div className="flex-1 min-w-0 text-start">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded"
              style={{ background: `${ACCENT}20`, color: ACCENT }}>
              {item.code}
            </span>
            <span className="text-[11.5px] px-2 py-0.5 rounded-full"
              style={{ background: "#ffffff10", color: "var(--muted-foreground)" }}>
              <Users className="h-3 w-3 inline me-1" />
              {item.supplierCount} {isRTL ? "موردين" : "suppliers"}
            </span>
          </div>
          <p className="text-[13px] font-semibold mt-1 truncate" style={{ color: "var(--foreground)" }}>
            {isRTL ? item.nameAr : item.nameEn}
          </p>
        </div>

        {/* Price range */}
        <div className="text-end shrink-0">
          <p className="text-[10.5px]" style={{ color: "var(--muted-foreground)" }}>
            {isRTL ? "نطاق السعر" : "Price Range"}
          </p>
          <p className="text-[12px] font-bold tabular-nums" style={{ color: "var(--foreground)" }}>
            {(item.minPrice).toFixed(2)} – {(item.maxPrice).toFixed(2)}
          </p>
          {item.savingPct > 0 && (
            <p className="text-[10.5px] font-semibold" style={{ color: savingColor }}>
              {isRTL ? `وفر ${item.savingPct}%` : `Save ${item.savingPct}%`}
            </p>
          )}
        </div>

        {expanded
          ? <ChevronUp className="h-4 w-4 shrink-0" style={{ color: "var(--muted-foreground)" }} />
          : <ChevronDown className="h-4 w-4 shrink-0" style={{ color: "var(--muted-foreground)" }} />}
      </button>

      {/* Expanded supplier list */}
      {expanded && (
        <div className="px-4 py-3 space-y-1 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <p className="text-[10px] font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>
            {isRTL ? "أسعار الموردين (الأرخص أولاً)" : "Supplier Prices (cheapest first)"}
          </p>
          {item.suppliers.map((s: any, i: number) => (
            <SupplierRow key={s.supplierId} supplier={s} minPrice={item.minPrice} isRTL={isRTL} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function SupplierComparisonPage() {
  const { isRTL } = useI18n();
  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;
  const [search, setSearch] = useState("");

  const data = useQuery(
    api.supplierItems.getSupplierPriceComparison,
    companyId ? { companyId } : "skip"
  );

  if (!companyId) return <LoadingState />;

  const filtered = !data ? null : data.filter((item: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.code.toLowerCase().includes(q) ||
      item.nameAr.includes(search) ||
      (item.nameEn ?? "").toLowerCase().includes(q) ||
      item.suppliers.some((s: any) => s.supplierName.toLowerCase().includes(q))
    );
  });

  const totalItems       = data?.length ?? 0;
  const multiSupplier    = data?.filter((i: any) => i.supplierCount >= 2).length ?? 0;
  const avgSaving        = data?.length
    ? (data.reduce((s: number, i: any) => s + i.savingPct, 0) / data.length).toFixed(1)
    : "0";
  const bestSaving       = data?.length
    ? Math.max(...data.map((i: any) => i.savingPct)).toFixed(1)
    : "0";

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={isRTL ? "مقارنة أسعار الموردين" : "Supplier Price Comparison"}
        subtitle={isRTL
          ? "قارن أسعار الموردين لنفس الصنف واختر الأفضل"
          : "Compare supplier prices per item and pick the best deal"}
        icon={Scale}
        iconColor={ACCENT}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={Scale}       label={isRTL ? "إجمالي الأصناف" : "Total Items"}   value={totalItems}           color={ACCENT} />
        <KpiCard icon={Users}       label={isRTL ? "متعدد الموردين" : "Multi-supplier"} value={multiSupplier}        color="#60a5fa" />
        <KpiCard icon={TrendingDown} label={isRTL ? "متوسط التوفير" : "Avg Saving"}    value={`${avgSaving}%`}       color="#34d399" />
        <KpiCard icon={Trophy}       label={isRTL ? "أعلى توفير" : "Best Saving"}      value={`${bestSaving}%`}      color="#f87171" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted-foreground)" }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isRTL ? "ابحث باسم الصنف أو الكود أو المورد..." : "Search by item name, code or supplier..."}
          className="w-full rounded-xl px-3 py-2.5 ps-9 text-[12px] border outline-none"
          style={{ background: "var(--background)", borderColor: "rgba(255,255,255,0.12)", color: "var(--foreground)" }}
        />
      </div>

      {/* Items list */}
      {!filtered ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-12 text-center"
          style={{ borderColor: "rgba(255,255,255,0.15)", color: "var(--muted-foreground)" }}>
          <Scale className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-[13px] font-semibold">
            {isRTL ? "لا توجد نتائج" : "No results found"}
          </p>
          <p className="text-[11px] mt-1 opacity-70">
            {isRTL ? "أضف الموردين وربطهم بالأصناف من صفحة الموردين" : "Add suppliers and link them to items from the suppliers page"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item: any) => (
            <ItemCard key={item.itemId} item={item} isRTL={isRTL} />
          ))}
        </div>
      )}
    </div>
  );
}
