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
import { TrendingUp, Printer } from "lucide-react";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function TopSection({ title, rows, type, isRTL, t, formatCurrency }: any) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="px-5 py-4 border-b border-[color:var(--ink-100)]">
        <h3 className="text-base font-bold text-[color:var(--ink-900)]">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("rank")}</th>
              <th>{type === "customer" ? t("customer") : type === "item" ? t("item") : t("salesRep")}</th>
              <th className="text-end">{type === "item" ? t("quantitySold") : t("invoiceCount")}</th>
              <th className="text-end">{t("totalSales")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, index: number) => (
              <tr key={row.id ?? index}>
                <td className="code">{index + 1}</td>
                <td>
                  {type === "customer"
                    ? (isRTL ? row.nameAr : (row.nameEn || row.nameAr))
                    : type === "item"
                      ? (isRTL ? row.nameAr : (row.nameEn || row.nameAr))
                      : (isRTL ? row.nameAr : (row.nameEn || row.nameAr))}
                </td>
                <td className="numeric text-end">{type === "item" ? row.quantitySold : row.invoiceCount}</td>
                <td className="numeric text-end font-semibold">{formatCurrency(row.totalSales)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TopSalesPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { canView } = usePermissions();
  const { company: printCompany } = useCompanySettings();
  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());

  const report = useQuery(api.reports.getTopSalesReport, {
    fromDate,
    toDate,
    branchId: branchArg as any,
  });

  const totals = report?.totals;

  const summaryItems = useMemo(
    () =>
      totals
        ? [
            { label: t("topCustomers"), value: String(totals.customerCount), borderColor: "var(--brand-600)", accent: "var(--ink-900)" },
            { label: t("topItems"), value: String(totals.itemCount), borderColor: "#0ea5e9", accent: "#0f172a" },
            { label: t("topSalesReps"), value: String(totals.salesRepCount), borderColor: "#f59e0b", accent: "#92400e" },
            { label: t("totalSales"), value: formatCurrency(totals.totalSales), borderColor: "#16a34a", accent: "#166534" },
          ]
        : [],
    [totals, t, formatCurrency]
  );

  if (!canView("reports")) {
    return <EmptyState icon={TrendingUp} title={t("permissionDenied")} />;
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      <CompanyPrintHeader
        company={printCompany}
        isRTL={isRTL}
        documentTitle={t("topSalesTitle")}
        periodLine={`${fromDate} — ${toDate}`}
      />

      <div className="no-print">
        <PageHeader
          icon={TrendingUp}
          title={t("topSalesTitle")}
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

      {report === undefined ? (
        <LoadingState label={t("loading")} />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <TopSection title={t("topCustomers")} rows={report.topCustomers ?? []} type="customer" isRTL={isRTL} t={t} formatCurrency={formatCurrency} />
          <TopSection title={t("topItems")} rows={report.topItems ?? []} type="item" isRTL={isRTL} t={t} formatCurrency={formatCurrency} />
          <TopSection title={t("topSalesReps")} rows={report.topSalesReps ?? []} type="salesRep" isRTL={isRTL} t={t} formatCurrency={formatCurrency} />
        </div>
      )}
    </div>
  );
}