// @ts-nocheck
"use client";
import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Warehouse, Plus, X, Check, Pencil } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";

// ─── New Warehouse Form ────────────────────────────────────────────────────────

function NewWarehouseForm({ onClose, companyId, branchId }: { onClose: () => void; companyId: any; branchId: any }) {
  const { t, isRTL } = useI18n();
  const [code, setCode] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [warehouseType, setWarehouseType] = useState<"main" | "transit" | "waste">("main");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const createWarehouse = useMutation(api.items.createWarehouse);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { setError(t("code") + " " + t("required")); return; }
    if (!nameAr.trim()) { setError(t("nameArRequired")); return; }
    setSaving(true);
    setError("");
    try {
      await createWarehouse({
        companyId,
        branchId,
        code: code.trim(),
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim() || undefined,
        warehouseType,
        isActive: true,
      });
      onClose();
    } catch (err: any) {
      setError(err.message === "DUPLICATE_CODE" ? t("duplicateCode") : (err.message ?? "حدث خطأ"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[color:var(--ink-900)]">{t("newWarehouse")}</h3>
        <button type="button" onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[color:var(--ink-50)] text-[color:var(--ink-400)]">
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("warehouseCode")} *</label>
            <input type="text" required value={code} onChange={(e) => setCode(e.target.value)}
              className="input-field h-9 w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("nameAr")} *</label>
            <input type="text" required value={nameAr} onChange={(e) => setNameAr(e.target.value)}
              className="input-field h-9 w-full" dir="rtl" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("nameEn")}</label>
            <input type="text" value={nameEn} onChange={(e) => setNameEn(e.target.value)}
              className="input-field h-9 w-full" dir="ltr" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("warehouseType")}</label>
            <select value={warehouseType} onChange={(e) => setWarehouseType(e.target.value as any)}
              className="input-field h-9 w-full">
              <option value="main">{t("wtMain")}</option>
              <option value="transit">{t("wtTransit")}</option>
              <option value="waste">{t("wtWaste")}</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={saving}
            className="btn-primary h-9 px-5 rounded-lg inline-flex items-center gap-2 text-sm font-semibold disabled:opacity-60">
            {saving ? t("saving") : <><Check className="h-4 w-4" />{t("save")}</>}
          </button>
          <button type="button" onClick={onClose}
            className="h-9 px-5 rounded-lg border border-[color:var(--ink-200)] text-[color:var(--ink-700)] text-sm hover:bg-[color:var(--ink-50)]">
            {t("cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Edit Warehouse Row ────────────────────────────────────────────────────────

function EditWarehouseRow({ warehouse, onClose }: { warehouse: any; onClose: () => void }) {
  const { t } = useI18n();
  const [nameAr, setNameAr] = useState(warehouse.nameAr);
  const [nameEn, setNameEn] = useState(warehouse.nameEn ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const updateWarehouse = useMutation(api.items.updateWarehouse);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) { setError(t("nameArRequired")); return; }
    setSaving(true);
    setError("");
    try {
      await updateWarehouse({ id: warehouse._id, nameAr: nameAr.trim(), nameEn: nameEn.trim() || undefined });
      onClose();
    } catch (err: any) {
      setError(err.message ?? "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr>
      <td className="code">{warehouse.code}</td>
      <td colSpan={2}>
        {error && <div className="text-red-600 text-xs mb-1">{error}</div>}
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <input type="text" value={nameAr} onChange={(e) => setNameAr(e.target.value)}
            className="input-field h-8 text-sm w-40" dir="rtl" placeholder={t("nameAr")} />
          <input type="text" value={nameEn} onChange={(e) => setNameEn(e.target.value)}
            className="input-field h-8 text-sm w-40" dir="ltr" placeholder={t("nameEn")} />
          <button type="submit" disabled={saving}
            className="h-8 px-3 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 hover:bg-emerald-100 disabled:opacity-60">
            {saving ? t("saving") : t("save")}
          </button>
          <button type="button" onClick={onClose}
            className="h-8 px-3 rounded-md border border-[color:var(--ink-200)] text-[color:var(--ink-600)] text-xs hover:bg-[color:var(--ink-50)]">
            {t("cancel")}
          </button>
        </form>
      </td>
      <td />
      <td />
    </tr>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function WarehousesPage() {
  const { t, isRTL } = useI18n();
  const { canCreate, canEdit } = usePermissions();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const branch = useQuery(api.branches.getDefaultBranch, company ? { companyId: company._id } : "skip");
  const warehouses = useQuery(api.items.getAllWarehouses, company ? { companyId: company._id } : "skip");
  const toggleActive = useMutation(api.items.toggleWarehouseActive);

  const loading = warehouses === undefined;

  const handleToggle = async (id: string) => {
    setToggleError(null);
    try {
      await toggleActive({ id: id as any });
    } catch (err: any) {
      setToggleError(err.message ?? t("errUnexpected"));
    }
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      {toggleError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{toggleError}</div>
      )}

      <div className="no-print">
      <PageHeader
        icon={Warehouse}
        title={t("warehousesTitle")}
        badge={<span className="badge-soft">{(warehouses ?? []).length}</span>}
        actions={
          canCreate("inventory") ? (
            <button onClick={() => { setShowForm((v) => !v); setEditingId(null); }}
              className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
              <Plus className="h-4 w-4" /> {t("newWarehouse")}
            </button>
          ) : undefined
        }
      />
      </div>

      {showForm && company && branch && (
        <NewWarehouseForm
          onClose={() => setShowForm(false)}
          companyId={company._id}
          branchId={branch._id}
        />
      )}

      <div className="surface-card overflow-hidden">
        {loading ? (
          <LoadingState label={t("loading")} />
        ) : (warehouses ?? []).length === 0 ? (
          <EmptyState
            icon={Warehouse}
            title={t("noResults")}
            message={t("newWarehouse")}
            action={
              canCreate("inventory") ? (
                <button onClick={() => setShowForm(true)}
                  className="btn-primary h-9 px-5 rounded-xl inline-flex items-center gap-2 text-sm font-semibold">
                  <Plus className="h-4 w-4" /> {t("newWarehouse")}
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("warehouseCode")}</th>
                  <th>{t("nameAr")}</th>
                  <th>{t("nameEn")}</th>
                  <th>{t("warehouseType")}</th>
                  <th>{t("status")}</th>
                  <th className="text-end">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {(warehouses ?? []).map((w: any) => {
                  if (editingId === w._id) {
                    return (
                      <EditWarehouseRow
                        key={w._id}
                        warehouse={w}
                        onClose={() => setEditingId(null)}
                      />
                    );
                  }
                  return (
                    <tr key={w._id}>
                      <td className="code">{w.code}</td>
                      <td>{w.nameAr}</td>
                      <td className="muted">{w.nameEn || "—"}</td>
                      <td className="muted">
                        {w.warehouseType === "main" ? t("wtMain") : w.warehouseType === "transit" ? t("wtTransit") : t("wtWaste")}
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${w.isActive ? "bg-emerald-50 text-emerald-700" : "bg-[color:var(--ink-100)] text-[color:var(--ink-500)]"}`}>
                          {w.isActive ? t("active") : t("inactive")}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="inline-flex items-center gap-2">
                          {canEdit("inventory") && (
                            <button
                              onClick={() => setEditingId(w._id)}
                              className="h-7 px-2.5 rounded-md text-xs font-medium border border-[color:var(--ink-200)] text-[color:var(--ink-600)] hover:bg-[color:var(--ink-50)] inline-flex items-center gap-1">
                              <Pencil className="h-3 w-3" /> {t("edit")}
                            </button>
                          )}
                          <button
                            onClick={() => handleToggle(w._id)}
                            className={`h-7 px-2.5 rounded-md text-xs font-medium border inline-flex items-center gap-1 ${w.isActive ? "border-orange-200 text-orange-600 hover:bg-orange-50" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}>
                            {w.isActive ? t("deactivate") : t("activate")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
