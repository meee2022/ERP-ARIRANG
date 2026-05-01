// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  ClipboardList, Plus, X, Search, ChevronDown,
  CheckCircle2, Clock, TrendingUp, XCircle, Edit2,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/store/toastStore";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
// @ts-ignore

const STATUS_CFG: Record<string, { color: string; bg: string; text: string; badge: string; label: string }> = {
  planned:     { color: "#3b82f6", bg: "#eff6ff", text: "text-blue-700",  badge: "bg-blue-100 text-blue-700 border-blue-200",   label: "" },
  in_progress: { color: "#f59e0b", bg: "#fffbeb", text: "text-amber-700", badge: "bg-amber-100 text-amber-700 border-amber-200", label: "" },
  completed:   { color: "#16a34a", bg: "#f0fdf4", text: "text-green-700", badge: "bg-green-100 text-green-700 border-green-200", label: "" },
  cancelled:   { color: "#ef4444", bg: "#fef2f2", text: "text-red-600",   badge: "bg-red-100 text-red-600 border-red-200",       label: "" },
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
      if (!branchId) {
        toast.warning(isRTL ? "لم يتم اختيار فرع" : "No branch selected");
        return;
      }
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
        createdBy: currentUser?._id as any || undefined,
      });
      setShowModal(false);
      toast.success(isRTL ? "تم إنشاء أمر الإنتاج بنجاح" : "Production order created successfully");
    } catch (e: any) {
      toast.error(e);
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
      toast.success(isRTL ? "تم تحديث الحالة بنجاح" : "Status updated successfully");
    } catch (e: any) {
      toast.error(e);
    }
  };

  const counts = {
    planned:     (orders ?? []).filter((o) => o.status === "planned").length,
    in_progress: (orders ?? []).filter((o) => o.status === "in_progress").length,
    completed:   (orders ?? []).filter((o) => o.status === "completed").length,
    cancelled:   (orders ?? []).filter((o) => o.status === "cancelled").length,
  };

  return (
    <div className="space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      <PageHeader
        title={isRTL ? "أوامر الإنتاج" : "Production Orders"}
        subtitle={isRTL ? "إنشاء ومتابعة أوامر الإنتاج" : "Create and track production orders"}
        icon={ClipboardList}
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary h-9 px-4 rounded-xl inline-flex items-center gap-2 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            {isRTL ? "أمر جديد" : "New Order"}
          </button>
        }
      />

      {/* Status KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["planned", "in_progress", "completed", "cancelled"] as const).map((s) => {
          const cfg = STATUS_CFG[s];
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatus(active ? "all" : s)}
              className="rounded-2xl p-4 bg-white border text-start transition-all shadow-[0_1px_4px_rgba(0,0,0,0.05)] hover:shadow-md"
              style={{
                borderColor: active ? cfg.color : "var(--ink-100)",
                boxShadow: active ? `0 0 0 2px ${cfg.color}30` : undefined,
              }}
            >
              <p className="text-[11px] font-semibold text-[color:var(--ink-400)] uppercase tracking-wider">{cfg.label}</p>
              <p className={`text-3xl font-bold mt-1 tabular-nums ${cfg.text}`}>{counts[s]}</p>
            </button>
          );
        })}
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--ink-400)] pointer-events-none ${isRTL ? "right-3" : "left-3"}`} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isRTL ? "بحث بالرقم أو الصنف..." : "Search by number or item..."}
            className={`input-field h-9 w-full rounded-lg text-sm ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"}`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatus(e.target.value)}
          className="input-field h-9 px-3 rounded-lg text-sm"
        >
          <option value="all">{isRTL ? "كل الحالات" : "All statuses"}</option>
          <option value="planned">{isRTL ? "مخطط" : "Planned"}</option>
          <option value="in_progress">{isRTL ? "قيد التنفيذ" : "In Progress"}</option>
          <option value="completed">{isRTL ? "مكتمل" : "Completed"}</option>
          <option value="cancelled">{isRTL ? "ملغي" : "Cancelled"}</option>
        </select>
      </div>

      {/* Orders table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={isRTL ? "لا توجد أوامر إنتاج بعد" : "No production orders yet"}
          message={isRTL ? "أنشئ أول أمر إنتاج" : "Create your first production order"}
          action={
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary h-9 px-4 rounded-xl inline-flex items-center gap-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" /> {isRTL ? "أمر جديد" : "New Order"}
            </button>
          }
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-[color:var(--ink-100)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: "#6b1523", color: "#fff", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                  {[
                    isRTL ? "رقم الأمر"    : "Order #",
                    isRTL ? "الوصفة"       : "Recipe",
                    isRTL ? "المنتج الناتج": "Output Item",
                    isRTL ? "الكمية"       : "Qty",
                    isRTL ? "التاريخ"      : "Date",
                    isRTL ? "التكلفة"      : "Cost",
                    isRTL ? "الحالة"       : "Status",
                    isRTL ? "إجراء"        : "Action",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold text-white/80 uppercase tracking-widest text-start whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--ink-50)]">
                {filtered.map((o) => {
                  const cfg = STATUS_CFG[o.status] ?? STATUS_CFG.planned;
                  const recipeName  = isRTL ? (o.recipe?.nameAr ?? "—")     : (o.recipe?.nameEn     || o.recipe?.nameAr     || "—");
                  const outputName  = isRTL ? (o.outputItem?.nameAr ?? "—") : (o.outputItem?.nameEn || o.outputItem?.nameAr || "—");
                  return (
                    <tr key={o._id} className="hover:bg-[color:var(--ink-50)]/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] font-bold text-[color:var(--brand-700)] bg-[color:var(--brand-50)] px-2 py-0.5 rounded">
                          {o.orderNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[color:var(--ink-600)] text-[13px]">{recipeName}</td>
                      <td className="px-4 py-3 font-semibold text-[color:var(--ink-900)] text-[13px]">{outputName}</td>
                      <td className="px-4 py-3 tabular-nums text-[color:var(--ink-700)]">
                        {o.actualQty != null ? (
                          <span>
                            <span className="font-bold text-green-700">{o.actualQty}</span>
                            <span className="text-[11px] text-[color:var(--ink-400)] ms-1">/ {o.plannedQty}</span>
                          </span>
                        ) : <span className="font-medium">{o.plannedQty}</span>}
                        {o.uom?.nameAr && <span className="ms-1 text-[11px] text-[color:var(--ink-400)]">{isRTL ? o.uom.nameAr : (o.uom.nameEn || o.uom.nameAr)}</span>}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--ink-500)] text-[12px] tabular-nums">{o.plannedDate}</td>
                      <td className="px-4 py-3 tabular-nums font-bold text-[color:var(--brand-700)]">
                        {formatCurrency(o.materialCost ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setStatusModal(o)}
                          className="h-7 px-2.5 rounded-md bg-[color:var(--brand-50)] hover:bg-[color:var(--brand-100)] text-[color:var(--brand-700)] text-xs font-semibold border border-[color:var(--brand-100)] inline-flex items-center gap-1 transition-colors"
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
          <div className="px-5 py-3 border-t border-[color:var(--ink-100)] flex items-center justify-between bg-[color:var(--ink-50)]/50">
            <span className="text-[12px] text-[color:var(--ink-400)]">
              {filtered.length} {isRTL ? "أمر" : filtered.length === 1 ? "order" : "orders"}
            </span>
            <span className="text-[12px] font-bold text-[color:var(--brand-700)]">
              {isRTL ? "الإجمالي: " : "Total: "}{formatCurrency(filtered.reduce((s, o) => s + (o.materialCost ?? 0), 0))}
            </span>
          </div>
        </div>
      )}

      {/* Create order modal */}
      {showModal && (
        <OrderFormModal
          recipes={recipes ?? []}
          warehouses={warehouses ?? []}
          companyId={companyId}
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
function OrderFormModal({ recipes, warehouses, companyId, onSave, onClose, isRTL, formatCurrency }: any) {
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

  // Fetch full recipe details with ingredient names when recipe selected
  const recipeDetails = useQuery(
    api.production.getRecipeWithDetails,
    form.recipeId ? { id: form.recipeId as any } : "skip"
  );

  // Fetch stock for selected warehouse
  const stockBalances = useQuery(
    api.inventory.listStockBalances,
    form.warehouseId && companyId
      ? { warehouseId: form.warehouseId as any, companyId: companyId as any }
      : "skip"
  );

  // Build itemId → qty map
  const stockMap = useMemo(() => {
    if (!stockBalances) return {} as Record<string, number>;
    return Object.fromEntries(
      (stockBalances as any[]).map((sb: any) => [sb.itemId, sb.quantity ?? 0])
    );
  }, [stockBalances]);

  const scale = selectedRecipe
    ? Number(form.plannedQty || 1) / (selectedRecipe.yieldQuantity || 1)
    : 1;

  const estimatedCost = selectedRecipe
    ? (selectedRecipe.costPerUnit ?? 0) * Number(form.plannedQty || 0)
    : 0;

  const lines: any[] = recipeDetails?.lines ?? [];

  const stockSummary = useMemo(() => {
    if (!form.warehouseId || lines.length === 0) return null;
    const shortage = lines.filter((line: any) => {
      const req = (line.grossQuantity ?? line.quantity) * scale;
      return (stockMap[line.itemId] ?? 0) < req;
    });
    return { total: lines.length, shortage: shortage.length };
  }, [lines, stockMap, scale, form.warehouseId]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!form.recipeId || !form.plannedDate) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[color:var(--ink-100)] flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--ink-100)] shrink-0">
          <div>
            <h2 className="font-bold text-[15px] text-[color:var(--ink-900)]">
              {isRTL ? "إنشاء أمر إنتاج" : "New Production Order"}
            </h2>
            <p className="text-[11px] text-[color:var(--ink-400)] mt-0.5">
              {isRTL ? "اختر وصفة وحدد الكمية المطلوبة" : "Select a recipe and specify the required quantity"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-[color:var(--ink-400)] hover:text-[color:var(--ink-700)] hover:bg-[color:var(--ink-50)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form id="prod-order-form" onSubmit={handleSubmit} className="space-y-5">

            {/* Row 1 */}
            <div className="grid grid-cols-2 gap-4">
              <Field label={isRTL ? "رقم الأمر" : "Order Number"} required>
                <input value={form.orderNumber} onChange={set("orderNumber")} className="input-field w-full" required />
              </Field>
              <Field label={isRTL ? "التاريخ المخطط" : "Planned Date"} required>
                <input type="date" value={form.plannedDate} onChange={set("plannedDate")} className="input-field w-full" required />
              </Field>
            </div>

            {/* Recipe */}
            <Field label={isRTL ? "الوصفة" : "Recipe"} required>
              <select value={form.recipeId} onChange={handleRecipeChange} className="input-field w-full" required>
                <option value="">— {isRTL ? "اختر وصفة" : "Select recipe"} —</option>
                {recipes.filter((r: any) => r.isActive).map((r: any) => (
                  <option key={r._id} value={r._id}>{r.nameAr} ({r.code})</option>
                ))}
              </select>
            </Field>

            {/* Recipe info card */}
            {selectedRecipe && (
              <div className="rounded-xl border border-[color:var(--brand-100)] bg-[color:var(--brand-50)] p-3.5 grid grid-cols-3 gap-3 text-[12px]">
                <div>
                  <div className="text-[color:var(--ink-400)] mb-0.5">{isRTL ? "المنتج الناتج" : "Output Item"}</div>
                  <div className="font-semibold text-[color:var(--ink-900)]">{selectedRecipe.outputItem?.nameAr ?? "—"}</div>
                </div>
                <div>
                  <div className="text-[color:var(--ink-400)] mb-0.5">{isRTL ? "تكلفة الوحدة" : "Cost / Unit"}</div>
                  <div className="font-bold text-[color:var(--brand-700)]">{formatCurrency(selectedRecipe.costPerUnit)}</div>
                </div>
                <div>
                  <div className="text-[color:var(--ink-400)] mb-0.5">{isRTL ? "التكلفة الإجمالية" : "Total Cost"}</div>
                  <div className="font-bold text-[color:var(--brand-700)]">{formatCurrency(estimatedCost)}</div>
                </div>
              </div>
            )}

            {/* Qty + Warehouse */}
            <div className="grid grid-cols-2 gap-4">
              <Field label={isRTL ? "الكمية المخططة" : "Planned Qty"} required>
                <input
                  type="number" min="0.001" step="0.001"
                  value={form.plannedQty} onChange={set("plannedQty")}
                  className="input-field w-full" required
                />
              </Field>
              <Field label={isRTL ? "المستودع" : "Warehouse"}>
                <select value={form.warehouseId} onChange={set("warehouseId")} className="input-field w-full">
                  <option value="">— {isRTL ? "اختر مستودعاً" : "Select warehouse"} —</option>
                  {warehouses.map((w: any) => (
                    <option key={w._id} value={w._id}>{isRTL ? w.nameAr : (w.nameEn || w.nameAr)}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Ingredients table */}
            {form.recipeId && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[11px] font-bold text-[color:var(--ink-500)] uppercase tracking-widest">
                    {isRTL ? "المكونات" : "Ingredients"}
                    {lines.length > 0 && <span className="ms-1.5 text-[color:var(--ink-400)] font-normal normal-case tracking-normal">({lines.length})</span>}
                  </h3>
                  {stockSummary && (
                    stockSummary.shortage === 0
                      ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ {isRTL ? "المخزون كافٍ" : "Stock sufficient"}</span>
                      : <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">⚠ {isRTL ? `${stockSummary.shortage} مادة غير كافية` : `${stockSummary.shortage} item(s) short`}</span>
                  )}
                </div>

                {lines.length === 0 ? (
                  <div className="rounded-xl border border-[color:var(--ink-100)] py-6 text-center text-[12px] text-[color:var(--ink-400)]">
                    {recipeDetails === undefined ? (isRTL ? "جاري التحميل..." : "Loading...") : (isRTL ? "لا توجد مكونات لهذه الوصفة" : "No ingredients found")}
                  </div>
                ) : (
                  <div className="rounded-xl border border-[color:var(--ink-100)] overflow-hidden">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="bg-[color:var(--ink-50)] border-b border-[color:var(--ink-100)]">
                          <th className="px-3 py-2 text-start font-semibold text-[color:var(--ink-500)]">{isRTL ? "المادة" : "Ingredient"}</th>
                          <th className="px-3 py-2 text-center font-semibold text-[color:var(--ink-500)]">{isRTL ? "الكمية المطلوبة" : "Required"}</th>
                          {form.warehouseId && (
                            <>
                              <th className="px-3 py-2 text-center font-semibold text-[color:var(--ink-500)]">{isRTL ? "المتوفر" : "In Stock"}</th>
                              <th className="px-3 py-2 text-center font-semibold text-[color:var(--ink-500)]">{isRTL ? "الحالة" : "Status"}</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[color:var(--ink-50)]">
                        {lines.map((line: any, idx: number) => {
                          const req = (line.grossQuantity ?? line.quantity) * scale;
                          const avail = form.warehouseId ? (stockMap[line.itemId] ?? 0) : null;
                          const ok = avail === null || avail >= req;
                          return (
                            <tr key={line._id ?? idx} className={!ok ? "bg-red-50/60" : "hover:bg-gray-50/50"}>
                              <td className="px-3 py-2.5 font-medium text-[color:var(--ink-900)]">
                                {line.item?.nameAr ?? line.item?.nameEn ?? "—"}
                              </td>
                              <td className="px-3 py-2.5 text-center tabular-nums text-[color:var(--ink-700)]">
                                {req.toFixed(3)}
                                <span className="ms-1 text-[color:var(--ink-400)]">{line.uom?.code ?? ""}</span>
                              </td>
                              {form.warehouseId && (
                                <>
                                  <td className={`px-3 py-2.5 text-center tabular-nums font-semibold ${ok ? "text-green-700" : "text-red-600"}`}>
                                    {(avail ?? 0).toFixed(3)}
                                    <span className="ms-1 text-[color:var(--ink-400)] font-normal">{line.uom?.code ?? ""}</span>
                                  </td>
                                  <td className="px-3 py-2.5 text-center text-[11px]">
                                    {ok
                                      ? <span className="text-green-600 font-bold text-base leading-none">✓</span>
                                      : <span className="font-semibold text-red-600">
                                          {isRTL
                                            ? `نقص ${(req - (avail ?? 0)).toFixed(2)}`
                                            : `−${(req - (avail ?? 0)).toFixed(2)}`}
                                        </span>
                                    }
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {!form.warehouseId && lines.length > 0 && (
                  <p className="text-[11px] text-[color:var(--ink-400)] mt-1.5 text-center">
                    {isRTL ? "اختر مستودعاً لعرض توفر المخزون لكل مادة" : "Select a warehouse to check stock availability"}
                  </p>
                )}
              </div>
            )}

            <Field label={isRTL ? "ملاحظات" : "Notes"}>
              <textarea value={form.notes} onChange={set("notes")} rows={2}
                className="input-field w-full resize-none"
                placeholder={isRTL ? "ملاحظات اختيارية..." : "Optional notes..."} />
            </Field>

          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[color:var(--ink-100)] shrink-0">
          <button type="button" onClick={onClose}
            className="btn-ghost h-10 px-5 rounded-lg text-sm font-semibold">
            {isRTL ? "إلغاء" : "Cancel"}
          </button>
          <button type="submit" form="prod-order-form" disabled={saving}
            className="btn-primary h-10 px-5 rounded-lg text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60">
            {saving ? (isRTL ? "جاري الحفظ..." : "Saving...") : (isRTL ? "إنشاء الأمر" : "Create Order")}
          </button>
        </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-[color:var(--ink-100)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--ink-100)]">
          <div>
            <h2 className="font-bold text-[14px] text-[color:var(--ink-900)]">
              {isRTL ? "تحديث حالة الأمر" : "Update Order Status"}
            </h2>
            <p className="text-[11px] font-mono text-[color:var(--brand-700)] mt-0.5">{order.orderNumber}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-[color:var(--ink-400)] hover:bg-[color:var(--ink-50)] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field label={isRTL ? "الحالة" : "Status"} required>
            <select value={form.status} onChange={set("status")} className="input-field w-full" required>
              {statuses.map((s) => (
                <option key={s} value={s}>{STATUS_CFG[s]?.label ?? s}</option>
              ))}
            </select>
          </Field>

          {(form.status === "completed" || form.status === "in_progress") && (
            <>
              <Field label={isRTL ? "الكمية الفعلية" : "Actual Qty"}>
                <input type="number" min="0" step="0.001" value={form.actualQty} onChange={set("actualQty")} className="input-field w-full" />
              </Field>
              {form.status === "completed" && (
                <Field label={isRTL ? "تاريخ الاكتمال" : "Completion Date"}>
                  <input type="date" value={form.completedDate} onChange={set("completedDate")} className="input-field w-full" />
                </Field>
              )}
            </>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 h-10 rounded-lg text-sm font-semibold">
              {isRTL ? "إلغاء" : "Cancel"}
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 h-10 rounded-lg text-sm font-semibold disabled:opacity-60">
              {saving ? (isRTL ? "جاري الحفظ..." : "Saving...") : (isRTL ? "حفظ" : "Save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: any) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-[color:var(--ink-700)]">
        {label}{required && <span className="text-[color:var(--brand-600)] ms-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
