// @ts-nocheck
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import {
  CalendarCheck2, CheckCircle2, XCircle, AlertTriangle,
  Lock, ChevronRight, RefreshCw, FileText, ShoppingCart,
  Trash2, BarChart3, Info,
} from "lucide-react";

const ACCENT = "#8b5cf6";

// ─── Step status pill ─────────────────────────────────────────────────────────
function StepBadge({ ok, loading }: { ok: boolean | undefined; loading?: boolean }) {
  if (loading) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
      style={{ background: "#ffffff10", color: "var(--muted-foreground)" }}>
      <RefreshCw className="h-3 w-3 animate-spin" />
      جاري الفحص...
    </span>
  );
  if (ok === true) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
      style={{ background: "#34d39920", color: "#34d399" }}>
      <CheckCircle2 className="h-3 w-3" />
      مكتمل
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
      style={{ background: "#f8717120", color: "#f87171" }}>
      <XCircle className="h-3 w-3" />
      يحتاج إجراء
    </span>
  );
}

// ─── Checklist Step Card ───────────────────────────────────────────────────────
function StepCard({
  step, icon: Icon, titleAr, titleEn,
  descAr, descEn, ok, detail, isRTL, loading, action,
}: any) {
  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{
        background: "var(--card)",
        borderColor: ok ? "#34d39930" : ok === false ? "#f8717130" : "rgba(255,255,255,0.1)",
      }}>
      <div className="flex items-start gap-4 p-4">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: ok ? "#34d39920" : ok === false ? "#f8717115" : "#ffffff10" }}>
          <Icon className="h-5 w-5" style={{ color: ok ? "#34d399" : ok === false ? "#f87171" : "var(--muted-foreground)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded"
              style={{ background: `${ACCENT}20`, color: ACCENT }}>
              {step}
            </span>
            <span className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
              {isRTL ? titleAr : titleEn}
            </span>
            <span className="ms-auto shrink-0">
              <StepBadge ok={ok} loading={loading} />
            </span>
          </div>
          <p className="text-[11.5px] mt-1.5" style={{ color: "var(--muted-foreground)" }}>
            {isRTL ? descAr : descEn}
          </p>
          {detail && (
            <p className="text-[11px] mt-1 font-semibold" style={{ color: ok ? "#34d399" : "#f59e0b" }}>
              {detail}
            </p>
          )}
          {action && !ok && (
            <div className="mt-2">{action}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Period Selector ──────────────────────────────────────────────────────────
function PeriodSelector({ periods, selectedPeriodId, onChange, isRTL }: any) {
  return (
    <select
      value={selectedPeriodId ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full rounded-xl px-3 py-2.5 text-[12px] border outline-none"
      style={{ background: "var(--background)", borderColor: "rgba(255,255,255,0.12)", color: "var(--foreground)" }}
    >
      <option value="">{isRTL ? "— اختر الفترة —" : "— Select period —"}</option>
      {(periods ?? []).map((p: any) => (
        <option key={p._id} value={p._id} disabled={p.status === "closed"}>
          {p.name} ({p.startDate} → {p.endDate})
          {p.status === "closed" ? (isRTL ? " [مغلقة]" : " [closed]") : ""}
        </option>
      ))}
    </select>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function MonthEndClosePage() {
  const { isRTL } = useI18n();
  const { currentUser } = useAuth();
  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const [selectedFyId, setSelectedFyId]       = useState<string | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [closing, setClosing]                   = useState(false);
  const [closeError, setCloseError]             = useState<string | null>(null);
  const [closedSuccess, setClosedSuccess]       = useState(false);

  // Fiscal years
  const fiscalYears = useQuery(
    api.fiscalYears.listFiscalYears,
    companyId && currentUser ? { companyId, userId: currentUser._id as any } : "skip"
  );

  // Periods for selected FY
  const fyWithPeriods = useQuery(
    api.fiscalYears.getFiscalYearWithPeriods,
    selectedFyId && currentUser ? { fiscalYearId: selectedFyId, userId: currentUser._id as any } : "skip"
  );
  const periods = fyWithPeriods?.periods ?? [];
  const selectedPeriod = periods.find((p: any) => p._id === selectedPeriodId);

  // Checklist query — only when period is selected
  const checklist = useQuery(
    api.reports.getPeriodChecklist,
    companyId && selectedPeriod
      ? { companyId, periodStartDate: selectedPeriod.startDate, periodEndDate: selectedPeriod.endDate }
      : "skip"
  );

  const closePeriodMut = useMutation(api.fiscalYears.closePeriod);

  const handleClose = async () => {
    if (!selectedPeriodId || !currentUser || !checklist?.canClose) return;
    setClosing(true);
    setCloseError(null);
    try {
      await closePeriodMut({ periodId: selectedPeriodId, userId: currentUser._id as any });
      setClosedSuccess(true);
      setSelectedPeriodId(null);
    } catch (e: any) {
      setCloseError(e.message ?? "حدث خطأ أثناء الإغلاق");
    } finally {
      setClosing(false);
    }
  };

  const openFiscalYears = (fiscalYears ?? []).filter((fy: any) => fy.status === "open");

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <PageHeader
        title={isRTL ? "معالج إغلاق الشهر" : "Month-End Closing Wizard"}
        subtitle={isRTL
          ? "تحقق من اكتمال جميع الإجراءات قبل إغلاق الفترة المالية"
          : "Verify all procedures are complete before locking the accounting period"}
        icon={CalendarCheck2}
        iconColor={ACCENT}
      />

      {/* Step 1 — Select Fiscal Year & Period */}
      <div className="rounded-2xl border p-5 space-y-4"
        style={{ background: "var(--card)", borderColor: "rgba(255,255,255,0.1)" }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded" style={{ background: `${ACCENT}20`, color: ACCENT }}>01</span>
          <span className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
            {isRTL ? "اختر السنة المالية والفترة" : "Select Fiscal Year & Period"}
          </span>
        </div>

        {/* FY picker */}
        <div>
          <label className="text-[11px] mb-1 block" style={{ color: "var(--muted-foreground)" }}>
            {isRTL ? "السنة المالية" : "Fiscal Year"}
          </label>
          <select
            value={selectedFyId ?? ""}
            onChange={(e) => { setSelectedFyId(e.target.value || null); setSelectedPeriodId(null); setClosedSuccess(false); }}
            className="w-full rounded-xl px-3 py-2.5 text-[12px] border outline-none"
            style={{ background: "var(--background)", borderColor: "rgba(255,255,255,0.12)", color: "var(--foreground)" }}
          >
            <option value="">{isRTL ? "— اختر السنة —" : "— Select year —"}</option>
            {openFiscalYears.map((fy: any) => (
              <option key={fy._id} value={fy._id}>{fy.nameAr} ({fy.startDate} → {fy.endDate})</option>
            ))}
          </select>
        </div>

        {/* Period picker */}
        {selectedFyId && (
          <div>
            <label className="text-[11px] mb-1 block" style={{ color: "var(--muted-foreground)" }}>
              {isRTL ? "الفترة المالية" : "Accounting Period"}
            </label>
            <PeriodSelector
              periods={periods}
              selectedPeriodId={selectedPeriodId}
              onChange={(id: string | null) => { setSelectedPeriodId(id); setClosedSuccess(false); setCloseError(null); }}
              isRTL={isRTL}
            />
          </div>
        )}

        {selectedPeriod && (
          <div className="rounded-xl px-3 py-2.5 flex items-center gap-2 text-[11.5px]"
            style={{ background: `${ACCENT}15`, color: ACCENT }}>
            <Info className="h-3.5 w-3.5 shrink-0" />
            {isRTL
              ? `الفترة المختارة: ${selectedPeriod.name} (${selectedPeriod.startDate} — ${selectedPeriod.endDate})`
              : `Selected: ${selectedPeriod.name} (${selectedPeriod.startDate} — ${selectedPeriod.endDate})`}
          </div>
        )}
      </div>

      {/* Checklist */}
      {selectedPeriod && (
        <>
          <div className="flex items-center gap-2 px-1">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
            <span className="text-[11px] font-semibold px-2" style={{ color: "var(--muted-foreground)" }}>
              {isRTL ? "قائمة التحقق" : "Checklist"}
            </span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
          </div>

          <div className="space-y-3">
            {/* Step 2 — Unposted Sales */}
            <StepCard
              step="02"
              icon={FileText}
              titleAr="فواتير المبيعات غير المرحلة"
              titleEn="Unposted Sales Invoices"
              descAr="يجب أن تكون جميع فواتير المبيعات مرحلة قبل إغلاق الفترة"
              descEn="All sales invoices must be posted before closing the period"
              ok={checklist ? checklist.sales.ok : undefined}
              loading={!checklist}
              isRTL={isRTL}
              detail={
                checklist
                  ? checklist.sales.ok
                    ? isRTL
                      ? `✓ جميع الفواتير (${checklist.sales.total}) مرحلة`
                      : `✓ All invoices (${checklist.sales.total}) posted`
                    : isRTL
                      ? `⚠ ${checklist.sales.unposted} فاتورة غير مرحلة من أصل ${checklist.sales.total}`
                      : `⚠ ${checklist.sales.unposted} of ${checklist.sales.total} invoices unposted`
                  : null
              }
            />

            {/* Step 3 — Unposted Purchases */}
            <StepCard
              step="03"
              icon={ShoppingCart}
              titleAr="فواتير المشتريات غير المرحلة"
              titleEn="Unposted Purchase Invoices"
              descAr="يجب أن تكون جميع فواتير المشتريات مرحلة قبل إغلاق الفترة"
              descEn="All purchase invoices must be posted before closing the period"
              ok={checklist ? checklist.purchases.ok : undefined}
              loading={!checklist}
              isRTL={isRTL}
              detail={
                checklist
                  ? checklist.purchases.ok
                    ? isRTL
                      ? `✓ جميع الفواتير (${checklist.purchases.total}) مرحلة`
                      : `✓ All invoices (${checklist.purchases.total}) posted`
                    : isRTL
                      ? `⚠ ${checklist.purchases.unposted} فاتورة غير مرحلة من أصل ${checklist.purchases.total}`
                      : `⚠ ${checklist.purchases.unposted} of ${checklist.purchases.total} invoices unposted`
                  : null
              }
            />

            {/* Step 4 — Wastage Entries */}
            <StepCard
              step="04"
              icon={Trash2}
              titleAr="قيود الهالك والتالف"
              titleEn="Wastage / Spoilage Entries"
              descAr="يجب أن تكون جميع قيود الهالك مرحلة قبل إغلاق الفترة"
              descEn="All wastage entries must be posted before closing the period"
              ok={checklist ? checklist.wastage.ok : undefined}
              loading={!checklist}
              isRTL={isRTL}
              detail={
                checklist
                  ? checklist.wastage.ok
                    ? isRTL ? "✓ لا توجد قيود هالك معلقة" : "✓ No pending wastage entries"
                    : isRTL
                      ? `⚠ ${checklist.wastage.unposted} قيد هالك غير مرحل`
                      : `⚠ ${checklist.wastage.unposted} unposted wastage entries`
                  : null
              }
            />

            {/* Step 5 — Trial Balance Review */}
            <StepCard
              step="05"
              icon={BarChart3}
              titleAr="مراجعة ميزان المراجعة"
              titleEn="Review Trial Balance"
              descAr="تحقق من ميزان المراجعة قبل الإغلاق — الأرصدة يجب أن تتطابق"
              descEn="Review the trial balance before closing — debits must equal credits"
              ok={checklist ? checklist.trialBalance.ok : undefined}
              loading={!checklist}
              isRTL={isRTL}
              detail={
                checklist
                  ? checklist.trialBalance.ok
                    ? isRTL
                      ? `✓ ${checklist.trialBalance.journalLines} قيد محاسبي، ${checklist.trialBalance.nonZeroAccounts} حساب نشط`
                      : `✓ ${checklist.trialBalance.journalLines} journal lines, ${checklist.trialBalance.nonZeroAccounts} active accounts`
                    : isRTL
                      ? "⚠ لا توجد قيود في هذه الفترة — تأكد من الترحيل"
                      : "⚠ No journal entries found — make sure transactions are posted"
                  : null
              }
            />
          </div>

          {/* Summary banner */}
          {checklist && (
            <div className="rounded-2xl p-5 border"
              style={{
                background: checklist.canClose
                  ? "linear-gradient(135deg,#065f4620,#064e3b20)"
                  : "linear-gradient(135deg,#7c3aed20,#4f46e520)",
                borderColor: checklist.canClose ? "#34d39940" : `${ACCENT}40`,
              }}>
              <div className="flex items-start gap-3">
                {checklist.canClose
                  ? <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0 mt-0.5" />
                  : <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" style={{ color: ACCENT }} />}
                <div>
                  <p className="text-[13px] font-bold" style={{ color: checklist.canClose ? "#34d399" : ACCENT }}>
                    {checklist.canClose
                      ? isRTL ? "جاهز للإغلاق" : "Ready to Close"
                      : isRTL ? "لم يكتمل التحضير بعد" : "Preparation Incomplete"}
                  </p>
                  <p className="text-[11.5px] mt-1" style={{ color: "var(--muted-foreground)" }}>
                    {checklist.canClose
                      ? isRTL
                        ? "جميع الشروط مستوفاة — يمكنك إغلاق الفترة الآن. لن يمكن إضافة قيود لهذه الفترة بعد الإغلاق."
                        : "All conditions met — you can close the period now. No entries can be added after closing."
                      : isRTL
                        ? "أكمل البنود المطلوبة أعلاه قبل إغلاق الفترة."
                        : "Complete the required items above before closing the period."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error / Success */}
          {closeError && (
            <div className="rounded-xl px-4 py-3 border border-red-500/30 text-[12px]"
              style={{ background: "#ef444420", color: "#f87171" }}>
              {closeError}
            </div>
          )}
          {closedSuccess && (
            <div className="rounded-xl px-4 py-3 border border-emerald-500/30 text-[12px] flex items-center gap-2"
              style={{ background: "#34d39920", color: "#34d399" }}>
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {isRTL ? "تم إغلاق الفترة بنجاح ✓" : "Period closed successfully ✓"}
            </div>
          )}

          {/* Close Button */}
          {checklist && !closedSuccess && selectedPeriod?.status !== "closed" && (
            <button
              onClick={handleClose}
              disabled={!checklist.canClose || closing}
              className="w-full h-12 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: checklist.canClose
                  ? "linear-gradient(135deg,#7c3aed,#5b21b6)"
                  : "rgba(255,255,255,0.05)",
                color: checklist.canClose ? "#fff" : "var(--muted-foreground)",
                boxShadow: checklist.canClose ? "0 4px 20px #7c3aed50" : "none",
              }}
            >
              {closing
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> {isRTL ? "جاري الإغلاق..." : "Closing..."}</>
                : <><Lock className="h-4 w-4" /> {isRTL ? `إغلاق الفترة — ${selectedPeriod?.name}` : `Close Period — ${selectedPeriod?.name}`} <ChevronRight className="h-4 w-4" /></>}
            </button>
          )}

          {selectedPeriod?.status === "closed" && (
            <div className="rounded-xl px-4 py-3 border border-white/10 text-[12px] flex items-center gap-2"
              style={{ background: "rgba(255,255,255,0.05)", color: "var(--muted-foreground)" }}>
              <Lock className="h-4 w-4 shrink-0" />
              {isRTL ? "هذه الفترة مغلقة بالفعل" : "This period is already closed"}
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!selectedPeriod && !selectedFyId && (
        <div className="rounded-2xl border-2 border-dashed py-12 text-center"
          style={{ borderColor: "rgba(255,255,255,0.12)" }}>
          <CalendarCheck2 className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: ACCENT }} />
          <p className="text-[13px] font-semibold" style={{ color: "var(--muted-foreground)" }}>
            {isRTL ? "اختر السنة المالية والفترة للبدء" : "Select a fiscal year and period to begin"}
          </p>
        </div>
      )}
    </div>
  );
}
