// @ts-nocheck
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Receipt, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";

const ACCENT = "#22d3ee";

function MoneyRow({ label, value, color, bold }: { label: string; value: number; color?: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 px-4 rounded-lg ${bold ? "border border-white/10" : ""}`}
      style={bold ? { background: "var(--background)" } : {}}>
      <span className="text-[12.5px]" style={{ color: bold ? "var(--foreground)" : "var(--muted-foreground)", fontWeight: bold ? 700 : 400 }}>
        {label}
      </span>
      <span className="text-[13px] font-bold tabular-nums" style={{ color: color ?? "var(--foreground)" }}>
        {value.toFixed(2)} QAR
      </span>
    </div>
  );
}

export default function VatReportPage() {
  const { isRTL } = useI18n();
  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const today     = new Date().toISOString().slice(0, 10);
  const firstOfMonth = today.slice(0, 7) + "-01";

  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate,   setToDate]   = useState(today);

  const report = useQuery(
    api.reports.getVatSummary,
    companyId ? { companyId, fromDate, toDate } : "skip"
  );

  if (!companyId) return <LoadingState />;

  const s = report?.summary;
  const isRefundable = s?.isRefundable;

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title={isRTL ? "تقرير ضريبة القيمة المضافة" : "VAT Report"}
        subtitle={isRTL
          ? "ملخص ضريبة المخرجات والمدخلات وصافي المستحق للهيئة"
          : "Output tax, input tax, and net VAT payable to authority"}
        icon={Receipt}
        iconColor={ACCENT}
      />

      {/* Date range picker */}
      <div className="rounded-xl border p-4 flex flex-col sm:flex-row gap-3 items-end"
        style={{ background: "var(--card)", borderColor: "rgba(255,255,255,0.1)" }}>
        <div className="flex-1">
          <label className="text-[11px] mb-1 block" style={{ color: "var(--muted-foreground)" }}>
            {isRTL ? "من تاريخ" : "From"}
          </label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-[12px] border outline-none"
            style={{ background: "var(--background)", borderColor: "rgba(255,255,255,0.12)", color: "var(--foreground)" }} />
        </div>
        <div className="flex-1">
          <label className="text-[11px] mb-1 block" style={{ color: "var(--muted-foreground)" }}>
            {isRTL ? "إلى تاريخ" : "To"}
          </label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-[12px] border outline-none"
            style={{ background: "var(--background)", borderColor: "rgba(255,255,255,0.12)", color: "var(--foreground)" }} />
        </div>
        <div className="text-[11px] px-3 py-2 rounded-lg" style={{ background: `${ACCENT}15`, color: ACCENT }}>
          {isRTL ? `${fromDate} → ${toDate}` : `${fromDate} → ${toDate}`}
        </div>
      </div>

      {!report ? (
        <LoadingState />
      ) : (
        <>
          {/* Net VAT banner */}
          <div className="rounded-2xl p-5 border overflow-hidden"
            style={{
              background: isRefundable
                ? "linear-gradient(135deg,#065f4620,#064e3b20)"
                : "linear-gradient(135deg,#7c3aed20,#4f46e520)",
              borderColor: isRefundable ? "#34d39940" : "#a78bfa40",
            }}>
            <div className="flex items-center gap-3">
              {isRefundable
                ? <TrendingDown className="h-8 w-8" style={{ color: "#34d399" }} />
                : <TrendingUp   className="h-8 w-8" style={{ color: "#a78bfa" }} />}
              <div>
                <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
                  {isRTL ? "صافي الضريبة المستحقة" : "Net VAT Payable"}
                </p>
                <p className="text-[28px] font-bold"
                  style={{ color: isRefundable ? "#34d399" : "#a78bfa" }}>
                  {Math.abs(s?.netVatPayable ?? 0).toFixed(2)} QAR
                </p>
                <p className="text-[11.5px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                  {isRefundable
                    ? (isRTL ? "مبلغ قابل للاسترداد من الهيئة" : "Refundable from authority")
                    : (isRTL ? "مستحق للدفع للهيئة" : "Payable to tax authority")}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sales / Output VAT */}
            <div className="rounded-2xl border overflow-hidden"
              style={{ background: "var(--card)", borderColor: "rgba(255,255,255,0.1)" }}>
              <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2"
                style={{ background: "var(--background)" }}>
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>
                  {isRTL ? "ضريبة المخرجات (المبيعات)" : "Output VAT (Sales)"}
                </p>
                <span className="ml-auto text-[10.5px] px-2 py-0.5 rounded-full"
                  style={{ background: "#34d39920", color: "#34d399" }}>
                  {report.sales.count} {isRTL ? "فاتورة" : "invoices"}
                </span>
              </div>
              <div className="p-3 space-y-1">
                <MoneyRow label={isRTL ? "صافي المبيعات (قبل الضريبة)" : "Net Sales (excl. VAT)"} value={report.sales.netAmount} />
                <MoneyRow label={isRTL ? "ضريبة القيمة المضافة 5%" : "VAT 5%"} value={report.sales.vatAmount} color="#34d399" bold />
                <MoneyRow label={isRTL ? "إجمالي المبيعات (شامل الضريبة)" : "Gross Sales (incl. VAT)"} value={report.sales.grossAmount} />
              </div>
            </div>

            {/* Purchases / Input VAT */}
            <div className="rounded-2xl border overflow-hidden"
              style={{ background: "var(--card)", borderColor: "rgba(255,255,255,0.1)" }}>
              <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2"
                style={{ background: "var(--background)" }}>
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>
                  {isRTL ? "ضريبة المدخلات (المشتريات)" : "Input VAT (Purchases)"}
                </p>
                <span className="ml-auto text-[10.5px] px-2 py-0.5 rounded-full"
                  style={{ background: "#60a5fa20", color: "#60a5fa" }}>
                  {report.purchases.count} {isRTL ? "فاتورة" : "invoices"}
                </span>
              </div>
              <div className="p-3 space-y-1">
                <MoneyRow label={isRTL ? "صافي المشتريات (قبل الضريبة)" : "Net Purchases (excl. VAT)"} value={report.purchases.netAmount} />
                <MoneyRow label={isRTL ? "ضريبة القيمة المضافة 5%" : "VAT 5%"} value={report.purchases.vatAmount} color="#60a5fa" bold />
                <MoneyRow label={isRTL ? "إجمالي المشتريات (شامل الضريبة)" : "Gross Purchases (incl. VAT)"} value={report.purchases.grossAmount} />
              </div>
            </div>
          </div>

          {/* Summary calculation */}
          <div className="rounded-2xl border overflow-hidden"
            style={{ background: "var(--card)", borderColor: "rgba(255,255,255,0.1)" }}>
            <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2"
              style={{ background: "var(--background)" }}>
              <Receipt className="h-3.5 w-3.5" style={{ color: ACCENT }} />
              <p className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>
                {isRTL ? "حساب الضريبة المستحقة" : "VAT Payable Calculation"}
              </p>
            </div>
            <div className="p-3 space-y-1.5">
              <MoneyRow
                label={isRTL ? "ضريبة المخرجات (من المبيعات)" : "Output VAT (from sales)"}
                value={s?.outputVat ?? 0} color="#34d399" />
              <MoneyRow
                label={isRTL ? "ضريبة المدخلات (من المشتريات)" : "Input VAT (from purchases)"}
                value={-(s?.inputVat ?? 0)} color="#60a5fa" />
              <div className="border-t border-white/10 pt-1.5">
                <MoneyRow
                  label={isRTL
                    ? (isRefundable ? "صافي مسترد من الهيئة" : "صافي مستحق للهيئة")
                    : (isRefundable ? "Net Refundable" : "Net Payable to Authority")}
                  value={Math.abs(s?.netVatPayable ?? 0)}
                  color={isRefundable ? "#34d399" : "#a78bfa"}
                  bold />
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="rounded-xl p-4 border border-white/8 flex items-start gap-3"
            style={{ background: "var(--card)" }}>
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: ACCENT }} />
            <p className="text-[11.5px]" style={{ color: "var(--muted-foreground)" }}>
              {isRTL
                ? "يشمل هذا التقرير الفواتير المرحلة فقط. معدل الضريبة المطبق في قطر هو 5%. لتقديم إقرار ضريبي، يرجى تصدير البيانات ورفعها على بوابة الهيئة العامة للضرائب."
                : "This report includes posted invoices only. The applicable VAT rate in Qatar is 5%. To file a tax return, export this data and submit it through the General Tax Authority portal."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
