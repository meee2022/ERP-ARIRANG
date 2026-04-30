// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { friendlyError } from "@/lib/utils";
import { Landmark, Plus, X, Check, Pencil, PowerOff, Trash2 } from "lucide-react";

// ─── Form ─────────────────────────────────────────────────────────────────────

function BankAccountForm({ onClose, existing }: { onClose: () => void; existing?: any }) {
  const { t, isRTL } = useI18n();
  const { currentUser } = useAuth();
  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const branch = useQuery(api.branches.getDefaultBranch, company ? { companyId: company._id } : "skip");
  const selectedBranchStore = useAppStore((s) => s.selectedBranch);
  const effectiveBranchId = selectedBranchStore !== "all" ? selectedBranchStore : branch?._id;
  const defaultCurrency = useQuery(api.helpers.getDefaultCurrency, {});
  const accounts = useQuery(api.accounts.getAll, company ? { companyId: company._id } : "skip");

  const createBankAccount = useMutation(api.treasury.createBankAccount);
  const updateBankAccount = useMutation(api.treasury.updateBankAccount);

  const [form, setForm] = useState({
    accountName: existing?.accountName ?? "",
    bankName: existing?.bankName ?? "",
    accountNumber: existing?.accountNumber ?? "",
    iban: existing?.iban ?? "",
    glAccountId: existing?.glAccountId ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // GL accounts that are bank-related (11xx)
  const bankGlAccounts = (accounts ?? []).filter(
    (a: any) => a.isPostable && String(a.code ?? "").startsWith("11")
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !currentUser) return;
    if (!form.glAccountId) { setError(isRTL ? "يرجى اختيار الحساب المحاسبي" : "Please select a GL account"); return; }
    setSaving(true); setError("");
    try {
      if (existing) {
        await updateBankAccount({
          bankAccountId: existing._id,
          accountName: form.accountName,
          bankName: form.bankName,
          accountNumber: form.accountNumber,
          iban: form.iban || undefined,
          updatedBy: currentUser._id,
        });
      } else {
        await createBankAccount({
          companyId: company._id,
          branchId: (effectiveBranchId ?? branch?._id) as any,
          accountName: form.accountName,
          bankName: form.bankName,
          accountNumber: form.accountNumber,
          iban: form.iban || undefined,
          currencyId: defaultCurrency._id,
          glAccountId: form.glAccountId as any,
          createdBy: currentUser._id,
        });
      }
      onClose();
    } catch (e: any) {
      setError(friendlyError(e, isRTL));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="surface-card p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[color:var(--ink-900)]">
          {existing ? (isRTL ? "تعديل الحساب البنكي" : "Edit Bank Account") : (isRTL ? "إضافة حساب بنكي جديد" : "New Bank Account")}
        </h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[color:var(--ink-50)] text-[color:var(--ink-400)]">
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>}

      <form onSubmit={onSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* Account Name */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
            {isRTL ? "اسم الحساب *" : "Account Name *"}
          </label>
          <input required value={form.accountName} onChange={(e) => set("accountName", e.target.value)}
            placeholder={isRTL ? "مثال: حساب QNB الجاري" : "e.g. QNB Current Account"}
            className="input-field h-9" />
        </div>

        {/* Bank Name */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
            {isRTL ? "اسم البنك *" : "Bank Name *"}
          </label>
          <input required value={form.bankName} onChange={(e) => set("bankName", e.target.value)}
            placeholder="QNB / QIIB / CBQ / Doha Bank"
            className="input-field h-9" />
        </div>

        {/* Account Number */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
            {isRTL ? "رقم الحساب *" : "Account Number *"}
          </label>
          <input required value={form.accountNumber} onChange={(e) => set("accountNumber", e.target.value)}
            placeholder="0012345678"
            className="input-field h-9 font-mono" />
        </div>

        {/* IBAN */}
        <div>
          <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
            {isRTL ? "رقم IBAN" : "IBAN"}
          </label>
          <input value={form.iban} onChange={(e) => set("iban", e.target.value)}
            placeholder="QA57QNBA000000000000693123456"
            className="input-field h-9 font-mono" />
        </div>

        {/* GL Account */}
        {!existing && (
          <div className="col-span-2">
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
              {isRTL ? "الحساب المحاسبي المقابل *" : "Linked GL Account *"}
            </label>
            <SearchableSelect
              isRTL={isRTL}
              required
              value={form.glAccountId}
              onChange={(v) => set("glAccountId", v)}
              placeholder={isRTL ? "اختر حساب البنك في دليل الحسابات..." : "Select bank GL account..."}
              searchPlaceholder={isRTL ? "ابحث..." : "Search..."}
              emptyMessage={isRTL ? "لا توجد نتائج" : "No results"}
              options={bankGlAccounts.map((a: any) => ({
                value: a._id,
                label: `${a.code} — ${isRTL ? a.nameAr : (a.nameEn || a.nameAr)}`,
              }))}
            />
          </div>
        )}

        <div className="col-span-full flex items-center gap-3 pt-1">
          <button type="submit" disabled={saving}
            className="btn-primary h-10 px-5 rounded-lg inline-flex items-center gap-2 text-sm font-semibold disabled:opacity-60">
            {saving ? (isRTL ? "جاري الحفظ..." : "Saving...") : <><Check className="h-4 w-4" />{isRTL ? "حفظ" : "Save"}</>}
          </button>
          <button type="button" onClick={onClose}
            className="h-10 px-5 rounded-lg border border-[color:var(--ink-200)] text-[color:var(--ink-700)] text-sm hover:bg-[color:var(--ink-50)]">
            {isRTL ? "إلغاء" : "Cancel"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BankAccountsPage() {
  const { isRTL } = useI18n();
  const { canCreate } = usePermissions();
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [showInactive, setShowInactive] = useState(false);

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const bankAccounts = useQuery(api.treasury.listBankAccounts, company ? { companyId: company._id, includeInactive: showInactive } : "skip");
  const updateBankAccount = useMutation(api.treasury.updateBankAccount);
  const deleteBankAccount = useMutation(api.treasury.deleteBankAccount);

  const loading = bankAccounts === undefined;

  const handleDeactivate = async (acc: any) => {
    if (!currentUser) return;
    if (!window.confirm(isRTL ? "هل تريد تعطيل هذا الحساب؟" : "Deactivate this account?")) return;
    await updateBankAccount({ bankAccountId: acc._id, isActive: false, updatedBy: currentUser._id });
  };

  const handleReactivate = async (acc: any) => {
    if (!currentUser) return;
    await updateBankAccount({ bankAccountId: acc._id, isActive: true, updatedBy: currentUser._id });
  };

  const handleDelete = async (acc: any) => {
    if (!currentUser) return;
    if (!window.confirm(isRTL ? `هل تريد حذف حساب "${acc.accountName}" نهائياً؟` : `Delete "${acc.accountName}" permanently?`)) return;
    try {
      await deleteBankAccount({ bankAccountId: acc._id, userId: currentUser._id });
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      <div className="no-print">
        <PageHeader
          icon={Landmark}
          title={isRTL ? "الحسابات البنكية" : "Bank Accounts"}
          subtitle={String(bankAccounts?.length ?? 0)}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInactive((v) => !v)}
                className={`h-10 px-3 rounded-lg inline-flex items-center gap-2 text-sm font-medium border transition-colors ${
                  showInactive
                    ? "bg-amber-50 border-amber-300 text-amber-700"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <PowerOff className="h-4 w-4" />
                {showInactive ? (isRTL ? "إخفاء المعطلة" : "Hide Inactive") : (isRTL ? "عرض المعطلة" : "Show Inactive")}
              </button>
              {canCreate("treasury") && (
                <button onClick={() => { setEditing(null); setShowForm((v) => !v); }}
                  className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
                  <Plus className="h-4 w-4" /> {isRTL ? "حساب جديد" : "New Account"}
                </button>
              )}
            </div>
          }
        />
      </div>

      {(showForm && !editing) && <BankAccountForm onClose={() => setShowForm(false)} />}
      {editing && <BankAccountForm existing={editing} onClose={() => setEditing(null)} />}

      <div className="surface-card overflow-hidden">
        {loading ? (
          <LoadingState label={isRTL ? "جاري التحميل..." : "Loading..."} />
        ) : (bankAccounts ?? []).length === 0 ? (
          <EmptyState
            icon={Landmark}
            title={isRTL ? "لا توجد حسابات بنكية" : "No bank accounts"}
            action={canCreate("treasury") ? (
              <button onClick={() => setShowForm(true)}
                className="btn-primary h-9 px-5 rounded-xl inline-flex items-center gap-2 text-sm font-semibold">
                <Plus className="h-4 w-4" /> {isRTL ? "إضافة حساب بنكي" : "Add Bank Account"}
              </button>
            ) : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{isRTL ? "اسم الحساب" : "Account Name"}</th>
                  <th>{isRTL ? "البنك" : "Bank"}</th>
                  <th>{isRTL ? "رقم الحساب" : "Account No."}</th>
                  <th>IBAN</th>
                  <th>{isRTL ? "الحالة" : "Status"}</th>
                  <th>{isRTL ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {(bankAccounts ?? []).map((acc: any) => (
                  <tr key={acc._id} className="border-t border-[color:var(--ink-100)] hover:bg-[color:var(--brand-50)]/30">
                    <td className="px-4 py-3 font-semibold text-[color:var(--ink-800)]">{acc.accountName}</td>
                    <td className="px-4 py-3 text-[color:var(--ink-600)]">{acc.bankName}</td>
                    <td className="px-4 py-3 font-mono text-sm text-[color:var(--ink-600)]">{acc.accountNumber}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[color:var(--ink-400)]">{acc.iban ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        acc.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {acc.isActive ? (isRTL ? "نشط" : "Active") : (isRTL ? "معطّل" : "Inactive")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditing(acc); setShowForm(false); }}
                          className="h-7 px-3 rounded-md text-xs font-medium inline-flex items-center gap-1 bg-[color:var(--ink-50)] text-[color:var(--ink-700)] hover:bg-[color:var(--ink-100)] border border-[color:var(--ink-200)]">
                          <Pencil className="h-3 w-3" /> {isRTL ? "تعديل" : "Edit"}
                        </button>
                        {acc.isActive ? (
                          <button onClick={() => handleDeactivate(acc)}
                            className="h-7 px-3 rounded-md text-xs font-medium inline-flex items-center gap-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200">
                            <PowerOff className="h-3 w-3" /> {isRTL ? "تعطيل" : "Deactivate"}
                          </button>
                        ) : (
                          <button onClick={() => handleReactivate(acc)}
                            className="h-7 px-3 rounded-md text-xs font-medium inline-flex items-center gap-1 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200">
                            <Check className="h-3 w-3" /> {isRTL ? "تفعيل" : "Activate"}
                          </button>
                        )}
                        <button onClick={() => handleDelete(acc)}
                          className="h-7 px-3 rounded-md text-xs font-medium inline-flex items-center gap-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200">
                          <Trash2 className="h-3 w-3" /> {isRTL ? "حذف" : "Delete"}
                        </button>
                      </div>
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
