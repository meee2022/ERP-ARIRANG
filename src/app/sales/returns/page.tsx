// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/i18n";
import { RotateCcw, Plus, X, Check, ChevronDown } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

// ─── New Sales Return Form ────────────────────────────────────────────────────

function NewSalesReturnForm({ onClose }: { onClose: () => void }) {
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
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <RotateCcw className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t("newReturn")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Invoice Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t("originalInvoice")} *
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
            >
              <option value="">{t("selectInvoice")}</option>
              {(postedInvoices ?? []).map((inv: any) => (
                <option key={inv._id} value={inv._id}>
                  {inv.invoiceNumber} — {inv.customerName} ({formatCurrency(inv.totalAmount / 100, lang)})
                </option>
              ))}
            </select>
          </div>

          {/* Return Date & Warehouse */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t("returnDate")} *
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t("warehouses")} *
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
              >
                <option value="">—</option>
                {(warehouses ?? []).map((wh: any) => (
                  <option key={wh._id} value={wh._id}>{wh.nameAr}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t("returnReason")}
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("returnReason")}
            />
          </div>

          {/* Invoice Lines */}
          {selectedInvoiceId && invoiceLines && invoiceLines.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("returnQuantity")}
              </label>
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-2 text-start text-gray-600 dark:text-gray-400 font-medium">{t("items")}</th>
                      <th className="px-3 py-2 text-center text-gray-600 dark:text-gray-400 font-medium">{t("maxQuantity")}</th>
                      <th className="px-3 py-2 text-center text-gray-600 dark:text-gray-400 font-medium">{t("sellingPrice")}</th>
                      <th className="px-3 py-2 text-center text-gray-600 dark:text-gray-400 font-medium">{t("returnQuantity")}</th>
                      <th className="px-3 py-2 text-end text-gray-600 dark:text-gray-400 font-medium">{t("amount")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {invoiceLines.map((line: any) => {
                      const qty = parseFloat(returnQtys[line._id] ?? "0") || 0;
                      const lineTotal = qty * (line.unitPrice / 100);
                      return (
                        <tr key={line._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-3 py-2 text-gray-900 dark:text-white">
                            {line.item?.nameAr ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400">
                            {line.quantity}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400">
                            {formatCurrency(line.unitPrice / 100, lang)}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              max={line.quantity}
                              step="1"
                              className="w-20 mx-auto block text-center px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              value={returnQtys[line._id] ?? ""}
                              onChange={(e) =>
                                setReturnQtys((prev) => ({
                                  ...prev,
                                  [line._id]: e.target.value,
                                }))
                              }
                              placeholder="0"
                            />
                          </td>
                          <td className="px-3 py-2 text-end font-medium text-gray-900 dark:text-white">
                            {formatCurrency(lineTotal, lang)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Grand Total */}
              <div className="mt-3 flex justify-end">
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg px-4 py-2 flex items-center gap-3">
                  <span className="text-sm text-orange-700 dark:text-orange-400">{t("grandTotal")}:</span>
                  <span className="text-lg font-bold text-orange-700 dark:text-orange-400">
                    {formatCurrency(grandTotal, lang)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {selectedInvoiceId && invoiceLines === undefined && (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
              {t("loading")}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
            <RotateCcw className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t("salesReturns")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {returns ? `${returns.length} ${t("records")}` : t("loading")}
            </p>
          </div>
        </div>
        {canCreate("sales") && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {t("newReturn")}
        </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        {returns === undefined ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            {t("loading")}
          </div>
        ) : returns.length === 0 ? (
          <div className="p-12 text-center">
            <RotateCcw className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">{t("noReturnsYet")}</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 px-4 py-2 text-sm font-medium text-orange-600 dark:text-orange-400 hover:underline"
            >
              {t("newReturn")}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold text-gray-600 dark:text-gray-300">
                    {t("returnNumber")}
                  </th>
                  <th className="px-4 py-3 text-start font-semibold text-gray-600 dark:text-gray-300">
                    {t("returnDate")}
                  </th>
                  <th className="px-4 py-3 text-start font-semibold text-gray-600 dark:text-gray-300">
                    {t("originalInvoice")}
                  </th>
                  <th className="px-4 py-3 text-start font-semibold text-gray-600 dark:text-gray-300">
                    {t("customers")}
                  </th>
                  <th className="px-4 py-3 text-end font-semibold text-gray-600 dark:text-gray-300">
                    {t("grandTotal")}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-300">
                    {t("status")}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-300">
                    {t("actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {returns.map((ret: any) => (
                  <tr
                    key={ret._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-gray-900 dark:text-white">
                      {ret.returnNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {ret.returnDate}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400">
                      {ret.originalInvoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {ret.customerName}
                    </td>
                    <td className="px-4 py-3 text-end font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(ret.totalAmount / 100, lang)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={ret.postingStatus} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {ret.postingStatus === "unposted" && canPost("sales") && (
                        <div className="flex flex-col items-center gap-1">
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
                            <p className="text-xs text-red-500 max-w-[150px] text-center">
                              {postError[ret._id]}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && <NewSalesReturnForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
