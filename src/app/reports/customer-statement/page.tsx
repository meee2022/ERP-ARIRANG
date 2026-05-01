// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { PdfDownloadButton } from "@/components/ui/PdfDownloadButton";
import { StatementPdf } from "@/lib/pdf/StatementPdf";
import { Printer, Search, Users, ExternalLink } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { EmptyState } from "@/components/ui/empty-state";
import { CompanyPrintHeader } from "@/components/ui/company-print-header";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PageHeader } from "@/components/ui/page-header";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";

const JOURNAL_CFG: Record<string, { ar: string; en: string; bg: string; color: string; border: string }> = {
  "Sales voucher":          { ar: "فاتورة مبيعات",  en: "Sales voucher",         bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  "Sales returned voucher": { ar: "مرتجع مبيعات",   en: "Sales returned voucher", bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  "Cash receipt":           { ar: "سند قبض",         en: "Cash receipt",           bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
};

const STATUS_CFG: Record<string, { ar: string; en: string; bg: string; color: string }> = {
  posted:   { ar: "مرحّل",  en: "Posted",   bg: "#f0fdf4", color: "#15803d" },
  unposted: { ar: "معلق",   en: "Pending",  bg: "#fffbeb", color: "#b45309" },
  draft:    { ar: "مسودة",  en: "Draft",    bg: "#f8fafc", color: "#64748b" },
};

const DOC_ROUTE: Record<string, string> = {
  invoice: "/sales/invoices",
  return:  "/sales/returns",
  receipt: "/treasury/receipts",
};

function StatementTable({ transactions, isRTL, fmt, onRowClick }: any) {
  if (!transactions || transactions.length === 0) {
    return <EmptyState icon={Users} title={isRTL ? "لا توجد معاملات" : "No transactions"} />;
  }

  const TH = "px-4 py-3 text-start font-semibold text-white/80 text-[11px] uppercase tracking-wide whitespace-nowrap";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr style={{ background: "#6b1523" }}>
            <th className={TH}>{isRTL ? "التاريخ"      : "Date"}</th>
            <th className={TH}>{isRTL ? "رقم المستند"  : "Document No."}</th>
            <th className={TH}>{isRTL ? "نوع القيد"    : "Journal"}</th>
            <th className={TH}>{isRTL ? "المنفذ/الفرع" : "Sub Account"}</th>
            <th className={TH}>{isRTL ? "الحالة"       : "Status"}</th>
            <th className={`${TH} text-end`}>{isRTL ? "مدين" : "Debit"}</th>
            <th className={`${TH} text-end`}>{isRTL ? "دائن" : "Credit"}</th>
            <th className={`${TH} text-end`}>{isRTL ? "الرصيد" : "Balance"}</th>
            <th className={TH}></th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx: any, i: number) => {
            const jCfg = JOURNAL_CFG[tx.journal] ?? { ar: tx.journal, en: tx.journal, bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };
            const sCfg = STATUS_CFG[tx.postingStatus] ?? STATUS_CFG.unposted;
            const bal  = tx.balance ?? 0;
            const canOpen = !!DOC_ROUTE[tx.type] && !!tx.documentId;
            return (
              <tr key={i}
                className={`border-b border-[color:var(--ink-50)] transition-colors ${i % 2 === 0 ? "" : "bg-[#fafafa]"} ${canOpen ? "hover:bg-[color:var(--brand-50)] cursor-pointer" : ""}`}
                onClick={() => canOpen && onRowClick(tx.type, tx.documentId)}>
                <td className="px-4 py-3 tabular-nums text-[color:var(--ink-500)] whitespace-nowrap">{tx.date}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded border"
                    style={{ background: "var(--brand-50)", color: "var(--brand-700)", borderColor: "var(--brand-100)" }}>
                    {tx.documentNo ?? tx.refNumber ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border"
                    style={{ background: jCfg.bg, color: jCfg.color, borderColor: jCfg.border }}>
                    {isRTL ? jCfg.ar : jCfg.en}
                  </span>
                </td>
                <td className="px-4 py-3 text-[color:var(--ink-600)] max-w-[160px] truncate">
                  {tx.subAccount || "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: sCfg.bg, color: sCfg.color }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: sCfg.color }} />
                    {isRTL ? sCfg.ar : sCfg.en}
                  </span>
                </td>
                <td className="px-4 py-3 text-end tabular-nums font-medium text-red-700">
                  {tx.debit > 0 ? fmt(tx.debit) : <span className="text-[color:var(--ink-300)]">—</span>}
                </td>
                <td className="px-4 py-3 text-end tabular-nums font-medium text-green-700">
                  {tx.credit > 0 ? fmt(tx.credit) : <span className="text-[color:var(--ink-300)]">—</span>}
                </td>
                <td className={`px-4 py-3 text-end tabular-nums font-bold ${bal < 0 ? "text-green-700" : bal > 0 ? "text-[color:var(--ink-900)]" : "text-[color:var(--ink-400)]"}`}>
                  {fmt(Math.abs(bal))}
                  {bal < 0 && <span className="text-[9px] ms-1 font-normal text-green-600">{isRTL ? "دائن" : "Cr"}</span>}
                  {bal > 0 && <span className="text-[9px] ms-1 font-normal text-[color:var(--ink-400)]">{isRTL ? "مدين" : "Dr"}</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  {canOpen && (
                    <ExternalLink size={13} className="text-[color:var(--ink-300)] group-hover:text-[color:var(--brand-600)]" />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function CustomerStatementPage() {
  const { t, isRTL } = useI18n();
  const { company: printCompany } = useCompanySettings();
  const router = useRouter();

  const companies  = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId  = companies[0]?._id;
  const customers  = useQuery(api.customers.getAll, companyId ? { companyId } : "skip");

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [toDate,   setToDate]   = useState(new Date().toISOString().slice(0, 10));
  const [submitted, setSubmitted] = useState(false);

  const handleRowClick = (type: string, documentId: string) => {
    const base = DOC_ROUTE[type];
    if (base) router.push(`${base}/${documentId}`);
  };

  const statement = useQuery(
    api.reports.getCustomerStatement,
    submitted && selectedCustomer && fromDate && toDate
      ? { customerId: selectedCustomer as any, fromDate, toDate }
      : "skip"
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-QA", { style: "currency", currency: "QAR", minimumFractionDigits: 2 }).format(n);

  const customerName = statement?.customer
    ? isRTL ? statement.customer.nameAr : ((statement.customer as any).nameEn || statement.customer.nameAr)
    : "";

  const handleGenerate = () => {
    if (!selectedCustomer || !fromDate || !toDate) return;
    setSubmitted(true);
  };

  return (
    <div className="space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      <CompanyPrintHeader company={printCompany} isRTL={isRTL}
        documentTitle={isRTL ? "كشف حساب عميل" : "Customer Statement"}
        periodLine={`${fromDate} — ${toDate}`} />

      <div className="no-print">
        <PageHeader
          icon={Users}
          title={isRTL ? "كشف حساب عميل" : "Customer Statement"}
          subtitle={isRTL ? "كل معاملات العميل — فواتير، مرتجعات، مقبوضات" : "All customer transactions — invoices, returns, receipts"}
          actions={
            statement ? (
              <div className="flex gap-2">
                <PdfDownloadButton
                  document={
                    <StatementPdf data={{
                      logoUrl: printCompany?.logoUrl ?? undefined,
                      companyNameEn: printCompany?.nameEn ?? undefined,
                      companyPhone: printCompany?.phone ?? undefined,
                      companyName: statement.companyNameAr ?? statement.companyNameEn ?? "",
                      partyName: customers?.find((c: any) => c._id === selectedCustomer)?.nameAr ?? selectedCustomer,
                      fromDate, toDate,
                      openingBalance: statement.openingBalance ?? 0,
                      lines: (statement.transactions ?? []).map((tx: any) => ({
                        date: tx.date, description: `${tx.journal}${tx.subAccount ? ` — ${tx.subAccount}` : ""}`,
                        debit: tx.debit ?? 0, credit: tx.credit ?? 0, balance: tx.balance ?? 0,
                      })),
                      closingBalance: statement.closingBalance ?? 0,
                      totalDebit: statement.totalDebit ?? 0,
                      totalCredit: statement.totalCredit ?? 0,
                      isRTL,
                      labels: {
                        title: isRTL ? "كشف حساب عميل" : "Customer Statement",
                        partyLabel: t("customer"),
                        period: `${fromDate} → ${toDate}`,
                        date: t("date"), description: t("description"),
                        debit: t("debit"), credit: t("credit"), balance: t("runningBalance"),
                        openingBalance: t("openingBalance"), closingBalance: t("closingBalance"),
                        totalDebit: t("totalDebit"), totalCredit: t("totalCredit"),
                        printedBy: t("printedBy"),
                      },
                      formatCurrency: fmt,
                    }} />
                  }
                  fileName={`customer-statement-${selectedCustomer}.pdf`}
                  label={t("downloadPdf") ?? "PDF"}
                />
                <button onClick={() => window.print()}
                  className="btn-ghost h-9 px-4 rounded-xl inline-flex items-center gap-2 text-sm font-semibold">
                  <Printer className="h-4 w-4" />{t("print")}
                </button>
              </div>
            ) : undefined
          }
        />
      </div>

      {/* Filters */}
      <div className="no-print">
        <FilterPanel>
          <FilterField label={isRTL ? "العميل" : "Customer"}>
            <div className="min-w-[260px]">
              <SearchableSelect
                isRTL={isRTL}
                value={selectedCustomer}
                onChange={(v) => { setSelectedCustomer(v); setSubmitted(false); }}
                placeholder={isRTL ? "اختر العميل..." : "Select customer..."}
                searchPlaceholder={isRTL ? "ابحث باسم العميل..." : "Search customer..."}
                emptyMessage={isRTL ? "لا توجد نتائج" : "No results"}
                options={(customers ?? []).map((c: any) => ({
                  value: c._id,
                  label: isRTL ? c.nameAr : (c.nameEn || c.nameAr),
                }))}
              />
            </div>
          </FilterField>
          <FilterField label={isRTL ? "من" : "From"}>
            <input type="date" value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setSubmitted(false); }}
              className="input-field h-9 w-auto" />
          </FilterField>
          <FilterField label={isRTL ? "إلى" : "To"}>
            <input type="date" value={toDate}
              onChange={(e) => { setToDate(e.target.value); setSubmitted(false); }}
              className="input-field h-9 w-auto" />
          </FilterField>
          <FilterField label="">
            <button onClick={handleGenerate}
              disabled={!selectedCustomer || !fromDate || !toDate}
              className="btn-primary h-9 px-5 rounded-xl inline-flex items-center gap-2 text-sm font-semibold disabled:opacity-40">
              <Search className="h-3.5 w-3.5" />
              {isRTL ? "عرض الكشف" : "Generate"}
            </button>
          </FilterField>
        </FilterPanel>
      </div>

      {/* Statement */}
      {submitted && statement !== undefined && (
        <div className="bg-white rounded-2xl border border-[color:var(--ink-100)] overflow-hidden shadow-sm print:shadow-none print:border-none">

          {/* Header band */}
          <div className="px-5 py-4 border-b border-[color:var(--ink-100)] flex items-center justify-between"
            style={{ background: "var(--brand-50)" }}>
            <div>
              <h2 className="text-base font-bold" style={{ color: "var(--brand-800)" }}>
                {isRTL ? "كشف حساب عميل" : "Customer Statement"}
              </h2>
              <p className="text-sm text-[color:var(--ink-700)] mt-0.5 font-semibold">{customerName}</p>
              <p className="text-xs text-[color:var(--ink-400)] mt-0.5">{fromDate} — {toDate}</p>
            </div>
            <div className="text-end">
              <p className="text-[11px] text-[color:var(--ink-400)]">{isRTL ? "الرصيد الافتتاحي" : "Opening Balance"}</p>
              <p className="text-base font-bold tabular-nums" style={{ color: "var(--brand-700)" }}>
                {fmt(statement.openingBalance ?? 0)}
              </p>
            </div>
          </div>

          {/* Table */}
          <StatementTable
            transactions={statement.transactions}
            isRTL={isRTL}
            fmt={fmt}
            onRowClick={handleRowClick}
          />

          {/* Totals footer */}
          {(statement.transactions?.length ?? 0) > 0 && (
            <div className="px-5 py-4 border-t border-[color:var(--ink-100)] flex justify-end"
              style={{ background: "var(--ink-50)" }}>
              <div className="w-80 space-y-2 text-sm">
                <div className="flex justify-between text-[color:var(--ink-600)]">
                  <span>{isRTL ? "إجمالي المديونية" : "Total Debit"}</span>
                  <span className="font-semibold text-red-700 tabular-nums">{fmt(statement.totalDebit ?? 0)}</span>
                </div>
                <div className="flex justify-between text-[color:var(--ink-600)]">
                  <span>{isRTL ? "إجمالي المدفوعات والمرتجعات" : "Total Credits"}</span>
                  <span className="font-semibold text-green-700 tabular-nums">{fmt(statement.totalCredit ?? 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-[color:var(--ink-900)] border-t border-[color:var(--ink-200)] pt-2">
                  <span>{isRTL ? "الرصيد الختامي" : "Closing Balance"}</span>
                  <span className="tabular-nums" style={{ color: "var(--brand-700)" }}>{fmt(statement.closingBalance ?? 0)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
