// @ts-nocheck
"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/useAppStore";
import { usePermissions } from "@/hooks/usePermissions";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState, SummaryStrip } from "@/components/ui/data-display";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { PageHeader } from "@/components/ui/page-header";
import { CompanyPrintHeader } from "@/components/ui/company-print-header";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { FileText, Printer } from "lucide-react";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function paymentMethodLabel(method: string | null, t: (k: any) => string) {
  if (!method) return "—";
  const map: Record<string, string> = {
    cash: t("pmCash"),
    hand: t("pmHand"),
    main_safe: t("pmMainSafe"),
    cash_sales_safe: t("pmCashSalesSafe"),
    card: t("pmCard"),
    transfer: t("pmTransfer"),
    credit: t("credit"),
  };
  return map[method] ?? method;
}

export default function SalesDetailsPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { canView } = usePermissions();
  const { company: printCompany } = useCompanySettings();
  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const [postingStatus, setPostingStatus] = useState("");
  const [reviewStatus, setReviewStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const report = useQuery(
    api.reports.getSalesDetailsReport,
    {
      fromDate,
      toDate,
      branchId: branchArg as any,
      customerId: undefined,
      salesRepId: undefined,
      vehicleId: undefined,
      paymentMethod: paymentMethod || undefined,
      postingStatus: postingStatus || undefined,
      reviewStatus: reviewStatus || undefined,
    }
  );

  const rows = report?.rows ?? [];
  const totals = report?.totals;

  const summaryItems = useMemo(
    () =>
      totals
        ? [
            { label: t("invoiceCount"), value: String(totals.invoiceCount), borderColor: "var(--brand-600)", accent: "var(--ink-900)" },
            { label: t("subtotal"), value: formatCurrency(totals.subtotal / 100), borderColor: "#0ea5e9", accent: "#0f172a" },
            { label: t("discount"), value: formatCurrency(totals.discountAmount / 100), borderColor: "#f59e0b", accent: "#b45309" },
            { label: t("net"), value: formatCurrency(totals.totalAmount / 100), borderColor: "#16a34a", accent: "#166534" },
          ]
        : [],
    [totals, t, formatCurrency]
  );

  if (!canView("reports")) {
    return <EmptyState icon={FileText} title={t("permissionDenied")} />;
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      <CompanyPrintHeader
        company={printCompany}
        isRTL={isRTL}
        documentTitle={t("salesDetailsTitle")}
        periodLine={`${fromDate} — ${toDate}`}
      />

      <div className="no-print">
        <PageHeader
          icon={FileText}
          title={t("salesDetailsTitle")}
          subtitle={t("salesReportTitle")}
          actions={
            <button onClick={() => window.print()} className="btn-ghost h-9 px-4 rounded-xl inline-flex items-center gap-2 text-sm font-semibold">
              <Printer className="h-4 w-4" />
              {t("print")}
            </button>
          }
        />
      </div>

      <FilterPanel>
        <FilterField label={t("fromDate")}>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input-field h-8 w-auto text-sm" />
        </FilterField>
        <FilterField label={t("toDate")}>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input-field h-8 w-auto text-sm" />
        </FilterField>
        <FilterField label={t("postingStatus")}>
          <select value={postingStatus} onChange={(e) => setPostingStatus(e.target.value)} className="input-field h-8 w-auto text-sm">
            <option value="">{t("all")}</option>
            <option value="unposted">{t("statusDraft")}</option>
            <option value="posted">{t("statusPosted")}</option>
            <option value="reversed">{t("statusReversed")}</option>
          </select>
        </FilterField>
        <FilterField label={t("reviewStatus")}>
          <select value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)} className="input-field h-8 w-auto text-sm">
            <option value="">{t("all")}</option>
            <option value="draft">{t("draft")}</option>
            <option value="submitted">{t("submitted")}</option>
            <option value="rejected">{t("statusRejected")}</option>
            <option value="approved">{t("statusApproved")}</option>
          </select>
        </FilterField>
        <FilterField label={t("paymentMethod")}>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input-field h-8 w-auto text-sm">
            <option value="">{t("all")}</option>
            <option value="cash">{t("pmCash")}</option>
            <option value="hand">{t("pmHand")}</option>
            <option value="main_safe">{t("pmMainSafe")}</option>
            <option value="cash_sales_safe">{t("pmCashSalesSafe")}</option>
            <option value="card">{t("pmCard")}</option>
            <option value="transfer">{t("pmTransfer")}</option>
            <option value="credit">{t("credit")}</option>
          </select>
        </FilterField>
      </FilterPanel>

      {totals ? <SummaryStrip items={summaryItems} /> : null}

      <div className="surface-card overflow-hidden">
        {report === undefined ? (
          <LoadingState label={t("loading")} />
        ) : rows.length === 0 ? (
          <EmptyState icon={FileText} title={t("noResults")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("invoiceNo")}</th>
                  <th>{t("customerInvoiceNo")}</th>
                  <th>{t("date")}</th>
                  <th>{t("customer")}</th>
                  <th>{t("branch")}</th>
                  <th>{t("salesRep")}</th>
                  <th>{t("vehicleCode")}</th>
                  <th>{t("paymentMethod")}</th>
                  <th className="text-end">{t("subtotal")}</th>
                  <th className="text-end">{t("discount")}</th>
                  <th className="text-end">{t("net")}</th>
                  <th>{t("reviewStatus")}</th>
                  <th>{t("postingStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any) => (
                  <tr key={row._id}>
                    <td className="code">{row.invoiceNumber}</td>
                    <td>{row.externalInvoiceNumber || "—"}</td>
                    <td className="muted tabular-nums">{row.invoiceDate}</td>
                    <td>{isRTL ? row.customerNameAr : (row.customerNameEn || row.customerNameAr)}</td>
                    <td>{isRTL ? row.branchNameAr : (row.branchNameEn || row.branchNameAr)}</td>
                    <td>{isRTL ? (row.salesRepNameAr || "—") : (row.salesRepNameEn || row.salesRepNameAr || "—")}</td>
                    <td>{row.vehicleCode || "—"}</td>
                    <td>{paymentMethodLabel(row.paymentMethod, t)}</td>
                    <td className="numeric text-end">{formatCurrency(row.subtotal / 100)}</td>
                    <td className="numeric text-end">{formatCurrency(row.discountAmount / 100)}</td>
                    <td className="numeric text-end font-semibold">{formatCurrency(row.totalAmount / 100)}</td>
                    <td>{row.reviewStatus}</td>
                    <td>{row.postingStatus}</td>
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