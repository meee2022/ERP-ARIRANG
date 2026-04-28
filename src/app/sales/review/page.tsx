// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState, SummaryStrip } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { CheckCircle2, FileText, Send, TriangleAlert } from "lucide-react";

export default function SalesReviewPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { currentUser } = useAuth();
  const { canPost } = usePermissions();
  const [reason, setReason] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;
  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const queue = useQuery(
    api.salesInvoices.listSalesReviewQueue,
    companyId ? { companyId, branchId: branchArg as any } : "skip"
  ) ?? [];

  const approveInvoice = useMutation(api.salesInvoices.approveSalesInvoice);
  const rejectInvoice = useMutation(api.salesInvoices.rejectSalesInvoice);
  const quickPost = useMutation(api.salesInvoices.quickPostSalesInvoice);

  const totals = useMemo(() => ({
    count: queue.length,
    amount: queue.reduce((sum: number, invoice: any) => sum + (invoice.totalAmount ?? 0), 0),
    drafts: queue.filter((invoice: any) => invoice.reviewStatus === "submitted").length,
  }), [queue]);

  const onApprove = async (invoiceId: string) => {
    if (!currentUser) return;
    setBusyId(invoiceId);
    try {
      await approveInvoice({ invoiceId: invoiceId as any, userId: currentUser._id as any });
    } finally {
      setBusyId(null);
    }
  };

  const onReject = async (invoiceId: string) => {
    if (!currentUser) return;
    setBusyId(invoiceId);
    try {
      await rejectInvoice({
        invoiceId: invoiceId as any,
        userId: currentUser._id as any,
        reason: reason[invoiceId] || undefined,
      });
    } finally {
      setBusyId(null);
    }
  };

  const onQuickPost = async (invoiceId: string) => {
    if (!currentUser) return;
    setBusyId(invoiceId);
    try {
      await quickPost({ invoiceId: invoiceId as any, userId: currentUser._id as any });
    } finally {
      setBusyId(null);
    }
  };

  if (!canPost("sales")) {
    return <EmptyState title={t("reviewQueue")} message={t("noResults")} />;
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      <PageHeader icon={CheckCircle2} title={t("salesReviewTitle")} subtitle={t("invoiceReadyForReview")} />

      <SummaryStrip items={[
        { label: t("reviewQueue"), value: String(totals.count), borderColor: "var(--brand-700)", accent: "var(--ink-900)" },
        { label: t("amount"), value: formatCurrency(totals.amount), borderColor: "var(--gold-400)", accent: "var(--ink-900)" },
        { label: t("submittedForReview"), value: String(totals.drafts), borderColor: "#2563eb", accent: "#2563eb" },
      ]} />

      <div className="surface-card overflow-hidden">
        {queue === undefined ? (
          <LoadingState label={t("loading")} />
        ) : queue.length === 0 ? (
          <EmptyState icon={Send} title={t("noSubmittedYet")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("invoiceNo")}</th>
                  <th>{t("customer")}</th>
                  <th>{t("branch")}</th>
                  <th>{t("createdBy")}</th>
                  <th className="text-end">{t("amount")}</th>
                  <th>{t("reviewStatus")}</th>
                  <th>{t("rejectionReason")}</th>
                  <th className="text-end">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((invoice: any) => (
                  <tr key={invoice._id}>
                    <td className="code">{invoice.invoiceNumber}</td>
                    <td>{isRTL ? invoice.customerName : (invoice.customerNameEn || invoice.customerName)}</td>
                    <td>{isRTL ? invoice.branchName : (invoice.branchNameEn || invoice.branchName)}</td>
                    <td>{invoice.createdByName}</td>
                    <td className="numeric text-end">{formatCurrency(invoice.totalAmount)}</td>
                    <td>
                      <StatusBadge
                        status={invoice.reviewStatus === "rejected" ? "rejected" : invoice.documentStatus}
                        type="document"
                      />
                    </td>
                    <td className="min-w-[220px]">
                      <input
                        value={reason[invoice._id] || ""}
                        onChange={(e) => setReason((prev) => ({ ...prev, [invoice._id]: e.target.value }))}
                        placeholder={t("reviewNotes")}
                        className="input-field h-9"
                      />
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/sales/invoices/${invoice._id}`} className="btn-ghost h-9 px-3 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
                          <FileText className="h-4 w-4" />
                          {t("view")}
                        </Link>
                        <button onClick={() => onReject(invoice._id)} disabled={busyId === invoice._id} className="h-9 px-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-sm font-semibold">
                          {t("reject")}
                        </button>
                        <button onClick={() => onApprove(invoice._id)} disabled={busyId === invoice._id} className="h-9 px-3 rounded-lg bg-[color:var(--brand-700)] text-white text-sm font-semibold">
                          {t("approveForPosting")}
                        </button>
                        <button onClick={() => onQuickPost(invoice._id)} disabled={busyId === invoice._id || invoice.documentStatus !== "approved"} className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50">
                          {t("post")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}