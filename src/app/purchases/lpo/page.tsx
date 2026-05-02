// @ts-nocheck
"use client";
import React, { useState } from "react";
import { formatCurrency } from "@/lib/i18n";
import { useI18n } from "@/hooks/useI18n";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { LPO_STATUS_CONFIG } from "@/lib/constants";
import {
  ClipboardList, Plus, X, Check, Trash2, Search, Calendar, Filter,
  Eye, Package2, TrendingUp, Clock, CheckCircle,
} from "lucide-react";

function todayISO() { return new Date().toISOString().split("T")[0]; }
function startOfMonthISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`; }
function plus30(): string { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split("T")[0]; }

interface LPOLine {
  id: number; itemId: string; quantity: string; unitPrice: string; vatRate: string; uomId: string;
}

// ─── New LPO Form ───────────────────────────────────────────────────────────
function NewLPOForm({ company, onClose }: any) {
  const { t, isRTL } = useI18n();
  const createPO = useMutation(api.purchaseOrders.createPurchaseOrder);
  const suppliers = useQuery(api.suppliers.getAll, company ? { companyId: company._id } : "skip");
  const items = useQuery(api.items.getAllItems, company ? { companyId: company._id } : "skip");
  const warehouses = useQuery(api.items.getAllWarehouses, company ? { companyId: company._id } : "skip");
  const units = useQuery(api.items.getAllUnits, company ? { companyId: company._id } : "skip");
  const branch = useQuery(api.branches.getDefaultBranch, company ? { companyId: company._id } : "skip");
  const selectedBranchStore = useAppStore((s) => s.selectedBranch);
  const effectiveBranchId = selectedBranchStore !== "all" ? selectedBranchStore : branch?._id;
  const { currentUser: defaultUser } = useAuth();
  const defaultCurrency = useQuery(api.helpers.getDefaultCurrency, {});

  const [form, setForm] = useState({
    supplierId: "", warehouseId: "", notes: "",
    orderDate: todayISO(), expectedDate: plus30(),
  });
  const [lines, setLines] = useState<LPOLine[]>([
    { id: 1, itemId: "", quantity: "1", unitPrice: "0", vatRate: "0", uomId: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showAllItems, setShowAllItems] = useState(false);

  // ── Supplier catalog: load when supplier is selected ─────────────────────
  const supplierCatalog = useQuery(
    api.supplierItems.getSupplierCatalog,
    form.supplierId ? { supplierId: form.supplierId as any } : "skip"
  ) ?? [];

  // Quick lookup: itemId -> catalog row (for last price suggestions)
  const catalogByItemId = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const row of supplierCatalog) {
      if (row.itemId) map.set(row.itemId, row);
    }
    return map;
  }, [supplierCatalog]);

  // Items split by catalog membership
  const sortedItems = React.useMemo(() => {
    if (!items) return { inCatalog: [] as any[], notInCatalog: [] as any[], hasCatalog: false };
    const catalogIds = new Set(supplierCatalog.map((r: any) => r.itemId).filter(Boolean));
    const inCatalog = items.filter((i: any) => catalogIds.has(i._id));
    const notInCatalog = items.filter((i: any) => !catalogIds.has(i._id));
    return { inCatalog, notInCatalog, hasCatalog: inCatalog.length > 0 };
  }, [items, supplierCatalog]);

  // The item list shown in dropdown — scope by supplier catalog unless toggled
  const dropdownItems = React.useMemo(() => {
    if (!form.supplierId || !sortedItems.hasCatalog || showAllItems) {
      return {
        catalogOnly: false,
        items: sortedItems.hasCatalog
          ? [...sortedItems.inCatalog, ...sortedItems.notInCatalog]
          : (items ?? []),
      };
    }
    return { catalogOnly: true, items: sortedItems.inCatalog };
  }, [form.supplierId, sortedItems, showAllItems, items]);

  const setF = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const addLine = () => setLines((ls) => [...ls, { id: Date.now() + Math.random(), itemId: "", quantity: "1", unitPrice: "0", vatRate: "0", uomId: "" }]);
  const removeLine = (id: number) => setLines((ls) => ls.filter((l) => l.id !== id));

  // Auto-add: if user fills/edits the last line, auto-create a fresh empty line below
  const updateLine = (id: number, k: keyof LPOLine, v: string) => {
    setLines((ls) => {
      const next = ls.map((l) => (l.id === id ? { ...l, [k]: v } : l));
      const last = next[next.length - 1];
      if (last && last.id === id && last.itemId) {
        // current edit is on the last row AND it has an item → append empty
        next.push({ id: Date.now() + Math.random(), itemId: "", quantity: "1", unitPrice: "0", vatRate: "0", uomId: "" });
      }
      return next;
    });
  };

  // Auto-fill UOM and unit price when item changes
  // Priority for unit price: supplier catalog last price > item.lastCost > item.standardCost
  const onItemChange = (id: number, itemId: string) => {
    const item = items?.find((i: any) => i._id === itemId);
    const catalogRow = catalogByItemId.get(itemId);
    const suggestedPrice =
      catalogRow?.lastPrice ?? catalogRow?.unitPrice ??
      item?.lastCost ?? item?.standardCost ?? 0;
    setLines((ls) => {
      const next = ls.map((l) =>
        l.id === id
          ? {
              ...l,
              itemId,
              uomId: item?.baseUomId || l.uomId,
              unitPrice: suggestedPrice ? String(suggestedPrice) : l.unitPrice,
            }
          : l
      );
      // Auto-append fresh empty line when filling the last row
      const last = next[next.length - 1];
      if (last && last.id === id && itemId) {
        next.push({ id: Date.now() + Math.random(), itemId: "", quantity: "1", unitPrice: "0", vatRate: "0", uomId: "" });
      }
      return next;
    });
  };

  // Totals
  const totals = lines.reduce(
    (acc, l) => {
      const qty = Number(l.quantity) || 0;
      const price = Number(l.unitPrice) || 0;
      const vatPct = Number(l.vatRate) || 0;
      const sub = qty * price;
      const vat = sub * (vatPct / 100);
      acc.subtotal += sub;
      acc.vat += vat;
      acc.total += sub + vat;
      return acc;
    },
    { subtotal: 0, vat: 0, total: 0 }
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!effectiveBranchId && !branch) { setError(t("errNoBranch")); return; }
    if (!defaultUser) { setError(t("errNoUser")); return; }
    if (!defaultCurrency) { setError(t("errNoCurrency")); return; }
    if (!form.supplierId || !form.warehouseId) { setError(t("errRequiredFields")); return; }
    const validLines = lines.filter((l) => l.itemId && Number(l.quantity) > 0);
    if (validLines.length === 0) { setError(isRTL ? "أضف صنفاً واحداً على الأقل" : "Add at least one item"); return; }

    setSaving(true); setError("");
    try {
      await createPO({
        companyId: company._id,
        branchId: (effectiveBranchId ?? branch?._id) as any,
        supplierId: form.supplierId as any,
        orderDate: form.orderDate,
        expectedDate: form.expectedDate || undefined,
        warehouseId: form.warehouseId as any,
        currencyId: defaultCurrency._id,
        exchangeRate: 1,
        notes: form.notes || undefined,
        createdBy: defaultUser._id,
        lines: validLines.map((l) => {
          const qty = Number(l.quantity);
          const price = Number(l.unitPrice);
          const vatPct = Number(l.vatRate) || 0;
          const sub = qty * price;
          const vat = sub * (vatPct / 100);
          return {
            itemId: l.itemId as any,
            quantity: qty,
            uomId: (l.uomId || units?.[0]?._id) as any,
            unitPrice: Math.round(price * 100) / 100,
            vatRate: vatPct,
            lineTotal: Math.round((sub + vat) * 100) / 100,
          };
        }),
      });
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[color:var(--ink-900)]">{t("newLPO")}</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[color:var(--ink-50)] text-[color:var(--ink-400)]">
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>}

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Header fields */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("supplier")} *</label>
            <select required value={form.supplierId} onChange={(e) => setF("supplierId", e.target.value)} className="input-field h-9">
              <option value="">—</option>
              {(suppliers ?? []).map((s: any) => (
                <option key={s._id} value={s._id}>
                  {isRTL ? s.nameAr : (s.nameEn || s.nameAr)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("warehouse")} *</label>
            <select required value={form.warehouseId} onChange={(e) => setF("warehouseId", e.target.value)} className="input-field h-9">
              <option value="">—</option>
              {(warehouses ?? []).map((w: any) => (
                <option key={w._id} value={w._id}>
                  {isRTL ? w.nameAr : (w.nameEn || w.nameAr)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{isRTL ? "تاريخ الطلب" : "Order Date"} *</label>
            <input type="date" required value={form.orderDate} onChange={(e) => setF("orderDate", e.target.value)} className="input-field h-9" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("expectedDate")}</label>
            <input type="date" value={form.expectedDate} onChange={(e) => setF("expectedDate", e.target.value)} className="input-field h-9" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("notes")}</label>
          <input value={form.notes} onChange={(e) => setF("notes", e.target.value)} className="input-field h-9" placeholder={isRTL ? "ملاحظات إضافية..." : "Additional notes..."} />
        </div>

        {/* Catalog filter toggle (only shown after supplier selected & has catalog) */}
        {form.supplierId && sortedItems.hasCatalog && (
          <div className="flex items-center justify-between bg-blue-50/60 border border-blue-100 rounded-lg px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs text-blue-800">
              <span className="font-bold">
                {showAllItems
                  ? (isRTL ? "📋 عرض كل الأصناف" : "📋 Showing all items")
                  : (isRTL ? `★ أصناف هذا المورد فقط (${sortedItems.inCatalog.length})` : `★ Supplier catalog only (${sortedItems.inCatalog.length})`)
                }
              </span>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-blue-900 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showAllItems}
                onChange={(e) => setShowAllItems(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-blue-300"
              />
              {isRTL ? "إظهار كل الأصناف" : "Show all items"}
            </label>
          </div>
        )}

        {/* Lines table */}
        <div className="overflow-x-auto border border-[color:var(--ink-100)] rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--ink-50)] text-[color:var(--ink-600)] text-xs">
              <tr>
                <th className="px-3 py-2 text-start font-semibold">{t("item")}</th>
                <th className="px-3 py-2 text-end font-semibold w-24">{t("quantity")}</th>
                <th className="px-3 py-2 text-start font-semibold w-24">{t("uom") || "UOM"}</th>
                <th className="px-3 py-2 text-end font-semibold w-28">{isRTL ? "السعر" : "Unit Price"}</th>
                <th className="px-3 py-2 text-end font-semibold w-20">VAT%</th>
                <th className="px-3 py-2 text-end font-semibold w-28">{isRTL ? "الإجمالي" : "Total"}</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--ink-100)]">
              {lines.map((line) => {
                const lineTotal =
                  (Number(line.quantity) || 0) *
                  (Number(line.unitPrice) || 0) *
                  (1 + (Number(line.vatRate) || 0) / 100);
                return (
                  <tr key={line.id}>
                    <td className="px-2 py-1.5">
                      <select value={line.itemId} onChange={(e) => onItemChange(line.id, e.target.value)} className="input-field h-8 text-xs w-full">
                        <option value="">—</option>
                        {dropdownItems.items.map((i: any) => {
                          const inCatalog = catalogByItemId.has(i._id);
                          return (
                            <option key={i._id} value={i._id}>
                              {inCatalog ? "★ " : ""}{i.code} — {isRTL ? i.nameAr : (i.nameEn || i.nameAr)}
                            </option>
                          );
                        })}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min="0.01" step="0.01" value={line.quantity}
                        onChange={(e) => updateLine(line.id, "quantity", e.target.value)}
                        className="input-field h-8 text-xs text-end tabular-nums" />
                    </td>
                    <td className="px-2 py-1.5">
                      <select value={line.uomId} onChange={(e) => updateLine(line.id, "uomId", e.target.value)} className="input-field h-8 text-xs">
                        <option value="">—</option>
                        {(units ?? []).map((u: any) => (
                          <option key={u._id} value={u._id}>{isRTL ? u.nameAr : (u.nameEn || u.nameAr)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min="0" step="0.01" value={line.unitPrice}
                        onChange={(e) => updateLine(line.id, "unitPrice", e.target.value)}
                        className="input-field h-8 text-xs text-end tabular-nums" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min="0" step="0.01" value={line.vatRate}
                        onChange={(e) => updateLine(line.id, "vatRate", e.target.value)}
                        className="input-field h-8 text-xs text-end tabular-nums" />
                    </td>
                    <td className="px-2 py-1.5 text-end tabular-nums text-xs font-semibold text-[color:var(--brand-700)]">
                      {formatCurrency(lineTotal)}
                    </td>
                    <td className="px-2 py-1.5">
                      {lines.length > 1 && (
                        <button type="button" onClick={() => removeLine(line.id)} className="p-1 rounded text-red-400 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-[color:var(--ink-50)] text-xs">
              <tr>
                <td colSpan={5} className="px-3 py-2 text-end font-bold text-[color:var(--ink-700)]">
                  {isRTL ? "الإجمالي قبل VAT" : "Subtotal"}
                </td>
                <td className="px-3 py-2 text-end tabular-nums font-bold">{formatCurrency(totals.subtotal)}</td>
                <td />
              </tr>
              <tr>
                <td colSpan={5} className="px-3 py-2 text-end font-bold text-[color:var(--ink-700)]">VAT</td>
                <td className="px-3 py-2 text-end tabular-nums font-bold">{formatCurrency(totals.vat)}</td>
                <td />
              </tr>
              <tr style={{ background: "var(--brand-50)" }}>
                <td colSpan={5} className="px-3 py-2.5 text-end font-bold text-[color:var(--brand-700)]">
                  {isRTL ? "الإجمالي" : "Total"}
                </td>
                <td className="px-3 py-2.5 text-end tabular-nums font-bold text-[color:var(--brand-700)] text-sm">
                  {formatCurrency(totals.total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <button type="button" onClick={addLine} className="flex items-center gap-1.5 text-sm text-[color:var(--brand-700)]">
          <Plus className="h-4 w-4" />{t("addLine")}
        </button>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary h-10 px-5 rounded-lg inline-flex items-center gap-2 text-sm font-semibold disabled:opacity-60">
            {saving ? t("saving") : <><Check className="h-4 w-4" />{t("save")}</>}
          </button>
          <button type="button" onClick={onClose} className="h-10 px-5 rounded-lg border border-[color:var(--ink-200)] text-[color:var(--ink-700)] text-sm hover:bg-[color:var(--ink-50)]">
            {t("cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────────────
function LpoStatusBadge({ status, isRTL }: { status: string; isRTL: boolean }) {
  const cfg = (LPO_STATUS_CONFIG as any)[status];
  if (!cfg) return <span className="text-xs text-gray-500">{status}</span>;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${cfg.bgColor} ${cfg.textColor}`}>
      {isRTL ? cfg.labelAr : cfg.labelEn}
    </span>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function LPOPage() {
  const { t, isRTL } = useI18n();
  const router = useRouter();
  const { canCreate } = usePermissions();
  const [showForm, setShowForm] = useState(false);
  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const lpos = useQuery(
    api.purchaseOrders.listPurchaseOrders,
    company
      ? {
          companyId: company._id,
          fromDate, toDate,
          branchId: branchArg as any,
          documentStatus: statusFilter !== "all" ? statusFilter : undefined,
        }
      : "skip"
  );
  const loading = lpos === undefined;
  const filtered = (lpos ?? []).filter((p: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.poNumber || "").toLowerCase().includes(s) || (p.supplierName || "").toLowerCase().includes(s);
  });

  // KPI counts
  const kpis = (lpos ?? []).reduce(
    (acc: any, p: any) => {
      acc.total += 1;
      acc.totalValue += p.totalAmount || 0;
      if (p.documentStatus === "draft") acc.drafts += 1;
      if (p.documentStatus === "approved") acc.pendingDispatch += 1;
      if (p.documentStatus === "sent" || p.documentStatus === "partially_received") acc.inTransit += 1;
      if (p.documentStatus === "fully_received") acc.completed += 1;
      return acc;
    },
    { total: 0, totalValue: 0, drafts: 0, pendingDispatch: 0, inTransit: 0, completed: 0 }
  );

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      <div className="no-print">
        <PageHeader
          icon={ClipboardList}
          title={t("lpo")}
          badge={<span className="text-xs text-[color:var(--ink-500)]">{filtered.length}</span>}
          actions={
            canCreate("purchases") && (
              <button onClick={() => setShowForm((v) => !v)} className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
                <Plus className="h-4 w-4" />{t("newLPO")}
              </button>
            )
          }
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-7 w-7 rounded-md bg-gray-100 flex items-center justify-center">
              <Package2 className="h-4 w-4 text-gray-600" />
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{isRTL ? "إجمالي الطلبات" : "Total LPOs"}</p>
          </div>
          <p className="text-xl font-bold text-gray-900 tabular-nums">{kpis.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-7 w-7 rounded-md bg-gray-100 flex items-center justify-center">
              <Clock className="h-4 w-4 text-gray-500" />
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{isRTL ? "مسودات" : "Drafts"}</p>
          </div>
          <p className="text-xl font-bold text-gray-700 tabular-nums">{kpis.drafts}</p>
        </div>
        <div className="bg-white rounded-xl border border-blue-100 p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-7 w-7 rounded-md bg-blue-100 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">{t("pendingLPOsBadge")}</p>
          </div>
          <p className="text-xl font-bold text-blue-700 tabular-nums">{kpis.pendingDispatch}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-100 p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-7 w-7 rounded-md bg-amber-100 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">{isRTL ? "قيد التسليم" : "In Transit"}</p>
          </div>
          <p className="text-xl font-bold text-amber-700 tabular-nums">{kpis.inTransit}</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-100 p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-7 w-7 rounded-md bg-emerald-100 flex items-center justify-center">
              <Check className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">{isRTL ? "إجمالي القيمة" : "Total Value"}</p>
          </div>
          <p className="text-base font-bold text-emerald-700 tabular-nums">{formatCurrency(kpis.totalValue)}</p>
        </div>
      </div>

      {showForm && <NewLPOForm company={company} onClose={() => setShowForm(false)} />}

      {/* Filter strip */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 flex flex-wrap items-end gap-3 w-full">
        <button className="h-10 px-3 border border-gray-200 rounded-md flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Filter className="h-4 w-4" /> {t("filters")}
        </button>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">{t("fromDate")}</label>
          <div className="relative">
            <Calendar className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? "right-3" : "left-3"}`} />
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className={`h-10 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} border border-gray-200 rounded-md text-sm w-[160px] focus:outline-none focus:border-gray-400`} />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">{t("toDate")}</label>
          <div className="relative">
            <Calendar className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? "right-3" : "left-3"}`} />
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className={`h-10 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} border border-gray-200 rounded-md text-sm w-[160px] focus:outline-none focus:border-gray-400`} />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">{isRTL ? "الحالة" : "Status"}</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 border border-gray-200 rounded-md text-sm w-[160px] bg-white focus:outline-none focus:border-gray-400">
            <option value="all">{isRTL ? "الكل" : "All"}</option>
            {Object.entries(LPO_STATUS_CONFIG).map(([k, v]: any) => (
              <option key={k} value={k}>{isRTL ? v.labelAr : v.labelEn}</option>
            ))}
          </select>
        </div>

        <div className={`flex-1 min-w-[200px] ${isRTL ? "mr-auto" : "ml-auto"}`}>
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? "right-3" : "left-3"}`} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={isRTL ? "بحث برقم الطلب أو المورد..." : "Search by LPO# or supplier..."}
              className={`w-full h-10 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} border border-gray-200 rounded-md text-sm focus:outline-none focus:border-gray-400`} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-[color:var(--ink-100)] overflow-hidden">
        {loading ? (
          <LoadingState label={t("loading")} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={isRTL ? "لا توجد طلبات توريد" : "No purchase orders yet"}
            action={canCreate("purchases") && (
              <button onClick={() => setShowForm(true)} className="btn-primary h-10 px-5 rounded-xl inline-flex items-center gap-2 text-sm font-semibold">
                <Plus className="h-4 w-4" /> {t("newLPO")}
              </button>
            )}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir={isRTL ? "rtl" : "ltr"}>
              <thead>
                <tr style={{ background: "var(--brand-700)" }}>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap text-start">{t("lpoNo")}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap text-start">{t("date")}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap text-start">{t("expectedDate")}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap text-start">{t("supplier")}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/80 uppercase tracking-widest text-center whitespace-nowrap">{isRTL ? "الأصناف" : "Items"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/80 uppercase tracking-widest text-center whitespace-nowrap">{isRTL ? "التقدم" : "Progress"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap text-end">{isRTL ? "الإجمالي" : "Total"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/80 uppercase tracking-widest text-center whitespace-nowrap">{t("status")}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/80 uppercase tracking-widest text-center whitespace-nowrap">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p: any) => (
                  <tr key={p._id} className="hover:bg-gray-50/80 transition-colors cursor-pointer" onClick={() => router.push(`/purchases/lpo/${p._id}`)}>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        {p.poNumber}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-700 text-xs tabular-nums">{p.orderDate}</td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs tabular-nums">{p.expectedDate || "—"}</td>
                    <td className="px-5 py-3.5 text-gray-900 font-semibold">{isRTL ? p.supplierName : (p.supplierNameEn || p.supplierName)}</td>
                    <td className="px-5 py-3.5 text-center text-xs text-gray-600 tabular-nums">{p.itemCount}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${p.progressPct === 100 ? "bg-emerald-500" : p.progressPct > 0 ? "bg-amber-400" : "bg-gray-300"}`}
                            style={{ width: `${p.progressPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 tabular-nums w-9 text-end">{p.progressPct}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-end tabular-nums font-bold text-gray-900">{formatCurrency(p.totalAmount)}</td>
                    <td className="px-5 py-3.5 text-center">
                      <LpoStatusBadge status={p.documentStatus} isRTL={isRTL} />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button onClick={(e) => { e.stopPropagation(); router.push(`/purchases/lpo/${p._id}`); }}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-blue-600">
                        <Eye className="h-4 w-4" />
                      </button>
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
