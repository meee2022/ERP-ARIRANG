// @ts-nocheck
"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Archive,
  X,
  AlertTriangle,
  Check,
} from "lucide-react";

// ─── Shared styles ─────────────────────────────────────────────────────────────

const inputClass =
  "w-full border border-[color:var(--ink-300)] rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[color:var(--brand-400)] outline-none transition-colors";

// ─── Inline status badge ──────────────────────────────────────────────────────

function CcStatusBadge({ isActive, t }: { isActive: boolean; t: (k: string) => string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isActive
          ? "bg-green-100 text-green-800"
          : "bg-[color:var(--ink-100)] text-[color:var(--ink-500)]"
      }`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ background: "currentColor", opacity: 0.7 }}
      />
      {isActive ? t("ccActive") : t("ccArchived")}
    </span>
  );
}

// ─── Modal wrapper ─────────────────────────────────────────────────────────────

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

// ─── Form field wrapper ───────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-[color:var(--ink-700)] mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  t,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  t: (k: string) => string;
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
            {t("archive")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function CostCentersPage() {
  const { t, isRTL, formatDate } = useI18n();
  const { currentUser } = useAuth() as any;
  const { canView, canCreate, canEdit } = usePermissions();

  // ── Company ──────────────────────────────────────────────────────────────────
  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);

  // Debounce search slightly via local state (no external lib needed)
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(value), 300);
  }

  // ── Queries ──────────────────────────────────────────────────────────────────
  const costCenters = useQuery(
    api.costCenters.getCostCenters,
    companyId
      ? { companyId, userId: currentUser?._id, activeOnly, search: debouncedSearch || undefined }
      : "skip"
  );

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const createCostCenter = useMutation(api.costCenters.createCostCenter);
  const updateCostCenter = useMutation(api.costCenters.updateCostCenter);
  const archiveCostCenter = useMutation(api.costCenters.archiveCostCenter);

  // ── Modal state ───────────────────────────────────────────────────────────────
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState({
    code: "",
    nameAr: "",
    nameEn: "",
    isActive: true,
  });

  // ── Archive confirm state ─────────────────────────────────────────────────────
  const [archiveTarget, setArchiveTarget] = useState<any>(null);

  // ── Async feedback ────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  function resetForm() {
    setForm({ code: "", nameAr: "", nameEn: "", isActive: true });
    setErr(null);
  }

  function openCreate() {
    resetForm();
    setEditTarget(null);
    setModal("create");
  }

  function openEdit(cc: any) {
    setEditTarget(cc);
    setForm({
      code: cc.code,
      nameAr: cc.nameAr,
      nameEn: cc.nameEn ?? "",
      isActive: cc.isActive,
    });
    setErr(null);
    setModal("edit");
  }

  // ── Save (create or update) ───────────────────────────────────────────────────
  async function onSave() {
    if (!companyId || !currentUser) return;
    if (!form.code.trim() || !form.nameAr.trim()) {
      setErr(isRTL ? "الرمز والاسم العربي مطلوبان" : "Code and Arabic name are required");
      return;
    }

    setSaving(true);
    setErr(null);
    try {
      if (modal === "create") {
        await createCostCenter({
          userId: currentUser._id,
          companyId,
          code: form.code.trim(),
          nameAr: form.nameAr.trim(),
          nameEn: form.nameEn.trim() || undefined,
        });
        flash(isRTL ? "تم إنشاء مركز التكلفة" : "Cost center created");
      } else if (modal === "edit" && editTarget) {
        await updateCostCenter({
          userId: currentUser._id,
          id: editTarget._id,
          code: form.code.trim(),
          nameAr: form.nameAr.trim(),
          nameEn: form.nameEn.trim() || undefined,
          isActive: form.isActive,
        });
        flash(isRTL ? "تم تحديث مركز التكلفة" : "Cost center updated");
      }
      setModal(null);
      resetForm();
    } catch (e: any) {
      const msg: string = e?.message ?? "";
      if (msg.includes("DUPLICATE_CODE")) {
        setErr(t("ccDuplicateCode"));
      } else {
        setErr(msg || (isRTL ? "حدث خطأ غير متوقع" : "An unexpected error occurred"));
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Archive ───────────────────────────────────────────────────────────────────
  async function onArchiveConfirm() {
    if (!archiveTarget) return;
    try {
      await archiveCostCenter({ id: archiveTarget._id, userId: currentUser._id });
      flash(isRTL ? "تم أرشفة مركز التكلفة" : "Cost center archived");
    } catch (e: any) {
      setErr(e?.message ?? (isRTL ? "حدث خطأ" : "Error"));
    } finally {
      setArchiveTarget(null);
    }
  }

  // ── Name column (language-aware) ──────────────────────────────────────────────
  function displayName(cc: any): string {
    if (!isRTL && cc.nameEn) return cc.nameEn;
    return cc.nameAr;
  }

  // ── Loading guard ─────────────────────────────────────────────────────────────
  const isLoading = costCenters === undefined;
  const rows = costCenters ?? [];

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">

      {/* ── Success flash ─────────────────────────────────────────────────────── */}
      {successMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-green-600 text-white rounded-xl px-4 py-2 shadow-lg text-sm">
          <Check className="h-4 w-4" />
          {successMsg}
        </div>
      )}

      {/* ── Page header ───────────────────────────────────────────────────────── */}
      <div className="no-print">
        <PageHeader
          icon={Layers}
          title={t("costCenters")}
          subtitle={t("costCentersDesc")}
          actions={canCreate("settings") ? (
            <button
              onClick={openCreate}
              className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              {t("newCostCenter")}
            </button>
          ) : undefined}
        />
      </div>

      {/* ── Top-level error banner ────────────────────────────────────────────── */}
      {err && !modal && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{err}</span>
          <button onClick={() => setErr(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Filter bar ────────────────────────────────────────────────────────── */}
      <div className="surface-card p-4 flex flex-wrap gap-3 items-center">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className={`absolute top-2.5 h-4 w-4 text-[color:var(--ink-400)] ${isRTL ? "right-2.5" : "left-2.5"}`}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t("search")}
            className={`w-full border border-[color:var(--ink-300)] rounded-lg py-2 text-sm bg-white focus:ring-2 focus:ring-[color:var(--brand-400)] outline-none transition-colors ${
              isRTL ? "pr-8 pl-3" : "pl-8 pr-3"
            }`}
          />
        </div>

        {/* Active / All toggle */}
        <div className="flex items-center rounded-lg border border-[color:var(--ink-200)] overflow-hidden shrink-0">
          <button
            onClick={() => setActiveOnly(false)}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${
              !activeOnly
                ? "bg-[color:var(--brand-600)] text-white"
                : "text-[color:var(--ink-600)] hover:bg-[color:var(--ink-50)]"
            }`}
          >
            {t("ccAllStatuses")}
          </button>
          <button
            onClick={() => setActiveOnly(true)}
            className={`px-4 py-1.5 text-sm font-medium transition-colors border-s border-[color:var(--ink-200)] ${
              activeOnly
                ? "bg-[color:var(--brand-600)] text-white"
                : "text-[color:var(--ink-600)] hover:bg-[color:var(--ink-50)]"
            }`}
          >
            {t("ccActiveOnly")}
          </button>
        </div>
      </div>

      {/* ── Data table card ───────────────────────────────────────────────────── */}
      <div className="surface-card overflow-x-auto">
        {isLoading ? (
          <LoadingState label={t("loading")} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Layers}
            title={t("costCenters")}
            message={
              debouncedSearch || activeOnly
                ? isRTL
                  ? "لا توجد نتائج تطابق معايير البحث"
                  : "No cost centers match the current filters"
                : isRTL
                ? "لم يتم إضافة أي مراكز تكلفة بعد"
                : "No cost centers have been added yet"
            }
            action={
              !debouncedSearch && !activeOnly && canCreate("settings") ? (
                <button
                  onClick={openCreate}
                  className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                >
                  <Plus className="h-4 w-4" />
                  {t("newCostCenter")}
                </button>
              ) : undefined
            }
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("ccCode")}</th>
                <th>{isRTL ? t("ccNameAr") : t("ccNameEn")}</th>
                <th>{t("ccStatus")}</th>
                <th>{t("updatedAt") ?? (isRTL ? "آخر تعديل" : "Updated At")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((cc: any) => (
                <tr key={cc._id}>
                  {/* Code */}
                  <td>
                    <span className="font-mono text-sm font-medium text-[color:var(--ink-800)]">
                      {cc.code}
                    </span>
                  </td>

                  {/* Name */}
                  <td className="font-medium text-[color:var(--ink-900)]">
                    {displayName(cc)}
                  </td>

                  {/* Status */}
                  <td>
                    <CcStatusBadge isActive={cc.isActive} t={t} />
                  </td>

                  {/* Updated at */}
                  <td className="muted whitespace-nowrap">
                    {cc.updatedAt
                      ? formatDate(cc.updatedAt)
                      : "—"}
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="flex items-center gap-1">
                      {canEdit("settings") && (
                      <button
                        onClick={() => openEdit(cc)}
                        title={t("edit")}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      )}
                      {canEdit("settings") && cc.isActive && (
                        <button
                          onClick={() => setArchiveTarget(cc)}
                          title={t("archive")}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Create / Edit Modal ───────────────────────────────────────────────── */}
      {modal && (
        <Modal
          title={modal === "create" ? t("newCostCenter") : t("editCostCenter")}
          onClose={() => { setModal(null); resetForm(); }}
        >
          {/* Code */}
          <Field label={t("ccCode")}>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              className={inputClass}
              placeholder={isRTL ? "مثال: CC-001" : "e.g. CC-001"}
              dir="ltr"
            />
          </Field>

          {/* Name Arabic */}
          <Field label={t("ccNameAr")}>
            <input
              type="text"
              value={form.nameAr}
              onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
              className={inputClass}
              placeholder={isRTL ? "الاسم بالعربية" : "Name in Arabic"}
              dir="rtl"
            />
          </Field>

          {/* Name English */}
          <Field label={t("ccNameEn")}>
            <input
              type="text"
              value={form.nameEn}
              onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
              className={inputClass}
              placeholder={isRTL ? "الاسم بالإنجليزية (اختياري)" : "Name in English (optional)"}
              dir="ltr"
            />
          </Field>

          {/* Active checkbox (edit mode only) */}
          {modal === "edit" && (
            <Field label={t("ccStatus")}>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    form.isActive ? "bg-green-500" : "bg-[color:var(--ink-300)]"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      form.isActive
                        ? isRTL ? "translate-x-1" : "translate-x-5"
                        : isRTL ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </div>
                <span className="text-sm text-[color:var(--ink-700)]">
                  {form.isActive ? t("ccActive") : t("ccArchived")}
                </span>
              </label>
            </Field>
          )}

          {/* Error */}
          {err && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}

          {/* Buttons */}
          <div className={`flex gap-3 mt-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex-1 btn-primary disabled:opacity-50 rounded-xl py-2 text-sm font-semibold"
            >
              {saving ? (isRTL ? "جاري الحفظ..." : "Saving...") : t("save")}
            </button>
            <button
              onClick={() => { setModal(null); resetForm(); }}
              className="flex-1 btn-ghost rounded-xl py-2 text-sm font-semibold"
            >
              {t("cancel")}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Archive confirmation ──────────────────────────────────────────────── */}
      {archiveTarget && (
        <ConfirmDialog
          message={`${t("ccArchiveConfirm")} "${
            isRTL ? archiveTarget.nameAr : (archiveTarget.nameEn || archiveTarget.nameAr)
          }" (${archiveTarget.code})?`}
          onConfirm={onArchiveConfirm}
          onCancel={() => setArchiveTarget(null)}
          t={t}
        />
      )}
    </div>
  );
}
