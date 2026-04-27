// @ts-nocheck
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { PdfDownloadButton } from "@/components/ui/PdfDownloadButton";
import { VoucherPdf } from "@/lib/pdf/VoucherPdf";
import { LoadingState } from "@/components/ui/data-display";
import { ArrowLeft, ArrowRight, Printer } from "lucide-react";
import { CompanyPrintHeader } from "@/components/ui/company-print-header";
import { useCompanySettings } from "@/hooks/useCompanySettings";

const PAYMENT_METHOD_LABELS: Record<string, { ar: string; en: string }> = {
  cash:         { ar: "نقداً",        en: "Cash"          },
  bank_transfer:{ ar: "تحويل بنكي",  en: "Bank Transfer"  },
  cheque:       { ar: "شيك",          en: "Cheque"         },
  credit_card:  { ar: "بطاقة ائتمان", en: "Credit Card"   },
};

export default function PaymentVoucherPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t, isRTL, lang } = useI18n();
  const { company: printCompany } = useCompanySettings();

  const voucher = useQuery(
    api.treasury.getPaymentById,
    id && id !== "new" ? { voucherId: id as any } : "skip"
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-QA", {
      style: "currency",
      currency: "QAR",
      minimumFractionDigits: 2,
    }).format(n / 100);

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (voucher === undefined)
    return <LoadingState label={t("loading")} />;
  if (!voucher)
    return <div className="p-8 text-center text-red-500">{t("notFound")}</div>;

  const companyName = isRTL ? voucher.companyNameAr : (voucher.companyNameEn || voucher.companyNameAr);
  const branchName  = isRTL ? voucher.branchNameAr  : (voucher.branchNameEn  || voucher.branchNameAr);
  const partyName   = isRTL
    ? voucher.supplierNameAr
    : (voucher.supplierNameEn || voucher.supplierNameAr);
  const methodLabel = PAYMENT_METHOD_LABELS[voucher.paymentMethod]?.[lang] ?? voucher.paymentMethod;

  const voucherPdf: any = {
    logoUrl: printCompany?.logoUrl ?? undefined,
    companyNameEn: printCompany?.nameEn ?? undefined,
    companyPhone: printCompany?.phone ?? undefined,
    companyName, companyAddress: voucher.companyAddress, branchName,
    voucherNumber: voucher.voucherNumber, voucherDate: voucher.voucherDate,
    partyName: partyName ?? "—",
    accountName: voucher.accountName ?? "—",
    paymentMethod: methodLabel,
    reference: voucher.referenceNumber,
    amount: voucher.amount ?? 0,
    notes: voucher.notes,
    isReceipt: false, isRTL,
    labels: {
      title: t("cashPaymentVoucher"), date: t("date"),
      partyLabel: t("paidTo") ?? t("supplier"), accountLabel: t("account"),
      paymentMethodLabel: t("paymentMethod"), referenceLabel: t("reference"),
      amountLabel: isRTL ? "المبلغ المدفوع" : "Amount Paid",
      preparedBy: t("preparedBy"), authorizedBy: t("authorizedBy"), receivedBy: t("receivedBy"),
      printedBy: t("printedBy"), notesLabel: t("notes") ?? "Notes",
    },
    formatCurrency: (n: number) => formatCurrency(n),
  };

  return (
    <div className="min-h-screen bg-[color:var(--ink-50)] p-4" dir={isRTL ? "rtl" : "ltr"}>
      {/* Toolbar */}
      <div className="print:hidden flex items-center justify-between mb-6 max-w-2xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-[color:var(--ink-600)] hover:text-[color:var(--ink-900)]">
          <BackIcon className="w-4 h-4" />{t("backToList")}
        </button>
        <div className="flex items-center gap-3">
          <PdfDownloadButton
            document={<VoucherPdf data={voucherPdf} />}
            fileName={`payment-${voucher.voucherNumber}.pdf`}
            label={t("downloadPdf") ?? "PDF"}
          />
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700">
            <Printer className="w-4 h-4" />{t("printInvoice")}
          </button>
        </div>
      </div>

      {/* Voucher */}
      <div className="max-w-2xl mx-auto surface-card print:shadow-none print:border-none p-8">

        <CompanyPrintHeader
          company={printCompany}
          isRTL={isRTL}
          documentTitle={t("cashPaymentVoucher")}
          periodLine={voucher.voucherDate}
        />

        {/* ── Company Header ── */}
        <div className="flex justify-between items-start pb-5 mb-5 border-b-2 border-rose-600 print:hidden">
          <div>
            <h1 className="text-xl font-extrabold text-[color:var(--ink-900)]">{companyName}</h1>
            {branchName && <p className="text-sm text-rose-600 font-medium mt-0.5">{branchName}</p>}
            {voucher.companyAddress && <p className="text-xs text-[color:var(--ink-400)] mt-1">{voucher.companyAddress}</p>}
            {voucher.companyPhone && <p className="text-xs text-[color:var(--ink-400)]">{voucher.companyPhone}</p>}
            {voucher.companyVatNumber && (
              <p className="text-xs text-[color:var(--ink-400)]">
                {lang === "ar" ? "الرقم الضريبي:" : "VAT No:"} {voucher.companyVatNumber}
              </p>
            )}
          </div>
          <div className="text-end">
            <div className="inline-block bg-rose-600 text-white px-4 py-1.5 rounded-lg mb-2">
              <p className="text-sm font-bold">{t("cashPaymentVoucher")}</p>
            </div>
            <p className="text-sm text-[color:var(--ink-600)]">
              <span className="font-medium">{t("voucherNumber")}:</span>{" "}
              <span className="font-mono font-bold text-[color:var(--ink-800)]">{voucher.voucherNumber}</span>
            </p>
            <p className="text-sm text-[color:var(--ink-600)] mt-0.5">
              <span className="font-medium">{t("date")}:</span> {voucher.voucherDate}
            </p>
          </div>
        </div>

        {/* ── Info Grid ── */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-6 text-sm">
          <InfoRow label={t("paidTo")} value={partyName || "—"} />
          <InfoRow label={t("paymentMethod")} value={methodLabel} highlight />
          <InfoRow label={t("account")} value={voucher.accountName || "—"} />
          {voucher.referenceNumber && (
            <InfoRow label={t("reference")} value={voucher.referenceNumber} />
          )}
        </div>

        {/* ── Amount Box ── */}
        <div className="voucher-amount-box bg-rose-50 border-2 border-rose-300 rounded-xl p-6 mb-6 text-center">
          <p className="text-xs font-medium text-rose-600 uppercase tracking-widest mb-2">
            {lang === "ar" ? "المبلغ المدفوع" : "Amount Paid"}
          </p>
          <p className="text-4xl font-extrabold text-rose-800">{fmt(voucher.amount ?? 0)}</p>
        </div>

        {/* ── Notes ── */}
        {voucher.notes && (
          <div className="mb-6 px-4 py-3 bg-[color:var(--ink-50)] rounded-lg text-sm border border-[color:var(--ink-200)]">
            <span className="font-medium text-[color:var(--ink-600)]">{t("notes")}: </span>
            <span className="text-[color:var(--ink-700)]">{voucher.notes}</span>
          </div>
        )}

        {/* ── Signatures ── */}
        <div className="grid grid-cols-3 gap-6 mt-10 pt-6 border-t text-xs text-center text-[color:var(--ink-500)]">
          {[t("preparedBy"), t("approvedBy"), t("receivedBy")].map((label) => (
            <div key={label} className="signature-line">
              <div className="h-10" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex gap-2 items-baseline">
      <span className="text-[color:var(--ink-500)] shrink-0">{label}:</span>
      <span className={`font-semibold ${highlight ? "text-rose-700" : "text-[color:var(--ink-800)]"}`}>{value}</span>
    </div>
  );
}
