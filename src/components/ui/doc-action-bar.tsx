// @ts-nocheck
"use client";

/**
 * DocActionBar — unified approve / post / reverse bar.
 * Renders context-appropriate action buttons for any ERP document.
 *
 * Usage:
 *   <DocActionBar
 *     docType="purchase_invoice"
 *     docId={inv._id}
 *     documentStatus={inv.documentStatus}
 *     postingStatus={inv.postingStatus}
 *     userId={currentUser?._id}
 *     companyId={company?._id}
 *   />
 */

import React, { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { CheckCircle, Send, RotateCcw } from "lucide-react";

export type DocType =
  | "grn"
  | "purchase_invoice"
  | "sales_return"
  | "purchase_return";

interface DocActionBarProps {
  docType: DocType;
  docId: string;
  documentStatus: string;
  postingStatus: string;
  userId: string | undefined;
  companyId?: string;
  /** called after every successful action so the parent can refresh */
  onSuccess?: () => void;
}

export function DocActionBar({
  docType,
  docId,
  documentStatus,
  postingStatus,
  userId,
  companyId,
  onSuccess,
}: DocActionBarProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState<"approve" | "post" | "reverse" | null>(null);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const openPeriod = useQuery(
    api.helpers.getOpenPeriod,
    companyId ? { companyId: companyId as any, date: today } : "skip"
  );

  // Mutations — only one of each will actually be called depending on docType
  const approveGRN            = useMutation(api.purchaseInvoices.approveGRN);
  const approvePurchaseInvoice = useMutation(api.purchaseInvoices.approvePurchaseInvoice);
  const quickPost             = useMutation(api.purchaseInvoices.quickPostPurchaseInvoice);
  const reversePurchaseInvoice= useMutation(api.purchaseInvoices.reversePurchaseInvoice);
  const postPurchaseReturn    = useMutation(api.purchaseReturns.postPurchaseReturn);
  const postSalesReturn       = useMutation(api.salesReturns.postSalesReturn);

  const isDraft   = documentStatus === "draft";
  const isApproved= documentStatus === "approved";
  const isPosted  = postingStatus  === "posted";
  const isCancelled = documentStatus === "cancelled";

  const canApprove = isDraft   && !isCancelled;
  const canPost    = (isDraft || isApproved) && !isPosted && !isCancelled;
  const canReverse = isPosted  && !isCancelled;

  const run = async (action: "approve" | "post" | "reverse") => {
    if (!userId) { setError(t("errNoUser")); return; }
    setLoading(action); setError("");
    try {
      if (action === "approve") {
        if (docType === "grn")              await approveGRN({ grnId: docId as any, userId: userId as any });
        if (docType === "purchase_invoice") await approvePurchaseInvoice({ invoiceId: docId as any, userId: userId as any });
      }
      if (action === "post") {
        if (docType === "purchase_invoice") await quickPost({ invoiceId: docId as any, userId: userId as any });
        if (docType === "purchase_return")  await postPurchaseReturn({ returnId: docId as any, userId: userId as any });
        if (docType === "sales_return")     await postSalesReturn({ returnId: docId as any, userId: userId as any });
      }
      if (action === "reverse") {
        if (!openPeriod) { setError(t("errNoPeriod")); setLoading(null); return; }
        if (docType === "purchase_invoice") {
          await reversePurchaseInvoice({
            invoiceId: docId as any,
            userId: userId as any,
            reversalDate: today,
            reversalPeriodId: openPeriod._id,
          });
        }
      }
      onSuccess?.();
    } catch (e: any) {
      setError(e.message ?? t("errUnexpected"));
    } finally {
      setLoading(null);
    }
  };

  const buttonBase =
    "h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 border";

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Approve */}
        {canApprove && (docType === "grn" || docType === "purchase_invoice") && (
          <button
            onClick={() => run("approve")}
            disabled={loading !== null}
            className={`${buttonBase} bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100`}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            {loading === "approve" ? t("approving") : t("approve")}
          </button>
        )}

        {/* Post */}
        {canPost && (docType === "purchase_invoice" || docType === "purchase_return" || docType === "sales_return") && (
          <button
            onClick={() => run("post")}
            disabled={loading !== null}
            className={`${buttonBase} bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100`}
          >
            <Send className="h-3.5 w-3.5" />
            {loading === "post" ? t("posting") : t("post")}
          </button>
        )}

        {/* Reverse */}
        {canReverse && docType === "purchase_invoice" && (
          <button
            onClick={() => run("reverse")}
            disabled={loading !== null || !openPeriod}
            className={`${buttonBase} bg-red-50 text-red-700 border-red-200 hover:bg-red-100`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {loading === "reverse" ? t("reversing") : t("reverse")}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 max-w-xs">{error}</p>
      )}
    </div>
  );
}
