// @ts-nocheck
"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Users, Truck, Package, FileText, Landmark, TrendingUp, TrendingDown,
  CalendarDays, ArrowUpRight, AlertCircle, Banknote, CreditCard,
  ShoppingCart, Warehouse, ArrowLeftRight, AlertTriangle, BarChart3,
  ChevronRight, Info, Archive, Zap, Circle,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/useAppStore";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayISO() { return new Date().toISOString().split("T")[0]; }

function shortDate(iso: string, lang = "en") {
  return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
    day: "2-digit", month: "short",
  });
}

function calcDelta(today: number, base: number) {
  if (base === 0) return today > 0 ? null : 0;
  return ((today - base) / base) * 100;
}

function timeAgo(timestamp: number, isRTL: boolean) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return isRTL ? `منذ ${mins} د` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return isRTL ? `منذ ${hrs} س` : `${hrs}h ago`;
  return isRTL ? `منذ ${Math.floor(hrs / 24)} ي` : `${Math.floor(hrs / 24)}d ago`;
}

// ─── Activity config ──────────────────────────────────────────────────────────
type ActivityType = "sales_invoice"|"cash_receipt"|"cash_payment"|"grn"|"bank_transfer"|"stock_adjustment";

const ACT: Record<ActivityType, { color: string; icon: any; labelAr: string; labelEn: string }> = {
  sales_invoice:   { color: "#6366f1", icon: ShoppingCart, labelAr: "فاتورة مبيعات", labelEn: "Sales Invoice"   },
  cash_receipt:    { color: "#10b981", icon: Banknote,     labelAr: "قبض نقدي",      labelEn: "Cash Receipt"    },
  cash_payment:    { color: "#f43f5e", icon: CreditCard,   labelAr: "دفع نقدي",      labelEn: "Cash Payment"    },
  grn:             { color: "#8b5cf6", icon: Warehouse,    labelAr: "استلام بضاعة",  labelEn: "GRN"             },
  bank_transfer:   { color: "#f59e0b", icon: ArrowLeftRight,labelAr: "تحويل بنكي",  labelEn: "Bank Transfer"   },
  stock_adjustment:{ color: "#64748b", icon: Package,      labelAr: "تسوية مخزون",  labelEn: "Stock Adj."      },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Large financial KPI — AR, AP, Cash, Net Flow */
function FinKpi({ label, value, accent, icon: Icon, loading, fmt, delta, hint }: {
  label: string; value: number|undefined; accent: string; icon: any;
  loading: boolean; fmt: (n:number)=>string; delta?: number|null; hint?: string;
}) {
  return (
    <div className="relative bg-white rounded-2xl overflow-hidden flex flex-col"
      style={{ border: "1px solid var(--ink-100)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      {/* Accent top stripe */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}80)` }} />
      <div className="flex flex-col flex-1 p-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ background: `${accent}12` }}>
            <Icon className="h-5 w-5" style={{ color: accent }} />
          </div>
          {delta !== undefined && delta !== null && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: delta >= 0 ? "#d1fae5" : "#fee2e2",
                color: delta >= 0 ? "#059669" : "#dc2626",
              }}>
              {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
        </div>
        {/* Value */}
        <div className="text-[11px] font-semibold uppercase tracking-wider mb-1.5"
          style={{ color: "var(--ink-400)" }}>
          {label}
        </div>
        <div className="text-[28px] font-bold tabular-nums leading-none"
          style={{ color: "var(--ink-900)" }}>
          {loading || value === undefined ? (
            <div className="h-8 w-36 rounded-lg bg-[var(--ink-100)] animate-pulse" />
          ) : fmt(value)}
        </div>
        <div className="mt-2 text-[11px]" style={{ color: "var(--ink-400)" }}>
          {hint ?? (loading ? "…" : "—")}
        </div>
      </div>
    </div>
  );
}

/** Compact today KPI */
function TodayKpi({ label, value, icon: Icon, accent, loading, fmt, count, delta }: {
  label: string; value: number|undefined; icon: any; accent: string;
  loading: boolean; fmt: (n:number)=>string; count?: boolean; delta?: number|null;
}) {
  const disp = loading || value === undefined ? null : count ? value.toLocaleString("en-US") : fmt(value);

  return (
    <div className="bg-white rounded-2xl p-4 flex items-center gap-4"
      style={{ border: "1px solid var(--ink-100)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${accent}12` }}>
        <Icon className="h-5 w-5" style={{ color: accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10.5px] font-semibold uppercase tracking-wider truncate mb-0.5"
          style={{ color: "var(--ink-400)" }}>
          {label}
        </div>
        {loading || !disp ? (
          <div className="h-6 w-24 rounded-md bg-[var(--ink-100)] animate-pulse" />
        ) : (
          <div className="text-[18px] font-bold tabular-nums leading-none" style={{ color: "var(--ink-900)" }}>
            {disp}
          </div>
        )}
        {!loading && !count && delta !== undefined && delta !== null && (
          <div className="mt-0.5 text-[10px] font-bold"
            style={{ color: delta >= 0 ? "#059669" : "#dc2626" }}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}

/** Activity timeline item */
function ActivityRow({ item, isRTL }: { item: any; isRTL: boolean }) {
  const meta = ACT[item.type as ActivityType] ?? ACT.sales_invoice;
  const Icon = meta.icon;
  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " QAR";

  return (
    <div className="flex items-start gap-3 py-3 group">
      {/* Timeline dot */}
      <div className="flex flex-col items-center shrink-0 pt-0.5">
        <div className="h-7 w-7 rounded-lg flex items-center justify-center"
          style={{ background: `${meta.color}12`, border: `1px solid ${meta.color}30` }}>
          <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[12.5px] font-bold" style={{ color: "var(--ink-900)" }}>
              {item.documentNumber}
            </span>
            <span className="mx-1.5 text-[var(--ink-300)]">·</span>
            <span className="text-[11.5px]" style={{ color: "var(--ink-500)" }}>
              {isRTL ? meta.labelAr : meta.labelEn}
            </span>
          </div>
          <span className="text-[11px] font-bold tabular-nums shrink-0" style={{ color: meta.color }}>
            {fmt(item.amount)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] truncate" style={{ color: "var(--ink-500)" }}>
            {item.description}
          </span>
          <span className="text-[10px] shrink-0" style={{ color: "var(--ink-400)" }}>
            {timeAgo(item.timestamp, isRTL)}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Quick action button */
function QuickBtn({ href, icon: Icon, labelAr, labelEn, color, isRTL }: any) {
  return (
    <Link href={href}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 hover:shadow-sm"
      style={{ border: "1px solid var(--ink-100)" }}
      onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = `${color}50`}
      onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = "var(--ink-100)"}
    >
      <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-all"
        style={{ background: `${color}10` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <span className="text-[12.5px] font-semibold flex-1" style={{ color: "var(--ink-700)" }}>
        {isRTL ? labelAr : labelEn}
      </span>
      <ChevronRight className="h-3.5 w-3.5 opacity-30 group-hover:opacity-60 transition-opacity"
        style={{ color: "var(--ink-700)" }} />
    </Link>
  );
}

/** Top item row */
function TopItemRow({ item, rank, maxRev, fmt, isRTL }: any) {
  const pct = maxRev > 0 ? (item.totalRevenue / maxRev) * 100 : 0;
  const rankColor = rank === 1 ? "#f59e0b" : rank === 2 ? "#94a3b8" : rank === 3 ? "#b45309" : "#cbd5e1";
  const barColor  = rank === 1 ? "#f59e0b" : rank <= 3 ? "#6366f1" : "#cbd5e1";

  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor: "var(--ink-100)" }}>
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
        style={{ background: `${rankColor}20`, color: rankColor }}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-semibold truncate" style={{ color: "var(--ink-900)" }}>
          {isRTL ? item.nameAr : item.nameEn}
        </div>
        <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--ink-100)" }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor, transition: "width 0.8s ease" }} />
        </div>
      </div>
      <div className="text-end shrink-0">
        <div className="text-[12px] font-bold tabular-nums" style={{ color: "var(--ink-900)" }}>
          {fmt(item.totalRevenue)}
        </div>
        <div className="text-[10.5px]" style={{ color: "var(--ink-400)" }}>
          ×{item.totalQty.toFixed(0)}
        </div>
      </div>
    </div>
  );
}

/** Section header */
function SectionHeader({ title, subtitle, icon: Icon, accent, action }: any) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${accent}15` }}>
          <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
        </div>
        <div>
          <h3 className="text-[14px] font-bold" style={{ color: "var(--ink-900)" }}>{title}</h3>
          {subtitle && <p className="text-[10.5px]" style={{ color: "var(--ink-400)" }}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/** Section card wrapper */
function Card({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`bg-white rounded-2xl overflow-hidden ${className}`}
      style={{ border: "1px solid var(--ink-100)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", ...style }}>
      {children}
    </div>
  );
}

// ─── Custom chart tooltip ─────────────────────────────────────────────────────
function ChartTip({ active, payload, label, fmt }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2.5 shadow-xl text-[12px]"
      style={{ background: "white", border: "1px solid var(--ink-200)" }}>
      <p className="font-bold mb-1.5" style={{ color: "var(--ink-700)" }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-1.5 mb-0.5">
          <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: "var(--ink-500)" }}>{p.name}:</span>
          <span className="font-bold" style={{ color: "var(--ink-900)" }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { t, formatCurrency, formatDate, lang } = useI18n();
  const isRTL = lang === "ar";
  const selectedBranch = useAppStore((s) => s.selectedBranch);

  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const today    = todayISO();
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const stats    = useQuery(api.dashboard.getDashboardStats,
    companyId ? { companyId, date: today, branchId: branchArg } : "skip");
  const extended = useQuery(api.dashboard.getDashboardExtended,
    companyId ? { companyId, today } : "skip");
  const activity = useQuery(api.dashboard.getRecentActivity,
    companyId ? { companyId, limit: 8 } : "skip");
  const firstOfMonth = today.slice(0, 7) + "-01";
  const topItems = useQuery(api.dashboard.getTopSellingItems,
    companyId ? { companyId, fromDate: firstOfMonth, toDate: today, limit: 6 } : "skip") ?? [];

  const isLoading  = !!companyId && stats    === undefined;
  const extLoading = !!companyId && extended === undefined;

  const fmt = (n: number) => formatCurrency(n);

  // Chart data
  const chartData = useMemo(() =>
    (extended?.sevenDayTrend ?? []).map((d) => ({
      date:     shortDate(d.date, lang),
      [isRTL ? "مبيعات" : "Sales"]:    Math.round(d.sales),
      [isRTL ? "تحصيل" : "Receipts"]:  Math.round(d.receipts),
    })),
  [extended, lang, isRTL]);

  // Cash flow bar data
  const cashData = useMemo(() => {
    const inflow  = (extended?.sevenDayTrend ?? []).reduce((s,d) => s + d.receipts, 0);
    const outflow = (extended?.sevenDayTrend ?? []).reduce((s,d) => s + d.payments, 0);
    const sched   = extended?.pendingPurchasesAmount ?? 0;
    return [
      { name: isRTL ? "داخل" : "Inflow",   value: inflow,  color: "#10b981" },
      { name: isRTL ? "خارج" : "Outflow",  value: outflow, color: "#f43f5e" },
      { name: isRTL ? "مجدولة" : "Sched.", value: sched,   color: "#f59e0b" },
    ];
  }, [extended, isRTL]);

  // Alerts
  const alerts = useMemo(() => {
    const out: { key: string; text: string; amount?: number; color: string; icon: any; href: string }[] = [];
    if ((extended?.overdueCount ?? 0) > 0)
      out.push({ key: "overdue", text: isRTL ? `${extended!.overdueCount} فاتورة متأخرة` : `${extended!.overdueCount} overdue invoices`,
        amount: extended!.overdueAmount, color: "#dc2626", icon: AlertTriangle, href: "/sales/invoices" });
    if ((extended?.lowStockCount ?? 0) > 0)
      out.push({ key: "stock", text: isRTL ? `${extended!.lowStockCount} صنف منخفض المخزون` : `${extended!.lowStockCount} low stock items`,
        color: "#d97706", icon: AlertCircle, href: "/inventory/low-stock" });
    return out;
  }, [extended, isRTL]);

  const netFlow    = (stats?.todayReceipts ?? 0) - (stats?.todayPayments ?? 0);
  const maxTopRev  = topItems[0]?.totalRevenue ?? 1;

  // Quick actions
  const quickActions = [
    { href: "/sales/invoices?new=true",       icon: ShoppingCart, labelAr: "فاتورة مبيعات جديدة", labelEn: "New Sales Invoice", color: "#6366f1" },
    { href: "/treasury/receipts?new=true",    icon: Banknote,     labelAr: "إيصال قبض جديد",      labelEn: "New Cash Receipt",   color: "#10b981" },
    { href: "/treasury/payments?new=true",    icon: CreditCard,   labelAr: "سند صرف جديد",        labelEn: "New Payment",        color: "#f43f5e" },
    { href: "/purchases/grn?new=true",        icon: Warehouse,    labelAr: "استلام بضاعة جديد",   labelEn: "New GRN",            color: "#8b5cf6" },
    { href: "/finance/journal-entries?new=true", icon: FileText,  labelAr: "قيد يومية",           labelEn: "Journal Entry",      color: "#f59e0b" },
    { href: "/sales/customers?new=true",      icon: Users,        labelAr: "عميل جديد",           labelEn: "New Customer",       color: "#06b6d4" },
  ];

  // Greeting
  const hour = new Date().getHours();
  const greeting = isRTL
    ? (hour < 12 ? "صباح الخير" : hour < 17 ? "مساء الخير" : "مساء الخير")
    : (hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening");

  return (
    <div className="space-y-5 max-w-[1440px] mx-auto" dir={isRTL ? "rtl" : "ltr"}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest mb-1"
            style={{ color: "var(--ink-400)" }}>
            {isRTL ? "لوحة التحكم" : "Dashboard"}
          </div>
          <h1 className="text-[26px] font-bold leading-tight" style={{ color: "var(--ink-900)" }}>
            {greeting} 👋
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--ink-500)" }}>
            {isRTL
              ? "هذا ملخص نشاطك المالي اليوم"
              : "Here's your financial activity overview for today"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date chip */}
          <div className="flex items-center gap-2 text-[12.5px] font-semibold px-3.5 py-2 rounded-xl bg-white"
            style={{ border: "1px solid var(--ink-200)", color: "var(--ink-700)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <CalendarDays className="h-3.5 w-3.5" style={{ color: "var(--ink-400)" }} />
            {formatDate(new Date())}
          </div>
        </div>
      </div>

      {/* ── Alert strip ──────────────────────────────────────────────────────── */}
      {!extLoading && alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alerts.map((a) => (
            <Link key={a.key} href={a.href}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all hover:shadow-md"
              style={{
                background: `${a.color}08`,
                border: `1px solid ${a.color}30`,
                color: a.color,
              }}>
              <a.icon className="h-3.5 w-3.5 shrink-0" />
              {a.text}
              {a.amount !== undefined && a.amount > 0 && (
                <span className="font-bold">— {fmt(a.amount)}</span>
              )}
              <ArrowUpRight className="h-3 w-3 opacity-60" />
            </Link>
          ))}
        </div>
      )}

      {/* ── Row 1: Financial KPIs ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <FinKpi label={isRTL ? "مستحقات العملاء" : "AR Outstanding"}
          value={extended?.arOutstanding} accent="#10b981" icon={TrendingUp}
          loading={extLoading} fmt={fmt}
          hint={isRTL ? "إجمالي الفواتير غير المسددة" : "Total unpaid invoices"} />
        <FinKpi label={isRTL ? "مستحقات الموردين" : "AP Outstanding"}
          value={extended?.apOutstanding} accent="#8b5cf6" icon={TrendingDown}
          loading={extLoading} fmt={fmt}
          hint={isRTL ? "مشتريات غير مسددة" : "Unpaid purchases"} />
        <FinKpi label={isRTL ? "الرصيد النقدي" : "Cash Balance"}
          value={stats?.cashOnHand} accent="#3b82f6" icon={Landmark}
          loading={isLoading} fmt={fmt}
          hint={isRTL ? "نقداً وبنوك" : "Cash & banks combined"} />
        <FinKpi label={isRTL ? "صافي التدفق النقدي" : "Net Cash Flow"}
          value={netFlow} accent={netFlow >= 0 ? "#f59e0b" : "#f43f5e"} icon={BarChart3}
          loading={isLoading} fmt={fmt}
          hint={isRTL ? "قبض – صرف اليوم" : "Today: receipts – payments"} />
      </div>

      {/* ── Row 2: Today KPIs ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <TodayKpi label={isRTL ? "مبيعات اليوم" : "Today's Sales"}
          value={stats?.todaySales} icon={TrendingUp} accent="#6366f1"
          loading={isLoading} fmt={fmt}
          delta={extLoading ? undefined : calcDelta(stats?.todaySales ?? 0, extended?.yesterdaySales ?? 0)} />
        <TodayKpi label={isRTL ? "تحصيلات اليوم" : "Today's Receipts"}
          value={stats?.todayReceipts} icon={Banknote} accent="#10b981"
          loading={isLoading} fmt={fmt}
          delta={extLoading ? undefined : calcDelta(stats?.todayReceipts ?? 0, extended?.yesterdayReceipts ?? 0)} />
        <TodayKpi label={isRTL ? "مدفوعات اليوم" : "Today's Payments"}
          value={stats?.todayPayments} icon={CreditCard} accent="#f43f5e"
          loading={isLoading} fmt={fmt}
          delta={extLoading ? undefined : calcDelta(stats?.todayPayments ?? 0, extended?.yesterdayPayments ?? 0)} />
        <TodayKpi label={isRTL ? "إجمالي العملاء" : "Total Customers"}
          value={stats?.customerCount} icon={Users} accent="#f59e0b"
          loading={isLoading} fmt={fmt} count />
      </div>

      {/* ── Row 3: Charts ────────────────────────────────────────────────────── */}
      {!extLoading && chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Area chart — 3/5 */}
          <Card className="lg:col-span-3 p-5 flex flex-col">
            <SectionHeader
              title={isRTL ? "تحليل المبيعات والتحصيل (7 أيام)" : "Sales & Receipts Trend (7 days)"}
              icon={TrendingUp} accent="#6366f1"
              action={
                <Link href="/reports/sales-report"
                  className="text-[11.5px] font-semibold px-2.5 py-1 rounded-lg transition-colors hover:bg-[var(--ink-50)]"
                  style={{ color: "var(--brand-600)" }}>
                  {isRTL ? "تقرير ← " : "→ Report"}
                </Link>
              }
            />
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gReceipts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--ink-100)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10.5, fill: "var(--ink-400)" }} tickLine={false} axisLine={false} dy={6} />
                  <YAxis tick={{ fontSize: 10.5, fill: "var(--ink-400)" }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} />
                  <Tooltip content={<ChartTip fmt={fmt} />} />
                  <Area type="monotone" dataKey={isRTL ? "مبيعات" : "Sales"}
                    stroke="#6366f1" strokeWidth={2.5} fill="url(#gSales)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey={isRTL ? "تحصيل" : "Receipts"}
                    stroke="#10b981" strokeWidth={2.5} fill="url(#gReceipts)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-5 mt-3 justify-center">
              {[{ color: "#6366f1", label: isRTL ? "مبيعات" : "Sales" }, { color: "#10b981", label: isRTL ? "تحصيل" : "Receipts" }].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5 text-[11.5px]" style={{ color: "var(--ink-500)" }}>
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
          </Card>

          {/* Cash flow bars — 2/5 */}
          <Card className="lg:col-span-2 p-5 flex flex-col">
            <SectionHeader
              title={isRTL ? "التدفق النقدي (7 أيام)" : "Cash Flow (7 days)"}
              icon={BarChart3} accent="#f59e0b"
            />
            <div className="flex-1" style={{ minHeight: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashData} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={55}
                    tick={{ fontSize: 11, fill: "var(--ink-500)" }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid var(--ink-200)" }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
                    {cashData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Summary */}
            <div className="mt-4 rounded-xl p-3 flex items-start gap-2"
              style={{ background: "var(--ink-50)", border: "1px solid var(--ink-100)" }}>
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "var(--ink-400)" }} />
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--ink-500)" }}>
                {isRTL
                  ? "يعكس هذا الرسم حركات النقد الفعلية خلال آخر 7 أيام."
                  : "Reflects actual cash movements over the last 7 days."}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* ── Row 4: Quick Actions + Recent Activity ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Quick Actions */}
        <Card className="p-5 flex flex-col">
          <SectionHeader
            title={isRTL ? "إجراءات سريعة" : "Quick Actions"}
            icon={Zap} accent="#f59e0b"
          />
          <div className="space-y-1.5 flex-1">
            {quickActions.map((a) => <QuickBtn key={a.href} {...a} isRTL={isRTL} />)}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-4"
            style={{ borderBottom: "1px solid var(--ink-100)" }}>
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: "#6366f115" }}>
                <Circle className="h-3.5 w-3.5" style={{ color: "#6366f1" }} />
              </div>
              <h3 className="text-[14px] font-bold" style={{ color: "var(--ink-900)" }}>
                {isRTL ? "النشاط الأخير" : "Recent Activity"}
              </h3>
            </div>
            <Link href="/finance/journal-entries"
              className="text-[11.5px] font-semibold px-2.5 py-1 rounded-lg hover:bg-[var(--ink-50)] transition-colors"
              style={{ color: "var(--brand-600)" }}>
              {isRTL ? "عرض الكل →" : "View All →"}
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto px-5" style={{ maxHeight: 360 }}>
            {isLoading ? (
              <div className="space-y-3 py-4 animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-lg bg-[var(--ink-100)] shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-1/2 rounded bg-[var(--ink-100)]" />
                      <div className="h-2.5 w-1/3 rounded bg-[var(--ink-50)]" />
                    </div>
                    <div className="h-3 w-16 rounded bg-[var(--ink-100)]" />
                  </div>
                ))}
              </div>
            ) : !activity || activity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <Archive className="h-10 w-10 mb-3" style={{ color: "var(--ink-200)" }} />
                <p className="text-[13px] font-semibold" style={{ color: "var(--ink-700)" }}>
                  {isRTL ? "لا توجد أنشطة حديثة" : "No recent activity"}
                </p>
                <p className="text-[11.5px] mt-1 max-w-xs" style={{ color: "var(--ink-400)" }}>
                  {isRTL ? "لم تُسجَّل حركات مالية بعد" : "No financial movements recorded yet"}
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--ink-50)" }}>
                {activity.map((item: any, idx: number) => (
                  <ActivityRow key={`${item.type}-${item.documentNumber}-${idx}`} item={item} isRTL={isRTL} />
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── Row 5: Top Selling Items ──────────────────────────────────────────── */}
      {topItems.length > 0 && (
        <Card className="p-5">
          <SectionHeader
            title={isRTL ? "أكثر الأصناف مبيعاً — هذا الشهر" : "Top Selling Items — This Month"}
            icon={TrendingUp} accent="#f59e0b"
            action={
              <Link href="/reports/item-sales"
                className="text-[11.5px] font-semibold px-2.5 py-1 rounded-lg hover:bg-[var(--ink-50)] transition-colors"
                style={{ color: "var(--brand-600)" }}>
                {isRTL ? "تقرير كامل →" : "Full Report →"}
              </Link>
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
            {topItems.map((item: any, idx: number) => (
              <TopItemRow key={item.itemId} item={item} rank={idx + 1} maxRev={maxTopRev} fmt={fmt} isRTL={isRTL} />
            ))}
          </div>
        </Card>
      )}

    </div>
  );
}
