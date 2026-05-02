// @ts-nocheck
"use client";
import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "@/store/toastStore";
import { useAuth } from "@/hooks/useAuth";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  ChevronDown, ChevronUp, CalendarDays, Users, Package, Layers,
  CheckCircle2, FileCheck, Trash2, Plus, X, Save, Edit3, ClipboardList,
  AlertCircle, Lock, Sparkles, ListChecks,
} from "lucide-react";

function tomorrowISO() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KPI({ label, value, color, bg, border, Icon, hint }: any) {
  return (
    <div className="rounded-2xl border p-3.5" style={{ background: bg, borderColor: border }}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && (
          <span className="h-6 w-6 rounded-md flex items-center justify-center" style={{ background: color + "20" }}>
            <Icon className="h-3.5 w-3.5" style={{ color }} />
          </span>
        )}
        <p className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color }}>{label}</p>
      </div>
      <p className="text-[20px] font-black tabular-nums leading-tight" style={{ color }}>{value}</p>
      {hint && <p className="text-[10.5px] mt-0.5" style={{ color: color + "aa" }}>{hint}</p>}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function DailyPlanPage() {
  const { t, isRTL } = useI18n();
  const { user } = useAuth();
  const selectedBranch = useAppStore((s) => s.selectedBranch);

  const companies = useQuery(api.seed.getCompanies, {});
  const company   = companies?.[0];
  const branches  = useQuery(api.branches.getAll, company ? { companyId: company._id } : "skip");
  const branchId  = useMemo(() => {
    if (selectedBranch !== "all") return selectedBranch;
    return branches?.[0]?._id;
  }, [selectedBranch, branches]);

  const [productionDate, setProductionDate] = useState<string>(tomorrowISO());
  const [expandedItem, setExpandedItem]     = useState<string | null>(null);
  const [planNotes, setPlanNotes]           = useState("");
  const [convertToOrders, setConvertToOrders] = useState(true);

  // Local edits to approved quantities (item-id → qty)
  const [overrides, setOverrides]           = useState<Map<string, number>>(new Map());
  // Items the manager rejected entirely (item-id → true)
  const [rejected, setRejected]             = useState<Set<string>>(new Set());
  // Manually added items (item-id → { qty, recipeId })
  const [extras, setExtras]                 = useState<Map<string, { qty: number; recipeId?: string }>>(new Map());
  const [newExtraItem, setNewExtraItem]     = useState("");
  const [newExtraQty, setNewExtraQty]       = useState("");
  const [newExtraRecipe, setNewExtraRecipe] = useState("");

  // ── Data ────────────────────────────────────────────────────────────────────
  const view = useQuery(api.productionRequests.getAggregatedView,
    branchId ? { branchId: branchId as any, productionDate } : "skip");

  const recipes = useQuery(api.production.listRecipes,
    company ? { companyId: company._id } : "skip");
  const allItems = useQuery(api.items.getAllItems,
    company ? { companyId: company._id } : "skip");
  const items = (allItems ?? []).filter((i: any) => i.isActive !== false);

  // Build a map of itemId → recipeId (for auto-linking recipes)
  const recipeByOutputItem = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of recipes ?? []) {
      if ((r as any).outputItemId) m.set((r as any).outputItemId as string, r._id as string);
    }
    return m;
  }, [recipes]);

  const approvePlan = useMutation(api.productionRequests.approvePlan);

  // ── Computed table rows (with overrides + extras + rejected) ────────────────
  const tableRows = useMemo(() => {
    const rows: any[] = (view?.rows ?? []).map((r: any) => {
      const isReject = rejected.has(r.itemId);
      const approved = isReject
        ? 0
        : (overrides.has(r.itemId) ? overrides.get(r.itemId)! : r.totalRequestedQty);
      return {
        ...r,
        approvedQty: approved,
        rejected:    isReject,
        recipeId:    recipeByOutputItem.get(r.itemId) ?? null,
        isExtra:     false,
      };
    });

    // Append extras
    for (const [itemId, info] of extras.entries()) {
      const item: any = items.find((i: any) => i._id === itemId);
      if (!item) continue;
      rows.push({
        itemId,
        itemCode:   item.code,
        itemNameAr: item.nameAr,
        itemNameEn: item.nameEn ?? item.nameAr,
        totalRequestedQty: 0,
        approvedQty: info.qty,
        breakdown:   [],
        rejected:    false,
        recipeId:    info.recipeId ?? recipeByOutputItem.get(itemId) ?? null,
        isExtra:     true,
        uomId:       item.baseUomId ?? null,
      });
    }

    return rows;
  }, [view, overrides, rejected, extras, items, recipeByOutputItem]);

  const totalApproved = tableRows.reduce((s, r) => s + (r.rejected ? 0 : r.approvedQty), 0);
  const activeRowCount = tableRows.filter((r) => !r.rejected && r.approvedQty > 0).length;

  // ── Handlers ────────────────────────────────────────────────────────────────
  function setOverride(itemId: string, qty: number) {
    const next = new Map(overrides);
    if (isNaN(qty) || qty < 0) qty = 0;
    next.set(itemId, qty);
    setOverrides(next);
    if (qty > 0 && rejected.has(itemId)) {
      const nr = new Set(rejected); nr.delete(itemId); setRejected(nr);
    }
  }

  function toggleReject(itemId: string) {
    const nr = new Set(rejected);
    if (nr.has(itemId)) nr.delete(itemId);
    else nr.add(itemId);
    setRejected(nr);
  }

  function resetOverride(itemId: string) {
    const next = new Map(overrides); next.delete(itemId); setOverrides(next);
    const nr = new Set(rejected); nr.delete(itemId); setRejected(nr);
  }

  function addExtra() {
    if (!newExtraItem || !newExtraQty || Number(newExtraQty) <= 0) {
      toast.error(isRTL ? "اختر صنف وكمية صحيحة" : "Pick item and valid qty");
      return;
    }
    const next = new Map(extras);
    next.set(newExtraItem, {
      qty: Number(newExtraQty),
      recipeId: newExtraRecipe || undefined,
    });
    setExtras(next);
    setNewExtraItem(""); setNewExtraQty(""); setNewExtraRecipe("");
  }

  function removeExtra(itemId: string) {
    const next = new Map(extras); next.delete(itemId); setExtras(next);
  }

  async function handleApprove() {
    if (!company || !branchId) return;
    const linesToSave = tableRows
      .filter((r) => !r.rejected && r.approvedQty > 0)
      .map((r) => ({
        itemId:            r.itemId,
        totalRequestedQty: r.totalRequestedQty,
        approvedQty:       r.approvedQty,
        uomId:             r.uomId ?? undefined,
        recipeId:          r.recipeId ?? undefined,
        sourceRequestIds:  (r.breakdown ?? []).map((b: any) => b.requestId),
        notes:             undefined,
      }));

    if (linesToSave.length === 0) {
      toast.error(isRTL ? "لا توجد أصناف معتمدة" : "No approved items");
      return;
    }

    const message = convertToOrders
      ? (isRTL
          ? `سيتم إنشاء خطة + توليد أوامر إنتاج لـ ${linesToSave.length} صنف. متابعة؟`
          : `Will create plan + generate production orders for ${linesToSave.length} items. Continue?`)
      : (isRTL
          ? `سيتم اعتماد الخطة بـ ${linesToSave.length} صنف. متابعة؟`
          : `Will approve the plan with ${linesToSave.length} items. Continue?`);
    if (!confirm(message)) return;

    try {
      const res = await approvePlan({
        companyId:      company._id as any,
        branchId:       branchId as any,
        productionDate,
        notes:          planNotes || undefined,
        approvedBy:     user?._id as any,
        convertToOrders,
        lines:          linesToSave as any,
      });
      toast.success(isRTL
        ? `تم الاعتماد ${convertToOrders ? "وتوليد أوامر الإنتاج" : ""} (${res.planNumber})`
        : `Approved ${convertToOrders ? "and orders generated" : ""} (${res.planNumber})`);
      // Reset state
      setOverrides(new Map());
      setRejected(new Set());
      setExtras(new Map());
      setPlanNotes("");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const itemNameOf = (it: any) => isRTL ? it.nameAr : (it.nameEn || it.nameAr);

  return (
    <div className="space-y-5 p-5" dir={isRTL ? "rtl" : "ltr"}>
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "#6b1523" }}>
            <ClipboardList className="h-6 w-6" />
            {isRTL ? "خطة الإنتاج اليومية" : "Daily Production Plan"}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--ink-500)" }}>
            {isRTL
              ? "اعرض، عدّل، واعتمد طلبات المناديب لإنتاج اليوم"
              : "View, adjust, and approve sales rep requests for the day's production"}
          </p>
        </div>
      </div>

      {/* ── Date picker ───────────────────────────────────────────────── */}
      <div className="rounded-2xl p-4 flex items-center gap-3 flex-wrap"
        style={{ background: "white", border: "1px solid var(--ink-150)" }}>
        <CalendarDays className="h-5 w-5" style={{ color: "#6b1523" }} />
        <span className="text-sm font-semibold" style={{ color: "var(--ink-700)" }}>
          {isRTL ? "تاريخ الإنتاج:" : "Production Date:"}
        </span>
        <input type="date" value={productionDate}
          onChange={(e) => setProductionDate(e.target.value)}
          className="input-field h-9 w-auto" />
        {view?.kpis?.isLocked && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold"
            style={{ background: "#fef2f2", color: "#dc2626" }}>
            <Lock className="h-3 w-3" />
            {isRTL ? "مغلق — لا يمكن للمناديب التعديل" : "Locked — reps can't edit"}
          </span>
        )}
      </div>

      {/* ── KPIs ──────────────────────────────────────────────────────── */}
      {view && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPI
            label={isRTL ? "عدد الطلبات" : "Requests"}
            value={String(view.kpis.requestCount)}
            color="#6b1523" bg="#fdf2f4" border="#6b152330" Icon={FileCheck}
            hint={isRTL ? "طلبات مرسلة" : "submitted"}
          />
          <KPI
            label={isRTL ? "عدد المناديب" : "Sales Reps"}
            value={String(view.kpis.repCount)}
            color="#1d4ed8" bg="#eff6ff" border="#bfdbfe" Icon={Users}
            hint={isRTL ? "مندوب أرسل" : "submitted"}
          />
          <KPI
            label={isRTL ? "عدد الأصناف" : "Unique Items"}
            value={String(view.kpis.itemCount)}
            color="#15803d" bg="#f0fdf4" border="#bbf7d0" Icon={Package}
            hint={isRTL ? "صنف فريد" : "distinct items"}
          />
          <KPI
            label={isRTL ? "إجمالي الكميات" : "Total Quantity"}
            value={view.kpis.totalQty.toString()}
            color="#7c3aed" bg="#f5f3ff" border="#ddd6fe" Icon={Layers}
            hint={isRTL ? "كمية مطلوبة" : "requested"}
          />
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────── */}
      {view && view.rows.length === 0 && extras.size === 0 && (
        <div className="rounded-2xl py-16 text-center"
          style={{ background: "white", border: "1px solid var(--ink-150)", color: "var(--ink-400)" }}>
          <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold mb-1">
            {isRTL ? "لا توجد طلبات مرسلة لهذا التاريخ" : "No submitted requests for this date"}
          </p>
          <p className="text-xs" style={{ color: "var(--ink-300)" }}>
            {isRTL
              ? "سترى هنا طلبات المناديب فور إرسالها — أو يمكنك إضافة أصناف يدوياً أدناه"
              : "Sales rep requests appear here once submitted — or add items manually below"}
          </p>
        </div>
      )}

      {/* ── Aggregated table ─────────────────────────────────────────── */}
      {view && (view.rows.length > 0 || extras.size > 0) && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "white", border: "1px solid var(--ink-150)" }}>
          <div className="px-4 py-2.5 flex items-center justify-between"
            style={{ background: "#6b1523", color: "white" }}>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              {isRTL ? "الخطة المجمعة" : "Consolidated Plan"}
            </h3>
            <span className="text-[11px] opacity-90">
              {isRTL
                ? `${activeRowCount} صنف · إجمالي ${totalApproved}`
                : `${activeRowCount} items · total ${totalApproved}`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-8 no-print"></th>
                  <th className="w-24">{isRTL ? "كود" : "Code"}</th>
                  <th>{isRTL ? "الصنف" : "Item"}</th>
                  <th className="text-end w-24">{isRTL ? "مطلوب" : "Requested"}</th>
                  <th className="text-end w-32">{isRTL ? "معتمد" : "Approved"}</th>
                  <th className="text-end w-20">{isRTL ? "الفرق" : "Diff"}</th>
                  <th className="text-center w-20">{isRTL ? "الوصفة" : "Recipe"}</th>
                  <th className="w-20 text-center no-print">{isRTL ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, idx) => {
                  const isOpen = expandedItem === row.itemId;
                  const diff = row.approvedQty - row.totalRequestedQty;
                  const isModified = overrides.has(row.itemId) || rejected.has(row.itemId);
                  return (
                    <React.Fragment key={row.itemId}>
                      <tr style={{
                        background: row.rejected ? "#fef2f2"
                                  : isModified  ? "#fefce8"
                                  : row.isExtra ? "#f5f3ff"
                                  : (idx % 2 === 0 ? "white" : "#fafafa"),
                      }}>
                        <td className="no-print">
                          {!row.isExtra && row.breakdown.length > 0 && (
                            <button onClick={() => setExpandedItem(isOpen ? null : row.itemId)}
                              className="h-6 w-6 rounded-md flex items-center justify-center"
                              style={{ background: isOpen ? "#6b152320" : "var(--ink-100)",
                                       color: isOpen ? "#6b1523" : "var(--ink-500)" }}>
                              {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </td>
                        <td>
                          <span className="font-mono text-[10.5px] px-1.5 py-0.5 rounded"
                            style={{ background: "var(--ink-100)", color: "var(--ink-700)" }}>
                            {row.itemCode}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[12.5px]">
                              {isRTL ? row.itemNameAr : (row.itemNameEn || row.itemNameAr)}
                            </span>
                            {row.isExtra && (
                              <span className="text-[9px] px-1 py-0.5 rounded font-bold"
                                style={{ background: "#7c3aed", color: "white" }}>
                                {isRTL ? "إضافة يدوية" : "MANUAL"}
                              </span>
                            )}
                            {!row.isExtra && row.breakdown.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                                style={{ background: "var(--ink-100)", color: "var(--ink-600)" }}>
                                {row.breakdown.length} {isRTL ? "مندوب" : "reps"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="numeric text-end font-semibold" style={{ color: "var(--ink-600)" }}>
                          {row.totalRequestedQty || "—"}
                        </td>
                        <td className="text-end">
                          <input type="number" min="0" step="0.01"
                            value={row.rejected ? 0 : row.approvedQty}
                            disabled={row.rejected}
                            onChange={(e) => setOverride(row.itemId, parseFloat(e.target.value))}
                            className="input-field h-8 w-24 text-end font-bold"
                            style={{ color: row.rejected ? "var(--ink-300)" : "#6b1523" }} />
                        </td>
                        <td className="numeric text-end text-[11px] font-bold"
                          style={{ color: diff > 0 ? "#15803d" : diff < 0 ? "#dc2626" : "var(--ink-400)" }}>
                          {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : "—"}
                        </td>
                        <td className="text-center">
                          {row.recipeId ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                              style={{ background: "#f0fdf4", color: "#15803d" }}>
                              ✓
                            </span>
                          ) : (
                            <span className="text-[10px] opacity-40">—</span>
                          )}
                        </td>
                        <td className="no-print">
                          <div className="flex items-center justify-center gap-1">
                            {!row.isExtra && (
                              <>
                                {isModified && (
                                  <button onClick={() => resetOverride(row.itemId)}
                                    title={isRTL ? "إعادة" : "Reset"}
                                    className="h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold"
                                    style={{ background: "var(--ink-100)", color: "var(--ink-600)" }}>
                                    ↺
                                  </button>
                                )}
                                <button onClick={() => toggleReject(row.itemId)}
                                  title={isRTL ? "رفض/قبول" : "Reject/Accept"}
                                  className="h-6 w-6 rounded-md flex items-center justify-center"
                                  style={{
                                    background: row.rejected ? "#dc2626" : "#fef2f2",
                                    color:      row.rejected ? "white"   : "#dc2626",
                                  }}>
                                  <X className="h-3 w-3" />
                                </button>
                              </>
                            )}
                            {row.isExtra && (
                              <button onClick={() => removeExtra(row.itemId)}
                                title={isRTL ? "حذف" : "Remove"}
                                className="h-6 w-6 rounded-md flex items-center justify-center"
                                style={{ background: "#fef2f2", color: "#dc2626" }}>
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* ── Per-rep breakdown drill-down ── */}
                      {isOpen && !row.isExtra && row.breakdown.length > 0 && (
                        <tr>
                          <td colSpan={8} className="p-0">
                            <div className="px-6 py-3 border-t border-b"
                              style={{ background: "#fdf2f4/30", borderColor: "#6b152320" }}>
                              <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
                                style={{ color: "#6b1523" }}>
                                {isRTL
                                  ? `تفصيل الطلبات لـ ${isRTL ? row.itemNameAr : (row.itemNameEn || row.itemNameAr)}`
                                  : `Per-Rep Breakdown for ${row.itemNameEn || row.itemNameAr}`}
                              </p>
                              <div className="rounded-lg overflow-hidden bg-white"
                                style={{ border: "1px solid #6b152320" }}>
                                <table className="w-full text-xs">
                                  <thead style={{ background: "#fdf2f4", color: "#6b1523" }}>
                                    <tr>
                                      <th className="px-3 py-2 text-start font-semibold">{isRTL ? "كود المندوب" : "Rep Code"}</th>
                                      <th className="px-3 py-2 text-start font-semibold">{isRTL ? "اسم المندوب" : "Sales Rep"}</th>
                                      <th className="px-3 py-2 text-start font-semibold">{isRTL ? "رقم الطلب" : "Request"}</th>
                                      <th className="px-3 py-2 text-end font-semibold">{isRTL ? "الكمية" : "Qty"}</th>
                                      <th className="px-3 py-2 text-start font-semibold">{isRTL ? "ملاحظة" : "Note"}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.breakdown.map((b: any, i: number) => (
                                      <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                                        <td className="px-3 py-1.5 font-mono">{b.repCode || "—"}</td>
                                        <td className="px-3 py-1.5 font-semibold">{b.repName}</td>
                                        <td className="px-3 py-1.5 font-mono text-[10px]">
                                          <span className="px-1.5 py-0.5 rounded" style={{ background: "var(--ink-100)" }}>
                                            {b.requestNumber}
                                          </span>
                                        </td>
                                        <td className="px-3 py-1.5 text-end font-bold">{b.qty}</td>
                                        <td className="px-3 py-1.5 text-xs muted">{b.notes || "—"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot style={{ background: "#fdf2f4" }}>
                                    <tr>
                                      <td colSpan={3} className="px-3 py-1.5 font-bold text-[11px]" style={{ color: "#6b1523" }}>
                                        {isRTL ? "إجمالي" : "Total"}
                                      </td>
                                      <td className="px-3 py-1.5 text-end font-black" style={{ color: "#6b1523" }}>
                                        {row.totalRequestedQty}
                                      </td>
                                      <td></td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "#fdf2f4" }}>
                  <td colSpan={3} className="px-3 py-2.5 font-black" style={{ color: "#6b1523" }}>
                    {isRTL ? `↓ إجمالي الخطة (${activeRowCount} صنف)` : `↓ Plan Total (${activeRowCount} items)`}
                  </td>
                  <td className="numeric text-end font-bold" style={{ color: "var(--ink-600)" }}>
                    {tableRows.reduce((s, r) => s + r.totalRequestedQty, 0)}
                  </td>
                  <td className="numeric text-end font-black" style={{ color: "#6b1523" }}>
                    {totalApproved}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Add manual item ──────────────────────────────────────────── */}
      {view && (view.rows.length > 0 || extras.size > 0 || true) && (
        <div className="rounded-2xl p-4" style={{ background: "white", border: "1px solid var(--ink-150)" }}>
          <h3 className="text-sm font-bold mb-2 flex items-center gap-1.5" style={{ color: "#7c3aed" }}>
            <Plus className="h-4 w-4" />
            {isRTL ? "إضافة صنف يدوياً (لم يطلبه أي مندوب)" : "Add manual item (not requested by any rep)"}
          </h3>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-12 md:col-span-5">
              <SearchableSelect
                isRTL={isRTL} value={newExtraItem} onChange={setNewExtraItem}
                placeholder={isRTL ? "اختر الصنف" : "Pick item"}
                searchPlaceholder={isRTL ? "ابحث..." : "Search..."}
                emptyMessage={isRTL ? "لا توجد نتائج" : "No results"}
                options={items.map((it: any) => ({
                  value: it._id,
                  label: it.code + " — " + itemNameOf(it),
                }))}
              />
            </div>
            <div className="col-span-4 md:col-span-2">
              <input type="number" min="0.01" step="0.01" value={newExtraQty}
                onChange={(e) => setNewExtraQty(e.target.value)}
                placeholder={isRTL ? "الكمية" : "Quantity"}
                className="input-field h-9 w-full text-end" />
            </div>
            <div className="col-span-5 md:col-span-4">
              <select value={newExtraRecipe}
                onChange={(e) => setNewExtraRecipe(e.target.value)}
                className="input-field h-9 w-full">
                <option value="">{isRTL ? "بدون وصفة" : "No recipe"}</option>
                {(recipes ?? []).map((r: any) => (
                  <option key={r._id} value={r._id}>{r.nameAr || r.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-3 md:col-span-1">
              <button onClick={addExtra}
                className="h-9 w-full rounded-lg flex items-center justify-center text-white font-semibold"
                style={{ background: "#7c3aed" }}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Approval bar ─────────────────────────────────────────────── */}
      {view && (view.rows.length > 0 || extras.size > 0) && (
        <div className="rounded-2xl p-4 sticky bottom-3"
          style={{
            background: "linear-gradient(135deg, #fdf2f4 0%, #fef9c3 100%)",
            border: "2px solid #6b152330",
            boxShadow: "0 8px 24px rgba(107, 21, 35, 0.15)",
          }}>
          <div className="flex items-start gap-3 flex-wrap">
            <div className="flex-1 min-w-[240px]">
              <label className="text-xs font-bold mb-1 block" style={{ color: "#6b1523" }}>
                {isRTL ? "ملاحظات على الخطة (اختياري)" : "Plan notes (optional)"}
              </label>
              <textarea value={planNotes}
                onChange={(e) => setPlanNotes(e.target.value)}
                rows={2}
                className="input-field w-full text-sm resize-none"
                placeholder={isRTL ? "أي ملاحظة لقسم الإنتاج..." : "Any note for the production team..."} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer"
                style={{ color: "var(--ink-700)" }}>
                <input type="checkbox" checked={convertToOrders}
                  onChange={(e) => setConvertToOrders(e.target.checked)}
                  className="rounded" />
                {isRTL ? "توليد أوامر إنتاج فوراً" : "Generate Production Orders"}
              </label>
              <button onClick={handleApprove}
                disabled={activeRowCount === 0}
                className="px-5 py-2.5 rounded-xl text-sm font-black text-white flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: convertToOrders ? "#15803d" : "#6b1523",
                         boxShadow: convertToOrders ? "0 4px 12px #15803d40" : "0 4px 12px #6b152340" }}>
                <CheckCircle2 className="h-5 w-5" />
                {convertToOrders
                  ? (isRTL ? "اعتمد + ولّد أوامر إنتاج" : "Approve + Generate Orders")
                  : (isRTL ? "اعتمد كخطة فقط" : "Approve as Plan Only")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
