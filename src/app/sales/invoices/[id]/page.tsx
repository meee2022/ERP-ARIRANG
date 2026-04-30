// @ts-nocheck
"use client";

import React from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { PdfDownloadButton } from "@/components/ui/PdfDownloadButton";
import { SalesInvoicePdf } from "@/lib/pdf/SalesInvoicePdf";
import { ArrowLeft, ArrowRight, FileSpreadsheet, Printer } from "lucide-react";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import * as XLSX from "xlsx";

// ─── Status watermark for unposted invoices ───────────────────────────────────
function DraftWatermark({ label }: { label: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 flex items-center justify-center print:flex hidden z-0 opacity-[0.04]">
      <span className="text-[120px] font-black text-red-600 rotate-[-35deg] select-none uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}

// ─── Invoice lines table ──────────────────────────────────────────────────────
function LinesTable({ lines, t, isRTL, formatCurrency }: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ background: "var(--brand-700)" }}>
            <th className="text-white font-semibold px-3 py-2.5 text-start w-8">#</th>
            <th className="text-white font-semibold px-3 py-2.5 text-start w-28">{t("itemCode")}</th>
            <th className="text-white font-semibold px-3 py-2.5 text-start">{t("itemName")}</th>
            <th className="text-white font-semibold px-3 py-2.5 text-end w-24">{t("quantity")}</th>
            <th className="text-white font-semibold px-3 py-2.5 text-end w-32">{t("unitPrice")}</th>
            <th className="text-white font-semibold px-3 py-2.5 text-end w-32">{t("lineTotal")}</th>
          </tr>
        </thead>
        <tbody>
          {(lines ?? []).map((line: any, i: number) => (
            <tr
              key={line._id ?? i}
              className={i % 2 === 0 ? "bg-white" : "bg-[color:var(--ink-50)]"}
            >
              <td className="px-3 py-2 text-[color:var(--ink-400)] text-xs">{i + 1}</td>
              <td className="px-3 py-2 font-mono text-xs text-[color:var(--ink-600)]">{line.itemCode || "—"}</td>
              <td className="px-3 py-2 font-medium text-[color:var(--ink-900)]">
                {line.itemNameAr
                  ? isRTL ? line.itemNameAr : (line.itemNameEn || line.itemNameAr)
                  : (line.description || "—")}
              </td>
              <td className="px-3 py-2 text-end tabular-nums text-[color:var(--ink-700)]">{line.quantity}</td>
              <td className="px-3 py-2 text-end tabular-nums text-[color:var(--ink-700)]">{formatCurrency(line.unitPrice ?? 0)}</td>
              <td className="px-3 py-2 text-end tabular-nums font-semibold text-[color:var(--ink-900)]">{formatCurrency(line.lineTotal ?? 0)}</td>
            </tr>
          ))}
          {/* Empty rows filler for short invoices */}
          {(lines ?? []).length < 3 && Array.from({ length: 3 - (lines ?? []).length }).map((_, i) => (
            <tr key={`empty-${i}`} className={((lines ?? []).length + i) % 2 === 0 ? "bg-white" : "bg-[color:var(--ink-50)]"}>
              <td className="px-3 py-2 h-9" colSpan={6}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Totals ───────────────────────────────────────────────────────────────────
function TotalsBlock({ inv, t, formatCurrency, lang }: any) {
  const subtotal = (inv.lines ?? []).reduce((s: number, l: any) => s + (l.lineTotal ?? 0), 0);
  const vatAmt   = inv.vatAmount ?? 0;
  const total    = inv.totalAmount ?? subtotal + vatAmt;
  return (
    <div className="flex justify-end mt-4">
      <div className="w-72">
        <div className="flex justify-between py-1.5 text-sm text-[color:var(--ink-600)] border-b border-[color:var(--ink-100)]">
          <span>{t("subtotal")}</span>
          <span className="tabular-nums font-medium">{formatCurrency(subtotal)}</span>
        </div>
        {vatAmt > 0 && (
          <div className="flex justify-between py-1.5 text-sm text-[color:var(--ink-600)] border-b border-[color:var(--ink-100)]">
            <span>{t("taxAmount")} (5%)</span>
            <span className="tabular-nums font-medium">{formatCurrency(vatAmt)}</span>
          </div>
        )}
        <div
          className="flex justify-between px-3 py-3 mt-1 rounded-lg text-white font-extrabold text-base"
          style={{ background: "var(--brand-700)" }}
        >
          <span>{t("invoiceTotal")}</span>
          <span className="tabular-nums">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Signatures ───────────────────────────────────────────────────────────────
function SignatureStrip({ t }: any) {
  return (
    <div className="grid grid-cols-3 gap-8 mt-10 pt-6 border-t border-[color:var(--ink-200)]">
      {[t("preparedBy"), t("authorizedBy"), t("receivedBy")].map((label) => (
        <div key={label} className="text-center">
          <div className="h-12 border-b-2 border-dotted border-[color:var(--ink-300)] mx-2 mb-2" />
          <p className="text-xs text-[color:var(--ink-500)] font-medium tracking-wide uppercase">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Info pill (label + value) ────────────────────────────────────────────────
function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest font-semibold text-[color:var(--ink-400)]">{label}</span>
      <span className="text-sm font-bold text-[color:var(--ink-900)]">{value}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SalesInvoiceDetailPage() {
  const { t, isRTL, lang, formatCurrency } = useI18n();
  const { company: printCompany } = useCompanySettings();
  const router = useRouter();
  const params = useParams();
  const invoiceId = params?.id as string;

  const inv = useQuery(
    api.salesInvoices.getInvoiceById,
    invoiceId && invoiceId !== "new" ? { invoiceId: invoiceId as any } : "skip"
  );

  if (inv === undefined) return <LoadingState label="Loading..." />;
  if (!inv) return <EmptyState title="Not found" />;

  const companyName  = isRTL ? inv.companyNameAr : (inv.companyNameEn || inv.companyNameAr);
  const branchName   = isRTL ? inv.branchNameAr  : (inv.branchNameEn  || inv.branchNameAr);
  const customerName = isRTL
    ? (inv.customerNameAr ?? inv.customerNameEn ?? "—")
    : (inv.customerNameEn ?? inv.customerNameAr ?? "—");

  const logoUrl = printCompany?.logoUrl;
  const companyPhone   = (printCompany as any)?.phone ?? "";
  const companyAddress = (printCompany as any)?.address ?? inv.companyAddress ?? "";
  const companyVat     = inv.companyVatNumber ?? "";

  const isPosted = inv.postingStatus === "posted";

  // ── Excel export ─────────────────────────────────────────────────────────
  const exportExcel = () => {
    const subtotal = (inv.lines ?? []).reduce((s: number, l: any) => s + (l.lineTotal ?? 0), 0);
    const rows = [
      [t("salesInvoiceTitle")],
      [t("invoiceNumber"), inv.invoiceNumber],
      ...(inv.externalInvoiceNumber ? [[t("customerInvoiceNo"), inv.externalInvoiceNumber]] : []),
      [t("date"), inv.invoiceDate],
      [t("billTo"), customerName],
      [],
      ["#", t("itemCode"), t("itemName"), t("quantity"), t("unitPrice"), t("lineTotal")],
      ...(inv.lines ?? []).map((l: any, i: number) => [
        i + 1, l.itemCode || "", isRTL ? (l.itemNameAr || l.description || "") : (l.itemNameEn || l.itemNameAr || l.description || ""),
        l.quantity, l.unitPrice ?? 0, l.lineTotal ?? 0,
      ]),
      [],
      ["", "", "", "", t("subtotal"), subtotal],
      ...(inv.vatAmount ? [["", "", "", "", t("taxAmount"), inv.vatAmount]] : []),
      ["", "", "", "", t("invoiceTotal"), inv.totalAmount ?? subtotal],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 4 }, { wch: 14 }, { wch: 30 }, { wch: 10 }, { wch: 14 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoice");
    XLSX.writeFile(wb, `sales-invoice-${inv.invoiceNumber}.xlsx`);
  };

  // ── PDF data ──────────────────────────────────────────────────────────────
  const pdfData = {
    logoUrl, companyNameEn: printCompany?.nameEn ?? undefined, companyPhone,
    companyName, companyAddress, branchName, companyVatNumber: companyVat,
    invoiceNumber: inv.invoiceNumber, invoiceDate: inv.invoiceDate,
    postingStatus: inv.postingStatus, customerName,
    customerAddress: inv.customerAddress, customerVatNumber: inv.customerVatNumber,
    lines: inv.lines ?? [], vatAmount: inv.vatAmount ?? 0, totalAmount: inv.totalAmount ?? 0,
    isRTL,
    labels: {
      title: t("salesInvoiceTitle"), billTo: t("billTo"), date: t("date"),
      vatNumber: t("vatNumber"), no: "#", code: t("itemCode"), name: t("itemName"),
      qty: t("quantity"), price: t("unitPrice"), total: t("lineTotal"),
      subtotal: t("subtotal"), vat: t("taxAmount"), invoiceTotal: t("invoiceTotal"),
      preparedBy: t("preparedBy"), authorizedBy: t("authorizedBy"), receivedBy: t("receivedBy"),
      printedBy: t("printedBy"),
    },
    formatCurrency: (n: number) => formatCurrency(n),
  };

  return (
    <div className="min-h-screen bg-[color:var(--ink-100)] print:bg-white" dir={isRTL ? "rtl" : "ltr"}>

      {/* Draft watermark */}
      {!isPosted && <DraftWatermark label={lang === "ar" ? "مسودة" : "DRAFT"} />}

      {/* ── Toolbar ── */}
      <div className="print:hidden sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[color:var(--ink-200)] px-6 py-3 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--ink-500)] hover:text-[color:var(--ink-900)] transition-colors"
        >
          {isRTL ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          {t("backToList")}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>
          <PdfDownloadButton
            document={<SalesInvoicePdf data={pdfData} />}
            fileName={`sales-invoice-${inv.invoiceNumber}.pdf`}
            label={t("downloadPdf") ?? "PDF"}
          />
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[color:var(--brand-700)] text-white hover:bg-[color:var(--brand-800)] transition-colors"
          >
            <Printer className="h-4 w-4" />
            {t("printInvoice")}
          </button>
        </div>
      </div>

      {/* ── Invoice card ── */}
      <div className="max-w-4xl mx-auto my-8 print:my-0 print:max-w-none">
        <div className="bg-white rounded-2xl shadow-md print:shadow-none print:rounded-none overflow-hidden">

          {/* ══ TOP HEADER BAND ══════════════════════════════════════════════ */}
          <div className="flex items-stretch justify-between px-8 pt-8 pb-6 gap-6">

            {/* Left: Logo + Company Info */}
            <div className="flex items-start gap-4 flex-1">
              {logoUrl ? (
                <div className="shrink-0">
                  <Image
                    src={logoUrl}
                    alt="logo"
                    width={80}
                    height={80}
                    className="rounded-xl object-contain"
                    unoptimized
                  />
                </div>
              ) : (
                <div
                  className="h-16 w-16 rounded-xl flex items-center justify-center text-white text-2xl font-black shrink-0"
                  style={{ background: "linear-gradient(135deg, var(--brand-700), var(--brand-500))" }}
                >
                  {(companyName || "A").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col gap-0.5 pt-1">
                <h1 className="text-xl font-black text-[color:var(--ink-900)] leading-tight">{companyName}</h1>
                {branchName && <p className="text-sm font-semibold text-[color:var(--brand-600)]">{branchName}</p>}
                {companyAddress && <p className="text-xs text-[color:var(--ink-500)] mt-1">{companyAddress}</p>}
                {companyPhone && <p className="text-xs text-[color:var(--ink-500)]">{companyPhone}</p>}
                {companyVat && (
                  <p className="text-xs text-[color:var(--ink-500)]">
                    {lang === "ar" ? "الرقم الضريبي:" : "VAT No:"}{" "}
                    <span className="font-mono font-semibold">{companyVat}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Right: Invoice badge + details */}
            <div className="flex flex-col items-end gap-3 shrink-0">
              <div
                className="px-5 py-2 rounded-xl text-end"
                style={{ background: "var(--brand-700)" }}
              >
                <p className="text-white text-xs font-semibold tracking-widest uppercase opacity-80">
                  {lang === "ar" ? "فاتورة ضريبية" : "TAX INVOICE"}
                </p>
                <p className="text-white text-2xl font-black tracking-tight mt-0.5">
                  {inv.invoiceNumber}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[color:var(--ink-400)] text-xs">{t("date")}:</span>
                  <span className="font-semibold text-[color:var(--ink-800)]">{inv.invoiceDate}</span>
                </div>
                {inv.dueDate && (
                  <div className="flex items-center gap-2">
                    <span className="text-[color:var(--ink-400)] text-xs">{lang === "ar" ? "تاريخ الاستحقاق:" : "Due Date:"}</span>
                    <span className="font-semibold text-[color:var(--ink-800)]">{inv.dueDate}</span>
                  </div>
                )}
                {inv.externalInvoiceNumber && (
                  <div className="flex items-center gap-2">
                    <span className="text-[color:var(--ink-400)] text-xs">{t("customerInvoiceNo")}:</span>
                    <span className="font-bold text-[color:var(--brand-700)]">{inv.externalInvoiceNumber}</span>
                  </div>
                )}
                {/* Posting badge */}
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full mt-1 ${
                    isPosted
                      ? "bg-green-100 text-green-700"
                      : inv.postingStatus === "reversed"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {isPosted
                    ? (lang === "ar" ? "مرحّل" : "Posted")
                    : inv.postingStatus === "reversed"
                    ? (lang === "ar" ? "معكوس" : "Reversed")
                    : (lang === "ar" ? "غير مرحّل" : "Unposted")}
                </span>
              </div>
            </div>
          </div>

          {/* ══ DIVIDER ══════════════════════════════════════════════════════ */}
          <div className="h-0.5 mx-8" style={{ background: "linear-gradient(90deg, var(--brand-700), var(--brand-300), transparent)" }} />

          {/* ══ BILL TO ══════════════════════════════════════════════════════ */}
          <div className="px-8 py-5 grid grid-cols-2 gap-6">
            <div className="bg-[color:var(--ink-50)] rounded-xl px-5 py-4 border border-[color:var(--ink-100)]">
              <p className="text-[10px] uppercase tracking-widest font-bold text-[color:var(--brand-600)] mb-2">
                {t("billTo")}
              </p>
              <p className="text-base font-extrabold text-[color:var(--ink-900)]">{customerName}</p>
              {inv.customerAddress && (
                <p className="text-sm text-[color:var(--ink-500)] mt-1">{inv.customerAddress}</p>
              )}
              {inv.customerVatNumber && (
                <p className="text-xs text-[color:var(--ink-500)] mt-1">
                  {lang === "ar" ? "الرقم الضريبي:" : "VAT No:"}{" "}
                  <span className="font-mono font-semibold text-[color:var(--ink-700)]">{inv.customerVatNumber}</span>
                </p>
              )}
            </div>
            <div className="flex flex-col justify-center gap-3">
              {/* nothing else needed here — invoice details are in top-right */}
            </div>
          </div>

          {/* ══ LINES TABLE ══════════════════════════════════════════════════ */}
          <div className="px-8 pb-2">
            <LinesTable lines={inv.lines} t={t} isRTL={isRTL} formatCurrency={formatCurrency} />
          </div>

          {/* ══ TOTALS ═══════════════════════════════════════════════════════ */}
          <div className="px-8 pb-6">
            <TotalsBlock inv={inv} t={t} formatCurrency={formatCurrency} lang={lang} />
          </div>

          {/* ══ NOTES ════════════════════════════════════════════════════════ */}
          {inv.notes && (
            <div className="mx-8 mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <span className="font-semibold text-amber-800">{t("notes")}: </span>
              <span className="text-amber-700">{inv.notes}</span>
            </div>
          )}

          {/* ══ SIGNATURES ═══════════════════════════════════════════════════ */}
          <div className="px-8 pb-6">
            <SignatureStrip t={t} />
          </div>

          {/* ══ FOOTER ═══════════════════════════════════════════════════════ */}
          <div
            className="px-8 py-3 text-center text-xs text-white/80"
            style={{ background: "var(--brand-700)" }}
          >
            {t("printedBy")} — {companyName}
          </div>
        </div>
      </div>
    </div>
  );
}
