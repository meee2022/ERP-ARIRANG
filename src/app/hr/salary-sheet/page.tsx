// @ts-nocheck
"use client";

import React, { useState, useMemo, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import { FileSpreadsheet, Printer, FileText, BedDouble } from "lucide-react";
import dynamic from "next/dynamic";

const PdfDownloadButton = dynamic(() => import("@/components/ui/PdfDownloadButton"), { ssr: false });

const MONTH_NAMES_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_NAMES_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

// ─── Simple Sheet (مبسّط) ─────────────────────────────────────────────────────

function SimpleGroupTable({ groupLabel, groupRows, startSn, isRTL }: any) {
  // Only count non-leave rows in totals
  const groupTotal = groupRows.filter((r: any) => !r.isOnLeave).reduce((s: number, r: any) => s + r.totalSalary, 0);
  return (
    <div className="mb-6">
      {/* Department header */}
      <div className="text-white text-center font-bold py-2 text-sm uppercase tracking-wide" style={{ background: "var(--brand-700)" }}>
        {groupLabel}
      </div>
      <table className="w-full text-sm border-collapse salary-sheet-table" dir={isRTL ? "rtl" : "ltr"}>
        <thead>
          <tr style={{ background: "#6b1523", color: "#fff", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
            {[
              isRTL ? "م" : "SL.NO",
              isRTL ? "الكود" : "ERP CODE",
              isRTL ? "الاسم" : "NAME",
              isRTL ? "المسمى الوظيفي" : "DESIGNATION",
              isRTL ? "الكفالة" : "Sponsorship",
              isRTL ? "أيام العمل" : "WORKING DAYS",
              isRTL ? "إجمالي الراتب" : "TOTAL SALARY",
              isRTL ? "التوقيع" : "SIGNATURE",
            ].map((h) => (
              <th key={h} style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "7px 12px", textAlign: "center", fontWeight: 700, color: "#fff", fontSize: "11px", whiteSpace: "nowrap", background: "#6b1523" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groupRows.map((r: any, i: number) => (
            r.isOnLeave ? (
              /* ── On-Leave Row (Simple) ── */
              <tr key={`leave-${r.erpCode}`} style={{ background: "#f0f9ff", fontStyle: "italic" }}>
                <td className="border border-blue-200 px-3 py-3 text-center text-gray-400">{startSn + i}</td>
                <td className="border border-blue-200 px-3 py-3 text-center font-bold text-blue-700">{r.erpCode}</td>
                <td className="border border-blue-200 px-3 py-3 font-semibold text-blue-900">
                  {r.name}
                  <span className="ms-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 not-italic">
                    {isRTL ? "إجازة" : "ON LEAVE"}
                  </span>
                </td>
                <td className="border border-blue-200 px-3 py-3 text-center text-sm text-gray-500">{r.designation}</td>
                <td className="border border-blue-200 px-3 py-3 text-center text-sm text-gray-400">{r.sponsorship}</td>
                <td className="border border-blue-200 px-3 py-3 text-center text-gray-300">—</td>
                <td className="border border-blue-200 px-3 py-3 text-center text-gray-300">—</td>
                <td className="border border-blue-200 px-3 py-3 print:h-10">&nbsp;</td>
              </tr>
            ) : (
              <tr key={r.sn} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-3 py-3 text-center">{startSn + i}</td>
                <td className="border border-gray-300 px-3 py-3 text-center font-bold">{r.erpCode}</td>
                <td className="border border-gray-300 px-3 py-3 font-semibold">{r.name}</td>
                <td className="border border-gray-300 px-3 py-3 text-center text-sm">{r.designation}</td>
                <td className="border border-gray-300 px-3 py-3 text-center text-sm">{r.sponsorship}</td>
                <td className="border border-gray-300 px-3 py-3 text-center tabular-nums font-semibold">{r.workingDays}</td>
                <td className="border border-gray-300 px-3 py-3 text-center tabular-nums font-bold">{r.totalSalary.toLocaleString()}</td>
                <td className="border border-gray-300 px-3 py-3 print:h-10">&nbsp;</td>
              </tr>
            )
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 font-bold">
            <td colSpan={6} className="border border-gray-400 px-3 py-2 text-center">
              {isRTL ? "إجمالي المجموعة" : "Group Total"}
            </td>
            <td className="border border-gray-400 px-3 py-2 text-center tabular-nums">{groupTotal.toLocaleString()}</td>
            <td className="border border-gray-400 px-3 py-2"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function SimpleSheetView({ rows, groupBy, isRTL, monthLabel, sheetTitle }: any) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        {isRTL ? "لا يوجد موظفون نشطون لهذا الشهر" : "No active employees for this period"}
      </div>
    );
  }

  if (groupBy === "department") {
    // Group rows by department name
    const groups: Record<string, any[]> = {};
    for (const r of rows) {
      const key = r.departmentName || (isRTL ? "بدون قسم" : "No Department");
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }
    let runningIdx = 1;
    return (
      <div className="p-4 salary-sheet-printable print:overflow-visible">
        {Object.entries(groups).map(([dept, deptRows]) => {
          const startSn = runningIdx;
          runningIdx += deptRows.length;
          return (
            <SimpleGroupTable key={dept} groupLabel={dept} groupRows={deptRows} startSn={startSn} isRTL={isRTL} />
          );
        })}
        {/* Grand total */}
        <div className="mt-2 flex justify-end">
          <table className="text-sm border-collapse">
            <tbody>
              <tr>
                <td className="border border-gray-400 px-4 py-2 font-bold bg-gray-100">
                  {isRTL ? "الإجمالي الكلي" : "GRAND TOTAL"}
                </td>
                <td className="border border-gray-400 px-4 py-2 font-bold tabular-nums text-center">
                  {rows.filter((r: any) => !r.isOnLeave).reduce((s: number, r: any) => s + r.totalSalary, 0).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // All employees in one group
  return (
    <div className="p-4 salary-sheet-printable print:overflow-visible">
      <SimpleGroupTable
        groupLabel={isRTL ? "جميع الموظفين" : "All Staff"}
        groupRows={rows}
        startSn={1}
        isRTL={isRTL}
      />
    </div>
  );
}

export default function SalarySheetPage() {
  const { isRTL, formatCurrency } = useI18n();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [manualWorkDays, setManualWorkDays] = useState<string>("");
  // "detailed" = كشف تفصيلي (OT، غياب...) | "simple" = كشف مبسّط (اسم + مسمى + راتب + توقيع)
  const [sheetFormat, setSheetFormat] = useState<"detailed" | "simple">("detailed");
  // "all" = كل الموظفين | "department" = مجمّع بالأقسام
  const [groupBy, setGroupBy] = useState<"all" | "department">("all");
  // Toggle: include employees on leave with blank salary fields
  const [includeOnLeave, setIncludeOnLeave] = useState(false);

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];

  const payrollData = useQuery(
    api.hr.previewPayrollRun,
    company ? { companyId: company._id, periodYear: year, periodMonth: month } : "skip"
  );

  // Employees currently marked as on_leave in their profile
  const onLeaveEmployees = useQuery(
    api.hr.listEmployees,
    company ? { companyId: company._id, status: "on_leave" } : "skip"
  );

  // Approved leave requests — to catch employees on leave during the selected month
  const approvedLeaveRequests = useQuery(
    api.hr.listLeaveRequests,
    company ? { companyId: company._id, status: "approved" } : "skip"
  );

  const loading = payrollData === undefined;

  // If user typed a manual value, use it; otherwise fall back to attendance then formula
  const overrideDays = manualWorkDays !== "" ? Number(manualWorkDays) : null;

  const rows = useMemo(() => {
    if (!payrollData) return [];

    // Build active employee rows
    const activeRows = payrollData.map((item: any, i: number) => {
      const emp = item.employee ?? {};
      const basic = item.basicSalary ?? 0;
      const othersAllowance = (item.housingAllowance ?? 0) + (item.transportAllowance ?? 0) + (item.otherAllowance ?? 0);
      const totalSalary = basic + othersAllowance;

      const attendanceDays = item.presentDays ?? 0;
      const displayWorkDays = overrideDays !== null
        ? overrideDays
        : attendanceDays > 0
          ? attendanceDays
          : (item.workingDays || 22);

      const monthWorkDays = overrideDays !== null ? overrideDays : (item.workingDays || 22);
      const oneHourOT = monthWorkDays > 0 ? basic / (monthWorkDays * 8) : 0;
      const totalOTHours = item.overtimeHours ?? 0;
      const totalOTAmount = item.overtimePay ?? 0;
      const absentDays = item.absentDays ?? 0;
      const absentSalary = item.unpaidLeaveDeduction ?? 0;
      const netAmount = item.netSalary ?? 0;

      return {
        sn: i + 1,
        erpCode: emp.employeeCode ?? "-",
        name: isRTL ? (emp.nameAr || emp.nameEn || "-") : (emp.nameEn || emp.nameAr || "-"),
        designation: isRTL ? (item.designationNameAr || item.designationNameEn || "-") : (item.designationNameEn || item.designationNameAr || "-"),
        sponsorship: item.sponsorshipStatus || "-",
        departmentName: isRTL ? (item.departmentNameAr || item.departmentNameEn || "") : (item.departmentNameEn || item.departmentNameAr || ""),
        workingDays: displayWorkDays,
        basic,
        othersAllowance,
        totalSalary,
        oneHourOT: Math.round(oneHourOT * 100) / 100,
        totalOTHours,
        totalOTAmount,
        absentDays,
        absentSalary,
        netAmount,
        isOnLeave: false,
        _empId: item.employee?._id,
      };
    });

    if (!includeOnLeave) {
      return activeRows.map((r, i) => ({ ...r, sn: i + 1 }));
    }

    // ── Collect on-leave employee IDs ──────────────────────────────────────
    // IDs of employees already in payroll (active) — exclude them from on-leave section
    const activeIds = new Set(activeRows.map((r) => r._empId).filter(Boolean));

    // Month date bounds for leave-request overlap check
    const lastDay = new Date(year, month, 0).getDate();
    const firstDayStr = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDayStr  = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    // Collect unique on-leave employees from both sources
    const leaveEmpMap = new Map<string, any>(); // empId → employee object

    // Source 1: employees whose status = "on_leave"
    if (onLeaveEmployees) {
      for (const emp of onLeaveEmployees) {
        if (!activeIds.has(emp._id)) {
          leaveEmpMap.set(emp._id, emp);
        }
      }
    }

    // Source 2: approved leave requests overlapping the selected month
    if (approvedLeaveRequests) {
      for (const req of approvedLeaveRequests) {
        if (
          req.startDate <= lastDayStr &&
          req.endDate   >= firstDayStr &&
          !activeIds.has(req.employeeId)
        ) {
          // employee object is embedded in req.employee
          const emp = req.employee;
          if (emp && !leaveEmpMap.has(req.employeeId)) {
            leaveEmpMap.set(req.employeeId, emp);
          }
        }
      }
    }

    // Build on-leave rows (blank salary fields)
    const leaveRows = Array.from(leaveEmpMap.values()).map((emp: any) => ({
      sn: 0, // will be renumbered below
      erpCode: emp.employeeCode ?? "-",
      name: isRTL ? (emp.nameAr || emp.nameEn || "-") : (emp.nameEn || emp.nameAr || "-"),
      designation: isRTL
        ? (emp.designation?.nameAr || emp.designation?.nameEn || "-")
        : (emp.designation?.nameEn || emp.designation?.nameAr || "-"),
      sponsorship: emp.sponsorshipStatus || "-",
      departmentName: isRTL
        ? (emp.department?.nameAr || emp.department?.nameEn || "")
        : (emp.department?.nameEn || emp.department?.nameAr || ""),
      workingDays: 0,
      basic: 0,
      othersAllowance: 0,
      totalSalary: 0,
      oneHourOT: 0,
      totalOTHours: 0,
      totalOTAmount: 0,
      absentDays: 0,
      absentSalary: 0,
      netAmount: 0,
      isOnLeave: true,
      _empId: emp._id,
    }));

    // Merge: active first, then on-leave, renumber sn
    const merged = [...activeRows, ...leaveRows];
    return merged.map((r, i) => ({ ...r, sn: i + 1 }));
  }, [payrollData, isRTL, overrideDays, includeOnLeave, onLeaveEmployees, approvedLeaveRequests, year, month]);

  const totals = useMemo(() => {
    // Exclude on-leave rows from totals
    const activeOnly = rows.filter((r) => !r.isOnLeave);
    return {
      basic: activeOnly.reduce((s, r) => s + r.basic, 0),
      othersAllowance: activeOnly.reduce((s, r) => s + r.othersAllowance, 0),
      totalSalary: activeOnly.reduce((s, r) => s + r.totalSalary, 0),
      totalOTHours: activeOnly.reduce((s, r) => s + r.totalOTHours, 0),
      totalOTAmount: activeOnly.reduce((s, r) => s + r.totalOTAmount, 0),
      absentDays: activeOnly.reduce((s, r) => s + r.absentDays, 0),
      absentSalary: activeOnly.reduce((s, r) => s + r.absentSalary, 0),
      netAmount: activeOnly.reduce((s, r) => s + r.netAmount, 0),
    };
  }, [rows]);

  const monthLabel = isRTL
    ? `${MONTH_NAMES_AR[month - 1]} ${year}`
    : `${MONTH_NAMES_EN[month - 1]} ${year}`;

  const sheetTitle = isRTL
    ? `كشف الرواتب لشهر ${monthLabel}`
    : `SALARY SHEET FOR THE MONTH OF ${MONTH_NAMES_EN[month - 1].toUpperCase()} ${year}`;

  async function exportToExcel() {
    const XLSX = await import("xlsx");
    const headers = isRTL
      ? ["م", "الكود", "اسم الموظف", "أيام العمل", "الراتب الأساسي", "البدلات الأخرى", "إجمالي الراتب", "ساعة أوفرتايم", "إجمالي ساعات OT", "مبلغ OT", "أيام الغياب", "قيمة الغياب", "صافي المبلغ"]
      : ["SN", "ERP CODE", "Employee Name", "Working Days", "Basic Salary QR", "Others Allowance QR", "Total Salary QR", "One Hour OT", "Total OT Hours", "Total OT Amount QR", "Absent Days", "Absent Salary QR", "Net Amount QR"];

    const dataRows = rows.map(r => r.isOnLeave
      ? [r.sn, r.erpCode, r.name + (isRTL ? " [إجازة]" : " [On Leave]"), "", "", "", "", "", "", "", "", "", ""]
      : [
          r.sn, r.erpCode, r.name, r.workingDays,
          r.basic, r.othersAllowance, r.totalSalary,
          r.oneHourOT, r.totalOTHours, r.totalOTAmount,
          r.absentDays, r.absentSalary, r.netAmount,
        ]
    );

    const totRow = [
      "", "", isRTL ? "الإجمالي" : "TOTAL", "",
      totals.basic, totals.othersAllowance, totals.totalSalary,
      "", totals.totalOTHours, totals.totalOTAmount,
      totals.absentDays, totals.absentSalary, totals.netAmount,
    ];

    const ws = XLSX.utils.aoa_to_sheet([
      [sheetTitle],
      [],
      headers,
      ...dataRows,
      totRow,
    ]);
    ws["!cols"] = [5, 8, 22, 8, 12, 12, 12, 10, 10, 12, 8, 12, 12].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isRTL ? "كشف الرواتب" : "Salary Sheet");
    XLSX.writeFile(wb, `salary-sheet-${year}-${String(month).padStart(2, "0")}.xlsx`);
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      {/* Header — hidden in print */}
      <div className="print:hidden">
        <PageHeader
          icon={FileText}
          title={isRTL ? "كشف الرواتب" : "Salary Sheet"}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="h-9 px-4 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 inline-flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                {isRTL ? "طباعة" : "Print"}
              </button>
              <button
                onClick={exportToExcel}
                disabled={loading || rows.length === 0}
                className="h-9 px-4 rounded-lg border border-green-200 text-green-700 bg-green-50 text-sm font-medium hover:bg-green-100 inline-flex items-center gap-2 disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {isRTL ? "تنزيل Excel" : "Download Excel"}
              </button>
            </div>
          }
        />
      </div>

      {/* Month/Year selector — hidden in print */}
      <div className="print:hidden bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Year */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">{isRTL ? "السنة" : "Year"}</label>
            <input
              type="number"
              value={year}
              min={2020}
              max={2099}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 px-3 border border-gray-200 rounded-md text-sm w-[90px] focus:outline-none focus:border-gray-400"
            />
          </div>

          {/* Month */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">{isRTL ? "الشهر" : "Month"}</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-9 px-3 border border-gray-200 rounded-md text-sm w-[130px] bg-white focus:outline-none focus:border-gray-400"
            >
              {MONTH_NAMES_EN.map((m, i) => (
                <option key={i + 1} value={i + 1}>{isRTL ? MONTH_NAMES_AR[i] : m}</option>
              ))}
            </select>
          </div>

          {/* Divider */}
          <div className="h-9 w-px bg-gray-200 self-end mb-0" />

          {/* Manual working days */}
          <div className={`flex flex-col gap-1 px-3 py-2 rounded-lg border transition-colors ${manualWorkDays !== "" ? "border-amber-300 bg-amber-50" : "border-dashed border-gray-300 bg-gray-50/60"}`}>
            <label className={`text-[10px] font-bold uppercase ${manualWorkDays !== "" ? "text-amber-700" : "text-gray-500"}`}>
              {isRTL ? "أيام العمل (يدوي)" : "Working Days (Manual)"}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={31}
                placeholder={isRTL ? "تلقائي" : "Auto"}
                value={manualWorkDays}
                onChange={(e) => setManualWorkDays(e.target.value)}
                className={`h-9 px-3 rounded-md text-sm w-[90px] tabular-nums focus:outline-none transition-colors ${manualWorkDays !== "" ? "border-2 border-amber-400 bg-white font-bold text-amber-900 focus:border-amber-500" : "border border-gray-200 bg-white focus:border-gray-400"}`}
              />
              {manualWorkDays !== "" && (
                <button
                  onClick={() => setManualWorkDays("")}
                  className="h-9 px-2.5 rounded-md border border-amber-300 text-xs text-amber-600 hover:bg-amber-100 font-bold"
                >
                  ✕
                </button>
              )}
            </div>
            <p className={`text-[10px] ${manualWorkDays !== "" ? "text-amber-600 font-semibold" : "text-gray-400"}`}>
              {manualWorkDays !== ""
                ? (isRTL ? `✓ ${manualWorkDays} يوم لكل الموظفين` : `✓ ${manualWorkDays} days for all`)
                : (isRTL ? "من سجلات الحضور" : "From attendance")}
            </p>
          </div>

          {/* Divider */}
          <div className="h-9 w-px bg-gray-200 self-end mb-0" />

          {/* Sheet Format toggle */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">
              {isRTL ? "تنسيق الكشف" : "Sheet Format"}
            </label>
            <div className="flex rounded-md border border-gray-200 overflow-hidden h-9 text-sm">
              <button
                onClick={() => setSheetFormat("detailed")}
                className={`px-4 font-medium transition-colors ${sheetFormat === "detailed" ? "text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                style={sheetFormat === "detailed" ? { background: "var(--brand-700)" } : {}}
              >
                {isRTL ? "تفصيلي" : "Detailed"}
              </button>
              <button
                onClick={() => setSheetFormat("simple")}
                className={`px-4 font-medium transition-colors border-l border-gray-200 ${sheetFormat === "simple" ? "text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                style={sheetFormat === "simple" ? { background: "var(--brand-700)" } : {}}
              >
                {isRTL ? "مبسّط" : "Simple"}
              </button>
            </div>
          </div>

          {/* Group By toggle */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">
              {isRTL ? "تجميع" : "Group By"}
            </label>
            <div className="flex rounded-md border border-gray-200 overflow-hidden h-9 text-sm">
              <button
                onClick={() => setGroupBy("all")}
                className={`px-4 font-medium transition-colors ${groupBy === "all" ? "text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                style={groupBy === "all" ? { background: "var(--brand-700)" } : {}}
              >
                {isRTL ? "الكل" : "All"}
              </button>
              <button
                onClick={() => setGroupBy("department")}
                className={`px-4 font-medium transition-colors border-l border-gray-200 ${groupBy === "department" ? "text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                style={groupBy === "department" ? { background: "var(--brand-700)" } : {}}
              >
                {isRTL ? "بالأقسام" : "By Dept."}
              </button>
            </div>
          </div>

          {/* Include on-leave toggle */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">
              {isRTL ? "الموظفون في إجازة" : "On Leave"}
            </label>
            <button
              onClick={() => setIncludeOnLeave((v) => !v)}
              className={`h-9 px-4 rounded-md border text-sm font-medium inline-flex items-center gap-2 transition-colors ${
                includeOnLeave
                  ? "border-blue-400 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              <BedDouble className="h-4 w-4" />
              {includeOnLeave
                ? (isRTL ? "إخفاء الإجازات" : "Hide On Leave")
                : (isRTL ? "إظهار الإجازات" : "Show On Leave")}
            </button>
          </div>

          {rows.length > 0 && (
            <div className={`${isRTL ? "mr-auto" : "ml-auto"} self-end pb-1 text-sm text-gray-500`}>
              {(() => {
                const activeCount = rows.filter((r) => !r.isOnLeave).length;
                const leaveCount = rows.filter((r) => r.isOnLeave).length;
                if (leaveCount > 0) {
                  return isRTL
                    ? `${activeCount} موظف نشط · ${leaveCount} في إجازة`
                    : `${activeCount} active · ${leaveCount} on leave`;
                }
                return isRTL ? `${activeCount} موظف` : `${activeCount} employees`;
              })()}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingState label={isRTL ? "جاري التحميل..." : "Loading..."} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden print:overflow-visible print:border-0 print:rounded-none print:bg-transparent">
          {/* Sheet title — screen only */}
          <div className="print:hidden px-4 py-3 border-b border-gray-200">
            <h2 className="text-center font-bold text-base uppercase tracking-wide">{sheetTitle}</h2>
          </div>

          {/* ── SIMPLE FORMAT ── */}
          {sheetFormat === "simple" ? (
            <SimpleSheetView rows={rows} groupBy={groupBy} isRTL={isRTL} monthLabel={monthLabel} sheetTitle={sheetTitle} />
          ) : (

          /* ── DETAILED FORMAT ── */
          <div className="overflow-x-auto print:overflow-visible salary-sheet-printable">
            {/* Print-only title row */}
            <div className="hidden print:block text-center py-2 mb-1">
              <div className="text-[11px] font-bold uppercase tracking-widest text-gray-800">{sheetTitle}</div>
            </div>
            <table
              className="border-collapse w-full salary-sheet-table"
              dir={isRTL ? "rtl" : "ltr"}
              style={{ fontSize: "10.5px" }}
            >
              <thead>
                <tr style={{ background: "#6b1523", color: "#fff", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                  {[
                    { label: isRTL ? "م" : "SN", w: undefined },
                    { label: isRTL ? "الكود" : "CODE", w: undefined },
                    { label: isRTL ? "اسم الموظف" : "EMPLOYEE NAME", w: 160 },
                    { label: isRTL ? "أيام" : "DAYS", w: undefined },
                    { label: isRTL ? "الأساسي QR" : "BASIC QR", w: undefined },
                    { label: isRTL ? "البدلات QR" : "ALLOW. QR", w: undefined },
                    { label: isRTL ? "الإجمالي QR" : "TOTAL QR", w: undefined, accent: "#7d1e2c" },
                    { label: isRTL ? "ساعة OT" : "1HR OT", w: undefined },
                    { label: isRTL ? "ساعات OT" : "OT HRS", w: undefined },
                    { label: isRTL ? "مبلغ OT QR" : "OT AMT QR", w: undefined },
                    { label: isRTL ? "غياب" : "ABSENT", w: undefined },
                    { label: isRTL ? "خصم QR" : "ABS.SAL QR", w: undefined },
                    { label: isRTL ? "الصافي QR" : "NET QR", w: undefined, accent: "#7d1e2c" },
                    { label: isRTL ? "التوقيع" : "SIGN", w: 70 },
                  ].map(({ label, w, accent }) => (
                    <th key={label} style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "6px 4px", textAlign: "center", fontWeight: 700, whiteSpace: "nowrap", color: "#fff", fontSize: "10px", minWidth: w, background: accent ?? "#6b1523" }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="text-center py-8 text-gray-400 border border-gray-200">
                      {isRTL ? "لا يوجد موظفون نشطون لهذا الشهر" : "No active employees for this period"}
                    </td>
                  </tr>
                ) : rows.map((r, idx) => (
                  r.isOnLeave ? (
                    /* ── On-Leave Row (Detailed) ── */
                    <tr key={`leave-${r.erpCode}`} style={{ background: "#eff6ff", fontStyle: "italic" }}>
                      <td className="border border-blue-200 px-1 py-1.5 text-center text-gray-400">{r.sn}</td>
                      <td className="border border-blue-200 px-1 py-1.5 text-center font-bold text-blue-700">{r.erpCode}</td>
                      <td className="border border-blue-200 px-2 py-1.5 font-semibold text-blue-900" style={{maxWidth:"200px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}} title={r.name}>
                        {r.name}
                        <span className="ms-1.5 inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold bg-blue-200 text-blue-800 not-italic align-middle">
                          {isRTL ? "إجازة" : "LEAVE"}
                        </span>
                      </td>
                      {/* All salary columns blank */}
                      {Array.from({ length: 11 }).map((_, ci) => (
                        <td key={ci} className="border border-blue-200 px-1 py-1.5 text-center text-gray-300">—</td>
                      ))}
                      <td className="border border-blue-200 px-1 py-1.5" style={{minWidth:"70px"}}>&nbsp;</td>
                    </tr>
                  ) : (
                    <tr key={r.sn} style={{ background: idx % 2 === 0 ? "#fff" : "#f5f7fa" }}>
                      <td className="border border-gray-300 px-1 py-1.5 text-center text-gray-500">{r.sn}</td>
                      <td className="border border-gray-300 px-1 py-1.5 text-center font-bold text-blue-900">{r.erpCode}</td>
                      <td className="border border-gray-300 px-2 py-1.5 font-semibold text-gray-900" style={{maxWidth:"200px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}} title={r.name}>{r.name}</td>
                      <td className="border border-gray-300 px-1 py-1.5 text-center tabular-nums">{r.workingDays}</td>
                      <td className="border border-gray-300 px-1 py-1.5 text-right tabular-nums pr-2">{r.basic.toLocaleString()}</td>
                      <td className="border border-gray-300 px-1 py-1.5 text-right tabular-nums pr-2">{r.othersAllowance.toLocaleString()}</td>
                      <td className="border border-gray-300 px-1 py-1.5 text-right tabular-nums pr-2 font-bold text-blue-900" style={{background: idx % 2 === 0 ? "#eef2fb" : "#e5ebf7"}}>{r.totalSalary.toLocaleString()}</td>
                      <td className="border border-gray-300 px-1 py-1.5 text-center tabular-nums text-gray-500">{r.oneHourOT.toFixed(2)}</td>
                      <td className="border border-gray-300 px-1 py-1.5 text-center tabular-nums">{r.totalOTHours || 0}</td>
                      <td className="border border-gray-300 px-1 py-1.5 text-right tabular-nums pr-2">{r.totalOTAmount.toFixed(2)}</td>
                      <td className="border border-gray-300 px-1 py-1.5 text-center tabular-nums">{r.absentDays || 0}</td>
                      <td className="border border-gray-300 px-1 py-1.5 text-right tabular-nums pr-2 text-red-700">{r.absentSalary.toFixed(2)}</td>
                      <td className="border border-gray-300 px-1 py-1.5 text-right tabular-nums pr-2 font-bold text-emerald-800" style={{background: idx % 2 === 0 ? "#ecfdf5" : "#d1fae5"}}>{r.netAmount.toFixed(2)}</td>
                      <td className="border border-gray-300 px-1 py-1.5" style={{minWidth:"70px"}}>&nbsp;</td>
                    </tr>
                  )
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr style={{ background: "#6b1523", color: "#fff", fontWeight: "bold", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                    <td colSpan={4} style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "6px 8px", textAlign: "center", fontSize: "12px", letterSpacing: "0.05em", color: "#fff" }}>
                      {isRTL ? "الإجمالي" : "TOTAL"}
                    </td>
                    <td style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "6px 4px", textAlign: "right", color: "#fff" }}>{totals.basic.toLocaleString()}</td>
                    <td style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "6px 4px", textAlign: "right", color: "#fff" }}>{totals.othersAllowance.toLocaleString()}</td>
                    <td style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "6px 4px", textAlign: "right", color: "#fde68a", fontWeight: 800 }}>{totals.totalSalary.toLocaleString()}</td>
                    <td style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "6px 4px", textAlign: "center", color: "#fff" }}>—</td>
                    <td style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "6px 4px", textAlign: "center", color: "#fff" }}>{totals.totalOTHours}</td>
                    <td style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "6px 4px", textAlign: "right", color: "#fff" }}>{totals.totalOTAmount.toFixed(2)}</td>
                    <td style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "6px 4px", textAlign: "center", color: "#fff" }}>{totals.absentDays}</td>
                    <td style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "6px 4px", textAlign: "right", color: "#fff" }}>{totals.absentSalary.toFixed(2)}</td>
                    <td style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "6px 4px", textAlign: "right", color: "#6ee7b7", fontWeight: 800 }}>{totals.netAmount.toFixed(2)}</td>
                    <td style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "6px 4px" }}></td>
                  </tr>
                </tfoot>
              )}
            </table>

            {/* Signatures row — print only */}
            <div className="hidden print:flex justify-between mt-8 px-2 text-[10px] text-gray-600">
              <div className="text-center">
                <div className="border-t border-gray-400 pt-1 mt-6 w-40">{isRTL ? "اعتمد" : "Approved by"}</div>
              </div>
              <div className="text-center">
                <div className="border-t border-gray-400 pt-1 mt-6 w-40">{isRTL ? "مدير الموارد البشرية" : "HR Manager"}</div>
              </div>
              <div className="text-center">
                <div className="border-t border-gray-400 pt-1 mt-6 w-40">{isRTL ? "المحاسبة" : "Accounts"}</div>
              </div>
            </div>
          </div>
          )}
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page { size: A3 landscape; margin: 10mm 12mm; }

          /* Hide all page chrome — sidebar, nav, headers, controls */
          body * { visibility: hidden; }

          /* Show only the printable table zone */
          .salary-sheet-printable,
          .salary-sheet-printable * { visibility: visible; }

          /* Let the printable block flow naturally so multi-page works */
          .salary-sheet-printable {
            position: static !important;
            width: 100% !important;
            overflow: visible !important;
          }

          /* Force background colors to print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Repeat thead on every printed page */
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }

          /* Don't split a row across pages */
          tbody tr { page-break-inside: avoid; break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
