// @ts-nocheck
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { LoadingState } from "@/components/ui/data-display";
import { StatusBadge } from "@/components/ui/status-badge";
import { ArrowLeft, ArrowRight, Printer } from "lucide-react";
import { CompanyPrintHeader } from "@/components/ui/company-print-header";
import { useCompanySettings } from "@/hooks/useCompanySettings";

const CHEQUE_STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  received:      { ar: "مستلم",         en: "Received"       },
  deposited:     { ar: "مودع",          en: "Deposited"      },
  cleared:       { ar: "محصّل",         en: "Cleared"        },
  bounced:       { ar: "مرتجع",         en: "Bounced"        },
  issued:        { ar: "صادر",          en: "Issued"         },
  presented:     { ar: "مقدم للبنك",    en: "Presented"      },
  cleared_issued:{ ar: "تم الصرف",      en: "Cleared"        },
  stopped:       { ar: "موقوف",         en: "Stopped"        },
};

const CHEQUE_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  received: { ar: "شيك وارد (مستلم)", en: "Received Cheque" },
  issued:   { ar: "شيك صادر",         en: "Issued Cheque"   },
};

export default function ChequeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t, isRTL, lang, formatCurrency } = useI18n();
  const { company: printCompany } = useCompanySettings();

  const cheque = useQuery(
    api.treasury.getChequeById,
    id ? { chequeId: id as any } : "skip"
  );

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (cheque === undefined) return <LoadingState label={t("loading")} />;
  if (!cheque)
    return <div className="p-8 text-center text-red-500">{t("notFound")}</div>;

  const companyName = isRTL ? cheque.companyNameAr : (cheque.companyNameEn || cheque.companyNameAr);
  const branchName  = isRTL ? cheque.branchNameAr  : (cheque.branchNameEn  || cheque.branchNameAr);
  const partyName   = cheque.chequeType === "received"
    ? (isRTL ? cheque.customerNameAr : (cheque.customerNameEn || cheque.customerNameAr))
    : (isRTL ? cheque.supplierNameAr : (cheque.supplierNameEn || cheque.supplierNameAr));

  const statusLabel = CHEQUE_STATUS_LABELS[cheque.chequeStatus]?.[lang] ?? cheque.chequeStatus;
  const typeLabel   = CHEQUE_TYPE_LABELS[cheque.chequeType]?.[lang] ?? cheque.chequeType;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-QA", { style: "currency", currency: "QAR", minimumFractionDigits: 2 }).format(n);

  const accentColor = cheque.chequeType === "received" ? "blue" : "purple";
  const accentClass = accentColor === "blue" ? "bg-blue-600 border-blue-600 text-blue-800 bg-blue-50 border-blue-300" : "bg-purple-600 border-purple-600 text-purple-800 bg-purple-50 border-purple-300";

  return (
    <div className="min-h-screen bg-[color:var(--ink-50)] p-4" dir={isRTL ? "rtl" : "ltr"}>
      {/* Toolbar */}
      <div className="print:hidden flex items-center justify-between mb-6 max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-[color:var(--ink-600)] hover:text-[color:var(--ink-900)] transition-colors"
        >
          <BackIcon className="w-4 h-4" />
          {t("backToList")}
        </button>
        <button
          onClick={() => window.print()}
          className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90 ${cheque.chequeType === "received" ? "bg-blue-600 hover:bg-blue-700" : "bg-purple-600 hover:bg-purple-700"}`}
        >
          <Printer className="w-4 h-4" />
          {t("printInvoice")}
        </button>
      </div>

      {/* Cheque Document */}
      <div className="max-w-2xl mx-auto surface-card print:shadow-none print:border-none p-8">
        <CompanyPrintHeader
          company={printCompany}
          isRTL={isRTL}
          documentTitle={typeLabel}
          periodLine={cheque.dueDate}
        />

        {/* ── Header (screen only) ── */}
        <div className={`print:hidden flex justify-between items-start pb-5 mb-5 border-b-2 ${cheque.chequeType === "received" ? "border-blue-600" : "border-purple-600"}`}>
          <div>
            <h1 className="text-xl font-extrabold text-[color:var(--ink-900)]">{companyName}</h1>
            {branchName && <p className={`text-sm font-medium mt-0.5 ${cheque.chequeType === "received" ? "text-blue-600" : "text-purple-600"}`}>{branchName}</p>}
            {cheque.companyAddress && <p className="text-xs text-[color:var(--ink-400)] mt-1">{cheque.companyAddress}</p>}
          </div>
          <div className="text-end">
            <div className={`inline-block text-white px-4 py-1.5 rounded-lg mb-2 ${cheque.chequeType === "received" ? "bg-blue-600" : "bg-purple-600"}`}>
              <p className="text-sm font-bold">{typeLabel}</p>
            </div>
            <p className="text-sm text-[color:var(--ink-600)]">
              <span className="font-medium">{isRTL ? "رقم الشيك" : "Cheque No"}:</span>{" "}
              <span className="font-mono font-bold text-[color:var(--ink-800)]">{cheque.chequeNumber}</span>
            </p>
            <p className="text-sm text-[color:var(--ink-600)] mt-0.5">
              <span className="font-medium">{isRTL ? "تاريخ الاستحقاق" : "Due Date"}:</span> {cheque.dueDate}
            </p>
          </div>
        </div>

        {/* ── Info Grid ── */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-6 text-sm">
          {partyName && (
            <InfoRow
              label={cheque.chequeType === "received" ? t("customer") : t("supplier")}
              value={partyName}
            />
          )}
          <InfoRow label={isRTL ? "بنك العميل" : "Customer's Bank"} value={cheque.drawnOnBank || "—"} />
          <InfoRow label={isRTL ? "حسابنا البنكي" : "Our Bank Account"} value={`${cheque.bankAccountName} — ${cheque.bankName}`} />
          <InfoRow label={isRTL ? "الحساب المحاسبي" : "GL Account"} value={`${cheque.glAccountCode} — ${cheque.glAccountName}`} />
          {cheque.issueDate && (
            <InfoRow label={isRTL ? "تاريخ الإصدار" : "Issue Date"} value={cheque.issueDate} />
          )}
          <InfoRow label={isRTL ? "الحالة" : "Status"} value={statusLabel} highlight />
          {cheque.depositDate && (
            <InfoRow label={isRTL ? "تاريخ الإيداع" : "Deposit Date"} value={cheque.depositDate} />
          )}
          {cheque.clearingDate && (
            <InfoRow label={isRTL ? "تاريخ التحصيل" : "Clearing Date"} value={cheque.clearingDate} />
          )}
          {cheque.bounceDate && (
            <InfoRow label={isRTL ? "تاريخ الارتداد" : "Bounce Date"} value={cheque.bounceDate} />
          )}
          {cheque.bounceReason && (
            <InfoRow label={isRTL ? "سبب الارتداد" : "Bounce Reason"} value={cheque.bounceReason} />
          )}
        </div>

        {/* ── Amount Box ── */}
        <div className={`border-2 rounded-xl p-6 mb-6 text-center ${cheque.chequeType === "received" ? "bg-blue-50 border-blue-300" : "bg-purple-50 border-purple-300"}`}>
          <p className={`text-xs font-medium uppercase tracking-widest mb-2 ${cheque.chequeType === "received" ? "text-blue-600" : "text-purple-600"}`}>
            {isRTL ? "قيمة الشيك" : "Cheque Amount"}
          </p>
          <p className={`text-4xl font-extrabold ${cheque.chequeType === "received" ? "text-blue-800" : "text-purple-800"}`}>
            {fmt(cheque.amount ?? 0)}
          </p>
        </div>

        {/* ── Notes ── */}
        {cheque.notes && (
          <div className="mb-6 px-4 py-3 bg-[color:var(--ink-50)] rounded-lg text-sm border border-[color:var(--ink-200)]">
            <span className="font-medium text-[color:var(--ink-600)]">{t("notes")}: </span>
            <span className="text-[color:var(--ink-700)]">{cheque.notes}</span>
          </div>
        )}

        {/* ── Signatures ── */}
        <div className="grid grid-cols-3 gap-6 mt-10 pt-6 border-t text-xs text-center text-[color:var(--ink-500)]">
          {[t("preparedBy"), t("approvedBy"), cheque.chequeType === "received" ? (isRTL ? "المستلم" : "Received By") : (isRTL ? "المُسلِّم" : "Handed By")].map((label) => (
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
      <span className={`font-semibold ${highlight ? "text-indigo-700" : "text-[color:var(--ink-800)]"}`}>{value}</span>
    </div>
  );
}
