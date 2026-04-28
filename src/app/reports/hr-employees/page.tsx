// @ts-nocheck
"use client";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { formatCurrency } from "@/lib/i18n";
import { PageHeader } from "@/components/ui/page-header";
import { useState } from "react";

export default function HrEmployeesReportPage() {
  const { t, isRTL, lang } = useI18n();
  const [status, setStatus] = useState("");
  const employees = useQuery(api.hr.getEmployeeDirectoryReport, status ? { status } : {}) ?? [];

  const statusBadge = (s: string) => {
    const map: any = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-600",
      terminated: "bg-red-100 text-red-700",
      on_leave: "bg-blue-100 text-blue-700",
    };
    const labels: any = { active: t("statusActive"), inactive: t("statusInactive"), terminated: t("statusTerminated"), on_leave: t("statusOnLeave") };
    return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${map[s] ?? "bg-gray-100 text-gray-600"}`}>{labels[s] ?? s}</span>;
  };

  return (
    <div className="p-6 space-y-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="no-print">
        <PageHeader title={t("employeeDirectoryReport")} />
      </div>

      {/* Filters */}
      <div className="no-print flex gap-3 flex-wrap">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field w-40">
          <option value="">{isRTL ? "كل الحالات" : "All Statuses"}</option>
          <option value="active">{t("statusActive")}</option>
          <option value="inactive">{t("statusInactive")}</option>
          <option value="terminated">{t("statusTerminated")}</option>
          <option value="on_leave">{t("statusOnLeave")}</option>
        </select>
        <button onClick={() => window.print()} className="btn-ghost">{isRTL ? "طباعة" : "Print"}</button>
      </div>

      <div className="surface-card rounded-xl overflow-hidden">
        <table className="w-full text-sm" dir={isRTL ? "rtl" : "ltr"}>
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-start font-semibold">{t("employeeCode")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("employeeName")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("department")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("designation")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("hireDate")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("employmentType")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("basicSalary")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("employeeStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp: any) => (
              <tr key={emp._id} className="border-b hover:bg-gray-50/50">
                <td className="px-4 py-3 font-mono text-xs">{emp.employeeCode}</td>
                <td className="px-4 py-3 font-medium">{isRTL ? emp.nameAr : (emp.nameEn || emp.nameAr)}</td>
                <td className="px-4 py-3 text-gray-600">{emp.department ? (isRTL ? emp.department.nameAr : (emp.department.nameEn || emp.department.nameAr)) : "—"}</td>
                <td className="px-4 py-3 text-gray-600">{emp.designation ? (isRTL ? emp.designation.nameAr : (emp.designation.nameEn || emp.designation.nameAr)) : "—"}</td>
                <td className="px-4 py-3 text-gray-600">{emp.hireDate}</td>
                <td className="px-4 py-3 text-gray-600">{emp.employmentType}</td>
                <td className="px-4 py-3 font-medium">{formatCurrency(emp.basicSalary, lang)}</td>
                <td className="px-4 py-3">{statusBadge(emp.status)}</td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">{isRTL ? "لا توجد بيانات" : "No data"}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 no-print">{isRTL ? "إجمالي الموظفين:" : "Total employees:"} {employees.length}</p>
    </div>
  );
}
