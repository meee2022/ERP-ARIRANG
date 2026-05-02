// @ts-nocheck
"use client";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PrintableReportPage } from "@/components/ui/printable-report";
import { useState } from "react";

export default function HrLeaveReportPage() {
  const { t, isRTL } = useI18n();
  const { company: printCompany } = useCompanySettings();
  const [year, setYear] = useState(new Date().getFullYear());
  const rows = useQuery(api.hr.getLeaveReport, { year }) ?? [];

  const statusBadge = (s: string) => {
    const map: any = { pending: "bg-yellow-100 text-yellow-800", approved: "bg-green-100 text-green-800", rejected: "bg-red-100 text-red-700", cancelled: "bg-gray-100 text-gray-600" };
    const labels: any = { pending: t("pendingApproval"), approved: t("leaveApproved"), rejected: t("leaveRejected"), cancelled: t("leaveCancelled") };
    return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${map[s] ?? ""}`}>{labels[s] ?? s}</span>;
  };

  return (
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={t("leaveReport")}
      period={String(year)}
      filters={
        <div className="flex gap-3 flex-wrap items-end p-1">
          <div>
            <label className="text-xs text-gray-500 block mb-1">{isRTL ? "السنة" : "Year"}</label>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-field w-28" />
          </div>
          <span className="text-[12px] font-semibold" style={{ color: "var(--ink-500)" }}>
            {rows.length} {isRTL ? "طلب" : "requests"}
          </span>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: "#6b1523" }}>
              <th className="px-[14px] py-[10px] text-start text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("employeeName")}</th>
              <th className="px-[14px] py-[10px] text-start text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("leaveType")}</th>
              <th className="px-[14px] py-[10px] text-start text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("leaveStartDate")}</th>
              <th className="px-[14px] py-[10px] text-start text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("leaveEndDate")}</th>
              <th className="px-[14px] py-[10px] text-center text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("totalDays")}</th>
              <th className="px-[14px] py-[10px] text-center text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{isRTL ? "الحالة" : "Status"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr key={r._id} className="hover:bg-[#fdf2f4] transition-colors"
                style={{ background: i % 2 === 0 ? "white" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                <td className="px-[14px] py-[8px] text-[12.5px] font-medium whitespace-nowrap" style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", color: "#1e293b" }}>{r.employee ? (isRTL ? r.employee.nameAr : (r.employee.nameEn || r.employee.nameAr)) : "—"}</td>
                <td className="px-[14px] py-[8px] text-[12.5px] whitespace-nowrap" style={{ color: "#1e293b" }}>{r.leaveType ? (isRTL ? r.leaveType.nameAr : (r.leaveType.nameEn || r.leaveType.nameAr)) : "—"}</td>
                <td className="px-[14px] py-[8px] text-[12.5px] whitespace-nowrap" style={{ color: "#1e293b" }}>{r.startDate}</td>
                <td className="px-[14px] py-[8px] text-[12.5px] whitespace-nowrap" style={{ color: "#1e293b" }}>{r.endDate}</td>
                <td className="px-[14px] py-[8px] text-[12.5px] text-center tabular-nums font-semibold whitespace-nowrap" style={{ color: "#1e293b" }}>{r.totalDays}</td>
                <td className="px-[14px] py-[8px] text-[12.5px] text-center whitespace-nowrap">{statusBadge(r.status)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">{isRTL ? "لا توجد بيانات" : "No data"}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </PrintableReportPage>
  );
}
