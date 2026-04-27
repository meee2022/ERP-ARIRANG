// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader } from "@/components/ui/page-header";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { CostCenterSelect } from "@/components/ui/cost-center-select";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/data-display";
import { CompanyPrintHeader } from "@/components/ui/company-print-header";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { FileText, Printer } from "lucide-react";

function startOfMonthISO() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function CostCenterMovementPage() {
  const { t, isRTL, formatCurrency, formatDate } = useI18n();
  const { company: printCompany } = useCompanySettings();

  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const [ccFilter, setCcFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");

  // ── Company / companyId ────────────────────────────────────────────────────
  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  // ── Accounts (for filter dropdown + name lookup) ───────────────────────────
  const accountsRaw = useQuery(
    api.accounts.getAll,
    companyId ? { companyId } : "skip"
  );
  const postableAccounts = (accountsRaw ?? []).filter(
    (a: any) => a.isPostable && a.isActive !== false
  );

  // ── Cost centers (for name lookup in table rows) ───────────────────────────
  const costCentersRaw = useQuery(
    api.costCenters.getCostCenters,
    companyId ? { companyId } : "skip"
  );

  // ── Main report query ──────────────────────────────────────────────────────
  const movements = useQuery(
    api.costCenters.getCostCenterMovement,
    companyId
      ? {
          companyId,
          fromDate,
          toDate,
          costCenterId: ccFilter || undefined,
          accountId: accountFilter || undefined,
        }
      : "skip"
  );

  const isLoading = movements === undefined && !!companyId;
  const rows: any[] = movements ?? [];

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalDebit = rows.reduce((s, r) => s + (r.debit ?? 0), 0);
  const totalCredit = rows.reduce((s, r) => s + (r.credit ?? 0), 0);

  // ── Lookup helpers ─────────────────────────────────────────────────────────
  function accountLabel(accountId: string) {
    const acc = (accountsRaw ?? []).find((a: any) => a._id === accountId);
    if (!acc) return accountId;
    const name = isRTL ? acc.nameAr : acc.nameEn || acc.nameAr;
    return acc.code ? `${acc.code} — ${name}` : name;
  }

  function ccLabel(costCenterId: string) {
    const cc = (costCentersRaw ?? []).find((c: any) => c._id === costCenterId);
    if (!cc) return costCenterId;
    const name = isRTL ? cc.nameAr : cc.nameEn || cc.nameAr;
    return cc.code ? `${cc.code} — ${name}` : name;
  }

  return (
    <div className="space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      {/* ── Print-only company header ──────────────────────────────────────── */}
      <CompanyPrintHeader
        company={printCompany}
        isRTL={isRTL}
        documentTitle={t("costCenterMovement")}
        periodLine={`${fromDate} — ${toDate}`}
      />

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="no-print">
        <PageHeader
          icon={FileText}
          title={t("costCenterMovement")}
          subtitle={t("costCenterMovementDesc")}
          actions={
            rows.length > 0 ? (
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 btn-ghost text-sm font-medium rounded-lg print:hidden"
              >
                <Printer className="h-4 w-4" />
                {t("print")}
              </button>
            ) : undefined
          }
        />
      </div>

      {/* ── Filter panel ──────────────────────────────────────────────────── */}
      <div className="no-print">
        <FilterPanel
        className="print:hidden"
        right={
          rows.length > 0 && (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-1.5 btn-ghost text-xs font-medium rounded-lg"
            >
              <Printer className="h-3.5 w-3.5" />
              {t("print")}
            </button>
          )
        }
      >
        {/* From Date */}
        <FilterField label={t("fromDate")}>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="input-field h-9 w-auto"
          />
        </FilterField>

        {/* To Date */}
        <FilterField label={t("toDate")}>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="input-field h-9 w-auto"
          />
        </FilterField>

        {/* Cost Center */}
        <FilterField label={t("costCenter")}>
          <CostCenterSelect
            companyId={companyId}
            value={ccFilter}
            onChange={setCcFilter}
            className="input-field h-9 min-w-[200px]"
          />
        </FilterField>

        {/* Account */}
        <FilterField label={t("account")}>
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="input-field h-9 min-w-[220px]"
          >
            <option value="">{t("account")} — {t("total")}</option>
            {postableAccounts.map((a: any) => (
              <option key={a._id} value={a._id}>
                {a.code} — {isRTL ? a.nameAr : a.nameEn || a.nameAr}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterPanel>
      </div>

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="surface-card">
          <LoadingState label={t("loading")} />
        </div>
      ) : rows.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={FileText}
            title={t("costCenterMovement")}
            message={t("noResults")}
          />
        </div>
      ) : (
        <div className="surface-card overflow-hidden print:shadow-none print:border-none">
          {/* ── Table header band ──────────────────────────────────────────── */}
          <div
            className="px-5 py-3 border-b border-[color:var(--ink-100)] flex items-center justify-between print:hidden"
            style={{ background: "var(--brand-50)" }}
          >
            <div>
              <h2 className="text-sm font-bold text-[color:var(--brand-800)]">
                {t("costCenterMovement")}
              </h2>
              <p className="text-xs text-[color:var(--ink-500)] mt-0.5">
                {fromDate} — {toDate}
              </p>
            </div>
            <span className="text-xs text-[color:var(--ink-400)]">
              {rows.length}{" "}
              {t("total")}
            </span>
          </div>

          {/* ── Main table ─────────────────────────────────────────────────── */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[color:var(--ink-50)] border-b border-[color:var(--ink-100)]">
                  <th className="px-4 py-3 text-start text-xs font-semibold text-[color:var(--ink-500)] uppercase tracking-wider whitespace-nowrap">
                    {t("date")}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-[color:var(--ink-500)] uppercase tracking-wider whitespace-nowrap">
                    {t("entryNo")}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-[color:var(--ink-500)] uppercase tracking-wider">
                    {t("description")}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-[color:var(--ink-500)] uppercase tracking-wider">
                    {t("account")}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-[color:var(--ink-500)] uppercase tracking-wider">
                    {t("costCenter")}
                  </th>
                  <th className="px-4 py-3 text-end text-xs font-semibold text-[color:var(--ink-500)] uppercase tracking-wider whitespace-nowrap">
                    {t("debit")}
                  </th>
                  <th className="px-4 py-3 text-end text-xs font-semibold text-[color:var(--ink-500)] uppercase tracking-wider whitespace-nowrap">
                    {t("credit")}
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row: any, i: number) => (
                  <tr
                    key={row._id ?? i}
                    className="border-b border-[color:var(--ink-100)] hover:bg-[color:var(--ink-50)] transition-colors"
                  >
                    {/* Date */}
                    <td className="px-4 py-2.5 text-[color:var(--ink-500)] tabular-nums whitespace-nowrap text-xs">
                      {row.date ? formatDate(row.date) : "—"}
                    </td>

                    {/* Entry No */}
                    <td className="px-4 py-2.5 text-[color:var(--ink-700)] font-mono text-xs whitespace-nowrap">
                      {row.entryNumber ?? row.entryNo ?? row.number ?? "—"}
                    </td>

                    {/* Description */}
                    <td className="px-4 py-2.5 text-[color:var(--ink-900)] max-w-[260px] truncate">
                      {row.description ?? row.notes ?? "—"}
                    </td>

                    {/* Account */}
                    <td className="px-4 py-2.5 text-[color:var(--ink-700)] text-xs">
                      {row.accountId
                        ? accountLabel(row.accountId)
                        : row.accountCode
                        ? `${row.accountCode} — ${
                            isRTL
                              ? row.accountNameAr ?? row.accountName
                              : row.accountNameEn ?? row.accountNameAr ?? row.accountName
                          }`
                        : "—"}
                    </td>

                    {/* Cost Center */}
                    <td className="px-4 py-2.5 text-[color:var(--ink-700)] text-xs">
                      {row.costCenterId
                        ? ccLabel(row.costCenterId)
                        : row.costCenterCode
                        ? `${row.costCenterCode} — ${
                            isRTL
                              ? row.costCenterNameAr ?? row.costCenterName
                              : row.costCenterNameEn ?? row.costCenterNameAr ?? row.costCenterName
                          }`
                        : "—"}
                    </td>

                    {/* Debit */}
                    <td className="px-4 py-2.5 text-end tabular-nums font-medium text-green-700 whitespace-nowrap">
                      {(row.debit ?? 0) > 0
                        ? formatCurrency(row.debit)
                        : <span className="text-[color:var(--ink-300)]">—</span>}
                    </td>

                    {/* Credit */}
                    <td className="px-4 py-2.5 text-end tabular-nums font-medium text-red-600 whitespace-nowrap">
                      {(row.credit ?? 0) > 0
                        ? formatCurrency(row.credit)
                        : <span className="text-[color:var(--ink-300)]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* ── Totals row ────────────────────────────────────────────── */}
              <tfoot>
                <tr className="bg-[color:var(--ink-50)] border-t-2 border-[color:var(--ink-300)] font-bold">
                  <td
                    colSpan={5}
                    className="px-4 py-3 text-start text-sm text-[color:var(--ink-700)]"
                  >
                    {t("total")}
                  </td>
                  <td className="px-4 py-3 text-end tabular-nums text-green-700 text-sm">
                    {formatCurrency(totalDebit)}
                  </td>
                  <td className="px-4 py-3 text-end tabular-nums text-red-600 text-sm">
                    {formatCurrency(totalCredit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
