// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatDateShort } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Eye, X, Check, Search, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppStore } from "@/store/useAppStore";

function todayISO() { return new Date().toISOString().split("T")[0]; }
function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ─── New Payment Form ─────────────────────────────────────────────────────────

function NewPaymentForm({ onClose }: { onClose: () => void }) {
  const { t, isRTL } = useI18n();
  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const suppliers = useQuery(
    api.suppliers.getAll,
    company ? { companyId: company._id } : "skip"
  );
  const accounts = useQuery(
    api.accounts.getAll,
    company ? { companyId: company._id } : "skip"
  );
  const branch = useQuery(
    api.branches.getDefaultBranch,
    company ? { companyId: company._id } : "skip"
  );
  const selectedBranchStore = useAppStore((s) => s.selectedBranch);
  const effectiveBranchId = selectedBranchStore !== "all" ? selectedBranchStore : branch?._id;
  const [voucherDate, setVoucherDate] = React.useState(todayISO());
  const openPeriod = useQuery(
    api.helpers.getOpenPeriod,
    company ? { companyId: company._id, date: voucherDate } : "skip"
  );
  const { currentUser: defaultUser } = useAuth();
  const defaultCurrency = useQuery(api.helpers.getDefaultCurrency, {});
  const createPayment = useMutation(api.treasury.createCashPaymentVoucher);

  const [form, setForm] = useState({
    paidTo: "",
    supplierId: "",
    paymentType: "supplier_payment",
    cashAccountId: "",
    amount: "",
    paymentMethod: "cash",
    reference: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!effectiveBranchId && !branch) { setError(t("errNoBranch")); return; }
    if (!openPeriod) { setError(t("errNoPeriod")); return; }
    if (!defaultUser) { setError(t("errNoUser")); return; }
    if (!defaultCurrency) { setError(t("errNoCurrency")); return; }
    if (!form.cashAccountId) { setError(t("errMustSelectCashAccount")); return; }
    if (!form.amount || Number(form.amount) <= 0) { setError(t("errInvalidAmount")); return; }
    setSaving(true);
    setError("");
    try {
      await createPayment({
        companyId: company._id,
        branchId: (effectiveBranchId ?? branch?._id) as any,
        voucherDate: voucherDate,
        periodId: openPeriod._id,
        paidTo: form.paidTo,
        supplierId: form.supplierId ? (form.supplierId as any) : undefined,
        paymentType: form.paymentType as any,
        cashAccountId: form.cashAccountId as any,
        amount: Math.round(Number(form.amount) * 100),
        currencyId: defaultCurrency._id,
        exchangeRate: 1,
        paymentMethod: form.paymentMethod as any,
        reference: form.reference || undefined,
        notes: form.notes || undefined,
        createdBy: defaultUser._id,
      });
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const postableAccounts = (accounts ?? []).filter((a: any) => a.isPostable);

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[color:var(--ink-900)]">
          {t("newPaymentVoucher")}
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
        {/* Paid To */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
            {t("paidTo")} *
          </label>
          <input
            required
            value={form.paidTo}
            onChange={(e) => set("paidTo", e.target.value)}
            className="input-field h-9"
            placeholder={t("paidTo")}
          />
        </div>

        {/* Supplier */}
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

        {/* Payment Type */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
            {t("paymentType")} *
          </label>
          <select
            value={form.paymentType}
            onChange={(e) => set("paymentType", e.target.value)}
            className="input-field h-9"
          >
            <option value="supplier_payment">{t("ptSupplierPayment")}</option>
            <option value="expense_payment">{t("ptExpensePayment")}</option>
            <option value="other">{t("ptOther")}</option>
          </select>
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

        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
            {t("date")} *
          </label>
          <input
            type="date"
            required
            value={voucherDate}
            onChange={(e) => setVoucherDate(e.target.value)}
            className="input-field h-9"
          />
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
            {t("paymentMethod")}
          </label>
          <select
            value={form.paymentMethod}
            onChange={(e) => set("paymentMethod", e.target.value)}
            className="input-field h-9"
          >
            <option value="cash">{t("pmCash")}</option>
            <option value="transfer">{t("pmTransfer")}</option>
            <option value="cheque">{t("pmCheque")}</option>
          </select>
        </div>

        {/* Cash / Bank Account */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
            {t("cashOrBankAccount")} *
          </label>
          <select
            required
            value={form.cashAccountId}
            onChange={(e) => set("cashAccountId", e.target.value)}
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

        {/* Reference */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
            {t("reference")}
          </label>
          <input
            value={form.reference}
            onChange={(e) => set("reference", e.target.value)}
            className="input-field h-9"
          />
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
            {saving ? t("saving") : <><Check className="h-4 w-4" />{t("saveDraft")}</>}
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

// ─── Payment Method label map helper ─────────────────────────────────────────

function PaymentMethodLabel({ method, t }: { method: string; t: (k: any) => string }) {
  const map: Record<string, string> = {
    cash: t("pmCash"),
    transfer: t("pmTransfer"),
    cheque: t("pmCheque"),
    card: t("pmCard"),
  };
  return <>{map[method] ?? method}</>;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { canCreate, canPost } = usePermissions();
  const [showForm, setShowForm] = useState(false);
  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const [postingStatus, setPostingStatus] = useState("");
  const [search, setSearch] = useState("");

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  // Fetch company
  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];

  // Fetch payment vouchers using listCashPayments (was incorrectly using listCashReceiptVouchers)
  const payments = useQuery(
    api.treasury.listCashPayments,
    company
      ? {
          companyId: company._id,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          branchId: branchArg as any,
          postingStatus: (postingStatus || undefined) as any,
        }
      : "skip"
  );

  const loading = payments === undefined;

  // Client-side filter: posting status + search term
  const filtered = (payments ?? []).filter((p: any) => {
    if (postingStatus && p.postingStatus !== postingStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      const matchVoucher = (p.voucherNumber ?? "").toLowerCase().includes(s);
      const matchPaidTo = (p.paidTo ?? "").toLowerCase().includes(s);
      if (!matchVoucher && !matchPaidTo) return false;
    }
    return true;
  });

  const totalAmount = filtered.reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0);
  const postedAmount = filtered
    .filter((p: any) => p.postingStatus === "posted")
    .reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center"
            style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}
          >
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">
              {t("cashPaymentsTitle")}
            </h1>
            <p className="text-xs text-[color:var(--ink-500)] mt-0.5">
              {filtered.length} {t("paymentCount")}
            </p>
          </div>
        </div>
        {canCreate("treasury") && (
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" /> {t("newPayment")}
        </button>
        )}
      </div>

      {/* ── Inline Create Form ─────────────────────────────────── */}
      {showForm && <NewPaymentForm onClose={() => setShowForm(false)} />}

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
        <select
          value={postingStatus}
          onChange={(e) => setPostingStatus(e.target.value)}
          className="input-field h-9 w-auto"
        >
          <option value="">{t("allStatuses")}</option>
          <option value="unposted">{t("statusUnposted")}</option>
          <option value="posted">{t("statusPosted")}</option>
          <option value="reversed">{t("statusReversed")}</option>
        </select>
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
          <span className="text-[color:var(--ink-500)]">{t("paymentCount")}: </span>
          <span className="font-semibold">{filtered.length}</span>
        </div>
        <div>
          <span className="text-[color:var(--ink-500)]">{t("totalPayments")}: </span>
          <span className="font-semibold tabular-nums">{formatCurrency(totalAmount / 100)}</span>
        </div>
        <div>
          <span className="text-[color:var(--ink-500)]">{t("posted")}: </span>
          <span className="font-semibold tabular-nums text-emerald-700">
            {formatCurrency(postedAmount / 100)}
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
            <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t("noResults")}</p>
            {canCreate("treasury") && (
            <button
              onClick={() => setShowForm(true)}
              className="text-sm text-[color:var(--brand-700)] hover:underline mt-1"
            >
              + {t("newPayment")}
            </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full zebra-table text-sm">
              <thead className="bg-[color:var(--ink-50)] text-[color:var(--ink-600)] text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">{t("paymentNo")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("date")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("paidTo")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("amount")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("paymentMethod")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("status")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: any) => (
                  <tr
                    key={p._id}
                    className="border-t border-[color:var(--ink-100)] hover:bg-[color:var(--brand-50)]/40 transition-colors"
                  >
                    {/* Voucher Number */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-[color:var(--brand-700)]">
                        {p.voucherNumber}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-[color:var(--ink-600)]">
                      {formatDateShort(p.voucherDate)}
                    </td>

                    {/* Paid To */}
                    <td className="px-4 py-3 text-[color:var(--ink-700)]">
                      <div className="font-medium">{p.paidTo ?? "—"}</div>
                      {p.supplierName && (
                        <div className="text-xs text-[color:var(--ink-400)]">{p.supplierName}</div>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 text-end font-semibold tabular-nums">
                      {formatCurrency((p.amount ?? 0) / 100)}
                    </td>

                    {/* Payment Method */}
                    <td className="px-4 py-3 text-[color:var(--ink-600)]">
                      <PaymentMethodLabel method={p.paymentMethod} t={t} />
                    </td>

                    {/* Posting Status Badge */}
                    <td className="px-4 py-3">
                      <StatusBadge status={p.postingStatus} type="posting" />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-end">
                      <button
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-[color:var(--ink-100)] text-[color:var(--ink-500)] transition-colors"
                        title={t("view")}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
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
