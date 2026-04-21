// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Package } from "lucide-react";
import { formatDateShort } from "@/lib/utils";

export default function StockValuationPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const [warehouseFilter, setWarehouseFilter] = useState("");

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];

  const warehouses = useQuery(
    api.items.getAllWarehouses,
    company ? { companyId: company._id } : "skip"
  );

  const report = useQuery(
    api.reports.getStockValuationReport,
    company
      ? {
          companyId: company._id,
          warehouseId: (warehouseFilter || undefined) as any,
        }
      : "skip"
  );

  const loading = report === undefined;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}>
          <Package className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">{t("stockValuationTitle")}</h1>
          {report && (
            <p className="text-xs text-[color:var(--ink-500)] mt-0.5">
              {report.items.length} {t("itemsCount")} — {formatCurrency((report.totalValue ?? 0) / 100)}
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
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

      {/* Summary */}
      {report && (
        <div className="surface-card p-4 flex items-center gap-8 flex-wrap text-sm">
          <div>
            <div className="text-xs text-[color:var(--ink-500)]">{t("totalInventoryValue")}</div>
            <div className="text-xl font-bold text-[color:var(--ink-900)] tabular-nums">
              {formatCurrency((report.totalValue ?? 0) / 100)}
            </div>
          </div>
          <div>
            <div className="text-xs text-[color:var(--ink-500)]">{t("items")}</div>
            <div className="text-xl font-bold text-[color:var(--ink-900)] tabular-nums">{report.items.length}</div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="surface-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-[color:var(--brand-600)] border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-[color:var(--ink-400)]">{t("loading")}</p>
          </div>
        ) : !report || report.items.length === 0 ? (
          <div className="py-16 text-center text-[color:var(--ink-400)]">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t("noResults")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full zebra-table text-sm">
              <thead className="bg-[color:var(--ink-50)] text-[color:var(--ink-600)] text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">{t("itemCode")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("item")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("warehouse")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("quantity")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("avgCost")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("totalValue")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("lastUpdated")}</th>
                </tr>
              </thead>
              <tbody>
                {report.items.map((row: any, i: number) => (
                  <tr key={i} className="border-t border-[color:var(--ink-100)] hover:bg-[color:var(--brand-50)]/40">
                    <td className="px-4 py-3 font-mono text-xs text-[color:var(--brand-700)]">{row.itemCode}</td>
                    <td className="px-4 py-3 text-[color:var(--ink-700)]">
                      {isRTL ? row.itemNameAr : (row.itemNameEn || row.itemNameAr)}
                    </td>
                    <td className="px-4 py-3 text-[color:var(--ink-600)]">{row.warehouseNameAr}</td>
                    <td className="px-4 py-3 text-end tabular-nums font-semibold">{row.quantity.toFixed(3)}</td>
                    <td className="px-4 py-3 text-end tabular-nums">{formatCurrency((row.avgCost ?? 0) / 100)}</td>
                    <td className="px-4 py-3 text-end tabular-nums font-semibold">{formatCurrency((row.totalValue ?? 0) / 100)}</td>
                    <td className="px-4 py-3 text-[color:var(--ink-400)] text-xs">{formatDateShort(row.lastUpdated)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[color:var(--ink-200)] bg-[color:var(--ink-50)]">
                  <td colSpan={5} className="px-4 py-3 font-semibold text-[color:var(--ink-700)]">{t("total")}</td>
                  <td className="px-4 py-3 text-end font-bold tabular-nums text-[color:var(--ink-900)]">
                    {formatCurrency((report.totalValue ?? 0) / 100)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
