// @ts-nocheck
"use client";
import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "@/store/toastStore";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Plus, Trash2, Send, Edit3, Save, X, Lock, Clock,
  CalendarDays, ClipboardList, FileText, AlertCircle, CheckCircle2, Truck, Package,
} from "lucide-react";

function todayISO()    { return new Date().toISOString().split("T")[0]; }
function tomorrowISO() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_INFO: Record<string, { color: string; bg: string; labelAr: string; labelEn: string; Icon: any }> = {
  draft:        { color: "#92400e", bg: "#fef9c3", labelAr: "مسودة",         labelEn: "Draft",         Icon: Edit3       },
  submitted:    { color: "#1d4ed8", bg: "#eff6ff", labelAr: "مُرسل",          labelEn: "Submitted",     Icon: Send        },
  consolidated: { color: "#15803d", bg: "#f0fdf4", labelAr: "تم الاعتماد",   labelEn: "Approved",      Icon: CheckCircle2 },
  cancelled:    { color: "#dc2626", bg: "#fef2f2", labelAr: "ملغي",           labelEn: "Cancelled",     Icon: X           },
};

function StatusBadge({ status, isRTL }: any) {
  const info = STATUS_INFO[status];
  if (!info) return null;
  const Icon = info.Icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: info.bg, color: info.color }}>
      <Icon className="h-3 w-3" />
      {isRTL ? info.labelAr : info.labelEn}
    </span>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function MyRequestsPage() {
  const { t, isRTL } = useI18n();
  const selectedBranch = useAppStore((s) => s.selectedBranch);

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const branches = useQuery(api.branches.getAll, company ? { companyId: company._id } : "skip");
  const branchId = useMemo(() => {
    if (selectedBranch !== "all") return selectedBranch;
    return branches?.[0]?._id;
  }, [selectedBranch, branches]);

  const reps = useQuery(api.salesMasters.listSalesReps,
    company ? { companyId: company._id } : "skip");
  const allItems = useQuery(api.items.getAllItems,
    company ? { companyId: company._id } : "skip");
  const items = (allItems ?? []).filter((i: any) => i.isActive !== false);

  // ── State ────────────────────────────────────────────────────────────────────
  const [salesRepId, setSalesRepId]       = useState<string>("");
  const [productionDate, setProductionDate] = useState<string>(tomorrowISO());
  const [notes, setNotes]                 = useState("");

  // Add-line form state
  const [newItemId, setNewItemId]   = useState("");
  const [newQty, setNewQty]         = useState("");
  const [newNote, setNewNote]       = useState("");
  const [editingLineId, setEditingLineId] = useState<string | null>(null);

  // ── Queries dependent on selection ──────────────────────────────────────────
  const myRequests = useQuery(api.productionRequests.getMyRequests,
    salesRepId ? { salesRepId: salesRepId as any } : "skip");

  const currentRequest = useQuery(api.productionRequests.getMyRequestForDate,
    salesRepId ? { salesRepId: salesRepId as any, productionDate } : "skip");

  const deadlineInfo = useQuery(api.productionRequests.getDeadlineInfo, { productionDate });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const upsertRequest    = useMutation(api.productionRequests.upsertRequest);
  const upsertLine       = useMutation(api.productionRequests.upsertRequestLine);
  const removeLine       = useMutation(api.productionRequests.removeRequestLine);
  const submitReq        = useMutation(api.productionRequests.submitRequest);
  const reopenReq        = useMutation(api.productionRequests.reopenRequest);
  const cancelReq        = useMutation(api.productionRequests.cancelRequest);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const isLocked       = deadlineInfo?.isLocked ?? false;
  const deadlineHour   = deadlineInfo?.deadlineHour ?? 18;
  const isSubmitted    = currentRequest?.status === "submitted";
  const isConsolidated = currentRequest?.status === "consolidated";
  const isEditable     = !isLocked && !isConsolidated;
  const itemNameOf = (it: any) => isRTL ? it.nameAr : (it.nameEn || it.nameAr);

  // Auto-create request when adding first line
  async function ensureRequestExists() {
    if (currentRequest?._id) return currentRequest._id;
    if (!company || !branchId || !salesRepId) {
      toast.error(isRTL ? "اختر المندوب أولاً" : "Select a sales rep first");
      throw new Error("Missing required data");
    }
    return await upsertRequest({
      companyId:      company._id as any,
      branchId:       branchId as any,
      salesRepId:     salesRepId as any,
      productionDate,
      notes,
    });
  }

  async function handleAddLine() {
    if (!newItemId || !newQty || Number(newQty) <= 0) {
      toast.error(isRTL ? "اختر صنف وأدخل كمية صحيحة" : "Pick an item and a valid quantity");
      return;
    }
    try {
      const requestId = await ensureRequestExists();
      await upsertLine({
        requestId: requestId as any,
        itemId:    newItemId as any,
        requestedQty: Number(newQty),
        notes:     newNote || undefined,
      });
      setNewItemId(""); setNewQty(""); setNewNote("");
      toast.success(isRTL ? "تمت الإضافة" : "Added");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleUpdateLine(lineId: string, qty: number, lineNote: string, itemId: string) {
    try {
      await upsertLine({
        requestId: currentRequest!._id as any,
        lineId:    lineId as any,
        itemId:    itemId as any,
        requestedQty: qty,
        notes:     lineNote || undefined,
      });
      setEditingLineId(null);
      toast.success(isRTL ? "تم التعديل" : "Updated");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleRemoveLine(lineId: string) {
    if (!confirm(isRTL ? "حذف هذا الصنف؟" : "Remove this item?")) return;
    try {
      await removeLine({ lineId: lineId as any });
      toast.success(isRTL ? "تم الحذف" : "Removed");
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleSubmit() {
    if (!currentRequest) return;
    if (!confirm(isRTL ? "إرسال الطلب لقسم الإنتاج؟" : "Submit request to production?")) return;
    try {
      await submitReq({ requestId: currentRequest._id as any });
      toast.success(isRTL ? "تم الإرسال بنجاح" : "Submitted successfully");
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleReopen() {
    if (!currentRequest) return;
    try {
      await reopenReq({ requestId: currentRequest._id as any });
      toast.success(isRTL ? "تم فتح الطلب للتعديل" : "Reopened for editing");
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleCancel() {
    if (!currentRequest) return;
    if (!confirm(isRTL ? "إلغاء هذا الطلب نهائياً؟" : "Cancel this request permanently?")) return;
    try {
      await cancelReq({ requestId: currentRequest._id as any });
      toast.success(isRTL ? "تم الإلغاء" : "Cancelled");
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-5 p-5" dir={isRTL ? "rtl" : "ltr"}>
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "#6b1523" }}>
            <Truck className="h-6 w-6" />
            {isRTL ? "طلباتي للإنتاج" : "My Production Requests"}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--ink-500)" }}>
            {isRTL
              ? "أرسل ما تحتاج إنتاجه للغد"
              : "Submit what you need produced for tomorrow"}
          </p>
        </div>
      </div>

      {/* ── Picker bar (sales rep + date) ────────────────────────────── */}
      <div className="rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3"
        style={{ background: "white", border: "1px solid var(--ink-150)" }}>
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--ink-600)" }}>
            {isRTL ? "المندوب" : "Sales Rep"}
          </label>
          <SearchableSelect
            isRTL={isRTL}
            value={salesRepId}
            onChange={setSalesRepId}
            placeholder={isRTL ? "اختر المندوب" : "Pick rep"}
            searchPlaceholder={isRTL ? "ابحث..." : "Search..."}
            emptyMessage={isRTL ? "لا توجد نتائج" : "No results"}
            options={(reps ?? []).map((r: any) => ({
              value: r._id,
              label: r.code + " — " + (isRTL ? r.nameAr : (r.nameEn || r.nameAr)),
            }))}
          />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--ink-600)" }}>
            <CalendarDays className="h-3.5 w-3.5 inline-block me-1" />
            {isRTL ? "تاريخ الإنتاج" : "Production Date"}
          </label>
          <input type="date" value={productionDate}
            min={todayISO()}
            onChange={(e) => setProductionDate(e.target.value)}
            className="input-field h-9 w-full" />
        </div>
        <div className="flex items-end">
          {isLocked ? (
            <div className="w-full rounded-lg px-3 py-2 flex items-center gap-2"
              style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5" }}>
              <Lock className="h-4 w-4" />
              <span className="text-xs font-bold">
                {isRTL
                  ? `مغلق — انتهى الموعد النهائي (${deadlineHour}:00)`
                  : `Locked — deadline (${deadlineHour}:00) passed`}
              </span>
            </div>
          ) : (
            <div className="w-full rounded-lg px-3 py-2 flex items-center gap-2"
              style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>
              <Clock className="h-4 w-4" />
              <span className="text-xs font-bold">
                {isRTL
                  ? `مفتوح للتعديل حتى الساعة ${deadlineHour}:00`
                  : `Open for editing until ${deadlineHour}:00`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Empty selection ──────────────────────────────────────────── */}
      {!salesRepId && (
        <div className="py-16 text-center" style={{ color: "var(--ink-400)" }}>
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold mb-1">
            {isRTL ? "اختر المندوب لبدء العمل" : "Pick a sales rep to start"}
          </p>
        </div>
      )}

      {/* ── Current request panel ────────────────────────────────────── */}
      {salesRepId && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid var(--ink-150)" }}>
          {/* Status header */}
          <div className="flex items-center gap-3 px-4 py-3 flex-wrap"
            style={{ background: "linear-gradient(90deg, #fdf2f4 0%, #fefefe 100%)",
                     borderBottom: "1px solid #6b152320" }}>
            <FileText className="h-5 w-5" style={{ color: "#6b1523" }} />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {currentRequest ? (
                  <>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded font-bold"
                      style={{ background: "#6b1523", color: "white" }}>
                      {currentRequest.requestNumber}
                    </span>
                    <StatusBadge status={currentRequest.status} isRTL={isRTL} />
                  </>
                ) : (
                  <span className="text-sm font-semibold" style={{ color: "var(--ink-500)" }}>
                    {isRTL ? "لا يوجد طلب لهذا التاريخ — ابدأ بإضافة أصناف" : "No request yet — start adding items"}
                  </span>
                )}
              </div>
              {currentRequest && (
                <div className="text-xs mt-0.5" style={{ color: "var(--ink-500)" }}>
                  {currentRequest.lineCount ?? currentRequest.lines?.length ?? 0} {isRTL ? "صنف" : "items"}
                  {currentRequest.totalQty != null && ` · ${currentRequest.totalQty} ${isRTL ? "إجمالي الكمية" : "total qty"}`}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {currentRequest && currentRequest.status === "submitted" && isEditable && (
                <button onClick={handleReopen}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5"
                  style={{ background: "#fef9c3", color: "#92400e", borderColor: "#fde68a" }}>
                  <Edit3 className="h-3.5 w-3.5" />
                  {isRTL ? "تعديل" : "Edit"}
                </button>
              )}
              {currentRequest && currentRequest.status === "draft" && (currentRequest.lines?.length ?? 0) > 0 && isEditable && (
                <button onClick={handleSubmit}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5"
                  style={{ background: "#6b1523" }}>
                  <Send className="h-3.5 w-3.5" />
                  {isRTL ? "إرسال للإنتاج" : "Submit"}
                </button>
              )}
              {currentRequest && (currentRequest.status === "draft" || currentRequest.status === "submitted") && isEditable && (
                <button onClick={handleCancel}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5"
                  style={{ background: "white", color: "#dc2626", borderColor: "#fca5a5" }}>
                  <X className="h-3.5 w-3.5" />
                  {isRTL ? "إلغاء" : "Cancel"}
                </button>
              )}
            </div>
          </div>

          {/* Add-line row (only when editable) */}
          {isEditable && (currentRequest?.status !== "submitted") && (
            <div className="px-4 py-3" style={{ background: "#f8f9fb", borderBottom: "1px solid var(--ink-100)" }}>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-12 md:col-span-6">
                  <SearchableSelect
                    isRTL={isRTL}
                    value={newItemId}
                    onChange={setNewItemId}
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
                  <input type="number" min="0.01" step="0.01" value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    placeholder={isRTL ? "الكمية" : "Quantity"}
                    className="input-field h-9 w-full text-end" />
                </div>
                <div className="col-span-5 md:col-span-3">
                  <input type="text" value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder={isRTL ? "ملاحظة (اختياري)" : "Note (optional)"}
                    className="input-field h-9 w-full" />
                </div>
                <div className="col-span-3 md:col-span-1">
                  <button onClick={handleAddLine}
                    className="h-9 w-full rounded-lg flex items-center justify-center text-white font-semibold"
                    style={{ background: "#15803d" }}>
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lines table */}
          <div className="overflow-x-auto">
            {!currentRequest || (currentRequest.lines?.length ?? 0) === 0 ? (
              <div className="py-12 text-center" style={{ color: "var(--ink-400)" }}>
                <p className="text-sm">
                  {isRTL ? "لا توجد أصناف بعد — استخدم النموذج أعلاه للإضافة" : "No items yet — use the form above to add"}
                </p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-12">#</th>
                    <th className="w-24">{isRTL ? "كود" : "Code"}</th>
                    <th>{isRTL ? "الصنف" : "Item"}</th>
                    <th className="text-end w-32">{isRTL ? "الكمية" : "Quantity"}</th>
                    <th>{isRTL ? "ملاحظة" : "Note"}</th>
                    <th className="w-24 text-center no-print">{isRTL ? "إجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRequest.lines.map((line: any, idx: number) => (
                    <LineRow
                      key={line._id}
                      line={line}
                      idx={idx}
                      isRTL={isRTL}
                      isEditable={isEditable && currentRequest.status !== "submitted"}
                      isEditing={editingLineId === line._id}
                      onEdit={() => setEditingLineId(line._id)}
                      onCancelEdit={() => setEditingLineId(null)}
                      onSave={(qty, note, itemId) => handleUpdateLine(line._id, qty, note, itemId)}
                      onRemove={() => handleRemoveLine(line._id)}
                      items={items}
                    />
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#fdf2f4" }}>
                    <td colSpan={3} className="font-black px-3 py-2.5" style={{ color: "#6b1523" }}>
                      {isRTL ? `إجمالي (${currentRequest.lines.length} صنف)` : `Total (${currentRequest.lines.length} items)`}
                    </td>
                    <td className="font-black text-end tabular-nums" style={{ color: "#6b1523" }}>
                      {currentRequest.lines.reduce((s: number, l: any) => s + l.requestedQty, 0)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── My recent requests history ────────────────────────────────── */}
      {salesRepId && myRequests && myRequests.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid var(--ink-150)" }}>
          <div className="px-4 py-2.5" style={{ background: "#6b1523", color: "white" }}>
            <h3 className="font-bold text-sm">{isRTL ? "📋 طلباتي السابقة" : "📋 My Past Requests"}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{isRTL ? "رقم الطلب" : "Request No."}</th>
                  <th>{isRTL ? "تاريخ الإنتاج" : "Production Date"}</th>
                  <th className="text-center">{isRTL ? "الحالة" : "Status"}</th>
                  <th className="text-end">{isRTL ? "عدد الأصناف" : "Items"}</th>
                  <th className="text-end">{isRTL ? "إجمالي الكمية" : "Total Qty"}</th>
                  <th>{isRTL ? "ملاحظات" : "Notes"}</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.map((r: any) => (
                  <tr key={r._id} className="hover:bg-[#fdf2f4]/30">
                    <td>
                      <span className="font-mono text-[10.5px] px-1.5 py-0.5 rounded font-bold"
                        style={{ background: "var(--ink-100)" }}>
                        {r.requestNumber}
                      </span>
                    </td>
                    <td className="muted">{r.productionDate}</td>
                    <td className="text-center"><StatusBadge status={r.status} isRTL={isRTL} /></td>
                    <td className="numeric text-end">{r.lineCount}</td>
                    <td className="numeric text-end font-semibold">{r.totalQty}</td>
                    <td className="text-xs muted max-w-[240px] truncate">{r.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── My allocations (what production allocated for me) ─────────── */}
      {salesRepId && <MyAllocationsSection salesRepId={salesRepId} isRTL={isRTL} />}
    </div>
  );
}

// ─── My Allocations section ───────────────────────────────────────────────────
function MyAllocationsSection({ salesRepId, isRTL }: any) {
  const confirmReceipt = useMutation(api.productionRequests.confirmReceipt);
  const myDists = useQuery(api.productionRequests.getMyDistributions,
    { salesRepId: salesRepId as any });

  if (!myDists || myDists.length === 0) return null;

  // Group by plan (productionDate)
  const byDate = new Map<string, typeof myDists>();
  for (const d of myDists) {
    if (!byDate.has(d.productionDate)) byDate.set(d.productionDate, []);
    byDate.get(d.productionDate)!.push(d);
  }
  const dates = Array.from(byDate.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  const DIST_STATUS: Record<string, { color: string; bg: string; labelAr: string; labelEn: string }> = {
    pending:    { color: "#92400e", bg: "#fef9c3", labelAr: "قيد الانتظار", labelEn: "Pending"    },
    dispatched: { color: "#1d4ed8", bg: "#eff6ff", labelAr: "جاهز للاستلام", labelEn: "Ready"     },
    confirmed:  { color: "#15803d", bg: "#f0fdf4", labelAr: "تم الاستلام",  labelEn: "Received"   },
  };

  const handleConfirm = async (items: any[]) => {
    const dispatched = items.filter((i) => i.status === "dispatched").map((i) => i._id);
    if (dispatched.length === 0) return;
    try {
      await confirmReceipt({ distributionIds: dispatched });
      toast.success(isRTL ? "تم تأكيد الاستلام" : "Receipt confirmed");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid #bfdbfe" }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3"
        style={{ background: "linear-gradient(90deg,#eff6ff,#f8faff)", borderBottom: "1px solid #bfdbfe" }}>
        <div className="h-8 w-8 rounded-lg flex items-center justify-center"
          style={{ background: "#1d4ed820" }}>
          <Package className="h-4 w-4" style={{ color: "#1d4ed8" }} />
        </div>
        <div>
          <h3 className="font-bold text-sm" style={{ color: "#1d4ed8" }}>
            {isRTL ? "📦 مخصصاتي من الإنتاج" : "📦 My Production Allocations"}
          </h3>
          <p className="text-[11px]" style={{ color: "#3b82f6" }}>
            {isRTL ? "ما تم تخصيصه لك من خطط الإنتاج المعتمدة" : "Items allocated to you from approved production plans"}
          </p>
        </div>
      </div>

      {/* Per-date groups */}
      <div className="divide-y" style={{ borderColor: "#e0eeff" }}>
        {dates.map(([date, items]) => {
          const hasReady   = items.some((i) => i.status === "dispatched");
          const allReceived = items.every((i) => i.status === "confirmed");
          const planNumber  = items[0]?.planNumber ?? "";

          return (
            <div key={date} className="px-4 py-3">
              {/* Date row */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5" style={{ color: "#1d4ed8" }} />
                  <span className="font-bold text-[13px]" style={{ color: "var(--ink-800)" }}>{date}</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: "#1d4ed820", color: "#1d4ed8" }}>
                    {planNumber}
                  </span>
                </div>
                {hasReady && !allReceived && (
                  <button onClick={() => handleConfirm(items)}
                    className="h-7 px-3 rounded-lg text-[11px] font-bold border inline-flex items-center gap-1.5"
                    style={{ background: "#f0fdf4", color: "#15803d", borderColor: "#bbf7d0" }}>
                    <CheckCircle2 className="h-3 w-3" />
                    {isRTL ? "تأكيد الاستلام" : "Confirm Receipt"}
                  </button>
                )}
                {allReceived && (
                  <span className="text-[11px] font-bold" style={{ color: "#15803d" }}>
                    ✓ {isRTL ? "تم الاستلام بالكامل" : "Fully received"}
                  </span>
                )}
              </div>

              {/* Items */}
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e0eeff" }}>
                <table className="w-full text-[12px]">
                  <thead style={{ background: "#f0f7ff" }}>
                    <tr>
                      <th className="px-3 py-2 text-start font-semibold" style={{ color: "#1d4ed8" }}>
                        {isRTL ? "الصنف" : "Item"}
                      </th>
                      <th className="px-3 py-2 text-end font-semibold" style={{ color: "#1d4ed8" }}>
                        {isRTL ? "طلبت" : "Requested"}
                      </th>
                      <th className="px-3 py-2 text-end font-semibold" style={{ color: "#1d4ed8" }}>
                        {isRTL ? "مخصص لك" : "Your Share"}
                      </th>
                      <th className="px-3 py-2 text-center font-semibold" style={{ color: "#1d4ed8" }}>
                        {isRTL ? "الحالة" : "Status"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "#e0eeff" }}>
                    {items.map((d: any) => {
                      const si = DIST_STATUS[d.status];
                      return (
                        <tr key={d._id} style={{ background: d.status === "confirmed" ? "#f0fdf410" : undefined }}>
                          <td className="px-3 py-2.5">
                            <span className="font-mono text-[10px] px-1 py-0.5 rounded me-1.5"
                              style={{ background: "var(--ink-100)", color: "var(--ink-500)" }}>
                              {d.itemCode}
                            </span>
                            <span className="font-semibold" style={{ color: "var(--ink-900)" }}>
                              {isRTL ? d.itemNameAr : d.itemNameEn}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-end tabular-nums" style={{ color: "var(--ink-500)" }}>
                            {d.requestedQty}
                            {d.uomNameAr && <span className="ms-1 text-[10px]" style={{ color: "var(--ink-400)" }}>{d.uomNameAr}</span>}
                          </td>
                          <td className="px-3 py-2.5 text-end">
                            <span className="font-black tabular-nums text-[15px]" style={{ color: "#1d4ed8" }}>
                              {d.allocatedQty}
                            </span>
                            {d.uomNameAr && <span className="ms-1 text-[10px]" style={{ color: "var(--ink-400)" }}>{d.uomNameAr}</span>}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                              style={{ background: si?.bg, color: si?.color }}>
                              {isRTL ? si?.labelAr : si?.labelEn}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Editable line row ────────────────────────────────────────────────────────
function LineRow({ line, idx, isRTL, isEditable, isEditing, onEdit, onCancelEdit, onSave, onRemove, items }: any) {
  const [qty, setQty] = useState(String(line.requestedQty));
  const [note, setNote] = useState(line.notes ?? "");
  const [itemId, setItemId] = useState(line.itemId);

  React.useEffect(() => {
    if (isEditing) {
      setQty(String(line.requestedQty));
      setNote(line.notes ?? "");
      setItemId(line.itemId);
    }
  }, [isEditing, line]);

  if (isEditing) {
    const itemNameOf = (it: any) => isRTL ? it.nameAr : (it.nameEn || it.nameAr);
    return (
      <tr style={{ background: "#fefce8" }}>
        <td className="muted">{idx + 1}</td>
        <td colSpan={2}>
          <SearchableSelect
            isRTL={isRTL} value={itemId} onChange={setItemId}
            placeholder={isRTL ? "اختر الصنف" : "Pick item"}
            searchPlaceholder={isRTL ? "ابحث..." : "Search..."}
            emptyMessage={isRTL ? "لا توجد نتائج" : "No results"}
            options={items.map((it: any) => ({
              value: it._id,
              label: it.code + " — " + itemNameOf(it),
            }))}
          />
        </td>
        <td>
          <input type="number" min="0.01" step="0.01" value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="input-field h-8 w-full text-end" />
        </td>
        <td>
          <input type="text" value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input-field h-8 w-full" />
        </td>
        <td className="no-print">
          <div className="flex items-center justify-center gap-1">
            <button onClick={() => onSave(Number(qty), note, itemId)}
              className="h-7 w-7 rounded-md flex items-center justify-center text-white"
              style={{ background: "#15803d" }}>
              <Save className="h-3.5 w-3.5" />
            </button>
            <button onClick={onCancelEdit}
              className="h-7 w-7 rounded-md flex items-center justify-center"
              style={{ background: "var(--ink-100)", color: "var(--ink-600)" }}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-[#fdf2f4]/30">
      <td className="muted">{idx + 1}</td>
      <td className="code">{line.itemCode}</td>
      <td>{isRTL ? line.itemNameAr : (line.itemNameEn || line.itemNameAr)}</td>
      <td className="numeric text-end font-semibold">{line.requestedQty}</td>
      <td className="text-xs muted max-w-[200px] truncate">{line.notes || "—"}</td>
      <td className="no-print">
        {isEditable && (
          <div className="flex items-center justify-center gap-1">
            <button onClick={onEdit} className="h-7 w-7 rounded-md flex items-center justify-center"
              style={{ background: "#eff6ff", color: "#2563eb" }}>
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button onClick={onRemove} className="h-7 w-7 rounded-md flex items-center justify-center"
              style={{ background: "#fef2f2", color: "#dc2626" }}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
