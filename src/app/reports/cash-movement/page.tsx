// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { PdfDownloadButton } from "@/components/ui/PdfDownloadButton";
import { CashMovementPdf } from "@/lib/pdf/CashMovementPdf";
import { Printer, Search, TrendingUp, TrendingDown } from "lucide-react";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { CompanyPrintHeader } from "@/components/ui/company-print-header";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PageHeader } from "@/components/ui/page-header";

export default function CashMovementReportPage() {
  const { t, isRTL, lang } = useI18n();
  const { currentUser } = useAuth();
  const { company: printCompany } = useCompanySettings();
  const companyId = currentUser?.companyId;

  const accounts = useQuery(
    api.reports.listCashAndBankAccounts,
    companyId ? { companyId } : "skip"
  );

  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>(
    new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
  );
  const [toDate, setToDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [submitted, setSubmitted] = useState(false);

  const report = useQuery(
    api.reports.getCashMovementReport,
    submitted && selectedAccount && companyId && fromDate && toDate
      ? { companyId, accountId: selectedAccount as any, fromDate, toDate }
      : "skip"
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-QA", {
      style: "currency",
      currency: "QAR",
      minimumFractionDigits: 2,
    }).format(n / 100);

  const kpis = report
    ? [
        { label: t("openingBalance"), value: report.openingBalance, color: "text-[color:var(--ink-700)]" },
        { label: t("debit"),          value: report.totalDebit,     color: "text-green-700" },
        { label: t("credit"),         value: report.totalCredit,    color: "text-red-700"   },
        { label: t("closingBalance"), value: report.closingBalance, color: "text-[color:var(--brand-700)]" },
      ]
    : [];

  return (
    <div className="space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      <CompanyPrintHeader
        company={printCompany}
        isRTL={isRTL}
        documentTitle={t("cashMovementReport")}
        periodLine={`${fromDate} — ${toDate}`}
      />

      {/* Page header */}
      <div className="no-print">
        <PageHeader
          icon={TrendingUp}
          title={t("cashMovementReport")}
          actions={<button onClick={() => window.print()} className="btn-ghost h-9 px-4 rounded-xl inline-flex items-center gap-2 text-sm font-semibold"><Printer className="h-4 w-4" />{t("print")}</button>}
        />
      </div>

      {/* Filters */}
      <div className="no-print">
      <div className="surface-card p-5 print:hidden">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[color:var(--ink-700)] mb-1">{t("account")}</label>
            <select
              value={selectedAccount}
              onChange={(e) => { setSelectedAccount(e.target.value); setSubmitted(false); }}
              className="input-field w-full"
            >
              <option value="">{t("selectAccount")}</option>
              {(accounts ?? []).map((a: any) => (
                <option key={a._id} value={a._id}>
                  {a.code ? `${a.code} — ` : ""}{a.nameAr}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-700)] mb-1">{t("statementFrom")}</label>
            <input type="date" value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setSubmitted(false); }}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-700)] mb-1">{t("statementTo")}</label>
            <input type="date" value={toDate}
              onChange={(e) => { setToDate(e.target.value); setSubmitted(false); }}
              className="input-field w-full"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setSubmitted(true)}
            disabled={!selectedAccount || !fromDate || !toDate}
            className="flex items-center gap-2 px-4 py-2 btn-primary text-sm font-medium rounded-lg disabled:opacity-40"
          >
            <Search className="w-4 h-4" />
            {t("generateStatement")}
          </button>
          {report && (
            <>
              <PdfDownloadButton
                document={
                  <CashMovementPdf data={{
                    logoUrl: printCompany?.logoUrl ?? undefined,
                    companyNameEn: printCompany?.nameEn ?? undefined,
                    companyPhone: printCompany?.phone ?? undefined,
                    companyName: (accounts?.find((a: any) => a._id === selectedAccount) as any)?.companyNameAr ?? "",
                    accountCode: (accounts?.find((a: any) => a._id === selectedAccount) as any)?.code ?? "",
                    accountName: (accounts?.find((a: any) => a._id === selectedAccount) as any)?.nameAr ?? "",
                    fromDate, toDate,
                    openingBalance: report.openingBalance ?? 0,
                    rows: (report.rows ?? report.movements ?? []).map((r: any) => ({
                      date: r.date, debit: r.debit ?? 0, credit: r.credit ?? 0,
                      net: (r.debit ?? 0) - (r.credit ?? 0),
                      balance: r.balance ?? r.runningBalance ?? 0,
                    })),
                    totalDebit:     report.totalDebit     ?? 0,
                    totalCredit:    report.totalCredit    ?? 0,
                    closingBalance: report.closingBalance ?? 0,
                    isRTL,
                    labels: {
                      title:          t("cashBankMovement")   ?? (isRTL ? "حركة النقدية والبنوك" : "Cash/Bank Movement"),
                      period:         `${fromDate} → ${toDate}`,
                      accountLabel:   t("account"),
                      date:           t("date"),
                      debit:          t("debit"),
                      credit:         t("credit"),
                      net:            t("netMovement")        ?? (isRTL ? "الحركة الصافية" : "Net Movement"),
                      balance:        t("balance")            ?? (isRTL ? "الرصيد" : "Balance"),
                      openingBalance: t("openingBalance"),
                      totalDebit:     t("totalDebit"),
                      totalCredit:    t("totalCredit"),
                      closingBalance: t("closingBalance"),
                      printedBy:      t("printedBy"),
                    },
                    formatCurrency: fmt,
                  }} />
                }
                fileName={`cash-movement-${fromDate}-${toDate}.pdf`}
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
      </div>

      {/* Report */}
      {submitted && report !== undefined && (
        <div className="surface-card overflow-hidden print:shadow-none print:border-none">
          <div className="p-5 border-b flex justify-between items-start" style={{ background: "var(--brand-50)" }}>
            <div>
              <h2 className="text-lg font-bold text-[color:var(--brand-800)]">{t("cashMovementReport")}</h2>
              <p className="text-sm text-[color:var(--ink-600)] mt-0.5">
                {report.accountCode && <span className="code me-2">{report.accountCode}</span>}
                {report.accountNameAr}
              </p>
            </div>
            <p className="text-xs text-[color:var(--ink-500)] mt-1">{fromDate} — {toDate}</p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x rtl:divide-x-reverse border-b">
            {kpis.map(({ label, value, color }) => (
              <div key={label} className="p-4 text-center">
                <p className="text-xs text-[color:var(--ink-500)] mb-1">{label}</p>
                <p className={`text-lg font-bold tabular-nums ${color}`}>{fmt(value ?? 0)}</p>
              </div>
            ))}
          </div>

          {/* Day table */}
          {(report.rows?.length ?? 0) === 0 ? (
            <EmptyState title={t("noTransactions")} />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("date")}</th>
                    <th className="text-end text-green-700">{t("debit")}</th>
                    <th className="text-end text-red-700">{t("credit")}</th>
                    <th className="text-end">{t("net")}</th>
                    <th className="text-end">{t("runningBalance")}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row: any, i: number) => (
                    <tr key={row.date}>
                      <td className="muted font-medium">{row.date}</td>
                      <td className="numeric text-end text-green-700">
                        {row.debit > 0 ? (
                          <span className="inline-flex items-center gap-1 justify-end">
                            <TrendingUp className="w-3 h-3" />
                            {fmt(row.debit)}
                          </span>
                        ) : <span className="text-[color:var(--ink-300)]">—</span>}
                      </td>
                      <td className="numeric text-end text-red-600">
                        {row.credit > 0 ? (
                          <span className="inline-flex items-center gap-1 justify-end">
                            <TrendingDown className="w-3 h-3" />
                            {fmt(row.credit)}
                          </span>
                        ) : <span className="text-[color:var(--ink-300)]">—</span>}
                      </td>
                      <td className={`numeric text-end font-medium ${row.net >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {row.net >= 0 ? "+" : ""}{fmt(row.net)}
                      </td>
                      <td className="numeric text-end font-semibold">
                        {fmt(row.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="row-total">
                    <td>{t("total")}</td>
                    <td className="numeric text-end text-green-700">{fmt(report.totalDebit)}</td>
                    <td className="numeric text-end text-red-700">{fmt(report.totalCredit)}</td>
                    <td className="numeric text-end">
                      {(() => {
                        const net = report.totalDebit - report.totalCredit;
                        return <span className={net >= 0 ? "text-green-700" : "text-red-600"}>{net >= 0 ? "+" : ""}{fmt(net)}</span>;
                      })()}
                    </td>
                    <td className="numeric text-end text-[color:var(--brand-800)]">{fmt(report.closingBalance)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {submitted && report === undefined && (
        <LoadingState label={t("loading")} />
      )}
    </div>
  );
}
