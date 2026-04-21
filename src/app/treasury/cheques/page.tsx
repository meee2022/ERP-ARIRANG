// @ts-nocheck
"use client";

import React, { useState, useRef, useEffect } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatDateShort } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Eye, X, Check, Search, FileCheck, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppStore } from "@/store/useAppStore";

function todayISO() { return new Date().toISOString().split("T")[0]; }
function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ─── Status actions available per cheque status ────────────────────────────────

const RECEIVED_ACTIONS = [
  { status: "deposited",     labelKey: "markDeposited" },
  { status: "bounced",       labelKey: "markBounced" },
  { status: "stopped",       labelKey: "markStopped" },
] as const;

const ISSUED_ACTIONS = [
  { status: "presented",     labelKey: "markPresented" },
  { status: "cleared_issued", labelKey: "markClearedIssued" },
  { status: "stopped",       labelKey: "markStopped" },
] as const;

const DEPOSITED_ACTIONS = [
  { status: "cleared",       labelKey: "markCleared" },
  { status: "bounced",       labelKey: "markBounced" },
] as const;

function getActions(cheque: any) {
  switch (cheque.chequeStatus) {
    case "received":  return RECEIVED_ACTIONS;
    case "issued":    return ISSUED_ACTIONS;
    case "deposited": return DEPOSITED_ACTIONS;
    default:          return [];
  }
}

// ─── Status Update Dropdown ───────────────────────────────────────────────────

function StatusDropdown({ cheque, onUpdate }: { cheque: any; onUpdate: (chequeId: string, newStatus: string) => Promise<void> }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const actions = getActions(cheque);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (actions.length === 0) return null;

  const handleAction = async (newStatus: string) => {
    setOpen(false);
    setUpdating(true);
    try {
      await onUpdate(cheque._id, newStatus);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={updating}
        className="h-7 px-2.5 inline-flex items-center gap-1 rounded-md border border-[color:var(--ink-200)] text-xs text-[color:var(--ink-600)] hover:bg-[color:var(--ink-50)] disabled:opacity-50 transition-colors"
      >
        {updating ? (
          <span className="animate-spin inline-block h-3 w-3 border border-[color:var(--brand-600)] border-t-transparent rounded-full" />
        ) : (
          <>{t("updateStatus")}<ChevronDown className="h-3 w-3" /></>
        )}
      </button>
      {open && (
        <div className="absolute z-30 mt-1 end-0 w-44 rounded-lg shadow-lg border border-[color:var(--ink-100)] bg-white py-1">
          {actions.map(({ status, labelKey }) => (
            <button
              key={status}
              onClick={() => handleAction(status)}
              className="w-full text-start px-3 py-2 text-xs text-[color:var(--ink-700)] hover:bg-[color:var(--brand-50)] hover:text-[color:var(--brand-800)] transition-colors"
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── New Cheque Form ──────────────────────────────────────────────────────────

function NewChequeForm({ onClose }: { onClose: () => void }) {
  const { t, isRTL } = useI18n();
  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const accounts = useQuery(
    api.accounts.getAll,
    company ? { companyId: company._id } : "skip"
  );
  const customers = useQuery(
    api.customers.getAll,
    company ? { companyId: company._id } : "skip"
  );
  const suppliers = useQuery(
    api.suppliers.getAll,
    company ? { companyId: company._id } : "skip"
  );
  const branch = useQuery(
    api.branches.getDefaultBranch,
    company ? { companyId: company._id } : "skip"
  );
  const selectedBranchStore = useAppStore((s) => s.selectedBranch);
  const effectiveBranchId = selectedBranchStore !== "all" ? selectedBranchStore : branch?._id;
  const { currentUser: defaultUser } = useAuth();
  const defaultCurrency = useQuery(api.helpers.getDefaultCurrency, {});
  const createCheque = useMutation(api.treasury.createCheque);

  const [form, setForm] = useState({
    chequeType: "received",
    chequeNumber: "",
    drawnOnBank: "",        // displayed as "Bank Name" in UI
    drawerName: "",         // stored in notes for display; actual schema uses customerId/supplierId
    amount: "",
    dueDate: todayISO(),    // chequeDate in UI
    issueDate: todayISO(),  // voucherDate in UI
    glAccountId: "",
    bankAccountId: "",
    customerId: "",
    supplierId: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const postableAccounts = (accounts ?? []).filter((a: any) => a.isPostable);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!effectiveBranchId && !branch) { setError("لا يوجد فرع افتراضي للشركة"); return; }
    if (!defaultUser) { setError("لا يوجد مستخدم في النظام"); return; }
    if (!defaultCurrency) { setError("لا توجد عملة افتراضية في النظام"); return; }
    if (!form.chequeNumber.trim()) { setError(t("chequeNo") + " " + t("required")); return; }
    if (!form.amount || Number(form.amount) <= 0) { setError(t("errInvalidAmount")); return; }
    if (!form.glAccountId) { setError(t("glAccount") + " " + t("required")); return; }

    setSaving(true);
    setError("");
    try {
      // bankAccountId is required by schema; we use glAccountId as a stand-in
      // when a real bank account picker is not available
      const notesWithDrawer = form.drawerName
        ? `${form.drawerName}${form.notes ? " | " + form.notes : ""}`
        : form.notes;

      await createCheque({
        companyId: company._id,
        branchId: (effectiveBranchId ?? branch?._id) as any,
        chequeNumber: form.chequeNumber,
        chequeType: form.chequeType as any,
        bankAccountId: form.glAccountId as any,  // best-effort mapping
        customerId: (form.chequeType === "received" && form.customerId)
          ? (form.customerId as any) : undefined,
        supplierId: (form.chequeType === "issued" && form.supplierId)
          ? (form.supplierId as any) : undefined,
        amount: Math.round(Number(form.amount) * 100),
        currencyId: defaultCurrency._id,
        exchangeRate: 1,
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        drawnOnBank: form.drawnOnBank || undefined,
        glAccountId: form.glAccountId as any,
        notes: notesWithDrawer || undefined,
        createdBy: defaultUser._id,
      });
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const isReceived = form.chequeType === "received";

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[color:var(--ink-900)]">
          {t("newChequeForm")}
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[color:var(--ink-50)] text-[color:var(--ink-400)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* Cheque Type */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
            {t("chequeType")} *
          </label>
          <select
            value={form.chequeType}
            onChange={(e) => set("chequeType", e.target.value)}
            className="input-field h-9"
          >
            <option value="received">{t("chequeTypeReceived")}</option>
            <option value="issued">{t("chequeTypeIssued")}</option>
          </select>
        </div>

        {/* Cheque Number */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
            {t("chequeNo")} *
          </label>
          <input
            required
            value={form.chequeNumber}
            onChange={(e) => set("chequeNumber", e.target.value)}
            className="input-field h-9 font-mono"
            placeholder="000001"
          />
        </div>

        {/* Bank Name */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
            {t("bankName")}
          </label>
          <input
            value={form.drawnOnBank}
            onChange={(e) => set("drawnOnBank", e.target.value)}
            className="input-field h-9"
          />
        </div>

        {/* Drawer Name (stored in notes) */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
            {t("drawerName")}
          </label>
          <input
            value={form.drawerName}
            onChange={(e) => set("drawerName", e.target.value)}
            className="input-field h-9"
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
            {t("amount")} (QAR) *
          </label>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            className="input-field h-9 tabular-nums"
          />
        </div>

        {/* Cheque Date (dueDate) */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
            {t("chequeDate")} *
          </label>
          <input
            type="date"
            required
            value={form.dueDate}
            onChange={(e) => set("dueDate", e.target.value)}
            className="input-field h-9"
          />
        </div>

        {/* Voucher / Issue Date */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
            {t("date")}
          </label>
          <input
            type="date"
            value={form.issueDate}
            onChange={(e) => set("issueDate", e.target.value)}
            className="input-field h-9"
          />
        </div>

        {/* Customer (received) or Supplier (issued) */}
        {isReceived ? (
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
              {t("customer")}
            </label>
            <select
              value={form.customerId}
              onChange={(e) => set("customerId", e.target.value)}
              className="input-field h-9"
            >
              <option value="">{t("selectCustomer")}</option>
              {(customers ?? []).map((c: any) => (
                <option key={c._id} value={c._id}>
                  {isRTL ? c.nameAr : (c.nameEn || c.nameAr)}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
              {t("supplier")}
            </label>
            <select
              value={form.supplierId}
              onChange={(e) => set("supplierId", e.target.value)}
              className="input-field h-9"
            >
              <option value="">{t("selectSupplier")}</option>
              {(suppliers ?? []).map((s: any) => (
                <option key={s._id} value={s._id}>
                  {isRTL ? s.nameAr : (s.nameEn || s.nameAr)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* GL Account */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
            {t("glAccount")} *
          </label>
          <select
            required
            value={form.glAccountId}
            onChange={(e) => set("glAccountId", e.target.value)}
            className="input-field h-9"
          >
            <option value="">{t("selectAccount")}</option>
            {postableAccounts.map((a: any) => (
              <option key={a._id} value={a._id}>
                {a.code} — {isRTL ? a.nameAr : (a.nameEn || a.nameAr)}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
            {t("notes")}
          </label>
          <input
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="input-field h-9"
          />
        </div>

        {/* Actions */}
        <div className="col-span-full flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary h-10 px-5 rounded-lg inline-flex items-center gap-2 text-sm font-semibold disabled:opacity-60"
          >
            {saving ? t("saving") : <><Check className="h-4 w-4" />{t("save")}</>}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-lg border border-[color:var(--ink-200)] text-[color:var(--ink-700)] text-sm hover:bg-[color:var(--ink-50)]"
          >
            {t("cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Type Filter Tabs ──────────────────────────────────────────────────────────

function TypeTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? "bg-[color:var(--brand-700)] text-white shadow-sm"
          : "text-[color:var(--ink-600)] hover:bg-[color:var(--ink-100)]"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChequesPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { canCreate, canEdit } = usePermissions();
  const [showForm, setShowForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "received" | "issued">("all");
  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const [search, setSearch] = useState("");

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const { currentUser: defaultUser } = useAuth();

  const cheques = useQuery(
    api.treasury.listCheques,
    company
      ? {
          chequeType: typeFilter === "all" ? undefined : (typeFilter as any),
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          branchId: branchArg as any,
        }
      : "skip"
  );

  const updateChequeStatus = useMutation(api.treasury.updateChequeStatus);

  const handleStatusUpdate = async (chequeId: string, newStatus: string) => {
    await updateChequeStatus({
      chequeId: chequeId as any,
      newStatus: newStatus as any,
      date: todayISO(),
      userId: defaultUser?._id as any,
    });
  };

  const loading = cheques === undefined;

  const filtered = (cheques ?? []).filter((c: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (c.chequeNumber ?? "").toLowerCase().includes(s) ||
      (c.drawnOnBank ?? "").toLowerCase().includes(s) ||
      (c.notes ?? "").toLowerCase().includes(s)
    );
  });

  const totalAmount = filtered.reduce((sum: number, c: any) => sum + (c.amount ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center"
            style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}
          >
            <FileCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">
              {t("chequesTitle")}
            </h1>
            <p className="text-xs text-[color:var(--ink-500)] mt-0.5">
              {filtered.length} {t("chequeCount")}
            </p>
          </div>
        </div>
        {canCreate("treasury") && (
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" /> {t("newCheque")}
        </button>
        )}
      </div>

      {/* ── Inline Create Form ─────────────────────────────────── */}
      {showForm && <NewChequeForm onClose={() => setShowForm(false)} />}

      {/* ── Type Tab Filter ────────────────────────────────────── */}
      <div className="surface-card p-3 flex items-center gap-2 flex-wrap">
        <TypeTab label={t("allCheques")} active={typeFilter === "all"} onClick={() => setTypeFilter("all")} />
        <TypeTab label={t("receivedCheques")} active={typeFilter === "received"} onClick={() => setTypeFilter("received")} />
        <TypeTab label={t("issuedCheques")} active={typeFilter === "issued"} onClick={() => setTypeFilter("issued")} />
      </div>

      {/* ── Filter Bar ────────────────────────────────────────── */}
      <div className="surface-card p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[color:var(--ink-500)]">{t("fromDate")}:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="input-field h-9 w-auto"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[color:var(--ink-500)]">{t("toDate")}:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="input-field h-9 w-auto"
          />
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className={`absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[color:var(--ink-400)] ${
              isRTL ? "right-3" : "left-3"
            }`}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className={`input-field h-9 ${isRTL ? "pr-9" : "pl-9"}`}
          />
        </div>
      </div>

      {/* ── Summary Row ───────────────────────────────────────── */}
      <div className="surface-card p-3 flex items-center gap-6 text-sm flex-wrap">
        <div>
          <span className="text-[color:var(--ink-500)]">{t("chequeCount")}: </span>
          <span className="font-semibold">{filtered.length}</span>
        </div>
        <div>
          <span className="text-[color:var(--ink-500)]">{t("totalCheques")}: </span>
          <span className="font-semibold tabular-nums">{formatCurrency(totalAmount / 100)}</span>
        </div>
        <div>
          <span className="text-[color:var(--ink-500)]">{t("receivedCheques")}: </span>
          <span className="font-semibold tabular-nums text-blue-700">
            {filtered.filter((c: any) => c.chequeType === "received").length}
          </span>
        </div>
        <div>
          <span className="text-[color:var(--ink-500)]">{t("issuedCheques")}: </span>
          <span className="font-semibold tabular-nums text-purple-700">
            {filtered.filter((c: any) => c.chequeType === "issued").length}
          </span>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────── */}
      <div className="surface-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[color:var(--ink-400)]">
            <div className="animate-spin h-8 w-8 border-2 border-[color:var(--brand-600)] border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm">{t("loading")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-[color:var(--ink-400)]">
            <FileCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t("noResults")}</p>
            {canCreate("treasury") && (
            <button
              onClick={() => setShowForm(true)}
              className="text-sm text-[color:var(--brand-700)] hover:underline mt-1"
            >
              + {t("newCheque")}
            </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full zebra-table text-sm">
              <thead className="bg-[color:var(--ink-50)] text-[color:var(--ink-600)] text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">{t("chequeNo")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("chequeType")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("bankName")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("drawerName")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("amount")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("chequeDate")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("chequeStatus")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => {
                  // Drawer name is stored as the first part of notes (before " | ")
                  const noteParts = (c.notes ?? "").split(" | ");
                  const drawerDisplay = noteParts.length > 1 ? noteParts[0] : (c.notes ?? "—");

                  return (
                    <tr
                      key={c._id}
                      className="border-t border-[color:var(--ink-100)] hover:bg-[color:var(--brand-50)]/40 transition-colors"
                    >
                      {/* Cheque Number */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-[color:var(--brand-700)] font-semibold">
                          {c.chequeNumber}
                        </span>
                      </td>

                      {/* Type Badge */}
                      <td className="px-4 py-3">
                        <StatusBadge status={c.chequeType} type="cheque" />
                      </td>

                      {/* Bank Name */}
                      <td className="px-4 py-3 text-[color:var(--ink-700)]">
                        {c.drawnOnBank || "—"}
                      </td>

                      {/* Drawer Name */}
                      <td className="px-4 py-3 text-[color:var(--ink-600)]">
                        {drawerDisplay}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-end font-semibold tabular-nums">
                        {formatCurrency((c.amount ?? 0) / 100)}
                      </td>

                      {/* Cheque Date (dueDate) */}
                      <td className="px-4 py-3 text-[color:var(--ink-600)]">
                        {formatDateShort(c.dueDate)}
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3">
                        <StatusBadge status={c.chequeStatus} type="cheque" />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1.5 justify-end`}>
                          {canEdit("treasury") && <StatusDropdown cheque={c} onUpdate={handleStatusUpdate} />}
                          <button
                            className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-[color:var(--ink-100)] text-[color:var(--ink-500)] transition-colors"
                            title={t("view")}
                          >
                            <Eye className="h-4 w-4" />
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
      </div>
    </div>
  );
}
