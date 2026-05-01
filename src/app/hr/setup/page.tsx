// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Settings, Building2, Award, CalendarDays, Plus, Edit2,
  Power, CheckCircle, XCircle,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/store/toastStore";

// ─── Shared Helpers ───────────────────────────────────────────────────────────

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

function Modal({ title, onClose, children, saving }: { title: string; onClose: () => void; children: React.ReactNode; saving?: boolean }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,19,22,0.55)] p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        className="surface-card max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[color:var(--ink-900)]">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
      {message}
    </div>
  );
}

function TableCard({ title, icon: Icon, onAdd, addLabel, children }: {
  title: string;
  icon: React.ElementType;
  onAdd: () => void;
  addLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[color:var(--ink-100)] shadow-[0_2px_10px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[color:var(--brand-600)]" />
          <span className="text-sm font-bold text-[color:var(--ink-800)]">{title}</span>
        </div>
        <button
          onClick={onAdd}
          className="h-9 px-4 rounded-lg bg-[color:var(--brand-600)] text-white text-xs font-semibold hover:bg-[color:var(--brand-700)] inline-flex items-center gap-1.5 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {addLabel}
        </button>
      </div>
      {children}
    </div>
  );
}

// ─── DEPARTMENTS TAB ──────────────────────────────────────────────────────────

function DepartmentsTab({ t, isRTL }: { t: any; isRTL: boolean }) {
  const departments = useQuery(api.hr.listDepartments, {}) ?? [];
  const createDept = useMutation(api.hr.createDepartment);
  const updateDept = useMutation(api.hr.updateDepartment);

  const [showModal, setShowModal] = useState(false);
  const [editDept, setEditDept] = useState<any>(null);
  const [form, setForm] = useState({ code: "", nameAr: "", nameEn: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function openAdd() {
    setEditDept(null);
    setForm({ code: "", nameAr: "", nameEn: "" });
    setErr(null);
    setShowModal(true);
  }

  function openEdit(d: any) {
    setEditDept(d);
    setForm({ code: d.code ?? "", nameAr: d.nameAr ?? "", nameEn: d.nameEn ?? "" });
    setErr(null);
    setShowModal(true);
  }

  async function onSave() {
    if (!form.nameAr.trim()) { setErr("الاسم بالعربي مطلوب"); return; }
    if (!editDept && !form.code.trim()) { setErr("الكود مطلوب"); return; }
    setSaving(true); setErr(null);
    try {
      if (editDept) {
        await updateDept({
          id: editDept._id,
          nameAr: form.nameAr,
          nameEn: form.nameEn || undefined,
        });
      } else {
        await createDept({
          code: form.code,
          nameAr: form.nameAr,
          nameEn: form.nameEn || undefined,
        });
      }
      setShowModal(false);
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(d: any) {
    try {
      await updateDept({ id: d._id, isActive: !d.isActive });
    } catch (e: any) {
      toast.error(e);
    }
  }

  return (
    <>
      <TableCard
        title={t("departments") || "الأقسام"}
        icon={Building2}
        onAdd={openAdd}
        addLabel={t("addDepartment") || "إضافة قسم"}
      >
        {departments.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={t("noDepartmentsYet") || "لا يوجد أقسام"}
            action={
              <button onClick={openAdd} className="btn-primary h-10 px-5 rounded-xl inline-flex items-center gap-2 text-sm font-semibold">
                <Plus className="h-4 w-4" />
                {t("addDepartment") || "إضافة قسم"}
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir={isRTL ? "rtl" : "ltr"}>
              <thead>
                <tr style={{ background: "var(--brand-700)", color: "#fff" }}>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/70 uppercase tracking-widest text-start">{t("code") || "الكود"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/70 uppercase tracking-widest text-start">{t("nameAr") || "الاسم بالعربي"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/70 uppercase tracking-widest text-start">{t("nameEn") || "الاسم بالإنجليزي"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/70 uppercase tracking-widest text-center">{t("status") || "الحالة"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/70 uppercase tracking-widest text-end">{t("actions") || "الإجراءات"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {departments.map((d: any) => (
                  <tr key={d._id} className="group hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-[11px] font-bold bg-gray-100 border border-gray-200 text-gray-600 px-2 py-0.5 rounded">
                        {d.code}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-[color:var(--ink-900)]" dir="rtl">{d.nameAr}</td>
                    <td className="px-5 py-3.5 text-gray-500">{d.nameEn ?? "—"}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${d.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                        {d.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {d.isActive ? (t("active") || "نشط") : (t("inactive") || "غير نشط")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(d)}
                          className="h-8 w-8 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-blue-600 hover:border-blue-200 flex items-center justify-center transition-all hover:shadow-sm"
                          title={t("edit") || "تعديل"}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => toggleActive(d)}
                          className={`h-8 w-8 rounded-lg border bg-white flex items-center justify-center transition-all hover:shadow-sm ${d.isActive ? "border-gray-200 text-gray-400 hover:text-amber-500 hover:border-amber-200" : "border-green-200 text-green-500 hover:bg-green-50"}`}
                          title={d.isActive ? (t("deactivate") || "تعطيل") : (t("activate") || "تفعيل")}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>

      {showModal && (
        <Modal
          title={editDept ? (t("editDepartment") || "تعديل القسم") : (t("addDepartment") || "إضافة قسم")}
          onClose={() => setShowModal(false)}
          saving={saving}
        >
          <ErrorBanner message={err} />
          <div className="space-y-4">
            <Field label={t("code") || "الكود"} required={!editDept}>
              <input
                className="input-field"
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                disabled={!!editDept}
                placeholder="HR-DEPT-01"
              />
            </Field>
            <Field label={t("nameAr") || "الاسم بالعربي"} required>
              <input
                className="input-field"
                value={form.nameAr}
                onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))}
                dir="rtl"
              />
            </Field>
            <Field label={t("nameEn") || "الاسم بالإنجليزي"}>
              <input
                className="input-field"
                value={form.nameEn}
                onChange={(e) => setForm((p) => ({ ...p, nameEn: e.target.value }))}
              />
            </Field>
          </div>
          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
            <button onClick={() => setShowModal(false)} className="btn-ghost h-10 px-4 rounded-lg text-sm font-semibold" disabled={saving}>
              {t("cancel") || "إلغاء"}
            </button>
            <button onClick={onSave} className="btn-primary h-10 px-5 rounded-lg text-sm font-semibold" disabled={saving}>
              {saving ? (t("saving") || "جاري الحفظ...") : (t("save") || "حفظ")}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── DESIGNATIONS TAB ─────────────────────────────────────────────────────────

function DesignationsTab({ t, isRTL }: { t: any; isRTL: boolean }) {
  const designations = useQuery(api.hr.listDesignations, {}) ?? [];
  const departments = useQuery(api.hr.listDepartments, {}) ?? [];
  const createDesig = useMutation(api.hr.createDesignation);
  const updateDesig = useMutation(api.hr.updateDesignation);

  const [showModal, setShowModal] = useState(false);
  const [editDesig, setEditDesig] = useState<any>(null);
  const [form, setForm] = useState({ code: "", nameAr: "", nameEn: "", departmentId: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const deptMap: Record<string, any> = Object.fromEntries(departments.map((d: any) => [d._id, d]));

  function openAdd() {
    setEditDesig(null);
    setForm({ code: "", nameAr: "", nameEn: "", departmentId: "" });
    setErr(null);
    setShowModal(true);
  }

  function openEdit(d: any) {
    setEditDesig(d);
    setForm({ code: d.code ?? "", nameAr: d.nameAr ?? "", nameEn: d.nameEn ?? "", departmentId: d.departmentId ?? "" });
    setErr(null);
    setShowModal(true);
  }

  async function onSave() {
    if (!form.nameAr.trim()) { setErr("الاسم بالعربي مطلوب"); return; }
    if (!editDesig && !form.code.trim()) { setErr("الكود مطلوب"); return; }
    setSaving(true); setErr(null);
    try {
      if (editDesig) {
        await updateDesig({
          id: editDesig._id,
          nameAr: form.nameAr,
          nameEn: form.nameEn || undefined,
          departmentId: form.departmentId as any || undefined,
        });
      } else {
        await createDesig({
          code: form.code,
          nameAr: form.nameAr,
          nameEn: form.nameEn || undefined,
          departmentId: form.departmentId as any || undefined,
        });
      }
      setShowModal(false);
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(d: any) {
    try {
      await updateDesig({ id: d._id, isActive: !d.isActive });
    } catch (e: any) {
      toast.error(e);
    }
  }

  return (
    <>
      <TableCard
        title={t("designations") || "المسميات الوظيفية"}
        icon={Award}
        onAdd={openAdd}
        addLabel={t("addDesignation") || "إضافة مسمى"}
      >
        {designations.length === 0 ? (
          <EmptyState
            icon={Award}
            title={t("noDesignationsYet") || "لا يوجد مسميات وظيفية"}
            action={
              <button onClick={openAdd} className="btn-primary h-10 px-5 rounded-xl inline-flex items-center gap-2 text-sm font-semibold">
                <Plus className="h-4 w-4" />
                {t("addDesignation") || "إضافة مسمى"}
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir={isRTL ? "rtl" : "ltr"}>
              <thead>
                <tr style={{ background: "var(--brand-700)", color: "#fff" }}>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/70 uppercase tracking-widest text-start">{t("code") || "الكود"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/70 uppercase tracking-widest text-start">{t("nameAr") || "الاسم بالعربي"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/70 uppercase tracking-widest text-start">{t("nameEn") || "الاسم بالإنجليزي"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-start">{t("department") || "القسم"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/70 uppercase tracking-widest text-center">{t("status") || "الحالة"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/70 uppercase tracking-widest text-end">{t("actions") || "الإجراءات"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {designations.map((d: any) => {
                  const dept = d.departmentId ? deptMap[d.departmentId] : null;
                  return (
                    <tr key={d._id} className="group hover:bg-gray-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-[11px] font-bold bg-gray-100 border border-gray-200 text-gray-600 px-2 py-0.5 rounded">
                          {d.code}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-[color:var(--ink-900)]" dir="rtl">{d.nameAr}</td>
                      <td className="px-5 py-3.5 text-gray-500">{d.nameEn ?? "—"}</td>
                      <td className="px-5 py-3.5 text-gray-600 text-sm">
                        {dept ? (isRTL ? dept.nameAr : (dept.nameEn || dept.nameAr)) : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${d.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                          {d.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {d.isActive ? (t("active") || "نشط") : (t("inactive") || "غير نشط")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(d)}
                            className="h-8 w-8 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-blue-600 hover:border-blue-200 flex items-center justify-center transition-all hover:shadow-sm"
                            title={t("edit") || "تعديل"}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => toggleActive(d)}
                            className={`h-8 w-8 rounded-lg border bg-white flex items-center justify-center transition-all hover:shadow-sm ${d.isActive ? "border-gray-200 text-gray-400 hover:text-amber-500 hover:border-amber-200" : "border-green-200 text-green-500 hover:bg-green-50"}`}
                            title={d.isActive ? (t("deactivate") || "تعطيل") : (t("activate") || "تفعيل")}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>

      {showModal && (
        <Modal
          title={editDesig ? (t("editDesignation") || "تعديل المسمى الوظيفي") : (t("addDesignation") || "إضافة مسمى وظيفي")}
          onClose={() => setShowModal(false)}
          saving={saving}
        >
          <ErrorBanner message={err} />
          <div className="space-y-4">
            <Field label={t("code") || "الكود"} required={!editDesig}>
              <input
                className="input-field"
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                disabled={!!editDesig}
                placeholder="DESIG-01"
              />
            </Field>
            <Field label={t("nameAr") || "الاسم بالعربي"} required>
              <input
                className="input-field"
                value={form.nameAr}
                onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))}
                dir="rtl"
              />
            </Field>
            <Field label={t("nameEn") || "الاسم بالإنجليزي"}>
              <input
                className="input-field"
                value={form.nameEn}
                onChange={(e) => setForm((p) => ({ ...p, nameEn: e.target.value }))}
              />
            </Field>
            <Field label={t("department") || "القسم"}>
              <select
                className="input-field"
                value={form.departmentId}
                onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value }))}
              >
                <option value="">{t("none") || "لا يوجد"}</option>
                {departments.map((d: any) => (
                  <option key={d._id} value={d._id}>
                    {isRTL ? d.nameAr : (d.nameEn || d.nameAr)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
            <button onClick={() => setShowModal(false)} className="btn-ghost h-10 px-4 rounded-lg text-sm font-semibold" disabled={saving}>
              {t("cancel") || "إلغاء"}
            </button>
            <button onClick={onSave} className="btn-primary h-10 px-5 rounded-lg text-sm font-semibold" disabled={saving}>
              {saving ? (t("saving") || "جاري الحفظ...") : (t("save") || "حفظ")}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── LEAVE TYPES TAB ──────────────────────────────────────────────────────────

function LeaveTypesTab({ t, isRTL }: { t: any; isRTL: boolean }) {
  const leaveTypes = useQuery(api.hr.listLeaveTypes, {}) ?? [];
  const createLT = useMutation(api.hr.createLeaveType);
  const updateLT = useMutation(api.hr.updateLeaveType);

  const [showModal, setShowModal] = useState(false);
  const [editLT, setEditLT] = useState<any>(null);
  const [form, setForm] = useState({ code: "", nameAr: "", nameEn: "", isPaid: true, defaultDaysPerYear: 15 });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function openAdd() {
    setEditLT(null);
    setForm({ code: "", nameAr: "", nameEn: "", isPaid: true, defaultDaysPerYear: 15 });
    setErr(null);
    setShowModal(true);
  }

  function openEdit(lt: any) {
    setEditLT(lt);
    setForm({
      code: lt.code ?? "",
      nameAr: lt.nameAr ?? "",
      nameEn: lt.nameEn ?? "",
      isPaid: lt.isPaid ?? true,
      defaultDaysPerYear: lt.defaultDaysPerYear ?? 15,
    });
    setErr(null);
    setShowModal(true);
  }

  async function onSave() {
    if (!form.nameAr.trim()) { setErr("الاسم بالعربي مطلوب"); return; }
    if (!editLT && !form.code.trim()) { setErr("الكود مطلوب"); return; }
    setSaving(true); setErr(null);
    try {
      if (editLT) {
        await updateLT({
          id: editLT._id,
          nameAr: form.nameAr,
          nameEn: form.nameEn || undefined,
          isPaid: form.isPaid,
          defaultDaysPerYear: Number(form.defaultDaysPerYear),
        });
      } else {
        await createLT({
          code: form.code,
          nameAr: form.nameAr,
          nameEn: form.nameEn || undefined,
          isPaid: form.isPaid,
          defaultDaysPerYear: Number(form.defaultDaysPerYear),
        });
      }
      setShowModal(false);
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(lt: any) {
    try {
      await updateLT({ id: lt._id, isActive: !lt.isActive });
    } catch (e: any) {
      toast.error(e);
    }
  }

  return (
    <>
      <TableCard
        title={t("leaveTypes") || "أنواع الإجازات"}
        icon={CalendarDays}
        onAdd={openAdd}
        addLabel={t("addLeaveType") || "إضافة نوع إجازة"}
      >
        {leaveTypes.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={t("noLeaveTypesYet") || "لا يوجد أنواع إجازات"}
            action={
              <button onClick={openAdd} className="btn-primary h-10 px-5 rounded-xl inline-flex items-center gap-2 text-sm font-semibold">
                <Plus className="h-4 w-4" />
                {t("addLeaveType") || "إضافة نوع إجازة"}
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir={isRTL ? "rtl" : "ltr"}>
              <thead>
                <tr style={{ background: "var(--brand-700)", color: "#fff" }}>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/70 uppercase tracking-widest text-start">{t("code") || "الكود"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/70 uppercase tracking-widest text-start">{t("nameAr") || "الاسم بالعربي"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/70 uppercase tracking-widest text-start">{t("nameEn") || "الاسم بالإنجليزي"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">{t("type") || "النوع"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">{t("daysPerYear") || "أيام/سنة"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/70 uppercase tracking-widest text-center">{t("status") || "الحالة"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/70 uppercase tracking-widest text-end">{t("actions") || "الإجراءات"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leaveTypes.map((lt: any) => (
                  <tr key={lt._id} className="group hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-[11px] font-bold bg-gray-100 border border-gray-200 text-gray-600 px-2 py-0.5 rounded">
                        {lt.code}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-[color:var(--ink-900)]" dir="rtl">{lt.nameAr}</td>
                    <td className="px-5 py-3.5 text-gray-500">{lt.nameEn ?? "—"}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${lt.isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                        {lt.isPaid ? (t("paid") || "مدفوعة") : (t("unpaid") || "غير مدفوعة")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold text-[color:var(--ink-800)] tabular-nums">
                      {lt.defaultDaysPerYear}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${lt.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                        {lt.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {lt.isActive ? (t("active") || "نشط") : (t("inactive") || "غير نشط")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(lt)}
                          className="h-8 w-8 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-blue-600 hover:border-blue-200 flex items-center justify-center transition-all hover:shadow-sm"
                          title={t("edit") || "تعديل"}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => toggleActive(lt)}
                          className={`h-8 w-8 rounded-lg border bg-white flex items-center justify-center transition-all hover:shadow-sm ${lt.isActive ? "border-gray-200 text-gray-400 hover:text-amber-500 hover:border-amber-200" : "border-green-200 text-green-500 hover:bg-green-50"}`}
                          title={lt.isActive ? (t("deactivate") || "تعطيل") : (t("activate") || "تفعيل")}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>

      {showModal && (
        <Modal
          title={editLT ? (t("editLeaveType") || "تعديل نوع الإجازة") : (t("addLeaveType") || "إضافة نوع إجازة")}
          onClose={() => setShowModal(false)}
          saving={saving}
        >
          <ErrorBanner message={err} />
          <div className="space-y-4">
            <Field label={t("code") || "الكود"} required={!editLT}>
              <input
                className="input-field"
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                disabled={!!editLT}
                placeholder="ANNUAL"
              />
            </Field>
            <Field label={t("nameAr") || "الاسم بالعربي"} required>
              <input
                className="input-field"
                value={form.nameAr}
                onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))}
                dir="rtl"
                placeholder="إجازة سنوية"
              />
            </Field>
            <Field label={t("nameEn") || "الاسم بالإنجليزي"}>
              <input
                className="input-field"
                value={form.nameEn}
                onChange={(e) => setForm((p) => ({ ...p, nameEn: e.target.value }))}
                placeholder="Annual Leave"
              />
            </Field>
            <Field label={t("defaultDaysPerYear") || "الأيام الافتراضية / سنة"} required>
              <input
                className="input-field"
                type="number"
                value={form.defaultDaysPerYear}
                onChange={(e) => setForm((p) => ({ ...p, defaultDaysPerYear: Number(e.target.value) }))}
                min="0"
                max="365"
              />
            </Field>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={form.isPaid}
                  onChange={(e) => setForm((p) => ({ ...p, isPaid: e.target.checked }))}
                />
                <div className="w-10 h-5 bg-gray-200 rounded-full peer-checked:bg-[color:var(--brand-600)] transition-colors" />
                <div className="absolute top-0.5 start-0.5 h-4 w-4 bg-white rounded-full shadow transition-all peer-checked:translate-x-5 peer-checked:rtl:-translate-x-5" />
              </div>
              <span className="text-sm font-semibold text-[color:var(--ink-700)]">
                {t("paidLeave") || "إجازة مدفوعة الأجر"}
              </span>
            </label>
          </div>
          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
            <button onClick={() => setShowModal(false)} className="btn-ghost h-10 px-4 rounded-lg text-sm font-semibold" disabled={saving}>
              {t("cancel") || "إلغاء"}
            </button>
            <button onClick={onSave} className="btn-primary h-10 px-5 rounded-lg text-sm font-semibold" disabled={saving}>
              {saving ? (t("saving") || "جاري الحفظ...") : (t("save") || "حفظ")}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = ["departments", "designations", "leaveTypes"] as const;
type Tab = typeof TABS[number];

export default function HRSetupPage() {
  const { t, isRTL } = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>("departments");

  const TAB_CONFIG: Record<Tab, { label: string; icon: React.ElementType }> = {
    departments: { label: t("departments") || "الأقسام", icon: Building2 },
    designations: { label: t("designations") || "المسميات الوظيفية", icon: Award },
    leaveTypes: { label: t("leaveTypes") || "أنواع الإجازات", icon: CalendarDays },
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      {/* Header */}
      <PageHeader
        icon={Settings}
        title={t("hrSetup") || "إعدادات الموارد البشرية"}
        subtitle={t("hrSetupSubtitle") || "إدارة الأقسام والمسميات الوظيفية وأنواع الإجازات"}
      />

      {/* Tab Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {TABS.map((tab) => {
            const { label, icon: Icon } = TAB_CONFIG[tab];
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
                {label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {activeTab === "departments" && <DepartmentsTab t={t} isRTL={isRTL} />}
          {activeTab === "designations" && <DesignationsTab t={t} isRTL={isRTL} />}
          {activeTab === "leaveTypes" && <LeaveTypesTab t={t} isRTL={isRTL} />}
        </div>
      </div>
    </div>
  );
}
