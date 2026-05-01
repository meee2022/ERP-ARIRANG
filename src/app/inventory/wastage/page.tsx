// @ts-nocheck
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Trash2, Plus, RefreshCw, CheckCircle2, X, Save, AlertTriangle,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import { toast } from "@/store/toastStore";

const REASONS = [
  { value: "expired",         ar: "منتهي الصلاحية",  en: "Expired"         },
  { value: "damaged",         ar: "تالف / كسر",       en: "Damaged"         },
  { value: "production_loss", ar: "فقد إنتاج",         en: "Production Loss" },
  { value: "other",           ar: "أخرى",             en: "Other"           },
];

type WastageLine = { itemId: string; quantity: number; uomId: string; unitCost: number; notes?: string };

export default function WastagePage() {
  const { isRTL } = useI18n();
  const { currentUser } = useAuth();
  const userId = currentUser?._id;

  const companies   = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId   = companies[0]?._id;
  const allBranches = useQuery(api.branches.getAll, companyId ? { companyId } : "skip") ?? [];
  const branchId    = allBranches[0]?._id;

  const entries    = useQuery(api.wastage.listWastageEntries, companyId ? { companyId } : "skip") ?? [];
  const allItems   = useQuery(api.items.getAllItems,           companyId ? { companyId } : "skip") ?? [];
  const warehouses = useQuery(api.items.getAllWarehouses,      companyId ? { companyId } : "skip") ?? [];
  const periods    = useQuery(api.fiscalYears.listPeriods,    companyId ? { companyId } : "skip") ?? [];

  const createEntry = useMutation(api.wastage.createWastageEntry);
  const postEntry   = useMutation(api.wastage.postWastageEntry);

  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [posting,  setPosting]  = useState<string | null>(null);
  const [formErr,  setFormErr]  = useState<string | null>(null);

  const today      = new Date().toISOString().slice(0, 10);
  const openPeriod = periods.find((p: any) => p.status === "open");

  const [form, setForm] = useState({ warehouseId: "", entryDate: today, reason: "expired", notes: "" });
  const [lines, setLines] = useState<WastageLine[]>([{ itemId: "", quantity: 1, uomId: "", unitCost: 0 }]);

  if (!companyId) return <LoadingState />;

  const stockItems = allItems.filter((i: any) => i.isActive && i.itemType !== "service");

  function addLine() { setLines((p) => [...p, { itemId: "", quantity: 1, uomId: "", unitCost: 0 }]); }
  function removeLine(idx: number) { setLines((p) => p.filter((_, i) => i !== idx)); }
  function updateLine(idx: number, field: keyof WastageLine, value: any) {
    setLines((prev) => prev.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [field]: value };
      if (field === "itemId") {
        const item = allItems.find((it: any) => it._id === value);
        if (item) {
          updated.uomId    = item.baseUomId ?? l.uomId;
          // fallback: avgCost → standardCost → lastCost → 0
          updated.unitCost = item.avgCost || item.standardCost || item.lastCost || 0;
        }
      }
      return updated;
    }));
  }

  // check if any selected line has zero cost (needs manual entry)
  const hasZeroCost = lines.some((l) => l.itemId && l.unitCost === 0);

  async function handleSubmit() {
    if (!openPeriod)  { setFormErr(isRTL ? "لا توجد سنة مالية مفتوحة" : "No open fiscal period"); return; }
    if (!form.warehouseId) { setFormErr(isRTL ? "حدد المستودع" : "Select warehouse"); return; }
    if (lines.some((l) => !l.itemId || l.quantity <= 0)) { setFormErr(isRTL ? "بيانات السطور غير مكتملة" : "Incomplete line data"); return; }

    setSaving(true); setFormErr(null);
    try {
      const result = await createEntry({
        companyId:   companyId as any,
        branchId:    branchId  as any,
        warehouseId: form.warehouseId as any,
        entryDate:   form.entryDate,
        periodId:    openPeriod._id as any,
        reason:      form.reason,
        notes:       form.notes || undefined,
        createdBy:   (userId ?? branchId) as any,
        lines: lines.map((l) => ({
          itemId:   l.itemId   as any,
          quantity: l.quantity,
          uomId:    l.uomId    as any,
          unitCost: l.unitCost,
          notes:    l.notes,
        })),
      });
      toast.success(isRTL
        ? `تم إنشاء سجل الهدر ${result.entryNumber} بنجاح`
        : `Wastage entry ${result.entryNumber} created`);
      setShowForm(false);
      setLines([{ itemId: "", quantity: 1, uomId: "", unitCost: 0 }]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePost(entryId: string) {
    setPosting(entryId);
    try {
      await postEntry({ entryId: entryId as any, userId: (userId ?? branchId) as any });
      toast.success(isRTL ? "تم الترحيل بنجاح" : "Posted successfully");
    } catch (e: any) {
      toast.error(e.message);
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
          { label: isRTL ? "إجمالي هذا الشهر" : "Total This Month", value: `${totalThisMonth.toFixed(2)} ${isRTL ? "ر.ق" : "QAR"}`, colorClass: "text-red-600",    borderClass: "border-red-100"    },
          { label: isRTL ? "سجلات معلقة"       : "Pending Entries",  value: entries.filter((e: any) => e.postingStatus === "unposted").length,                         colorClass: "text-amber-600",  borderClass: "border-amber-100"  },
          { label: isRTL ? "إجمالي السجلات"    : "Total Entries",    value: entries.length,                                                                            colorClass: "text-[color:var(--ink-600)]", borderClass: "border-[color:var(--ink-100)]" },
        ].map(({ label, value, colorClass, borderClass }) => (
          <div key={label} className={`rounded-xl border ${borderClass} bg-white p-4 text-center`}>
            <p className={`text-[22px] font-bold ${colorClass}`}>{value}</p>
            <p className="text-[11px] mt-0.5 text-[color:var(--ink-400)]">{label}</p>
          </div>
        ))}
      </div>

      {/* Add button */}
      <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-[13px]">
        <Plus className="h-4 w-4" />
        {isRTL ? "تسجيل هدر جديد" : "New Wastage Entry"}
      </button>

      {/* ── New Entry Form ── */}
      {showForm && (
        <div className="rounded-2xl border border-[color:var(--ink-100)] bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-[color:var(--ink-100)] bg-[color:var(--ink-50)]">
            <p className="text-[13px] font-semibold text-[color:var(--ink-800)]">
              {isRTL ? "بيانات الهدر" : "Wastage Entry"}
            </p>
          </div>

          <div className="p-5 space-y-4">
            {formErr && (
              <div className="rounded-lg p-3 border border-red-200 bg-red-50 flex items-center gap-3">
                <p className="text-[12px] text-red-700 flex-1">{formErr}</p>
                <button onClick={() => setFormErr(null)}><X className="h-3.5 w-3.5 text-red-400" /></button>
              </div>
            )}

            {/* Header fields */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] mb-1 block text-[color:var(--ink-600)]">{isRTL ? "التاريخ" : "Date"}</label>
                <input type="date" value={form.entryDate}
                  onChange={(e) => setForm((f) => ({ ...f, entryDate: e.target.value }))}
                  className="input-field w-full text-[12px]" />
              </div>
              <div>
                <label className="text-[11px] mb-1 block text-[color:var(--ink-600)]">{isRTL ? "المستودع" : "Warehouse"}</label>
                <select value={form.warehouseId}
                  onChange={(e) => setForm((f) => ({ ...f, warehouseId: e.target.value }))}
                  className="input-field w-full text-[12px]">
                  <option value="">{isRTL ? "— اختر —" : "— Select —"}</option>
                  {warehouses.map((w: any) => (
                    <option key={w._id} value={w._id}>{isRTL ? w.nameAr : w.nameEn || w.nameAr}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] mb-1 block text-[color:var(--ink-600)]">{isRTL ? "السبب" : "Reason"}</label>
                <select value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  className="input-field w-full text-[12px]">
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{isRTL ? r.ar : r.en}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] mb-1 block text-[color:var(--ink-600)]">{isRTL ? "ملاحظات" : "Notes"}</label>
                <input value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="input-field w-full text-[12px]" />
              </div>
            </div>

            {/* Zero-cost warning */}
            {hasZeroCost && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] font-semibold text-amber-800">
                    {isRTL ? "تكلفة الصنف غير محددة" : "Item cost not found"}
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    {isRTL
                      ? "هذا الصنف منتج نهائي أو لم يتم شراؤه بعد — أدخل تكلفة الإنتاج يدوياً في حقل التكلفة."
                      : "This item is a finished good or has no purchase history — enter the production cost manually in the cost field."}
                  </p>
                </div>
              </div>
            )}

            {/* Lines */}
            <div className="rounded-xl border border-[color:var(--ink-100)] overflow-hidden">
              <div className="px-4 py-2 border-b border-[color:var(--ink-100)] flex items-center justify-between bg-[color:var(--ink-50)]">
                <p className="text-[11.5px] font-semibold text-[color:var(--ink-700)]">
                  {isRTL ? "أصناف الهدر" : "Wastage Items"}
                </p>
                <button onClick={addLine}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                  <Plus className="h-3 w-3" />{isRTL ? "إضافة سطر" : "Add Line"}
                </button>
              </div>
              <div className="p-3 space-y-2">
                {lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                    <div className="col-span-2">
                      <select value={line.itemId}
                        onChange={(e) => updateLine(idx, "itemId", e.target.value)}
                        className="input-field w-full text-[11.5px]">
                        <option value="">{isRTL ? "— اختر صنفاً —" : "— Select item —"}</option>
                        {stockItems.map((it: any) => (
                          <option key={it._id} value={it._id}>
                            {it.code} — {isRTL ? it.nameAr : it.nameEn || it.nameAr}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input type="number" min="0.001" step="0.001" value={line.quantity}
                        onChange={(e) => updateLine(idx, "quantity", parseFloat(e.target.value) || 0)}
                        placeholder={isRTL ? "الكمية" : "Qty"}
                        className="input-field w-full text-[11.5px] text-center" />
                    </div>
                    <div>
                      <input type="number" min="0" step="0.001" value={line.unitCost}
                        onChange={(e) => updateLine(idx, "unitCost", parseFloat(e.target.value) || 0)}
                        placeholder={isRTL ? "التكلفة" : "Unit Cost"}
                        className={`input-field w-full text-[11.5px] text-center ${line.itemId && line.unitCost === 0 ? "border-amber-300 bg-amber-50 focus:border-amber-400" : ""}`} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11.5px] font-bold text-red-600">
                        {(line.quantity * line.unitCost).toFixed(3)}
                      </span>
                      {lines.length > 1 && (
                        <button onClick={() => removeLine(idx)}
                          className="p-1 rounded-lg hover:bg-red-50 transition-colors">
                          <X className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-[color:var(--ink-100)] flex justify-end">
                  <p className="text-[13px] font-bold text-red-600">
                    {isRTL ? "الإجمالي: " : "Total: "}
                    {lines.reduce((s, l) => s + l.quantity * l.unitCost, 0).toFixed(3)} {isRTL ? "ر.ق" : "QAR"}
                  </p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button onClick={handleSubmit} disabled={saving}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[13px] disabled:opacity-60">
              {saving
                ? <><RefreshCw className="h-4 w-4 animate-spin" />{isRTL ? "جارٍ الحفظ..." : "Saving..."}</>
                : <><Save className="h-4 w-4" />{isRTL ? "حفظ سجل الهدر" : "Save Entry"}</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Entries List ── */}
      <div className="rounded-2xl border border-[color:var(--ink-100)] bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-[color:var(--ink-100)] bg-[color:var(--ink-50)]">
          <p className="text-[12px] font-semibold text-[color:var(--ink-800)]">
            {isRTL ? "سجلات الهدر" : "Wastage Entries"}
          </p>
        </div>

        {entries.length === 0 ? (
          <div className="p-8 text-center">
            <div className="h-10 w-10 rounded-2xl bg-[color:var(--ink-50)] flex items-center justify-center mx-auto mb-2">
              <Trash2 className="h-5 w-5 text-[color:var(--ink-400)]" />
            </div>
            <p className="text-[13px] text-[color:var(--ink-400)]">
              {isRTL ? "لا توجد سجلات هدر بعد" : "No wastage entries yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: "#6b1523" }}>
                  {[
                    isRTL ? "رقم السجل" : "Entry #",
                    isRTL ? "التاريخ"   : "Date",
                    isRTL ? "السبب"     : "Reason",
                    isRTL ? "الإجمالي"  : "Total",
                    isRTL ? "الحالة"    : "Status",
                    isRTL ? "إجراء"     : "Action",
                  ].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-start font-semibold text-white/80">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry: any) => {
                  const reasonObj = REASONS.find((r) => r.value === entry.reason);
                  return (
                    <tr key={entry._id} className="border-b border-[color:var(--ink-50)] hover:bg-[color:var(--ink-50)] transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] font-bold text-[color:var(--brand-700)]">
                        {entry.entryNumber}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--ink-400)]">{entry.entryDate}</td>
                      <td className="px-4 py-3 text-[color:var(--ink-800)]">
                        {isRTL ? reasonObj?.ar : reasonObj?.en}
                      </td>
                      <td className="px-4 py-3 font-bold text-red-600">
                        {entry.totalCost.toFixed(3)} {isRTL ? "ر.ق" : "QAR"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={entry.postingStatus === "posted"
                            ? { background: "#dcfce7", color: "#16a34a" }
                            : { background: "#fef3c7", color: "#d97706" }}>
                          {entry.postingStatus === "posted"
                            ? (isRTL ? "مرحل"  : "Posted")
                            : (isRTL ? "معلق"  : "Pending")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {entry.postingStatus === "unposted" && (
                          <button
                            onClick={() => handlePost(entry._id)}
                            disabled={posting === entry._id}
                            className="flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50 transition-colors">
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
