// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { User, Plus, Search, Edit2, Power, Phone, RefreshCw, Trash2 } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/data-display";
import { toast } from "@/store/toastStore";

export default function SalesRepsPage() {
  const { t, isRTL } = useI18n();
  const { currentUser } = useAuth();
  const { canView, canCreate, canEdit } = usePermissions();
  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;
  const branches = useQuery(api.branches.getAll, companyId ? { companyId } : "skip") ?? [];
  const reps = useQuery(api.salesMasters.listSalesReps, companyId ? { companyId } : "skip") ?? [];
  const createRep = useMutation(api.salesMasters.createSalesRep);
  const updateRep = useMutation(api.salesMasters.updateSalesRep);
  const toggleRep = useMutation(api.salesMasters.toggleSalesRepActive);
  const deleteSalesRep = useMutation(api.salesMasters.deleteSalesRep);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editRep, setEditRep] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    nameAr: "",
    nameEn: "",
    phone: "",
    branchId: "",
    notes: "",
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reps;
    return reps.filter((rep: any) =>
      [rep.code, rep.nameAr, rep.nameEn, rep.phone].filter(Boolean).some((v: string) => String(v).toLowerCase().includes(q))
    );
  }, [reps, search]);

  function friendlyError(e: any): string {
    const msg = String(e?.message || e || "Unknown error");
    // Strip Convex server prefixes
    const clean = msg
      .replace(/\[CONVEX.*?\]\s*/g, "")
      .replace(/Server Error\s*/gi, "")
      .replace(/Uncaught Error:\s*/gi, "")
      .replace(/Error:\s*/gi, "")
      .trim();
    return clean || "Something went wrong. Please try again.";
  }


  function resetForm() {
    setForm({ code: "", nameAr: "", nameEn: "", phone: "", branchId: "", notes: "" });
    setEditRep(null);
    setError(null);
  }

  function openCreate() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(rep: any) {
    setEditRep(rep);
    setForm({
      code: rep.code ?? "",
      nameAr: rep.nameAr ?? "",
      nameEn: rep.nameEn ?? "",
      phone: rep.phone ?? "",
      branchId: rep.branchId ?? "",
      notes: rep.notes ?? "",
    });
    setError(null);
    setShowForm(true);
  }

  async function onSave() {
    if (!companyId) return;
    if (!form.code.trim() || !form.nameAr.trim()) {
      setError(t("errRequiredFields"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editRep) {
        await updateRep({
          id: editRep._id,
          nameAr: form.nameAr,
          nameEn: form.nameEn || undefined,
          phone: form.phone || undefined,
          branchId: form.branchId ? (form.branchId as any) : undefined,
          notes: form.notes || undefined,
          userId: currentUser?._id,
        });
      } else {
        await createRep({
          companyId: companyId as any,
          code: form.code,
          nameAr: form.nameAr,
          nameEn: form.nameEn || undefined,
          phone: form.phone || undefined,
          branchId: form.branchId ? (form.branchId as any) : undefined,
          notes: form.notes || undefined,
          userId: currentUser?._id,
        });
      }
      setShowForm(false);
      resetForm();
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  if (reps === undefined) return <LoadingState label={t("loading")} />;

  if (!canView("sales")) {
    return <EmptyState title={t("permissionDenied")} />;
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      <PageHeader
        icon={User}
        title={t("salesRepsTitle")}
        badge={<span className="badge-soft">{filtered.length}</span>}
        actions={
          canCreate("sales") ? (
            <button onClick={openCreate} className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
              <Plus className="h-4 w-4" /> {t("newSalesRep")}
            </button>
          ) : undefined
        }
      />

      <div className="surface-card p-3">
        <div className="relative">
          <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--ink-400)] ${isRTL ? "right-3" : "left-3"}`} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className={`input-field h-10 ${isRTL ? "pr-9" : "pl-9"}`}
          />
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            title={t("noSalesRepsYet")}
            action={canCreate("sales") ? (
              <button onClick={openCreate} className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
                <Plus className="h-4 w-4" /> {t("newSalesRep")}
              </button>
            ) : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--brand-700)" }}>
                  <th className="px-4 py-3 text-start text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap">{t("code")}</th>
                  <th className="px-4 py-3 text-start text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap">{t("salesRep")}</th>
                  <th className="px-4 py-3 text-start text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap">{t("phone")}</th>
                  <th className="px-4 py-3 text-start text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap">{t("branch")}</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap">{t("status")}</th>
                  <th className="px-4 py-3 text-end text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((rep: any) => {
                  const branch = branches.find((b: any) => b._id === rep.branchId);
                  return (
                    <tr key={rep._id} className="border-t border-[color:var(--ink-100)]">
                      <td className="px-4 py-3 font-mono">{rep.code}</td>
                      <td className="px-4 py-3 font-semibold">{isRTL ? rep.nameAr : (rep.nameEn || rep.nameAr)}</td>
                      <td className="px-4 py-3">{rep.phone || "—"}</td>
                      <td className="px-4 py-3">{branch ? (isRTL ? branch.nameAr : (branch.nameEn || branch.nameAr)) : "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge-soft ${rep.isActive ? "" : "badge-muted"}`}>
                          {rep.isActive ? t("active") : t("inactive")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit("sales") && <button onClick={() => openEdit(rep)} className="h-8 w-8 rounded-lg hover:bg-[color:var(--brand-50)] inline-flex items-center justify-center">
                            <Edit2 className="h-4 w-4" />
                          </button>}
                          {canEdit("sales") && <button onClick={() => toggleRep({ id: rep._id, userId: currentUser?._id })} className="h-8 w-8 rounded-lg hover:bg-[color:var(--brand-50)] inline-flex items-center justify-center">
                            <Power className="h-4 w-4" />
                          </button>}
                          {canEdit("sales") && <button
                            onClick={async () => {
                              if (!window.confirm(`Delete sales rep "${rep.nameEn || rep.nameAr}"? This action cannot be undone.`)) return;
                              try {
                                await deleteSalesRep({ id: rep._id, userId: currentUser?._id });
                              } catch (e: any) {
                                toast.error(e);
                              }
                            }}
                            className="h-8 w-8 rounded-lg hover:bg-red-50 text-red-500 inline-flex items-center justify-center"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>}
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,19,22,0.55)] p-4" onClick={() => !saving && setShowForm(false)}>
          <div className="surface-card max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">{editRep ? t("edit") : t("newSalesRep")}</h3>
              <button onClick={() => setShowForm(false)} className="text-xl">×</button>
            </div>
            {error ? <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div> : null}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <div className="text-xs font-semibold mb-1.5">{t("salesRepCode")}</div>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!editRep} className="input-field" />
              </label>
              <label className="block">
                <div className="text-xs font-semibold mb-1.5">{t("nameAr")}</div>
                <input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} className="input-field" />
              </label>
              <label className="block">
                <div className="text-xs font-semibold mb-1.5">{t("nameEn")}</div>
                <input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} className="input-field" />
              </label>
              <label className="block">
                <div className="text-xs font-semibold mb-1.5">{t("phone")}</div>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
              </label>
              <label className="block">
                <div className="text-xs font-semibold mb-1.5">{t("branch")}</div>
                <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className="input-field">
                  <option value="">{t("all")}</option>
                  {branches.map((branch: any) => (
                    <option key={branch._id} value={branch._id}>{isRTL ? branch.nameAr : (branch.nameEn || branch.nameAr)}</option>
                  ))}
                </select>
              </label>
              <label className="block md:col-span-2">
                <div className="text-xs font-semibold mb-1.5">{t("notes")}</div>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="input-field w-full resize-none" />
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button onClick={() => setShowForm(false)} className="btn-ghost h-10 px-4 rounded-lg text-sm font-semibold">{t("cancel")}</button>
              <button onClick={onSave} disabled={saving} className="btn-primary h-10 px-5 rounded-lg text-sm font-semibold inline-flex items-center gap-2">
                <Phone className="h-4 w-4" /> {saving ? t("saving") : t("save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}