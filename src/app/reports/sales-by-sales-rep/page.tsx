// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/useAppStore";
import { User, Printer, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { SummaryStrip } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchableSelect } from "@/components/ui/searchable-select";
import Link from "next/link";

function todayISO() { return new Date().toISOString().split("T")[0]; }
function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ─── Invoices drill-down panel ─────────────────────────────────────────────────
function RepInvoicesPanel({ salesRepId, fromDate, toDate, branchId, isRTL, formatCurrency }: any) {
  const result = useQuery(api.reports.getSalesDetailsReport, {
    fromDate,
    toDate,
    branchId: branchId ?? undefined,
    salesRepId: salesRepId ?? undefined,
  });

  if (!result) return (
    <tr>
      <td colSpan={7} className="px-6 py-3 text-xs text-center text-gray-400 animate-pulse bg-indigo-50/40">
        {isRTL ? "جاري تحميل الفواتير..." : "Loading invoices..."}
      </td>
    </tr>
  );

  const invoices = result.rows ?? [];

  if (invoices.length === 0) return (
    <tr>
      <td colSpan={7} className="px-6 py-3 text-xs text-center text-gray-400 bg-indigo-50/40">
        {isRTL ? "لا توجد فواتير في هذه الفترة" : "No invoices in this period"}
      </td>
    </tr>
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

  const totalAmount = invoices.reduce((s: number, i: any) => s + (i.totalAmount ?? 0), 0);
  const totalDiscount = invoices.reduce((s: number, i: any) => s + (i.discountAmount ?? 0), 0);

  return (
    <tr>
      <td colSpan={7} className="p-0">
        <div className="bg-indigo-50/40 border-t border-indigo-100 px-6 py-4">
          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2">
            {isRTL ? `الفواتير — ${invoices.length} فاتورة` : `Invoices — ${invoices.length} records`}
          </p>
          <div className="rounded-lg border border-indigo-100 overflow-hidden bg-white">
            <table className="w-full text-xs">
              <thead className="bg-indigo-50 text-indigo-700">
                <tr>
                  <th className="px-3 py-2 text-start font-semibold">{isRTL ? "التاريخ" : "Date"}</th>
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
                  <tr key={inv._id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{inv.invoiceDate}</td>
                    <td className="px-3 py-2 font-mono font-bold text-gray-700">
                      {inv.externalInvoiceNumber || inv.invoiceNumber}
                    </td>
                    <td className="px-3 py-2 text-gray-600 max-w-[160px] truncate">
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
                    <td className="px-3 py-2 text-end font-bold text-gray-800">
                      {formatCurrency(inv.totalAmount)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        inv.postingStatus === "posted" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {inv.postingStatus === "posted"
                          ? (isRTL ? "مرحل" : "Posted")
                          : (isRTL ? "مسودة" : "Draft")}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Link href={`/sales/invoices/${inv._id}`} className="text-indigo-400 hover:text-indigo-600 inline-flex">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-indigo-100">
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">
                    {isRTL ? "الإجمالي" : "Total"} ({invoices.length})
                  </td>
                  <td className="px-3 py-2 text-end text-xs font-bold text-red-500">
                    {totalDiscount > 0 ? formatCurrency(totalDiscount) : "—"}
                  </td>
                  <td className="px-3 py-2 text-end text-sm font-bold text-gray-900">
                    {formatCurrency(totalAmount)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function SalesBySalesRepPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const [expandedRepId, setExpandedRepId] = useState<string | null>(null);
  const [selectedRepFilter, setSelectedRepFilter] = useState<string>("");
  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  // Load companies for sales rep list
  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;
  const allSalesReps = useQuery(api.salesMasters.listSalesReps, companyId ? { companyId } : "skip") ?? [];

  const report = useQuery(api.reports.getSalesBySalesRep, {
    fromDate,
    toDate,
    branchId: branchArg as any,
  });

  // Filter rows client-side by selected rep
  const allRows = report?.rows ?? [];
  const rows = selectedRepFilter
    ? allRows.filter((r: any) => r.salesRepId === selectedRepFilter)
    : allRows;

  // Recompute totals for filtered rows
  const totals = rows.length > 0 ? {
    invoiceCount: rows.reduce((s: number, r: any) => s + r.invoiceCount, 0),
    totalSales:   rows.reduce((s: number, r: any) => s + r.totalSales, 0),
    cashSales:    rows.reduce((s: number, r: any) => s + r.cashSales, 0),
    creditSales:  rows.reduce((s: number, r: any) => s + r.creditSales, 0),
  } : (report?.totals ?? { invoiceCount: 0, totalSales: 0, cashSales: 0, creditSales: 0 });

  // Sales rep dropdown options
  const repOptions = [
    { value: "", label: isRTL ? "كل المندوبين" : "All Sales Reps" },
    ...allSalesReps.map((r: any) => ({
      value: r._id,
      label: `${r.code ? r.code + " — " : ""}${isRTL ? r.nameAr : (r.nameEn || r.nameAr)}`,
    })),
  ];

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      <PageHeader
        icon={User}
        title={t("salesBySalesRepTitle")}
        actions={
          <button onClick={() => window.print()} className="btn-ghost h-9 px-4 rounded-xl inline-flex items-center gap-2 text-sm font-semibold">
            <Printer className="h-4 w-4" />
            {t("print")}
          </button>
        }
      />

      <FilterPanel>
        <FilterField label={t("fromDate")}>
          <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setExpandedRepId(null); }} className="input-field h-8 w-auto text-sm" />
        </FilterField>
        <FilterField label={t("toDate")}>
          <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setExpandedRepId(null); }} className="input-field h-8 w-auto text-sm" />
        </FilterField>
        <FilterField label={isRTL ? "المندوب" : "Sales Rep"}>
          <SearchableSelect
            options={repOptions}
            value={selectedRepFilter}
            onChange={(v) => {
              setSelectedRepFilter(v);
              // Auto-expand if a specific rep is selected
              setExpandedRepId(v || null);
            }}
            placeholder={isRTL ? "كل المندوبين" : "All Sales Reps"}
            className="w-52"
          />
        </FilterField>
      </FilterPanel>

      <SummaryStrip items={[
        { label: t("invoiceCount"), value: String(totals.invoiceCount), borderColor: "var(--brand-600)", accent: "var(--ink-900)" },
        { label: t("totalSales"), value: formatCurrency(totals.totalSales), borderColor: "var(--gold-400)", accent: "var(--ink-900)" },
        { label: t("cashSales"), value: formatCurrency(totals.cashSales), borderColor: "#16a34a", accent: "#16a34a" },
        { label: t("creditSales"), value: formatCurrency(totals.creditSales), borderColor: "#2563eb", accent: "#2563eb" },
      ]} />

      <div className="surface-card overflow-hidden">
        {report === undefined ? (
          <div className="loading-spinner"><div className="spinner" /><span className="spinner-label">{t("loading")}</span></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={User} title={t("noResults")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-8"></th>
                  <th>{t("salesRepCode")}</th>
                  <th>{t("salesRep")}</th>
                  <th className="text-end">{t("invoiceCount")}</th>
                  <th className="text-end">{t("cashSales")}</th>
                  <th className="text-end">{t("creditSales")}</th>
                  <th className="text-end">{t("totalSales")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, index: number) => {
                  const rowKey = row.salesRepId ?? `__none__${index}`;
                  const isExpanded = expandedRepId === rowKey;
                  return (
                    <React.Fragment key={rowKey}>
                      <tr
                        className={`cursor-pointer transition-colors ${isExpanded ? "bg-indigo-50/60" : "hover:bg-gray-50"}`}
                        onClick={() => setExpandedRepId(isExpanded ? null : rowKey)}
                      >
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
                            isExpanded ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"
                          }`}>
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </span>
                        </td>
                        <td className="code">{row.salesRepCode || "—"}</td>
                        <td className="font-medium">
                          {isRTL ? row.salesRepNameAr : (row.salesRepNameEn || row.salesRepNameAr)}
                        </td>
                        <td className="numeric text-end font-semibold text-indigo-700">{row.invoiceCount}</td>
                        <td className="numeric text-end text-green-700">{formatCurrency(row.cashSales)}</td>
                        <td className="numeric text-end text-purple-700">{formatCurrency(row.creditSales)}</td>
                        <td className="numeric text-end font-bold">{formatCurrency(row.totalSales)}</td>
                      </tr>

                      {isExpanded && (
                        <RepInvoicesPanel
                          salesRepId={row.salesRepId ?? null}
                          fromDate={fromDate}
                          toDate={toDate}
                          branchId={branchArg}
                          isRTL={isRTL}
                          formatCurrency={formatCurrency}
                        />
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
