// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/useAppStore";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { CostCenterSelect } from "@/components/ui/cost-center-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/data-display";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PrintableReportPage } from "@/components/ui/printable-report";
import { FileText } from "lucide-react";

function startOfMonthISO() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
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

  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const accountsRaw = useQuery(api.accounts.getAll, companyId ? { companyId } : "skip");
  const postableAccounts = (accountsRaw ?? []).filter((a: any) => a.isPostable && a.isActive !== false);

  const costCentersRaw = useQuery(api.costCenters.getCostCenters, companyId ? { companyId } : "skip");

  const movements = useQuery(
    api.costCenters.getCostCenterMovement,
    companyId ? { companyId, fromDate, toDate, costCenterId: ccFilter || undefined, accountId: accountFilter || undefined } : "skip"
  );

  const isLoading = movements === undefined && !!companyId;
  const rows: any[] = movements ?? [];

  const totalDebit = rows.reduce((s, r) => s + (r.debit ?? 0), 0);
  const totalCredit = rows.reduce((s, r) => s + (r.credit ?? 0), 0);

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
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={t("costCenterMovement")}
      period={`${fromDate} — ${toDate}`}
      filters={
        <FilterPanel>
          <FilterField label={t("fromDate")}>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input-field h-9 w-auto" />
          </FilterField>
          <FilterField label={t("toDate")}>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input-field h-9 w-auto" />
          </FilterField>
          <FilterField label={t("costCenter")}>
            <CostCenterSelect companyId={companyId} value={ccFilter} onChange={setCcFilter} className="input-field h-9 min-w-[200px]" />
          </FilterField>
          <FilterField label={t("account")}>
            <SearchableSelect
              isRTL={isRTL}
              value={accountFilter}
              onChange={(v) => setAccountFilter(v)}
              placeholder={`${t("account")} — ${t("total")}`}
              searchPlaceholder={isRTL ? "ابحث بالاسم أو الكود..." : "Search by name or code..."}
              emptyMessage={isRTL ? "لا توجد نتائج" : "No results"}
              options={postableAccounts.map((a: any) => ({
                value: a._id,
                label: `${a.code} — ${isRTL ? a.nameAr : (a.nameEn || a.nameAr)}`,
              }))}
            />
          </FilterField>
        </FilterPanel>
      }
    >
      {isLoading ? (
        <div className="surface-card"><LoadingState label={t("loading")} /></div>
      ) : rows.length === 0 ? (
        <div className="surface-card"><EmptyState icon={FileText} title={t("costCenterMovement")} message={t("noResults")} /></div>
      ) : (
        <div>
          {/* Header band */}
          <div className="px-5 py-3 border-b border-[color:var(--ink-100)] flex items-center justify-between" style={{ background: "var(--brand-50)" }}>
            <div>
              <h2 className="text-sm font-bold text-[color:var(--brand-800)]">{t("costCenterMovement")}</h2>
              <p className="text-xs text-[color:var(--ink-500)] mt-0.5">{fromDate} — {toDate}</p>
            </div>
            <span className="text-xs text-[color:var(--ink-400)]">{rows.length} {t("total")}</span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: "#6b1523" }}>
                  {[t("date"), t("entryNo"), t("description"), t("account"), t("costCenter"), t("debit"), t("credit")].map((h, i) => (
                    <th key={i} className="px-[14px] py-[10px] text-start text-[11px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.85)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, i: number) => (
                  <tr key={row._id ?? i} className="hover:bg-[#fdf2f4] transition-colors"
                    style={{ background: i % 2 === 0 ? "white" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                    <td className="px-[14px] py-[8px] text-[12.5px] tabular-nums whitespace-nowrap" style={{ color: "#1e293b" }}>
                      {row.date ? formatDate(row.date) : "—"}
                    </td>
                    <td className="px-[14px] py-[8px] text-[12.5px] font-mono whitespace-nowrap" style={{ color: "#1e293b" }}>
                      {row.entryNumber ?? row.entryNo ?? row.number ?? "—"}
                    </td>
                    <td className="px-[14px] py-[8px] text-[12.5px]" style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", color: "#1e293b" }}>
                      {row.description ?? row.notes ?? "—"}
                    </td>
                    <td className="px-[14px] py-[8px] text-[12.5px] whitespace-nowrap" style={{ color: "#1e293b" }}>
                      {row.accountId ? accountLabel(row.accountId)
                        : row.accountCode ? `${row.accountCode} — ${isRTL ? row.accountNameAr ?? row.accountName : row.accountNameEn ?? row.accountNameAr ?? row.accountName}`
                        : "—"}
                    </td>
                    <td className="px-[14px] py-[8px] text-[12.5px] whitespace-nowrap" style={{ color: "#1e293b" }}>
                      {row.costCenterId ? ccLabel(row.costCenterId)
                        : row.costCenterCode ? `${row.costCenterCode} — ${isRTL ? row.costCenterNameAr ?? row.costCenterName : row.costCenterNameEn ?? row.costCenterNameAr ?? row.costCenterName}`
                        : "—"}
                    </td>
                    <td className="px-[14px] py-[8px] text-[12.5px] text-end tabular-nums font-medium whitespace-nowrap text-green-700">
                      {(row.debit ?? 0) > 0 ? formatCurrency(row.debit) : <span className="text-[color:var(--ink-300)]">—</span>}
                    </td>
                    <td className="px-[14px] py-[8px] text-[12.5px] text-end tabular-nums font-medium whitespace-nowrap text-red-600">
                      {(row.credit ?? 0) > 0 ? formatCurrency(row.credit) : <span className="text-[color:var(--ink-300)]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[color:var(--ink-50)] border-t-2 border-[color:var(--ink-300)] font-bold">
                  <td colSpan={5} className="px-4 py-3 text-start text-sm text-[color:var(--ink-700)]">{t("total")}</td>
                  <td className="px-4 py-3 text-end tabular-nums text-green-700 text-sm">{formatCurrency(totalDebit)}</td>
                  <td className="px-4 py-3 text-end tabular-nums text-red-600 text-sm">{formatCurrency(totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </PrintableReportPage>
  );
}
