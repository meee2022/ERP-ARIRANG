// @ts-nocheck
"use client";
import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Building2, Printer } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { BUCKET_LABELS } from "@/lib/constants";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { CompanyPrintHeader } from "@/components/ui/company-print-header";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PageHeader } from "@/components/ui/page-header";

function todayISO() { return new Date().toISOString().split("T")[0]; }

export default function APAgingPage() {
  const { t, isRTL, lang, formatCurrency } = useI18n();
  const { company: printCompany } = useCompanySettings();
  const [asOfDate, setAsOfDate] = useState(todayISO());

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const data = useQuery(api.reports.getAPaging, company ? { companyId: company._id, asOfDate, branchId: branchArg as any } : "skip");
  const loading = data === undefined;
  const rows = data?.rows ?? [];
  const totals = data?.totals ?? { total: 0, current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };

  return (
    <div className="space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      <CompanyPrintHeader
        company={printCompany}
        isRTL={isRTL}
        documentTitle={t("apAgingTitle")}
        periodLine={`${t("asOfDate")}: ${asOfDate}`}
      />
      <div className="no-print">
        <PageHeader
          icon={Building2}
          title={t("apAgingTitle")}
          actions={<button onClick={() => window.print()} className="btn-ghost h-9 px-4 rounded-xl inline-flex items-center gap-2 text-sm font-semibold"><Printer className="h-4 w-4" />{t("print")}</button>}
        />
      </div>

      <div className="surface-card p-3 flex items-center gap-3">
        <div className="flex items-center gap-1.5"><span className="text-xs text-[color:var(--ink-500)]">{t("asOfDate")}:</span><input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="input-field h-9 w-auto" /></div>
      </div>

      <div className="surface-card p-4 grid grid-cols-3 md:grid-cols-6 gap-3 text-center text-sm">
        {[["total", totals.total], ["current", totals.current], ["aging30", totals.days30], ["aging60", totals.days60], ["aging90", totals.days90], ["agingOver90", totals.over90]].map(([k, v]: any) => (
          <div key={k}><p className="text-xs text-[color:var(--ink-500)] mb-1">{t(k)}</p><p className={`font-bold tabular-nums ${k === "agingOver90" && v > 0 ? "text-red-600" : ""}`}>{formatCurrency(v)}</p></div>
        ))}
      </div>

      <div className="surface-card overflow-hidden">
        {loading ? <LoadingState label={t("loading")} />
        : rows.length === 0 ? <EmptyState icon={Building2} title={t("noResults")} />
        : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("supplier")}</th>
                  <th className="text-end">{t("total")}</th>
                  <th className="text-end">{t("current")}</th>
                  <th className="text-end">{BUCKET_LABELS.days1_30[lang]}</th>
                  <th className="text-end">{BUCKET_LABELS.days31_60[lang]}</th>
                  <th className="text-end">{BUCKET_LABELS.days61_90[lang]}</th>
                  <th className="text-end">{BUCKET_LABELS.days91Plus[lang]}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.supplierId}>
                    <td className="font-medium">{isRTL ? r.supplierName : (r.supplierNameEn || r.supplierName)}</td>
                    <td className="numeric text-end font-semibold">{formatCurrency(r.total)}</td>
                    <td className="numeric text-end">{formatCurrency(r.current)}</td>
                    <td className="numeric text-end">{formatCurrency(r.days30)}</td>
                    <td className="numeric text-end">{formatCurrency(r.days60)}</td>
                    <td className="numeric text-end">{formatCurrency(r.days90)}</td>
                    <td className={`numeric text-end font-medium ${r.over90 > 0 ? "text-red-600" : ""}`}>{formatCurrency(r.over90)}</td>
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
