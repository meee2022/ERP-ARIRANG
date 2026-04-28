// @ts-nocheck
"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState, SummaryStrip } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { CompanyPrintHeader } from "@/components/ui/company-print-header";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { BarChart2, Printer } from "lucide-react";

export default function AssetBookValueReportPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { company: printCompany } = useCompanySettings();

  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const data = useQuery(
    api.fixedAssets.getAssetBookValueSummary,
    companyId ? { companyId } : "skip"
  );

  const loading = data === undefined;
  const rows = data ?? [];

  const totals = rows.reduce(
    (acc, r) => ({
      cost: acc.cost + r.totalCost,
      depr: acc.depr + r.accDepr,
      net: acc.net + r.netBookValue,
      count: acc.count + r.count,
    }),
    { cost: 0, depr: 0, net: 0, count: 0 }
  );

  return (
    <div className="space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      <CompanyPrintHeader company={printCompany} isRTL={isRTL} documentTitle={t("assetBookValueReport")} />

      <div className="no-print">
        <PageHeader
          icon={BarChart2}
          title={t("assetBookValueReport")}
          actions={
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium btn-ghost">
              <Printer className="h-4 w-4" /> {t("print")}
            </button>
          }
        />
      </div>

      {!loading && rows.length > 0 && (
        <SummaryStrip items={[
          { label: t("assetsCount"), value: String(totals.count), borderColor: "var(--brand-600)" },
          { label: t("totalCostLabel"), value: formatCurrency(totals.cost), borderColor: "var(--brand-600)" },
          { label: t("accumulatedDepreciation"), value: formatCurrency(totals.depr), accent: "var(--ink-500)", borderColor: "#d97706" },
          { label: t("netBookValue"), value: formatCurrency(totals.net), borderColor: "#16a34a" },
        ]} />
      )}

      <div className="surface-card overflow-x-auto">
        {loading ? (
          <LoadingState label={t("loading")} />
        ) : rows.length === 0 ? (
          <EmptyState icon={BarChart2} message={t("noFixedAssetsYet")} />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("category")}</th>
                <th className="text-end">{t("assetsCount")}</th>
                <th className="text-end">{t("totalCostLabel")}</th>
                <th className="text-end">{t("accumulatedDepreciation")}</th>
                <th className="text-end">{t("netBookValue")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="font-medium">{r.category}</td>
                  <td className="text-end tabular-nums">{r.count}</td>
                  <td className="text-end tabular-nums">{formatCurrency(r.totalCost)}</td>
                  <td className="text-end tabular-nums text-amber-700">{formatCurrency(r.accDepr)}</td>
                  <td className="text-end tabular-nums font-semibold">{formatCurrency(r.netBookValue)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[color:var(--ink-50)] border-t-2 border-[color:var(--ink-300)] font-bold">
                <td>{t("total")}</td>
                <td className="text-end tabular-nums">{totals.count}</td>
                <td className="text-end tabular-nums">{formatCurrency(totals.cost)}</td>
                <td className="text-end tabular-nums text-amber-700">{formatCurrency(totals.depr)}</td>
                <td className="text-end tabular-nums">{formatCurrency(totals.net)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
