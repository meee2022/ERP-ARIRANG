// @ts-nocheck
"use client";
import React, { useState, useMemo } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatDateShort } from "@/lib/utils";
import {
  BookOpen, ArrowDownToLine, ArrowUpFromLine, Wallet,
  Hash, Download, LayoutList, FileText, ShoppingCart,
  Receipt, ArrowLeftRight, CreditCard, Layers
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PrintableReportPage } from "@/components/ui/printable-report";
import * as XLSX from "xlsx";

function startOfYearISO() { return new Date().getFullYear() + "-01-01"; }
function todayISO()       { return new Date().toISOString().split("T")[0]; }

// ─── Journal type pills config ────────────────────────────────────────────────
const JOURNAL_TYPES = [
  { value: "all",        Icon: LayoutList,    color: "#6b1523", bg: "#fdf2f4", labelAr: "الكل",        labelEn: "All"        },
  { value: "sales",      Icon: ShoppingCart,  color: "#16a34a", bg: "#f0fdf4", labelAr: "مبيعات",      labelEn: "Sales"      },
  { value: "purchase",   Icon: Receipt,       color: "#2563eb", bg: "#eff6ff", labelAr: "مشتريات",     labelEn: "Purchase"   },
  { value: "payment",    Icon: ArrowUpFromLine, color: "#dc2626", bg: "#fef2f2", labelAr: "مدفوعات",   labelEn: "Payment"    },
  { value: "receipt",    Icon: ArrowDownToLine, color: "#059669", bg: "#ecfdf5", labelAr: "مقبوضات",  labelEn: "Receipt"    },
  { value: "manual",     Icon: FileText,      color: "#6b1523", bg: "#fdf2f4", labelAr: "يدوي",        labelEn: "Manual"     },
  { value: "transfer",   Icon: ArrowLeftRight, color: "#7c3aed", bg: "#f5f3ff", labelAr: "تحويل",     labelEn: "Transfer"   },
  { value: "bank",       Icon: CreditCard,    color: "#0891b2", bg: "#ecfeff", labelAr: "بنكي",        labelEn: "Bank"       },
] as const;

const JT_INFO = (jt: string | null) => JOURNAL_TYPES.find((x) => x.value === jt) ?? null;

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KPI({ label, value, color, bg, border, hint, Icon }: any) {
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
      <p className="text-[18px] font-black tabular-nums leading-tight" style={{ color }}>{value}</p>
      {hint && <p className="text-[10.5px] mt-0.5" style={{ color: color + "aa" }}>{hint}</p>}
    </div>
  );
}

// ─── Journal-type badge ───────────────────────────────────────────────────────
function JournalTypeBadge({ type, isRTL }: { type: string | null; isRTL: boolean }) {
  const info = JT_INFO(type);
  if (!info) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
        style={{ background: "#f1f5f9", color: "#64748b" }}>
        {type ?? "—"}
      </span>
    );
  }
  const Icon = info.Icon;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap"
      style={{ background: info.bg, color: info.color }}>
      <Icon className="h-2.5 w-2.5" />
      {isRTL ? info.labelAr : info.labelEn}
    </span>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function GeneralLedgerPage() {
  const { t, isRTL, formatCurrency: fmt } = useI18n();
  const { company: printCompany } = useCompanySettings();
  const [fromDate, setFromDate] = useState(startOfYearISO());
  const [toDate,   setToDate]   = useState(todayISO());
  const [accountId, setAccountId] = useState("");
  const [journalTypeFilter, setJournalTypeFilter] = useState<string>("all");

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const companies = useQuery(api.seed.getCompanies, {});
  const company   = companies?.[0];
  const accounts  = useQuery(api.accounts.getAll, company ? { companyId: company._id } : "skip");
  const postableAccounts = (accounts ?? []).filter((a: any) => a.isPostable && a.isActive);

  const data = useQuery(
    api.reports.getGeneralLedger,
    company && accountId
      ? {
          accountId: accountId as any,
          fromDate, toDate,
          branchId: branchArg as any,
          journalType: journalTypeFilter !== "all" ? journalTypeFilter : undefined,
        }
      : "skip"
  );

  const loading = data === undefined && !!accountId;
  const lines   = data?.lines ?? [];
  const summary = {
    openingBalance:  data?.openingBalance  ?? 0,
    totalDebit:      data?.totalDebit      ?? 0,
    totalCredit:     data?.totalCredit     ?? 0,
    closingBalance:  data?.closingBalance  ?? 0,
    transactionCount: data?.transactionCount ?? 0,
  };
  const account = data?.account;
  const accountName = account ? (isRTL ? account.nameAr : (account.nameEn || account.nameAr)) : "";
  const isClosingNeg = summary.closingBalance < 0;

  // ── Grand total (movement sign) ─────────────────────────────────────────────
  const netMovement = summary.totalDebit - summary.totalCredit;

  const counterName = (l: any) => isRTL
    ? l.counterAccountNameAr
    : (l.counterAccountNameEn || l.counterAccountNameAr);

  // ── Excel export ────────────────────────────────────────────────────────────
  function exportToExcel() {
    if (!data || lines.length === 0) return;
    const headers = [
      isRTL ? "التاريخ"     : "Date",
      isRTL ? "رقم القيد"   : "Journal No.",
      isRTL ? "النوع"       : "Type",
      isRTL ? "البيان"      : "Description",
      isRTL ? "الحساب المقابل" : "Counter Account",
      isRTL ? "كود مقابل"   : "Counter Code",
      isRTL ? "مدين"        : "Debit",
      isRTL ? "دائن"        : "Credit",
      isRTL ? "الرصيد"      : "Balance",
    ];
    const wsData: any[][] = [headers];
    // Opening balance row
    wsData.push([
      "", "",
      isRTL ? "—" : "—",
      isRTL ? "رصيد افتتاحي" : "Opening Balance",
      "", "",
      summary.openingBalance > 0 ? summary.openingBalance : 0,
      summary.openingBalance < 0 ? Math.abs(summary.openingBalance) : 0,
      summary.openingBalance,
    ]);
    for (const l of lines) {
      wsData.push([
        l.entryDate,
        l.entryNumber,
        l.journalType ?? "",
        l.description ?? "",
        counterName(l) ?? (l.counterIsMultiple ? (isRTL ? "متعدد" : "Multiple") : ""),
        l.counterAccountCode ?? "",
        l.debit  || 0,
        l.credit || 0,
        l.runningBalance,
      ]);
    }
    // Totals
    wsData.push([
      "", "", "", isRTL ? "الإجمالي" : "Total", "", "",
      summary.totalDebit, summary.totalCredit, summary.closingBalance,
    ]);
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [
      { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 36 },
      { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "General Ledger");
    XLSX.writeFile(wb, `general-ledger-${account?.code}-${fromDate}-to-${toDate}.xlsx`);
  }

  // ── Available journal type pills (only show types that exist) ──────────────
  const visibleTypes = useMemo(() => {
    const available = new Set(data?.availableJournalTypes ?? []);
    // Always show "all"
    return JOURNAL_TYPES.filter((jt) => jt.value === "all" || available.has(jt.value));
  }, [data?.availableJournalTypes]);

  return (
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={t("generalLedgerTitle")}
      period={`${fromDate} — ${toDate}`}
      actions={
        accountId && lines.length > 0 ? (
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium btn-ghost"
          >
            <Download className="h-4 w-4" />
            {isRTL ? "تصدير Excel" : "Export Excel"}
          </button>
        ) : undefined
      }
      filters={
        <div className="space-y-3">
          {/* Date + account row */}
          <div className="surface-card p-3 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: "var(--ink-500)" }}>{t("fromDate")}:</span>
              <input type="date" value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="input-field h-9 w-auto" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: "var(--ink-500)" }}>{t("toDate")}:</span>
              <input type="date" value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="input-field h-9 w-auto" />
            </div>
            <div className="flex-1 min-w-[280px]">
              <SearchableSelect
                isRTL={isRTL}
                value={accountId}
                onChange={(v) => setAccountId(v)}
                placeholder={t("selectAccount")}
                searchPlaceholder={isRTL ? "ابحث بالاسم أو الكود..." : "Search by name or code..."}
                emptyMessage={isRTL ? "لا توجد نتائج" : "No results"}
                options={(postableAccounts ?? []).map((a: any) => ({
                  value: a._id,
                  label: a.code + " — " + (isRTL ? a.nameAr : (a.nameEn || a.nameAr)),
                }))}
              />
            </div>
          </div>

          {/* Journal-type pills (only shown if account selected & has data) */}
          {accountId && visibleTypes.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {visibleTypes.map(({ value, Icon, color, bg, labelAr, labelEn }) => {
                const active = journalTypeFilter === value;
                return (
                  <button
                    key={value}
                    onClick={() => setJournalTypeFilter(value)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all border"
                    style={{
                      background:  active ? color : bg,
                      color:       active ? "white" : color,
                      borderColor: active ? color : color + "30",
                      boxShadow:   active ? `0 2px 8px ${color}40` : "none",
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {isRTL ? labelAr : labelEn}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      }
      summary={
        accountId && data ? (
          <>
            {/* Account header strip */}
            <div className="mb-3 px-3.5 py-2 rounded-lg flex items-center gap-3 flex-wrap"
              style={{ background: "linear-gradient(90deg, #fdf2f4 0%, #fefefe 100%)",
                       border: "1px solid #6b152320" }}>
              <Layers className="h-4 w-4 shrink-0" style={{ color: "#6b1523" }} />
              <span className="font-mono text-[11px] px-2 py-0.5 rounded font-bold"
                style={{ background: "#6b1523", color: "white" }}>
                {account?.code}
              </span>
              <span className="text-[13px] font-bold" style={{ color: "#6b1523" }}>
                {accountName}
              </span>
              <span className="ms-auto text-[11px] tabular-nums font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "#fff", color: "#6b1523", border: "1px solid #6b152330" }}>
                {summary.transactionCount} {isRTL ? "حركة" : "transactions"}
              </span>
            </div>

            {/* KPI grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPI
                label={isRTL ? "الرصيد الافتتاحي" : "Opening Balance"}
                value={fmt(summary.openingBalance)}
                color="#475569" bg="#f8fafc" border="#e2e8f0"
                hint={isRTL ? "قبل الفترة" : "Before period"}
                Icon={Wallet}
              />
              <KPI
                label={isRTL ? "إجمالي المدين" : "Total Debit"}
                value={fmt(summary.totalDebit)}
                color="#15803d" bg="#f0fdf4" border="#bbf7d0"
                hint={isRTL ? "حركات الفترة" : "Period movements"}
                Icon={ArrowDownToLine}
              />
              <KPI
                label={isRTL ? "إجمالي الدائن" : "Total Credit"}
                value={fmt(summary.totalCredit)}
                color="#dc2626" bg="#fef2f2" border="#fecaca"
                hint={isRTL ? "حركات الفترة" : "Period movements"}
                Icon={ArrowUpFromLine}
              />
              <KPI
                label={isRTL ? "الرصيد الختامي" : "Closing Balance"}
                value={fmt(Math.abs(summary.closingBalance))}
                color={isClosingNeg ? "#dc2626" : "#6b1523"}
                bg={isClosingNeg ? "#fef2f2" : "#fdf2f4"}
                border={isClosingNeg ? "#fecaca" : "#6b152330"}
                hint={isClosingNeg
                  ? (isRTL ? "رصيد دائن" : "Credit balance")
                  : (isRTL ? "رصيد مدين" : "Debit balance")}
                Icon={Hash}
              />
            </div>
          </>
        ) : undefined
      }
    >
      {!accountId ? (
        <div className="py-20 text-center" style={{ color: "var(--ink-400)" }}>
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold mb-1">{t("selectAccountToView")}</p>
          <p className="text-xs" style={{ color: "var(--ink-300)" }}>
            {isRTL
              ? "اختر حساباً من القائمة أعلاه لعرض حركاته"
              : "Pick an account from the dropdown above to view its movements"}
          </p>
        </div>
      ) : loading ? (
        <LoadingState label={t("loading")} />
      ) : lines.length === 0 ? (
        <EmptyState icon={BookOpen} title={t("noResults")}
          message={isRTL ? "لا توجد حركات على هذا الحساب في الفترة المحددة" : "No movements on this account in the selected period"} />
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-24">{t("date")}</th>
                <th className="w-32">{t("journalNo")}</th>
                <th className="w-20 text-center">{isRTL ? "النوع" : "Type"}</th>
                <th>{isRTL ? "البيان / الحساب المقابل" : "Description / Counter Account"}</th>
                <th className="text-end w-28">{t("debit")}</th>
                <th className="text-end w-28">{t("credit")}</th>
                <th className="text-end w-32">{t("balance")}</th>
              </tr>
            </thead>
            <tbody>
              {/* Opening balance row */}
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <td colSpan={4} className="px-4 py-2 italic font-semibold"
                  style={{ color: "var(--ink-500)" }}>
                  {isRTL ? "↑ الرصيد الافتتاحي" : "↑ Opening Balance"}
                </td>
                <td colSpan={2}></td>
                <td className="numeric text-end font-bold"
                  style={{ color: summary.openingBalance < 0 ? "#dc2626" : "var(--ink-700)" }}>
                  {fmt(Math.abs(summary.openingBalance))}{" "}
                  <span className="text-[10px] font-semibold opacity-60">
                    {summary.openingBalance < 0
                      ? (isRTL ? "دائن" : "Cr")
                      : (isRTL ? "مدين" : "Dr")}
                  </span>
                </td>
              </tr>

              {/* Movement rows */}
              {lines.map((l: any, i: number) => {
                const bal = l.runningBalance ?? 0;
                const isNeg = bal < 0;
                const cName = counterName(l);
                return (
                  <tr key={i} className="hover:bg-[#fdf2f4]/30 transition-colors">
                    <td className="muted text-[12px]">{formatDateShort(l.entryDate)}</td>
                    <td>
                      <span className="font-mono text-[10.5px] px-1.5 py-0.5 rounded"
                        style={{ background: "var(--ink-100)", color: "var(--ink-700)" }}>
                        {l.entryNumber}
                      </span>
                    </td>
                    <td className="text-center">
                      <JournalTypeBadge type={l.journalType} isRTL={isRTL} />
                    </td>
                    <td className="max-w-[400px]">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[12.5px]">{l.description || "—"}</span>
                        {(cName || l.counterIsMultiple) && (
                          <span className="text-[10.5px] inline-flex items-center gap-1">
                            <ArrowLeftRight className="h-3 w-3 opacity-50" />
                            <span style={{ color: "var(--ink-400)" }}>
                              {isRTL ? "مقابل: " : "vs: "}
                            </span>
                            {l.counterIsMultiple ? (
                              <span className="font-semibold" style={{ color: "#7c3aed" }}>
                                {isRTL
                                  ? `متعدد (${l.counterCount} حسابات)`
                                  : `Multiple (${l.counterCount} accounts)`}
                              </span>
                            ) : (
                              <>
                                {l.counterAccountCode && (
                                  <span className="font-mono px-1 rounded text-[10px]"
                                    style={{ background: "#f1f5f9", color: "#475569" }}>
                                    {l.counterAccountCode}
                                  </span>
                                )}
                                <span className="font-semibold" style={{ color: "var(--ink-600)" }}>
                                  {cName}
                                </span>
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="numeric text-end" style={{ color: l.debit ? "#15803d" : "var(--ink-300)" }}>
                      {l.debit ? fmt(l.debit) : "—"}
                    </td>
                    <td className="numeric text-end" style={{ color: l.credit ? "#dc2626" : "var(--ink-300)" }}>
                      {l.credit ? fmt(l.credit) : "—"}
                    </td>
                    <td className="numeric text-end font-bold"
                      style={{ color: isNeg ? "#dc2626" : "var(--ink-800)" }}>
                      {fmt(Math.abs(bal))}{" "}
                      <span className="text-[10px] font-semibold opacity-60">
                        {isNeg ? (isRTL ? "دائن" : "Cr") : (isRTL ? "مدين" : "Dr")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="row-total" style={{ background: "#fdf2f4", borderTop: "2.5px solid #6b152330" }}>
                <td colSpan={4} className="font-black" style={{ color: "#6b1523" }}>
                  {isRTL
                    ? `↓ إجمالي الفترة (${summary.transactionCount} حركة)`
                    : `↓ Period Total (${summary.transactionCount} transactions)`}
                </td>
                <td className="numeric text-end font-black" style={{ color: "#15803d" }}>
                  {fmt(summary.totalDebit)}
                </td>
                <td className="numeric text-end font-black" style={{ color: "#dc2626" }}>
                  {fmt(summary.totalCredit)}
                </td>
                <td className="numeric text-end font-black" style={{ color: isClosingNeg ? "#dc2626" : "#6b1523" }}>
                  {fmt(Math.abs(summary.closingBalance))}{" "}
                  <span className="text-[10px] font-semibold opacity-60">
                    {isClosingNeg ? (isRTL ? "دائن" : "Cr") : (isRTL ? "مدين" : "Dr")}
                  </span>
                </td>
              </tr>
              <tr style={{ background: "#fafafa" }}>
                <td colSpan={7} className="px-4 py-2 text-[11px] text-center"
                  style={{ color: "var(--ink-500)" }}>
                  {isRTL
                    ? `الحركة الصافية للفترة: ${netMovement >= 0 ? "+" : ""}${fmt(netMovement)}`
                    : `Net Period Movement: ${netMovement >= 0 ? "+" : ""}${fmt(netMovement)}`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </PrintableReportPage>
  );
}
