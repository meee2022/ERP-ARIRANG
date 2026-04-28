"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, FileText, Send, TriangleAlert, Clock3, ChevronRight, Barcode } from "lucide-react";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function MobileBucketCard({ title, count, icon: Icon, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-4 text-start transition-all ${
        active
          ? "border-[color:var(--brand-700)] bg-[color:var(--brand-50)] shadow-sm"
          : "border-[color:var(--ink-200)] bg-white"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="h-10 w-10 rounded-2xl bg-white border border-[color:var(--ink-200)] inline-flex items-center justify-center">
          <Icon className="h-5 w-5 text-[color:var(--brand-700)]" />
        </div>
        <span className="text-lg font-bold text-[color:var(--ink-900)]">{count}</span>
      </div>
      <div className="text-sm font-semibold text-[color:var(--ink-900)]">{title}</div>
    </button>
  );
}

function MobileInvoiceCard({ invoice, t, isRTL, onSubmit, submitting }: any) {
  const canSubmit = invoice.documentStatus === "draft" && invoice.postingStatus === "unposted" && invoice.reviewStatus !== "submitted";
  const reviewBadgeStatus =
    invoice.reviewStatus === "rejected"
      ? "rejected"
      : invoice.reviewStatus === "submitted"
        ? "approved"
        : invoice.documentStatus;

  return (
    <div className="rounded-2xl border border-[color:var(--ink-200)] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-[color:var(--ink-900)]">{invoice.invoiceNumber}</div>
          <div className="text-xs text-[color:var(--ink-500)] mt-1">{invoice.externalInvoiceNumber || "—"}</div>
        </div>
        <StatusBadge status={reviewBadgeStatus} type="document" />
      </div>

      <div className="mt-4 space-y-2">
        <div className="text-sm font-semibold text-[color:var(--ink-900)]">
          {isRTL ? invoice.customerName : (invoice.customerNameEn || invoice.customerName)}
        </div>
        <div className="text-xs text-[color:var(--ink-500)]">
          {t("branch")}: {isRTL ? invoice.branchName : (invoice.branchNameEn || invoice.branchName)}
        </div>
        <div className="text-xs text-[color:var(--ink-500)]">
          {invoice.invoiceDate}
        </div>
        <div className="text-lg font-bold text-[color:var(--brand-700)]">
          {invoice.totalAmount ? new Intl.NumberFormat(isRTL ? "ar-QA" : "en-QA", { style: "currency", currency: "QAR" }).format(invoice.totalAmount) : "QAR 0.00"}
        </div>
      </div>

      {invoice.rejectionReason ? (
        <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
          {invoice.rejectionReason}
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        <Link
          href={`/sales/invoices/${invoice._id}`}
          className="flex-1 h-11 rounded-xl border border-[color:var(--ink-200)] inline-flex items-center justify-center gap-2 text-sm font-semibold text-[color:var(--ink-800)]"
        >
          <FileText className="h-4 w-4" />
          {t("view")}
        </Link>
        {canSubmit ? (
          <button
            onClick={() => onSubmit(invoice._id)}
            disabled={submitting}
            className="flex-1 h-11 rounded-xl bg-[color:var(--brand-700)] text-white inline-flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {t("submitForReview")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function MobileSalesPage() {
  const { t, isRTL } = useI18n();
  const { currentUser } = useAuth();
  const [activeBucket, setActiveBucket] = useState<"drafts" | "submitted" | "rejected" | "recent">("drafts");
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;
  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const setSelectedBranch = useAppStore((s) => s.setSelectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  useState(() => {
    if (currentUser?.branchIds?.length === 1 && selectedBranch === "all") {
      setSelectedBranch(currentUser.branchIds[0] as any);
    }
  });

  const drafts = useQuery(
    api.salesInvoices.listMobileSalesInvoices,
    companyId && currentUser ? { companyId, userId: currentUser._id as any, branchId: branchArg as any, bucket: "drafts" } : "skip"
  ) ?? [];
  const submitted = useQuery(
    api.salesInvoices.listMobileSalesInvoices,
    companyId && currentUser ? { companyId, userId: currentUser._id as any, branchId: branchArg as any, bucket: "submitted" } : "skip"
  ) ?? [];
  const rejected = useQuery(
    api.salesInvoices.listMobileSalesInvoices,
    companyId && currentUser ? { companyId, userId: currentUser._id as any, branchId: branchArg as any, bucket: "rejected" } : "skip"
  ) ?? [];
  const recent = useQuery(
    api.salesInvoices.listMobileSalesInvoices,
    companyId && currentUser ? { companyId, userId: currentUser._id as any, branchId: branchArg as any, bucket: "recent" } : "skip"
  ) ?? [];

  const submitForReview = useMutation(api.salesInvoices.submitSalesInvoiceForReview);

  const currentList = useMemo(() => {
    if (activeBucket === "submitted") return submitted;
    if (activeBucket === "rejected") return rejected;
    if (activeBucket === "recent") return recent;
    return drafts;
  }, [activeBucket, drafts, submitted, rejected, recent]);

  const handleSubmit = async (invoiceId: string) => {
    if (!currentUser) return;
    setSubmittingId(invoiceId);
    try {
      await submitForReview({ invoiceId: invoiceId as any, userId: currentUser._id as any });
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-[color:var(--surface-0)] pb-24">
      <div className="sticky top-0 z-10 bg-[color:var(--surface-0)]/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-[color:var(--ink-100)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-[color:var(--brand-700)] mb-1">{t("mobileQuickEntry")}</div>
            <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">{t("mobileSalesTitle")}</h1>
          </div>
          <Link
            href="/sales/invoices?new=true"
            className="h-12 px-4 rounded-2xl bg-[color:var(--brand-700)] text-white inline-flex items-center gap-2 text-sm font-semibold shadow-sm"
          >
            <Plus className="h-4 w-4" />
            {t("newInvoice")}
          </Link>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <MobileBucketCard title={t("myDrafts")} count={drafts.length} icon={Clock3} active={activeBucket === "drafts"} onClick={() => setActiveBucket("drafts")} />
          <MobileBucketCard title={t("submittedForReview")} count={submitted.length} icon={Send} active={activeBucket === "submitted"} onClick={() => setActiveBucket("submitted")} />
          <MobileBucketCard title={t("needsEdit")} count={rejected.length} icon={TriangleAlert} active={activeBucket === "rejected"} onClick={() => setActiveBucket("rejected")} />
          <MobileBucketCard title={t("recentInvoices")} count={recent.length} icon={FileText} active={activeBucket === "recent"} onClick={() => setActiveBucket("recent")} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[color:var(--ink-200)] bg-white p-4">
            <Link href="/sales/invoices" className="flex items-center justify-between text-sm font-semibold text-[color:var(--ink-800)]">
              <span>{t("salesInvoicesTitle")}</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-2xl border border-[color:var(--brand-200)] bg-[color:var(--brand-50)] p-4">
            <Link href="/sales/mobile/barcode" className="flex items-center justify-between text-sm font-semibold text-[color:var(--brand-700)]">
              <span className="flex items-center gap-1.5">
                <Barcode className="h-4 w-4" />
                {isRTL ? "مسح الباركود" : "Barcode Scan"}
              </span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          {currentList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--ink-200)] bg-white p-8 text-center text-sm text-[color:var(--ink-400)]">
              {t("noInvoices")}
            </div>
          ) : (
            currentList.map((invoice) => (
              <MobileInvoiceCard
                key={invoice._id}
                invoice={invoice}
                t={t}
                isRTL={isRTL}
                onSubmit={handleSubmit}
                submitting={submittingId === invoice._id}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}