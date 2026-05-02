// @ts-nocheck
"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/useAppStore";
import { usePermissions } from "@/hooks/usePermissions";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState, SummaryStrip } from "@/components/ui/data-display";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PrintableReportPage } from "@/components/ui/printable-report";
import { BarChart2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import Link from "next/link";

// ─── Day drill-down panel ─────────────────────────────────────────────────────
function DayInvoicesPanel({ date, branchId, isRTL, formatCurrency }: any) {
  const result = useQuery(api.reports.getSalesDetailsReport, {
    fromDate: date, toDate: date,
    branchId: branchId ?? undefined,
  });

  if (!result) return (
    <tr><td colSpan={8} className="px-6 py-3 text-xs text-center text-gray-400 animate-pulse bg-indigo-50/40">
      {isRTL ? "جاري تحميل الفواتير..." : "Loading invoices..."}
    </td></tr>
  );

  const invoices = result.rows ?? [];
  if (invoices.length === 0) return (
    <tr><td colSpan={8} className="px-6 py-3 text-xs text-center text-gray-400 bg-indigo-50/40">
      {isRTL ? "لا توجد فواتير" : "No invoices"}
    </td></tr>
  );

  const typeLabel = (type: string) => {
    if (type === "cash_sale") return isRTL ? "نقدي" : "Cash";
    if (type === "credit_sale") return isRTL ? "آجل" : "Credit";
    if (type === "mixed_sale") return isRTL ? "مختلط" : "Mixed";
    return type;
  };
  const typeColor = (type: string) =>
    type === "cash_sale" ? "bg-green-50 text-green-700" :
    type === "credit_sale" ? "bg-purple-50 text-purple-700" :
    "bg-blue-50 text-blue-700";

  return (
    <>
      <tr>
        <td colSpan={8} className="p-0">
          <div className="bg-indigo-50/40 border-t border-indigo-100 px-6 py-3">
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2">
              {isRTL ? `فواتير ${date}` : `Invoices — ${date}`}
            </p>
            <div className="rounded-lg border border-indigo-100 overflow-hidden bg-white">
              <table className="w-full text-xs">
                <thead className="bg-indigo-50 text-indigo-700">
                  <tr>
                    <th className="px-3 py-2 text-start font-semibold">{isRTL ? "رقم الفاتورة" : "Invoice No."}</th>
                    <th className="px-3 py-2 text-start font-semibold">{isRTL ? "العميل" : "Customer"}</th>
                    <th className="px-3 py-2 text-start font-semibold">{isRTL ? "النوع" : "Type"}</th>
                    <th className="px-3 py-2 text-end font-semibold">{isRTL ? "الخصم" : "Discount"}</th>
                    <th className="px-3 py-2 text-end font-semibold">{isRTL ? "الإجمالي" : "Total"}</th>
                    <th className="px-3 py-2 text-center font-semibold">{isRTL ? "الحالة" : "Status"}</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-50">
                  {invoices.map((inv: any) => (
                    <tr key={inv._id} className="hover:bg-indigo-50/30">
                      <td className="px-3 py-2 font-mono font-bold text-gray-700">
                        {inv.externalInvoiceNumber || inv.invoiceNumber}
                      </td>
                      <td className="px-3 py-2 text-gray-600 max-w-[180px] truncate">
                        {isRTL ? inv.customerNameAr : (inv.customerNameEn || inv.customerNameAr)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${typeColor(inv.invoiceType)}`}>
                          {typeLabel(inv.invoiceType)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-end text-red-500">
                        {inv.discountAmount > 0 ? formatCurrency(inv.discountAmount) : "—"}
                      </td>
                      <td className="px-3 py-2 text-end font-bold text-gray-800">{formatCurrency(inv.totalAmount)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          inv.postingStatus === "posted" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                        }`}>
                          {inv.postingStatus === "posted" ? (isRTL ? "مرحل" : "Posted") : (isRTL ? "مسودة" : "Draft")}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Link href={`/sales/invoices/${inv._id}`} className="text-indigo-400 hover:text-indigo-600">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-indigo-100">
                  <tr>
                    <td colSpan={4} className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase">
                      {isRTL ? "الإجمالي" : "Total"} ({invoices.length})
                    </td>
                    <td className="px-3 py-1.5 text-end font-bold text-gray-800 text-xs">
                      {formatCurrency(invoices.reduce((s: number, i: any) => s + (i.totalAmount ?? 0), 0))}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}

function todayISO() { return new Date().toISOString().split("T")[0]; }
function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function DailySalesPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { canView } = usePermissions();
  const { company: printCompany } = useCompanySettings();
  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const report = useQuery(api.reports.getDailySalesReport, {
    fromDate, toDate,
    branchId: branchArg as any,
    salesRepId: undefined,
    vehicleId: undefined,
  });

  const rows = report?.rows ?? [];
  const totals = report?.totals;

  const summaryItems = useMemo(
    () =>
      totals ? [
        { label: t("days"), value: String(totals.dayCount), borderColor: "var(--brand-600)", accent: "var(--ink-900)" },
        { label: t("invoiceCount"), value: String(totals.invoiceCount), borderColor: "#0ea5e9", accent: "#0f172a" },
        { label: isRTL ? "نقدي" : "Cash", value: formatCurrency(totals.cashSales), borderColor: "#16a34a", accent: "#166534" },
        { label: isRTL ? "آجل" : "Credit", value: formatCurrency(totals.creditSales), borderColor: "#7c3aed", accent: "#4c1d95" },
        { label: isRTL ? "مرتجع نقدي" : "Cash Return", value: formatCurrency(totals.cashReturn), borderColor: "#dc2626", accent: "#991b1b" },
        { label: isRTL ? "مرتجع آجل" : "Credit Return", value: formatCurrency(totals.creditReturn), borderColor: "#f59e0b", accent: "#92400e" },
        { label: t("net"), value: formatCurrency(totals.netSales), borderColor: "#0f172a", accent: "#0f172a" },
      ] : [],
    [totals, t, formatCurrency, isRTL]
  );

  if (!canView("reports")) {
    return <EmptyState icon={BarChart2} title={t("permissionDenied")} />;
  }

  return (
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={t("dailySalesTitle")}
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
      summary={totals ? <SummaryStrip items={summaryItems} className="grid-cols-7" /> : undefined}
    >
      {report === undefined ? (
        <LoadingState label={t("loading")} />
      ) : rows.length === 0 ? (
        <EmptyState icon={BarChart2} title={t("noResults")} />
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("date")}</th>
                <th className="text-end">{t("invoiceCount")}</th>
                <th className="text-end text-green-700">{isRTL ? "مبيعات نقدي" : "Cash Sales"}</th>
                <th className="text-end text-purple-700">{isRTL ? "مبيعات آجل" : "Credit Sales"}</th>
                <th className="text-end text-red-600">{isRTL ? "مرتجع نقدي" : "Cash Return"}</th>
                <th className="text-end text-amber-600">{isRTL ? "مرتجع آجل" : "Credit Return"}</th>
                <th className="text-end">{t("discount")}</th>
                <th className="text-end font-bold">{t("net")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any) => {
                const isExpanded = expandedDate === row.date;
                return (
                  <React.Fragment key={row.date}>
                    <tr
                      className={`cursor-pointer transition-colors ${isExpanded ? "bg-indigo-50/60" : "hover:bg-gray-50"}`}
                      onClick={() => setExpandedDate(isExpanded ? null : row.date)}
                    >
                      <td className="muted tabular-nums">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full transition-colors no-print ${isExpanded ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"}`}>
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </span>
                          {row.date}
                        </span>
                      </td>
                      <td className="numeric text-end font-semibold text-indigo-700">{row.invoiceCount}</td>
                      <td className="numeric text-end text-green-700 font-medium">{formatCurrency(row.cashSales)}</td>
                      <td className="numeric text-end text-purple-700 font-medium">{formatCurrency(row.creditSales)}</td>
                      <td className="numeric text-end text-red-600">
                        {row.cashReturn > 0 ? `(${formatCurrency(row.cashReturn)})` : "—"}
                      </td>
                      <td className="numeric text-end text-amber-600">
                        {row.creditReturn > 0 ? `(${formatCurrency(row.creditReturn)})` : "—"}
                      </td>
                      <td className="numeric text-end text-red-400">
                        {row.discountAmount > 0 ? formatCurrency(row.discountAmount) : "—"}
                      </td>
                      <td className="numeric text-end font-bold text-[color:var(--ink-900)]">{formatCurrency(row.netSales)}</td>
                    </tr>
                    {isExpanded && (
                      <DayInvoicesPanel date={row.date} branchId={branchArg} isRTL={isRTL} formatCurrency={formatCurrency} />
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            {rows.length > 1 && totals && (
              <tfoot className="bg-[color:var(--ink-50)] border-t-2 border-[color:var(--ink-200)]">
                <tr>
                  <td className="px-3 py-2 text-xs font-bold text-[color:var(--ink-600)] uppercase">{isRTL ? "الإجمالي" : "Total"}</td>
                  <td className="numeric text-end font-bold">{totals.invoiceCount}</td>
                  <td className="numeric text-end font-bold text-green-700">{formatCurrency(totals.cashSales)}</td>
                  <td className="numeric text-end font-bold text-purple-700">{formatCurrency(totals.creditSales)}</td>
                  <td className="numeric text-end font-bold text-red-600">
                    {totals.cashReturn > 0 ? `(${formatCurrency(totals.cashReturn)})` : "—"}
                  </td>
                  <td className="numeric text-end font-bold text-amber-600">
                    {totals.creditReturn > 0 ? `(${formatCurrency(totals.creditReturn)})` : "—"}
                  </td>
                  <td className="numeric text-end font-bold text-red-400">{formatCurrency(totals.discountAmount)}</td>
                  <td className="numeric text-end font-bold text-[color:var(--ink-900)]">{formatCurrency(totals.netSales)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </PrintableReportPage>
  );
}
