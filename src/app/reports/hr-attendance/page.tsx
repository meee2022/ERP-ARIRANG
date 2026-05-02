// @ts-nocheck
"use client";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PrintableReportPage } from "@/components/ui/printable-report";
import { useState } from "react";

const today = new Date().toISOString().split("T")[0];
const monthStart = today.slice(0, 8) + "01";

export default function HrAttendanceReportPage() {
  const { t, isRTL } = useI18n();
  const { company: printCompany } = useCompanySettings();
  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate, setToDate] = useState(today);
  const rows = useQuery(api.hr.getAttendanceReport, { fromDate, toDate }) ?? [];

  return (
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={t("attendanceReport")}
      period={`${fromDate} — ${toDate}`}
      filters={
        <div className="flex gap-3 flex-wrap items-end p-1">
          <div>
            <label className="text-xs text-gray-500 block mb-1">{isRTL ? "من" : "From"}</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">{isRTL ? "إلى" : "To"}</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input-field" />
          </div>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: "#6b1523" }}>
              <th className="px-[14px] py-[10px] text-start text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("employeeName")}</th>
              <th className="px-[14px] py-[10px] text-center text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("attPresent")}</th>
              <th className="px-[14px] py-[10px] text-center text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("attAbsent")}</th>
              <th className="px-[14px] py-[10px] text-center text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("attLate")}</th>
              <th className="px-[14px] py-[10px] text-center text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("attHalfDay")}</th>
              <th className="px-[14px] py-[10px] text-center text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{isRTL ? "إجازة" : "On Leave"}</th>
              <th className="px-[14px] py-[10px] text-center text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("overtimeHours")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr key={i} className="hover:bg-[#fdf2f4] transition-colors"
                style={{ background: i % 2 === 0 ? "white" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                <td className="px-[14px] py-[8px] text-[12.5px] font-medium whitespace-nowrap" style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", color: "#1e293b" }}>{isRTL ? r.employee.nameAr : (r.employee.nameEn || r.employee.nameAr)}</td>
                <td className="px-[14px] py-[8px] text-[12.5px] text-center tabular-nums font-semibold whitespace-nowrap text-green-700">{r.present}</td>
                <td className="px-[14px] py-[8px] text-[12.5px] text-center tabular-nums font-semibold whitespace-nowrap text-red-600">{r.absent}</td>
                <td className="px-[14px] py-[8px] text-[12.5px] text-center tabular-nums whitespace-nowrap text-amber-600">{r.late}</td>
                <td className="px-[14px] py-[8px] text-[12.5px] text-center tabular-nums whitespace-nowrap text-orange-600">{r.half_day}</td>
                <td className="px-[14px] py-[8px] text-[12.5px] text-center tabular-nums whitespace-nowrap text-blue-600">{r.on_leave}</td>
                <td className="px-[14px] py-[8px] text-[12.5px] text-center tabular-nums whitespace-nowrap" style={{ color: "#1e293b" }}>{r.overtime}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{isRTL ? "لا توجد بيانات" : "No data"}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </PrintableReportPage>
  );
}
