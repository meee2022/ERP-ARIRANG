// @ts-nocheck
"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Users, Search, Plus, Edit2, Eye, ChevronDown, UserCheck,
  Briefcase, DollarSign, Filter, Trash2, AlertTriangle, RefreshCw, ShieldAlert,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-full mt-2 mb-1">
      <div className="text-[11px] font-bold uppercase tracking-widest text-[color:var(--brand-700)] border-b border-[color:var(--ink-100)] pb-1.5">
        {children}
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  on_leave: "bg-blue-50 text-blue-700 border-blue-200",
  inactive: "bg-gray-100 text-gray-500 border-gray-200",
  terminated: "bg-red-50 text-red-700 border-red-200",
};

const EMP_TYPE_COLORS: Record<string, string> = {
  full_time: "bg-indigo-50 text-indigo-700 border-indigo-200",
  part_time: "bg-amber-50 text-amber-700 border-amber-200",
  contractor: "bg-purple-50 text-purple-700 border-purple-200",
  temporary: "bg-orange-50 text-orange-700 border-orange-200",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border ${STATUS_COLORS[status] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}>
      {status?.replace("_", " ")}
    </span>
  );
}

function EmpTypeBadge({ type }: { type: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${EMP_TYPE_COLORS[type] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}>
      {type?.replace("_", " ")}
    </span>
  );
}

// ─── Employee Form Modal ──────────────────────────────────────────────────────

const EMPTY_FORM = {
  employeeCode: "",
  nameAr: "",
  nameEn: "",
  hireDate: "",
  employmentType: "full_time",
  departmentId: "",
  designationId: "",
  managerId: "",
  basicSalary: 0,
  housingAllowance: 0,
  transportAllowance: 0,
  otherAllowance: 0,
  salaryBasis: "monthly",
  nationalId: "",
  nationality: "",
  phone: "",
  mobile: "",
  email: "",
  gender: "",
  dateOfBirth: "",
  notes: "",
  qidExpiryDate: "",
  sponsorshipStatus: "",
  passportNumber: "",
  passportExpiryDate: "",
};

function EmployeeFormModal({
  employee,
  departments,
  designations,
  employees,
  branchId,
  onClose,
}: {
  employee?: any;
  departments: any[];
  designations: any[];
  employees: any[];
  branchId: string | undefined;
  onClose: () => void;
}) {
  const { t, isRTL } = useI18n();
  const createEmployee = useMutation(api.hr.createEmployee);
  const updateEmployee = useMutation(api.hr.updateEmployee);

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    ...(employee
      ? {
          employeeCode: employee.employeeCode ?? "",
          nameAr: employee.nameAr ?? "",
          nameEn: employee.nameEn ?? "",
          hireDate: employee.hireDate ?? "",
          employmentType: employee.employmentType ?? "full_time",
          departmentId: employee.departmentId ?? "",
          designationId: employee.designationId ?? "",
          managerId: employee.managerId ?? "",
          basicSalary: employee.basicSalary ?? 0,
          housingAllowance: employee.housingAllowance ?? 0,
          transportAllowance: employee.transportAllowance ?? 0,
          otherAllowance: employee.otherAllowance ?? 0,
          salaryBasis: employee.salaryBasis ?? "monthly",
          nationalId: employee.nationalId ?? "",
          nationality: employee.nationality ?? "",
          phone: employee.phone ?? "",
          mobile: employee.mobile ?? "",
          email: employee.email ?? "",
          gender: employee.gender ?? "",
          dateOfBirth: employee.dateOfBirth ?? "",
          notes: employee.notes ?? "",
          qidExpiryDate: employee.qidExpiryDate ?? "",
          sponsorshipStatus: employee.sponsorshipStatus ?? "",
          passportNumber: employee.passportNumber ?? "",
          passportExpiryDate: employee.passportExpiryDate ?? "",
        }
      : {}),
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function f(key: string) {
    return (e: any) => setForm((p) => ({ ...p, [key]: e.target.value }));
  }

  async function onSave() {
    if (!form.nameAr.trim()) { setErr("اسم الموظف بالعربي مطلوب"); return; }
    if (!form.employeeCode.trim()) { setErr("كود الموظف مطلوب"); return; }
    if (!form.hireDate) { setErr("تاريخ التعيين مطلوب"); return; }
    if (!employee && !branchId) { setErr("لا يوجد فرع مُعرَّف"); return; }
    setSaving(true); setErr(null);
    try {
      if (employee) {
        await updateEmployee({
          id: employee._id,
          nameAr: form.nameAr || undefined,
          nameEn: form.nameEn || undefined,
          hireDate: form.hireDate || undefined,
          employmentType: form.employmentType as any || undefined,
          departmentId: form.departmentId as any || undefined,
          designationId: form.designationId as any || undefined,
          managerId: form.managerId as any || undefined,
          basicSalary: Number(form.basicSalary) || undefined,
          housingAllowance: Number(form.housingAllowance) || undefined,
          transportAllowance: Number(form.transportAllowance) || undefined,
          otherAllowance: Number(form.otherAllowance) || undefined,
          salaryBasis: form.salaryBasis as any || undefined,
          nationalId: form.nationalId || undefined,
          nationality: form.nationality || undefined,
          phone: form.phone || undefined,
          mobile: form.mobile || undefined,
          email: form.email || undefined,
          gender: form.gender as any || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          notes: form.notes || undefined,
          qidExpiryDate: form.qidExpiryDate || undefined,
          sponsorshipStatus: form.sponsorshipStatus || undefined,
          passportNumber: form.passportNumber || undefined,
          passportExpiryDate: form.passportExpiryDate || undefined,
        });
      } else {
        await createEmployee({
          branchId: branchId as any,
          employeeCode: form.employeeCode,
          nameAr: form.nameAr,
          nameEn: form.nameEn || undefined,
          hireDate: form.hireDate,
          employmentType: form.employmentType as any,
          departmentId: form.departmentId as any || undefined,
          designationId: form.designationId as any || undefined,
          managerId: form.managerId as any || undefined,
          basicSalary: Number(form.basicSalary) || 0,
          housingAllowance: Number(form.housingAllowance) || undefined,
          transportAllowance: Number(form.transportAllowance) || undefined,
          otherAllowance: Number(form.otherAllowance) || undefined,
          salaryBasis: form.salaryBasis as any,
          nationalId: form.nationalId || undefined,
          nationality: form.nationality || undefined,
          phone: form.phone || undefined,
          mobile: form.mobile || undefined,
          email: form.email || undefined,
          gender: form.gender as any || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          notes: form.notes || undefined,
        });
      }
      onClose();
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,19,22,0.55)] p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        className="surface-card max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-[color:var(--ink-900)]">
            {employee ? t("editEmployee") : t("addEmployee")}
          </h2>
          <button
            onClick={onClose}
            className="text-[color:var(--ink-400)] hover:text-[color:var(--brand-700)] text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[color:var(--brand-50)]"
          >
            ×
          </button>
        </div>

        {err && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
            {err}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ── Basic Info ── */}
          <SectionTitle>{t("basicInfo") || "البيانات الأساسية"}</SectionTitle>

          <Field label={t("employeeCode")} required>
            <input
              className="input-field"
              value={form.employeeCode}
              onChange={f("employeeCode")}
              disabled={!!employee}
              placeholder="EMP-001"
            />
          </Field>

          <Field label={t("nameAr")} required>
            <input className="input-field" value={form.nameAr} onChange={f("nameAr")} dir="rtl" />
          </Field>

          <Field label={t("nameEn")}>
            <input className="input-field" value={form.nameEn} onChange={f("nameEn")} />
          </Field>

          <Field label={t("hireDate")} required>
            <input className="input-field" type="date" value={form.hireDate} onChange={f("hireDate")} />
          </Field>

          <Field label={t("employmentType")}>
            <select className="input-field" value={form.employmentType} onChange={f("employmentType")}>
              <option value="full_time">{t("fullTime") || "Full Time"}</option>
              <option value="part_time">{t("partTime") || "Part Time"}</option>
              <option value="contractor">{t("contractor") || "Contractor"}</option>
              <option value="temporary">{t("temporary") || "Temporary"}</option>
            </select>
          </Field>

          <Field label={t("gender")}>
            <select className="input-field" value={form.gender} onChange={f("gender")}>
              <option value="">{t("select") || "اختر"}</option>
              <option value="male">{t("male") || "ذكر"}</option>
              <option value="female">{t("female") || "أنثى"}</option>
            </select>
          </Field>

          {/* ── Work Assignment ── */}
          <SectionTitle>{t("workAssignment") || "التعيين الوظيفي"}</SectionTitle>

          <Field label={t("department")}>
            <select className="input-field" value={form.departmentId} onChange={f("departmentId")}>
              <option value="">{t("select") || "اختر"}</option>
              {departments.map((d: any) => (
                <option key={d._id} value={d._id}>
                  {isRTL ? d.nameAr : (d.nameEn || d.nameAr)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("designation")}>
            <select className="input-field" value={form.designationId} onChange={f("designationId")}>
              <option value="">{t("select") || "اختر"}</option>
              {designations
                .filter((d: any) => !form.departmentId || d.departmentId === form.departmentId || !d.departmentId)
                .map((d: any) => (
                  <option key={d._id} value={d._id}>
                    {isRTL ? d.nameAr : (d.nameEn || d.nameAr)}
                  </option>
                ))}
            </select>
          </Field>

          <Field label={t("manager")}>
            <select className="input-field" value={form.managerId} onChange={f("managerId")}>
              <option value="">{t("none") || "لا يوجد"}</option>
              {employees
                .filter((e: any) => e._id !== employee?._id)
                .map((e: any) => (
                  <option key={e._id} value={e._id}>
                    {isRTL ? e.nameAr : (e.nameEn || e.nameAr)} ({e.employeeCode})
                  </option>
                ))}
            </select>
          </Field>

          {/* ── Salary ── */}
          <SectionTitle>{t("salaryInfo") || "بيانات الراتب"}</SectionTitle>

          <Field label={t("basicSalary")} required>
            <input className="input-field" type="number" value={form.basicSalary} onChange={f("basicSalary")} min="0" />
          </Field>

          <Field label={t("housingAllowance")}>
            <input className="input-field" type="number" value={form.housingAllowance} onChange={f("housingAllowance")} min="0" />
          </Field>

          <Field label={t("transportAllowance")}>
            <input className="input-field" type="number" value={form.transportAllowance} onChange={f("transportAllowance")} min="0" />
          </Field>

          <Field label={t("otherAllowance")}>
            <input className="input-field" type="number" value={form.otherAllowance} onChange={f("otherAllowance")} min="0" />
          </Field>

          <Field label={t("salaryBasis")}>
            <select className="input-field" value={form.salaryBasis} onChange={f("salaryBasis")}>
              <option value="monthly">{t("monthly") || "شهري"}</option>
              <option value="daily">{t("daily") || "يومي"}</option>
              <option value="hourly">{t("hourly") || "ساعي"}</option>
            </select>
          </Field>

          {/* ── Personal & Contact ── */}
          <SectionTitle>{t("personalAndContact") || "البيانات الشخصية والتواصل"}</SectionTitle>

          <Field label={t("nationalId") || "QID / Iqama"}>
            <input className="input-field" value={form.nationalId} onChange={f("nationalId")} />
          </Field>

          <Field label="QID Expiry Date">
            <input className="input-field" type="date" value={form.qidExpiryDate} onChange={f("qidExpiryDate")} />
          </Field>

          <Field label="Sponsorship">
            <input className="input-field" value={form.sponsorshipStatus} onChange={f("sponsorshipStatus")} placeholder="e.g. Arirang Bakery / Outside" />
          </Field>

          <Field label={t("nationality")}>
            <input className="input-field" value={form.nationality} onChange={f("nationality")} />
          </Field>

          <Field label="Passport No.">
            <input className="input-field" value={form.passportNumber} onChange={f("passportNumber")} />
          </Field>

          <Field label="Passport Expiry">
            <input className="input-field" type="date" value={form.passportExpiryDate} onChange={f("passportExpiryDate")} />
          </Field>

          <Field label={t("dateOfBirth")}>
            <input className="input-field" type="date" value={form.dateOfBirth} onChange={f("dateOfBirth")} />
          </Field>

          <Field label={t("phone")}>
            <input className="input-field" type="tel" value={form.phone} onChange={f("phone")} />
          </Field>

          <Field label={t("mobile")}>
            <input className="input-field" type="tel" value={form.mobile} onChange={f("mobile")} />
          </Field>

          <Field label={t("email")}>
            <input className="input-field" type="email" value={form.email} onChange={f("email")} />
          </Field>

          <div className="md:col-span-3">
            <Field label={t("notes")}>
              <textarea
                className="input-field w-full resize-none"
                rows={2}
                value={form.notes}
                onChange={f("notes")}
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-[color:var(--ink-100)]">
          <button
            onClick={onClose}
            className="btn-ghost h-10 px-5 rounded-lg text-sm font-semibold"
            disabled={saving}
          >
            {t("cancel")}
          </button>
          <button
            onClick={onSave}
            className="btn-primary h-10 px-6 rounded-lg text-sm font-semibold"
            disabled={saving}
          >
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Status Dropdown ──────────────────────────────────────────────────────────

function StatusDropdown({ employee }: { employee: any }) {
  const { t } = useI18n();
  const updateStatus = useMutation(api.hr.updateEmployeeStatus);
  const [open, setOpen] = useState(false);
  const statuses = ["active", "inactive", "on_leave", "terminated"];

  async function change(status: string) {
    setOpen(false);
    try {
      await updateStatus({ id: employee._id, status: status as any });
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1"
      >
        <StatusBadge status={employee.status} />
        <ChevronDown className="h-3 w-3 text-gray-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-6 start-0 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden min-w-[130px]">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => change(s)}
                className={`w-full text-start px-3 py-2 text-xs font-medium hover:bg-gray-50 flex items-center gap-2 ${employee.status === s ? "bg-gray-50" : ""}`}
              >
                <StatusBadge status={s} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function DeleteEmployeeButton({ employeeId }: { employeeId: any }) {
  const { t, isRTL } = useI18n();
  const removeEmployee = useMutation(api.hr.deleteEmployee);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const ok = window.confirm(
      isRTL ? "هل تريد حذف هذا الموظف؟" : "Do you want to delete this employee?"
    );
    if (!ok) return;

    try {
      setLoading(true);
      await removeEmployee({ id: employeeId });
    } catch (e: any) {
      alert(e.message || t("errUnexpected"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title={t("delete")}
      className="h-8 w-8 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-red-600 hover:border-red-200 flex items-center justify-center transition-all hover:shadow-sm disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}


export default function EmployeesPage() {
  const { t, isRTL, formatCurrency } = useI18n();

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<any>(null);

  const seedStaff = useMutation(api.seedStaff.seedRealStaff);
  const [seeding, setSeeding] = useState(false);
  const [showAlerts, setShowAlerts] = useState(true);

  const qidAlerts = useQuery(api.hr.getQidExpiryAlerts, {});

  const handleSeedStaff = async () => {
    if (!confirm(isRTL ? "سيتم حذف جميع الموظفين الحاليين وإضافة 76 موظف من الملف. هل أنت متأكد؟" : "This will delete all current employees and add 76 from the Excel file. Confirm?")) return;
    setSeeding(true);
    try {
      const res = await seedStaff({});
      alert(isRTL ? `تم بنجاح! ${(res as any).total} موظف` : `Done! ${(res as any).total} employees added`);
    } catch (e: any) { alert(e.message); }
    finally { setSeeding(false); }
  };

  // Queries
  const employees = useQuery(api.hr.listEmployees, {
    status: statusFilter || undefined,
    search: search.trim() || undefined,
  }) ?? [];

  const departments = useQuery(api.hr.listDepartments, {}) ?? [];
  const designations = useQuery(api.hr.listDesignations, {}) ?? [];

  // Branch: get first branch from companies → branches
  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;
  const branches = useQuery(api.branches.getAll, companyId ? { companyId } : "skip") ?? [];
  const branchId = branches[0]?._id;

  // Client-side department filter
  const filtered = useMemo(() => {
    let list = employees;
    if (deptFilter) list = list.filter((e: any) => e.departmentId === deptFilter);
    return list;
  }, [employees, deptFilter]);

  function openAdd() {
    setEditEmployee(null);
    setShowModal(true);
  }

  function openEdit(emp: any) {
    setEditEmployee(emp);
    setShowModal(true);
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      {/* Page Header */}
      <PageHeader
        icon={Users}
        title={t("employeeRegister") || "سجل الموظفين"}
        badge={
          <span className="text-xs text-[color:var(--ink-400)] font-normal">
            ({filtered.length})
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSeedStaff}
              disabled={seeding}
              className="h-10 px-3 rounded-lg inline-flex items-center gap-2 text-sm font-semibold border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${seeding ? "animate-spin" : ""}`} />
              {seeding ? (isRTL ? "جاري الاستيراد..." : "Importing...") : (isRTL ? "استيراد موظفين Excel" : "Import from Excel")}
            </button>
            <button
              onClick={openAdd}
              className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              {t("addEmployee") || "إضافة موظف"}
            </button>
          </div>
        }
      />

      {/* ── QID / Iqama Expiry Alerts ────────────────────────────────────── */}
      {qidAlerts && (qidAlerts.expired.length > 0 || qidAlerts.nearExpiry.length > 0 || qidAlerts.expiringSoon.length > 0) && (
        <div className="rounded-xl border overflow-hidden">
          <button
            onClick={() => setShowAlerts((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-red-50 border-b border-red-200 hover:bg-red-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              <span className="font-bold text-red-700 text-sm">
                {isRTL ? "تنبيهات انتهاء الإقامة / QID" : "QID / Iqama Expiry Alerts"}
              </span>
              <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {qidAlerts.expired.length + qidAlerts.nearExpiry.length + qidAlerts.expiringSoon.length}
              </span>
            </div>
            <span className="text-xs text-red-500">{showAlerts ? "▲" : "▼"}</span>
          </button>
          {showAlerts && (
            <div className="bg-white p-4 space-y-4">
              {/* Expired */}
              {qidAlerts.expired.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-xs font-bold text-red-700 uppercase tracking-wider">
                      {isRTL ? `منتهية الصلاحية (${qidAlerts.expired.length})` : `Expired (${qidAlerts.expired.length})`}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {qidAlerts.expired.map((e: any) => (
                      <div key={e._id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                        <div>
                          <span className="text-sm font-semibold text-red-800">{e.nameEn}</span>
                          <span className="text-xs text-red-500 mx-2">#{e.employeeCode}</span>
                          {e.sponsorshipStatus && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">{e.sponsorshipStatus}</span>}
                        </div>
                        <div className="text-end">
                          <div className="text-xs font-bold text-red-700">{e.qidExpiryDate}</div>
                          <div className="text-[10px] text-red-500">{Math.abs(e.daysLeft)} {isRTL ? "يوم منذ الانتهاء" : "days overdue"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Near Expiry 0-30 days */}
              {qidAlerts.nearExpiry.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                      {isRTL ? `تنتهي خلال 30 يوم (${qidAlerts.nearExpiry.length})` : `Expiring in 30 days (${qidAlerts.nearExpiry.length})`}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {qidAlerts.nearExpiry.map((e: any) => (
                      <div key={e._id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                        <div>
                          <span className="text-sm font-semibold text-amber-800">{e.nameEn}</span>
                          <span className="text-xs text-amber-500 mx-2">#{e.employeeCode}</span>
                          {e.sponsorshipStatus && <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">{e.sponsorshipStatus}</span>}
                        </div>
                        <div className="text-end">
                          <div className="text-xs font-bold text-amber-700">{e.qidExpiryDate}</div>
                          <div className="text-[10px] text-amber-600">{e.daysLeft} {isRTL ? "يوم متبقي" : "days left"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Expiring 31-60 days */}
              {qidAlerts.expiringSoon.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                      {isRTL ? `تنتهي خلال 60 يوم (${qidAlerts.expiringSoon.length})` : `Expiring in 60 days (${qidAlerts.expiringSoon.length})`}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {qidAlerts.expiringSoon.map((e: any) => (
                      <div key={e._id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
                        <div>
                          <span className="text-sm font-semibold text-blue-800">{e.nameEn}</span>
                          <span className="text-xs text-blue-400 mx-2">#{e.employeeCode}</span>
                          {e.sponsorshipStatus && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">{e.sponsorshipStatus}</span>}
                        </div>
                        <div className="text-end">
                          <div className="text-xs font-bold text-blue-700">{e.qidExpiryDate}</div>
                          <div className="text-[10px] text-blue-500">{e.daysLeft} {isRTL ? "يوم متبقي" : "days left"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap items-center gap-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? "right-3" : "left-3"}`}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchEmployees") || "بحث عن موظف..."}
            className={`w-full h-10 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[color:var(--brand-400)] transition-colors`}
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[color:var(--brand-400)] bg-white min-w-[140px]"
        >
          <option value="">{t("allStatuses") || "جميع الحالات"}</option>
          <option value="active">{t("active") || "نشط"}</option>
          <option value="inactive">{t("inactive") || "غير نشط"}</option>
          <option value="on_leave">{t("onLeave") || "في إجازة"}</option>
          <option value="terminated">{t("terminated") || "منتهي الخدمة"}</option>
        </select>

        {/* Department Filter */}
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[color:var(--brand-400)] bg-white min-w-[160px]"
        >
          <option value="">{t("allDepartments") || "جميع الأقسام"}</option>
          {departments.map((d: any) => (
            <option key={d._id} value={d._id}>
              {isRTL ? d.nameAr : (d.nameEn || d.nameAr)}
            </option>
          ))}
        </select>

        {/* Stats chips */}
        <div className="flex items-center gap-2 ms-auto">
          <div className="h-8 px-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-bold flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5" />
            {employees.filter((e: any) => e.status === "active").length} {t("active") || "نشط"}
          </div>
          <div className="h-8 px-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            {filtered.length} {t("total") || "إجمالي"}
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-[color:var(--ink-100)] overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("noEmployeesYet") || "لا يوجد موظفون"}
            message={t("addFirstEmployee") || "أضف أول موظف للبدء"}
            action={
              <button
                onClick={openAdd}
                className="btn-primary h-10 px-5 rounded-xl inline-flex items-center gap-2 text-sm font-semibold"
              >
                <Plus className="h-4 w-4" />
                {t("addEmployee") || "إضافة موظف"}
              </button>
            }
          />
        ) : (
          <>
          <div className="mobile-list p-3 space-y-2.5">
            {filtered.map((emp: any) => (
              <div key={emp._id} className="record-card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--ink-100)] text-[var(--ink-600)] inline-block mb-1">{emp.employeeCode}</span>
                    <p className="text-[14px] font-bold text-[var(--ink-900)]">{isRTL ? emp.nameAr : (emp.nameEn || emp.nameAr)}</p>
                    <p className="text-[11.5px] text-[var(--ink-500)] mt-0.5">{emp.jobTitle ?? "—"} {emp.departmentName ? `· ${emp.departmentName}` : ""}</p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="text-[14px] font-bold tabular-nums text-[var(--ink-900)]">{formatCurrency(emp.basicSalary ?? 0)}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${emp.isActive !== false ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-400 border-gray-200"}`}>
                      {emp.isActive !== false ? t("active") : t("inactive")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="desktop-table overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse" dir={isRTL ? "rtl" : "ltr"}>
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  {[
                    t("code") || "الكود",
                    t("name") || "الاسم",
                    t("department") || "القسم",
                    t("designation") || "المسمى",
                    t("hireDate") || "تاريخ التعيين",
                    t("employmentType") || "نوع التوظيف",
                    t("status") || "الحالة",
                    t("basicSalary") || "الراتب الأساسي",
                    t("actions") || "الإجراءات",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((emp: any) => (
                  <tr key={emp._id} className="group hover:bg-gray-50/80 transition-colors">
                    {/* Code */}
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200 font-mono">
                        {emp.employeeCode}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-[color:var(--ink-900)]">
                        {isRTL ? emp.nameAr : (emp.nameEn || emp.nameAr)}
                      </div>
                      {emp.nameEn && isRTL && (
                        <div className="text-[11px] text-gray-400 mt-0.5">{emp.nameEn}</div>
                      )}
                    </td>

                    {/* Department */}
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      {emp.department
                        ? (isRTL ? emp.department.nameAr : (emp.department.nameEn || emp.department.nameAr))
                        : "—"}
                    </td>

                    {/* Designation */}
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      {emp.designation
                        ? (isRTL ? emp.designation.nameAr : (emp.designation.nameEn || emp.designation.nameAr))
                        : "—"}
                    </td>

                    {/* Hire Date */}
                    <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                      {emp.hireDate ?? "—"}
                    </td>

                    {/* Employment Type */}
                    <td className="px-5 py-3.5">
                      <EmpTypeBadge type={emp.employmentType} />
                    </td>

                    {/* Status (clickable dropdown) */}
                    <td className="px-5 py-3.5">
                      <StatusDropdown employee={emp} />
                    </td>

                    {/* Salary */}
                    <td className="px-5 py-3.5 text-sm font-semibold text-[color:var(--ink-800)] tabular-nums whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                        {formatCurrency(emp.basicSalary ?? 0)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(emp)}
                          title={t("edit")}
                          className="h-8 w-8 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-blue-600 hover:border-blue-200 flex items-center justify-center transition-all hover:shadow-sm"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <Link
                          href={`/hr/employees/${emp._id}`}
                          title={t("viewProfile") || "عرض الملف"}
                          className="h-8 w-8 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-[color:var(--brand-600)] hover:border-[color:var(--brand-200)] flex items-center justify-center transition-all hover:shadow-sm"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <DeleteEmployeeButton employeeId={emp._id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <EmployeeFormModal
          employee={editEmployee}
          departments={departments}
          designations={designations}
          employees={employees}
          branchId={branchId}
          onClose={() => { setShowModal(false); setEditEmployee(null); }}
        />
      )}
    </div>
  );
}
