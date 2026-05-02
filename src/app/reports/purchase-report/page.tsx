// @ts-nocheck
"use client";

import React, { useMemo, useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  ShoppingCart, Calendar, Receipt, Truck, Package, TrendingUp,
  CheckCircle2, Clock, AlertCircle, RotateCcw, Banknote,
  Wallet, Users, Hash, Percent,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { LoadingState, ColorKPIGrid } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PrintableReportPage } from "@/components/ui/printable-report";

function todayISO() { return new Date().toISOString().split("T")[0]; }
function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ─── Side mini-table for top suppliers / top items ──────────────────────
function MiniTable({ title, rows, type, isRTL, formatCurrency }: any) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="px-4 py-3 border-b border-[color:var(--ink-100)] flex items-center gap-2">
        {type === "supplier" ? <Truck className="h-4 w-4 text-[color:var(--brand-700)]" /> : <Package className="h-4 w-4 text-[color:var(--brand-700)]" />}
        <h3 className="text-sm font-bold text-[color:var(--ink-900)]">{title}</h3>
      </div>
      <table className="w-full text-xs table-fixed">
        <thead>
          <tr style={{ background: "var(--brand-700)" }}>
            <th className="px-2 py-2 text-center w-8 text-[10px] font-bold text-white/90 uppercase tracking-wider">#</th>
            <th className="px-2 py-2 text-start text-[10px] font-bold text-white/90 uppercase tracking-wider">
              {type === "supplier" ? (isRTL ? "المورد" : "Supplier") : (isRTL ? "الصنف" : "Item")}
            </th>
            <th className="px-2 py-2 text-end w-14 text-[10px] font-bold text-white/90 uppercase tracking-wider">
              {type === "supplier" ? (isRTL ? "ع.فات." : "Inv") : (isRTL ? "كمية" : "Qty")}
            </th>
            <th className="px-2 py-2 text-end w-24 text-[10px] font-bold text-white/90 uppercase tracking-wider">
              {isRTL ? "الإجمالي" : "Total"}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {(!rows || rows.length === 0) ? (
            <tr>
              <td colSpan={4} className="text-center py-6 text-gray-400 text-xs">
                {isRTL ? "لا توجد بيانات" : "No data"}
              </td>
            </tr>
          ) : rows.map((r: any, i: number) => (
            <tr key={r.itemId ?? r.supplierId ?? i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
              <td className="px-2 py-2 text-center text-gray-400 tabular-nums font-semibold">{i + 1}</td>
              <td className="px-2 py-2 truncate font-semibold text-gray-900" title={r.supplierName ?? r.itemName}>
                {type === "item" && r.itemCode && (
                  <span className="font-mono text-[10px] text-gray-400 me-1">{r.itemCode}</span>
                )}
                {isRTL ? (r.supplierName ?? r.itemName) : (r.supplierNameEn ?? r.itemNameEn ?? r.supplierName ?? r.itemName)}
              </td>
              <td className="px-2 py-2 text-end tabular-nums text-gray-600">
                {type === "supplier" ? r.count : (r.qty ?? 0).toFixed(2)}
              </td>
              <td className="px-2 py-2 text-end tabular-nums font-bold text-gray-900">{formatCurrency(r.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PurchaseReportPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { company: printCompany } = useCompanySettings();
  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate]   = useState(todayISO());
  const [groupBy, setGroupBy] = useState<"day" | "supplier" | "item">("day");

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const report = useQuery(
    api.reports.getPurchaseReport,
    fromDate && toDate
      ? { fromDate, toDate, groupBy, branchId: branchArg as any }
      : "skip"
  );

  const loading = report === undefined;

  const summaryItems = useMemo(
    () => report ? [
      { label: isRTL ? "إجمالي المشتريات" : "Total Purchases", value: formatCurrency(report.totalPurchases),
        color: "#6b1523", bg: "#fdf2f4", border: "#6b152330", icon: ShoppingCart, big: true,
        hint: `${report.invoiceCount} ${isRTL ? "فاتورة" : "invoices"}` },
      { label: isRTL ? "صافي المشتريات" : "Net Purchases",     value: formatCurrency(report.netPurchases),
        color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: Wallet },
      { label: isRTL ? "إجمالي المرتجعات" : "Total Returns",   value: formatCurrency(report.totalReturns),
        color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: RotateCcw },
      { label: isRTL ? "إجمالي الضريبة" : "Total VAT",         value: formatCurrency(report.vatAmount),
        color: "#7c3aed", bg: "#faf5ff", border: "#ddd6fe", icon: Percent },
      { label: isRTL ? "متوسط الفاتورة" : "Avg. Invoice",      value: formatCurrency(report.averageInvoice),
        color: "#ca8a04", bg: "#fefce8", border: "#fde68a", icon: Receipt },
      { label: isRTL ? "متوسط يومي" : "Avg. per Day",          value: formatCurrency(report.averagePerDay),
        color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc", icon: Calendar },
      { label: isRTL ? "عدد الموردين" : "Suppliers",           value: String(report.supplierCount),
        color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd", icon: Users },
      { label: isRTL ? "عدد الأصناف" : "Items",                value: String(report.itemCount),
        color: "#9333ea", bg: "#faf5ff", border: "#e9d5ff", icon: Package },
    ] : [],
    [report, formatCurrency, isRTL]
  );

  return (
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={t("purchaseReportTitle")}
      period={`${fromDate} — ${toDate}`}
      filters={
        <div className="surface-card px-5 py-3.5 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[color:var(--ink-400)] shrink-0" />
            <span className="text-xs font-medium text-[color:var(--ink-500)] whitespace-nowrap">{t("fromDate")}</span>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input-field h-8 text-sm w-auto" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[color:var(--ink-500)] whitespace-nowrap">{t("toDate")}</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input-field h-8 text-sm w-auto" />
          </div>
          <div className="flex items-center gap-2 ms-auto">
            <span className="text-xs font-medium text-[color:var(--ink-500)] whitespace-nowrap">{t("groupBy")}</span>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)} className="input-field h-8 text-sm w-auto">
              <option value="day">{t("groupByDay")}</option>
              <option value="supplier">{t("groupBySupplier")}</option>
              <option value="item">{t("groupByItem")}</option>
            </select>
          </div>
        </div>
      }
      summary={report ? <ColorKPIGrid items={summaryItems} cols={8} /> : undefined}
    >
      {loading ? (
        <LoadingState label={t("loading")} />
      ) : (report.invoiceCount ?? 0) === 0 ? (
        <EmptyState icon={ShoppingCart} title={t("noResults")} />
      ) : (
        <div className="p-4 space-y-5">
          {/* ── Payment status indicator strip ──────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100 p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">{isRTL ? "مدفوعة" : "Paid"}</p>
                <p className="text-xl font-extrabold text-emerald-800 tabular-nums">{report.paidCount}</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-100 p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">{isRTL ? "جزئياً" : "Partial"}</p>
                <p className="text-xl font-extrabold text-amber-800 tabular-nums">{report.partialCount}</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-white rounded-xl border border-red-100 p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">{isRTL ? "غير مدفوعة" : "Unpaid"}</p>
                <p className="text-xl font-extrabold text-red-800 tabular-nums">{report.unpaidCount}</p>
              </div>
            </div>
          </div>

          {/* ── Side-by-side: Top Suppliers + Top Items ─────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MiniTable
              title={isRTL ? "أعلى الموردين" : "Top Suppliers"}
              rows={report.topSuppliers}
              type="supplier" isRTL={isRTL} formatCurrency={formatCurrency}
            />
            <MiniTable
              title={isRTL ? "أعلى الأصناف" : "Top Items Purchased"}
              rows={report.topItems}
              type="item" isRTL={isRTL} formatCurrency={formatCurrency}
            />
          </div>

          {/* ── Main grouped table ──────────────────────────────────────── */}
          <div className="surface-card overflow-hidden">
            <div className="px-4 py-3 border-b border-[color:var(--ink-100)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[color:var(--brand-700)]" />
                <h3 className="text-sm font-bold text-[color:var(--ink-900)]">
                  {groupBy === "day"      ? (isRTL ? "تفصيل حسب اليوم" : "Daily Breakdown")
                   : groupBy === "supplier" ? (isRTL ? "تفصيل حسب المورد" : "By Supplier")
                   : (isRTL ? "تفصيل حسب الصنف" : "By Item")}
                </h3>
              </div>
              <span className="text-[11px] text-[color:var(--ink-400)]">
                {report.data?.length ?? 0} {isRTL ? "صف" : "rows"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "var(--brand-700)" }}>
                    {groupBy === "day" && <>
                      <th className="px-3 py-2.5 text-start text-[10px] font-bold text-white/90 uppercase tracking-wider">{t("date")}</th>
                      <th className="px-3 py-2.5 text-end text-[10px] font-bold text-white/90 uppercase tracking-wider">{isRTL ? "عدد الفواتير" : "Invoices"}</th>
                      <th className="px-3 py-2.5 text-end text-[10px] font-bold text-white uppercase tracking-wider" style={{ background: "var(--brand-800)" }}>{isRTL ? "الإجمالي" : "Total"}</th>
                    </>}
                    {groupBy === "supplier" && <>
                      <th className="px-3 py-2.5 text-start text-[10px] font-bold text-white/90 uppercase tracking-wider">{t("supplier")}</th>
                      <th className="px-3 py-2.5 text-end text-[10px] font-bold text-white/90 uppercase tracking-wider">{isRTL ? "عدد الفواتير" : "Invoices"}</th>
                      <th className="px-3 py-2.5 text-end text-[10px] font-bold text-white/90 uppercase tracking-wider">{isRTL ? "المشتريات" : "Purchases"}</th>
                      <th className="px-3 py-2.5 text-end text-[10px] font-bold text-white/90 uppercase tracking-wider">{isRTL ? "المرتجع" : "Returns"}</th>
                      <th className="px-3 py-2.5 text-end text-[10px] font-bold text-white uppercase tracking-wider" style={{ background: "var(--brand-800)" }}>{isRTL ? "الصافي" : "Net"}</th>
                    </>}
                    {groupBy === "item" && <>
                      <th className="px-3 py-2.5 text-start w-20 text-[10px] font-bold text-white/90 uppercase tracking-wider">{isRTL ? "الكود" : "Code"}</th>
                      <th className="px-3 py-2.5 text-start text-[10px] font-bold text-white/90 uppercase tracking-wider">{t("item")}</th>
                      <th className="px-3 py-2.5 text-end text-[10px] font-bold text-white/90 uppercase tracking-wider">{t("quantity")}</th>
                      <th className="px-3 py-2.5 text-end text-[10px] font-bold text-white uppercase tracking-wider" style={{ background: "var(--brand-800)" }}>{isRTL ? "الإجمالي" : "Total"}</th>
                    </>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(report.data ?? []).map((row: any, i: number) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white hover:bg-gray-50/60" : "bg-gray-50/40 hover:bg-gray-100/60"}>
                      {groupBy === "day" && <>
                        <td className="px-3 py-2 tabular-nums font-semibold text-gray-800">{row.date}</td>
                        <td className="px-3 py-2 text-end tabular-nums text-gray-600">{row.count}</td>
                        <td className="px-3 py-2 text-end tabular-nums font-bold text-gray-900 bg-emerald-50/40">{formatCurrency(row.total ?? 0)}</td>
                      </>}
                      {groupBy === "supplier" && <>
                        <td className="px-3 py-2 font-semibold text-gray-900">{row.supplierName}</td>
                        <td className="px-3 py-2 text-end tabular-nums text-gray-600">{row.count}</td>
                        <td className="px-3 py-2 text-end tabular-nums font-semibold text-gray-800">{formatCurrency(row.total ?? 0)}</td>
                        <td className="px-3 py-2 text-end tabular-nums text-red-600 font-semibold">
                          {row.returnsTotal > 0 ? `−${formatCurrency(row.returnsTotal)}` : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-end tabular-nums font-bold text-emerald-700 bg-emerald-50/40">{formatCurrency(row.netTotal ?? row.total)}</td>
                      </>}
                      {groupBy === "item" && <>
                        <td className="px-3 py-2 font-mono text-[11px] text-gray-500">{row.itemCode || "—"}</td>
                        <td className="px-3 py-2 font-semibold text-gray-900">{row.itemName}</td>
                        <td className="px-3 py-2 text-end tabular-nums font-semibold text-gray-700">{(row.qty ?? 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-end tabular-nums font-bold text-gray-900 bg-emerald-50/40">{formatCurrency(row.total ?? 0)}</td>
                      </>}
                    </tr>
                  ))}
                </tbody>
                {/* Footer total */}
                <tfoot>
                  <tr style={{ background: "var(--brand-800)" }}>
                    {groupBy === "day" && <>
                      <td className="px-3 py-3 text-white font-extrabold uppercase text-[11px]">{isRTL ? "الإجمالي" : "Total"}</td>
                      <td className="px-3 py-3 text-end text-white tabular-nums font-bold">{report.invoiceCount}</td>
                      <td className="px-3 py-3 text-end text-white tabular-nums font-extrabold">{formatCurrency(report.totalPurchases)}</td>
                    </>}
                    {groupBy === "supplier" && <>
                      <td className="px-3 py-3 text-white font-extrabold uppercase text-[11px]">{isRTL ? "الإجمالي" : "Total"}</td>
                      <td className="px-3 py-3 text-end text-white tabular-nums font-bold">{report.invoiceCount}</td>
                      <td className="px-3 py-3 text-end text-white tabular-nums font-bold">{formatCurrency(report.totalPurchases)}</td>
                      <td className="px-3 py-3 text-end text-red-200 tabular-nums font-bold">−{formatCurrency(report.totalReturns)}</td>
                      <td className="px-3 py-3 text-end text-emerald-200 tabular-nums font-extrabold">{formatCurrency(report.netPurchases)}</td>
                    </>}
                    {groupBy === "item" && <>
                      <td colSpan={3} className="px-3 py-3 text-white font-extrabold uppercase text-[11px]">{isRTL ? "إجمالي المشتريات" : "Total Purchases"}</td>
                      <td className="px-3 py-3 text-end text-white tabular-nums font-extrabold">{formatCurrency(report.totalPurchases)}</td>
                    </>}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── Returns summary card (if any) ───────────────────────────── */}
          {report.totalReturns > 0 && (
            <div className="surface-card overflow-hidden border-red-100" style={{ borderTopWidth: 3, borderTopColor: "#dc2626" }}>
              <div className="px-4 py-3 border-b border-[color:var(--ink-100)] flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-red-600" />
                <h3 className="text-sm font-bold text-red-700">{isRTL ? "ملخص المرتجعات" : "Returns Summary"}</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">{isRTL ? "عدد المرتجعات" : "Count"}</p>
                  <p className="text-xl font-extrabold text-red-700 tabular-nums">{report.returnsCount}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">{isRTL ? "قيمة المرتجعات" : "Value"}</p>
                  <p className="text-xl font-extrabold text-red-700 tabular-nums">{formatCurrency(report.totalReturns)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">{isRTL ? "نسبة من المشتريات" : "% of Purchases"}</p>
                  <p className="text-xl font-extrabold text-red-700 tabular-nums">
                    {report.totalPurchases > 0
                      ? ((report.totalReturns / report.totalPurchases) * 100).toFixed(1) + "%"
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">{isRTL ? "صافي بعد المرتجع" : "Net Purchases"}</p>
                  <p className="text-xl font-extrabold text-emerald-700 tabular-nums">{formatCurrency(report.netPurchases)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </PrintableReportPage>
  );
}
