// @ts-nocheck
"use client";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { formatCurrency } from "@/lib/i18n";
import { PageHeader } from "@/components/ui/page-header";
import { useState } from "react";

const MONTH_NAMES_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const MONTH_NAMES_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function HrPayrollReportPage() {
  const { t, isRTL, lang } = useI18n();
  const [filterYear, setFilterYear] = useState<number | undefined>(new Date().getFullYear());
  const runs = useQuery(api.hr.getPayrollReport, { periodYear: filterYear }) ?? [];

  const statusBadge = (s: string) => {
    const map: any = { draft: "bg-gray-100 text-gray-600", processed: "bg-blue-100 text-blue-700", paid: "bg-green-100 text-green-800" };
    const labels: any = { draft: t("draftPayroll"), processed: t("processedPayroll"), paid: t("paidPayroll") };
    return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${map[s] ?? ""}`}>{labels[s] ?? s}</span>;
  };

  const totalNet = runs.reduce((s: number, r: any) => s + r.totalNetPay, 0);
  const totalBasic = runs.reduce((s: number, r: any) => s + r.totalBasic, 0);

  return (
    <div className="p-6 space-y-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="no-print"><PageHeader title={t("payrollReport")} /></div>

      <div className="no-print flex gap-3 flex-wrap items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">{isRTL ? "السنة" : "Year"}</label>
          <input type="number" value={filterYear ?? ""} onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : undefined)} className="input-field w-28" />
        </div>
        <button onClick={() => window.print()} className="btn-ghost">{isRTL ? "طباعة" : "Print"}</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
        {[
          { label: isRTL ? "عدد المسيرات" : "Total Runs", value: runs.length, color: "bg-blue-50" },
          { label: isRTL ? "إجمالي الراتب الأساسي" : "Total Basic", value: formatCurrency(totalBasic, lang), color: "bg-gray-50" },
          { label: isRTL ? "صافي الدفع الكلي" : "Total Net Pay", value: formatCurrency(totalNet, lang), color: "bg-green-50" },
          { label: isRTL ? "المسيرات المدفوعة" : "Paid Runs", value: runs.filter((r: any) => r.status === "paid").length, color: "bg-emerald-50" },
        ].map((c, i) => (
          <div key={i} className={`${c.color} rounded-xl p-4 border`}>
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className="text-lg font-bold text-gray-800">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="surface-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#6b1523" }}>
              <th className="px-[14px] py-[10px] text-start text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("payrollPeriod")}</th>
              <th className="px-[14px] py-[10px] text-center text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("employeeCount")}</th>
              <th className="px-[14px] py-[10px] text-end text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{isRTL ? "إجمالي الأساسي" : "Total Basic"}</th>
              <th className="px-[14px] py-[10px] text-end text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("totalAllowancesHr")}</th>
              <th className="px-[14px] py-[10px] text-end text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("totalDeductionsHr")}</th>
              <th className="px-[14px] py-[10px] text-end text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("totalNetPay")}</th>
              <th className="px-[14px] py-[10px] text-center text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("payrollStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r: any, i: number) => (
              <tr key={r._id} className="hover:bg-[#fdf2f4] transition-colors"
                style={{ background: i % 2 === 0 ? "white" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                <td className="px-[14px] py-[8px] text-[12.5px] font-medium whitespace-nowrap" style={{ color: "#1e293b" }}>
                  {isRTL ? MONTH_NAMES_AR[r.periodMonth - 1] : MONTH_NAMES_EN[r.periodMonth - 1]} {r.periodYear}
                </td>
                <td className="px-[14px] py-[8px] text-[12.5px] text-center tabular-nums whitespace-nowrap" style={{ color: "#1e293b" }}>{r.employeeCount}</td>
                <td className="px-[14px] py-[8px] text-[12.5px] text-end tabular-nums whitespace-nowrap" style={{ color: "#1e293b" }}>{formatCurrency(r.totalBasic, lang)}</td>
                <td className="px-[14px] py-[8px] text-[12.5px] text-end tabular-nums whitespace-nowrap" style={{ color: "#1e293b" }}>{formatCurrency(r.totalAllowances, lang)}</td>
                <td className="px-[14px] py-[8px] text-[12.5px] text-end tabular-nums whitespace-nowrap text-red-600">{formatCurrency(r.totalDeductions, lang)}</td>
                <td className="px-[14px] py-[8px] text-[12.5px] text-end tabular-nums font-bold whitespace-nowrap text-green-700">{formatCurrency(r.totalNetPay, lang)}</td>
                <td className="px-[14px] py-[8px] text-[12.5px] text-center whitespace-nowrap">{statusBadge(r.status)}</td>
              </tr>
            ))}
            {runs.length > 0 && (
              <tr className="bg-[#fafafa] font-bold border-t-2">
                <td className="px-[14px] py-[8px] text-[12.5px]" colSpan={5}>{isRTL ? "الإجمالي" : "Total"}</td>
                <td className="px-[14px] py-[8px] text-[12.5px] text-end tabular-nums text-green-700">{formatCurrency(totalNet, lang)}</td>
                <td />
              </tr>
            )}
            {runs.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{isRTL ? "لا توجد بيانات" : "No data"}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
