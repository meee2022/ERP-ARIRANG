// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { CompanyPrintHeader } from "@/components/ui/company-print-header";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { TrendingUp, Printer } from "lucide-react";

const CATEGORIES = ["Oven", "Vehicle", "Furniture", "Equipment", "Building", "Computer", "Other"];

export default function DepreciationScheduleReportPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { company: printCompany } = useCompanySettings();

  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const now = new Date();
  const [category, setCategory] = useState("");
  const [fromYear, setFromYear] = useState(now.getFullYear());
  const [fromMonth, setFromMonth] = useState(1);
  const [toYear, setToYear] = useState(now.getFullYear());
  const [toMonth, setToMonth] = useState(12);

  const data = useQuery(
    api.fixedAssets.getDepreciationScheduleReport,
    companyId
      ? {
          companyId,
          category: category || undefined,
          fromYear,
          fromMonth,
          toYear,
          toMonth,
        }
      : "skip"
  );

  const loading = data === undefined;
  const rows = data ?? [];

  return (
    <div className="space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      <CompanyPrintHeader company={printCompany} isRTL={isRTL} documentTitle={t("depScheduleReport")} />

      <div className="no-print">
        <PageHeader
          icon={TrendingUp}
          title={t("depScheduleReport")}
          actions={
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium btn-ghost">
              <Printer className="h-4 w-4" /> {t("print")}
            </button>
          }
        />
      </div>

      <div className="no-print">
        <FilterPanel>
        <FilterField label={t("category")}>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field h-8 w-auto text-sm">
            <option value="">{t("all")}</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </FilterField>
        <FilterField label={t("fromDate")}>
          <div className="flex gap-1">
            <select value={fromMonth} onChange={(e) => setFromMonth(parseInt(e.target.value))} className="input-field h-8 text-sm w-16">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input type="number" value={fromYear} onChange={(e) => setFromYear(parseInt(e.target.value))} className="input-field h-8 text-sm w-20" />
          </div>
        </FilterField>
        <FilterField label={t("toDate")}>
          <div className="flex gap-1">
            <select value={toMonth} onChange={(e) => setToMonth(parseInt(e.target.value))} className="input-field h-8 text-sm w-16">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input type="number" value={toYear} onChange={(e) => setToYear(parseInt(e.target.value))} className="input-field h-8 text-sm w-20" />
          </div>
        </FilterField>
      </FilterPanel>
      </div>

      <div className="surface-card overflow-x-auto">
        {loading ? (
          <LoadingState label={t("loading")} />
        ) : rows.length === 0 ? (
          <EmptyState icon={TrendingUp} message={isRTL ? "لا توجد بيانات إهلاك" : "No depreciation data found"} />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("assetCode")}</th>
                <th>{t("name")}</th>
                <th>{t("category")}</th>
                <th>{t("runPeriod")}</th>
                <th className="text-end">{t("depreciationAmount")}</th>
                <th className="text-end">{t("accumulatedDepreciation")}</th>
                <th className="text-end">{t("bookValue")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="font-mono text-sm">{r.assetCode}</td>
                  <td>{isRTL ? r.assetNameAr : (r.assetNameEn || r.assetNameAr)}</td>
                  <td className="muted">{r.category || "—"}</td>
                  <td className="muted">{r.periodMonth}/{r.periodYear}</td>
                  <td className="text-end tabular-nums">{formatCurrency(r.depreciationAmount)}</td>
                  <td className="text-end tabular-nums text-amber-700">{formatCurrency(r.accumulatedDepreciation)}</td>
                  <td className="text-end tabular-nums font-semibold">{formatCurrency(r.bookValueAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
