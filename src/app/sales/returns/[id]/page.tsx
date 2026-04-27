// @ts-nocheck
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { StatusBadge } from "@/components/ui/status-badge";
import { DocActionBar } from "@/components/ui/doc-action-bar";
import { PdfDownloadButton } from "@/components/ui/PdfDownloadButton";
import { SalesReturnPdf } from "@/lib/pdf/SalesReturnPdf";
import { ArrowLeft, ArrowRight, Printer } from "lucide-react";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { useCompanySettings } from "@/hooks/useCompanySettings";

export default function SalesReturnDetailPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { currentUser } = useAuth();
  const { canPost } = usePermissions();
  const { company: settingsCompany } = useCompanySettings();
  const router = useRouter();
  const params = useParams();
  const returnId = params?.id as string;

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const ret = useQuery(
    api.salesReturns.getSalesReturn,
    returnId ? { returnId: returnId as any } : "skip"
  );

  if (ret === undefined) {
    return <LoadingState label="Loading..." />;
  }
  if (!ret) {
    return <EmptyState title="Not found" />;
  }

  const companyName  = isRTL ? ret.companyNameAr  : (ret.companyNameEn  || ret.companyNameAr);
  const branchName   = isRTL ? ret.branchNameAr   : (ret.branchNameEn   || ret.branchNameAr);
  const customerName = isRTL ? (ret.customerNameAr || "—") : (ret.customerNameEn || ret.customerNameAr || "—");

  const lines = ret.lines ?? [];
  const subtotal = lines.reduce((s: number, l: any) => s + (l.lineTotal ?? l.quantity * l.unitPrice ?? 0), 0);
  const vatAmount = ret.vatAmount ?? 0;
  const totalAmount = ret.totalAmount ?? subtotal + vatAmount;

  const pdfData = {
    logoUrl: settingsCompany?.logoUrl ?? undefined,
    companyNameEn: settingsCompany?.nameEn ?? undefined,
    companyPhone: settingsCompany?.phone ?? undefined,
    companyName, companyAddress: ret.companyAddress, branchName,
    companyVatNumber: ret.companyVatNumber,
    returnNumber: ret.returnNumber ?? returnId.slice(-8),
    returnDate: ret.returnDate ?? ret._creationTime
      ? new Date(ret.returnDate ?? ret._creationTime).toLocaleDateString("ar-SA")
      : "",
    postingStatus: ret.postingStatus,
    customerName, customerAddress: ret.customerAddress,
    originalInvoiceNumber: ret.originalInvoiceNumber,
    originalInvoiceDate: ret.originalInvoiceDate,
    reason: ret.reason,
    notes: ret.notes,
    lines: lines.map((l: any) => ({
      itemCode: l.itemCode, itemNameAr: l.itemNameAr ?? "", itemNameEn: l.itemNameEn,
      quantity: l.quantity,
      unitPrice: l.unitPrice ?? 0,
      lineTotal: l.lineTotal ?? (l.quantity * (l.unitPrice ?? 0)),
    })),
    vatAmount, totalAmount,
    isRTL,
    labels: {
      title: t("salesReturnTitle") ?? (isRTL ? "مرتجع مبيعات" : "Sales Return"),
      billTo: t("customer"), date: t("date"),
      originalInvoiceRef: t("originalInvoice") ?? (isRTL ? "الفاتورة الأصلية" : "Original Invoice"),
      reason: t("reason") ?? (isRTL ? "سبب الإرجاع" : "Return Reason"),
      notes: t("notes") ?? "Notes",
      no: "#", code: t("itemCode"), name: t("itemName"),
      qty: t("quantity"), price: t("unitPrice"), total: t("lineTotal"),
      subtotal: t("subtotal"), vat: t("taxAmount"),
      returnTotal: t("returnTotal") ?? (isRTL ? "إجمالي المرتجع" : "Return Total"),
      preparedBy: t("preparedBy"), authorizedBy: t("authorizedBy"), receivedBy: t("receivedBy"),
      printedBy: t("printedBy"),
    },
    formatCurrency: (n: number) => formatCurrency(n),
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="print:hidden flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-[color:var(--ink-500)] hover:text-[color:var(--ink-800)] mb-4"
        >
          {isRTL ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          {t("backToList")}
        </button>
        <div className="flex items-center gap-3">
          {canPost("sales") && (
            <DocActionBar
              docType="sales_return"
              docId={returnId}
              documentStatus={ret.documentStatus}
              postingStatus={ret.postingStatus}
              userId={currentUser?._id}
              companyId={company?._id}
            />
          )}
          <PdfDownloadButton
            document={<SalesReturnPdf data={pdfData} />}
            fileName={`sales-return-${pdfData.returnNumber}.pdf`}
            label={t("downloadPdf") ?? "PDF"}
          />
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[color:var(--brand-700)] text-white hover:bg-[color:var(--brand-800)]"
          >
            <Printer className="h-4 w-4" />
            {t("printInvoice")}
          </button>
        </div>
      </div>

      {/* Document body */}
      <div
        className="bg-white rounded-2xl shadow-sm border border-[color:var(--ink-100)] p-8 print:shadow-none print:border-none print:rounded-none print:p-6"
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6 border-b-2 border-[color:var(--ink-800)] pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-[color:var(--ink-900)]">{companyName}</h2>
            {ret.companyAddress && <p className="text-sm text-[color:var(--ink-600)] mt-1">{ret.companyAddress}</p>}
            {branchName && <p className="text-xs text-[color:var(--ink-500)] mt-0.5">{branchName}</p>}
          </div>
          <div className="text-end">
            <h1 className="text-2xl font-extrabold text-[color:var(--brand-700)]">
              {pdfData.labels.title}
            </h1>
            <p className="text-lg font-bold text-[color:var(--ink-800)] mt-1"># {pdfData.returnNumber}</p>
            <p className="text-sm text-[color:var(--ink-600)]">{pdfData.returnDate}</p>
          </div>
        </div>

        {/* Party + status */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-[color:var(--ink-500)] font-semibold">{t("customer")}</p>
            <p className="font-semibold text-[color:var(--ink-900)]">{customerName}</p>
            {ret.customerAddress && <p className="text-sm text-[color:var(--ink-500)]">{ret.customerAddress}</p>}
          </div>
          <div className="flex justify-end items-start">
            <StatusBadge status={ret.postingStatus} type="posting" />
          </div>
        </div>

        {/* Original invoice ref */}
        {ret.originalInvoiceNumber && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
            <span className="text-amber-700 font-semibold">{pdfData.labels.originalInvoiceRef}: </span>
            <span className="font-mono text-amber-900">#{ret.originalInvoiceNumber}</span>
            {ret.originalInvoiceDate && (
              <span className="text-amber-600 ms-2">— {ret.originalInvoiceDate}</span>
            )}
          </div>
        )}

        {/* Reason */}
        {(ret.reason || ret.notes) && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm">
            {ret.reason && <p><span className="font-semibold text-green-700">{pdfData.labels.reason}: </span>{ret.reason}</p>}
            {ret.notes  && <p className="mt-1"><span className="font-semibold text-green-700">{pdfData.labels.notes}: </span>{ret.notes}</p>}
          </div>
        )}

        {/* Lines table */}
        <div className="overflow-x-auto mb-6 print:overflow-visible">
          <table className="data-table print:break-inside-auto">
            <thead>
              <tr>
                <th className="w-8">#</th>
                <th>{t("itemCode")}</th>
                <th>{t("itemName")}</th>
                <th className="text-end">{t("quantity")}</th>
                <th className="text-end">{t("unitPrice")}</th>
                <th className="text-end">{t("lineTotal")}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line: any, i: number) => (
                <tr key={line._id ?? i} className="print:break-inside-avoid">
                  <td className="muted">{i + 1}</td>
                  <td className="code">{line.itemCode ?? "—"}</td>
                  <td>{isRTL ? line.itemNameAr : (line.itemNameEn || line.itemNameAr)}</td>
                  <td className="numeric text-end">{line.quantity}</td>
                  <td className="numeric text-end">{formatCurrency((line.unitPrice ?? 0) / 100)}</td>
                  <td className="numeric text-end font-semibold">
                    {formatCurrency((line.lineTotal ?? line.quantity * (line.unitPrice ?? 0)) / 100)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-72 space-y-1">
            <div className="flex justify-between text-sm text-[color:var(--ink-600)]">
              <span>{t("subtotal")}</span>
              <span className="tabular-nums">{formatCurrency(subtotal / 100)}</span>
            </div>
            {vatAmount > 0 && (
              <div className="flex justify-between text-sm text-[color:var(--ink-600)]">
                <span>{t("taxAmount")}</span>
                <span className="tabular-nums">{formatCurrency(vatAmount / 100)}</span>
              </div>
            )}
            <div className="flex justify-between border-t-2 border-[color:var(--ink-800)] pt-2 text-base font-extrabold text-[color:var(--ink-900)]">
              <span>{pdfData.labels.returnTotal}</span>
              <span className="tabular-nums">{formatCurrency(totalAmount / 100)}</span>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-8 mt-8 border-t border-[color:var(--ink-200)] pt-6">
          {[t("preparedBy"), t("authorizedBy"), t("receivedBy")].map((label) => (
            <div key={label} className="text-center">
              <div className="border-b border-[color:var(--ink-300)] h-8 mb-2" />
              <p className="text-xs text-[color:var(--ink-500)]">{label}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-[color:var(--ink-400)] mt-8 print:mt-6">{t("printedBy")}</p>
      </div>
    </div>
  );
}
