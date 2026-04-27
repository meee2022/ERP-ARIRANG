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
import { RotateCcw, Plus, X, Check, ExternalLink } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateShort } from "@/lib/utils";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

// ─── New Purchase Return Form ─────────────────────────────────────────────────

function NewPurchaseReturnForm({ onClose }: { onClose: () => void }) {
  const { t, isRTL, lang } = useI18n();
  const { currentUser } = useAuth();

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];

  const [returnDate, setReturnDate] = useState(todayISO());
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
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
    api.purchaseReturns.getPostedPurchaseInvoices,
    company ? { companyId: company._id } : "skip"
  );
  const invoiceLines = useQuery(
    api.purchaseReturns.getPurchaseInvoiceLines,
    selectedInvoiceId ? { invoiceId: selectedInvoiceId as any } : "skip"
  );

  const warehouses = useQuery(
    api.items.getAllWarehouses,
    company ? { companyId: company._id } : "skip"
  );
  const [warehouseId, setWarehouseId] = useState("");

  const createReturn = useMutation(api.purchaseReturns.createPurchaseReturn);

  React.useEffect(() => {
    if (warehouses && warehouses.length > 0 && !warehouseId) {
      setWarehouseId(warehouses[0]._id);
    }
  }, [warehouses]);

  React.useEffect(() => {
    setReturnQtys({});
  }, [selectedInvoiceId]);

  const selectedInvoice = postedInvoices?.find(
    (inv: any) => inv._id === selectedInvoiceId
  );

  const grandTotal = (invoiceLines ?? []).reduce((sum: number, line: any) => {
    const qty = parseFloat(returnQtys[line._id] ?? "0") || 0;
    return sum + qty * (line.unitPrice / 100);
  }, 0);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!effectiveBranchId && !branch) { setError(t("errNoBranch")); return; }
    if (!openPeriod) { setError(t("errNoPeriod")); return; }
    if (!currentUser) { setError(t("errNoUser")); return; }
    if (!defaultCurrency) { setError(t("errNoCurrency")); return; }
    if (!selectedInvoiceId) { setError(t("errNoInvoice")); return; }

    const validLines = (invoiceLines ?? [])
      .filter((line: any) => {
        const qty = parseFloat(returnQtys[line._id] ?? "0") || 0;
        return qty > 0;
      })
      .map((line: any) => ({
        itemId: line.itemId ?? undefined,
        quantity: parseFloat(returnQtys[line._id]) || 0,
        unitPrice: Math.round(line.unitPrice),
        uomId: line.uomId ?? undefined,
        accountId: line.accountId,
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
        supplierId: selectedInvoice?.supplierId as any,
        returnDate,
        reason: reason || undefined,
        currencyId: defaultCurrency._id,
        periodId: openPeriod._id,
        createdBy: currentUser._id,
        warehouseId: warehouseId ? (warehouseId as any) : undefined,
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

          {/* Invoice Selection */}
          <div>
            <label className="block text-sm font-medium text-[color:var(--ink-700)] mb-1.5">
              {t("originalInvoice")} *
            </label>
            <select className="input-field w-full"
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}>
              <option value="">{t("selectInvoice")}</option>
              {(postedInvoices ?? []).map((inv: any) => (
                <option key={inv._id} value={inv._id}>
                  {inv.invoiceNumber} — {inv.supplierName} ({formatCurrency(inv.totalAmount / 100, lang)})
                </option>
              ))}
            </select>
          </div>

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
                {t("warehouses")}
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
                      <th>{t("description")}</th>
                      <th className="text-center">{t("maxQuantity")}</th>
                      <th className="text-center">{t("costPrice")}</th>
                      <th className="text-center">{t("returnQuantity")}</th>
                      <th className="text-end">{t("amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceLines.map((line: any) => {
                      const qty = parseFloat(returnQtys[line._id] ?? "0") || 0;
                      const lineTotal = qty * (line.unitPrice / 100);
                      return (
                        <tr key={line._id}>
                          <td>{line.item?.nameAr ?? line.description ?? line.account?.nameAr ?? "—"}</td>
                          <td className="text-center muted">{line.quantity}</td>
                          <td className="text-center muted">{formatCurrency(line.unitPrice / 100, lang)}</td>
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

export default function PurchaseReturnsPage() {
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
    api.purchaseReturns.listPurchaseReturns,
    company ? { companyId: company._id, branchId: branchArg as any } : "skip"
  );

  const postReturn = useMutation(api.purchaseReturns.postPurchaseReturn);

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
        title={t("purchaseReturns")}
        badge={
          returns !== undefined ? (
            <span className="text-xs text-[color:var(--ink-500)]">{returns.length} {t("records")}</span>
          ) : undefined
        }
        actions={
          canCreate("purchases") && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              {t("newReturn")}
            </button>
          )
        }
      />
      </div>

      <div className="surface-card overflow-hidden">
        {returns === undefined ? (
          <LoadingState label={t("loading")} />
        ) : returns.length === 0 ? (
          <EmptyState
            icon={RotateCcw}
            title={t("noReturnsYet")}
            action={
              <button
                onClick={() => setShowForm(true)}
                className="btn-primary h-9 px-5 rounded-xl inline-flex items-center gap-2 text-sm font-semibold"
              >
                <Plus className="w-4 h-4" /> {t("newReturn")}
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("returnNumber")}</th>
                  <th>{t("returnDate")}</th>
                  <th>{t("originalInvoice")}</th>
                  <th>{t("suppliers")}</th>
                  <th className="text-end">{t("grandTotal")}</th>
                  <th>{t("status")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((ret: any) => (
                  <tr key={ret._id}>
                    <td className="code">{ret.returnNumber}</td>
                    <td className="muted">{formatDateShort(ret.returnDate)}</td>
                    <td className="code">{ret.originalInvoiceNumber}</td>
                    <td>{ret.supplierName}</td>
                    <td className="numeric text-end">{formatCurrency(ret.totalAmount / 100, lang)}</td>
                    <td><StatusBadge status={ret.postingStatus} /></td>
                    <td>
                      <div className="flex items-center gap-2">
                        {ret.postingStatus === "unposted" && canPost("purchases") && (
                          <div className="flex flex-col items-start gap-1">
                            <button
                              onClick={() => handlePost(ret._id)}
                              disabled={posting === ret._id}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5"
                            >
                              {posting === ret._id ? (
                                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                              {t("post")}
                            </button>
                            {postError[ret._id] && (
                              <p className="text-xs text-red-500 max-w-[150px]">
                                {postError[ret._id]}
                              </p>
                            )}
                          </div>
                        )}
                        <button
                          onClick={() => router.push(`/purchases/returns/${ret._id}`)}
                          className="p-1.5 rounded-lg text-[color:var(--ink-400)] hover:text-[color:var(--brand-700)] hover:bg-[color:var(--ink-50)] transition-colors"
                          title={t("viewDetails")}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && <NewPurchaseReturnForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
