// @ts-nocheck
"use client";
import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { PieChart as PieChartIcon, Printer, CheckCircle, AlertCircle } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

function todayISO() { return new Date().toISOString().split("T")[0]; }

// Sub-type ordering for assets
const ASSET_ORDER = ["current_asset", "cash", "receivable", "inventory", "prepaid", "fixed_asset", "other_asset"];
const LIABILITY_ORDER = ["current_liability", "payable", "tax_payable", "accrual", "long_term_liability"];
const EQUITY_ORDER = ["capital", "retained_earnings", "other_equity"];

function groupBySubType(accounts: any[], order: string[]) {
  const groups: Record<string, any[]> = {};
  for (const acc of accounts) {
    const st = acc.accountSubType || "other";
    if (!groups[st]) groups[st] = [];
    groups[st].push(acc);
  }
  const sortedKeys = [
    ...order.filter((k) => groups[k]),
    ...Object.keys(groups).filter((k) => !order.includes(k)),
  ];
  return sortedKeys.map((key) => ({ subType: key, accounts: groups[key] }));
}

function SubTypeLabel({ subType, isRTL }: { subType: string; isRTL: boolean }) {
  const labels: Record<string, { ar: string; en: string }> = {
    current_asset:        { ar: "أصول متداولة",         en: "Current Assets" },
    cash:                 { ar: "النقدية",               en: "Cash" },
    receivable:           { ar: "الذمم المدينة",         en: "Receivables" },
    inventory:            { ar: "المخزون",               en: "Inventory" },
    prepaid:              { ar: "مدفوعات مقدمة",        en: "Prepaid" },
    fixed_asset:          { ar: "الأصول الثابتة",        en: "Fixed Assets" },
    other_asset:          { ar: "أصول أخرى",             en: "Other Assets" },
    current_liability:    { ar: "التزامات متداولة",       en: "Current Liabilities" },
    payable:              { ar: "الذمم الدائنة",          en: "Payables" },
    tax_payable:          { ar: "ضرائب مستحقة",          en: "Tax Payable" },
    accrual:              { ar: "مستحقات",               en: "Accruals" },
    long_term_liability:  { ar: "التزامات طويلة الأجل",  en: "Long-term Liabilities" },
    capital:              { ar: "رأس المال",              en: "Capital" },
    retained_earnings:    { ar: "أرباح محتجزة",          en: "Retained Earnings" },
    other_equity:         { ar: "حقوق ملكية أخرى",      en: "Other Equity" },
    other:                { ar: "أخرى",                   en: "Other" },
  };
  const label = labels[subType];
  return <>{label ? (isRTL ? label.ar : label.en) : subType}</>;
}

export default function BalanceSheetPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const [asOfDate, setAsOfDate] = useState(todayISO());
  const [branchId, setBranchId] = useState<string>("");
  const [hideZero, setHideZero] = useState(true);

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const branches = useQuery(api.branches.getAll, company ? { companyId: company._id } : "skip");

  const data = useQuery(
    api.reports.getBalanceSheet,
    company
      ? {
          companyId: company._id,
          asOfDate,
          branchId: branchArg as any,
        }
      : "skip"
  );

  const loading = data === undefined;

  const filterAccounts = (accounts: any[]) =>
    hideZero ? accounts.filter((a: any) => a.balance !== 0) : accounts;

  const assetRows = filterAccounts(data?.assets?.accounts ?? []);
  const liabilityRows = filterAccounts(data?.liabilities?.accounts ?? []);
  const equityRows = filterAccounts(data?.equity?.accounts ?? []);
  const totalAssets = data?.totalAssets ?? 0;
  const totalLiabilities = data?.liabilities?.total ?? 0;
  const totalEquity = data?.equity?.total ?? 0;
  const retainedEarnings = data?.equity?.retainedEarnings ?? 0;
  const totalLiabAndEquity = data?.totalLiabilitiesAndEquity ?? 0;
  const isBalanced = data?.isBalanced ?? false;

  const accountName = (row: any) => isRTL ? row.nameAr : (row.nameEn || row.nameAr);

  const assetGroups = groupBySubType(assetRows, ASSET_ORDER);
  const liabilityGroups = groupBySubType(liabilityRows, LIABILITY_ORDER);
  const equityGroups = groupBySubType(equityRows, EQUITY_ORDER);

  const renderSection = (
    titleKey: string,
    groups: { subType: string; accounts: any[] }[],
    total: number,
    totalKey: string,
    extra?: React.ReactNode
  ) => (
    <>
      <thead>
        <tr style={{ background: "var(--brand-800)" }}>
          <th colSpan={3} className="px-4 py-3 text-start text-white font-semibold text-sm uppercase tracking-wider">
            {t(titleKey as any)}
          </th>
        </tr>
        <tr className="bg-[color:var(--brand-50)] text-[color:var(--ink-600)] text-xs uppercase tracking-wider">
          <th className="px-4 py-2 text-start font-semibold w-28">{t("accountCode")}</th>
          <th className="px-4 py-2 text-start font-semibold">{t("account")}</th>
          <th className="px-4 py-2 text-end font-semibold">{t("balance")}</th>
        </tr>
      </thead>
      <tbody>
        {groups.length === 0 ? (
          <tr><td colSpan={3} className="px-4 py-4 text-center text-[color:var(--ink-400)] text-sm">{t("noResults")}</td></tr>
        ) : groups.map(({ subType, accounts }) => (
          <React.Fragment key={subType}>
            <tr style={{ background: "rgba(var(--brand-100-rgb, 219,234,254), 0.4)" }}>
              <td colSpan={3} className="px-4 py-1.5 text-xs font-semibold text-[color:var(--brand-700)] uppercase tracking-wider">
                <SubTypeLabel subType={subType} isRTL={isRTL} />
              </td>
            </tr>
            {accounts.map((row: any) => (
              <tr key={row.accountId} className="border-t border-[color:var(--ink-100)] hover:bg-[color:var(--brand-50)]/30">
                <td className="px-4 py-2.5 font-mono text-xs text-[color:var(--brand-700)]">{row.code}</td>
                <td className="px-4 py-2.5 text-[color:var(--ink-700)]">{accountName(row)}</td>
                <td className="px-4 py-2.5 text-end tabular-nums text-[color:var(--ink-800)]">{formatCurrency(row.balance)}</td>
              </tr>
            ))}
          </React.Fragment>
        ))}
        {extra}
        <tr style={{ background: "var(--brand-50)", borderTop: "2px solid var(--brand-200)" }}>
          <td colSpan={2} className="px-4 py-3 font-bold text-[color:var(--ink-800)]">{t(totalKey as any)}</td>
          <td className="px-4 py-3 text-end tabular-nums font-bold text-[color:var(--brand-800)]">{formatCurrency(total)}</td>
        </tr>
      </tbody>
      <tbody><tr><td colSpan={3} className="py-2" /></tr></tbody>
    </>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}>
            <PieChartIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">{t("balanceSheetTitle")}</h1>
            <p className="text-xs text-[color:var(--ink-500)] mt-0.5">{t("reportPostedOnly")}</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors no-print print:hidden"
          style={{ background: "var(--brand-700)", color: "#fff" }}
        >
          <Printer className="h-4 w-4" />
          {t("printReport")}
        </button>
      </div>

      {/* Filters */}
      <div className="surface-card p-3 flex items-center gap-4 flex-wrap print:hidden">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[color:var(--ink-500)]">{t("asOfDateLabel")}:</span>
          <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="input-field h-9 w-auto" />
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

      {/* Balance Check */}
      {!loading && data && (
        <div
          className="surface-card p-3 flex items-center gap-3"
          style={{
            borderLeft: `4px solid ${isBalanced ? "rgb(16,185,129)" : "rgb(239,68,68)"}`,
          }}
        >
          {isBalanced ? (
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          )}
          <div className="flex-1">
            <span className={`font-semibold text-sm ${isBalanced ? "text-emerald-700" : "text-red-700"}`}>
              {isBalanced ? t("balanced") : t("unbalanced")}
            </span>
            {!isBalanced && (
              <span className="text-xs text-[color:var(--ink-500)] ms-2">
                {t("totalAssets")}: {formatCurrency(totalAssets)} | {t("totalLiabilitiesAndEquity")}: {formatCurrency(totalLiabAndEquity)}
              </span>
            )}
          </div>
          <div className="text-end">
            <p className="text-xs text-[color:var(--ink-500)]">{t("totalAssets")}</p>
            <p className="font-bold tabular-nums text-[color:var(--ink-900)]">{formatCurrency(totalAssets)}</p>
          </div>
        </div>
      )}

      {/* Print Header */}
      <div className="hidden print:block text-center mb-4">
        <h2 className="text-xl font-bold">{company ? (isRTL ? company.nameAr : (company.nameEn || company.nameAr)) : ""}</h2>
        <h3 className="text-lg font-semibold mt-1">{t("balanceSheetTitle")}</h3>
        <p className="text-sm text-gray-600 mt-0.5">{t("asOfDateLabel")}: {asOfDate}</p>
      </div>

      {loading ? (
        <div className="surface-card p-8 text-center">
          <div className="animate-spin h-8 w-8 border-2 border-[color:var(--brand-600)] border-t-transparent rounded-full mx-auto mb-3" />
        </div>
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              {/* ── ASSETS ── */}
              {renderSection("assets", assetGroups, totalAssets, "totalAssets")}

              {/* ── LIABILITIES ── */}
              {renderSection("liabilities", liabilityGroups, totalLiabilities, "totalLiabilities")}

              {/* ── EQUITY ── */}
              {renderSection(
                "equitySection",
                equityGroups,
                totalEquity,
                "totalEquity",
                // Current period income line injected into equity body
                <tr className="border-t border-[color:var(--ink-100)]" style={{ background: retainedEarnings >= 0 ? "rgba(16,185,129,0.05)" : "rgba(239,68,68,0.05)" }}>
                  <td className="px-4 py-2.5 font-mono text-xs text-[color:var(--brand-700)]">—</td>
                  <td className="px-4 py-2.5 text-[color:var(--ink-700)] italic">{t("currentPeriodIncome")}</td>
                  <td className={`px-4 py-2.5 text-end tabular-nums font-medium ${retainedEarnings >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {formatCurrency(retainedEarnings)}
                  </td>
                </tr>
              )}

              {/* ── TOTAL LIAB + EQUITY ── */}
              <tbody>
                <tr style={{ background: "var(--brand-800)" }}>
                  <td colSpan={2} className="px-4 py-3 font-extrabold text-white text-sm">{t("totalLiabilitiesAndEquity")}</td>
                  <td className="px-4 py-3 text-end tabular-nums font-extrabold text-white">{formatCurrency(totalLiabAndEquity)}</td>
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
