// @ts-nocheck
"use client";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { formatCurrency } from "@/lib/i18n";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PrintableReportPage } from "@/components/ui/printable-report";
import { useState } from "react";

export default function HrEmployeesReportPage() {
  const { t, isRTL, lang } = useI18n();
  const { company: printCompany } = useCompanySettings();
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
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={t("employeeDirectoryReport")}
      period={new Date().toISOString().split("T")[0]}
      filters={
        <div className="flex gap-3 flex-wrap items-center p-1">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field w-40">
            <option value="">{isRTL ? "كل الحالات" : "All Statuses"}</option>
            <option value="active">{t("statusActive")}</option>
            <option value="inactive">{t("statusInactive")}</option>
            <option value="terminated">{t("statusTerminated")}</option>
            <option value="on_leave">{t("statusOnLeave")}</option>
          </select>
          <span className="text-[12px] font-semibold" style={{ color: "var(--ink-500)" }}>
            {employees.length} {isRTL ? "موظف" : "employees"}
          </span>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse" dir={isRTL ? "rtl" : "ltr"}>
          <thead>
            <tr style={{ background: "#6b1523" }}>
              <th className="px-[14px] py-[10px] text-start text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("employeeCode")}</th>
              <th className="px-[14px] py-[10px] text-start text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("employeeName")}</th>
              <th className="px-[14px] py-[10px] text-start text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("department")}</th>
              <th className="px-[14px] py-[10px] text-start text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("designation")}</th>
              <th className="px-[14px] py-[10px] text-start text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("hireDate")}</th>
              <th className="px-[14px] py-[10px] text-start text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("employmentType")}</th>
              <th className="px-[14px] py-[10px] text-end text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("basicSalary")}</th>
              <th className="px-[14px] py-[10px] text-start text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{t("employeeStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp: any, i: number) => (
              <tr key={emp._id} className="hover:bg-[#fdf2f4] transition-colors"
                style={{ background: i % 2 === 0 ? "white" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                <td className="px-[14px] py-[8px] font-mono text-[11px] whitespace-nowrap" style={{ color: "#1e293b" }}>{emp.employeeCode}</td>
                <td className="px-[14px] py-[8px] text-[12.5px] font-medium whitespace-nowrap" style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", color: "#1e293b" }}>{isRTL ? emp.nameAr : (emp.nameEn || emp.nameAr)}</td>
                <td className="px-[14px] py-[8px] text-[12.5px] whitespace-nowrap" style={{ color: "#1e293b" }}>{emp.department ? (isRTL ? emp.department.nameAr : (emp.department.nameEn || emp.department.nameAr)) : "—"}</td>
                <td className="px-[14px] py-[8px] text-[12.5px] whitespace-nowrap" style={{ color: "#1e293b" }}>{emp.designation ? (isRTL ? emp.designation.nameAr : (emp.designation.nameEn || emp.designation.nameAr)) : "—"}</td>
                <td className="px-[14px] py-[8px] text-[12.5px] whitespace-nowrap" style={{ color: "#1e293b" }}>{emp.hireDate}</td>
                <td className="px-[14px] py-[8px] text-[12.5px] whitespace-nowrap" style={{ color: "#1e293b" }}>{emp.employmentType}</td>
                <td className="px-[14px] py-[8px] text-[12.5px] font-medium tabular-nums text-end whitespace-nowrap" style={{ color: "#1e293b" }}>{formatCurrency(emp.basicSalary, lang)}</td>
                <td className="px-[14px] py-[8px] whitespace-nowrap">{statusBadge(emp.status)}</td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">{isRTL ? "لا توجد بيانات" : "No data"}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </PrintableReportPage>
  );
}
