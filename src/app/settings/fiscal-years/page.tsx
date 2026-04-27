// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CalendarDays,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
  Lock,
  LockOpen,
  AlertTriangle,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const isOpen = status === "open";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        isOpen
          ? "bg-green-100 text-green-800"
          : "bg-[color:var(--ink-100)] text-[color:var(--ink-500)]"
      }`}
    >
      {isOpen ? t("active") : t("inactive")}
    </span>
  );
}

// ─── Confirmation Dialog ──────────────────────────────────────────────────────

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  t,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="surface-card w-full max-w-sm overflow-hidden">
        <div className="px-6 py-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-[color:var(--ink-700)]">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 border border-[color:var(--ink-300)] rounded-lg px-4 py-2 text-sm text-[color:var(--ink-700)] hover:bg-[color:var(--ink-50)] transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700 transition-colors"
          >
            {t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="surface-card w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--ink-100)]">
          <h2 className="text-lg font-bold text-[color:var(--ink-900)]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[color:var(--ink-100)] transition-colors"
          >
            <X className="h-5 w-5 text-[color:var(--ink-500)]" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-[color:var(--ink-700)] mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full border border-[color:var(--ink-300)] rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[color:var(--brand-400)] outline-none";

// ─── Periods Table ─────────────────────────────────────────────────────────────

function PeriodsTable({
  fiscalYearId,
  yearStatus,
  userId,
}: {
  fiscalYearId: string;
  yearStatus: string;
  userId: string;
}) {
  const { t, isRTL } = useI18n();
  const data = useQuery(api.fiscalYears.getFiscalYearWithPeriods, {
    fiscalYearId,
    userId,
  });
  const closePeriodMut = useMutation(api.fiscalYears.closePeriod);
  const reopenPeriodMut = useMutation(api.fiscalYears.reopenPeriod);

  const [confirm, setConfirm] = useState<{
    type: "close" | "reopen";
    periodId: string;
    name: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!confirm) return;
    setError(null);
    try {
      if (confirm.type === "close") {
        await closePeriodMut({ periodId: confirm.periodId, userId });
      } else {
        await reopenPeriodMut({ periodId: confirm.periodId, userId });
      }
      setConfirm(null);
    } catch (e: any) {
      setError(e.message ?? "حدث خطأ");
      setConfirm(null);
    }
  };

  if (!data) {
    return <LoadingState label={t("loading")} />;
  }

  const periods = data.periods ?? [];

  return (
    <div className="px-4 pb-4">
      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {confirm && (
        <ConfirmDialog
          message={
            confirm.type === "close"
              ? t("confirmClosePeriod").replace("{name}", confirm.name)
              : t("confirmReopenPeriod").replace("{name}", confirm.name)
          }
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
          t={t}
        />
      )}
      <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left border-collapse" dir={isRTL ? "rtl" : "ltr"}>
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("periodName")}</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("fromDate")}</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("toDate")}</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("status")}</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-end">{t("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {periods.map((p: any) => (
              <tr key={p._id} className="group hover:bg-gray-50/80 transition-all duration-200">
                <td className="px-6 py-4">
                  <span className="font-bold text-gray-900 text-sm">{p.name}</span>
                </td>
                <td className="px-6 py-4 text-xs text-gray-500 font-medium">{p.startDate}</td>
                <td className="px-6 py-4 text-xs text-gray-500 font-medium">{p.endDate}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={p.status} t={t} />
                </td>
                <td className="px-6 py-4 text-end">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {yearStatus === "open" && (
                      <>
                        {p.status === "open" ? (
                          <button
                            onClick={() =>
                              setConfirm({ type: "close", periodId: p._id, name: p.name })
                            }
                            className="h-8 px-3 rounded-lg bg-red-50 text-red-700 text-[10px] font-bold uppercase tracking-tight hover:bg-red-100 transition-all flex items-center gap-1 border border-red-100"
                          >
                            <Lock className="h-3 w-3" />
                            {t("close")}
                          </button>
                        ) : p.status === "closed" ? (
                          <button
                            onClick={() =>
                              setConfirm({ type: "reopen", periodId: p._id, name: p.name })
                            }
                            className="h-8 px-3 rounded-lg bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-tight hover:bg-green-100 transition-all flex items-center gap-1 border border-green-100"
                          >
                            <LockOpen className="h-3 w-3" />
                            {t("reopenPeriod")}
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {periods.length === 0 && (
        <p className="text-center text-sm text-[color:var(--ink-400)] py-4">
          {t("noResults")}
        </p>
      )}
    </div>
  );
}

// ─── Fiscal Year Row ───────────────────────────────────────────────────────────

function FiscalYearRow({
  fy,
  userId,
  onClose,
  t,
}: {
  fy: any;
  userId: string;
  onClose: (id: string) => void;
  t: (key: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-[color:var(--ink-200)] rounded-xl overflow-hidden mb-3">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[color:var(--ink-50)] transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-blue-500 shrink-0" />
          <div>
            <div className="font-semibold text-[color:var(--ink-900)] text-sm">{fy.nameAr}</div>
            <div className="text-xs text-[color:var(--ink-500)]">
              {fy.startDate} — {fy.endDate}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={fy.status} t={t} />
          {fy.status === "open" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(fy._id);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-red-50 text-red-700 hover:bg-red-100 transition-colors border border-red-200"
            >
              <Lock className="h-3 w-3" />
              {t("closeFiscalYear")}
            </button>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-[color:var(--ink-400)]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[color:var(--ink-400)]" />
          )}
        </div>
      </div>
      {expanded && (
        <div className="border-t border-[color:var(--ink-100)] bg-white">
          <PeriodsTable
            fiscalYearId={fy._id}
            yearStatus={fy.status}
            userId={userId}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FiscalYearsPage() {
  const { t, isRTL } = useI18n();
  const { currentUser } = useAuth();
  const { canView, canCreate } = usePermissions();

  const effectiveCompanyId = (currentUser as any)?.companyId ?? null;

  const fiscalYears = useQuery(
    api.fiscalYears.listFiscalYears,
    effectiveCompanyId && currentUser ? { companyId: effectiveCompanyId, userId: currentUser._id as any } : "skip"
  );

  const createFiscalYear = useMutation(api.fiscalYears.createFiscalYear);
  const closeFiscalYearMut = useMutation(api.fiscalYears.closeFiscalYear);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmCloseYear, setConfirmCloseYear] = useState<string | null>(null);

  const [form, setForm] = useState({
    nameAr: "",
    code: "",
    startDate: "",
    endDate: "",
  });

  const handleCreate = async () => {
    if (!effectiveCompanyId || !currentUser) return;
    if (!form.nameAr || !form.code || !form.startDate || !form.endDate) {
      setError(t("errRequiredFields"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createFiscalYear({
        companyId: effectiveCompanyId,
        code: form.code,
        nameAr: form.nameAr,
        startDate: form.startDate,
        endDate: form.endDate,
        createdBy: currentUser._id,
      });
      setShowModal(false);
      setForm({ nameAr: "", code: "", startDate: "", endDate: "" });
      setSuccess(t("fiscalYearCreated"));
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message ?? "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const handleCloseFiscalYear = async (fiscalYearId: string) => {
    if (!currentUser) return;
    setError(null);
    try {
      await closeFiscalYearMut({ fiscalYearId, userId: currentUser._id });
      setSuccess(t("fiscalYearClosed"));
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message ?? "حدث خطأ");
    } finally {
      setConfirmCloseYear(null);
    }
  };

  const userId = currentUser?._id ?? "";

  if (!canView("settings")) {
    return <EmptyState icon={CalendarDays} title={t("permissionDenied")} />;
  }

  return (
    <div className="space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="no-print">
        <PageHeader
          icon={CalendarDays}
          title={t("fiscalYearsTitle")}
          subtitle={t("fiscalYearsSubtitle")}
          actions={canCreate("settings") ? (
            <button
              onClick={() => { setShowModal(true); setError(null); }}
              className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              {t("newFiscalYear")}
            </button>
          ) : undefined}
        />
      </div>

      {/* Alerts */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Fiscal Years List */}
      <div className="surface-card p-4">
        {(!effectiveCompanyId || fiscalYears === undefined) && (
          <LoadingState label={t("loading")} />
        )}

        {effectiveCompanyId && fiscalYears !== undefined && fiscalYears.length === 0 && (
          <EmptyState
            icon={CalendarDays}
            title={t("noFiscalYearsYet")}
            action={canCreate("settings") ? (
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary h-10 px-5 rounded-xl inline-flex items-center gap-2 text-sm font-semibold"
              >
                <Plus className="h-4 w-4" />
                {t("newFiscalYear")}
              </button>
            ) : undefined}
          />
        )}

        {fiscalYears && fiscalYears.length > 0 && (
          <div>
            {fiscalYears.map((fy: any) => (
              <FiscalYearRow
                key={fy._id}
                fy={fy}
                userId={userId}
                onClose={(id) => setConfirmCloseYear(id)}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <Modal title={t("newFiscalYear")} onClose={() => setShowModal(false)}>
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <Field label={t("fiscalYearName") + " *"}>
            <input
              className={inputClass}
              value={form.nameAr}
              onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
              placeholder="مثال: السنة المالية 2025"
              dir="rtl"
            />
          </Field>
          <Field label={t("fiscalYearCode") + " *"}>
            <input
              className={inputClass}
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="مثال: FY2025"
              dir="ltr"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("fiscalYearStart") + " *"}>
              <input
                type="date"
                className={inputClass}
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </Field>
            <Field label={t("fiscalYearEnd") + " *"}>
              <input
                type="date"
                className={inputClass}
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </Field>
          </div>
          <p className="text-xs text-[color:var(--ink-400)] mb-4">
            * سيتم توليد الفترات الشهرية تلقائياً بين تاريخ البداية والنهاية
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowModal(false)}
              className="flex-1 btn-ghost rounded-lg px-4 py-2 text-sm"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex-1 btn-primary rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </Modal>
      )}

      {/* Confirm close fiscal year */}
      {confirmCloseYear && (
        <ConfirmDialog
          message={t("confirmCloseFiscalYear")}
          onConfirm={() => handleCloseFiscalYear(confirmCloseYear)}
          onCancel={() => setConfirmCloseYear(null)}
          t={t}
        />
      )}
    </div>
  );
}
