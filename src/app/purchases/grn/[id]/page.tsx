// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { StatusBadge } from "@/components/ui/status-badge";
import { DocActionBar } from "@/components/ui/doc-action-bar";
import { PdfDownloadButton } from "@/components/ui/PdfDownloadButton";
import { GrnPdf } from "@/lib/pdf/GrnPdf";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowLeft, ArrowRight, Printer, Send, ShieldOff } from "lucide-react";
import { useCompanySettings } from "@/hooks/useCompanySettings";

function GRNLinesTable({ lines, t, isRTL, formatCurrency }: any) {
  return (
    <div className="overflow-x-auto mb-6">
      <table className="data-table">
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
            <tr key={line._id ?? i}>
              <td className="muted">{i + 1}</td>
              <td className="code">{line.itemCode ?? "—"}</td>
              <td>
                {isRTL ? line.itemNameAr : (line.itemNameEn || line.itemNameAr)}
              </td>
              <td className="numeric text-end">{line.quantity}</td>
              <td className="numeric text-end">{formatCurrency((line.unitCost ?? 0) / 100)}</td>
              <td className="numeric text-end font-semibold">{formatCurrency((line.totalCost ?? 0) / 100)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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

export default function GRNDetailPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { currentUser } = useAuth();
  const { canPost } = usePermissions();
  const { company: settingsCompany } = useCompanySettings();
  const router = useRouter();
  const params = useParams();
  const grnId = params?.id as string;
  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const grn = useQuery(
    api.purchaseInvoices.getGRNById,
    grnId ? { grnId: grnId as any } : "skip"
  );

  // For GRN Post — auto-resolve inventory + AP accounts
  const cashAccounts = useQuery(
    api.reports.listCashAndBankAccounts,
    company?._id ? { companyId: company._id } : "skip"
  );
  const allAccounts = useQuery(
    api.accounts.getAll,
    company?._id ? { companyId: company._id } : "skip"
  );
  const postGRN = useMutation(api.purchaseInvoices.postGRN);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");

  const handlePostGRN = async () => {
    if (!currentUser?._id || !allAccounts) return;
    const inventoryAcc = allAccounts.find((a: any) => a.operationalType === "inventory_asset");
    const apAcc        = allAccounts.find((a: any) => a.operationalType === "trade_payable");
    if (!inventoryAcc || !apAcc) {
      setPostError(t("errMissingInventoryAccounts") ?? "يرجى تصنيف حسابات المخزون والذمم الدائنة في دليل الحسابات أولاً.");
      return;
    }
    setPosting(true); setPostError("");
    try {
      await postGRN({
        grnId: grnId as any,
        userId: currentUser._id,
        inventoryAccountId: inventoryAcc._id,
        apAccruedAccountId: apAcc._id,
      });
    } catch (e: any) {
      setPostError(e.message ?? t("errUnexpected"));
    } finally {
      setPosting(false);
    }
  };

  if (grn === undefined) {
    return <LoadingState label={t("loading") ?? "Loading..."} />;
  }
  if (!grn) {
    return (
      <div className="p-8 text-center text-[color:var(--ink-400)]">
        <p>{t("documentNotFound")}</p>
        <button onClick={() => router.back()} className="btn-ghost h-9 px-3 rounded-xl inline-flex items-center gap-2 text-sm font-semibold mt-2">
          {t("backToList")}
        </button>
      </div>
    );
  }

  const companyName  = isRTL ? grn.companyNameAr : (grn.companyNameEn || grn.companyNameAr);
  const branchName   = isRTL ? grn.branchNameAr  : (grn.branchNameEn  || grn.branchNameAr);
  const supplierName = grn.supplierNameAr ?? "—";
  const warehouseName= grn.warehouseNameAr ?? "—";
  const totalValue   = (grn.lines ?? []).reduce((s: number, l: any) => s + (l.totalCost ?? 0), 0);

  const isDraft     = grn.documentStatus === "draft";
  const isApproved  = grn.documentStatus === "approved";
  const isPosted    = grn.postingStatus  === "posted";
  const canPostGRN  = canPost("purchases") && (isDraft || isApproved) && !isPosted && grn.documentStatus !== "cancelled";

  const grnPdfData = {
    logoUrl: settingsCompany?.logoUrl ?? undefined,
    companyNameEn: settingsCompany?.nameEn ?? undefined,
    companyPhone: settingsCompany?.phone ?? undefined,
    companyName, companyAddress: grn.companyAddress, branchName,
    grnNumber: grn.grnNumber, receiptDate: grn.receiptDate,
    documentStatus: grn.documentStatus,
    supplierName, warehouseName,
    lines: (grn.lines ?? []).map((l: any) => ({
      itemCode: l.itemCode, itemNameAr: l.itemNameAr ?? l.itemName ?? "",
      itemNameEn: l.itemNameEn, quantity: l.quantity,
      unitCost: l.unitCost ?? 0, totalCost: l.totalCost ?? 0,
    })),
    isRTL,
    labels: {
      title: t("grnTitle"), supplierLabel: t("supplier"),
      warehouseLabel: t("warehouse"), date: t("date"),
      no: "#", code: t("itemCode"), name: t("itemName"),
      qty: t("quantity"), unitCost: t("unitCost"), total: t("lineTotal"),
      totalLabel: t("total"),
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
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-3">
            {/* Approve via DocActionBar */}
            <DocActionBar
              docType="grn"
              docId={grnId}
              documentStatus={grn.documentStatus}
              postingStatus={grn.postingStatus ?? "unposted"}
              userId={currentUser?._id}
              companyId={company?._id}
            />
            {/* GRN Post — smart inline button */}
            {!isPosted && (
              canPostGRN ? (
                <button
                  onClick={handlePostGRN}
                  disabled={posting}
                  className="h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {posting ? t("posting") : t("post")}
                </button>
              ) : (
                <span title={t("noPermission")} className="h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 bg-[color:var(--ink-50)] text-[color:var(--ink-400)] border border-[color:var(--ink-200)] cursor-not-allowed">
                  <ShieldOff className="h-3.5 w-3.5" />{t("post")}
                </span>
              )
            )}
            <PdfDownloadButton
              document={<GrnPdf data={grnPdfData} />}
              fileName={`grn-${grn.grnNumber}.pdf`}
              label={t("downloadPdf") ?? "PDF"}
            />
            <button onClick={() => window.print()} className="h-9 px-4 rounded-lg bg-[color:var(--brand-700)] text-white text-sm font-semibold flex items-center gap-2 hover:bg-[color:var(--brand-800)]">
              <Printer className="h-4 w-4" />{t("printGRN")}
            </button>
          </div>
          {postError && <p className="text-xs text-red-600 max-w-xs text-end">{postError}</p>}
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-[color:var(--ink-100)] p-8 print:shadow-none print:border-none print:rounded-none print:p-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex items-start justify-between mb-6 border-b-2 border-[color:var(--ink-800)] pb-4">
          <div>
            <h2 className="section-title">{companyName}</h2>
            {grn.companyAddress && <p className="text-sm text-[color:var(--ink-600)] mt-1">{grn.companyAddress}</p>}
            {branchName && <p className="text-xs text-[color:var(--ink-500)] mt-0.5">{branchName}</p>}
          </div>
          <div className="text-end">
            <h1 className="text-2xl font-extrabold text-[color:var(--brand-700)]">{t("grnTitle")}</h1>
            <p className="text-lg font-bold text-[color:var(--ink-800)] mt-1"># {grn.grnNumber}</p>
            <p className="text-sm text-[color:var(--ink-600)]">{grn.receiptDate}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="space-y-1">
            <div><span className="text-xs uppercase tracking-wider text-[color:var(--ink-500)] font-semibold">{t("supplier")}: </span><span className="font-semibold text-[color:var(--ink-900)]">{supplierName}</span></div>
            <div><span className="text-xs uppercase tracking-wider text-[color:var(--ink-500)] font-semibold">{t("warehouse")}: </span><span className="font-semibold text-[color:var(--ink-900)]">{warehouseName}</span></div>
          </div>
          <div className="flex justify-end items-start">
            <StatusBadge status={grn.documentStatus} type="posting" />
          </div>
        </div>
        <GRNLinesTable lines={grn.lines} t={t} isRTL={isRTL} formatCurrency={formatCurrency} />
        <div className="flex justify-end mb-8">
          <div className="w-72">
            <div className="flex justify-between border-t-2 border-[color:var(--ink-800)] pt-2 text-base font-extrabold text-[color:var(--ink-900)]">
              <span>{t("total")}</span>
              <span className="tabular-nums">{formatCurrency(totalValue / 100)}</span>
            </div>
          </div>
        </div>
        <SignatureStrip t={t} />
        <p className="text-center text-xs text-[color:var(--ink-400)] mt-8 print:mt-6">{t("printedBy")}</p>
      </div>
    </div>
  );
}
