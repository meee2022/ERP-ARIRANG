// @ts-nocheck
"use client";
import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatDateShort } from "@/lib/utils";
import { BookOpen } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PrintableReportPage } from "@/components/ui/printable-report";

function startOfYearISO() { return new Date().getFullYear() + "-01-01"; }
function todayISO() { return new Date().toISOString().split("T")[0]; }

export default function GeneralLedgerPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { company: printCompany } = useCompanySettings();
  const [fromDate, setFromDate] = useState(startOfYearISO());
  const [toDate, setToDate] = useState(todayISO());
  const [accountId, setAccountId] = useState("");

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const accounts = useQuery(api.accounts.getAll, company ? { companyId: company._id } : "skip");
  const postableAccounts = (accounts ?? []).filter((a: any) => a.isPostable && a.isActive);

  const data = useQuery(
    api.reports.getGeneralLedger,
    company && accountId ? { accountId: accountId as any, fromDate, toDate, branchId: branchArg as any } : "skip"
  );
  const loading = data === undefined && !!accountId;
  const lines = data?.lines ?? [];
  const summary = {
    openingBalance: data?.openingBalance ?? 0,
    totalDebit: data?.totalDebit ?? 0,
    totalCredit: data?.totalCredit ?? 0,
    closingBalance: data?.closingBalance ?? 0,
  };

  return (
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={t("generalLedgerTitle")}
      period={`${fromDate} — ${toDate}`}
      filters={
        <div className="surface-card p-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[color:var(--ink-500)]">{t("fromDate")}:</span>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input-field h-9 w-auto" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[color:var(--ink-500)]">{t("toDate")}:</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input-field h-9 w-auto" />
          </div>
          <div className="flex-1 min-w-[280px]">
            <SearchableSelect
              isRTL={isRTL}
              value={accountId}
              onChange={(v) => setAccountId(v)}
              placeholder={t("selectAccount")}
              searchPlaceholder={isRTL ? "ابحث بالاسم أو الكود..." : "Search by name or code..."}
              emptyMessage={isRTL ? "لا توجد نتائج" : "No results"}
              options={(postableAccounts ?? []).map((a: any) => ({
                value: a._id,
                label: a.code + " — " + (isRTL ? a.nameAr : (a.nameEn || a.nameAr)),
              }))}
            />
          </div>
        </div>
      }
    >
      {!accountId ? (
        <div className="py-20 text-center text-[color:var(--ink-400)]">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t("selectAccountToView")}</p>
        </div>
      ) : (
        <React.Fragment>
          <div className="p-4 grid grid-cols-4 gap-4 text-center text-sm border-b border-[color:var(--ink-100)]">
            <div>
              <p className="text-xs text-[color:var(--ink-500)] mb-1">{t("openingBalance")}</p>
              <p className="font-bold tabular-nums">{formatCurrency(summary.openingBalance)}</p>
            </div>
            <div>
              <p className="text-xs text-[color:var(--ink-500)] mb-1">{t("totalDebit")}</p>
              <p className="font-bold tabular-nums">{formatCurrency(summary.totalDebit)}</p>
            </div>
            <div>
              <p className="text-xs text-[color:var(--ink-500)] mb-1">{t("totalCredit")}</p>
              <p className="font-bold tabular-nums">{formatCurrency(summary.totalCredit)}</p>
            </div>
            <div>
              <p className="text-xs text-[color:var(--ink-500)] mb-1">{t("closingBalance")}</p>
              <p className="font-bold tabular-nums text-[color:var(--brand-700)]">{formatCurrency(summary.closingBalance)}</p>
            </div>
          </div>

          <div className="overflow-hidden">
            {loading ? (
              <LoadingState label={t("loading")} />
            ) : lines.length === 0 ? (
              <EmptyState icon={BookOpen} title={t("noResults")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("date")}</th>
                      <th>{t("journalNo")}</th>
                      <th>{t("description")}</th>
                      <th className="text-end">{t("debit")}</th>
                      <th className="text-end">{t("credit")}</th>
                      <th className="text-end">{t("balance")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l: any, i: number) => {
                      const bal = l.runningBalance ?? 0;
                      const isNeg = bal < 0;
                      return (
                        <tr key={i}>
                          <td className="muted">{formatDateShort(l.entryDate)}</td>
                          <td className="code">{l.entryNumber}</td>
                          <td className="max-w-[300px] truncate">{l.description}</td>
                          <td className="numeric text-end">{l.debit ? formatCurrency(l.debit) : ""}</td>
                          <td className="numeric text-end">{l.credit ? formatCurrency(l.credit) : ""}</td>
                          <td className={"numeric text-end font-medium" + (isNeg ? " text-red-600" : "")}>
                            {formatCurrency(Math.abs(bal))} {isNeg ? t("credit") : t("debit")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </React.Fragment>
      )}
    </PrintableReportPage>
  );
}
