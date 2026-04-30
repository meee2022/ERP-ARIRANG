// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Truck, Plus, Search, Edit2, Power, RefreshCw, Trash2 } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/data-display";

export default function VehiclesPage() {
  const { t, isRTL } = useI18n();
  const { currentUser } = useAuth();
  const { canView, canCreate, canEdit } = usePermissions();
  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;
  const branches = useQuery(api.branches.getAll, companyId ? { companyId } : "skip") ?? [];
  const reps = useQuery(api.salesMasters.listSalesReps, companyId ? { companyId } : "skip") ?? [];
  const vehicles = useQuery(api.salesMasters.listVehicles, companyId ? { companyId } : "skip") ?? [];
  const createVehicle = useMutation(api.salesMasters.createVehicle);
  const updateVehicle = useMutation(api.salesMasters.updateVehicle);
  const toggleVehicle = useMutation(api.salesMasters.toggleVehicleActive);
  const deleteVehicle = useMutation(api.salesMasters.deleteVehicle);
  const seedVehicles = useMutation(api.seedStaff.seedVehicles);
  const [seeding, setSeeding] = useState(false);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editVehicle, setEditVehicle] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    plateNumber: "",
    descriptionAr: "",
    descriptionEn: "",
    assignedSalesRepId: "",
    branchId: "",
    notes: "",
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((vehicle: any) =>
      [vehicle.code, vehicle.plateNumber, vehicle.descriptionAr, vehicle.descriptionEn].filter(Boolean).some((v: string) => String(v).toLowerCase().includes(q))
    );
  }, [vehicles, search]);

  function resetForm() {
    setForm({
      code: "",
      plateNumber: "",
      descriptionAr: "",
      descriptionEn: "",
      assignedSalesRepId: "",
      branchId: "",
      notes: "",
    });
    setEditVehicle(null);
    setError(null);
  }

  function openCreate() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(vehicle: any) {
    setEditVehicle(vehicle);
    setForm({
      code: vehicle.code ?? "",
      plateNumber: vehicle.plateNumber ?? "",
      descriptionAr: vehicle.descriptionAr ?? "",
      descriptionEn: vehicle.descriptionEn ?? "",
      assignedSalesRepId: vehicle.assignedSalesRepId ?? "",
      branchId: vehicle.branchId ?? "",
      notes: vehicle.notes ?? "",
    });
    setError(null);
    setShowForm(true);
  }

  async function onSave() {
    if (!companyId) return;
    if (!form.code.trim()) {
      setError(t("errRequiredFields"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editVehicle) {
        await updateVehicle({
          id: editVehicle._id,
          branchId: form.branchId ? (form.branchId as any) : undefined,
          plateNumber: form.plateNumber || undefined,
          descriptionAr: form.descriptionAr || undefined,
          descriptionEn: form.descriptionEn || undefined,
          assignedSalesRepId: form.assignedSalesRepId ? (form.assignedSalesRepId as any) : undefined,
          notes: form.notes || undefined,
          userId: currentUser?._id,
        });
      } else {
        await createVehicle({
          companyId: companyId as any,
          code: form.code,
          branchId: form.branchId ? (form.branchId as any) : undefined,
          plateNumber: form.plateNumber || undefined,
          descriptionAr: form.descriptionAr || undefined,
          descriptionEn: form.descriptionEn || undefined,
          assignedSalesRepId: form.assignedSalesRepId ? (form.assignedSalesRepId as any) : undefined,
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

  async function handleDelete(vehicle: any) {
    const label = isRTL ? vehicle.descriptionAr : (vehicle.descriptionEn || vehicle.descriptionAr || vehicle.code);
    if (!window.confirm(isRTL ? `هل تريد حذف السيارة "${label}" نهائياً؟` : `Delete vehicle "${label}" permanently?`)) return;
    try {
      await deleteVehicle({ id: vehicle._id, userId: currentUser?._id });
    } catch (e: any) {
      alert(String((e as any).message || e));
    }
  }

  async function handleSeedVehicles() {
    if (!companyId) return;
    if (!window.confirm(isRTL ? "سيتم استيراد بيانات السيارات والمناديب. هل تريد المتابعة؟" : "Import vehicle & salesman data. Continue?")) return;
    setSeeding(true);
    try {
      const result = await seedVehicles({});
      alert(`Done: ${result.total} vehicles processed.\n${result.results.join("\n")}`);
    } catch (e: any) {
      alert(String(e.message || e));
    } finally {
      setSeeding(false);
    }
  }

  if (vehicles === undefined) return <LoadingState label={t("loading")} />;

  if (!canView("sales")) {
    return <EmptyState title={t("permissionDenied")} />;
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      <PageHeader
        icon={Truck}
        title={t("vehiclesTitle")}
        badge={<span className="badge-soft">{filtered.length}</span>}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSeedVehicles}
              disabled={seeding || !companyId}
              className="h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${seeding ? "animate-spin" : ""}`} />
              {seeding ? (isRTL ? "جاري الاستيراد..." : "Importing...") : (isRTL ? "استيراد سيارات الروتات" : "Import Route Vehicles")}
            </button>
            {canCreate("sales") && (
              <button onClick={openCreate} className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
                <Plus className="h-4 w-4" /> {t("newVehicle")}
              </button>
            )}
          </div>
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
            title={t("noVehiclesYet")}
            action={canCreate("sales") ? (
              <button onClick={openCreate} className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
                <Plus className="h-4 w-4" /> {t("newVehicle")}
              </button>
            ) : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--brand-700)" }}>
                  <th className="px-4 py-3 text-start text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap">{t("vehicleCode")}</th>
                  <th className="px-4 py-3 text-start text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap">{t("vehiclePlate")}</th>
                  <th className="px-4 py-3 text-start text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap">{t("vehicleDescription")}</th>
                  <th className="px-4 py-3 text-start text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap">{t("assignedSalesRep")}</th>
                  <th className="px-4 py-3 text-start text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap">{t("branch")}</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap">{t("status")}</th>
                  <th className="px-4 py-3 text-end text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((vehicle: any) => {
                  const branch = branches.find((b: any) => b._id === vehicle.branchId);
                  return (
                    <tr key={vehicle._id} className="border-t border-[color:var(--ink-100)]">
                      <td className="px-4 py-3 font-mono">{vehicle.code}</td>
                      <td className="px-4 py-3">{vehicle.plateNumber || "—"}</td>
                      <td className="px-4 py-3 font-semibold">{(isRTL ? vehicle.descriptionAr : (vehicle.descriptionEn || vehicle.descriptionAr)) || "—"}</td>
                      <td className="px-4 py-3">{isRTL ? (vehicle.salesRepNameAr || "—") : (vehicle.salesRepNameEn || vehicle.salesRepNameAr || "—")}</td>
                      <td className="px-4 py-3">{branch ? (isRTL ? branch.nameAr : (branch.nameEn || branch.nameAr)) : "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge-soft ${vehicle.isActive ? "" : "badge-muted"}`}>
                          {vehicle.isActive ? t("active") : t("inactive")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit("sales") && <button onClick={() => openEdit(vehicle)} className="h-8 w-8 rounded-lg hover:bg-[color:var(--brand-50)] inline-flex items-center justify-center">
                            <Edit2 className="h-4 w-4" />
                          </button>}
                          {canEdit("sales") && <button onClick={() => toggleVehicle({ id: vehicle._id, userId: currentUser?._id })} className="h-8 w-8 rounded-lg hover:bg-[color:var(--brand-50)] inline-flex items-center justify-center">
                            <Power className="h-4 w-4" />
                          </button>}
                          {canEdit("sales") && <button onClick={() => handleDelete(vehicle)} className="h-8 w-8 rounded-lg hover:bg-red-50 text-red-500 inline-flex items-center justify-center">
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
              <h3 className="text-lg font-bold">{editVehicle ? t("edit") : t("newVehicle")}</h3>
              <button onClick={() => setShowForm(false)} className="text-xl">×</button>
            </div>
            {error ? <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div> : null}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <div className="text-xs font-semibold mb-1.5">{t("vehicleCode")}</div>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!editVehicle} className="input-field" />
              </label>
              <label className="block">
                <div className="text-xs font-semibold mb-1.5">{t("vehiclePlate")}</div>
                <input value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} className="input-field" />
              </label>
              <label className="block">
                <div className="text-xs font-semibold mb-1.5">{t("vehicleDescription")}</div>
                <input value={form.descriptionAr} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} className="input-field" />
              </label>
              <label className="block">
                <div className="text-xs font-semibold mb-1.5">{t("nameEn")}</div>
                <input value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} className="input-field" />
              </label>
              <label className="block">
                <div className="text-xs font-semibold mb-1.5">{t("assignedSalesRep")}</div>
                <select value={form.assignedSalesRepId} onChange={(e) => setForm({ ...form, assignedSalesRepId: e.target.value })} className="input-field">
                  <option value="">{t("all")}</option>
                  {reps.filter((rep: any) => rep.isActive).map((rep: any) => (
                    <option key={rep._id} value={rep._id}>{isRTL ? rep.nameAr : (rep.nameEn || rep.nameAr)}</option>
                  ))}
                </select>
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
              <button onClick={onSave} disabled={saving} className="btn-primary h-10 px-5 rounded-lg text-sm font-semibold">
                {saving ? t("saving") : t("save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}