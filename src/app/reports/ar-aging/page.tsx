// @ts-nocheck
"use client";
import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Users } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { BUCKET_LABELS } from "@/lib/constants";

function todayISO() { return new Date().toISOString().split("T")[0]; }

export default function ARAgingPage() {
  const { t, isRTL, lang, formatCurrency } = useI18n();
  const [asOfDate, setAsOfDate] = useState(todayISO());

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const data = useQuery(api.reports.getARaging, company ? { companyId: company._id, asOfDate, branchId: branchArg as any } : "skip");
  const loading = data === undefined;
  const rows = data?.rows ?? [];
  const totals = data?.totals ?? { total: 0, current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}>
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">{t("arAgingTitle")}</h1>
          <p className="text-xs text-[color:var(--ink-500)] mt-0.5">{rows.length} {t("customersCount")}</p>
        </div>
      </div>

      <div className="surface-card p-3 flex items-center gap-3">
        <div className="flex items-center gap-1.5"><span className="text-xs text-[color:var(--ink-500)]">{t("asOfDate")}:</span><input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="input-field h-9 w-auto" /></div>
      </div>

      {/* Totals bar */}
      <div className="surface-card p-4 grid grid-cols-3 md:grid-cols-6 gap-3 text-center text-sm">
        {[["total", totals.total], ["current", totals.current], ["aging30", totals.days30], ["aging60", totals.days60], ["aging90", totals.days90], ["agingOver90", totals.over90]].map(([k, v]: any) => (
          <div key={k}><p className="text-xs text-[color:var(--ink-500)] mb-1">{t(k)}</p><p className={`font-bold tabular-nums ${k === "agingOver90" && v > 0 ? "text-red-600" : ""}`}>{formatCurrency(v)}</p></div>
        ))}
      </div>

      <div className="surface-card overflow-hidden">
        {loading ? <div className="p-8 text-center"><div className="animate-spin h-8 w-8 border-2 border-[color:var(--brand-600)] border-t-transparent rounded-full mx-auto mb-3" /></div>
        : rows.length === 0 ? <div className="py-16 text-center text-[color:var(--ink-400)]"><p className="text-sm">{t("noResults")}</p></div>
        : (
          <div className="overflow-x-auto">
            <table className="w-full zebra-table text-sm">
              <thead className="bg-[color:var(--brand-800)] text-white text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">{t("customer")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("total")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("current")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{BUCKET_LABELS.days1_30[lang]}</th>
                  <th className="px-4 py-3 text-end font-semibold">{BUCKET_LABELS.days31_60[lang]}</th>
                  <th className="px-4 py-3 text-end font-semibold">{BUCKET_LABELS.days61_90[lang]}</th>
                  <th className="px-4 py-3 text-end font-semibold">{BUCKET_LABELS.days91Plus[lang]}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.customerId} className="border-t border-[color:var(--ink-100)] hover:bg-[color:var(--brand-50)]/40">
                    <td className="px-4 py-2.5 font-medium text-[color:var(--ink-900)]">{isRTL ? r.customerName : (r.customerNameEn || r.customerName)}</td>
                    <td className="px-4 py-2.5 text-end tabular-nums font-semibold">{formatCurrency(r.total)}</td>
                    <td className="px-4 py-2.5 text-end tabular-nums">{formatCurrency(r.current)}</td>
                    <td className="px-4 py-2.5 text-end tabular-nums">{formatCurrency(r.days30)}</td>
                    <td className="px-4 py-2.5 text-end tabular-nums">{formatCurrency(r.days60)}</td>
                    <td className="px-4 py-2.5 text-end tabular-nums">{formatCurrency(r.days90)}</td>
                    <td className={`px-4 py-2.5 text-end tabular-nums font-medium ${r.over90 > 0 ? "text-red-600" : ""}`}>{formatCurrency(r.over90)}</td>
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
