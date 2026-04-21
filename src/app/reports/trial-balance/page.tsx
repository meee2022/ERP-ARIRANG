// @ts-nocheck
"use client";
import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Scale } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

function startOfYearISO() { return `${new Date().getFullYear()}-01-01`; }
function todayISO() { return new Date().toISOString().split("T")[0]; }

export default function TrialBalancePage() {
  const { t, isRTL, formatCurrency } = useI18n();
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

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}>
          <Scale className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">{t("trialBalanceTitle")}</h1>
          <p className="text-xs text-[color:var(--ink-500)] mt-0.5">{t("reportPostedOnly")}</p>
        </div>
      </div>

      <div className="surface-card p-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5"><span className="text-xs text-[color:var(--ink-500)]">{t("fromDate")}:</span><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input-field h-9 w-auto" /></div>
        <div className="flex items-center gap-1.5"><span className="text-xs text-[color:var(--ink-500)]">{t("toDate")}:</span><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input-field h-9 w-auto" /></div>
        <label className="inline-flex items-center gap-2 text-sm text-[color:var(--ink-700)]">
          <input type="checkbox" checked={includeZero} onChange={e => setIncludeZero(e.target.checked)} />
          {t("includeZeroBalances")}
        </label>
      </div>

      <div className="surface-card p-3 grid grid-cols-3 gap-4 text-sm">
        <div className="text-center"><p className="text-xs text-[color:var(--ink-500)] mb-1">{t("totalDebit")}</p><p className="font-bold tabular-nums text-lg">{formatCurrency(totals.totalDebit)}</p></div>
        <div className="text-center"><p className="text-xs text-[color:var(--ink-500)] mb-1">{t("totalCredit")}</p><p className="font-bold tabular-nums text-lg">{formatCurrency(totals.totalCredit)}</p></div>
        <div className="text-center"><p className="text-xs text-[color:var(--ink-500)] mb-1">{t("difference")}</p><p className={`font-bold tabular-nums text-lg ${Math.abs(totals.totalDebit - totals.totalCredit) < 1 ? "text-emerald-700" : "text-red-600"}`}>{formatCurrency(Math.abs(totals.totalDebit - totals.totalCredit))}</p></div>
      </div>

      <div className="surface-card overflow-hidden">
        {loading ? <div className="p-8 text-center"><div className="animate-spin h-8 w-8 border-2 border-[color:var(--brand-600)] border-t-transparent rounded-full mx-auto mb-3" /></div>
        : rows.length === 0 ? <div className="py-16 text-center text-[color:var(--ink-400)]"><p className="text-sm">{t("noResults")}</p></div>
        : (
          <div className="overflow-x-auto">
            <table className="w-full zebra-table text-sm">
              <thead className="bg-[color:var(--brand-800)] text-white text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">{t("accountCode")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("account")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("openingDebit")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("openingCredit")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("debit")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("credit")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("closingDebit")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("closingCredit")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any) => (
                  <tr key={row.accountId} className="border-t border-[color:var(--ink-100)] hover:bg-[color:var(--brand-50)]/40">
                    <td className="px-4 py-2.5 font-mono text-xs text-[color:var(--brand-700)]">{row.code}</td>
                    <td className="px-4 py-2.5 text-[color:var(--ink-700)]">{isRTL ? row.nameAr : (row.nameEn || row.nameAr)}</td>
                    <td className="px-4 py-2.5 text-end tabular-nums text-[color:var(--ink-600)]">{row.openingDebit ? formatCurrency(row.openingDebit) : ""}</td>
                    <td className="px-4 py-2.5 text-end tabular-nums text-[color:var(--ink-600)]">{row.openingCredit ? formatCurrency(row.openingCredit) : ""}</td>
                    <td className="px-4 py-2.5 text-end tabular-nums">{row.periodDebit ? formatCurrency(row.periodDebit) : ""}</td>
                    <td className="px-4 py-2.5 text-end tabular-nums">{row.periodCredit ? formatCurrency(row.periodCredit) : ""}</td>
                    <td className="px-4 py-2.5 text-end tabular-nums font-medium">{row.closingDebit ? formatCurrency(row.closingDebit) : ""}</td>
                    <td className="px-4 py-2.5 text-end tabular-nums font-medium">{row.closingCredit ? formatCurrency(row.closingCredit) : ""}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[color:var(--ink-50)] font-semibold text-sm">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-[color:var(--ink-700)]">{t("total")}</td>
                  <td className="px-4 py-3 text-end tabular-nums">{formatCurrency(totals.openingDebit)}</td>
                  <td className="px-4 py-3 text-end tabular-nums">{formatCurrency(totals.openingCredit)}</td>
                  <td className="px-4 py-3 text-end tabular-nums">{formatCurrency(totals.totalDebit)}</td>
                  <td className="px-4 py-3 text-end tabular-nums">{formatCurrency(totals.totalCredit)}</td>
                  <td className="px-4 py-3 text-end tabular-nums">{formatCurrency(totals.closingDebit)}</td>
                  <td className="px-4 py-3 text-end tabular-nums">{formatCurrency(totals.closingCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
