// @ts-nocheck
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PrintableReportPage } from "@/components/ui/printable-report";
import { LoadingState } from "@/components/ui/data-display";
import { Truck, Package, CreditCard, Banknote, MapPin, ChevronDown, ChevronUp } from "lucide-react";

const ACCENT = "#0ea5e9";

function todayISO() { return new Date().toISOString().slice(0, 10); }

function moneyFmt(n: number) {
  return new Intl.NumberFormat("ar-QA", { style: "currency", currency: "QAR" }).format(n);
}

// ─── Vehicle Block ─────────────────────────────────────────────────────────────
function VehicleBlock({ v: veh, isRTL, idx }: { v: any; isRTL: boolean; idx: number }) {
  const [open, setOpen] = useState(true);

  const typeColor = (type: string) =>
    type === "cash_sale" ? "#10b981" : type === "credit_sale" ? "#f59e0b" : "#6366f1";

  return (
    <div className="rounded-2xl border overflow-hidden print:rounded-none print:border-0 print:border-b-2 print:border-gray-800 print:mb-4"
      style={{ background: "white", borderColor: "var(--ink-200)" }}>
      {/* Vehicle header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 print:cursor-default"
        style={{ background: "var(--ink-50)", borderBottom: "1px solid var(--ink-200)" }}
      >
        <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}30` }}>
          <Truck className="h-5 w-5" style={{ color: ACCENT }} />
        </div>
        <div className="flex-1 text-start">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-black" style={{ color: "var(--ink-900)" }}>
              {veh.vehicleCode}
            </span>
            <span className="text-[12px] font-semibold" style={{ color: "var(--ink-600)" }}>
              — {isRTL ? veh.vehicleDescAr : veh.vehicleDescEn}
            </span>
            {veh.driverName && (
              <span className="text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: "#10b98115", color: "#059669" }}>
                {veh.driverName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-[11px]" style={{ color: "var(--ink-500)" }}>
              {veh.invoiceCount} {isRTL ? "فاتورة" : "invoices"}
            </span>
            <span className="text-[12px] font-bold tabular-nums" style={{ color: ACCENT }}>
              {moneyFmt(veh.totalAmount)}
            </span>
          </div>
        </div>
        <div className="print:hidden">
          {open ? <ChevronUp className="h-4 w-4" style={{ color: "var(--ink-400)" }} />
                : <ChevronDown className="h-4 w-4" style={{ color: "var(--ink-400)" }} />}
        </div>
      </button>

      {/* Invoices table */}
      {(open) && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: "#6b1523" }}>
                {["#", isRTL ? "رقم الفاتورة" : "Invoice", isRTL ? "العميل" : "Customer",
                  isRTL ? "النوع" : "Type", isRTL ? "المبلغ" : "Amount",
                  isRTL ? "تحصيل نقدي" : "Cash", isRTL ? "آجل" : "Credit",
                  isRTL ? "الحالة" : "Status", isRTL ? "توقيع الاستلام" : "Signature"].map((h, i) => (
                  <th key={i} className="px-[14px] py-[10px] text-[11px] font-bold uppercase tracking-wider text-start whitespace-nowrap"
                    style={{ color: "rgba(255,255,255,0.85)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {veh.invoices.map((inv: any, i: number) => (
                <tr key={inv._id}
                  className="hover:bg-[#fdf2f4] transition-colors"
                  style={{
                    background: i % 2 === 0 ? "white" : "#fafafa",
                    borderBottom: "1px solid #f1f5f9",
                  }}>
                  <td className="px-[14px] py-[8px] text-[12.5px] whitespace-nowrap" style={{ color: "var(--ink-500)" }}>{i + 1}</td>
                  <td className="px-[14px] py-[8px] whitespace-nowrap">
                    <span className="font-mono text-[12px] font-bold px-2 py-0.5 rounded"
                      style={{ background: "var(--ink-100)", color: "var(--ink-700)" }}>
                      {inv.invoiceNumber}
                    </span>
                    {inv.externalInvoiceNumber && (
                      <div className="text-[10px] mt-0.5" style={{ color: "var(--ink-400)" }}>
                        {inv.externalInvoiceNumber}
                      </div>
                    )}
                  </td>
                  <td className="px-[14px] py-[8px]" style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <span className="text-[12.5px] font-semibold whitespace-nowrap" style={{ color: "#1e293b" }}>
                      {inv.customerName}
                    </span>
                  </td>
                  <td className="px-[14px] py-[8px] whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: `${typeColor(inv.invoiceType)}15`,
                        color: typeColor(inv.invoiceType),
                      }}>
                      {inv.invoiceType === "cash_sale"
                        ? (isRTL ? "نقدي" : "Cash")
                        : inv.invoiceType === "credit_sale"
                        ? (isRTL ? "آجل" : "Credit")
                        : (isRTL ? "مختلط" : "Mixed")}
                    </span>
                  </td>
                  <td className="px-[14px] py-[8px] tabular-nums text-[12.5px] font-bold text-end whitespace-nowrap" style={{ color: "#1e293b" }}>
                    {moneyFmt(inv.totalAmount)}
                  </td>
                  <td className="px-[14px] py-[8px] tabular-nums text-[12.5px] text-end whitespace-nowrap" style={{ color: "#059669" }}>
                    {inv.cashReceived > 0 ? moneyFmt(inv.cashReceived) : "—"}
                  </td>
                  <td className="px-[14px] py-[8px] tabular-nums text-[12.5px] text-end whitespace-nowrap" style={{ color: "#d97706" }}>
                    {inv.creditAmount > 0 ? moneyFmt(inv.creditAmount) : "—"}
                  </td>
                  <td className="px-[14px] py-[8px] whitespace-nowrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      inv.postingStatus === "posted"
                        ? "bg-green-50 text-green-700"
                        : "bg-amber-50 text-amber-700"
                    }`}>
                      {inv.postingStatus === "posted"
                        ? (isRTL ? "مرحل" : "Posted")
                        : (isRTL ? "غير مرحل" : "Unposted")}
                    </span>
                  </td>
                  {/* Signature box for print */}
                  <td className="px-[14px] py-[8px]">
                    <div className="h-8 w-24 rounded border" style={{ borderColor: "var(--ink-300)" }} />
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Vehicle subtotal */}
            <tfoot>
              <tr style={{ background: `${ACCENT}08`, borderTop: `2px solid ${ACCENT}30` }}>
                <td colSpan={4} className="px-4 py-2.5 text-[11px] font-bold" style={{ color: "var(--ink-700)" }}>
                  {isRTL ? `إجمالي ${veh.vehicleCode}` : `${veh.vehicleCode} Total`}
                </td>
                <td className="px-4 py-2.5 tabular-nums text-[13px] font-black" style={{ color: ACCENT }}>
                  {moneyFmt(veh.totalAmount)}
                </td>
                <td className="px-4 py-2.5 tabular-nums text-[12px] font-bold" style={{ color: "#059669" }}>
                  {moneyFmt(veh.cashAmount)}
                </td>
                <td className="px-4 py-2.5 tabular-nums text-[12px] font-bold" style={{ color: "#d97706" }}>
                  {moneyFmt(veh.creditAmount)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── KPI Chip ──────────────────────────────────────────────────────────────────
function Chip({ icon: Icon, label, value, color }: any) {
  return (
    <div className="rounded-2xl border p-4 flex items-center gap-3"
      style={{ background: "white", borderColor: "var(--ink-200)" }}>
      <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}12` }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div>
        <p className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--ink-400)" }}>{label}</p>
        <p className="text-[18px] font-bold tabular-nums" style={{ color: "var(--ink-900)" }}>{value}</p>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function RouteSheetPage() {
  const { isRTL } = useI18n();
  const { company: printCompany } = useCompanySettings();
  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const [date, setDate] = useState(todayISO());

  const data = useQuery(
    api.reports.getRouteSheet,
    companyId ? { companyId, date } : "skip"
  );

  return (
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={isRTL ? "ورقة مسار التوزيع" : "Route Sheet"}
      period={date}
      filters={
        <div className="flex flex-wrap items-center gap-3 p-1">
          <div className="flex items-center gap-2">
            <label className="text-[12px] font-semibold" style={{ color: "var(--ink-500)" }}>
              {isRTL ? "التاريخ" : "Date"}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 px-3 rounded-xl border text-[13px] font-medium outline-none"
              style={{ borderColor: "var(--ink-200)", color: "var(--ink-700)", background: "white" }}
            />
          </div>
          {data && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full mt-2">
              <Chip icon={Truck}      color={ACCENT}    label={isRTL ? "مركبات" : "Vehicles"} value={data.totals.vehicleCount} />
              <Chip icon={Package}    color="#6366f1"   label={isRTL ? "فواتير" : "Invoices"} value={data.totals.invoiceCount} />
              <Chip icon={Banknote}   color="#10b981"   label={isRTL ? "نقدي" : "Cash"}       value={moneyFmt(data.totals.cashAmount)} />
              <Chip icon={CreditCard} color="#f59e0b"   label={isRTL ? "آجل" : "Credit"}      value={moneyFmt(data.totals.creditAmount)} />
            </div>
          )}
        </div>
      }
    >
      {!companyId || !data ? (
        <LoadingState />
      ) : data.vehicles.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed py-16 text-center"
          style={{ borderColor: "var(--ink-200)" }}>
          <Truck className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: ACCENT }} />
          <p className="text-[14px] font-semibold" style={{ color: "var(--ink-600)" }}>
            {isRTL ? "لا توجد فواتير لهذا اليوم" : "No invoices for this date"}
          </p>
          <p className="text-[12px] mt-1" style={{ color: "var(--ink-400)" }}>
            {isRTL ? "حدد تاريخاً آخر أو أضف فواتير مبيعات" : "Select another date or add sales invoices"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Vehicle blocks */}
          {data.vehicles.map((v: any, i: number) => (
            <VehicleBlock key={v.vehicleId ?? v.vehicleCode} v={v} isRTL={isRTL} idx={i} />
          ))}

          {/* Grand total */}
          <div className="rounded-2xl border-2 p-5 print:rounded-none print:border-t-2 print:border-b-0 print:border-x-0"
            style={{ borderColor: ACCENT, background: `${ACCENT}08` }}>
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-black" style={{ color: "var(--ink-800)" }}>
                {isRTL ? "الإجمالي العام" : "Grand Total"} — {date}
              </span>
              <span className="text-[22px] font-black tabular-nums" style={{ color: ACCENT }}>
                {moneyFmt(data.totals.totalAmount)}
              </span>
            </div>
            <div className="flex items-center gap-6 mt-2">
              <span className="text-[12px] font-semibold" style={{ color: "#059669" }}>
                {isRTL ? "نقدي:" : "Cash:"} {moneyFmt(data.totals.cashAmount)}
              </span>
              <span className="text-[12px] font-semibold" style={{ color: "#d97706" }}>
                {isRTL ? "آجل:" : "Credit:"} {moneyFmt(data.totals.creditAmount)}
              </span>
              <span className="text-[12px] font-semibold" style={{ color: "var(--ink-500)" }}>
                {isRTL ? `${data.totals.vehicleCount} مركبة · ${data.totals.invoiceCount} فاتورة`
                        : `${data.totals.vehicleCount} vehicles · ${data.totals.invoiceCount} invoices`}
              </span>
            </div>
          </div>

          {/* Print signatures */}
          <div className="hidden print:grid grid-cols-3 gap-8 mt-8 pt-6 border-t-2 border-gray-300">
            {[isRTL ? "أعدّه" : "Prepared by", isRTL ? "اعتمده" : "Approved by", isRTL ? "استلمه" : "Received by"].map((l) => (
              <div key={l} className="text-center">
                <div className="h-12 border-b border-gray-600 mx-4 mb-2" />
                <p className="text-xs text-gray-500 font-medium">{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </PrintableReportPage>
  );
}
