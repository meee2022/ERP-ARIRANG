"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, BookOpen, FileText, Receipt, Users, User, Truck, Package, Smartphone,
  Landmark, Sparkles, CreditCard, FileCheck, Warehouse, SlidersHorizontal,
  ArrowLeftRight, Scale, ShoppingCart, LogOut, BarChart2, Shield, CheckCircle2,
  TrendingUp, PieChart, RotateCcw, CalendarDays, Archive, PackageOpen,
  Building2, ChevronDown, ChevronRight, Search, Pin, X, HardDrive, Zap,
  FlaskConical, ClipboardList, ChefHat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import type { TKey } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useCompanySettings } from "@/hooks/useCompanySettings";

type NavItem    = { href: string; icon: any; key: TKey };
type NavSection = { titleKey: TKey; icon: any; items: NavItem[]; color?: string };

// ── colour assigned per section ───────────────────────────────────────────────
const SECTIONS: NavSection[] = [
  {
    titleKey: "navSales", icon: Landmark, color: "#34d399",
    items: [
      { href: "/sales/mobile",     icon: Smartphone, key: "mobileSales"   },
      { href: "/sales/invoices",  icon: Landmark,  key: "salesInvoices" },
      { href: "/sales/review",    icon: CheckCircle2, key: "reviewQueue" },
      { href: "/sales/returns",   icon: RotateCcw, key: "salesReturns"  },
      { href: "/sales/customers", icon: Users,     key: "customers"     },
      { href: "/sales/sales-reps", icon: User,     key: "salesReps"     },
      { href: "/sales/vehicles",   icon: Truck,    key: "vehicles"      },
    ],
  },
  {
    titleKey: "navPurchases", icon: Truck, color: "#60a5fa",
    items: [
      { href: "/purchases/invoices",  icon: ShoppingCart,      key: "purchaseInvoices" },
      { href: "/purchases/grn",       icon: FileCheck,         key: "grn"              },
      { href: "/purchases/returns",   icon: RotateCcw,         key: "purchaseReturns"  },
      { href: "/purchases/suppliers", icon: Truck,             key: "suppliers"        },
    ],
  },
  {
    titleKey: "navInventory", icon: Package, color: "#fb923c",
    items: [
      { href: "/inventory/items",         icon: Package,           key: "items"               },
      { href: "/inventory/warehouses",    icon: Warehouse,         key: "warehouses"          },
      { href: "/inventory/opening-stock", icon: PackageOpen,       key: "openingStock"        },
      { href: "/inventory/adjustments",   icon: SlidersHorizontal, key: "stockAdjustments"    },
      { href: "/inventory/transfers",     icon: ArrowLeftRight,    key: "stockTransfers"      },
      { href: "/inventory/movements",     icon: RotateCcw,         key: "inventoryMovements"  },
    ],
  },
  {
    titleKey: "navProduction", icon: ChefHat, color: "#22d3ee",
    items: [
      { href: "/production",                  icon: LayoutDashboard, key: "productionDashboard" },
      { href: "/production/recipes",          icon: FlaskConical,    key: "recipes"             },
      { href: "/production/orders",           icon: ClipboardList,   key: "productionOrders"    },
      { href: "/production/migrate-recipes",  icon: HardDrive,       key: "migrateRecipes"      },
    ],
  },
  {
    titleKey: "navTreasury", icon: Receipt, color: "#a78bfa",
    items: [
      { href: "/treasury/receipts",       icon: Receipt,        key: "cashReceipts"  },
      { href: "/treasury/payments",       icon: CreditCard,     key: "cashPayments"  },
      { href: "/treasury/cheques",        icon: FileCheck,      key: "cheques"       },
      { href: "/treasury/bank-transfers", icon: ArrowLeftRight, key: "bankTransfers" },
    ],
  },
  {
    titleKey: "navFinance", icon: BookOpen, color: "#f472b6",
    items: [
      { href: "/finance/chart-of-accounts", icon: BookOpen, key: "chartOfAccounts" },
      { href: "/finance/journal-entries",   icon: FileText, key: "journalEntries"  },
    ],
  },
  {
    titleKey: "navHR", icon: Users, color: "#4ade80",
    items: [
      { href: "/hr",            icon: LayoutDashboard,   key: "hrDashboard"      },
      { href: "/hr/employees",  icon: Users,             key: "employeeRegister" },
      { href: "/hr/attendance", icon: CalendarDays,      key: "attendance"       },
      { href: "/hr/leave",      icon: FileCheck,         key: "leaveManagement"  },
      { href: "/hr/payroll",    icon: CreditCard,        key: "payroll"          },
      { href: "/hr/setup",      icon: SlidersHorizontal, key: "hrSetup"          },
    ],
  },
  {
    titleKey: "navFixedAssets", icon: HardDrive, color: "#94a3b8",
    items: [
      { href: "/fixed-assets/register",    icon: HardDrive,  key: "assetRegister"    },
      { href: "/fixed-assets/depreciation", icon: TrendingUp, key: "depreciationRuns" },
    ],
  },
  {
    titleKey: "navReports", icon: BarChart2, color: "#fbbf24",
    items: [
      { href: "/reports/trial-balance",         icon: Scale,        key: "trialBalance"       },
      { href: "/reports/income-statement",       icon: TrendingUp,   key: "incomeStatement"    },
      { href: "/reports/balance-sheet",          icon: PieChart,     key: "balanceSheet"       },
      { href: "/reports/general-ledger",         icon: BookOpen,     key: "generalLedger"      },
      { href: "/reports/ar-aging",               icon: BarChart2,    key: "arAging"            },
      { href: "/reports/ap-aging",               icon: BarChart2,    key: "apAging"            },
      { href: "/reports/sales-report",           icon: TrendingUp,   key: "salesReport"        },
      { href: "/reports/sales-details",          icon: FileText,     key: "salesDetails"       },
      { href: "/reports/daily-sales",            icon: BarChart2,    key: "dailySales"         },
      { href: "/reports/item-sales",             icon: Package,      key: "itemSales"          },
      { href: "/reports/top-sales",              icon: TrendingUp,   key: "topSales"           },
      { href: "/reports/sales-by-sales-rep",     icon: User,         key: "salesBySalesRep"    },
      { href: "/reports/sales-by-vehicle",       icon: Truck,        key: "salesByVehicle"     },
      { href: "/reports/purchase-report",        icon: ShoppingCart, key: "purchaseReport"     },
      { href: "/reports/stock-valuation",        icon: PackageOpen,  key: "stockValuation"     },
      { href: "/reports/customer-statement",     icon: Users,        key: "customerStatement"  },
      { href: "/reports/supplier-statement",     icon: Truck,        key: "supplierStatement"  },
      { href: "/reports/cash-movement",          icon: CreditCard,   key: "cashMovementReport" },
      { href: "/reports/cost-center-movement",   icon: BarChart2,    key: "costCenterMovement" },
      { href: "/reports/cost-center-pl",         icon: PieChart,     key: "costCenterPL"       },
      { href: "/reports/asset-register",         icon: HardDrive,    key: "assetRegisterReport" },
      { href: "/reports/depreciation-schedule",  icon: TrendingUp,   key: "depScheduleReport"  },
      { href: "/reports/asset-book-value",       icon: BarChart2,    key: "assetBookValueReport"},
      { href: "/reports/hr-employees",           icon: Users,        key: "employeeDirectoryReport" },
      { href: "/reports/hr-attendance",          icon: CalendarDays, key: "attendanceReport"   },
      { href: "/reports/hr-leave",               icon: FileCheck,    key: "leaveReport"        },
      { href: "/reports/hr-payroll",             icon: CreditCard,   key: "payrollReport"      },
      { href: "/reports/production-cost",        icon: ChefHat,      key: "productionCostReport" },
    ],
  },
];

const SETTINGS_SECTION: NavSection = {
  titleKey: "navSettings", icon: Shield, color: "#64748b",
  items: [
    { href: "/settings/company",      icon: Building2,    key: "companySettings" },
    { href: "/settings/cost-centers", icon: PieChart,     key: "costCenters"     },
    { href: "/settings/fiscal-years", icon: CalendarDays, key: "fiscalYears"     },
    { href: "/settings/users",        icon: Users,        key: "userManagement"  },
    { href: "/settings/audit-log",    icon: Shield,       key: "auditLog"        },
  ],
};

const LEGACY_SECTION: NavSection = {
  titleKey: "navLegacy", icon: Archive, color: "#78716c",
  items: [
    { href: "/legacy/items",     icon: Archive, key: "legacyItems"     },
    { href: "/legacy/recipes",   icon: Archive, key: "legacyRecipes"   },
    { href: "/legacy/inventory", icon: Archive, key: "legacyInventory" },
    { href: "/legacy/pl",        icon: Archive, key: "legacyPL"        },
    { href: "/legacy/staff",     icon: Archive, key: "legacyStaff"     },
  ],
};

const PINNED: NavItem[] = [
  { href: "/",                         icon: LayoutDashboard, key: "dashboard"        },
  { href: "/sales/invoices",           icon: Landmark,        key: "salesInvoices"    },
  { href: "/treasury/receipts",        icon: Receipt,         key: "cashReceipts"     },
  { href: "/purchases/invoices",       icon: ShoppingCart,    key: "purchaseInvoices" },
  { href: "/sales/customers",          icon: Users,           key: "customers"        },
  { href: "/reports/income-statement", icon: TrendingUp,      key: "incomeStatement"  },
];

// ── Component ──────────────────────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { t, isRTL }          = useI18n();
  const collapsed              = useAppStore((s) => s.sidebarCollapsed);
  const { currentUser, logout } = useAuth();
  const { role, isAdmin, canView }      = usePermissions();
  const { company, logoUrl }   = useCompanySettings();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  const itemModule = (href: string) => {
    if (href.startsWith("/sales")) return "sales";
    if (href.startsWith("/purchases")) return "purchases";
    if (href.startsWith("/inventory")) return "inventory";
    if (href.startsWith("/treasury")) return "treasury";
    if (href.startsWith("/finance")) return "finance";
    if (href.startsWith("/reports")) return "reports";
    if (href.startsWith("/settings")) return href === "/settings/users" ? "users" : "settings";
    if (href.startsWith("/hr")) return "hr";
    if (href.startsWith("/production")) return "production";
    return null;
  };

  const baseSections = isAdmin ? [...SECTIONS, SETTINGS_SECTION, LEGACY_SECTION] : SECTIONS;
  const allSections = useMemo(
    () =>
      baseSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => {
            const module = itemModule(item.href);
            if (!module) return isAdmin;
            return canView(module as any);
          }),
        }))
        .filter((section) => section.items.length > 0),
    [isAdmin, canView]
  );

  const activeSection = useMemo(
    () => allSections.find((s) => s.items.some((i) => isActive(i.href)))?.titleKey ?? null,
    [pathname, isAdmin] // eslint-disable-line
  );

  const [openSections, setOpenSections] = useState<Set<TKey>>(() => {
    const s = new Set<TKey>();
    if (activeSection) s.add(activeSection as TKey);
    return s;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const toggleSection = (key: TKey) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const handleLogout = async () => { await logout(); router.replace("/login"); };

  const searchActive = searchQuery.trim().length > 0;
  const searchLower  = searchQuery.toLowerCase();
  const searchResults = useMemo(() => {
    if (!searchActive) return [];
    return allSections.flatMap((s) =>
      s.items.filter((i) => t(i.key).toLowerCase().includes(searchLower))
    );
  }, [searchQuery, allSections, isRTL]); // eslint-disable-line

  const pinnedItems = useMemo(
    () =>
      PINNED.filter((item) => {
        const module = itemModule(item.href);
        if (!module) return isAdmin;
        return canView(module as any);
      }),
    [canView, isAdmin]
  );

  const roleLabelMap: Record<string, { ar: string; en: string }> = {
    admin:      { ar: "مدير النظام",  en: "Admin"      },
    manager:    { ar: "مدير",         en: "Manager"    },
    accountant: { ar: "محاسب",        en: "Accountant" },
    cashier:    { ar: "أمين صندوق",   en: "Cashier"    },
    sales:      { ar: "مبيعات",       en: "Sales"      },
    warehouse:  { ar: "مستودع",       en: "Warehouse"  },
    viewer:     { ar: "مشاهد",        en: "Viewer"     },
  };
  const roleLabelText = roleLabelMap[role]?.[isRTL ? "ar" : "en"] ?? role;

  // ── Nav item ──────────────────────────────────────────────────────────────
  const renderNavItem = (item: NavItem, accentColor?: string) => {
    const active = isActive(item.href);
    const accent = accentColor ?? "var(--gold-400)";

    return (
      <li key={item.href}>
        <Link
          href={item.href}
          title={collapsed ? t(item.key) : undefined}
          className={cn(
            "group relative flex items-center gap-2.5 rounded-lg py-[7px] text-[12.5px] font-medium transition-all duration-150",
            collapsed ? "justify-center px-2" : "px-2.5",
            active
              ? "text-white"
              : "text-[rgba(243,233,214,0.65)] hover:text-[rgba(243,233,214,0.95)] hover:bg-[rgba(255,255,255,0.05)]"
          )}
          style={active ? {
            background: "rgba(255,255,255,0.09)",
            boxShadow: `inset ${isRTL ? "-" : ""}2px 0 0 ${accent}`,
          } : undefined}
        >
          {/* Icon */}
          <span
            className={cn("h-[15px] w-[15px] shrink-0 transition-transform group-hover:scale-110")}
            style={{ color: active ? accent : undefined }}
          >
            <item.icon className="h-full w-full" />
          </span>

          {/* Label */}
          {!collapsed && (
            <span className="flex-1 truncate leading-snug">{t(item.key)}</span>
          )}

          {/* Active dot */}
          {active && !collapsed && (
            <span
              className="h-1 w-1 rounded-full shrink-0 opacity-80"
              style={{ background: accent }}
            />
          )}
        </Link>
      </li>
    );
  };

  // ── Section header ────────────────────────────────────────────────────────
  const renderSection = (section: NavSection) => {
    const isOpen    = openSections.has(section.titleKey as TKey);
    const isCurrent = section.titleKey === activeSection;
    const SIcon     = section.icon;
    const accent    = section.color ?? "var(--gold-400)";

    return (
      <div key={section.titleKey} className="mb-0.5">
        {/* ── Section toggle button ──────────────────────────── */}
        <button
          onClick={() => !collapsed && toggleSection(section.titleKey as TKey)}
          title={collapsed ? t(section.titleKey as TKey) : undefined}
          className={cn(
            "w-full flex items-center gap-2.5 rounded-lg transition-all duration-150",
            collapsed ? "justify-center px-2 py-2" : "px-2.5 py-[7px]",
            isCurrent
              ? "text-white"
              : "text-[rgba(243,233,214,0.55)] hover:text-[rgba(243,233,214,0.9)] hover:bg-[rgba(255,255,255,0.04)]"
          )}
          style={isCurrent ? {
            background: `linear-gradient(${isRTL ? "270deg" : "90deg"}, ${accent}18, ${accent}07)`,
          } : undefined}
        >
          {/* Icon box */}
          <span
            className="h-[26px] w-[26px] rounded-md flex items-center justify-center shrink-0 transition-all"
            style={{
              background: isCurrent ? `${accent}28` : "rgba(255,255,255,0.06)",
              border: `1px solid ${isCurrent ? accent + "40" : "rgba(255,255,255,0.08)"}`,
            }}
          >
            <SIcon
              className="h-3.5 w-3.5"
              style={{ color: isCurrent ? accent : "rgba(243,233,214,0.55)" }}
            />
          </span>

          {!collapsed && (
            <>
              <span
                className="flex-1 text-start text-[11.5px] font-bold tracking-[0.04em] uppercase"
                style={{ color: isCurrent ? "rgba(243,233,214,0.95)" : "rgba(243,233,214,0.55)" }}
              >
                {t(section.titleKey as TKey)}
              </span>

              {/* Badge: item count */}
              {!isCurrent && (
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 tabular-nums"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    color: "rgba(243,233,214,0.35)",
                  }}
                >
                  {section.items.length}
                </span>
              )}

              {/* Chevron */}
              {isCurrent || isOpen ? (
                <ChevronDown
                  className="h-3 w-3 shrink-0 transition-transform duration-200"
                  style={{ color: isCurrent ? accent : "rgba(243,233,214,0.3)" }}
                />
              ) : (
                <ChevronRight
                  className="h-3 w-3 shrink-0"
                  style={{ color: "rgba(243,233,214,0.25)" }}
                />
              )}
            </>
          )}
        </button>

        {/* ── Section items ──────────────────────────────────── */}
        {(isOpen || isCurrent || collapsed) && (
          <ul
            className={cn(
              "space-y-0.5 mt-0.5",
              !collapsed && "ps-2 border-s ms-[18px]"
            )}
            style={!collapsed ? {
              borderColor: `${accent}22`,
            } : undefined}
          >
            {section.items.map((item) => renderNavItem(item, accent))}
          </ul>
        )}
      </div>
    );
  };

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <aside
      className={cn(
        "h-full flex flex-col overflow-hidden",
        "text-[color:var(--sidebar-foreground)]",
        isRTL
          ? "border-l border-[color:var(--sidebar-border)]"
          : "border-r border-[color:var(--sidebar-border)]"
      )}
      style={{ background: "var(--sidebar)" }}
    >
      {/* ── Company Brand ──────────────────────────────────────────────────── */}
      <div
        className={cn(
          "shrink-0 px-3 pt-4 pb-3",
          collapsed && "px-2 pt-3 pb-2"
        )}
        style={{ borderBottom: "1px solid rgba(201,163,90,0.15)" }}
      >
        {/* Logo + company name row */}
        <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
          {/* Logo or fallback icon */}
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={company?.nameAr ?? ""}
              className={cn(
                "rounded-xl object-contain shrink-0",
                collapsed ? "w-9 h-9" : "w-11 h-11"
              )}
              style={{ boxShadow: "0 3px 10px rgba(0,0,0,0.35)" }}
            />
          ) : (
            <div
              className={cn(
                "rounded-xl flex items-center justify-center shrink-0",
                collapsed ? "w-9 h-9" : "w-11 h-11"
              )}
              style={{
                background: "linear-gradient(135deg, var(--gold-300), var(--gold-500))",
                boxShadow: "0 4px 12px rgba(201,163,90,0.3)",
              }}
            >
              <Sparkles className="h-4 w-4" style={{ color: "var(--brand-900)" }} />
            </div>
          )}

          {/* Company name */}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div
                className="text-[14px] font-bold truncate leading-snug"
                style={{ color: "rgba(243,233,214,0.97)" }}
              >
                {isRTL
                  ? (company?.nameAr ?? t("appName"))
                  : (company?.nameEn || company?.nameAr || t("appName"))}
              </div>
              {company?.nameEn && company?.nameAr && (
                <div
                  className="text-[10.5px] truncate leading-snug"
                  style={{ color: "rgba(243,233,214,0.45)" }}
                >
                  {isRTL ? (company.nameEn || "") : (company.nameAr || "")}
                </div>
              )}
              <div
                className="text-[9.5px] tracking-wide mt-0.5"
                style={{ color: "var(--gold-300)", opacity: 0.75 }}
              >
                {t("appSubtitle")}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="px-2.5 pt-2.5 pb-1.5 shrink-0">
          <div className="relative">
            <Search
              className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
              style={{
                color: "rgba(243,233,214,0.3)",
                [isRTL ? "right" : "left"]: "9px",
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("navSearchPlaceholder")}
              className="w-full rounded-lg py-1.5 text-[12px] bg-[rgba(255,255,255,0.05)] text-[rgba(243,233,214,0.85)] placeholder-[rgba(243,233,214,0.28)] focus:outline-none transition-all"
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                [isRTL ? "paddingRight" : "paddingLeft"]: "30px",
                [isRTL ? "paddingLeft" : "paddingRight"]: searchActive ? "28px" : "10px",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(201,163,90,0.4)")}
              onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
            />
            {searchActive && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80 transition-opacity"
                style={{ [isRTL ? "left" : "right"]: "8px" }}
              >
                <X className="h-3 w-3 text-[rgba(243,233,214,0.8)]" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2 space-y-0.5">

        {/* Search results */}
        {searchActive && (
          <div>
            <p className="px-2 pb-1 text-[10px] font-semibold tracking-widest uppercase text-[rgba(243,233,214,0.35)]">
              {searchResults.length} {isRTL ? "نتيجة" : "results"}
            </p>
            <ul className="space-y-0.5">
              {searchResults.length === 0 ? (
                <li className="px-3 py-2 text-[12px] text-[rgba(243,233,214,0.35)] text-center">
                  {isRTL ? "لا توجد نتائج" : "No results"}
                </li>
              ) : (
                searchResults.map((item) => renderNavItem(item))
              )}
            </ul>
          </div>
        )}

        {/* ── Quick Access ─────────────────────────────────────────────────── */}
        {!searchActive && (
          <div className="mb-2">
            {!collapsed && (
              <div
                className="flex items-center gap-1.5 px-2 pb-1.5 pt-0.5"
              >
                <Zap className="h-2.5 w-2.5 shrink-0" style={{ color: "var(--gold-400)" }} />
                <span className="text-[9.5px] font-bold tracking-[0.14em] uppercase select-none"
                  style={{ color: "rgba(243,233,214,0.38)" }}>
                  {t("navQuickAccess")}
                </span>
              </div>
            )}
            <ul className="space-y-0.5">
                {pinnedItems.map((item) => renderNavItem(item))}
            </ul>
          </div>
        )}

        {/* ── Sections divider ─────────────────────────────────────────────── */}
        {!searchActive && !collapsed && (
          <div
            className="mx-2 my-1"
            style={{ height: "1px", background: "rgba(201,163,90,0.12)" }}
          />
        )}

        {/* ── Sections ─────────────────────────────────────────────────────── */}
        {!searchActive && (
          <div className="space-y-0.5">
            {allSections.map(renderSection)}
          </div>
        )}
      </nav>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div
        className="px-2 py-2.5 shrink-0 space-y-1.5"
        style={{ borderTop: "1px solid rgba(201,163,90,0.12)" }}
      >
        {!collapsed && (
          <div className="px-2 pb-1 text-center text-[10px] text-[rgba(243,233,214,0.3)]">
            v1.0.0
          </div>
        )}
        <button
          onClick={handleLogout}
          title={t("logout")}
          className={cn(
            "w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] transition-all",
            "text-[rgba(243,233,214,0.45)] hover:text-red-300 hover:bg-red-900/20",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && <span>{t("logout")}</span>}
        </button>
      </div>
    </aside>
  );
}
