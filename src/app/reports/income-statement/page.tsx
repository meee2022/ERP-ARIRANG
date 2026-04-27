// @ts-nocheck
"use client";
import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { TrendingUp, Printer } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { PdfDownloadButton } from "@/components/ui/PdfDownloadButton";
import { IncomeStatementPdf } from "@/lib/pdf/IncomeStatementPdf";
import { LoadingState } from "@/components/ui/data-display";
import { CompanyPrintHeader } from "@/components/ui/company-print-header";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PageHeader } from "@/components/ui/page-header";

function startOfYearISO() { return `${new Date().getFullYear()}-01-01`; }
function todayISO() { return new Date().toISOString().split("T")[0]; }

export default function IncomeStatementPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { company: printCompany } = useCompanySettings();
  const [startDate, setStartDate] = useState(startOfYearISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [branchId, setBranchId] = useState<string>("");
  const [hideZero, setHideZero] = useState(true);

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const branches = useQuery(api.branches.getAll, company ? { companyId: company._id } : "skip");

  const data = useQuery(
    api.reports.getIncomeStatement,
    company
      ? {
          companyId: company._id,
          startDate,
          endDate,
          branchId: branchArg as any,
        }
      : "skip"
  );

  const loading = data === undefined;
  const revenueAccounts = (data?.revenueAccounts ?? []).filter((r: any) => !hideZero || r.balance !== 0);
  const expenseAccounts = (data?.expenseAccounts ?? []).filter((r: any) => !hideZero || r.balance !== 0);
  const totalRevenue = data?.totalRevenue ?? 0;
  const totalExpenses = data?.totalExpenses ?? 0;
  const netIncome = data?.netIncome ?? 0;
  const isProfit = netIncome >= 0;

  const accountName = (row: any) => isRTL ? row.nameAr : (row.nameEn || row.nameAr);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      <CompanyPrintHeader
        company={printCompany}
        isRTL={isRTL}
        documentTitle={t("incomeStatementTitle")}
        periodLine={`${startDate} — ${endDate}`}
      />

      {/* Header */}
      <div className="no-print">
        <PageHeader
          icon={TrendingUp}
          title={t("incomeStatementTitle")}
          actions={
            <>
              {data && (
                <PdfDownloadButton
                  document={
                    <IncomeStatementPdf data={{
                      logoUrl: printCompany?.logoUrl ?? undefined,
                      companyNameEn: printCompany?.nameEn ?? undefined,
                      companyPhone: printCompany?.phone ?? undefined,
                      companyName: company ? (isRTL ? company.nameAr : (company.nameEn || company.nameAr)) : "",
                      startDate, endDate,
                      revenueAccounts: (data.revenueAccounts ?? []).filter((r: any) => !hideZero || r.balance !== 0),
                      expenseAccounts: (data.expenseAccounts ?? []).filter((r: any) => !hideZero || r.balance !== 0),
                      totalRevenue:  data.totalRevenue  ?? 0,
                      totalExpenses: data.totalExpenses ?? 0,
                      netIncome:     data.netIncome     ?? 0,
                      isRTL,
                      labels: {
                        title:         t("incomeStatementTitle"),
                        period:        `${startDate} → ${endDate}`,
                        revenue:       t("revenues"),
                        totalRevenue:  t("totalRevenue"),
                        expenses:      t("expenses"),
                        totalExpenses: t("totalExpenses"),
                        netIncome:     t("netIncome"),
                        netLoss:       t("netLoss"),
                        printedBy:     t("printedBy"),
                      },
                      formatCurrency: (n: number) => new Intl.NumberFormat("en-QA", { style: "currency", currency: "QAR", minimumFractionDigits: 2 }).format(n / 100),
                    }} />
                  }
                  fileName={`income-statement-${startDate}-${endDate}.pdf`}
                  label={t("downloadPdf") ?? "PDF"}
                />
              )}
              <button onClick={() => window.print()} className="btn-ghost h-9 px-4 rounded-xl inline-flex items-center gap-2 text-sm font-semibold"><Printer className="h-4 w-4" />{t("printReport")}</button>
            </>
          }
        />
      </div>

      {/* Filters */}
      <div className="no-print">
      <div className="surface-card p-3 flex items-center gap-4 flex-wrap print:hidden">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[color:var(--ink-500)]">{t("fromDate")}:</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field h-9 w-auto" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[color:var(--ink-500)]">{t("toDate")}:</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field h-9 w-auto" />
        </div>
        {branches && branches.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[color:var(--ink-500)]">{t("branch")}:</span>
            <select value={branchId} onChange={e => setBranchId(e.target.value)} className="input-field h-9 w-auto">
              <option value="">{t("allBranches")}</option>
              {branches.map((b: any) => (
                <option key={b._id} value={b._id}>{isRTL ? b.nameAr : (b.nameEn || b.nameAr)}</option>
              ))}
            </select>
          </div>
        )}
        <label className="inline-flex items-center gap-2 text-sm text-[color:var(--ink-700)]">
          <input type="checkbox" checked={hideZero} onChange={e => setHideZero(e.target.checked)} />
          {t("hideZeroBalances")}
        </label>
      </div>
      </div>

      {loading ? (
        <div className="surface-card p-8 text-center">
          <LoadingState label={t("loading")} />
        </div>
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">

              {/* ── REVENUE ── */}
              <thead>
                <tr style={{ background: "var(--brand-800)" }}>
                  <th colSpan={3} className="px-4 py-3 text-start text-white font-semibold text-sm uppercase tracking-wider">
                    {t("revenues")}
                  </th>
                </tr>
                <tr className="bg-[color:var(--brand-50)] text-[color:var(--ink-600)] text-xs uppercase tracking-wider">
                  <th className="px-4 py-2 text-start font-semibold w-28">{t("accountCode")}</th>
                  <th className="px-4 py-2 text-start font-semibold">{t("account")}</th>
                  <th className="px-4 py-2 text-end font-semibold">{t("amount")}</th>
                </tr>
              </thead>
              <tbody>
                {revenueAccounts.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-4 text-center text-[color:var(--ink-400)] text-sm">{t("noResults")}</td></tr>
                ) : revenueAccounts.map((row: any) => (
                  <tr key={row.accountId} className="border-t border-[color:var(--ink-100)] hover:bg-[color:var(--brand-50)]/30">
                    <td className="px-4 py-2.5 code">{row.code}</td>
                    <td className="px-4 py-2.5">{accountName(row)}</td>
                    <td className="px-4 py-2.5 numeric text-end">{formatCurrency(row.balance)}</td>
                  </tr>
                ))}
              </tbody>

              {/* Revenue Subtotal */}
              <tbody>
                <tr style={{ background: "var(--brand-50)", borderTop: "2px solid var(--brand-200)" }}>
                  <td colSpan={2} className="px-4 py-3 font-bold text-[color:var(--ink-800)]">{t("totalRevenue")}</td>
                  <td className="px-4 py-3 numeric text-end font-bold text-[color:var(--brand-800)]">{formatCurrency(totalRevenue)}</td>
                </tr>
              </tbody>

              {/* Spacer */}
              <tbody><tr><td colSpan={3} className="py-2" /></tr></tbody>

              {/* ── EXPENSES ── */}
              <thead>
                <tr style={{ background: "var(--brand-800)" }}>
                  <th colSpan={3} className="px-4 py-3 text-start text-white font-semibold text-sm uppercase tracking-wider">
                    {t("expenses")}
                  </th>
                </tr>
                <tr className="bg-[color:var(--brand-50)] text-[color:var(--ink-600)] text-xs uppercase tracking-wider">
                  <th className="px-4 py-2 text-start font-semibold w-28">{t("accountCode")}</th>
                  <th className="px-4 py-2 text-start font-semibold">{t("account")}</th>
                  <th className="px-4 py-2 text-end font-semibold">{t("amount")}</th>
                </tr>
              </thead>
              <tbody>
                {expenseAccounts.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-4 text-center text-[color:var(--ink-400)] text-sm">{t("noResults")}</td></tr>
                ) : expenseAccounts.map((row: any) => (
                  <tr key={row.accountId} className="border-t border-[color:var(--ink-100)] hover:bg-[color:var(--brand-50)]/30">
                    <td className="px-4 py-2.5 code">{row.code}</td>
                    <td className="px-4 py-2.5">{accountName(row)}</td>
                    <td className="px-4 py-2.5 numeric text-end">{formatCurrency(row.balance)}</td>
                  </tr>
                ))}
              </tbody>

              {/* Expenses Subtotal */}
              <tbody>
                <tr style={{ background: "var(--brand-50)", borderTop: "2px solid var(--brand-200)" }}>
                  <td colSpan={2} className="px-4 py-3 font-bold text-[color:var(--ink-800)]">{t("totalExpenses")}</td>
                  <td className="px-4 py-3 numeric text-end font-bold text-[color:var(--brand-800)]">{formatCurrency(totalExpenses)}</td>
                </tr>
              </tbody>

              {/* ── NET INCOME ── */}
              <tbody>
                <tr style={{
                  background: isProfit ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                  borderTop: `3px solid ${isProfit ? "rgb(16,185,129)" : "rgb(239,68,68)"}`,
                }}>
                  <td colSpan={2} className="px-4 py-4 font-extrabold text-base" style={{ color: isProfit ? "rgb(5,150,105)" : "rgb(220,38,38)" }}>
                    {isProfit ? t("netIncome") : t("netLoss")}
                  </td>
                  <td className="px-4 py-4 numeric text-end font-extrabold text-base" style={{ color: isProfit ? "rgb(5,150,105)" : "rgb(220,38,38)" }}>
                    {formatCurrency(Math.abs(netIncome))}
                  </td>
                </tr>
              </tbody>

            </table>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .no-print { display: none !important; }
          aside, nav, header, .sidebar { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; width: 100% !important; }
          body { background: white !important; }
          .surface-card { box-shadow: none !important; border: 1px solid #ddd !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
