// @ts-nocheck
"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import {
  HardDrive, Plus, Search, Edit2, Archive, X, Check,
} from "lucide-react";

const inputClass =
  "w-full border border-[color:var(--ink-300)] rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[color:var(--brand-400)] outline-none transition-colors";

function StatusBadge({ status, t }: { status: string; t: any }) {
  const map: Record<string, { cls: string; label: string }> = {
    active: { cls: "bg-green-100 text-green-800", label: t("active") },
    fully_depreciated: { cls: "bg-amber-100 text-amber-800", label: t("fullyDepreciated") },
    inactive: { cls: "bg-[color:var(--ink-100)] text-[color:var(--ink-500)]", label: t("inactive") },
  };
  const s = map[status] ?? map.active;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "currentColor", opacity: 0.7 }} />
      {s.label}
    </span>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="surface-card w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--ink-100)]">
          <h2 className="text-lg font-bold text-[color:var(--ink-900)]">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[color:var(--ink-100)] transition-colors">
            <X className="h-5 w-5 text-[color:var(--ink-500)]" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium text-[color:var(--ink-700)] mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const CATEGORIES = ["Oven", "Vehicle", "Furniture", "Equipment", "Building", "Computer", "Other"];

export default function AssetRegisterPage() {
  const { t, isRTL, formatCurrency, formatDate } = useI18n();

  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const assets = useQuery(
    api.fixedAssets.getFixedAssets,
    companyId ? { companyId, search: search || undefined, status: statusFilter || undefined, category: categoryFilter || undefined } : "skip"
  );

  const accounts = useQuery(
    api.accounts.getAll,
    companyId ? { companyId } : "skip"
  );

  const costCenters = useQuery(
    api.costCenters.getCostCenters,
    companyId ? { companyId, activeOnly: true } : "skip"
  );

  const createAsset = useMutation(api.fixedAssets.createFixedAsset);
  const updateAsset = useMutation(api.fixedAssets.updateFixedAsset);
  const archiveAsset = useMutation(api.fixedAssets.archiveFixedAsset);

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const emptyForm = {
    assetCode: "", nameAr: "", nameEn: "", category: "",
    purchaseDate: "", inServiceDate: "", purchaseCost: "",
    salvageValue: "0", usefulLifeMonths: "", depreciationMethod: "straight_line",
    location: "", notes: "", costCenterId: "", assetAccountId: "",
    depreciationExpenseAccountId: "", accumulatedDepreciationAccountId: "",
  };
  const [form, setForm] = useState(emptyForm);

  function flash(msg: string) { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000); }
  function resetForm() { setForm(emptyForm); setErr(null); }

  function openCreate() { resetForm(); setEditTarget(null); setModal("create"); }

  function openEdit(a: any) {
    setEditTarget(a);
    setForm({
      assetCode: a.assetCode,
      nameAr: a.nameAr,
      nameEn: a.nameEn ?? "",
      category: a.category ?? "",
      purchaseDate: a.purchaseDate ? new Date(a.purchaseDate).toISOString().split("T")[0] : "",
      inServiceDate: a.inServiceDate ? new Date(a.inServiceDate).toISOString().split("T")[0] : "",
      purchaseCost: String(a.purchaseCost),
      salvageValue: String(a.salvageValue),
      usefulLifeMonths: String(a.usefulLifeMonths),
      depreciationMethod: a.depreciationMethod,
      location: a.location ?? "",
      notes: a.notes ?? "",
      costCenterId: a.costCenterId ?? "",
      assetAccountId: a.assetAccountId ?? "",
      depreciationExpenseAccountId: a.depreciationExpenseAccountId ?? "",
      accumulatedDepreciationAccountId: a.accumulatedDepreciationAccountId ?? "",
    });
    setErr(null);
    setModal("edit");
  }

  async function onSave() {
    if (!companyId) return;
    if (!form.assetCode.trim() || !form.nameAr.trim() || !form.purchaseDate || !form.purchaseCost || !form.usefulLifeMonths) {
      setErr(t("errRequiredFields"));
      return;
    }
    setSaving(true); setErr(null);
    try {
      const base = {
        assetCode: form.assetCode.trim(),
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim() || undefined,
        category: form.category || undefined,
        purchaseDate: new Date(form.purchaseDate).getTime(),
        inServiceDate: form.inServiceDate ? new Date(form.inServiceDate).getTime() : undefined,
        purchaseCost: parseFloat(form.purchaseCost),
        salvageValue: parseFloat(form.salvageValue) || 0,
        usefulLifeMonths: parseInt(form.usefulLifeMonths),
        depreciationMethod: form.depreciationMethod,
        location: form.location || undefined,
        notes: form.notes || undefined,
        costCenterId: form.costCenterId || undefined,
        assetAccountId: form.assetAccountId || undefined,
        depreciationExpenseAccountId: form.depreciationExpenseAccountId || undefined,
        accumulatedDepreciationAccountId: form.accumulatedDepreciationAccountId || undefined,
      };

      if (modal === "create") {
        await createAsset({ companyId, ...base });
        flash(isRTL ? "تم إنشاء الأصل" : "Asset created");
      } else if (editTarget) {
        await updateAsset({ id: editTarget._id, ...base });
        flash(isRTL ? "تم تحديث الأصل" : "Asset updated");
      }
      setModal(null); resetForm();
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("DUPLICATE_ASSET_CODE")) setErr(t("duplicateAssetCode"));
      else setErr(msg || t("errUnexpected"));
    } finally { setSaving(false); }
  }

  async function onArchive(a: any) {
    try {
      await archiveAsset({ id: a._id });
      flash(isRTL ? "تم أرشفة الأصل" : "Asset archived");
    } catch (e: any) { setErr(e?.message ?? t("errUnexpected")); }
  }

  function displayName(a: any) { return !isRTL && a.nameEn ? a.nameEn : a.nameAr; }

  const isLoading = assets === undefined;
  const rows = assets ?? [];

  const postableAccounts = useMemo(
    () => (accounts ?? []).filter((a: any) => a.isPostable && a.isActive),
    [accounts]
  );

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      {successMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-green-600 text-white rounded-xl px-4 py-2 shadow-lg text-sm">
          <Check className="h-4 w-4" /> {successMsg}
        </div>
      )}

      <PageHeader
        icon={HardDrive}
        title={t("assetRegister")}
        subtitle={t("fixedAssets")}
        actions={
          <button onClick={openCreate} className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold">
            <Plus className="h-4 w-4" /> {t("newAsset")}
          </button>
        }
      />

      {err && !modal && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{err}</span>
          <button onClick={() => setErr(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="surface-card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`absolute top-2.5 h-4 w-4 text-[color:var(--ink-400)] ${isRTL ? "right-2.5" : "left-2.5"}`} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className={`w-full border border-[color:var(--ink-300)] rounded-lg py-2 text-sm bg-white focus:ring-2 focus:ring-[color:var(--brand-400)] outline-none ${isRTL ? "pr-8 pl-3" : "pl-8 pr-3"}`}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-[color:var(--ink-300)] rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">{t("allStatuses")}</option>
          <option value="active">{t("active")}</option>
          <option value="fully_depreciated">{t("fullyDepreciated")}</option>
          <option value="inactive">{t("inactive")}</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-[color:var(--ink-300)] rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">{t("all")}</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="surface-card overflow-x-auto">
        {isLoading ? (
          <LoadingState label={t("loading")} />
        ) : rows.length === 0 ? (
          <EmptyState icon={HardDrive} title={t("fixedAssets")}
            message={t("noFixedAssetsYet")}
            action={
              <button onClick={openCreate} className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold">
                <Plus className="h-4 w-4" /> {t("addFirstAsset")}
              </button>
            }
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("assetCode")}</th>
                <th>{t("name")}</th>
                <th>{t("category")}</th>
                <th>{t("purchaseDate")}</th>
                <th className="text-end">{t("purchaseCost")}</th>
                <th>{t("usefulLife")}</th>
                <th>{t("status")}</th>
                <th className="text-end">{t("bookValue")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a: any) => (
                <tr key={a._id}>
                  <td><span className="font-mono text-sm font-medium">{a.assetCode}</span></td>
                  <td className="font-medium">{displayName(a)}</td>
                  <td className="muted">{a.category || "—"}</td>
                  <td className="muted whitespace-nowrap">{formatDate(a.purchaseDate)}</td>
                  <td className="text-end tabular-nums">{formatCurrency(a.purchaseCost)}</td>
                  <td className="muted">{a.usefulLifeMonths} {t("months")}</td>
                  <td><StatusBadge status={a.status} t={t} /></td>
                  <td className="text-end tabular-nums font-semibold">{formatCurrency(a.bookValue)}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(a)} title={t("edit")} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {a.status === "active" && (
                        <button onClick={() => onArchive(a)} title={t("archiveAsset")} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors">
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal === "create" ? t("newAsset") : t("editAsset")} onClose={() => { setModal(null); resetForm(); }}>
          <div className="grid grid-cols-2 gap-x-4">
            <Field label={t("assetCode")} required>
              <input type="text" value={form.assetCode} onChange={(e) => setForm(f => ({ ...f, assetCode: e.target.value }))} className={inputClass} dir="ltr" />
            </Field>
            <Field label={t("category")}>
              <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} className={inputClass}>
                <option value="">—</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label={t("nameAr")} required>
              <input type="text" value={form.nameAr} onChange={(e) => setForm(f => ({ ...f, nameAr: e.target.value }))} className={inputClass} dir="rtl" />
            </Field>
            <Field label={t("nameEn")}>
              <input type="text" value={form.nameEn} onChange={(e) => setForm(f => ({ ...f, nameEn: e.target.value }))} className={inputClass} dir="ltr" />
            </Field>
            <Field label={t("purchaseDate")} required>
              <input type="date" value={form.purchaseDate} onChange={(e) => setForm(f => ({ ...f, purchaseDate: e.target.value }))} className={inputClass} />
            </Field>
            <Field label={t("inServiceDate")}>
              <input type="date" value={form.inServiceDate} onChange={(e) => setForm(f => ({ ...f, inServiceDate: e.target.value }))} className={inputClass} />
            </Field>
            <Field label={t("purchaseCost")} required>
              <input type="number" step="0.01" value={form.purchaseCost} onChange={(e) => setForm(f => ({ ...f, purchaseCost: e.target.value }))} className={inputClass} dir="ltr" />
            </Field>
            <Field label={t("salvageValue")}>
              <input type="number" step="0.01" value={form.salvageValue} onChange={(e) => setForm(f => ({ ...f, salvageValue: e.target.value }))} className={inputClass} dir="ltr" />
            </Field>
            <Field label={t("usefulLifeMonths")} required>
              <input type="number" value={form.usefulLifeMonths} onChange={(e) => setForm(f => ({ ...f, usefulLifeMonths: e.target.value }))} className={inputClass} dir="ltr" />
            </Field>
            <Field label={t("depreciationMethod")}>
              <select value={form.depreciationMethod} onChange={(e) => setForm(f => ({ ...f, depreciationMethod: e.target.value }))} className={inputClass}>
                <option value="straight_line">{t("straightLine")}</option>
              </select>
            </Field>
            <Field label={t("location")}>
              <input type="text" value={form.location} onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} className={inputClass} />
            </Field>
            <Field label={t("costCenter")}>
              <select value={form.costCenterId} onChange={(e) => setForm(f => ({ ...f, costCenterId: e.target.value }))} className={inputClass}>
                <option value="">{t("noCostCenter")}</option>
                {(costCenters ?? []).map((cc: any) => (
                  <option key={cc._id} value={cc._id}>{cc.code} - {isRTL ? cc.nameAr : (cc.nameEn || cc.nameAr)}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-2 mb-3 border-t border-[color:var(--ink-100)] pt-3">
            <p className="text-xs font-semibold text-[color:var(--ink-500)] mb-2 uppercase tracking-wider">{t("account")} {t("settings")}</p>
            <div className="grid grid-cols-1 gap-x-4">
              <Field label={t("assetAccount")}>
                <select value={form.assetAccountId} onChange={(e) => setForm(f => ({ ...f, assetAccountId: e.target.value }))} className={inputClass}>
                  <option value="">—</option>
                  {postableAccounts.map((a: any) => (
                    <option key={a._id} value={a._id}>{a.code} - {isRTL ? a.nameAr : (a.nameEn || a.nameAr)}</option>
                  ))}
                </select>
              </Field>
              <Field label={t("depExpenseAccount")}>
                <select value={form.depreciationExpenseAccountId} onChange={(e) => setForm(f => ({ ...f, depreciationExpenseAccountId: e.target.value }))} className={inputClass}>
                  <option value="">—</option>
                  {postableAccounts.map((a: any) => (
                    <option key={a._id} value={a._id}>{a.code} - {isRTL ? a.nameAr : (a.nameEn || a.nameAr)}</option>
                  ))}
                </select>
              </Field>
              <Field label={t("accDepAccount")}>
                <select value={form.accumulatedDepreciationAccountId} onChange={(e) => setForm(f => ({ ...f, accumulatedDepreciationAccountId: e.target.value }))} className={inputClass}>
                  <option value="">—</option>
                  {postableAccounts.map((a: any) => (
                    <option key={a._id} value={a._id}>{a.code} - {isRTL ? a.nameAr : (a.nameEn || a.nameAr)}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <Field label={t("notes")}>
            <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} className={inputClass} rows={2} />
          </Field>

          {err && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{err}</div>
          )}

          <div className={`flex gap-3 mt-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            <button onClick={onSave} disabled={saving} className="flex-1 btn-primary disabled:opacity-50 rounded-xl py-2 text-sm font-semibold">
              {saving ? t("saving") : t("save")}
            </button>
            <button onClick={() => { setModal(null); resetForm(); }} className="flex-1 btn-ghost rounded-xl py-2 text-sm font-semibold">
              {t("cancel")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
