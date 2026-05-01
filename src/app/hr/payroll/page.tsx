// @ts-nocheck
"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  DollarSign, Plus, Eye, CheckCircle, CreditCard,
  Users, TrendingUp, FileText, BarChart2,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { formatCurrency } from "@/lib/i18n";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/store/toastStore";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES_EN = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MONTH_NAMES_AR = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
];

function monthName(idx: number, isRTL: boolean) {
  return isRTL ? MONTH_NAMES_AR[idx] : MONTH_NAMES_EN[idx];
}

const RUN_STATUS_META: Record<string, { en: string; ar: string; cls: string }> = {
  draft:     { en: "Draft",     ar: "مسودة",    cls: "bg-gray-100 text-gray-600 border-gray-200" },
  processed: { en: "Processed", ar: "تمت المعالجة", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  paid:      { en: "Paid",      ar: "مدفوع",    cls: "bg-green-100 text-green-800 border-green-200" },
};

function RunStatusBadge({ status, isRTL }: { status: string; isRTL?: boolean }) {
  const meta = RUN_STATUS_META[status] ?? { en: status, ar: status, cls: "bg-gray-100 text-gray-500 border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border ${meta.cls}`}>
      {isRTL ? meta.ar : meta.en}
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

function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${color}`}>
      <span className="h-9 w-9 rounded-lg flex items-center justify-center bg-white/60">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</div>
        <div className="text-base font-bold tabular-nums mt-0.5">{value}</div>
      </div>
    </div>
  );
}

// ─── Create Payroll Run Modal ──────────────────────────────────────────────────

function CreateRunModal({
  onClose,
  currentUserId,
  isRTL,
}: {
  onClose: () => void;
  currentUserId: string | undefined;
  isRTL: boolean;
}) {
  const now = new Date();
  const { company } = useCompanySettings();
  const branch = useQuery(api.branches.getDefaultBranch, company ? { companyId: company._id } : "skip");
  const branchId = branch?._id;
  const createRun = useMutation(api.hr.createPayrollRun);

  const [form, setForm] = useState({
    periodYear: now.getFullYear(),
    periodMonth: now.getMonth() + 1,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSave() {
    setSaving(true);
    setErr(null);
    try {
      await createRun({
        periodYear: Number(form.periodYear),
        periodMonth: Number(form.periodMonth),
        branchId: branchId as any,
        createdBy: currentUserId as any,
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
        className="surface-card max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-[color:var(--ink-900)]">{isRTL ? "إنشاء مسير رواتب" : "Create Payroll Run"}</h2>
          <button onClick={onClose} className="text-[color:var(--ink-500)] text-xl leading-none">×</button>
        </div>
        {err && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{err}</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label={isRTL ? "السنة" : "Year"} required>
            <input
              type="number"
              className="input-field w-full"
              value={form.periodYear}
              min={2020}
              max={2099}
              onChange={(e) => setForm({ ...form, periodYear: Number(e.target.value) })}
            />
          </Field>
          <Field label={isRTL ? "الشهر" : "Month"} required>
            <select
              className="input-field w-full"
              value={form.periodMonth}
              onChange={(e) => setForm({ ...form, periodMonth: Number(e.target.value) })}
            >
              {MONTH_NAMES_EN.map((m, i) => (
                <option key={i + 1} value={i + 1}>{isRTL ? MONTH_NAMES_AR[i] : m}</option>
              ))}
            </select>
          </Field>
          <div className="col-span-2">
            <Field label={isRTL ? "ملاحظات" : "Notes"}>
              <textarea
                className="input-field w-full resize-none"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={isRTL ? "ملاحظات اختيارية…" : "Optional notes…"}
              />
            </Field>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-ghost h-10 px-4 rounded-lg text-sm font-semibold" disabled={saving}>
            {isRTL ? "إلغاء" : "Cancel"}
          </button>
          <button onClick={onSave} className="btn-primary h-10 px-5 rounded-lg text-sm font-semibold" disabled={saving}>
            {saving ? (isRTL ? "جاري الإنشاء…" : "Creating…") : (isRTL ? "إنشاء مسودة" : "Create Draft")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Run Details Modal ─────────────────────────────────────────────────────────

function RunDetailsModal({
  runId,
  isRTL,
  onClose,
}: {
  runId: string;
  isRTL: boolean;
  onClose: () => void;
}) {
  const run = useQuery(api.hr.getPayrollRunById, { id: runId as any });
  const processRun = useMutation(api.hr.processPayrollRun);
  const markPaid = useMutation(api.hr.markPayrollRunPaid);
  const [acting, setActing] = useState(false);

  async function handleProcess() {
    setActing(true);
    try { await processRun({ id: runId as any }); }
    catch (e: any) { toast.error(e); }
    finally { setActing(false); }
  }

  async function handleMarkPaid() {
    setActing(true);
    try { await markPaid({ id: runId as any }); }
    catch (e: any) { toast.error(e); }
    finally { setActing(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,19,22,0.55)] p-4"
      onClick={onClose}
    >
      <div
        className="surface-card w-full max-w-5xl p-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5" dir={isRTL ? "rtl" : "ltr"}>
          <div>
            <h2 className="text-base font-bold text-[color:var(--ink-900)]">{isRTL ? "تفاصيل مسير الرواتب" : "Payroll Run Details"}</h2>
            {run && (
              <p className="text-xs text-[color:var(--ink-500)] mt-0.5">
                {monthName(run.periodMonth - 1, isRTL)} {run.periodYear} · <RunStatusBadge status={run.status} isRTL={isRTL} />
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {run?.status === "draft" && (
              <button
                onClick={handleProcess}
                disabled={acting}
                className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" /> {isRTL ? "معالجة" : "Process"}
              </button>
            )}
            {run?.status === "processed" && (
              <button
                onClick={handleMarkPaid}
                disabled={acting}
                className="h-9 px-4 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60 inline-flex items-center gap-2"
              >
                <CreditCard className="h-4 w-4" /> {isRTL ? "تم الدفع" : "Mark as Paid"}
              </button>
            )}
            <button onClick={onClose} className="text-[color:var(--ink-500)] text-xl leading-none">×</button>
          </div>
        </div>

        {!run ? (
          <div className="py-12 text-center text-[color:var(--ink-400)]">{isRTL ? "جاري التحميل…" : "Loading…"}</div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <SummaryCard icon={DollarSign} label={isRTL ? "صافي الرواتب" : "Total Net Pay"} value={formatCurrency(run.totalNetPay ?? 0)} color="bg-green-50 border-green-200 text-green-800" />
              <SummaryCard icon={TrendingUp} label={isRTL ? "إجمالي الأساسي" : "Total Basic"} value={formatCurrency(run.totalBasicSalary ?? 0)} color="bg-blue-50 border-blue-200 text-blue-800" />
              <SummaryCard icon={BarChart2} label={isRTL ? "إجمالي البدلات" : "Total Allowances"} value={formatCurrency(run.totalAllowances ?? 0)} color="bg-amber-50 border-amber-200 text-amber-800" />
              <SummaryCard icon={Users} label={isRTL ? "عدد الموظفين" : "Employees"} value={String(run.employeeCount ?? 0)} color="bg-[color:var(--brand-50)] border-[color:var(--brand-100)] text-[color:var(--brand-800)]" />
            </div>

            {/* Lines table */}
            <div className="overflow-x-auto rounded-xl border border-[color:var(--ink-100)]">
              <table className="w-full text-sm border-collapse" dir={isRTL ? "rtl" : "ltr"}>
                <thead>
                  <tr style={{ background: "var(--brand-700)", color: "#fff" }}>
                    {[
                      isRTL ? "الموظف" : "Employee",
                      isRTL ? "الأساسي" : "Basic",
                      isRTL ? "البدلات" : "Allowances",
                      isRTL ? "الأوفرتايم" : "Overtime",
                      isRTL ? "الخصومات" : "Deductions",
                      isRTL ? "صافي الراتب" : "Net Salary",
                      isRTL ? "أيام الحضور" : "Days Present",
                      isRTL ? "أيام الغياب" : "Days Absent",
                    ].map((h) => (
                      <th key={h} className="px-3 py-3 text-[10px] font-bold text-white/70 uppercase tracking-widest text-start whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(run.lines ?? []).map((line: any) => (
                    <tr key={line._id ?? line.employeeId} className="hover:bg-gray-50/50">
                      <td className="px-3 py-3">
                        <div className="font-semibold text-[color:var(--ink-900)] text-sm">
                          {isRTL ? line.employee?.nameAr : (line.employee?.nameEn || line.employee?.nameAr || "—")}
                        </div>
                        <div className="text-[10px] text-[color:var(--ink-400)]">{line.employee?.employeeCode}</div>
                      </td>
                      <td className="px-3 py-3 text-sm tabular-nums text-[color:var(--ink-700)]">{formatCurrency(line.basicSalary ?? 0)}</td>
                      <td className="px-3 py-3 text-sm tabular-nums text-green-700">{formatCurrency(line.totalAllowances ?? 0)}</td>
                      <td className="px-3 py-3 text-sm tabular-nums text-amber-700">{formatCurrency(line.overtimePay ?? 0)}</td>
                      <td className="px-3 py-3 text-sm tabular-nums text-red-600">{formatCurrency(line.totalDeductions ?? 0)}</td>
                      <td className="px-3 py-3 text-sm tabular-nums font-bold text-[color:var(--ink-900)]">{formatCurrency(line.netSalary ?? 0)}</td>
                      <td className="px-3 py-3 text-sm tabular-nums text-center text-green-700">{line.daysPresent ?? "—"}</td>
                      <td className="px-3 py-3 text-sm tabular-nums text-center text-red-600">{line.daysAbsent ?? "—"}</td>
                    </tr>
                  ))}
                  {(run.lines ?? []).length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-[color:var(--ink-400)] text-sm">
                        {isRTL ? "لا توجد بيانات" : "No payroll lines found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Runs Tab ──────────────────────────────────────────────────────────────────

function RunsTab({ isRTL, currentUserId }: { isRTL: boolean; currentUserId: string | undefined }) {
  const [showCreate, setShowCreate] = useState(false);
  const [viewRunId, setViewRunId] = useState<string | null>(null);
  const runs = useQuery(api.hr.listPayrollRuns, {}) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" /> {isRTL ? "إنشاء مسيرة رواتب" : "Create Payroll Run"}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-[color:var(--ink-100)] overflow-hidden">
        {runs.length === 0 ? (
          <EmptyState icon={DollarSign} title={isRTL ? "لا توجد مسيرات رواتب بعد" : "No payroll runs yet"} />
        ) : (
          <>
          <div className="mobile-list p-3 space-y-2.5">
            {runs.map((run: any) => (
              <div key={run._id} className="record-card" onClick={() => setViewRunId(run._id)} style={{ cursor: "pointer" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-[var(--ink-900)]">
                      {monthName(run.periodMonth - 1, isRTL)} {run.periodYear}
                    </p>
                    <p className="text-[11.5px] text-[var(--ink-500)]">{run.employeeCount ?? 0} {isRTL ? "موظف" : "employees"}</p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="text-[16px] font-bold tabular-nums text-[var(--ink-900)]">{formatCurrency(run.totalNetPay ?? 0)}</p>
                    <RunStatusBadge status={run.status} isRTL={isRTL} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="desktop-table overflow-x-auto">
            <table className="w-full text-sm border-collapse" dir={isRTL ? "rtl" : "ltr"}>
              <thead>
                <tr style={{ background: "var(--brand-700)", color: "#fff" }}>
                  {(isRTL
                  ? ["الفترة", "الحالة", "الموظفون", "الأساسي", "البدلات", "الاستقطاعات", "صافي الراتب", "تاريخ الإنشاء", "إجراءات"]
                  : ["Period", "Status", "Employees", "Total Basic", "Total Allowances", "Total Deductions", "Net Pay", "Created At", "Actions"]
                ).map((h) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold text-white/70 uppercase tracking-widest text-start whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {runs.map((r: any) => (
                  <tr key={r._id} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="px-4 py-3 font-semibold text-[color:var(--ink-900)]">
                      {monthName(r.periodMonth - 1, isRTL)} {r.periodYear}
                    </td>
                    <td className="px-4 py-3"><RunStatusBadge status={r.status} isRTL={isRTL} /></td>
                    <td className="px-4 py-3 text-center tabular-nums text-[color:var(--ink-600)]">{r.employeeCount ?? 0}</td>
                    <td className="px-4 py-3 tabular-nums text-[color:var(--ink-700)]">{formatCurrency(r.totalBasicSalary ?? 0)}</td>
                    <td className="px-4 py-3 tabular-nums text-green-700">{formatCurrency(r.totalAllowances ?? 0)}</td>
                    <td className="px-4 py-3 tabular-nums text-red-600">{formatCurrency(r.totalDeductions ?? 0)}</td>
                    <td className="px-4 py-3 tabular-nums font-bold text-[color:var(--ink-900)]">{formatCurrency(r.totalNetPay ?? 0)}</td>
                    <td className="px-4 py-3 text-xs text-[color:var(--ink-400)] tabular-nums">
                      {r._creationTime ? new Date(r._creationTime).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setViewRunId(r._id)}
                        className="h-7 px-2.5 rounded-md bg-[color:var(--brand-50)] hover:bg-[color:var(--brand-100)] text-[color:var(--brand-700)] text-xs font-semibold border border-[color:var(--brand-100)] inline-flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" /> {isRTL ? "عرض" : "View"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {showCreate && (
        <CreateRunModal onClose={() => setShowCreate(false)} currentUserId={currentUserId} isRTL={isRTL} />
      )}
      {viewRunId && (
        <RunDetailsModal runId={viewRunId} isRTL={isRTL} onClose={() => setViewRunId(null)} />
      )}
    </div>
  );
}

// ─── Preview Tab ───────────────────────────────────────────────────────────────

function PreviewTab({ isRTL, currentUserId }: { isRTL: boolean; currentUserId: string | undefined }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);
  const createRun = useMutation(api.hr.createPayrollRun);
  const { company } = useCompanySettings();
  const branch = useQuery(api.branches.getDefaultBranch, company ? { companyId: company._id } : "skip");
  const branchId = branch?._id;

  const preview = useQuery(
    api.hr.previewPayrollRun,
    shouldFetch ? { periodYear: year, periodMonth: month } : "skip"
  );

  const totals = useMemo(() => {
    if (!preview || !Array.isArray(preview)) return null;
    return preview.reduce(
      (acc: any, line: any) => ({
        basic: acc.basic + (line.basicSalary ?? 0),
        allowances: acc.allowances + (line.totalAllowances ?? 0),
        overtime: acc.overtime + (line.overtimePay ?? 0),
        deductions: acc.deductions + (line.totalDeductions ?? 0),
        net: acc.net + (line.netSalary ?? 0),
      }),
      { basic: 0, allowances: 0, overtime: 0, deductions: 0, net: 0 }
    );
  }, [preview]);

  const [creating, setCreating] = useState(false);

  async function handleCreateDraft() {
    setCreating(true);
    try {
      await createRun({
        periodYear: year,
        periodMonth: month,
        branchId: branchId as any,
        createdBy: currentUserId as any,
      });
      toast.success(isRTL ? `تم إنشاء مسودة مسيرة رواتب لـ ${monthName(month - 1, true)} ${year}` : `Draft payroll run created for ${monthName(month - 1, false)} ${year}`);
    } catch (e: any) {
      toast.error(e);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-[color:var(--ink-100)] p-4 flex flex-wrap items-end gap-3">
        <div>
          <div className="text-xs font-semibold text-[color:var(--ink-600)] mb-1.5">{isRTL ? "السنة" : "Year"}</div>
          <select
            className="input-field h-10 px-3 rounded-lg border border-[color:var(--ink-200)] text-sm"
            value={year}
            onChange={(e) => { setYear(Number(e.target.value)); setShouldFetch(false); }}
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-xs font-semibold text-[color:var(--ink-600)] mb-1.5">{isRTL ? "الشهر" : "Month"}</div>
          <select
            className="input-field h-10 px-3 rounded-lg border border-[color:var(--ink-200)] text-sm"
            value={month}
            onChange={(e) => { setMonth(Number(e.target.value)); setShouldFetch(false); }}
          >
            {MONTH_NAMES_EN.map((_, i) => (
              <option key={i + 1} value={i + 1}>{monthName(i, isRTL)}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => { setShouldFetch(true); setFetchKey((k) => k + 1); }}
          className="btn-primary h-10 px-4 rounded-lg text-sm font-semibold inline-flex items-center gap-2"
        >
          <BarChart2 className="h-4 w-4" /> {isRTL ? "معاينة الرواتب" : "Preview Payroll"}
        </button>
      </div>

      {/* Preview table */}
      {shouldFetch && (
        <>
          {preview === undefined ? (
            <div className="bg-white rounded-2xl border border-[color:var(--ink-100)] py-16 text-center text-[color:var(--ink-400)]">
              {isRTL ? "جار التحميل…" : "Loading preview…"}
            </div>
          ) : !Array.isArray(preview) || preview.length === 0 ? (
            <EmptyState icon={DollarSign} title={isRTL ? "لا توجد بيانات لهذه الفترة" : "No data available for this period"} />
          ) : (
            <>
              <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-[color:var(--ink-100)] overflow-hidden">
                <div className="px-5 py-3 border-b border-[color:var(--ink-100)] flex items-center justify-between">
                  <div className="font-semibold text-[color:var(--ink-900)] text-sm">
                    {isRTL ? `معاينة — ${monthName(month - 1, true)} ${year}` : `Preview — ${monthName(month - 1, false)} ${year}`}
                  </div>
                  <span className="text-xs text-[color:var(--ink-400)]">{preview.length} {isRTL ? "موظف" : "employees"}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse" dir={isRTL ? "rtl" : "ltr"}>
                    <thead>
                      <tr style={{ background: "var(--brand-700)", color: "#fff" }}>
                        {(isRTL
                          ? ["الموظف", "الأساسي", "البدلات", "الإضافي", "الاستقطاعات", "صافي الراتب", "أيام الحضور", "أيام الغياب"]
                          : ["Employee", "Basic", "Allowances", "Overtime", "Deductions", "Net Salary", "Days Present", "Days Absent"]
                        ).map((h) => (
                          <th key={h} className="px-4 py-3 text-[10px] font-bold text-white/70 uppercase tracking-widest text-start whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {preview.map((line: any) => (
                        <tr key={line.employeeId} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-[color:var(--ink-900)] text-sm">
                              {isRTL ? line.nameAr : (line.nameEn || line.nameAr || "—")}
                            </div>
                            <div className="text-[10px] text-[color:var(--ink-400)]">{line.employeeCode}</div>
                          </td>
                          <td className="px-4 py-3 tabular-nums text-[color:var(--ink-700)]">{formatCurrency(line.basicSalary ?? 0)}</td>
                          <td className="px-4 py-3 tabular-nums text-green-700">{formatCurrency(line.totalAllowances ?? 0)}</td>
                          <td className="px-4 py-3 tabular-nums text-amber-700">{formatCurrency(line.overtimePay ?? 0)}</td>
                          <td className="px-4 py-3 tabular-nums text-red-600">{formatCurrency(line.totalDeductions ?? 0)}</td>
                          <td className="px-4 py-3 tabular-nums font-bold text-[color:var(--ink-900)]">{formatCurrency(line.netSalary ?? 0)}</td>
                          <td className="px-4 py-3 tabular-nums text-center text-green-700">{line.daysPresent ?? "—"}</td>
                          <td className="px-4 py-3 tabular-nums text-center text-red-600">{line.daysAbsent ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                    {totals && (
                      <tfoot>
                        <tr className="bg-[color:var(--ink-50)] border-t-2 border-[color:var(--ink-200)] font-bold">
                          <td className="px-4 py-3 text-[color:var(--ink-700)]">{isRTL ? "الإجماليات" : "Totals"}</td>
                          <td className="px-4 py-3 tabular-nums text-[color:var(--ink-700)]">{formatCurrency(totals.basic)}</td>
                          <td className="px-4 py-3 tabular-nums text-green-700">{formatCurrency(totals.allowances)}</td>
                          <td className="px-4 py-3 tabular-nums text-amber-700">{formatCurrency(totals.overtime)}</td>
                          <td className="px-4 py-3 tabular-nums text-red-600">{formatCurrency(totals.deductions)}</td>
                          <td className="px-4 py-3 tabular-nums text-[color:var(--ink-900)] text-base">{formatCurrency(totals.net)}</td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleCreateDraft}
                  disabled={creating}
                  className="btn-primary h-10 px-5 rounded-lg text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  {creating ? (isRTL ? "جار الإنشاء…" : "Creating…") : (isRTL ? "إنشاء مسودة" : "Create Draft Run")}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const { t, isRTL } = useI18n();
  const { currentUser } = useAuth();
  const currentUserId = currentUser?._id;
  const [activeTab, setActiveTab] = useState<"runs" | "preview">("runs");

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      <PageHeader
        icon={DollarSign}
        title={isRTL ? "الرواتب" : "Payroll"}
        actions={
          <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
            {(["runs", "preview"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`h-8 px-4 rounded-md text-sm font-semibold transition-all capitalize ${
                  activeTab === tab
                    ? "bg-white shadow text-[color:var(--ink-900)]"
                    : "text-[color:var(--ink-500)] hover:text-[color:var(--ink-800)]"
                }`}
              >
                {tab === "runs" ? (isRTL ? "المسيرات" : "Runs") : (isRTL ? "معاينة" : "Preview")}
              </button>
            ))}
          </div>
        }
      />

      {activeTab === "runs" ? (
        <RunsTab isRTL={isRTL} currentUserId={currentUserId} />
      ) : (
        <PreviewTab isRTL={isRTL} currentUserId={currentUserId} />
      )}
    </div>
  );
}
