// @ts-nocheck
"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Calendar, Plus, CheckCircle, XCircle, Clock, Users,
  AlertCircle, ChevronDown, FileText, BarChart2,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/store/toastStore";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEAVE_STATUS_META: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Pending",   cls: "bg-amber-100 text-amber-800 border-amber-200" },
  approved:  { label: "Approved",  cls: "bg-green-100 text-green-800 border-green-200" },
  rejected:  { label: "Rejected",  cls: "bg-red-100 text-red-800 border-red-200" },
  cancelled: { label: "Cancelled", cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = LEAVE_STATUS_META[status] ?? { label: status, cls: "bg-gray-100 text-gray-500 border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border ${meta.cls}`}>
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

function calcDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diff = (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 ? Math.round(diff) + 1 : 0;
}

// ─── New Leave Request Modal ───────────────────────────────────────────────────

function NewLeaveModal({
  onClose,
  isRTL,
}: {
  onClose: () => void;
  isRTL: boolean;
}) {
  const employees = useQuery(api.hr.listEmployees, { status: "active" }) ?? [];
  const leaveTypes = useQuery(api.hr.listLeaveTypes, {}) ?? [];
  const createLeave = useMutation(api.hr.createLeaveRequest);

  const [form, setForm] = useState({
    employeeId: "",
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const days = calcDays(form.startDate, form.endDate);

  async function onSave() {
    if (!form.employeeId) { setErr("Employee is required"); return; }
    if (!form.leaveTypeId) { setErr("Leave type is required"); return; }
    if (!form.startDate || !form.endDate) { setErr("Start and end dates are required"); return; }
    if (days <= 0) { setErr("End date must be after start date"); return; }
    setSaving(true);
    setErr(null);
    try {
      await createLeave({
        employeeId: form.employeeId as any,
        leaveTypeId: form.leaveTypeId as any,
        startDate: form.startDate,
        endDate: form.endDate,
        numberOfDays: days,
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,19,22,0.55)] p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        className="surface-card max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-[color:var(--ink-900)]">New Leave Request</h2>
          <button onClick={onClose} className="text-[color:var(--ink-500)] hover:text-[color:var(--brand-700)] text-xl leading-none">×</button>
        </div>

        {err && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{err}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Field label="Employee" required>
              <select
                className="input-field w-full"
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              >
                <option value="">Select employee…</option>
                {employees.map((emp: any) => (
                  <option key={emp._id} value={emp._id}>
                    {isRTL ? emp.nameAr : (emp.nameEn || emp.nameAr)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Leave Type" required>
              <select
                className="input-field w-full"
                value={form.leaveTypeId}
                onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
              >
                <option value="">Select leave type…</option>
                {leaveTypes.map((lt: any) => (
                  <option key={lt._id} value={lt._id}>
                    {isRTL ? lt.nameAr : (lt.nameEn || lt.nameAr)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Start Date" required>
            <input
              type="date"
              className="input-field w-full"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </Field>
          <Field label="End Date" required>
            <input
              type="date"
              className="input-field w-full"
              value={form.endDate}
              min={form.startDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </Field>
          {days > 0 && (
            <div className="md:col-span-2">
              <div className="rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm px-3 py-2 font-semibold">
                Duration: {days} day{days !== 1 ? "s" : ""}
              </div>
            </div>
          )}
          <div className="md:col-span-2">
            <Field label="Reason">
              <textarea
                className="input-field w-full resize-none"
                rows={3}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Optional reason…"
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-ghost h-10 px-4 rounded-lg text-sm font-semibold" disabled={saving}>
            Cancel
          </button>
          <button onClick={onSave} className="btn-primary h-10 px-5 rounded-lg text-sm font-semibold" disabled={saving}>
            {saving ? "Submitting…" : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reject Modal ──────────────────────────────────────────────────────────────

function RejectModal({
  requestId,
  onClose,
  currentUserId,
}: {
  requestId: string;
  onClose: () => void;
  currentUserId: string | undefined;
}) {
  const rejectLeave = useMutation(api.hr.rejectLeaveRequest);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onConfirm() {
    if (!reason.trim()) { setErr("Rejection reason is required"); return; }
    setSaving(true);
    setErr(null);
    try {
      await rejectLeave({
        id: requestId as any,
        rejectedBy: currentUserId as any,
        rejectionReason: reason,
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
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[color:var(--ink-900)]">Reject Leave Request</h2>
          <button onClick={onClose} className="text-[color:var(--ink-500)] text-xl leading-none">×</button>
        </div>
        {err && (
          <div className="mb-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{err}</div>
        )}
        <Field label="Rejection Reason" required>
          <textarea
            className="input-field w-full resize-none"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please provide a reason for rejection…"
            autoFocus
          />
        </Field>
        <div className="flex items-center justify-end gap-2 mt-4">
          <button onClick={onClose} className="btn-ghost h-10 px-4 rounded-lg text-sm font-semibold" disabled={saving}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="h-10 px-5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Rejecting…" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Requests Tab ─────────────────────────────────────────────────────────────

function RequestsTab({ isRTL, currentUserId }: { isRTL: boolean; currentUserId: string | undefined }) {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const employees = useQuery(api.hr.listEmployees, { status: "active" }) ?? [];
  const requests = useQuery(
    api.hr.listLeaveRequests,
    { status: filterStatus === "all" ? undefined : filterStatus }
  ) ?? [];
  const approveLeave = useMutation(api.hr.approveLeaveRequest);

  const filtered = useMemo(() => {
    if (!filterEmployeeId) return requests;
    return requests.filter((r: any) => r.employeeId === filterEmployeeId);
  }, [requests, filterEmployeeId]);

  async function handleApprove(id: string) {
    try {
      await approveLeave({ id: id as any, approvedBy: currentUserId as any });
    } catch (e: any) {
      toast.error(e);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-[color:var(--ink-100)] p-4 flex flex-wrap items-end gap-3">
        <div>
          <div className="text-xs font-semibold text-[color:var(--ink-600)] mb-1.5">Status</div>
          <select
            className="input-field h-10 px-3 rounded-lg border border-[color:var(--ink-200)] text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <div className="text-xs font-semibold text-[color:var(--ink-600)] mb-1.5">Employee</div>
          <select
            className="input-field h-10 px-3 rounded-lg border border-[color:var(--ink-200)] text-sm min-w-[180px]"
            value={filterEmployeeId}
            onChange={(e) => setFilterEmployeeId(e.target.value)}
          >
            <option value="">All Employees</option>
            {employees.map((emp: any) => (
              <option key={emp._id} value={emp._id}>
                {isRTL ? emp.nameAr : (emp.nameEn || emp.nameAr)}
              </option>
            ))}
          </select>
        </div>
        <div className={`${isRTL ? "mr-auto" : "ml-auto"}`}>
          <button
            onClick={() => setShowNew(true)}
            className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" /> New Leave Request
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-[color:var(--ink-100)] overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Calendar} title="No leave requests found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse" dir={isRTL ? "rtl" : "ltr"}>
              <thead>
                <tr style={{ background: "var(--brand-700)", color: "#fff" }}>
                  {["Employee", "Leave Type", "Start Date", "End Date", "Days", "Reason", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold text-white/70 uppercase tracking-widest text-start whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r: any) => (
                  <tr key={r._id} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[color:var(--ink-900)] text-sm">
                        {isRTL ? r.employee?.nameAr : (r.employee?.nameEn || r.employee?.nameAr || "—")}
                      </div>
                      <div className="text-xs text-[color:var(--ink-400)]">{r.employee?.employeeCode}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[color:var(--ink-700)] font-medium">
                      {isRTL ? r.leaveType?.nameAr : (r.leaveType?.nameEn || r.leaveType?.nameAr || "—")}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-[color:var(--ink-600)]">{r.startDate}</td>
                    <td className="px-4 py-3 text-xs tabular-nums text-[color:var(--ink-600)]">{r.endDate}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-8 h-6 rounded-md bg-[color:var(--brand-50)] text-[color:var(--brand-700)] text-xs font-bold border border-[color:var(--brand-100)]">
                        {r.numberOfDays}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[color:var(--ink-500)] max-w-[160px] truncate">{r.reason || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3">
                      {r.status === "pending" ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleApprove(r._id)}
                            className="h-7 px-2.5 rounded-md bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold border border-green-200 inline-flex items-center gap-1"
                          >
                            <CheckCircle className="h-3 w-3" /> Approve
                          </button>
                          <button
                            onClick={() => setRejectingId(r._id)}
                            className="h-7 px-2.5 rounded-md bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold border border-red-200 inline-flex items-center gap-1"
                          >
                            <XCircle className="h-3 w-3" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[color:var(--ink-400)]">
                          {r.status === "approved" && r.approvedBy ? `Approved` : ""}
                          {r.status === "rejected" && r.rejectionReason ? (
                            <span title={r.rejectionReason} className="cursor-help underline decoration-dotted">Reason</span>
                          ) : ""}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNew && <NewLeaveModal onClose={() => setShowNew(false)} isRTL={isRTL} />}
      {rejectingId && (
        <RejectModal
          requestId={rejectingId}
          currentUserId={currentUserId}
          onClose={() => setRejectingId(null)}
        />
      )}
    </div>
  );
}

// ─── Balances Tab ─────────────────────────────────────────────────────────────

function BalancesTab({ isRTL }: { isRTL: boolean }) {
  const now = new Date();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [initYear] = useState(now.getFullYear());

  const employees = useQuery(api.hr.listEmployees, { status: "active" }) ?? [];
  const balances = useQuery(
    api.hr.getLeaveBalances,
    selectedEmployeeId ? { employeeId: selectedEmployeeId as any, year: initYear } : "skip"
  ) ?? [];
  const initBalances = useMutation(api.hr.initLeaveBalances);
  const [initing, setIniting] = useState(false);

  async function handleInit() {
    if (!selectedEmployeeId) { toast.warning("Please select an employee first"); return; }
    setIniting(true);
    try {
      await initBalances({ employeeId: selectedEmployeeId as any, year: initYear });
    } catch (e: any) {
      toast.error(e);
    } finally {
      setIniting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Employee selector */}
      <div className="bg-white rounded-xl border border-[color:var(--ink-100)] p-4 flex flex-wrap items-end gap-3">
        <div>
          <div className="text-xs font-semibold text-[color:var(--ink-600)] mb-1.5">Employee</div>
          <select
            className="input-field h-10 px-3 rounded-lg border border-[color:var(--ink-200)] text-sm min-w-[220px]"
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
          >
            <option value="">Select an employee…</option>
            {employees.map((emp: any) => (
              <option key={emp._id} value={emp._id}>
                {isRTL ? emp.nameAr : (emp.nameEn || emp.nameAr)}
              </option>
            ))}
          </select>
        </div>
        {selectedEmployeeId && (
          <button
            onClick={handleInit}
            disabled={initing}
            className="h-10 px-4 rounded-lg border-2 border-[color:var(--brand-600)] text-[color:var(--brand-700)] text-sm font-semibold hover:bg-[color:var(--brand-50)] disabled:opacity-60 inline-flex items-center gap-2"
          >
            {initing ? "Initializing…" : `Init Balances (${initYear})`}
          </button>
        )}
      </div>

      {/* Balances grid */}
      {!selectedEmployeeId ? (
        <EmptyState icon={BarChart2} title="Select an employee to view leave balances" />
      ) : balances.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[color:var(--ink-100)] p-10 text-center">
          <BarChart2 className="mx-auto h-10 w-10 text-[color:var(--ink-200)] mb-3" />
          <div className="text-sm text-[color:var(--ink-600)] mb-1 font-medium">No leave balances found</div>
          <div className="text-xs text-[color:var(--ink-400)] mb-4">Click "Init Balances" to initialize leave allocations for {initYear}</div>
          <button
            onClick={handleInit}
            disabled={initing}
            className="btn-primary h-9 px-5 rounded-xl inline-flex items-center gap-2 text-sm font-semibold"
          >
            {initing ? "Initializing…" : "Initialize Now"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {balances.map((b: any) => {
            const allocated = b.allocatedDays ?? 0;
            const used = b.usedDays ?? 0;
            const pending = b.pendingDays ?? 0;
            const remaining = allocated - used - pending;
            const pctUsed = allocated > 0 ? Math.min(100, Math.round((used / allocated) * 100)) : 0;
            const pctPending = allocated > 0 ? Math.min(100 - pctUsed, Math.round((pending / allocated) * 100)) : 0;

            return (
              <div key={b._id} className="bg-white rounded-2xl border border-[color:var(--ink-100)] shadow-sm p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-[color:var(--ink-900)] text-sm">
                      {isRTL ? b.leaveType?.nameAr : (b.leaveType?.nameEn || b.leaveType?.nameAr)}
                    </div>
                    <div className="text-xs text-[color:var(--ink-400)] mt-0.5">{initYear}</div>
                  </div>
                  <span className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-[color:var(--brand-50)] border border-[color:var(--brand-100)]">
                    <Calendar className="h-4 w-4 text-[color:var(--brand-600)]" />
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: "Allocated", value: allocated, color: "text-[color:var(--ink-700)]" },
                    { label: "Used", value: used, color: "text-red-600" },
                    { label: "Pending", value: pending, color: "text-amber-600" },
                    { label: "Remaining", value: Math.max(0, remaining), color: "text-green-600" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-gray-50 rounded-lg py-2">
                      <div className={`text-lg font-bold tabular-nums ${stat.color}`}>{stat.value}</div>
                      <div className="text-[9px] text-gray-400 uppercase font-semibold mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Used {pctUsed}%</span>
                    <span>Remaining {100 - pctUsed - pctPending}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden flex">
                    <div
                      className="h-full bg-red-400 transition-all duration-500"
                      style={{ width: `${pctUsed}%` }}
                    />
                    <div
                      className="h-full bg-amber-300 transition-all duration-500"
                      style={{ width: `${pctPending}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function LeavePage() {
  const { t, isRTL } = useI18n();
  const { currentUser } = useAuth();
  const currentUserId = currentUser?._id;
  const [activeTab, setActiveTab] = useState<"requests" | "balances">("requests");

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      <PageHeader
        icon={Calendar}
        title="Leave Management"
        actions={
          <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
            {(["requests", "balances"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`h-8 px-4 rounded-md text-sm font-semibold transition-all capitalize ${
                  activeTab === tab
                    ? "bg-white shadow text-[color:var(--ink-900)]"
                    : "text-[color:var(--ink-500)] hover:text-[color:var(--ink-800)]"
                }`}
              >
                {tab === "requests" ? "Requests" : "Balances"}
              </button>
            ))}
          </div>
        }
      />

      {activeTab === "requests" ? (
        <RequestsTab isRTL={isRTL} currentUserId={currentUserId} />
      ) : (
        <BalancesTab isRTL={isRTL} />
      )}
    </div>
  );
}
