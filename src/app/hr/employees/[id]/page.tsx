// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import {
  User, Briefcase, DollarSign, Phone, Calendar, Clock,
  ChevronLeft, Edit2, Plus, CheckCircle, XCircle,
  AlertCircle, Plane, FileText, BarChart2,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import Link from "next/link";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  on_leave: "bg-blue-50 text-blue-700 border-blue-200",
  inactive: "bg-gray-100 text-gray-500 border-gray-200",
  terminated: "bg-red-50 text-red-700 border-red-200",
};

const ATTENDANCE_COLORS: Record<string, string> = {
  present: "bg-green-100 text-green-700",
  absent: "bg-red-100 text-red-700",
  late: "bg-amber-100 text-amber-700",
  half_day: "bg-orange-100 text-orange-700",
  on_leave: "bg-blue-100 text-blue-700",
  holiday: "bg-purple-100 text-purple-700",
  weekend: "bg-gray-100 text-gray-500",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-tight border ${STATUS_COLORS[status] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}>
      {status?.replace("_", " ")}
    </span>
  );
}

function InfoCard({ title, icon: Icon, children }: { title: string; icon?: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
        {Icon && <Icon className="h-4 w-4 text-[color:var(--brand-600)]" />}
        <span className="text-xs font-bold uppercase tracking-widest text-[color:var(--ink-600)]">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: any }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 font-medium shrink-0">{label}</span>
      <span className="text-sm font-semibold text-[color:var(--ink-800)] text-end">{value ?? "—"}</span>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </div>
      {children}
    </label>
  );
}

// ─── Leave Request Modal ──────────────────────────────────────────────────────

function LeaveRequestModal({ employeeId, leaveTypes, onClose }: { employeeId: string; leaveTypes: any[]; onClose: () => void }) {
  const { t, isRTL } = useI18n();
  const createLeave = useMutation(api.hr.createLeaveRequest);

  const [form, setForm] = useState({
    leaveTypeId: leaveTypes[0]?._id ?? "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function calcDays() {
    if (!form.startDate || !form.endDate) return 0;
    const diff = new Date(form.endDate).getTime() - new Date(form.startDate).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
  }

  async function onSave() {
    if (!form.leaveTypeId) { setErr("نوع الإجازة مطلوب"); return; }
    if (!form.startDate) { setErr("تاريخ البدء مطلوب"); return; }
    if (!form.endDate) { setErr("تاريخ الانتهاء مطلوب"); return; }
    const totalDays = calcDays();
    if (totalDays <= 0) { setErr("تواريخ غير صحيحة"); return; }
    setSaving(true); setErr(null);
    try {
      await createLeave({
        employeeId: employeeId as any,
        leaveTypeId: form.leaveTypeId as any,
        startDate: form.startDate,
        endDate: form.endDate,
        totalDays,
        reason: form.reason || undefined,
      });
      onClose();
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,19,22,0.55)] p-4" onClick={() => !saving && onClose()}>
      <div className="surface-card max-w-md w-full p-6" onClick={(e) => e.stopPropagation()} dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[color:var(--ink-900)]">{t("requestLeave") || "طلب إجازة"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        {err && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{err}</div>}
        <div className="space-y-4">
          <Field label={t("leaveType") || "نوع الإجازة"} required>
            <select className="input-field" value={form.leaveTypeId} onChange={(e) => setForm((p) => ({ ...p, leaveTypeId: e.target.value }))}>
              <option value="">{t("select") || "اختر"}</option>
              {leaveTypes.map((lt: any) => (
                <option key={lt._id} value={lt._id}>
                  {isRTL ? lt.nameAr : (lt.nameEn || lt.nameAr)}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("startDate") || "من"} required>
              <input className="input-field" type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
            </Field>
            <Field label={t("endDate") || "إلى"} required>
              <input className="input-field" type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
            </Field>
          </div>
          {calcDays() > 0 && (
            <div className="rounded-lg bg-[color:var(--brand-50)] border border-[color:var(--brand-200)] px-3 py-2 text-sm font-semibold text-[color:var(--brand-700)]">
              {t("totalDays") || "إجمالي الأيام"}: {calcDays()}
            </div>
          )}
          <Field label={t("reason") || "السبب"}>
            <textarea className="input-field w-full resize-none" rows={2} value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
          </Field>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onClose} className="btn-ghost h-10 px-4 rounded-lg text-sm font-semibold" disabled={saving}>{t("cancel")}</button>
          <button onClick={onSave} className="btn-primary h-10 px-5 rounded-lg text-sm font-semibold" disabled={saving}>
            {saving ? t("saving") : t("submit") || "إرسال"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Employee Modal (inline) ────────────────────────────────────────────

function EditEmployeeModal({ employee, departments, designations, onClose }: { employee: any; departments: any[]; designations: any[]; onClose: () => void }) {
  const { t, isRTL } = useI18n();
  const updateEmployee = useMutation(api.hr.updateEmployee);

  const [form, setForm] = useState({
    nameAr: employee.nameAr ?? "",
    nameEn: employee.nameEn ?? "",
    email: employee.email ?? "",
    phone: employee.phone ?? "",
    mobile: employee.mobile ?? "",
    departmentId: employee.departmentId ?? "",
    designationId: employee.designationId ?? "",
    basicSalary: employee.basicSalary ?? 0,
    housingAllowance: employee.housingAllowance ?? 0,
    transportAllowance: employee.transportAllowance ?? 0,
    notes: employee.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSave() {
    if (!form.nameAr.trim()) { setErr("الاسم بالعربي مطلوب"); return; }
    setSaving(true); setErr(null);
    try {
      await updateEmployee({
        id: employee._id,
        nameAr: form.nameAr,
        nameEn: form.nameEn || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        mobile: form.mobile || undefined,
        departmentId: form.departmentId as any || undefined,
        designationId: form.designationId as any || undefined,
        basicSalary: Number(form.basicSalary) || undefined,
        housingAllowance: Number(form.housingAllowance) || undefined,
        transportAllowance: Number(form.transportAllowance) || undefined,
        notes: form.notes || undefined,
      });
      onClose();
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  function f(key: string) {
    return (e: any) => setForm((p) => ({ ...p, [key]: e.target.value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,19,22,0.55)] p-4" onClick={() => !saving && onClose()}>
      <div className="surface-card max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()} dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[color:var(--ink-900)]">{t("editEmployee") || "تعديل الموظف"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        {err && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{err}</div>}
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("nameAr")} required><input className="input-field" value={form.nameAr} onChange={f("nameAr")} dir="rtl" /></Field>
          <Field label={t("nameEn")}><input className="input-field" value={form.nameEn} onChange={f("nameEn")} /></Field>
          <Field label={t("email")}><input className="input-field" type="email" value={form.email} onChange={f("email")} /></Field>
          <Field label={t("phone")}><input className="input-field" value={form.phone} onChange={f("phone")} /></Field>
          <Field label={t("mobile")}><input className="input-field" value={form.mobile} onChange={f("mobile")} /></Field>
          <Field label={t("department")}>
            <select className="input-field" value={form.departmentId} onChange={f("departmentId")}>
              <option value="">{t("select") || "اختر"}</option>
              {departments.map((d: any) => <option key={d._id} value={d._id}>{isRTL ? d.nameAr : (d.nameEn || d.nameAr)}</option>)}
            </select>
          </Field>
          <Field label={t("designation")}>
            <select className="input-field" value={form.designationId} onChange={f("designationId")}>
              <option value="">{t("select") || "اختر"}</option>
              {designations.map((d: any) => <option key={d._id} value={d._id}>{isRTL ? d.nameAr : (d.nameEn || d.nameAr)}</option>)}
            </select>
          </Field>
          <Field label={t("basicSalary")}><input className="input-field" type="number" value={form.basicSalary} onChange={f("basicSalary")} /></Field>
          <Field label={t("housingAllowance")}><input className="input-field" type="number" value={form.housingAllowance} onChange={f("housingAllowance")} /></Field>
          <Field label={t("transportAllowance")}><input className="input-field" type="number" value={form.transportAllowance} onChange={f("transportAllowance")} /></Field>
          <div className="col-span-2">
            <Field label={t("notes")}><textarea className="input-field w-full resize-none" rows={2} value={form.notes} onChange={f("notes")} /></Field>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onClose} className="btn-ghost h-10 px-4 rounded-lg text-sm font-semibold" disabled={saving}>{t("cancel")}</button>
          <button onClick={onSave} className="btn-primary h-10 px-5 rounded-lg text-sm font-semibold" disabled={saving}>{saving ? t("saving") : t("save")}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ["info", "attendance", "leave", "payslips"] as const;
type Tab = typeof TABS[number];

// ─── Info Tab ─────────────────────────────────────────────────────────────────

function InfoTab({ emp, isRTL, t, formatCurrency }: { emp: any; isRTL: boolean; t: any; formatCurrency: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <InfoCard title={t("personalInfo") || "البيانات الشخصية"} icon={User}>
        <InfoRow label={t("nameAr") || "الاسم بالعربي"} value={emp.nameAr} />
        <InfoRow label={t("nameEn") || "الاسم بالإنجليزي"} value={emp.nameEn} />
        <InfoRow label={t("gender") || "الجنس"} value={emp.gender ? (emp.gender === "male" ? (isRTL ? "ذكر" : "Male") : (isRTL ? "أنثى" : "Female")) : null} />
        <InfoRow label={t("dateOfBirth") || "تاريخ الميلاد"} value={emp.dateOfBirth} />
        <InfoRow label={t("nationalId") || "رقم الهوية"} value={emp.nationalId} />
        <InfoRow label={t("nationality") || "الجنسية"} value={emp.nationality} />
      </InfoCard>

      <InfoCard title={t("employmentInfo") || "بيانات التوظيف"} icon={Briefcase}>
        <InfoRow label={t("employeeCode") || "الكود"} value={emp.employeeCode} />
        <InfoRow label={t("hireDate") || "تاريخ التعيين"} value={emp.hireDate} />
        <InfoRow label={t("employmentType") || "نوع التوظيف"} value={emp.employmentType?.replace("_", " ")} />
        <InfoRow label={t("department") || "القسم"} value={emp.department ? (isRTL ? emp.department.nameAr : (emp.department.nameEn || emp.department.nameAr)) : null} />
        <InfoRow label={t("designation") || "المسمى الوظيفي"} value={emp.designation ? (isRTL ? emp.designation.nameAr : (emp.designation.nameEn || emp.designation.nameAr)) : null} />
        <InfoRow label={t("manager") || "المدير المباشر"} value={emp.manager ? (isRTL ? emp.manager.nameAr : (emp.manager.nameEn || emp.manager.nameAr)) : null} />
      </InfoCard>

      <InfoCard title={t("salaryInfo") || "بيانات الراتب"} icon={DollarSign}>
        <InfoRow label={t("basicSalary") || "الراتب الأساسي"} value={formatCurrency(emp.basicSalary ?? 0)} />
        <InfoRow label={t("housingAllowance") || "بدل السكن"} value={formatCurrency(emp.housingAllowance ?? 0)} />
        <InfoRow label={t("transportAllowance") || "بدل النقل"} value={formatCurrency(emp.transportAllowance ?? 0)} />
        <InfoRow label={t("otherAllowance") || "بدلات أخرى"} value={formatCurrency(emp.otherAllowance ?? 0)} />
        <InfoRow
          label={t("totalSalary") || "إجمالي الراتب"}
          value={
            <span className="text-[color:var(--brand-700)] font-bold">
              {formatCurrency((emp.basicSalary ?? 0) + (emp.housingAllowance ?? 0) + (emp.transportAllowance ?? 0) + (emp.otherAllowance ?? 0))}
            </span>
          }
        />
        <InfoRow label={t("salaryBasis") || "أساس الراتب"} value={emp.salaryBasis} />
      </InfoCard>

      <InfoCard title={t("contactInfo") || "بيانات التواصل"} icon={Phone}>
        <InfoRow label={t("email") || "البريد الإلكتروني"} value={emp.email} />
        <InfoRow label={t("phone") || "الهاتف"} value={emp.phone} />
        <InfoRow label={t("mobile") || "الجوال"} value={emp.mobile} />
        <InfoRow label={t("address") || "العنوان"} value={emp.address} />
        {emp.notes && (
          <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600">
            <div className="font-semibold mb-1">{t("notes") || "ملاحظات"}</div>
            {emp.notes}
          </div>
        )}
      </InfoCard>
    </div>
  );
}

// ─── Attendance Tab ───────────────────────────────────────────────────────────

function AttendanceTab({ employeeId, t }: { employeeId: string; t: any }) {
  const today = new Date();
  const fromDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

  const records = useQuery(api.hr.listAttendanceByEmployee, {
    employeeId: employeeId as any,
    fromDate,
    toDate,
  }) ?? [];

  const summary = useQuery(api.hr.getAttendanceSummary, {
    employeeId: employeeId as any,
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  });

  const summaryCards = [
    { label: t("present") || "حاضر", value: summary?.present ?? 0, color: "text-green-600 bg-green-50 border-green-200" },
    { label: t("absent") || "غائب", value: summary?.absent ?? 0, color: "text-red-600 bg-red-50 border-red-200" },
    { label: t("late") || "متأخر", value: summary?.late ?? 0, color: "text-amber-600 bg-amber-50 border-amber-200" },
    { label: t("overtime") || "إضافي (ساعة)", value: summary?.totalOvertimeHours ?? 0, color: "text-purple-600 bg-purple-50 border-purple-200" },
  ];

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((c) => (
          <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
            <div className="text-2xl font-bold tabular-nums">{c.value}</div>
            <div className="text-xs font-semibold mt-1 opacity-80">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Records */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[color:var(--brand-600)]" />
          <span className="text-xs font-bold uppercase tracking-widest text-[color:var(--ink-600)]">
            {t("attendanceRecords") || "سجل الحضور"} — {fromDate} → {toDate}
          </span>
        </div>
        {records.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">{t("noAttendanceRecords") || "لا يوجد سجل حضور"}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-start">{t("date") || "التاريخ"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-start">{t("status") || "الحالة"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-start">{t("checkIn") || "دخول"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-start">{t("checkOut") || "خروج"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-start">{t("workedHours") || "ساعات العمل"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-start">{t("overtime") || "إضافي"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...records]
                  .sort((a: any, b: any) => b.attendanceDate.localeCompare(a.attendanceDate))
                  .map((r: any) => (
                    <tr key={r._id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 text-sm font-mono text-gray-700">{r.attendanceDate}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold ${ATTENDANCE_COLORS[r.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {r.status?.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500 font-mono">{r.checkIn ?? "—"}</td>
                      <td className="px-5 py-3 text-xs text-gray-500 font-mono">{r.checkOut ?? "—"}</td>
                      <td className="px-5 py-3 text-xs text-gray-600 font-semibold">{r.workedHours != null ? `${r.workedHours}h` : "—"}</td>
                      <td className="px-5 py-3 text-xs text-purple-600 font-semibold">{r.overtimeHours != null && r.overtimeHours > 0 ? `${r.overtimeHours}h` : "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Leave Tab ────────────────────────────────────────────────────────────────

function LeaveTab({ employeeId, t, isRTL }: { employeeId: string; t: any; isRTL: boolean }) {
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const balances = useQuery(api.hr.getLeaveBalances, { employeeId: employeeId as any }) ?? [];
  const leaveRequests = useQuery(api.hr.listLeaveRequests, { employeeId: employeeId as any }) ?? [];
  const leaveTypes = useQuery(api.hr.listLeaveTypes, {}) ?? [];

  const LEAVE_REQ_COLORS: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-green-50 text-green-700 border-green-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="space-y-5">
      {/* Balance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {balances.map((b: any) => {
          const lt = b.leaveType;
          const remaining = b.allocatedDays - b.usedDays - b.pendingDays;
          return (
            <div key={b._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="text-xs font-bold text-[color:var(--brand-700)] mb-2 truncate">
                {lt ? (isRTL ? lt.nameAr : (lt.nameEn || lt.nameAr)) : "—"}
              </div>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold text-[color:var(--ink-900)] tabular-nums">{remaining}</span>
                <span className="text-xs text-gray-400 mb-0.5">/ {b.allocatedDays}</span>
              </div>
              <div className="mt-2 flex gap-2 text-[10px]">
                <span className="text-green-600 font-semibold">{b.usedDays} {t("used") || "مستخدم"}</span>
                {b.pendingDays > 0 && <span className="text-amber-600 font-semibold">{b.pendingDays} {t("pending") || "معلق"}</span>}
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[color:var(--brand-600)] rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((b.usedDays + b.pendingDays) / b.allocatedDays) * 100)}%` }}
                />
              </div>
              {lt && (
                <div className="mt-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${lt.isPaid ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                    {lt.isPaid ? (t("paid") || "مدفوعة") : (t("unpaid") || "غير مدفوعة")}
                  </span>
                </div>
              )}
            </div>
          );
        })}
        {balances.length === 0 && (
          <div className="col-span-full py-8 text-center text-sm text-gray-400">
            {t("noLeaveBalances") || "لا يوجد رصيد إجازات"}
          </div>
        )}
      </div>

      {/* Leave Requests Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[color:var(--ink-800)]">{t("leaveRequests") || "طلبات الإجازة"}</h3>
        <button
          onClick={() => setShowLeaveModal(true)}
          className="h-9 px-4 rounded-lg bg-[color:var(--brand-600)] text-white text-xs font-semibold hover:bg-[color:var(--brand-700)] inline-flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("requestLeave") || "طلب إجازة"}
        </button>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {leaveRequests.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">{t("noLeaveRequests") || "لا يوجد طلبات إجازة"}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-start">{t("leaveType") || "نوع الإجازة"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-start">{t("startDate") || "من"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-start">{t("endDate") || "إلى"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-start">{t("days") || "الأيام"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-start">{t("status") || "الحالة"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...leaveRequests]
                  .sort((a: any, b: any) => b.createdAt - a.createdAt)
                  .map((lr: any) => (
                    <tr key={lr._id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-medium text-gray-700">
                        {lr.leaveType ? (isRTL ? lr.leaveType.nameAr : (lr.leaveType.nameEn || lr.leaveType.nameAr)) : "—"}
                      </td>
                      <td className="px-5 py-3 text-gray-600 font-mono text-xs">{lr.startDate}</td>
                      <td className="px-5 py-3 text-gray-600 font-mono text-xs">{lr.endDate}</td>
                      <td className="px-5 py-3 font-bold text-[color:var(--ink-800)]">{lr.totalDays}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${LEAVE_REQ_COLORS[lr.status] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}>
                          {lr.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showLeaveModal && (
        <LeaveRequestModal
          employeeId={employeeId}
          leaveTypes={leaveTypes}
          onClose={() => setShowLeaveModal(false)}
        />
      )}
    </div>
  );
}

// ─── Payslips Tab ─────────────────────────────────────────────────────────────

function PayslipsTab({ t }: { t: any }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-16 px-8 text-center gap-4">
      <div className="h-16 w-16 rounded-2xl bg-[color:var(--brand-50)] border border-[color:var(--brand-100)] flex items-center justify-center">
        <BarChart2 className="h-7 w-7 text-[color:var(--brand-600)]" />
      </div>
      <p className="text-sm font-semibold text-[color:var(--ink-700)]">
        {t("payslipsInPayroll") || "عرض كشوف الرواتب في وحدة الرواتب"}
      </p>
      <p className="text-xs text-gray-400 max-w-xs">
        {t("viewPayrollRuns") || "View payroll runs in the Payroll module for detailed payslip information."}
      </p>
      <Link
        href="/hr/payroll"
        className="btn-primary h-10 px-5 rounded-lg text-sm font-semibold inline-flex items-center gap-2"
      >
        <FileText className="h-4 w-4" />
        {t("goToPayroll") || "الذهاب إلى الرواتب"}
      </Link>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EmployeeProfilePage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const params = useParams();
  const id = params?.id as string;

  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [showEdit, setShowEdit] = useState(false);

  const emp = useQuery(api.hr.getEmployeeById, id ? { id: id as any } : "skip");
  const departments = useQuery(api.hr.listDepartments, {}) ?? [];
  const designations = useQuery(api.hr.listDesignations, {}) ?? [];
  const updateStatus = useMutation(api.hr.updateEmployeeStatus);

  const TAB_LABELS: Record<Tab, string> = {
    info: t("info") || "البيانات",
    attendance: t("attendance") || "الحضور",
    leave: t("leave") || "الإجازات",
    payslips: t("payslips") || "الرواتب",
  };

  const TAB_ICONS: Record<Tab, React.ElementType> = {
    info: User,
    attendance: Clock,
    leave: Plane,
    payslips: DollarSign,
  };

  if (emp === undefined) {
    return (
      <div dir={isRTL ? "rtl" : "ltr"} className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-400 text-sm">{t("loading") || "جاري التحميل..."}</div>
      </div>
    );
  }

  if (!emp) {
    return (
      <div dir={isRTL ? "rtl" : "ltr"} className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-12 w-12 text-red-300" />
        <p className="text-gray-500 text-sm">{t("employeeNotFound") || "الموظف غير موجود"}</p>
        <Link href="/hr/employees" className="btn-primary h-9 px-4 rounded-lg text-sm font-semibold">
          {t("backToEmployees") || "رجوع"}
        </Link>
      </div>
    );
  }

  const deptName = emp.department
    ? (isRTL ? emp.department.nameAr : (emp.department.nameEn || emp.department.nameAr))
    : null;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Link href="/hr/employees" className="hover:text-[color:var(--brand-600)] flex items-center gap-1 font-medium transition-colors">
          <ChevronLeft className={`h-3.5 w-3.5 ${isRTL ? "rotate-180" : ""}`} />
          {t("employeeRegister") || "سجل الموظفين"}
        </Link>
        <span>/</span>
        <span className="text-[color:var(--ink-600)] font-semibold">{emp.nameAr}</span>
      </div>

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Avatar + Info */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[color:var(--brand-100)] to-[color:var(--brand-200)] flex items-center justify-center text-[color:var(--brand-700)] text-xl font-bold shadow-sm border border-[color:var(--brand-200)]">
              {(emp.nameAr ?? "?")[0]}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-[color:var(--ink-900)]">{emp.nameAr}</h1>
                {emp.nameEn && (
                  <span className="text-sm text-gray-400 font-normal">({emp.nameEn})</span>
                )}
                <StatusBadge status={emp.status} />
              </div>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-gray-500 font-medium">
                <span className="bg-gray-100 border border-gray-200 px-2 py-0.5 rounded font-mono font-bold text-gray-600">
                  {emp.employeeCode}
                </span>
                {deptName && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" />
                    {deptName}
                  </span>
                )}
                {emp.designation && (
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {isRTL ? emp.designation.nameAr : (emp.designation.nameEn || emp.designation.nameAr)}
                  </span>
                )}
                {emp.hireDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {emp.hireDate}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="h-9 px-4 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1.5 transition-all hover:shadow-sm"
            >
              <Edit2 className="h-3.5 w-3.5" />
              {t("edit") || "تعديل"}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Tab Bar */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = TAB_ICONS[tab];
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-[color:var(--brand-600)] text-[color:var(--brand-700)] bg-[color:var(--brand-50)]/30"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {TAB_LABELS[tab]}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {activeTab === "info" && (
            <InfoTab emp={emp} isRTL={isRTL} t={t} formatCurrency={formatCurrency} />
          )}
          {activeTab === "attendance" && (
            <AttendanceTab employeeId={id} t={t} />
          )}
          {activeTab === "leave" && (
            <LeaveTab employeeId={id} t={t} isRTL={isRTL} />
          )}
          {activeTab === "payslips" && (
            <PayslipsTab t={t} />
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <EditEmployeeModal
          employee={emp}
          departments={departments}
          designations={designations}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}
