// @ts-nocheck
"use client";
import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAppStore } from "@/store/useAppStore";
import { LoadingState } from "@/components/ui/data-display";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PrintableReportPage, ReportBanner } from "@/components/ui/printable-report";
import { Scale, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

function todayISO() { return new Date().toISOString().split("T")[0]; }

// ── Sub-type ordering & labels ────────────────────────────────────────────────
const ASSET_ORDER     = ["current_asset", "cash", "receivable", "inventory", "prepaid", "fixed_asset", "other_asset"];
const LIABILITY_ORDER = ["current_liability", "payable", "tax_payable", "accrual", "long_term_liability"];
const EQUITY_ORDER    = ["capital", "retained_earnings", "other_equity"];

const SUBTYPE_LABELS: Record<string, { ar: string; en: string }> = {
  current_asset:       { ar: "أصول متداولة",          en: "Current Assets" },
  cash:                { ar: "النقدية",                en: "Cash" },
  receivable:          { ar: "الذمم المدينة",          en: "Receivables" },
  inventory:           { ar: "المخزون",                en: "Inventory" },
  prepaid:             { ar: "مدفوعات مقدمة",         en: "Prepaid" },
  fixed_asset:         { ar: "الأصول الثابتة",         en: "Fixed Assets" },
  other_asset:         { ar: "أصول أخرى",              en: "Other Assets" },
  current_liability:   { ar: "التزامات متداولة",        en: "Current Liabilities" },
  payable:             { ar: "الذمم الدائنة",           en: "Payables" },
  tax_payable:         { ar: "ضرائب مستحقة",           en: "Tax Payable" },
  accrual:             { ar: "مستحقات",                en: "Accruals" },
  long_term_liability: { ar: "التزامات طويلة الأجل",   en: "Long-term Liabilities" },
  capital:             { ar: "رأس المال",               en: "Capital" },
  retained_earnings:   { ar: "أرباح محتجزة",           en: "Retained Earnings" },
  other_equity:        { ar: "حقوق ملكية أخرى",       en: "Other Equity" },
  other:               { ar: "أخرى",                    en: "Other" },
};

function groupBySubType(accounts: any[], order: string[]) {
  const groups: Record<string, any[]> = {};
  for (const acc of accounts) {
    const st = acc.accountSubType || "other";
    if (!groups[st]) groups[st] = [];
    groups[st].push(acc);
  }
  const sortedKeys = [
    ...order.filter((k) => groups[k]),
    ...Object.keys(groups).filter((k) => !order.includes(k)),
  ];
  return sortedKeys.map((key) => ({ subType: key, accounts: groups[key] }));
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KPI({ label, value, color, bg, border, hint }: any) {
  return (
    <div className="rounded-2xl border p-4" style={{ background: bg, borderColor: border }}>
      <p className="text-[10.5px] font-semibold uppercase tracking-wide mb-1" style={{ color }}>{label}</p>
      <p className="text-[20px] font-black tabular-nums leading-tight" style={{ color }}>{value}</p>
      {hint !== undefined && (
        <p className="text-[10.5px] mt-0.5" style={{ color: color + "aa" }}>{hint}</p>
      )}
    </div>
  );
}

// ─── Section header band ──────────────────────────────────────────────────────
function SectionHeader({ label, bg }: { label: string; bg: string }) {
  return (
    <tr>
      <td colSpan={3} className="px-4 py-2.5 text-[11px] font-black uppercase tracking-widest"
        style={{ background: bg, color: "rgba(255,255,255,0.92)" }}>
        {label}
      </td>
    </tr>
  );
}

// ─── Sub-type header (within a section) ───────────────────────────────────────
function SubTypeHeader({ label }: { label: string }) {
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
        style={{ color: amount < 0 ? "#dc2626" : "#1e293b" }}>
        {fmt(amount)}
      </td>
    </tr>
  );
}

// ─── Special row (Current Period Income) ──────────────────────────────────────
function SpecialRow({ label, amount, fmt }: any) {
  const positive = amount >= 0;
  return (
    <tr style={{ background: positive ? "#f0fdf4" : "#fef2f2", borderBottom: "1px solid #f1f5f9" }}>
      <td className="px-4 py-[8px] whitespace-nowrap w-36">
        <span className="font-mono text-[10.5px] px-2 py-0.5 rounded"
          style={{ background: positive ? "#bbf7d0" : "#fecaca",
            color: positive ? "#15803d" : "#dc2626" }}>★</span>
      </td>
      <td className="px-4 py-[8px] text-[12.5px] italic font-semibold"
        style={{ color: positive ? "#15803d" : "#dc2626" }}>{label}</td>
      <td className="px-4 py-[8px] tabular-nums text-[12.5px] font-bold text-end whitespace-nowrap w-36"
        style={{ color: positive ? "#15803d" : "#dc2626" }}>
        {positive ? fmt(amount) : `(${fmt(Math.abs(amount))})`}
      </td>
    </tr>
  );
}

// ─── Subtotal row ─────────────────────────────────────────────────────────────
function SubtotalRow({ label, amount, fmt, color }: any) {
  return (
    <tr style={{ background: `${color}12`, borderTop: `1.5px solid ${color}30` }}>
      <td colSpan={2} className="px-4 py-2.5 text-[12px] font-bold" style={{ color }}>{label}</td>
      <td className="px-4 py-2.5 tabular-nums text-[13px] font-black text-end whitespace-nowrap" style={{ color }}>
        {fmt(amount)}
      </td>
    </tr>
  );
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

// ─── Spacer row ───────────────────────────────────────────────────────────────
function Spacer() {
  return <tr><td colSpan={3} style={{ height: 14 }} /></tr>;
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function BalanceSheetPage() {
  const { t, isRTL, formatCurrency: fmt } = useI18n();
  const { company: printCompany } = useCompanySettings();
  const [asOfDate, setAsOfDate] = useState(todayISO());
  const [hideZero, setHideZero] = useState(true);

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const companies = useQuery(api.seed.getCompanies, {});
  const company   = companies?.[0];
  const branches  = useQuery(api.branches.getAll, company ? { companyId: company._id } : "skip");

  const data = useQuery(
    api.reports.getBalanceSheet,
    company ? { companyId: company._id, asOfDate, branchId: branchArg as any } : "skip"
  );

  const loading = data === undefined;

  // ── Filtered rows ───────────────────────────────────────────────────────────
  const filt = (rows: any[]) =>
    hideZero ? (rows ?? []).filter((a: any) => a.balance !== 0) : (rows ?? []);

  const assetRows     = filt(data?.assets?.accounts);
  const liabilityRows = filt(data?.liabilities?.accounts);
  const equityRows    = filt(data?.equity?.accounts);

  const totalAssets         = data?.totalAssets ?? 0;
  const totalLiabilities    = data?.liabilities?.total ?? 0;
  const totalEquity         = data?.equity?.total ?? 0;
  const retainedEarnings    = data?.equity?.retainedEarnings ?? 0;
  const totalLiabAndEquity  = data?.totalLiabilitiesAndEquity ?? 0;
  const isBalanced          = data?.isBalanced ?? false;
  const difference          = totalAssets - totalLiabAndEquity;

  // ── Detect data quality issues ──────────────────────────────────────────────
  const hasNegativeAssets = totalAssets < 0;
  const netWorth          = totalAssets - totalLiabilities;

  const accountName = (r: any) => isRTL ? r.nameAr : (r.nameEn || r.nameAr);
  const noData      = isRTL ? "لا توجد حسابات" : "No accounts";
  const subLabel    = (st: string) => {
    const lbl = SUBTYPE_LABELS[st];
    return lbl ? (isRTL ? lbl.ar : lbl.en) : st;
  };

  const assetGroups     = groupBySubType(assetRows,     ASSET_ORDER);
  const liabilityGroups = groupBySubType(liabilityRows, LIABILITY_ORDER);
  const equityGroups    = groupBySubType(equityRows,    EQUITY_ORDER);

  return (
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={t("balanceSheetTitle")}
      period={`${t("asOfDateLabel")}: ${asOfDate}`}
      filters={
        <div className="surface-card p-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: "var(--ink-500)" }}>{t("asOfDateLabel")}:</span>
            <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)}
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
            <KPI
              label={isRTL ? "إجمالي الأصول" : "Total Assets"}
              value={fmt(totalAssets)}
              color={totalAssets >= 0 ? "#6b1523" : "#dc2626"}
              bg={totalAssets >= 0 ? "#fdf2f4" : "#fef2f2"}
              border={totalAssets >= 0 ? "#6b152330" : "#fecaca"}
              hint={isRTL ? "ما تملكه الشركة" : "What the company owns"}
            />
            <KPI
              label={isRTL ? "إجمالي الخصوم" : "Total Liabilities"}
              value={fmt(totalLiabilities)}
              color="#1d4ed8" bg="#eff6ff" border="#bfdbfe"
              hint={isRTL ? "ما تدين به الشركة" : "What the company owes"}
            />
            <KPI
              label={isRTL ? "إجمالي حقوق الملكية" : "Total Equity"}
              value={totalEquity < 0 ? `(${fmt(Math.abs(totalEquity))})` : fmt(totalEquity)}
              color={totalEquity >= 0 ? "#15803d" : "#dc2626"}
              bg={totalEquity >= 0 ? "#f0fdf4" : "#fef2f2"}
              border={totalEquity >= 0 ? "#bbf7d0" : "#fecaca"}
              hint={isRTL ? "حقوق المساهمين" : "Owners' equity"}
            />
            <KPI
              label={isRTL ? "صافي القيمة" : "Net Worth"}
              value={netWorth < 0 ? `(${fmt(Math.abs(netWorth))})` : fmt(netWorth)}
              color={netWorth >= 0 ? "#15803d" : "#dc2626"}
              bg={netWorth >= 0 ? "#f0fdf4" : "#fef2f2"}
              border={netWorth >= 0 ? "#bbf7d0" : "#fecaca"}
              hint={isRTL ? "أصول − خصوم" : "Assets − Liabilities"}
            />
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <LoadingState label={t("loading")} />
      ) : (
        <div className="overflow-x-auto">

          {/* ── Balance status banner (screen only) ──────────────────────── */}
          {isBalanced ? (
            <ReportBanner
              variant="success"
              title={isRTL
                ? "✅ الميزانية متوازنة — الأصول = الخصوم + حقوق الملكية"
                : "✅ Balance Sheet is Balanced — Assets = Liabilities + Equity"}
              rightSlot={fmt(totalAssets)}
            />
          ) : (
            <ReportBanner
              variant="error"
              title={isRTL ? "⚠️ الميزانية غير متوازنة" : "⚠️ Balance Sheet is Out of Balance"}
              rightSlot={`${isRTL ? "الفرق: " : "Difference: "}${fmt(Math.abs(difference))}`}
            >
              <p className="font-semibold mb-1.5">
                {isRTL
                  ? "إجمالي الأصول لا يساوي إجمالي الخصوم وحقوق الملكية:"
                  : "Total Assets does not equal Total Liabilities + Equity:"}
              </p>
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div>
                  <span className="opacity-70">{isRTL ? "الأصول: " : "Assets: "}</span>
                  <span className="font-bold">{fmt(totalAssets)}</span>
                </div>
                <div>
                  <span className="opacity-70">{isRTL ? "الخصوم + حقوق الملكية: " : "Liab. + Equity: "}</span>
                  <span className="font-bold">{fmt(totalLiabAndEquity)}</span>
                </div>
              </div>
              <p className="mt-2 text-[11.5px]">
                {isRTL
                  ? "تأكد من أن جميع القيود اليومية متوازنة ومرحَّلة، وأن تصنيف الحسابات صحيح."
                  : "Ensure all journal entries are balanced and posted, and account classifications are correct."}
              </p>
            </ReportBanner>
          )}

          {/* ── Negative assets warning (data quality) ───────────────────── */}
          {hasNegativeAssets && (
            <ReportBanner
              variant="warning"
              title={isRTL ? "⚠️ تنبيه: الأصول سالبة" : "⚠️ Warning: Negative Assets"}
            >
              {isRTL
                ? "إجمالي الأصول قيمته سالبة، وهو أمر غير طبيعي محاسبياً. الأسباب المحتملة: قيود معكوسة (دائن بدلاً من مدين)، أو حسابات مصنفة بشكل خاطئ كأصول."
                : "Total assets show a negative value, which is accounting-abnormal. Possible causes: reversed entries (credit instead of debit), or accounts misclassified as assets."}
            </ReportBanner>
          )}

          <table className="w-full text-sm border-collapse">

            {/* ════════════════════════════════════════════════════════════════
                ① ASSETS
            ════════════════════════════════════════════════════════════════ */}
            <tbody>
              <SectionHeader label={isRTL ? "① الأصول" : "① Assets"} bg="#6b1523" />

              {assetGroups.length === 0 ? (
                <EmptyRow label={noData} />
              ) : (
                assetGroups.map(({ subType, accounts }) => (
                  <React.Fragment key={subType}>
                    <SubTypeHeader label={subLabel(subType)} />
                    {accounts.map((row: any, i: number) => (
                      <AccountRow key={row.accountId} code={row.code} name={accountName(row)}
                        amount={row.balance} fmt={fmt} i={i} />
                    ))}
                  </React.Fragment>
                ))
              )}

              <SubtotalRow
                label={isRTL ? "إجمالي الأصول" : "Total Assets"}
                amount={totalAssets} fmt={fmt} color="#6b1523"
              />
            </tbody>

            {/* ════════════════════════════════════════════════════════════════
                ② LIABILITIES
            ════════════════════════════════════════════════════════════════ */}
            <tbody>
              <Spacer />
              <SectionHeader label={isRTL ? "② الخصوم" : "② Liabilities"} bg="#1e40af" />

              {liabilityGroups.length === 0 ? (
                <EmptyRow label={isRTL ? "لا توجد التزامات مسجلة" : "No liabilities recorded"} />
              ) : (
                liabilityGroups.map(({ subType, accounts }) => (
                  <React.Fragment key={subType}>
                    <SubTypeHeader label={subLabel(subType)} />
                    {accounts.map((row: any, i: number) => (
                      <AccountRow key={row.accountId} code={row.code} name={accountName(row)}
                        amount={row.balance} fmt={fmt} i={i} />
                    ))}
                  </React.Fragment>
                ))
              )}

              <SubtotalRow
                label={isRTL ? "إجمالي الخصوم" : "Total Liabilities"}
                amount={totalLiabilities} fmt={fmt} color="#1e40af"
              />
            </tbody>

            {/* ════════════════════════════════════════════════════════════════
                ③ EQUITY
            ════════════════════════════════════════════════════════════════ */}
            <tbody>
              <Spacer />
              <SectionHeader label={isRTL ? "③ حقوق الملكية" : "③ Equity"} bg="#15803d" />

              {equityGroups.length === 0 && retainedEarnings === 0 ? (
                <EmptyRow label={isRTL ? "لا توجد حقوق ملكية مسجلة" : "No equity recorded"} />
              ) : (
                <>
                  {equityGroups.map(({ subType, accounts }) => (
                    <React.Fragment key={subType}>
                      <SubTypeHeader label={subLabel(subType)} />
                      {accounts.map((row: any, i: number) => (
                        <AccountRow key={row.accountId} code={row.code} name={accountName(row)}
                          amount={row.balance} fmt={fmt} i={i} />
                      ))}
                    </React.Fragment>
                  ))}
                  {/* Current Period Income highlighted */}
                  <SubTypeHeader label={isRTL ? "ربح / خسارة الفترة الحالية" : "Current Period Income / Loss"} />
                  <SpecialRow
                    label={retainedEarnings >= 0
                      ? (isRTL ? "صافي ربح الفترة" : "Current Period Net Income")
                      : (isRTL ? "صافي خسارة الفترة" : "Current Period Net Loss")}
                    amount={retainedEarnings} fmt={fmt}
                  />
                </>
              )}

              <SubtotalRow
                label={isRTL ? "إجمالي حقوق الملكية" : "Total Equity"}
                amount={totalEquity} fmt={fmt} color="#15803d"
              />
            </tbody>

            {/* ════════════════════════════════════════════════════════════════
                ④ TOTAL LIAB + EQUITY (the Balance Sheet identity)
            ════════════════════════════════════════════════════════════════ */}
            <tbody>
              <Spacer />
              <tr style={{
                background: isBalanced ? "#f0fdf4" : "#fef2f2",
                borderTop: `2.5px solid ${isBalanced ? "#bbf7d0" : "#fecaca"}`,
              }}>
                <td colSpan={2} className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="h-7 w-7 rounded-lg flex items-center justify-center"
                      style={{ background: isBalanced ? "#15803d20" : "#dc262620" }}>
                      <Scale className="h-4 w-4"
                        style={{ color: isBalanced ? "#15803d" : "#dc2626" }} />
                    </span>
                    <span className="font-black text-[14px]"
                      style={{ color: isBalanced ? "#15803d" : "#dc2626" }}>
                      {isRTL ? "إجمالي الخصوم + حقوق الملكية" : "Total Liabilities + Equity"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5 tabular-nums font-black text-end whitespace-nowrap text-[16px]"
                  style={{ color: isBalanced ? "#15803d" : "#dc2626" }}>
                  {fmt(totalLiabAndEquity)}
                </td>
              </tr>
            </tbody>

            {/* ── Accounting equation footer ───────────────────────────────── */}
            <tbody>
              <Spacer />
              <tr style={{ background: "#f8fafc", borderTop: "1px solid var(--ink-200)" }}>
                <td colSpan={3} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-center gap-3 text-[12px] font-mono">
                    <span className="font-bold" style={{ color: "var(--ink-500)" }}>
                      {isRTL ? "المعادلة المحاسبية:" : "Accounting Equation:"}
                    </span>
                    <span className="px-2.5 py-1 rounded-md font-black"
                      style={{ background: "#fdf2f4", color: "#6b1523" }}>
                      {isRTL ? "أصول" : "Assets"} = {fmt(totalAssets)}
                    </span>
                    <span style={{ color: "var(--ink-400)" }}>=</span>
                    <span className="px-2.5 py-1 rounded-md font-black"
                      style={{ background: "#eff6ff", color: "#1d4ed8" }}>
                      {isRTL ? "خصوم" : "Liab."} {fmt(totalLiabilities)}
                    </span>
                    <span style={{ color: "var(--ink-400)" }}>+</span>
                    <span className="px-2.5 py-1 rounded-md font-black"
                      style={{ background: "#f0fdf4", color: "#15803d" }}>
                      {isRTL ? "ملكية" : "Equity"} {fmt(totalEquity)}
                    </span>
                    {!isBalanced && (
                      <>
                        <span style={{ color: "var(--ink-400)" }}>|</span>
                        <span className="px-2.5 py-1 rounded-md font-black"
                          style={{ background: "#fef2f2", color: "#dc2626" }}>
                          {isRTL ? "الفرق" : "Diff"} {fmt(Math.abs(difference))}
                        </span>
                      </>
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
