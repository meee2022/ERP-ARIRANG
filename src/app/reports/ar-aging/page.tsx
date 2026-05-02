// @ts-nocheck
"use client";
import React, { useState, useMemo } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Users, Download, Phone, AlertTriangle,
  Wallet, Clock, CalendarClock, CalendarX, Flame, LayoutList,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PrintableReportPage, ReportBanner } from "@/components/ui/printable-report";
import * as XLSX from "xlsx";

function todayISO() { return new Date().toISOString().split("T")[0]; }

// ─── Bucket config (color coded by risk) ──────────────────────────────────────
const BUCKETS = [
  { key: "current", labelAr: "جاري",       labelEn: "Current",      color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", Icon: Wallet      },
  { key: "days30",  labelAr: "1-30 يوم",   labelEn: "1-30 Days",    color: "#ca8a04", bg: "#fefce8", border: "#fde68a", Icon: Clock       },
  { key: "days60",  labelAr: "31-60 يوم",  labelEn: "31-60 Days",   color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", Icon: CalendarClock},
  { key: "days90",  labelAr: "61-90 يوم",  labelEn: "61-90 Days",   color: "#dc2626", bg: "#fef2f2", border: "#fecaca", Icon: CalendarX   },
  { key: "over90",  labelAr: "أكثر من 90", labelEn: "Over 90 Days", color: "#991b1b", bg: "#fef2f2", border: "#fca5a5", Icon: Flame       },
] as const;

// ─── Filter pills ─────────────────────────────────────────────────────────────
const FILTERS = [
  { value: "all",       Icon: LayoutList,    color: "#6b1523", bg: "#fdf2f4", labelAr: "كل العملاء",      labelEn: "All Customers"  },
  { value: "overdue",   Icon: AlertTriangle, color: "#dc2626", bg: "#fef2f2", labelAr: "عليهم متأخرات",   labelEn: "Has Overdue"    },
  { value: "highRisk",  Icon: Flame,         color: "#991b1b", bg: "#fef2f2", labelAr: "خطر عالي (>50%)", labelEn: "High Risk >50%" },
] as const;

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KPI({ label, value, color, bg, border, Icon, hint, big = false }: any) {
  return (
    <div className="rounded-2xl border p-3.5" style={{ background: bg, borderColor: border }}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && (
          <span className="h-6 w-6 rounded-md flex items-center justify-center"
            style={{ background: color + "20" }}>
            <Icon className="h-3.5 w-3.5" style={{ color }} />
          </span>
        )}
        <p className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color }}>
          {label}
        </p>
      </div>
      <p className={`${big ? "text-[22px]" : "text-[18px]"} font-black tabular-nums leading-tight`} style={{ color }}>
        {value}
      </p>
      {hint && <p className="text-[10.5px] mt-0.5" style={{ color: color + "aa" }}>{hint}</p>}
    </div>
  );
}

// ─── Risk bar ─────────────────────────────────────────────────────────────────
function RiskBar({ pct }: { pct: number }) {
  const color =
    pct === 0  ? "#15803d" :
    pct < 25   ? "#ca8a04" :
    pct < 50   ? "#ea580c" :
    pct < 75   ? "#dc2626" : "#991b1b";
  return (
    <div className="flex items-center gap-1.5 min-w-[90px]">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#f1f5f9" }}>
        <div className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
      <span className="text-[10px] font-bold tabular-nums w-8 text-end" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ARAgingPage() {
  const { t, isRTL, formatCurrency: fmt } = useI18n();
  const { company: printCompany } = useCompanySettings();
  const [asOfDate, setAsOfDate] = useState(todayISO());
  const [filter, setFilter] = useState<"all" | "overdue" | "highRisk">("all");

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const data = useQuery(api.reports.getARaging,
    company ? { companyId: company._id, asOfDate, branchId: branchArg as any } : "skip");

  const loading = data === undefined;
  const allRows = data?.rows ?? [];
  const totals  = data?.totals ?? { total: 0, current: 0, days30: 0, days60: 0, days90: 0, over90: 0, overdue: 0, customerCount: 0 };

  // ── Filtered rows ───────────────────────────────────────────────────────────
  const rows = useMemo(() => {
    if (filter === "overdue")  return allRows.filter((r: any) => r.overdue > 0);
    if (filter === "highRisk") return allRows.filter((r: any) => r.overduePct > 50);
    return allRows;
  }, [allRows, filter]);

  const overduePctTotal = totals.total > 0 ? Math.round((totals.overdue / totals.total) * 100) : 0;
  const customerName = (r: any) => isRTL ? r.customerName : (r.customerNameEn || r.customerName);

  // ── Excel export ────────────────────────────────────────────────────────────
  function exportToExcel() {
    if (!data || rows.length === 0) return;
    const headers = [
      isRTL ? "كود"     : "Code",
      isRTL ? "العميل"  : "Customer",
      isRTL ? "الهاتف"  : "Phone",
      isRTL ? "الإجمالي" : "Total",
      isRTL ? "جاري"    : "Current",
      isRTL ? "1-30"    : "1-30 Days",
      isRTL ? "31-60"   : "31-60 Days",
      isRTL ? "61-90"   : "61-90 Days",
      isRTL ? "أكثر من 90" : "Over 90",
      isRTL ? "متأخرات" : "Overdue",
      isRTL ? "نسبة الخطر %" : "Risk %",
    ];
    const wsData: any[][] = [headers];
    for (const r of rows) {
      wsData.push([
        r.customerCode, customerName(r), r.phone ?? "",
        r.total, r.current, r.days30, r.days60, r.days90, r.over90,
        r.overdue, r.overduePct,
      ]);
    }
    wsData.push([
      "", isRTL ? "الإجمالي" : "TOTAL", "",
      totals.total, totals.current, totals.days30, totals.days60, totals.days90, totals.over90,
      totals.overdue, overduePctTotal,
    ]);
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [
      { wch: 12 }, { wch: 32 }, { wch: 16 },
      { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
      { wch: 14 }, { wch: 10 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AR Aging");
    XLSX.writeFile(wb, `ar-aging-${asOfDate}.xlsx`);
  }

  return (
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={t("arAgingTitle")}
      period={`${t("asOfDate")}: ${asOfDate}`}
      actions={
        rows.length > 0 ? (
          <button onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium btn-ghost">
            <Download className="h-4 w-4" />
            {isRTL ? "تصدير Excel" : "Export Excel"}
          </button>
        ) : undefined
      }
      filters={
        <div className="space-y-3">
          <div className="surface-card p-3 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: "var(--ink-500)" }}>{t("asOfDate")}:</span>
              <input type="date" value={asOfDate}
                onChange={e => setAsOfDate(e.target.value)}
                className="input-field h-9 w-auto" />
            </div>
            <span className="ms-auto text-xs" style={{ color: "var(--ink-500)" }}>
              {isRTL ? "عدد العملاء: " : "Customers: "}
              <span className="font-bold" style={{ color: "var(--ink-800)" }}>{rows.length}</span>
              {" / "}{allRows.length}
            </span>
          </div>
          {/* Filter pills */}
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(({ value, Icon, color, bg, labelAr, labelEn }) => {
              const active = filter === value;
              return (
                <button key={value} onClick={() => setFilter(value as any)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all border"
                  style={{
                    background:  active ? color : bg,
                    color:       active ? "white" : color,
                    borderColor: active ? color : color + "30",
                    boxShadow:   active ? `0 2px 8px ${color}40` : "none",
                  }}>
                  <Icon className="h-3.5 w-3.5" />
                  {isRTL ? labelAr : labelEn}
                </button>
              );
            })}
          </div>
        </div>
      }
      summary={
        !loading && data ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPI
              label={isRTL ? "إجمالي المديونية" : "Total Outstanding"}
              value={fmt(totals.total)}
              color="#6b1523" bg="#fdf2f4" border="#6b152330"
              hint={`${totals.customerCount} ${isRTL ? "عميل" : "customers"}`}
              Icon={Users} big
            />
            {BUCKETS.map(({ key, labelAr, labelEn, color, bg, border, Icon }) => (
              <KPI
                key={key}
                label={isRTL ? labelAr : labelEn}
                value={fmt(totals[key])}
                color={color} bg={bg} border={border} Icon={Icon}
              />
            ))}
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <LoadingState label={t("loading")} />
      ) : allRows.length === 0 ? (
        <div className="py-16">
          <EmptyState icon={Users} title={isRTL ? "لا توجد مديونيات" : "No Outstanding Receivables"}
            message={isRTL
              ? "كل الفواتير الآجلة تم تحصيلها بحلول هذا التاريخ — أحسنت! 🎉"
              : "All credit invoices have been collected as of this date — well done! 🎉"} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* High-overdue warning (screen only) */}
          {overduePctTotal > 30 && (
            <ReportBanner
              variant={overduePctTotal > 60 ? "error" : "warning"}
              title={isRTL
                ? `⚠️ ${overduePctTotal}% من إجمالي المديونية متأخر السداد`
                : `⚠️ ${overduePctTotal}% of total receivables are overdue`}
              rightSlot={`${fmt(totals.overdue)} ${isRTL ? "متأخر" : "overdue"}`}
            >
              {isRTL
                ? "يُنصح بمتابعة العملاء الذين عليهم متأخرات لتحصيل المستحقات قبل تجاوز 90 يوم."
                : "We recommend following up with overdue customers to collect dues before exceeding 90 days."}
            </ReportBanner>
          )}

          {rows.length === 0 ? (
            <EmptyState icon={Users} title={isRTL ? "لا توجد نتائج للفلتر المختار" : "No results for selected filter"} />
          ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-20">{isRTL ? "كود" : "Code"}</th>
                <th>{t("customer")}</th>
                <th className="w-32">{isRTL ? "نسبة الخطر" : "Risk Level"}</th>
                <th className="text-end w-28">{t("total")}</th>
                {BUCKETS.map(({ key, labelAr, labelEn }) => (
                  <th key={key} className="text-end w-24">{isRTL ? labelAr : labelEn}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any, idx: number) => (
                <tr key={r.customerId} className="hover:bg-[#fdf2f4]/30 transition-colors"
                  style={{ background: idx % 2 === 0 ? "white" : "#fafafa" }}>
                  <td>
                    <span className="font-mono text-[10.5px] px-1.5 py-0.5 rounded"
                      style={{ background: "var(--ink-100)", color: "var(--ink-700)" }}>
                      {r.customerCode || "—"}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-[12.5px]" style={{ color: "var(--ink-800)" }}>
                        {customerName(r)}
                      </span>
                      {r.phone && (
                        <span className="inline-flex items-center gap-1 text-[10.5px]"
                          style={{ color: "var(--ink-400)" }}>
                          <Phone className="h-2.5 w-2.5" />
                          <span dir="ltr">{r.phone}</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td><RiskBar pct={r.overduePct} /></td>
                  <td className="numeric text-end font-black text-[13px]"
                    style={{ color: "var(--ink-900)" }}>
                    {fmt(r.total)}
                  </td>
                  {BUCKETS.map(({ key, color }) => {
                    const v = r[key];
                    return (
                      <td key={key} className="numeric text-end">
                        {v > 0 ? (
                          <span className="font-semibold tabular-nums px-1.5 py-0.5 rounded"
                            style={{ background: color + "12", color }}>
                            {fmt(v)}
                          </span>
                        ) : (
                          <span style={{ color: "var(--ink-300)" }}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="row-total" style={{ background: "#fdf2f4", borderTop: "2.5px solid #6b152330" }}>
                <td colSpan={2} className="font-black" style={{ color: "#6b1523" }}>
                  {isRTL ? `↓ الإجمالي (${rows.length} عميل)` : `↓ Total (${rows.length} customers)`}
                </td>
                <td><RiskBar pct={overduePctTotal} /></td>
                <td className="numeric text-end font-black text-[14px]" style={{ color: "#6b1523" }}>
                  {fmt(rows.reduce((s: number, r: any) => s + r.total, 0))}
                </td>
                {BUCKETS.map(({ key, color }) => (
                  <td key={key} className="numeric text-end font-black" style={{ color }}>
                    {fmt(rows.reduce((s: number, r: any) => s + r[key], 0))}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
          )}
        </div>
      )}
    </PrintableReportPage>
  );
}
