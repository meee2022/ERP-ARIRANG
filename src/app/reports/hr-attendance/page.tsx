// @ts-nocheck
"use client";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { useState } from "react";

const today = new Date().toISOString().split("T")[0];
const monthStart = today.slice(0, 8) + "01";

export default function HrAttendanceReportPage() {
  const { t, isRTL } = useI18n();
  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate, setToDate] = useState(today);
  const rows = useQuery(api.hr.getAttendanceReport, { fromDate, toDate }) ?? [];

  return (
    <div className="p-6 space-y-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="no-print"><PageHeader title={t("attendanceReport")} /></div>

      <div className="no-print flex gap-3 flex-wrap items-end">
        <div><label className="text-xs text-gray-500 block mb-1">{isRTL ? "من" : "From"}</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input-field" /></div>
        <div><label className="text-xs text-gray-500 block mb-1">{isRTL ? "إلى" : "To"}</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input-field" /></div>
        <button onClick={() => window.print()} className="btn-ghost">{isRTL ? "طباعة" : "Print"}</button>
      </div>

      <div className="surface-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-start font-semibold">{t("employeeName")}</th>
              <th className="px-4 py-3 text-center font-semibold">{t("attPresent")}</th>
              <th className="px-4 py-3 text-center font-semibold">{t("attAbsent")}</th>
              <th className="px-4 py-3 text-center font-semibold">{t("attLate")}</th>
              <th className="px-4 py-3 text-center font-semibold">{t("attHalfDay")}</th>
              <th className="px-4 py-3 text-center font-semibold">{isRTL ? "إجازة" : "On Leave"}</th>
              <th className="px-4 py-3 text-center font-semibold">{t("overtimeHours")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr key={i} className="border-b hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium">{isRTL ? r.employee.nameAr : (r.employee.nameEn || r.employee.nameAr)}</td>
                <td className="px-4 py-3 text-center text-green-700 font-semibold">{r.present}</td>
                <td className="px-4 py-3 text-center text-red-600 font-semibold">{r.absent}</td>
                <td className="px-4 py-3 text-center text-amber-600">{r.late}</td>
                <td className="px-4 py-3 text-center text-orange-600">{r.half_day}</td>
                <td className="px-4 py-3 text-center text-blue-600">{r.on_leave}</td>
                <td className="px-4 py-3 text-center">{r.overtime}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{isRTL ? "لا توجد بيانات" : "No data"}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
