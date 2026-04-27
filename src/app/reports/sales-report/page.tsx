// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { TrendingUp, Calendar, FileText } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { LoadingState, KPICard } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { CompanyPrintHeader } from "@/components/ui/company-print-header";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PageHeader } from "@/components/ui/page-header";

function todayISO() { return new Date().toISOString().split("T")[0]; }
function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function SalesReportPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { company: printCompany } = useCompanySettings();
  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const [groupBy, setGroupBy] = useState<"day" | "item" | "customer">("day");

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];

  const report = useQuery(
    api.reports.getSalesReport,
    fromDate && toDate
      ? {
          fromDate,
          toDate,
          groupBy,
          branchId: branchArg as any,
        }
      : "skip"
  );

  const loading = report === undefined;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      <CompanyPrintHeader
        company={printCompany}
        isRTL={isRTL}
        documentTitle={t("salesReportTitle")}
        periodLine={`${fromDate} — ${toDate}`}
      />

      <div className="no-print">
        <PageHeader
          icon={TrendingUp}
          title={t("salesReportTitle")}
          subtitle={report ? `${report.invoiceCount} ${t("invoiceCount")} — ${formatCurrency((report.totalSales ?? 0) / 100)}` : undefined}
        />
      </div>

      {/* Filter bar */}
      <div className="no-print surface-card px-5 py-3.5 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[color:var(--ink-400)] shrink-0" />
          <span className="text-xs font-medium text-[color:var(--ink-500)] whitespace-nowrap">{t("fromDate")}</span>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input-field h-8 text-sm w-auto" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[color:var(--ink-500)] whitespace-nowrap">{t("toDate")}</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input-field h-8 text-sm w-auto" />
        </div>
        <div className="flex items-center gap-2 ms-auto">
          <span className="text-xs font-medium text-[color:var(--ink-500)] whitespace-nowrap">{t("groupBy")}</span>
          <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)} className="input-field h-8 text-sm w-auto">
            <option value="day">{t("groupByDay")}</option>
            <option value="item">{t("groupByItem")}</option>
            <option value="customer">{t("groupByCustomer")}</option>
          </select>
        </div>
      </div>

      {/* KPI summary */}
      {report && (
        <div className="grid grid-cols-2 gap-4">
          <KPICard
            label={t("totalSales")}
            value={formatCurrency((report.totalSales ?? 0) / 100)}
            icon={TrendingUp}
            iconColor="#16a34a"
            accent="#16a34a"
          />
          <KPICard
            label={t("invoiceCount")}
            value={String(report.invoiceCount)}
            icon={FileText}
            iconColor="#0ea5e9"
            accent="#0ea5e9"
          />
        </div>
      )}

      {/* Table */}
      <div className="surface-card overflow-hidden">
        {loading ? (
          <LoadingState label={t("loading")} />
        ) : !report || !report.data || report.data.length === 0 ? (
          <EmptyState icon={TrendingUp} title={t("noResults")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  {groupBy === "day" && <>
                    <th>{t("date")}</th>
                    <th className="text-end">{t("invoiceCount")}</th>
                    <th className="text-end">{t("totalSales")}</th>
                  </>}
                  {groupBy === "item" && <>
                    <th>{t("item")}</th>
                    <th className="text-end">{t("quantity")}</th>
                    <th className="text-end">{t("totalSales")}</th>
                  </>}
                  {groupBy === "customer" && <>
                    <th>{t("customers")}</th>
                    <th className="text-end">{t("invoiceCount")}</th>
                    <th className="text-end">{t("totalSales")}</th>
                  </>}
                </tr>
              </thead>
              <tbody>
                {report.data.map((row: any, i: number) => (
                  <tr key={i}>
                    {groupBy === "day" && <>
                      <td className="muted tabular-nums">{row.date}</td>
                      <td className="numeric text-end">{row.count}</td>
                      <td className="numeric text-end font-semibold">{formatCurrency((row.total ?? 0) / 100)}</td>
                    </>}
                    {groupBy === "item" && <>
                      <td>{row.itemName}</td>
                      <td className="numeric text-end">{row.qty?.toFixed(2)}</td>
                      <td className="numeric text-end font-semibold">{formatCurrency((row.total ?? 0) / 100)}</td>
                    </>}
                    {groupBy === "customer" && <>
                      <td>{row.customerName}</td>
                      <td className="numeric text-end">{row.count}</td>
                      <td className="numeric text-end font-semibold">{formatCurrency((row.total ?? 0) / 100)}</td>
                    </>}
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
