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
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-start font-semibold">{t("payrollPeriod")}</th>
              <th className="px-4 py-3 text-center font-semibold">{t("employeeCount")}</th>
              <th className="px-4 py-3 text-end font-semibold">{isRTL ? "إجمالي الأساسي" : "Total Basic"}</th>
              <th className="px-4 py-3 text-end font-semibold">{t("totalAllowancesHr")}</th>
              <th className="px-4 py-3 text-end font-semibold">{t("totalDeductionsHr")}</th>
              <th className="px-4 py-3 text-end font-semibold">{t("totalNetPay")}</th>
              <th className="px-4 py-3 text-center font-semibold">{t("payrollStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r: any) => (
              <tr key={r._id} className="border-b hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium">
                  {isRTL ? MONTH_NAMES_AR[r.periodMonth - 1] : MONTH_NAMES_EN[r.periodMonth - 1]} {r.periodYear}
                </td>
                <td className="px-4 py-3 text-center">{r.employeeCount}</td>
                <td className="px-4 py-3 text-end">{formatCurrency(r.totalBasic, lang)}</td>
                <td className="px-4 py-3 text-end">{formatCurrency(r.totalAllowances, lang)}</td>
                <td className="px-4 py-3 text-end text-red-600">{formatCurrency(r.totalDeductions, lang)}</td>
                <td className="px-4 py-3 text-end font-bold text-green-700">{formatCurrency(r.totalNetPay, lang)}</td>
                <td className="px-4 py-3 text-center">{statusBadge(r.status)}</td>
              </tr>
            ))}
            {runs.length > 0 && (
              <tr className="bg-gray-50 font-bold border-t-2">
                <td className="px-4 py-3" colSpan={5}>{isRTL ? "الإجمالي" : "Total"}</td>
                <td className="px-4 py-3 text-end text-green-700">{formatCurrency(totalNet, lang)}</td>
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
