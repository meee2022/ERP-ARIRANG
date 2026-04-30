// @ts-nocheck
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { formatCurrency } from "@/lib/i18n";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { PdfDownloadButton } from "@/components/ui/PdfDownloadButton";
import { VoucherPdf } from "@/lib/pdf/VoucherPdf";
import { LoadingState } from "@/components/ui/data-display";
import { ArrowLeft, ArrowRight, FileSpreadsheet, Printer, Link2, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { useCompanySettings } from "@/hooks/useCompanySettings";

const PAYMENT_METHOD_LABELS: Record<string, { ar: string; en: string }> = {
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

export default function ReceiptVoucherPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t, isRTL, lang } = useI18n();
  const { company: printCompany } = useCompanySettings();
  const { currentUser } = useAuth();

  const [allocAmounts, setAllocAmounts] = useState<Record<string, string>>({});
  const [allocating, setAllocating] = useState(false);
  const [allocError, setAllocError] = useState("");

  const voucher = useQuery(api.treasury.getReceiptById, id && id !== "new" ? { voucherId: id as any } : "skip");
  const existingAllocations = useQuery(api.treasury.getReceiptAllocations, id && id !== "new" ? { voucherId: id as any } : "skip");
  const openInvoices = useQuery(
    api.treasury.getOpenInvoicesForCustomer,
    voucher?.customerId ? { customerId: voucher.customerId, companyId: voucher.companyId } : "skip"
  );
  const allocateReceipt = useMutation(api.treasury.allocateReceipt);

  const fmt = (n: number) => new Intl.NumberFormat("en-QA", { style: "currency", currency: "QAR", minimumFractionDigits: 2 }).format(n);
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const handleAllocate = async () => {
    if (!currentUser?._id) return;
    const allocations = Object.entries(allocAmounts)
      .map(([invoiceId, amt]) => ({ invoiceId: invoiceId as any, amount: parseFloat(amt) || 0 }))
      .filter((a) => a.amount > 0);
    if (allocations.length === 0) {
      setAllocError(lang === "ar" ? "أدخل مبلغاً واحداً على الأقل" : "Enter at least one amount");
      return;
    }
    setAllocating(true);
    setAllocError("");
    try {
      await allocateReceipt({ voucherId: id as any, userId: currentUser._id as any, allocations });
      setAllocAmounts({});
    } catch (e: any) {
      setAllocError(e.message ?? (lang === "ar" ? "حدث خطأ" : "Error"));
    } finally {
      setAllocating(false);
    }
  };

  const alreadyAllocatedTotal = existingAllocations?.reduce((s, a) => s + a.allocatedAmount, 0) ?? 0;
  const availableBalance = (voucher?.amount ?? 0) - alreadyAllocatedTotal;
  const canAllocate = voucher?.postingStatus === "posted" && voucher?.customerId && voucher?.allocationStatus !== "fully_allocated";

  if (voucher === undefined) return <LoadingState label={t("loading")} />;
  if (!voucher) return <div className="p-8 text-center text-red-500">{t("notFound")}</div>;

  const companyName = isRTL ? voucher.companyNameAr : (voucher.companyNameEn || voucher.companyNameAr);
  const branchName  = isRTL ? voucher.branchNameAr  : (voucher.branchNameEn  || voucher.branchNameAr);
  const partyName   = isRTL ? voucher.customerNameAr : (voucher.customerNameEn || voucher.customerNameAr);
  const methodLabel = PAYMENT_METHOD_LABELS[voucher.paymentMethod]?.[lang] ?? voucher.paymentMethod;
  const logoUrl     = printCompany?.logoUrl;
  const companyPhone= (printCompany as any)?.phone ?? voucher.companyPhone ?? "";
  const companyAddr = (printCompany as any)?.address ?? voucher.companyAddress ?? "";
  const isPosted    = voucher.postingStatus === "posted";

  // indigo accent for receipts
  const accent = "#4f46e5";

  const exportExcel = () => {
    const rows = [
      [lang === "ar" ? "سند القبض" : "Receipt Voucher", voucher.voucherNumber ?? ""],
      [t("date"), voucher.voucherDate ?? ""],
      [lang === "ar" ? "مستلم من" : "Received From", partyName ?? "—"],
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
    XLSX.utils.book_append_sheet(wb, ws, "Receipt");
    XLSX.writeFile(wb, `receipt-${voucher.voucherNumber}.xlsx`);
  };

  const voucherPdf: any = {
    logoUrl, companyNameEn: printCompany?.nameEn ?? undefined, companyPhone,
    companyName, companyAddress: companyAddr, branchName,
    voucherNumber: voucher.voucherNumber, voucherDate: voucher.voucherDate,
    partyName: partyName ?? "—", accountName: voucher.accountName ?? "—",
    paymentMethod: methodLabel, reference: voucher.referenceNumber,
    amount: voucher.amount ?? 0, notes: voucher.notes, isReceipt: true, isRTL,
    labels: {
      title: t("cashReceiptVoucher"), date: t("date"),
      partyLabel: t("receivedFrom") ?? t("customer"), accountLabel: t("account"),
      paymentMethodLabel: t("paymentMethod"), referenceLabel: t("reference"),
      amountLabel: lang === "ar" ? "المبلغ المستلم" : "Amount Received",
      preparedBy: t("preparedBy"), authorizedBy: t("authorizedBy"), receivedBy: t("receivedBy"),
      printedBy: t("printedBy"), notesLabel: t("notes") ?? "Notes",
    },
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
          <PdfDownloadButton document={<VoucherPdf data={voucherPdf} />} fileName={`receipt-${voucher.voucherNumber}.pdf`} label={t("downloadPdf") ?? "PDF"} />
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
                <p className="text-white text-xs font-semibold tracking-widest uppercase opacity-80">{t("cashReceiptVoucher")}</p>
                <p className="text-white text-xl font-black tracking-tight mt-0.5">{voucher.voucherNumber}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 text-sm">
                <div className="flex items-center gap-2"><span className="text-[color:var(--ink-400)] text-xs">{t("date")}:</span><span className="font-semibold text-[color:var(--ink-800)]">{voucher.voucherDate}</span></div>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${isPosted ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                  {isPosted ? (lang === "ar" ? "مرحّل" : "Posted") : (lang === "ar" ? "غير مرحّل" : "Unposted")}
                </span>
                {voucher.allocationStatus === "fully_allocated" && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    {lang === "ar" ? "مخصص بالكامل" : "Fully Allocated"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-0.5 mx-8" style={{ background: `linear-gradient(90deg, ${accent}, #a5b4fc, transparent)` }} />

          {/* Info grid */}
          <div className="px-8 py-6 grid grid-cols-2 gap-x-8 gap-y-4">
            <InfoRow label={lang === "ar" ? "مستلم من" : "Received From"} value={partyName || "—"} />
            <InfoRow label={t("paymentMethod")} value={methodLabel} accent />
            <InfoRow label={t("account")} value={voucher.accountName || "—"} />
            {voucher.referenceNumber && <InfoRow label={t("reference")} value={voucher.referenceNumber} />}
            {voucher.forMonth && <InfoRow label={t("forMonth")} value={voucher.forMonth} />}
            {voucher.customerPhone && <InfoRow label={lang === "ar" ? "هاتف العميل" : "Customer Phone"} value={voucher.customerPhone} />}
          </div>

          {/* Amount box */}
          <div className="mx-8 mb-6 rounded-2xl p-6 text-center border-2" style={{ background: "#eef2ff", borderColor: "#a5b4fc" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: accent }}>{lang === "ar" ? "المبلغ المستلم" : "Amount Received"}</p>
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

      {/* Allocation Section */}
      {canAllocate && (
        <div className="max-w-2xl mx-auto mb-8 print:hidden">
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-[color:var(--ink-100)] flex items-center gap-2" style={{ borderTop: `3px solid ${accent}` }}>
              <Link2 className="w-5 h-5" style={{ color: accent }} />
              <h2 className="text-base font-bold text-[color:var(--ink-900)]">
                {lang === "ar" ? "تخصيص سند القبض على الفواتير" : "Allocate Receipt to Invoices"}
              </h2>
            </div>
            <div className="px-6 py-5">
              {/* Available balance */}
              <div className="flex items-center justify-between mb-4 px-4 py-2.5 rounded-lg border" style={{ background: "#eef2ff", borderColor: "#a5b4fc" }}>
                <span className="text-sm font-medium" style={{ color: accent }}>
                  {lang === "ar" ? "الرصيد المتاح للتخصيص" : "Available Balance"}
                </span>
                <span className="font-bold" style={{ color: accent }}>{fmt(availableBalance)}</span>
              </div>

              {/* Existing allocations */}
              {existingAllocations && existingAllocations.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-[color:var(--ink-500)] uppercase tracking-wide mb-2">
                    {lang === "ar" ? "التخصيصات السابقة" : "Existing Allocations"}
                  </p>
                  <div className="space-y-1.5">
                    {existingAllocations.map((a) => (
                      <div key={a._id} className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-[color:var(--ink-800)]">{a.invoiceNumber}</span>
                          <span className="text-[color:var(--ink-400)] text-xs">{a.invoiceDate}</span>
                        </div>
                        <span className="font-semibold text-green-700">{fmt(a.allocatedAmount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Open invoices */}
              {openInvoices && openInvoices.length > 0 ? (
                <>
                  <p className="text-xs font-semibold text-[color:var(--ink-500)] uppercase tracking-wide mb-2">
                    {lang === "ar" ? "الفواتير المفتوحة" : "Open Invoices"}
                  </p>
                  <div className="space-y-2 mb-4">
                    {openInvoices.map((inv) => (
                      <div key={inv._id} className="flex items-center gap-3 px-3 py-2.5 border border-[color:var(--ink-200)] rounded-lg bg-white">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-[color:var(--ink-800)]">{inv.invoiceNumber}</span>
                            <span className="text-xs text-[color:var(--ink-400)]">{inv.invoiceDate}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${inv.paymentStatus === "partial" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                              {inv.paymentStatus === "partial" ? (lang === "ar" ? "جزئي" : "Partial") : (lang === "ar" ? "غير مسدد" : "Unpaid")}
                            </span>
                          </div>
                          <div className="flex gap-3 mt-0.5 text-xs text-[color:var(--ink-500)]">
                            <span>{lang === "ar" ? "الإجمالي:" : "Total:"} {fmt(inv.totalAmount)}</span>
                            {inv.alreadyAllocated > 0 && <span>{lang === "ar" ? "مخصص:" : "Allocated:"} {fmt(inv.alreadyAllocated)}</span>}
                            <span className="font-semibold" style={{ color: accent }}>{lang === "ar" ? "المتبقي:" : "Remaining:"} {fmt(inv.remaining)}</span>
                          </div>
                        </div>
                        <input
                          type="number" min="0" step="0.01"
                          max={Math.min(inv.remaining, availableBalance)}
                          placeholder="0.00"
                          value={allocAmounts[inv._id] ?? ""}
                          onChange={(e) => setAllocAmounts((prev) => ({ ...prev, [inv._id]: e.target.value }))}
                          className="w-28 h-9 px-2 text-sm border border-[color:var(--ink-200)] rounded-lg focus:outline-none focus:ring-1 text-end"
                          style={{ "--tw-ring-color": accent } as any}
                        />
                      </div>
                    ))}
                  </div>
                  {allocError && <p className="text-sm text-red-600 mb-3">{allocError}</p>}
                  <button
                    onClick={handleAllocate}
                    disabled={allocating}
                    className="w-full h-10 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
                    style={{ background: accent }}
                  >
                    {allocating ? (lang === "ar" ? "جارٍ التخصيص..." : "Allocating...") : (lang === "ar" ? "تأكيد التخصيص" : "Confirm Allocation")}
                  </button>
                </>
              ) : openInvoices !== undefined ? (
                <p className="text-sm text-[color:var(--ink-400)] text-center py-4">
                  {lang === "ar" ? "لا توجد فواتير مفتوحة لهذا العميل" : "No open invoices for this customer"}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Fully allocated badge */}
      {voucher?.allocationStatus === "fully_allocated" && (
        <div className="max-w-2xl mx-auto mb-8 print:hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-300 rounded-xl">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-semibold text-green-700">
              {lang === "ar" ? "تم تخصيص السند بالكامل" : "Receipt fully allocated"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
