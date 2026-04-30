// @ts-nocheck
"use client";

import React from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { PdfDownloadButton } from "@/components/ui/PdfDownloadButton";
import { VoucherPdf } from "@/lib/pdf/VoucherPdf";
import { LoadingState } from "@/components/ui/data-display";
import { ArrowLeft, ArrowRight, FileSpreadsheet, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { formatCurrency } from "@/lib/i18n";

const METHOD_LABELS: Record<string, { ar: string; en: string }> = {
  cash:         { ar: "نقداً",        en: "Cash"          },
  bank_transfer:{ ar: "تحويل بنكي",  en: "Bank Transfer" },
  cheque:       { ar: "شيك",          en: "Cheque"        },
  credit_card:  { ar: "بطاقة ائتمان", en: "Credit Card"  },
};

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest font-semibold text-[color:var(--ink-400)]">{label}</span>
      <span className={`text-sm font-bold ${accent ? "text-[color:var(--brand-700)]" : "text-[color:var(--ink-800)]"}`}>{value}</span>
    </div>
  );
}

export default function PaymentVoucherPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t, isRTL, lang } = useI18n();
  const { company: printCompany } = useCompanySettings();

  const voucher = useQuery(api.treasury.getPaymentById, id && id !== "new" ? { voucherId: id as any } : "skip");

  const fmt = (n: number) => new Intl.NumberFormat("en-QA", { style: "currency", currency: "QAR", minimumFractionDigits: 2 }).format(n);
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (voucher === undefined) return <LoadingState label={t("loading")} />;
  if (!voucher) return <div className="p-8 text-center text-red-500">{t("notFound")}</div>;

  const companyName = isRTL ? voucher.companyNameAr : (voucher.companyNameEn || voucher.companyNameAr);
  const branchName  = isRTL ? voucher.branchNameAr  : (voucher.branchNameEn  || voucher.branchNameAr);
  const partyName   = isRTL ? voucher.supplierNameAr : (voucher.supplierNameEn || voucher.supplierNameAr);
  const methodLabel = METHOD_LABELS[voucher.paymentMethod]?.[lang] ?? voucher.paymentMethod;
  const logoUrl     = printCompany?.logoUrl;
  const companyPhone= (printCompany as any)?.phone ?? voucher.companyPhone ?? "";
  const companyAddr = (printCompany as any)?.address ?? voucher.companyAddress ?? "";
  const isPosted    = voucher.postingStatus === "posted";

  // accent: rose for payment
  const accent = "#e11d48"; // rose-600

  const exportExcel = () => {
    const rows = [
      [lang === "ar" ? "سند الصرف" : "Payment Voucher", voucher.voucherNumber ?? ""],
      [t("date"), voucher.voucherDate ?? ""],
      [lang === "ar" ? "مدفوع إلى" : "Paid To", partyName ?? "—"],
      [t("account"), voucher.accountName ?? "—"],
      [t("paymentMethod"), methodLabel],
      ...(voucher.referenceNumber ? [[t("reference"), voucher.referenceNumber]] : []),
      ...(voucher.forMonth ? [[t("forMonth"), voucher.forMonth]] : []),
      [lang === "ar" ? "المبلغ (ر.ق)" : "Amount (QAR)", voucher.amount ?? 0],
      ...(voucher.notes ? [[t("notes"), voucher.notes]] : []),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 22 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payment");
    XLSX.writeFile(wb, `payment-${voucher.voucherNumber}.xlsx`);
  };

  const voucherPdf: any = {
    logoUrl, companyNameEn: printCompany?.nameEn ?? undefined, companyPhone,
    companyName, companyAddress: companyAddr, branchName,
    voucherNumber: voucher.voucherNumber, voucherDate: voucher.voucherDate,
    partyName: partyName ?? "—", accountName: voucher.accountName ?? "—",
    paymentMethod: methodLabel, reference: voucher.referenceNumber,
    amount: voucher.amount ?? 0, notes: voucher.notes, isReceipt: false, isRTL,
    labels: { title: t("cashPaymentVoucher"), date: t("date"), partyLabel: t("paidTo") ?? t("supplier"), accountLabel: t("account"), paymentMethodLabel: t("paymentMethod"), referenceLabel: t("reference"), amountLabel: lang === "ar" ? "المبلغ المدفوع" : "Amount Paid", preparedBy: t("preparedBy"), authorizedBy: t("authorizedBy"), receivedBy: t("receivedBy"), printedBy: t("printedBy"), notesLabel: t("notes") ?? "Notes" },
    formatCurrency: (n: number) => formatCurrency(n),
  };

  return (
    <div className="min-h-screen bg-[color:var(--ink-100)] print:bg-white" dir={isRTL ? "rtl" : "ltr"}>
      {/* Toolbar */}
      <div className="print:hidden sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[color:var(--ink-200)] px-6 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--ink-500)] hover:text-[color:var(--ink-900)] transition-colors">
          <BackIcon className="h-4 w-4" />{t("backToList")}
        </button>
        <div className="flex items-center gap-2">
          <button onClick={exportExcel} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700"><FileSpreadsheet className="h-4 w-4" />Excel</button>
          <PdfDownloadButton document={<VoucherPdf data={voucherPdf} />} fileName={`payment-${voucher.voucherNumber}.pdf`} label={t("downloadPdf") ?? "PDF"} />
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90" style={{ background: accent }}><Printer className="h-4 w-4" />{t("printInvoice")}</button>
        </div>
      </div>

      {/* Card */}
      <div className="max-w-2xl mx-auto my-8 print:my-0 print:max-w-none">
        <div className="bg-white rounded-2xl shadow-md print:shadow-none print:rounded-none overflow-hidden">

          {/* Header */}
          <div className="flex items-stretch justify-between px-8 pt-8 pb-6 gap-6">
            <div className="flex items-start gap-4 flex-1">
              {logoUrl ? <Image src={logoUrl} alt="logo" width={72} height={72} className="rounded-xl object-contain shrink-0" unoptimized /> : (
                <div className="h-14 w-14 rounded-xl flex items-center justify-center text-white text-xl font-black shrink-0" style={{ background: accent }}>{(companyName || "A").charAt(0).toUpperCase()}</div>
              )}
              <div className="flex flex-col gap-0.5 pt-1">
                <h1 className="text-lg font-black text-[color:var(--ink-900)]">{companyName}</h1>
                {branchName && <p className="text-sm font-semibold" style={{ color: accent }}>{branchName}</p>}
                {companyAddr && <p className="text-xs text-[color:var(--ink-500)] mt-1">{companyAddr}</p>}
                {companyPhone && <p className="text-xs text-[color:var(--ink-500)]">{companyPhone}</p>}
                {voucher.companyVatNumber && <p className="text-xs text-[color:var(--ink-500)]">{lang === "ar" ? "الرقم الضريبي:" : "VAT No:"} <span className="font-mono font-semibold">{voucher.companyVatNumber}</span></p>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-3 shrink-0">
              <div className="px-5 py-2 rounded-xl text-end" style={{ background: accent }}>
                <p className="text-white text-xs font-semibold tracking-widest uppercase opacity-80">{t("cashPaymentVoucher")}</p>
                <p className="text-white text-xl font-black tracking-tight mt-0.5">{voucher.voucherNumber}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 text-sm">
                <div className="flex items-center gap-2"><span className="text-[color:var(--ink-400)] text-xs">{t("date")}:</span><span className="font-semibold text-[color:var(--ink-800)]">{voucher.voucherDate}</span></div>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${isPosted ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                  {isPosted ? (lang === "ar" ? "مرحّل" : "Posted") : (lang === "ar" ? "غير مرحّل" : "Unposted")}
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-0.5 mx-8" style={{ background: `linear-gradient(90deg, ${accent}, #fda4af, transparent)` }} />

          {/* Info grid */}
          <div className="px-8 py-6 grid grid-cols-2 gap-x-8 gap-y-4">
            <InfoRow label={lang === "ar" ? "مدفوع إلى" : "Paid To"} value={partyName || "—"} />
            <InfoRow label={t("paymentMethod")} value={methodLabel} accent />
            <InfoRow label={t("account")} value={voucher.accountName || "—"} />
            {voucher.referenceNumber && <InfoRow label={t("reference")} value={voucher.referenceNumber} />}
            {voucher.forMonth && <InfoRow label={t("forMonth")} value={voucher.forMonth} />}
          </div>

          {/* Amount box */}
          <div className="mx-8 mb-6 rounded-2xl p-6 text-center border-2" style={{ background: "#fff1f2", borderColor: "#fda4af" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: accent }}>{lang === "ar" ? "المبلغ المدفوع" : "Amount Paid"}</p>
            <p className="text-5xl font-black tabular-nums" style={{ color: accent }}>{fmt(voucher.amount ?? 0)}</p>
          </div>

          {/* Notes */}
          {voucher.notes && (
            <div className="mx-8 mb-6 px-4 py-3 bg-[color:var(--ink-50)] rounded-lg text-sm border border-[color:var(--ink-200)]">
              <span className="font-semibold text-[color:var(--ink-600)]">{t("notes")}: </span>
              <span className="text-[color:var(--ink-700)]">{voucher.notes}</span>
            </div>
          )}

          {/* Signatures */}
          <div className="px-8 pb-6">
            <div className="grid grid-cols-3 gap-8 pt-6 border-t border-[color:var(--ink-200)]">
              {[t("preparedBy"), t("approvedBy"), t("receivedBy")].map((label) => (
                <div key={label} className="text-center">
                  <div className="h-12 border-b-2 border-dotted border-[color:var(--ink-300)] mx-2 mb-2" />
                  <p className="text-xs text-[color:var(--ink-500)] font-medium tracking-wide uppercase">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-3 text-center text-xs text-white/80" style={{ background: accent }}>
            {t("printedBy")} — {companyName}
          </div>
        </div>
      </div>
    </div>
  );
}
