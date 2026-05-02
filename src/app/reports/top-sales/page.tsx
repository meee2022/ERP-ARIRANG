"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/useAppStore";
import { usePermissions } from "@/hooks/usePermissions";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState, ColorKPIGrid } from "@/components/ui/data-display";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PrintableReportPage } from "@/components/ui/printable-report";
import {
  TrendingUp, RotateCcw, Truck, Wallet, ArrowDownCircle, ArrowUpCircle,
  Hash, Users, Package,
} from "lucide-react";

function todayISO() { return new Date().toISOString().split("T")[0]; }
function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ─── Top Sales section (with returns columns) ───────────────────────────────
function TopSalesSection({ title, rows, type, isRTL, t, formatCurrency }: any) {
  const colLabel = type === "customer" ? t("customer")
    : type === "item" ? t("item")
    : type === "vehicle" ? (isRTL ? "السيارة" : "Vehicle")
    : t("salesRep");
  const countLabel = type === "item" ? (isRTL ? "كمية" : "Qty") : (isRTL ? "ع.فواتير" : "Inv");

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-4 py-3 border-b border-[color:var(--ink-100)]">
        <h3 className="text-sm font-bold text-[color:var(--ink-900)]">{title}</h3>
      </div>
      <table className="w-full text-xs table-fixed">
        <thead>
          <tr style={{ background: "var(--brand-700)" }}>
            <th className="px-2 py-2.5 text-center w-8 text-[10px] font-bold text-white/90 uppercase tracking-wider">#</th>
            <th className="px-2 py-2.5 text-start text-[10px] font-bold text-white/90 uppercase tracking-wider">{colLabel}</th>
            <th className="px-2 py-2.5 text-end w-14 text-[10px] font-bold text-white/90 uppercase tracking-wider">{countLabel}</th>
            <th className="px-2 py-2.5 text-end w-20 text-[10px] font-bold text-white/90 uppercase tracking-wider">{isRTL ? "البيع" : "Sales"}</th>
            <th className="px-2 py-2.5 text-end w-20 text-[10px] font-bold text-white/90 uppercase tracking-wider">{isRTL ? "المرتجع" : "Returns"}</th>
            <th className="px-2 py-2.5 text-end w-20 text-[10px] font-bold text-white uppercase tracking-wider" style={{ background: "var(--brand-800)" }}>{isRTL ? "الصافي" : "Net"}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-6 text-gray-400 text-xs">
                {isRTL ? "لا توجد بيانات" : "No data"}
              </td>
            </tr>
          ) : rows.map((row: any, index: number) => (
            <tr key={row.id ?? index} className={index % 2 === 0 ? "bg-white hover:bg-gray-50/60" : "bg-gray-50/40 hover:bg-gray-100/60"}>
              <td className="px-2 py-2 text-center text-gray-400 tabular-nums font-semibold">{index + 1}</td>
              <td className="px-2 py-2 truncate font-semibold text-gray-900" title={isRTL ? row.nameAr : (row.nameEn || row.nameAr)}>
                {isRTL ? row.nameAr : (row.nameEn || row.nameAr)}
              </td>
              <td className="px-2 py-2 text-end tabular-nums text-gray-600">{type === "item" ? row.quantitySold : row.invoiceCount}</td>
              <td className="px-2 py-2 text-end tabular-nums font-semibold text-gray-800">{formatCurrency(row.totalSales)}</td>
              <td className="px-2 py-2 text-end tabular-nums text-red-600">
                {row.totalReturns > 0 ? (
                  <span className="inline-flex flex-col items-end leading-tight">
                    <span className="font-semibold">−{formatCurrency(row.totalReturns)}</span>
                    {row.returnPct > 0 && (
                      <span className="text-[9px] font-bold text-red-500">{row.returnPct}%</span>
                    )}
                  </span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="px-2 py-2 text-end tabular-nums font-bold text-emerald-700 bg-emerald-50/40">{formatCurrency(row.netSales)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Top Returns section (highlighting returns) ─────────────────────────────
function TopReturnsSection({ title, rows, type, isRTL, t, formatCurrency, icon: Icon }: any) {
  const colLabel = type === "vehicle" ? (isRTL ? "السيارة" : "Vehicle")
    : type === "item" ? t("item")
    : t("salesRep");
  return (
    <div className="surface-card overflow-hidden border-red-100" style={{ borderTopWidth: 3, borderTopColor: "#dc2626" }}>
      <div className="px-4 py-3 border-b border-[color:var(--ink-100)] flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-red-600" />}
        <h3 className="text-sm font-bold text-red-700">{title}</h3>
      </div>
      <table className="w-full text-xs table-fixed">
        <thead>
          <tr style={{ background: "#b91c1c" }}>
            <th className="px-2 py-2.5 text-center w-8 text-[10px] font-bold text-white/90 uppercase tracking-wider">#</th>
            <th className="px-2 py-2.5 text-start text-[10px] font-bold text-white/90 uppercase tracking-wider">{colLabel}</th>
            <th className="px-2 py-2.5 text-end w-14 text-[10px] font-bold text-white/90 uppercase tracking-wider">{isRTL ? "العدد" : "Count"}</th>
            <th className="px-2 py-2.5 text-end w-20 text-[10px] font-bold text-white/90 uppercase tracking-wider">{isRTL ? "القيمة" : "Value"}</th>
            <th className="px-2 py-2.5 text-end w-14 text-[10px] font-bold text-white/90 uppercase tracking-wider">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-red-50">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center py-6 text-gray-400 text-xs">
                {isRTL ? "لا توجد مرتجعات" : "No returns"}
              </td>
            </tr>
          ) : rows.map((row: any, index: number) => (
            <tr key={row.id ?? index} className={index % 2 === 0 ? "bg-white" : "bg-red-50/30"}>
              <td className="px-2 py-2 text-center text-gray-400 tabular-nums font-semibold">{index + 1}</td>
              <td className="px-2 py-2 truncate font-semibold text-gray-900" title={isRTL ? row.nameAr : (row.nameEn || row.nameAr)}>
                {isRTL ? row.nameAr : (row.nameEn || row.nameAr)}
              </td>
              <td className="px-2 py-2 text-end tabular-nums font-bold text-red-700">
                {type === "item" ? row.quantityReturned : row.returnCount}
              </td>
              <td className="px-2 py-2 text-end tabular-nums font-bold text-red-700">{formatCurrency(row.totalReturns)}</td>
              <td className="px-2 py-2 text-end">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  row.returnPct >= 20 ? "bg-red-100 text-red-700"
                  : row.returnPct >= 10 ? "bg-amber-100 text-amber-700"
                  : "bg-gray-100 text-gray-600"
                }`}>
                  {row.returnPct}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TopSalesPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { canView } = usePermissions();
  const { company: printCompany } = useCompanySettings();
  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());

  const report = useQuery(api.reports.getTopSalesReport, {
    fromDate, toDate,
    branchId: branchArg as any,
  });

  const totals = report?.totals;

  const summaryItems = useMemo(
    () => totals ? [
      { label: isRTL ? "صافي المبيعات" : "Net Sales",        value: formatCurrency(totals.netSales ?? totals.totalSales),
        color: "#6b1523", bg: "#fdf2f4", border: "#6b152330", icon: Wallet, big: true,
        hint: `${totals.returnsCount ?? 0} ${isRTL ? "مرتجع" : "returns"}` },
      { label: t("totalSales"),                              value: formatCurrency(totals.totalSales),
        color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: ArrowDownCircle },
      { label: isRTL ? "إجمالي المرتجعات" : "Total Returns", value: formatCurrency(totals.totalReturns ?? 0),
        color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: ArrowUpCircle },
      { label: isRTL ? "عدد المرتجعات" : "Returns Count",    value: String(totals.returnsCount ?? 0),
        color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", icon: Hash },
      { label: t("topCustomers"),                            value: String(totals.customerCount),
        color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd", icon: Users },
      { label: t("topItems"),                                value: String(totals.itemCount),
        color: "#7c3aed", bg: "#faf5ff", border: "#ddd6fe", icon: Package },
    ] : [],
    [totals, t, formatCurrency, isRTL]
  );

  if (!canView("reports")) {
    return <EmptyState icon={TrendingUp} title={t("permissionDenied")} />;
  }

  return (
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={t("topSalesTitle")}
      period={`${fromDate} — ${toDate}`}
      filters={
        <FilterPanel>
          <FilterField label={t("fromDate")}>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input-field h-8 w-auto text-sm" />
          </FilterField>
          <FilterField label={t("toDate")}>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input-field h-8 w-auto text-sm" />
          </FilterField>
        </FilterPanel>
      }
      summary={totals ? <ColorKPIGrid items={summaryItems} cols={6} /> : undefined}
    >
      {report === undefined ? (
        <LoadingState label={t("loading")} />
      ) : (
        <div className="p-4 space-y-5">
          {/* ── Top Sales (with returns columns) ── */}
          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
            <TopSalesSection title={t("topCustomers")}  rows={report.topCustomers ?? []}  type="customer" isRTL={isRTL} t={t} formatCurrency={formatCurrency} />
            <TopSalesSection title={t("topItems")}      rows={report.topItems ?? []}      type="item"     isRTL={isRTL} t={t} formatCurrency={formatCurrency} />
            <TopSalesSection title={t("topSalesReps")}  rows={report.topSalesReps ?? []}  type="salesRep" isRTL={isRTL} t={t} formatCurrency={formatCurrency} />
            <TopSalesSection title={isRTL ? "أعلى السيارات" : "Top Vehicles"} rows={report.topVehicles ?? []} type="vehicle" isRTL={isRTL} t={t} formatCurrency={formatCurrency} />
          </div>

          {/* ── Top Returns leaderboards ── */}
          <div>
            <div className="flex items-center gap-2 mb-3 px-1">
              <RotateCcw className="h-4 w-4 text-red-600" />
              <h2 className="text-sm font-bold text-red-700 uppercase tracking-wide">
                {isRTL ? "أعلى المرتجعات" : "Top Returns Analysis"}
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
              <TopReturnsSection
                title={isRTL ? "أكثر المندوبين مرتجعات" : "Top Reps by Returns"}
                rows={report.topReturnReps ?? []} type="salesRep"
                isRTL={isRTL} t={t} formatCurrency={formatCurrency}
              />
              <TopReturnsSection
                title={isRTL ? "أكثر السيارات مرتجعات" : "Top Vehicles by Returns"}
                rows={report.topReturnVehicles ?? []} type="vehicle" icon={Truck}
                isRTL={isRTL} t={t} formatCurrency={formatCurrency}
              />
              <TopReturnsSection
                title={isRTL ? "أكثر الأصناف مرتجعات" : "Top Items by Returns"}
                rows={report.topReturnItems ?? []} type="item"
                isRTL={isRTL} t={t} formatCurrency={formatCurrency}
              />
            </div>
          </div>
        </div>
      )}
    </PrintableReportPage>
  );
}
