// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ShoppingCart } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

function todayISO() { return new Date().toISOString().split("T")[0]; }
function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function PurchaseReportPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}>
          <ShoppingCart className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">{t("purchaseReportTitle")}</h1>
          {report && (
            <p className="text-xs text-[color:var(--ink-500)] mt-0.5">
              {report.invoiceCount} {t("purchaseCount")} — {formatCurrency((report.totalPurchases ?? 0) / 100)}
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="surface-card p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[color:var(--ink-500)]">{t("fromDate")}:</span>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input-field h-9 w-auto" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[color:var(--ink-500)]">{t("toDate")}:</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input-field h-9 w-auto" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[color:var(--ink-500)]">{t("groupBy")}:</span>
          <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)} className="input-field h-9 w-auto">
            <option value="day">{t("groupByDay")}</option>
            <option value="supplier">{t("groupBySupplier")}</option>
            <option value="item">{t("groupByItem")}</option>
          </select>
        </div>
      </div>

      {/* Summary */}
      {report && (
        <div className="surface-card p-4 flex items-center gap-8 flex-wrap text-sm">
          <div>
            <div className="text-xs text-[color:var(--ink-500)]">{t("totalPurchases")}</div>
            <div className="text-xl font-bold text-[color:var(--ink-900)] tabular-nums">
              {formatCurrency((report.totalPurchases ?? 0) / 100)}
            </div>
          </div>
          <div>
            <div className="text-xs text-[color:var(--ink-500)]">{t("purchaseCount")}</div>
            <div className="text-xl font-bold text-[color:var(--ink-900)] tabular-nums">{report.invoiceCount}</div>
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
        ) : !report || !report.data || report.data.length === 0 ? (
          <div className="py-16 text-center text-[color:var(--ink-400)]">
            <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t("noResults")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full zebra-table text-sm">
              <thead className="bg-[color:var(--ink-50)] text-[color:var(--ink-600)] text-xs uppercase tracking-wider">
                <tr>
                  {groupBy === "day" && <>
                    <th className="px-4 py-3 text-start font-semibold">{t("date")}</th>
                    <th className="px-4 py-3 text-end font-semibold">{t("purchaseCount")}</th>
                    <th className="px-4 py-3 text-end font-semibold">{t("totalPurchases")}</th>
                  </>}
                  {groupBy === "supplier" && <>
                    <th className="px-4 py-3 text-start font-semibold">{t("supplier")}</th>
                    <th className="px-4 py-3 text-end font-semibold">{t("purchaseCount")}</th>
                    <th className="px-4 py-3 text-end font-semibold">{t("totalPurchases")}</th>
                  </>}
                  {groupBy === "item" && <>
                    <th className="px-4 py-3 text-start font-semibold">{t("item")}</th>
                    <th className="px-4 py-3 text-end font-semibold">{t("quantity")}</th>
                    <th className="px-4 py-3 text-end font-semibold">{t("totalPurchases")}</th>
                  </>}
                </tr>
              </thead>
              <tbody>
                {report.data.map((row: any, i: number) => (
                  <tr key={i} className="border-t border-[color:var(--ink-100)] hover:bg-[color:var(--brand-50)]/40">
                    {groupBy === "day" && <>
                      <td className="px-4 py-3 tabular-nums text-[color:var(--ink-700)]">{row.date}</td>
                      <td className="px-4 py-3 text-end tabular-nums">{row.count}</td>
                      <td className="px-4 py-3 text-end font-semibold tabular-nums">{formatCurrency((row.total ?? 0) / 100)}</td>
                    </>}
                    {groupBy === "supplier" && <>
                      <td className="px-4 py-3 text-[color:var(--ink-700)]">{row.supplierName}</td>
                      <td className="px-4 py-3 text-end tabular-nums">{row.count}</td>
                      <td className="px-4 py-3 text-end font-semibold tabular-nums">{formatCurrency((row.total ?? 0) / 100)}</td>
                    </>}
                    {groupBy === "item" && <>
                      <td className="px-4 py-3 text-[color:var(--ink-700)]">{row.itemName}</td>
                      <td className="px-4 py-3 text-end tabular-nums">{(row.qty ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-end font-semibold tabular-nums">{formatCurrency((row.total ?? 0) / 100)}</td>
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
