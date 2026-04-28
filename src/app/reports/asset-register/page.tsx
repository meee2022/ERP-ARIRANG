// @ts-nocheck
"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { CompanyPrintHeader } from "@/components/ui/company-print-header";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { HardDrive, Printer } from "lucide-react";

export default function AssetRegisterReportPage() {
  const { t, isRTL, formatCurrency, formatDate } = useI18n();
  const { company: printCompany } = useCompanySettings();

  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const data = useQuery(
    api.fixedAssets.getAssetRegisterReport,
    companyId ? { companyId } : "skip"
  );

  const loading = data === undefined;
  const rows = data ?? [];

  const totals = rows.reduce(
    (acc, r) => ({
      cost: acc.cost + r.purchaseCost,
      depr: acc.depr + r.accumulatedDepreciation,
      book: acc.book + r.bookValue,
    }),
    { cost: 0, depr: 0, book: 0 }
  );

  return (
    <div className="space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      <CompanyPrintHeader company={printCompany} isRTL={isRTL} documentTitle={t("assetRegisterReport")} />

      <div className="no-print">
        <PageHeader
          icon={HardDrive}
          title={t("assetRegisterReport")}
          actions={
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium btn-ghost">
              <Printer className="h-4 w-4" /> {t("print")}
            </button>
          }
        />
      </div>

      <div className="surface-card overflow-x-auto">
        {loading ? (
          <LoadingState label={t("loading")} />
        ) : rows.length === 0 ? (
          <EmptyState icon={HardDrive} message={t("noFixedAssetsYet")} />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("assetCode")}</th>
                <th>{t("name")}</th>
                <th>{t("category")}</th>
                <th className="text-end">{t("purchaseCost")}</th>
                <th className="text-end">{t("accumulatedDepreciation")}</th>
                <th className="text-end">{t("bookValue")}</th>
                <th>{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="font-mono text-sm">{r.assetCode}</td>
                  <td>{isRTL ? r.nameAr : (r.nameEn || r.nameAr)}</td>
                  <td className="muted">{r.category || "—"}</td>
                  <td className="text-end tabular-nums">{formatCurrency(r.purchaseCost)}</td>
                  <td className="text-end tabular-nums text-amber-700">{formatCurrency(r.accumulatedDepreciation)}</td>
                  <td className="text-end tabular-nums font-semibold">{formatCurrency(r.bookValue)}</td>
                  <td className="muted">{r.status === "active" ? t("active") : r.status === "fully_depreciated" ? t("fullyDepreciated") : t("inactive")}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[color:var(--ink-50)] border-t-2 border-[color:var(--ink-300)] font-bold">
                <td colSpan={3}>{t("total")}</td>
                <td className="text-end tabular-nums">{formatCurrency(totals.cost)}</td>
                <td className="text-end tabular-nums text-amber-700">{formatCurrency(totals.depr)}</td>
                <td className="text-end tabular-nums">{formatCurrency(totals.book)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
