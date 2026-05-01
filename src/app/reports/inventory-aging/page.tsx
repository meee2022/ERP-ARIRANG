// @ts-nocheck
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import { Clock, Package, AlertTriangle, Search, Warehouse, TrendingDown } from "lucide-react";

const ACCENT = "#f59e0b";

const BUCKETS = [
  { key: "0-7",  labelAr: "0-7 أيام",  labelEn: "0-7 days",  color: "#10b981", bg: "#d1fae5" },
  { key: "8-14", labelAr: "8-14 يوم",  labelEn: "8-14 days", color: "#6366f1", bg: "#ede9fe" },
  { key: "15-30",labelAr: "15-30 يوم", labelEn: "15-30 days",color: ACCENT,    bg: "#fef3c7" },
  { key: "31-60",labelAr: "31-60 يوم", labelEn: "31-60 days",color: "#ef4444", bg: "#fee2e2" },
  { key: "60+",  labelAr: "60+ يوم",   labelEn: "60+ days",  color: "#7c3aed", bg: "#ede9fe" },
];

function BucketCard({ bucket, data, isRTL, fmt }: any) {
  const b = BUCKETS.find((b) => b.key === bucket)!;
  return (
    <div className="rounded-2xl border p-4"
      style={{ background: b.bg + "60", borderColor: b.color + "30" }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
        <span className="text-[12px] font-bold" style={{ color: b.color }}>
          {isRTL ? b.labelAr : b.labelEn}
        </span>
      </div>
      <p className="text-[22px] font-black tabular-nums" style={{ color: "var(--ink-900)" }}>
        {data.count}
      </p>
      <p className="text-[11.5px] font-semibold tabular-nums mt-0.5" style={{ color: "var(--ink-600)" }}>
        {fmt(data.value)}
      </p>
      <p className="text-[10.5px] mt-0.5" style={{ color: "var(--ink-400)" }}>
        {isRTL ? "صنف · قيمة المخزون" : "items · stock value"}
      </p>
    </div>
  );
}

function AgingBadge({ bucket }: { bucket: string }) {
  const b = BUCKETS.find((bk) => bk.key === bucket);
  if (!b) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: b.bg, color: b.color }}>
      {bucket}
    </span>
  );
}

export default function InventoryAgingPage() {
  const { isRTL, formatCurrency } = useI18n();
  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const [search, setSearch]   = useState("");
  const [bucket, setBucket]   = useState<string>("");
  const [sortBy, setSortBy]   = useState<"aging" | "value" | "qty">("aging");

  const data = useQuery(
    api.reports.getInventoryAging,
    companyId ? { companyId } : "skip"
  );

  const fmt = (n: number) => formatCurrency(n);

  const rows = (data?.rows ?? []).filter((r: any) => {
    if (bucket && r.agingBucket !== bucket) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return r.code.toLowerCase().includes(q) ||
      r.nameAr.includes(search) ||
      r.nameEn.toLowerCase().includes(q) ||
      r.warehouseName.includes(search);
  }).sort((a: any, b: any) => {
    if (sortBy === "aging") return b.agingDays - a.agingDays;
    if (sortBy === "value") return b.stockValue - a.stockValue;
    return b.totalQty - a.totalQty;
  });

  const totalValue = rows.reduce((s: number, r: any) => s + r.stockValue, 0);

  return (
    <div className="space-y-5 max-w-5xl mx-auto" dir={isRTL ? "rtl" : "ltr"}>
      <PageHeader
        title={isRTL ? "تقادم المخزون" : "Inventory Aging"}
        subtitle={isRTL
          ? "تحليل مدة بقاء الأصناف في المخزون — تحديد الأصناف الراكدة"
          : "Analyze how long items have been in stock — identify slow-moving inventory"}
        icon={Clock}
        iconColor={ACCENT}
        actions={
          data ? (
            <div className="text-[11.5px] font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: `${ACCENT}15`, color: ACCENT }}>
              {data.asOfDate}
            </div>
          ) : undefined
        }
      />

      {!companyId || !data ? (
        <LoadingState />
      ) : (
        <>
          {/* Bucket summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {BUCKETS.map((b) => (
              <button key={b.key} onClick={() => setBucket(bucket === b.key ? "" : b.key)}>
                <BucketCard
                  bucket={b.key}
                  data={data.buckets[b.key]}
                  isRTL={isRTL}
                  fmt={fmt}
                />
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="rounded-xl border p-3 flex flex-wrap items-center gap-3"
            style={{ background: "white", borderColor: "var(--ink-200)" }}>
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "var(--ink-400)" }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isRTL ? "ابحث بالاسم أو الكود..." : "Search by name or code..."}
                className="w-full rounded-lg px-3 py-2 ps-8 text-[12px] border outline-none"
                style={{ borderColor: "var(--ink-200)", color: "var(--ink-700)" }}
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-lg px-3 py-2 text-[12px] border outline-none bg-white"
              style={{ borderColor: "var(--ink-200)", color: "var(--ink-700)" }}>
              <option value="aging">{isRTL ? "الأقدم أولاً" : "Oldest first"}</option>
              <option value="value">{isRTL ? "أعلى قيمة" : "Highest value"}</option>
              <option value="qty">{isRTL ? "أعلى كمية" : "Highest qty"}</option>
            </select>

            {/* Active bucket filter chip */}
            {bucket && (
              <button
                onClick={() => setBucket("")}
                className="text-[11.5px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1"
                style={{ background: `${ACCENT}15`, color: ACCENT }}>
                ✕ {BUCKETS.find((b) => b.key === bucket)?.[isRTL ? "labelAr" : "labelEn"]}
              </button>
            )}

            <div className="ms-auto text-[11.5px] font-semibold" style={{ color: "var(--ink-500)" }}>
              {rows.length} {isRTL ? "صنف" : "items"} · {fmt(totalValue)}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border overflow-hidden"
            style={{ background: "white", borderColor: "var(--ink-200)" }}>

            {/* Desktop table */}
            <div className="desktop-table overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ background: "#6b1523" }}>
                    {[
                      isRTL ? "الكود" : "Code",
                      isRTL ? "اسم الصنف" : "Item",
                      isRTL ? "المستودع" : "Warehouse",
                      isRTL ? "الكمية" : "Qty",
                      isRTL ? "متوسط التكلفة" : "Avg Cost",
                      isRTL ? "قيمة المخزون" : "Stock Value",
                      isRTL ? "آخر استلام" : "Last Receipt",
                      isRTL ? "عمر المخزون" : "Aging",
                      isRTL ? "الفئة" : "Bucket",
                    ].map((h, i) => (
                      <th key={i} className="px-[14px] py-[10px] text-[11px] font-bold uppercase tracking-wider text-start whitespace-nowrap"
                        style={{ color: "rgba(255,255,255,0.85)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12" style={{ color: "var(--ink-400)" }}>
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-[13px]">{isRTL ? "لا توجد نتائج" : "No results"}</p>
                      </td>
                    </tr>
                  ) : rows.map((r: any, i: number) => (
                    <tr key={`${r.itemId}-${r.warehouseId}`}
                      className="hover:bg-[#fdf2f4] transition-colors"
                      style={{
                        background: i % 2 === 0 ? "white" : "#fafafa",
                        borderBottom: "1px solid #f1f5f9",
                      }}>
                      <td className="px-[14px] py-[8px] whitespace-nowrap">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded"
                          style={{ background: "var(--ink-100)", color: "var(--ink-600)" }}>
                          {r.code}
                        </span>
                      </td>
                      <td className="px-[14px] py-[8px] whitespace-nowrap" style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
                        <p className="text-[12.5px] font-semibold" style={{ color: "#1e293b" }}>
                          {isRTL ? r.nameAr : r.nameEn}
                        </p>
                      </td>
                      <td className="px-[14px] py-[8px] text-[12.5px] whitespace-nowrap" style={{ color: "var(--ink-600)" }}>
                        <span className="flex items-center gap-1">
                          <Warehouse className="h-3.5 w-3.5 opacity-60" />
                          {r.warehouseName}
                        </span>
                      </td>
                      <td className="px-[14px] py-[8px] tabular-nums text-[12.5px] font-bold text-end whitespace-nowrap" style={{ color: "#1e293b" }}>
                        {r.totalQty.toFixed(2)}
                      </td>
                      <td className="px-[14px] py-[8px] tabular-nums text-[12.5px] text-end whitespace-nowrap" style={{ color: "var(--ink-600)" }}>
                        {fmt(r.avgCost)}
                      </td>
                      <td className="px-[14px] py-[8px] tabular-nums text-[12.5px] font-bold text-end whitespace-nowrap" style={{ color: "#1e293b" }}>
                        {fmt(r.stockValue)}
                      </td>
                      <td className="px-[14px] py-[8px] text-[12.5px] whitespace-nowrap" style={{ color: "var(--ink-500)" }}>
                        {r.lastReceiptDate ?? "—"}
                      </td>
                      <td className="px-[14px] py-[8px] whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {r.agingDays >= 30 && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                          <span className="text-[12.5px] font-bold tabular-nums"
                            style={{ color: r.agingDays >= 60 ? "#7c3aed" : r.agingDays >= 30 ? "#ef4444" : "var(--ink-700)" }}>
                            {r.agingDays} {isRTL ? "يوم" : "d"}
                          </span>
                        </div>
                      </td>
                      <td className="px-[14px] py-[8px] whitespace-nowrap">
                        <AgingBadge bucket={r.agingBucket} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="mobile-list p-3 space-y-2.5">
              {rows.map((r: any) => (
                <div key={`${r.itemId}-${r.warehouseId}`} className="record-card">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--ink-100)] text-[var(--ink-600)]">{r.code}</span>
                        <AgingBadge bucket={r.agingBucket} />
                      </div>
                      <p className="text-[13.5px] font-bold" style={{ color: "var(--ink-900)" }}>
                        {isRTL ? r.nameAr : r.nameEn}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-500)" }}>
                        {r.warehouseName} · {r.lastReceiptDate ?? "—"}
                      </p>
                    </div>
                    <div className="text-end shrink-0">
                      <p className="text-[15px] font-bold tabular-nums" style={{ color: "var(--ink-900)" }}>
                        {fmt(r.stockValue)}
                      </p>
                      <p className="text-[11.5px] tabular-nums" style={{ color: "var(--ink-500)" }}>
                        {r.totalQty.toFixed(2)} {isRTL ? "وحدة" : "units"}
                      </p>
                      <p className="text-[12px] font-bold mt-0.5"
                        style={{ color: r.agingDays >= 30 ? "#ef4444" : "var(--ink-600)" }}>
                        {r.agingDays} {isRTL ? "يوم" : "days"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
