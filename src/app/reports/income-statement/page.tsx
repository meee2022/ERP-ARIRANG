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
import { TrendingUp, TrendingDown, AlertCircle, Info } from "lucide-react";

function startOfYearISO() { return `${new Date().getFullYear()}-01-01`; }
function todayISO()       { return new Date().toISOString().split("T")[0]; }

// ─── KPI card ─────────────────────────────────────────────────────────────────
// pct only shows when revenue > 0 AND pct !== 0
function KPI({ label, value, pct, color, bg, border, hasRevenue = true }: any) {
  const showPct = hasRevenue && pct !== undefined && pct !== 0;
  const isNeg   = pct < 0;
  return (
    <div className="rounded-2xl border p-4" style={{ background: bg, borderColor: border }}>
      <p className="text-[10.5px] font-semibold uppercase tracking-wide mb-1" style={{ color }}>{label}</p>
      <p className="text-[20px] font-black tabular-nums leading-tight" style={{ color }}>{value}</p>
      {showPct ? (
        <p className="text-[11px] font-semibold mt-0.5" style={{ color: color + "bb" }}>
          {isNeg ? "▼" : "▲"} {Math.abs(pct)}%
        </p>
      ) : (
        <p className="text-[11px] mt-0.5" style={{ color: color + "55" }}>—</p>
      )}
    </div>
  );
}

// ─── Section header band ──────────────────────────────────────────────────────
function SectionHeader({ label, bg = "#6b1523" }: { label: string; bg?: string }) {
  return (
    <tr>
      <td colSpan={3} className="px-4 py-2.5 text-[11px] font-black uppercase tracking-widest"
        style={{ background: bg, color: "rgba(255,255,255,0.92)" }}>
        {label}
      </td>
    </tr>
  );
}

// ─── Sub-header ───────────────────────────────────────────────────────────────
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
function AccountRow({ code, name, amount, fmt, i }: any) {
  return (
    <tr className="hover:bg-[#fdf2f4]/40 transition-colors"
      style={{ background: i % 2 === 0 ? "white" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
      <td className="px-4 py-[7px] whitespace-nowrap w-36">
        <span className="font-mono text-[10.5px] px-2 py-0.5 rounded"
          style={{ background: "var(--ink-100)", color: "var(--ink-600)" }}>{code}</span>
      </td>
      <td className="px-4 py-[7px] text-[12.5px]" style={{ color: "#1e293b" }}>{name}</td>
      <td className="px-4 py-[7px] tabular-nums text-[12.5px] font-semibold text-end whitespace-nowrap w-36"
        style={{ color: "#1e293b" }}>
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

// ─── Result row (Gross / Operating / Net) ────────────────────────────────────
// pct badge hidden when revenue=0 (meaningless 0%)
function ResultRow({ label, amount, pct, fmt, size = "lg", hasRevenue = true }: any) {
  const isPositive = amount >= 0;
  const isZero     = amount === 0;
  const color  = isZero ? "#64748b" : isPositive ? "#15803d" : "#dc2626";
  const bg     = isZero ? "#f8fafc"  : isPositive ? "#f0fdf4" : "#fef2f2";
  const border = isZero ? "#e2e8f0"  : isPositive ? "#bbf7d0" : "#fecaca";
  const Icon   = isZero ? TrendingUp : isPositive ? TrendingUp : TrendingDown;
  const showPct = hasRevenue && pct !== undefined && pct !== 0;

  return (
    <tr style={{ background: bg, borderTop: `2.5px solid ${border}` }}>
      <td colSpan={2} className="px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${color}20` }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </span>
          <span className={`font-black ${size === "xl" ? "text-[15px]" : "text-[13px]"}`}
            style={{ color }}>{label}</span>
          {showPct && (
            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${color}15`, color }}>
              {pct < 0 ? "▼ " : "▲ "}{Math.abs(pct)}%
            </span>
          )}
          {!hasRevenue && (
            <span className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: "#fef9c3", color: "#92400e" }}>
              N/A
            </span>
          )}
        </div>
      </td>
      <td className={`px-4 py-3 tabular-nums font-black text-end whitespace-nowrap ${size === "xl" ? "text-[18px]" : "text-[14px]"}`}
        style={{ color }}>
        {isZero
          ? fmt(0)
          : isPositive
            ? fmt(amount)
            : `(${fmt(Math.abs(amount))})`}
      </td>
    </tr>
  );
}

// ─── Spacer row ───────────────────────────────────────────────────────────────
function Spacer() {
  return <tr><td colSpan={3} style={{ height: 14 }} /></tr>;
}

// ─── Empty section row ────────────────────────────────────────────────────────
function EmptyRow({ label }: { label: string }) {
  return (
    <tr style={{ background: "white" }}>
      <td colSpan={3} className="px-4 py-3 text-center text-[12px] italic"
        style={{ color: "var(--ink-400)" }}>{label}</td>
    </tr>
  );
}

// ─── No-revenue warning banner ────────────────────────────────────────────────
function NoRevenueWarning({ isRTL, hasExpenses }: { isRTL: boolean; hasExpenses: boolean }) {
  return (
    <div className="no-print rounded-xl mb-5 overflow-hidden"
      style={{ border: "1.5px solid #fed7aa", background: "#fff7ed" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5" style={{ background: "#ea580c" }}>
        <AlertCircle className="h-4 w-4 text-white shrink-0" />
        <span className="text-sm font-black text-white">
          {isRTL ? "⚠️ لا توجد إيرادات مسجلة في هذه الفترة" : "⚠️ No Revenue Recorded in This Period"}
        </span>
      </div>
      {/* Body */}
      <div className="px-4 py-3 flex gap-3">
        <Info className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#c2410c" }} />
        <div className="text-[12.5px] space-y-1" style={{ color: "#9a3412" }}>
          {hasExpenses && (
            <p className="font-semibold">
              {isRTL
                ? "يوجد مصروفات مسجلة بدون إيرادات مقابلة — النتيجة ستكون خسارة صافية."
                : "Expenses are recorded but no revenue found — result will be a net loss."}
            </p>
          )}
          <p>
            {isRTL
              ? "تأكد من أن حسابات الإيرادات مصنفة كـ «إيرادات» في شجرة الحسابات وأن خاصية «قابل للترحيل» مفعّلة عليها."
              : "Ensure revenue accounts are classified as 'Revenue' in the chart of accounts and that 'Is Postable' is enabled."}
          </p>
        </div>
      </div>
    </div>
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

  // ── Filtered rows ───────────────────────────────────────────────────────────
  const filt = (rows: any[]) =>
    hideZero ? (rows ?? []).filter((r) => r.balance !== 0) : (rows ?? []);

  const salesRevRows = filt(data?.salesRevenueAccounts);
  const otherRevRows = filt(data?.otherRevenueAccounts);
  const cogsRows     = filt(data?.cogsAccounts);
  const opExpRows    = filt(data?.operatingExpenseAccounts);

  const totalRevenue      = data?.totalRevenue      ?? 0;
  const totalCogs         = data?.totalCogs         ?? 0;
  const grossProfit       = data?.grossProfit       ?? 0;
  const totalOperatingExp = data?.totalOperatingExp ?? 0;
  const operatingProfit   = data?.operatingProfit   ?? 0;
  const netIncome         = data?.netIncome         ?? 0;
  const grossMarginPct    = data?.grossMarginPct    ?? 0;
  const operatingMarginPct = data?.operatingMarginPct ?? 0;
  const netMarginPct      = data?.netMarginPct      ?? 0;

  const hasRevenue  = totalRevenue > 0;
  const hasExpenses = totalOperatingExp > 0 || totalCogs > 0;
  const noRevenue   = !loading && data && !hasRevenue;

  const accountName = (r: any) => isRTL ? r.nameAr : (r.nameEn || r.nameAr);
  const noData      = isRTL ? "لا توجد حسابات" : "No accounts";

  // Net income display: show parentheses for losses in KPI
  const netIncomeDisplay = netIncome < 0
    ? `(${fmt(Math.abs(netIncome))})`
    : fmt(netIncome);

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
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="input-field h-9 w-auto" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: "var(--ink-500)" }}>{t("toDate")}:</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="input-field h-9 w-auto" />
          </div>
          {branches && branches.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: "var(--ink-500)" }}>{t("branch")}:</span>
              <select className="input-field h-9 w-auto">
                <option value="">{t("allBranches")}</option>
                {branches.map((b: any) => (
                  <option key={b._id} value={b._id}>
                    {isRTL ? b.nameAr : (b.nameEn || b.nameAr)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label className="inline-flex items-center gap-2 text-sm ms-auto cursor-pointer"
            style={{ color: "var(--ink-700)" }}>
            <input type="checkbox" checked={hideZero}
              onChange={e => setHideZero(e.target.checked)} className="rounded" />
            {t("hideZeroBalances")}
          </label>
        </div>
      }
      summary={
        !loading && data ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Revenue */}
            <KPI
              label={isRTL ? "إجمالي الإيرادات" : "Total Revenue"}
              value={fmt(totalRevenue)}
              color="#6b1523" bg="#fdf2f4" border="#6b152330"
              hasRevenue={true}
            />
            {/* Gross Profit */}
            <KPI
              label={isRTL ? "مجمل الربح" : "Gross Profit"}
              value={grossProfit < 0 ? `(${fmt(Math.abs(grossProfit))})` : fmt(grossProfit)}
              pct={grossMarginPct}
              hasRevenue={hasRevenue}
              color={!hasRevenue ? "#64748b" : grossProfit >= 0 ? "#15803d" : "#dc2626"}
              bg={!hasRevenue ? "#f8fafc" : grossProfit >= 0 ? "#f0fdf4" : "#fef2f2"}
              border={!hasRevenue ? "#e2e8f0" : grossProfit >= 0 ? "#bbf7d0" : "#fecaca"}
            />
            {/* Operating Profit */}
            <KPI
              label={isRTL ? "ربح التشغيل" : "Operating Profit"}
              value={operatingProfit < 0 ? `(${fmt(Math.abs(operatingProfit))})` : fmt(operatingProfit)}
              pct={operatingMarginPct}
              hasRevenue={hasRevenue}
              color={!hasRevenue ? "#64748b" : operatingProfit >= 0 ? "#1d4ed8" : "#dc2626"}
              bg={!hasRevenue ? "#f8fafc" : operatingProfit >= 0 ? "#eff6ff" : "#fef2f2"}
              border={!hasRevenue ? "#e2e8f0" : operatingProfit >= 0 ? "#bfdbfe" : "#fecaca"}
            />
            {/* Net Income / Loss */}
            <KPI
              label={isRTL
                ? (netIncome >= 0 ? "صافي الربح" : "صافي الخسارة")
                : (netIncome >= 0 ? "Net Income" : "Net Loss")}
              value={netIncomeDisplay}
              pct={netMarginPct}
              hasRevenue={hasRevenue}
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

          {/* ── No-revenue warning ──────────────────────────────────────────── */}
          {noRevenue && <NoRevenueWarning isRTL={isRTL} hasExpenses={hasExpenses} />}

          <table className="w-full text-sm border-collapse">

            {/* ════════════════════════════════════════════════════════════════
                ① REVENUE
            ════════════════════════════════════════════════════════════════ */}
            <tbody>
              <SectionHeader label={isRTL ? "① الإيرادات" : "① Revenue"} bg="#6b1523" />

              {salesRevRows.length > 0 && (
                <SubHeader label={isRTL ? "إيرادات المبيعات" : "Sales Revenue"} />
              )}
              {salesRevRows.length === 0 && otherRevRows.length === 0
                ? <EmptyRow label={noData} />
                : salesRevRows.map((r, i) => (
                    <AccountRow key={r.accountId} code={r.code} name={accountName(r)}
                      amount={r.balance} fmt={fmt} i={i} />
                  ))
              }

              {otherRevRows.length > 0 && (
                <>
                  <SubHeader label={isRTL ? "إيرادات أخرى" : "Other Revenue"} />
                  {otherRevRows.map((r, i) => (
                    <AccountRow key={r.accountId} code={r.code} name={accountName(r)}
                      amount={r.balance} fmt={fmt} i={i} />
                  ))}
                </>
              )}

              <SubtotalRow
                label={isRTL ? "إجمالي الإيرادات" : "Total Revenue"}
                amount={totalRevenue} fmt={fmt} color="#6b1523"
              />
            </tbody>

            {/* ════════════════════════════════════════════════════════════════
                ② COGS
            ════════════════════════════════════════════════════════════════ */}
            <tbody>
              <Spacer />
              <SectionHeader
                label={isRTL ? "② تكلفة البضاعة المباعة (COGS)" : "② Cost of Goods Sold (COGS)"}
                bg="#b45309"
              />
              {cogsRows.length === 0
                ? <EmptyRow label={noData} />
                : cogsRows.map((r, i) => (
                    <AccountRow key={r.accountId} code={r.code} name={accountName(r)}
                      amount={r.balance} fmt={fmt} i={i} />
                  ))
              }
              <SubtotalRow
                label={isRTL ? "إجمالي التكلفة" : "Total COGS"}
                amount={totalCogs} fmt={fmt} color="#b45309" light
              />
            </tbody>

            {/* ── Gross Profit ─────────────────────────────────────────────── */}
            <tbody>
              <ResultRow
                label={isRTL ? "مجمل الربح (Gross Profit)" : "Gross Profit"}
                amount={grossProfit} pct={grossMarginPct} fmt={fmt}
                size="lg" hasRevenue={hasRevenue}
              />
            </tbody>

            {/* ════════════════════════════════════════════════════════════════
                ③ OPERATING EXPENSES
            ════════════════════════════════════════════════════════════════ */}
            <tbody>
              <Spacer />
              <SectionHeader
                label={isRTL ? "③ مصروفات التشغيل" : "③ Operating Expenses"}
                bg="#1e40af"
              />
              {opExpRows.length === 0
                ? <EmptyRow label={noData} />
                : opExpRows.map((r, i) => (
                    <AccountRow key={r.accountId} code={r.code} name={accountName(r)}
                      amount={r.balance} fmt={fmt} i={i} />
                  ))
              }
              <SubtotalRow
                label={isRTL ? "إجمالي مصروفات التشغيل" : "Total Operating Expenses"}
                amount={totalOperatingExp} fmt={fmt} color="#1e40af" light
              />
            </tbody>

            {/* ── Operating Profit ──────────────────────────────────────────── */}
            <tbody>
              <ResultRow
                label={isRTL ? "ربح التشغيل (Operating Profit)" : "Operating Profit"}
                amount={operatingProfit} pct={operatingMarginPct} fmt={fmt}
                size="lg" hasRevenue={hasRevenue}
              />
            </tbody>

            {/* ════════════════════════════════════════════════════════════════
                ④ NET INCOME / LOSS
            ════════════════════════════════════════════════════════════════ */}
            <tbody>
              <Spacer />
              <ResultRow
                label={netIncome >= 0
                  ? (isRTL ? "✅ صافي الربح (Net Income)" : "✅ Net Income")
                  : (isRTL ? "❌ صافي الخسارة (Net Loss)"  : "❌ Net Loss")}
                amount={netIncome} pct={netMarginPct} fmt={fmt}
                size="xl" hasRevenue={hasRevenue}
              />
            </tbody>

            {/* ── Margin footer ────────────────────────────────────────────── */}
            <tbody>
              <Spacer />
              <tr style={{ background: "#f8fafc", borderTop: "1px solid var(--ink-200)" }}>
                <td colSpan={3} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-6 text-[11.5px]">
                    <span className="font-bold" style={{ color: "var(--ink-500)" }}>
                      {isRTL ? "نسب الربحية:" : "Profit Margins:"}
                    </span>

                    {/* Gross Margin */}
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: "var(--ink-500)" }}>
                        {isRTL ? "هامش المجمل" : "Gross Margin"}
                      </span>
                      {hasRevenue ? (
                        <span className="font-black px-2 py-0.5 rounded-full text-[11px]"
                          style={{
                            background: grossProfit >= 0 ? "#f0fdf4" : "#fef2f2",
                            color: grossProfit >= 0 ? "#15803d" : "#dc2626",
                          }}>
                          {grossMarginPct}%
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ background: "#f1f5f9", color: "#64748b" }}>N/A</span>
                      )}
                    </div>

                    {/* Operating Margin */}
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: "var(--ink-500)" }}>
                        {isRTL ? "هامش التشغيل" : "Operating Margin"}
                      </span>
                      {hasRevenue ? (
                        <span className="font-black px-2 py-0.5 rounded-full text-[11px]"
                          style={{
                            background: operatingProfit >= 0 ? "#eff6ff" : "#fef2f2",
                            color: operatingProfit >= 0 ? "#1d4ed8" : "#dc2626",
                          }}>
                          {operatingMarginPct}%
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ background: "#f1f5f9", color: "#64748b" }}>N/A</span>
                      )}
                    </div>

                    {/* Net Margin */}
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: "var(--ink-500)" }}>
                        {isRTL ? "هامش الصافي" : "Net Margin"}
                      </span>
                      {hasRevenue ? (
                        <span className="font-black px-2 py-0.5 rounded-full text-[11px]"
                          style={{
                            background: netIncome >= 0 ? "#f0fdf4" : "#fef2f2",
                            color: netIncome >= 0 ? "#15803d" : "#dc2626",
                          }}>
                          {netMarginPct}%
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ background: "#f1f5f9", color: "#64748b" }}>N/A</span>
                      )}
                    </div>

                    {!hasRevenue && (
                      <span className="text-[10.5px] ms-auto italic" style={{ color: "#94a3b8" }}>
                        {isRTL
                          ? "* النسب تُحسب بعد تسجيل إيرادات"
                          : "* Margins calculated once revenue is recorded"}
                      </span>
                    )}
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
