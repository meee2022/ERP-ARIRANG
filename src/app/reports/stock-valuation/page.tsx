// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Package } from "lucide-react";
import { formatDateShort } from "@/lib/utils";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PrintableReportPage } from "@/components/ui/printable-report";

export default function StockValuationPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { company: printCompany } = useCompanySettings();
  const [warehouseFilter, setWarehouseFilter] = useState("");

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];

  const warehouses = useQuery(
    api.items.getAllWarehouses,
    company ? { companyId: company._id } : "skip"
  );

  const report = useQuery(
    api.reports.getStockValuationReport,
    company ? { companyId: company._id, warehouseId: (warehouseFilter || undefined) as any } : "skip"
  );

  const loading = report === undefined;

  return (
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={t("stockValuationTitle")}
      period={new Date().toISOString().split("T")[0]}
      filters={
        <div className="surface-card p-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[color:var(--ink-500)]">{t("warehouse")}:</span>
            <select value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)} className="input-field h-9 w-auto">
              <option value="">{t("all")}</option>
              {(warehouses ?? []).map((w: any) => (
                <option key={w._id} value={w._id}>{isRTL ? w.nameAr : (w.nameEn || w.nameAr)}</option>
              ))}
            </select>
          </div>
        </div>
      }
      summary={
        report ? (
          <div className="flex items-center gap-8 flex-wrap text-sm">
            <div>
              <div className="text-xs text-[color:var(--ink-500)]">{t("totalInventoryValue")}</div>
              <div className="text-xl font-bold text-[color:var(--ink-900)] tabular-nums">
                {formatCurrency((report.totalValue ?? 0))}
              </div>
            </div>
            <div>
              <div className="text-xs text-[color:var(--ink-500)]">{t("items")}</div>
              <div className="text-xl font-bold text-[color:var(--ink-900)] tabular-nums">{report.items.length}</div>
            </div>
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <LoadingState label={t("loading")} />
      ) : !report || report.items.length === 0 ? (
        <EmptyState icon={Package} title={t("noResults")} />
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("itemCode")}</th>
                <th>{t("item")}</th>
                <th>{t("warehouse")}</th>
                <th className="text-end">{t("quantity")}</th>
                <th className="text-end">{t("avgCost")}</th>
                <th className="text-end">{t("totalValue")}</th>
                <th>{t("lastUpdated")}</th>
              </tr>
            </thead>
            <tbody>
              {report.items.map((row: any, i: number) => (
                <tr key={i}>
                  <td className="code">{row.itemCode}</td>
                  <td>{isRTL ? row.itemNameAr : (row.itemNameEn || row.itemNameAr)}</td>
                  <td className="muted">{row.warehouseNameAr}</td>
                  <td className="numeric text-end font-semibold">{row.quantity.toFixed(3)}</td>
                  <td className="numeric text-end">{formatCurrency((row.avgCost ?? 0))}</td>
                  <td className="numeric text-end font-semibold">{formatCurrency((row.totalValue ?? 0))}</td>
                  <td className="muted text-xs">{formatDateShort(row.lastUpdated)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="row-total">
                <td colSpan={5}>{t("total")}</td>
                <td className="numeric text-end font-bold">{formatCurrency((report.totalValue ?? 0))}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </PrintableReportPage>
  );
}
