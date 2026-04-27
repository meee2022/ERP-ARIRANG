// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ShoppingCart, Calendar, Receipt } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { LoadingState, KPICard } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { CompanyPrintHeader } from "@/components/ui/company-print-header";
import { useCompanySettings } from "@/hooks/useCompanySettings";

function todayISO() { return new Date().toISOString().split("T")[0]; }
function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function PurchaseReportPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { company: printCompany } = useCompanySettings();
  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate]   = useState(todayISO());
  const [groupBy, setGroupBy] = useState<"day" | "supplier" | "item">("day");

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const report = useQuery(
    api.reports.getPurchaseReport,
    fromDate && toDate
      ? { fromDate, toDate, groupBy, branchId: branchArg as any }
      : "skip"
  );

  const loading = report === undefined;
  const totalAmt = (report?.totalPurchases ?? 0) / 100;
  const invoiceCount = report?.invoiceCount ?? 0;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      {/* Print header — hidden on screen */}
      <CompanyPrintHeader
        company={printCompany}
        isRTL={isRTL}
        documentTitle={t("purchaseReportTitle")}
        periodLine={`${fromDate} — ${toDate}`}
      />

      {/* Screen header */}
      <div className="no-print">
        <PageHeader
          icon={ShoppingCart}
          title={t("purchaseReportTitle")}
          subtitle={report ? `${invoiceCount} ${t("purchaseCount")} — ${formatCurrency(totalAmt)}` : undefined}
        />
      </div>

      {/* Filter bar */}
      <div className="no-print surface-card px-5 py-3.5 flex items-center gap-4 flex-wrap border-b border-[color:var(--ink-100)]">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[color:var(--ink-400)] shrink-0" />
          <span className="text-xs font-medium text-[color:var(--ink-500)] whitespace-nowrap">{t("fromDate")}</span>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="input-field h-8 text-sm w-auto" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[color:var(--ink-500)] whitespace-nowrap">{t("toDate")}</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="input-field h-8 text-sm w-auto" />
        </div>
        <div className="flex items-center gap-2 ms-auto">
          <span className="text-xs font-medium text-[color:var(--ink-500)] whitespace-nowrap">{t("groupBy")}</span>
          <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)}
            className="input-field h-8 text-sm w-auto">
            <option value="day">{t("groupByDay")}</option>
            <option value="supplier">{t("groupBySupplier")}</option>
            <option value="item">{t("groupByItem")}</option>
          </select>
        </div>
      </div>

      {/* KPI summary */}
      {report && (
        <div className="grid grid-cols-2 gap-4">
          <KPICard
            label={t("totalPurchases")}
            value={formatCurrency(totalAmt)}
            icon={ShoppingCart}
            iconColor="var(--brand-700)"
            accent="var(--brand-600)"
          />
          <KPICard
            label={t("purchaseCount")}
            value={String(invoiceCount)}
            icon={Receipt}
            iconColor="#0ea5e9"
            accent="#0ea5e9"
          />
        </div>
      )}

      {/* Table */}
      <div className="surface-card overflow-hidden">
        {loading ? (
          <LoadingState label={t("loading")} />
        ) : !report?.data?.length ? (
          <EmptyState icon={ShoppingCart} title={t("noResults")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  {groupBy === "day" && <>
                    <th>{t("date")}</th>
                    <th className="text-end">{t("purchaseCount")}</th>
                    <th className="text-end">{t("totalPurchases")}</th>
                  </>}
                  {groupBy === "supplier" && <>
                    <th>{t("supplier")}</th>
                    <th className="text-end">{t("purchaseCount")}</th>
                    <th className="text-end">{t("totalPurchases")}</th>
                  </>}
                  {groupBy === "item" && <>
                    <th>{t("item")}</th>
                    <th className="text-end">{t("quantity")}</th>
                    <th className="text-end">{t("totalPurchases")}</th>
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
                    {groupBy === "supplier" && <>
                      <td>{row.supplierName}</td>
                      <td className="numeric text-end">{row.count}</td>
                      <td className="numeric text-end font-semibold">{formatCurrency((row.total ?? 0) / 100)}</td>
                    </>}
                    {groupBy === "item" && <>
                      <td>{row.itemName}</td>
                      <td className="numeric text-end">{(row.qty ?? 0).toFixed(2)}</td>
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
