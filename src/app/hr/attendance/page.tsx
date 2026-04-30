// @ts-nocheck
"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Calendar, Users, CheckCircle, XCircle, Clock, Edit2,
  ChevronDown, AlertCircle, Filter, LayoutGrid, List,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_META = {
  present:  { label: "Present",  abbr: "P", bg: "bg-green-100 text-green-800 border-green-200" },
  late:     { label: "Late",     abbr: "L", bg: "bg-amber-100 text-amber-800 border-amber-200" },
  absent:   { label: "Absent",   abbr: "A", bg: "bg-red-100 text-red-800 border-red-200" },
  half_day: { label: "Half Day", abbr: "H", bg: "bg-orange-100 text-orange-800 border-orange-200" },
  on_leave: { label: "On Leave", abbr: "V", bg: "bg-blue-100 text-blue-800 border-blue-200" },
  holiday:  { label: "Holiday",  abbr: "☆", bg: "bg-purple-100 text-purple-800 border-purple-200" },
  weekend:  { label: "Weekend",  abbr: "—", bg: "bg-gray-100 text-gray-500 border-gray-200" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, bg: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border ${meta.bg}`}>
      {meta.label}
    </span>
  );
}

function Field({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">
        {label} {required && <span className="text-[color:var(--brand-600)]">*</span>}
      </div>
      {children}
    </label>
  );
}

// ─── Edit Attendance Modal ─────────────────────────────────────────────────────

function EditAttendanceModal({
  record,
  employeeId,
  employeeName,
  attendanceDate,
  onClose,
}: {
  record: any;
  employeeId: string;
  employeeName: string;
  attendanceDate: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const upsert = useMutation(api.hr.upsertAttendance);

  const [form, setForm] = useState({
    status: record?.status ?? "present",
    checkIn: record?.checkIn ?? "",
    checkOut: record?.checkOut ?? "",
    overtimeHours: record?.overtimeHours ?? 0,
    lateMinutes: record?.lateMinutes ?? 0,
    notes: record?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSave() {
    setSaving(true);
    setErr(null);
    try {
      await upsert({
        employeeId: employeeId as any,
        attendanceDate,
        status: form.status,
        checkIn: form.checkIn || undefined,
        checkOut: form.checkOut || undefined,
        overtimeHours: Number(form.overtimeHours) || 0,
        lateMinutes: Number(form.lateMinutes) || 0,
        notes: form.notes || undefined,
      });
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
        className="surface-card max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-[color:var(--ink-900)]">Edit Attendance</h2>
            <p className="text-xs text-[color:var(--ink-500)] mt-0.5">{employeeName} · {attendanceDate}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[color:var(--ink-500)] hover:text-[color:var(--brand-700)] text-xl leading-none"
          >×</button>
        </div>

        {err && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{err}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Field label="Status" required>
              <select
                className="input-field w-full"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {Object.entries(STATUS_META).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Check In">
            <input
              type="time"
              className="input-field w-full"
              value={form.checkIn}
              onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
            />
          </Field>
          <Field label="Check Out">
            <input
              type="time"
              className="input-field w-full"
              value={form.checkOut}
              onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
            />
          </Field>
          <Field label="Overtime Hours">
            <input
              type="number"
              min={0}
              step={0.5}
              className="input-field w-full"
              value={form.overtimeHours}
              onChange={(e) => setForm({ ...form, overtimeHours: e.target.value })}
            />
          </Field>
          <Field label="Late Minutes">
            <input
              type="number"
              min={0}
              className="input-field w-full"
              value={form.lateMinutes}
              onChange={(e) => setForm({ ...form, lateMinutes: e.target.value })}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Notes">
              <textarea
                className="input-field w-full resize-none"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="btn-ghost h-10 px-4 rounded-lg text-sm font-semibold"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="btn-primary h-10 px-5 rounded-lg text-sm font-semibold"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Daily View ───────────────────────────────────────────────────────────────

function DailyView({ isRTL }: { isRTL: boolean }) {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [editRecord, setEditRecord] = useState<any>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());

  const departments    = useQuery(api.hr.listDepartments, {}) ?? [];
  const allEmployees   = useQuery(api.hr.listEmployees, { status: "active" }) ?? [];
  const attendanceRecords = useQuery(api.hr.listAttendanceByDate, { attendanceDate: selectedDate }) ?? [];

  const [savingId, setSavingId] = useState<string | null>(null);
  const upsert = useMutation(api.hr.upsertAttendance);
  const resetAttendance = useMutation(api.hr.resetAttendanceByDate);

  // Merge: every active employee gets a row; attach existing attendance record if present
  const merged = useMemo(() => {
    const recordByEmpId: Record<string, any> = {};
    attendanceRecords.forEach((r: any) => { recordByEmpId[r.employeeId] = r; });

    return allEmployees
      .filter((emp: any) => !selectedDeptId || emp.departmentId === selectedDeptId)
      .map((emp: any) => {
        const rec = recordByEmpId[emp._id];
        return {
          _id: rec?._id ?? null,
          employeeId: emp._id,
          employee: { ...emp, departmentNameAr: emp.department?.nameAr, departmentNameEn: emp.department?.nameEn },
          status: rec?.status ?? null,
          checkIn: rec?.checkIn ?? null,
          checkOut: rec?.checkOut ?? null,
          overtimeHours: rec?.overtimeHours ?? null,
          lateMinutes: rec?.lateMinutes ?? null,
          notes: rec?.notes ?? null,
        };
      });
  }, [allEmployees, attendanceRecords, selectedDeptId]);

  const filtered = merged; // already filtered by dept above

  const summary = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, notRecorded: 0 };
    filtered.forEach((r: any) => {
      if (!r.status) counts.notRecorded++;
      else if (r.status === "present") counts.present++;
      else if (r.status === "absent") counts.absent++;
      else if (r.status === "late") { counts.present++; counts.late++; }
    });
    return counts;
  }, [filtered]);

  async function handleBulk(status: "present" | "absent" | "late") {
    if (selectedEmployees.size === 0) {
      alert(isRTL ? "الرجاء اختيار موظفين أولاً" : "Please select employees first");
      return;
    }
    
    const confirmed = window.confirm(
      isRTL 
        ? `هل تريد تسجيل ${selectedEmployees.size} موظف كـ ${status === 'present' ? 'حاضر' : status === 'absent' ? 'غائب' : 'متأخر'}؟`
        : `Mark ${selectedEmployees.size} employees as ${status}?`
    );
    if (!confirmed) return;

    setSavingId('bulk');
    try {
      for (const employeeId of selectedEmployees) {
        await upsert({
          employeeId: employeeId as any,
          attendanceDate: selectedDate,
          status,
          checkIn: status === 'present' ? '08:00' : status === 'late' ? '09:00' : undefined,
          checkOut: status === 'present' || status === 'late' ? '17:00' : undefined,
          workedHours: status === 'present' ? 8 : status === 'late' ? 7 : undefined,
        });
      }
      setSelectedEmployees(new Set()); // Clear selection after
    } catch (e: any) {
      alert(String(e.message || e));
    } finally {
      setSavingId(null);
    }
  }

  function toggleSelectAll() {
    if (selectedEmployees.size === filtered.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(filtered.map((r: any) => r.employeeId)));
    }
  }

  function toggleSelectEmployee(employeeId: string) {
    const newSet = new Set(selectedEmployees);
    if (newSet.has(employeeId)) {
      newSet.delete(employeeId);
    } else {
      newSet.add(employeeId);
    }
    setSelectedEmployees(newSet);
  }

  function calcWorkedHours(checkIn: string, checkOut: string) {
    if (!checkIn || !checkOut) return "—";
    const [ih, im] = checkIn.split(":").map(Number);
    const [oh, om] = checkOut.split(":").map(Number);
    const mins = (oh * 60 + om) - (ih * 60 + im);
    if (mins <= 0) return "—";
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  async function handleReset() {
    const scope = selectedEmployees.size > 0
      ? (isRTL ? `${selectedEmployees.size} موظف محدد` : `${selectedEmployees.size} selected employee(s)`)
      : (isRTL ? "جميع الموظفين" : "all employees");
    const confirmed = window.confirm(
      isRTL
        ? `هل تريد مسح سجلات الحضور لـ ${scope} في ${selectedDate}؟ ستعود لـ "غير مسجّل".`
        : `Reset attendance for ${scope} on ${selectedDate}? They will return to "Not Recorded".`
    );
    if (!confirmed) return;
    setSavingId('reset');
    try {
      const employeeIds = selectedEmployees.size > 0
        ? (Array.from(selectedEmployees) as any[])
        : undefined;
      const res = await resetAttendance({ attendanceDate: selectedDate, employeeIds });
      setSelectedEmployees(new Set());
      alert(isRTL ? `تم مسح ${res.deleted} سجل` : `Reset ${res.deleted} record(s)`);
    } catch (e: any) {
      alert(String(e.message || e));
    } finally {
      setSavingId(null);
    }
  }

  async function handleQuickMark(employeeId: string, status: 'present' | 'absent' | 'late') {
    setSavingId(employeeId);
    try {
      await upsert({
        employeeId: employeeId as any,
        attendanceDate: selectedDate,
        status,
        checkIn: status === 'present' ? '08:00' : status === 'late' ? '09:00' : undefined,
        checkOut: status === 'present' || status === 'late' ? '17:00' : undefined,
        workedHours: status === 'present' ? 8 : status === 'late' ? 7 : undefined,
      });
    } catch (e: any) {
      alert(String(e.message || e));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-[color:var(--ink-100)] p-4 flex flex-wrap items-end gap-3">
        <div>
          <div className="text-xs font-semibold text-[color:var(--ink-600)] mb-1.5">Date</div>
          <input
            type="date"
            className="input-field h-10 px-3 rounded-lg border border-[color:var(--ink-200)] text-sm"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        <div>
          <div className="text-xs font-semibold text-[color:var(--ink-600)] mb-1.5">Department</div>
          <select
            className="input-field h-10 px-3 rounded-lg border border-[color:var(--ink-200)] text-sm"
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((d: any) => (
              <option key={d._id} value={d._id}>{d.nameEn || d.nameAr}</option>
            ))}
          </select>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? "mr-auto" : "ml-auto"}`}>
          <button
            onClick={handleReset}
            disabled={savingId === 'reset'}
            className="h-9 px-3 rounded-lg border border-red-200 bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 disabled:opacity-60 inline-flex items-center gap-1"
          >
            {savingId === 'reset' ? '...' : (isRTL ? '↩ مسح الكل' : '↩ Reset All')}
          </button>
          {selectedEmployees.size > 0 && (
            <>
              <span className="text-xs text-gray-500">
                {selectedEmployees.size} {isRTL ? 'محدد' : 'selected'}
              </span>
              <button
                onClick={() => handleBulk('present')}
                disabled={savingId === 'bulk'}
                className="h-9 px-3 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-60 inline-flex items-center gap-1"
              >
                <CheckCircle className="h-3.5 w-3.5" /> {isRTL ? 'حاضر' : 'Present'}
              </button>
              <button
                onClick={() => handleBulk('absent')}
                disabled={savingId === 'bulk'}
                className="h-9 px-3 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-60 inline-flex items-center gap-1"
              >
                <XCircle className="h-3.5 w-3.5" /> {isRTL ? 'غائب' : 'Absent'}
              </button>
              <button
                onClick={() => handleBulk('late')}
                disabled={savingId === 'bulk'}
                className="h-9 px-3 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 disabled:opacity-60 inline-flex items-center gap-1"
              >
                <Clock className="h-3.5 w-3.5" /> {isRTL ? 'متأخر' : 'Late'}
              </button>
              <button
                onClick={() => setSelectedEmployees(new Set())}
                className="h-9 px-3 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50"
              >
                {isRTL ? 'إلغاء' : 'Clear'}
              </button>
              <button
                onClick={handleReset}
                disabled={savingId === 'reset'}
                className="h-9 px-3 rounded-lg border border-red-200 bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 disabled:opacity-60"
              >
                {savingId === 'reset' ? '...' : (isRTL ? '↩ تراجع' : '↩ Undo')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Present", count: summary.present, color: "bg-green-50 border-green-200 text-green-700" },
          { label: "Absent",  count: summary.absent,  color: "bg-red-50 border-red-200 text-red-700" },
          { label: "Late",    count: summary.late,    color: "bg-amber-50 border-amber-200 text-amber-700" },
          { label: "Not Recorded", count: summary.notRecorded, color: "bg-gray-50 border-gray-200 text-gray-600" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-3 flex items-center gap-3 ${s.color}`}>
            <span className="text-2xl font-bold tabular-nums">{s.count}</span>
            <span className="text-sm font-semibold">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-[color:var(--ink-100)] overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Calendar} title={isRTL ? "لا يوجد موظفون نشطون" : "No active employees found"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse" dir={isRTL ? "rtl" : "ltr"}>
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100">
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedEmployees.size === filtered.length}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-[color:var(--brand-600)] focus:ring-[color:var(--brand-600)]"
                    />
                  </th>
                  {["Employee", "Department", "Status", "Check In", "Check Out", "Worked", "Overtime", "Notes", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-start whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r: any) => (
                  <tr key={r._id ?? r.employeeId} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.has(r.employeeId)}
                        onChange={() => toggleSelectEmployee(r.employeeId)}
                        className="h-4 w-4 rounded border-gray-300 text-[color:var(--brand-600)] focus:ring-[color:var(--brand-600)]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[color:var(--ink-900)] text-sm">
                        {isRTL ? r.employee?.nameAr : (r.employee?.nameEn || r.employee?.nameAr)}
                      </div>
                      <div className="text-xs text-[color:var(--ink-400)]">{r.employee?.employeeCode}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[color:var(--ink-600)]">
                      {isRTL ? r.employee?.departmentNameAr : (r.employee?.departmentNameEn || r.employee?.departmentNameAr || "—")}
                    </td>
                    <td className="px-4 py-3">
                      {r.status ? <StatusBadge status={r.status} /> : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-gray-50 text-gray-400 border-gray-200">
                          Not Recorded
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[color:var(--ink-600)] tabular-nums">{r.checkIn || "—"}</td>
                    <td className="px-4 py-3 text-xs text-[color:var(--ink-600)] tabular-nums">{r.checkOut || "—"}</td>
                    <td className="px-4 py-3 text-xs text-[color:var(--ink-600)] tabular-nums">{calcWorkedHours(r.checkIn, r.checkOut)}</td>
                    <td className="px-4 py-3 text-xs text-[color:var(--ink-600)] tabular-nums">
                      {r.overtimeHours ? `${r.overtimeHours}h` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[color:var(--ink-500)] max-w-[140px] truncate">{r.notes || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        {/* Quick status buttons */}
                        <button
                          onClick={() => handleQuickMark(r.employeeId, 'present')}
                          disabled={savingId === r.employeeId}
                          className="h-7 w-7 rounded-md bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center"
                          title="Present"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleQuickMark(r.employeeId, 'absent')}
                          disabled={savingId === r.employeeId}
                          className="h-7 w-7 rounded-md bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center"
                          title="Absent"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleQuickMark(r.employeeId, 'late')}
                          disabled={savingId === r.employeeId}
                          className="h-7 w-7 rounded-md bg-amber-50 text-amber-600 hover:bg-amber-100 flex items-center justify-center"
                          title="Late"
                        >
                          <Clock className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setEditRecord(r)}
                          className="h-7 w-7 rounded-md hover:bg-[color:var(--brand-50)] text-[color:var(--ink-400)] hover:text-[color:var(--brand-700)] flex items-center justify-center"
                          title="Edit Details"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editRecord !== null && (
        <EditAttendanceModal
          record={editRecord._id ? editRecord : null}
          employeeId={editRecord.employeeId ?? editRecord._id}
          employeeName={isRTL ? editRecord.employee?.nameAr : (editRecord.employee?.nameEn || editRecord.employee?.nameAr || "")}
          attendanceDate={selectedDate}
          onClose={() => setEditRecord(null)}
        />
      )}
    </div>
  );
}

// ─── Monthly View ─────────────────────────────────────────────────────────────

function MonthlyView({ isRTL }: { isRTL: boolean }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const employees = useQuery(api.hr.listEmployees, { status: "active" }) ?? [];
  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const allSummaries = useQuery(
    api.hr.getMonthlyAttendanceSummaries,
    company ? { companyId: company._id, year, month } : "skip"
  ) ?? [];
  // Filter by selected employee if one is chosen
  const summaries = selectedEmployeeId
    ? allSummaries.filter((s: any) => s.employeeId === selectedEmployeeId)
    : allSummaries;

  const daysInMonth = new Date(year, month, 0).getDate();
  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const CELL_META: Record<string, { abbr: string; cls: string }> = {
    present:  { abbr: "P", cls: "bg-green-100 text-green-700" },
    late:     { abbr: "L", cls: "bg-amber-100 text-amber-700" },
    absent:   { abbr: "A", cls: "bg-red-100 text-red-700" },
    half_day: { abbr: "H", cls: "bg-orange-100 text-orange-700" },
    on_leave: { abbr: "V", cls: "bg-blue-100 text-blue-700" },
    holiday:  { abbr: "☆", cls: "bg-purple-100 text-purple-700" },
    weekend:  { abbr: "—", cls: "bg-gray-50 text-gray-400" },
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-[color:var(--ink-100)] p-4 flex flex-wrap items-end gap-3">
        <div>
          <div className="text-xs font-semibold text-[color:var(--ink-600)] mb-1.5">Month</div>
          <select
            className="input-field h-10 px-3 rounded-lg border border-[color:var(--ink-200)] text-sm"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-xs font-semibold text-[color:var(--ink-600)] mb-1.5">Year</div>
          <select
            className="input-field h-10 px-3 rounded-lg border border-[color:var(--ink-200)] text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-xs font-semibold text-[color:var(--ink-600)] mb-1.5">Employee</div>
          <select
            className="input-field h-10 px-3 rounded-lg border border-[color:var(--ink-200)] text-sm min-w-[180px]"
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
          >
            <option value="">All Employees</option>
            {employees.map((e: any) => (
              <option key={e._id} value={e._id}>
                {isRTL ? e.nameAr : (e.nameEn || e.nameAr)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(CELL_META).map(([k, v]) => (
          <span key={k} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border ${v.cls} border-transparent`}>
            <span>{v.abbr}</span><span className="font-normal opacity-70">{STATUS_META[k]?.label}</span>
          </span>
        ))}
      </div>

      {/* Monthly table */}
      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-[color:var(--ink-100)] overflow-hidden">
        {summaries.length === 0 ? (
          <EmptyState icon={Calendar} title="No attendance data for this period" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" dir={isRTL ? "rtl" : "ltr"}>
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100">
                  <th className="px-3 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-start sticky left-0 bg-gray-50 z-10 min-w-[140px]">
                    Employee
                  </th>
                  {Array.from({ length: daysInMonth }, (_, i) => (
                    <th key={i + 1} className="px-1.5 py-3 text-[10px] font-bold text-gray-400 text-center min-w-[28px]">
                      {i + 1}
                    </th>
                  ))}
                  <th className="px-2 py-3 text-[10px] font-bold text-gray-400 text-center min-w-[36px]">P</th>
                  <th className="px-2 py-3 text-[10px] font-bold text-gray-400 text-center min-w-[36px]">A</th>
                  <th className="px-2 py-3 text-[10px] font-bold text-gray-400 text-center min-w-[36px]">V</th>
                  <th className="px-2 py-3 text-[10px] font-bold text-gray-400 text-center min-w-[40px]">OT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {summaries.map((s: any) => (
                  <tr key={s.employeeId} className="hover:bg-gray-50/40">
                    <td className="px-3 py-2 sticky left-0 bg-white z-10 border-r border-gray-100">
                      <div className="font-semibold text-[color:var(--ink-800)]">
                        {isRTL ? s.nameAr : (s.nameEn || s.nameAr)}
                      </div>
                      <div className="text-[10px] text-[color:var(--ink-400)]">{s.employeeCode}</div>
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      const dayStr = String(day).padStart(2, "0");
                      const dateKey = `${year}-${String(month).padStart(2, "0")}-${dayStr}`;
                      const dayStatus = s.days?.[dateKey];
                      const meta = dayStatus ? CELL_META[dayStatus] : null;
                      return (
                        <td key={day} className="px-1 py-2 text-center">
                          {meta ? (
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold ${meta.cls}`}>
                              {meta.abbr}
                            </span>
                          ) : (
                            <span className="text-gray-200 text-[10px]">·</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-center font-semibold text-green-700">{s.presentDays ?? 0}</td>
                    <td className="px-2 py-2 text-center font-semibold text-red-600">{s.absentDays ?? 0}</td>
                    <td className="px-2 py-2 text-center font-semibold text-blue-600">{s.leaveDays ?? 0}</td>
                    <td className="px-2 py-2 text-center font-semibold text-amber-600">{s.overtimeHours ?? 0}h</td>
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

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const { t, isRTL } = useI18n();
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily");

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      <PageHeader
        icon={Clock}
        title="Attendance Management"
        actions={
          <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setViewMode("daily")}
              className={`h-8 px-4 rounded-md text-sm font-semibold transition-all ${
                viewMode === "daily"
                  ? "bg-white shadow text-[color:var(--ink-900)]"
                  : "text-[color:var(--ink-500)] hover:text-[color:var(--ink-800)]"
              }`}
            >
              <span className="flex items-center gap-1.5"><List className="h-3.5 w-3.5" /> Daily</span>
            </button>
            <button
              onClick={() => setViewMode("monthly")}
              className={`h-8 px-4 rounded-md text-sm font-semibold transition-all ${
                viewMode === "monthly"
                  ? "bg-white shadow text-[color:var(--ink-900)]"
                  : "text-[color:var(--ink-500)] hover:text-[color:var(--ink-800)]"
              }`}
            >
              <span className="flex items-center gap-1.5"><LayoutGrid className="h-3.5 w-3.5" /> Monthly</span>
            </button>
          </div>
        }
      />

      {viewMode === "daily" ? (
        <DailyView isRTL={isRTL} />
      ) : (
        <MonthlyView isRTL={isRTL} />
      )}
    </div>
  );
}
