// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { TrendingUp, Calendar, FileText, FileSpreadsheet, ChevronDown, ChevronUp, ExternalLink, Banknote, CreditCard, Shuffle, LayoutList } from "lucide-react";

const TX_TYPES = [
  { value: "all",         Icon: LayoutList, color: "#6b1523", bg: "#fdf2f4", labelAr: "الكل",   labelEn: "All"    },
  { value: "cash_sale",   Icon: Banknote,   color: "#16a34a", bg: "#f0fdf4", labelAr: "نقدي",   labelEn: "Cash"   },
  { value: "credit_sale", Icon: CreditCard, color: "#2563eb", bg: "#eff6ff", labelAr: "آجل",    labelEn: "Credit" },
  { value: "mixed_sale",  Icon: Shuffle,    color: "#d97706", bg: "#fffbeb", labelAr: "مختلط",  labelEn: "Mixed"  },
] as const;
type TxType = typeof TX_TYPES[number]["value"];
import { useAppStore } from "@/store/useAppStore";
import { LoadingState, KPICard } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PrintableReportPage } from "@/components/ui/printable-report";
import Link from "next/link";

function todayISO() { return new Date().toISOString().split("T")[0]; }
function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ─── Invoice drill-down panel ──────────────────────────────────────────────────
function InvoicesPanel({ fromDate, toDate, branchId, salesRepId, customerId, colSpan, isRTL, formatCurrency }: any) {
  const result = useQuery(api.reports.getSalesDetailsReport, {
    fromDate, toDate,
    branchId: branchId ?? undefined,
    salesRepId: salesRepId ?? undefined,
    customerId: customerId ?? undefined,
  });

  if (!result) return (
    <tr><td colSpan={colSpan} className="px-6 py-3 text-xs text-center text-gray-400 animate-pulse bg-indigo-50/40">
      {isRTL ? "جاري تحميل الفواتير..." : "Loading invoices..."}
    </td></tr>
  );

  const invoices = result.rows ?? [];
  if (invoices.length === 0) return (
    <tr><td colSpan={colSpan} className="px-6 py-3 text-xs text-center text-gray-400 bg-indigo-50/40">
      {isRTL ? "لا توجد فواتير" : "No invoices found"}
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
    <tr>
      <td colSpan={colSpan} className="p-0">
        <div className="bg-indigo-50/40 border-t border-indigo-100 px-6 py-3">
          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2">
            {isRTL ? `الفواتير (${invoices.length})` : `Invoices (${invoices.length})`}
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
                  <tr key={inv._id} className="hover:bg-indigo-50/30">
                    <td className="px-3 py-2 text-gray-500">{inv.invoiceDate}</td>
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
                  <td colSpan={5} className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase">
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
  );
}

export default function SalesReportPage() {
  const { t, isRTL, formatCurrency } = useI18n();
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
  const colCount = groupBy === "salesRep" ? 7 : 3;

  return (
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={t("salesReportTitle")}
      period={`${fromDate} — ${toDate}`}
      actions={
        <button
          onClick={async () => {
            if (!report?.data?.length) return;
            const XLSX = await import("xlsx");
            const rows = report.data.map((row: any) => {
              if (groupBy === "day") return { [isRTL ? "التاريخ" : "Date"]: row.date, [isRTL ? "عدد الفواتير" : "Invoices"]: row.count, [isRTL ? "الإجمالي" : "Total"]: row.total ?? 0 };
              if (groupBy === "item") return { [isRTL ? "الصنف" : "Item"]: row.itemName, [isRTL ? "الكمية" : "Qty"]: row.qty, [isRTL ? "الإجمالي" : "Total"]: row.total ?? 0 };
              if (groupBy === "salesRep") return { [isRTL ? "الكود" : "Code"]: row.repCode, [isRTL ? "المندوب" : "Rep"]: row.repName, [isRTL ? "عدد الفواتير" : "Invoices"]: row.count, [isRTL ? "الإجمالي" : "Total"]: row.total ?? 0 };
              return { [isRTL ? "العميل" : "Customer"]: row.customerName, [isRTL ? "عدد الفواتير" : "Invoices"]: row.count, [isRTL ? "الإجمالي" : "Total"]: row.total ?? 0 };
            });
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, isRTL ? "تقرير المبيعات" : "Sales Report");
            XLSX.writeFile(wb, `sales-report-${fromDate}-${toDate}.xlsx`);
          }}
          className="h-9 px-3 rounded-lg inline-flex items-center gap-2 text-sm font-semibold border border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
          disabled={!report?.data?.length}
        >
          <FileSpreadsheet className="h-4 w-4" />
          {isRTL ? "Excel تنزيل" : "Download Excel"}
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
          <div className="grid grid-cols-2 gap-4">
            <KPICard label={t("totalSales")} value={formatCurrency((report.totalSales ?? 0))} icon={TrendingUp} iconColor="#16a34a" accent="#16a34a" />
            <KPICard label={t("invoiceCount")} value={String(report.invoiceCount)} icon={FileText} iconColor="#0ea5e9" accent="#0ea5e9" />
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
                  <th className="text-end">{t("totalSales")}</th>
                </>}
                {groupBy === "item" && <>
                  <th>{t("item")}</th>
                  <th className="text-end">{t("quantity")}</th>
                  <th className="text-end">{t("totalSales")}</th>
                </>}
                {groupBy === "customer" && <>
                  <th>{t("customers")}</th>
                  <th className="text-end">{t("invoiceCount")}</th>
                  <th className="text-end">{t("totalSales")}</th>
                </>}
                {groupBy === "salesRep" && <>
                  <th className="w-8 no-print"></th>
                  <th>{isRTL ? "كود المندوب" : "Code"}</th>
                  <th>{isRTL ? "اسم المندوب" : "Sales Rep"}</th>
                  <th className="text-end">{t("invoiceCount")}</th>
                  <th className="text-end">{isRTL ? "الخصم" : "Discount"}</th>
                  <th className="text-end">{isRTL ? "ضريبة" : "VAT"}</th>
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
                      className={`transition-colors ${canExpand ? "cursor-pointer" : ""} ${isExpanded ? "bg-indigo-50/60" : canExpand ? "hover:bg-gray-50" : ""}`}
                      onClick={() => canExpand && setExpandedKey(isExpanded ? null : rowKey)}
                    >
                      {groupBy === "day" && <>
                        <td className="muted tabular-nums">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full no-print ${isExpanded ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"}`}>
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </span>
                            {row.date}
                          </span>
                        </td>
                        <td className="numeric text-end font-semibold text-indigo-700">{row.count}</td>
                        <td className="numeric text-end font-semibold">{formatCurrency(row.total ?? 0)}</td>
                      </>}
                      {groupBy === "item" && <>
                        <td>{row.itemName}</td>
                        <td className="numeric text-end">{row.qty?.toFixed(2)}</td>
                        <td className="numeric text-end font-semibold">{formatCurrency(row.total ?? 0)}</td>
                      </>}
                      {groupBy === "customer" && <>
                        <td>
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full no-print ${isExpanded ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"}`}>
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </span>
                            {row.customerName}
                          </span>
                        </td>
                        <td className="numeric text-end font-semibold text-indigo-700">{row.count}</td>
                        <td className="numeric text-end font-semibold">{formatCurrency(row.total ?? 0)}</td>
                      </>}
                      {groupBy === "salesRep" && <>
                        <td className="px-2 no-print">
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${isExpanded ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"}`}>
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </span>
                        </td>
                        <td className="code text-xs">{row.repCode ?? "—"}</td>
                        <td className="font-medium">{row.repName}</td>
                        <td className="numeric text-end font-semibold text-indigo-700">{row.count}</td>
                        <td className="numeric text-end text-amber-600">{formatCurrency(row.discount ?? 0)}</td>
                        <td className="numeric text-end text-blue-600">{formatCurrency(row.vat ?? 0)}</td>
                        <td className="numeric text-end font-bold text-green-700">{formatCurrency(row.total ?? 0)}</td>
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
    </PrintableReportPage>
  );
}
