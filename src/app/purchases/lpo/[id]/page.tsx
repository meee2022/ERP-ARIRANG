// @ts-nocheck
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { LoadingState } from "@/components/ui/data-display";
import { LPO_STATUS_CONFIG } from "@/lib/constants";
import { PdfDownloadButton } from "@/components/ui/PdfDownloadButton";
import { LpoPdf } from "@/lib/pdf/LpoPdf";
import { pdf as renderPdf } from "@react-pdf/renderer";
import {
  ArrowLeft, ArrowRight, Printer, Send, MessageCircle, Mail,
  CheckCircle, XCircle, FileCheck, FileSpreadsheet, ClipboardList,
} from "lucide-react";
import * as XLSX from "xlsx";

// ─── Lines table ────────────────────────────────────────────────────────────
function LinesTable({ lines, t, isRTL, formatCurrency }: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ background: "var(--brand-700)" }}>
            <th className="text-white font-semibold px-3 py-2.5 text-start w-8">#</th>
            <th className="text-white font-semibold px-3 py-2.5 text-start w-28">{t("itemCode")}</th>
            <th className="text-white font-semibold px-3 py-2.5 text-start">{t("itemName")}</th>
            <th className="text-white font-semibold px-3 py-2.5 text-end w-20">{t("orderedQty")}</th>
            <th className="text-white font-semibold px-3 py-2.5 text-end w-20">{t("receivedQty")}</th>
            <th className="text-white font-semibold px-3 py-2.5 text-center w-20">{t("remainingQty")}</th>
            <th className="text-white font-semibold px-3 py-2.5 text-start w-20">{t("uom") || "UOM"}</th>
            <th className="text-white font-semibold px-3 py-2.5 text-end w-28">{isRTL ? "السعر" : "Unit Price"}</th>
            <th className="text-white font-semibold px-3 py-2.5 text-end w-16">VAT%</th>
            <th className="text-white font-semibold px-3 py-2.5 text-end w-32">{isRTL ? "الإجمالي" : "Total"}</th>
          </tr>
        </thead>
        <tbody>
          {(lines ?? []).map((line: any, i: number) => {
            const fullyReceived = line.remainingQty === 0;
            const partial = line.receivedQty > 0 && line.remainingQty > 0;
            return (
              <tr key={line._id ?? i} className={i % 2 === 0 ? "bg-white" : "bg-[color:var(--ink-50)]"}>
                <td className="px-3 py-2 text-[color:var(--ink-400)] text-xs">{i + 1}</td>
                <td className="px-3 py-2 font-mono text-xs text-[color:var(--ink-600)]">{line.itemCode || "—"}</td>
                <td className="px-3 py-2 font-medium text-[color:var(--ink-900)]">
                  {isRTL ? line.itemNameAr : (line.itemNameEn || line.itemNameAr)}
                </td>
                <td className="px-3 py-2 text-end tabular-nums font-semibold">{line.quantity}</td>
                <td className="px-3 py-2 text-end tabular-nums text-[color:var(--ink-600)]">{line.receivedQty || 0}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums
                    ${fullyReceived ? "bg-emerald-100 text-emerald-700" : partial ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                    {line.remainingQty}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-[color:var(--ink-600)]">
                  {isRTL ? line.uomNameAr : (line.uomNameEn || line.uomNameAr)}
                </td>
                <td className="px-3 py-2 text-end tabular-nums">{formatCurrency(line.unitPrice ?? 0)}</td>
                <td className="px-3 py-2 text-end tabular-nums text-xs text-[color:var(--ink-500)]">{line.vatRate ?? 0}%</td>
                <td className="px-3 py-2 text-end tabular-nums font-semibold">{formatCurrency(line.lineTotal ?? 0)}</td>
              </tr>
            );
          })}
          {(lines ?? []).length < 3 &&
            Array.from({ length: 3 - (lines ?? []).length }).map((_, i) => (
              <tr key={`e${i}`} className={((lines ?? []).length + i) % 2 === 0 ? "bg-white" : "bg-[color:var(--ink-50)]"}>
                <td className="px-3 py-2 h-9" colSpan={10}>&nbsp;</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Action button (small) ──────────────────────────────────────────────────
function ActionBtn({ icon: Icon, label, onClick, disabled, color = "blue" }: any) {
  const colorMap: any = {
    blue:    "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    violet:  "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    red:     "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    green:   "bg-green-600 text-white hover:bg-green-700 border-green-600",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`h-8 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 border disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${colorMap[color]}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function LPODetailPage() {
  const { t, isRTL, lang, formatCurrency } = useI18n();
  const { currentUser } = useAuth();
  const { canCreate, canEdit } = usePermissions();
  const { company: settingsCompany } = useCompanySettings();
  const router = useRouter();
  const params = useParams();
  const poId = params?.id as string;

  const po = useQuery(api.purchaseOrders.getPurchaseOrderById, poId ? { poId: poId as any } : "skip");

  const approve = useMutation(api.purchaseOrders.approvePurchaseOrder);
  const markSent = useMutation(api.purchaseOrders.markAsSent);
  const cancelPO = useMutation(api.purchaseOrders.cancelPurchaseOrder);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (po === undefined) return <LoadingState label={t("loading") ?? "Loading..."} />;
  if (!po) return <div className="p-8 text-center text-[color:var(--ink-400)]"><p>{t("documentNotFound") ?? "Not found"}</p></div>;

  const companyName  = isRTL ? po.companyNameAr  : (po.companyNameEn  || po.companyNameAr);
  const branchName   = isRTL ? po.branchNameAr   : (po.branchNameEn   || po.branchNameAr);
  const supplierName = isRTL ? po.supplierNameAr : (po.supplierNameEn || po.supplierNameAr);
  const warehouseName= isRTL ? po.warehouseNameAr: (po.warehouseNameEn|| po.warehouseNameAr);
  const logoUrl      = settingsCompany?.logoUrl;
  const companyPhone = (settingsCompany as any)?.phone ?? po.companyPhone ?? "";
  const companyAddr  = (settingsCompany as any)?.address ?? po.companyAddress ?? "";
  const titleLabel   = lang === "ar" ? "طلب توريد محلي" : "Local Purchase Order";

  const status = po.documentStatus;
  const isDraft     = status === "draft";
  const isApproved  = status === "approved";
  const isSent      = status === "sent";
  const isPartial   = status === "partially_received";
  const isFull      = status === "fully_received";
  const isCancelled = status === "cancelled";
  // Share buttons available for any non-draft, non-cancelled LPO
  // (you might want to re-send to supplier even after full receipt)
  const canShare     = !isDraft && !isCancelled;
  // Create GRN only when something is still pending receipt
  const canCreateGRN = isApproved || isSent || isPartial;

  // ── Status badge config
  const statusCfg = (LPO_STATUS_CONFIG as any)[status] || LPO_STATUS_CONFIG.draft;

  // ── Action handlers
  const wrap = async (fn: () => Promise<any>) => {
    if (!currentUser?._id) return;
    setBusy(true); setError("");
    try { await fn(); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const onApprove   = () => wrap(() => approve({ poId: poId as any, userId: currentUser._id }));
  const onMarkSent  = () => wrap(() => markSent({ poId: poId as any, userId: currentUser._id }));
  const onCancel    = () => {
    if (!confirm(isRTL ? "هل أنت متأكد من إلغاء طلب التوريد؟" : "Cancel this purchase order?")) return;
    wrap(() => cancelPO({ poId: poId as any, userId: currentUser._id }));
  };

  // ── Share via WhatsApp / Email
  const buildMessage = (): string => {
    const lines = (po.lines ?? []).map((l: any, i: number) => {
      const name = isRTL ? l.itemNameAr : (l.itemNameEn || l.itemNameAr);
      const uom = isRTL ? l.uomNameAr : (l.uomNameEn || l.uomNameAr);
      return `${i + 1}. ${name} — ${l.quantity} ${uom}`;
    }).join("\n");

    const header = isRTL
      ? `طلب توريد محلي\nرقم الطلب: ${po.poNumber}\nالتاريخ: ${po.orderDate}\nالتسليم المتوقع: ${po.expectedDate || "—"}\nالشركة: ${companyName}\n\nالأصناف المطلوبة:\n${lines}\n\nالإجمالي: ${formatCurrency(po.totalAmount)}\n\nيرجى التأكيد والتجهيز.`
      : `Local Purchase Order\nLPO No.: ${po.poNumber}\nDate: ${po.orderDate}\nExpected: ${po.expectedDate || "—"}\nCompany: ${companyName}\n\nItems requested:\n${lines}\n\nTotal: ${formatCurrency(po.totalAmount)}\n\nPlease confirm and prepare.`;
    return header;
  };

  const sharePhone = (po.supplierPhone || "").replace(/[^0-9+]/g, "");
  const whatsappUrl = sharePhone
    ? `https://wa.me/${sharePhone.replace(/^\+/, "")}?text=${encodeURIComponent(buildMessage())}`
    : `https://wa.me/?text=${encodeURIComponent(buildMessage())}`;
  const emailUrl = po.supplierEmail
    ? `mailto:${po.supplierEmail}?subject=${encodeURIComponent(`${titleLabel} — ${po.poNumber}`)}&body=${encodeURIComponent(buildMessage())}`
    : `mailto:?subject=${encodeURIComponent(`${titleLabel} — ${po.poNumber}`)}&body=${encodeURIComponent(buildMessage())}`;

  const [sharingPdf, setSharingPdf] = useState(false);

  // ── Generate the LPO PDF as a File ─────────────────────────────────────
  const generatePdfFile = async (): Promise<File> => {
    const blob = await renderPdf(<LpoPdf data={pdfData} />).toBlob();
    return new File([blob], `LPO-${po.poNumber}.pdf`, { type: "application/pdf" });
  };

  // ── Smart share via WhatsApp (with PDF attached if possible) ──────────
  const handleShareWhatsApp = async () => {
    setSharingPdf(true);
    try {
      const file = await generatePdfFile();

      // Try the native Web Share API (works on mobile + some desktops)
      // This opens the OS share sheet with WhatsApp option + the PDF attached
      const nav: any = navigator;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({
          files: [file],
          text: buildMessage(),
          title: `${titleLabel} — ${po.poNumber}`,
        });
        return;
      }

      // Fallback: download the PDF + open WhatsApp Web with the message
      // User then attaches the just-downloaded PDF in WhatsApp manually
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(
        isRTL
          ? `✅ تم تنزيل الـ PDF بنجاح: ${file.name}\n\nالخطوة التالية:\n1. سيتم فتح WhatsApp Web\n2. اضغط على رمز المرفقات 📎\n3. اختر الـ PDF المُنزَّل\n4. أرسل الرسالة`
          : `✅ PDF downloaded: ${file.name}\n\nNext steps:\n1. WhatsApp Web will open\n2. Click the attachment icon 📎\n3. Select the downloaded PDF\n4. Send the message`
      );

      window.open(whatsappUrl, "_blank");
    } catch (e: any) {
      // User cancelled share — silent
      if (e?.name !== "AbortError") {
        alert((isRTL ? "خطأ في المشاركة: " : "Share error: ") + e.message);
      }
    } finally {
      setSharingPdf(false);
    }
  };

  // ── Smart share via Email (with PDF attached if possible) ─────────────
  const handleShareEmail = async () => {
    setSharingPdf(true);
    try {
      const file = await generatePdfFile();

      // Try Web Share API first (mobile)
      const nav: any = navigator;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({
          files: [file],
          text: buildMessage(),
          title: `${titleLabel} — ${po.poNumber}`,
        });
        return;
      }

      // Fallback: download PDF + open email client
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(
        isRTL
          ? `✅ تم تنزيل الـ PDF: ${file.name}\n\nسيتم فتح برنامج البريد الإلكتروني — قم بإرفاق الـ PDF يدوياً.`
          : `✅ PDF downloaded: ${file.name}\n\nYour email client will open — attach the downloaded PDF manually.`
      );

      window.open(emailUrl, "_blank");
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        alert((isRTL ? "خطأ في المشاركة: " : "Share error: ") + e.message);
      }
    } finally {
      setSharingPdf(false);
    }
  };

  // ── Excel export
  const exportExcel = () => {
    const rows = [
      [titleLabel, po.poNumber],
      [t("date"), po.orderDate],
      [t("expectedDate"), po.expectedDate || "—"],
      [t("supplier"), supplierName],
      [t("warehouse"), warehouseName],
      [],
      ["#", t("itemCode"), t("itemName"), t("orderedQty"), t("receivedQty"), t("remainingQty"), "UOM", "Unit Price", "VAT%", "Total"],
      ...(po.lines ?? []).map((l: any, i: number) => [
        i + 1, l.itemCode || "",
        isRTL ? l.itemNameAr : (l.itemNameEn || l.itemNameAr),
        l.quantity, l.receivedQty || 0, l.remainingQty || 0,
        isRTL ? l.uomNameAr : (l.uomNameEn || l.uomNameAr),
        l.unitPrice || 0, l.vatRate || 0, l.lineTotal || 0,
      ]),
      [],
      ["", "", "", "", "", "", "", "Subtotal", "", po.subtotal],
      ["", "", "", "", "", "", "", "VAT", "", po.vatAmount],
      ["", "", "", "", "", "", "", "Total", "", po.totalAmount],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LPO");
    XLSX.writeFile(wb, `lpo-${po.poNumber}.xlsx`);
  };

  // ── PDF data
  const pdfData = {
    logoUrl,
    companyName,
    companyNameEn: settingsCompany?.nameEn ?? undefined,
    companyAddress: companyAddr,
    companyPhone,
    branchName,
    poNumber: po.poNumber,
    orderDate: po.orderDate,
    expectedDate: po.expectedDate,
    documentStatus: status,
    supplierName, supplierPhone: po.supplierPhone, supplierEmail: po.supplierEmail,
    warehouseName,
    notes: po.notes,
    lines: (po.lines ?? []).map((l: any) => ({
      itemCode: l.itemCode,
      itemNameAr: l.itemNameAr,
      itemNameEn: l.itemNameEn,
      quantity: l.quantity,
      receivedQty: l.receivedQty || 0,
      remainingQty: l.remainingQty || 0,
      uomName: isRTL ? l.uomNameAr : (l.uomNameEn || l.uomNameAr),
      unitPrice: l.unitPrice ?? 0,
      vatRate: l.vatRate ?? 0,
      lineTotal: l.lineTotal ?? 0,
    })),
    subtotal: po.subtotal,
    vatAmount: po.vatAmount,
    totalAmount: po.totalAmount,
    isRTL,
    labels: {
      title: titleLabel,
      lpoNo: t("lpoNo"),
      date: t("date"),
      expected: t("expectedDate"),
      supplier: t("supplier"),
      warehouse: t("warehouse"),
      no: "#", code: t("itemCode"), name: t("itemName"),
      ordered: t("orderedQty"), received: t("receivedQty"), remaining: t("remainingQty"),
      uom: "UOM", unitPrice: isRTL ? "السعر" : "Unit Price", vat: "VAT%",
      total: isRTL ? "الإجمالي" : "Total",
      subtotal: isRTL ? "الإجمالي قبل VAT" : "Subtotal",
      vatLabel: "VAT", grandTotal: isRTL ? "الإجمالي" : "Total",
      preparedBy: t("preparedBy"), authorizedBy: t("authorizedBy"),
      supplierAck: isRTL ? "إقرار المورد" : "Supplier Acknowledgment",
      printedBy: t("printedBy"),
      notes: t("notes"),
    },
    formatCurrency: (n: number) => formatCurrency(n),
  };

  return (
    <div className="min-h-screen bg-[color:var(--ink-100)] print:bg-white" dir={isRTL ? "rtl" : "ltr"}>
      {/* ─── Sticky action bar ─── */}
      <div className="print:hidden sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[color:var(--ink-200)] px-6 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--ink-500)] hover:text-[color:var(--ink-900)]">
          {isRTL ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          {t("backToList")}
        </button>

        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Status-driven actions */}
            {isDraft && canEdit("purchases") && (
              <ActionBtn icon={CheckCircle} label={t("approve")} onClick={onApprove} disabled={busy} color="blue" />
            )}
            {isApproved && canEdit("purchases") && (
              <ActionBtn icon={Send} label={t("markAsSent")} onClick={onMarkSent} disabled={busy} color="violet" />
            )}
            {(isDraft || isApproved) && canEdit("purchases") && (
              <ActionBtn icon={XCircle} label={t("cancel")} onClick={onCancel} disabled={busy} color="red" />
            )}

            {/* Share buttons — attach PDF when possible */}
            {canShare && (
              <>
                <button
                  onClick={handleShareWhatsApp}
                  disabled={sharingPdf}
                  className="h-8 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  title={po.supplierPhone
                    ? `${po.supplierPhone} — ${isRTL ? "سيتم إرفاق الـ PDF" : "PDF will be attached"}`
                    : (isRTL ? "بدون رقم — سيفتح اختر مستلم" : "no phone — picker opens")}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {sharingPdf
                    ? (isRTL ? "جاري التحضير..." : "Preparing...")
                    : t("shareWhatsApp")}
                </button>
                <button
                  onClick={handleShareEmail}
                  disabled={sharingPdf}
                  className="h-8 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  title={po.supplierEmail
                    ? `${po.supplierEmail} — ${isRTL ? "سيتم إرفاق الـ PDF" : "PDF will be attached"}`
                    : (isRTL ? "بدون بريد" : "no email")}
                >
                  <Mail className="h-3.5 w-3.5" />
                  {sharingPdf
                    ? (isRTL ? "جاري التحضير..." : "Preparing...")
                    : t("shareEmail")}
                </button>
              </>
            )}

            {/* Create GRN */}
            {canCreateGRN && canCreate("purchases") && (
              <button
                onClick={() => router.push(`/purchases/grn?poId=${poId}`)}
                className="h-8 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <FileCheck className="h-3.5 w-3.5" />
                {t("createGRNFromLPO")}
              </button>
            )}

            {/* Excel + PDF + Print */}
            <button onClick={exportExcel} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
              <FileSpreadsheet className="h-3.5 w-3.5" />Excel
            </button>
            <PdfDownloadButton document={<LpoPdf data={pdfData} />} fileName={`lpo-${po.poNumber}.pdf`} label={t("downloadPdf") ?? "PDF"} />
            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold bg-[color:var(--brand-700)] text-white hover:bg-[color:var(--brand-800)]">
              <Printer className="h-3.5 w-3.5" />{t("printLPO")}
            </button>
          </div>
          {error && <p className="text-xs text-red-600 max-w-xs text-end">{error}</p>}
        </div>
      </div>

      {/* ─── Document body ─── */}
      <div className="max-w-5xl mx-auto my-8 print:my-0 print:max-w-none">
        <div className="bg-white rounded-2xl shadow-md print:shadow-none print:rounded-none overflow-hidden">
          {/* Header */}
          <div className="flex items-stretch justify-between px-8 pt-8 pb-6 gap-6">
            <div className="flex items-start gap-4 flex-1">
              {logoUrl ? (
                <Image src={logoUrl} alt="logo" width={80} height={80} className="rounded-xl object-contain shrink-0" unoptimized />
              ) : (
                <div className="h-16 w-16 rounded-xl flex items-center justify-center text-white text-2xl font-black shrink-0"
                  style={{ background: "linear-gradient(135deg, var(--brand-700), var(--brand-500))" }}>
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
                <p className="text-white text-2xl font-black tracking-tight mt-0.5">{po.poNumber}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 text-sm">
                <div className="flex items-center gap-2"><span className="text-[color:var(--ink-400)] text-xs">{t("date")}:</span><span className="font-semibold text-[color:var(--ink-800)]">{po.orderDate}</span></div>
                {po.expectedDate && (
                  <div className="flex items-center gap-2"><span className="text-[color:var(--ink-400)] text-xs">{t("expectedDate")}:</span><span className="font-semibold text-[color:var(--ink-800)]">{po.expectedDate}</span></div>
                )}
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full mt-1 ${statusCfg.bgColor} ${statusCfg.textColor}`}>
                  {isRTL ? statusCfg.labelAr : statusCfg.labelEn}
                </span>
              </div>
            </div>
          </div>

          <div className="h-0.5 mx-8" style={{ background: "linear-gradient(90deg, var(--brand-700), var(--brand-300), transparent)" }} />

          {/* Supplier + Warehouse cards */}
          <div className="px-8 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[color:var(--ink-50)] rounded-xl px-5 py-4 border border-[color:var(--ink-100)]">
              <p className="text-[10px] uppercase tracking-widest font-bold text-[color:var(--brand-600)] mb-1">{t("supplier")}</p>
              <p className="text-base font-extrabold text-[color:var(--ink-900)]">{supplierName}</p>
              <div className="flex flex-col gap-0.5 mt-1.5 text-[11px] text-[color:var(--ink-500)]">
                {po.supplierPhone && <span>📞 {po.supplierPhone}</span>}
                {po.supplierEmail && <span>✉ {po.supplierEmail}</span>}
                {po.supplierAddress && <span>🏢 {po.supplierAddress}</span>}
              </div>
            </div>
            <div className="bg-[color:var(--ink-50)] rounded-xl px-5 py-4 border border-[color:var(--ink-100)]">
              <p className="text-[10px] uppercase tracking-widest font-bold text-[color:var(--brand-600)] mb-1">{t("warehouse")}</p>
              <p className="text-base font-extrabold text-[color:var(--ink-900)]">{warehouseName}</p>
            </div>
          </div>

          {/* Lines */}
          <div className="px-8 pb-2">
            <LinesTable lines={po.lines} t={t} isRTL={isRTL} formatCurrency={formatCurrency} />
          </div>

          {/* Totals */}
          <div className="px-8 pb-6 flex justify-end mt-4">
            <div className="w-80 space-y-1">
              <div className="flex justify-between px-3 py-2 text-sm text-[color:var(--ink-700)]">
                <span>{isRTL ? "الإجمالي قبل VAT" : "Subtotal"}</span>
                <span className="tabular-nums font-semibold">{formatCurrency(po.subtotal)}</span>
              </div>
              <div className="flex justify-between px-3 py-2 text-sm text-[color:var(--ink-700)]">
                <span>VAT</span>
                <span className="tabular-nums font-semibold">{formatCurrency(po.vatAmount)}</span>
              </div>
              <div className="flex justify-between px-3 py-3 rounded-lg text-white font-extrabold text-base" style={{ background: "var(--brand-700)" }}>
                <span>{isRTL ? "الإجمالي" : "Total"}</span>
                <span className="tabular-nums">{formatCurrency(po.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {po.notes && (
            <div className="px-8 pb-4">
              <p className="text-xs font-bold text-[color:var(--ink-500)] uppercase tracking-wider mb-1.5">{t("notes")}</p>
              <p className="text-sm text-[color:var(--ink-700)] bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">{po.notes}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="px-8 pb-6">
            <div className="grid grid-cols-3 gap-8 pt-6 border-t border-[color:var(--ink-200)]">
              {[
                t("preparedBy"),
                t("authorizedBy"),
                isRTL ? "إقرار المورد" : "Supplier Acknowledgment",
              ].map((label) => (
                <div key={label} className="text-center">
                  <div className="h-12 border-b-2 border-dotted border-[color:var(--ink-300)] mx-2 mb-2" />
                  <p className="text-xs text-[color:var(--ink-500)] font-medium tracking-wide uppercase">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer bar */}
          <div className="px-8 py-3 text-center text-xs text-white/80" style={{ background: "var(--brand-700)" }}>
            {t("printedBy")} — {companyName}
          </div>
        </div>
      </div>
    </div>
  );
}
