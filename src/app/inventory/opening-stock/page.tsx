// @ts-nocheck
"use client";
import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  PackageOpen, Plus, Trash2, Check, X, AlertTriangle, Info, Archive,
} from "lucide-react";

function todayISO() { return new Date().toISOString().split("T")[0]; }

// ─── Line type ────────────────────────────────────────────────────────────────

interface StockLine {
  id: number;
  itemId: string;
  quantity: string;
  unitCost: string;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function OpeningStockPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { canCreate } = usePermissions();
  const { currentUser } = useAuth();
  const selectedBranchStore = useAppStore((s) => s.selectedBranch);

  // ── Data queries ──────────────────────────────────────────────────────────
  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];

  const branch = useQuery(
    api.branches.getDefaultBranch,
    company ? { companyId: company._id } : "skip"
  );
  const effectiveBranchId =
    selectedBranchStore !== "all" ? selectedBranchStore : branch?._id;

  const [stockDate, setStockDate] = useState(todayISO());
  const openPeriod = useQuery(
    api.helpers.getOpenPeriod,
    company ? { companyId: company._id, date: stockDate } : "skip"
  );
  const defaultCurrency = useQuery(api.helpers.getDefaultCurrency, {});
  const warehouses = useQuery(
    api.items.getAllWarehouses,
    company ? { companyId: company._id } : "skip"
  );
  const items = useQuery(
    api.items.getAllItems,
    company ? { companyId: company._id } : "skip"
  );

  const createAdjustment = useMutation(api.inventory.createStockAdjustmentImmediate);

  // ── Form state ────────────────────────────────────────────────────────────
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<StockLine[]>([
    { id: 0, itemId: "", quantity: "0", unitCost: "0" },
  ]);
  const [nextId, setNextId] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const activeItems = (items ?? []).filter((i: any) => i.isActive);
  const activeWarehouses = (warehouses ?? []).filter((w: any) => w.isActive);

  // ── Line helpers ──────────────────────────────────────────────────────────
  const addLine = () => {
    setLines((p) => [...p, { id: nextId, itemId: "", quantity: "0", unitCost: "0" }]);
    setNextId((c) => c + 1);
  };

  const removeLine = (id: number) => setLines((p) => p.filter((l) => l.id !== id));

  const updateLine = (id: number, field: keyof StockLine, value: string) => {
    setLines((p) =>
      p.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        // Auto-fill cost from item standard cost
        if (field === "itemId" && value) {
          const found = activeItems.find((it: any) => it._id === value);
          if (found?.standardCost) updated.unitCost = String(found.standardCost);
          else if (found?.lastCost) updated.unitCost = String(found.lastCost);
        }
        return updated;
      })
    );
  };

  // ── Computed totals ───────────────────────────────────────────────────────
  const totalValue = lines.reduce((sum, l) => {
    return sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitCost) || 0);
  }, 0);

  const totalItems = lines.filter((l) => l.itemId && parseFloat(l.quantity) > 0).length;

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!company) { setError("لا يوجد شركة في النظام"); return; }
    if (!effectiveBranchId) { setError("لا يوجد فرع محدد"); return; }
    if (!openPeriod) { setError("لا توجد فترة محاسبية مفتوحة للتاريخ المحدد. تحقق من إعدادات السنوات المالية."); return; }
    if (!currentUser) { setError("لا يوجد مستخدم مسجل الدخول"); return; }
    if (!defaultCurrency) { setError("لا توجد عملة أساسية. تحقق من إعدادات العملات."); return; }
    if (!warehouseId) { setError("يرجى اختيار المستودع"); return; }

    const validLines = lines.filter(
      (l) => l.itemId && parseFloat(l.quantity) > 0
    );
    if (validLines.length === 0) {
      setError("يرجى إدخال صنف واحد على الأقل بكمية أكبر من صفر");
      return;
    }

    setSaving(true);
    try {
      const result = await createAdjustment({
        companyId: company._id,
        branchId: effectiveBranchId as any,
        warehouseId: warehouseId as any,
        periodId: openPeriod._id,
        createdBy: currentUser._id,
        currencyId: defaultCurrency._id,
        adjustmentDate: stockDate,
        reason: notes.trim() ? `رصيد افتتاحي — ${notes.trim()}` : "رصيد مخزون افتتاحي",
        lines: validLines.map((l) => ({
          itemId: l.itemId as any,
          adjustmentType: "increase" as const,
          quantity: parseFloat(l.quantity),
          unitCost: parseFloat(l.unitCost) || 0,
        })),
      });

      setSuccess(
        `تم ترحيل الرصيد الافتتاحي بنجاح.\n` +
        `رقم التسوية: ${result.adjustmentNumber}\n` +
        `عدد الأصناف: ${validLines.length}\n` +
        `القيمة الإجمالية: ${formatCurrency(totalValue)}`
      );

      // Reset form
      setLines([{ id: nextId, itemId: "", quantity: "0", unitCost: "0" }]);
      setNextId((c) => c + 1);
      setWarehouseId("");
      setNotes("");
    } catch (err: any) {
      setError(err.message ?? "حدث خطأ غير متوقع");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const isReady = !!company && !!openPeriod && !!defaultCurrency && !!currentUser;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="no-print">
        <PageHeader
          icon={PackageOpen}
          title={isRTL ? "رصيد مخزون افتتاحي" : "Opening Stock Entry"}
          badge={
            <span className="badge-soft">
              {isRTL ? "إعداد أولي" : "Initial Setup"}
            </span>
          }
        />
      </div>

      {/* ── Info Banner ─────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl border px-4 py-3.5 flex gap-3"
        style={{
          background: "rgba(59,130,246,0.05)",
          borderColor: "rgba(59,130,246,0.2)",
        }}
      >
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" />
        <div className="text-sm text-[color:var(--ink-700)] leading-relaxed">
          {isRTL
            ? "هذه الصفحة مخصصة لإدخال أرصدة المخزون الافتتاحية لأول مرة، أو عند الترحيل من نظام قديم. كل إدخال يُسجَّل كتسوية مخزون موجبة (زيادة) ويُرحَّل تلقائياً في دفتر الأستاذ."
            : "Use this page to enter initial inventory balances for the first time, or when migrating from a legacy system. Each entry is recorded as a positive stock adjustment and automatically posted to the general ledger."}
          <div className="mt-1.5 font-semibold text-blue-700">
            {isRTL
              ? "⚠️ تأكد من اختيار الفترة المحاسبية الصحيحة قبل الترحيل."
              : "⚠️ Make sure the correct accounting period is open before posting."}
          </div>
        </div>
      </div>

      {/* ── Period check ─────────────────────────────────────────────────────── */}
      {!openPeriod && company && (
        <div
          className="rounded-xl border px-4 py-3.5 flex gap-3"
          style={{ background: "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.2)" }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
          <p className="text-sm text-red-700">
            {isRTL
              ? "لا توجد فترة محاسبية مفتوحة للتاريخ المحدد. انتقل إلى الإعدادات ← السنوات المالية وافتح فترة."
              : "No open accounting period for the selected date. Go to Settings → Fiscal Years to open a period."}
          </p>
        </div>
      )}

      {/* ── Success banner ───────────────────────────────────────────────────── */}
      {success && (
        <div
          className="rounded-xl border px-4 py-3.5 flex gap-3"
          style={{ background: "rgba(34,197,94,0.05)", borderColor: "rgba(34,197,94,0.2)" }}
        >
          <Check className="h-5 w-5 shrink-0 mt-0.5 text-green-600" />
          <pre className="text-sm text-green-800 font-sans whitespace-pre-wrap">{success}</pre>
        </div>
      )}

      {/* ── Form ──────────────────────────────────────────────────────────────── */}
      <form onSubmit={onSubmit} className="surface-card p-6 space-y-6">

        {/* Header row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Warehouse */}
          <div>
            <label className="block text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">
              {isRTL ? "المستودع" : "Warehouse"} <span className="text-red-500">*</span>
            </label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="input-field h-10 w-full"
              required
            >
              <option value="">{isRTL ? "اختر المستودع..." : "Select warehouse..."}</option>
              {activeWarehouses.map((w: any) => (
                <option key={w._id} value={w._id}>
                  {isRTL ? w.nameAr : (w.nameEn || w.nameAr)}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">
              {isRTL ? "تاريخ الرصيد الافتتاحي" : "Stock Date"} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={stockDate}
              onChange={(e) => setStockDate(e.target.value)}
              className="input-field h-10 w-full"
              required
            />
            {openPeriod && (
              <p className="text-xs text-green-600 mt-1">
                ✓ {isRTL ? `الفترة: ${openPeriod.name}` : `Period: ${openPeriod.name}`}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">
              {isRTL ? "ملاحظات" : "Notes"}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isRTL ? "مثال: ترحيل من النظام القديم" : "e.g. Migrated from legacy ERP"}
              className="input-field h-10 w-full"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex gap-2 text-sm text-red-700">
            <X className="h-4 w-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Lines table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[color:var(--ink-800)]">
              {isRTL ? "أصناف الرصيد الافتتاحي" : "Stock Lines"}
              {totalItems > 0 && (
                <span className="ms-2 badge-soft text-xs">{totalItems}</span>
              )}
            </h3>
            <button
              type="button"
              onClick={addLine}
              className="btn-primary h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              {isRTL ? "إضافة صنف" : "Add Item"}
            </button>
          </div>

          <div className="border border-[color:var(--ink-100)] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--ink-50)] text-[color:var(--ink-600)] text-xs">
                <tr>
                  <th className="px-3 py-2.5 text-start font-semibold">
                    {isRTL ? "الصنف" : "Item"} <span className="text-red-500">*</span>
                  </th>
                  <th className="px-3 py-2.5 text-end font-semibold w-32">
                    {isRTL ? "الكمية" : "Qty"} <span className="text-red-500">*</span>
                  </th>
                  <th className="px-3 py-2.5 text-end font-semibold w-36">
                    {isRTL ? "تكلفة الوحدة" : "Unit Cost"}
                  </th>
                  <th className="px-3 py-2.5 text-end font-semibold w-36">
                    {isRTL ? "الإجمالي" : "Total"}
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const qty = parseFloat(line.quantity) || 0;
                  const cost = parseFloat(line.unitCost) || 0;
                  const total = qty * cost;
                  const selectedItem = activeItems.find((i: any) => i._id === line.itemId);

                  return (
                    <tr key={line.id} className="border-t border-[color:var(--ink-100)] hover:bg-[color:var(--ink-25)]">
                      <td className="px-2 py-2">
                        <select
                          value={line.itemId}
                          onChange={(e) => updateLine(line.id, "itemId", e.target.value)}
                          className="input-field h-9 w-full text-xs"
                        >
                          <option value="">{isRTL ? "اختر الصنف..." : "Select item..."}</option>
                          {activeItems.map((it: any) => (
                            <option key={it._id} value={it._id}>
                              [{it.code}] {isRTL ? it.nameAr : (it.nameEn || it.nameAr)}
                            </option>
                          ))}
                        </select>
                        {selectedItem?.externalCode && (
                          <span className="text-[10px] text-[color:var(--ink-400)] mt-0.5 block">
                            {isRTL ? "الكود القديم:" : "Legacy code:"} {selectedItem.externalCode}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={line.quantity}
                          onChange={(e) => updateLine(line.id, "quantity", e.target.value)}
                          className="input-field h-9 text-end w-full tabular-nums text-xs"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unitCost}
                          onChange={(e) => updateLine(line.id, "unitCost", e.target.value)}
                          className="input-field h-9 text-end w-full tabular-nums text-xs"
                        />
                      </td>
                      <td className="px-3 py-2 text-end tabular-nums font-semibold text-[color:var(--ink-800)] text-xs">
                        {total.toFixed(2)}
                      </td>
                      <td className="px-1 py-2 text-center">
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(line.id)}
                            className="h-7 w-7 rounded-md inline-flex items-center justify-center text-red-400 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Footer totals */}
              {totalItems > 0 && (
                <tfoot className="border-t-2 border-[color:var(--ink-200)] bg-[color:var(--ink-25)]">
                  <tr>
                    <td className="px-3 py-2.5 text-xs font-bold text-[color:var(--ink-700)]" colSpan={2}>
                      {isRTL ? `الإجمالي (${totalItems} صنف)` : `Total (${totalItems} items)`}
                    </td>
                    <td />
                    <td className="px-3 py-2.5 text-end tabular-nums font-bold text-[color:var(--ink-900)] text-sm">
                      {formatCurrency(totalValue)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2 border-t border-[color:var(--ink-100)]">
          <button
            type="submit"
            disabled={saving || !isReady}
            className="btn-primary h-11 px-6 rounded-xl inline-flex items-center gap-2 text-sm font-bold disabled:opacity-50"
          >
            {saving
              ? (isRTL ? "جارٍ الترحيل..." : "Posting...")
              : (
                <>
                  <Check className="h-4 w-4" />
                  {isRTL ? "ترحيل الرصيد الافتتاحي" : "Post Opening Stock"}
                </>
              )
            }
          </button>

          <button
            type="button"
            onClick={() => {
              setLines([{ id: nextId, itemId: "", quantity: "0", unitCost: "0" }]);
              setNextId((c) => c + 1);
              setWarehouseId("");
              setNotes("");
              setError("");
              setSuccess("");
            }}
            className="h-11 px-4 rounded-xl border border-[color:var(--ink-200)] text-[color:var(--ink-600)] text-sm hover:bg-[color:var(--ink-50)]"
          >
            {isRTL ? "مسح" : "Clear"}
          </button>

          {/* Migration tip */}
          <div className="ms-auto flex items-center gap-2 text-xs text-[color:var(--ink-400)]">
            <Archive className="h-3.5 w-3.5" />
            {isRTL
              ? "للترحيل الجماعي من البيانات القديمة، استخدم صفحة Legacy Data."
              : "For bulk migration from legacy data, use the Legacy Data page."}
          </div>
        </div>
      </form>
    </div>
  );
}
