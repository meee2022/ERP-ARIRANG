// @ts-nocheck
"use client";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { useState } from "react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function HrLeaveReportPage() {
  const { t, isRTL } = useI18n();
  const [year, setYear] = useState(new Date().getFullYear());
  const rows = useQuery(api.hr.getLeaveReport, { year }) ?? [];

  const statusBadge = (s: string) => {
    const map: any = { pending: "bg-yellow-100 text-yellow-800", approved: "bg-green-100 text-green-800", rejected: "bg-red-100 text-red-700", cancelled: "bg-gray-100 text-gray-600" };
    const labels: any = { pending: t("pendingApproval"), approved: t("leaveApproved"), rejected: t("leaveRejected"), cancelled: t("leaveCancelled") };
    return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${map[s] ?? ""}`}>{labels[s] ?? s}</span>;
  };

  return (
    <div className="p-6 space-y-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="no-print"><PageHeader title={t("leaveReport")} /></div>

      <div className="no-print flex gap-3 flex-wrap items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">{isRTL ? "السنة" : "Year"}</label>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-field w-28" />
        </div>
        <button onClick={() => window.print()} className="btn-ghost">{isRTL ? "طباعة" : "Print"}</button>
      </div>

      <div className="surface-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-start font-semibold">{t("employeeName")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("leaveType")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("leaveStartDate")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("leaveEndDate")}</th>
              <th className="px-4 py-3 text-center font-semibold">{t("totalDays")}</th>
              <th className="px-4 py-3 text-center font-semibold">{isRTL ? "الحالة" : "Status"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r._id} className="border-b hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium">{r.employee ? (isRTL ? r.employee.nameAr : (r.employee.nameEn || r.employee.nameAr)) : "—"}</td>
                <td className="px-4 py-3 text-gray-600">{r.leaveType ? (isRTL ? r.leaveType.nameAr : (r.leaveType.nameEn || r.leaveType.nameAr)) : "—"}</td>
                <td className="px-4 py-3 text-gray-600">{r.startDate}</td>
                <td className="px-4 py-3 text-gray-600">{r.endDate}</td>
                <td className="px-4 py-3 text-center font-semibold">{r.totalDays}</td>
                <td className="px-4 py-3 text-center">{statusBadge(r.status)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">{isRTL ? "لا توجد بيانات" : "No data"}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
