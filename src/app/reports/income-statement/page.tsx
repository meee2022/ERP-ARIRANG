// @ts-nocheck
"use client";
import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAppStore } from "@/store/useAppStore";
import { LoadingState } from "@/components/ui/data-display";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PrintableReportPage } from "@/components/ui/printable-report";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

function startOfYearISO()  { return `${new Date().getFullYear()}-01-01`; }
function todayISO()        { return new Date().toISOString().split("T")[0]; }

// ─── KPI card at the top ───────────────────────────────────────────────────────
function KPI({ label, value, pct, color, bg, border }: any) {
  return (
    <div className="rounded-2xl border p-4" style={{ background: bg, borderColor: border }}>
      <p className="text-[10.5px] font-semibold uppercase tracking-wide mb-1" style={{ color }}>{label}</p>
      <p className="text-[20px] font-black tabular-nums leading-tight" style={{ color }}>{value}</p>
      {pct !== undefined && (
        <p className="text-[11px] font-semibold mt-0.5" style={{ color: color + "aa" }}>
          {pct >= 0 ? "▲" : "▼"} {Math.abs(pct)}%
        </p>
      )}
    </div>
  );
}

// ─── Section header band ──────────────────────────────────────────────────────
function SectionHeader({ label, bg = "#6b1523" }: { label: string; bg?: string }) {
  return (
    <tr>
      <td colSpan={3} className="px-4 py-2.5 text-[11px] font-black uppercase tracking-widest"
        style={{ background: bg, color: "rgba(255,255,255,0.9)" }}>
        {label}
      </td>
    </tr>
  );
}

// ─── Sub-header (group label inside a section) ────────────────────────────────
function SubHeader({ label }: { label: string }) {
  return (
    <tr style={{ background: "#f8f9fb" }}>
      <td colSpan={3} className="px-5 py-1.5 text-[10.5px] font-bold uppercase tracking-wider"
        style={{ color: "var(--ink-500)", borderBottom: "1px solid var(--ink-100)" }}>
        {label}
      </td>
    </tr>
  );
}

// ─── Account row ──────────────────────────────────────────────────────────────
function AccountRow({ code, name, amount, fmt, i, indent = false }: any) {
  return (
    <tr className="hover:bg-[#fdf2f4]/50 transition-colors"
      style={{ background: i % 2 === 0 ? "white" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
      <td className="px-4 py-[7px] whitespace-nowrap">
        <span className="font-mono text-[10.5px] px-2 py-0.5 rounded"
          style={{ background: "var(--ink-100)", color: "var(--ink-600)" }}>{code}</span>
      </td>
      <td className={`py-[7px] text-[12.5px] ${indent ? "px-8" : "px-4"}`} style={{ color: "#1e293b" }}>{name}</td>
      <td className="px-4 py-[7px] tabular-nums text-[12.5px] font-semibold text-end whitespace-nowrap" style={{ color: "#1e293b" }}>
        {fmt(amount)}
      </td>
    </tr>
  );
}

// ─── Subtotal row ─────────────────────────────────────────────────────────────
function SubtotalRow({ label, amount, fmt, color = "#6b1523", light = false }: any) {
  return (
    <tr style={{ background: light ? `${color}08` : `${color}12`, borderTop: `1.5px solid ${color}30` }}>
      <td colSpan={2} className="px-4 py-2.5 text-[12px] font-bold" style={{ color }}>{label}</td>
      <td className="px-4 py-2.5 tabular-nums text-[13px] font-black text-end whitespace-nowrap" style={{ color }}>
        {fmt(amount)}
      </td>
    </tr>
  );
}

// ─── Profit/Loss result row ───────────────────────────────────────────────────
function ResultRow({ label, amount, pct, fmt, size = "lg" }: any) {
  const isPositive = amount >= 0;
  const color  = isPositive ? "#15803d" : "#dc2626";
  const bg     = isPositive ? "#f0fdf4" : "#fef2f2";
  const border = isPositive ? "#bbf7d0" : "#fecaca";
  const Icon   = isPositive ? TrendingUp : TrendingDown;
  return (
    <tr style={{ background: bg, borderTop: `2.5px solid ${border}` }}>
      <td colSpan={2} className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </span>
          <span className={`font-black ${size === "xl" ? "text-[15px]" : "text-[13px]"}`} style={{ color }}>{label}</span>
          {pct !== undefined && (
            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}15`, color }}>
              {Math.abs(pct)}%
            </span>
          )}
        </div>
      </td>
      <td className={`px-4 py-3 tabular-nums font-black text-end whitespace-nowrap ${size === "xl" ? "text-[18px]" : "text-[14px]"}`}
        style={{ color }}>
        {isPositive ? fmt(amount) : `(${fmt(Math.abs(amount))})`}
      </td>
    </tr>
  );
}

// ─── Spacer row ───────────────────────────────────────────────────────────────
function Spacer() {
  return <tr><td colSpan={3} style={{ height: 12 }} /></tr>;
}

// ─── Empty section row ────────────────────────────────────────────────────────
function EmptyRow({ label }: { label: string }) {
  return (
    <tr style={{ background: "white" }}>
      <td colSpan={3} className="px-4 py-3 text-center text-[12px]" style={{ color: "var(--ink-400)" }}>{label}</td>
    </tr>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function IncomeStatementPage() {
  const { t, isRTL, formatCurrency: fmt } = useI18n();
  const { company: printCompany } = useCompanySettings();
  const [startDate, setStartDate] = useState(startOfYearISO());
  const [endDate,   setEndDate]   = useState(todayISO());
  const [hideZero,  setHideZero]  = useState(true);

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const companies = useQuery(api.seed.getCompanies, {});
  const company   = companies?.[0];
  const branches  = useQuery(api.branches.getAll, company ? { companyId: company._id } : "skip");

  const data = useQuery(
    api.reports.getIncomeStatement,
    company ? { companyId: company._id, startDate, endDate, branchId: branchArg as any } : "skip"
  );

  const loading = data === undefined;

  // ── Filter zeros ────────────────────────────────────────────────────────────
  const filt = (rows: any[]) => hideZero ? (rows ?? []).filter((r) => r.balance !== 0) : (rows ?? []);

  const salesRevRows  = filt(data?.salesRevenueAccounts);
  const otherRevRows  = filt(data?.otherRevenueAccounts);
  const cogsRows      = filt(data?.cogsAccounts);
  const opExpRows     = filt(data?.operatingExpenseAccounts);

  const totalRevenue     = data?.totalRevenue     ?? 0;
  const totalCogs        = data?.totalCogs        ?? 0;
  const grossProfit      = data?.grossProfit      ?? 0;
  const totalOperatingExp= data?.totalOperatingExp?? 0;
  const operatingProfit  = data?.operatingProfit  ?? 0;
  const netIncome        = data?.netIncome        ?? 0;

  const grossMarginPct   = data?.grossMarginPct   ?? 0;
  const operatingMarginPct = data?.operatingMarginPct ?? 0;
  const netMarginPct     = data?.netMarginPct     ?? 0;

  const accountName = (r: any) => isRTL ? r.nameAr : (r.nameEn || r.nameAr);
  const noData      = isRTL ? "لا توجد حسابات" : "No accounts";

  return (
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={isRTL ? "قائمة الدخل" : "Income Statement"}
      period={`${startDate} — ${endDate}`}
      filters={
        <div className="surface-card p-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: "var(--ink-500)" }}>{t("fromDate")}:</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field h-9 w-auto" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: "var(--ink-500)" }}>{t("toDate")}:</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field h-9 w-auto" />
          </div>
          {branches && branches.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: "var(--ink-500)" }}>{t("branch")}:</span>
              <select className="input-field h-9 w-auto">
                <option value="">{t("allBranches")}</option>
                {branches.map((b: any) => (
                  <option key={b._id} value={b._id}>{isRTL ? b.nameAr : (b.nameEn || b.nameAr)}</option>
                ))}
              </select>
            </div>
          )}
          <label className="inline-flex items-center gap-2 text-sm ms-auto cursor-pointer" style={{ color: "var(--ink-700)" }}>
            <input type="checkbox" checked={hideZero} onChange={e => setHideZero(e.target.checked)} className="rounded" />
            {t("hideZeroBalances")}
          </label>
        </div>
      }
      summary={
        !loading && data ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPI
              label={isRTL ? "إجمالي الإيرادات" : "Total Revenue"}
              value={fmt(totalRevenue)}
              color="#6b1523" bg="#fdf2f4" border="#6b152330"
            />
            <KPI
              label={isRTL ? "مجمل الربح" : "Gross Profit"}
              value={fmt(grossProfit)}
              pct={grossMarginPct}
              color={grossProfit >= 0 ? "#15803d" : "#dc2626"}
              bg={grossProfit >= 0 ? "#f0fdf4" : "#fef2f2"}
              border={grossProfit >= 0 ? "#bbf7d0" : "#fecaca"}
            />
            <KPI
              label={isRTL ? "ربح التشغيل" : "Operating Profit"}
              value={fmt(operatingProfit)}
              pct={operatingMarginPct}
              color={operatingProfit >= 0 ? "#1d4ed8" : "#dc2626"}
              bg={operatingProfit >= 0 ? "#eff6ff" : "#fef2f2"}
              border={operatingProfit >= 0 ? "#bfdbfe" : "#fecaca"}
            />
            <KPI
              label={isRTL ? "صافي الربح / الخسارة" : "Net Income / Loss"}
              value={fmt(Math.abs(netIncome))}
              pct={netMarginPct}
              color={netIncome >= 0 ? "#15803d" : "#dc2626"}
              bg={netIncome >= 0 ? "#f0fdf4" : "#fef2f2"}
              border={netIncome >= 0 ? "#bbf7d0" : "#fecaca"}
            />
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <LoadingState label={t("loading")} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">

            {/* ══════════════════════════════════════════════════════════════
                1️⃣  REVENUE
            ══════════════════════════════════════════════════════════════ */}
            <tbody>
              <SectionHeader label={isRTL ? "① الإيرادات" : "① Revenue"} bg="#6b1523" />

              {/* Sales Revenue */}
              {salesRevRows.length > 0 && (
                <SubHeader label={isRTL ? "إيرادات المبيعات" : "Sales Revenue"} />
              )}
              {salesRevRows.length === 0 && otherRevRows.length === 0
                ? <EmptyRow label={noData} />
                : salesRevRows.map((r, i) => (
                    <AccountRow key={r.accountId} code={r.code} name={accountName(r)} amount={r.balance} fmt={fmt} i={i} />
                  ))
              }

              {/* Other Revenue */}
              {otherRevRows.length > 0 && (
                <>
                  <SubHeader label={isRTL ? "إيرادات أخرى" : "Other Revenue"} />
                  {otherRevRows.map((r, i) => (
                    <AccountRow key={r.accountId} code={r.code} name={accountName(r)} amount={r.balance} fmt={fmt} i={i} />
                  ))}
                </>
              )}

              <SubtotalRow
                label={isRTL ? "إجمالي الإيرادات" : "Total Revenue"}
                amount={totalRevenue}
                fmt={fmt}
                color="#6b1523"
              />
            </tbody>

            {/* ══════════════════════════════════════════════════════════════
                2️⃣  COGS
            ══════════════════════════════════════════════════════════════ */}
            <tbody>
              <Spacer />
              <SectionHeader label={isRTL ? "② تكلفة البضاعة المباعة (COGS)" : "② Cost of Goods Sold (COGS)"} bg="#b45309" />

              {cogsRows.length === 0
                ? <EmptyRow label={noData} />
                : cogsRows.map((r, i) => (
                    <AccountRow key={r.accountId} code={r.code} name={accountName(r)} amount={r.balance} fmt={fmt} i={i} />
                  ))
              }

              <SubtotalRow
                label={isRTL ? "إجمالي التكلفة" : "Total COGS"}
                amount={totalCogs}
                fmt={fmt}
                color="#b45309"
                light
              />
            </tbody>

            {/* ── Gross Profit ─────────────────────────────────────────── */}
            <tbody>
              <ResultRow
                label={isRTL ? "مجمل الربح (Gross Profit)" : "Gross Profit"}
                amount={grossProfit}
                pct={grossMarginPct}
                fmt={fmt}
                size="lg"
              />
            </tbody>

            {/* ══════════════════════════════════════════════════════════════
                3️⃣  OPERATING EXPENSES
            ══════════════════════════════════════════════════════════════ */}
            <tbody>
              <Spacer />
              <SectionHeader label={isRTL ? "③ مصروفات التشغيل" : "③ Operating Expenses"} bg="#1e40af" />

              {opExpRows.length === 0
                ? <EmptyRow label={noData} />
                : opExpRows.map((r, i) => (
                    <AccountRow key={r.accountId} code={r.code} name={accountName(r)} amount={r.balance} fmt={fmt} i={i} />
                  ))
              }

              <SubtotalRow
                label={isRTL ? "إجمالي مصروفات التشغيل" : "Total Operating Expenses"}
                amount={totalOperatingExp}
                fmt={fmt}
                color="#1e40af"
                light
              />
            </tbody>

            {/* ── Operating Profit ─────────────────────────────────────── */}
            <tbody>
              <ResultRow
                label={isRTL ? "ربح التشغيل (Operating Profit)" : "Operating Profit"}
                amount={operatingProfit}
                pct={operatingMarginPct}
                fmt={fmt}
                size="lg"
              />
            </tbody>

            {/* ══════════════════════════════════════════════════════════════
                4️⃣  NET INCOME / LOSS
            ══════════════════════════════════════════════════════════════ */}
            <tbody>
              <Spacer />
              <ResultRow
                label={netIncome >= 0
                  ? (isRTL ? "✅ صافي الربح (Net Income)" : "✅ Net Income")
                  : (isRTL ? "❌ صافي الخسارة (Net Loss)" : "❌ Net Loss")}
                amount={netIncome}
                pct={netMarginPct}
                fmt={fmt}
                size="xl"
              />
            </tbody>

            {/* ── Margin summary footer ────────────────────────────────── */}
            <tbody>
              <Spacer />
              <tr style={{ background: "#f8fafc", borderTop: "1px solid var(--ink-200)" }}>
                <td colSpan={3} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-6 text-[11.5px]">
                    <span className="font-bold" style={{ color: "var(--ink-500)" }}>
                      {isRTL ? "نسب الربحية:" : "Profit Margins:"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: "var(--ink-500)" }}>{isRTL ? "هامش المجمل" : "Gross Margin"}</span>
                      <span className="font-black px-2 py-0.5 rounded-full text-[11px]"
                        style={{ background: grossProfit >= 0 ? "#f0fdf4" : "#fef2f2", color: grossProfit >= 0 ? "#15803d" : "#dc2626" }}>
                        {grossMarginPct}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: "var(--ink-500)" }}>{isRTL ? "هامش التشغيل" : "Operating Margin"}</span>
                      <span className="font-black px-2 py-0.5 rounded-full text-[11px]"
                        style={{ background: operatingProfit >= 0 ? "#eff6ff" : "#fef2f2", color: operatingProfit >= 0 ? "#1d4ed8" : "#dc2626" }}>
                        {operatingMarginPct}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: "var(--ink-500)" }}>{isRTL ? "هامش الصافي" : "Net Margin"}</span>
                      <span className="font-black px-2 py-0.5 rounded-full text-[11px]"
                        style={{ background: netIncome >= 0 ? "#f0fdf4" : "#fef2f2", color: netIncome >= 0 ? "#15803d" : "#dc2626" }}>
                        {netMarginPct}%
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>

          </table>
        </div>
      )}
    </PrintableReportPage>
  );
}
