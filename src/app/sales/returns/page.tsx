// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/i18n";
import { RotateCcw, Plus, X, Check, ChevronDown, ExternalLink } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/data-display";
import { formatDateShort } from "@/lib/utils";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function InfoField({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-[color:var(--ink-400)]">{label}</span>
      <span className={`text-sm font-semibold ${accent ? "text-[color:var(--brand-700)]" : "text-[color:var(--ink-800)]"}`}>{value}</span>
    </div>
  );
}

// ─── New Sales Return Form ────────────────────────────────────────────────────

function NewSalesReturnForm({ onClose }: { onClose: () => void }) {
  const { t, isRTL, lang } = useI18n();
  const { currentUser } = useAuth();

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];

  const [returnDate, setReturnDate] = useState(todayISO());
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);
  const invoiceSearchRef = React.useRef<HTMLDivElement>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [returnQtys, setReturnQtys] = useState<Record<string, string>>({});

  const branch = useQuery(
    api.branches.getDefaultBranch,
    company ? { companyId: company._id } : "skip"
  );
  const selectedBranchStore = useAppStore((s) => s.selectedBranch);
  const effectiveBranchId = selectedBranchStore !== "all" ? selectedBranchStore : branch?._id;
  const openPeriod = useQuery(
    api.helpers.getOpenPeriod,
    company ? { companyId: company._id, date: returnDate } : "skip"
  );
  const defaultCurrency = useQuery(api.helpers.getDefaultCurrency, {});
  const postedInvoices = useQuery(
    api.salesReturns.getPostedSalesInvoices,
    company ? { companyId: company._id } : "skip"
  );
  const invoiceLines = useQuery(
    api.salesReturns.getSalesInvoiceLines,
    selectedInvoiceId ? { invoiceId: selectedInvoiceId as any } : "skip"
  );

  const warehouses = useQuery(
    api.items.getAllWarehouses,
    company ? { companyId: company._id } : "skip"
  );
  const [warehouseId, setWarehouseId] = useState("");

  const createReturn = useMutation(api.salesReturns.createSalesReturn);

  // Close invoice dropdown on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (invoiceSearchRef.current && !invoiceSearchRef.current.contains(e.target as Node)) {
        setShowInvoiceDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filtered invoices based on search text
  const filteredInvoices = React.useMemo(() => {
    const all = postedInvoices ?? [];
    if (!invoiceSearch.trim()) return all;
    const s = invoiceSearch.toLowerCase();
    return all.filter((inv: any) =>
      (inv.invoiceNumber ?? "").toLowerCase().includes(s) ||
      (inv.externalInvoiceNumber ?? "").toLowerCase().includes(s) ||
      (inv.customerName ?? "").toLowerCase().includes(s)
    );
  }, [postedInvoices, invoiceSearch]);

  // Set default warehouse when loaded
  React.useEffect(() => {
    if (warehouses && warehouses.length > 0 && !warehouseId) {
      setWarehouseId(warehouses[0]._id);
    }
  }, [warehouses]);

  // Reset line qtys when invoice changes
  React.useEffect(() => {
    setReturnQtys({});
  }, [selectedInvoiceId]);

  const selectedInvoice = postedInvoices?.find(
    (inv: any) => inv._id === selectedInvoiceId
  );

  const grandTotal = (invoiceLines ?? []).reduce((sum: number, line: any) => {
    const qty = parseFloat(returnQtys[line._id] ?? "0") || 0;
    return sum + qty * (line.unitPrice);
  }, 0);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!effectiveBranchId && !branch) { setError(t("errNoBranch")); return; }
    if (!openPeriod) { setError(t("errNoPeriod")); return; }
    if (!currentUser) { setError(t("errNoUser")); return; }
    if (!defaultCurrency) { setError(t("errNoCurrency")); return; }
    if (!selectedInvoiceId) { setError(t("errNoInvoice")); return; }
    if (!warehouseId) { setError(t("errNoWarehouseReturn")); return; }

    const validLines = (invoiceLines ?? [])
      .filter((line: any) => {
        const qty = parseFloat(returnQtys[line._id] ?? "0") || 0;
        return qty > 0;
      })
      .map((line: any) => ({
        itemId: line.itemId,
        originalLineId: line._id,
        quantity: parseFloat(returnQtys[line._id]) || 0,
        unitPrice: Math.round(line.unitPrice),
        uomId: line.uomId,
      }));

    if (validLines.length === 0) {
      setError(t("errNoReturnQty"));
      return;
    }

    setSaving(true);
    setError("");
    try {
      await createReturn({
        companyId: company._id,
        branchId: (effectiveBranchId ?? branch?._id) as any,
        originalInvoiceId: selectedInvoiceId as any,
        customerId: selectedInvoice?.customerId as any,
        customerOutletId: selectedInvoice?.customerOutletId as any,
        returnDate,
        reason: reason || undefined,
        currencyId: defaultCurrency._id,
        periodId: openPeriod._id,
        createdBy: currentUser._id,
        warehouseId: warehouseId as any,
        lines: validLines,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message ?? t("errUnexpected"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="surface-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[color:var(--ink-200)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[color:var(--brand-50)] rounded-xl">
              <RotateCcw className="w-5 h-5 text-[color:var(--brand-700)]" />
            </div>
            <h2 className="text-xl font-bold text-[color:var(--ink-900)]">
              {t("newReturn")}
            </h2>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-lg hover:bg-[color:var(--ink-100)] transition-colors">
            <X className="w-5 h-5 text-[color:var(--ink-500)]" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Invoice Selection — searchable */}
          <div>
            <label className="block text-sm font-medium text-[color:var(--ink-700)] mb-1.5">
              {t("originalInvoice")} *
            </label>
            <div className="relative" ref={invoiceSearchRef}>
              <input
                type="text"
                className="input-field w-full"
                placeholder={lang === "ar" ? "ابحث برقم الفاتورة الداخلي أو رقم العميل أو اسمه..." : "Search by invoice no, customer invoice no, or name..."}
                value={invoiceSearch}
                onChange={(e) => { setInvoiceSearch(e.target.value); setShowInvoiceDropdown(true); if (!e.target.value) { setSelectedInvoiceId(""); } }}
                onFocus={() => setShowInvoiceDropdown(true)}
                autoComplete="off"
              />
              {showInvoiceDropdown && filteredInvoices.length > 0 && (
                <div className="absolute z-50 top-full mt-1 w-full bg-white border border-[color:var(--ink-200)] rounded-xl shadow-lg max-h-64 overflow-y-auto">
                  {filteredInvoices.slice(0, 30).map((inv: any) => (
                    <button
                      key={inv._id}
                      type="button"
                      className="w-full text-start px-4 py-2.5 hover:bg-[color:var(--brand-50)] transition-colors border-b border-[color:var(--ink-50)] last:border-0"
                      onClick={() => {
                        setSelectedInvoiceId(inv._id);
                        setInvoiceSearch(inv.invoiceNumber + (inv.externalInvoiceNumber ? ` / ${inv.externalInvoiceNumber}` : ""));
                        setShowInvoiceDropdown(false);
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-xs font-bold text-[color:var(--brand-700)] shrink-0">{inv.invoiceNumber}</span>
                          {inv.externalInvoiceNumber && (
                            <span className="text-xs text-[color:var(--ink-400)] shrink-0">/ {inv.externalInvoiceNumber}</span>
                          )}
                          <span className="text-sm text-[color:var(--ink-700)] truncate">{inv.customerName}</span>
                        </div>
                        <span className="text-xs font-semibold text-[color:var(--ink-500)] shrink-0">{formatCurrency(inv.totalAmount, lang)}</span>
                      </div>
                      {inv.invoiceDate && <div className="text-[11px] text-[color:var(--ink-400)] mt-0.5">{inv.invoiceDate}</div>}
                    </button>
                  ))}
                </div>
              )}
              {showInvoiceDropdown && invoiceSearch.trim() && filteredInvoices.length === 0 && (
                <div className="absolute z-50 top-full mt-1 w-full bg-white border border-[color:var(--ink-200)] rounded-xl shadow-lg px-4 py-3 text-sm text-[color:var(--ink-400)]">
                  {lang === "ar" ? "لا توجد نتائج" : "No results found"}
                </div>
              )}
            </div>
          </div>

          {/* Invoice Info Card */}
          {selectedInvoice && (
            <div className="rounded-xl border border-[color:var(--brand-200)] bg-[color:var(--brand-50)] px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2">
              <div className="col-span-2 flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-widest text-[color:var(--brand-600)]">{lang === "ar" ? "بيانات الفاتورة الأصلية" : "Original Invoice Details"}</span>
                <span className="text-xs font-mono font-bold text-[color:var(--brand-700)]">{selectedInvoice.invoiceNumber}</span>
              </div>
              <InfoField label={t("customer")} value={selectedInvoice.customerName || "—"} />
              <InfoField label={t("date")} value={selectedInvoice.invoiceDate || "—"} />
              {selectedInvoice.salesRepName && <InfoField label={t("salesRep")} value={selectedInvoice.salesRepName} />}
              {selectedInvoice.vehicleCode && <InfoField label={t("vehicleCode")} value={selectedInvoice.vehicleCode} />}
              <InfoField label={lang === "ar" ? "إجمالي الفاتورة" : "Invoice Total"} value={formatCurrency(selectedInvoice.totalAmount, lang)} accent />
            </div>
          )}

          {/* Return Date & Warehouse */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[color:var(--ink-700)] mb-1.5">
                {t("returnDate")} *
              </label>
              <input type="date" className="input-field w-full"
                value={returnDate} onChange={(e) => setReturnDate(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[color:var(--ink-700)] mb-1.5">
                {t("warehouses")} *
              </label>
              <select className="input-field w-full"
                value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                <option value="">—</option>
                {(warehouses ?? []).map((wh: any) => (
                  <option key={wh._id} value={wh._id}>{wh.nameAr}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-[color:var(--ink-700)] mb-1.5">
              {t("returnReason")}
            </label>
            <input type="text" className="input-field w-full"
              value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder={t("returnReason")} />
          </div>

          {/* Invoice Lines */}
          {selectedInvoiceId && invoiceLines && invoiceLines.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[color:var(--ink-700)] mb-2">
                {t("returnQuantity")}
              </label>
              <div className="rounded-xl overflow-hidden border border-[color:var(--ink-200)]">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("items")}</th>
                      <th className="text-center">{t("maxQuantity")}</th>
                      <th className="text-center">{t("sellingPrice")}</th>
                      <th className="text-center">{t("returnQuantity")}</th>
                      <th className="text-end">{t("amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceLines.map((line: any) => {
                      const qty = parseFloat(returnQtys[line._id] ?? "0") || 0;
                      const lineTotal = qty * (line.unitPrice);
                      return (
                        <tr key={line._id}>
                          <td>{line.item?.nameAr ?? "—"}</td>
                          <td className="text-center muted">{line.quantity}</td>
                          <td className="text-center muted">{formatCurrency(line.unitPrice, lang)}</td>
                          <td className="text-center">
                            <input type="number" min="0" max={line.quantity} step="1"
                              className="w-20 mx-auto block text-center input-field py-1 text-sm"
                              value={returnQtys[line._id] ?? ""}
                              onChange={(e) => setReturnQtys((prev) => ({ ...prev, [line._id]: e.target.value }))}
                              placeholder="0" />
                          </td>
                          <td className="text-end numeric">{formatCurrency(lineTotal, lang)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Grand Total */}
              <div className="mt-3 flex justify-end">
                <div className="bg-[color:var(--brand-50)] border border-[color:var(--brand-200)] rounded-lg px-4 py-2 flex items-center gap-3">
                  <span className="text-sm text-[color:var(--brand-700)]">{t("grandTotal")}:</span>
                  <span className="text-lg font-bold text-[color:var(--brand-700)]">{formatCurrency(grandTotal, lang)}</span>
                </div>
              </div>
            </div>
          )}

          {selectedInvoiceId && invoiceLines === undefined && (
            <div className="text-center py-6 text-[color:var(--ink-400)] text-sm">{t("loading")}</div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-[color:var(--ink-200)]">
            <button type="button" onClick={onClose} className="btn-secondary h-9 px-4 rounded-lg text-sm font-medium">
              {t("cancel")}
            </button>
            <button type="submit" disabled={saving}
              className="btn-primary h-9 px-5 rounded-lg text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SalesReturnsPage() {
  const { t, isRTL, lang } = useI18n();
  const { currentUser } = useAuth();
  const { canCreate, canPost } = usePermissions();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [posting, setPosting] = useState<string | null>(null);
  const [postError, setPostError] = useState<Record<string, string>>({});

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];

  const returns = useQuery(
    api.salesReturns.listSalesReturns,
    company ? { companyId: company._id, branchId: branchArg as any } : "skip"
  );

  const postReturn = useMutation(api.salesReturns.postSalesReturn);

  const handlePost = async (returnId: string) => {
    if (!currentUser) return;
    setPosting(returnId);
    setPostError((prev) => ({ ...prev, [returnId]: "" }));
    try {
      await postReturn({ returnId: returnId as any, userId: currentUser._id });
    } catch (err: any) {
      setPostError((prev) => ({ ...prev, [returnId]: err?.message ?? t("errPosting") }));
    } finally {
      setPosting(null);
    }
  };

  return (
    <div className="space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      <div className="no-print">
      <PageHeader
        icon={RotateCcw}
        title={t("salesReturns")}
        badge={<span className="text-xs text-[color:var(--ink-400)] font-normal">({returns?.length ?? 0})</span>}
        actions={canCreate("sales") ? (
          <button onClick={() => setShowForm(true)}
            className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
            <Plus className="h-4 w-4" /> {t("newReturn")}
          </button>
        ) : undefined}
      />
      </div>

      <div className="surface-card overflow-hidden">
        {returns === undefined ? (
          <LoadingState label={t("loading")} />
        ) : returns.length === 0 ? (
          <EmptyState
            icon={RotateCcw}
            title={t("noReturnsYet")}
            action={canCreate("sales") ? (
              <button onClick={() => setShowForm(true)}
                className="btn-primary h-9 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
                <Plus className="h-4 w-4" /> {t("newReturn")}
              </button>
            ) : undefined}
          />
        ) : (
          <>
          <div className="mobile-list p-3 space-y-2.5">
            {returns.map((ret: any) => (
              <div key={ret._id} className="record-card">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--ink-100)] text-[var(--ink-600)] inline-block mb-1">{ret.returnNumber}</span>
                    <p className="text-[14px] font-bold text-[var(--ink-900)]">{ret.customerName ?? "—"}</p>
                    <p className="text-[11px] text-[var(--ink-400)] mt-0.5">{ret.returnDate} · {isRTL ? ret.branchNameAr : ret.branchNameEn}</p>
                    <p className="text-[11px] text-[var(--ink-400)]">{isRTL ? "فاتورة: " : "Inv: "}{ret.originalInvoiceNumber} · {isRTL ? "بواسطة: " : "By: "}{ret.createdByName}</p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="text-[17px] font-bold tabular-nums text-[var(--ink-900)]">{formatCurrency(ret.totalAmount)}</p>
                    <StatusBadge status={ret.postingStatus} type="posting" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="desktop-table overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr style={{ background: "var(--brand-700)" }}>
                  <th className="text-white/80 whitespace-nowrap">{t("returnNumber")}</th>
                  <th className="text-white/80 whitespace-nowrap">{t("returnDate")}</th>
                  <th className="text-white/80 whitespace-nowrap">{t("originalInvoice")}</th>
                  <th className="text-white/80 whitespace-nowrap">{t("customers")}</th>
                  <th className="text-white/80 whitespace-nowrap">{isRTL ? "الفرع" : "Branch"}</th>
                  <th className="text-white/80 whitespace-nowrap">{isRTL ? "أنشأه" : "Created By"}</th>
                  <th className="text-white/80 text-end whitespace-nowrap">{t("grandTotal")}</th>
                  <th className="text-white/80 text-center whitespace-nowrap">{t("status")}</th>
                  <th className="text-white/80 text-center whitespace-nowrap">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((ret: any) => (
                  <tr key={ret._id}>
                    <td className="code">{ret.returnNumber}</td>
                    <td className="muted">{formatDateShort(ret.returnDate)}</td>
                    <td className="code">{ret.originalInvoiceNumber}</td>
                    <td>
                      <div className="font-medium">{ret.customerName}</div>
                      {ret.customerCode && ret.customerCode !== "—" && (
                        <div className="text-[11px] text-[color:var(--ink-400)]">{ret.customerCode}</div>
                      )}
                    </td>
                    <td className="muted">{isRTL ? ret.branchNameAr : ret.branchNameEn}</td>
                    <td className="muted">{ret.createdByName}</td>
                    <td className="text-end numeric">{formatCurrency(ret.totalAmount, lang)}</td>
                    <td className="text-center">
                      <StatusBadge status={ret.postingStatus} />
                    </td>
                    <td className="text-center">
                      <div className="inline-flex items-center gap-2 justify-center">
                        {ret.postingStatus === "unposted" && canPost("sales") && (
                          <div className="flex flex-col items-center gap-1">
                            <button
                              onClick={() => handlePost(ret._id)}
                              disabled={posting === ret._id}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5">
                              {posting === ret._id
                                ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                : <Check className="w-3 h-3" />}
                              {t("post")}
                            </button>
                            {postError[ret._id] && <p className="text-xs text-red-500 max-w-[150px] text-center">{postError[ret._id]}</p>}
                          </div>
                        )}
                        <button onClick={() => router.push(`/sales/returns/${ret._id}`)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-[color:var(--brand-50)] text-[color:var(--ink-600)]"
                          title={t("viewDetails")}>
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {showForm && <NewSalesReturnForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
