// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatDateShort } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Trash2, RotateCcw, Check, X, Search, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppStore } from "@/store/useAppStore";

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
        notes: form.notes || undefined,
        createdBy: defaultUser._id,
        postImmediately: form.postImmediately,
        lines: lines
          .filter((l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0))
          .map((l) => ({
            accountId: l.accountId as any,
            description: l.description || undefined,
            debit: Math.round(Number(l.debit) * 100),
            credit: Math.round(Number(l.credit) * 100),
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

// ─── Journal Entries Page ─────────────────────────────────────────────────────
export default function JournalEntriesPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { canCreate, canPost } = usePermissions();
  const [showForm, setShowForm] = useState(false);
  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const [journalType, setJournalType] = useState("");
  const [postingStatus, setPostingStatus] = useState("");
  const [search, setSearch] = useState("");

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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}>
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">{t("journalEntriesTitle")}</h1>
            <p className="text-xs text-[color:var(--ink-500)] mt-0.5">{filtered.length} {t("entryCount")}</p>
          </div>
        </div>
        {canCreate("finance") && (
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4" /> {t("newJournal")}
        </button>
        )}
      </div>

      {showForm && <NewJournalForm accounts={accounts ?? []} company={company} onClose={() => setShowForm(false)} />}

      <div className="surface-card p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[color:var(--ink-500)]">{t("fromDate")}:</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input-field h-9 w-auto" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[color:var(--ink-500)]">{t("toDate")}:</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input-field h-9 w-auto" />
        </div>
        <select value={journalType} onChange={(e) => setJournalType(e.target.value)} className="input-field h-9 w-auto">
          <option value="">{t("allTypes")}</option>
          {Object.entries(JTYPES).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
        </select>
        <select value={postingStatus} onChange={(e) => setPostingStatus(e.target.value)} className="input-field h-9 w-auto">
          <option value="">{t("allStatuses")}</option>
          <option value="draft">{t("statusDraft")}</option>
          <option value="posted">{t("statusPosted")}</option>
          <option value="reversed">{t("statusReversed")}</option>
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[color:var(--ink-400)] ${isRTL ? "right-3" : "left-3"}`} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchPlaceholder")}
            className={`input-field h-9 ${isRTL ? "pr-9" : "pl-9"}`} />
        </div>
      </div>

      <div className="surface-card p-3 flex items-center gap-6 text-sm">
        <div><span className="text-[color:var(--ink-500)]">{t("entryCount")}: </span><span className="font-semibold">{filtered.length}</span></div>
        <div><span className="text-[color:var(--ink-500)]">{t("totalDebit")}: </span><span className="font-semibold tabular-nums">{formatCurrency(totalDebit)}</span></div>
        <div><span className="text-[color:var(--ink-500)]">{t("totalCredit")}: </span><span className="font-semibold tabular-nums">{formatCurrency(totalCredit)}</span></div>
      </div>

      <div className="surface-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[color:var(--ink-400)]">
            <div className="animate-spin h-8 w-8 border-2 border-[color:var(--brand-600)] border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm">{t("loading")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-[color:var(--ink-400)]">
            <p className="text-sm">{t("noResults")}</p>
            {canCreate("finance") && (
            <button onClick={() => setShowForm(true)} className="text-sm text-[color:var(--brand-700)] hover:underline mt-1">+ {t("newJournal")}</button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full zebra-table text-sm">
              <thead className="bg-[color:var(--ink-50)] text-[color:var(--ink-600)] text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">{t("journalNo")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("date")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("type")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("description")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("debit")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("credit")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("source")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("status")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((jv: any) => (
                  <tr key={jv._id} className="border-t border-[color:var(--ink-100)] hover:bg-[color:var(--brand-50)]/40">
                    <td className="px-4 py-3 font-mono text-xs text-[color:var(--brand-700)]">{jv.entryNumber}</td>
                    <td className="px-4 py-3 text-[color:var(--ink-600)]">{formatDateShort(jv.entryDate)}</td>
                    <td className="px-4 py-3 text-xs text-[color:var(--ink-500)]">{JTYPES[jv.journalType] ?? jv.journalType}</td>
                    <td className="px-4 py-3 text-[color:var(--ink-700)] max-w-[260px] truncate" title={jv.description}>{jv.description}</td>
                    <td className="px-4 py-3 text-end tabular-nums">{formatCurrency(jv.totalDebit)}</td>
                    <td className="px-4 py-3 text-end tabular-nums">{formatCurrency(jv.totalCredit)}</td>
                    <td className="px-4 py-3 text-xs text-[color:var(--ink-400)]">{jv.isAutoGenerated ? t("autoGenerated") : t("manual")}</td>
                    <td className="px-4 py-3"><StatusBadge status={jv.postingStatus} type="posting" /></td>
                    <td className="px-4 py-3 text-end">
                      {jv.postingStatus === "posted" && !jv.isAutoGenerated && (
                        <button className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-orange-50 text-orange-500" title={t("reverse")}>
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
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
