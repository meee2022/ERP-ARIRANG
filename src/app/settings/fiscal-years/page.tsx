// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
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
          : "bg-gray-100 text-gray-500"
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-700">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
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
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none";

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
    return (
      <div className="p-4 text-sm text-gray-400">{t("loading")}</div>
    );
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
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-right py-2 pr-2 text-xs font-semibold text-gray-500">
              {t("periodName")}
            </th>
            <th className="text-right py-2 text-xs font-semibold text-gray-500">
              {t("fromDate")}
            </th>
            <th className="text-right py-2 text-xs font-semibold text-gray-500">
              {t("toDate")}
            </th>
            <th className="text-right py-2 text-xs font-semibold text-gray-500">
              {t("status")}
            </th>
            <th className="py-2 text-xs font-semibold text-gray-500" />
          </tr>
        </thead>
        <tbody>
          {periods.map((p: any) => (
            <tr key={p._id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-2 pr-2 font-medium text-gray-800">{p.name}</td>
              <td className="py-2 text-gray-600">{p.startDate}</td>
              <td className="py-2 text-gray-600">{p.endDate}</td>
              <td className="py-2">
                <StatusBadge status={p.status} t={t} />
              </td>
              <td className="py-2 text-left">
                {yearStatus === "open" && (
                  <>
                    {p.status === "open" ? (
                      <button
                        onClick={() =>
                          setConfirm({ type: "close", periodId: p._id, name: p.name })
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                      >
                        <Lock className="h-3 w-3" />
                        {t("close")}
                      </button>
                    ) : p.status === "closed" ? (
                      <button
                        onClick={() =>
                          setConfirm({ type: "reopen", periodId: p._id, name: p.name })
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                      >
                        <LockOpen className="h-3 w-3" />
                        {t("reopenPeriod")}
                      </button>
                    ) : null}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {periods.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-4">
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
    <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-blue-500 shrink-0" />
          <div>
            <div className="font-semibold text-gray-900 text-sm">{fy.nameAr}</div>
            <div className="text-xs text-gray-500">
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
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 bg-white">
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

  const effectiveCompanyId = (currentUser as any)?.companyId ?? null;

  const fiscalYears = useQuery(
    api.fiscalYears.listFiscalYears,
    effectiveCompanyId ? { companyId: effectiveCompanyId } : "skip"
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

  return (
    <div className="space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="surface-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {t("fiscalYearsTitle")}
            </h1>
            <p className="text-sm text-gray-500">{t("fiscalYearsSubtitle")}</p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowModal(true);
            setError(null);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          {t("newFiscalYear")}
        </button>
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
      <div className="surface-card">
        {!effectiveCompanyId && (
          <div className="text-center text-gray-400 py-12 text-sm">
            {t("loading")}
          </div>
        )}

        {effectiveCompanyId && fiscalYears === undefined && (
          <div className="text-center text-gray-400 py-12 text-sm">
            {t("loading")}
          </div>
        )}

        {effectiveCompanyId && fiscalYears !== undefined && fiscalYears.length === 0 && (
          <div className="text-center py-16">
            <CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">{t("noFiscalYearsYet")}</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t("newFiscalYear")}
            </button>
          </div>
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
          <p className="text-xs text-gray-400 mb-4">
            * سيتم توليد الفترات الشهرية تلقائياً بين تاريخ البداية والنهاية
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowModal(false)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
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
