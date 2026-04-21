"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Receipt,
  Users,
  Truck,
  Package,
  Landmark,
  Sparkles,
  CreditCard,
  FileCheck,
  Warehouse,
  SlidersHorizontal,
  ArrowLeftRight,
  Scale,
  ShoppingCart,
  LogOut,
  BarChart2,
  Shield,
  TrendingUp,
  PieChart,
  RotateCcw,
  CalendarDays,
  Archive,
  PackageOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import type { TKey } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

type Item = { href: string; icon: any; key: TKey };
type Section = { titleKey: TKey; items: Item[] };

const SECTIONS: Section[] = [
  {
    titleKey: "navMain",
    items: [{ href: "/", icon: LayoutDashboard, key: "dashboard" }],
  },
  {
    titleKey: "navSales",
    items: [
      { href: "/sales/invoices",  icon: Landmark,   key: "salesInvoices" },
      { href: "/sales/returns",   icon: RotateCcw,  key: "salesReturns" },
      { href: "/sales/customers", icon: Users,      key: "customers" },
    ],
  },
  {
    titleKey: "navPurchases",
    items: [
      { href: "/purchases/suppliers", icon: Truck,         key: "suppliers" },
      { href: "/purchases/grn",       icon: FileCheck,     key: "grn" },
      { href: "/purchases/invoices",  icon: ShoppingCart,  key: "purchaseInvoices" },
      { href: "/purchases/returns",   icon: RotateCcw,     key: "purchaseReturns" },
    ],
  },
  {
    titleKey: "navInventory",
    items: [
      { href: "/inventory/items",       icon: Package,           key: "items" },
      { href: "/inventory/warehouses",  icon: Warehouse,         key: "warehouses" },
      { href: "/inventory/adjustments", icon: SlidersHorizontal, key: "stockAdjustments" },
      { href: "/inventory/transfers",   icon: ArrowLeftRight,    key: "stockTransfers" },
    ],
  },
  {
    titleKey: "navTreasury",
    items: [
      { href: "/treasury/receipts",       icon: Receipt,        key: "cashReceipts" },
      { href: "/treasury/payments",       icon: CreditCard,     key: "cashPayments" },
      { href: "/treasury/cheques",        icon: FileCheck,      key: "cheques" },
      { href: "/treasury/bank-transfers", icon: ArrowLeftRight, key: "bankTransfers" },
    ],
  },
  {
    titleKey: "navFinance",
    items: [
      { href: "/finance/chart-of-accounts", icon: BookOpen, key: "chartOfAccounts" },
      { href: "/finance/journal-entries",   icon: FileText,  key: "journalEntries" },
    ],
  },
  {
    titleKey: "navReports",
    items: [
      { href: "/reports/trial-balance",    icon: Scale,       key: "trialBalance" },
      { href: "/reports/general-ledger",   icon: BookOpen,    key: "generalLedger" },
      { href: "/reports/income-statement", icon: TrendingUp,  key: "incomeStatement" },
      { href: "/reports/balance-sheet",    icon: PieChart,    key: "balanceSheet" },
      { href: "/reports/ar-aging",         icon: BarChart2,   key: "arAging" },
      { href: "/reports/ap-aging",         icon: BarChart2,   key: "apAging" },
      { href: "/reports/sales-report",     icon: TrendingUp,  key: "salesReport" },
      { href: "/reports/purchase-report",  icon: ShoppingCart,key: "purchaseReport" },
      { href: "/reports/stock-valuation",  icon: PackageOpen, key: "stockValuation" },
    ],
  },
];

const SETTINGS_SECTION: Section = {
  titleKey: "navSettings",
  items: [
    { href: "/settings/fiscal-years", icon: CalendarDays, key: "fiscalYears" },
    { href: "/settings/audit-log", icon: Shield, key: "auditLog" },
    { href: "/settings/users",     icon: Users,  key: "userManagement" },
  ],
};

const LEGACY_SECTION: Section = {
  titleKey: "navLegacy",
  items: [
    { href: "/legacy/items",     icon: Archive, key: "legacyItems" },
    { href: "/legacy/recipes",   icon: Archive, key: "legacyRecipes" },
    { href: "/legacy/inventory", icon: Archive, key: "legacyInventory" },
    { href: "/legacy/pl",        icon: Archive, key: "legacyPL" },
    { href: "/legacy/staff",     icon: Archive, key: "legacyStaff" },
  ],
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, isRTL } = useI18n();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const { currentUser, logout } = useAuth();
  const { role, isAdmin } = usePermissions();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const roleLabelMap: Record<string, { ar: string; en: string }> = {
    admin:      { ar: "مدير النظام",  en: "Admin" },
    manager:    { ar: "مدير",         en: "Manager" },
    accountant: { ar: "محاسب",        en: "Accountant" },
    cashier:    { ar: "أمين صندوق",   en: "Cashier" },
    sales:      { ar: "مبيعات",       en: "Sales" },
    warehouse:  { ar: "مستودع",       en: "Warehouse" },
    viewer:     { ar: "مشاهد",        en: "Viewer" },
  };
  const roleLabelText = roleLabelMap[role]?.[isRTL ? "ar" : "en"] ?? role;

  const visibleSections = isAdmin
    ? [...SECTIONS, SETTINGS_SECTION, LEGACY_SECTION]
    : SECTIONS;

  const renderSection = (section: Section) => (
    <div key={section.titleKey}>
      {!collapsed && (
        <div
          className="px-3 pt-2 pb-1.5 text-[10px] font-semibold tracking-[0.18em] uppercase"
          style={{ color: "rgba(243,233,214,0.55)" }}
        >
          {t(section.titleKey)}
        </div>
      )}
      <ul className="space-y-0.5">
        {section.items.map(({ href, icon: Icon, key }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  active
                    ? "text-white"
                    : "text-[rgba(243,233,214,0.78)] hover:text-white hover:bg-[rgba(201,163,90,0.1)]",
                  collapsed && "justify-center px-2"
                )}
                style={
                  active
                    ? {
                        background:
                          "linear-gradient(90deg, rgba(201,163,90,0.22), rgba(201,163,90,0.06))",
                        boxShadow:
                          "inset 0 0 0 1px rgba(201,163,90,0.3)",
                      }
                    : undefined
                }
                title={collapsed ? t(key) : undefined}
              >
                <span
                  className={cn(
                    "relative flex items-center justify-center h-5 w-5 shrink-0",
                    active ? "text-[color:var(--gold-300)]" : "opacity-85"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                {!collapsed && <span className="truncate">{t(key)}</span>}
                {active && !collapsed && (
                  <span
                    className="ml-auto h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--gold-400)" }}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <aside
      className={cn(
        "h-full flex flex-col custom-scrollbar overflow-y-auto",
        "text-[color:var(--sidebar-foreground)]",
        isRTL
          ? "border-l border-[color:var(--sidebar-border)]"
          : "border-r border-[color:var(--sidebar-border)]"
      )}
      style={{ background: "var(--sidebar)" }}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-5 border-b border-[color:var(--sidebar-border)]",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="relative shrink-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{
              background: "linear-gradient(135deg, var(--gold-300), var(--gold-500))",
              boxShadow: "0 4px 14px rgba(201,163,90,0.35)",
            }}
          >
            <Sparkles className="h-5 w-5" style={{ color: "var(--brand-900)" }} />
          </div>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-[15px] font-bold tracking-tight truncate text-white">
              {t("appName")}
            </div>
            <div
              className="text-[11px] tracking-wide truncate"
              style={{ color: "var(--gold-200)" }}
            >
              {t("appSubtitle")}
            </div>
          </div>
        )}
      </div>

      {/* Sections */}
      <nav className="flex-1 py-3 px-2 space-y-4">
        {visibleSections.map(renderSection)}
      </nav>

      {/* Footer — User info + Logout */}
      <div className="px-4 py-3 border-t border-[color:var(--sidebar-border)] space-y-2">
        {!collapsed && currentUser && (
          <div
            className="rounded-xl p-3"
            style={{
              background: "linear-gradient(135deg, rgba(201,163,90,0.12), rgba(201,163,90,0.04))",
              border: "1px solid rgba(201,163,90,0.22)",
            }}
          >
            <div className="font-semibold text-xs truncate" style={{ color: "var(--gold-300)" }}>
              {currentUser.name}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold"
                style={{
                  background: "rgba(201,163,90,0.25)",
                  color: "var(--gold-200)",
                  border: "1px solid rgba(201,163,90,0.35)",
                }}
              >
                {roleLabelText}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={t("logout")}
          className={cn(
            "w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-[rgba(243,233,214,0.65)] hover:text-white hover:bg-red-900/30 transition-colors",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{t("logout")}</span>}
        </button>
      </div>
    </aside>
  );
}
