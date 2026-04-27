// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import {
  Search, Plus, ChevronDown, ChevronLeft, ChevronRight, Lock,
  Power, X, BookOpen, Layers, TrendingUp, TrendingDown,
  CircleDollarSign, Scale, Landmark,
} from "lucide-react";
import type { AccountType } from "@/lib/types";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { LoadingState } from "@/components/ui/data-display";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

// ── Type meta ──────────────────────────────────────────────────────────────────
const TYPE_META: Record<string, { color: string; bg: string; badgeClass: string; icon: any }> = {
  asset:     { color: "#0ea5e9", bg: "#f0f9ff", badgeClass: "badge-soft",  icon: Landmark        },
  liability: { color: "#f59e0b", bg: "#fffbeb", badgeClass: "badge-gold",  icon: Scale           },
  equity:    { color: "#8b5cf6", bg: "#f5f3ff", badgeClass: "badge-gold",  icon: CircleDollarSign },
  revenue:   { color: "#16a34a", bg: "#f0fdf4", badgeClass: "status-good", icon: TrendingUp      },
  expense:   { color: "#ef4444", bg: "#fef2f2", badgeClass: "status-warn", icon: TrendingDown    },
};

// ── AccountNode ────────────────────────────────────────────────────────────────
function AccountNode({ account, accounts, level, selectedId, onSelect, search, isRTL, t }: any) {
  const children = accounts.filter((a: any) => a.parentId === account._id);
  const [expanded, setExpanded] = useState(true);
  const hasChildren = children.length > 0;

  const matchesSelf =
    !search ||
    account.code.toLowerCase().includes(search.toLowerCase()) ||
    account.nameAr.includes(search) ||
    (account.nameEn || "").toLowerCase().includes(search.toLowerCase());
  const childrenMatch = (accts: any[]): boolean =>
    accts.some((c: any) =>
      c.nameAr.includes(search) ||
      (c.nameEn || "").toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      childrenMatch(accounts.filter((a: any) => a.parentId === c._id))
    );
  if (!matchesSelf && !childrenMatch(children)) return null;

  const isSel = selectedId === account._id;
  const meta = TYPE_META[account.accountType];
  const indentKey = isRTL ? "paddingRight" : "paddingLeft";

  return (
    <div>
      <button
        onClick={() => { onSelect(account); if (hasChildren) setExpanded((v: any) => !v); }}
        className={cn(
          "group flex w-full items-center gap-2 rounded-lg py-1.5 text-sm transition-all duration-100",
          isSel
            ? "text-white shadow-sm"
            : "hover:bg-[color:var(--brand-50)] text-[color:var(--ink-700)]"
        )}
        style={{
          [indentKey]: `${12 + level * 18}px`,
          paddingLeft: !isRTL ? `${12 + level * 18}px` : "10px",
          paddingRight: isRTL ? `${12 + level * 18}px` : "10px",
          background: isSel
            ? `linear-gradient(135deg, var(--brand-700), var(--brand-600))`
            : undefined,
        }}
      >
        {/* Expand chevron */}
        <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
          {hasChildren
            ? expanded
              ? <ChevronDown className="h-3 w-3" />
              : isRTL
                ? <ChevronLeft className="h-3 w-3" />
                : <ChevronRight className="h-3 w-3" />
            : null}
        </span>

        {/* Type dot — only on root level */}
        {level === 0 && meta && (
          <span
            className="h-2 w-2 rounded-full flex-shrink-0"
            style={{ background: isSel ? "rgba(255,255,255,0.7)" : meta.color }}
          />
        )}

        {/* Code */}
        <span
          className={cn(
            "font-mono text-[11px] flex-shrink-0 w-10",
            isSel ? "text-white/70" : "text-[color:var(--ink-400)]"
          )}
        >
          {account.code}
        </span>

        {/* Name */}
        <span className="flex-1 truncate text-start font-medium text-[13px]">
          {isRTL ? account.nameAr : (account.nameEn || account.nameAr)}
        </span>

        {/* Badges */}
        {!account.isPostable && (
          <Lock className={cn("h-3 w-3 flex-shrink-0", isSel ? "text-white/50" : "text-[color:var(--ink-300)]")} />
        )}
        {!account.isActive && (
          <span className={cn("text-[10px] font-medium", isSel ? "text-white/70" : "text-red-400")}>
            {t("inactive")}
          </span>
        )}
      </button>

      {expanded && hasChildren && children.map((child: any) => (
        <AccountNode
          key={child._id} account={child} accounts={accounts}
          level={level + 1} selectedId={selectedId} onSelect={onSelect}
          search={search} isRTL={isRTL} t={t}
        />
      ))}
    </div>
  );
}

// ── NewAccountModal ────────────────────────────────────────────────────────────
function NewAccountModal({ accounts, onClose, t, isRTL }: any) {
  const createAccount = useMutation(api.accounts.create);
  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const { currentUser: defaultUser } = useAuth();

  const [form, setForm] = useState({
    code: "", nameAr: "", nameEn: "", parentId: "",
    accountType: "asset" as AccountType, accountSubType: "current_asset",
    isPostable: true, requiresCostCenter: false, requiresSubAccount: false,
    normalBalance: "debit" as "debit" | "credit", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setSaving(true); setError("");
    try {
      await createAccount({
        companyId: company._id, code: form.code, nameAr: form.nameAr,
        nameEn: form.nameEn || undefined,
        parentId: form.parentId ? (form.parentId as any) : undefined,
        accountType: form.accountType, accountSubType: form.accountSubType,
        isPostable: form.isPostable, requiresCostCenter: form.requiresCostCenter,
        requiresSubAccount: form.requiresSubAccount, normalBalance: form.normalBalance,
        notes: form.notes || undefined, createdBy: (defaultUser?._id) as any,
      });
      onClose();
    } catch (e: any) {
      setError(e.message === "DUPLICATE_CODE" ? t("duplicateCode") : e.message);
    } finally { setSaving(false); }
  };
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-[rgba(26,19,22,0.55)] flex items-center justify-center z-50 p-4">
      <div className="surface-card w-full max-w-xl max-h-screen overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between p-6 border-b border-[color:var(--ink-200)]">
          <h2 className="text-lg font-bold text-[color:var(--ink-900)]">{t("newAccount")}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[color:var(--ink-50)] text-[color:var(--ink-500)]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">{t("code")} *</label>
              <input required value={form.code} onChange={(e: any) => set("code", e.target.value)} className="input-field font-mono" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">{t("nameAr")} *</label>
              <input required value={form.nameAr} onChange={(e: any) => set("nameAr", e.target.value)} className="input-field" dir="rtl" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">{t("nameEn")}</label>
            <input value={form.nameEn} onChange={(e: any) => set("nameEn", e.target.value)} className="input-field" dir="ltr" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">{t("accountType")} *</label>
              <select value={form.accountType} onChange={(e: any) => set("accountType", e.target.value)} className="input-field">
                <option value="asset">{t("asset")}</option>
                <option value="liability">{t("liability")}</option>
                <option value="equity">{t("equity")}</option>
                <option value="revenue">{t("revenue")}</option>
                <option value="expense">{t("expense")}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">{t("balance")}</label>
              <select value={form.normalBalance} onChange={(e: any) => set("normalBalance", e.target.value)} className="input-field">
                <option value="debit">{t("debit")}</option>
                <option value="credit">{t("credit")}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">{t("parentAccount")}</label>
            <select value={form.parentId} onChange={(e: any) => set("parentId", e.target.value)} className="input-field">
              <option value="">— {t("none")} —</option>
              {accounts.filter((a: any) => !a.isPostable).map((a: any) => (
                <option key={a._id} value={a._id}>{a.code} — {isRTL ? a.nameAr : (a.nameEn || a.nameAr)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 btn-primary h-10 rounded-lg text-sm font-semibold">
              {saving ? t("saving") : t("save")}
            </button>
            <button type="button" onClick={onClose} className="flex-1 btn-ghost h-10 rounded-lg text-sm font-semibold">{t("cancel")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── AccountDetail ──────────────────────────────────────────────────────────────
const OP_VALUES = ["", "cash", "bank", "trade_receivable", "trade_payable", "inventory_asset", "other"] as const;

function AccountDetail({ account, accounts, t, isRTL, formatCurrency }: any) {
  const toggleActive    = useMutation(api.accounts.toggleActive);
  const setOpType       = useMutation(api.accounts.setOperationalType);
  const { currentUser } = useAuth();

  // ── Empty state: overview stats ─────────────────────────────────────────────
  if (!account) {
    const total = accounts.length;
    const byType = Object.fromEntries(
      Object.keys(TYPE_META).map((k) => [k, accounts.filter((a: any) => a.accountType === k).length])
    );
    return (
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Top hint */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-10">
          <div
            className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "color-mix(in srgb, var(--brand-600) 8%, white)", border: "1px solid color-mix(in srgb, var(--brand-600) 16%, transparent)" }}
          >
            <BookOpen className="h-7 w-7" style={{ color: "var(--brand-700)", opacity: 0.75 }} />
          </div>
          <p className="text-sm font-bold text-[color:var(--ink-700)] mb-1">
            {isRTL ? "اختر حساباً" : "Select an account"}
          </p>
          <p className="text-xs text-[color:var(--ink-400)] text-center max-w-xs">
            {isRTL
              ? "انقر على أي حساب من القائمة لعرض تفاصيله وإعداداته"
              : "Click any account from the list to view its details and settings"}
          </p>
        </div>

        {/* Type breakdown at bottom */}
        <div className="px-5 pb-5 border-t border-[color:var(--ink-100)] pt-4">
          <p className="text-[10px] font-bold text-[color:var(--ink-400)] uppercase tracking-wider mb-3">
            {isRTL ? "إجمالي الحسابات" : "Account Overview"} — {total}
          </p>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(TYPE_META).map(([type, meta]) => {
              const Icon = meta.icon;
              const count = byType[type] ?? 0;
              return (
                <div
                  key={type}
                  className="rounded-xl p-2.5 flex flex-col items-center gap-1.5"
                  style={{ background: meta.bg, border: `1px solid ${meta.color}22` }}
                >
                  <Icon className="h-4 w-4" style={{ color: meta.color }} />
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: meta.color }}>
                    {count}
                  </span>
                  <span className="text-[9px] text-[color:var(--ink-500)] text-center leading-tight">
                    {t(type as any)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Account detail ───────────────────────────────────────────────────────────
  const children = accounts.filter((a: any) => a.parentId === account._id);
  const meta = TYPE_META[account.accountType];
  const Icon = meta?.icon ?? BookOpen;

  const OP_LABELS: Record<string, string> = {
    "":                isRTL ? "—" : "—",
    cash:              isRTL ? "نقد"       : "Cash",
    bank:              isRTL ? "بنك"       : "Bank",
    trade_receivable:  isRTL ? "ذمم مدينة" : "Receivable",
    trade_payable:     isRTL ? "ذمم دائنة" : "Payable",
    inventory_asset:   isRTL ? "مخزون"     : "Inventory",
    other:             isRTL ? "أخرى"      : "Other",
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* ── Account header band ─────────────────────────────────────────────── */}
      <div
        className="px-6 py-5 border-b border-[color:var(--ink-100)]"
        style={{ background: meta ? `${meta.bg}` : "var(--ink-50)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: meta?.color + "18", border: `1px solid ${meta?.color}30` }}
            >
              <Icon className="h-5 w-5" style={{ color: meta?.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono text-xs text-[color:var(--ink-400)]">{account.code}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${meta?.badgeClass ?? "badge-soft"}`}>
                  {t(account.accountType as any)}
                </span>
                {!account.isActive && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-50 text-red-600">
                    {t("inactive")}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-[color:var(--ink-900)] leading-tight">
                {isRTL ? account.nameAr : (account.nameEn || account.nameAr)}
              </h2>
              {account.nameEn && account.nameAr !== account.nameEn && (
                <p className="text-xs text-[color:var(--ink-400)] mt-0.5">
                  {isRTL ? account.nameEn : account.nameAr}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => toggleActive({ id: account._id })}
            className={cn(
              "flex-shrink-0 h-8 px-3 rounded-lg inline-flex items-center gap-1.5 text-xs font-semibold transition-colors",
              account.isActive
                ? "bg-red-50 text-red-600 hover:bg-red-100"
                : "bg-green-50 text-green-700 hover:bg-green-100"
            )}
          >
            <Power className="h-3.5 w-3.5" />
            {account.isActive ? t("deactivate") : t("activate")}
          </button>
        </div>
      </div>

      {/* ── Detail grid ─────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 grid grid-cols-2 gap-3">
        {[
          { label: t("accountType"),    value: t(account.accountType as any) },
          { label: t("balance"),        value: account.normalBalance === "debit" ? t("debit") : t("credit") },
          { label: t("isPostable"),     value: account.isPostable ? (isRTL ? "نعم" : "Yes") : (isRTL ? "لا" : "No") },
          { label: isRTL ? "الحسابات الفرعية" : "Sub-accounts", value: String(children.length) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[color:var(--ink-50)] rounded-xl p-3 border border-[color:var(--ink-100)]">
            <p className="text-[10px] text-[color:var(--ink-400)] mb-1 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-sm font-semibold text-[color:var(--ink-800)]">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Operational Type ────────────────────────────────────────────────── */}
      <div className="px-6 pb-6">
        <div className="rounded-xl p-4 border border-dashed border-indigo-200 bg-indigo-50/60">
          <p className="text-xs font-bold text-indigo-700 mb-0.5">
            {t("operationalType") ?? (isRTL ? "نوع التشغيل" : "Operational Type")}
          </p>
          <p className="text-[11px] text-indigo-400 mb-3">
            {isRTL
              ? "يُستخدم لربط الحساب بتقارير الكاش والمديونيات"
              : "Links this account to cash-flow and aging reports"}
          </p>
          <select
            value={account.operationalType ?? ""}
            onChange={(e) => {
              if (!currentUser?._id) return;
              setOpType({ id: account._id, operationalType: e.target.value || undefined, userId: currentUser._id });
            }}
            className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-400 outline-none"
          >
            {OP_VALUES.map((v) => (
              <option key={v} value={v}>{OP_LABELS[v]}</option>
            ))}
          </select>
        </div>

        {/* Sub-accounts list */}
        {children.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-bold text-[color:var(--ink-400)] uppercase tracking-wider mb-2">
              {isRTL ? "الحسابات الفرعية" : "Sub-accounts"} ({children.length})
            </p>
            <div className="space-y-1">
              {children.map((c: any) => (
                <div key={c._id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[color:var(--ink-50)] border border-[color:var(--ink-100)]">
                  <span className="font-mono text-[11px] text-[color:var(--ink-400)] w-10">{c.code}</span>
                  <span className="text-xs font-medium text-[color:var(--ink-700)] flex-1 truncate">
                    {isRTL ? c.nameAr : (c.nameEn || c.nameAr)}
                  </span>
                  {!c.isActive && <span className="text-[9px] text-red-400">{t("inactive")}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ChartOfAccountsPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { canCreate } = usePermissions();
  const [search, setSearch]     = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const companies  = useQuery(api.seed.getCompanies, {});
  const company    = companies?.[0];
  const rawAccounts = useQuery(api.accounts.getAll, company ? { companyId: company._id } : "skip");
  const accounts   = (rawAccounts ?? []).filter((a: any) => !filterType || a.accountType === filterType);
  const rootAccounts = accounts.filter((a: any) => !a.parentId);
  const loading    = rawAccounts === undefined;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="flex flex-col h-[calc(100vh-120px)] space-y-4">
      {showNewModal && (
        <NewAccountModal
          accounts={rawAccounts ?? []}
          onClose={() => setShowNewModal(false)}
          t={t} isRTL={isRTL}
        />
      )}

      {/* Page header */}
      <div className="no-print">
        <PageHeader
          icon={BookOpen}
          title={t("chartOfAccountsTitle")}
          count={(rawAccounts ?? []).length}
          actions={
            canCreate("finance") ? (
              <button
                onClick={() => setShowNewModal(true)}
                className="btn-primary h-9 px-4 rounded-xl inline-flex items-center gap-2 text-sm font-semibold"
              >
                <Plus className="h-4 w-4" /> {t("newAccount")}
              </button>
            ) : undefined
          }
        />
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* ── Tree panel ──────────────────────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 surface-card flex flex-col overflow-hidden rounded-2xl">
          {/* Search + filter */}
          <div className="px-3 pt-3 pb-2 border-b border-[color:var(--ink-100)] space-y-2">
            <div className="relative">
              <Search className={`absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[color:var(--ink-400)] ${isRTL ? "right-2.5" : "left-2.5"}`} />
              <input
                type="text" value={search}
                onChange={(e: any) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className={`w-full border border-[color:var(--ink-200)] rounded-lg py-1.5 text-sm bg-[color:var(--ink-50)] outline-none focus:ring-2 focus:ring-[color:var(--brand-300)] transition-all ${isRTL ? "pr-8 pl-2.5" : "pl-8 pr-2.5"}`}
              />
            </div>
            {/* Type filter chips */}
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setFilterType("")}
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all",
                  !filterType
                    ? "border-[color:var(--brand-600)] bg-[color:var(--brand-600)] text-white"
                    : "border-[color:var(--ink-200)] text-[color:var(--ink-500)] hover:border-[color:var(--brand-300)]"
                )}
              >
                {t("all")}
              </button>
              {Object.entries(TYPE_META).map(([type, meta]) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type === filterType ? "" : type)}
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all",
                    filterType === type
                      ? "text-white border-transparent"
                      : "border-[color:var(--ink-200)] text-[color:var(--ink-500)] hover:border-opacity-60"
                  )}
                  style={filterType === type ? { background: meta.color, borderColor: meta.color } : undefined}
                >
                  {t(type as any)}
                </button>
              ))}
            </div>
          </div>

          {/* Tree */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5">
            {loading ? (
              <LoadingState label={t("loading")} />
            ) : rootAccounts.length === 0 ? (
              <EmptyState icon={BookOpen} message={t("noResults")} />
            ) : (
              rootAccounts.map((acc: any) => (
                <AccountNode
                  key={acc._id} account={acc} accounts={accounts}
                  level={0} selectedId={selectedAccount?._id}
                  onSelect={setSelectedAccount}
                  search={search} isRTL={isRTL} t={t}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Detail panel ────────────────────────────────────────────────── */}
        <div className="flex-1 surface-card flex flex-col overflow-hidden rounded-2xl">
          <AccountDetail
            account={selectedAccount}
            accounts={rawAccounts ?? []}
            t={t}
            isRTL={isRTL}
            formatCurrency={formatCurrency}
          />
        </div>
      </div>
    </div>
  );
}
