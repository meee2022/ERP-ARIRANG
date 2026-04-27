// @ts-nocheck
"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Users, Truck, Package, FileText, Landmark, TrendingUp,
  CalendarDays, ArrowUpRight, AlertCircle, Banknote,
  CreditCard, ShoppingCart, Warehouse, ArrowLeftRight,
  AlertTriangle, TrendingDown, CheckCircle2, BarChart3,
  ChevronDown, ChevronRight, Info, Archive
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/useAppStore";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ── helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function shortDate(iso: string, lang: string = "en"): string {
  // "2026-04-22" → "22 Apr" or Arabic equivalent
  const d = new Date(iso);
  return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { day: "2-digit", month: "short" });
}

function calcDelta(today: number, base: number): number | null {
  if (base === 0) return today > 0 ? null : 0;
  return ((today - base) / base) * 100;
}

type ActivityType =
  | "sales_invoice"
  | "cash_receipt"
  | "cash_payment"
  | "grn"
  | "bank_transfer"
  | "stock_adjustment";

interface ActivityItem {
  type: ActivityType;
  documentNumber: string;
  amount: number;
  date: string;
  timestamp: number;
  description: string;
}

const TYPE_META: Record<
  ActivityType,
  { icon: any; color: string; bg: string; labelKey: string; badgeColor: string; badgeBg: string }
> = {
  sales_invoice: {
    icon: ShoppingCart,
    color: "var(--brand-700)",
    bg: "color-mix(in srgb, var(--brand-700) 10%, white)",
    labelKey: "typeSalesInvoice",
    badgeColor: "#ef4444",
    badgeBg: "#fee2e2",
  },
  cash_receipt: {
    icon: Banknote,
    color: "#059669",
    bg: "color-mix(in srgb, #059669 10%, white)",
    labelKey: "typeCashReceipt",
    badgeColor: "#059669",
    badgeBg: "#d1fae5",
  },
  cash_payment: {
    icon: CreditCard,
    color: "#dc2626",
    bg: "color-mix(in srgb, #dc2626 10%, white)",
    labelKey: "typeCashPayment",
    badgeColor: "#d97706",
    badgeBg: "#fef3c7",
  },
  grn: {
    icon: Warehouse,
    color: "#7c3aed",
    bg: "color-mix(in srgb, #7c3aed 10%, white)",
    labelKey: "typeGRN",
    badgeColor: "#7c3aed",
    badgeBg: "#ede9fe",
  },
  bank_transfer: {
    icon: ArrowLeftRight,
    color: "#d97706",
    bg: "color-mix(in srgb, #d97706 10%, white)",
    labelKey: "typeBankTransfer",
    badgeColor: "#2563eb",
    badgeBg: "#dbeafe",
  },
  stock_adjustment: {
    icon: Package,
    color: "#64748b",
    bg: "color-mix(in srgb, #64748b 10%, white)",
    labelKey: "typeStockAdj",
    badgeColor: "#64748b",
    badgeBg: "#f1f5f9",
  },
};

// ── page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t, formatCurrency, formatDate, lang } = useI18n();
  const isRTL = lang === "ar";
  const selectedBranch = useAppStore((s) => s.selectedBranch);

  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const today = todayISO();
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const stats = useQuery(
    api.dashboard.getDashboardStats,
    companyId ? { companyId, date: today, branchId: branchArg } : "skip"
  );

  const extended = useQuery(
    api.dashboard.getDashboardExtended,
    companyId ? { companyId, today } : "skip"
  );

  const activity: ActivityItem[] | undefined = useQuery(
    api.dashboard.getRecentActivity,
    companyId ? { companyId, limit: 10 } : "skip"
  );

  const numFmt = (n: number) => n.toLocaleString("en-US");
  const moneyFmt = (n: number) => formatCurrency(n);

  const isLoading = !!companyId && stats === undefined;
  const extLoading = !!companyId && extended === undefined;

  // ── Alert items ────────────────────────────────────────────────────────────
  const alerts: { key: string; count: number; amount?: number; color: string; icon: any; href: string }[] = [];
  if ((extended?.overdueCount ?? 0) > 0) {
    alerts.push({
      key: "kpiOverdueInvoices",
      count: extended!.overdueCount,
      amount: extended!.overdueAmount,
      color: "#dc2626",
      icon: AlertTriangle,
      href: "/sales/invoices",
    });
  }
  if ((extended?.lowStockCount ?? 0) > 0) {
    alerts.push({
      key: "kpiLowStock",
      count: extended!.lowStockCount,
      color: "#d97706",
      icon: AlertCircle,
      href: "/inventory/items",
    });
  }
  if ((stats?.pendingInvoices ?? 0) > 0) {
    alerts.push({
      key: "kpiPendingAll",
      count: (stats?.pendingInvoices ?? 0) + (extended?.pendingPurchases ?? 0),
      color: "#7c3aed",
      icon: AlertCircle,
      href: "/sales/invoices",
    });
  }

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = (extended?.sevenDayTrend ?? []).map((d) => ({
    date: shortDate(d.date, lang),
    [t("chartSalesLabel")]:    Math.round(d.sales),
    [t("chartReceiptsLabel")]: Math.round(d.receipts),
    [t("chartPaymentsLabel")]: Math.round(d.payments),
  }));

  const totalInflow7d = (extended?.sevenDayTrend ?? []).reduce((acc, d) => acc + d.receipts, 0);
  const totalOutflow7d = (extended?.sevenDayTrend ?? []).reduce((acc, d) => acc + d.payments, 0);
  const scheduledPaymentsAmount = extended?.pendingPurchasesAmount ?? 0;
  const maxCashFlow = Math.max(totalInflow7d, totalOutflow7d, scheduledPaymentsAmount, 1);

  // ── Quick actions ──────────────────────────────────────────────────────────
  const quick = [
    { href: "/sales/invoices?new=true",      icon: ShoppingCart, key: "newInvoice" },
    { href: "/treasury/receipts?new=true",   icon: Banknote,     key: "newReceipt" },
    { href: "/treasury/payments?new=true",   icon: CreditCard,   key: "newPayment" },
    { href: "/purchases/grn?new=true",       icon: Warehouse,    key: "newGRN" },
    { href: "/finance/journal-entries?new=true", icon: FileText, key: "newJournal" },
    { href: "/sales/customers?new=true",     icon: Users,        key: "newCustomer" },
  ];

  const netCashFlow = (stats?.todayReceipts ?? 0) - (stats?.todayPayments ?? 0);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[color:var(--ink-400)] mb-1">
            <span>{t("navQuickAccess") ?? "Home"}</span>
            <span className="text-[color:var(--ink-300)]">/</span>
            <span className="text-[color:var(--brand-700)]">{t("dashboardTitle")}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[color:var(--ink-900)]">
            {t("dashboardTitle")}
          </h1>
          <p className="mt-1 text-sm text-[color:var(--ink-500)]">
            {t("dashboardSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-[color:var(--ink-700)] bg-white border border-[color:var(--ink-200)] rounded-xl px-3.5 py-2 shadow-sm font-medium cursor-default">
          <CalendarDays className="h-4 w-4 text-[color:var(--ink-400)]" />
          <span>{formatDate(new Date())}</span>
          <ChevronDown className="h-3.5 w-3.5 text-[color:var(--ink-400)] ms-1" />
        </div>
      </div>

      {/* ── Alert bar ───────────────────────────────────────────────────────── */}
      {!extLoading && alerts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {alerts.map((alert) => {
            const Icon = alert.icon;
            return (
              <Link
                key={alert.key}
                href={alert.href}
                className="flex items-center gap-3 px-4 py-3 rounded-[14px] border text-[13px] font-semibold transition-all hover:shadow-md bg-white"
                style={{
                  borderColor: `color-mix(in srgb, ${alert.color} 25%, transparent)`,
                  borderLeft: `4px solid ${alert.color}`,
                }}
              >
                <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${alert.color} 12%, white)` }}>
                  <Icon className="h-4 w-4" style={{ color: alert.color }} />
                </div>
                <span className="text-[color:var(--ink-800)]">
                  {numFmt(alert.count)} {t(alert.key as any)}
                  {alert.amount !== undefined && alert.amount > 0 && (
                    <span className="ms-1 font-bold text-[color:var(--ink-900)] tabular-nums">— {moneyFmt(alert.amount)}</span>
                  )}
                </span>
                <ArrowUpRight className="ms-auto h-3.5 w-3.5 shrink-0 opacity-40" />
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Financial KPIs (AR / AP / Cash / Net Flow) ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <FinancialKPI
          title={t("kpiAROutstanding")}
          value={extended?.arOutstanding}
          accent="#10b981"
          icon={TrendingUp}
          loading={extLoading}
          moneyFmt={moneyFmt}
        />
        <FinancialKPI
          title={t("kpiAPOutstanding")}
          value={extended?.apOutstanding}
          accent="#8b5cf6"
          icon={TrendingDown}
          loading={extLoading}
          moneyFmt={moneyFmt}
        />
        <FinancialKPI
          title={t("kpiCashBalance")}
          value={stats?.cashOnHand}
          accent="#3b82f6"
          icon={Landmark}
          loading={isLoading}
          moneyFmt={moneyFmt}
        />
        <FinancialKPI
          title={t("kpiNetCashFlow")}
          value={netCashFlow}
          accent="#f43f5e"
          icon={BarChart3}
          loading={isLoading}
          moneyFmt={moneyFmt}
        />
      </div>

      {/* ── Operational KPIs (Today's) ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <OperationalKPI title={t("kpiSalesToday")}    value={stats?.todaySales}    icon={TrendingUp} accent="#10b981" loading={isLoading} moneyFmt={moneyFmt}
          deltaVsYesterday={extLoading ? undefined : calcDelta(stats?.todaySales ?? 0, extended?.yesterdaySales ?? 0)} />
        <OperationalKPI title={t("kpiReceipts")}      value={stats?.todayReceipts} icon={Banknote}   accent="#3b82f6" loading={isLoading} moneyFmt={moneyFmt}
          deltaVsYesterday={extLoading ? undefined : calcDelta(stats?.todayReceipts ?? 0, extended?.yesterdayReceipts ?? 0)} />
        <OperationalKPI title={t("kpiPaymentsToday")} value={stats?.todayPayments} icon={CreditCard} accent="#8b5cf6" loading={isLoading} moneyFmt={moneyFmt}
          deltaVsYesterday={extLoading ? undefined : calcDelta(stats?.todayPayments ?? 0, extended?.yesterdayPayments ?? 0)} />
        <OperationalKPI title={t("kpiCustomers")}     value={stats?.customerCount} icon={Users}      accent="#f59e0b" loading={isLoading} moneyFmt={moneyFmt} count />
      </div>

      {/* ── Charts ──────────────────────────────────────────────────────────── */}
      {!extLoading && chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Sales & Receipts trend */}
          <div className="bg-white rounded-[16px] p-6 lg:col-span-3 shadow-sm flex flex-col" style={{ border: "1px solid var(--ink-100)" }}>
            <h3 className="text-[15px] font-bold text-[color:var(--ink-900)] mb-6">
              {t("chartSalesTrend")} (7 {t("days")})
            </h3>
            <div className="flex-1 min-h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#4f46e5" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="receiptsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--ink-100)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--ink-400)" }} tickLine={false} axisLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--ink-400)" }} tickLine={false} axisLine={false} tickFormatter={(v) => v === 0 ? "0" : `${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid var(--ink-200)", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                    formatter={(value: number) => moneyFmt(value)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} iconType="circle" />
                  <Area type="monotone" dataKey={t("chartSalesLabel")}    stroke="#4f46e5" strokeWidth={3} fill="url(#salesGrad)" activeDot={{ r: 6, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey={t("chartReceiptsLabel")} stroke="#10b981" strokeWidth={3} fill="url(#receiptsGrad)" activeDot={{ r: 6, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cash Flow Horizontal Bars */}
          <div className="bg-white rounded-[16px] p-6 lg:col-span-2 shadow-sm flex flex-col justify-between" style={{ border: "1px solid var(--ink-100)" }}>
            <h3 className="text-[15px] font-bold text-[color:var(--ink-900)] mb-6">
              {t("chartCashFlow")} (7 {t("days")})
            </h3>
            
            <div className="space-y-6 flex-1 py-2">
              <CashFlowBar label={isRTL ? "التدفقات النقدية الداخلة" : "Inflow"} value={totalInflow7d} max={maxCashFlow} color="#10b981" moneyFmt={moneyFmt} />
              <CashFlowBar label={isRTL ? "التدفقات النقدية الخارجة" : "Outflow"} value={totalOutflow7d} max={maxCashFlow} color="#ef4444" moneyFmt={moneyFmt} />
              <CashFlowBar label={isRTL ? "الدفعات المجدولة" : "Scheduled Payments"} value={scheduledPaymentsAmount} max={maxCashFlow} color="#f59e0b" moneyFmt={moneyFmt} />
            </div>

            <div className="mt-6 pt-4 flex items-start gap-3 rounded-xl bg-[color:var(--ink-50)] p-4 border border-[color:var(--ink-100)]">
              <div className="h-6 w-6 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                <Info className="h-3.5 w-3.5 text-[color:var(--ink-700)]" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-[color:var(--ink-900)] mb-0.5">{isRTL ? "حالة النقدية: يعتمد على التحصيل" : "Cash Health: Data-driven"}</p>
                <p className="text-[11px] text-[color:var(--ink-500)] leading-relaxed">
                  {isRTL ? "تعكس هذه المؤشرات حركات الدفع والقبض الفعّالة خلال الأسبوع الماضي." : "These indicators reflect the actual cash in/out movements over the past week."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom: Quick actions + Recent activity ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="bg-white rounded-[16px] p-6 lg:col-span-1 shadow-sm flex flex-col" style={{ border: "1px solid var(--ink-100)" }}>
          <h3 className="text-[15px] font-bold text-[color:var(--ink-900)] mb-5">
            {t("quickActions")}
          </h3>
          <div className="space-y-1">
            {quick.map(({ href, icon: Icon, key }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-[color:var(--ink-50)] transition-all"
              >
                <div
                  className="h-10 w-10 rounded-[12px] flex items-center justify-center shrink-0 bg-[color:var(--ink-50)] group-hover:bg-white group-hover:shadow-sm transition-all"
                  style={{ color: "var(--ink-600)", border: "1px solid var(--ink-100)" }}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <span className="text-[13px] font-semibold text-[color:var(--ink-700)] group-hover:text-[color:var(--ink-900)] flex-1">
                  {t(key as any)}
                </span>
                <ChevronRight className="h-4 w-4 text-[color:var(--ink-300)] group-hover:text-[color:var(--ink-500)] shrink-0 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-[16px] p-0 lg:col-span-2 shadow-sm flex flex-col overflow-hidden" style={{ border: "1px solid var(--ink-100)" }}>
          <div className="p-6 pb-4 flex items-center justify-between border-b border-[color:var(--ink-100)]">
            <h3 className="text-[15px] font-bold text-[color:var(--ink-900)]">
              {t("recentActivity")}
            </h3>
            <Link href="/finance/journal-entries" className="text-[12px] font-semibold text-[color:var(--brand-600)] hover:text-[color:var(--brand-700)]">
              {isRTL ? "عرض الكل" : "View All"}
            </Link>
          </div>

          {isLoading ? (
            <div className="p-6"><ActivitySkeleton /></div>
          ) : !activity || activity.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center bg-[color:var(--ink-50)]/50">
              <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                <Archive className="h-6 w-6 text-[color:var(--ink-300)]" />
              </div>
              <p className="text-[14px] font-bold text-[color:var(--ink-800)] mb-1">{isRTL ? "لا توجد أنشطة حديثة" : "No recent activity"}</p>
              <p className="text-[12px] text-[color:var(--ink-500)] max-w-xs">{isRTL ? "لم يتم تسجيل أي حركات مالية أو مخزنية حتى الآن في هذا النظام." : "No financial or inventory movements have been recorded yet in this system."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[color:var(--ink-50)]">
                    <th className="px-6 py-3 text-start text-[10px] font-bold text-[color:var(--ink-400)] uppercase tracking-wider">{t("type")}</th>
                    <th className="px-6 py-3 text-start text-[10px] font-bold text-[color:var(--ink-400)] uppercase tracking-wider">{t("description")}</th>
                    <th className="px-6 py-3 text-start text-[10px] font-bold text-[color:var(--ink-400)] uppercase tracking-wider">{t("date")}</th>
                    <th className="px-6 py-3 text-end text-[10px] font-bold text-[color:var(--ink-400)] uppercase tracking-wider">{t("amount")}</th>
                    <th className="px-6 py-3 text-end text-[10px] font-bold text-[color:var(--ink-400)] uppercase tracking-wider">{t("status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--ink-100)]">
                  {activity.map((item, idx) => {
                    const meta = TYPE_META[item.type] ?? TYPE_META.sales_invoice;
                    const Icon = meta.icon;
                    return (
                      <tr key={`${item.type}-${item.documentNumber}-${idx}`} className="hover:bg-[color:var(--ink-50)]/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-[color:var(--ink-900)] leading-none mb-1">{item.documentNumber}</span>
                            <span className="text-[11px] text-[color:var(--ink-500)]">{t(meta.labelKey as any)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[color:var(--ink-600)] max-w-[200px] truncate">{item.description}</td>
                        <td className="px-6 py-4 text-[color:var(--ink-500)] whitespace-nowrap">{item.date}</td>
                        <td className="px-6 py-4 text-end font-bold tabular-nums text-[color:var(--ink-900)] whitespace-nowrap">{moneyFmt(item.amount)}</td>
                        <td className="px-6 py-4 text-end">
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide"
                            style={{ background: meta.badgeBg, color: meta.badgeColor }}
                          >
                            {t("statusPosted") ?? "Posted"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function FinancialKPI({
  title, value, accent, icon: Icon, loading, moneyFmt, hint,
}: {
  title: string; value: number | undefined; accent: string; icon: any;
  loading: boolean; moneyFmt: (n: number) => string; hint?: string;
}) {
  const { lang } = useI18n();
  const defaultHint = lang === "ar" ? "مقارنة بالفترة السابقة: —" : "v.s. last period: —";

  return (
    <div
      className="bg-white rounded-[16px] p-5 relative overflow-hidden flex flex-col justify-between shadow-sm"
      style={{ border: "1px solid var(--ink-100)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: accent }} />
      
      <div className="flex items-center justify-between mb-4">
        <div
          className="h-10 w-10 rounded-[12px] flex items-center justify-center shrink-0"
          style={{ background: `color-mix(in srgb, ${accent} 12%, white)` }}
        >
          <Icon className="h-5 w-5" style={{ color: accent }} />
        </div>
        <div 
          className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider bg-[color:var(--ink-50)] text-[color:var(--ink-400)]"
        >
          —
        </div>
      </div>
      
      <div className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--ink-500)] mb-1">
        {title}
      </div>
      <div className="text-[26px] leading-[1.1] font-bold tabular-nums text-[color:var(--ink-900)] mb-1.5 mt-0.5">
        {loading || value === undefined ? "—" : moneyFmt(value)}
      </div>
      <div className="text-[11px] font-medium text-[color:var(--ink-400)]">
        {hint ?? defaultHint}
      </div>
    </div>
  );
}

function OperationalKPI({
  title, value, icon: Icon, accent, loading, moneyFmt, count = false,
  deltaVsYesterday,
}: {
  title: string; value: number | undefined; icon: any; accent: string;
  loading: boolean; moneyFmt: (n: number) => string; count?: boolean;
  deltaVsYesterday?: number | null;
}) {
  const displayVal = loading || value === undefined
    ? "—"
    : count
      ? value.toLocaleString("en-US")
      : moneyFmt(value);

  return (
    <div className="bg-white rounded-[16px] px-5 py-4 flex flex-col justify-center shadow-sm"
      style={{ border: "1px solid var(--ink-100)" }}>
      <div className="flex items-center gap-3 mb-2">
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: `color-mix(in srgb, ${accent} 10%, white)`, color: accent }}
        >
          <Icon className="h-[15px] w-[15px]" />
        </div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--ink-400)] leading-tight">{title}</div>
      </div>
      <div className="text-[19px] font-bold tabular-nums text-[color:var(--ink-900)] ps-11">
        {displayVal}
      </div>
      {!loading && !count && deltaVsYesterday !== undefined && (
        <div className="mt-0.5 ps-11">
          <DeltaBadge delta={deltaVsYesterday} />
        </div>
      )}
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === 0 || delta === null) {
    return <span className="text-[10px] font-medium text-[color:var(--ink-400)]">—</span>;
  }
  const pct = Math.abs(delta).toFixed(1);
  const isUp = delta > 0;
  return (
    <span
      className="text-[10px] font-bold tracking-wide"
      style={{ color: isUp ? "#10b981" : "#ef4444" }}
    >
      {isUp ? "↑" : "↓"} {pct}%
    </span>
  );
}

function CashFlowBar({ label, value, max, color, moneyFmt }: { label: string, value: number, max: number, color: string, moneyFmt: (v: number) => string }) {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[12px] mb-1.5 font-medium">
        <span className="text-[color:var(--ink-600)]">{label}</span>
        <span className="font-bold tabular-nums text-[color:var(--ink-900)]">{moneyFmt(value)}</span>
      </div>
      <div className="h-2.5 w-full bg-[color:var(--ink-100)] rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-1000 ease-out" 
          style={{ width: `${percentage}%`, background: color }} 
        />
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-[color:var(--ink-100)]" style={{ opacity: 1 - i * 0.2 }} />
      ))}
    </div>
  );
}
