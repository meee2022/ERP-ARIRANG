// @ts-nocheck
"use client";
import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Scale, Printer } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader } from "@/components/ui/page-header";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { SummaryStrip } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { CompanyPrintHeader } from "@/components/ui/company-print-header";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { usePermissions } from "@/hooks/usePermissions";

function startOfYearISO() { return `${new Date().getFullYear()}-01-01`; }
function todayISO() { return new Date().toISOString().split("T")[0]; }

export default function TrialBalancePage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { canView } = usePermissions();
  const { company: printCompany } = useCompanySettings();
  const [fromDate, setFromDate] = useState(startOfYearISO());
  const [toDate, setToDate] = useState(todayISO());
  const [includeZero, setIncludeZero] = useState(false);

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const data = useQuery(
    api.reports.getTrialBalance,
    company ? { companyId: company._id, fromDate, toDate, includeZero, branchId: branchArg as any } : "skip"
  );
  const loading = data === undefined;
  const rows = data?.rows ?? [];
  const totals = data?.totals ?? { totalDebit: 0, totalCredit: 0, openingDebit: 0, openingCredit: 0, closingDebit: 0, closingCredit: 0 };
  const isBalanced = Math.abs(totals.totalDebit - totals.totalCredit) < 1;

  if (!canView("reports")) {
    return <EmptyState icon={Scale} title={t("permissionDenied")} />;
  }

  return (
    <div className="space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      <CompanyPrintHeader
        company={printCompany}
        isRTL={isRTL}
        documentTitle={t("trialBalanceTitle")}
        periodLine={`${fromDate} — ${toDate}`}
      />
      <div className="no-print">
        <PageHeader
          icon={Scale}
          title={t("trialBalanceTitle")}
          subtitle={t("reportPostedOnly")}
          actions={
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium btn-ghost"
            >
              <Printer className="h-4 w-4" />
              {t("print")}
            </button>
          }
        />
      </div>

      {/* Filters */}
      <div className="no-print">
      <FilterPanel
        right={
          <label className="inline-flex items-center gap-2 text-xs text-[color:var(--ink-700)] cursor-pointer select-none">
            <input type="checkbox" checked={includeZero} onChange={e => setIncludeZero(e.target.checked)} className="rounded" />
            {t("includeZeroBalances")}
          </label>
        }
      >
        <FilterField label={t("fromDate")}>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input-field h-8 w-auto text-sm" />
        </FilterField>
        <FilterField label={t("toDate")}>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input-field h-8 w-auto text-sm" />
        </FilterField>
      </FilterPanel>
      </div>

      {/* Summary KPI strip */}
      <SummaryStrip items={[
        { label: t("totalDebit"),   value: formatCurrency(totals.totalDebit),   borderColor: "var(--brand-600)", accent: "var(--ink-900)" },
        { label: t("totalCredit"),  value: formatCurrency(totals.totalCredit),  borderColor: "var(--gold-400)",  accent: "var(--ink-900)" },
        {
          label: t("difference"),
          value: formatCurrency(Math.abs(totals.totalDebit - totals.totalCredit)),
          borderColor: isBalanced ? "#16a34a" : "#dc2626",
          accent: isBalanced ? "#16a34a" : "#dc2626",
        },
      ]} />

      {/* Table */}
      <div className="surface-card overflow-hidden">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner" />
            <span className="spinner-label">{t("loading") ?? "Loading…"}</span>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Scale} title={t("noResults")} message={t("tryChangingFilters") ?? "Try adjusting the date range or enabling zero balances."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("accountCode")}</th>
                  <th>{t("account")}</th>
                  <th className="text-end">{t("openingDebit")}</th>
                  <th className="text-end">{t("openingCredit")}</th>
                  <th className="text-end">{t("debit")}</th>
                  <th className="text-end">{t("credit")}</th>
                  <th className="text-end">{t("closingDebit")}</th>
                  <th className="text-end">{t("closingCredit")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any) => (
                  <tr key={row.accountId}>
                    <td className="code">{row.code}</td>
                    <td>{isRTL ? row.nameAr : (row.nameEn || row.nameAr)}</td>
                    <td className="text-end numeric muted">{row.openingDebit  ? formatCurrency(row.openingDebit)  : "—"}</td>
                    <td className="text-end numeric muted">{row.openingCredit ? formatCurrency(row.openingCredit) : "—"}</td>
                    <td className="text-end numeric">{row.periodDebit  ? formatCurrency(row.periodDebit)  : "—"}</td>
                    <td className="text-end numeric">{row.periodCredit ? formatCurrency(row.periodCredit) : "—"}</td>
                    <td className="text-end numeric" style={{ fontWeight: 600 }}>{row.closingDebit  ? formatCurrency(row.closingDebit)  : "—"}</td>
                    <td className="text-end numeric" style={{ fontWeight: 600 }}>{row.closingCredit ? formatCurrency(row.closingCredit) : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="row-total">
                  <td colSpan={2}>{t("total")}</td>
                  <td className="text-end numeric">{formatCurrency(totals.openingDebit)}</td>
                  <td className="text-end numeric">{formatCurrency(totals.openingCredit)}</td>
                  <td className="text-end numeric">{formatCurrency(totals.totalDebit)}</td>
                  <td className="text-end numeric">{formatCurrency(totals.totalCredit)}</td>
                  <td className="text-end numeric">{formatCurrency(totals.closingDebit)}</td>
                  <td className="text-end numeric">{formatCurrency(totals.closingCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
