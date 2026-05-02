// @ts-nocheck
"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PrintableReportPage } from "@/components/ui/printable-report";
import { LoadingState, ColorKPIGrid } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { DollarSign, ChevronDown, ChevronUp, CheckCircle2, Wallet, Clock, Eye, Hash } from "lucide-react";

function todayISO() { return new Date().toISOString().split("T")[0]; }
function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

const STATUS_BADGE: any = {
  pending:  { ar: "معلقة",  en: "Pending",  bg: "bg-amber-100",   tx: "text-amber-700" },
  approved: { ar: "معتمدة", en: "Approved", bg: "bg-blue-100",    tx: "text-blue-700" },
  paid:     { ar: "مدفوعة", en: "Paid",     bg: "bg-emerald-100", tx: "text-emerald-700" },
};

export default function SalesRepCommissionPage() {
  const { isRTL, formatCurrency } = useI18n();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { canView, canEdit } = usePermissions();
  const { company: printCompany } = useCompanySettings();
  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const [status, setStatus] = useState<string>("");
  const [salesRepFilter, setSalesRepFilter] = useState<string>("");
  const [expandedReps, setExpandedReps] = useState<Set<string>>(new Set());
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const company = companies[0];
  const salesReps = useQuery(api.salesMasters.listSalesReps, company ? { companyId: company._id } : "skip") ?? [];

  const report = useQuery(
    api.salesRepCommission.getCommissionReport,
    company ? {
      companyId: company._id,
      fromDate, toDate,
      branchId: branchArg as any,
      salesRepId: salesRepFilter ? (salesRepFilter as any) : undefined,
      status: status || undefined,
    } : "skip"
  );

  const approveCommissions = useMutation(api.salesRepCommission.approveCommissions);
  const markPaid           = useMutation(api.salesRepCommission.markCommissionsPaid);
  const payViaVoucher      = useMutation(api.salesRepCommission.payCommissionsViaVoucher);
  const backfill           = useMutation(api.salesRepCommission.backfillCommissions);

  // Cash + expense accounts for the pay modal
  const allAccounts = useQuery(api.accounts.getAll, company ? { companyId: company._id } : "skip") ?? [];
  const cashAccounts    = allAccounts.filter((a: any) => a.isPostable && a.isActive && (a.operationalType === "cash" || a.operationalType === "bank"));
  const expenseAccounts = allAccounts.filter((a: any) => a.isPostable && a.isActive && a.accountType === "expense");
  // Pre-find a likely commission expense account
  const defaultCommExp = useMemo(() => {
    const lower = (s: string) => (s || "").toLowerCase();
    return expenseAccounts.find((a: any) => {
      const t = `${lower(a.nameAr)} ${lower(a.nameEn)}`;
      return t.includes("commission") || t.includes("عمولة") || t.includes("عمولات");
    }) ?? expenseAccounts.find((a: any) => {
      const t = `${lower(a.nameAr)} ${lower(a.nameEn)}`;
      return t.includes("salary") || t.includes("راتب") || t.includes("مرتب");
    });
  }, [expenseAccounts]);

  const [showPayModal, setShowPayModal] = useState(false);
  const [payCashAccId, setPayCashAccId] = useState<string>("");
  const [payExpAccId,  setPayExpAccId]  = useState<string>("");
  const [payDate,      setPayDate]      = useState<string>(todayISO());
  const [payError,     setPayError]     = useState<string>("");

  const totals = report?.totals;
  const rows = report?.rows ?? [];

  const toggleRep = (repId: string) => {
    setExpandedReps((s) => {
      const next = new Set(s);
      if (next.has(repId)) next.delete(repId);
      else next.add(repId);
      return next;
    });
  };

  const toggleInvoice = (id: string) => {
    setSelectedInvoiceIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllOfRep = (rep: any) => {
    setSelectedInvoiceIds((s) => {
      const next = new Set(s);
      const allSelected = rep.invoices.every((inv: any) => next.has(inv.invoiceId));
      if (allSelected) {
        rep.invoices.forEach((inv: any) => next.delete(inv.invoiceId));
      } else {
        rep.invoices.forEach((inv: any) => next.add(inv.invoiceId));
      }
      return next;
    });
  };

  const selectedTotal = useMemo(() => {
    let sum = 0;
    for (const rep of rows) {
      for (const inv of rep.invoices) {
        if (selectedInvoiceIds.has(inv.invoiceId)) sum += inv.commissionAmount;
      }
    }
    return sum;
  }, [selectedInvoiceIds, rows]);

  const onApprove = async () => {
    if (!currentUser?._id || selectedInvoiceIds.size === 0) return;
    setBusy(true);
    try {
      await approveCommissions({
        invoiceIds: Array.from(selectedInvoiceIds) as any,
        userId: currentUser._id,
      });
      setSelectedInvoiceIds(new Set());
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const onOpenPayModal = () => {
    setPayError("");
    setPayCashAccId("");
    setPayExpAccId(defaultCommExp?._id ?? "");
    setPayDate(todayISO());
    setShowPayModal(true);
  };

  const onConfirmPay = async () => {
    if (!currentUser?._id || selectedInvoiceIds.size === 0) return;
    if (!payCashAccId || !payExpAccId) {
      setPayError(isRTL ? "اختر حساب الخزينة وحساب المصروف" : "Pick a cash safe and an expense account");
      return;
    }
    setBusy(true); setPayError("");
    try {
      const result: any = await payViaVoucher({
        invoiceIds: Array.from(selectedInvoiceIds) as any,
        cashAccountId: payCashAccId as any,
        expenseAccountId: payExpAccId as any,
        voucherDate: payDate,
        userId: currentUser._id,
      });
      const summary = result.vouchers
        .map((v: any) => `• ${v.repName}: ${formatCurrency(v.amount)} (${v.voucherNumber})`)
        .join("\n");
      alert(
        (isRTL ? `✅ تم إنشاء ${result.vouchers.length} سند صرف:\n` : `✅ Created ${result.vouchers.length} cash voucher(s):\n`) + summary
      );
      setSelectedInvoiceIds(new Set());
      setShowPayModal(false);
    } catch (e: any) {
      setPayError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const onBackfill = async () => {
    if (!company?._id || !currentUser?._id) return;
    if (!confirm(isRTL
      ? "احتساب العمولة للفواتير القديمة التي لم يتم احتساب عمولة لها؟"
      : "Calculate commission for old invoices missing it?")) return;
    setBusy(true);
    try {
      const result: any = await backfill({ companyId: company._id, userId: currentUser._id });
      alert(isRTL ? `تم تحديث ${result.updated} فاتورة` : `Updated ${result.updated} invoice(s)`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const summaryItems = useMemo(
    () => totals ? [
      { label: isRTL ? "إجمالي العمولة" : "Total Commission", value: formatCurrency(totals.totalCommission),
        color: "#6b1523", bg: "#fdf2f4", border: "#6b152330", icon: DollarSign, big: true,
        hint: `${totals.repCount} ${isRTL ? "مندوب" : "reps"}` },
      { label: isRTL ? "إجمالي المبيعات" : "Total Sales", value: formatCurrency(totals.totalSales),
        color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: Wallet },
      { label: isRTL ? "عدد الفواتير" : "Invoices", value: String(totals.invoiceCount),
        color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd", icon: Eye },
      { label: isRTL ? "معلقة" : "Pending", value: formatCurrency(totals.pendingCommission),
        color: "#ca8a04", bg: "#fefce8", border: "#fde68a", icon: Clock },
      { label: isRTL ? "معتمدة" : "Approved", value: formatCurrency(totals.approvedCommission),
        color: "#1e40af", bg: "#eff6ff", border: "#bfdbfe", icon: CheckCircle2 },
      { label: isRTL ? "مدفوعة" : "Paid", value: formatCurrency(totals.paidCommission),
        color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: Wallet },
    ] : [],
    [totals, formatCurrency, isRTL]
  );

  if (!canView("reports") && !canView("sales")) {
    return <EmptyState icon={DollarSign} title={isRTL ? "لا توجد صلاحية" : "Permission Denied"} />;
  }

  return (
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={isRTL ? "تقرير عمولات المندوبين" : "Sales Rep Commission Report"}
      period={`${fromDate} — ${toDate}`}
      filters={
        <FilterPanel>
          <FilterField label={isRTL ? "من تاريخ" : "From"}>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input-field h-8 w-auto text-sm" />
          </FilterField>
          <FilterField label={isRTL ? "إلى تاريخ" : "To"}>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input-field h-8 w-auto text-sm" />
          </FilterField>
          <FilterField label={isRTL ? "المندوب" : "Sales Rep"}>
            <select value={salesRepFilter} onChange={(e) => setSalesRepFilter(e.target.value)} className="input-field h-8 w-auto text-sm">
              <option value="">{isRTL ? "الكل" : "All"}</option>
              {salesReps.map((r: any) => (
                <option key={r._id} value={r._id}>{isRTL ? r.nameAr : (r.nameEn || r.nameAr)}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label={isRTL ? "الحالة" : "Status"}>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field h-8 w-auto text-sm">
              <option value="">{isRTL ? "الكل" : "All"}</option>
              <option value="pending">{isRTL ? "معلقة" : "Pending"}</option>
              <option value="approved">{isRTL ? "معتمدة" : "Approved"}</option>
              <option value="paid">{isRTL ? "مدفوعة" : "Paid"}</option>
            </select>
          </FilterField>
          {canEdit("sales") && (
            <button onClick={onBackfill} disabled={busy}
              className="h-8 px-3 rounded-md text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 disabled:opacity-50 self-end">
              {isRTL ? "إعادة حساب القديمة" : "Backfill old invoices"}
            </button>
          )}
        </FilterPanel>
      }
      summary={totals ? <ColorKPIGrid items={summaryItems} cols={6} /> : undefined}
    >
      {report === undefined ? (
        <LoadingState label={isRTL ? "جاري التحميل..." : "Loading..."} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title={isRTL ? "لا توجد عمولات في الفترة المختارة" : "No commissions in this period"}
          description={isRTL ? "تأكد من تعيين نسبة عمولة للمندوبين، ثم أعد حساب الفواتير القديمة." : "Make sure sales reps have commission rates set, then backfill old invoices."}
        />
      ) : (
        <div className="p-4 space-y-4">
          {/* Bulk action bar */}
          {selectedInvoiceIds.size > 0 && canEdit("sales") && (
            <div className="bg-violet-50 border-2 border-violet-300 rounded-xl px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-bold text-violet-900">
                  {isRTL
                    ? `تم اختيار ${selectedInvoiceIds.size} فاتورة`
                    : `${selectedInvoiceIds.size} invoice(s) selected`}
                </span>
                <span className="text-violet-700">·</span>
                <span className="text-violet-800 font-bold tabular-nums">
                  {isRTL ? "إجمالي العمولة:" : "Total commission:"} {formatCurrency(selectedTotal)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedInvoiceIds(new Set())} className="h-8 px-3 rounded-md text-xs font-semibold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50">
                  {isRTL ? "إلغاء" : "Clear"}
                </button>
                <button onClick={onApprove} disabled={busy} className="h-8 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {isRTL ? "اعتماد" : "Approve"}
                </button>
                <button onClick={onOpenPayModal} disabled={busy} className="h-8 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                  <Wallet className="h-3.5 w-3.5" />
                  {isRTL ? "صرف العمولة" : "Pay Commission"}
                </button>
              </div>
            </div>
          )}

          {/* Per-rep cards */}
          {rows.map((rep: any) => {
            const expanded = expandedReps.has(String(rep.salesRepId));
            const allSelected = rep.invoices.every((inv: any) => selectedInvoiceIds.has(inv.invoiceId));
            const someSelected = rep.invoices.some((inv: any) => selectedInvoiceIds.has(inv.invoiceId));
            return (
              <div key={String(rep.salesRepId)} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-50 to-white border-b border-gray-100 cursor-pointer" onClick={() => toggleRep(String(rep.salesRepId))}>
                  {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{isRTL ? rep.salesRepNameAr : (rep.salesRepNameEn || rep.salesRepNameAr)}</span>
                      <span className="text-[10px] font-mono text-gray-400">{rep.salesRepCode}</span>
                      <span className="bg-violet-100 text-violet-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {rep.commissionRate}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {rep.invoiceCount} {isRTL ? "فاتورة" : "invoices"} · {formatCurrency(rep.totalSales)} {isRTL ? "مبيعات" : "sales"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {rep.pendingCommission > 0 && (
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <Clock className="h-3 w-3" />
                        {formatCurrency(rep.pendingCommission)}
                      </span>
                    )}
                    {rep.approvedCommission > 0 && (
                      <span className="inline-flex items-center gap-1 text-blue-700">
                        <CheckCircle2 className="h-3 w-3" />
                        {formatCurrency(rep.approvedCommission)}
                      </span>
                    )}
                    {rep.paidCommission > 0 && (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <Wallet className="h-3 w-3" />
                        {formatCurrency(rep.paidCommission)}
                      </span>
                    )}
                  </div>
                  <div className="text-end ms-3">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">{isRTL ? "إجمالي" : "Total"}</p>
                    <p className="text-base font-extrabold text-violet-700 tabular-nums">{formatCurrency(rep.totalCommission)}</p>
                  </div>
                </div>

                {/* Invoices table */}
                {expanded && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500 font-bold">
                        <th className="px-3 py-2 w-8 text-center">
                          {canEdit("sales") && (
                            <input type="checkbox" checked={allSelected} ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }} onChange={() => selectAllOfRep(rep)} />
                          )}
                        </th>
                        <th className="px-3 py-2 text-start">{isRTL ? "رقم الفاتورة" : "Invoice #"}</th>
                        <th className="px-3 py-2 text-start">{isRTL ? "التاريخ" : "Date"}</th>
                        <th className="px-3 py-2 text-end">{isRTL ? "الإجمالي" : "Total"}</th>
                        <th className="px-3 py-2 text-end">{isRTL ? "النسبة" : "Rate"}</th>
                        <th className="px-3 py-2 text-end">{isRTL ? "العمولة" : "Commission"}</th>
                        <th className="px-3 py-2 text-center">{isRTL ? "الحالة" : "Status"}</th>
                        <th className="px-3 py-2 w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rep.invoices.map((inv: any) => {
                        const cfg = STATUS_BADGE[inv.commissionStatus] ?? STATUS_BADGE.pending;
                        const checked = selectedInvoiceIds.has(inv.invoiceId);
                        return (
                          <tr key={inv.invoiceId} className={checked ? "bg-violet-50/40" : ""}>
                            <td className="px-3 py-2 text-center">
                              {canEdit("sales") && inv.commissionStatus !== "paid" && (
                                <input type="checkbox" checked={checked} onChange={() => toggleInvoice(inv.invoiceId)} />
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span className="font-mono text-xs font-bold text-gray-700">{inv.invoiceNumber}</span>
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-600 tabular-nums">{inv.invoiceDate}</td>
                            <td className="px-3 py-2 text-end tabular-nums">{formatCurrency(inv.totalAmount)}</td>
                            <td className="px-3 py-2 text-end tabular-nums text-xs text-gray-500">{inv.commissionRate}%</td>
                            <td className="px-3 py-2 text-end tabular-nums font-bold text-violet-700">{formatCurrency(inv.commissionAmount)}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.tx}`}>
                                {isRTL ? cfg.ar : cfg.en}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button onClick={() => router.push(`/sales/invoices/${inv.invoiceId}`)}
                                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600">
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* ── Pay Commission Modal ─────────────────────────────────────── */}
      {showPayModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,19,22,0.6)] p-4"
          onClick={() => !busy && setShowPayModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-emerald-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-base font-bold text-gray-900">
                    {isRTL ? "صرف عمولة المندوبين" : "Pay Sales Commission"}
                  </h3>
                </div>
                <button onClick={() => setShowPayModal(false)} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {isRTL
                  ? "هذا الإجراء ينشئ سند صرف نقدي ويُرحَّل تلقائياً إلى دفتر الأستاذ"
                  : "This creates a cash payment voucher and posts it to the GL"}
              </p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Summary */}
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                <p className="text-xs font-bold text-violet-700 uppercase tracking-wide mb-2">
                  {isRTL ? "ملخص الصرف" : "Payout Summary"}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-violet-800">
                    {selectedInvoiceIds.size} {isRTL ? "فاتورة محددة" : "invoices selected"}
                  </span>
                  <span className="text-xl font-extrabold text-violet-900 tabular-nums">
                    {formatCurrency(selectedTotal)}
                  </span>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  {isRTL ? "تاريخ الصرف" : "Payment Date"} *
                </label>
                <input
                  type="date" value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="input-field h-9 w-full"
                />
              </div>

              {/* Cash safe selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  💰 {isRTL ? "الخزينة (يخصم منها)" : "Cash Safe (deduct from)"} *
                </label>
                <select value={payCashAccId} onChange={(e) => setPayCashAccId(e.target.value)} className="input-field h-9 w-full">
                  <option value="">— {isRTL ? "اختر خزينة" : "select safe"} —</option>
                  {cashAccounts.map((a: any) => (
                    <option key={a._id} value={a._id}>
                      {a.code} — {isRTL ? a.nameAr : (a.nameEn || a.nameAr)}
                    </option>
                  ))}
                </select>
                {cashAccounts.length === 0 && (
                  <p className="text-[11px] text-amber-700 mt-1">
                    {isRTL
                      ? "⚠️ لا توجد خزائن مصنفة. اذهب لشجرة الحسابات وصنف حساب الكاش/البنك."
                      : "⚠️ No cash/bank accounts classified. Go to Chart of Accounts and classify."}
                  </p>
                )}
              </div>

              {/* Expense account selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  📊 {isRTL ? "حساب مصروف العمولات" : "Commission Expense Account"} *
                </label>
                <select value={payExpAccId} onChange={(e) => setPayExpAccId(e.target.value)} className="input-field h-9 w-full">
                  <option value="">— {isRTL ? "اختر حساب مصروف" : "select expense account"} —</option>
                  {expenseAccounts.map((a: any) => (
                    <option key={a._id} value={a._id}>
                      {a.code} — {isRTL ? a.nameAr : (a.nameEn || a.nameAr)}
                    </option>
                  ))}
                </select>
                {defaultCommExp && payExpAccId === defaultCommExp._id && (
                  <p className="text-[11px] text-emerald-700 mt-1">
                    ✓ {isRTL ? "تم اقتراح حساب العمولات تلقائياً" : "Commission account auto-suggested"}
                  </p>
                )}
              </div>

              {/* Journal entry preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">
                  {isRTL ? "القيد المحاسبي" : "Journal Entry"}
                </p>
                <div className="text-xs space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Dr: {isRTL ? "مصروف العمولات" : "Commission Expense"}</span>
                    <span className="tabular-nums font-bold">{formatCurrency(selectedTotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Cr: {isRTL ? "الخزينة" : "Cash"}</span>
                    <span className="tabular-nums font-bold">{formatCurrency(selectedTotal)}</span>
                  </div>
                </div>
              </div>

              {payError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                  {payError}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowPayModal(false)}
                disabled={busy}
                className="h-9 px-4 rounded-lg text-sm font-semibold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                {isRTL ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={onConfirmPay}
                disabled={busy || !payCashAccId || !payExpAccId}
                className="h-9 px-4 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Wallet className="h-4 w-4" />
                {busy
                  ? (isRTL ? "جاري الإنشاء..." : "Creating...")
                  : (isRTL ? "إنشاء سند الصرف" : "Create Voucher")}
              </button>
            </div>
          </div>
        </div>
      )}
    </PrintableReportPage>
  );
}
