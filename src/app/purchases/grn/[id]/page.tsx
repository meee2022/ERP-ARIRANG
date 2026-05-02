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
import { DocActionBar } from "@/components/ui/doc-action-bar";
import { PdfDownloadButton } from "@/components/ui/PdfDownloadButton";
import { GrnPdf } from "@/lib/pdf/GrnPdf";
import { LoadingState } from "@/components/ui/data-display";
import { ArrowLeft, ArrowRight, FileSpreadsheet, Printer, Send, ShieldOff } from "lucide-react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import * as XLSX from "xlsx";

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
            <th className="text-white font-semibold px-3 py-2.5 text-end w-32">{t("unitCost")}</th>
            <th className="text-white font-semibold px-3 py-2.5 text-end w-32">{t("lineTotal")}</th>
          </tr>
        </thead>
        <tbody>
          {(lines ?? []).map((line: any, i: number) => (
            <tr key={line._id ?? i} className={i % 2 === 0 ? "bg-white" : "bg-[color:var(--ink-50)]"}>
              <td className="px-3 py-2 text-[color:var(--ink-400)] text-xs">{i + 1}</td>
              <td className="px-3 py-2 font-mono text-xs text-[color:var(--ink-600)]">{line.itemCode ?? "—"}</td>
              <td className="px-3 py-2 font-medium text-[color:var(--ink-900)]">{isRTL ? (line.itemNameAr ?? line.itemName ?? "—") : (line.itemNameEn || line.itemNameAr || line.itemName || "—")}</td>
              <td className="px-3 py-2 text-end tabular-nums">{line.quantity}</td>
              <td className="px-3 py-2 text-end tabular-nums">{formatCurrency(line.unitCost ?? 0)}</td>
              <td className="px-3 py-2 text-end tabular-nums font-semibold text-[color:var(--ink-900)]">{formatCurrency(line.totalCost ?? 0)}</td>
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

export default function GRNDetailPage() {
  const { t, isRTL, lang, formatCurrency } = useI18n();
  const { currentUser } = useAuth();
  const { canPost } = usePermissions();
  const { company: settingsCompany } = useCompanySettings();
  const router = useRouter();
  const params = useParams();
  const grnId = params?.id as string;

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const grn = useQuery(api.purchaseInvoices.getGRNById, grnId ? { grnId: grnId as any } : "skip");
  const allAccounts = useQuery(api.accounts.getAll, company?._id ? { companyId: company._id } : "skip");
  const postGRN = useMutation(api.purchaseInvoices.postGRN);
  const autoClassify = useMutation(api.accounts.autoClassifyOperationalTypes);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const [showAutoFix, setShowAutoFix] = useState(false);
  const [autoFixing, setAutoFixing] = useState(false);

  // ── Smart account picker (works EVEN WITHOUT operationalType set) ──
  // Strategy:
  //   1. Try the explicit operationalType tag (postable & active first)
  //   2. Fall back to name-pattern search across all accounts
  //   3. Score candidates and pick the best
  const smartPickAccount = (target: "inventory" | "payable") => {
    if (!allAccounts) return null;

    const opType = target === "inventory" ? "inventory_asset" : "trade_payable";
    const accountType = target === "inventory" ? "asset" : "liability";

    // Step 1: explicit operationalType + postable + active
    const tagged = allAccounts.find((a: any) => a.operationalType === opType && a.isPostable && a.isActive);
    if (tagged) return tagged;

    // Step 2: name-pattern + score
    const lower = (s: string) => (s || "").toLowerCase();

    const STRONG: Record<string, string[]> = {
      inventory: ["raw material", "raw materials", "خامات", "مواد خام", "finished products", "finished goods", "منتجات تامة"],
      payable:   ["suppliers", "supplier", "موردين", "موردون", "الموردون", "vendors"],
    };
    const GENERIC: Record<string, string[]> = {
      inventory: ["inventory", "stock", "merchandise", "supplies", "goods", "مخزون", "بضاعة", "بضائع", "مخازن"],
      payable:   ["payable", "accounts payable", "ap", "creditor", "ذمم دائنة", "دائنون"],
    };

    const score = (acc: any): number => {
      if (acc.accountType !== accountType) return -999;
      if (!acc.isActive) return -999;
      let s = 0;
      const text = `${lower(acc.nameAr)} ${lower(acc.nameEn)}`;
      if (acc.isPostable) s += 15; else s -= 5;
      if (STRONG[target].some((p) => text.includes(lower(p))))  s += 25;
      if (GENERIC[target].some((p) => text.includes(lower(p)))) s += 8;
      return s;
    };

    const candidates = allAccounts
      .map((a: any) => ({ acc: a, s: score(a) }))
      .filter((x) => x.s > 8) // must have at least one keyword match
      .sort((a, b) => b.s - a.s);

    return candidates[0]?.acc ?? null;
  };

  const handlePostGRN = async () => {
    if (!currentUser?._id || !allAccounts) return;
    const inventoryAcc = smartPickAccount("inventory");
    const apAcc        = smartPickAccount("payable");
    if (!inventoryAcc || !apAcc) {
      setPostError(
        isRTL
          ? "لم نتمكن من إيجاد حساب 'مخزون' أو 'موردين' في شجرة الحسابات. تأكد من وجود حساب باسم RAW MATERIALS أو SUPPLIERS."
          : "Could not find inventory or supplier accounts. Make sure accounts named 'RAW MATERIALS' or 'SUPPLIERS' exist."
      );
      setShowAutoFix(true);
      return;
    }
    setPosting(true); setPostError(""); setShowAutoFix(false);
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

  const handleAutoFix = async () => {
    if (!currentUser?._id || !company?._id) return;
    setAutoFixing(true);
    try {
      const result: any = await autoClassify({ companyId: company._id, userId: currentUser._id });
      if (result.totalSet > 0) {
        setPostError("");
        setShowAutoFix(false);
        // Re-attempt posting after classification (allAccounts will refresh via reactivity)
        setTimeout(() => handlePostGRN(), 600);
      } else {
        setPostError(
          (isRTL
            ? "لم يتم العثور على حسابات بأسماء معروفة (مخزون / موردين). الرجاء تصنيف الحسابات يدوياً من شجرة الحسابات."
            : "No accounts matching known names (inventory / suppliers). Please classify manually in the chart of accounts.")
        );
      }
    } catch (e: any) {
      setPostError(e.message);
    } finally {
      setAutoFixing(false);
    }
  };

  if (grn === undefined) return <LoadingState label={t("loading") ?? "Loading..."} />;
  if (!grn) return <div className="p-8 text-center text-[color:var(--ink-400)]"><p>{t("documentNotFound")}</p></div>;

  const companyName  = isRTL ? grn.companyNameAr : (grn.companyNameEn || grn.companyNameAr);
  const branchName   = isRTL ? grn.branchNameAr  : (grn.branchNameEn  || grn.branchNameAr);
  const supplierName = grn.supplierNameAr ?? "—";
  const warehouseName= grn.warehouseNameAr ?? "—";
  const logoUrl      = settingsCompany?.logoUrl;
  const companyPhone = (settingsCompany as any)?.phone ?? "";
  const companyAddr  = (settingsCompany as any)?.address ?? grn.companyAddress ?? "";

  const totalValue = (grn.lines ?? []).reduce((s: number, l: any) => s + (l.totalCost ?? 0), 0);
  const isDraft    = grn.documentStatus === "draft";
  const isApproved = grn.documentStatus === "approved";
  const isPosted   = grn.postingStatus  === "posted";
  const canPostGRN = canPost("purchases") && (isDraft || isApproved) && !isPosted && grn.documentStatus !== "cancelled";
  const titleLabel = lang === "ar" ? "إشعار استلام بضاعة" : "Goods Receipt Note";

  const exportExcel = () => {
    const rows = [
      [t("grnTitle"), grn.grnNumber], [t("date"), grn.receiptDate], [t("supplier"), supplierName], [t("warehouse"), warehouseName], [],
      ["#", t("itemCode"), t("itemName"), t("quantity"), t("unitCost"), t("lineTotal")],
      ...(grn.lines ?? []).map((l: any, i: number) => [i+1, l.itemCode??"", isRTL?(l.itemNameAr??l.itemName??""):(l.itemNameEn||l.itemNameAr||l.itemName||""), l.quantity, l.unitCost??0, l.totalCost??0]),
      [], [t("total"),"","","","",totalValue],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GRN");
    XLSX.writeFile(wb, `grn-${grn.grnNumber}.xlsx`);
  };

  const grnPdfData = {
    logoUrl, companyNameEn: settingsCompany?.nameEn ?? undefined, companyPhone,
    companyName, companyAddress: companyAddr, branchName, grnNumber: grn.grnNumber, receiptDate: grn.receiptDate,
    documentStatus: grn.documentStatus, supplierName, warehouseName,
    lines: (grn.lines ?? []).map((l: any) => ({ itemCode: l.itemCode, itemNameAr: l.itemNameAr ?? l.itemName ?? "", itemNameEn: l.itemNameEn, quantity: l.quantity, unitCost: l.unitCost ?? 0, totalCost: l.totalCost ?? 0 })),
    isRTL,
    labels: { title: t("grnTitle"), supplierLabel: t("supplier"), warehouseLabel: t("warehouse"), date: t("date"), no: "#", code: t("itemCode"), name: t("itemName"), qty: t("quantity"), unitCost: t("unitCost"), total: t("lineTotal"), totalLabel: t("total"), preparedBy: t("preparedBy"), authorizedBy: t("authorizedBy"), receivedBy: t("receivedBy"), printedBy: t("printedBy") },
    formatCurrency: (n: number) => formatCurrency(n),
  };

  return (
    <div className="min-h-screen bg-[color:var(--ink-100)] print:bg-white" dir={isRTL ? "rtl" : "ltr"}>
      <div className="print:hidden sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[color:var(--ink-200)] px-6 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--ink-500)] hover:text-[color:var(--ink-900)] transition-colors">
          {isRTL ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}{t("backToList")}
        </button>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <DocActionBar docType="grn" docId={grnId} documentStatus={grn.documentStatus} postingStatus={grn.postingStatus ?? "unposted"} userId={currentUser?._id} companyId={company?._id} />
            {!isPosted && (canPostGRN ? (
              <button onClick={handlePostGRN} disabled={posting} className="h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50">
                <Send className="h-3.5 w-3.5" />{posting ? t("posting") : t("post")}
              </button>
            ) : (
              <span className="h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 bg-[color:var(--ink-50)] text-[color:var(--ink-400)] border border-[color:var(--ink-200)] cursor-not-allowed">
                <ShieldOff className="h-3.5 w-3.5" />{t("post")}
              </span>
            ))}
            <button onClick={exportExcel} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700"><FileSpreadsheet className="h-4 w-4" />Excel</button>
            <PdfDownloadButton document={<GrnPdf data={grnPdfData} />} fileName={`grn-${grn.grnNumber}.pdf`} label={t("downloadPdf") ?? "PDF"} />
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[color:var(--brand-700)] text-white hover:bg-[color:var(--brand-800)]"><Printer className="h-4 w-4" />{t("printGRN")}</button>
          </div>
          {postError && (
            <div className="flex flex-col items-end gap-1.5 max-w-md">
              <p className="text-xs text-red-600 text-end">{postError}</p>
              {showAutoFix && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAutoFix}
                    disabled={autoFixing}
                    className="h-7 px-3 rounded-md text-xs font-bold inline-flex items-center gap-1.5 bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    ✨ {autoFixing ? (isRTL ? "جاري الإصلاح..." : "Fixing...") : (isRTL ? "إصلاح تلقائي" : "Auto-Fix")}
                  </button>
                  <button
                    onClick={() => router.push("/finance/chart-of-accounts")}
                    className="h-7 px-3 rounded-md text-xs font-bold inline-flex items-center gap-1.5 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                  >
                    {isRTL ? "اذهب لشجرة الحسابات" : "Open Chart of Accounts"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto my-8 print:my-0 print:max-w-none">
        <div className="bg-white rounded-2xl shadow-md print:shadow-none print:rounded-none overflow-hidden">

          <div className="flex items-stretch justify-between px-8 pt-8 pb-6 gap-6">
            <div className="flex items-start gap-4 flex-1">
              {logoUrl ? <Image src={logoUrl} alt="logo" width={80} height={80} className="rounded-xl object-contain shrink-0" unoptimized /> : (
                <div className="h-16 w-16 rounded-xl flex items-center justify-center text-white text-2xl font-black shrink-0" style={{ background: "linear-gradient(135deg, var(--brand-700), var(--brand-500))" }}>{(companyName || "A").charAt(0).toUpperCase()}</div>
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
                <p className="text-white text-2xl font-black tracking-tight mt-0.5">{grn.grnNumber}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 text-sm">
                <div className="flex items-center gap-2"><span className="text-[color:var(--ink-400)] text-xs">{t("date")}:</span><span className="font-semibold text-[color:var(--ink-800)]">{grn.receiptDate}</span></div>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full mt-1 ${isPosted ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{isPosted ? (lang === "ar" ? "مرحّل" : "Posted") : (lang === "ar" ? "غير مرحّل" : "Unposted")}</span>
              </div>
            </div>
          </div>

          <div className="h-0.5 mx-8" style={{ background: "linear-gradient(90deg, var(--brand-700), var(--brand-300), transparent)" }} />

          <div className="px-8 py-5 flex gap-4">
            <div className="bg-[color:var(--ink-50)] rounded-xl px-5 py-4 border border-[color:var(--ink-100)]">
              <p className="text-[10px] uppercase tracking-widest font-bold text-[color:var(--brand-600)] mb-1">{t("supplier")}</p>
              <p className="text-base font-extrabold text-[color:var(--ink-900)]">{supplierName}</p>
            </div>
            <div className="bg-[color:var(--ink-50)] rounded-xl px-5 py-4 border border-[color:var(--ink-100)]">
              <p className="text-[10px] uppercase tracking-widest font-bold text-[color:var(--brand-600)] mb-1">{t("warehouse")}</p>
              <p className="text-base font-extrabold text-[color:var(--ink-900)]">{warehouseName}</p>
            </div>
          </div>

          <div className="px-8 pb-2"><LinesTable lines={grn.lines} t={t} isRTL={isRTL} formatCurrency={formatCurrency} /></div>

          <div className="px-8 pb-6 flex justify-end mt-4">
            <div className="w-72">
              <div className="flex justify-between px-3 py-3 rounded-lg text-white font-extrabold text-base" style={{ background: "var(--brand-700)" }}>
                <span>{t("total")}</span><span className="tabular-nums">{formatCurrency(totalValue)}</span>
              </div>
            </div>
          </div>

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

          <div className="px-8 py-3 text-center text-xs text-white/80" style={{ background: "var(--brand-700)" }}>{t("printedBy")} — {companyName}</div>
        </div>
      </div>
    </div>
  );
}
