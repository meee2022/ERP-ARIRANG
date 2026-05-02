// @ts-nocheck
"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/useAppStore";
import { usePermissions } from "@/hooks/usePermissions";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/data-display";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PrintableReportPage } from "@/components/ui/printable-report";
import {
  FileText, Banknote, CreditCard, Shuffle, LayoutList,
  ChevronDown, ChevronUp, FileSpreadsheet,
  User, Truck, Users, ExternalLink,
} from "lucide-react";
import Link from "next/link";

// ─── helpers ──────────────────────────────────────────────────────────────────
function todayISO() { return new Date().toISOString().split("T")[0]; }
function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ─── Transaction type pills config ────────────────────────────────────────────
const TX_TYPES = [
  { value: "all",         Icon: LayoutList, color: "#6b1523", bg: "#fdf2f4", labelAr: "الكل",   labelEn: "All"    },
  { value: "cash_sale",   Icon: Banknote,   color: "#16a34a", bg: "#f0fdf4", labelAr: "نقدي",   labelEn: "Cash"   },
  { value: "credit_sale", Icon: CreditCard, color: "#2563eb", bg: "#eff6ff", labelAr: "آجل",    labelEn: "Credit" },
  { value: "mixed_sale",  Icon: Shuffle,    color: "#d97706", bg: "#fffbeb", labelAr: "مختلط",  labelEn: "Mixed"  },
] as const;
type TxType = typeof TX_TYPES[number]["value"];

// ─── Group mode config ────────────────────────────────────────────────────────
const GROUP_MODES = [
  { value: "flat",       Icon: LayoutList, labelAr: "قائمة كاملة",   labelEn: "Full List"    },
  { value: "by_rep",     Icon: User,       labelAr: "بالمندوب",       labelEn: "By Sales Rep" },
  { value: "by_customer",Icon: Users,      labelAr: "بالعميل",        labelEn: "By Customer"  },
  { value: "by_vehicle", Icon: Truck,      labelAr: "بالمركبة",       labelEn: "By Vehicle"   },
] as const;
type GroupMode = typeof GROUP_MODES[number]["value"];

// ─── Invoice type badge ────────────────────────────────────────────────────────
function TypeBadge({ type, isRTL }: { type: string; isRTL: boolean }) {
  const cfg =
    type === "cash_sale"   ? { label: isRTL ? "نقدي"  : "Cash",    cls: "bg-green-50 text-green-700 border-green-200"  } :
    type === "credit_sale" ? { label: isRTL ? "آجل"   : "Credit",  cls: "bg-blue-50 text-blue-700 border-blue-200"    } :
    type === "mixed_sale"  ? { label: isRTL ? "مختلط" : "Mixed",   cls: "bg-amber-50 text-amber-700 border-amber-200" } :
                             { label: type,                          cls: "bg-gray-50 text-gray-600 border-gray-200"    };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, isRTL }: { status: string; isRTL: boolean }) {
  const cfg =
    status === "posted"   ? { label: isRTL ? "مرحّل"     : "Posted",   cls: "bg-green-50 text-green-700"  } :
    status === "reversed" ? { label: isRTL ? "معكوس"     : "Reversed", cls: "bg-red-50 text-red-600"      } :
                            { label: isRTL ? "غير مرحّل" : "Draft",    cls: "bg-amber-50 text-amber-700"  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── Table header ──────────────────────────────────────────────────────────────
function TH({ children, end = false }: { children: React.ReactNode; end?: boolean }) {
  return (
    <th className={`px-[13px] py-[10px] text-[10.5px] font-bold uppercase tracking-wider whitespace-nowrap ${end ? "text-end" : "text-start"}`}
      style={{ color: "rgba(255,255,255,0.85)" }}>
      {children}
    </th>
  );
}

// ─── Invoice row ───────────────────────────────────────────────────────────────
function InvoiceRow({ row, i, isRTL, fmt, showRep, showVehicle }: any) {
  return (
    <tr className="hover:bg-[#fdf2f4]/60 transition-colors"
      style={{ background: i % 2 === 0 ? "white" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
      <td className="px-[13px] py-[8px] whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded"
            style={{ background: "var(--ink-100)", color: "var(--ink-700)" }}>
            {row.invoiceNumber}
          </span>
          <Link href={`/sales/invoices/${row._id}`}
            className="opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity"
            style={{ color: "#6b1523" }}>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        {row.externalInvoiceNumber && (
          <div className="text-[10px] mt-0.5" style={{ color: "var(--ink-400)" }}>{row.externalInvoiceNumber}</div>
        )}
      </td>
      <td className="px-[13px] py-[8px] text-[12px] tabular-nums whitespace-nowrap" style={{ color: "var(--ink-500)" }}>
        {row.invoiceDate}
      </td>
      <td className="px-[13px] py-[8px] text-[12px] whitespace-nowrap" style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", color: "#1e293b" }}>
        {isRTL ? row.customerNameAr : (row.customerNameEn || row.customerNameAr)}
      </td>
      {showRep && (
        <td className="px-[13px] py-[8px] text-[12px] whitespace-nowrap" style={{ color: "var(--ink-600)" }}>
          {isRTL ? (row.salesRepNameAr || "—") : (row.salesRepNameEn || row.salesRepNameAr || "—")}
        </td>
      )}
      {showVehicle && (
        <td className="px-[13px] py-[8px] text-[12px] whitespace-nowrap" style={{ color: "var(--ink-600)" }}>
          {row.vehicleCode || "—"}
        </td>
      )}
      <td className="px-[13px] py-[8px] whitespace-nowrap">
        <TypeBadge type={row.invoiceType} isRTL={isRTL} />
      </td>
      <td className="px-[13px] py-[8px] tabular-nums text-[12px] text-end whitespace-nowrap" style={{ color: "var(--ink-600)" }}>
        {fmt(row.subtotal)}
      </td>
      <td className="px-[13px] py-[8px] tabular-nums text-[12px] text-end whitespace-nowrap text-red-500">
        {row.discountAmount > 0 ? fmt(row.discountAmount) : "—"}
      </td>
      <td className="px-[13px] py-[8px] tabular-nums text-[12px] text-end whitespace-nowrap text-green-700">
        {row.cashReceived > 0 ? fmt(row.cashReceived) : "—"}
      </td>
      <td className="px-[13px] py-[8px] tabular-nums text-[12px] text-end whitespace-nowrap text-blue-700">
        {row.creditAmount > 0 ? fmt(row.creditAmount) : "—"}
      </td>
      <td className="px-[13px] py-[8px] tabular-nums text-[12.5px] font-bold text-end whitespace-nowrap" style={{ color: "#1e293b" }}>
        {fmt(row.totalAmount)}
      </td>
      <td className="px-[13px] py-[8px] whitespace-nowrap">
        <StatusBadge status={row.postingStatus} isRTL={isRTL} />
      </td>
    </tr>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function SalesDetailsPage() {
  const { t, isRTL, formatCurrency: fmt } = useI18n();
  const { canView } = usePermissions();
  const { company: printCompany } = useCompanySettings();
  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const [fromDate,      setFromDate]      = useState(startOfMonthISO());
  const [toDate,        setToDate]        = useState(todayISO());
  const [postingStatus, setPostingStatus] = useState("posted");
  const [txType,        setTxType]        = useState<TxType>("all");
  const [groupMode,     setGroupMode]     = useState<GroupMode>("flat");
  const [expanded,      setExpanded]      = useState<Set<string>>(new Set());

  const report = useQuery(api.reports.getSalesDetailsReport, {
    fromDate, toDate,
    branchId:    branchArg as any,
    invoiceType: txType !== "all" ? (txType as any) : undefined,
    postingStatus: postingStatus || undefined,
  });

  const rows   = report?.rows   ?? [];
  const totals = report?.totals;

  // ─── Client-side grouping ─────────────────────────────────────────────────
  const groups = useMemo(() => {
    if (groupMode === "flat") return null;
    const map = new Map<string, {
      key: string; label: string; rows: any[];
      totalSales: number; totalDiscount: number; totalVAT: number;
      cashTotal: number; creditTotal: number; count: number;
    }>();

    for (const row of rows) {
      let key: string, label: string;
      if (groupMode === "by_rep") {
        key   = row.salesRepNameAr || "__none__";
        label = isRTL ? (row.salesRepNameAr || "غير محدد") : (row.salesRepNameEn || row.salesRepNameAr || "Unassigned");
      } else if (groupMode === "by_customer") {
        key   = row.customerNameAr || "__none__";
        label = isRTL ? row.customerNameAr : (row.customerNameEn || row.customerNameAr);
      } else {
        key   = row.vehicleCode || "__none__";
        label = row.vehicleCode || (isRTL ? "بدون مركبة" : "No Vehicle");
      }

      if (!map.has(key)) {
        map.set(key, { key, label, rows: [], totalSales: 0, totalDiscount: 0, totalVAT: 0, cashTotal: 0, creditTotal: 0, count: 0 });
      }
      const g = map.get(key)!;
      g.rows.push(row);
      g.totalSales    += row.totalAmount    ?? 0;
      g.totalDiscount += row.discountAmount ?? 0;
      g.totalVAT      += row.vatAmount      ?? 0;
      g.cashTotal     += row.cashReceived   ?? 0;
      g.creditTotal   += row.creditAmount   ?? 0;
      g.count         += 1;
    }

    return Array.from(map.values()).sort((a, b) => b.totalSales - a.totalSales);
  }, [rows, groupMode, isRTL]);

  const toggleGroup = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // ─── Excel export ──────────────────────────────────────────────────────────
  const exportExcel = async () => {
    if (!rows.length) return;
    const XLSX = await import("xlsx");
    const data = rows.map((r: any) => ({
      [isRTL ? "رقم الفاتورة" : "Invoice No."]:        r.invoiceNumber,
      [isRTL ? "الرقم الخارجي" : "Ext Invoice No."]:   r.externalInvoiceNumber ?? "",
      [isRTL ? "التاريخ" : "Date"]:                    r.invoiceDate,
      [isRTL ? "العميل" : "Customer"]:                  isRTL ? r.customerNameAr : (r.customerNameEn || r.customerNameAr),
      [isRTL ? "المندوب" : "Sales Rep"]:                isRTL ? (r.salesRepNameAr || "—") : (r.salesRepNameEn || r.salesRepNameAr || "—"),
      [isRTL ? "المركبة" : "Vehicle"]:                  r.vehicleCode ?? "—",
      [isRTL ? "النوع" : "Type"]:                       r.invoiceType,
      [isRTL ? "المبلغ قبل الخصم" : "Subtotal"]:       r.subtotal,
      [isRTL ? "الخصم" : "Discount"]:                   r.discountAmount,
      [isRTL ? "نقدي" : "Cash"]:                        r.cashReceived,
      [isRTL ? "آجل" : "Credit"]:                       r.creditAmount,
      [isRTL ? "الإجمالي" : "Total"]:                   r.totalAmount,
      [isRTL ? "الحالة" : "Status"]:                    r.postingStatus,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isRTL ? "تفاصيل المبيعات" : "Sales Details");
    XLSX.writeFile(wb, `sales-details-${fromDate}-${toDate}.xlsx`);
  };

  // ─── Shared table head ─────────────────────────────────────────────────────
  const showRep     = groupMode !== "by_rep";
  const showVehicle = groupMode !== "by_vehicle";

  const TableHead = () => (
    <tr style={{ background: "#6b1523" }}>
      <TH>{isRTL ? "رقم الفاتورة" : "Invoice"}</TH>
      <TH>{isRTL ? "التاريخ" : "Date"}</TH>
      <TH>{isRTL ? "العميل" : "Customer"}</TH>
      {showRep     && <TH>{isRTL ? "المندوب" : "Sales Rep"}</TH>}
      {showVehicle && <TH>{isRTL ? "المركبة" : "Vehicle"}</TH>}
      <TH>{isRTL ? "النوع" : "Type"}</TH>
      <TH end>{isRTL ? "قبل الخصم" : "Subtotal"}</TH>
      <TH end>{isRTL ? "الخصم" : "Discount"}</TH>
      <TH end>{isRTL ? "نقدي" : "Cash"}</TH>
      <TH end>{isRTL ? "آجل" : "Credit"}</TH>
      <TH end>{isRTL ? "الإجمالي" : "Total"}</TH>
      <TH>{isRTL ? "الحالة" : "Status"}</TH>
    </tr>
  );

  // ─── Totals footer row ─────────────────────────────────────────────────────
  const TotalsRow = ({ data }: { data: any }) => (
    <tr style={{ background: "#fdf2f4", borderTop: "2px solid #6b1523" }}>
      <td colSpan={showRep && showVehicle ? 6 : showRep || showVehicle ? 5 : 4}
        className="px-[13px] py-[9px] text-[11.5px] font-bold" style={{ color: "#6b1523" }}>
        {isRTL ? `الإجمالي (${data.count ?? rows.length} فاتورة)` : `Total (${data.count ?? rows.length} invoices)`}
      </td>
      <td className="px-[13px] py-[9px] tabular-nums text-[12px] font-bold text-end" style={{ color: "var(--ink-700)" }}>
        {fmt(data.subtotal ?? totals?.subtotal ?? 0)}
      </td>
      <td className="px-[13px] py-[9px] tabular-nums text-[12px] font-bold text-end text-red-500">
        {fmt(data.totalDiscount ?? totals?.discountAmount ?? 0)}
      </td>
      <td className="px-[13px] py-[9px] tabular-nums text-[12px] font-bold text-end text-green-700">
        {fmt(data.cashTotal ?? totals?.cashReceived ?? 0)}
      </td>
      <td className="px-[13px] py-[9px] tabular-nums text-[12px] font-bold text-end text-blue-700">
        {fmt(data.creditTotal ?? totals?.creditAmount ?? 0)}
      </td>
      <td className="px-[13px] py-[9px] tabular-nums text-[13px] font-black text-end" style={{ color: "#6b1523" }}>
        {fmt(data.totalSales ?? totals?.totalAmount ?? 0)}
      </td>
      <td />
    </tr>
  );

  if (!canView("reports")) {
    return <EmptyState icon={FileText} title={t("permissionDenied")} />;
  }

  return (
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={t("salesDetailsTitle")}
      period={`${fromDate} — ${toDate}`}
      actions={
        <button onClick={exportExcel} disabled={!rows.length}
          className="h-9 px-3 rounded-lg inline-flex items-center gap-2 text-sm font-semibold border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-40">
          <FileSpreadsheet className="h-4 w-4" />
          {isRTL ? "تنزيل Excel" : "Export Excel"}
        </button>
      }
      filters={
        <div className="space-y-3">
          {/* ── Transaction type pills ── */}
          <div className="flex flex-wrap gap-2">
            {TX_TYPES.map(({ value, Icon, color, bg, labelAr, labelEn }) => {
              const active = txType === value;
              return (
                <button key={value} onClick={() => setTxType(value)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all border"
                  style={{ background: active ? color : bg, color: active ? "white" : color, borderColor: active ? color : color + "30", boxShadow: active ? `0 2px 8px ${color}40` : "none" }}>
                  <Icon className="h-3.5 w-3.5" />
                  {isRTL ? labelAr : labelEn}
                </button>
              );
            })}
            <div className="w-px mx-1 bg-[color:var(--ink-200)]" />
            {/* Group mode pills */}
            {GROUP_MODES.map(({ value, Icon, labelAr, labelEn }) => {
              const active = groupMode === value;
              return (
                <button key={value} onClick={() => { setGroupMode(value); setExpanded(new Set()); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all border"
                  style={{ background: active ? "#334155" : "#f8fafc", color: active ? "white" : "#64748b", borderColor: active ? "#334155" : "#e2e8f0", boxShadow: active ? "0 2px 8px #33415540" : "none" }}>
                  <Icon className="h-3.5 w-3.5" />
                  {isRTL ? labelAr : labelEn}
                </button>
              );
            })}
          </div>

          {/* ── Date + Status filters ── */}
          <FilterPanel>
            <FilterField label={t("fromDate")}>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input-field h-8 w-auto text-sm" />
            </FilterField>
            <FilterField label={t("toDate")}>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input-field h-8 w-auto text-sm" />
            </FilterField>
            <FilterField label={t("postingStatus")}>
              <select value={postingStatus} onChange={(e) => setPostingStatus(e.target.value)} className="input-field h-8 w-auto text-sm">
                <option value="">{t("all")}</option>
                <option value="unposted">{t("statusDraft")}</option>
                <option value="posted">{t("statusPosted")}</option>
                <option value="reversed">{t("statusReversed")}</option>
              </select>
            </FilterField>
            {totals && (
              <div className="ms-auto text-[11.5px] font-semibold flex items-center gap-3" style={{ color: "var(--ink-500)" }}>
                <span>{rows.length} {isRTL ? "فاتورة" : "invoices"}</span>
                <span className="font-bold" style={{ color: "#6b1523" }}>{fmt(totals.totalAmount)}</span>
              </div>
            )}
          </FilterPanel>
        </div>
      }
      summary={
        totals && rows.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: isRTL ? "عدد الفواتير" : "Invoices",     value: String(totals.invoiceCount),           color: "#6b1523", bold: true },
              { label: isRTL ? "قبل الخصم"   : "Subtotal",      value: fmt(totals.subtotal),                  color: "#0f172a"            },
              { label: isRTL ? "إجمالي الخصم" : "Discount",     value: fmt(totals.discountAmount),            color: "#dc2626"            },
              { label: isRTL ? "نقدي"         : "Cash",         value: fmt(totals.cashReceived),              color: "#16a34a", bold: true },
              { label: isRTL ? "آجل"           : "Credit",      value: fmt(totals.creditAmount),              color: "#2563eb", bold: true },
              { label: isRTL ? "الإجمالي الصافي" : "Net Total", value: fmt(totals.totalAmount),              color: "#6b1523", bold: true },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border p-3" style={{ background: "white", borderColor: "var(--ink-100)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--ink-400)" }}>{item.label}</p>
                <p className={`tabular-nums text-[13px] ${item.bold ? "font-black" : "font-semibold"}`} style={{ color: item.color }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        ) : undefined
      }
    >
      {report === undefined ? (
        <LoadingState label={t("loading")} />
      ) : rows.length === 0 ? (
        <EmptyState icon={FileText} title={t("noResults")} />
      ) : groupMode === "flat" ? (
        // ─── Flat list ────────────────────────────────────────────────────────
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead><TableHead /></thead>
            <tbody className="group">
              {rows.map((row: any, i: number) => (
                <InvoiceRow key={row._id} row={row} i={i} isRTL={isRTL} fmt={fmt} showRep={showRep} showVehicle={showVehicle} />
              ))}
            </tbody>
            <tfoot>
              <TotalsRow data={{
                count: rows.length,
                totalSales: totals?.totalAmount, subtotal: totals?.subtotal,
                totalDiscount: totals?.discountAmount, totalVAT: totals?.vatAmount,
                cashTotal: totals?.cashReceived, creditTotal: totals?.creditAmount,
              }} />
            </tfoot>
          </table>
        </div>
      ) : (
        // ─── Grouped view ─────────────────────────────────────────────────────
        <div className="space-y-4">
          {groups!.map((group) => {
            const isOpen = expanded.has(group.key);
            return (
              <div key={group.key} className="rounded-2xl border overflow-hidden"
                style={{ background: "white", borderColor: "var(--ink-200)" }}>

                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-start transition-colors hover:bg-[#fdf2f4]/50 no-print"
                  style={{ background: "var(--ink-50)", borderBottom: isOpen ? "1px solid var(--ink-100)" : "none" }}>
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors ${isOpen ? "text-white" : "bg-gray-100 text-gray-500"}`}
                    style={isOpen ? { background: "#6b1523" } : {}}>
                    {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </span>
                  <div className="flex-1">
                    <span className="text-[13px] font-black" style={{ color: "#1e293b" }}>{group.label}</span>
                    <span className="ms-2 text-[11px] font-semibold" style={{ color: "var(--ink-500)" }}>
                      {group.count} {isRTL ? "فاتورة" : "invoices"}
                    </span>
                  </div>
                  {/* Mini summary */}
                  <div className="flex items-center gap-5 no-print">
                    <div className="text-center">
                      <p className="text-[10px] text-green-600 font-semibold">{isRTL ? "نقدي" : "Cash"}</p>
                      <p className="text-[12px] font-bold text-green-700 tabular-nums">{fmt(group.cashTotal)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-blue-600 font-semibold">{isRTL ? "آجل" : "Credit"}</p>
                      <p className="text-[12px] font-bold text-blue-700 tabular-nums">{fmt(group.creditTotal)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-semibold" style={{ color: "var(--ink-500)" }}>{isRTL ? "الإجمالي" : "Total"}</p>
                      <p className="text-[14px] font-black tabular-nums" style={{ color: "#6b1523" }}>{fmt(group.totalSales)}</p>
                    </div>
                  </div>
                </button>

                {/* Print header always visible */}
                <div className="hidden print:flex items-center justify-between px-5 py-2"
                  style={{ borderBottom: "1px solid var(--ink-200)" }}>
                  <span className="font-bold text-[13px]">{group.label}</span>
                  <span className="font-bold text-[13px]" style={{ color: "#6b1523" }}>{fmt(group.totalSales)}</span>
                </div>

                {/* Invoices table */}
                {(isOpen) && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead><TableHead /></thead>
                      <tbody className="group">
                        {group.rows.map((row: any, i: number) => (
                          <InvoiceRow key={row._id} row={row} i={i} isRTL={isRTL} fmt={fmt} showRep={showRep} showVehicle={showVehicle} />
                        ))}
                      </tbody>
                      <tfoot><TotalsRow data={group} /></tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {/* Grand total */}
          <div className="rounded-2xl border-2 p-4 flex items-center justify-between"
            style={{ borderColor: "#6b1523", background: "#fdf2f4" }}>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[10px] font-semibold uppercase" style={{ color: "var(--ink-500)" }}>{isRTL ? "عدد الفواتير" : "Total Invoices"}</p>
                <p className="text-[16px] font-black" style={{ color: "#6b1523" }}>{rows.length}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-green-600">{isRTL ? "نقدي" : "Cash"}</p>
                <p className="text-[16px] font-black text-green-700 tabular-nums">{fmt(totals?.cashReceived ?? 0)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-blue-600">{isRTL ? "آجل" : "Credit"}</p>
                <p className="text-[16px] font-black text-blue-700 tabular-nums">{fmt(totals?.creditAmount ?? 0)}</p>
              </div>
            </div>
            <div className="text-end">
              <p className="text-[10px] font-semibold uppercase" style={{ color: "var(--ink-500)" }}>{isRTL ? "الإجمالي العام" : "Grand Total"}</p>
              <p className="text-[22px] font-black tabular-nums" style={{ color: "#6b1523" }}>{fmt(totals?.totalAmount ?? 0)}</p>
            </div>
          </div>
        </div>
      )}
    </PrintableReportPage>
  );
}
