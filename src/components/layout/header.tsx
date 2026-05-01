"use client";

import {
  Bell, Globe, LogOut, Menu, Search, User, FileText, Receipt,
  CreditCard, ShoppingCart, FileCheck, CalendarDays, Package,
  Shield, ShieldAlert, X, AlertTriangle,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useI18n } from "@/hooks/useI18n";
import { BranchPicker } from "./BranchPicker";
import { PeriodBadge } from "./PeriodBadge";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

// ── Search result icons ───────────────────────────────────────────────────────
const TYPE_ICON: Record<string, React.ReactNode> = {
  salesInvoice:    <FileText className="w-4 h-4 text-blue-500" />,
  receipt:         <Receipt className="w-4 h-4 text-green-500" />,
  payment:         <CreditCard className="w-4 h-4 text-orange-500" />,
  purchaseInvoice: <ShoppingCart className="w-4 h-4 text-purple-500" />,
  customer:        <User className="w-4 h-4 text-indigo-500" />,
};
const BADGE_COLOR: Record<string, string> = {
  salesInvoice:    "bg-blue-100 text-blue-700",
  receipt:         "bg-green-100 text-green-700",
  payment:         "bg-orange-100 text-orange-700",
  purchaseInvoice: "bg-purple-100 text-purple-700",
  customer:        "bg-indigo-100 text-indigo-700",
};

// ── Notification icon map ─────────────────────────────────────────────────────
const NOTIF_ICON: Record<string, React.ReactNode> = {
  fileCheck:   <FileCheck  className="h-4 w-4" />,
  creditCard:  <CreditCard className="h-4 w-4" />,
  calendar:    <CalendarDays className="h-4 w-4" />,
  package:     <Package    className="h-4 w-4" />,
  shield:      <Shield     className="h-4 w-4" />,
  shieldAlert: <ShieldAlert className="h-4 w-4" />,
};
const NOTIF_COLORS: Record<"critical" | "warning" | "info", { icon: string; badge: string; dot: string }> = {
  critical: { icon: "bg-red-50 text-red-600",    badge: "bg-red-100 text-red-700",    dot: "bg-red-500"    },
  warning:  { icon: "bg-amber-50 text-amber-600", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  info:     { icon: "bg-blue-50 text-blue-600",   badge: "bg-blue-100 text-blue-700",  dot: "bg-blue-500"  },
};

// ── Notification Bell ─────────────────────────────────────────────────────────
function NotificationBell({ companyId, isRTL }: { companyId: any; isRTL: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const notifications = useQuery(
    api.notifications.getNotifications,
    companyId ? { companyId } : "skip"
  ) ?? [];

  const totalCount   = notifications.reduce((s, n) => s + n.count, 0);
  const criticalCount = notifications.filter((n) => n.severity === "critical").reduce((s, n) => s + n.count, 0);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative h-9 w-9 rounded-lg flex items-center justify-center text-[color:var(--ink-600)] hover:text-[color:var(--brand-700)] hover:bg-[color:var(--ink-50)] transition-colors"
      >
        <Bell className="h-[18px] w-[18px]" />
        {totalCount > 0 && (
          <span
            className={`absolute top-1 end-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5 ${criticalCount > 0 ? "bg-red-500" : "bg-amber-500"}`}
          >
            {totalCount > 99 ? "99+" : totalCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={`absolute top-full mt-2 w-80 bg-white border border-[color:var(--ink-200)] rounded-2xl shadow-xl z-[200] overflow-hidden ${isRTL ? "left-0" : "right-0"}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--ink-100)]">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[color:var(--brand-700)]" />
              <span className="font-bold text-[13px] text-[color:var(--ink-900)]">
                {isRTL ? "التنبيهات" : "Notifications"}
              </span>
              {totalCount > 0 && (
                <span className="bg-[color:var(--brand-50)] text-[color:var(--brand-700)] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {totalCount}
                </span>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-[color:var(--ink-100)] transition-colors">
              <X className="h-3.5 w-3.5 text-[color:var(--ink-400)]" />
            </button>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-[color:var(--ink-50)]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="h-10 w-10 rounded-full bg-[color:var(--ink-50)] flex items-center justify-center">
                  <Bell className="h-5 w-5 text-[color:var(--ink-300)]" />
                </div>
                <p className="text-[12px] text-[color:var(--ink-400)]">
                  {isRTL ? "لا توجد تنبيهات" : "No notifications"}
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const colors = NOTIF_COLORS[n.severity];
                return (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3.5 hover:bg-[color:var(--ink-50)] transition-colors group"
                  >
                    {/* Icon */}
                    <span className={`mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${colors.icon}`}>
                      {NOTIF_ICON[n.icon] ?? <AlertTriangle className="h-4 w-4" />}
                    </span>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[12.5px] font-semibold text-[color:var(--ink-900)] leading-tight">
                          {isRTL ? n.titleAr : n.titleEn}
                        </p>
                        <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${colors.badge}`}>
                          {n.count}
                        </span>
                      </div>
                      <p className="text-[11px] text-[color:var(--ink-400)] mt-0.5 leading-snug">
                        {isRTL ? n.bodyAr : n.bodyEn}
                      </p>
                    </div>

                    {/* Dot */}
                    <span className={`mt-2 h-2 w-2 rounded-full shrink-0 ${colors.dot}`} />
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-[color:var(--ink-100)] bg-[color:var(--ink-50)]">
              <p className="text-[10.5px] text-[color:var(--ink-400)] text-center">
                {isRTL
                  ? "انقر على أي تنبيه للانتقال إلى الصفحة المعنية"
                  : "Click any notification to navigate to the relevant page"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Header ───────────────────────────────────────────────────────────────
export function Header() {
  const { t, lang, toggleLanguage, isRTL } = useI18n();
  const { currentUser, logout } = useAuth();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);
  const wrapperRef        = useRef<HTMLDivElement>(null);

  const results = useQuery(
    api.search.globalSearch,
    currentUser?.companyId && query.trim().length >= 2
      ? { companyId: currentUser.companyId as any, q: query }
      : "skip"
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const handleSelect = (href: string) => {
    setQuery("");
    setOpen(false);
    router.push(href);
  };

  const placeholder = lang === "ar"
    ? "ابحث برقم الفاتورة أو السند أو العميل..."
    : "Search by invoice #, voucher #, customer...";

  return (
    <header
      className="h-16 flex items-center gap-3 px-5 bg-white/90 backdrop-blur-sm border-b border-[color:var(--ink-200)]"
      style={{ boxShadow: "0 1px 2px rgba(26,19,22,0.04)" }}
    >
      {/* Sidebar toggle — desktop only */}
      <button
        type="button"
        aria-label={t("toggleSidebar")}
        onClick={() => useAppStore.getState().toggleSidebar()}
        className="hidden lg:flex h-9 w-9 rounded-lg items-center justify-center text-[color:var(--ink-600)] hover:text-[color:var(--brand-700)] hover:bg-[color:var(--ink-50)] transition-colors"
      >
        <Menu className="h-[18px] w-[18px]" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-xl relative" ref={wrapperRef}>
        <div className="relative">
          <Search
            className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--ink-400)] ${
              isRTL ? "right-3" : "left-3"
            }`}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => query.length >= 2 && setOpen(true)}
            placeholder={placeholder}
            className={`w-full h-9 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} rounded-lg bg-[color:var(--ink-50)] border border-transparent hover:border-[color:var(--ink-200)] focus:bg-white focus:border-[color:var(--brand-400)] focus:ring-2 focus:ring-[color:var(--brand-500)]/15 outline-none text-sm transition`}
          />
        </div>

        {/* Search results dropdown */}
        {open && query.trim().length >= 2 && (
          <div className="absolute top-full mt-1 w-full bg-white border border-[color:var(--ink-200)] rounded-xl shadow-lg z-50 overflow-hidden">
            {results === undefined ? (
              <div className="px-4 py-3 text-sm text-[color:var(--ink-400)]">
                {lang === "ar" ? "جارٍ البحث..." : "Searching..."}
              </div>
            ) : results.length === 0 ? (
              <div className="px-4 py-3 text-sm text-[color:var(--ink-400)]">
                {lang === "ar" ? "لا توجد نتائج" : "No results found"}
              </div>
            ) : (
              <ul>
                {results.map((r, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => handleSelect(r.href)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[color:var(--ink-50)] transition-colors text-start"
                    >
                      <span className="shrink-0">{TYPE_ICON[r.type] ?? <FileText className="w-4 h-4" />}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-sm text-[color:var(--ink-900)] truncate">{r.label}</span>
                        {r.sub && <span className="block text-xs text-[color:var(--ink-400)] truncate">{r.sub}</span>}
                      </span>
                      <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${BADGE_COLOR[r.type] ?? "bg-gray-100 text-gray-600"}`}>
                        {r.badge}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Branch Picker */}
      <BranchPicker />

      {/* Period Badge */}
      <PeriodBadge />

      <div className="flex items-center gap-1.5">
        {/* Language */}
        <button
          type="button"
          onClick={toggleLanguage}
          title={t("toggleLanguage")}
          className="h-9 px-3 rounded-lg flex items-center gap-1.5 text-sm font-semibold text-[color:var(--brand-700)] hover:bg-[color:var(--brand-50)] border border-[color:var(--ink-200)] transition-colors"
        >
          <Globe className="h-4 w-4" />
          <span className="tracking-wide">{lang === "ar" ? "EN" : "عربي"}</span>
        </button>

        {/* Notification Bell */}
        <NotificationBell companyId={currentUser?.companyId} isRTL={isRTL} />

        {/* Profile */}
        <div className="ms-2 flex items-center gap-2.5 ps-2 border-s border-[color:var(--ink-200)]">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm"
            style={{ background: "linear-gradient(135deg, var(--brand-600), var(--brand-800))" }}
          >
            {currentUser?.name ? (
              <span className="uppercase">{currentUser.name.charAt(0)}</span>
            ) : (
              <User className="h-4 w-4" />
            )}
          </div>
          <div className="hidden md:block leading-tight">
            <div className="text-[13px] font-semibold text-[color:var(--ink-900)]">
              {currentUser?.name || t("adminUser")}
            </div>
            <div className="text-[11px] text-[color:var(--ink-500)]">
              {currentUser?.email || ""}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title={t("logout")}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-[color:var(--ink-500)] hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
}
