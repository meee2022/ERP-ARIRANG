// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { PdfDownloadButton } from "@/components/ui/PdfDownloadButton";
import { StatementPdf } from "@/lib/pdf/StatementPdf";
import { Search } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { EmptyState } from "@/components/ui/empty-state";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PrintableReportPage } from "@/components/ui/printable-report";

function StatementTable({ transactions, t, isRTL, formatCurrency }: any) {
  if (!transactions || transactions.length === 0) {
    return <EmptyState title={t("noTransactions")} />;
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
                  tx.type === "invoice" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                }`}>
                  {tx.type === "invoice" ? t("purchaseInvoices") : t("cashPayments")}
                </span>
              </td>
              <td className="code">{tx.reference ?? tx.refNumber}</td>
              <td className="numeric text-end text-red-700">{tx.debit > 0 ? formatCurrency(tx.debit) : "—"}</td>
              <td className="numeric text-end text-green-700">{tx.credit > 0 ? formatCurrency(tx.credit) : "—"}</td>
              <td className="numeric text-end font-semibold">{formatCurrency(tx.balance ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SupplierStatementPage() {
  const { t, isRTL } = useI18n();
  const { user } = useAuth();
  const { company: printCompany } = useCompanySettings();

  const companyId = user?.companyId;
  const suppliers = useQuery(api.suppliers.getAll, companyId ? { companyId } : "skip");

  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [toDate, setToDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [submitted, setSubmitted] = useState(false);

  const statement = useQuery(
    api.reports.getSupplierStatement,
    submitted && selectedSupplier && fromDate && toDate
      ? { supplierId: selectedSupplier as any, fromDate, toDate }
      : "skip"
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-QA", { style: "currency", currency: "QAR", minimumFractionDigits: 2 }).format(n);

  const handleGenerate = () => {
    if (!selectedSupplier || !fromDate || !toDate) return;
    setSubmitted(true);
  };

  const supplierName = statement?.supplier
    ? isRTL ? statement.supplier.nameAr : ((statement.supplier as any).nameEn || statement.supplier.nameAr)
    : "";

  return (
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={t("supplierStatement")}
      period={`${fromDate} — ${toDate}`}
      actions={
        statement ? (
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
                  totalDebit: t("totalDebit"), totalCredit: t("totalCredit"), printedBy: t("printedBy"),
                },
                formatCurrency: fmt,
              }} />
            }
            fileName={`supplier-statement-${selectedSupplier}.pdf`}
            label={t("downloadPdf") ?? "PDF"}
          />
        ) : undefined
      }
      filters={
        <div className="surface-card p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[color:var(--ink-700)] mb-1">{t("supplier")}</label>
              <SearchableSelect
                isRTL={isRTL}
                value={selectedSupplier}
                onChange={(v) => { setSelectedSupplier(v); setSubmitted(false); }}
                placeholder={t("selectSupplier")}
                searchPlaceholder={isRTL ? "ابحث باسم المورد..." : "Search supplier..."}
                emptyMessage={isRTL ? "لا توجد نتائج" : "No results"}
                options={(suppliers ?? []).map((s: any) => ({ value: s._id, label: isRTL ? s.nameAr : (s.nameEn || s.nameAr) }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[color:var(--ink-700)] mb-1">{t("statementFrom")}</label>
              <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setSubmitted(false); }} className="input-field w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[color:var(--ink-700)] mb-1">{t("statementTo")}</label>
              <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setSubmitted(false); }} className="input-field w-full" />
            </div>
          </div>
          <div className="mt-4">
            <button onClick={handleGenerate} disabled={!selectedSupplier || !fromDate || !toDate}
              className="flex items-center gap-2 px-4 py-2 btn-primary text-sm font-medium rounded-lg disabled:opacity-40">
              <Search className="w-4 h-4" />
              {t("generateStatement")}
            </button>
          </div>
        </div>
      }
    >
      {submitted && statement !== undefined && (
        <div>
          <div className="px-5 py-4 border-b flex justify-between items-center" style={{ background: "var(--brand-50)" }}>
            <div>
              <h2 className="text-base font-bold text-[color:var(--brand-800)]">{t("supplierStatement")}</h2>
              <p className="text-sm text-[color:var(--ink-600)] mt-0.5">{supplierName}</p>
            </div>
            <p className="text-xs text-[color:var(--ink-500)]">{fromDate} — {toDate}</p>
          </div>

          {(statement.openingBalance ?? 0) !== 0 && (
            <div className="px-5 py-3 border-b text-sm flex justify-between" style={{ background: "var(--gold-50, #fefce8)" }}>
              <span className="text-[color:var(--ink-600)]">{t("openingBalance")}</span>
              <span className="font-semibold tabular-nums">{fmt(statement.openingBalance ?? 0)}</span>
            </div>
          )}

          <StatementTable transactions={statement.transactions} t={t} isRTL={isRTL} formatCurrency={fmt} />

          {(statement.transactions?.length ?? 0) > 0 && (
            <div className="px-5 py-4 border-t flex justify-end" style={{ background: "var(--ink-50)" }}>
              <div className="w-72 space-y-2 text-sm">
                <div className="flex justify-between text-[color:var(--ink-600)]">
                  <span>{t("totalDebit")}</span>
                  <span className="font-medium text-red-700">{fmt(statement.totalDebit ?? 0)}</span>
                </div>
                <div className="flex justify-between text-[color:var(--ink-600)]">
                  <span>{t("totalCredit")}</span>
                  <span className="font-medium text-green-700">{fmt(statement.totalCredit ?? 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-[color:var(--ink-800)] border-t pt-2">
                  <span>{t("closingBalance")}</span>
                  <span>{fmt(statement.closingBalance ?? 0)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </PrintableReportPage>
  );
}
