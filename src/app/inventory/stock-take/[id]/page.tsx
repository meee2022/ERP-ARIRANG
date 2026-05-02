// @ts-nocheck
"use client";

import React, { useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { ColorKPIGrid, LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ArrowLeft, ArrowRight, Search, Send, CheckCircle2, XCircle, Trash2,
  ClipboardList, AlertTriangle, Wallet, Hash, FileSpreadsheet, Upload, Download, Printer, ShieldOff,
} from "lucide-react";
import * as XLSX from "xlsx";

const REASONS = [
  { value: "wastage",          arLabel: "هدر",           enLabel: "Wastage" },
  { value: "theft",            arLabel: "سرقة محتملة",  enLabel: "Theft" },
  { value: "damaged",          arLabel: "تالف",          enLabel: "Damaged" },
  { value: "production_loss", arLabel: "خسائر إنتاج",  enLabel: "Production Loss" },
  { value: "counting_error",  arLabel: "خطأ في العد",  enLabel: "Counting Error" },
  { value: "other",            arLabel: "أخرى",          enLabel: "Other" },
];

const STATUS_INFO: any = {
  draft:          { ar: "مسودة",            en: "Draft",           bg: "bg-gray-100", tx: "text-gray-700" },
  in_progress:    { ar: "قيد التنفيذ",     en: "In Progress",     bg: "bg-blue-100", tx: "text-blue-700" },
  pending_review: { ar: "بانتظار المراجعة", en: "Pending Review",  bg: "bg-amber-100", tx: "text-amber-700" },
  completed:      { ar: "مكتمل",            en: "Completed",       bg: "bg-emerald-100", tx: "text-emerald-700" },
  cancelled:      { ar: "ملغي",              en: "Cancelled",       bg: "bg-red-100", tx: "text-red-700" },
};

// ─── Inline Count cell — auto-saves on blur, shows UOM ─────────────────────
function CountCell({ line, onUpdate, disabled, isRTL }: any) {
  const [value, setValue] = useState(line.physicalQty != null ? String(line.physicalQty) : "");
  const [saving, setSaving] = useState(false);

  const onBlur = async () => {
    const trimmed = value.trim();
    const newQty = trimmed === "" ? undefined : Number(trimmed);
    const oldQty = line.physicalQty;
    if (newQty === oldQty) return;
    if (newQty !== undefined && isNaN(newQty)) return;
    setSaving(true);
    try {
      await onUpdate({ physicalQty: newQty });
    } finally {
      setSaving(false);
    }
  };

  const uomLabel = isRTL ? line.uomNameAr : (line.uomNameEn || line.uomNameAr);

  return (
    <div className="inline-flex items-center gap-1.5">
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        placeholder="—"
        className={`w-20 h-8 px-2 text-sm text-end tabular-nums rounded border focus:outline-none focus:ring-2 focus:ring-blue-300 ${
          line.counted
            ? "border-emerald-300 bg-emerald-50 font-bold text-emerald-900"
            : "border-gray-200 bg-white"
        } ${saving ? "opacity-60" : ""} ${disabled ? "cursor-not-allowed bg-gray-50" : ""}`}
      />
      <span
        className="text-[10px] font-bold uppercase text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded min-w-[36px] text-center select-none"
        title={isRTL ? "أدخل الكمية بهذه الوحدة" : "Enter quantity in this unit"}
      >
        {uomLabel || "—"}
      </span>
    </div>
  );
}

// ─── Reason selector ───────────────────────────────────────────────────────
function ReasonSelect({ line, onUpdate, isRTL, disabled }: any) {
  if (!line.counted || line.variance === 0) {
    return <span className="text-[color:var(--ink-300)] text-xs">—</span>;
  }
  return (
    <select
      value={line.reason ?? ""}
      disabled={disabled}
      onChange={(e) => onUpdate({ reason: e.target.value || undefined })}
      className="h-7 text-[11px] px-1.5 border border-gray-200 rounded bg-white focus:outline-none focus:border-gray-400"
    >
      <option value="">—</option>
      {REASONS.map((r) => (
        <option key={r.value} value={r.value}>{isRTL ? r.arLabel : r.enLabel}</option>
      ))}
    </select>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function StockTakeDetailPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const router = useRouter();
  const params = useParams();
  const takeId = params?.id as string;
  const { currentUser } = useAuth();
  const { canEdit } = usePermissions();
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "owner";

  const take = useQuery(api.stockTake.getStockTakeById, takeId ? { takeId: takeId as any } : "skip");
  const allAccounts = useQuery(api.accounts.getAll, take ? { companyId: take.companyId as any } : "skip") ?? [];

  const updateLine = useMutation(api.stockTake.updateLineCount);
  const bulkUpdate = useMutation(api.stockTake.bulkUpdateCounts);
  const submit     = useMutation(api.stockTake.submitForReview);
  const approve    = useMutation(api.stockTake.approveStockTake);
  const reject     = useMutation(api.stockTake.rejectStockTake);
  const cancelMut  = useMutation(api.stockTake.cancelStockTake);
  const deleteMut  = useMutation(api.stockTake.deleteStockTake);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "uncounted" | "variance" | "shortage" | "excess">("all");
  const [search, setSearch] = useState("");
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (take === undefined) return <LoadingState label={t("loading") ?? "Loading..."} />;
  if (!take) return (
    <div className="p-8 text-center text-[color:var(--ink-400)]">
      <p>{t("documentNotFound") ?? "Not found"}</p>
    </div>
  );

  const status = take.status;
  const isLocked = status === "completed" || status === "cancelled" || status === "pending_review";
  const canSubmit = (status === "draft" || status === "in_progress") && take.countedItems > 0;
  const canCancel = status === "draft" || status === "in_progress" || status === "pending_review";
  const canDelete = status === "draft" || status === "cancelled";
  const cfg = STATUS_INFO[status] || STATUS_INFO.draft;

  // Filter lines
  const filteredLines = (take.lines ?? []).filter((l: any) => {
    if (search) {
      const s = search.toLowerCase();
      if (!(l.itemCode || "").toLowerCase().includes(s) &&
          !(l.itemNameAr || "").toLowerCase().includes(s) &&
          !(l.itemNameEn || "").toLowerCase().includes(s)) return false;
    }
    if (filter === "uncounted") return !l.counted;
    if (filter === "variance")  return l.counted && l.variance !== 0;
    if (filter === "shortage")  return l.counted && l.variance < 0;
    if (filter === "excess")    return l.counted && l.variance > 0;
    return true;
  });

  // Update line wrapper
  const handleLineUpdate = async (lineId: any, current: any, patch: any) => {
    if (!currentUser?._id) return;
    try {
      await updateLine({
        lineId,
        physicalQty: patch.physicalQty !== undefined ? patch.physicalQty : current.physicalQty,
        reason: patch.reason !== undefined ? patch.reason : current.reason,
        notes: patch.notes !== undefined ? patch.notes : current.notes,
        userId: currentUser._id,
      });
    } catch (e: any) {
      setError(e.message);
      setTimeout(() => setError(""), 4000);
    }
  };

  const onSubmit = async () => {
    if (!currentUser?._id) return;
    if (!confirm(isRTL ? "إرسال الجرد للمراجعة من الإدارة؟" : "Submit this take to admin for review?")) return;
    setBusy(true); setError("");
    try {
      await submit({ takeId: takeId as any, userId: currentUser._id });
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const onApproveConfirm = async (createAdjustment: boolean, accs?: { invAcc: string; varAcc: string }) => {
    if (!currentUser?._id) return;
    setBusy(true); setError("");
    try {
      await approve({
        takeId: takeId as any,
        userId: currentUser._id,
        createAdjustment,
        inventoryAccountId: createAdjustment ? (accs?.invAcc as any) : undefined,
        varianceAccountId:  createAdjustment ? (accs?.varAcc as any) : undefined,
      });
      setShowApproveModal(false);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const onReject = async () => {
    if (!currentUser?._id || !rejectReason.trim()) return;
    setBusy(true); setError("");
    try {
      await reject({ takeId: takeId as any, reason: rejectReason, userId: currentUser._id });
      setShowRejectModal(false); setRejectReason("");
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const onCancel = async () => {
    if (!currentUser?._id) return;
    if (!confirm(isRTL ? "إلغاء هذا الجرد؟ لا يمكن التراجع." : "Cancel this stock take? Cannot be undone.")) return;
    setBusy(true);
    try {
      await cancelMut({ takeId: takeId as any, userId: currentUser._id });
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const onDelete = async () => {
    if (!currentUser?._id) return;
    if (!confirm(isRTL ? "حذف هذا الجرد نهائياً؟" : "Permanently delete this take?")) return;
    setBusy(true);
    try {
      await deleteMut({ takeId: takeId as any, userId: currentUser._id });
      router.push("/inventory/stock-take");
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  // ─── Excel template download ─────────────────────────────────────────────
  const downloadTemplate = () => {
    const rows = [
      ["Item Code", "Item Name", "System Qty", "Physical Count"],
      ...take.lines.map((l: any) => [
        l.itemCode, isRTL ? l.itemNameAr : (l.itemNameEn || l.itemNameAr),
        l.systemQty, "", // empty for user to fill
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 14 }, { wch: 32 }, { wch: 12 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Take");
    XLSX.writeFile(wb, `stock-take-${take.takeNumber}-template.xlsx`);
  };

  // ─── Excel import handler ────────────────────────────────────────────────
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?._id) return;
    setBusy(true); setError("");
    try {
      const buf  = await file.arrayBuffer();
      const wb   = XLSX.read(buf, { type: "array" });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

      // Skip header row, parse: [code, name, sysQty, physical]
      const counts = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 4) continue;
        const itemCode = String(row[0] ?? "").trim();
        const phyRaw   = row[3];
        if (!itemCode || phyRaw === "" || phyRaw === undefined || phyRaw === null) continue;
        const physicalQty = Number(phyRaw);
        if (isNaN(physicalQty)) continue;
        counts.push({ itemCode, physicalQty });
      }

      if (counts.length === 0) {
        setError(isRTL ? "لم يتم العثور على بيانات صالحة في الملف" : "No valid count data found in file");
        return;
      }

      const result: any = await bulkUpdate({
        takeId: takeId as any, counts, userId: currentUser._id,
      });
      alert(
        (isRTL ? `✅ تم تحديث ${result.updated} صنف` : `✅ Updated ${result.updated} item(s)`) +
        (result.notFound > 0 ? `\n⚠️ ${result.notFound} ${isRTL ? "غير موجود" : "not matched"}` : "")
      );
    } catch (e: any) { setError(e.message); }
    finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ─── Excel export of current state ───────────────────────────────────────
  const exportExcel = () => {
    const rows = [
      ["Take #", take.takeNumber],
      ["Date", take.takeDate],
      ["Warehouse", isRTL ? take.warehouseNameAr : (take.warehouseNameEn || take.warehouseNameAr)],
      ["Status", isRTL ? cfg.ar : cfg.en],
      [],
      ["Code", "Item", "System Qty", "Physical", "Variance", "Unit Cost", "Variance Value", "Reason", "Notes"],
      ...take.lines.map((l: any) => [
        l.itemCode,
        isRTL ? l.itemNameAr : (l.itemNameEn || l.itemNameAr),
        l.systemQty,
        l.physicalQty ?? "",
        l.variance,
        l.unitCost,
        l.varianceValue,
        l.reason ?? "",
        l.notes ?? "",
      ]),
      [],
      ["", "", "", "", "Totals"],
      ["", "", "", "", "Shortage", "", -Math.abs(take.shortageValue)],
      ["", "", "", "", "Excess",   "", take.excessValue],
      ["", "", "", "", "Net",      "", take.totalVarianceValue],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 12 }, { wch: 30 }, { wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 10 }, { wch: 14 }, { wch: 18 }, { wch: 24 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Take");
    XLSX.writeFile(wb, `stock-take-${take.takeNumber}.xlsx`);
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-4 pb-10">
      {/* ── Sticky action bar ── */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[color:var(--ink-200)] -mx-6 px-6 py-3 flex items-center justify-between">
        <button onClick={() => router.push("/inventory/stock-take")}
          className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--ink-500)] hover:text-[color:var(--ink-900)]">
          {isRTL ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          {isRTL ? "رجوع" : "Back"}
        </button>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Workflow buttons */}
            {canSubmit && canEdit("inventory") && (
              <button onClick={onSubmit} disabled={busy}
                className="h-8 px-3 rounded-md text-xs font-bold inline-flex items-center gap-1.5 bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">
                <Send className="h-3.5 w-3.5" />{t("submitForReview")}
              </button>
            )}

            {status === "pending_review" && isAdmin && (
              <>
                <button onClick={() => setShowApproveModal(true)} disabled={busy}
                  className="h-8 px-3 rounded-md text-xs font-bold inline-flex items-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />{isRTL ? "اعتماد" : "Approve"}
                </button>
                <button onClick={() => setShowRejectModal(true)} disabled={busy}
                  className="h-8 px-3 rounded-md text-xs font-bold inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100">
                  <XCircle className="h-3.5 w-3.5" />{t("rejectStockTake")}
                </button>
              </>
            )}

            {status === "pending_review" && !isAdmin && (
              <span className="h-8 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 bg-gray-50 text-gray-500 border border-gray-200">
                <ShieldOff className="h-3.5 w-3.5" />{isRTL ? "بانتظار اعتماد الإدارة" : "Awaiting admin approval"}
              </span>
            )}

            {canCancel && canEdit("inventory") && (
              <button onClick={onCancel} disabled={busy}
                className="h-8 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100">
                <XCircle className="h-3.5 w-3.5" />{t("cancel")}
              </button>
            )}

            {canDelete && (
              <button onClick={onDelete} disabled={busy}
                className="h-8 w-8 rounded-md inline-flex items-center justify-center bg-white text-red-500 border border-red-200 hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}

            <span className="w-px h-6 bg-gray-200 mx-1" />

            {/* Excel + Print */}
            <input type="file" accept=".xlsx,.xls" ref={fileInputRef} className="hidden" onChange={handleFileImport} />
            {!isLocked && canEdit("inventory") && (
              <>
                <button onClick={downloadTemplate}
                  className="h-8 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">
                  <Download className="h-3.5 w-3.5" />{isRTL ? "قالب Excel" : "Template"}
                </button>
                <button onClick={() => fileInputRef.current?.click()}
                  className="h-8 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100">
                  <Upload className="h-3.5 w-3.5" />{isRTL ? "استيراد Excel" : "Import"}
                </button>
              </>
            )}
            <button onClick={exportExcel}
              className="h-8 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
              <FileSpreadsheet className="h-3.5 w-3.5" />Excel
            </button>
            <button onClick={() => window.print()}
              className="h-8 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 bg-[color:var(--brand-700)] text-white hover:bg-[color:var(--brand-800)]">
              <Printer className="h-3.5 w-3.5" />{isRTL ? "طباعة" : "Print"}
            </button>
          </div>
          {error && <p className="text-xs text-red-600 max-w-xs text-end">{error}</p>}
        </div>
      </div>

      {/* ── Header card ── */}
      <div className="bg-gradient-to-r from-[color:var(--brand-50)] to-white border border-[color:var(--brand-100)] rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[color:var(--brand-700)] flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[color:var(--brand-700)] uppercase tracking-wider">{t("stockTakeTitle")}</p>
            <p className="text-base font-extrabold text-[color:var(--ink-900)]">{take.takeNumber}</p>
            <p className="text-xs text-[color:var(--ink-500)] mt-0.5">
              {take.takeDate} · {isRTL ? take.warehouseNameAr : (take.warehouseNameEn || take.warehouseNameAr)}
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.tx}`}>
          {isRTL ? cfg.ar : cfg.en}
        </span>
      </div>

      {/* Rejection notice */}
      {take.rejectionReason && status !== "completed" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-bold text-amber-800">{isRTL ? "تم رفض الجرد سابقاً" : "Previously rejected"}</p>
            <p className="text-amber-700">{take.rejectionReason}</p>
          </div>
        </div>
      )}

      {/* ── KPIs ── */}
      <ColorKPIGrid cols={6} items={[
        { label: isRTL ? "إجمالي الأصناف" : "Total Items", value: String(take.totalItems),
          color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd", icon: Hash },
        { label: isRTL ? "تم العد" : "Counted", value: `${take.countedItems}/${take.totalItems}`,
          color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: CheckCircle2,
          hint: take.totalItems > 0 ? `${Math.round((take.countedItems / take.totalItems) * 100)}%` : "0%" },
        { label: isRTL ? "بفروقات" : "With Variance", value: String(take.itemsWithVariance),
          color: "#ca8a04", bg: "#fefce8", border: "#fde68a", icon: AlertTriangle },
        { label: isRTL ? "النقص" : "Shortage", value: formatCurrency(take.shortageValue),
          color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: AlertTriangle },
        { label: isRTL ? "الزيادة" : "Excess", value: formatCurrency(take.excessValue),
          color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: Wallet },
        { label: isRTL ? "صافي الفرق" : "Net Variance", value: formatCurrency(take.totalVarianceValue),
          color: "#6b1523", bg: "#fdf2f4", border: "#6b152330", icon: Wallet, big: true },
      ]} />

      {/* ── Filter pills + Search ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { v: "all",       label: isRTL ? "الكل" : "All",                     n: take.totalItems },
          { v: "uncounted", label: isRTL ? "لم يُعد" : "Not Counted",          n: take.totalItems - take.countedItems },
          { v: "variance",  label: isRTL ? "فيه فرق" : "Has Variance",          n: take.itemsWithVariance },
          { v: "shortage",  label: isRTL ? "نقص فقط" : "Shortage Only",         n: take.lines.filter((l: any) => l.counted && l.variance < 0).length },
          { v: "excess",    label: isRTL ? "زيادة فقط" : "Excess Only",         n: take.lines.filter((l: any) => l.counted && l.variance > 0).length },
        ].map(({ v, label, n }: any) => (
          <button key={v} onClick={() => setFilter(v as any)}
            className={`h-8 px-3 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors ${
              filter === v
                ? "bg-[color:var(--brand-700)] text-white border-[color:var(--brand-700)]"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}>
            {label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === v ? "bg-white/20" : "bg-gray-100"}`}>{n}</span>
          </button>
        ))}
        <div className={`flex-1 min-w-[200px] ${isRTL ? "mr-auto" : "ml-auto"}`}>
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? "right-3" : "left-3"}`} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={isRTL ? "بحث بالكود أو الاسم..." : "Search by code or name..."}
              className={`w-full h-8 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} border border-gray-200 rounded-md text-sm focus:outline-none focus:border-gray-400`} />
          </div>
        </div>
      </div>

      {/* ── Lines table ── */}
      <div className="surface-card overflow-hidden">
        {filteredLines.length === 0 ? (
          <EmptyState title={isRTL ? "لا توجد نتائج" : "No results"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "var(--brand-700)" }}>
                  <th className="px-2 py-2.5 text-start text-[10px] font-bold text-white/90 uppercase w-20">{isRTL ? "الكود" : "Code"}</th>
                  <th className="px-2 py-2.5 text-start text-[10px] font-bold text-white/90 uppercase">{isRTL ? "الصنف" : "Item"}</th>
                  <th className="px-2 py-2.5 text-end text-[10px] font-bold text-white/90 uppercase w-24">{isRTL ? "النظام" : "System"}</th>
                  <th className="px-2 py-2.5 text-center text-[10px] font-bold text-white/90 uppercase w-36">{isRTL ? "الفعلي" : "Physical"}</th>
                  <th className="px-2 py-2.5 text-end text-[10px] font-bold text-white/90 uppercase w-24">{isRTL ? "الفرق" : "Variance"}</th>
                  <th className="px-2 py-2.5 text-end text-[10px] font-bold text-white/90 uppercase w-20">{isRTL ? "السعر" : "Cost"}</th>
                  <th className="px-2 py-2.5 text-end text-[10px] font-bold text-white/90 uppercase w-24">{isRTL ? "قيمة الفرق" : "Var. Value"}</th>
                  <th className="px-2 py-2.5 text-start text-[10px] font-bold text-white/90 uppercase w-32">{isRTL ? "السبب" : "Reason"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLines.map((l: any, i: number) => {
                  const rowBg =
                    !l.counted ? "bg-white" :
                    l.variance === 0 ? "bg-emerald-50/30" :
                    l.variance < 0 ? "bg-red-50/30" : "bg-blue-50/30";
                  return (
                    <tr key={l._id} className={rowBg}>
                      <td className="px-2 py-2 font-mono text-[11px] text-gray-500">{l.itemCode}</td>
                      <td className="px-2 py-2">
                        <div className="font-semibold text-gray-900 truncate" title={isRTL ? l.itemNameAr : l.itemNameEn}>
                          {isRTL ? l.itemNameAr : (l.itemNameEn || l.itemNameAr)}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-end">
                        <span className="font-semibold text-gray-700 tabular-nums">{l.systemQty.toFixed(2)}</span>
                        <span className="ms-1 text-[10px] uppercase text-gray-400">{isRTL ? l.uomNameAr : (l.uomNameEn || l.uomNameAr)}</span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <CountCell line={l} disabled={isLocked} isRTL={isRTL}
                          onUpdate={(p: any) => handleLineUpdate(l._id, l, p)} />
                      </td>
                      <td className="px-2 py-2 text-end">
                        {!l.counted ? <span className="text-gray-300">—</span>
                         : l.variance === 0 ? <span className="text-emerald-600 font-bold">0</span>
                         : (
                          <>
                            <span className={`font-bold tabular-nums ${l.variance < 0 ? "text-red-600" : "text-blue-600"}`}>
                              {l.variance > 0 ? "+" : ""}{l.variance.toFixed(2)}
                            </span>
                            <span className="ms-1 text-[10px] uppercase text-gray-400">{isRTL ? l.uomNameAr : (l.uomNameEn || l.uomNameAr)}</span>
                          </>
                        )}
                      </td>
                      <td className="px-2 py-2 text-end tabular-nums text-gray-600">{l.unitCost.toFixed(2)}</td>
                      <td className="px-2 py-2 text-end tabular-nums">
                        {!l.counted || l.variance === 0 ? <span className="text-gray-300">—</span>
                         : l.variance < 0
                            ? <span className="font-bold text-red-700">{formatCurrency(l.varianceValue)}</span>
                            : <span className="font-bold text-emerald-700">+{formatCurrency(l.varianceValue)}</span>}
                      </td>
                      <td className="px-2 py-2">
                        <ReasonSelect line={l} isRTL={isRTL} disabled={isLocked}
                          onUpdate={(p: any) => handleLineUpdate(l._id, l, p)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Approve Modal ── */}
      {showApproveModal && (
        <ApproveModal
          take={take}
          accounts={allAccounts}
          isRTL={isRTL}
          formatCurrency={formatCurrency}
          busy={busy}
          onCancel={() => setShowApproveModal(false)}
          onConfirm={onApproveConfirm}
          error={error}
        />
      )}

      {/* ── Reject Modal ── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,19,22,0.6)] p-4" onClick={() => !busy && setShowRejectModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-900 mb-3">{isRTL ? "رفض الجرد" : "Reject Stock Take"}</h3>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4}
              placeholder={isRTL ? "اكتب سبب الرفض..." : "Reason for rejection..."}
              className="input-field w-full resize-none" />
            <div className="flex items-center justify-end gap-2 mt-4">
              <button onClick={() => setShowRejectModal(false)} className="h-9 px-4 rounded-lg text-sm font-semibold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50">
                {isRTL ? "إلغاء" : "Cancel"}
              </button>
              <button onClick={onReject} disabled={busy || !rejectReason.trim()}
                className="h-9 px-4 rounded-lg text-sm font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50">
                {isRTL ? "إرسال الرفض" : "Send Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Approve Modal Component ────────────────────────────────────────────────
function ApproveModal({ take, accounts, isRTL, formatCurrency, busy, onCancel, onConfirm, error }: any) {
  const inventoryAccounts = accounts.filter((a: any) => a.isPostable && a.isActive && a.operationalType === "inventory_asset");
  const expenseAccounts   = accounts.filter((a: any) => a.isPostable && a.isActive && a.accountType === "expense");

  // Auto-suggest first matches
  const defaultInv = inventoryAccounts[0];
  const defaultVar = expenseAccounts.find((a: any) => {
    const t = `${(a.nameAr ?? "").toLowerCase()} ${(a.nameEn ?? "").toLowerCase()}`;
    return t.includes("variance") || t.includes("فروقات") || t.includes("جرد") || t.includes("adjustment");
  }) ?? expenseAccounts[0];

  const [createAdj, setCreateAdj] = useState(true);
  const [invAcc, setInvAcc] = useState<string>(defaultInv?._id ?? "");
  const [varAcc, setVarAcc] = useState<string>(defaultVar?._id ?? "");

  const hasVariance = take.totalVarianceValue !== 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,19,22,0.6)] p-4" onClick={() => !busy && onCancel()}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white">
          <h3 className="text-base font-bold text-gray-900">{isRTL ? "اعتماد جرد المخزون" : "Approve Stock Take"}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{take.takeNumber}</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Variance summary */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-red-50 border border-red-100 rounded-lg p-3">
              <p className="text-[10px] font-bold text-red-700 uppercase">{isRTL ? "النقص" : "Shortage"}</p>
              <p className="text-base font-extrabold text-red-800 tabular-nums">{formatCurrency(take.shortageValue)}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
              <p className="text-[10px] font-bold text-emerald-700 uppercase">{isRTL ? "الزيادة" : "Excess"}</p>
              <p className="text-base font-extrabold text-emerald-800 tabular-nums">{formatCurrency(take.excessValue)}</p>
            </div>
            <div className="bg-violet-50 border border-violet-100 rounded-lg p-3">
              <p className="text-[10px] font-bold text-violet-700 uppercase">{isRTL ? "الصافي" : "Net"}</p>
              <p className="text-base font-extrabold text-violet-800 tabular-nums">{formatCurrency(take.totalVarianceValue)}</p>
            </div>
          </div>

          {/* Adjustment toggle */}
          <label className="flex items-start gap-3 p-3 border-2 border-violet-200 bg-violet-50 rounded-xl cursor-pointer">
            <input type="checkbox" checked={createAdj} onChange={(e) => setCreateAdj(e.target.checked)}
              className="mt-1" disabled={!hasVariance} />
            <div className="flex-1">
              <p className="text-sm font-bold text-violet-900">
                {isRTL ? "إنشاء سند تسوية محاسبية" : "Create accounting adjustment"}
              </p>
              <p className="text-xs text-violet-700 mt-0.5">
                {hasVariance
                  ? (isRTL ? "سيتم إنشاء قيد محاسبي تلقائي وتعديل الأرصدة لتطابق الواقع" : "Auto-creates a journal entry and updates stock balances to match reality")
                  : (isRTL ? "لا توجد فروقات — لا حاجة لتسوية" : "No variances — no adjustment needed")}
              </p>
            </div>
          </label>

          {createAdj && hasVariance && (
            <>
              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                  {isRTL ? "حساب المخزون" : "Inventory Account"} *
                </label>
                <select value={invAcc} onChange={(e) => setInvAcc(e.target.value)} className="input-field h-9 w-full">
                  <option value="">— {isRTL ? "اختر" : "select"} —</option>
                  {inventoryAccounts.map((a: any) => (
                    <option key={a._id} value={a._id}>{a.code} — {isRTL ? a.nameAr : (a.nameEn || a.nameAr)}</option>
                  ))}
                </select>
                {inventoryAccounts.length === 0 && (
                  <p className="text-[11px] text-amber-700 mt-1">⚠️ {isRTL ? "لم يتم تصنيف حساب المخزون. اذهب لشجرة الحسابات أولاً." : "No inventory account classified. Go to Chart of Accounts first."}</p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                  {isRTL ? "حساب فروقات الجرد (مصروف)" : "Variance Account (Expense)"} *
                </label>
                <select value={varAcc} onChange={(e) => setVarAcc(e.target.value)} className="input-field h-9 w-full">
                  <option value="">— {isRTL ? "اختر" : "select"} —</option>
                  {expenseAccounts.map((a: any) => (
                    <option key={a._id} value={a._id}>{a.code} — {isRTL ? a.nameAr : (a.nameEn || a.nameAr)}</option>
                  ))}
                </select>
              </div>

              {/* Journal preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">{isRTL ? "القيد المحاسبي المتوقع" : "Expected Journal Entry"}</p>
                <div className="text-xs space-y-1 font-mono">
                  {take.totalVarianceValue > 0 ? (
                    <>
                      <div className="flex justify-between"><span>Dr: Inventory</span><span className="font-bold tabular-nums">{formatCurrency(take.totalVarianceValue)}</span></div>
                      <div className="flex justify-between text-gray-700"><span>Cr: Variance Income</span><span className="font-bold tabular-nums">{formatCurrency(take.totalVarianceValue)}</span></div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between"><span>Dr: Variance Expense</span><span className="font-bold tabular-nums">{formatCurrency(Math.abs(take.totalVarianceValue))}</span></div>
                      <div className="flex justify-between text-gray-700"><span>Cr: Inventory</span><span className="font-bold tabular-nums">{formatCurrency(Math.abs(take.totalVarianceValue))}</span></div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">{error}</div>}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
          <button onClick={onCancel} disabled={busy}
            className="h-9 px-4 rounded-lg text-sm font-semibold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
            {isRTL ? "إلغاء" : "Cancel"}
          </button>
          <button
            onClick={() => onConfirm(createAdj && hasVariance, createAdj && hasVariance ? { invAcc, varAcc } : undefined)}
            disabled={busy || (createAdj && hasVariance && (!invAcc || !varAcc))}
            className="h-9 px-4 rounded-lg text-sm font-bold inline-flex items-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
            <CheckCircle2 className="h-4 w-4" />
            {busy ? (isRTL ? "جاري..." : "Working...")
              : createAdj && hasVariance ? (isRTL ? "اعتماد + تسوية" : "Approve + Adjust")
              : (isRTL ? "اعتماد فقط" : "Approve Only")}
          </button>
        </div>
      </div>
    </div>
  );
}
