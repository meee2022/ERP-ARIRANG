// @ts-nocheck
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatDateShort } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { INVOICE_TYPE_LABELS } from "@/lib/constants";
import { Eye, ChevronLeft, ChevronRight, Search, Landmark, Plus, X, Check, Trash2, WalletCards, CheckCircle2, Scale, Calendar, Filter, FileText } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";
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

// ─── Invoice line type ─────────────────────────────────────────────────────────

interface InvoiceLine {
  id: number;
  itemId: string;
  quantity: string;
  unitPrice: string;
}

const SALES_PAYMENT_METHODS = ["cash", "hand", "main_safe", "cash_sales_safe", "card", "transfer", "credit"] as const;

// ─── New Invoice Form ──────────────────────────────────────────────────────────

function NewInvoiceForm({ onClose }: { onClose: () => void }) {
  const { t, isRTL } = useI18n();

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];

  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(todayISO());
  const [externalInvoiceNumber, setExternalInvoiceNumber] = useState("");
  const [invoiceType, setInvoiceType] = useState<"cash_sale" | "credit_sale">("cash_sale");
  const [paymentMethod, setPaymentMethod] = useState<(typeof SALES_PAYMENT_METHODS)[number]>("cash");
  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [salesRepId, setSalesRepId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [lineIdCounter, setLineIdCounter] = useState(1);
  const [lines, setLines] = useState<InvoiceLine[]>([{ id: 0, itemId: "", quantity: "1", unitPrice: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // C: group → branch flow
  const [selectedGroupId, setSelectedGroupId] = useState(""); // group parent customer _id
  const [selectedGroupNorm, setSelectedGroupNorm] = useState(""); // its customerGroupNorm

  // Queries for dependencies
  const { currentUser: defaultUser } = useAuth();
  const selectedBranchStore = useAppStore((s) => s.selectedBranch);
  const setSelectedBranch = useAppStore((s) => s.setSelectedBranch);
  const branch = useQuery(api.branches.getDefaultBranch, company ? { companyId: company._id } : "skip");
  const allowedBranchIds = defaultUser?.branchIds ?? [];
  const selectedBranchAllowed =
    selectedBranchStore !== "all" && allowedBranchIds.includes(selectedBranchStore as any);
  const effectiveBranchId =
    selectedBranchAllowed
      ? selectedBranchStore
      : allowedBranchIds[0] ?? branch?._id;
  const openPeriod = useQuery(
    api.helpers.getOpenPeriod,
    company && effectiveBranchId ? { companyId: company._id, date: invoiceDate } : "skip"
  );

  useEffect(() => {
    if (!defaultUser) return;
    if (selectedBranchStore === "all" && defaultUser.branchIds?.length === 1) {
      setSelectedBranch(defaultUser.branchIds[0] as any);
      return;
    }
    if (selectedBranchStore !== "all" && !defaultUser.branchIds?.includes(selectedBranchStore as any)) {
      setSelectedBranch((defaultUser.branchIds?.[0] ?? "all") as any);
    }
  }, [defaultUser, selectedBranchStore, setSelectedBranch]);
  const defaultCurrency = useQuery(api.helpers.getDefaultCurrency, {});
  // C: load only group-parent accounts for the customer picker
  const customerGroups = useQuery(api.customers.getGroups, company ? { companyId: company._id } : "skip") ?? [];
  // C: load branches for selected group
  const groupBranches = useQuery(
    api.customers.getBranchesByGroup,
    company && selectedGroupNorm ? { companyId: company._id, groupNorm: selectedGroupNorm } : "skip"
  ) ?? [];
  const items = useQuery(api.items.getSellableItems, company ? { companyId: company._id } : "skip");
  const warehouses = useQuery(api.items.getAllWarehouses, company ? { companyId: company._id } : "skip");
  const salesReps = useQuery(api.salesMasters.listSalesReps, company ? { companyId: company._id } : "skip") ?? [];
  const vehicles = useQuery(api.salesMasters.listVehicles, company ? { companyId: company._id } : "skip") ?? [];
  const units = useQuery(api.items.getAllUnits, company ? { companyId: company._id } : "skip");

  const createInvoice = useMutation(api.salesInvoices.createSalesInvoice);

  // Compute subtotal
  const subtotal = lines.reduce((sum, l) => {
    const qty = parseFloat(l.quantity) || 0;
    const price = parseFloat(l.unitPrice) || 0;
    return sum + qty * price;
  }, 0);
  const discountValue = Math.max(0, parseFloat(discountAmount) || 0);
  const netAfterDiscount = Math.max(0, subtotal - discountValue);

  useEffect(() => {
    if (invoiceType === "credit_sale") {
      setPaymentMethod("credit");
      return;
    }
    if (paymentMethod === "credit") {
      setPaymentMethod("cash");
    }
  }, [invoiceType, paymentMethod]);

  const paymentMethodOptions = useMemo(() => {
    if (invoiceType === "credit_sale") {
      return SALES_PAYMENT_METHODS.filter((method) => method === "credit");
    }
    return SALES_PAYMENT_METHODS.filter((method) => method !== "credit");
  }, [invoiceType]);

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
        externalInvoiceNumber: externalInvoiceNumber.trim() || undefined,
        warehouseId: warehouseId as any,
        salesRepId: salesRepId ? (salesRepId as any) : undefined,
        salesRepName: salesRepId ? (salesReps.find((rep: any) => rep._id === salesRepId)?.nameAr ?? undefined) : undefined,
        vehicleId: vehicleId ? (vehicleId as any) : undefined,
        vehicleCode: vehicleId ? (vehicles.find((vehicle: any) => vehicle._id === vehicleId)?.code ?? undefined) : undefined,
        paymentMethod,
        discountAmount: Math.round(discountValue * 100),
        serviceCharge: 0,
        cashReceived:
          invoiceType === "cash_sale" && ["cash", "hand", "main_safe", "cash_sales_safe", "transfer"].includes(paymentMethod)
            ? Math.round(netAfterDiscount * 100)
            : 0,
        cardReceived:
          invoiceType === "cash_sale" && paymentMethod === "card"
            ? Math.round(netAfterDiscount * 100)
            : 0,
        notes: notes || undefined,
        createdBy: defaultUser._id,
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

          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("paymentMethod")}</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className="input-field h-9">
              {paymentMethodOptions.map((method) => (
                <option key={method} value={method}>
                  {method === "cash"
                    ? t("pmCash")
                    : method === "hand"
                      ? t("pmHand")
                      : method === "main_safe"
                        ? t("pmMainSafe")
                        : method === "cash_sales_safe"
                          ? t("pmCashSalesSafe")
                    : method === "card"
                      ? t("pmCard")
                      : method === "transfer"
                        ? t("pmTransfer")
                        : t("credit")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("customerInvoiceNo")}</label>
            <input
              type="text"
              value={externalInvoiceNumber}
              onChange={(e) => setExternalInvoiceNumber(e.target.value)}
              className="input-field h-9"
            />
          </div>

          {/* Due Date (credit only) */}
          {invoiceType === "credit_sale" && (
            <div>
              <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("dueDate")} *</label>
              <input type="date" required={invoiceType === "credit_sale"} value={dueDate}
                onChange={(e) => setDueDate(e.target.value)} className="input-field h-9" />
            </div>
          )}

          {/* C: Customer = group picker */}
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
              {t("customer")}{invoiceType === "credit_sale" ? " *" : ""}
            </label>
            <select value={selectedGroupId} onChange={(e) => {
              const groupId = e.target.value;
              setSelectedGroupId(groupId);
              setCustomerId("");
              if (groupId) {
                const grp = customerGroups.find((g: any) => g._id === groupId);
                setSelectedGroupNorm(grp?.customerGroupNorm ?? grp?.normalizedName ?? "");
              } else {
                setSelectedGroupNorm("");
              }
            }} className="input-field h-9">
              <option value="">{t("selectCustomer")}</option>
              {customerGroups.map((c: any) => (
                <option key={c._id} value={c._id}>{isRTL ? c.nameAr : (c.nameEn || c.nameAr)}</option>
              ))}
            </select>
          </div>

          {/* C: Branch picker — populated from imported branches of selected group */}
          {selectedGroupId && (
            <div>
              <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">
                {t("branch")} *
              </label>
              <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); }}
                className="input-field h-9"
                disabled={groupBranches.length === 0}>
                <option value="">{groupBranches.length === 0 ? (isRTL ? "لا توجد فروع" : "No branches") : (isRTL ? "اختر الفرع" : "Select branch")}</option>
                {groupBranches.map((b: any) => (
                  <option key={b._id} value={b._id}>{isRTL ? b.nameAr : (b.nameEn || b.nameAr)}</option>
                ))}
              </select>
              {groupBranches.length > 0 && (
                <div className="mt-0.5 text-[10px] text-blue-600">{groupBranches.length} branch(es) available</div>
              )}
            </div>
          )}

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

          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("salesRep")}</label>
            <select value={salesRepId} onChange={(e) => setSalesRepId(e.target.value)} className="input-field h-9">
              <option value="">{t("selectSalesRep")}</option>
              {salesReps.filter((rep: any) => rep.isActive).map((rep: any) => (
                <option key={rep._id} value={rep._id}>{isRTL ? rep.nameAr : (rep.nameEn || rep.nameAr)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("vehicleCode")}</label>
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="input-field h-9">
              <option value="">{t("enterVehicleCode")}</option>
              {vehicles.filter((vehicle: any) => vehicle.isActive).map((vehicle: any) => (
                <option key={vehicle._id} value={vehicle._id}>
                  {vehicle.code} — {isRTL ? vehicle.descriptionAr : (vehicle.descriptionEn || vehicle.descriptionAr)}
                </option>
              ))}
            </select>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("notes")}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="input-field w-full resize-none text-sm" />
          </div>
          <div className="rounded-xl border border-[color:var(--ink-100)] bg-[color:var(--surface-0)] p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 items-center">
              <label className="text-xs font-medium text-[color:var(--ink-600)]">{t("discount")}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="input-field h-9 text-end"
              />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-[color:var(--ink-600)]">
                <span>{t("subtotal")}</span>
                <span className="tabular-nums">{subtotal.toFixed(2)} QAR</span>
              </div>
              <div className="flex items-center justify-between text-[color:var(--ink-600)]">
                <span>{t("discount")}</span>
                <span className="tabular-nums">{discountValue.toFixed(2)} QAR</span>
              </div>
              <div className="border-t border-[color:var(--ink-100)] pt-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-[color:var(--ink-600)]">{t("net")}</span>
                <span className="text-2xl font-bold text-[color:var(--ink-900)] tabular-nums">
                  {netAfterDiscount.toFixed(2)}
                </span>
              </div>
              <div className="text-[11px] text-[color:var(--ink-400)] text-end">QAR</div>
            </div>
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

function InvoiceLifecycleActions({ invoice, userId }: { invoice: any; userId: string | undefined }) {
  const { t } = useI18n();
  const [loadingAction, setLoadingAction] = useState<"delete" | "cancel" | "reverse" | null>(null);
  const [err, setErr] = useState("");
  const removeDraft = useMutation(api.salesInvoices.deleteDraftSalesInvoice);
  const cancelInvoice = useMutation(api.salesInvoices.cancelSalesInvoice);
  const reverseInvoice = useMutation(api.salesInvoices.reverseSalesInvoice);

  if (!userId) return null;

  const handleDelete = async () => {
    if (!window.confirm("سيتم حذف مسودة الفاتورة نهائيًا. هل تريد المتابعة؟")) return;
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
    if (!window.confirm("سيتم إلغاء الفاتورة قبل الترحيل. هل تريد المتابعة؟")) return;
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
    if (!window.confirm("سيتم إنشاء عكس محاسبي للفاتورة المرحلة. هل تريد المتابعة؟")) return;
    setLoadingAction("reverse");
    setErr("");
    try {
      await reverseInvoice({
        invoiceId: invoice._id,
        userId: userId as any,
        reversalDate: new Date().toISOString().split("T")[0],
        reversalPeriodId: invoice.periodId,
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
            disabled={loadingAction !== null}
            className="h-7 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 disabled:opacity-60"
          >
            {loadingAction === "reverse" ? t("loading") : t("reverse")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─── Premium Invoice Stats Component ──────────────────────────────────────────

function InvoiceStatCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-white shadow-sm border p-4 hover:shadow-md transition-all duration-300 group flex-1`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      <div className="relative flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br ${color} text-white`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</div>
          <div className="text-xl font-bold text-gray-900 tabular-nums">{value}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

import { useSearchParams } from "next/navigation";

export default function SalesInvoicesPage() {
  const { t, isRTL, lang, formatCurrency } = useI18n();
  const { currentUser: defaultUser } = useAuth();
  const { canCreate, canPost, role } = usePermissions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;
  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const [invoiceType, setInvoiceType] = useState<string>("");
  const [postingStatus, setPostingStatus] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<string>("");
  const [reviewStatus, setReviewStatus] = useState<string>("");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(searchParams.get("new") === "true");

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
    if (reviewStatus && (inv.reviewStatus ?? "draft") !== reviewStatus) return false;
    if (role === "sales" && String(inv.createdBy) !== String(defaultUser?._id)) return false;
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
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      {/* Header */}
      <div className="no-print">
      <PageHeader
        icon={Landmark}
        title={t("salesInvoicesTitle")}
        badge={
          <span className="text-xs text-[color:var(--ink-400)] font-normal">
            ({filtered.length})
          </span>
        }
        actions={
          canCreate("sales") ? (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" /> {t("newInvoice")}
            </button>
          ) : undefined
        }
      />
      </div>

      {/* Inline Form */}
      {showForm && <NewInvoiceForm onClose={() => setShowForm(false)} />}

      {/* Modern Filter Strip - Box Design */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 flex flex-wrap items-end gap-3 w-full">
        <button className="h-10 px-3 border border-gray-200 rounded-md flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <Filter className="h-4 w-4" /> {t("filters")}
        </button>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">{t("fromDate")}</label>
          <div className="relative">
            <Calendar className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? "right-3" : "left-3"}`} />
            <input type="date" value={fromDate} onChange={(e: any) => { setFromDate(e.target.value); setPage(0); }}
              className={`h-10 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-400 w-[160px]`} />
          </div>
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">{t("toDate")}</label>
          <div className="relative">
            <Calendar className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? "right-3" : "left-3"}`} />
            <input type="date" value={toDate} onChange={(e: any) => { setToDate(e.target.value); setPage(0); }}
              className={`h-10 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-400 w-[160px]`} />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">{t("type")}</label>
          <select value={invoiceType} onChange={(e: any) => { setInvoiceType(e.target.value); setPage(0); }}
            className="h-10 px-3 border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-400 min-w-[120px] bg-white cursor-pointer appearance-none">
            <option value="">{t("all")}</option>
            <option value="cash_sale">{t("cash")}</option>
            <option value="credit_sale">{t("creditSale")}</option>
          </select>
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">{t("postingStatus")}</label>
          <select value={postingStatus} onChange={(e: any) => { setPostingStatus(e.target.value); setPage(0); }}
            className="h-10 px-3 border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-400 min-w-[140px] bg-white cursor-pointer appearance-none">
            <option value="">{t("all")}</option>
            <option value="unposted">{t("statusUnposted")}</option>
            <option value="posted">{t("statusPosted")}</option>
            <option value="reversed">{t("statusReversed")}</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">{t("reviewStatus")}</label>
          <select value={reviewStatus} onChange={(e: any) => { setReviewStatus(e.target.value); setPage(0); }}
            className="h-10 px-3 border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-400 min-w-[150px] bg-white cursor-pointer appearance-none">
            <option value="">{t("all")}</option>
            <option value="draft">{t("draft")}</option>
            <option value="submitted">{t("submitted")}</option>
            <option value="rejected">{t("statusRejected")}</option>
            <option value="approved">{t("statusApproved")}</option>
          </select>
        </div>

        <div className={`flex-1 min-w-[200px] ${isRTL ? "mr-auto" : "ml-auto"}`}>
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? "right-3" : "left-3"}`} />
            <input 
              type="text" 
              value={searchText} 
              onChange={(e: any) => { setSearchText(e.target.value); setPage(0); }}
              placeholder={t("searchPlaceholder")}
              className={`w-full h-10 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-400`} 
            />
          </div>
        </div>
      </div>

      {/* Premium KPI Cards - Modern Design */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <InvoiceStatCard 
          title={isRTL ? "إجمالي المبيعات" : "Total Sales"} 
          value={formatCurrency(totalSales)} 
          icon={Landmark}
          color="from-blue-500 to-blue-600"
        />
        <InvoiceStatCard 
          title={isRTL ? "المدفوع" : "Paid"} 
          value={formatCurrency(totalPaid)} 
          icon={CheckCircle2}
          color="from-green-500 to-green-600"
        />
        <InvoiceStatCard 
          title={isRTL ? "الآجل" : "Credit"} 
          value={formatCurrency(totalCredit)} 
          icon={WalletCards}
          color="from-amber-500 to-amber-600"
        />
        <InvoiceStatCard 
          title={isRTL ? "عدد الفواتير" : "Invoices"} 
          value={filtered.length.toString()} 
          icon={FileText}
          color="from-purple-500 to-purple-600"
        />
        <InvoiceStatCard 
          title={isRTL ? "المرحلة" : "Posted"} 
          value={posted.length.toString()} 
          icon={Check}
          color="from-emerald-500 to-emerald-600"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-[color:var(--ink-100)] overflow-hidden">
        {loading ? (
          <LoadingState label={t("loading")} />
        ) : paginated.length === 0 ? (
          <EmptyState
            title={t("noResults")}
            message={canCreate("sales") ? undefined : undefined}
            action={canCreate("sales") ? (
              <button onClick={() => setShowForm(true)}
                className="btn-primary h-10 px-5 rounded-xl inline-flex items-center gap-2 text-sm font-semibold">
                <Plus className="h-4 w-4" /> {t("newInvoice")}
              </button>
            ) : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse" dir={isRTL ? "rtl" : "ltr"}>
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("invoiceNo")}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("customerInvoiceNo")}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("date")}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("type")}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("customer")}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("branch")}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("salesRep")}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("vehicleCode")}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">{t("reviewStatus")}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-end">{t("amount")}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">{t("postingStatus")}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-end">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.map((inv: any, idx: number) => (
                    <tr key={inv._id} className={`group transition-all duration-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                          {inv.invoiceNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{inv.externalInvoiceNumber || "—"}</td>
                      <td className="px-6 py-4 text-xs text-gray-500 font-medium">{formatDateShort(inv.invoiceDate)}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight bg-gray-100 text-gray-600 border border-gray-200">
                          {INVOICE_TYPE_LABELS[inv.invoiceType as keyof typeof INVOICE_TYPE_LABELS]?.[lang]}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900 text-sm">{(inv as any).customerName}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{isRTL ? ((inv as any).branchName || "—") : (((inv as any).branchNameEn || (inv as any).branchName) || "—")}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{inv.salesRepName || "—"}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{inv.vehicleCode || "—"}</td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={inv.reviewStatus === "rejected" ? "rejected" : (inv.reviewStatus === "submitted" ? "approved" : inv.documentStatus)} type="document" />
                      </td>
                      <td className="px-6 py-4 text-end tabular-nums font-bold text-gray-900 text-sm">{formatCurrency(inv.totalAmount)}</td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={inv.postingStatus} type="posting" />
                      </td>
                      <td className="px-6 py-4 text-end">
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {canPost("sales") && <PostButton invoice={inv} userId={defaultUser?._id} />}
                          <InvoiceLifecycleActions invoice={inv} userId={defaultUser?._id} />
                          <button
                            onClick={() => router.push(`/sales/invoices/${inv._id}`)}
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
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[color:var(--ink-200)] text-[color:var(--ink-600)] hover:bg-[color:var(--ink-50)] disabled:opacity-40 transition-colors">
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
