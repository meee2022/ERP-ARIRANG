// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatDateShort, friendlyError } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Eye, X, Check, Search, CreditCard, WalletCards, CheckCircle2, Scale, Calendar, Filter, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader } from "@/components/ui/page-header";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CostCenterSelect } from "@/components/ui/cost-center-select";
import { SummaryStrip, LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";

function todayISO() { return new Date().toISOString().split("T")[0]; }
function currentMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
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
    forMonth: currentMonthISO(),
    costCenterId: "",
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
        amount: Math.round(Number(form.amount) * 100) / 100,
        currencyId: defaultCurrency._id,
        exchangeRate: 1,
        paymentMethod: form.paymentMethod as any,
        reference: form.reference || undefined,
        forMonth: form.forMonth || undefined,
        costCenterId: form.costCenterId ? (form.costCenterId as any) : undefined,
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
          <SearchableSelect
            isRTL={isRTL}
            value={form.supplierId}
            onChange={(v) => set("supplierId", v)}
            placeholder={t("selectSupplier")}
            searchPlaceholder={isRTL ? "ابحث باسم المورد..." : "Search supplier..."}
            emptyMessage={isRTL ? "لا توجد نتائج" : "No results"}
            options={(suppliers ?? []).map((s: any) => ({
              value: s._id,
              label: isRTL ? s.nameAr : (s.nameEn || s.nameAr),
            }))}
          />
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
          <SearchableSelect
            isRTL={isRTL}
            required
            value={form.cashAccountId}
            onChange={(v) => set("cashAccountId", v)}
            placeholder={t("selectAccount")}
            searchPlaceholder={isRTL ? "ابحث بالاسم أو الكود..." : "Search account..."}
            emptyMessage={isRTL ? "لا توجد نتائج" : "No results"}
            options={postableAccounts
              .filter((a: any) => String(a.code ?? "").startsWith("11"))
              .map((a: any) => ({
                value: a._id,
                label: `${a.code} — ${isRTL ? a.nameAr : (a.nameEn || a.nameAr)}`,
              }))}
          />
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

        {/* For Month */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
            {t("forMonth")}
          </label>
          <input
            type="month"
            value={form.forMonth}
            onChange={(e) => set("forMonth", e.target.value)}
            className="input-field h-9"
          />
        </div>

        {/* Cost Center */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
            {t("costCenter")}
          </label>
          <CostCenterSelect companyId={company?._id} value={form.costCenterId} onChange={(v) => set("costCenterId", v)} />
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

function PaymentLifecycleActions({ payment, userId, companyId }: { payment: any; userId: string | undefined; companyId: string | undefined }) {
  const { t, isRTL } = useI18n();
  const [loadingAction, setLoadingAction] = useState<"delete" | "cancel" | "reverse" | "post" | null>(null);
  const [err, setErr] = useState("");
  const removeDraft = useMutation(api.treasury.deleteDraftCashPaymentVoucher);
  const cancelPayment = useMutation(api.treasury.cancelCashPaymentVoucher);
  const reversePayment = useMutation(api.treasury.reverseCashPaymentVoucher);
  const postPayment = useMutation(api.treasury.postCashPaymentVoucher);
  const today = new Date().toISOString().split("T")[0];
  const openPeriod = useQuery(
    api.helpers.getOpenPeriod,
    companyId ? { companyId: companyId as any, date: today } : "skip"
  );
  const postingRules = useQuery(
    api.postingRules.getPostingRules,
    companyId ? { companyId: companyId as any } : "skip"
  );

  if (!userId) return null;

  const handlePost = async () => {
    if (!postingRules?.apAccountId) {
      setErr(isRTL
        ? "لم يتم تحديد حساب الذمم الدائنة. روح Settings → Posting Rules وحدد AP Account."
        : "AP account not configured. Go to Settings → Posting Rules and set the AP Account.");
      return;
    }
    setLoadingAction("post");
    setErr("");
    try {
      await postPayment({
        voucherId: payment._id,
        userId: userId as any,
        apAccountId: postingRules.apAccountId as any,
      });
    } catch (e: any) {
      setErr(friendlyError(e, isRTL));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("سيتم حذف مسودة سند الصرف نهائيًا. هل تريد المتابعة؟")) return;
    setLoadingAction("delete");
    setErr("");
    try {
      await removeDraft({ voucherId: payment._id, userId: userId as any });
    } catch (e: any) {
      setErr(e.message ?? t("delete"));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm(isRTL ? "سيتم إلغاء سند الصرف قبل الترحيل. هل تريد المتابعة؟" : "This payment will be cancelled. Continue?")) return;
    setLoadingAction("cancel");
    setErr("");
    try {
      await cancelPayment({ voucherId: payment._id, userId: userId as any });
    } catch (e: any) {
      setErr(e.message ?? t("cancel"));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReverse = async () => {
    if (!openPeriod) { setErr(t("errNoPeriod")); return; }
    if (!window.confirm("سيتم إنشاء عكس محاسبي لسند الصرف المرحل. هل تريد المتابعة؟")) return;
    setLoadingAction("reverse");
    setErr("");
    try {
      await reversePayment({
        voucherId: payment._id,
        userId: userId as any,
        reversalDate: today,
        reversalPeriodId: openPeriod._id,
      });
    } catch (e: any) {
      setErr(e.message ?? t("reverse"));
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      {err ? <span className="text-xs text-red-600 max-w-[220px] text-end leading-tight">{err}</span> : null}
      <div className="inline-flex items-center gap-1">
        {payment.postingStatus === "unposted" ? (
          <button onClick={handlePost} disabled={loadingAction !== null}
            className="h-7 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 disabled:opacity-60">
            {loadingAction === "post" ? t("loading") : <><Check className="h-3.5 w-3.5" /> {t("post")}</>}
          </button>
        ) : null}
        {payment.documentStatus === "draft" && payment.postingStatus === "unposted" ? (
          <button onClick={handleDelete} disabled={loadingAction !== null} className="h-7 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 disabled:opacity-60">
            {loadingAction === "delete" ? t("loading") : t("delete")}
          </button>
        ) : null}
        {payment.postingStatus === "unposted" && payment.documentStatus === "approved" ? (
          <button onClick={handleCancel} disabled={loadingAction !== null} className="h-7 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 disabled:opacity-60">
            {loadingAction === "cancel" ? t("loading") : t("cancel")}
          </button>
        ) : null}
        {payment.postingStatus === "posted" ? (
          <button onClick={handleReverse} disabled={loadingAction !== null || !openPeriod} className="h-7 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 disabled:opacity-60">
            {loadingAction === "reverse" ? t("loading") : t("reverse")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─── Premium Stat Component ─────────────────────────────────────────────────────

function PaymentStatCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-white shadow-sm border p-4 hover:shadow-md transition-all duration-300 group flex-1`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      <div className="relative flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br ${color} text-white`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</div>
          <div className="text-xl font-bold text-gray-900 tabular-nums">{value}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

import { useSearchParams } from "next/navigation";

export default function PaymentsPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { canCreate, canPost } = usePermissions();
  const { currentUser: defaultUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(searchParams.get("new") === "true");
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
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="no-print">
      <PageHeader
        icon={CreditCard}
        title={t("cashPaymentsTitle")}
        badge={<span className="text-xs text-[color:var(--ink-400)] font-normal">({filtered.length})</span>}
        actions={canCreate("treasury") ? (
          <button onClick={() => setShowForm((v) => !v)}
            className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
            <Plus className="h-4 w-4" /> {t("newPayment")}
          </button>
        ) : undefined}
      />
      </div>

      {/* ── Inline Create Form ─────────────────────────────────── */}
      {showForm && <NewPaymentForm onClose={() => setShowForm(false)} />}

      {/* Modern Filter Strip - Box Design */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 flex flex-wrap items-end gap-3 w-full">
        <button className="h-10 px-3 border border-gray-200 rounded-md flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <Filter className="h-4 w-4" /> {t("filters")}
        </button>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">{t("fromDate")}</label>
          <div className="relative">
            <Calendar className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? "right-3" : "left-3"}`} />
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className={`h-10 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-400 w-[160px]`} />
          </div>
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">{t("toDate")}</label>
          <div className="relative">
            <Calendar className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? "right-3" : "left-3"}`} />
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className={`h-10 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-400 w-[160px]`} />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">{t("postingStatus")}</label>
          <select value={postingStatus} onChange={(e) => setPostingStatus(e.target.value)}
            className="h-10 px-3 border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-400 min-w-[140px] bg-white cursor-pointer appearance-none">
            <option value="">{t("all")}</option>
            <option value="unposted">{t("statusUnposted")}</option>
            <option value="posted">{t("statusPosted")}</option>
            <option value="reversed">{t("statusReversed")}</option>
          </select>
        </div>

        <div className={`flex-1 min-w-[200px] ${isRTL ? "mr-auto" : "ml-auto"}`}>
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? "right-3" : "left-3"}`} />
            <input 
              type="text" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className={`w-full h-10 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-400`} 
            />
          </div>
        </div>
      </div>

      {/* Premium KPI Cards - Modern Design */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PaymentStatCard 
          title={isRTL ? "عدد السندات" : "Payment Count"} 
          value={filtered.length} 
          icon={CreditCard}
          color="from-blue-500 to-blue-600"
        />
        <PaymentStatCard 
          title={isRTL ? "إجمالي المبالغ" : "Total Amount"} 
          value={formatCurrency(totalAmount)} 
          icon={WalletCards}
          color="from-green-500 to-green-600"
        />
        <PaymentStatCard 
          title={isRTL ? "المرحل" : "Posted"} 
          value={formatCurrency(postedAmount)} 
          icon={CheckCircle2}
          color="from-emerald-500 to-emerald-600"
        />
        <PaymentStatCard 
          title={isRTL ? "المعلق" : "Unposted"} 
          value={formatCurrency((totalAmount - postedAmount))} 
          icon={Clock}
          color="from-amber-500 to-amber-600"
        />
      </div>

      {/* ── Table ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-[color:var(--ink-100)] overflow-hidden">
        {loading ? (
          <LoadingState label={t("loading")} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title={t("noResults")}
            action={canCreate("treasury") ? (
              <button onClick={() => setShowForm(true)}
                className="btn-primary h-10 px-5 rounded-xl inline-flex items-center gap-2 text-sm font-semibold">
                <Plus className="h-4 w-4" /> {t("newPayment")}
              </button>
            ) : undefined}
          />
        ) : (
          <>
          {/* Mobile cards */}
          <div className="mobile-list p-3 space-y-2.5">
            {filtered.map((p: any) => (
              <div key={p._id} className="record-card">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--ink-100)] text-[var(--ink-600)] inline-block mb-1">{p.voucherNumber}</span>
                    <p className="text-[14px] font-bold text-[var(--ink-900)]">{p.paidTo ?? "—"}</p>
                    {p.supplierName && <p className="text-[11px] text-[var(--ink-500)]">{p.supplierName}</p>}
                    <p className="text-[11px] text-[var(--ink-400)] mt-0.5">{p.voucherDate} · <PaymentMethodLabel method={p.paymentMethod} t={t} /></p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="text-[18px] font-bold tabular-nums text-rose-600">{formatCurrency((p.amount ?? 0))}</p>
                    <StatusBadge status={p.postingStatus} type="posting" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="desktop-table overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse" dir={isRTL ? "rtl" : "ltr"}>
              <thead>
                <tr style={{ background: "var(--brand-700)" }}>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap">{t("paymentNo")}</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap">{t("date")}</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap">{t("paidTo")}</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-white/80 uppercase tracking-widest text-end whitespace-nowrap">{t("amount")}</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap">{t("paymentMethod")}</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap">{t("postingStatus")}</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-white/80 uppercase tracking-widest text-end whitespace-nowrap">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p: any) => (
                  <tr key={p._id} className="group hover:bg-gray-50/80 transition-all duration-200">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] ld bg-gray-100 text-gray-600 border border-gray-200">
                        {p.voucherNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-medium">{formatDateShort(p.voucherDate)}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 text-sm">{p.paidTo ?? "—"}</div>
                      {p.supplierName && <div className="text-[10px] text-gray-400 font-medium mt-0.5">{p.supplierName}</div>}
                    </td>
                    <td className="px-6 py-4 text-end tabular-nums font-bold text-gray-900 text-sm">{formatCurrency((p.amount ?? 0))}</td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-medium"><PaymentMethodLabel method={p.paymentMethod} t={t} /></td>
                    <td className="px-6 py-4"><StatusBadge status={p.postingStatus} type="posting" /></td>
                    <td className="px-6 py-4 text-end">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <PaymentLifecycleActions payment={p} userId={defaultUser?._id} companyId={company?._id} />
                        <button onClick={() => router.push(`/treasury/payments/${p._id}`)} className="h-8 w-8 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-sm flex items-center justify-center transition-all" title={t("view")}>
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
