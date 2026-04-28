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
import { PurchaseInvoicePdf } from "@/lib/pdf/PurchaseInvoicePdf";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowLeft, ArrowRight, Printer } from "lucide-react";
import { CompanyPrintHeader } from "@/components/ui/company-print-header";
import { useCompanySettings } from "@/hooks/useCompanySettings";

function LinesTable({ lines, t, isRTL, formatCurrency }: any) {
  return (
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
          {(lines ?? []).map((line: any, i: number) => (
            <tr key={line._id ?? i} className="print:break-inside-avoid">
              <td className="muted">{i + 1}</td>
              <td className="code">{line.itemCode || "—"}</td>
              <td>
                {line.itemNameAr
                  ? (isRTL ? line.itemNameAr : (line.itemNameEn || line.itemNameAr))
                  : (line.description || "—")}
              </td>
              <td className="numeric text-end">{line.quantity}</td>
              <td className="numeric text-end">{formatCurrency((line.unitPrice ?? 0))}</td>
              <td className="numeric text-end font-semibold">{formatCurrency((line.lineTotal ?? 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TotalsBlock({ inv, t, formatCurrency }: any) {
  const subtotal = (inv.lines ?? []).reduce((s: number, l: any) => s + (l.lineTotal ?? 0), 0);
  const taxAmt   = inv.vatAmount ?? 0;
  const total    = inv.totalAmount ?? subtotal + taxAmt;
  return (
    <div className="flex justify-end mb-8">
      <div className="w-72 space-y-2 text-sm">
        <div className="flex justify-between text-[color:var(--ink-700)]">
          <span>{t("subtotal")}</span>
          <span className="tabular-nums font-medium">{formatCurrency(subtotal)}</span>
        </div>
        {taxAmt > 0 && (
          <div className="flex justify-between text-[color:var(--ink-700)]">
            <span>{t("taxAmount")}</span>
            <span className="tabular-nums font-medium">{formatCurrency(taxAmt)}</span>
          </div>
        )}
        <div className="flex justify-between border-t-2 border-[color:var(--ink-800)] pt-2 text-base font-extrabold text-[color:var(--ink-900)]">
          <span>{t("invoiceTotal")}</span>
          <span className="tabular-nums">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}

function SignatureStrip({ t }: any) {
  return (
    <div className="grid grid-cols-3 gap-6 mt-10 pt-6 border-t border-[color:var(--ink-300)]">
      {[t("preparedBy"), t("authorizedBy"), t("receivedBy")].map((label) => (
        <div key={label} className="text-center">
          <div className="h-10 border-b border-[color:var(--ink-400)] mx-4 mb-2" />
          <p className="text-xs text-[color:var(--ink-600)] font-medium">{label}</p>
        </div>
      ))}
    </div>
  );
}

export default function PurchaseInvoiceDetailPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { currentUser } = useAuth();
  const { canPost } = usePermissions();
  const { company: printCompany } = useCompanySettings();
  const router = useRouter();
  const params = useParams();
  const invoiceId = params?.id as string;
  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const inv = useQuery(
    api.purchaseInvoices.getPurchaseInvoice,
    invoiceId ? { invoiceId: invoiceId as any } : "skip"
  );

  if (inv === undefined) {
    return <LoadingState label={t("loading") ?? "Loading..."} />;
  }
  if (!inv) {
    return (
      <div className="p-8 text-center text-[color:var(--ink-400)]">
        <p>{t("documentNotFound")}</p>
        <button onClick={() => router.back()} className="btn-ghost h-9 px-3 rounded-xl inline-flex items-center gap-2 text-sm font-semibold mt-2">
          {t("backToList")}
        </button>
      </div>
    );
  }

  const companyName  = isRTL ? inv.companyNameAr : (inv.companyNameEn || inv.companyNameAr);
  const branchName   = isRTL ? inv.branchNameAr  : (inv.branchNameEn  || inv.branchNameAr);
  const supplierName = isRTL ? (inv.supplierNameAr ?? "—") : (inv.supplierNameEn ?? inv.supplierNameAr ?? "—");

  const pdfData = {
    logoUrl: printCompany?.logoUrl ?? undefined,
    companyNameEn: printCompany?.nameEn ?? undefined,
    companyPhone: printCompany?.phone ?? undefined,
    companyName, companyAddress: inv.companyAddress, branchName,
    companyVatNumber: inv.companyVatNumber,
    invoiceNumber: inv.invoiceNumber, invoiceDate: inv.invoiceDate,
    postingStatus: inv.postingStatus,
    supplierName, supplierAddress: inv.supplierAddress, supplierVatNumber: inv.supplierVatNumber,
    lines: inv.lines ?? [],
    vatAmount: inv.vatAmount ?? 0, totalAmount: inv.totalAmount ?? 0,
    isRTL,
    labels: {
      title: t("purchaseInvoiceTitle"),
      supplierLabel: t("supplier"), date: t("date"), vatNumber: t("vatNumber"),
      no: "#", code: t("itemCode"), name: t("itemName"),
      qty: t("quantity"), price: t("unitPrice"), total: t("lineTotal"),
      subtotal: t("subtotal"), vat: t("taxAmount"), invoiceTotal: t("invoiceTotal"),
      preparedBy: t("preparedBy"), authorizedBy: t("authorizedBy"), receivedBy: t("receivedBy"),
      printedBy: t("printedBy"),
    },
    formatCurrency: (n: number) => formatCurrency(n),
  };

  return (
    <div className="space-y-4">
      <div className="no-print print:hidden flex items-center justify-between">
        <button onClick={() => router.back()} className="btn-ghost h-9 px-3 rounded-xl inline-flex items-center gap-2 text-sm font-semibold">
          {isRTL ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          {t("backToList")}
        </button>
        <div className="flex items-center gap-3">
          {canPost("purchases") && (
            <DocActionBar
              docType="purchase_invoice"
              docId={invoiceId}
              documentStatus={inv.documentStatus}
              postingStatus={inv.postingStatus}
              userId={currentUser?._id}
              companyId={company?._id}
            />
          )}
          <PdfDownloadButton
            document={<PurchaseInvoicePdf data={pdfData} />}
            fileName={`purchase-invoice-${inv.invoiceNumber}.pdf`}
            label={t("downloadPdf") ?? "PDF"}
          />
          <button onClick={() => window.print()} className="h-9 px-4 rounded-lg bg-[color:var(--brand-700)] text-white text-sm font-semibold flex items-center gap-2 hover:bg-[color:var(--brand-800)]">
            <Printer className="h-4 w-4" />{t("printInvoice")}
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-[color:var(--ink-100)] p-8 print:shadow-none print:border-none print:rounded-none print:p-6" dir={isRTL ? "rtl" : "ltr"}>
        <CompanyPrintHeader
          company={printCompany}
          isRTL={isRTL}
          documentTitle={t("purchaseInvoiceTitle")}
          periodLine={inv.invoiceDate}
        />
        <div className="flex items-start justify-between mb-6 border-b-2 border-[color:var(--ink-800)] pb-4 print:hidden">
          <div>
            <h2 className="section-title">{companyName}</h2>
            {inv.companyAddress && <p className="text-sm text-[color:var(--ink-600)] mt-1">{inv.companyAddress}</p>}
            {branchName && <p className="text-xs text-[color:var(--ink-500)] mt-0.5">{branchName}</p>}
          </div>
          <div className="text-end">
            <h1 className="text-2xl font-extrabold text-[color:var(--brand-700)]">{t("purchaseInvoiceTitle")}</h1>
            <p className="text-lg font-bold text-[color:var(--ink-800)] mt-1"># {inv.invoiceNumber}</p>
            <p className="text-sm text-[color:var(--ink-600)]">{inv.invoiceDate}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-[color:var(--ink-500)] font-semibold mb-1">{t("supplier")}</p>
            <p className="font-semibold text-[color:var(--ink-900)]">{supplierName}</p>
            {inv.supplierAddress && <p className="text-sm text-[color:var(--ink-600)] mt-0.5">{inv.supplierAddress}</p>}
            {inv.supplierVatNumber && (
              <p className="text-sm text-[color:var(--ink-500)] mt-0.5">
                {t("vatNumber")}: <span className="font-mono">{inv.supplierVatNumber}</span>
              </p>
            )}
          </div>
          <div className="text-end">
            <StatusBadge status={inv.postingStatus} type="posting" />
            {inv.companyVatNumber && (
              <p className="text-xs text-[color:var(--ink-500)] mt-2">
                {t("vatNumber")}: <span className="font-mono">{inv.companyVatNumber}</span>
              </p>
            )}
          </div>
        </div>
        <LinesTable lines={inv.lines} t={t} isRTL={isRTL} formatCurrency={formatCurrency} />
        <TotalsBlock inv={inv} t={t} formatCurrency={formatCurrency} />
        <SignatureStrip t={t} />
        <p className="text-center text-xs text-[color:var(--ink-400)] mt-8 print:mt-6">{t("printedBy")}</p>
      </div>
    </div>
  );
}
