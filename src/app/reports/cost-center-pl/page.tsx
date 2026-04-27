// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/data-display";
import { CompanyPrintHeader } from "@/components/ui/company-print-header";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PieChart, Printer } from "lucide-react";

function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export default function CostCenterPLPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { company: printCompany } = useCompanySettings();

  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());

  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const data = useQuery(
    api.costCenters.getCostCenterPL,
    companyId ? { companyId, fromDate, toDate } : "skip"
  );

  const loading = data === undefined;
  const rows: {
    costCenterId: string;
    code: string;
    nameAr: string;
    nameEn: string;
    revenue: number;
    expenses: number;
    netResult: number;
  }[] = data ?? [];

  const totalRevenue = rows.reduce((s, r) => s + (r.revenue ?? 0), 0);
  const totalExpenses = rows.reduce((s, r) => s + (r.expenses ?? 0), 0);
  const totalNet = rows.reduce((s, r) => s + (r.netResult ?? 0), 0);

  const ccName = (row: (typeof rows)[0]) =>
    isRTL ? row.nameAr : row.nameEn || row.nameAr;

  return (
    <div className="space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      {/* Print-only company header */}
      <CompanyPrintHeader
        company={printCompany}
        isRTL={isRTL}
        documentTitle={t("costCenterPL")}
        periodLine={`${fromDate} — ${toDate}`}
      />

      {/* Page header */}
      <div className="no-print">
        <PageHeader
          icon={PieChart}
          title={t("costCenterPL")}
          subtitle={t("costCenterPLDesc")}
          actions={
            <button
              onClick={() => window.print()}
              className="no-print flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium btn-ghost"
            >
              <Printer className="h-4 w-4" />
              {t("print")}
            </button>
          }
        />
      </div>

      {/* Filters */}
      <FilterPanel className="no-print">
        <FilterField label={t("fromDate")}>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="input-field h-8 w-auto text-sm"
          />
        </FilterField>
        <FilterField label={t("toDate")}>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="input-field h-8 w-auto text-sm"
          />
        </FilterField>
      </FilterPanel>

      {/* KPI Summary cards */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Revenue */}
          <div
            className="surface-card p-5 flex flex-col gap-1"
            style={{ borderInlineStart: "3px solid var(--brand-600)" }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--ink-400)]">
              {t("ccTotalRevenue")}
            </span>
            <span className="text-2xl font-bold tabular-nums leading-tight text-[color:var(--ink-900)]">
              {formatCurrency(totalRevenue)}
            </span>
          </div>

          {/* Total Expenses */}
          <div
            className="surface-card p-5 flex flex-col gap-1"
            style={{ borderInlineStart: "3px solid #f59e0b" }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--ink-400)]">
              {t("ccTotalExpenses")}
            </span>
            <span className="text-2xl font-bold tabular-nums leading-tight text-[color:var(--ink-900)]">
              {formatCurrency(totalExpenses)}
            </span>
          </div>

          {/* Total Net Result */}
          <div
            className="surface-card p-5 flex flex-col gap-1"
            style={{
              borderInlineStart: `3px solid ${totalNet >= 0 ? "rgb(16,185,129)" : "rgb(239,68,68)"}`,
            }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--ink-400)]">
              {t("ccNetResult")}
            </span>
            <span
              className="text-2xl font-bold tabular-nums leading-tight"
              style={{ color: totalNet >= 0 ? "rgb(5,150,105)" : "rgb(220,38,38)" }}
            >
              {formatCurrency(totalNet)}
            </span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="surface-card overflow-hidden">
        {loading ? (
          <div className="p-8">
            <LoadingState label={t("loading")} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={PieChart}
            title={t("noResults")}
            message={t("tryChangingFilters") ?? "Try adjusting the date range."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr className="bg-[color:var(--ink-50)]">
                  <th
                    className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-[color:var(--ink-500)] border border-[color:var(--ink-100)] whitespace-nowrap"
                  >
                    {t("ccCode")}
                  </th>
                  <th
                    className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-[color:var(--ink-500)] border border-[color:var(--ink-100)]"
                  >
                    {t("costCenter")}
                  </th>
                  <th
                    className="px-4 py-3 text-end text-xs font-semibold uppercase tracking-wider text-[color:var(--ink-500)] border border-[color:var(--ink-100)] whitespace-nowrap"
                  >
                    {t("ccTotalRevenue")}
                  </th>
                  <th
                    className="px-4 py-3 text-end text-xs font-semibold uppercase tracking-wider text-[color:var(--ink-500)] border border-[color:var(--ink-100)] whitespace-nowrap"
                  >
                    {t("ccTotalExpenses")}
                  </th>
                  <th
                    className="px-4 py-3 text-end text-xs font-semibold uppercase tracking-wider text-[color:var(--ink-500)] border border-[color:var(--ink-100)] whitespace-nowrap"
                  >
                    {t("ccNetResult")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const net = row.netResult ?? 0;
                  const isProfit = net >= 0;
                  return (
                    <tr
                      key={row.costCenterId}
                      className="border-t border-[color:var(--ink-100)] hover:bg-[color:var(--ink-50)]/60 transition-colors"
                    >
                      <td className="px-4 py-2.5 code border border-[color:var(--ink-100)] text-[color:var(--ink-700)] font-medium whitespace-nowrap">
                        {row.code}
                      </td>
                      <td className="px-4 py-2.5 border border-[color:var(--ink-100)] text-[color:var(--ink-900)]">
                        {ccName(row)}
                      </td>
                      <td className="px-4 py-2.5 numeric text-end border border-[color:var(--ink-100)] text-[color:var(--ink-900)] tabular-nums">
                        {formatCurrency(row.revenue ?? 0)}
                      </td>
                      <td className="px-4 py-2.5 numeric text-end border border-[color:var(--ink-100)] text-[color:var(--ink-900)] tabular-nums">
                        {formatCurrency(row.expenses ?? 0)}
                      </td>
                      <td
                        className="px-4 py-2.5 numeric text-end border border-[color:var(--ink-100)] font-semibold tabular-nums"
                        style={{ color: isProfit ? "rgb(5,150,105)" : "rgb(220,38,38)" }}
                      >
                        {formatCurrency(net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="row-total border-t-2 border-[color:var(--ink-300)] bg-[color:var(--ink-50)]">
                  <td
                    colSpan={2}
                    className="px-4 py-3 font-bold text-[color:var(--ink-800)] border border-[color:var(--ink-100)]"
                  >
                    {t("total")}
                  </td>
                  <td className="px-4 py-3 numeric text-end font-bold tabular-nums text-[color:var(--ink-900)] border border-[color:var(--ink-100)]">
                    {formatCurrency(totalRevenue)}
                  </td>
                  <td className="px-4 py-3 numeric text-end font-bold tabular-nums text-[color:var(--ink-900)] border border-[color:var(--ink-100)]">
                    {formatCurrency(totalExpenses)}
                  </td>
                  <td
                    className="px-4 py-3 numeric text-end font-bold tabular-nums border border-[color:var(--ink-100)]"
                    style={{ color: totalNet >= 0 ? "rgb(5,150,105)" : "rgb(220,38,38)" }}
                  >
                    {formatCurrency(totalNet)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .print\\:hidden { display: none !important; }
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
