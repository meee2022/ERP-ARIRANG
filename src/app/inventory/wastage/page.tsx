// @ts-nocheck
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Trash2, Plus, RefreshCw, CheckCircle2, AlertTriangle,
  Package, Calendar, ChevronDown, X, Save,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";

const REASONS = [
  { value: "expired",         ar: "منتهي الصلاحية",    en: "Expired"         },
  { value: "damaged",         ar: "تالف / كسر",         en: "Damaged"         },
  { value: "production_loss", ar: "فقد إنتاج",           en: "Production Loss" },
  { value: "other",           ar: "أخرى",               en: "Other"           },
];

type WastageLine = {
  itemId:   string;
  quantity: number;
  uomId:    string;
  unitCost: number;
  notes?:   string;
};

export default function WastagePage() {
  const { isRTL } = useI18n();
  const { currentUser } = useAuth();
  const userId = currentUser?._id;

  const companies   = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId   = companies[0]?._id;

  const allBranches = useQuery(api.branches.getAll, companyId ? { companyId } : "skip") ?? [];
  const branchId    = allBranches[0]?._id;

  const entries     = useQuery(api.wastage.listWastageEntries, companyId ? { companyId } : "skip") ?? [];
  const allItems    = useQuery(api.items.getAllItems, companyId ? { companyId } : "skip") ?? [];
  const warehouses  = useQuery(api.items.getAllWarehouses, companyId ? { companyId } : "skip") ?? [];
  const units       = useQuery(api.items.getAllUnits, companyId ? { companyId } : "skip") ?? [];
  const periods     = useQuery(api.fiscalYears.listPeriods, companyId ? { companyId } : "skip") ?? [];

  const createEntry = useMutation(api.wastage.createWastageEntry);
  const postEntry   = useMutation(api.wastage.postWastageEntry);

  const [showForm,    setShowForm]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [posting,     setPosting]     = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [successMsg,  setSuccessMsg]  = useState<string | null>(null);

  // Form state
  const today = new Date().toISOString().slice(0, 10);
  const openPeriod = periods.find((p: any) => p.status === "open");

  const [form, setForm] = useState({
    warehouseId: "",
    entryDate:   today,
    reason:      "expired",
    notes:       "",
  });
  const [lines, setLines] = useState<WastageLine[]>([
    { itemId: "", quantity: 1, uomId: "", unitCost: 0 },
  ]);

  if (!companyId) return <LoadingState />;

  const stockItems = allItems.filter((i: any) => i.isActive && i.itemType !== "service");

  function addLine() {
    setLines((prev) => [...prev, { itemId: "", quantity: 1, uomId: "", unitCost: 0 }]);
  }
  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateLine(idx: number, field: keyof WastageLine, value: any) {
    setLines((prev) => prev.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [field]: value };
      // Auto-fill uomId when item is selected
      if (field === "itemId") {
        const item = allItems.find((it: any) => it._id === value);
        if (item) {
          updated.uomId    = item.baseUomId ?? l.uomId;
          updated.unitCost = item.avgCost   ?? 0;
        }
      }
      return updated;
    }));
  }

  async function handleSubmit() {
    if (!openPeriod) { setError(isRTL ? "لا توجد سنة مالية مفتوحة" : "No open fiscal period"); return; }
    if (!form.warehouseId) { setError(isRTL ? "حدد المستودع" : "Select warehouse"); return; }
    if (lines.some((l) => !l.itemId || l.quantity <= 0)) {
      setError(isRTL ? "بيانات السطور غير مكتملة" : "Incomplete line data"); return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await createEntry({
        companyId:   companyId as any,
        branchId:    branchId as any,
        warehouseId: form.warehouseId as any,
        entryDate:   form.entryDate,
        periodId:    openPeriod._id as any,
        reason:      form.reason,
        notes:       form.notes || undefined,
        createdBy:   (userId ?? branchId) as any,
        lines:       lines.map((l) => ({
          itemId:   l.itemId as any,
          quantity: l.quantity,
          uomId:    l.uomId as any,
          unitCost: l.unitCost,
          notes:    l.notes,
        })),
      });

      setSuccessMsg(isRTL
        ? `✅ تم إنشاء سجل الهدر ${result.entryNumber} بنجاح`
        : `✅ Wastage entry ${result.entryNumber} created`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setShowForm(false);
      setLines([{ itemId: "", quantity: 1, uomId: "", unitCost: 0 }]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePost(entryId: string) {
    setPosting(entryId);
    setError(null);
    try {
      await postEntry({ entryId: entryId as any, userId: (userId ?? branchId) as any });
      setSuccessMsg(isRTL ? "✅ تم الترحيل بنجاح" : "✅ Posted successfully");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPosting(null);
    }
  }

  const totalThisMonth = entries
    .filter((e: any) => e.entryDate?.slice(0, 7) === today.slice(0, 7))
    .reduce((s: number, e: any) => s + e.totalCost, 0);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={isRTL ? "الهدر والتالف" : "Wastage & Spoilage"}
        subtitle={isRTL
          ? "تسجيل وترحيل الهدر والتالف وتأثيره على المخزون والمحاسبة"
          : "Record wastage and spoilage, with automatic stock deduction and journal entry"}
        icon={Trash2}
        iconColor="#f87171"
      />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: isRTL ? "إجمالي هذا الشهر" : "Total This Month", value: `${totalThisMonth.toFixed(2)} ${isRTL ? "ر.ق" : "QAR"}`, color: "#f87171" },
          { label: isRTL ? "سجلات معلقة"       : "Pending Entries",  value: entries.filter((e: any) => e.postingStatus === "unposted").length, color: "#fbbf24" },
          { label: isRTL ? "إجمالي السجلات"    : "Total Entries",    value: entries.length, color: "#94a3b8" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border p-4 text-center"
            style={{ background: "var(--card)", borderColor: "rgba(255,255,255,0.1)" }}>
            <p className="text-[22px] font-bold" style={{ color }}>{value}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Banners */}
      {successMsg && (
        <div className="rounded-xl p-3 border border-green-500/30 flex items-center gap-3" style={{ background: "#34d39910" }}>
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <p className="text-[12px]" style={{ color: "#34d399" }}>{successMsg}</p>
        </div>
      )}
      {error && (
        <div className="rounded-xl p-3 border border-red-500/30 flex items-center gap-3" style={{ background: "#f8717110" }}>
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <p className="text-[12px]" style={{ color: "#f87171" }}>{error}</p>
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-3.5 w-3.5 text-red-400" /></button>
        </div>
      )}

      {/* Add button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-[13px] transition-all"
        style={{ background: "linear-gradient(135deg,#dc2626,#b91c1c)", color: "white" }}>
        <Plus className="h-4 w-4" />
        {isRTL ? "تسجيل هدر جديد" : "New Wastage Entry"}
      </button>

      {/* ── New Entry Form ── */}
      {showForm && (
        <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "rgba(255,255,255,0.1)" }}>
          <div className="px-5 py-3 border-b border-white/8" style={{ background: "var(--background)" }}>
            <p className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
              {isRTL ? "بيانات الهدر" : "Wastage Entry"}
            </p>
          </div>

          <div className="p-5 space-y-4">
            {/* Header fields */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Date */}
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: "var(--muted-foreground)" }}>
                  {isRTL ? "التاريخ" : "Date"}
                </label>
                <input type="date" value={form.entryDate}
                  onChange={(e) => setForm((f) => ({ ...f, entryDate: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-[12px] border outline-none"
                  style={{ background: "var(--background)", borderColor: "rgba(255,255,255,0.12)", color: "var(--foreground)" }} />
              </div>
              {/* Warehouse */}
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: "var(--muted-foreground)" }}>
                  {isRTL ? "المستودع" : "Warehouse"}
                </label>
                <select value={form.warehouseId}
                  onChange={(e) => setForm((f) => ({ ...f, warehouseId: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-[12px] border outline-none"
                  style={{ background: "var(--background)", borderColor: "rgba(255,255,255,0.12)", color: "var(--foreground)" }}>
                  <option value="">{isRTL ? "— اختر —" : "— Select —"}</option>
                  {warehouses.map((w: any) => (
                    <option key={w._id} value={w._id}>{isRTL ? w.nameAr : w.nameEn || w.nameAr}</option>
                  ))}
                </select>
              </div>
              {/* Reason */}
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: "var(--muted-foreground)" }}>
                  {isRTL ? "السبب" : "Reason"}
                </label>
                <select value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-[12px] border outline-none"
                  style={{ background: "var(--background)", borderColor: "rgba(255,255,255,0.12)", color: "var(--foreground)" }}>
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{isRTL ? r.ar : r.en}</option>
                  ))}
                </select>
              </div>
              {/* Notes */}
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: "var(--muted-foreground)" }}>
                  {isRTL ? "ملاحظات" : "Notes"}
                </label>
                <input value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-[12px] border outline-none"
                  style={{ background: "var(--background)", borderColor: "rgba(255,255,255,0.12)", color: "var(--foreground)" }} />
              </div>
            </div>

            {/* Lines */}
            <div className="rounded-xl border border-white/8 overflow-hidden">
              <div className="px-4 py-2 border-b border-white/8 flex items-center justify-between"
                style={{ background: "var(--background)" }}>
                <p className="text-[11.5px] font-semibold" style={{ color: "var(--foreground)" }}>
                  {isRTL ? "أصناف الهدر" : "Wastage Items"}
                </p>
                <button onClick={addLine} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg"
                  style={{ background: "#f8717120", color: "#f87171" }}>
                  <Plus className="h-3 w-3" />{isRTL ? "إضافة سطر" : "Add Line"}
                </button>
              </div>
              <div className="p-3 space-y-2">
                {lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                    {/* Item */}
                    <div className="col-span-2">
                      <select value={line.itemId}
                        onChange={(e) => updateLine(idx, "itemId", e.target.value)}
                        className="w-full rounded-lg px-2 py-1.5 text-[11.5px] border outline-none"
                        style={{ background: "var(--background)", borderColor: "rgba(255,255,255,0.12)", color: "var(--foreground)" }}>
                        <option value="">{isRTL ? "— اختر صنفاً —" : "— Select item —"}</option>
                        {stockItems.map((it: any) => (
                          <option key={it._id} value={it._id}>
                            {it.code} — {isRTL ? it.nameAr : it.nameEn || it.nameAr}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Qty */}
                    <div>
                      <input type="number" min="0.001" step="0.001" value={line.quantity}
                        onChange={(e) => updateLine(idx, "quantity", parseFloat(e.target.value) || 0)}
                        placeholder={isRTL ? "الكمية" : "Qty"}
                        className="w-full rounded-lg px-2 py-1.5 text-[11.5px] border outline-none text-center"
                        style={{ background: "var(--background)", borderColor: "rgba(255,255,255,0.12)", color: "var(--foreground)" }} />
                    </div>
                    {/* Unit cost */}
                    <div>
                      <input type="number" min="0" step="0.001" value={line.unitCost}
                        onChange={(e) => updateLine(idx, "unitCost", parseFloat(e.target.value) || 0)}
                        placeholder={isRTL ? "التكلفة" : "Unit Cost"}
                        className="w-full rounded-lg px-2 py-1.5 text-[11.5px] border outline-none text-center"
                        style={{ background: "var(--background)", borderColor: "rgba(255,255,255,0.12)", color: "var(--foreground)" }} />
                    </div>
                    {/* Total + delete */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11.5px] font-bold" style={{ color: "#f87171" }}>
                        {(line.quantity * line.unitCost).toFixed(3)}
                      </span>
                      {lines.length > 1 && (
                        <button onClick={() => removeLine(idx)}
                          className="p-1 rounded-lg hover:bg-red-500/20 transition-colors">
                          <X className="h-3.5 w-3.5" style={{ color: "#f87171" }} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {/* Total */}
                <div className="pt-2 border-t border-white/8 flex justify-end">
                  <p className="text-[13px] font-bold" style={{ color: "#f87171" }}>
                    {isRTL ? "الإجمالي: " : "Total: "}
                    {lines.reduce((s, l) => s + l.quantity * l.unitCost, 0).toFixed(3)} {isRTL ? "ر.ق" : "QAR"}
                  </p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button onClick={handleSubmit} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[13px] transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#dc2626,#b91c1c)", color: "white" }}>
              {saving
                ? <><RefreshCw className="h-4 w-4 animate-spin" />{isRTL ? "جارٍ الحفظ..." : "Saving..."}</>
                : <><Save className="h-4 w-4" />{isRTL ? "حفظ سجل الهدر" : "Save Entry"}</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Entries List ── */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "rgba(255,255,255,0.1)" }}>
        <div className="px-5 py-3 border-b border-white/8" style={{ background: "var(--background)" }}>
          <p className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>
            {isRTL ? "سجلات الهدر" : "Wastage Entries"}
          </p>
        </div>

        {entries.length === 0 ? (
          <div className="p-8 text-center">
            <Trash2 className="h-8 w-8 mx-auto mb-2" style={{ color: "var(--muted-foreground)" }} />
            <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
              {isRTL ? "لا توجد سجلات هدر بعد" : "No wastage entries yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: "var(--background)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {[
                    isRTL ? "رقم السجل" : "Entry #",
                    isRTL ? "التاريخ"   : "Date",
                    isRTL ? "السبب"     : "Reason",
                    isRTL ? "الإجمالي"  : "Total",
                    isRTL ? "الحالة"    : "Status",
                    isRTL ? "إجراء"     : "Action",
                  ].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-start font-semibold"
                      style={{ color: "var(--muted-foreground)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry: any) => {
                  const reasonObj = REASONS.find((r) => r.value === entry.reason);
                  return (
                    <tr key={entry._id} className="border-b border-white/5 hover:bg-white/3">
                      <td className="px-4 py-3 font-mono text-[11px]" style={{ color: "#22d3ee" }}>
                        {entry.entryNumber}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>
                        {entry.entryDate}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--foreground)" }}>
                        {isRTL ? reasonObj?.ar : reasonObj?.en}
                      </td>
                      <td className="px-4 py-3 font-bold" style={{ color: "#f87171" }}>
                        {entry.totalCost.toFixed(3)} {isRTL ? "ر.ق" : "QAR"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={entry.postingStatus === "posted"
                            ? { background: "#34d39920", color: "#34d399" }
                            : { background: "#fbbf2420", color: "#fbbf24" }}>
                          {entry.postingStatus === "posted"
                            ? (isRTL ? "مرحل" : "Posted")
                            : (isRTL ? "معلق" : "Pending")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {entry.postingStatus === "unposted" && (
                          <button
                            onClick={() => handlePost(entry._id)}
                            disabled={posting === entry._id}
                            className="flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-50"
                            style={{ background: "#0891b220", color: "#22d3ee" }}>
                            {posting === entry._id
                              ? <RefreshCw className="h-3 w-3 animate-spin" />
                              : <CheckCircle2 className="h-3 w-3" />}
                            {isRTL ? "رحّل" : "Post"}
                          </button>
                        )}
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
