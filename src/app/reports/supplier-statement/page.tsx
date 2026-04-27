// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { PdfDownloadButton } from "@/components/ui/PdfDownloadButton";
import { StatementPdf } from "@/lib/pdf/StatementPdf";
import { Printer, Search } from "lucide-react";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { CompanyPrintHeader } from "@/components/ui/company-print-header";
import { useCompanySettings } from "@/hooks/useCompanySettings";

function StatementTable({ transactions, t, isRTL, formatCurrency }: any) {
  if (!transactions || transactions.length === 0) {
    return (
      <EmptyState title={t("noTransactions")} />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>{t("date")}</th>
            <th>{t("transactionType")}</th>
            <th>{t("invoiceNumber")}</th>
            <th className="text-end">{t("debit")}</th>
            <th className="text-end">{t("credit")}</th>
            <th className="text-end">{t("runningBalance")}</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx: any, i: number) => (
            <tr key={i}>
              <td className="muted">{tx.date}</td>
              <td>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  tx.type === "invoice"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-blue-100 text-blue-700"
                }`}>
                  {tx.type === "invoice" ? t("purchaseInvoices") : t("cashPayments")}
                </span>
              </td>
              <td className="code">{tx.reference ?? tx.refNumber}</td>
              <td className="numeric text-end text-red-700">
                {tx.debit > 0 ? formatCurrency(tx.debit / 100) : "—"}
              </td>
              <td className="numeric text-end text-green-700">
                {tx.credit > 0 ? formatCurrency(tx.credit / 100) : "—"}
              </td>
              <td className="numeric text-end font-semibold">
                {formatCurrency((tx.balance ?? 0) / 100)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SupplierStatementPage() {
  const { t, isRTL, lang } = useI18n();
  const { user } = useAuth();
  const { company: printCompany } = useCompanySettings();

  const companyId = user?.companyId;
  const suppliers = useQuery(
    api.suppliers.getAll,
    companyId ? { companyId } : "skip"
  );

  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>(
    new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
  );
  const [toDate, setToDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [submitted, setSubmitted] = useState(false);

  const statement = useQuery(
    api.reports.getSupplierStatement,
    submitted && selectedSupplier && fromDate && toDate
      ? { supplierId: selectedSupplier as any, fromDate, toDate }
      : "skip"
  );

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-QA", {
      style: "currency",
      currency: "QAR",
      minimumFractionDigits: 2,
    }).format(n);

  const handleGenerate = () => {
    if (!selectedSupplier || !fromDate || !toDate) return;
    setSubmitted(true);
  };

  const supplierName = statement?.supplier
    ? isRTL
      ? statement.supplier.nameAr
      : (statement.supplier as any).nameEn || statement.supplier.nameAr
    : "";

  return (
    <div className="space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      <div className="no-print">
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">{t("supplierStatement")}</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="surface-card p-5 print:hidden">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[color:var(--ink-700)] mb-1">{t("supplier")}</label>
            <select
              value={selectedSupplier}
              onChange={(e) => { setSelectedSupplier(e.target.value); setSubmitted(false); }}
              className="input-field w-full"
            >
              <option value="">{t("selectSupplier")}</option>
              {(suppliers ?? []).map((s: any) => (
                <option key={s._id} value={s._id}>
                  {isRTL ? s.nameAr : (s.nameEn || s.nameAr)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-700)] mb-1">{t("statementFrom")}</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setSubmitted(false); }}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-700)] mb-1">{t("statementTo")}</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setSubmitted(false); }}
              className="input-field w-full"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleGenerate}
            disabled={!selectedSupplier || !fromDate || !toDate}
            className="flex items-center gap-2 px-4 py-2 btn-primary text-sm font-medium rounded-lg disabled:opacity-40"
          >
            <Search className="w-4 h-4" />
            {t("generateStatement")}
          </button>
          {statement && (
            <>
              <PdfDownloadButton
                document={
                  <StatementPdf data={{
                    logoUrl: printCompany?.logoUrl ?? undefined,
                    companyNameEn: printCompany?.nameEn ?? undefined,
                    companyPhone: printCompany?.phone ?? undefined,
                    companyName: statement.companyNameAr ?? statement.companyNameEn ?? "",
                    partyName: suppliers?.find((s: any) => s._id === selectedSupplier)?.nameAr ?? selectedSupplier,
                    fromDate, toDate,
                    openingBalance: statement.openingBalance ?? 0,
                    lines: (statement.transactions ?? []).map((tx: any) => ({
                      date: tx.date, description: tx.description,
                      debit: tx.debit ?? 0, credit: tx.credit ?? 0, balance: tx.runningBalance ?? 0,
                    })),
                    closingBalance: statement.closingBalance ?? 0,
                    totalDebit: statement.totalDebit ?? 0,
                    totalCredit: statement.totalCredit ?? 0,
                    isRTL,
                    labels: {
                      title: t("supplierStatement"), partyLabel: t("supplier"),
                      period: `${fromDate} → ${toDate}`,
                      date: t("date"), description: t("description"),
                      debit: t("debit"), credit: t("credit"), balance: t("runningBalance"),
                      openingBalance: t("openingBalance"), closingBalance: t("closingBalance"),
                      totalDebit: t("totalDebit"), totalCredit: t("totalCredit"),
                      printedBy: t("printedBy"),
                    },
                    formatCurrency,
                  }} />
                }
                fileName={`supplier-statement-${selectedSupplier}.pdf`}
                label={t("downloadPdf") ?? "PDF"}
              />
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 btn-ghost text-sm font-medium rounded-lg"
              >
                <Printer className="w-4 h-4" />
                {t("printInvoice")}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Statement table */}
      {submitted && statement !== undefined && (
        <div className="surface-card overflow-hidden print:shadow-none print:border-none">
          <CompanyPrintHeader
            company={printCompany}
            isRTL={isRTL}
            documentTitle={t("supplierStatement")}
            periodLine={`${fromDate} — ${toDate}`}
          />
          <div className="p-5 border-b flex justify-between items-center" style={{ background: "var(--brand-50)" }}>
            <div>
              <h2 className="text-lg font-bold text-[color:var(--brand-800)]">{t("supplierStatement")}</h2>
              <p className="text-sm text-[color:var(--ink-600)] mt-1">{supplierName}</p>
            </div>
            <p className="text-xs text-[color:var(--ink-500)]">{fromDate} — {toDate}</p>
          </div>

          {statement && (statement.openingBalance ?? 0) !== 0 && (
            <div className="px-5 py-3 border-b text-sm flex justify-between" style={{ background: "var(--gold-50, #fefce8)" }}>
              <span className="text-[color:var(--ink-600)]">{t("openingBalance")}</span>
              <span className="font-semibold tabular-nums">{formatCurrency((statement.openingBalance ?? 0) / 100)}</span>
            </div>
          )}

          <StatementTable
            transactions={statement?.transactions}
            t={t}
            isRTL={isRTL}
            formatCurrency={formatCurrency}
          />

          {statement && (statement.transactions?.length ?? 0) > 0 && (
            <div className="p-5 border-t flex justify-end" style={{ background: "var(--ink-50, #f8fafc)" }}>
              <div className="w-72 space-y-2 text-sm">
                <div className="flex justify-between text-[color:var(--ink-600)]">
                  <span>{t("totalDebit")}</span>
                  <span className="font-medium text-red-700">{formatCurrency((statement.totalDebit ?? 0) / 100)}</span>
                </div>
                <div className="flex justify-between text-[color:var(--ink-600)]">
                  <span>{t("totalCredit")}</span>
                  <span className="font-medium text-green-700">{formatCurrency((statement.totalCredit ?? 0) / 100)}</span>
                </div>
                <div className="flex justify-between font-bold text-[color:var(--ink-800)] border-t pt-2">
                  <span>{t("closingBalance")}</span>
                  <span>{formatCurrency((statement.closingBalance ?? 0) / 100)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {submitted && statement === undefined && (
        <LoadingState label={t("loading")} />
      )}
    </div>
  );
}
