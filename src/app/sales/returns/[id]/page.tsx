// @ts-nocheck
"use client";

import React from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { DocActionBar } from "@/components/ui/doc-action-bar";
import { PdfDownloadButton } from "@/components/ui/PdfDownloadButton";
import { SalesReturnPdf } from "@/lib/pdf/SalesReturnPdf";
import { ArrowLeft, ArrowRight, Printer, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { useCompanySettings } from "@/hooks/useCompanySettings";

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
            <tr key={line._id ?? i} className={i % 2 === 0 ? "bg-white" : "bg-[color:var(--ink-50)]"}>
              <td className="px-3 py-2 text-[color:var(--ink-400)] text-xs">{i + 1}</td>
              <td className="px-3 py-2 font-mono text-xs text-[color:var(--ink-600)]">{line.itemCode ?? "—"}</td>
              <td className="px-3 py-2 font-medium text-[color:var(--ink-900)]">
                {isRTL ? line.itemNameAr : (line.itemNameEn || line.itemNameAr || "—")}
              </td>
              <td className="px-3 py-2 text-end tabular-nums">{line.quantity}</td>
              <td className="px-3 py-2 text-end tabular-nums">{formatCurrency(line.unitPrice ?? 0)}</td>
              <td className="px-3 py-2 text-end tabular-nums font-semibold text-[color:var(--ink-900)]">
                {formatCurrency(line.lineTotal ?? line.quantity * (line.unitPrice ?? 0))}
              </td>
            </tr>
          ))}
          {(lines ?? []).length < 3 && Array.from({ length: 3 - (lines ?? []).length }).map((_, i) => (
            <tr key={`e${i}`} className={((lines ?? []).length + i) % 2 === 0 ? "bg-white" : "bg-[color:var(--ink-50)]"}>
              <td className="px-3 py-2 h-9" colSpan={6}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SalesReturnDetailPage() {
  const { t, isRTL, lang, formatCurrency } = useI18n();
  const { currentUser } = useAuth();
  const { canPost } = usePermissions();
  const { company: settingsCompany } = useCompanySettings();
  const router = useRouter();
  const params = useParams();
  const returnId = params?.id as string;

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const ret = useQuery(api.salesReturns.getSalesReturn, returnId ? { returnId: returnId as any } : "skip");

  if (ret === undefined) return <LoadingState label="Loading..." />;
  if (!ret) return <EmptyState title="Not found" />;

  const companyName  = isRTL ? ret.companyNameAr  : (ret.companyNameEn  || ret.companyNameAr);
  const branchName   = isRTL ? ret.branchNameAr   : (ret.branchNameEn   || ret.branchNameAr);
  const customerName = isRTL ? (ret.customerNameAr || "—") : (ret.customerNameEn || ret.customerNameAr || "—");
  const logoUrl      = settingsCompany?.logoUrl;
  const companyPhone = (settingsCompany as any)?.phone ?? "";
  const companyAddr  = (settingsCompany as any)?.address ?? ret.companyAddress ?? "";

  const lines       = ret.lines ?? [];
  const subtotal    = lines.reduce((s: number, l: any) => s + (l.lineTotal ?? l.quantity * (l.unitPrice ?? 0)), 0);
  const vatAmount   = ret.vatAmount ?? 0;
  const totalAmount = ret.totalAmount ?? subtotal + vatAmount;
  const returnNum   = ret.returnNumber ?? returnId.slice(-8);
  const returnDate  = ret.returnDate ?? "";
  const isPosted    = ret.postingStatus === "posted";
  const titleLabel  = lang === "ar" ? "مرتجع مبيعات" : "Sales Return";

  const exportExcel = () => {
    const rows = [
      [titleLabel], [lang === "ar" ? "رقم المرتجع" : "Return #", returnNum],
      [t("date"), returnDate], [t("customer"), customerName],
      [lang === "ar" ? "الفاتورة الأصلية" : "Original Invoice", ret.originalInvoiceNumber ?? ""],
      [], ["#", t("itemCode"), t("itemName"), t("quantity"), t("unitPrice"), t("lineTotal")],
      ...lines.map((l: any, i: number) => [i+1, l.itemCode ?? "", isRTL ? l.itemNameAr : (l.itemNameEn || l.itemNameAr), l.quantity, l.unitPrice ?? 0, l.lineTotal ?? 0]),
      [], ["","","","", t("subtotal"), subtotal],
      ...(vatAmount > 0 ? [["","","","", t("taxAmount"), vatAmount]] : []),
      ["","","","", lang === "ar" ? "إجمالي المرتجع" : "Return Total", totalAmount],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Return");
    XLSX.writeFile(wb, `sales-return-${returnNum}.xlsx`);
  };

  const pdfData = {
    logoUrl, companyNameEn: settingsCompany?.nameEn ?? undefined, companyPhone,
    companyName, companyAddress: companyAddr, branchName, companyVatNumber: ret.companyVatNumber,
    returnNumber: returnNum, returnDate, postingStatus: ret.postingStatus,
    customerName, customerAddress: ret.customerAddress,
    originalInvoiceNumber: ret.originalInvoiceNumber, originalInvoiceDate: ret.originalInvoiceDate,
    reason: ret.reason, notes: ret.notes,
    lines: lines.map((l: any) => ({ itemCode: l.itemCode, itemNameAr: l.itemNameAr ?? "", itemNameEn: l.itemNameEn, quantity: l.quantity, unitPrice: l.unitPrice ?? 0, lineTotal: l.lineTotal ?? l.quantity * (l.unitPrice ?? 0) })),
    vatAmount, totalAmount, isRTL,
    labels: { title: titleLabel, billTo: t("customer"), date: t("date"), originalInvoiceRef: lang === "ar" ? "الفاتورة الأصلية" : "Original Invoice", reason: lang === "ar" ? "سبب الإرجاع" : "Reason", notes: t("notes") ?? "Notes", no: "#", code: t("itemCode"), name: t("itemName"), qty: t("quantity"), price: t("unitPrice"), total: t("lineTotal"), subtotal: t("subtotal"), vat: t("taxAmount"), returnTotal: lang === "ar" ? "إجمالي المرتجع" : "Return Total", preparedBy: t("preparedBy"), authorizedBy: t("authorizedBy"), receivedBy: t("receivedBy"), printedBy: t("printedBy") },
    formatCurrency: (n: number) => formatCurrency(n),
  };

  return (
    <div className="min-h-screen bg-[color:var(--ink-100)] print:bg-white" dir={isRTL ? "rtl" : "ltr"}>
      {/* Toolbar */}
      <div className="print:hidden sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[color:var(--ink-200)] px-6 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--ink-500)] hover:text-[color:var(--ink-900)] transition-colors">
          {isRTL ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          {t("backToList")}
        </button>
        <div className="flex items-center gap-2">
          {canPost("sales") && <DocActionBar docType="sales_return" docId={returnId} documentStatus={ret.documentStatus} postingStatus={ret.postingStatus} userId={currentUser?._id} companyId={company?._id} />}
          <button onClick={exportExcel} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700">
            <FileSpreadsheet className="h-4 w-4" />Excel
          </button>
          <PdfDownloadButton document={<SalesReturnPdf data={pdfData} />} fileName={`sales-return-${returnNum}.pdf`} label={t("downloadPdf") ?? "PDF"} />
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[color:var(--brand-700)] text-white hover:bg-[color:var(--brand-800)]">
            <Printer className="h-4 w-4" />{t("printInvoice")}
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="max-w-4xl mx-auto my-8 print:my-0 print:max-w-none">
        <div className="bg-white rounded-2xl shadow-md print:shadow-none print:rounded-none overflow-hidden">

          {/* Header band */}
          <div className="flex items-stretch justify-between px-8 pt-8 pb-6 gap-6">
            <div className="flex items-start gap-4 flex-1">
              {logoUrl ? (
                <Image src={logoUrl} alt="logo" width={80} height={80} className="rounded-xl object-contain shrink-0" unoptimized />
              ) : (
                <div className="h-16 w-16 rounded-xl flex items-center justify-center text-white text-2xl font-black shrink-0" style={{ background: "linear-gradient(135deg, var(--brand-700), var(--brand-500))" }}>
                  {(companyName || "A").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col gap-0.5 pt-1">
                <h1 className="text-xl font-black text-[color:var(--ink-900)]">{companyName}</h1>
                {branchName && <p className="text-sm font-semibold text-[color:var(--brand-600)]">{branchName}</p>}
                {companyAddr && <p className="text-xs text-[color:var(--ink-500)] mt-1">{companyAddr}</p>}
                {companyPhone && <p className="text-xs text-[color:var(--ink-500)]">{companyPhone}</p>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-3 shrink-0">
              <div className="px-5 py-2 rounded-xl text-end" style={{ background: "var(--brand-700)" }}>
                <p className="text-white text-xs font-semibold tracking-widest uppercase opacity-80">{titleLabel}</p>
                <p className="text-white text-2xl font-black tracking-tight mt-0.5">{returnNum}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[color:var(--ink-400)] text-xs">{t("date")}:</span>
                  <span className="font-semibold text-[color:var(--ink-800)]">{returnDate}</span>
                </div>
                {ret.originalInvoiceNumber && (
                  <div className="flex items-center gap-2">
                    <span className="text-[color:var(--ink-400)] text-xs">{lang === "ar" ? "الفاتورة الأصلية:" : "Original Invoice:"}</span>
                    <span className="font-bold text-[color:var(--brand-700)]">{ret.originalInvoiceNumber}</span>
                  </div>
                )}
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full mt-1 ${isPosted ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                  {isPosted ? (lang === "ar" ? "مرحّل" : "Posted") : (lang === "ar" ? "غير مرحّل" : "Unposted")}
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-0.5 mx-8" style={{ background: "linear-gradient(90deg, var(--brand-700), var(--brand-300), transparent)" }} />

          {/* Bill To */}
          <div className="px-8 py-5">
            <div className="bg-[color:var(--ink-50)] rounded-xl px-5 py-4 border border-[color:var(--ink-100)] inline-block min-w-64">
              <p className="text-[10px] uppercase tracking-widest font-bold text-[color:var(--brand-600)] mb-2">{t("customer")}</p>
              <p className="text-base font-extrabold text-[color:var(--ink-900)]">{customerName}</p>
              {ret.customerAddress && <p className="text-sm text-[color:var(--ink-500)] mt-1">{ret.customerAddress}</p>}
            </div>
          </div>

          {/* Reason / original invoice note */}
          {(ret.reason || ret.notes) && (
            <div className="mx-8 mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              {ret.reason && <p><span className="font-semibold text-amber-800">{lang === "ar" ? "سبب الإرجاع:" : "Reason:"} </span>{ret.reason}</p>}
              {ret.notes && <p className="mt-1"><span className="font-semibold text-amber-800">{t("notes")}: </span>{ret.notes}</p>}
            </div>
          )}

          {/* Lines */}
          <div className="px-8 pb-2">
            <LinesTable lines={lines} t={t} isRTL={isRTL} formatCurrency={formatCurrency} />
          </div>

          {/* Totals */}
          <div className="px-8 pb-6 flex justify-end mt-4">
            <div className="w-72">
              <div className="flex justify-between py-1.5 text-sm text-[color:var(--ink-600)] border-b border-[color:var(--ink-100)]">
                <span>{t("subtotal")}</span><span className="tabular-nums font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {vatAmount > 0 && (
                <div className="flex justify-between py-1.5 text-sm text-[color:var(--ink-600)] border-b border-[color:var(--ink-100)]">
                  <span>{t("taxAmount")}</span><span className="tabular-nums font-medium">{formatCurrency(vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between px-3 py-3 mt-1 rounded-lg text-white font-extrabold text-base" style={{ background: "var(--brand-700)" }}>
                <span>{lang === "ar" ? "إجمالي المرتجع" : "Return Total"}</span>
                <span className="tabular-nums">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="px-8 pb-6">
            <div className="grid grid-cols-3 gap-8 pt-6 border-t border-[color:var(--ink-200)]">
              {[t("preparedBy"), t("authorizedBy"), t("receivedBy")].map((label) => (
                <div key={label} className="text-center">
                  <div className="h-12 border-b-2 border-dotted border-[color:var(--ink-300)] mx-2 mb-2" />
                  <p className="text-xs text-[color:var(--ink-500)] font-medium tracking-wide uppercase">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-3 text-center text-xs text-white/80" style={{ background: "var(--brand-700)" }}>
            {t("printedBy")} — {companyName}
          </div>
        </div>
      </div>
    </div>
  );
}
