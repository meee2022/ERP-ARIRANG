"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import {
  Search, Plus, ChevronDown, ChevronLeft, ChevronRight, Lock,
  Power, X, BookOpen, Layers, TrendingUp, TrendingDown,
  CircleDollarSign, Scale, Landmark,
  Pencil, Trash2, FileText,
} from "lucide-react";
import type { AccountType } from "@/lib/types";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { LoadingState } from "@/components/ui/data-display";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

type AccountDoc = Doc<"accounts">;
type CompanyDoc = Doc<"companies">;
type Translator = (key: string) => string;
type TypeMeta = {
  color: string;
  bg: string;
  badgeClass: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
};
type AccountNodeProps = {
  account: AccountDoc;
  accounts: AccountDoc[];
  level: number;
  selectedId?: Id<"accounts">;
  onSelect: (account: AccountDoc) => void;
  search: string;
  isRTL: boolean;
  t: Translator;
};
type AccountFormState = {
  code: string;
  nameAr: string;
  nameEn: string;
  parentId: string;
  accountType: AccountType;
  accountSubType: string;
  isPostable: boolean;
  requiresCostCenter: boolean;
  requiresSubAccount: boolean;
  normalBalance: "debit" | "credit";
  notes: string;
};

// ── Type meta ──────────────────────────────────────────────────────────────────
const TYPE_META: Record<AccountType, TypeMeta> = {
  asset:     { color: "#0ea5e9", bg: "#f0f9ff", badgeClass: "badge-soft",  icon: Landmark        },
  liability: { color: "#f59e0b", bg: "#fffbeb", badgeClass: "badge-gold",  icon: Scale           },
  equity:    { color: "#8b5cf6", bg: "#f5f3ff", badgeClass: "badge-gold",  icon: CircleDollarSign },
  revenue:   { color: "#16a34a", bg: "#f0fdf4", badgeClass: "status-good", icon: TrendingUp      },
  expense:   { color: "#ef4444", bg: "#fef2f2", badgeClass: "status-warn", icon: TrendingDown    },
};

// ── AccountNode ────────────────────────────────────────────────────────────────
function AccountNode({ account, accounts, level, selectedId, onSelect, search, isRTL, t }: AccountNodeProps) {
  const children = accounts.filter((a) => a.parentId === account._id);
  const [expanded, setExpanded] = useState(true);
  const hasChildren = children.length > 0;

  const matchesSelf =
    !search ||
    account.code.toLowerCase().includes(search.toLowerCase()) ||
    account.nameAr.includes(search) ||
    (account.nameEn || "").toLowerCase().includes(search.toLowerCase());
  const childrenMatch = (accts: AccountDoc[]): boolean =>
    accts.some((c) =>
      c.nameAr.includes(search) ||
      (c.nameEn || "").toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      childrenMatch(accounts.filter((a) => a.parentId === c._id))
    );
  if (!matchesSelf && !childrenMatch(children)) return null;

  const isSel = selectedId === account._id;
  const meta = TYPE_META[account.accountType];
  const indentKey = isRTL ? "paddingRight" : "paddingLeft";

  return (
    <div>
      <button
        onClick={() => { onSelect(account); if (hasChildren) setExpanded((v) => !v); }}
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
            "font-mono text-[11px] flex-shrink-0 w-24",
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

      {expanded && hasChildren && children.map((child) => (
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
function NewAccountModal({ accounts, onClose, t, isRTL }: { accounts: AccountDoc[]; onClose: () => void; t: Translator; isRTL: boolean }) {
  const createAccount = useMutation(api.accounts.create);
  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0] as CompanyDoc | undefined;
  const { currentUser: defaultUser } = useAuth();

  const [form, setForm] = useState<AccountFormState>({
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
        parentId: form.parentId ? (form.parentId as Id<"accounts">) : undefined,
        accountType: form.accountType, accountSubType: form.accountSubType,
        isPostable: form.isPostable, requiresCostCenter: form.requiresCostCenter,
        requiresSubAccount: form.requiresSubAccount, normalBalance: form.normalBalance,
        notes: form.notes || undefined, createdBy: defaultUser!._id as Id<"users">,
      });
      onClose();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message === "DUPLICATE_CODE" ? t("duplicateCode") : message);
    } finally { setSaving(false); }
  };
  const set = <K extends keyof AccountFormState>(key: K, value: AccountFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

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
              <input required value={form.code} onChange={(e) => set("code", e.target.value)} className="input-field font-mono" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">{t("nameAr")} *</label>
              <input required value={form.nameAr} onChange={(e) => set("nameAr", e.target.value)} className="input-field" dir="rtl" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">{t("nameEn")}</label>
            <input value={form.nameEn} onChange={(e) => set("nameEn", e.target.value)} className="input-field" dir="ltr" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">{t("accountType")} *</label>
              <select value={form.accountType} onChange={(e) => set("accountType", e.target.value as AccountType)} className="input-field">
                <option value="asset">{t("asset")}</option>
                <option value="liability">{t("liability")}</option>
                <option value="equity">{t("equity")}</option>
                <option value="revenue">{t("revenue")}</option>
                <option value="expense">{t("expense")}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">{t("balance")}</label>
              <select value={form.normalBalance} onChange={(e) => set("normalBalance", e.target.value as "debit" | "credit")} className="input-field">
                <option value="debit">{t("debit")}</option>
                <option value="credit">{t("credit")}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">{t("parentAccount")}</label>
            <select value={form.parentId} onChange={(e) => set("parentId", e.target.value)} className="input-field">
              <option value="">— {t("none")} —</option>
              {accounts.filter((a) => !a.isPostable).map((a) => (
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

type EditAccountFormState = {
  nameAr: string;
  nameEn: string;
  accountSubType: string;
  isPostable: boolean;
  requiresCostCenter: boolean;
  notes: string;
};

function EditAccountModal({ account, onClose, t, isRTL }: { account: AccountDoc; onClose: () => void; t: Translator; isRTL: boolean }) {
  const updateAccount = useMutation(api.accounts.update);
  const { currentUser } = useAuth();
  const [form, setForm] = useState<EditAccountFormState>({
    nameAr: account.nameAr ?? "",
    nameEn: account.nameEn ?? "",
    accountSubType: account.accountSubType ?? "",
    isPostable: !!account.isPostable,
    requiresCostCenter: !!account.requiresCostCenter,
    notes: account.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof EditAccountFormState>(key: K, value: EditAccountFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updateAccount({
        id: account._id,
        nameAr: form.nameAr,
        nameEn: form.nameEn || undefined,
        accountSubType: form.accountSubType || undefined,
        isPostable: form.isPostable,
        requiresCostCenter: form.requiresCostCenter,
        notes: form.notes || undefined,
      });
      onClose();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[rgba(26,19,22,0.55)] flex items-center justify-center z-50 p-4">
      <div className="surface-card w-full max-w-xl max-h-screen overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between p-6 border-b border-[color:var(--ink-200)]">
          <h2 className="text-lg font-bold text-[color:var(--ink-900)]">{isRTL ? "تعديل الحساب" : "Edit Account"}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[color:var(--ink-50)] text-[color:var(--ink-500)]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">{t("code")}</label>
              <input value={account.code} disabled className="input-field font-mono bg-[color:var(--ink-50)] text-[color:var(--ink-500)]" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">{t("accountType")}</label>
              <input value={t(account.accountType)} disabled className="input-field bg-[color:var(--ink-50)] text-[color:var(--ink-500)]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">{t("nameAr")} *</label>
              <input required value={form.nameAr} onChange={(e) => set("nameAr", e.target.value)} className="input-field" dir="rtl" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">{t("nameEn")}</label>
              <input value={form.nameEn} onChange={(e) => set("nameEn", e.target.value)} className="input-field" dir="ltr" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm text-[color:var(--ink-700)]">
              <input type="checkbox" checked={form.isPostable} onChange={(e) => set("isPostable", e.target.checked)} />
              <span>{t("isPostable")}</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-[color:var(--ink-700)]">
              <input type="checkbox" checked={form.requiresCostCenter} onChange={(e) => set("requiresCostCenter", e.target.checked)} />
              <span>{isRTL ? "يتطلب مركز تكلفة" : "Requires Cost Center"}</span>
            </label>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">{isRTL ? "النوع الفرعي" : "Sub Type"}</label>
            <input value={form.accountSubType} onChange={(e) => set("accountSubType", e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">{t("notes")}</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="input-field min-h-24 resize-none" />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving || !currentUser?._id} className="flex-1 btn-primary h-10 rounded-lg text-sm font-semibold">
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

function AccountDetail({
  account,
  accounts,
  t,
  isRTL,
  formatCurrency,
  onEdit,
  onDeleted,
  allowEdit,
  allowDelete,
}: {
  account: AccountDoc | null;
  accounts: AccountDoc[];
  t: Translator;
  isRTL: boolean;
  formatCurrency: (value: number) => string;
  onEdit: (account: AccountDoc) => void;
  onDeleted: (deletedId: string) => void;
  allowEdit: boolean;
  allowDelete: boolean;
}) {
  const toggleActive    = useMutation(api.accounts.toggleActive);
  const setOpType       = useMutation(api.accounts.setOperationalType);
  const deleteAccount   = useMutation(api.accounts.deleteAccount);
  const { currentUser } = useAuth();
  const details = useQuery(api.accounts.getAccountDetails, account ? { accountId: account._id } : "skip");

  // ── Empty state: overview stats ─────────────────────────────────────────────
  if (!account) {
    const total = accounts.length;
    const byType = Object.fromEntries(
      (Object.keys(TYPE_META) as AccountType[]).map((k) => [k, accounts.filter((a) => a.accountType === k).length])
    ) as Record<AccountType, number>;
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
                    {t(type)}
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
  const children = accounts.filter((a) => a.parentId === account._id);
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
                  {t(account.accountType)}
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
            onClick={() => currentUser?._id && toggleActive({ id: account._id, userId: currentUser._id })}
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
        <div className="mt-3 flex items-center gap-2">
          {allowEdit && (
            <button
              onClick={() => onEdit(account)}
              className="h-8 px-3 rounded-lg inline-flex items-center gap-1.5 text-xs font-semibold bg-[color:var(--ink-900)] text-white hover:opacity-90"
            >
              <Pencil className="h-3.5 w-3.5" />
              {isRTL ? "تعديل" : "Edit"}
            </button>
          )}
          {allowDelete && (
            <button
              onClick={async () => {
                if (!currentUser?._id) return;
                const confirmed = window.confirm(isRTL ? "هل تريد حذف هذا الحساب نهائياً؟" : "Delete this account permanently?");
                if (!confirmed) return;
                try {
                  await deleteAccount({ id: account._id, userId: currentUser._id });
                  onDeleted(account._id);
                } catch (error: unknown) {
                  const msg = error instanceof Error ? error.message : String(error);
                  const map: Record<string, string> = {
                    ACCOUNT_HAS_CHILDREN: isRTL ? "لا يمكن حذف الحساب لأنه يحتوي على حسابات فرعية" : "Cannot delete account with sub-accounts",
                    ACCOUNT_HAS_TRANSACTIONS: isRTL ? "لا يمكن حذف الحساب لأنه يحتوي على قيود" : "Cannot delete account with transactions",
                    ACCOUNT_IN_USE_BY_CUSTOMER: isRTL ? "الحساب مرتبط بعميل" : "Account is linked to a customer",
                    ACCOUNT_IN_USE_BY_SUPPLIER: isRTL ? "الحساب مرتبط بمورد" : "Account is linked to a supplier",
                    ACCOUNT_IN_USE_BY_ITEM: isRTL ? "الحساب مرتبط بصنف" : "Account is linked to an item",
                    ACCOUNT_IN_USE_BY_CATEGORY: isRTL ? "الحساب مرتبط بتصنيف أصناف" : "Account is linked to an item category",
                    ACCOUNT_IN_USE_BY_POSTING_RULES: isRTL ? "الحساب مستخدم في قواعد الترحيل" : "Account is used in posting rules",
                    ACCOUNT_IN_USE_BY_BANK: isRTL ? "الحساب مرتبط بحساب بنكي" : "Account is linked to a bank account",
                    ACCOUNT_IN_USE_BY_CASHBOX: isRTL ? "الحساب مرتبط بصندوق" : "Account is linked to a cash box",
                    ACCOUNT_IN_USE_BY_FIXED_ASSET: isRTL ? "الحساب مرتبط بأصل ثابت" : "Account is linked to a fixed asset",
                  };
                  alert(map[msg] ?? msg);
                }
              }}
              className="h-8 px-3 rounded-lg inline-flex items-center gap-1.5 text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isRTL ? "حذف" : "Delete"}
            </button>
          )}
        </div>
      </div>

      {/* ── Detail grid ─────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 grid grid-cols-2 gap-3">
        {[
          { label: t("accountType"),    value: t(account.accountType) },
          { label: t("balance"),        value: account.normalBalance === "debit" ? t("debit") : t("credit") },
          { label: t("isPostable"),     value: account.isPostable ? (isRTL ? "نعم" : "Yes") : (isRTL ? "لا" : "No") },
          { label: isRTL ? "الحسابات الفرعية" : "Sub-accounts", value: String(children.length) },
          { label: isRTL ? "إجمالي المدين" : "Total Debit", value: details ? formatCurrency(details.totalDebit) : "—" },
          { label: isRTL ? "إجمالي الدائن" : "Total Credit", value: details ? formatCurrency(details.totalCredit) : "—" },
          { label: isRTL ? "الرصيد الحالي" : "Current Balance", value: details ? formatCurrency(details.balance) : "—" },
          { label: isRTL ? "عدد القيود" : "Entries", value: details ? String(details.transactionCount) : "0" },
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
              {children.map((c) => (
                <div key={c._id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[color:var(--ink-50)] border border-[color:var(--ink-100)]">
                  <span className="font-mono text-[11px] text-[color:var(--ink-400)] w-24 flex-shrink-0">{c.code}</span>
                  <span className="text-xs font-medium text-[color:var(--ink-700)] flex-1 truncate">
                    {isRTL ? c.nameAr : (c.nameEn || c.nameAr)}
                  </span>
                  {!c.isActive && <span className="text-[9px] text-red-400">{t("inactive")}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5">
          <p className="text-[10px] font-bold text-[color:var(--ink-400)] uppercase tracking-wider mb-2">
            {isRTL ? "القيود على الحساب" : "Account Entries"}
          </p>
          {details === undefined ? (
            <div className="bg-[color:var(--ink-50)] rounded-xl p-4 border border-[color:var(--ink-100)] text-sm text-[color:var(--ink-500)]">
              {t("loading")}
            </div>
          ) : details?.lastEntries?.length ? (
            <div className="overflow-hidden rounded-xl border border-[color:var(--ink-100)]">
              <table className="w-full text-sm">
                <thead className="bg-[color:var(--ink-50)] text-[color:var(--ink-500)]">
                  <tr>
                    <th className="px-3 py-2 text-start">{isRTL ? "التاريخ" : "Date"}</th>
                    <th className="px-3 py-2 text-start">{isRTL ? "رقم القيد" : "Entry No."}</th>
                    <th className="px-3 py-2 text-start">{isRTL ? "البيان" : "Description"}</th>
                    <th className="px-3 py-2 text-end">{isRTL ? "مدين" : "Debit"}</th>
                    <th className="px-3 py-2 text-end">{isRTL ? "دائن" : "Credit"}</th>
                  </tr>
                </thead>
                <tbody>
                  {details.lastEntries.map((entry) => (
                    <tr key={`${entry.entryId}-${entry.entryNumber}`} className="border-t border-[color:var(--ink-100)]">
                      <td className="px-3 py-2">{entry.entryDate}</td>
                      <td className="px-3 py-2 font-mono text-xs">{entry.entryNumber}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-[color:var(--ink-800)]">{entry.description}</div>
                        {entry.sourceType ? <div className="text-[11px] text-[color:var(--ink-400)]">{entry.sourceType}</div> : null}
                      </td>
                      <td className="px-3 py-2 text-end">{formatCurrency(entry.debit ?? 0)}</td>
                      <td className="px-3 py-2 text-end">{formatCurrency(entry.credit ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-[color:var(--ink-50)] rounded-xl p-4 border border-[color:var(--ink-100)] text-sm text-[color:var(--ink-500)] inline-flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>{isRTL ? "لا توجد قيود على هذا الحساب" : "No entries for this account"}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ChartOfAccountsPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { currentUser } = useAuth();
  const [search, setSearch]     = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState<AccountDoc | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [seedingExpenses, setSeedingExpenses] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);

  const companies  = useQuery(api.seed.getCompanies, {});
  const company    = companies?.[0] as CompanyDoc | undefined;
  const rawAccounts = useQuery(api.accounts.getAll, company ? { companyId: company._id } : "skip");
  const accounts   = (rawAccounts ?? []).filter((a) => !filterType || a.accountType === filterType);
  const rootAccounts = accounts.filter((a) => !a.parentId);
  const loading    = rawAccounts === undefined;
  const addDirectExpenses = useMutation(api.seed.addDirectExpensesAccounts);
  const cleanupOldAccounts = useMutation(api.accounts.cleanupOldAccounts);

  const handleAddDirectExpenses = async () => {
    if (!company) return;
    setSeedingExpenses(true);
    try {
      const result = await addDirectExpenses({ companyId: company._id });
      const created = typeof result === "object" && result && "count" in result ? Number(result.count ?? 0) : 0;
      alert(isRTL
        ? `تم إضافة ${created} حساب مصاريف مباشرة بنجاح`
        : `Added ${created} Direct Expenses accounts successfully`);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      setSeedingExpenses(false);
    }
  };

  // Show seed button only if 5100 doesn't exist yet
  const hasDirectExpenses = (rawAccounts ?? []).some((a) => a.code === "5100");

  // Old accounts = short codes (< 11 digits)
  const oldAccountsCount = (rawAccounts ?? []).filter((a) => a.code.length < 11).length;

  const handleCleanupOldAccounts = async () => {
    if (!company || !currentUser?._id) return;
    const confirmed = window.confirm(
      isRTL
        ? `سيتم حذف ${oldAccountsCount} حساب برمز قصير (أقل من 11 رقم). هل تريد المتابعة؟`
        : `This will delete ${oldAccountsCount} accounts with short codes (< 11 digits). Continue?`
    );
    if (!confirmed) return;
    setCleaningUp(true);
    try {
      const res = await cleanupOldAccounts({ companyId: company._id, userId: currentUser._id as Id<"users">, force: true });
      const { deleted, skipped, linesDeleted } = res as { deleted: number; skipped: number; linesDeleted: number };
      alert(
        isRTL
          ? `تم الحذف: ${deleted} حساب${linesDeleted > 0 ? `\nقيود محذوفة: ${linesDeleted}` : ""}${skipped > 0 ? `\nتعذّر حذف: ${skipped}` : ""}`
          : `Deleted: ${deleted} account(s)${linesDeleted > 0 ? `\nJournal lines deleted: ${linesDeleted}` : ""}${skipped > 0 ? `\nSkipped: ${skipped}` : ""}`
      );
      setSelectedAccount(null);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      setCleaningUp(false);
    }
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="flex flex-col h-[calc(100vh-120px)] space-y-4">
      {showNewModal && (
        <NewAccountModal
          accounts={rawAccounts ?? []}
          onClose={() => setShowNewModal(false)}
          t={t} isRTL={isRTL}
        />
      )}
      {showEditModal && selectedAccount && (
        <EditAccountModal
          account={selectedAccount}
          onClose={() => setShowEditModal(false)}
          t={t}
          isRTL={isRTL}
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
              <div className="flex items-center gap-2">
                {oldAccountsCount > 0 && canDelete("finance") && (
                  <button
                    onClick={handleCleanupOldAccounts}
                    disabled={cleaningUp}
                    className="h-9 px-4 rounded-xl inline-flex items-center gap-2 text-sm font-semibold border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {cleaningUp
                      ? (isRTL ? "جاري الحذف..." : "Deleting...")
                      : (isRTL ? `حذف الحسابات القديمة (${oldAccountsCount})` : `Delete Old Accounts (${oldAccountsCount})`)}
                  </button>
                )}
                {!hasDirectExpenses && (
                  <button
                    onClick={handleAddDirectExpenses}
                    disabled={seedingExpenses}
                    className="h-9 px-4 rounded-xl inline-flex items-center gap-2 text-sm font-semibold border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-50"
                  >
                    <Layers className="h-4 w-4" />
                    {seedingExpenses
                      ? (isRTL ? "جاري الإضافة..." : "Adding...")
                      : (isRTL ? "إضافة المصاريف المباشرة" : "Add Direct Expenses")}
                  </button>
                )}
                <button
                  onClick={() => setShowNewModal(true)}
                  className="btn-primary h-9 px-4 rounded-xl inline-flex items-center gap-2 text-sm font-semibold"
                >
                  <Plus className="h-4 w-4" /> {t("newAccount")}
                </button>
              </div>
            ) : undefined
          }
        />
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* ── Tree panel ──────────────────────────────────────────────────── */}
        <div className="w-[26rem] flex-shrink-0 surface-card flex flex-col overflow-hidden rounded-2xl">
          {/* Search + filter */}
          <div className="px-3 pt-3 pb-2 border-b border-[color:var(--ink-100)] space-y-2">
            <div className="relative">
              <Search className={`absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[color:var(--ink-400)] ${isRTL ? "right-2.5" : "left-2.5"}`} />
              <input
                type="text" value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                  {t(type)}
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
              rootAccounts.map((acc) => (
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
            onEdit={() => canEdit("finance") && setShowEditModal(true)}
            onDeleted={(deletedId: string) => {
              if (selectedAccount?._id === deletedId) setSelectedAccount(null);
            }}
            allowEdit={canEdit("finance")}
            allowDelete={canDelete("finance")}
          />
        </div>
      </div>
    </div>
  );
}
