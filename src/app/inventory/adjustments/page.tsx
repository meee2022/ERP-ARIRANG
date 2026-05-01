// @ts-nocheck
"use client";
import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatDateShort } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { SlidersHorizontal, Search, Plus, X, Check, Trash2, Calendar, Filter } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader } from "@/components/ui/page-header";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";


function AdjustmentStatCard({ title, value }: any) {
  return (
    <div className="bg-white rounded-xl p-3 border border-[color:var(--ink-100)] flex-1">
      <div className="text-[10px] font-semibold text-[color:var(--ink-500)] uppercase mb-1">{title}</div>
      <div className="text-lg font-bold text-[color:var(--ink-900)] tabular-nums">{value}</div>
    </div>
  );
}

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
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      {/* Header */}
      <div className="no-print">
      <PageHeader
        icon={SlidersHorizontal}
        title={t("stockAdjustmentsTitle")}
        badge={<span className="badge-soft">{filtered.length}</span>}
        actions={
          canCreate("inventory") ? (
            <button onClick={() => setShowForm((v) => !v)}
              className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
              <Plus className="h-4 w-4" /> {t("newAdjustment")}
            </button>
          ) : undefined
        }
      />
      </div>

      {/* Inline Form */}
      {showForm && <NewAdjustmentForm onClose={() => setShowForm(false)} />}

      <FilterPanel>
        <FilterField label={t("fromDate")}>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input-field h-9 w-auto" />
        </FilterField>
        <FilterField label={t("toDate")}>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input-field h-9 w-auto" />
        </FilterField>
        <FilterField label={t("search")}>
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[color:var(--ink-400)] ${isRTL ? "right-3" : "left-3"}`} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className={`input-field h-9 ${isRTL ? "pr-9" : "pl-9"}`} />
          </div>
        </FilterField>
      </FilterPanel>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <AdjustmentStatCard title={t("adjustmentCount")} value={filtered.length} />
        <AdjustmentStatCard title={t("totalValue")} value={formatCurrency(totalPosted)} />
        <AdjustmentStatCard title={t("posted")} value={filtered.filter((a: any) => a.postingStatus === "posted").length} />
      </div>

      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-[color:var(--ink-100)] overflow-hidden">
        {loading ? (
          <LoadingState label={t("loading")} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={SlidersHorizontal}
            title={t("noResults")}
            action={
              canCreate("inventory") ? (
                <button onClick={() => setShowForm(true)}
                  className="btn-primary h-10 px-5 rounded-xl inline-flex items-center gap-2 text-sm font-semibold">
                  <Plus className="h-4 w-4" /> {t("newAdjustment")}
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
          <div className="mobile-list p-3 space-y-2.5">
            {filtered.map((a: any) => (
              <div key={a._id} className="record-card cursor-pointer" onClick={() => router.push && router.push(`/inventory/adjustments/${a._id}`)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--ink-100)] text-[var(--ink-600)] inline-block mb-1">{a.adjustmentNumber}</span>
                    <p className="text-[13px] font-semibold text-[var(--ink-800)]">{a.warehouseName ?? "—"}</p>
                    <p className="text-[11px] text-[var(--ink-400)] mt-0.5">{a.adjustmentDate} · {a.reason ?? ""}</p>
                  </div>
                  <StatusBadge status={a.postingStatus} type="posting" />
                </div>
              </div>
            ))}
          </div>
          <div className="desktop-table overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse" dir={isRTL ? "rtl" : "ltr"}>
              <thead>
                <tr style={{ background: "#6b1523" }}>
                  {[t("adjustmentNumber"), t("adjustmentDate"), t("warehouse"), t("reason"), t("quantity"), t("totalCost"), t("postingStatus")].map((h) => (
                    <th key={h} className="px-6 py-3 text-start text-[11px] font-semibold text-white/80 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--ink-50)]">
                {filtered.map((a: any) => (
                  <tr key={a._id} className="hover:bg-[color:var(--ink-50)] transition-colors">
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[color:var(--ink-100)] text-[color:var(--brand-700)]">
                        {a.adjustmentNumber}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-[color:var(--ink-500)]">{formatDateShort(a.adjustmentDate)}</td>
                    <td className="px-6 py-3.5 font-semibold text-[color:var(--ink-900)] text-sm">{a.warehouseName}</td>
                    <td className="px-6 py-3.5 text-xs text-[color:var(--ink-500)]">{a.reason || "—"}</td>
                    <td className="px-6 py-3.5 text-end text-xs text-[color:var(--ink-500)]">{a.lineCount}</td>
                    <td className="px-6 py-3.5 text-end tabular-nums font-bold text-[color:var(--ink-900)] text-sm">{formatCurrency(a.totalValue)}</td>
                    <td className="px-6 py-3.5 text-center">
                      <StatusBadge status={a.postingStatus} type="posting" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
