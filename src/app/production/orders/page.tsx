// @ts-nocheck
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  ClipboardList, Plus, X, Search, ChevronDown,
  CheckCircle2, Clock, TrendingUp, XCircle, Edit2,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
// @ts-ignore

const ACCENT = "#22d3ee";

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  planned:     { color: "#60a5fa", bg: "#60a5fa20", label: "" },
  in_progress: { color: "#fbbf24", bg: "#fbbf2420", label: "" },
  completed:   { color: "#34d399", bg: "#34d39920", label: "" },
  cancelled:   { color: "#f87171", bg: "#f8717120", label: "" },
};

export default function ProductionOrdersPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const selectedBranchId = useAppStore((s) => s.selectedBranch);
  const { currentUser } = useAuth();

  const companies    = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId    = companies[0]?._id;

  const [search, setSearch]           = useState("");
  const [statusFilter, setStatus]     = useState("all");
  const [showModal, setShowModal]     = useState(false);
  const [editOrder, setEditOrder]     = useState<any>(null);
  const [statusModal, setStatusModal] = useState<any>(null);

  const orders = useQuery(
    api.production.listProductionOrders,
    companyId ? { companyId } : "skip"
  );
  const recipes = useQuery(
    api.production.listRecipesWithStats,
    companyId ? { companyId } : "skip"
  );
  const warehouses = useQuery(
    api.items.getAllWarehouses,
    companyId ? { companyId } : "skip"
  );
  const defaultBranch = useQuery(
    api.branches.getDefaultBranch,
    companyId ? { companyId } : "skip"
  );

  const createOrder  = useMutation(api.production.createProductionOrder);
  const updateStatus = useMutation(api.production.updateOrderStatus);

  if (!companyId || orders === undefined) return <LoadingState />;

  // Populate status labels from t()
  STATUS_CFG.planned.label     = t("statusPlanned");
  STATUS_CFG.in_progress.label = t("statusInProgress");
  STATUS_CFG.completed.label   = t("statusCompleted");
  STATUS_CFG.cancelled.label   = t("statusCancelled");

  const filtered = (orders ?? []).filter((o) => {
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const matchSearch = !search ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (o.outputItem?.nameAr ?? "").includes(search) ||
      (o.recipe?.nameAr ?? "").includes(search);
    return matchStatus && matchSearch;
  });

  const handleCreate = async (data: any) => {
    try {
      const effectiveBranchId = selectedBranchId !== "all" ? selectedBranchId : defaultBranch?._id;
      const branchId = effectiveBranchId;
      if (!branchId) { alert(isRTL ? "لم يتم اختيار فرع" : "No branch selected"); return; }
      await createOrder({
        companyId,
        branchId,
        orderNumber: data.orderNumber,
        recipeId: data.recipeId as any,
        outputItemId: data.outputItemId as any,
        plannedQty: Number(data.plannedQty),
        yieldUomId: data.yieldUomId as any,
        plannedDate: data.plannedDate,
        warehouseId: data.warehouseId as any || undefined,
        notes: data.notes || undefined,
        createdBy: currentUser?._id as any,
      });
      setShowModal(false);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleStatusUpdate = async (data: any) => {
    try {
      await updateStatus({
        id: statusModal._id,
        status: data.status,
        actualQty: data.actualQty ? Number(data.actualQty) : undefined,
        completedDate: data.completedDate || undefined,
      });
      setStatusModal(null);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const counts = {
    planned:     (orders ?? []).filter((o) => o.status === "planned").length,
    in_progress: (orders ?? []).filter((o) => o.status === "in_progress").length,
    completed:   (orders ?? []).filter((o) => o.status === "completed").length,
    cancelled:   (orders ?? []).filter((o) => o.status === "cancelled").length,
  };

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title={t("productionOrdersTitle")}
        subtitle={t("productionOrdersSubtitle")}
        icon={ClipboardList}
        iconColor={ACCENT}
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all hover:opacity-90"
            style={{ background: ACCENT, color: "#0f172a" }}
          >
            <Plus className="h-4 w-4" />
            {t("newOrder")}
          </button>
        }
      />

      {/* Status KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["all", "planned", "in_progress", "completed", "cancelled"] as const).slice(1).map((s) => {
          const cfg = STATUS_CFG[s];
          return (
            <button
              key={s}
              onClick={() => setStatus(statusFilter === s ? "all" : s)}
              className="rounded-xl p-3 border transition-all text-start"
              style={{
                background: "var(--card)",
                borderColor: statusFilter === s ? cfg.color : "rgba(255,255,255,0.08)",
                boxShadow: statusFilter === s ? `0 0 0 1px ${cfg.color}40` : "none",
              }}
            >
              <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{cfg.label}</p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: cfg.color }}>{counts[s]}</p>
            </button>
          );
        })}
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
            style={{ [isRTL ? "right" : "left"]: "10px", color: "var(--muted-foreground)" }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isRTL ? "بحث بالرقم أو الصنف..." : "Search by number or item..."}
            className="w-full rounded-lg py-2 text-[12.5px] bg-[var(--card)] border border-white/10 focus:outline-none focus:border-[#22d3ee]/50"
            style={{
              [isRTL ? "paddingRight" : "paddingLeft"]: "34px",
              [isRTL ? "paddingLeft" : "paddingRight"]: "10px",
              color: "var(--foreground)",
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg px-3 py-2 text-[12.5px] bg-[var(--card)] border border-white/10 focus:outline-none"
          style={{ color: "var(--foreground)" }}
        >
          <option value="all">{t("allStatuses")}</option>
          <option value="planned">{t("statusPlanned")}</option>
          <option value="in_progress">{t("statusInProgress")}</option>
          <option value="completed">{t("statusCompleted")}</option>
          <option value="cancelled">{t("statusCancelled")}</option>
        </select>
      </div>

      {/* Orders table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
        iconColor={ACCENT}
          title={t("noProductionOrdersYet")}
          message={t("addFirstOrder")}
          action={
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold"
              style={{ background: ACCENT, color: "#0f172a" }}
            >
              <Plus className="h-4 w-4" /> {t("newOrder")}
            </button>
          }
        />
      ) : (
        <div className="rounded-xl border border-white/8 overflow-hidden" style={{ background: "var(--card)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                  {[t("orderNumber"), t("recipe"), t("outputItem"), t("plannedQty"), t("plannedDate"), t("materialCost"), t("orderStatus"), t("actions")].map((h) => (
                    <th key={h} className={`px-4 py-3 font-semibold text-${isRTL ? "right" : "left"}`} style={{ color: "var(--muted-foreground)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const cfg = STATUS_CFG[o.status] ?? STATUS_CFG.planned;
                  return (
                    <tr
                      key={o._id}
                      className="hover:bg-white/4 transition-colors"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    >
                      <td className="px-4 py-3 font-mono text-[11px]" style={{ color: ACCENT }}>{o.orderNumber}</td>
                      <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>{o.recipe?.nameAr ?? "—"}</td>
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--foreground)" }}>{o.outputItem?.nameAr ?? "—"}</td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: "var(--foreground)" }}>
                        {o.actualQty != null ? (
                          <span>
                            <span className="font-semibold">{o.actualQty}</span>
                            <span className="text-[10px] ms-1" style={{ color: "var(--muted-foreground)" }}>/ {o.plannedQty}</span>
                          </span>
                        ) : o.plannedQty}
                        <span className="ms-1 text-[10px]" style={{ color: "var(--muted-foreground)" }}>{o.uom?.nameAr ?? ""}</span>
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>{o.plannedDate}</td>
                      <td className="px-4 py-3 tabular-nums font-semibold" style={{ color: ACCENT }}>
                        {formatCurrency(o.materialCost ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold" style={{ color: cfg.color, background: cfg.bg }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setStatusModal(o)}
                          className="flex items-center gap-1 text-[11px] font-medium hover:underline"
                          style={{ color: ACCENT }}
                        >
                          <Edit2 className="h-3 w-3" />
                          {isRTL ? "تحديث" : "Update"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-white/6 flex items-center justify-between">
            <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
              {filtered.length} {t("ordersCount")}
            </span>
            <span className="text-[11px] font-semibold" style={{ color: ACCENT }}>
              {formatCurrency((filtered.reduce((s, o) => s + (o.materialCost ?? 0), 0)))} {isRTL ? "إجمالي" : "total cost"}
            </span>
          </div>
        </div>
      )}

      {/* Create order modal */}
      {showModal && (
        <OrderFormModal
          recipes={recipes ?? []}
          warehouses={warehouses ?? []}
          onSave={handleCreate}
          onClose={() => setShowModal(false)}
          t={t}
          isRTL={isRTL}
          formatCurrency={formatCurrency}
        />
      )}

      {/* Status update modal */}
      {statusModal && (
        <StatusUpdateModal
          order={statusModal}
          onSave={handleStatusUpdate}
          onClose={() => setStatusModal(null)}
          t={t}
          isRTL={isRTL}
        />
      )}
    </div>
  );
}

// ── Order Form Modal ──────────────────────────────────────────────────────────
function OrderFormModal({ recipes, warehouses, onSave, onClose, t, isRTL, formatCurrency }: any) {
  const [form, setForm] = useState({
    orderNumber: `PO-${Date.now().toString().slice(-6)}`,
    recipeId: "",
    outputItemId: "",
    yieldUomId: "",
    plannedQty: "1",
    plannedDate: new Date().toISOString().split("T")[0],
    warehouseId: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const selectedRecipe = recipes.find((r: any) => r._id === form.recipeId);

  const handleRecipeChange = (e: any) => {
    const r = recipes.find((rc: any) => rc._id === e.target.value);
    setForm((f) => ({
      ...f,
      recipeId: e.target.value,
      outputItemId: r?.outputItemId ?? "",
      yieldUomId: r?.yieldUomId ?? "",
    }));
  };

  const estimatedCost = selectedRecipe
    ? (selectedRecipe.costPerUnit ?? 0) * Number(form.plannedQty || 0)
    : 0;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!form.recipeId || !form.plannedDate) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-lg rounded-2xl p-6 shadow-2xl"
        style={{ background: "var(--card)", border: "1px solid rgba(255,255,255,0.12)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-[15px]" style={{ color: "var(--foreground)" }}>
            {t("addProductionOrder")}
          </h2>
          <button onClick={onClose}><X className="h-4 w-4" style={{ color: "var(--muted-foreground)" }} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("orderNumber")} required>
              <input value={form.orderNumber} onChange={set("orderNumber")} className="input-field" required />
            </Field>
            <Field label={t("plannedDate")} required>
              <input type="date" value={form.plannedDate} onChange={set("plannedDate")} className="input-field" required />
            </Field>
          </div>

          <Field label={t("selectRecipe")} required>
            <select value={form.recipeId} onChange={handleRecipeChange} className="input-field" required>
              <option value="">— {t("recipe")} —</option>
              {recipes.filter((r: any) => r.isActive).map((r: any) => (
                <option key={r._id} value={r._id}>{r.nameAr} ({r.code})</option>
              ))}
            </select>
          </Field>

          {selectedRecipe && (
            <div className="rounded-lg p-3 text-[12px] space-y-1" style={{ background: `${ACCENT}10`, border: `1px solid ${ACCENT}25` }}>
              <div className="flex justify-between">
                <span style={{ color: "var(--muted-foreground)" }}>{t("outputItem")}</span>
                <span style={{ color: "var(--foreground)" }}>{selectedRecipe.outputItem?.nameAr}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--muted-foreground)" }}>{t("costPerUnit")}</span>
                <span style={{ color: ACCENT }}>{formatCurrency(selectedRecipe.costPerUnit)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span style={{ color: "var(--muted-foreground)" }}>{t("materialCost")}</span>
                <span style={{ color: ACCENT }}>{formatCurrency(estimatedCost)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("plannedQty")} required>
              <input
                type="number" min="0.001" step="0.001"
                value={form.plannedQty} onChange={set("plannedQty")}
                className="input-field" required
              />
            </Field>
            <Field label={t("selectWarehouse")}>
              <select value={form.warehouseId} onChange={set("warehouseId")} className="input-field">
                <option value="">— {t("warehouse")} —</option>
                {warehouses.map((w: any) => (
                  <option key={w._id} value={w._id}>{w.nameAr}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label={t("notes")}>
            <textarea value={form.notes} onChange={set("notes")} rows={2} className="input-field resize-none" />
          </Field>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg text-[13px] border border-white/10 hover:bg-white/5"
              style={{ color: "var(--muted-foreground)" }}>
              {t("cancel")}
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 rounded-lg text-[13px] font-semibold hover:opacity-90"
              style={{ background: ACCENT, color: "#0f172a" }}>
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Status Update Modal ───────────────────────────────────────────────────────
function StatusUpdateModal({ order, onSave, onClose, t, isRTL }: any) {
  const [form, setForm] = useState({
    status: order.status,
    actualQty: order.actualQty ?? "",
    completedDate: order.completedDate ?? new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const statuses = ["planned", "in_progress", "completed", "cancelled"] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: "var(--card)", border: "1px solid rgba(255,255,255,0.12)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-[14px]" style={{ color: "var(--foreground)" }}>
              {isRTL ? "تحديث حالة الأمر" : "Update Order Status"}
            </h2>
            <p className="text-[11px] font-mono mt-0.5" style={{ color: ACCENT }}>{order.orderNumber}</p>
          </div>
          <button onClick={onClose}><X className="h-4 w-4" style={{ color: "var(--muted-foreground)" }} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Field label={t("orderStatus")} required>
            <select value={form.status} onChange={set("status")} className="input-field" required>
              {statuses.map((s) => (
                <option key={s} value={s}>{STATUS_CFG[s]?.label ?? s}</option>
              ))}
            </select>
          </Field>

          {(form.status === "completed" || form.status === "in_progress") && (
            <>
              <Field label={t("actualQty")}>
                <input type="number" min="0" step="0.001" value={form.actualQty} onChange={set("actualQty")} className="input-field" />
              </Field>
              {form.status === "completed" && (
                <Field label={t("completedDate")}>
                  <input type="date" value={form.completedDate} onChange={set("completedDate")} className="input-field" />
                </Field>
              )}
            </>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg text-[13px] border border-white/10 hover:bg-white/5"
              style={{ color: "var(--muted-foreground)" }}>
              {t("cancel")}
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 rounded-lg text-[13px] font-semibold hover:opacity-90"
              style={{ background: ACCENT, color: "#0f172a" }}>
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: any) {
  return (
    <div className="space-y-1">
      <label className="block text-[11.5px] font-medium" style={{ color: "var(--muted-foreground)" }}>
        {label}{required && <span className="text-red-400 ms-0.5">*</span>}      </label>
      {children}
    </div>
  );
}
