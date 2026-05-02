// @ts-nocheck
"use client";
import React, { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "@/store/toastStore";
import {
  ClipboardList, ChevronDown, ChevronUp, CalendarDays,
  CheckCircle2, FileCheck, BookOpen, TrendingUp,
  Hash, Layers, Truck, X, Printer, Users, Package,
  CircleDot, ArrowRight,
} from "lucide-react";
import { LoadingState } from "@/components/ui/data-display";

function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function todayISO() { return new Date().toISOString().split("T")[0]; }

// ─── Status configs ───────────────────────────────────────────────────────────
const STATUS_INFO: Record<string, { color: string; bg: string; border: string; labelAr: string; labelEn: string; Icon: any }> = {
  draft:     { color: "#92400e", bg: "#fef9c3", border: "#fde68a", labelAr: "مسودة",       labelEn: "Draft",     Icon: ClipboardList },
  approved:  { color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", labelAr: "معتمد",        labelEn: "Approved",  Icon: CheckCircle2  },
  converted: { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", labelAr: "محول لأوامر", labelEn: "Converted", Icon: FileCheck     },
};

const DIST_STATUS: Record<string, { color: string; bg: string; border: string; labelAr: string; labelEn: string }> = {
  pending:    { color: "#92400e", bg: "#fef9c3", border: "#fde68a", labelAr: "قيد الانتظار", labelEn: "Pending"    },
  dispatched: { color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", labelAr: "تم التسليم",   labelEn: "Dispatched" },
  confirmed:  { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", labelAr: "تم التأكيد",   labelEn: "Confirmed"  },
};

function StatusBadge({ status, isRTL }: any) {
  const info = STATUS_INFO[status]; if (!info) return null;
  const Icon = info.Icon;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold border"
      style={{ background: info.bg, color: info.color, borderColor: info.border }}>
      <Icon className="h-3 w-3" />
      {isRTL ? info.labelAr : info.labelEn}
    </span>
  );
}

function DistBadge({ status, isRTL }: any) {
  const info = DIST_STATUS[status];
  if (!info) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
      style={{ background: info.bg, color: info.color, borderColor: info.border }}>
      {isRTL ? info.labelAr : info.labelEn}
    </span>
  );
}

// ─── Distribution Sheet Modal ─────────────────────────────────────────────────
function DistributionModal({ planId, isRTL, onClose }: any) {
  const printRef = useRef<HTMLDivElement>(null);
  const sheet = useQuery(api.productionRequests.getDistributionSheet, { planId });
  const markDispatched   = useMutation(api.productionRequests.markDispatched);
  const generateDists    = useMutation(api.productionRequests.generateDistributionsForPlan);
  const resetDists       = useMutation(api.productionRequests.resetDistributionsForPlan);
  const [generating, setGenerating] = useState(false);

  const handleDispatchRep = async (repItems: any[]) => {
    const pending = repItems.filter((i) => i.status === "pending").map((i) => i.distributionId);
    if (pending.length === 0) return;
    try {
      await markDispatched({ distributionIds: pending });
      toast.success(isRTL ? "تم تسجيل التسليم" : "Marked as dispatched");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await generateDists({ planId });
      if (res.skipped) {
        // Already exists but might be duplicated — offer reset
        toast.success(isRTL ? "التوزيع موجود — استخدم إعادة التوليد لإصلاح التكرار" : "Already exists — use Reset to fix duplicates");
      } else {
        toast.success(isRTL ? `تم توليد ${res.generated} سجل` : `Generated ${res.generated} records`);
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setGenerating(false); }
  };

  const handleReset = async () => {
    if (!confirm(isRTL ? "سيتم حذف التوزيع الحالي وإعادة التوليد. متأكد؟" : "This will delete and regenerate all distributions. Sure?")) return;
    setGenerating(true);
    try {
      const res = await resetDists({ planId });
      toast.success(isRTL
        ? `تم الإصلاح: حذف ${res.deleted} وتوليد ${res.generated} سجل جديد`
        : `Fixed: deleted ${res.deleted}, generated ${res.generated} records`);
    } catch (e: any) { toast.error(e.message); }
    finally { setGenerating(false); }
  };

  const handleDispatchAll = async () => {
    if (!sheet) return;
    const pending = sheet.reps.flatMap((r: any) =>
      r.items.filter((i: any) => i.status === "pending").map((i: any) => i.distributionId)
    );
    if (pending.length === 0) return;
    try {
      await markDispatched({ distributionIds: pending });
      toast.success(isRTL ? "تم تسليم الكل" : "All dispatched");
    } catch (e: any) { toast.error(e.message); }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!sheet) return (
    <ModalShell onClose={onClose} isRTL={isRTL} title={isRTL ? "قائمة التوزيع" : "Distribution Sheet"}>
      <div className="py-20 text-center animate-pulse text-sm" style={{ color: "var(--ink-400)" }}>
        {isRTL ? "جاري التحميل..." : "Loading..."}
      </div>
    </ModalShell>
  );

  const { plan, reps, totals } = sheet;
  const allDone = totals.pending === 0;

  return (
    <ModalShell
      onClose={onClose}
      isRTL={isRTL}
      title={isRTL ? "قائمة توزيع الإنتاج" : "Production Distribution Sheet"}
      subtitle={`${plan.planNumber} · ${plan.productionDate}`}
      actions={
        <div className="flex items-center gap-2">
          {/* Reset button — always visible to fix duplicates */}
          <button onClick={handleReset} disabled={generating}
            className="h-8 px-3 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
            style={{ background: "#fef9c3", color: "#92400e", borderColor: "#fde68a" }}
            title={isRTL ? "إعادة توليد التوزيع وإصلاح التكرار" : "Regenerate & fix duplicates"}>
            ↺ {isRTL ? "إعادة التوليد" : "Regenerate"}
          </button>
          {!allDone && reps.length > 0 && (
            <button onClick={handleDispatchAll}
              className="h-8 px-3 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 transition-colors"
              style={{ background: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe" }}>
              <Truck className="h-3.5 w-3.5" />
              {isRTL ? "تسليم الكل" : "Dispatch All"}
            </button>
          )}
          <button onClick={handlePrint}
            className="h-8 px-3 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 transition-colors"
            style={{ background: "#f0fdf4", color: "#15803d", borderColor: "#bbf7d0" }}>
            <Printer className="h-3.5 w-3.5" />
            {isRTL ? "طباعة" : "Print"}
          </button>
        </div>
      }
    >
      {/* Progress summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: isRTL ? "قيد الانتظار" : "Pending",    value: totals.pending,    color: "#92400e", bg: "#fef9c3" },
          { label: isRTL ? "تم التسليم"   : "Dispatched", value: totals.dispatched, color: "#1d4ed8", bg: "#eff6ff" },
          { label: isRTL ? "تم التأكيد"   : "Confirmed",  value: totals.confirmed,  color: "#15803d", bg: "#f0fdf4" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl p-3 flex items-center gap-3"
            style={{ background: k.bg }}>
            <span className="text-2xl font-black tabular-nums" style={{ color: k.color }}>{k.value}</span>
            <span className="text-[11px] font-semibold" style={{ color: k.color }}>{k.label}</span>
          </div>
        ))}
      </div>

      {/* Overall progress bar */}
      {totals.total > 0 && (
        <div className="mb-5">
          <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--ink-400)" }}>
            <span>{isRTL ? "تقدم التوزيع" : "Distribution progress"}</span>
            <span className="tabular-nums font-bold">{Math.round(((totals.dispatched + totals.confirmed) / totals.total) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--ink-100)" }}>
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${((totals.dispatched + totals.confirmed) / totals.total) * 100}%`,
                background: allDone ? "#15803d" : "#1d4ed8",
              }} />
          </div>
        </div>
      )}

      {/* Per-rep sections */}
      <div ref={printRef} className="space-y-4">
        {reps.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center gap-3" style={{ color: "var(--ink-400)" }}>
            <Package className="h-12 w-12 opacity-20" />
            <p className="text-sm font-semibold">
              {isRTL ? "لا توجد بيانات توزيع لهذه الخطة" : "No distribution data for this plan"}
            </p>
            <p className="text-xs" style={{ color: "var(--ink-400)" }}>
              {isRTL
                ? "هذه الخطة اعتُمدت قبل إضافة ميزة التوزيع — اضغط لتوليد البيانات"
                : "This plan was approved before the distribution feature — click to generate"}
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="mt-2 h-9 px-5 rounded-xl text-sm font-bold text-white inline-flex items-center gap-2 disabled:opacity-60"
              style={{ background: "#6b1523" }}>
              <Truck className="h-4 w-4" />
              {generating
                ? (isRTL ? "جاري التوليد..." : "Generating...")
                : (isRTL ? "توليد بيانات التوزيع" : "Generate Distribution Data")}
            </button>
          </div>
        ) : reps.map((rep: any) => (
          <div key={rep.repId} className="rounded-xl overflow-hidden border"
            style={{ borderColor: rep.allConfirmed ? "#bbf7d0" : rep.allDispatched ? "#bfdbfe" : "var(--ink-200)" }}>

            {/* Rep header */}
            <div className="flex items-center justify-between px-4 py-3"
              style={{
                background: rep.allConfirmed ? "#f0fdf4" : rep.allDispatched ? "#eff6ff" : "var(--ink-50)",
                borderBottom: "1px solid var(--ink-100)",
              }}>
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center font-black text-sm"
                  style={{ background: "#6b1523", color: "white" }}>
                  {rep.repCode.replace(/[^0-9]/g, "") || rep.repCode.slice(-2)}
                </div>
                <div>
                  <p className="font-bold text-[13px]" style={{ color: "var(--ink-900)" }}>
                    {rep.repCode} — {isRTL ? rep.repName : rep.repNameEn}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--ink-400)" }}>
                    {rep.items.length} {isRTL ? "صنف" : "items"} ·
                    {isRTL ? " مخصص: " : " allocated: "}
                    <span className="font-bold" style={{ color: "#6b1523" }}>{rep.totalAllocated}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {rep.allConfirmed ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>
                    ✓ {isRTL ? "تم التأكيد" : "Confirmed"}
                  </span>
                ) : rep.allDispatched ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}>
                    {isRTL ? "بانتظار تأكيد المندوب" : "Awaiting rep confirmation"}
                  </span>
                ) : (
                  <button
                    onClick={() => handleDispatchRep(rep.items)}
                    className="h-8 px-3 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 transition-all hover:shadow-sm"
                    style={{ background: "#6b1523", color: "white", borderColor: "#6b1523" }}>
                    <Truck className="h-3.5 w-3.5" />
                    {isRTL ? "تسليم" : "Dispatch"}
                  </button>
                )}
              </div>
            </div>

            {/* Items table */}
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: "#fafafa", borderBottom: "1px solid var(--ink-100)" }}>
                  <th className="px-3 py-2 text-start font-semibold" style={{ color: "var(--ink-500)" }}>
                    {isRTL ? "الصنف" : "Item"}
                  </th>
                  <th className="px-3 py-2 text-end font-semibold" style={{ color: "var(--ink-500)" }}>
                    {isRTL ? "المطلوب" : "Requested"}
                  </th>
                  <th className="px-3 py-2 text-end font-semibold" style={{ color: "var(--ink-500)" }}>
                    {isRTL ? "المخصص" : "Allocated"}
                  </th>
                  <th className="px-3 py-2 text-center font-semibold" style={{ color: "var(--ink-500)" }}>
                    {isRTL ? "الحالة" : "Status"}
                  </th>
                  <th className="px-3 py-2 text-center font-semibold no-print" style={{ color: "var(--ink-500)" }}>
                    {isRTL ? "توقيع الاستلام" : "Signature"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--ink-50)]">
                {rep.items.map((item: any) => (
                  <tr key={item.distributionId}
                    className="hover:bg-[color:var(--ink-50)]/50 transition-colors">
                    <td className="px-3 py-2.5">
                      <div>
                        <span className="font-mono text-[10px] px-1 py-0.5 rounded me-1.5"
                          style={{ background: "var(--ink-100)", color: "var(--ink-600)" }}>
                          {item.itemCode}
                        </span>
                        <span className="font-semibold" style={{ color: "var(--ink-900)" }}>
                          {isRTL ? item.itemNameAr : item.itemNameEn}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-end tabular-nums" style={{ color: "var(--ink-500)" }}>
                      {item.requestedQty}
                      {item.uomNameAr && (
                        <span className="ms-1 text-[10px]" style={{ color: "var(--ink-400)" }}>
                          {isRTL ? item.uomNameAr : item.uomNameEn}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-end">
                      <span className="font-black tabular-nums text-[15px]" style={{ color: "#6b1523" }}>
                        {item.allocatedQty}
                      </span>
                      {item.uomNameAr && (
                        <span className="ms-1 text-[10px]" style={{ color: "var(--ink-400)" }}>
                          {isRTL ? item.uomNameAr : item.uomNameEn}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <DistBadge status={item.status} isRTL={isRTL} />
                    </td>
                    {/* Signature box for print */}
                    <td className="px-3 py-2.5 text-center no-print">
                      <div className="w-20 h-6 border rounded mx-auto"
                        style={{ borderColor: "var(--ink-200)", borderStyle: "dashed" }} />
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Row total */}
              <tfoot>
                <tr style={{ background: "#fdf2f4", borderTop: "1px solid #6b152215" }}>
                  <td className="px-3 py-2 font-black text-[11px]" style={{ color: "#6b1523" }}>
                    {isRTL ? "الإجمالي" : "Total"}
                  </td>
                  <td className="px-3 py-2 text-end font-bold tabular-nums" style={{ color: "var(--ink-600)" }}>
                    {rep.totalRequested}
                  </td>
                  <td className="px-3 py-2 text-end font-black tabular-nums" style={{ color: "#6b1523" }}>
                    {rep.totalAllocated}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

// ─── Modal shell ──────────────────────────────────────────────────────────────
function ModalShell({ children, onClose, isRTL, title, subtitle, actions }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        style={{ border: "1px solid var(--ink-100)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--ink-100)", background: "linear-gradient(90deg,#fdf2f4,#fff)" }}>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center"
              style={{ background: "#6b152215" }}>
              <Truck className="h-5 w-5" style={{ color: "#6b1523" }} />
            </div>
            <div>
              <h2 className="font-black text-[15px]" style={{ color: "#6b1523" }}>{title}</h2>
              {subtitle && <p className="text-[11px] font-mono mt-0.5" style={{ color: "var(--ink-400)" }}>{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <button onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: "var(--ink-400)" }}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function PlansHistoryPage() {
  const { t, isRTL } = useI18n();
  const selectedBranch = useAppStore((s) => s.selectedBranch);

  const companies = useQuery(api.seed.getCompanies, {});
  const company   = companies?.[0];
  const branches  = useQuery(api.branches.getAll, company ? { companyId: company._id } : "skip");
  const branchId  = useMemo(() => {
    if (selectedBranch !== "all") return selectedBranch;
    return branches?.[0]?._id;
  }, [selectedBranch, branches]);

  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate]     = useState(todayISO());
  const [openPlanId, setOpenPlanId]   = useState<string | null>(null);
  const [distPlanId, setDistPlanId]   = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const plans = useQuery(api.productionRequests.listPlans,
    branchId ? { branchId: branchId as any, fromDate, toDate } : "skip");
  const planDetails = useQuery(api.productionRequests.getPlanById,
    openPlanId ? { planId: openPlanId as any } : "skip");

  if (!branchId || plans === undefined) return <LoadingState />;

  const approved  = plans.filter((p: any) => p.status === "approved").length;
  const converted = plans.filter((p: any) => p.status === "converted").length;
  const totalApprovedQty   = plans.reduce((s: number, p: any) => s + (p.totalApprovedQty ?? 0), 0);
  const totalRequestedQty  = plans.reduce((s: number, p: any) => s + (p.totalRequestedQty ?? 0), 0);
  const filtered = statusFilter === "all" ? plans : plans.filter((p: any) => p.status === statusFilter);

  const kpis = [
    { label: isRTL ? "إجمالي الخطط"          : "Total Plans",         value: plans.length,              color: "#6b1523", bg: "#fdf2f4",  Icon: BookOpen     },
    { label: isRTL ? "معتمدة"                 : "Approved",            value: approved,                   color: "#1d4ed8", bg: "#eff6ff",  Icon: CheckCircle2 },
    { label: isRTL ? "محولة لأوامر"           : "Converted",           value: converted,                  color: "#15803d", bg: "#f0fdf4",  Icon: FileCheck    },
    { label: isRTL ? "إجمالي الكمية المعتمدة" : "Total Approved Qty",  value: totalApprovedQty.toLocaleString(), color: "#7c3aed", bg: "#f5f3ff", Icon: TrendingUp   },
  ];

  return (
    <div className="space-y-5 p-5" dir={isRTL ? "rtl" : "ltr"}>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: "#fdf2f4" }}>
          <BookOpen className="h-6 w-6" style={{ color: "#6b1523" }} />
        </div>
        <div>
          <h1 className="text-xl font-black" style={{ color: "#6b1523" }}>
            {isRTL ? "سجل خطط الإنتاج" : "Production Plans History"}
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--ink-400)" }}>
            {isRTL ? "كل الخطط المعتمدة — مع قوائم التوزيع لكل مندوب" : "All approved plans — with distribution lists per rep"}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-xl p-4 border flex items-center gap-3"
            style={{ borderColor: "var(--ink-100)" }}>
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: k.bg }}>
              <k.Icon className="h-5 w-5" style={{ color: k.color }} />
            </div>
            <div>
              <p className="text-[11px] font-medium" style={{ color: "var(--ink-400)" }}>{k.label}</p>
              <p className="text-2xl font-black tabular-nums leading-tight" style={{ color: k.color }}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl p-4 flex items-center gap-4 flex-wrap bg-white"
        style={{ border: "1px solid var(--ink-150)" }}>
        <CalendarDays className="h-4 w-4 shrink-0" style={{ color: "#6b1523" }} />
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: "var(--ink-500)" }}>{isRTL ? "من" : "From:"}</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input-field h-9 w-auto" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: "var(--ink-500)" }}>{isRTL ? "إلى" : "To:"}</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input-field h-9 w-auto" />
        </div>
        <div className="flex items-center gap-1.5 ms-auto flex-wrap">
          {[
            { key: "all",       arLabel: "الكل",  enLabel: "All"       },
            { key: "approved",  arLabel: "معتمدة", enLabel: "Approved"  },
            { key: "converted", arLabel: "محولة",  enLabel: "Converted" },
            { key: "draft",     arLabel: "مسودة",  enLabel: "Draft"     },
          ].map((f) => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              className="px-3 py-1 rounded-full text-[11px] font-semibold border transition-all"
              style={statusFilter === f.key
                ? { background: "#6b1523", color: "white", borderColor: "#6b1523" }
                : { background: "white",   color: "var(--ink-500)", borderColor: "var(--ink-200)" }}>
              {isRTL ? f.arLabel : f.enLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl py-20 flex flex-col items-center justify-center text-center bg-white"
          style={{ border: "1px solid var(--ink-150)" }}>
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "#fdf2f4" }}>
            <BookOpen className="h-8 w-8" style={{ color: "#6b152260" }} />
          </div>
          <p className="text-[15px] font-bold" style={{ color: "var(--ink-600)" }}>
            {isRTL ? "لا توجد خطط في هذه الفترة" : "No plans in this period"}
          </p>
          <p className="text-[12px] mt-1" style={{ color: "var(--ink-400)" }}>
            {isRTL ? "اعتمد خطة من صفحة الخطة اليومية لتظهر هنا" : "Approve a plan from the Daily Plan page to see it here"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--ink-150)", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: "#6b1523", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                  <th className="w-10 px-3 py-3"></th>
                  {[
                    isRTL ? "رقم الخطة"      : "Plan No.",
                    isRTL ? "تاريخ الإنتاج"  : "Production Date",
                    isRTL ? "الحالة"          : "Status",
                    isRTL ? "عدد الطلبات"    : "Requests",
                    isRTL ? "إجمالي المطلوب" : "Total Requested",
                    isRTL ? "إجمالي المعتمد" : "Total Approved",
                    isRTL ? "التوزيع"         : "Distribution",
                    isRTL ? "ملاحظات"         : "Notes",
                  ].map((h) => (
                    <th key={h}
                      className="px-4 py-3 text-[10px] font-bold text-white/80 uppercase tracking-widest text-start whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--ink-100)]">
                {filtered.map((plan: any) => {
                  const isOpen = openPlanId === plan._id;

                  return (
                    <React.Fragment key={plan._id}>
                      <tr
                        className="hover:bg-[#fdf2f4]/40 transition-colors"
                        style={{ background: isOpen ? "#fdf2f4" : undefined }}>

                        {/* Expand */}
                        <td className="px-3 py-3 cursor-pointer" onClick={() => setOpenPlanId(isOpen ? null : plan._id)}>
                          <span className="h-7 w-7 rounded-lg flex items-center justify-center"
                            style={{ background: isOpen ? "#6b152220" : "var(--ink-100)", color: isOpen ? "#6b1523" : "var(--ink-500)" }}>
                            {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </span>
                        </td>

                        {/* Plan # */}
                        <td className="px-4 py-3 cursor-pointer" onClick={() => setOpenPlanId(isOpen ? null : plan._id)}>
                          <span className="font-mono text-[11px] px-2 py-0.5 rounded font-bold"
                            style={{ background: "#6b1523", color: "white" }}>
                            {plan.planNumber}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3 text-[12px] tabular-nums cursor-pointer"
                          style={{ color: "var(--ink-500)" }}
                          onClick={() => setOpenPlanId(isOpen ? null : plan._id)}>
                          {plan.productionDate}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 cursor-pointer" onClick={() => setOpenPlanId(isOpen ? null : plan._id)}>
                          <StatusBadge status={plan.status} isRTL={isRTL} />
                        </td>

                        {/* Request count */}
                        <td className="px-4 py-3 text-end cursor-pointer" onClick={() => setOpenPlanId(isOpen ? null : plan._id)}>
                          <span className="inline-flex items-center gap-1 text-sm font-bold tabular-nums" style={{ color: "#6b1523" }}>
                            <Hash className="h-3 w-3" />{plan.requestCount ?? 0}
                          </span>
                        </td>

                        {/* Requested qty */}
                        <td className="px-4 py-3 text-end tabular-nums text-[13px] font-semibold cursor-pointer"
                          style={{ color: "var(--ink-600)" }}
                          onClick={() => setOpenPlanId(isOpen ? null : plan._id)}>
                          {(plan.totalRequestedQty ?? 0).toLocaleString()}
                        </td>

                        {/* Approved qty */}
                        <td className="px-4 py-3 text-end cursor-pointer" onClick={() => setOpenPlanId(isOpen ? null : plan._id)}>
                          <span className="tabular-nums text-[15px] font-black" style={{ color: "#15803d" }}>
                            {(plan.totalApprovedQty ?? 0).toLocaleString()}
                          </span>
                        </td>

                        {/* Distribution button */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setDistPlanId(plan._id)}
                            className="h-8 px-3 rounded-lg text-[11px] font-bold border inline-flex items-center gap-1.5 transition-all hover:shadow-sm"
                            style={{ background: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe" }}>
                            <Users className="h-3.5 w-3.5" />
                            {isRTL ? "التوزيع" : "Distribute"}
                          </button>
                        </td>

                        {/* Notes */}
                        <td className="px-4 py-3 text-[11px] max-w-[160px] truncate"
                          style={{ color: "var(--ink-400)" }}>
                          {plan.notes || "—"}
                        </td>
                      </tr>

                      {/* Drill-down: plan lines */}
                      {isOpen && (
                        <tr>
                          <td colSpan={9} className="p-0">
                            <div className="px-6 py-4"
                              style={{ background: "#fdf8f9", borderTop: "1px solid #6b152215", borderBottom: "1px solid #6b152215" }}>
                              <p className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2"
                                style={{ color: "#6b1523" }}>
                                <Layers className="h-3.5 w-3.5" />
                                {isRTL ? "تفاصيل أصناف الخطة" : "Plan Line Details"}
                              </p>
                              {!planDetails ? (
                                <div className="py-4 text-center text-xs animate-pulse" style={{ color: "var(--ink-400)" }}>
                                  {isRTL ? "جاري التحميل..." : "Loading..."}
                                </div>
                              ) : (planDetails.lines ?? []).length === 0 ? (
                                <p className="text-xs text-center py-4" style={{ color: "var(--ink-400)" }}>
                                  {isRTL ? "لا توجد تفاصيل" : "No line details"}
                                </p>
                              ) : (
                                <div className="rounded-xl overflow-hidden bg-white" style={{ border: "1px solid #6b152220" }}>
                                  <table className="w-full text-[12px]">
                                    <thead style={{ background: "#6b152215" }}>
                                      <tr>
                                        {[
                                          isRTL ? "كود" : "Code",
                                          isRTL ? "الصنف" : "Item",
                                          isRTL ? "المطلوب" : "Requested",
                                          isRTL ? "المعتمد" : "Approved",
                                          isRTL ? "الفرق" : "Diff",
                                          isRTL ? "أمر إنتاج" : "P. Order",
                                        ].map((h) => (
                                          <th key={h} className="px-3 py-2.5 text-start font-bold" style={{ color: "#6b1523" }}>{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#6b152210]">
                                      {(planDetails.lines ?? []).map((l: any, i: number) => {
                                        const diff = l.approvedQty - l.totalRequestedQty;
                                        const diffColor = diff > 0 ? "#15803d" : diff < 0 ? "#dc2626" : "var(--ink-400)";
                                        return (
                                          <tr key={i} className="hover:bg-[#fdf2f4]/30 transition-colors">
                                            <td className="px-3 py-2 font-mono text-[10px]" style={{ color: "var(--ink-500)" }}>{l.itemCode}</td>
                                            <td className="px-3 py-2 font-semibold" style={{ color: "var(--ink-900)" }}>
                                              {isRTL ? l.itemNameAr : (l.itemNameEn || l.itemNameAr)}
                                            </td>
                                            <td className="px-3 py-2 text-end tabular-nums" style={{ color: "var(--ink-500)" }}>{l.totalRequestedQty}</td>
                                            <td className="px-3 py-2 text-end">
                                              <span className="tabular-nums font-black text-[14px]" style={{ color: "#15803d" }}>{l.approvedQty}</span>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                              <span className="font-bold tabular-nums text-[11px]" style={{ color: diffColor }}>
                                                {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : "—"}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                              {l.productionOrderId ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold"
                                                  style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>
                                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                                  {isRTL ? "متولد" : "Created"}
                                                </span>
                                              ) : (
                                                <span className="text-[10px] opacity-30">—</span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                    <tfoot style={{ background: "#fdf2f4" }}>
                                      <tr>
                                        <td colSpan={2} className="px-3 py-2 font-black text-[11px]" style={{ color: "#6b1523" }}>
                                          {isRTL ? "الإجمالي" : "Total"}
                                        </td>
                                        <td className="px-3 py-2 text-end font-bold tabular-nums" style={{ color: "var(--ink-600)" }}>
                                          {planDetails.lines.reduce((s: number, l: any) => s + l.totalRequestedQty, 0)}
                                        </td>
                                        <td className="px-3 py-2 text-end font-black tabular-nums text-[14px]" style={{ color: "#15803d" }}>
                                          {planDetails.lines.reduce((s: number, l: any) => s + l.approvedQty, 0)}
                                        </td>
                                        <td colSpan={2}></td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "#6b152210", borderTop: "2px solid #6b152225" }}>
                  <td colSpan={4}></td>
                  <td className="px-4 py-3 text-end font-black text-sm" style={{ color: "#6b1523" }}>
                    {filtered.length} {isRTL ? "خطة" : "plans"}
                  </td>
                  <td className="px-4 py-3 text-end font-bold tabular-nums" style={{ color: "var(--ink-600)" }}>
                    {totalRequestedQty.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-end font-black tabular-nums text-[15px]" style={{ color: "#15803d" }}>
                    {totalApprovedQty.toLocaleString()}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Distribution Modal */}
      {distPlanId && (
        <DistributionModal
          planId={distPlanId}
          isRTL={isRTL}
          onClose={() => setDistPlanId(null)}
        />
      )}
    </div>
  );
}
