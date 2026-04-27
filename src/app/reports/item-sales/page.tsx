"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/useAppStore";
import { usePermissions } from "@/hooks/usePermissions";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState, SummaryStrip } from "@/components/ui/data-display";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { PageHeader } from "@/components/ui/page-header";
import { CompanyPrintHeader } from "@/components/ui/company-print-header";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Package, Printer } from "lucide-react";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function ItemSalesPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { canView } = usePermissions();
  const { company: printCompany } = useCompanySettings();
  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());

  const report = useQuery(api.reports.getItemSalesReport, {
    fromDate,
    toDate,
    branchId: branchArg as any,
  });

  const rows = report?.rows ?? [];
  const totals = report?.totals;

  const summaryItems = useMemo(
    () =>
      totals
        ? [
            { label: t("items"), value: String(totals.itemCount), borderColor: "var(--brand-600)", accent: "var(--ink-900)" },
            { label: t("quantitySold"), value: String(totals.quantitySold), borderColor: "#0ea5e9", accent: "#0f172a" },
            { label: t("totalSales"), value: formatCurrency(totals.grossSales / 100), borderColor: "#f59e0b", accent: "#92400e" },
            { label: t("net"), value: formatCurrency(totals.netSales / 100), borderColor: "#16a34a", accent: "#166534" },
          ]
        : [],
    [totals, t, formatCurrency]
  );

  if (!canView("reports")) {
    return <EmptyState icon={Package} title={t("permissionDenied")} />;
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      <CompanyPrintHeader
        company={printCompany}
        isRTL={isRTL}
        documentTitle={t("itemSalesTitle")}
        periodLine={`${fromDate} — ${toDate}`}
      />

      <div className="no-print">
        <PageHeader
          icon={Package}
          title={t("itemSalesTitle")}
          subtitle={t("salesReportTitle")}
          actions={
            <button onClick={() => window.print()} className="btn-ghost h-9 px-4 rounded-xl inline-flex items-center gap-2 text-sm font-semibold">
              <Printer className="h-4 w-4" />
              {t("print")}
            </button>
          }
        />
      </div>

      <FilterPanel>
        <FilterField label={t("fromDate")}>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input-field h-8 w-auto text-sm" />
        </FilterField>
        <FilterField label={t("toDate")}>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input-field h-8 w-auto text-sm" />
        </FilterField>
      </FilterPanel>

      {totals ? <SummaryStrip items={summaryItems} /> : null}

      <div className="surface-card overflow-hidden">
        {report === undefined ? (
          <LoadingState label={t("loading")} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Package} title={t("noResults")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("itemCode")}</th>
                  <th>{t("item")}</th>
                  <th className="text-end">{t("quantitySold")}</th>
                  <th className="text-end">{t("totalSales")}</th>
                  <th className="text-end">{t("net")}</th>
                  <th className="text-end">{t("averageSellingPrice")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any) => (
                  <tr key={row.itemId}>
                    <td className="code">{row.itemCode}</td>
                    <td>{isRTL ? row.itemNameAr : (row.itemNameEn || row.itemNameAr)}</td>
                    <td className="numeric text-end">{row.quantitySold}</td>
                    <td className="numeric text-end">{formatCurrency(row.grossSales / 100)}</td>
                    <td className="numeric text-end font-semibold">{formatCurrency(row.netSales / 100)}</td>
                    <td className="numeric text-end">{formatCurrency(row.averageSellingPrice / 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}