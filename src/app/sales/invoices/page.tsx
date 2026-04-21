// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatDateShort } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { INVOICE_TYPE_LABELS } from "@/lib/constants";
import { Eye, ChevronLeft, ChevronRight, Search, Landmark, Plus, X, Check, Trash2, MapPin } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

const PAGE_SIZE = 50;

function todayISO() { return new Date().toISOString().split("T")[0]; }
function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ─── Invoice line type ─────────────────────────────────────────────────────────

interface InvoiceLine {
  id: number;
  itemId: string;
  quantity: string;
  unitPrice: string;
}

// ─── New Invoice Form ──────────────────────────────────────────────────────────

function NewInvoiceForm({ onClose }: { onClose: () => void }) {
  const { t, isRTL } = useI18n();

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];

  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(todayISO());
  const [invoiceType, setInvoiceType] = useState<"cash_sale" | "credit_sale">("cash_sale");
  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [outletId, setOutletId] = useState("");
  const [notes, setNotes] = useState("");
  const [lineIdCounter, setLineIdCounter] = useState(1);
  const [lines, setLines] = useState<InvoiceLine[]>([{ id: 0, itemId: "", quantity: "1", unitPrice: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Queries for dependencies
  const selectedBranchStore = useAppStore((s) => s.selectedBranch);
  const branch = useQuery(api.branches.getDefaultBranch, company ? { companyId: company._id } : "skip");
  const effectiveBranchId = selectedBranchStore !== "all" ? selectedBranchStore : branch?._id;
  const openPeriod = useQuery(api.helpers.getOpenPeriod, company ? { companyId: company._id, date: invoiceDate } : "skip");
  const { currentUser: defaultUser } = useAuth();
  const defaultCurrency = useQuery(api.helpers.getDefaultCurrency, {});
  const customers = useQuery(api.customers.getAll, company ? { companyId: company._id } : "skip");
  const items = useQuery(api.items.getAllItems, company ? { companyId: company._id } : "skip");
  const warehouses = useQuery(api.items.getAllWarehouses, company ? { companyId: company._id } : "skip");
  const outlets = useQuery(
    api.customerOutlets.getAll,
    customerId ? { customerId: customerId as any } : "skip"
  );
  const units = useQuery(api.items.getAllUnits, company ? { companyId: company._id } : "skip");

  const createInvoice = useMutation(api.salesInvoices.createSalesInvoice);

  // Compute subtotal
  const subtotal = lines.reduce((sum, l) => {
    const qty = parseFloat(l.quantity) || 0;
    const price = parseFloat(l.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const addLine = () => {
    setLines((prev) => [...prev, { id: lineIdCounter, itemId: "", quantity: "1", unitPrice: "" }]);
    setLineIdCounter((c) => c + 1);
  };

  const removeLine = (id: number) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLine = (id: number, field: keyof InvoiceLine, value: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        // Auto-fill unit price from item sellingPrice when item changes
        if (field === "itemId" && value) {
          const foundItem = (items ?? []).find((it: any) => it._id === value);
          if (foundItem?.sellingPrice) {
            updated.unitPrice = String(foundItem.sellingPrice);
          }
        }
        return updated;
      })
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!effectiveBranchId) { setError("لا يوجد فرع افتراضي للشركة"); return; }
    if (!openPeriod) { setError("لا توجد فترة محاسبية مفتوحة للتاريخ المحدد"); return; }
    if (!defaultUser) { setError("لا يوجد مستخدم في النظام"); return; }
    if (!defaultCurrency) { setError("لا توجد عملة افتراضية في النظام"); return; }
    if (!warehouseId) { setError(t("errNoWarehouse")); return; }
    if (invoiceType === "credit_sale" && !customerId) { setError(t("errNoCustomer")); return; }
    const validLines = lines.filter((l) => l.itemId && parseFloat(l.quantity) > 0 && parseFloat(l.unitPrice) >= 0);
    if (validLines.length === 0) { setError(t("errNoLines")); return; }

    setSaving(true);
    setError("");

    try {
      // Build lines — resolve uomId from item's baseUomId
      const invoiceLines = validLines.map((l) => {
        const foundItem = (items ?? []).find((it: any) => it._id === l.itemId);
        const qty = parseFloat(l.quantity);
        const price = parseFloat(l.unitPrice);
        const total = Math.round(qty * price * 100);
        return {
          itemId: l.itemId as any,
          quantity: qty,
          uomId: (foundItem?.baseUomId ?? (units ?? [])[0]?._id) as any,
          unitPrice: Math.round(price * 100),
          discountPct: 0,
          discountAmount: 0,
          vatRate: 0,
          vatAmount: 0,
          lineTotal: total,
          revenueAccountId: foundItem?.revenueAccountId ?? undefined,
          cogsAccountId: foundItem?.cogsAccountId ?? undefined,
        };
      });

      await createInvoice({
        companyId: company._id,
        branchId: effectiveBranchId as any,
        invoiceType: invoiceType as any,
        customerId: customerId ? (customerId as any) : undefined,
        invoiceDate,
        dueDate: invoiceType === "credit_sale" ? dueDate : undefined,
        periodId: openPeriod._id,
        currencyId: defaultCurrency._id,
        exchangeRate: 1,
        warehouseId: warehouseId as any,
        discountAmount: 0,
        serviceCharge: 0,
        cashReceived: invoiceType === "cash_sale" ? Math.round(subtotal * 100) : 0,
        cardReceived: 0,
        notes: notes || undefined,
        createdBy: defaultUser._id,
        customerOutletId: outletId ? (outletId as any) : undefined,
        lines: invoiceLines,
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
        <h3 className="text-base font-semibold text-[color:var(--ink-900)]">{t("newSalesInvoice")}</h3>
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
          {/* Invoice Type */}
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("invoiceType")} *</label>
            <select value={invoiceType} onChange={(e) => { setInvoiceType(e.target.value as any); setCustomerId(""); }}
              className="input-field h-9">
              <option value="cash_sale">{t("cash")}</option>
              <option value="credit_sale">{t("creditSale")}</option>
            </select>
          </div>

          {/* Invoice Date */}
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("invoiceDate")} *</label>
            <input type="date" required value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)}
              className="input-field h-9" />
          </div>

          {/* Due Date (credit only) */}
          {invoiceType === "credit_sale" && (
            <div>
              <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("dueDate")} *</label>
              <input type="date" required={invoiceType === "credit_sale"} value={dueDate}
                onChange={(e) => setDueDate(e.target.value)} className="input-field h-9" />
            </div>
          )}

          {/* Customer (credit_sale shows required) */}
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
              {t("customer")}{invoiceType === "credit_sale" ? " *" : ""}
            </label>
            <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setOutletId(""); }}
              className="input-field h-9">
              <option value="">{t("selectCustomer")}</option>
              {(customers ?? []).map((c: any) => (
                <option key={c._id} value={c._id}>{isRTL ? c.nameAr : (c.nameEn || c.nameAr)}</option>
              ))}
            </select>
          </div>

          {/* Warehouse */}
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("warehouse")} *</label>
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="input-field h-9">
              <option value="">{t("selectWarehouse")}</option>
              {(warehouses ?? []).map((w: any) => (
                <option key={w._id} value={w._id}>{isRTL ? w.nameAr : (w.nameEn || w.nameAr)}</option>
              ))}
            </select>
          </div>

          {/* Outlet (only when customer selected) */}
          {customerId && (
            <div>
              <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("outlet")}</label>
              <select value={outletId} onChange={(e) => setOutletId(e.target.value)} className="input-field h-9">
                <option value="">{t("selectOutlet")}</option>
                {(outlets ?? []).map((o: any) => (
                  <option key={o._id} value={o._id}>{isRTL ? o.nameAr : (o.nameEn || o.nameAr)}</option>
                ))}
              </select>
            </div>
          )}
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
                  <th className="px-3 py-2 text-end font-semibold w-28">{t("quantity")} *</th>
                  <th className="px-3 py-2 text-end font-semibold w-32">{t("unitPrice")} *</th>
                  <th className="px-3 py-2 text-end font-semibold w-32">{t("lineTotal")}</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  const qty = parseFloat(line.quantity) || 0;
                  const price = parseFloat(line.unitPrice) || 0;
                  const total = qty * price;
                  return (
                    <tr key={line.id} className="border-t border-[color:var(--ink-100)]">
                      <td className="px-2 py-1.5">
                        <select value={line.itemId} onChange={(e) => updateLine(line.id, "itemId", e.target.value)}
                          className="input-field h-8 w-full text-xs">
                          <option value="">{t("selectItem")}</option>
                          {(items ?? []).map((it: any) => (
                            <option key={it._id} value={it._id}>{isRTL ? it.nameAr : (it.nameEn || it.nameAr)}</option>
                          ))}
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
                          value={line.unitPrice}
                          onChange={(e) => updateLine(line.id, "unitPrice", e.target.value)}
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
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="btn-primary h-10 px-5 rounded-lg inline-flex items-center gap-2 text-sm font-semibold disabled:opacity-60">
            {saving ? t("saving") : <><Check className="h-4 w-4" />{t("saveAsDraft")}</>}
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

// ─── Post Button ───────────────────────────────────────────────────────────────

function PostButton({ invoice, userId }: { invoice: any; userId: string | undefined }) {
  const { t } = useI18n();
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState("");
  const quickPost = useMutation(api.salesInvoices.quickPostSalesInvoice);

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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SalesInvoicesPage() {
  const { t, isRTL, lang, formatCurrency } = useI18n();
  const { currentUser: defaultUser } = useAuth();
  const { canCreate, canPost } = usePermissions();
  const router = useRouter();
  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;
  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const [invoiceType, setInvoiceType] = useState<string>("");
  const [postingStatus, setPostingStatus] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<string>("");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];

  const invoices = useQuery(
    api.salesInvoices.listByCompany,
    company
      ? {
          companyId: company._id,
          branchId: branchArg as any,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          invoiceType: (invoiceType as any) || undefined,
          postingStatus: (postingStatus as any) || undefined,
          paymentStatus: (paymentStatus as any) || undefined,
        }
      : "skip"
  );

  const loading = invoices === undefined;

  const filtered = (invoices ?? []).filter((inv: any) => {
    if (!searchText) return true;
    const s = searchText.toLowerCase();
    return inv.invoiceNumber.toLowerCase().includes(s) ||
      (inv as any).customerName?.toLowerCase().includes(s);
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Summary
  const posted = filtered.filter((i: any) => i.postingStatus === "posted");
  const totalSales = posted.reduce((s: any, i: any) => s + i.totalAmount, 0);
  const totalPaid = posted.reduce((s: any, i: any) => s + i.cashReceived + i.cardReceived, 0);
  const totalCredit = posted.reduce((s: any, i: any) => s + i.creditAmount, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center"
            style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}>
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">{t("salesInvoicesTitle")}</h1>
            <p className="text-xs text-[color:var(--ink-500)] mt-0.5">{filtered.length}</p>
          </div>
        </div>
        {canCreate("sales") && (
        <button onClick={() => { setShowForm((v) => !v); }}
          className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4" /> {t("newInvoice")}
        </button>
        )}
      </div>

      {/* Inline Form */}
      {showForm && <NewInvoiceForm onClose={() => setShowForm(false)} />}

      {/* Filter Bar */}
      <div className="surface-card p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[color:var(--ink-500)]">{t("fromDate")}:</span>
          <input type="date" value={fromDate} onChange={(e: any) => { setFromDate(e.target.value); setPage(0); }}
            className="input-field h-9 w-auto" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[color:var(--ink-500)]">{t("toDate")}:</span>
          <input type="date" value={toDate} onChange={(e: any) => { setToDate(e.target.value); setPage(0); }}
            className="input-field h-9 w-auto" />
        </div>
        <select value={invoiceType} onChange={(e: any) => { setInvoiceType(e.target.value); setPage(0); }}
          className="input-field h-9 w-auto">
          <option value="">{t("allStatuses")}</option>
          <option value="cash_sale">{t("cash")}</option>
          <option value="credit_sale">{t("creditSale")}</option>
        </select>
        <select value={postingStatus} onChange={(e: any) => { setPostingStatus(e.target.value); setPage(0); }}
          className="input-field h-9 w-auto">
          <option value="">{t("allStatuses")}</option>
          <option value="unposted">{t("statusUnposted")}</option>
          <option value="posted">{t("statusPosted")}</option>
          <option value="reversed">{t("statusReversed")}</option>
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[color:var(--ink-400)] ${isRTL ? "right-3" : "left-3"}`} />
          <input type="text" value={searchText} onChange={(e: any) => { setSearchText(e.target.value); setPage(0); }}
            placeholder={t("searchPlaceholder")}
            className={`input-field h-9 ${isRTL ? "pr-9" : "pl-9"}`} />
        </div>
      </div>

      {/* Summary */}
      <div className="surface-card p-3 flex items-center gap-6 text-sm">
        <div><span className="text-[color:var(--ink-500)]">{t("amount")}: </span><span className="font-semibold text-[color:var(--ink-900)] tabular-nums">{formatCurrency(totalSales)}</span></div>
        <div><span className="text-[color:var(--ink-500)]">{t("posted")}: </span><span className="font-semibold text-emerald-700 tabular-nums">{formatCurrency(totalPaid)}</span></div>
        <div><span className="text-[color:var(--ink-500)]">{t("balance")}: </span><span className="font-semibold text-[color:var(--brand-700)] tabular-nums">{formatCurrency(totalCredit)}</span></div>
      </div>

      {/* Table */}
      <div className="surface-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[color:var(--ink-400)]">
            <div className="animate-spin h-8 w-8 border-2 border-[color:var(--brand-600)] border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm">{t("loading")}</p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center text-[color:var(--ink-400)]">
            <p className="text-sm">{t("noResults")}</p>
            {canCreate("sales") && (
            <button onClick={() => setShowForm(true)}
              className="text-sm text-[color:var(--brand-700)] hover:underline mt-1">
              + {t("newInvoice")}
            </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full zebra-table text-sm">
                <thead className="bg-[color:var(--ink-50)] text-[color:var(--ink-600)] text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-start font-semibold">{t("invoiceNo")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("date")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("type")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("customer")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("outlet")}</th>
                    <th className="px-4 py-3 text-end font-semibold">{t("amount")}</th>
                    <th className="px-4 py-3 text-center font-semibold">{t("postingStatus")}</th>
                    <th className="px-4 py-3 text-end font-semibold">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((inv: any) => (
                    <tr key={inv._id}
                      className="border-t border-[color:var(--ink-100)] hover:bg-[color:var(--brand-50)]/40">
                      <td className="px-4 py-3 font-mono text-xs text-[color:var(--brand-700)]">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-[color:var(--ink-600)]">{formatDateShort(inv.invoiceDate)}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[color:var(--ink-500)]">
                          {INVOICE_TYPE_LABELS[inv.invoiceType as keyof typeof INVOICE_TYPE_LABELS]?.[lang]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[color:var(--ink-700)]">{(inv as any).customerName}</td>
                      <td className="px-4 py-3 text-[color:var(--ink-500)] text-xs">
                        {(inv as any).outletName ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3 flex-shrink-0 text-[color:var(--brand-500)]" />
                            {isRTL ? (inv as any).outletName : ((inv as any).outletNameEn || (inv as any).outletName)}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-end font-semibold tabular-nums">{formatCurrency(inv.totalAmount)}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={inv.postingStatus} type="posting" />
                      </td>
                      <td className="px-4 py-3 text-end inline-flex items-center gap-2 justify-end">
                        {canPost("sales") && <PostButton invoice={inv} userId={defaultUser?._id} />}
                        <button
                          onClick={() => router.push(`/sales/invoices/${inv._id}`)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-[color:var(--brand-50)] text-[color:var(--ink-600)]"
                          title={t("view")}>
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[color:var(--ink-100)]">
                <p className="text-xs text-[color:var(--ink-500)]">{page + 1} / {totalPages}</p>
                <div className="flex items-center gap-1">
                  <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
                    className="p-1.5 rounded-lg hover:bg-[color:var(--ink-50)] disabled:opacity-40">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}
                    className="p-1.5 rounded-lg hover:bg-[color:var(--ink-50)] disabled:opacity-40">
                    <ChevronLeft className="h-4 w-4" />
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
