"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/useAppStore";
import { usePermissions } from "@/hooks/usePermissions";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState, ColorKPIGrid } from "@/components/ui/data-display";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PrintableReportPage } from "@/components/ui/printable-report";
import { Package } from "lucide-react";

function todayISO() { return new Date().toISOString().split("T")[0]; }
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
    fromDate, toDate,
    branchId: branchArg as any,
  });

  const rows = report?.rows ?? [];
  const totals = report?.totals;

  const summaryItems = useMemo(
    () => totals ? [
      { label: t("net"), value: formatCurrency(totals.netSales),
        color: "#6b1523", bg: "#fdf2f4", border: "#6b152330", big: true,
        hint: `${totals.itemCount} items` },
      { label: t("totalSales"), value: formatCurrency(totals.grossSales),
        color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
      { label: t("items"), value: String(totals.itemCount),
        color: "#7c3aed", bg: "#faf5ff", border: "#ddd6fe" },
      { label: t("quantitySold"), value: String(totals.quantitySold),
        color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd" },
    ] : [],
    [totals, t, formatCurrency]
  );

  if (!canView("reports")) {
    return <EmptyState icon={Package} title={t("permissionDenied")} />;
  }

  return (
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={t("itemSalesTitle")}
      period={`${fromDate} — ${toDate}`}
      filters={
        <FilterPanel>
          <FilterField label={t("fromDate")}>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input-field h-8 w-auto text-sm" />
          </FilterField>
          <FilterField label={t("toDate")}>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input-field h-8 w-auto text-sm" />
          </FilterField>
        </FilterPanel>
      }
      summary={totals ? <ColorKPIGrid items={summaryItems} cols={4} /> : undefined}
    >
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
                  <td className="numeric text-end">{formatCurrency(row.grossSales)}</td>
                  <td className="numeric text-end font-semibold">{formatCurrency(row.netSales)}</td>
                  <td className="numeric text-end">{formatCurrency(row.averageSellingPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PrintableReportPage>
  );
}
