// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatDateShort } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { ShoppingCart, Search, Plus, X, Check, Trash2, Eye, ChevronLeft, ChevronRight, CheckCircle, RotateCcw, WalletCards, CheckCircle2, Calendar, Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader } from "@/components/ui/page-header";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { SummaryStrip, LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";

const PAGE_SIZE = 50;

function todayISO() { return new Date().toISOString().split("T")[0]; }
function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ─── Purchase Invoice line type ────────────────────────────────────────────────

interface PurchaseLine {
  id: number;
  itemId: string;
  quantity: string;
  unitPrice: string;
  uomId: string;
  accountId: string;
}

// ─── New Purchase Invoice Form ─────────────────────────────────────────────────

function NewPurchaseInvoiceForm({ onClose }: { onClose: () => void }) {
  const { t, isRTL } = useI18n();

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];

  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(todayISO());
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [lineIdCounter, setLineIdCounter] = useState(1);
  const [lines, setLines] = useState<PurchaseLine[]>([
    { id: 0, itemId: "", quantity: "1", unitPrice: "", uomId: "", accountId: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // A: when a supplier is selected, show only that supplier's catalog items by default
  const [showAllItems, setShowAllItems] = useState(false);

  // Queries for dependencies
  const branch = useQuery(api.branches.getDefaultBranch, company ? { companyId: company._id } : "skip");
  const selectedBranchStore = useAppStore((s) => s.selectedBranch);
  const effectiveBranchId = selectedBranchStore !== "all" ? selectedBranchStore : branch?._id;
  const openPeriod = useQuery(api.helpers.getOpenPeriod, company ? { companyId: company._id, date: invoiceDate } : "skip");
  const { currentUser: defaultUser } = useAuth();
  const defaultCurrency = useQuery(api.helpers.getDefaultCurrency, {});
  const suppliers = useQuery(api.suppliers.getAll, company ? { companyId: company._id } : "skip");
  const items = useQuery(api.items.getAllItems, company ? { companyId: company._id } : "skip");
  const units = useQuery(api.items.getAllUnits, company ? { companyId: company._id } : "skip");
  const allAccounts = useQuery(api.accounts.getAll, company ? { companyId: company._id } : "skip");
  const expenseAccounts = React.useMemo(
    () => (allAccounts ?? []).filter((a: any) => a.isPostable && a.isActive && a.accountType === "expense"),
    [allAccounts]
  );

  // ── Supplier catalog: load when supplier is selected ─────────────────────
  const supplierCatalog = useQuery(
    api.supplierItems.getSupplierCatalog,
    supplierId ? { supplierId: supplierId as any } : "skip"
  ) ?? [];

  // Build a quick lookup: itemId -> catalog row (for suggestions)
  const catalogByItemId = React.useMemo(() => {
    const map = new Map();
    for (const row of supplierCatalog) {
      if (row.itemId) map.set(row.itemId, row);
    }
    return map;
  }, [supplierCatalog]);

  // Items in supplier catalog (sorted to appear first in dropdown)
  const sortedItems = React.useMemo(() => {
    if (!items) return { inCatalog: [] as any[], notInCatalog: [] as any[], hasCatalog: false };
    const catalogItemIds = new Set(supplierCatalog.map((r) => r.itemId).filter(Boolean));
    const inCatalog = items.filter((i: any) => catalogItemIds.has(i._id));
    const notInCatalog = items.filter((i: any) => !catalogItemIds.has(i._id));
    return { inCatalog, notInCatalog, hasCatalog: inCatalog.length > 0 };
  }, [items, supplierCatalog]);

  // A: the item list shown in dropdown — scope by catalog unless showAllItems is checked
  const dropdownItems = React.useMemo(() => {
    // If no supplier selected, or catalog is empty, or user forced showAllItems → all items
    if (!supplierId || !sortedItems.hasCatalog || showAllItems) {
      return { catalogOnly: false, items: sortedItems.hasCatalog
        ? [...sortedItems.inCatalog, ...sortedItems.notInCatalog]
        : (items ?? []) };
    }
    // Default: only the catalog items for this supplier
    return { catalogOnly: true, items: sortedItems.inCatalog };
  }, [supplierId, sortedItems, showAllItems, items]);

  const createInvoice = useMutation(api.purchaseInvoices.createPurchaseInvoice);

  // Compute subtotal
  const subtotal = lines.reduce((sum, l) => {
    const qty = parseFloat(l.quantity) || 0;
    const price = parseFloat(l.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { id: lineIdCounter, itemId: "", quantity: "1", unitPrice: "", uomId: "", accountId: "" },
    ]);
    setLineIdCounter((c) => c + 1);
  };

  const removeLine = (id: number) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLine = (id: number, field: keyof PurchaseLine, value: string) => {
    setLines((prev) => {
      const mapped = prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        if (field === "itemId" && value) {
          const foundItem = (items ?? []).find((it: any) => it._id === value);
          const catalogRow = catalogByItemId.get(value);
          if (catalogRow) {
            if (catalogRow.lastPrice != null) updated.unitPrice = String(catalogRow.lastPrice);
            if (catalogRow.purchaseUom && units) {
              const foundUom = (units as any[]).find((u) => u.nameEn === catalogRow.purchaseUom || u.nameAr === catalogRow.purchaseUom || u.code === catalogRow.purchaseUom);
              if (foundUom) updated.uomId = foundUom._id;
            }
          }
          if (!updated.unitPrice) {
            if (foundItem?.lastCost) updated.unitPrice = String(foundItem.lastCost);
            if (foundItem?.baseUomId && !updated.uomId) updated.uomId = foundItem.baseUomId;
          }
          if (!updated.uomId) {
            if (foundItem?.baseUomId) updated.uomId = foundItem.baseUomId;
          }
          if (!updated.accountId) {
            const autoAcc = foundItem?.cogsAccountId ?? foundItem?.expenseAccountId ?? null;
            if (autoAcc) updated.accountId = String(autoAcc);
          }
        }
        return updated;
      });
      if (field === "itemId" && value) {
        const isLastLine = prev[prev.length - 1]?.id === id;
        if (isLastLine) {
          const newId = Math.max(...mapped.map((l) => l.id)) + 1;
          return [...mapped, { id: newId, itemId: "", quantity: "1", unitPrice: "", uomId: "", accountId: "" }];
        }
      }
      return mapped;
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!effectiveBranchId && !branch) { setError(t("errNoBranch")); return; }
    if (!openPeriod) { setError(t("errNoPeriod")); return; }
    if (!defaultUser) { setError(t("errNoUser")); return; }
    if (!defaultCurrency) { setError(t("errNoCurrency")); return; }
    if (!supplierId) { setError(t("errNoSupplier")); return; }

    const validLines = lines.filter(
      (l) => l.itemId && parseFloat(l.quantity) > 0 && parseFloat(l.unitPrice) >= 0
    );
    if (validLines.length === 0) { setError(t("errNoLines")); return; }

    setSaving(true);
    setError("");

    try {
      // Build lines — manual accountId > item cogsAccountId > expenseAccountId
      const invoiceLines = validLines.map((l) => {
          const foundItem = (items ?? []).find((it: any) => it._id === l.itemId);
          const qty = parseFloat(l.quantity);
          const price = parseFloat(l.unitPrice);
          const total = qty * price;
          const resolvedUomId = l.uomId || foundItem?.baseUomId || (units ?? [])[0]?._id;
          const accountId = l.accountId || foundItem?.cogsAccountId || foundItem?.expenseAccountId || null;
          return {
            itemId: l.itemId as any,
            description: foundItem ? (foundItem.nameAr || "") : undefined,
            lineType: "stock_item" as const,
            quantity: qty,
            uomId: resolvedUomId as any,
            unitPrice: price,
            vatRate: 0,
            vatAmount: 0,
            lineTotal: total,
            accountId: accountId as any,
          };
        });

      const linesWithAccount = invoiceLines.filter((l) => l.accountId);
      if (linesWithAccount.length === 0) {
        setError(isRTL ? "يجب تحديد حساب لكل بند — اختر من قائمة الحساب" : "Select an account for each line");
        setSaving(false);
        return;
      }

      await createInvoice({
        companyId: company._id,
        branchId: (effectiveBranchId ?? branch?._id) as any,
        supplierId: supplierId as any,
        invoiceType: "stock_purchase",
        invoiceDate,
        dueDate,
        periodId: openPeriod._id,
        currencyId: defaultCurrency._id,
        exchangeRate: 1,
        notes: notes || undefined,
        createdBy: defaultUser._id,
        lines: linesWithAccount,
      });

      onClose();
    } catch (err: any) {
      setError(err.message ?? t("errUnexpected"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-[color:var(--ink-900)]">{t("newPurchaseInvoice")}</h3>
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Supplier */}
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("supplier")} *</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
              className="input-field h-9">
              <option value="">{t("selectSupplier")}</option>
              {(suppliers ?? []).map((s: any) => (
                <option key={s._id} value={s._id}>{isRTL ? s.nameAr : (s.nameEn || s.nameAr)}</option>
              ))}
            </select>
            {supplierId && supplierCatalog.length > 0 && (
              <div className="mt-1 text-[10px] text-emerald-600 font-medium">
                {sortedItems.hasCatalog ? sortedItems.inCatalog.length : 0} catalog items loaded
              </div>
            )}
          </div>

          {/* Invoice Date */}
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("invoiceDate")} *</label>
            <input type="date" required value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)}
              className="input-field h-9" />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("dueDate")} *</label>
            <input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="input-field h-9" />
          </div>
        </div>

        {/* Lines table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h4 className="text-xs font-semibold text-[color:var(--ink-700)] uppercase tracking-wide">{t("lines")}</h4>
              {/* A: show-all-items toggle — only relevant when a supplier with catalog is selected */}
              {supplierId && sortedItems.hasCatalog && (
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showAllItems}
                    onChange={(e) => setShowAllItems(e.target.checked)}
                    className="h-3.5 w-3.5 rounded accent-[color:var(--brand-600)]"
                  />
                  <span className="text-[11px] text-[color:var(--ink-500)]">
                    {isRTL ? "عرض كل الأصناف" : "Show all items"}
                  </span>
                  {!showAllItems && (
                    <span className="text-[10px] text-emerald-600 font-medium">
                      ({sortedItems.inCatalog.length} catalog)
                    </span>
                  )}
                </label>
              )}
            </div>
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
                  <th className="px-3 py-2 text-start font-semibold w-44">{isRTL ? "الحساب" : "Account"}</th>
                  <th className="px-3 py-2 text-end font-semibold w-28">{t("quantity")} *</th>
                  <th className="px-3 py-2 text-end font-semibold w-32">{t("unitPrice")} *</th>
                  <th className="px-3 py-2 text-end font-semibold w-32">{t("lineTotal")}</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const qty = parseFloat(line.quantity) || 0;
                  const price = parseFloat(line.unitPrice) || 0;
                  const total = qty * price;
                  const catalogRow = catalogByItemId.get(line.itemId);
                  return (
                    <tr key={line.id} className="border-t border-[color:var(--ink-100)]">
                      <td className="px-2 py-1.5">
                        <select value={line.itemId}
                          onChange={(e) => updateLine(line.id, "itemId", e.target.value)}
                          className="input-field h-8 w-full text-xs">
                          <option value="">{t("selectItem")}</option>
                          {/* A: scoped to supplier catalog unless "show all" is checked */}
                          {dropdownItems.catalogOnly ? (
                            // Catalog-only mode: flat list, no optgroups
                            dropdownItems.items.map((it: any) => (
                              <option key={it._id} value={it._id}>
                                {isRTL ? it.nameAr : (it.nameEn || it.nameAr)}
                              </option>
                            ))
                          ) : sortedItems.hasCatalog ? (
                            // Show-all mode with catalog on top
                            <>
                              <optgroup label="— Supplier Catalog">
                                {sortedItems.inCatalog.map((it: any) => (
                                  <option key={it._id} value={it._id}>
                                    {isRTL ? it.nameAr : (it.nameEn || it.nameAr)}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="— Other Items">
                                {sortedItems.notInCatalog.map((it: any) => (
                                  <option key={it._id} value={it._id}>
                                    {isRTL ? it.nameAr : (it.nameEn || it.nameAr)}
                                  </option>
                                ))}
                              </optgroup>
                            </>
                          ) : (
                            // No supplier / empty catalog
                            (items ?? []).map((it: any) => (
                              <option key={it._id} value={it._id}>
                                {isRTL ? it.nameAr : (it.nameEn || it.nameAr)}
                              </option>
                            ))
                          )}
                        </select>
                        {/* Catalog price hint */}
                        {catalogRow && (
                          <div className="mt-0.5 text-[10px] text-emerald-600 flex gap-2">
                            {catalogRow.lastPrice != null && <span>Last: {catalogRow.lastPrice.toFixed(2)}</span>}
                            {catalogRow.avgPrice != null && <span>Avg: {catalogRow.avgPrice.toFixed(2)}</span>}
                            {catalogRow.purchaseCount > 0 && <span>×{catalogRow.purchaseCount}</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={line.accountId}
                          onChange={(e) => updateLine(line.id, "accountId", e.target.value)}
                          className="input-field h-8 w-full text-xs"
                        >
                          <option value="">{isRTL ? "— اختر حساباً —" : "— select —"}</option>
                          {(expenseAccounts as any[]).map((a: any) => (
                            <option key={a._id} value={a._id}>
                              {a.code} — {isRTL ? a.nameAr : (a.nameEn || a.nameAr)}
                            </option>
                          ))}
                        </select>
                        {!line.accountId && (
                          <div className="mt-0.5 text-[10px] text-amber-500">
                            {isRTL ? "سيُؤخذ من الصنف" : "auto from item"}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min="0.001" step="0.001"
                          value={line.quantity}
                          onChange={(e) => updateLine(line.id, "quantity", e.target.value)}
                          className="input-field h-8 text-end w-full tabular-nums text-xs" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min="0" step="0.01"
                          value={line.unitPrice}
                          onChange={(e) => updateLine(line.id, "unitPrice", e.target.value)}
                          className="input-field h-8 text-end w-full tabular-nums text-xs" />
                        {/* Catalog badge when price auto-filled */}
                        {catalogRow && line.unitPrice && (
                          <div className="mt-0.5 text-[10px] text-emerald-600">catalog price</div>
                        )}
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

        {/* Subtotal & Notes */}
        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("notes")}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="input-field w-full resize-none text-sm" />
          </div>
          <div className="text-end space-y-1">
            <div className="text-xs text-[color:var(--ink-500)]">{t("subtotal")}</div>
            <div className="text-2xl font-bold text-[color:var(--ink-900)] tabular-nums">
              {subtotal.toFixed(2)}
            </div>
            <div className="text-xs text-[color:var(--ink-400)]">QAR</div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 space-y-2">
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="btn-primary h-10 px-5 rounded-lg inline-flex items-center gap-2 text-sm font-semibold disabled:opacity-60">
              {saving ? t("saving") : <><Check className="h-4 w-4" />{t("saveAsDraft")}</>}
            </button>
            <button type="button" onClick={onClose}
              className="h-10 px-5 rounded-lg border border-[color:var(--ink-200)] text-[color:var(--ink-700)] text-sm hover:bg-[color:var(--ink-50)]">
              {t("cancel")}
            </button>
          </div>
          {/* B: draft semantics explanation */}
          <p className="text-[11px] text-[color:var(--ink-400)] leading-relaxed max-w-lg">
            {isRTL
              ? "يتم حفظ الفاتورة كمسودة بدون أي تأثير على المخزون أو الحسابات حتى يتم ترحيلها."
              : "Saves the invoice as a draft with no impact on stock or accounts until it is posted."}
          </p>
        </div>
      </form>
    </div>
  );
}

// ─── Approve Button ────────────────────────────────────────────────────────────

function ApproveButton({ invoice, userId }: { invoice: any; userId: string | undefined }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const approve = useMutation(api.purchaseInvoices.approvePurchaseInvoice);

  if (invoice.documentStatus !== "draft") return null;
  if (!userId) return null;

  const handle = async () => {
    setLoading(true); setErr("");
    try { await approve({ invoiceId: invoice._id, userId: userId as any }); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      {err && <span className="text-xs text-red-600 max-w-[200px] text-end">{err}</span>}
      <button
        onClick={handle}
        disabled={loading}
        className="h-7 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 disabled:opacity-60"
      >
        <CheckCircle className="h-3.5 w-3.5" />
        {loading ? t("approving") : t("approve")}
      </button>
    </div>
  );
}

// ─── Reverse Button ────────────────────────────────────────────────────────────

function ReverseButton({ invoice, userId, companyId }: { invoice: any; userId: string | undefined; companyId: string | undefined }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const reverse = useMutation(api.purchaseInvoices.reversePurchaseInvoice);
  const today = new Date().toISOString().split("T")[0];
  const openPeriod = useQuery(
    api.helpers.getOpenPeriod,
    companyId ? { companyId: companyId as any, date: today } : "skip"
  );

  if (invoice.postingStatus !== "posted") return null;
  if (!userId) return null;

  const handle = async () => {
    if (!openPeriod) { setErr(t("errNoPeriod")); return; }
    setLoading(true); setErr("");
    try {
      await reverse({
        invoiceId: invoice._id,
        userId: userId as any,
        reversalDate: today,
        reversalPeriodId: openPeriod._id,
      });
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      {err && <span className="text-xs text-red-600 max-w-[200px] text-end">{err}</span>}
      <button
        onClick={handle}
        disabled={loading || !openPeriod}
        className="h-7 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 disabled:opacity-60"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        {loading ? t("reversing") : t("reverse")}
      </button>
    </div>
  );
}

function PurchaseLifecycleActions({ invoice, userId, companyId }: { invoice: any; userId: string | undefined; companyId: string | undefined }) {
  const { t } = useI18n();
  const [loadingAction, setLoadingAction] = useState<"delete" | "cancel" | "reverse" | null>(null);
  const [err, setErr] = useState("");
  const removeDraft = useMutation(api.purchaseInvoices.deleteDraftPurchaseInvoice);
  const cancelInvoice = useMutation(api.purchaseInvoices.cancelPurchaseInvoice);
  const reverseInvoice = useMutation(api.purchaseInvoices.reversePurchaseInvoice);
  const today = new Date().toISOString().split("T")[0];
  const openPeriod = useQuery(
    api.helpers.getOpenPeriod,
    companyId ? { companyId: companyId as any, date: today } : "skip"
  );

  if (!userId) return null;

  const handleDelete = async () => {
    if (!window.confirm("سيتم حذف مسودة فاتورة المشتريات نهائيًا. هل تريد المتابعة؟")) return;
    setLoadingAction("delete");
    setErr("");
    try {
      await removeDraft({ invoiceId: invoice._id, userId: userId as any });
    } catch (e: any) {
      setErr(e.message ?? t("delete"));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("سيتم إلغاء فاتورة المشتريات قبل الترحيل. هل تريد المتابعة؟")) return;
    setLoadingAction("cancel");
    setErr("");
    try {
      await cancelInvoice({ invoiceId: invoice._id, userId: userId as any });
    } catch (e: any) {
      setErr(e.message ?? t("cancel"));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReverse = async () => {
    if (!openPeriod) { setErr(t("errNoPeriod")); return; }
    if (!window.confirm("سيتم إنشاء عكس محاسبي لفاتورة المشتريات المرحلة. هل تريد المتابعة؟")) return;
    setLoadingAction("reverse");
    setErr("");
    try {
      await reverseInvoice({
        invoiceId: invoice._id,
        userId: userId as any,
        reversalDate: today,
        reversalPeriodId: openPeriod._id,
      });
    } catch (e: any) {
      setErr(e.message ?? t("reverse"));
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      {err ? <span className="text-xs text-red-600 max-w-[220px] text-end leading-tight">{err}</span> : null}
      <div className="inline-flex items-center gap-1">
        {invoice.documentStatus === "draft" && invoice.postingStatus === "unposted" ? (
          <button
            onClick={handleDelete}
            disabled={loadingAction !== null}
            className="h-7 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 disabled:opacity-60"
          >
            {loadingAction === "delete" ? t("loading") : t("delete")}
          </button>
        ) : null}

        {invoice.postingStatus === "unposted" && invoice.documentStatus === "approved" ? (
          <button
            onClick={handleCancel}
            disabled={loadingAction !== null}
            className="h-7 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 disabled:opacity-60"
          >
            {loadingAction === "cancel" ? t("loading") : t("cancel")}
          </button>
        ) : null}

        {invoice.postingStatus === "posted" ? (
          <button
            onClick={handleReverse}
            disabled={loadingAction !== null || !openPeriod}
            className="h-7 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 disabled:opacity-60"
          >
            {loadingAction === "reverse" ? t("loading") : t("reverse")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─── Post Button ───────────────────────────────────────────────────────────────

function PostButton({ invoice, userId }: { invoice: any; userId: string | undefined }) {
  const { t } = useI18n();
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState("");
  const quickPost = useMutation(api.purchaseInvoices.quickPostPurchaseInvoice);

  if (invoice.postingStatus === "posted" || invoice.postingStatus === "reversed") return null;
  if (!userId) return null;

  const handlePost = async () => {
    setPosting(true);
    setErr("");
    try {
      await quickPost({ invoiceId: invoice._id, userId: userId as any });
    } catch (e: any) {
      setErr(e.message ?? t("errPosting"));
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      {err && (
        <span className="text-xs text-red-600 max-w-[200px] text-end leading-tight">{err}</span>
      )}
      <button
        onClick={handlePost}
        disabled={posting}
        title={err || t("post")}
        className="h-7 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-60">
        {posting ? t("posting") : t("post")}
      </button>
    </div>
  );
}

// ─── Premium Stat Component ─────────────────────────────────────────────────────

function PurchaseStatCard({ title, value }: any) {
  return (
    <div className="bg-white rounded-lg p-3 border border-green-600 flex-1">
      <div className="text-[10px] font-bold text-green-700 uppercase mb-1">{title}</div>
      <div className="text-lg font-bold text-gray-900 tabular-nums">{value}</div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PurchaseInvoicesPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const router = useRouter();
  const { currentUser: defaultUser } = useAuth();
  const { canCreate, canPost } = usePermissions();
  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const [postingStatus, setPostingStatus] = useState<string>("");
  const [docStatusFilter, setDocStatusFilter] = useState<string>(""); // B: draft/approved filter
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];

  const invoices = useQuery(
    api.purchaseInvoices.listByCompany,
    company
      ? {
          companyId: company._id,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          postingStatus: (postingStatus as any) || undefined,
          branchId: branchArg as any,
        }
      : "skip"
  );

  const loading = invoices === undefined;

  const filtered = (invoices ?? []).filter((inv: any) => {
    // B: documentStatus (draft/approved) filter
    if (docStatusFilter && inv.documentStatus !== docStatusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (inv.invoiceNumber || "").toLowerCase().includes(s) ||
      (inv.supplierName || "").toLowerCase().includes(s);
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Summary
  const posted = filtered.filter((i: any) => i.postingStatus === "posted");
  const totalAmount = filtered.reduce((s: any, i: any) => s + i.totalAmount, 0);
  const postedAmount = posted.reduce((s: any, i: any) => s + i.totalAmount, 0);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      <div className="no-print">
      <PageHeader
        icon={ShoppingCart}
        title={t("purchaseInvoicesTitle")}
        badge={<span className="text-xs text-[color:var(--ink-400)] font-normal">({filtered.length})</span>}
        actions={canCreate("purchases") ? (
          <button onClick={() => { setShowForm((v) => !v); setPage(0); }}
            className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
            <Plus className="h-4 w-4" /> {t("newPurchaseInvoice")}
          </button>
        ) : undefined}
      />
      </div>

      {showForm && <NewPurchaseInvoiceForm onClose={() => setShowForm(false)} />}

      {/* Modern Filter Strip - Box Design */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 flex flex-wrap items-end gap-3 w-full">
        <button className="h-10 px-3 border border-gray-200 rounded-md flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <Filter className="h-4 w-4" /> {t("filters")}
        </button>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">{t("fromDate")}</label>
          <div className="relative">
            <Calendar className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? "right-3" : "left-3"}`} />
            <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
              className={`h-10 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-400 w-[160px]`} />
          </div>
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">{t("toDate")}</label>
          <div className="relative">
            <Calendar className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? "right-3" : "left-3"}`} />
            <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(0); }}
              className={`h-10 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-400 w-[160px]`} />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">{t("postingStatus")}</label>
          <select value={postingStatus} onChange={(e) => { setPostingStatus(e.target.value); setPage(0); }}
            className="h-10 px-3 border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-400 min-w-[140px] bg-white cursor-pointer appearance-none">
            <option value="">{t("all")}</option>
            <option value="unposted">{t("statusUnposted")}</option>
            <option value="posted">{t("statusPosted")}</option>
            <option value="reversed">{t("statusReversed")}</option>
          </select>
        </div>
        {/* B: Document status filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">{isRTL ? "حالة المستند" : "Document"}</label>
          <select value={docStatusFilter} onChange={(e) => { setDocStatusFilter(e.target.value); setPage(0); }}
            className="h-10 px-3 border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-400 min-w-[120px] bg-white cursor-pointer appearance-none">
            <option value="">{t("all")}</option>
            <option value="draft">{isRTL ? "مسودة" : "Draft"}</option>
            <option value="approved">{isRTL ? "معتمد" : "Approved"}</option>
          </select>
        </div>
        <div className={`flex-1 min-w-[200px] ${isRTL ? "mr-auto" : "ml-auto"}`}>
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? "right-3" : "left-3"}`} />
            <input 
              type="text" 
              value={search} 
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder={t("searchPlaceholder")}
              className={`w-full h-10 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-400`} 
            />
          </div>
        </div>
      </div>

      {/* Premium KPI Cards - Grouped Design */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col md:flex-row gap-4 w-full">
        <PurchaseStatCard title={t("invoiceCount")} value={filtered.length} />
        <PurchaseStatCard title={t("totalAmount")} value={formatCurrency(totalAmount)} />
        <PurchaseStatCard title={t("posted")} value={formatCurrency(postedAmount)} />
      </div>

      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-[color:var(--ink-100)] overflow-hidden">
        {loading ? (
          <LoadingState label={t("loading")} />
        ) : paginated.length === 0 ? (
          <EmptyState
            title={t("noResults")}
            action={canCreate("purchases") ? (
              <button onClick={() => setShowForm(true)}
                className="btn-primary h-10 px-5 rounded-xl inline-flex items-center gap-2 text-sm font-semibold">
                <Plus className="h-4 w-4" /> {t("newPurchaseInvoice")}
              </button>
            ) : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse" dir={isRTL ? "rtl" : "ltr"}>
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("invoiceNo")}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("date")}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("supplier")}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-end">{t("amount")}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">{isRTL ? "المستند" : "Doc"}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">{t("postingStatus")}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-end">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((inv: any) => (
                    <tr key={inv._id} className="group hover:bg-gray-50/80 transition-all duration-200">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                          {inv.invoiceNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 font-medium">{formatDateShort(inv.invoiceDate)}</td>
                      <td className="px-6 py-4 font-bold text-gray-900 text-sm">{inv.supplierName}</td>
                      <td className="px-6 py-4 text-end tabular-nums font-bold text-gray-900 text-sm">{formatCurrency(inv.totalAmount)}</td>
                      {/* B: document status badge */}
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                          inv.documentStatus === "draft"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : inv.documentStatus === "approved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-gray-50 text-gray-500 border-gray-200"
                        }`}>
                          {inv.documentStatus === "draft" ? (isRTL ? "مسودة" : "Draft")
                           : inv.documentStatus === "approved" ? (isRTL ? "معتمد" : "Approved")
                           : inv.documentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={inv.postingStatus} type="posting" />
                      </td>
                      <td className="px-6 py-4 text-end">
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {canPost("purchases") && <ApproveButton invoice={inv} userId={defaultUser?._id} />}
                          {canPost("purchases") && <ApproveButton invoice={inv} userId={defaultUser?._id} />}
                          {canPost("purchases") && <PostButton invoice={inv} userId={defaultUser?._id} />}
                          <PurchaseLifecycleActions invoice={inv} userId={defaultUser?._id} companyId={company?._id} />
                          <button
                            onClick={() => router.push(`/purchases/invoices/${inv._id}`)}
                            className="h-8 w-8 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-sm flex items-center justify-center transition-all"
                            title={t("view")}>
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-[color:var(--ink-100)] bg-white">
                <p className="text-xs font-medium text-[color:var(--ink-500)]">{page + 1} / {totalPages}</p>
                <div className="flex items-center gap-2">
                  <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[color:var(--ink-200)] text-[color:var(--ink-600)] hover:bg-[color:var(--ink-50)] disabled:opacity-40 transition-colors">
                    {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  </button>
                  <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[color:var(--ink-200)] text-[color:var(--ink-600)] hover:bg-[color:var(--ink-50)] disabled:opacity-40 transition-colors">
                    {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
