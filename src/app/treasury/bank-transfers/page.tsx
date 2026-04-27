// @ts-nocheck
"use client";
import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatDateShort } from "@/lib/utils";
import { ArrowLeftRight, Plus, X, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader } from "@/components/ui/page-header";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";

function startOfMonthISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`; }
function todayISO() { return new Date().toISOString().split("T")[0]; }

// ─── New Bank Transfer Form ───────────────────────────────────────────────────

function NewBankTransferForm({ onClose }: { onClose: () => void }) {
  const { t, isRTL } = useI18n();

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];

  const [transferDate, setTransferDate] = useState(todayISO());
  const [fromBankAccountId, setFromBankAccountId] = useState("");
  const [toBankAccountId, setToBankAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const branch = useQuery(api.branches.getDefaultBranch, company ? { companyId: company._id } : "skip");
  const selectedBranchStore = useAppStore((s) => s.selectedBranch);
  const effectiveBranchId = selectedBranchStore !== "all" ? selectedBranchStore : branch?._id;
  const openPeriod = useQuery(api.helpers.getOpenPeriod, company ? { companyId: company._id, date: transferDate } : "skip");
  const { currentUser: defaultUser } = useAuth();
  const defaultCurrency = useQuery(api.helpers.getDefaultCurrency, {});
  const bankAccounts = useQuery(api.treasury.listBankAccounts, company ? { companyId: company._id } : "skip");

  const createTransfer = useMutation(api.treasury.createBankTransfer);

  // Display label for a bank account: accountName + bankName + accountNumber
  const accountLabel = (acc: any) =>
    `${acc.accountName} — ${acc.bankName} (${acc.accountNumber})`;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!effectiveBranchId && !branch) { setError(t("errNoBranch")); return; }
    if (!openPeriod) { setError(t("errNoPeriod")); return; }
    if (!defaultUser) { setError(t("errNoUser")); return; }
    if (!defaultCurrency) { setError(t("errNoCurrency")); return; }
    if (!fromBankAccountId) { setError(t("selectBankAccount")); return; }
    if (!toBankAccountId) { setError(t("selectBankAccount")); return; }
    if (fromBankAccountId === toBankAccountId) { setError(t("errSameAccount")); return; }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) { setError(t("errInvalidAmount")); return; }

    setSaving(true);
    setError("");
    try {
      await createTransfer({
        companyId: company._id,
        branchId: (effectiveBranchId ?? branch?._id) as any,
        periodId: openPeriod._id,
        createdBy: defaultUser._id,
        currencyId: defaultCurrency._id,
        fromBankAccountId: fromBankAccountId as any,
        toBankAccountId: toBankAccountId as any,
        amount: Math.round(parsedAmount * 100),
        transferDate,
        reference: reference || undefined,
        description: description || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message ?? t("errUnexpected"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-[color:var(--ink-900)]">{t("newBankTransfer")}</h3>
        <button type="button" onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[color:var(--ink-50)] text-[color:var(--ink-400)]">
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* Transfer Date */}
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("transferDate")} *</label>
            <input
              type="date"
              required
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              className="input-field h-9"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("transferAmount")} *</label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-field h-9 tabular-nums"
              placeholder="0.00"
            />
          </div>

          {/* Reference */}
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("reference")}</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="input-field h-9"
            />
          </div>

          {/* From Bank Account */}
          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("fromAccount")} *</label>
            <select
              required
              value={fromBankAccountId}
              onChange={(e) => setFromBankAccountId(e.target.value)}
              className="input-field h-9"
            >
              <option value="">{t("selectBankAccount")}</option>
              {(bankAccounts ?? []).map((acc: any) => (
                <option key={acc._id} value={acc._id}>{accountLabel(acc)}</option>
              ))}
            </select>
          </div>

          {/* To Bank Account */}
          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("toAccount")} *</label>
            <select
              required
              value={toBankAccountId}
              onChange={(e) => setToBankAccountId(e.target.value)}
              className="input-field h-9"
            >
              <option value="">{t("selectBankAccount")}</option>
              {(bankAccounts ?? [])
                .filter((acc: any) => acc._id !== fromBankAccountId)
                .map((acc: any) => (
                  <option key={acc._id} value={acc._id}>{accountLabel(acc)}</option>
                ))}
            </select>
          </div>
        </div>

        {/* Description / Notes */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("description")}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="input-field w-full resize-none text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BankTransfersPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { canCreate, canPost } = usePermissions();
  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const [showForm, setShowForm] = useState(false);

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const transfers = useQuery(api.treasury.listBankTransfers, company ? { companyId: company._id, fromDate, toDate, branchId: branchArg as any } : "skip");
  const bankAccounts = useQuery(api.treasury.listBankAccounts, company ? { companyId: company._id } : "skip");

  const loading = transfers === undefined;
  const data = transfers ?? [];

  // Build a lookup map for bank account names
  const accountMap: Record<string, string> = {};
  (bankAccounts ?? []).forEach((acc: any) => {
    accountMap[acc._id] = `${acc.accountName} — ${acc.bankName}`;
  });

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      {/* Header */}
      <div className="no-print">
      <PageHeader
        icon={ArrowLeftRight}
        title={t("bankTransfersTitle")}
        subtitle={String(data.length)}
        actions={
          canCreate("treasury") ? (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" /> {t("newBankTransfer")}
            </button>
          ) : undefined
        }
      />
      </div>

      {/* Inline Form */}
      {showForm && <NewBankTransferForm onClose={() => setShowForm(false)} />}

      {/* Filter Bar */}
      <FilterPanel>
        <FilterField label={t("fromDate")}>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input-field h-9 w-auto" />
        </FilterField>
        <FilterField label={t("toDate")}>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input-field h-9 w-auto" />
        </FilterField>
      </FilterPanel>

      {/* Table */}
      <div className="surface-card overflow-hidden">
        {loading ? (
          <LoadingState label={t("loading")} />
        ) : data.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title={t("noResults")}
            action={
              canCreate("treasury") ? (
                <button onClick={() => setShowForm(true)}
                  className="btn-primary h-9 px-5 rounded-xl inline-flex items-center gap-2 text-sm font-semibold">
                  <Plus className="h-4 w-4" /> {t("newBankTransfer")}
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("reference")}</th>
                  <th>{t("date")}</th>
                  <th>{t("fromAccount")}</th>
                  <th>{t("toAccount")}</th>
                  <th className="text-end">{t("amount")}</th>
                  <th>{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((tr: any) => (
                  <tr key={tr._id} className="border-t border-[color:var(--ink-100)] hover:bg-[color:var(--brand-50)]/40">
                    <td className="px-4 py-2.5"><span className="code">{tr.transferNumber}</span></td>
                    <td className="px-4 py-2.5 muted">{formatDateShort(tr.transferDate)}</td>
                    <td className="px-4 py-2.5 muted">{accountMap[tr.fromAccountId] ?? tr.fromAccountId}</td>
                    <td className="px-4 py-2.5 muted">{accountMap[tr.toAccountId] ?? tr.toAccountId}</td>
                    <td className="px-4 py-2.5 numeric text-end">{formatCurrency(tr.amount / 100)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tr.postingStatus === "posted" ? "bg-emerald-50 text-emerald-700" : "bg-[color:var(--ink-100)] text-[color:var(--ink-600)]"}`}>
                        {t(tr.postingStatus === "posted" ? "statusPosted" : "statusDraft")}
                      </span>
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
