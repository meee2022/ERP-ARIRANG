// @ts-nocheck
"use client";
import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatDateShort } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { SlidersHorizontal, Search, Plus, X, Check, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppStore } from "@/store/useAppStore";

function todayISO() { return new Date().toISOString().split("T")[0]; }
function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ─── Adjustment Line type ─────────────────────────────────────────────────────

interface AdjLine {
  id: number;
  itemId: string;
  adjustmentType: "increase" | "decrease";
  quantity: string;
  unitCost: string;
}

// ─── New Adjustment Form ──────────────────────────────────────────────────────

function NewAdjustmentForm({ onClose }: { onClose: () => void }) {
  const { t, isRTL } = useI18n();

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];

  const [adjustmentDate, setAdjustmentDate] = useState(todayISO());
  const [warehouseId, setWarehouseId] = useState("");
  const [reason, setReason] = useState("");
  const [lineIdCounter, setLineIdCounter] = useState(1);
  const [lines, setLines] = useState<AdjLine[]>([
    { id: 0, itemId: "", adjustmentType: "increase", quantity: "1", unitCost: "0" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Required queries
  const branch = useQuery(api.branches.getDefaultBranch, company ? { companyId: company._id } : "skip");
  const selectedBranchStore = useAppStore((s) => s.selectedBranch);
  const effectiveBranchId = selectedBranchStore !== "all" ? selectedBranchStore : branch?._id;
  const openPeriod = useQuery(api.helpers.getOpenPeriod, company ? { companyId: company._id, date: adjustmentDate } : "skip");
  const { currentUser: defaultUser } = useAuth();
  const defaultCurrency = useQuery(api.helpers.getDefaultCurrency, {});
  const warehouses = useQuery(api.items.getAllWarehouses, company ? { companyId: company._id } : "skip");
  const items = useQuery(api.items.getAllItems, company ? { companyId: company._id } : "skip");

  const createAdjustment = useMutation(api.inventory.createStockAdjustmentImmediate);

  const totalCost = lines.reduce((sum, l) => {
    const qty = parseFloat(l.quantity) || 0;
    const cost = parseFloat(l.unitCost) || 0;
    return sum + qty * cost;
  }, 0);

  const addLine = () => {
    setLines((prev) => [...prev, { id: lineIdCounter, itemId: "", adjustmentType: "increase", quantity: "1", unitCost: "0" }]);
    setLineIdCounter((c) => c + 1);
  };

  const removeLine = (id: number) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLine = (id: number, field: keyof AdjLine, value: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        if (field === "itemId" && value) {
          const foundItem = (items ?? []).find((it: any) => it._id === value);
          if (foundItem?.standardCost) updated.unitCost = String(foundItem.standardCost);
          else if (foundItem?.lastCost) updated.unitCost = String(foundItem.lastCost);
        }
        return updated;
      })
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!effectiveBranchId && !branch) { setError("لا يوجد فرع افتراضي للشركة"); return; }
    if (!openPeriod) { setError("لا توجد فترة محاسبية مفتوحة للتاريخ المحدد"); return; }
    if (!defaultUser) { setError("لا يوجد مستخدم في النظام"); return; }
    if (!defaultCurrency) { setError("لا توجد عملة افتراضية في النظام"); return; }
    if (!warehouseId) { setError(t("errNoWarehouseAdj")); return; }

    const validLines = lines.filter(
      (l) => l.itemId && parseFloat(l.quantity) > 0
    );
    if (validLines.length === 0) { setError(t("errNoAdjLines")); return; }

    setSaving(true);
    setError("");

    try {
      await createAdjustment({
        companyId: company._id,
        branchId: (effectiveBranchId ?? branch?._id) as any,
        warehouseId: warehouseId as any,
        periodId: openPeriod._id,
        createdBy: defaultUser._id,
        currencyId: defaultCurrency._id,
        adjustmentDate,
        reason: reason.trim() || undefined,
        lines: validLines.map((l) => ({
          itemId: l.itemId as any,
          adjustmentType: l.adjustmentType,
          quantity: parseFloat(l.quantity),
          unitCost: parseFloat(l.unitCost) || 0,
        })),
      });

      onClose();
    } catch (err: any) {
      setError(err.message ?? "حدث خطأ غير متوقع");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-[color:var(--ink-900)]">{t("newAdjustment")}</h3>
        <button type="button" onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[color:var(--ink-50)] text-[color:var(--ink-400)]">
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Header fields */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* Warehouse */}
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("warehouse")} *</label>
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}
              className="input-field h-9">
              <option value="">{t("selectWarehouse")}</option>
              {(warehouses ?? []).filter((w: any) => w.isActive).map((w: any) => (
                <option key={w._id} value={w._id}>{isRTL ? w.nameAr : (w.nameEn || w.nameAr)}</option>
              ))}
            </select>
          </div>

          {/* Adjustment Date */}
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("adjustmentDate")} *</label>
            <input type="date" required value={adjustmentDate} onChange={(e) => setAdjustmentDate(e.target.value)}
              className="input-field h-9" />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("reason")}</label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
              className="input-field h-9 w-full" />
          </div>
        </div>

        {/* Lines table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-[color:var(--ink-700)] uppercase tracking-wide">{t("lines")}</h4>
            <button type="button" onClick={addLine}
              className="h-7 px-3 rounded-lg bg-[color:var(--brand-50)] text-[color:var(--brand-700)] text-xs font-medium hover:bg-[color:var(--brand-100)] inline-flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" /> {t("addLine")}
            </button>
          </div>
          <div className="border border-[color:var(--ink-100)] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--ink-50)] text-[color:var(--ink-600)] text-xs">
                <tr>
                  <th className="px-3 py-2 text-start font-semibold">{t("item")} *</th>
                  <th className="px-3 py-2 text-start font-semibold w-32">{t("adjustmentType")}</th>
                  <th className="px-3 py-2 text-end font-semibold w-28">{t("quantity")} *</th>
                  <th className="px-3 py-2 text-end font-semibold w-32">{t("unitCost")}</th>
                  <th className="px-3 py-2 text-end font-semibold w-32">{t("totalCost")}</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const qty = parseFloat(line.quantity) || 0;
                  const cost = parseFloat(line.unitCost) || 0;
                  const total = qty * cost;
                  return (
                    <tr key={line.id} className="border-t border-[color:var(--ink-100)]">
                      <td className="px-2 py-1.5">
                        <select value={line.itemId}
                          onChange={(e) => updateLine(line.id, "itemId", e.target.value)}
                          className="input-field h-8 w-full text-xs">
                          <option value="">{t("selectItem")}</option>
                          {(items ?? []).filter((it: any) => it.isActive).map((it: any) => (
                            <option key={it._id} value={it._id}>
                              {isRTL ? it.nameAr : (it.nameEn || it.nameAr)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select value={line.adjustmentType}
                          onChange={(e) => updateLine(line.id, "adjustmentType", e.target.value)}
                          className="input-field h-8 w-full text-xs">
                          <option value="increase">{t("increase")}</option>
                          <option value="decrease">{t("decrease")}</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min="0.001" step="0.001"
                          value={line.quantity}
                          onChange={(e) => updateLine(line.id, "quantity", e.target.value)}
                          className="input-field h-8 text-end w-full tabular-nums text-xs" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min="0" step="0.01"
                          value={line.unitCost}
                          onChange={(e) => updateLine(line.id, "unitCost", e.target.value)}
                          className="input-field h-8 text-end w-full tabular-nums text-xs" />
                      </td>
                      <td className="px-3 py-1.5 text-end tabular-nums font-semibold text-[color:var(--ink-800)] text-xs">
                        {total.toFixed(2)}
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        {lines.length > 1 && (
                          <button type="button" onClick={() => removeLine(line.id)}
                            title={t("removeLine")}
                            className="h-7 w-7 rounded-md inline-flex items-center justify-center text-red-400 hover:bg-red-50">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-end gap-4">
          <div className="text-end">
            <div className="text-xs text-[color:var(--ink-500)]">{t("totalCost")}</div>
            <div className="text-2xl font-bold text-[color:var(--ink-900)] tabular-nums">
              {totalCost.toFixed(2)}
            </div>
            <div className="text-xs text-[color:var(--ink-400)]">QAR</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="btn-primary h-10 px-5 rounded-lg inline-flex items-center gap-2 text-sm font-semibold disabled:opacity-60">
            {saving ? t("posting") : <><Check className="h-4 w-4" />{t("post")}</>}
          </button>
          <button type="button" onClick={onClose}
            className="h-10 px-5 rounded-lg border border-[color:var(--ink-200)] text-[color:var(--ink-700)] text-sm hover:bg-[color:var(--ink-50)]">
            {t("cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function StockAdjustmentsPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { canCreate, canPost } = usePermissions();
  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];

  const adjustments = useQuery(
    api.inventory.getStockAdjustments,
    company ? { companyId: company._id, fromDate, toDate, branchId: branchArg as any } : "skip"
  );

  const loading = adjustments === undefined;

  const filtered = (adjustments ?? []).filter((a: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (a.adjustmentNumber || "").toLowerCase().includes(s) ||
      (a.warehouseName || "").toLowerCase().includes(s) ||
      (a.reason || "").toLowerCase().includes(s);
  });

  const totalPosted = filtered
    .filter((a: any) => a.postingStatus === "posted")
    .reduce((s: number, a: any) => s + (a.totalValue ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center"
            style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}>
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">{t("stockAdjustmentsTitle")}</h1>
            <p className="text-xs text-[color:var(--ink-500)] mt-0.5">{filtered.length}</p>
          </div>
        </div>
        {canCreate("inventory") && (
        <button onClick={() => setShowForm((v) => !v)}
          className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4" /> {t("newAdjustment")}
        </button>
        )}
      </div>

      {/* Inline Form */}
      {showForm && <NewAdjustmentForm onClose={() => setShowForm(false)} />}

      {/* Filters */}
      <div className="surface-card p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[color:var(--ink-500)]">{t("fromDate")}:</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input-field h-9 w-auto" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[color:var(--ink-500)]">{t("toDate")}:</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input-field h-9 w-auto" />
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[color:var(--ink-400)] ${isRTL ? "right-3" : "left-3"}`} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className={`input-field h-9 ${isRTL ? "pr-9" : "pl-9"}`} />
        </div>
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="surface-card p-3 flex items-center gap-6 text-sm">
          <div>
            <span className="text-[color:var(--ink-500)]">{t("total")}: </span>
            <span className="font-semibold text-[color:var(--ink-900)] tabular-nums">{formatCurrency(totalPosted)}</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="surface-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-[color:var(--brand-600)] border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-[color:var(--ink-400)]">{t("loading")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-[color:var(--ink-400)]">
            <p className="text-sm">{t("noResults")}</p>
            {canCreate("inventory") && (
            <button onClick={() => setShowForm(true)} className="text-sm text-[color:var(--brand-700)] hover:underline mt-1">
              + {t("newAdjustment")}
            </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full zebra-table text-sm">
              <thead className="bg-[color:var(--ink-50)] text-[color:var(--ink-600)] text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">{t("adjustmentNumber")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("adjustmentDate")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("warehouse")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("reason")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("quantity")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("totalCost")}</th>
                  <th className="px-4 py-3 text-center font-semibold">{t("postingStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a: any) => (
                  <tr key={a._id} className="border-t border-[color:var(--ink-100)] hover:bg-[color:var(--brand-50)]/40">
                    <td className="px-4 py-3 font-mono text-xs text-[color:var(--brand-700)]">{a.adjustmentNumber}</td>
                    <td className="px-4 py-3 text-[color:var(--ink-600)]">{formatDateShort(a.adjustmentDate)}</td>
                    <td className="px-4 py-3 text-[color:var(--ink-700)]">{a.warehouseName}</td>
                    <td className="px-4 py-3 text-[color:var(--ink-500)] text-xs">{a.reason || "—"}</td>
                    <td className="px-4 py-3 text-end tabular-nums text-[color:var(--ink-700)]">{a.lineCount}</td>
                    <td className="px-4 py-3 text-end font-semibold tabular-nums">{formatCurrency(a.totalValue)}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={a.postingStatus} type="posting" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
