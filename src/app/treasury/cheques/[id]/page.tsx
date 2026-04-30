// @ts-nocheck
"use client";

import React from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { LoadingState } from "@/components/ui/data-display";
import { ArrowLeft, ArrowRight, FileSpreadsheet, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import { useCompanySettings } from "@/hooks/useCompanySettings";

const CHEQUE_STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  received:      { ar: "مستلم",      en: "Received"   },
  deposited:     { ar: "مودع",       en: "Deposited"  },
  cleared:       { ar: "محصّل",      en: "Cleared"    },
  bounced:       { ar: "مرتجع",      en: "Bounced"    },
  issued:        { ar: "صادر",       en: "Issued"     },
  presented:     { ar: "مقدم للبنك", en: "Presented"  },
  cleared_issued:{ ar: "تم الصرف",   en: "Cleared"    },
  stopped:       { ar: "موقوف",      en: "Stopped"    },
};
const CHEQUE_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  received: { ar: "شيك وارد", en: "Received Cheque" },
  issued:   { ar: "شيك صادر", en: "Issued Cheque"   },
};

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest font-semibold text-[color:var(--ink-400)]">{label}</span>
      <span className={`text-sm font-bold ${accent ? "text-[color:var(--brand-700)]" : "text-[color:var(--ink-800)]"}`}>{value}</span>
    </div>
  );
}

export default function ChequeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t, isRTL, lang, formatCurrency } = useI18n();
  const { company: printCompany } = useCompanySettings();

  const cheque = useQuery(api.treasury.getChequeById, id ? { chequeId: id as any } : "skip");
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (cheque === undefined) return <LoadingState label={t("loading")} />;
  if (!cheque) return <div className="p-8 text-center text-red-500">{t("notFound")}</div>;

  const companyName = isRTL ? cheque.companyNameAr : (cheque.companyNameEn || cheque.companyNameAr);
  const branchName  = isRTL ? cheque.branchNameAr  : (cheque.branchNameEn  || cheque.branchNameAr);
  const partyName   = cheque.chequeType === "received"
    ? (isRTL ? cheque.customerNameAr : (cheque.customerNameEn || cheque.customerNameAr))
    : (isRTL ? cheque.supplierNameAr : (cheque.supplierNameEn || cheque.supplierNameAr));

  const statusLabel = CHEQUE_STATUS_LABELS[cheque.chequeStatus]?.[lang] ?? cheque.chequeStatus;
  const typeLabel   = CHEQUE_TYPE_LABELS[cheque.chequeType]?.[lang] ?? cheque.chequeType;
  const logoUrl     = printCompany?.logoUrl;
  const companyPhone= (printCompany as any)?.phone ?? cheque.companyPhone ?? "";
  const companyAddr = (printCompany as any)?.address ?? cheque.companyAddress ?? "";

  const fmt = (n: number) => new Intl.NumberFormat("en-QA", { style: "currency", currency: "QAR", minimumFractionDigits: 2 }).format(n);

  // Blue for received, purple for issued
  const accent = cheque.chequeType === "received" ? "#2563eb" : "#7c3aed";
  const accentLight = cheque.chequeType === "received" ? "#eff6ff" : "#f5f3ff";
  const accentBorder = cheque.chequeType === "received" ? "#bfdbfe" : "#ddd6fe";

  const exportExcel = () => {
    const rows = [
      [typeLabel, cheque.chequeNumber ?? ""],
      [lang === "ar" ? "الحالة" : "Status", statusLabel],
      [lang === "ar" ? "تاريخ الاستحقاق" : "Due Date", cheque.dueDate ?? ""],
      ...(cheque.issueDate ? [[lang === "ar" ? "تاريخ الإصدار" : "Issue Date", cheque.issueDate]] : []),
      [cheque.chequeType === "received" ? t("customer") : t("supplier"), partyName ?? "—"],
      [lang === "ar" ? "بنك العميل" : "Customer's Bank", cheque.drawnOnBank ?? "—"],
      [lang === "ar" ? "حسابنا البنكي" : "Our Bank Account", `${cheque.bankAccountName} — ${cheque.bankName}`],
      [lang === "ar" ? "المبلغ (ر.ق)" : "Amount (QAR)", cheque.amount ?? 0],
      ...(cheque.notes ? [[t("notes"), cheque.notes]] : []),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 24 }, { wch: 36 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cheque");
    XLSX.writeFile(wb, `cheque-${cheque.chequeNumber}.xlsx`);
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
              </div>
            </div>
            <div className="flex flex-col items-end gap-3 shrink-0">
              <div className="px-5 py-2 rounded-xl text-end" style={{ background: accent }}>
                <p className="text-white text-xs font-semibold tracking-widest uppercase opacity-80">{typeLabel}</p>
                <p className="text-white text-xl font-black tracking-tight mt-0.5">{cheque.chequeNumber}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[color:var(--ink-400)] text-xs">{lang === "ar" ? "تاريخ الاستحقاق:" : "Due Date:"}</span>
                  <span className="font-semibold text-[color:var(--ink-800)]">{cheque.dueDate}</span>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: accentLight, color: accent }}>{statusLabel}</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-0.5 mx-8" style={{ background: `linear-gradient(90deg, ${accent}, ${accentBorder}, transparent)` }} />

          {/* Info grid */}
          <div className="px-8 py-6 grid grid-cols-2 gap-x-8 gap-y-4">
            {partyName && <InfoRow label={cheque.chequeType === "received" ? t("customer") : t("supplier")} value={partyName} />}
            <InfoRow label={lang === "ar" ? "بنك العميل" : "Customer's Bank"} value={cheque.drawnOnBank || "—"} />
            <InfoRow label={lang === "ar" ? "حسابنا البنكي" : "Our Bank Account"} value={`${cheque.bankAccountName} — ${cheque.bankName}`} />
            <InfoRow label={lang === "ar" ? "الحساب المحاسبي" : "GL Account"} value={`${cheque.glAccountCode} — ${cheque.glAccountName}`} />
            {cheque.issueDate && <InfoRow label={lang === "ar" ? "تاريخ الإصدار" : "Issue Date"} value={cheque.issueDate} />}
            {cheque.depositDate && <InfoRow label={lang === "ar" ? "تاريخ الإيداع" : "Deposit Date"} value={cheque.depositDate} />}
            {cheque.clearingDate && <InfoRow label={lang === "ar" ? "تاريخ التحصيل" : "Clearing Date"} value={cheque.clearingDate} />}
            {cheque.bounceDate && <InfoRow label={lang === "ar" ? "تاريخ الارتداد" : "Bounce Date"} value={cheque.bounceDate} />}
            {cheque.bounceReason && <InfoRow label={lang === "ar" ? "سبب الارتداد" : "Bounce Reason"} value={cheque.bounceReason} />}
          </div>

          {/* Amount box */}
          <div className="mx-8 mb-6 rounded-2xl p-6 text-center border-2" style={{ background: accentLight, borderColor: accentBorder }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: accent }}>{lang === "ar" ? "قيمة الشيك" : "Cheque Amount"}</p>
            <p className="text-5xl font-black tabular-nums" style={{ color: accent }}>{fmt(cheque.amount ?? 0)}</p>
          </div>

          {/* Notes */}
          {cheque.notes && (
            <div className="mx-8 mb-6 px-4 py-3 bg-[color:var(--ink-50)] rounded-lg text-sm border border-[color:var(--ink-200)]">
              <span className="font-semibold text-[color:var(--ink-600)]">{t("notes")}: </span>
              <span className="text-[color:var(--ink-700)]">{cheque.notes}</span>
            </div>
          )}

          {/* Signatures */}
          <div className="px-8 pb-6">
            <div className="grid grid-cols-3 gap-8 pt-6 border-t border-[color:var(--ink-200)]">
              {[t("preparedBy"), t("approvedBy"), cheque.chequeType === "received" ? (lang === "ar" ? "المستلم" : "Received By") : (lang === "ar" ? "المُسلِّم" : "Handed By")].map((label) => (
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
