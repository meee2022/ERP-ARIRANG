// @ts-nocheck
"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { PdfDownloadButton } from "@/components/ui/PdfDownloadButton";
import { StatementPdf } from "@/lib/pdf/StatementPdf";
import { Search, Truck, ArrowDownCircle, ArrowUpCircle, Wallet, FileText, CreditCard, Hash, Calendar } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState, ColorKPIGrid } from "@/components/ui/data-display";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PrintableReportPage } from "@/components/ui/printable-report";

// ─── Statement transactions table ──────────────────────────────────────────
function StatementTable({ transactions, openingBalance, t, isRTL, formatCurrency }: any) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="surface-card overflow-hidden">
        <EmptyState title={isRTL ? "لا توجد معاملات في هذه الفترة" : "No transactions in this period"} />
      </div>
    );
  }
  return (
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "var(--brand-700)" }}>
              <th className="px-3 py-2.5 text-start text-[10px] font-bold text-white/90 uppercase tracking-wider w-28">{t("date")}</th>
              <th className="px-3 py-2.5 text-start text-[10px] font-bold text-white/90 uppercase tracking-wider w-32">{isRTL ? "النوع" : "Type"}</th>
              <th className="px-3 py-2.5 text-start text-[10px] font-bold text-white/90 uppercase tracking-wider">{t("invoiceNumber")}</th>
              <th className="px-3 py-2.5 text-end text-[10px] font-bold text-white/90 uppercase tracking-wider w-28">{t("debit")}</th>
              <th className="px-3 py-2.5 text-end text-[10px] font-bold text-white/90 uppercase tracking-wider w-28">{t("credit")}</th>
              <th className="px-3 py-2.5 text-end text-[10px] font-bold text-white uppercase tracking-wider w-32" style={{ background: "var(--brand-800)" }}>{t("runningBalance")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Opening balance row */}
            {(openingBalance ?? 0) !== 0 && (
              <tr className="bg-amber-50/60">
                <td className="px-3 py-2 text-xs text-amber-700 font-bold" colSpan={5}>
                  {isRTL ? "رصيد افتتاحي" : "Opening Balance"}
                </td>
                <td className="px-3 py-2 text-end tabular-nums font-bold text-amber-800">{formatCurrency(openingBalance)}</td>
              </tr>
            )}
            {transactions.map((tx: any, i: number) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white hover:bg-gray-50/60" : "bg-gray-50/40 hover:bg-gray-100/60"}>
                <td className="px-3 py-2 tabular-nums text-gray-600">{tx.date}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    tx.type === "invoice" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {tx.type === "invoice"
                      ? <><FileText className="h-3 w-3" />{isRTL ? "فاتورة" : "Invoice"}</>
                      : <><CreditCard className="h-3 w-3" />{isRTL ? "سند صرف" : "Payment"}</>}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className="font-mono text-[11px] text-gray-700 font-bold">{tx.reference ?? tx.refNumber ?? "—"}</span>
                </td>
                <td className="px-3 py-2 text-end tabular-nums font-semibold text-red-700">
                  {tx.debit > 0 ? formatCurrency(tx.debit) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-2 text-end tabular-nums font-semibold text-emerald-700">
                  {tx.credit > 0 ? formatCurrency(tx.credit) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-2 text-end tabular-nums font-bold bg-gray-50">{formatCurrency(tx.balance ?? tx.runningBalance ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SupplierStatementPage() {
  const { t, isRTL } = useI18n();
  const { company: printCompany } = useCompanySettings();

  // ── Fetch company via getCompanies (consistent with other reports) ──
  const companies  = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId  = companies[0]?._id;
  const suppliers  = useQuery(api.suppliers.getAll, companyId ? { companyId } : "skip");

  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [toDate, setToDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [submitted, setSubmitted] = useState(false);

  const statement = useQuery(
    api.reports.getSupplierStatement,
    submitted && selectedSupplier && fromDate && toDate
      ? { supplierId: selectedSupplier as any, fromDate, toDate }
      : "skip"
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-QA", { style: "currency", currency: "QAR", minimumFractionDigits: 2 }).format(n);

  const handleGenerate = () => {
    if (!selectedSupplier || !fromDate || !toDate) return;
    setSubmitted(true);
  };

  const supplierObj = suppliers?.find((s: any) => s._id === selectedSupplier);
  const supplierName = supplierObj
    ? (isRTL ? supplierObj.nameAr : (supplierObj.nameEn || supplierObj.nameAr))
    : "";

  const summaryItems = useMemo(
    () => statement ? [
      { label: isRTL ? "الرصيد الختامي" : "Closing Balance", value: fmt(statement.closingBalance ?? 0),
        color: "#6b1523", bg: "#fdf2f4", border: "#6b152330", icon: Wallet, big: true,
        hint: `${statement.transactions?.length ?? 0} ${isRTL ? "معاملة" : "transactions"}` },
      { label: isRTL ? "الرصيد الافتتاحي" : "Opening Balance", value: fmt(statement.openingBalance ?? 0),
        color: "#ca8a04", bg: "#fefce8", border: "#fde68a", icon: Calendar },
      { label: isRTL ? "إجمالي المدين" : "Total Debit", value: fmt(statement.totalDebit ?? 0),
        color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: ArrowUpCircle },
      { label: isRTL ? "إجمالي الدائن" : "Total Credit", value: fmt(statement.totalCredit ?? 0),
        color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: ArrowDownCircle },
      { label: isRTL ? "عدد المعاملات" : "Transactions", value: String(statement.transactions?.length ?? 0),
        color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd", icon: Hash },
    ] : [],
    [statement, fmt, isRTL]
  );

  return (
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={t("supplierStatement")}
      period={`${fromDate} — ${toDate}`}
      actions={
        statement ? (
          <PdfDownloadButton
            document={
              <StatementPdf data={{
                logoUrl: printCompany?.logoUrl ?? undefined,
                companyNameEn: printCompany?.nameEn ?? undefined,
                companyPhone: printCompany?.phone ?? undefined,
                companyName: statement.companyNameAr ?? statement.companyNameEn ?? "",
                partyName: supplierName || selectedSupplier,
                fromDate, toDate,
                openingBalance: statement.openingBalance ?? 0,
                lines: (statement.transactions ?? []).map((tx: any) => ({
                  date: tx.date, description: tx.description,
                  debit: tx.debit ?? 0, credit: tx.credit ?? 0, balance: tx.runningBalance ?? tx.balance ?? 0,
                })),
                closingBalance: statement.closingBalance ?? 0,
                totalDebit: statement.totalDebit ?? 0,
                totalCredit: statement.totalCredit ?? 0,
                isRTL,
                labels: {
                  title: t("supplierStatement"), partyLabel: t("supplier"),
                  period: `${fromDate} → ${toDate}`,
                  date: t("date"), description: t("description"),
                  debit: t("debit"), credit: t("credit"), balance: t("runningBalance"),
                  openingBalance: t("openingBalance"), closingBalance: t("closingBalance"),
                  totalDebit: t("totalDebit"), totalCredit: t("totalCredit"), printedBy: t("printedBy"),
                },
                formatCurrency: fmt,
              }} />
            }
            fileName={`supplier-statement-${selectedSupplier}.pdf`}
            label={t("downloadPdf") ?? "PDF"}
          />
        ) : undefined
      }
      filters={
        <div className="surface-card p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end">
            <div className="sm:col-span-5">
              <label className="block text-[10px] font-bold text-[color:var(--ink-500)] uppercase tracking-wider mb-1.5">
                <Truck className="inline-block h-3.5 w-3.5 me-1 -mt-0.5" />
                {t("supplier")} *
              </label>
              <SearchableSelect
                isRTL={isRTL}
                value={selectedSupplier}
                onChange={(v) => { setSelectedSupplier(v); setSubmitted(false); }}
                placeholder={
                  suppliers === undefined
                    ? (isRTL ? "جاري التحميل..." : "Loading...")
                    : !suppliers || suppliers.length === 0
                      ? (isRTL ? "لا يوجد موردون" : "No suppliers")
                      : t("selectSupplier")
                }
                searchPlaceholder={isRTL ? "ابحث باسم المورد..." : "Search supplier..."}
                emptyMessage={isRTL ? "لا توجد نتائج" : "No results"}
                options={(suppliers ?? []).map((s: any) => ({
                  value: s._id,
                  label: `${s.code ? `[${s.code}] ` : ""}${isRTL ? s.nameAr : (s.nameEn || s.nameAr)}`,
                }))}
              />
              {suppliers && suppliers.length === 0 && (
                <p className="text-[10px] text-amber-600 mt-1">
                  ⚠️ {isRTL ? "لا يوجد موردون مسجلون. أضف مورداً أولاً." : "No suppliers registered. Add a supplier first."}
                </p>
              )}
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[10px] font-bold text-[color:var(--ink-500)] uppercase tracking-wider mb-1.5">
                {t("statementFrom")}
              </label>
              <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setSubmitted(false); }} className="input-field h-10 w-full" />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[10px] font-bold text-[color:var(--ink-500)] uppercase tracking-wider mb-1.5">
                {t("statementTo")}
              </label>
              <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setSubmitted(false); }} className="input-field h-10 w-full" />
            </div>
            <div className="sm:col-span-1">
              <button
                onClick={handleGenerate}
                disabled={!selectedSupplier || !fromDate || !toDate}
                className="btn-primary h-10 w-full rounded-lg inline-flex items-center justify-center gap-1.5 text-sm font-semibold disabled:opacity-40"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      }
      summary={statement ? <ColorKPIGrid items={summaryItems} cols={5} /> : undefined}
    >
      {!submitted ? (
        <div className="p-8">
          <EmptyState
            icon={Truck}
            title={isRTL ? "اختر مورداً وفترة لعرض كشف الحساب" : "Select a supplier and period to view statement"}
          />
        </div>
      ) : statement === undefined ? (
        <LoadingState label={isRTL ? "جاري التحميل..." : "Loading..."} />
      ) : (
        <div className="p-4 space-y-4">
          {/* ── Supplier info card ──────────────────────────────────────── */}
          <div
            className="rounded-xl px-5 py-4 flex items-center justify-between"
            style={{
              background: "linear-gradient(90deg, var(--brand-50), white)",
              borderInlineStart: "4px solid var(--brand-700)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[color:var(--brand-700)] flex items-center justify-center">
                <Truck className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-[color:var(--brand-700)] uppercase tracking-wider">{t("supplier")}</p>
                <p className="text-base font-extrabold text-[color:var(--ink-900)]">{supplierName || "—"}</p>
              </div>
            </div>
            <div className="text-end">
              <p className="text-[10px] font-bold text-[color:var(--ink-500)] uppercase tracking-wider">{isRTL ? "الفترة" : "Period"}</p>
              <p className="text-sm font-bold text-[color:var(--ink-800)] tabular-nums">{fromDate} → {toDate}</p>
            </div>
          </div>

          {/* ── Quick balance cards ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-red-50 to-white rounded-xl border border-red-100 p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <ArrowUpCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">{isRTL ? "إجمالي المدين" : "Total Debit"}</p>
                <p className="text-lg font-extrabold text-red-800 tabular-nums">{fmt(statement.totalDebit ?? 0)}</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100 p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <ArrowDownCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">{isRTL ? "إجمالي الدائن" : "Total Credit"}</p>
                <p className="text-lg font-extrabold text-emerald-800 tabular-nums">{fmt(statement.totalCredit ?? 0)}</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-[color:var(--brand-50)] to-white rounded-xl border border-[color:var(--brand-200)] p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[color:var(--brand-700)] flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-[color:var(--brand-700)] uppercase tracking-wider">{isRTL ? "الرصيد الختامي" : "Closing Balance"}</p>
                <p className="text-lg font-extrabold text-[color:var(--ink-900)] tabular-nums">{fmt(statement.closingBalance ?? 0)}</p>
              </div>
            </div>
          </div>

          {/* ── Transactions table ───────────────────────────────────────── */}
          <StatementTable
            transactions={statement.transactions}
            openingBalance={statement.openingBalance}
            t={t} isRTL={isRTL} formatCurrency={fmt}
          />
        </div>
      )}
    </PrintableReportPage>
  );
}
