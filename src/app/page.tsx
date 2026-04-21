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
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/useAppStore";

// ── helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
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
  { icon: any; color: string; bg: string; labelKey: string }
> = {
  sales_invoice: {
    icon: ShoppingCart,
    color: "var(--brand-700)",
    bg: "color-mix(in srgb, var(--brand-700) 10%, white)",
    labelKey: "typeSalesInvoice",
  },
  cash_receipt: {
    icon: Banknote,
    color: "#059669",
    bg: "color-mix(in srgb, #059669 10%, white)",
    labelKey: "typeCashReceipt",
  },
  cash_payment: {
    icon: CreditCard,
    color: "#dc2626",
    bg: "color-mix(in srgb, #dc2626 10%, white)",
    labelKey: "typeCashPayment",
  },
  grn: {
    icon: Warehouse,
    color: "#7c3aed",
    bg: "color-mix(in srgb, #7c3aed 10%, white)",
    labelKey: "typeGRN",
  },
  bank_transfer: {
    icon: ArrowLeftRight,
    color: "#d97706",
    bg: "color-mix(in srgb, #d97706 10%, white)",
    labelKey: "typeBankTransfer",
  },
  stock_adjustment: {
    icon: Package,
    color: "#64748b",
    bg: "color-mix(in srgb, #64748b 10%, white)",
    labelKey: "typeStockAdj",
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

  const activity: ActivityItem[] | undefined = useQuery(
    api.dashboard.getRecentActivity,
    companyId ? { companyId, limit: 10 } : "skip"
  );

  const numFmt = (n: number) =>
    n.toLocaleString(lang === "ar" ? "ar-QA" : "en-US");

  const moneyFmt = (n: number) => formatCurrency(n);

  const isLoading = !!companyId && stats === undefined;

  // ── Count KPIs ─────────────────────────────────────────────────────────────
  const countKPIs = [
    {
      key: "kpiCustomers",
      value: stats?.customerCount,
      icon: Users,
      color: "var(--brand-700)",
      warning: false,
    },
    {
      key: "kpiSuppliers",
      value: stats?.supplierCount,
      icon: Truck,
      color: "var(--gold-600)",
      warning: false,
    },
    {
      key: "kpiItems",
      value: stats?.itemCount,
      icon: Package,
      color: "var(--brand-600)",
      warning: false,
    },
    {
      key: "kpiPendingInvoices",
      value: stats?.pendingInvoices,
      icon: AlertCircle,
      color: (stats?.pendingInvoices ?? 0) > 0 ? "#d97706" : "var(--gold-500)",
      warning: (stats?.pendingInvoices ?? 0) > 0,
    },
  ];

  // ── Quick actions ──────────────────────────────────────────────────────────
  const quick = [
    { href: "/sales/invoices/new",     icon: ShoppingCart,  key: "newInvoice" },
    { href: "/treasury/receipts/new",  icon: Banknote,      key: "newReceipt" },
    { href: "/treasury/payments/new",  icon: CreditCard,    key: "newPayment" },
    { href: "/purchases/grn",          icon: Warehouse,     key: "newGRN" },
    { href: "/finance/journal-entries",icon: FileText,      key: "newJournal" },
    { href: "/sales/customers",        icon: Users,         key: "newCustomer" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[color:var(--ink-900)]">
            {t("dashboardTitle")}
          </h1>
          <p className="mt-1 text-sm text-[color:var(--ink-500)]">
            {t("dashboardSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[color:var(--ink-600)] bg-white border border-[color:var(--ink-200)] rounded-lg px-3 py-2">
          <CalendarDays className="h-4 w-4 text-[color:var(--gold-600)]" />
          <span>{formatDate(new Date())}</span>
        </div>
      </div>

      {/* ── Count KPI row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {countKPIs.map(({ key, value, icon: Icon, color, warning }) => (
          <div
            key={key}
            className="kpi-card"
            style={warning ? { borderLeft: "3px solid #d97706" } : undefined}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-[color:var(--ink-500)] tracking-wide">
                  {t(key as any)}
                </div>
                <div className="mt-2 text-3xl font-bold text-[color:var(--ink-900)] tabular-nums">
                  {isLoading || value === undefined ? (
                    <span className="text-[color:var(--ink-300)]">—</span>
                  ) : (
                    numFmt(value)
                  )}
                </div>
              </div>
              <div
                className="h-11 w-11 rounded-xl flex items-center justify-center"
                style={{
                  background: `color-mix(in srgb, ${color} 10%, white)`,
                  border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
                }}
              >
                <Icon className="h-[18px] w-[18px]" style={{ color }} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs font-medium">
              {warning ? (
                <span className="text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {t("statusUnposted")}
                </span>
              ) : (
                <span className="text-[color:var(--ink-500)] font-normal flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  {t("active")}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Money KPI row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MoneyCard
          title={t("kpiSalesToday")}
          value={stats?.todaySales}
          accent="var(--brand-700)"
          icon={ShoppingCart}
          iconColor="var(--brand-700)"
          loading={isLoading}
          moneyFmt={moneyFmt}
        />
        <MoneyCard
          title={t("kpiReceipts")}
          value={stats?.todayReceipts}
          accent="#059669"
          icon={Banknote}
          iconColor="#059669"
          loading={isLoading}
          moneyFmt={moneyFmt}
        />
        <MoneyCard
          title={t("kpiPaymentsToday")}
          value={stats?.todayPayments}
          accent="#dc2626"
          icon={CreditCard}
          iconColor="#dc2626"
          loading={isLoading}
          moneyFmt={moneyFmt}
        />
        <MoneyCard
          title={t("kpiCashOnHand")}
          value={stats?.cashOnHand}
          accent="var(--gold-600)"
          icon={Landmark}
          iconColor="var(--gold-600)"
          loading={isLoading}
          moneyFmt={moneyFmt}
          prominent
        />
      </div>

      {/* ── Quick actions + Recent activity ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick actions */}
        <div className="surface-card p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[color:var(--ink-900)]">
              {t("quickActions")}
            </h3>
          </div>
          <div className="space-y-2">
            {quick.map(({ href, icon: Icon, key }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[color:var(--ink-200)] hover:border-[color:var(--brand-400)] hover:bg-[color:var(--brand-50)] transition-all"
              >
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-[color:var(--ink-800)] group-hover:text-[color:var(--brand-800)]">
                  {t(key as any)}
                </span>
                <ArrowUpRight className="ms-auto h-4 w-4 text-[color:var(--ink-400)] group-hover:text-[color:var(--brand-600)] shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="surface-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[color:var(--ink-900)]">
              {t("recentActivity")}
            </h3>
          </div>

          {isLoading ? (
            <ActivitySkeleton />
          ) : !activity || activity.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[color:var(--ink-200)] bg-[color:var(--ink-50)] py-10 text-center">
              <div className="text-sm text-[color:var(--ink-500)]">
                {t("noRecentActivity")}
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-[color:var(--ink-100)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[color:var(--ink-50)] border-b border-[color:var(--ink-100)]">
                    <th className="px-3 py-2.5 text-start text-xs font-semibold text-[color:var(--ink-500)] tracking-wide">
                      {t("type")}
                    </th>
                    <th className="px-3 py-2.5 text-start text-xs font-semibold text-[color:var(--ink-500)] tracking-wide">
                      {t("description")}
                    </th>
                    <th className="px-3 py-2.5 text-start text-xs font-semibold text-[color:var(--ink-500)] tracking-wide hidden md:table-cell">
                      {t("number")}
                    </th>
                    <th className="px-3 py-2.5 text-end text-xs font-semibold text-[color:var(--ink-500)] tracking-wide">
                      {t("amount")}
                    </th>
                    <th className="px-3 py-2.5 text-end text-xs font-semibold text-[color:var(--ink-500)] tracking-wide hidden sm:table-cell">
                      {t("date")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--ink-100)]">
                  {activity.map((item, idx) => {
                    const meta = TYPE_META[item.type] ?? TYPE_META.sales_invoice;
                    const Icon = meta.icon;
                    return (
                      <tr
                        key={`${item.type}-${item.documentNumber}-${idx}`}
                        className="hover:bg-[color:var(--ink-50)] transition-colors"
                      >
                        <td className="px-3 py-2.5">
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                            style={{ background: meta.bg, color: meta.color }}
                          >
                            <Icon className="h-3 w-3 shrink-0" />
                            {t(meta.labelKey as any)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[color:var(--ink-700)] max-w-[140px] truncate">
                          {item.description}
                        </td>
                        <td className="px-3 py-2.5 text-[color:var(--ink-500)] hidden md:table-cell whitespace-nowrap">
                          {item.documentNumber}
                        </td>
                        <td className="px-3 py-2.5 text-end font-semibold tabular-nums text-[color:var(--ink-900)] whitespace-nowrap">
                          {moneyFmt(item.amount)}
                        </td>
                        <td className="px-3 py-2.5 text-end text-[color:var(--ink-500)] whitespace-nowrap hidden sm:table-cell">
                          {item.date}
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

function MoneyCard({
  title,
  value,
  accent,
  icon: Icon,
  iconColor,
  loading,
  moneyFmt,
  prominent = false,
}: {
  title: string;
  value: number | undefined;
  accent: string;
  icon: any;
  iconColor: string;
  loading: boolean;
  moneyFmt: (n: number) => string;
  prominent?: boolean;
}) {
  return (
    <div
      className="surface-card p-5"
      style={{
        borderLeft: `3px solid ${accent}`,
        ...(prominent
          ? { background: "color-mix(in srgb, var(--gold-400) 5%, white)" }
          : {}),
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-[color:var(--ink-500)]">{title}</div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-[color:var(--ink-900)] truncate">
            {loading || value === undefined ? (
              <span className="text-[color:var(--ink-300)]">—</span>
            ) : (
              moneyFmt(value)
            )}
          </div>
        </div>
        <div
          className="ms-3 h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: `color-mix(in srgb, ${iconColor} 10%, white)`,
            border: `1px solid color-mix(in srgb, ${iconColor} 20%, transparent)`,
          }}
        >
          <Icon className="h-[18px] w-[18px]" style={{ color: iconColor }} />
        </div>
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-10 rounded-lg bg-[color:var(--ink-100)]"
          style={{ opacity: 1 - i * 0.15 }}
        />
      ))}
    </div>
  );
}
