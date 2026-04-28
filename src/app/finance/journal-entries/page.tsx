// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatDateShort } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Trash2, RotateCcw, Check, X, Search, FileText, WalletCards, ArrowUpRight, ArrowDownRight, Calendar, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader } from "@/components/ui/page-header";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { CostCenterSelect } from "@/components/ui/cost-center-select";
import { LoadingState, SummaryStrip } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";

function todayISO() { return new Date().toISOString().split("T")[0]; }
function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

interface JLine { id: number; accountId: string; description: string; debit: string; credit: string }

// ─── Inline New-Journal Form ──────────────────────────────────────────────────
function NewJournalForm({ accounts, company, onClose }: any) {
  const { t, isRTL, formatCurrency } = useI18n();
  const createManual = useMutation(api.journalEntries.createManual);
  const postable = accounts.filter((a: any) => a.isPostable && a.isActive);

  const [entryDate, setEntryDate] = React.useState(todayISO());
  const branch = useQuery(api.branches.getDefaultBranch, company ? { companyId: company._id } : "skip");
  const selectedBranchStore = useAppStore((s) => s.selectedBranch);
  const effectiveBranchId = selectedBranchStore !== "all" ? selectedBranchStore : branch?._id;
  const openPeriod = useQuery(api.helpers.getOpenPeriod, company ? { companyId: company._id, date: entryDate } : "skip");
  const { currentUser: defaultUser } = useAuth();
  const defaultCurrency = useQuery(api.helpers.getDefaultCurrency, {});

  const [form, setForm] = useState({
    journalType: "general",
    description: "",
    costCenterId: "",
    notes: "",
    postImmediately: false,
  });
  const [lines, setLines] = useState<JLine[]>([
    { id: 1, accountId: "", description: "", debit: "", credit: "" },
    { id: 2, accountId: "", description: "", debit: "", credit: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setF = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const addLine = () => setLines((ls) => [...ls, { id: Date.now(), accountId: "", description: "", debit: "", credit: "" }]);
  const removeLine = (id: number) => setLines((ls) => ls.filter((l) => l.id !== id));
  const updateLine = (id: number, k: keyof JLine, v: string) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, [k]: v } : l)));

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const diff = Math.abs(totalDebit - totalCredit);
  const balanced = diff < 0.01;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!effectiveBranchId && !branch) { setError("لا يوجد فرع افتراضي للشركة"); return; }
    if (!openPeriod) { setError("لا توجد فترة محاسبية مفتوحة للتاريخ المحدد"); return; }
    if (!defaultUser) { setError("لا يوجد مستخدم في النظام"); return; }
    if (!defaultCurrency) { setError("لا توجد عملة افتراضية في النظام"); return; }
    if (!form.description.trim()) { setError(t("errNeedDescription")); return; }
    if (form.postImmediately && !balanced) { setError(`${t("entryUnbalanced")} (${t("difference")}: ${formatCurrency(diff)})`); return; }
    setSaving(true); setError("");
    try {
      await createManual({
        companyId: company._id,
        branchId: (effectiveBranchId ?? branch?._id) as any,
        journalType: form.journalType,
        entryDate: entryDate,
        periodId: openPeriod._id,
        currencyId: defaultCurrency._id,
        description: form.description,
        costCenterId: form.costCenterId ? (form.costCenterId as any) : undefined,
        notes: form.notes || undefined,
        createdBy: defaultUser._id,
        postImmediately: form.postImmediately,
        lines: lines
          .filter((l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0))
          .map((l) => ({
            accountId: l.accountId as any,
            description: l.description || undefined,
            debit: Math.round(Number(l.debit) * 100) / 100,
            credit: Math.round(Number(l.credit) * 100) / 100,
          })),
      });
      onClose();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[color:var(--ink-900)]">{t("newJournalEntry")}</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[color:var(--ink-50)] text-[color:var(--ink-400)]"><X className="h-4 w-4" /></button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>}
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("journalType")} *</label>
            <select value={form.journalType} onChange={(e) => setF("journalType", e.target.value)} className="input-field h-9">
              <option value="general">{t("jtGeneral")}</option>
              <option value="cash">{t("jtCash")}</option>
              <option value="expenses">{t("jtExpenses")}</option>
              <option value="adjustments">{t("jtAdjustments")}</option>
              <option value="opening">{t("jtOpening")}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("date")} *</label>
            <input type="date" required value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="input-field h-9" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("description")} *</label>
            <input required value={form.description} onChange={(e) => setF("description", e.target.value)} className="input-field h-9" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("costCenter")}</label>
            <CostCenterSelect companyId={company?._id} value={form.costCenterId} onChange={(v) => setF("costCenterId", v)} />
          </div>
        </div>

        <div className="overflow-x-auto border border-[color:var(--ink-100)] rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--ink-50)] text-[color:var(--ink-600)] text-xs">
              <tr>
                <th className="px-3 py-2 text-start font-semibold w-64">{t("account")}</th>
                <th className="px-3 py-2 text-start font-semibold">{t("narration")}</th>
                <th className="px-3 py-2 text-end font-semibold w-36">{t("debit")}</th>
                <th className="px-3 py-2 text-end font-semibold w-36">{t("credit")}</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--ink-100)]">
              {lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-2 py-1.5">
                    <select value={line.accountId} onChange={(e) => updateLine(line.id, "accountId", e.target.value)} className="input-field h-8 text-xs">
                      <option value="">{t("selectAccount")}</option>
                      {postable.map((a: any) => (<option key={a._id} value={a._id}>{a.code} — {isRTL ? a.nameAr : (a.nameEn || a.nameAr)}</option>))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={line.description} onChange={(e) => updateLine(line.id, "description", e.target.value)} className="input-field h-8 text-xs" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min="0" step="0.01" value={line.debit}
                      onChange={(e) => { updateLine(line.id, "debit", e.target.value); if (e.target.value) updateLine(line.id, "credit", ""); }}
                      className="input-field h-8 text-xs text-end tabular-nums" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min="0" step="0.01" value={line.credit}
                      onChange={(e) => { updateLine(line.id, "credit", e.target.value); if (e.target.value) updateLine(line.id, "debit", ""); }}
                      className="input-field h-8 text-xs text-end tabular-nums" />
                  </td>
                  <td className="px-2 py-1.5">
                    {lines.length > 2 && (
                      <button type="button" onClick={() => removeLine(line.id)} className="p-1 rounded text-red-400 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="button" onClick={addLine} className="flex items-center gap-1.5 text-sm text-[color:var(--brand-700)] hover:text-[color:var(--brand-800)]">
          <Plus className="h-4 w-4" /> {t("addLine")}
        </button>

        <div className={`flex items-center gap-6 px-4 py-3 rounded-xl text-sm font-medium ${balanced ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
          <div><span className="text-[color:var(--ink-500)] font-normal">{t("totalDebit")}: </span><span className="tabular-nums">{formatCurrency(totalDebit)}</span></div>
          <div><span className="text-[color:var(--ink-500)] font-normal">{t("totalCredit")}: </span><span className="tabular-nums">{formatCurrency(totalCredit)}</span></div>
          {!balanced && <div className="text-red-600">{t("difference")}: <span className="tabular-nums">{formatCurrency(diff)}</span> — {t("entryUnbalanced")}</div>}
          {balanced && <div className="text-emerald-700">{t("entryBalanced")} ✓</div>}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="inline-flex items-center gap-2 text-sm text-[color:var(--ink-700)]">
            <input type="checkbox" checked={form.postImmediately} onChange={(e) => setF("postImmediately", e.target.checked)} />
            {t("postImmediately")}
          </label>
          <button type="submit" disabled={saving || (form.postImmediately && !balanced)} className="btn-primary h-10 px-5 rounded-lg inline-flex items-center gap-2 text-sm font-semibold disabled:opacity-60">
            {saving ? t("saving") : <><Check className="h-4 w-4" />{t("saveDraft")}</>}
          </button>
          <button type="button" onClick={onClose} className="h-10 px-5 rounded-lg border border-[color:var(--ink-200)] text-[color:var(--ink-700)] text-sm hover:bg-[color:var(--ink-50)]">{t("cancel")}</button>
        </div>
      </form>
    </div>
  );
}

// ─── Premium Stat Component ─────────────────────────────────────────────────────

function JournalStatCard({ title, value }: any) {
  return (
    <div className="bg-white rounded-lg p-3 border border-green-600 flex-1">
      <div className="text-[10px] font-bold text-green-700 uppercase mb-1">{title}</div>
      <div className="text-lg font-bold text-gray-900 tabular-nums">{value}</div>
    </div>
  );
}

function JournalLifecycleActions({ entry, userId, companyId }: { entry: any; userId: string | undefined; companyId: string | undefined }) {
  const { t } = useI18n();
  const [loadingAction, setLoadingAction] = useState<"delete" | "reverse" | null>(null);
  const [err, setErr] = useState("");
  const removeDraft = useMutation(api.journalEntries.deleteDraftJournalEntry);
  const reverseEntry = useMutation(api.journalEntries.reverseJournalEntryMutation);
  const today = new Date().toISOString().split("T")[0];
  const openPeriod = useQuery(
    api.helpers.getOpenPeriod,
    companyId ? { companyId: companyId as any, date: today } : "skip"
  );

  if (!userId) return null;

  const handleDelete = async () => {
    if (!window.confirm("سيتم حذف القيد المسودّة نهائيًا. هل تريد المتابعة؟")) return;
    setLoadingAction("delete");
    setErr("");
    try {
      await removeDraft({ entryId: entry._id, userId: userId as any });
    } catch (e: any) {
      setErr(e.message ?? t("delete"));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReverse = async () => {
    if (!openPeriod) { setErr(t("errNoPeriod")); return; }
    if (!window.confirm("سيتم إنشاء قيد عكسي لهذا القيد المرحل. هل تريد المتابعة؟")) return;
    setLoadingAction("reverse");
    setErr("");
    try {
      await reverseEntry({
        entryId: entry._id,
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
        {entry.postingStatus === "draft" && !entry.isAutoGenerated ? (
          <button onClick={handleDelete} disabled={loadingAction !== null} className="h-7 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 disabled:opacity-60">
            {loadingAction === "delete" ? t("loading") : t("delete")}
          </button>
        ) : null}
        {entry.postingStatus === "posted" && !entry.isAutoGenerated ? (
          <button onClick={handleReverse} disabled={loadingAction !== null || !openPeriod} className="h-7 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 disabled:opacity-60">
            {loadingAction === "reverse" ? t("loading") : t("reverse")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─── Journal Lines Detail Panel ───────────────────────────────────────────────
function JournalLinesPanel({ entryId, isRTL, formatCurrency }: {
  entryId: string; isRTL: boolean; formatCurrency: (n: number) => string;
}) {
  const entry = useQuery(api.journalEntries.getJournalEntry, { entryId: entryId as any });

  if (!entry) return (
    <div className="px-8 py-4 text-xs text-gray-400 animate-pulse">
      {isRTL ? "جارٍ تحميل التفاصيل..." : "Loading details..."}
    </div>
  );

  const lines = entry.lines ?? [];

  return (
    <div className="px-6 pb-4 pt-2 bg-indigo-50/40 border-t border-indigo-100">
      {/* Header */}
      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2">
        {isRTL ? "الحسابات المتأثرة" : "Affected Accounts"}
      </p>
      <div className="rounded-lg overflow-hidden border border-indigo-100 bg-white">
        <table className="w-full text-xs" dir={isRTL ? "rtl" : "ltr"}>
          <thead>
            <tr className="bg-indigo-50 text-indigo-700">
              <th className="px-4 py-2 font-bold text-start">{isRTL ? "كود" : "Code"}</th>
              <th className="px-4 py-2 font-bold text-start">{isRTL ? "اسم الحساب" : "Account Name"}</th>
              <th className="px-4 py-2 font-bold text-start">{isRTL ? "بيان" : "Description"}</th>
              <th className="px-4 py-2 font-bold text-end text-green-700">{isRTL ? "مدين (Dr)" : "Debit (Dr)"}</th>
              <th className="px-4 py-2 font-bold text-end text-red-600">{isRTL ? "دائن (Cr)" : "Credit (Cr)"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {lines.map((line: any, idx: number) => (
              <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                <td className="px-4 py-2.5">
                  <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-bold">
                    {line.account?.code ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-semibold text-gray-800">
                  {isRTL
                    ? (line.account?.nameAr ?? line.account?.nameEn ?? "—")
                    : (line.account?.nameEn ?? line.account?.nameAr ?? "—")}
                </td>
                <td className="px-4 py-2.5 text-gray-400 max-w-[200px] truncate">
                  {line.description ?? "—"}
                </td>
                <td className="px-4 py-2.5 text-end tabular-nums font-bold text-green-700">
                  {line.debit > 0 ? formatCurrency(line.debit) : "—"}
                </td>
                <td className="px-4 py-2.5 text-end tabular-nums font-bold text-red-600">
                  {line.credit > 0 ? formatCurrency(line.credit) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-indigo-200">
              <td colSpan={3} className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase">
                {isRTL ? "الإجمالي" : "Total"}
              </td>
              <td className="px-4 py-2 text-end tabular-nums font-bold text-green-700">
                {formatCurrency(entry.totalDebit)}
              </td>
              <td className="px-4 py-2 text-end tabular-nums font-bold text-red-600">
                {formatCurrency(entry.totalCredit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {/* Balance check */}
      <div className="flex items-center gap-2 mt-2">
        {entry.totalDebit === entry.totalCredit ? (
          <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">
            ✅ {isRTL ? "القيد متوازن" : "Entry is balanced"}
          </span>
        ) : (
          <span className="text-[10px] text-red-500 font-bold flex items-center gap-1">
            ❌ {isRTL ? "القيد غير متوازن!" : "Entry is NOT balanced!"}
          </span>
        )}
        <span className="text-[10px] text-gray-400">
          {isRTL ? `المصدر: ${entry.isAutoGenerated ? "تلقائي" : "يدوي"}` : `Source: ${entry.isAutoGenerated ? "Auto" : "Manual"}`}
        </span>
      </div>
    </div>
  );
}

// ─── Journal Entries Page ─────────────────────────────────────────────────────
import { useSearchParams } from "next/navigation";

export default function JournalEntriesPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { canCreate, canPost } = usePermissions();
  const { currentUser } = useAuth();
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(searchParams.get("new") === "true");
  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const [journalType, setJournalType] = useState("");
  const [postingStatus, setPostingStatus] = useState("");
  const [search, setSearch] = useState("");
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const accounts = useQuery(api.accounts.getAll, company ? { companyId: company._id } : "skip");
  const entries = useQuery(api.journalEntries.listByCompany, company ? {
    companyId: company._id, fromDate: fromDate || undefined, toDate: toDate || undefined,
    journalType: journalType || undefined, postingStatus: (postingStatus as any) || undefined,
    branchId: branchArg as any,
  } : "skip");

  const loading = entries === undefined;
  const filtered = (entries ?? []).filter((e: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return e.entryNumber.toLowerCase().includes(s) || (e.description || "").toLowerCase().includes(s);
  });

  const totalDebit = filtered.reduce((s: any, e: any) => s + e.totalDebit, 0);
  const totalCredit = filtered.reduce((s: any, e: any) => s + e.totalCredit, 0);

  const JTYPES: Record<string, string> = {
    general: t("jtGeneral"), cash: t("jtCash"), expenses: t("jtExpenses"),
    adjustments: t("jtAdjustments"), opening: t("jtOpening"),
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      <div className="no-print">
      <PageHeader
        icon={FileText}
        title={t("journalEntriesTitle")}
        badge={<span className="badge-soft">{filtered.length} {t("entryCount")}</span>}
        actions={
          canCreate("finance") ? (
            <button onClick={() => setShowForm((v) => !v)} className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
              <Plus className="h-4 w-4" /> {t("newJournal")}
            </button>
          ) : undefined
        }
      />
      </div>

      {showForm && <NewJournalForm accounts={accounts ?? []} company={company} onClose={() => setShowForm(false)} />}

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
          <label className="text-[10px] font-bold text-gray-500 uppercase">{t("journalType")}</label>
          <select value={journalType} onChange={(e) => setJournalType(e.target.value)}
            className="h-10 px-3 border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-400 min-w-[140px] bg-white cursor-pointer appearance-none">
            <option value="">{t("all")}</option>
            {Object.entries(JTYPES).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">{t("postingStatus")}</label>
          <select value={postingStatus} onChange={(e) => setPostingStatus(e.target.value)}
            className="h-10 px-3 border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-400 min-w-[140px] bg-white cursor-pointer appearance-none">
            <option value="">{t("all")}</option>
            <option value="draft">{t("statusDraft")}</option>
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

      {/* Premium KPI Cards - Grouped Design */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col md:flex-row gap-4 w-full">
        <JournalStatCard title={t("entryCount")} value={filtered.length} />
        <JournalStatCard title={t("totalDebit")} value={formatCurrency(totalDebit)} />
        <JournalStatCard title={t("totalCredit")} value={formatCurrency(totalCredit)} />
      </div>

      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-[color:var(--ink-100)] overflow-hidden">
        {loading ? (
          <LoadingState label={t("loading")} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={t("noResults")}
            action={
              canCreate("finance") ? (
                <button onClick={() => setShowForm(true)}
                  className="btn-primary h-10 px-5 rounded-xl inline-flex items-center gap-2 text-sm font-semibold">
                  <Plus className="h-4 w-4" /> {t("newJournal")}
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
          <div className="mobile-list p-3 space-y-2.5">
            {filtered.map((jv: any) => {
              const isExpanded = expandedEntryId === jv._id;
              return (
                <div key={jv._id} className={`record-card overflow-hidden transition-all ${isExpanded ? "ring-2 ring-indigo-200" : ""}`}>
                  <div
                    className="flex items-start justify-between gap-2 mb-2 cursor-pointer"
                    onClick={() => setExpandedEntryId(isExpanded ? null : jv._id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--ink-100)] text-[var(--ink-600)]">{jv.entryNumber}</span>
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${isExpanded ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"}`}>
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </span>
                      </div>
                      <p className="text-[13px] font-semibold text-[var(--ink-800)] truncate">{jv.description ?? "—"}</p>
                      <p className="text-[11px] text-[var(--ink-400)] mt-0.5">{jv.entryDate}</p>
                    </div>
                    <div className="text-end shrink-0">
                      <p className="text-[16px] font-bold tabular-nums text-[var(--ink-900)]">{formatCurrency(jv.totalDebit)}</p>
                      <StatusBadge status={jv.postingStatus} type="posting" />
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-1 -mx-3 -mb-3">
                      <JournalLinesPanel entryId={jv._id} isRTL={isRTL} formatCurrency={formatCurrency} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="desktop-table overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse" dir={isRTL ? "rtl" : "ltr"}>
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-4 py-4 w-8"></th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("journalNo")}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("date")}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("type")}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("description")}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-end">{t("debit")}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-end">{t("credit")}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("source")}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("status")}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-end">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((jv: any) => {
                  const isExpanded = expandedEntryId === jv._id;
                  return (
                    <React.Fragment key={jv._id}>
                      <tr
                        className={`group transition-all duration-200 cursor-pointer border-b border-gray-50 ${isExpanded ? "bg-indigo-50/60" : "hover:bg-gray-50/80"}`}
                        onClick={() => setExpandedEntryId(isExpanded ? null : jv._id)}
                      >
                        {/* Expand toggle */}
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors ${isExpanded ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500"}`}>
                            {isExpanded
                              ? <ChevronUp className="h-3.5 w-3.5" />
                              : <ChevronDown className="h-3.5 w-3.5" />}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                            {jv.entryNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 font-medium">{formatDateShort(jv.entryDate)}</td>
                        <td className="px-6 py-4 text-xs text-gray-500 font-medium">{JTYPES[jv.journalType] ?? jv.journalType}</td>
                        <td className="px-6 py-4 max-w-[260px] truncate font-bold text-gray-900 text-sm" title={jv.description}>{jv.description}</td>
                        <td className="px-6 py-4 tabular-nums font-bold text-green-700 text-end text-sm">{formatCurrency(jv.totalDebit)}</td>
                        <td className="px-6 py-4 tabular-nums font-bold text-red-600 text-end text-sm">{formatCurrency(jv.totalCredit)}</td>
                        <td className="px-6 py-4 text-[10px] text-gray-400 font-bold uppercase tracking-tight">{jv.isAutoGenerated ? t("autoGenerated") : t("manual")}</td>
                        <td className="px-6 py-4"><StatusBadge status={jv.postingStatus} type="posting" /></td>
                        <td className="px-6 py-4 text-end" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <JournalLifecycleActions entry={jv} userId={currentUser?._id} companyId={company?._id} />
                          </div>
                        </td>
                      </tr>
                      {/* Expanded lines detail */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={10} className="p-0">
                            <JournalLinesPanel
                              entryId={jv._id}
                              isRTL={isRTL}
                              formatCurrency={formatCurrency}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
