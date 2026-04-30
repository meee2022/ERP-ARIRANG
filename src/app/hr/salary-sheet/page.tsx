// @ts-nocheck
"use client";

import React, { useState, useMemo, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import { FileSpreadsheet, Printer, FileText } from "lucide-react";
import dynamic from "next/dynamic";

const PdfDownloadButton = dynamic(() => import("@/components/ui/PdfDownloadButton"), { ssr: false });

const MONTH_NAMES_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_NAMES_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

// ─── Simple Sheet (مبسّط) ─────────────────────────────────────────────────────

function SimpleGroupTable({ groupLabel, groupRows, startSn, isRTL }: any) {
  const groupTotal = groupRows.reduce((s: number, r: any) => s + r.totalSalary, 0);
  return (
    <div className="mb-6">
      {/* Department header — dark blue like screenshot */}
      <div className="bg-[#1e3a5f] text-white text-center font-bold py-2 text-sm uppercase tracking-wide">
        {groupLabel}
      </div>
      <table className="w-full text-sm border-collapse salary-sheet-table" dir={isRTL ? "rtl" : "ltr"}>
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 px-3 py-3 text-center font-bold">{isRTL ? "م" : "SL.NO"}</th>
            <th className="border border-gray-400 px-3 py-3 text-center font-bold">{isRTL ? "الكود" : "ERP CODE"}</th>
            <th className="border border-gray-400 px-3 py-3 text-center font-bold min-w-[180px]">{isRTL ? "الاسم" : "NAME"}</th>
            <th className="border border-gray-400 px-3 py-3 text-center font-bold">{isRTL ? "المسمى الوظيفي" : "DESIGNATION"}</th>
            <th className="border border-gray-400 px-3 py-3 text-center font-bold">{isRTL ? "الكفالة" : "Sponsorship"}</th>
            <th className="border border-gray-400 px-3 py-3 text-center font-bold">{isRTL ? "أيام العمل" : "TOTAL WORKING DAYS"}</th>
            <th className="border border-gray-400 px-3 py-3 text-center font-bold">{isRTL ? "إجمالي الراتب" : "TOTAL SALARY"}</th>
            <th className="border border-gray-400 px-3 py-3 text-center font-bold print:w-28">{isRTL ? "التوقيع" : "SIGNATURE"}</th>
          </tr>
        </thead>
        <tbody>
          {groupRows.map((r: any, i: number) => (
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
      <div className="p-4 salary-sheet-table">
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
                  {rows.reduce((s: number, r: any) => s + r.totalSalary, 0).toLocaleString()}
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
    <div className="p-4">
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

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];

  const payrollData = useQuery(
    api.hr.previewPayrollRun,
    company ? { companyId: company._id, periodYear: year, periodMonth: month } : "skip"
  );

  const loading = payrollData === undefined;

  // If user typed a manual value, use it; otherwise fall back to attendance then formula
  const overrideDays = manualWorkDays !== "" ? Number(manualWorkDays) : null;

  const rows = useMemo(() => {
    if (!payrollData) return [];
    return payrollData.map((item: any, i: number) => {
      const emp = item.employee ?? {};
      const basic = item.basicSalary ?? 0;
      const othersAllowance = (item.housingAllowance ?? 0) + (item.transportAllowance ?? 0) + (item.otherAllowance ?? 0);
      const totalSalary = basic + othersAllowance;

      // Working days: manual override > actual attendance > formula
      const attendanceDays = item.presentDays ?? 0;
      const displayWorkDays = overrideDays !== null
        ? overrideDays
        : attendanceDays > 0
          ? attendanceDays
          : (item.workingDays || 22);

      // OT hourly rate always uses month's total working days (formula-based) for fairness
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
      };
    });
  }, [payrollData, isRTL, overrideDays]);

  const totals = useMemo(() => ({
    basic: rows.reduce((s, r) => s + r.basic, 0),
    othersAllowance: rows.reduce((s, r) => s + r.othersAllowance, 0),
    totalSalary: rows.reduce((s, r) => s + r.totalSalary, 0),
    totalOTHours: rows.reduce((s, r) => s + r.totalOTHours, 0),
    totalOTAmount: rows.reduce((s, r) => s + r.totalOTAmount, 0),
    absentDays: rows.reduce((s, r) => s + r.absentDays, 0),
    absentSalary: rows.reduce((s, r) => s + r.absentSalary, 0),
    netAmount: rows.reduce((s, r) => s + r.netAmount, 0),
  }), [rows]);

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

    const dataRows = rows.map(r => [
      r.sn, r.erpCode, r.name, r.workingDays,
      r.basic, r.othersAllowance, r.totalSalary,
      r.oneHourOT, r.totalOTHours, r.totalOTAmount,
      r.absentDays, r.absentSalary, r.netAmount,
    ]);

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
      <div className="print:hidden bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">{isRTL ? "السنة" : "Year"}</label>
          <input
            type="number"
            value={year}
            min={2020}
            max={2099}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-10 px-3 border border-gray-200 rounded-md text-sm w-[100px] focus:outline-none focus:border-gray-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">{isRTL ? "الشهر" : "Month"}</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="h-10 px-3 border border-gray-200 rounded-md text-sm min-w-[140px] bg-white focus:outline-none focus:border-gray-400"
          >
            {MONTH_NAMES_EN.map((m, i) => (
              <option key={i + 1} value={i + 1}>{isRTL ? MONTH_NAMES_AR[i] : m}</option>
            ))}
          </select>
        </div>

        {/* Manual working days override */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">
            {isRTL ? "أيام العمل (يدوي)" : "Working Days (manual)"}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={31}
              placeholder={isRTL ? "من الحضور" : "From attendance"}
              value={manualWorkDays}
              onChange={(e) => setManualWorkDays(e.target.value)}
              className="h-10 px-3 border border-gray-200 rounded-md text-sm w-[140px] focus:outline-none focus:border-gray-400 tabular-nums"
            />
            {manualWorkDays !== "" && (
              <button
                onClick={() => setManualWorkDays("")}
                className="h-10 px-3 rounded-md border border-gray-200 text-xs text-gray-500 hover:bg-gray-50"
              >
                {isRTL ? "إعادة تعيين" : "Reset"}
              </button>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {manualWorkDays !== ""
              ? (isRTL ? `✓ سيستخدم ${manualWorkDays} يوم للكل` : `✓ Using ${manualWorkDays} days for all`)
              : (isRTL ? "تلقائي: من سجلات الحضور" : "Auto: from attendance records")}
          </p>
        </div>

        {/* Format toggle */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">
            {isRTL ? "تنسيق الكشف" : "Sheet Format"}
          </label>
          <div className="flex rounded-md border border-gray-200 overflow-hidden h-10 text-sm">
            <button
              onClick={() => setSheetFormat("detailed")}
              className={`flex-1 px-3 font-medium transition-colors ${sheetFormat === "detailed" ? "bg-gray-800 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              {isRTL ? "تفصيلي" : "Detailed"}
            </button>
            <button
              onClick={() => setSheetFormat("simple")}
              className={`flex-1 px-3 font-medium transition-colors border-l border-gray-200 ${sheetFormat === "simple" ? "bg-gray-800 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              {isRTL ? "مبسّط" : "Simple"}
            </button>
          </div>
        </div>

        {/* Group by toggle */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">
            {isRTL ? "تجميع" : "Group By"}
          </label>
          <div className="flex rounded-md border border-gray-200 overflow-hidden h-10 text-sm">
            <button
              onClick={() => setGroupBy("all")}
              className={`flex-1 px-3 font-medium transition-colors ${groupBy === "all" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              {isRTL ? "الكل" : "All"}
            </button>
            <button
              onClick={() => setGroupBy("department")}
              className={`flex-1 px-3 font-medium transition-colors border-l border-gray-200 ${groupBy === "department" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              {isRTL ? "بالأقسام" : "By Dept."}
            </button>
          </div>
        </div>

        {rows.length > 0 && (
          <div className={`${isRTL ? "mr-auto" : "ml-auto"} text-sm text-gray-500`}>
            {isRTL ? `${rows.length} موظف` : `${rows.length} employees`}
          </div>
        )}
      </div>

      {loading ? (
        <LoadingState label={isRTL ? "جاري التحميل..." : "Loading..."} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Print header */}
          <div className="print:block hidden text-center py-4 border-b border-gray-300">
            <div className="text-xs text-gray-500">{company?.nameAr || company?.nameEn || ""}</div>
          </div>

          {/* Sheet title */}
          <div className="px-4 py-3 border-b border-gray-200 print:border-black print:border-2">
            <h2 className="text-center font-bold text-base uppercase tracking-wide">{sheetTitle}</h2>
          </div>

          {/* ── SIMPLE FORMAT ── */}
          {sheetFormat === "simple" ? (
            <SimpleSheetView rows={rows} groupBy={groupBy} isRTL={isRTL} monthLabel={monthLabel} sheetTitle={sheetTitle} />
          ) : (

          /* ── DETAILED FORMAT ── */
          <div className="overflow-x-auto">
            <table
              className="border-collapse salary-sheet-table"
              dir={isRTL ? "rtl" : "ltr"}
              style={{ fontSize: "11px", minWidth: "100%" }}
            >
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="border border-gray-300 px-1 py-2 text-center font-bold w-8">{isRTL ? "م" : "SN"}</th>
                  <th className="border border-gray-300 px-1 py-2 text-center font-bold w-14">{isRTL ? "الكود" : "CODE"}</th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-bold" style={{minWidth:"140px", maxWidth:"180px", width:"180px"}}>{isRTL ? "اسم الموظف" : "Employee Name"}</th>
                  <th className="border border-gray-300 px-1 py-2 text-center font-bold w-14">{isRTL ? "أيام" : "Days"}</th>
                  <th className="border border-gray-300 px-1 py-2 text-center font-bold bg-gray-50 w-20">
                    {isRTL ? "الأساسي" : "Basic"} <span className="text-red-600">QR</span>
                  </th>
                  <th className="border border-gray-300 px-1 py-2 text-center font-bold bg-gray-50 w-20">
                    {isRTL ? "البدلات" : "Allow."} <span className="text-red-600">QR</span>
                  </th>
                  <th className="border border-gray-300 px-1 py-2 text-center font-bold bg-gray-50 w-20">
                    {isRTL ? "الإجمالي" : "Total"} <span className="text-red-600">QR</span>
                  </th>
                  <th className="border border-gray-300 px-1 py-2 text-center font-bold w-16">
                    {isRTL ? "ساعة OT" : "1hr OT"}
                  </th>
                  <th className="border border-gray-300 px-1 py-2 text-center font-bold w-14">
                    {isRTL ? "ساعات OT" : "OT Hrs"}
                  </th>
                  <th className="border border-gray-300 px-1 py-2 text-center font-bold w-20">
                    {isRTL ? "مبلغ OT" : "OT Amt"} <span className="text-red-600">QR</span>
                  </th>
                  <th className="border border-gray-300 px-1 py-2 text-center font-bold w-14">
                    {isRTL ? "غياب" : "Absent"}
                  </th>
                  <th className="border border-gray-300 px-1 py-2 text-center font-bold w-20">
                    {isRTL ? "خصم غياب" : "Abs.Sal"} <span className="text-red-600">QR</span>
                  </th>
                  <th className="border border-gray-300 px-1 py-2 text-center font-bold bg-gray-100 w-20">
                    {isRTL ? "الصافي" : "Net"} <span className="text-red-600">QR</span>
                  </th>
                  <th className="border border-gray-300 px-1 py-2 text-center font-bold w-20 print:w-24">
                    {isRTL ? "التوقيع" : "Sign"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="text-center py-8 text-gray-400 border border-gray-300">
                      {isRTL ? "لا يوجد موظفون نشطون لهذا الشهر" : "No active employees for this period"}
                    </td>
                  </tr>
                ) : rows.map((r) => (
                  <tr key={r.sn} className="hover:bg-gray-50 border-b border-gray-200">
                    <td className="border border-gray-200 px-1 py-1.5 text-center">{r.sn}</td>
                    <td className="border border-gray-200 px-1 py-1.5 text-center font-bold">{r.erpCode}</td>
                    <td className="border border-gray-200 px-2 py-1.5 font-medium" style={{maxWidth:"180px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}} title={r.name}>{r.name}</td>
                    <td className="border border-gray-200 px-1 py-1.5 text-center tabular-nums">{r.workingDays}</td>
                    <td className="border border-gray-200 px-1 py-1.5 text-center tabular-nums">{r.basic.toLocaleString()}</td>
                    <td className="border border-gray-200 px-1 py-1.5 text-center tabular-nums">{r.othersAllowance.toLocaleString()}</td>
                    <td className="border border-gray-200 px-1 py-1.5 text-center tabular-nums font-semibold">{r.totalSalary.toLocaleString()}</td>
                    <td className="border border-gray-200 px-1 py-1.5 text-center tabular-nums">{r.oneHourOT.toFixed(2)}</td>
                    <td className="border border-gray-200 px-1 py-1.5 text-center tabular-nums">{r.totalOTHours}</td>
                    <td className="border border-gray-200 px-1 py-1.5 text-center tabular-nums">{r.totalOTAmount.toFixed(2)}</td>
                    <td className="border border-gray-200 px-1 py-1.5 text-center tabular-nums">{r.absentDays}</td>
                    <td className="border border-gray-200 px-1 py-1.5 text-center tabular-nums">{r.absentSalary.toFixed(2)}</td>
                    <td className="border border-gray-200 px-1 py-1.5 text-center tabular-nums font-bold text-gray-900">{r.netAmount.toFixed(2)}</td>
                    <td className="border border-gray-200 px-1 py-1.5 print:h-8">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
                    <td colSpan={4} className="border border-gray-300 px-2 py-2 text-center font-bold">
                      {isRTL ? "الإجمالي" : "TOTAL"}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center tabular-nums">{totals.basic.toLocaleString()}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center tabular-nums">{totals.othersAllowance.toLocaleString()}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center tabular-nums">{totals.totalSalary.toLocaleString()}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center">—</td>
                    <td className="border border-gray-300 px-2 py-2 text-center tabular-nums">{totals.totalOTHours}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center tabular-nums">{totals.totalOTAmount.toFixed(2)}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center tabular-nums">{totals.absentDays}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center tabular-nums">{totals.absentSalary.toFixed(2)}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center tabular-nums text-base">{totals.netAmount.toFixed(2)}</td>
                    <td className="border border-gray-300 px-2 py-2"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          )}

          {/* Print footer */}
          <div className="print:block hidden border-t border-gray-300 mt-6 pt-4 px-4 pb-4">
            <div className="flex justify-between text-xs text-gray-500">
              <div>{isRTL ? "اعتمد:" : "Approved by:"} ___________________</div>
              <div>{isRTL ? "الموارد البشرية:" : "HR Manager:"} ___________________</div>
              <div>{isRTL ? "المحاسبة:" : "Accounts:"} ___________________</div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .salary-sheet-table, .salary-sheet-table * { visibility: visible; }
          .salary-sheet-table { position: absolute; top: 0; left: 0; width: 100%; }
          @page { size: A3 landscape; margin: 10mm; }
        }
      `}</style>
    </div>
  );
}
