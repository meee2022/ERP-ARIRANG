// @ts-nocheck
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/useAppStore";
import { User, Printer } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { SummaryStrip } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";

function todayISO() { return new Date().toISOString().split("T")[0]; }
function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function SalesBySalesRepPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const report = useQuery(api.reports.getSalesBySalesRep, {
    fromDate,
    toDate,
    branchId: branchArg as any,
  });

  const rows = report?.rows ?? [];
  const totals = report?.totals ?? { invoiceCount: 0, totalSales: 0, cashSales: 0, creditSales: 0 };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      <PageHeader
        icon={User}
        title={t("salesBySalesRepTitle")}
        actions={
          <button onClick={() => window.print()} className="btn-ghost h-9 px-4 rounded-xl inline-flex items-center gap-2 text-sm font-semibold">
            <Printer className="h-4 w-4" />
            {t("print")}
          </button>
        }
      />

      <FilterPanel>
        <FilterField label={t("fromDate")}>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input-field h-8 w-auto text-sm" />
        </FilterField>
        <FilterField label={t("toDate")}>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input-field h-8 w-auto text-sm" />
        </FilterField>
      </FilterPanel>

      <SummaryStrip items={[
        { label: t("invoiceCount"), value: String(totals.invoiceCount), borderColor: "var(--brand-600)", accent: "var(--ink-900)" },
        { label: t("totalSales"), value: formatCurrency(totals.totalSales), borderColor: "var(--gold-400)", accent: "var(--ink-900)" },
        { label: t("cashSales"), value: formatCurrency(totals.cashSales), borderColor: "#16a34a", accent: "#16a34a" },
        { label: t("creditSales"), value: formatCurrency(totals.creditSales), borderColor: "#2563eb", accent: "#2563eb" },
      ]} />

      <div className="surface-card overflow-hidden">
        {report === undefined ? (
          <div className="loading-spinner"><div className="spinner" /><span className="spinner-label">{t("loading")}</span></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={User} title={t("noResults")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("salesRepCode")}</th>
                  <th>{t("salesRep")}</th>
                  <th className="text-end">{t("invoiceCount")}</th>
                  <th className="text-end">{t("cashSales")}</th>
                  <th className="text-end">{t("creditSales")}</th>
                  <th className="text-end">{t("totalSales")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, index: number) => (
                  <tr key={row.salesRepId ?? index}>
                    <td className="code">{row.salesRepCode || "—"}</td>
                    <td>{isRTL ? row.salesRepNameAr : (row.salesRepNameEn || row.salesRepNameAr)}</td>
                    <td className="numeric text-end">{row.invoiceCount}</td>
                    <td className="numeric text-end">{formatCurrency(row.cashSales)}</td>
                    <td className="numeric text-end">{formatCurrency(row.creditSales)}</td>
                    <td className="numeric text-end font-semibold">{formatCurrency(row.totalSales)}</td>
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