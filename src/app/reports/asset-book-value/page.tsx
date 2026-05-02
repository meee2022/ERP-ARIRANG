// @ts-nocheck
"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { LoadingState, ColorKPIGrid } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PrintableReportPage } from "@/components/ui/printable-report";
import { BarChart2, Hash, Wallet, TrendingDown, Coins } from "lucide-react";

export default function AssetBookValueReportPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { company: printCompany } = useCompanySettings();

  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const data = useQuery(api.fixedAssets.getAssetBookValueSummary, companyId ? { companyId } : "skip");

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
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={t("assetBookValueReport")}
      period={new Date().toISOString().split("T")[0]}
      summary={
        !loading && rows.length > 0 ? (
          <ColorKPIGrid cols={4} items={[
            { label: t("netBookValue"), value: formatCurrency(totals.net),
              color: "#6b1523", bg: "#fdf2f4", border: "#6b152330", icon: Wallet, big: true,
              hint: `${totals.count} ${t("assetsCount").toLowerCase()}` },
            { label: t("totalCostLabel"), value: formatCurrency(totals.cost),
              color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: Coins },
            { label: t("accumulatedDepreciation"), value: formatCurrency(totals.depr),
              color: "#d97706", bg: "#fff7ed", border: "#fed7aa", icon: TrendingDown },
            { label: t("assetsCount"), value: String(totals.count),
              color: "#7c3aed", bg: "#faf5ff", border: "#ddd6fe", icon: Hash },
          ]} />
        ) : undefined
      }
    >
      {loading ? (
        <LoadingState label={t("loading")} />
      ) : rows.length === 0 ? (
        <EmptyState icon={BarChart2} message={t("noFixedAssetsYet")} />
      ) : (
        <div className="overflow-x-auto">
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
        </div>
      )}
    </PrintableReportPage>
  );
}
