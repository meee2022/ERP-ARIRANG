// @ts-nocheck
"use client";
import React, { useState, useMemo } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Scale, Download, ChevronDown } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { SummaryStrip } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { PrintableReportPage } from "@/components/ui/printable-report";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { usePermissions } from "@/hooks/usePermissions";
import * as XLSX from "xlsx";

function startOfYearISO() { return `${new Date().getFullYear()}-01-01`; }
function todayISO() { return new Date().toISOString().split("T")[0]; }

// ── Account type ordering & labels ──────────────────────────────────────────
const TYPE_ORDER = ["asset", "liability", "equity", "revenue", "expense"] as const;

const TYPE_LABELS_AR: Record<string, string> = {
  asset:     "أصول",
  liability: "خصوم",
  equity:    "حقوق الملكية",
  revenue:   "إيرادات",
  expense:   "مصروفات",
};
const TYPE_LABELS_EN: Record<string, string> = {
  asset:     "Assets",
  liability: "Liabilities",
  equity:    "Equity",
  revenue:   "Revenue",
  expense:   "Expenses",
};

export default function TrialBalancePage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { canView } = usePermissions();
  const { company: printCompany } = useCompanySettings();
  const [fromDate, setFromDate] = useState(startOfYearISO());
  const [toDate, setToDate] = useState(todayISO());
  const [includeZero, setIncludeZero] = useState(false);
  const [levelFilter, setLevelFilter] = useState<number | "all">("all");
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(TYPE_ORDER));

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const data = useQuery(
    api.reports.getTrialBalance,
    company ? { companyId: company._id, fromDate, toDate, includeZero, branchId: branchArg as any } : "skip"
  );
  const loading = data === undefined;
  const rawRows = data?.rows ?? [];
  const totals = data?.totals ?? { totalDebit: 0, totalCredit: 0, openingDebit: 0, openingCredit: 0, closingDebit: 0, closingCredit: 0 };
  const isBalanced = Math.abs(totals.totalDebit - totals.totalCredit) < 1;

  // ── Level filter ─────────────────────────────────────────────────────────
  const maxLevel = useMemo(() => {
    if (!rawRows.length) return 0;
    return Math.max(...rawRows.map((r: any) => r.level ?? 0));
  }, [rawRows]);

  const rows = useMemo(() => {
    if (levelFilter === "all") return rawRows;
    return rawRows.filter((r: any) => (r.level ?? 0) <= levelFilter);
  }, [rawRows, levelFilter]);

  // ── Group by account type ─────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    TYPE_ORDER.forEach((type) => map.set(type, []));
    for (const row of rows) {
      const type = row.accountType ?? "asset";
      if (!map.has(type)) map.set(type, []);
      map.get(type)!.push(row);
    }
    return map;
  }, [rows]);

  function subtotals(groupRows: any[]) {
    return {
      openingDebit:  groupRows.reduce((s, r) => s + r.openingDebit,  0),
      openingCredit: groupRows.reduce((s, r) => s + r.openingCredit, 0),
      periodDebit:   groupRows.reduce((s, r) => s + r.periodDebit,   0),
      periodCredit:  groupRows.reduce((s, r) => s + r.periodCredit,  0),
      closingDebit:  groupRows.reduce((s, r) => s + r.closingDebit,  0),
      closingCredit: groupRows.reduce((s, r) => s + r.closingCredit, 0),
    };
  }

  function toggleType(type: string) {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  }

  // ── Excel export ──────────────────────────────────────────────────────────
  function exportToExcel() {
    const headers = [
      t("accountCode"),
      isRTL ? "اسم الحساب" : "Account Name",
      isRTL ? "نوع الحساب" : "Type",
      isRTL ? "الطبيعة" : "Nature",
      t("openingDebit"), t("openingCredit"),
      t("debit"), t("credit"),
      t("closingDebit"), t("closingCredit"),
    ];
    const wsData: any[][] = [headers];

    for (const type of TYPE_ORDER) {
      const groupRows = grouped.get(type) ?? [];
      if (!groupRows.length) continue;
      const typeLabel = isRTL ? TYPE_LABELS_AR[type] : TYPE_LABELS_EN[type];
      wsData.push([`── ${typeLabel} ──`, "", "", "", "", "", "", "", "", ""]);
      for (const row of groupRows) {
        wsData.push([
          row.accountCode,
          isRTL ? row.accountNameAr : (row.accountNameEn || row.accountNameAr),
          typeLabel,
          row.normalBalance === "debit" ? (isRTL ? "مدين" : "Debit") : (isRTL ? "دائن" : "Credit"),
          row.openingDebit || 0, row.openingCredit || 0,
          row.periodDebit  || 0, row.periodCredit  || 0,
          row.closingDebit || 0, row.closingCredit || 0,
        ]);
      }
      const sub = subtotals(groupRows);
      wsData.push([
        isRTL ? `إجمالي ${typeLabel}` : `Total ${typeLabel}`,
        "", "", "",
        sub.openingDebit, sub.openingCredit,
        sub.periodDebit,  sub.periodCredit,
        sub.closingDebit, sub.closingCredit,
      ]);
      wsData.push([]);
    }
    wsData.push([
      isRTL ? "الإجمالي الكلي" : "Grand Total", "", "", "",
      totals.openingDebit, totals.openingCredit,
      totals.totalDebit,   totals.totalCredit,
      totals.closingDebit, totals.closingCredit,
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [
      { wch: 16 }, { wch: 36 }, { wch: 14 }, { wch: 10 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isRTL ? "ميزان المراجعة" : "Trial Balance");
    XLSX.writeFile(wb, `trial-balance-${fromDate}-to-${toDate}.xlsx`);
  }

  if (!canView("reports")) {
    return <EmptyState icon={Scale} title={t("permissionDenied")} />;
  }

  const typeLabel = (type: string) => isRTL ? TYPE_LABELS_AR[type] : TYPE_LABELS_EN[type];

  // ── Filters panel ─────────────────────────────────────────────────────────
  const filtersNode = (
    <FilterPanel
      right={
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[color:var(--ink-600)]">{isRTL ? "المستوى" : "Level"}:</span>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="input-field h-8 text-xs w-auto pr-6"
            >
              <option value="all">{isRTL ? "كل المستويات" : "All levels"}</option>
              {Array.from({ length: maxLevel + 1 }, (_, i) => (
                <option key={i} value={i}>{isRTL ? `مستوى ${i + 1}` : `Level ${i + 1}`}</option>
              ))}
            </select>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-[color:var(--ink-700)] cursor-pointer select-none">
            <input type="checkbox" checked={includeZero} onChange={e => setIncludeZero(e.target.checked)} className="rounded" />
            {t("includeZeroBalances")}
          </label>
        </div>
      }
    >
      <FilterField label={t("fromDate")}>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input-field h-8 w-auto text-sm" />
      </FilterField>
      <FilterField label={t("toDate")}>
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input-field h-8 w-auto text-sm" />
      </FilterField>
    </FilterPanel>
  );

  // ── Summary strip ─────────────────────────────────────────────────────────
  const summaryNode = (
    <SummaryStrip items={[
      { label: t("totalDebit"),  value: formatCurrency(totals.totalDebit),  borderColor: "var(--brand-600)", accent: "var(--ink-900)" },
      { label: t("totalCredit"), value: formatCurrency(totals.totalCredit), borderColor: "var(--gold-400)",  accent: "var(--ink-900)" },
      {
        label: t("difference"),
        value: formatCurrency(Math.abs(totals.totalDebit - totals.totalCredit)),
        borderColor: isBalanced ? "#16a34a" : "#dc2626",
        accent: isBalanced ? "#16a34a" : "#dc2626",
      },
    ]} />
  );

  return (
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={t("trialBalanceTitle")}
      period={`${fromDate} — ${toDate}`}
      actions={
        <button
          onClick={exportToExcel}
          disabled={loading || rows.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium btn-ghost disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          {isRTL ? "تصدير Excel" : "Export Excel"}
        </button>
      }
      filters={filtersNode}
      summary={summaryNode}
    >
      {/* Table */}
      {loading ? (
        <div className="loading-spinner py-16">
          <div className="spinner" />
          <span className="spinner-label">{t("loading") ?? "Loading…"}</span>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Scale} title={t("noResults")} message={t("tryChangingFilters") ?? "Try adjusting the date range or enabling zero balances."} />
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("accountCode")}</th>
                <th>{t("account")}</th>
                <th className="text-center">{isRTL ? "الطبيعة" : "Nature"}</th>
                <th className="text-end">{t("openingDebit")}</th>
                <th className="text-end">{t("openingCredit")}</th>
                <th className="text-end">{t("debit")}</th>
                <th className="text-end">{t("credit")}</th>
                <th className="text-end">{t("closingDebit")}</th>
                <th className="text-end">{t("closingCredit")}</th>
              </tr>
            </thead>
            <tbody>
              {TYPE_ORDER.map((type) => {
                const groupRows = grouped.get(type) ?? [];
                if (!groupRows.length) return null;
                const isExpanded = expandedTypes.has(type);
                const sub = subtotals(groupRows);

                return (
                  <React.Fragment key={type}>
                    {/* ── Type section header ── */}
                    <tr
                      className="tb-group-header cursor-pointer select-none"
                      onClick={() => toggleType(type)}
                    >
                      <td colSpan={3}>
                        <div className="flex items-center gap-2 font-bold text-sm" style={{ color: BRAND }}>
                          <ChevronDown
                            className="h-4 w-4 no-print transition-transform"
                            style={{ transform: isExpanded ? "rotate(0deg)" : (isRTL ? "rotate(90deg)" : "rotate(-90deg)") }}
                          />
                          {typeLabel(type)}
                          <span className="text-xs font-normal no-print" style={{ color: "#6b7280" }}>
                            ({groupRows.length})
                          </span>
                        </div>
                      </td>
                      <td className="text-end numeric font-semibold text-xs" style={{ color: BRAND }}>
                        {sub.openingDebit ? formatCurrency(sub.openingDebit) : "—"}
                      </td>
                      <td className="text-end numeric font-semibold text-xs" style={{ color: BRAND }}>
                        {sub.openingCredit ? formatCurrency(sub.openingCredit) : "—"}
                      </td>
                      <td className="text-end numeric font-semibold text-xs" style={{ color: BRAND }}>
                        {sub.periodDebit ? formatCurrency(sub.periodDebit) : "—"}
                      </td>
                      <td className="text-end numeric font-semibold text-xs" style={{ color: BRAND }}>
                        {sub.periodCredit ? formatCurrency(sub.periodCredit) : "—"}
                      </td>
                      <td className="text-end numeric font-semibold text-xs" style={{ color: BRAND }}>
                        {sub.closingDebit ? formatCurrency(sub.closingDebit) : "—"}
                      </td>
                      <td className="text-end numeric font-semibold text-xs" style={{ color: BRAND }}>
                        {sub.closingCredit ? formatCurrency(sub.closingCredit) : "—"}
                      </td>
                    </tr>

                    {/* ── Account rows (collapsible on screen, always visible on print) ── */}
                    {(isExpanded || true) && groupRows.map((row: any, idx: number) => (
                      <tr
                        key={row.accountId}
                        className={`tb-account-row ${isExpanded ? "" : "screen-only"}`}
                      >
                        <td className="code" style={{ paddingInlineStart: `${16 + (row.level ?? 0) * 12}px` }}>
                          {row.accountCode}
                        </td>
                        <td>{isRTL ? row.accountNameAr : (row.accountNameEn || row.accountNameAr)}</td>
                        <td className="text-center">
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{
                              background: row.normalBalance === "debit" ? "#fef2f2" : "#fefce8",
                              color: row.normalBalance === "debit" ? BRAND : "#a16207",
                            }}
                          >
                            {row.normalBalance === "debit" ? (isRTL ? "مدين" : "Dr") : (isRTL ? "دائن" : "Cr")}
                          </span>
                        </td>
                        <td className="text-end numeric muted">{row.openingDebit  ? formatCurrency(row.openingDebit)  : "—"}</td>
                        <td className="text-end numeric muted">{row.openingCredit ? formatCurrency(row.openingCredit) : "—"}</td>
                        <td className="text-end numeric">{row.periodDebit  ? formatCurrency(row.periodDebit)  : "—"}</td>
                        <td className="text-end numeric">{row.periodCredit ? formatCurrency(row.periodCredit) : "—"}</td>
                        <td className="text-end numeric" style={{ fontWeight: 600 }}>{row.closingDebit  ? formatCurrency(row.closingDebit)  : "—"}</td>
                        <td className="text-end numeric" style={{ fontWeight: 600 }}>{row.closingCredit ? formatCurrency(row.closingCredit) : "—"}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="row-total">
                <td colSpan={3}>{t("total")}</td>
                <td className="text-end numeric">{formatCurrency(totals.openingDebit)}</td>
                <td className="text-end numeric">{formatCurrency(totals.openingCredit)}</td>
                <td className="text-end numeric">{formatCurrency(totals.totalDebit)}</td>
                <td className="text-end numeric">{formatCurrency(totals.totalCredit)}</td>
                <td className="text-end numeric">{formatCurrency(totals.closingDebit)}</td>
                <td className="text-end numeric">{formatCurrency(totals.closingCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </PrintableReportPage>
  );
}

const BRAND = "#6b1523";
