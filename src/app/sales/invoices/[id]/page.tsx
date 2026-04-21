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
import { ArrowLeft, ArrowRight, Printer } from "lucide-react";

function LinesTable({ lines, t, isRTL, formatCurrency }: any) {
  return (
    <div className="overflow-x-auto mb-6">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b-2 border-gray-300">
            <th className="px-3 py-2 text-start font-semibold text-gray-700 w-8">#</th>
            <th className="px-3 py-2 text-start font-semibold text-gray-700">{t("itemCode")}</th>
            <th className="px-3 py-2 text-start font-semibold text-gray-700">{t("itemName")}</th>
            <th className="px-3 py-2 text-end font-semibold text-gray-700">{t("quantity")}</th>
            <th className="px-3 py-2 text-end font-semibold text-gray-700">{t("unitPrice")}</th>
            <th className="px-3 py-2 text-end font-semibold text-gray-700">{t("lineTotal")}</th>
          </tr>
        </thead>
        <tbody>
          {(lines ?? []).map((line: any, i: number) => (
            <tr key={line._id ?? i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="px-3 py-2 text-gray-500">{i + 1}</td>
              <td className="px-3 py-2 font-mono text-xs text-gray-600">{line.itemCode ?? "—"}</td>
              <td className="px-3 py-2 text-gray-800">
                {isRTL ? line.itemNameAr : (line.itemNameEn || line.itemNameAr)}
              </td>
              <td className="px-3 py-2 text-end tabular-nums">{line.quantity}</td>
              <td className="px-3 py-2 text-end tabular-nums">{formatCurrency((line.unitPrice ?? 0) / 100)}</td>
              <td className="px-3 py-2 text-end tabular-nums font-semibold">{formatCurrency((line.lineTotal ?? 0) / 100)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TotalsBlock({ inv, t, formatCurrency }: any) {
  const subtotal = (inv.lines ?? []).reduce((s: number, l: any) => s + (l.lineTotal ?? 0), 0);
  const taxAmt   = inv.taxAmount ?? 0;
  const total    = inv.totalAmount ?? subtotal + taxAmt;
  return (
    <div className="flex justify-end mb-8">
      <div className="w-72 space-y-2 text-sm">
        <div className="flex justify-between text-gray-700">
          <span>{t("subtotal")}</span>
          <span className="tabular-nums font-medium">{formatCurrency(subtotal / 100)}</span>
        </div>
        {taxAmt > 0 && (
          <div className="flex justify-between text-gray-700">
            <span>{t("taxAmount")}</span>
            <span className="tabular-nums font-medium">{formatCurrency(taxAmt / 100)}</span>
          </div>
        )}
        <div className="flex justify-between border-t-2 border-gray-800 pt-2 text-base font-extrabold text-gray-900">
          <span>{t("invoiceTotal")}</span>
          <span className="tabular-nums">{formatCurrency(total / 100)}</span>
        </div>
      </div>
    </div>
  );
}

function SignatureStrip({ t }: any) {
  return (
    <div className="grid grid-cols-3 gap-6 mt-10 pt-6 border-t border-gray-300">
      {[t("preparedBy"), t("authorizedBy"), t("receivedBy")].map((label) => (
        <div key={label} className="text-center">
          <div className="h-10 border-b border-gray-400 mx-4 mb-2" />
          <p className="text-xs text-gray-600 font-medium">{label}</p>
        </div>
      ))}
    </div>
  );
}

export default function SalesInvoiceDetailPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { currentUser } = useAuth();
  const { canPost } = usePermissions();
  const router = useRouter();
  const params = useParams();
  const invoiceId = params?.id as string;

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];

  const inv = useQuery(
    api.salesInvoices.getInvoiceById,
    invoiceId ? { invoiceId: invoiceId as any } : "skip"
  );

  if (inv === undefined) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin h-8 w-8 border-2 border-[color:var(--brand-600)] border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm text-[color:var(--ink-400)]">{t("loading")}</p>
      </div>
    );
  }

  if (!inv) {
    return (
      <div className="p-8 text-center text-[color:var(--ink-400)]">
        <p>{t("documentNotFound")}</p>
        <button onClick={() => router.back()} className="text-sm text-[color:var(--brand-700)] hover:underline mt-2">
          {t("backToList")}
        </button>
      </div>
    );
  }

  const companyName  = isRTL ? inv.companyNameAr : (inv.companyNameEn || inv.companyNameAr);
  const branchName   = isRTL ? inv.branchNameAr  : (inv.branchNameEn  || inv.branchNameAr);
  const customerName = isRTL
    ? (inv.customerNameAr ?? inv.customerNameEn ?? "—")
    : (inv.customerNameEn ?? inv.customerNameAr ?? "—");

  return (
    <div className="space-y-4">
      <div className="print:hidden flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-[color:var(--ink-600)] hover:text-[color:var(--brand-700)]"
        >
          {isRTL ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          {t("backToList")}
        </button>
        <div className="flex items-center gap-3">
          {canPost("sales") && (
            <DocActionBar
              docType="sales_return"
              docId={invoiceId}
              documentStatus={inv.documentStatus}
              postingStatus={inv.postingStatus}
              userId={currentUser?._id}
              companyId={company?._id}
            />
          )}
          <button
            onClick={() => window.print()}
            className="h-9 px-4 rounded-lg bg-[color:var(--brand-700)] text-white text-sm font-semibold flex items-center gap-2 hover:bg-[color:var(--brand-800)]"
          >
            <Printer className="h-4 w-4" />
            {t("printInvoice")}
          </button>
        </div>
      </div>

      <div
        className="bg-white rounded-2xl shadow-sm border border-[color:var(--ink-100)] p-8 print:shadow-none print:border-none print:rounded-none print:p-6"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="flex items-start justify-between mb-6 border-b-2 border-gray-800 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">{companyName}</h2>
            {inv.companyAddress && <p className="text-sm text-gray-600 mt-1">{inv.companyAddress}</p>}
            {branchName && <p className="text-xs text-gray-500 mt-0.5">{branchName}</p>}
          </div>
          <div className="text-end">
            <h1 className="text-2xl font-extrabold text-[color:var(--brand-700)]">{t("salesInvoiceTitle")}</h1>
            <p className="text-lg font-bold text-gray-800 mt-1"># {inv.invoiceNumber}</p>
            <p className="text-sm text-gray-600">{inv.invoiceDate}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">{t("billTo")}</p>
            <p className="font-semibold text-gray-900">{customerName}</p>
            {inv.customerAddress && <p className="text-sm text-gray-600 mt-0.5">{inv.customerAddress}</p>}
            {inv.outletNameAr && (
              <p className="text-sm text-gray-500 mt-0.5">
                {isRTL ? inv.outletNameAr : (inv.outletNameEn || inv.outletNameAr)}
              </p>
            )}
          </div>
          <div className="flex justify-end items-start">
            <StatusBadge status={inv.postingStatus} type="posting" />
          </div>
        </div>

        <LinesTable lines={inv.lines} t={t} isRTL={isRTL} formatCurrency={formatCurrency} />
        <TotalsBlock inv={inv} t={t} formatCurrency={formatCurrency} />
        <SignatureStrip t={t} />
        <p className="text-center text-xs text-gray-400 mt-8 print:mt-6">{t("printedBy")}</p>
      </div>
    </div>
  );
}
