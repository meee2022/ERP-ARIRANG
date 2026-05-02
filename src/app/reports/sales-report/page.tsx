// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  TrendingUp, Calendar, FileText, FileSpreadsheet,
  ChevronDown, ChevronUp, ExternalLink,
  Banknote, CreditCard, Shuffle, LayoutList,
  Receipt, Tag, Users,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PrintableReportPage } from "@/components/ui/printable-report";
import Link from "next/link";

// ─── Transaction-type pills ───────────────────────────────────────────────────
const TX_TYPES = [
  { value: "all",         Icon: LayoutList, color: "#6b1523", bg: "#fdf2f4", labelAr: "الكل",   labelEn: "All"    },
  { value: "cash_sale",   Icon: Banknote,   color: "#16a34a", bg: "#f0fdf4", labelAr: "نقدي",   labelEn: "Cash"   },
  { value: "credit_sale", Icon: CreditCard, color: "#2563eb", bg: "#eff6ff", labelAr: "آجل",    labelEn: "Credit" },
  { value: "mixed_sale",  Icon: Shuffle,    color: "#d97706", bg: "#fffbeb", labelAr: "مختلط",  labelEn: "Mixed"  },
] as const;
type TxType = typeof TX_TYPES[number]["value"];

function todayISO() { return new Date().toISOString().split("T")[0]; }
function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KPI({ label, value, color, bg, border, Icon, hint }: any) {
  return (
    <div className="rounded-2xl border p-3.5" style={{ background: bg, borderColor: border }}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && (
          <span className="h-6 w-6 rounded-md flex items-center justify-center"
            style={{ background: color + "20" }}>
            <Icon className="h-3.5 w-3.5" style={{ color }} />
          </span>
        )}
        <p className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color }}>
          {label}
        </p>
      </div>
      <p className="text-[18px] font-black tabular-nums leading-tight" style={{ color }}>{value}</p>
      {hint && <p className="text-[10.5px] mt-0.5" style={{ color: color + "aa" }}>{hint}</p>}
    </div>
  );
}

// ─── Type badge for invoice rows ──────────────────────────────────────────────
function TypeBadge({ type, isRTL }: { type: string; isRTL: boolean }) {
  const map: any = {
    cash_sale:   { color: "#16a34a", bg: "#f0fdf4", labelAr: "نقدي",  labelEn: "Cash"   },
    credit_sale: { color: "#2563eb", bg: "#eff6ff", labelAr: "آجل",   labelEn: "Credit" },
    mixed_sale:  { color: "#d97706", bg: "#fffbeb", labelAr: "مختلط", labelEn: "Mixed"  },
  };
  const c = map[type] ?? { color: "#64748b", bg: "#f1f5f9", labelAr: type, labelEn: type };
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold"
      style={{ background: c.bg, color: c.color }}>
      {isRTL ? c.labelAr : c.labelEn}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, isRTL }: { status: string; isRTL: boolean }) {
  const isPosted = status === "posted";
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold"
      style={{
        background: isPosted ? "#f0fdf4" : "#fefce8",
        color:      isPosted ? "#15803d" : "#a16207",
      }}>
      {isPosted ? (isRTL ? "مرحل" : "Posted") : (isRTL ? "مسودة" : "Draft")}
    </span>
  );
}

// ─── Invoice drill-down panel ─────────────────────────────────────────────────
function InvoicesPanel({ fromDate, toDate, branchId, salesRepId, customerId, colSpan, isRTL, fmt, txType }: any) {
  const result = useQuery(api.reports.getSalesDetailsReport, {
    fromDate, toDate,
    branchId: branchId ?? undefined,
    salesRepId: salesRepId ?? undefined,
    customerId: customerId ?? undefined,
    invoiceType: txType !== "all" ? (txType as any) : undefined,
  });

  if (!result) return (
    <tr><td colSpan={colSpan} className="px-6 py-3 text-xs text-center bg-[#fdf2f4]/40 animate-pulse"
      style={{ color: "var(--ink-400)" }}>
      {isRTL ? "جاري تحميل الفواتير..." : "Loading invoices..."}
    </td></tr>
  );

  const invoices = result.rows ?? [];
  if (invoices.length === 0) return (
    <tr><td colSpan={colSpan} className="px-6 py-3 text-xs text-center bg-[#fdf2f4]/40"
      style={{ color: "var(--ink-400)" }}>
      {isRTL ? "لا توجد فواتير" : "No invoices found"}
    </td></tr>
  );

  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <div className="border-t px-6 py-3" style={{ background: "#fdf2f4/40", borderColor: "#6b152320" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
            style={{ color: "#6b1523" }}>
            {isRTL ? `الفواتير (${invoices.length})` : `Invoices (${invoices.length})`}
          </p>
          <div className="rounded-lg overflow-hidden bg-white"
            style={{ border: "1px solid #6b152320" }}>
            <table className="w-full text-xs">
              <thead style={{ background: "#fdf2f4", color: "#6b1523" }}>
                <tr>
                  <th className="px-3 py-2 text-start font-semibold">{isRTL ? "التاريخ" : "Date"}</th>
                  <th className="px-3 py-2 text-start font-semibold">{isRTL ? "رقم الفاتورة" : "Invoice No."}</th>
                  <th className="px-3 py-2 text-start font-semibold">{isRTL ? "العميل" : "Customer"}</th>
                  <th className="px-3 py-2 text-start font-semibold">{isRTL ? "النوع" : "Type"}</th>
                  <th className="px-3 py-2 text-end font-semibold">{isRTL ? "الخصم" : "Discount"}</th>
                  <th className="px-3 py-2 text-end font-semibold">{isRTL ? "نقدي" : "Cash"}</th>
                  <th className="px-3 py-2 text-end font-semibold">{isRTL ? "آجل" : "Credit"}</th>
                  <th className="px-3 py-2 text-end font-semibold">{isRTL ? "الإجمالي" : "Total"}</th>
                  <th className="px-3 py-2 text-center font-semibold">{isRTL ? "الحالة" : "Status"}</th>
                  <th className="px-3 py-2 w-8 no-print"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: any, i: number) => (
                  <tr key={inv._id}
                    style={{
                      background: i % 2 === 0 ? "white" : "#fafafa",
                      borderTop: "1px solid #f1f5f9",
                    }}>
                    <td className="px-3 py-2" style={{ color: "var(--ink-500)" }}>{inv.invoiceDate}</td>
                    <td className="px-3 py-2 font-mono font-bold" style={{ color: "var(--ink-700)" }}>
                      {inv.externalInvoiceNumber || inv.invoiceNumber}
                    </td>
                    <td className="px-3 py-2 max-w-[160px] truncate" style={{ color: "var(--ink-600)" }}>
                      {isRTL ? inv.customerNameAr : (inv.customerNameEn || inv.customerNameAr)}
                    </td>
                    <td className="px-3 py-2"><TypeBadge type={inv.invoiceType} isRTL={isRTL} /></td>
                    <td className="px-3 py-2 text-end" style={{ color: inv.discountAmount > 0 ? "#dc2626" : "var(--ink-300)" }}>
                      {inv.discountAmount > 0 ? fmt(inv.discountAmount) : "—"}
                    </td>
                    <td className="px-3 py-2 text-end" style={{ color: (inv.cashAmount ?? 0) > 0 ? "#15803d" : "var(--ink-300)" }}>
                      {(inv.cashAmount ?? 0) > 0 ? fmt(inv.cashAmount) : "—"}
                    </td>
                    <td className="px-3 py-2 text-end" style={{ color: (inv.creditAmount ?? 0) > 0 ? "#2563eb" : "var(--ink-300)" }}>
                      {(inv.creditAmount ?? 0) > 0 ? fmt(inv.creditAmount) : "—"}
                    </td>
                    <td className="px-3 py-2 text-end font-bold" style={{ color: "var(--ink-800)" }}>
                      {fmt(inv.totalAmount)}
                    </td>
                    <td className="px-3 py-2 text-center"><StatusBadge status={inv.postingStatus} isRTL={isRTL} /></td>
                    <td className="px-3 py-2 text-center no-print">
                      <Link href={`/sales/invoices/${inv._id}`} style={{ color: "#6b1523" }}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ background: "#fdf2f4", borderTop: "2px solid #6b152330" }}>
                <tr>
                  <td colSpan={4} className="px-3 py-1.5 text-[11px] font-black uppercase"
                    style={{ color: "#6b1523" }}>
                    {isRTL ? "الإجمالي" : "Total"} ({invoices.length})
                  </td>
                  <td className="px-3 py-1.5 text-end font-bold" style={{ color: "#dc2626" }}>
                    {fmt(invoices.reduce((s: number, i: any) => s + (i.discountAmount ?? 0), 0))}
                  </td>
                  <td className="px-3 py-1.5 text-end font-bold" style={{ color: "#15803d" }}>
                    {fmt(invoices.reduce((s: number, i: any) => s + (i.cashAmount ?? 0), 0))}
                  </td>
                  <td className="px-3 py-1.5 text-end font-bold" style={{ color: "#2563eb" }}>
                    {fmt(invoices.reduce((s: number, i: any) => s + (i.creditAmount ?? 0), 0))}
                  </td>
                  <td className="px-3 py-1.5 text-end font-black text-[12px]" style={{ color: "#6b1523" }}>
                    {fmt(invoices.reduce((s: number, i: any) => s + (i.totalAmount ?? 0), 0))}
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
export default function SalesReportPage() {
  const { t, isRTL, formatCurrency: fmt } = useI18n();
  const { company: printCompany } = useCompanySettings();
  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const [groupBy, setGroupBy] = useState<"day" | "item" | "customer" | "salesRep">("day");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [txType, setTxType] = useState<TxType>("all");

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];

  const report = useQuery(
    api.reports.getSalesReport,
    fromDate && toDate
      ? { fromDate, toDate, groupBy, branchId: branchArg as any, companyId: company?._id as any, invoiceType: txType !== "all" ? (txType as any) : undefined }
      : "skip"
  );

  const loading = report === undefined;

  // ── Conditional display flags based on tx type filter ──────────────────────
  // When filtering Cash: only show cash columns/KPIs
  // When filtering Credit: only show credit columns/KPIs
  // When filtering Mixed: show both (mixed has both)
  // When All: show both
  const showCash   = txType === "all" || txType === "cash_sale"   || txType === "mixed_sale";
  const showCredit = txType === "all" || txType === "credit_sale" || txType === "mixed_sale";
  const showBoth   = showCash && showCredit;

  // ── Column count per groupBy (dynamic based on filter) ─────────────────────
  const moneyCols  = (showCash ? 1 : 0) + (showCredit ? 1 : 0); // 1 or 2
  const colCount = groupBy === "day"      ? 3 + moneyCols
    : groupBy === "salesRep" ? 5 + moneyCols
    : groupBy === "customer" ? 4 + moneyCols
    : 3;

  // ── Excel export ────────────────────────────────────────────────────────────
  async function exportExcel() {
    if (!report?.data?.length) return;
    const XLSX = await import("xlsx");
    const rows = report.data.map((row: any) => {
      if (groupBy === "day") return {
        [isRTL ? "التاريخ" : "Date"]: row.date,
        [isRTL ? "عدد الفواتير" : "Invoices"]: row.count,
        [isRTL ? "نقدي" : "Cash"]: row.cash ?? 0,
        [isRTL ? "آجل" : "Credit"]: row.credit ?? 0,
        [isRTL ? "الخصم" : "Discount"]: row.discount ?? 0,
        [isRTL ? "الإجمالي" : "Total"]: row.total ?? 0,
      };
      if (groupBy === "item") return {
        [isRTL ? "الصنف" : "Item"]: row.itemName,
        [isRTL ? "الكمية" : "Qty"]: row.qty,
        [isRTL ? "الإجمالي" : "Total"]: row.total ?? 0,
      };
      if (groupBy === "salesRep") return {
        [isRTL ? "الكود" : "Code"]: row.repCode,
        [isRTL ? "المندوب" : "Rep"]: row.repName,
        [isRTL ? "عدد الفواتير" : "Invoices"]: row.count,
        [isRTL ? "نقدي" : "Cash"]: row.cash ?? 0,
        [isRTL ? "آجل" : "Credit"]: row.credit ?? 0,
        [isRTL ? "الخصم" : "Discount"]: row.discount ?? 0,
        [isRTL ? "الإجمالي" : "Total"]: row.total ?? 0,
      };
      return {
        [isRTL ? "الكود" : "Code"]: row.customerCode ?? "",
        [isRTL ? "العميل" : "Customer"]: row.customerName,
        [isRTL ? "عدد الفواتير" : "Invoices"]: row.count,
        [isRTL ? "نقدي" : "Cash"]: row.cash ?? 0,
        [isRTL ? "آجل" : "Credit"]: row.credit ?? 0,
        [isRTL ? "الإجمالي" : "Total"]: row.total ?? 0,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isRTL ? "تقرير المبيعات" : "Sales Report");
    XLSX.writeFile(wb, `sales-report-${fromDate}-${toDate}.xlsx`);
  }

  return (
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={t("salesReportTitle")}
      period={`${fromDate} — ${toDate}`}
      actions={
        <button
          onClick={exportExcel}
          disabled={!report?.data?.length}
          className="h-9 px-3 rounded-lg inline-flex items-center gap-2 text-sm font-semibold border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-40"
        >
          <FileSpreadsheet className="h-4 w-4" />
          {isRTL ? "تنزيل Excel" : "Download Excel"}
        </button>
      }
      filters={
        <div className="space-y-3">
          {/* Transaction type pills */}
          <div className="flex flex-wrap gap-2 px-1">
            {TX_TYPES.map(({ value, Icon, color, bg, labelAr, labelEn }) => {
              const active = txType === value;
              return (
                <button key={value} onClick={() => { setTxType(value); setExpandedKey(null); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all border"
                  style={{ background: active ? color : bg, color: active ? "white" : color, borderColor: active ? color : color + "30", boxShadow: active ? `0 2px 8px ${color}40` : "none" }}>
                  <Icon className="h-3.5 w-3.5" />
                  {isRTL ? labelAr : labelEn}
                </button>
              );
            })}
          </div>
          {/* Date + groupBy bar */}
          <div className="surface-card px-5 py-3.5 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0" style={{ color: "var(--ink-400)" }} />
              <span className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--ink-500)" }}>{t("fromDate")}</span>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input-field h-8 text-sm w-auto" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--ink-500)" }}>{t("toDate")}</span>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input-field h-8 text-sm w-auto" />
            </div>
            <div className="flex items-center gap-2 ms-auto">
              <span className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--ink-500)" }}>{t("groupBy")}</span>
              <select value={groupBy} onChange={e => { setGroupBy(e.target.value as any); setExpandedKey(null); }} className="input-field h-8 text-sm w-auto">
                <option value="day">{t("groupByDay")}</option>
                <option value="item">{t("groupByItem")}</option>
                <option value="customer">{t("groupByCustomer")}</option>
                <option value="salesRep">{isRTL ? "بالمندوب" : "By Sales Rep"}</option>
              </select>
            </div>
          </div>
        </div>
      }
      summary={
        report ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Always: Total Sales */}
            <KPI
              label={
                txType === "cash_sale"   ? (isRTL ? "إجمالي النقدي"  : "Total Cash")
              : txType === "credit_sale" ? (isRTL ? "إجمالي الآجل"   : "Total Credit")
              : txType === "mixed_sale"  ? (isRTL ? "إجمالي المختلط" : "Total Mixed")
              :                            (isRTL ? "إجمالي المبيعات" : "Total Sales")
              }
              value={fmt(report.totalSales ?? 0)}
              color="#6b1523" bg="#fdf2f4" border="#6b152330"
              Icon={TrendingUp}
              hint={`${report.invoiceCount ?? 0} ${isRTL ? "فاتورة" : "invoices"}`}
            />

            {/* Show Cash KPI only when relevant */}
            {showCash && (
              <KPI
                label={isRTL ? "نقدي" : "Cash"}
                value={fmt(report.totalCash ?? 0)}
                color="#15803d" bg="#f0fdf4" border="#bbf7d0"
                Icon={Banknote}
                hint={`${report.cashInvoices ?? 0} ${isRTL ? "فاتورة" : "invoices"}`}
              />
            )}

            {/* Show Credit KPI only when relevant */}
            {showCredit && (
              <KPI
                label={isRTL ? "آجل" : "Credit"}
                value={fmt(report.totalCredit ?? 0)}
                color="#2563eb" bg="#eff6ff" border="#bfdbfe"
                Icon={CreditCard}
                hint={`${report.creditInvoices ?? 0} ${isRTL ? "فاتورة" : "invoices"}`}
              />
            )}

            {/* Show Mixed KPI only when filter is "all" */}
            {txType === "all" && (
              <KPI
                label={isRTL ? "مختلط" : "Mixed"}
                value={String(report.mixedInvoices ?? 0)}
                color="#d97706" bg="#fffbeb" border="#fed7aa"
                Icon={Shuffle}
                hint={isRTL ? "فواتير مختلطة" : "mixed invoices"}
              />
            )}

            {/* Always: Discounts */}
            <KPI
              label={isRTL ? "الخصومات" : "Discounts"}
              value={fmt(report.totalDiscount ?? 0)}
              color="#dc2626" bg="#fef2f2" border="#fecaca"
              Icon={Tag}
              hint={isRTL ? "إجمالي الخصم" : "total discount"}
            />

            {/* Always: Avg Invoice */}
            <KPI
              label={isRTL ? "متوسط الفاتورة" : "Avg. Invoice"}
              value={fmt(report.avgInvoice ?? 0)}
              color="#7c3aed" bg="#f5f3ff" border="#ddd6fe"
              Icon={Receipt}
              hint={isRTL ? "متوسط القيمة" : "average value"}
            />
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <LoadingState label={t("loading")} />
      ) : !report || !report.data || report.data.length === 0 ? (
        <EmptyState icon={TrendingUp} title={t("noResults")} />
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {groupBy === "day" && <>
                  <th>{t("date")}</th>
                  <th className="text-end">{t("invoiceCount")}</th>
                  {showCash   && <th className="text-end">{isRTL ? "نقدي" : "Cash"}</th>}
                  {showCredit && <th className="text-end">{isRTL ? "آجل" : "Credit"}</th>}
                  <th className="text-end">{t("totalSales")}</th>
                </>}
                {groupBy === "item" && <>
                  <th>{t("item")}</th>
                  <th className="text-end">{t("quantity")}</th>
                  <th className="text-end">{t("totalSales")}</th>
                </>}
                {groupBy === "customer" && <>
                  <th className="w-20">{isRTL ? "كود" : "Code"}</th>
                  <th>{t("customers")}</th>
                  <th className="text-end">{t("invoiceCount")}</th>
                  {showCash   && <th className="text-end">{isRTL ? "نقدي" : "Cash"}</th>}
                  {showCredit && <th className="text-end">{isRTL ? "آجل" : "Credit"}</th>}
                  <th className="text-end">{t("totalSales")}</th>
                </>}
                {groupBy === "salesRep" && <>
                  <th className="w-8 no-print"></th>
                  <th className="w-20">{isRTL ? "كود" : "Code"}</th>
                  <th>{isRTL ? "اسم المندوب" : "Sales Rep"}</th>
                  <th className="text-end">{t("invoiceCount")}</th>
                  {showCash   && <th className="text-end">{isRTL ? "نقدي" : "Cash"}</th>}
                  {showCredit && <th className="text-end">{isRTL ? "آجل" : "Credit"}</th>}
                  <th className="text-end">{t("totalSales")}</th>
                </>}
              </tr>
            </thead>
            <tbody>
              {report.data.map((row: any, i: number) => {
                const rowKey = groupBy === "day" ? row.date
                  : groupBy === "salesRep" ? (row.salesRepId ?? row.repName ?? String(i))
                  : groupBy === "customer" ? (row.customerId ?? String(i))
                  : String(i);
                const isExpanded = expandedKey === rowKey;
                const canExpand = groupBy === "salesRep" || groupBy === "customer" || groupBy === "day";

                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      className={`transition-colors ${canExpand ? "cursor-pointer" : ""}`}
                      style={{ background: isExpanded ? "#fdf2f4" : (i % 2 === 0 ? "white" : "#fafafa") }}
                      onClick={() => canExpand && setExpandedKey(isExpanded ? null : rowKey)}
                    >
                      {groupBy === "day" && <>
                        <td className="muted tabular-nums">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full no-print"
                              style={{
                                background: isExpanded ? "#6b152320" : "var(--ink-100)",
                                color:      isExpanded ? "#6b1523"   : "var(--ink-400)",
                              }}>
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </span>
                            {row.date}
                          </span>
                        </td>
                        <td className="numeric text-end font-bold" style={{ color: "#6b1523" }}>{row.count}</td>
                        {showCash && (
                          <td className="numeric text-end" style={{ color: (row.cash ?? 0) > 0 ? "#15803d" : "var(--ink-300)" }}>
                            {(row.cash ?? 0) > 0 ? fmt(row.cash) : "—"}
                          </td>
                        )}
                        {showCredit && (
                          <td className="numeric text-end" style={{ color: (row.credit ?? 0) > 0 ? "#2563eb" : "var(--ink-300)" }}>
                            {(row.credit ?? 0) > 0 ? fmt(row.credit) : "—"}
                          </td>
                        )}
                        <td className="numeric text-end font-bold">{fmt(row.total ?? 0)}</td>
                      </>}
                      {groupBy === "item" && <>
                        <td>{row.itemName}</td>
                        <td className="numeric text-end">{row.qty?.toFixed(2)}</td>
                        <td className="numeric text-end font-bold">{fmt(row.total ?? 0)}</td>
                      </>}
                      {groupBy === "customer" && <>
                        <td>
                          <span className="font-mono text-[10.5px] px-1.5 py-0.5 rounded"
                            style={{ background: "var(--ink-100)", color: "var(--ink-700)" }}>
                            {row.customerCode || "—"}
                          </span>
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full no-print"
                              style={{
                                background: isExpanded ? "#6b152320" : "var(--ink-100)",
                                color:      isExpanded ? "#6b1523"   : "var(--ink-400)",
                              }}>
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </span>
                            <span className="font-semibold">{row.customerName}</span>
                          </span>
                        </td>
                        <td className="numeric text-end font-bold" style={{ color: "#6b1523" }}>{row.count}</td>
                        {showCash && (
                          <td className="numeric text-end" style={{ color: (row.cash ?? 0) > 0 ? "#15803d" : "var(--ink-300)" }}>
                            {(row.cash ?? 0) > 0 ? fmt(row.cash) : "—"}
                          </td>
                        )}
                        {showCredit && (
                          <td className="numeric text-end" style={{ color: (row.credit ?? 0) > 0 ? "#2563eb" : "var(--ink-300)" }}>
                            {(row.credit ?? 0) > 0 ? fmt(row.credit) : "—"}
                          </td>
                        )}
                        <td className="numeric text-end font-bold">{fmt(row.total ?? 0)}</td>
                      </>}
                      {groupBy === "salesRep" && <>
                        <td className="px-2 no-print">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full"
                            style={{
                              background: isExpanded ? "#6b152320" : "var(--ink-100)",
                              color:      isExpanded ? "#6b1523"   : "var(--ink-400)",
                            }}>
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </span>
                        </td>
                        <td>
                          <span className="font-mono text-[10.5px] px-1.5 py-0.5 rounded"
                            style={{ background: "var(--ink-100)", color: "var(--ink-700)" }}>
                            {row.repCode ?? "—"}
                          </span>
                        </td>
                        <td className="font-semibold">{row.repName}</td>
                        <td className="numeric text-end font-bold" style={{ color: "#6b1523" }}>{row.count}</td>
                        {showCash && (
                          <td className="numeric text-end" style={{ color: (row.cash ?? 0) > 0 ? "#15803d" : "var(--ink-300)" }}>
                            {(row.cash ?? 0) > 0 ? fmt(row.cash) : "—"}
                          </td>
                        )}
                        {showCredit && (
                          <td className="numeric text-end" style={{ color: (row.credit ?? 0) > 0 ? "#2563eb" : "var(--ink-300)" }}>
                            {(row.credit ?? 0) > 0 ? fmt(row.credit) : "—"}
                          </td>
                        )}
                        <td className="numeric text-end font-bold">{fmt(row.total ?? 0)}</td>
                      </>}
                    </tr>

                    {isExpanded && canExpand && (
                      <InvoicesPanel
                        fromDate={groupBy === "day" ? row.date : fromDate}
                        toDate={groupBy === "day" ? row.date : toDate}
                        branchId={branchArg}
                        salesRepId={groupBy === "salesRep" ? (row.salesRepId ?? undefined) : undefined}
                        customerId={groupBy === "customer" ? (row.customerId === "walk_in" ? undefined : row.customerId) : undefined}
                        colSpan={colCount}
                        isRTL={isRTL}
                        fmt={fmt}
                        txType={txType}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="row-total" style={{ background: "#fdf2f4", borderTop: "2.5px solid #6b152330" }}>
                {groupBy === "day" && <>
                  <td className="font-black" style={{ color: "#6b1523" }}>
                    {isRTL ? `↓ الإجمالي (${report.data.length} يوم)` : `↓ Total (${report.data.length} days)`}
                  </td>
                  <td className="numeric text-end font-black" style={{ color: "#6b1523" }}>{report.invoiceCount}</td>
                  {showCash   && <td className="numeric text-end font-black" style={{ color: "#15803d" }}>{fmt(report.totalCash)}</td>}
                  {showCredit && <td className="numeric text-end font-black" style={{ color: "#2563eb" }}>{fmt(report.totalCredit)}</td>}
                  <td className="numeric text-end font-black" style={{ color: "#6b1523" }}>{fmt(report.totalSales)}</td>
                </>}
                {groupBy === "item" && <>
                  <td className="font-black" style={{ color: "#6b1523" }}>
                    {isRTL ? `↓ الإجمالي (${report.data.length} صنف)` : `↓ Total (${report.data.length} items)`}
                  </td>
                  <td className="numeric text-end font-black" style={{ color: "#6b1523" }}>
                    {report.data.reduce((s: number, r: any) => s + (r.qty ?? 0), 0).toFixed(2)}
                  </td>
                  <td className="numeric text-end font-black" style={{ color: "#6b1523" }}>{fmt(report.totalSales)}</td>
                </>}
                {groupBy === "customer" && <>
                  <td colSpan={2} className="font-black" style={{ color: "#6b1523" }}>
                    {isRTL ? `↓ الإجمالي (${report.data.length} عميل)` : `↓ Total (${report.data.length} customers)`}
                  </td>
                  <td className="numeric text-end font-black" style={{ color: "#6b1523" }}>{report.invoiceCount}</td>
                  {showCash   && <td className="numeric text-end font-black" style={{ color: "#15803d" }}>{fmt(report.totalCash)}</td>}
                  {showCredit && <td className="numeric text-end font-black" style={{ color: "#2563eb" }}>{fmt(report.totalCredit)}</td>}
                  <td className="numeric text-end font-black" style={{ color: "#6b1523" }}>{fmt(report.totalSales)}</td>
                </>}
                {groupBy === "salesRep" && <>
                  <td colSpan={3} className="font-black" style={{ color: "#6b1523" }}>
                    {isRTL ? `↓ الإجمالي (${report.data.length} مندوب)` : `↓ Total (${report.data.length} reps)`}
                  </td>
                  <td className="numeric text-end font-black" style={{ color: "#6b1523" }}>{report.invoiceCount}</td>
                  {showCash   && <td className="numeric text-end font-black" style={{ color: "#15803d" }}>{fmt(report.totalCash)}</td>}
                  {showCredit && <td className="numeric text-end font-black" style={{ color: "#2563eb" }}>{fmt(report.totalCredit)}</td>}
                  <td className="numeric text-end font-black" style={{ color: "#6b1523" }}>{fmt(report.totalSales)}</td>
                </>}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </PrintableReportPage>
  );
}
