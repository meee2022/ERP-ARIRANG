"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, BookOpen, FileText, Receipt, Users, User, Truck, Package, Smartphone,
  Landmark, Sparkles, CreditCard, FileCheck, Warehouse, SlidersHorizontal,
  ArrowLeftRight, Scale, ShoppingCart, LogOut, BarChart2, Shield, CheckCircle2,
  TrendingUp, PieChart, RotateCcw, CalendarDays, Archive, PackageOpen,
  Building2, Search, X, HardDrive, Zap, FlaskConical, ClipboardList, ChefHat,
  AlertTriangle, Trash2, CalendarCheck2, Barcode, Clock,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { TKey } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useCompanySettings } from "@/hooks/useCompanySettings";

// ─── Rail width constant (single source of truth) ────────────────────────────
const RAIL_W = 76;

// ─── Types ──────────────────────────────────────────────────────────────────────
type NavItem    = { href: string; icon: any; key: TKey };
type NavSection = {
  id: string;
  titleKey: TKey;
  labelAr: string;   // short Arabic label shown below icon
  labelEn: string;   // short English label shown below icon
  icon: any;
  color: string;
  items: NavItem[];
};

// ─── Navigation data ─────────────────────────────────────────────────────────
const SECTIONS: NavSection[] = [
  {
    id: "sales", titleKey: "navSales", labelAr: "مبيعات", labelEn: "Sales",
    icon: Landmark, color: "#34d399",
    items: [
      { href: "/sales/mobile",     icon: Smartphone,  key: "mobileSales"   },
      { href: "/sales/invoices",   icon: Landmark,    key: "salesInvoices" },
      { href: "/sales/review",     icon: CheckCircle2,key: "reviewQueue"   },
      { href: "/sales/returns",    icon: RotateCcw,   key: "salesReturns"  },
      { href: "/sales/customers",  icon: Users,       key: "customers"     },
      { href: "/sales/sales-reps", icon: User,        key: "salesReps"     },
      { href: "/sales/vehicles",   icon: Truck,       key: "vehicles"      },
    ],
  },
  {
    id: "purchases", titleKey: "navPurchases", labelAr: "مشتريات", labelEn: "Purchases",
    icon: ShoppingCart, color: "#60a5fa",
    items: [
      { href: "/purchases/invoices",            icon: ShoppingCart, key: "purchaseInvoices"   },
      { href: "/purchases/grn",                 icon: FileCheck,    key: "grn"                },
      { href: "/purchases/returns",             icon: RotateCcw,    key: "purchaseReturns"    },
      { href: "/purchases/suppliers",           icon: Truck,        key: "suppliers"          },
      { href: "/purchases/supplier-comparison", icon: Scale,        key: "supplierComparison" },
    ],
  },
  {
    id: "inventory", titleKey: "navInventory", labelAr: "مخزون", labelEn: "Inventory",
    icon: Package, color: "#fb923c",
    items: [
      { href: "/inventory/items",         icon: Package,           key: "items"              },
      { href: "/inventory/warehouses",    icon: Warehouse,         key: "warehouses"         },
      { href: "/inventory/opening-stock", icon: PackageOpen,       key: "openingStock"       },
      { href: "/inventory/adjustments",   icon: SlidersHorizontal, key: "stockAdjustments"   },
      { href: "/inventory/transfers",     icon: ArrowLeftRight,    key: "stockTransfers"     },
      { href: "/inventory/movements",     icon: RotateCcw,         key: "inventoryMovements" },
      { href: "/inventory/low-stock",     icon: AlertTriangle,     key: "lowStockAlerts"     },
      { href: "/inventory/wastage",       icon: Trash2,            key: "wastage"            },
    ],
  },
  {
    id: "production", titleKey: "navProduction", labelAr: "إنتاج", labelEn: "Production",
    icon: ChefHat, color: "#22d3ee",
    items: [
      { href: "/production",                 icon: LayoutDashboard, key: "productionDashboard" },
      { href: "/production/recipes",         icon: FlaskConical,    key: "recipes"             },
      { href: "/production/orders",          icon: ClipboardList,   key: "productionOrders"    },
      { href: "/production/recipe-costs",    icon: BarChart2,       key: "recipeCosts"         },
      { href: "/production/migrate-recipes", icon: HardDrive,       key: "migrateRecipes"      },
    ],
  },
  {
    id: "treasury", titleKey: "navTreasury", labelAr: "الخزينة", labelEn: "Treasury",
    icon: Receipt, color: "#a78bfa",
    items: [
      { href: "/treasury/receipts",       icon: Receipt,        key: "cashReceipts"  },
      { href: "/treasury/payments",       icon: CreditCard,     key: "cashPayments"  },
      { href: "/treasury/cheques",        icon: FileCheck,      key: "cheques"       },
      { href: "/treasury/bank-transfers", icon: ArrowLeftRight, key: "bankTransfers" },
      { href: "/treasury/bank-accounts",  icon: Landmark,       key: "bankAccounts"  },
    ],
  },
  {
    id: "finance", titleKey: "navFinance", labelAr: "محاسبة", labelEn: "Finance",
    icon: BookOpen, color: "#f472b6",
    items: [
      { href: "/finance/chart-of-accounts", icon: BookOpen, key: "chartOfAccounts" },
      { href: "/finance/journal-entries",   icon: FileText, key: "journalEntries"  },
    ],
  },
  {
    id: "hr", titleKey: "navHR", labelAr: "الموارد البشرية", labelEn: "HR",
    icon: Users, color: "#4ade80",
    items: [
      { href: "/hr",            icon: LayoutDashboard,   key: "hrDashboard"      },
      { href: "/hr/employees",  icon: Users,             key: "employeeRegister" },
      { href: "/hr/attendance", icon: CalendarDays,      key: "attendance"       },
      { href: "/hr/leave",      icon: FileCheck,         key: "leaveManagement"  },
      { href: "/hr/payroll",       icon: CreditCard,        key: "payroll"          },
      { href: "/hr/salary-sheet", icon: FileText,          key: "salarySheet"      },
      { href: "/hr/setup",        icon: SlidersHorizontal, key: "hrSetup"          },
    ],
  },
  {
    id: "fixed-assets", titleKey: "navFixedAssets", labelAr: "أصول ثابتة", labelEn: "Assets",
    icon: HardDrive, color: "#94a3b8",
    items: [
      { href: "/fixed-assets/register",     icon: HardDrive,  key: "assetRegister"    },
      { href: "/fixed-assets/depreciation", icon: TrendingUp, key: "depreciationRuns" },
    ],
  },
  {
    id: "reports", titleKey: "navReports", labelAr: "التقارير", labelEn: "Reports",
    icon: BarChart2, color: "#fbbf24",
    items: [
      { href: "/reports/vat-report",            icon: Receipt,      key: "vatReport"           },
      { href: "/reports/trial-balance",         icon: Scale,        key: "trialBalance"        },
      { href: "/reports/income-statement",      icon: TrendingUp,   key: "incomeStatement"     },
      { href: "/reports/balance-sheet",         icon: PieChart,     key: "balanceSheet"        },
      { href: "/reports/general-ledger",        icon: BookOpen,     key: "generalLedger"       },
      { href: "/reports/ar-aging",              icon: BarChart2,    key: "arAging"             },
      { href: "/reports/ap-aging",              icon: BarChart2,    key: "apAging"             },
      { href: "/reports/sales-report",          icon: TrendingUp,   key: "salesReport"         },
      { href: "/reports/sales-details",         icon: FileText,     key: "salesDetails"        },
      { href: "/reports/daily-sales",           icon: BarChart2,    key: "dailySales"          },
      { href: "/reports/item-sales",            icon: Package,      key: "itemSales"           },
      { href: "/reports/top-sales",             icon: TrendingUp,   key: "topSales"            },
      { href: "/reports/sales-by-sales-rep",    icon: User,         key: "salesBySalesRep"     },
      { href: "/reports/sales-by-vehicle",      icon: Truck,        key: "salesByVehicle"      },
      { href: "/reports/purchase-report",       icon: ShoppingCart, key: "purchaseReport"      },
      { href: "/reports/stock-valuation",       icon: PackageOpen,  key: "stockValuation"      },
      { href: "/reports/customer-statement",    icon: Users,        key: "customerStatement"   },
      { href: "/reports/supplier-statement",    icon: Truck,        key: "supplierStatement"   },
      { href: "/reports/cash-movement",         icon: CreditCard,   key: "cashMovementReport"  },
      { href: "/reports/cost-center-movement",  icon: BarChart2,    key: "costCenterMovement"  },
      { href: "/reports/cost-center-pl",        icon: PieChart,     key: "costCenterPL"        },
      { href: "/reports/asset-register",        icon: HardDrive,    key: "assetRegisterReport" },
      { href: "/reports/depreciation-schedule", icon: TrendingUp,   key: "depScheduleReport"   },
      { href: "/reports/asset-book-value",      icon: BarChart2,    key: "assetBookValueReport"},
      { href: "/reports/hr-employees",          icon: Users,        key: "employeeDirectoryReport" },
      { href: "/reports/hr-attendance",         icon: CalendarDays, key: "attendanceReport"    },
      { href: "/reports/hr-leave",              icon: FileCheck,    key: "leaveReport"         },
      { href: "/reports/hr-payroll",            icon: CreditCard,   key: "payrollReport"       },
      { href: "/reports/production-cost",       icon: ChefHat,      key: "productionCostReport"},
      { href: "/reports/route-sheet",            icon: Truck,        key: "routeSheet"           },
      { href: "/reports/inventory-aging",        icon: Clock,        key: "inventoryAging"       },
    ],
  },
  {
    id: "settings", titleKey: "navSettings", labelAr: "إعدادات", labelEn: "Settings",
    icon: Shield, color: "#64748b",
    items: [
      { href: "/settings/company",          icon: Building2,      key: "companySettings" },
      { href: "/settings/cost-centers",     icon: PieChart,       key: "costCenters"     },
      { href: "/settings/fiscal-years",     icon: CalendarDays,   key: "fiscalYears"     },
      { href: "/settings/month-end-close",  icon: CalendarCheck2, key: "monthEndClose"   },
      { href: "/settings/users",            icon: Users,          key: "userManagement"  },
      { href: "/settings/audit-log",        icon: Shield,         key: "auditLog"        },
      { href: "/settings/backup",           icon: HardDrive,      key: "backup"          },
      { href: "/settings/posting-rules",    icon: Zap,            key: "postingRules"    },
      { href: "/settings/reset-data",      icon: Trash2,         key: "resetTestData"   },
    ],
  },
  {
    id: "legacy", titleKey: "navLegacy", labelAr: "قديم", labelEn: "Legacy",
    icon: Archive, color: "#78716c",
    items: [
      { href: "/legacy/items",     icon: Archive, key: "legacyItems"     },
      { href: "/legacy/recipes",   icon: Archive, key: "legacyRecipes"   },
      { href: "/legacy/inventory", icon: Archive, key: "legacyInventory" },
      { href: "/legacy/pl",        icon: Archive, key: "legacyPL"        },
      { href: "/legacy/staff",     icon: Archive, key: "legacyStaff"     },
    ],
  },
];

// ─── Permission map ───────────────────────────────────────────────────────────
function itemModule(href: string): string | null {
  if (href.startsWith("/sales"))       return "sales";
  if (href.startsWith("/purchases"))   return "purchases";
  if (href.startsWith("/inventory"))   return "inventory";
  if (href.startsWith("/treasury"))    return "treasury";
  if (href.startsWith("/finance"))     return "finance";
  if (href.startsWith("/reports"))     return "reports";
  if (href.startsWith("/settings/users")) return "users";
  if (href.startsWith("/settings"))    return "settings";
  if (href.startsWith("/hr"))          return "hr";
  if (href.startsWith("/production"))  return "production";
  return null;
}

// ─── Floating Panel ───────────────────────────────────────────────────────────
function FloatingPanel({
  section, isRTL, onClose, isActive,
}: {
  section: NavSection;
  isRTL: boolean;
  onClose: () => void;
  isActive: (href: string) => boolean;
}) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch("");
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [section.id]);

  // Close on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Check if click was on the rail itself — let rail toggle handle it
        const rail = document.getElementById("nav-rail");
        if (rail?.contains(e.target as Node)) return;
        onClose();
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  const filtered = search.trim()
    ? section.items.filter((i) => t(i.key).toLowerCase().includes(search.toLowerCase()))
    : section.items;

  return (
    <div
      ref={panelRef}
      className="fixed inset-y-0 z-[60] flex flex-col shadow-2xl"
      style={{
        width: 236,
        [isRTL ? "right" : "left"]: RAIL_W,
        background: "var(--sidebar)",
        borderInlineStart: `1px solid rgba(255,255,255,0.06)`,
        animation: "panel-slide 0.18s ease-out",
      }}
    >
      {/* Panel header */}
      <div className="shrink-0 px-4 pt-5 pb-3"
        style={{ borderBottom: `1px solid ${section.color}20` }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${section.color}22`, border: `1px solid ${section.color}40` }}>
              <section.icon className="h-3.5 w-3.5" style={{ color: section.color }} />
            </div>
            <span className="text-[13px] font-bold" style={{ color: "rgba(243,233,214,0.95)" }}>
              {t(section.titleKey as TKey)}
            </span>
          </div>
          <button onClick={onClose}
            className="h-6 w-6 rounded-md flex items-center justify-center opacity-40 hover:opacity-80 transition-opacity"
            style={{ background: "rgba(255,255,255,0.06)" }}>
            <X className="h-3.5 w-3.5 text-[rgba(243,233,214,0.8)]" />
          </button>
        </div>

        {/* Search inside panel */}
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none opacity-40"
            style={{ [isRTL ? "right" : "left"]: 8, color: "rgba(243,233,214,0.8)" }} />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("navSearchPlaceholder")}
            className="w-full rounded-lg py-1.5 text-[11.5px] bg-[rgba(255,255,255,0.05)] text-[rgba(243,233,214,0.85)] placeholder-[rgba(243,233,214,0.28)] focus:outline-none"
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              [isRTL ? "paddingRight" : "paddingLeft"]: 26,
              [isRTL ? "paddingLeft" : "paddingRight"]: 10,
            }}
          />
        </div>
      </div>

      {/* Items */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 custom-scrollbar">
        {filtered.length === 0 ? (
          <p className="text-center text-[11px] text-[rgba(243,233,214,0.3)] py-6">
            {t("noResults" as TKey)}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-all duration-100 group"
                    style={
                      active
                        ? {
                            background: `${section.color}15`,
                            color: "rgba(243,233,214,0.97)",
                            boxShadow: `inset ${isRTL ? "-" : ""}2px 0 0 ${section.color}`,
                          }
                        : {
                            color: "rgba(243,233,214,0.6)",
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                        (e.currentTarget as HTMLElement).style.color = "rgba(243,233,214,0.92)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = "";
                        (e.currentTarget as HTMLElement).style.color = "rgba(243,233,214,0.6)";
                      }
                    }}
                  >
                    <item.icon
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: active ? section.color : "rgba(243,233,214,0.4)" }}
                    />
                    <span className="flex-1 truncate">{t(item.key)}</span>
                    {active && (
                      <span className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ background: section.color }} />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      {/* Item count footer */}
      <div className="shrink-0 px-4 py-2 text-[10px]"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: "rgba(243,233,214,0.25)" }}>
        {section.items.length} {t("navQuickAccess" as TKey) ? "صفحة" : "pages"}
      </div>
    </div>
  );
}

// ─── Rail Icon Button — icon + label always visible ──────────────────────────
function RailBtn({
  icon: Icon, label, color, active, onClick,
}: {
  icon: any; label: string; color: string;
  active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center justify-center gap-1 rounded-xl transition-all duration-150 group"
      style={{
        width: RAIL_W - 8,   // 68px — 4px padding each side
        paddingTop: 8,
        paddingBottom: 8,
        background: active ? `${color}1e` : "transparent",
        boxShadow: active ? `0 0 0 1px ${color}38` : "none",
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {/* Icon */}
      <Icon
        className="h-[18px] w-[18px] shrink-0 transition-transform duration-150 group-hover:scale-110"
        style={{ color: active ? color : "rgba(243,233,214,0.5)" }}
      />
      {/* Label — always shown */}
      <span
        className="text-center leading-tight font-medium select-none"
        style={{
          fontSize: 9.5,
          color: active ? color : "rgba(243,233,214,0.38)",
          maxWidth: RAIL_W - 10,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {label}
      </span>
    </button>
  );
}

// ─── Main Sidebar ──────────────────────────────────────────────────────────────
export function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { t, isRTL }              = useI18n();
  const setSidebarOpen            = useAppStore((s) => s.setSidebarOpen);
  const { currentUser, logout }   = useAuth();
  const { isAdmin, canView }      = usePermissions();
  const { company, logoUrl }      = useCompanySettings();

  const [openSection, setOpenSection] = useState<string | null>(null);

  const isActive = useCallback(
    (href: string) =>
      href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"),
    [pathname]
  );

  // Filter sections by permissions
  const visibleSections = useMemo(() => {
    const base = isAdmin
      ? SECTIONS
      : SECTIONS.filter((s) => s.id !== "settings" && s.id !== "legacy");

    return base
      .map((s) => ({
        ...s,
        items: s.items.filter((item) => {
          const mod = itemModule(item.href);
          if (!mod) return isAdmin;
          return canView(mod as any);
        }),
      }))
      .filter((s) => s.items.length > 0);
  }, [isAdmin, canView]);

  // Which section is currently active (by pathname)
  const activeSectionId = useMemo(() => {
    return (
      visibleSections.find((s) => s.items.some((i) => isActive(i.href)))?.id ?? null
    );
  }, [pathname, visibleSections, isActive]);

  // Close panel on navigation
  useEffect(() => {
    setOpenSection(null);
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  // Close panel on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenSection(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleLogout = async () => {
    setOpenSection(null);
    await logout();
    router.replace("/login");
  };

  const toggleSection = (id: string) => {
    setOpenSection((prev) => (prev === id ? null : id));
  };

  const openSectionData = visibleSections.find((s) => s.id === openSection) ?? null;

  // User initials
  const initials = useMemo(() => {
    const name = currentUser?.name ?? currentUser?.email ?? "U";
    return name.slice(0, 2).toUpperCase();
  }, [currentUser]);

  return (
    <>
      {/* ── Keyframe animation ─────────────────────────────────────────── */}
      <style>{`
        @keyframes panel-slide {
          from { opacity: 0; transform: translateX(${isRTL ? "12px" : "-12px"}); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* ── Overlay when panel open (mobile only) ─────────────────────── */}
      {openSection && (
        <div
          className="fixed inset-0 z-[55] lg:hidden"
          onClick={() => setOpenSection(null)}
        />
      )}

      {/* ── Icon Rail ──────────────────────────────────────────────────── */}
      <aside
        id="nav-rail"
        className="h-full flex flex-col items-center py-3 gap-1"
        style={{
          width: RAIL_W,
          background: "var(--sidebar)",
          borderInlineEnd: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* ── Logo ─────────────────────────────────────────────────────── */}
        <Link href="/" className="mb-2 shrink-0 block">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={company?.nameAr ?? ""}
              className="w-9 h-9 rounded-xl object-contain"
              style={{ boxShadow: "0 3px 10px rgba(0,0,0,0.4)" }}
            />
          ) : (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg,var(--gold-300),var(--gold-500))",
                boxShadow: "0 4px 12px rgba(201,163,90,0.3)",
              }}
            >
              <Sparkles className="h-4 w-4" style={{ color: "var(--brand-900)" }} />
            </div>
          )}
        </Link>

        {/* ── Dashboard (direct link) ───────────────────────────────────── */}
        <Link
          href="/"
          title={t("dashboard")}
          className="relative flex flex-col items-center justify-center gap-1 rounded-xl transition-all duration-150 group"
          style={{
            width: RAIL_W - 8,
            paddingTop: 8,
            paddingBottom: 8,
            ...(isActive("/")
              ? { background: "#ffffff14", boxShadow: "0 0 0 1px rgba(255,255,255,0.15)" }
              : { background: "transparent" }),
          }}
          onMouseEnter={(e) => {
            if (!isActive("/")) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
          }}
          onMouseLeave={(e) => {
            if (!isActive("/")) (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <LayoutDashboard
            className="h-[18px] w-[18px] group-hover:scale-110 transition-transform"
            style={{ color: isActive("/") ? "rgba(243,233,214,0.97)" : "rgba(243,233,214,0.5)" }}
          />
          <span
            className="leading-tight font-medium select-none text-center"
            style={{
              fontSize: 9.5,
              color: isActive("/") ? "rgba(243,233,214,0.95)" : "rgba(243,233,214,0.38)",
            }}
          >
            {isRTL ? "الرئيسية" : "Home"}
          </span>
        </Link>

        {/* ── Thin divider ─────────────────────────────────────────────── */}
        <div className="w-8 h-px my-1 rounded-full shrink-0"
          style={{ background: "rgba(255,255,255,0.08)" }} />

        {/* ── Section icons ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center gap-1 overflow-hidden">
          {visibleSections.map((section) => {
            const isCurrent  = section.id === activeSectionId;
            const isOpen     = section.id === openSection;
            return (
              <RailBtn
                key={section.id}
                icon={section.icon}
                label={isRTL ? section.labelAr : section.labelEn}
                color={section.color}
                active={isCurrent || isOpen}
                onClick={() => toggleSection(section.id)}
              />
            );
          })}
        </div>

        {/* ── Footer: user avatar + logout ─────────────────────────────── */}
        <div className="shrink-0 flex flex-col items-center gap-2 mt-1">
          <div className="w-8 h-px rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />

          {/* User avatar */}
          <div
            title={currentUser?.email ?? ""}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-bold select-none"
            style={{
              background: "rgba(255,255,255,0.08)",
              color: "rgba(243,233,214,0.75)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {initials}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title={t("logout")}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-red-900/30 group"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <LogOut className="h-4 w-4 text-[rgba(243,233,214,0.35)] group-hover:text-red-400 transition-colors" />
          </button>
        </div>
      </aside>

      {/* ── Floating Panel ─────────────────────────────────────────────── */}
      {openSection && openSectionData && (
        <FloatingPanel
          section={openSectionData}
          isRTL={isRTL}
          onClose={() => setOpenSection(null)}
          isActive={isActive}
        />
      )}
    </>
  );
}
