// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/useAppStore";
import { User, ChevronDown, ChevronUp, ExternalLink, RotateCcw, Banknote, CreditCard, Shuffle, LayoutList } from "lucide-react";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { ColorKPIGrid } from "@/components/ui/data-display";
import { Wallet, Hash } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PrintableReportPage } from "@/components/ui/printable-report";
import Link from "next/link";

function todayISO() { return new Date().toISOString().split("T")[0]; }
function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ─── Transaction type options ──────────────────────────────────────────────────
const TX_TYPES = [
  { value: "all",         iconEl: LayoutList,  color: "#6b1523", bgColor: "#fdf2f4", labelAr: "الكل",       labelEn: "All"      },
  { value: "cash_sale",   iconEl: Banknote,    color: "#16a34a", bgColor: "#f0fdf4", labelAr: "نقدي",       labelEn: "Cash"     },
  { value: "credit_sale", iconEl: CreditCard,  color: "#2563eb", bgColor: "#eff6ff", labelAr: "آجل",        labelEn: "Credit"   },
  { value: "mixed_sale",  iconEl: Shuffle,     color: "#d97706", bgColor: "#fffbeb", labelAr: "مختلط",      labelEn: "Mixed"    },
  { value: "returns",     iconEl: RotateCcw,   color: "#dc2626", bgColor: "#fef2f2", labelAr: "مرتجعات",    labelEn: "Returns"  },
] as const;

type TxType = typeof TX_TYPES[number]["value"];

// ─── Sales Invoices drill-down panel ──────────────────────────────────────────
function RepInvoicesPanel({ salesRepId, fromDate, toDate, branchId, invoiceType, isRTL, formatCurrency }: any) {
  const result = useQuery(api.reports.getSalesDetailsReport, {
    fromDate,
    toDate,
    branchId: branchId ?? undefined,
    salesRepId: salesRepId ?? undefined,
    invoiceType: invoiceType ?? undefined,
    postingStatus: "posted",
  });

  if (!result) return (
    <tr>
      <td colSpan={8} className="px-6 py-3 text-xs text-center text-gray-400 animate-pulse bg-[#6b1523]/5">
        {isRTL ? "جاري تحميل الفواتير..." : "Loading invoices..."}
      </td>
    </tr>
  );

  const invoices = result.rows ?? [];

  if (invoices.length === 0) return (
    <tr>
      <td colSpan={8} className="px-6 py-3 text-xs text-center text-gray-400 bg-[#6b1523]/5">
        {isRTL ? "لا توجد فواتير في هذه الفترة" : "No invoices in this period"}
      </td>
    </tr>
  );

  const typeLabel = (type: string) => {
    if (type === "cash_sale")   return { label: isRTL ? "نقدي"   : "Cash",   cls: "bg-green-50 text-green-700"   };
    if (type === "credit_sale") return { label: isRTL ? "آجل"    : "Credit", cls: "bg-blue-50 text-blue-700"     };
    if (type === "mixed_sale")  return { label: isRTL ? "مختلط"  : "Mixed",  cls: "bg-amber-50 text-amber-700"   };
    return { label: type, cls: "bg-gray-50 text-gray-600" };
  };

  const totalAmount   = invoices.reduce((s: number, i: any) => s + (i.totalAmount   ?? 0), 0);
  const totalDiscount = invoices.reduce((s: number, i: any) => s + (i.discountAmount ?? 0), 0);

  return (
    <tr>
      <td colSpan={8} className="p-0">
        <div className="bg-[#6b1523]/5 border-t border-[#6b1523]/10 px-6 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#6b1523" }}>
            {isRTL ? `الفواتير — ${invoices.length} فاتورة` : `Invoices — ${invoices.length} records`}
          </p>
          <div className="rounded-xl border border-[#6b1523]/10 overflow-hidden bg-white">
            <table className="w-full text-xs">
              <thead style={{ background: "#6b1523" }}>
                <tr>
                  {[
                    isRTL ? "التاريخ"      : "Date",
                    isRTL ? "رقم الفاتورة" : "Invoice No.",
                    isRTL ? "العميل"       : "Customer",
                    isRTL ? "النوع"        : "Type",
                    isRTL ? "الخصم"        : "Discount",
                    isRTL ? "الإجمالي"     : "Total",
                    isRTL ? "الحالة"       : "Status",
                    "",
                  ].map((h, i) => (
                    <th key={i} className={`px-3 py-2 font-bold text-[10px] uppercase tracking-wider whitespace-nowrap ${i >= 4 && i <= 5 ? "text-end" : i === 6 ? "text-center" : "text-start"}`}
                      style={{ color: "rgba(255,255,255,0.85)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#6b1523]/5">
                {invoices.map((inv: any) => {
                  const tl = typeLabel(inv.invoiceType);
                  return (
                    <tr key={inv._id} className="hover:bg-[#fdf2f4]/60 transition-colors">
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{inv.invoiceDate}</td>
                      <td className="px-3 py-2 font-mono font-bold text-gray-700 whitespace-nowrap">
                        {inv.externalInvoiceNumber || inv.invoiceNumber}
                      </td>
                      <td className="px-3 py-2 text-gray-600 max-w-[160px] truncate">
                        {isRTL ? inv.customerNameAr : (inv.customerNameEn || inv.customerNameAr)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${tl.cls}`}>
                          {tl.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-end text-red-500 tabular-nums whitespace-nowrap">
                        {inv.discountAmount > 0 ? formatCurrency(inv.discountAmount) : "—"}
                      </td>
                      <td className="px-3 py-2 text-end font-bold text-gray-800 tabular-nums whitespace-nowrap">
                        {formatCurrency(inv.totalAmount)}
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          inv.postingStatus === "posted" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                        }`}>
                          {inv.postingStatus === "posted" ? (isRTL ? "مرحل" : "Posted") : (isRTL ? "مسودة" : "Draft")}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Link href={`/sales/invoices/${inv._id}`} className="hover:opacity-70 inline-flex" style={{ color: "#6b1523" }}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2" style={{ borderColor: "#6b1523" }}>
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-[10px] font-bold uppercase" style={{ color: "#6b1523" }}>
                    {isRTL ? "الإجمالي" : "Total"} ({invoices.length})
                  </td>
                  <td className="px-3 py-2 text-end text-xs font-bold text-red-500 tabular-nums">
                    {totalDiscount > 0 ? formatCurrency(totalDiscount) : "—"}
                  </td>
                  <td className="px-3 py-2 text-end text-sm font-bold tabular-nums" style={{ color: "#6b1523" }}>
                    {formatCurrency(totalAmount)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Returns drill-down panel ──────────────────────────────────────────────────
function RepReturnsPanel({ repData, isRTL, formatCurrency }: any) {
  const returns = repData?.returns ?? [];
  if (returns.length === 0) return (
    <tr>
      <td colSpan={7} className="px-6 py-3 text-xs text-center text-gray-400 bg-red-50/40">
        {isRTL ? "لا توجد مرتجعات" : "No returns"}
      </td>
    </tr>
  );

  const refundLabel = (m: string) => {
    if (m === "cash")        return { label: isRTL ? "نقدي"    : "Cash",       cls: "bg-green-50 text-green-700" };
    if (m === "credit_note") return { label: isRTL ? "إشعار دائن" : "Credit Note", cls: "bg-blue-50 text-blue-700"  };
    return                          { label: m,                                  cls: "bg-gray-50 text-gray-600"  };
  };

  return (
    <tr>
      <td colSpan={7} className="p-0">
        <div className="bg-red-50/40 border-t border-red-100 px-6 py-4">
          <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-2">
            {isRTL ? `المرتجعات — ${returns.length}` : `Returns — ${returns.length} records`}
          </p>
          <div className="rounded-xl border border-red-100 overflow-hidden bg-white">
            <table className="w-full text-xs">
              <thead style={{ background: "#dc2626" }}>
                <tr>
                  {[
                    isRTL ? "التاريخ"    : "Date",
                    isRTL ? "رقم المرتجع" : "Return No.",
                    isRTL ? "العميل"     : "Customer",
                    isRTL ? "طريقة الاسترداد" : "Refund Method",
                    isRTL ? "السبب"      : "Reason",
                    isRTL ? "المبلغ"     : "Amount",
                  ].map((h, i) => (
                    <th key={i} className={`px-3 py-2 font-bold text-[10px] uppercase tracking-wider whitespace-nowrap ${i === 5 ? "text-end" : "text-start"}`}
                      style={{ color: "rgba(255,255,255,0.9)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-red-50">
                {returns.map((r: any) => {
                  const rl = refundLabel(r.refundMethod);
                  return (
                    <tr key={r._id} className="hover:bg-red-50/30 transition-colors">
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.returnDate}</td>
                      <td className="px-3 py-2 font-mono font-bold text-gray-700 whitespace-nowrap">{r.returnNumber}</td>
                      <td className="px-3 py-2 text-gray-600 max-w-[160px] truncate">
                        {isRTL ? r.customerNameAr : (r.customerNameEn || r.customerNameAr)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${rl.cls}`}>
                          {rl.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 max-w-[120px] truncate">{r.returnReason || "—"}</td>
                      <td className="px-3 py-2 text-end font-bold text-red-600 tabular-nums whitespace-nowrap">
                        ({formatCurrency(r.totalAmount)})
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-red-50 border-t-2 border-red-200">
                <tr>
                  <td colSpan={5} className="px-3 py-2 text-[10px] font-bold text-red-700 uppercase">
                    {isRTL ? "إجمالي المرتجعات" : "Total Returns"}
                  </td>
                  <td className="px-3 py-2 text-end font-bold text-red-700 tabular-nums">
                    ({formatCurrency(returns.reduce((s: number, r: any) => s + r.totalAmount, 0))})
                  </td>
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
  const { company: printCompany } = useCompanySettings();
  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const [expandedRepId, setExpandedRepId] = useState<string | null>(null);
  const [selectedRepFilter, setSelectedRepFilter] = useState<string>("");
  const [txType, setTxType] = useState<TxType>("all");
  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;
  const allSalesReps = useQuery(api.salesMasters.listSalesReps, companyId ? { companyId } : "skip") ?? [];

  const isReturns = txType === "returns";

  // Sales report query
  const report = useQuery(
    api.reports.getSalesBySalesRep,
    !isReturns ? {
      fromDate,
      toDate,
      branchId: branchArg as any,
      invoiceType: txType !== "all" ? (txType as any) : undefined,
    } : "skip"
  );

  // Returns report query
  const returnsReport = useQuery(
    api.reports.getSalesReturnsBySalesRep,
    isReturns ? {
      fromDate,
      toDate,
      branchId: branchArg as any,
    } : "skip"
  );

  // ─── Sales mode ───────────────────────────────────────────────────────────
  const allSalesRows = report?.rows ?? [];
  const salesRows = selectedRepFilter
    ? allSalesRows.filter((r: any) => r.salesRepId === selectedRepFilter)
    : allSalesRows;

  const salesTotals = salesRows.length > 0 ? {
    invoiceCount: salesRows.reduce((s: number, r: any) => s + r.invoiceCount, 0),
    totalSales:   salesRows.reduce((s: number, r: any) => s + r.totalSales, 0),
    cashSales:    salesRows.reduce((s: number, r: any) => s + r.cashSales, 0),
    creditSales:  salesRows.reduce((s: number, r: any) => s + r.creditSales, 0),
    discountTotal:salesRows.reduce((s: number, r: any) => s + (r.discountTotal ?? 0), 0),
  } : (report?.totals ?? { invoiceCount: 0, totalSales: 0, cashSales: 0, creditSales: 0, discountTotal: 0 });

  // ─── Returns mode ─────────────────────────────────────────────────────────
  const allReturnsRows = returnsReport?.rows ?? [];
  const returnsRows = selectedRepFilter
    ? allReturnsRows.filter((r: any) => r.salesRepId === selectedRepFilter)
    : allReturnsRows;

  const returnsTotals = returnsReport?.totals ?? { returnCount: 0, totalReturns: 0, cashReturns: 0, creditReturns: 0 };

  // ─── Shared ───────────────────────────────────────────────────────────────
  const repOptions = [
    { value: "", label: isRTL ? "كل المندوبين" : "All Sales Reps" },
    ...allSalesReps.map((r: any) => ({
      value: r._id,
      label: `${r.code ? r.code + " — " : ""}${isRTL ? r.nameAr : (r.nameEn || r.nameAr)}`,
    })),
  ];

  const activeTx = TX_TYPES.find((t) => t.value === txType)!;

  const summaryItems = isReturns ? [
    { label: isRTL ? "إجمالي المرتجعات" : "Total Returns",  value: formatCurrency(returnsTotals.totalReturns),
      color: "#6b1523", bg: "#fdf2f4", border: "#6b152330", icon: RotateCcw, big: true,
      hint: `${returnsTotals.returnCount} ${isRTL ? "مرتجع" : "returns"}` },
    { label: isRTL ? "عدد المرتجعات"    : "Return Count",   value: String(returnsTotals.returnCount),
      color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: Hash },
    { label: isRTL ? "استرداد نقدي"      : "Cash Refunds",   value: formatCurrency(returnsTotals.cashReturns),
      color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", icon: Banknote },
    { label: isRTL ? "إشعار دائن"        : "Credit Notes",   value: formatCurrency(returnsTotals.creditReturns),
      color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", icon: CreditCard },
  ] : [
    { label: t("totalSales"),    value: formatCurrency(salesTotals.totalSales),
      color: "#6b1523", bg: "#fdf2f4", border: "#6b152330", icon: Wallet, big: true,
      hint: `${salesTotals.invoiceCount} ${t("invoiceCount").toLowerCase()}` },
    { label: t("cashSales"),     value: formatCurrency(salesTotals.cashSales),
      color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", icon: Banknote },
    { label: t("creditSales"),   value: formatCurrency(salesTotals.creditSales),
      color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", icon: CreditCard },
    { label: t("invoiceCount"),  value: String(salesTotals.invoiceCount),
      color: "#7c3aed", bg: "#faf5ff", border: "#ddd6fe", icon: Hash },
  ];

  const loading = isReturns ? returnsReport === undefined : report === undefined;
  const rows    = isReturns ? returnsRows : salesRows;

  return (
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={t("salesBySalesRepTitle")}
      period={`${fromDate} — ${toDate}`}
      filters={
        <div className="space-y-3">
          {/* ── Transaction type pills ── */}
          <div className="flex flex-wrap gap-2">
            {TX_TYPES.map((tx) => {
              const Icon = tx.iconEl;
              const active = txType === tx.value;
              return (
                <button
                  key={tx.value}
                  onClick={() => { setTxType(tx.value); setExpandedRepId(null); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all border"
                  style={{
                    background:   active ? tx.color : tx.bgColor,
                    color:        active ? "white"  : tx.color,
                    borderColor:  active ? tx.color : tx.color + "30",
                    boxShadow:    active ? `0 2px 8px ${tx.color}40` : "none",
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {isRTL ? tx.labelAr : tx.labelEn}
                </button>
              );
            })}
          </div>

          {/* ── Date + Rep filters ── */}
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
                onChange={(v) => { setSelectedRepFilter(v); setExpandedRepId(v || null); }}
                placeholder={isRTL ? "كل المندوبين" : "All Sales Reps"}
                className="w-52"
              />
            </FilterField>
          </FilterPanel>
        </div>
      }
      summary={<ColorKPIGrid items={summaryItems} cols={4} />}
    >
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /><span className="spinner-label">{t("loading")}</span></div>
      ) : rows.length === 0 ? (
        <EmptyState icon={isReturns ? RotateCcw : User} title={isReturns ? (isRTL ? "لا توجد مرتجعات" : "No returns found") : t("noResults")} />
      ) : isReturns ? (
        // ─── Returns Table ───────────────────────────────────────────────────
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: "#6b1523" }}>
                {[
                  "",
                  isRTL ? "كود المندوب"    : "Rep Code",
                  isRTL ? "المندوب"        : "Sales Rep",
                  isRTL ? "عدد المرتجعات"  : "Returns",
                  isRTL ? "استرداد نقدي"   : "Cash Refunds",
                  isRTL ? "إشعار دائن"     : "Credit Notes",
                  isRTL ? "إجمالي المرتجعات" : "Total Returns",
                ].map((h, i) => (
                  <th key={i} className={`px-[14px] py-[10px] text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${i === 0 ? "w-8" : i >= 3 ? "text-end" : "text-start"}`}
                    style={{ color: "rgba(255,255,255,0.85)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {returnsRows.map((row: any, index: number) => {
                const rowKey = row.salesRepId ?? `__none__${index}`;
                const isExpanded = expandedRepId === rowKey;
                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      className={`cursor-pointer transition-colors ${isExpanded ? "bg-red-50/60" : "hover:bg-gray-50"}`}
                      onClick={() => setExpandedRepId(isExpanded ? null : rowKey)}
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                      <td className="px-3 py-3 no-print">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors ${isExpanded ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"}`}>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </span>
                      </td>
                      <td className="px-[14px] py-[10px]">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: "var(--ink-100)", color: "var(--ink-600)" }}>
                          {row.salesRepCode || "—"}
                        </span>
                      </td>
                      <td className="px-[14px] py-[10px] font-medium text-[13px]" style={{ color: "#1e293b" }}>
                        {isRTL ? row.salesRepNameAr : (row.salesRepNameEn || row.salesRepNameAr)}
                      </td>
                      <td className="px-[14px] py-[10px] text-end font-semibold text-[13px] tabular-nums text-red-600">{row.returnCount}</td>
                      <td className="px-[14px] py-[10px] text-end text-[13px] tabular-nums text-green-700">{formatCurrency(row.cashReturns)}</td>
                      <td className="px-[14px] py-[10px] text-end text-[13px] tabular-nums text-blue-700">{formatCurrency(row.creditReturns)}</td>
                      <td className="px-[14px] py-[10px] text-end font-bold text-[13px] tabular-nums text-red-700">({formatCurrency(row.totalReturns)})</td>
                    </tr>
                    {isExpanded && <RepReturnsPanel repData={row} isRTL={isRTL} formatCurrency={formatCurrency} />}
                  </React.Fragment>
                );
              })}
            </tbody>
            {/* Totals row */}
            <tfoot>
              <tr style={{ background: "#fef2f2", borderTop: "2px solid #dc2626" }}>
                <td colSpan={3} className="px-[14px] py-[10px] text-[12px] font-bold" style={{ color: "#dc2626" }}>
                  {isRTL ? "الإجمالي" : "Total"}
                </td>
                <td className="px-[14px] py-[10px] text-end font-bold tabular-nums text-red-600">{returnsTotals.returnCount}</td>
                <td className="px-[14px] py-[10px] text-end font-bold tabular-nums text-green-700">{formatCurrency(returnsTotals.cashReturns)}</td>
                <td className="px-[14px] py-[10px] text-end font-bold tabular-nums text-blue-700">{formatCurrency(returnsTotals.creditReturns)}</td>
                <td className="px-[14px] py-[10px] text-end font-bold tabular-nums text-red-700">({formatCurrency(returnsTotals.totalReturns)})</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        // ─── Sales Table ─────────────────────────────────────────────────────
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: "#6b1523" }}>
                {[
                  "",
                  isRTL ? "كود المندوب" : "Rep Code",
                  isRTL ? "المندوب"     : "Sales Rep",
                  isRTL ? "الفواتير"    : "Invoices",
                  isRTL ? "نقدي"        : "Cash",
                  isRTL ? "آجل"         : "Credit",
                  isRTL ? "الإجمالي"    : "Total Sales",
                ].map((h, i) => (
                  <th key={i} className={`px-[14px] py-[10px] text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${i === 0 ? "w-8 no-print" : i >= 3 ? "text-end" : "text-start"}`}
                    style={{ color: "rgba(255,255,255,0.85)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {salesRows.map((row: any, index: number) => {
                const rowKey = row.salesRepId ?? `__none__${index}`;
                const isExpanded = expandedRepId === rowKey;
                const pct = salesTotals.totalSales > 0 ? (row.totalSales / salesTotals.totalSales) * 100 : 0;
                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      className={`cursor-pointer transition-colors ${isExpanded ? "bg-[#fdf2f4]" : "hover:bg-gray-50"}`}
                      onClick={() => setExpandedRepId(isExpanded ? null : rowKey)}
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                      <td className="px-3 py-3 no-print">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
                          isExpanded ? "text-white" : "bg-gray-100 text-gray-400"
                        }`} style={isExpanded ? { background: "#6b1523" } : {}}>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </span>
                      </td>
                      <td className="px-[14px] py-[10px]">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: "var(--ink-100)", color: "var(--ink-600)" }}>
                          {row.salesRepCode || "—"}
                        </span>
                      </td>
                      <td className="px-[14px] py-[10px]">
                        <div>
                          <span className="font-semibold text-[13px]" style={{ color: "#1e293b" }}>
                            {isRTL ? row.salesRepNameAr : (row.salesRepNameEn || row.salesRepNameAr)}
                          </span>
                          {/* Progress bar */}
                          <div className="mt-1 h-1.5 rounded-full bg-gray-100 w-32 overflow-hidden no-print">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "#6b1523" }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-[14px] py-[10px] text-end font-semibold text-[13px] tabular-nums" style={{ color: "#6b1523" }}>
                        {row.invoiceCount}
                      </td>
                      <td className="px-[14px] py-[10px] text-end text-[13px] tabular-nums text-green-700">{formatCurrency(row.cashSales)}</td>
                      <td className="px-[14px] py-[10px] text-end text-[13px] tabular-nums text-blue-700">{formatCurrency(row.creditSales)}</td>
                      <td className="px-[14px] py-[10px] text-end font-bold text-[13px] tabular-nums" style={{ color: "#1e293b" }}>{formatCurrency(row.totalSales)}</td>
                    </tr>

                    {isExpanded && (
                      <RepInvoicesPanel
                        salesRepId={row.salesRepId ?? null}
                        fromDate={fromDate}
                        toDate={toDate}
                        branchId={branchArg}
                        invoiceType={txType !== "all" ? txType : undefined}
                        isRTL={isRTL}
                        formatCurrency={formatCurrency}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            {/* Totals row */}
            <tfoot>
              <tr style={{ background: "#fdf2f4", borderTop: "2px solid #6b1523" }}>
                <td colSpan={3} className="px-[14px] py-[10px] text-[12px] font-bold no-print" style={{ color: "#6b1523" }}>
                  {isRTL ? "الإجمالي" : "Total"}
                </td>
                <td className="px-[14px] py-[10px] text-end font-bold tabular-nums" style={{ color: "#6b1523" }}>{salesTotals.invoiceCount}</td>
                <td className="px-[14px] py-[10px] text-end font-bold tabular-nums text-green-700">{formatCurrency(salesTotals.cashSales)}</td>
                <td className="px-[14px] py-[10px] text-end font-bold tabular-nums text-blue-700">{formatCurrency(salesTotals.creditSales)}</td>
                <td className="px-[14px] py-[10px] text-end font-bold tabular-nums" style={{ color: "#1e293b" }}>{formatCurrency(salesTotals.totalSales)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </PrintableReportPage>
  );
}
