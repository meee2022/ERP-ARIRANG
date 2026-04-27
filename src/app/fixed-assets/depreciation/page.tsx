// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState, SummaryStrip } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { TrendingUp, Eye, Send, X, Check, AlertTriangle } from "lucide-react";

function StatusBadge({ status, t }: { status: string; t: any }) {
  const isDraft = status === "draft";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${isDraft ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "currentColor", opacity: 0.7 }} />
      {isDraft ? t("draft") : t("posted")}
    </span>
  );
}

export default function DepreciationRunsPage() {
  const { t, isRTL, formatCurrency } = useI18n();

  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const preview = useQuery(
    api.fixedAssets.previewDepreciationRun,
    companyId ? { companyId, periodYear: year, periodMonth: month } : "skip"
  );

  const runs = useQuery(
    api.fixedAssets.getDepreciationRuns,
    companyId ? { companyId } : "skip"
  );

  const [viewRunId, setViewRunId] = useState<string | null>(null);
  const runDetails = useQuery(
    api.fixedAssets.getDepreciationRunDetails,
    viewRunId ? { runId: viewRunId } : "skip"
  );

  const createRun = useMutation(api.fixedAssets.createDepreciationRun);
  const postRun = useMutation(api.fixedAssets.postDepreciationRun);

  const defaultUser = useQuery(api.helpers.getDefaultUser, {});
  const defaultCurrency = useQuery(api.helpers.getDefaultCurrency, {});

  const todayISO = new Date().toISOString().split("T")[0];
  const openPeriod = useQuery(
    api.helpers.getOpenPeriod,
    companyId ? { companyId, date: todayISO } : "skip"
  );

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  function flash(msg: string) { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000); }

  async function onCreateDraft() {
    if (!companyId) return;
    setSaving(true); setErr(null);
    try {
      await createRun({ companyId, periodYear: year, periodMonth: month });
      flash(isRTL ? "تم إنشاء دورة الإهلاك" : "Depreciation run created");
      setShowPreview(false);
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("DUPLICATE_RUN")) setErr(t("duplicateRun"));
      else setErr(msg || t("errUnexpected"));
    } finally { setSaving(false); }
  }

  async function onPostRun(runId: string) {
    if (!defaultUser || !defaultCurrency || !companyId) return;
    setSaving(true); setErr(null);
    try {
      const run = (runs ?? []).find((r: any) => r._id === runId);
      if (!run) throw new Error("Run not found");

      const branchId = defaultUser.branchIds?.[0];
      if (!branchId) throw new Error(t("errNoBranch"));

      // Period lookup happens server-side via postJournalEntry -> validatePeriodOpen
      // We need an actual periodId - use openPeriod query result
      if (!openPeriod) throw new Error(t("errNoPeriod"));

      await postRun({
        runId,
        userId: defaultUser._id,
        branchId,
        periodId: openPeriod._id,
        currencyId: defaultCurrency._id,
      });
      flash(isRTL ? "تم ترحيل دورة الإهلاك" : "Depreciation run posted");
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("MISSING_ACCOUNTS")) {
        const parts = msg.split(":");
        setErr(`${t("missingAssetAccounts")}: ${parts[1]} - ${parts[2]}`);
      } else {
        setErr(msg || t("errUnexpected"));
      }
    } finally { setSaving(false); }
  }

  const totalPreviewDepr = (preview ?? []).reduce((s: number, p: any) => s + p.depreciationAmount, 0);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      {successMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-green-600 text-white rounded-xl px-4 py-2 shadow-lg text-sm">
          <Check className="h-4 w-4" /> {successMsg}
        </div>
      )}

      <PageHeader
        icon={TrendingUp}
        title={t("depreciationRuns")}
        subtitle={t("fixedAssets")}
      />

      {err && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" /><span>{err}</span></div>
          <button onClick={() => setErr(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Period selector + preview */}
      <div className="surface-card p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-[color:var(--ink-500)] mb-1 uppercase tracking-wider">{isRTL ? "السنة" : "Year"}</label>
            <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))}
              className="border border-[color:var(--ink-300)] rounded-lg px-3 py-2 text-sm bg-white w-24" dir="ltr" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[color:var(--ink-500)] mb-1 uppercase tracking-wider">{isRTL ? "الشهر" : "Month"}</label>
            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}
              className="border border-[color:var(--ink-300)] rounded-lg px-3 py-2 text-sm bg-white">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <button onClick={() => setShowPreview(true)}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold">
            <Eye className="h-4 w-4" /> {t("previewDepreciation")}
          </button>
        </div>

        {showPreview && preview && (
          <div className="mt-5">
            <SummaryStrip items={[
              { label: t("assetsCount"), value: String(preview.length), borderColor: "var(--brand-600)" },
              { label: t("totalDepreciation"), value: formatCurrency(totalPreviewDepr), borderColor: "var(--brand-600)" },
            ]} className="mb-4" />

            {preview.length === 0 ? (
              <p className="text-sm text-[color:var(--ink-400)] py-4 text-center">{isRTL ? "لا توجد أصول مؤهلة للإهلاك" : "No assets eligible for depreciation"}</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t("assetCode")}</th>
                        <th>{t("name")}</th>
                        <th className="text-end">{t("bookValueBefore")}</th>
                        <th className="text-end">{t("depreciationAmount")}</th>
                        <th className="text-end">{t("bookValueAfter")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((p: any) => (
                        <tr key={p.assetId}>
                          <td className="font-mono text-sm">{p.assetCode}</td>
                          <td>{isRTL ? p.nameAr : (p.nameEn || p.nameAr)}</td>
                          <td className="text-end tabular-nums">{formatCurrency(p.bookValueBefore)}</td>
                          <td className="text-end tabular-nums font-semibold text-amber-700">{formatCurrency(p.depreciationAmount)}</td>
                          <td className="text-end tabular-nums">{formatCurrency(p.bookValueAfter)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex justify-end">
                  <button onClick={onCreateDraft} disabled={saving}
                    className="btn-primary inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50">
                    {saving ? t("saving") : t("createDraftRun")}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Runs history */}
      <div className="surface-card overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-[color:var(--ink-100)]">
          <span className="text-sm font-bold text-[color:var(--ink-900)]">{isRTL ? "سجل الدورات" : "Run History"}</span>
        </div>
        {runs === undefined ? (
          <LoadingState label={t("loading")} />
        ) : (runs ?? []).length === 0 ? (
          <EmptyState icon={TrendingUp} message={t("noDepreciationRuns")} />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("runPeriod")}</th>
                <th>{t("status")}</th>
                <th className="text-end">{t("totalDepreciation")}</th>
                <th className="text-end">{t("assetsCount")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {(runs ?? []).map((run: any) => (
                <tr key={run._id}>
                  <td className="font-medium">{run.periodMonth}/{run.periodYear}</td>
                  <td><StatusBadge status={run.status} t={t} /></td>
                  <td className="text-end tabular-nums">{formatCurrency(run.totalDepreciation)}</td>
                  <td className="text-end tabular-nums">{run.assetCount}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setViewRunId(run._id)} title={t("view")}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                      {run.status === "draft" && (
                        <button onClick={() => onPostRun(run._id)} title={t("postRun")} disabled={saving}
                          className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors disabled:opacity-50">
                          <Send className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Run detail modal */}
      {viewRunId && runDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="surface-card w-full max-w-3xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--ink-100)]">
              <h2 className="text-lg font-bold text-[color:var(--ink-900)]">
                {t("depreciationRuns")} — {runDetails.periodMonth}/{runDetails.periodYear}
              </h2>
              <button onClick={() => setViewRunId(null)} className="p-1 rounded-lg hover:bg-[color:var(--ink-100)]">
                <X className="h-5 w-5 text-[color:var(--ink-500)]" />
              </button>
            </div>
            <div className="overflow-y-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("assetCode")}</th>
                    <th>{t("name")}</th>
                    <th className="text-end">{t("bookValueBefore")}</th>
                    <th className="text-end">{t("depreciationAmount")}</th>
                    <th className="text-end">{t("bookValueAfter")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(runDetails.entries ?? []).map((e: any) => (
                    <tr key={e._id}>
                      <td className="font-mono text-sm">{e.assetCode}</td>
                      <td>{isRTL ? e.assetNameAr : (e.assetNameEn || e.assetNameAr)}</td>
                      <td className="text-end tabular-nums">{formatCurrency(e.bookValueBefore)}</td>
                      <td className="text-end tabular-nums font-semibold text-amber-700">{formatCurrency(e.depreciationAmount)}</td>
                      <td className="text-end tabular-nums">{formatCurrency(e.bookValueAfter)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
