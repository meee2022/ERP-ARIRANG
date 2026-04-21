// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import {
  Search, Plus, ChevronDown, ChevronLeft, ChevronRight, Lock, Book,
  Power, X, Check, BookOpen,
} from "lucide-react";
import type { AccountType } from "@/lib/types";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

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
    accts.some((c: any) => c.nameAr.includes(search) ||
      (c.nameEn || "").toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      childrenMatch(accounts.filter((a: any) => a.parentId === c._id)));
  if (!matchesSelf && !childrenMatch(children)) return null;

  const isSel = selectedId === account._id;
  return (
    <div>
      <button
        onClick={() => { onSelect(account); if (hasChildren) setExpanded((v: any) => !v); }}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
          isSel ? "text-white" : "hover:bg-[color:var(--brand-50)] text-[color:var(--ink-700)]"
        )}
        style={{
          [isRTL ? "paddingRight" : "paddingLeft"]: `${12 + level * 16}px`,
          background: isSel ? "linear-gradient(90deg, var(--brand-700), var(--brand-600))" : undefined,
        }}
      >
        {hasChildren ? (
          <span className="flex-shrink-0 w-4">
            {expanded ? <ChevronDown className="h-3 w-3" /> : (isRTL ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
          </span>
        ) : <span className="w-4" />}
        <span className="font-mono text-xs flex-shrink-0 w-16">{account.code}</span>
        <span className="flex-1 truncate text-start">{isRTL ? account.nameAr : (account.nameEn || account.nameAr)}</span>
        {!account.isPostable && <Lock className={cn("h-3 w-3 flex-shrink-0", isSel ? "text-white/60" : "text-[color:var(--ink-400)]")} />}
        {!account.isActive && (
          <span className={cn("text-xs flex-shrink-0", isSel ? "text-white/80" : "text-red-400")}>
            {t("inactive")}
          </span>
        )}
      </button>
      {expanded && hasChildren && children.map((child: any) => (
        <AccountNode key={child._id} account={child} accounts={accounts}
          level={level + 1} selectedId={selectedId} onSelect={onSelect}
          search={search} isRTL={isRTL} t={t} />
      ))}
    </div>
  );
}

const TYPE_BADGE: Record<string, string> = {
  asset: "badge-soft",
  liability: "badge-muted",
  equity: "badge-gold",
  revenue: "status-good",
  expense: "status-warn",
};

function NewAccountModal({ accounts, onClose, t }: any) {
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
              <input required value={form.code} onChange={(e: any) => set("code", e.target.value)} className="input-field font-mono" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">{t("nameAr")} *</label>
              <input required value={form.nameAr} onChange={(e: any) => set("nameAr", e.target.value)} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">{t("nameEn")}</label>
            <input value={form.nameEn} onChange={(e: any) => set("nameEn", e.target.value)} className="input-field" />
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

function AccountDetail({ account, accounts, t, formatCurrency }: any) {
  const toggleActive = useMutation(api.accounts.toggleActive);
  if (!account) {
    return (
      <div className="flex-1 flex items-center justify-center text-[color:var(--ink-400)]">
        <div className="text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t("view")}</p>
        </div>
      </div>
    );
  }
  const children = accounts.filter((a: any) => a.parentId === account._id);
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[color:var(--ink-400)] text-sm">{account.code}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[account.accountType] ?? "badge-soft"}`}>
              {t(account.accountType as any)}
            </span>
            {!account.isActive && <span className="badge-muted">{t("inactive")}</span>}
          </div>
          <h2 className="text-xl font-bold text-[color:var(--ink-900)]">{isRTL ? account.nameAr : (account.nameEn || account.nameAr)}</h2>
          {account.nameEn && <p className="text-sm text-[color:var(--ink-500)]">{account.nameEn}</p>}
        </div>
        <button onClick={() => toggleActive({ id: account._id })} className="btn-ghost h-9 px-3 rounded-lg inline-flex items-center gap-1.5 text-sm font-semibold">
          <Power className="h-4 w-4" />
          {account.isActive ? t("deactivate") : t("activate")}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: t("accountType"), value: t(account.accountType as any) },
          { label: t("balance"), value: account.normalBalance === "debit" ? t("debit") : t("credit") },
          { label: t("status"), value: account.isActive ? t("active") : t("inactive") },
          { label: t("customersCount"), value: String(children.length) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[color:var(--ink-50)] rounded-xl p-3">
            <p className="text-xs text-[color:var(--ink-500)] mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-[color:var(--ink-800)]">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChartOfAccountsPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { canCreate, canEdit } = usePermissions();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const rawAccounts = useQuery(api.accounts.getAll, company ? { companyId: company._id } : "skip");
  const accounts = (rawAccounts ?? []).filter((a: any) => !filterType || a.accountType === filterType);
  const rootAccounts = accounts.filter((a: any) => !a.parentId);
  const loading = rawAccounts === undefined;

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] space-y-4">
      {showNewModal && <NewAccountModal accounts={rawAccounts ?? []} onClose={() => setShowNewModal(false)} t={t} />}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}>
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">{t("chartOfAccountsTitle")}</h1>
            <p className="text-xs text-[color:var(--ink-500)]">{(rawAccounts ?? []).length}</p>
          </div>
        </div>
        {canCreate("finance") && (
        <button onClick={() => setShowNewModal(true)} className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4" /> {t("newAccount")}
        </button>
        )}
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        <div className="w-80 flex-shrink-0 surface-card flex flex-col overflow-hidden">
          <div className="px-3 py-3 border-b border-[color:var(--ink-200)] space-y-2">
            <div className="relative">
              <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--ink-400)] ${isRTL ? "right-3" : "left-3"}`} />
              <input type="text" value={search} onChange={(e: any) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className={`input-field h-9 ${isRTL ? "pr-9" : "pl-9"}`} />
            </div>
            <select value={filterType} onChange={(e: any) => setFilterType(e.target.value)} className="input-field h-9">
              <option value="">{t("all")}</option>
              <option value="asset">{t("asset")}</option>
              <option value="liability">{t("liability")}</option>
              <option value="equity">{t("equity")}</option>
              <option value="revenue">{t("revenue")}</option>
              <option value="expense">{t("expense")}</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {loading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 6 }).map((_, i: any) => (
                  <div key={i} className="h-8 bg-[color:var(--ink-100)] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : rootAccounts.length === 0 ? (
              <div className="text-center py-8">
                <Book className="h-10 w-10 mx-auto mb-2 text-[color:var(--ink-300)]" />
                <p className="text-sm text-[color:var(--ink-400)]">{t("noResults")}</p>
              </div>
            ) : rootAccounts.map((acc: any) => (
              <AccountNode key={acc._id} account={acc} accounts={accounts}
                level={0} selectedId={selectedAccount?._id}
                onSelect={setSelectedAccount} search={search} isRTL={isRTL} t={t} />
            ))}
          </div>
        </div>
        <div className="flex-1 surface-card flex flex-col overflow-hidden">
          <AccountDetail account={selectedAccount} accounts={rawAccounts ?? []} t={t} formatCurrency={formatCurrency} />
        </div>
      </div>
    </div>
  );
}
