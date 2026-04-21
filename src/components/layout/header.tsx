"use client";

import { Bell, Globe, Menu, Search, User } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useI18n } from "@/hooks/useI18n";
import { BranchPicker } from "./BranchPicker";
import { PeriodBadge } from "./PeriodBadge";

export function Header() {
  const { t, lang, toggleLanguage, isRTL } = useI18n();
  const toggleSidebarCollapsed = useAppStore((s) => s.toggleSidebarCollapsed);

  return (
    <header
      className="h-16 flex items-center gap-3 px-5 bg-white/90 backdrop-blur-sm border-b border-[color:var(--ink-200)]"
      style={{ boxShadow: "0 1px 2px rgba(26,19,22,0.04)" }}
    >
      {/* Sidebar toggle */}
      <button
        type="button"
        aria-label={t("toggleSidebar")}
        onClick={toggleSidebarCollapsed}
        className="h-9 w-9 rounded-lg flex items-center justify-center text-[color:var(--ink-600)] hover:text-[color:var(--brand-700)] hover:bg-[color:var(--ink-50)] transition-colors"
      >
        <Menu className="h-[18px] w-[18px]" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search
            className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--ink-400)] ${
              isRTL ? "right-3" : "left-3"
            }`}
          />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            className={`w-full h-9 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} rounded-lg bg-[color:var(--ink-50)] border border-transparent hover:border-[color:var(--ink-200)] focus:bg-white focus:border-[color:var(--brand-400)] focus:ring-2 focus:ring-[color:var(--brand-500)]/15 outline-none text-sm transition`}
          />
        </div>
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

        {/* Notifications */}
        <button
          type="button"
          aria-label={t("notifications")}
          className="relative h-9 w-9 rounded-lg flex items-center justify-center text-[color:var(--ink-600)] hover:text-[color:var(--brand-700)] hover:bg-[color:var(--ink-50)] transition-colors"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span
            className="absolute top-2 end-2 h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--brand-600)" }}
          />
        </button>

        {/* Profile */}
        <div className="ms-2 flex items-center gap-2.5 ps-2 border-s border-[color:var(--ink-200)]">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm"
            style={{
              background: "linear-gradient(135deg, var(--brand-600), var(--brand-800))",
            }}
          >
            <User className="h-4 w-4" />
          </div>
          <div className="hidden md:block leading-tight">
            <div className="text-[13px] font-semibold text-[color:var(--ink-900)]">
              {t("adminUser")}
            </div>
            <div className="text-[11px] text-[color:var(--ink-500)]">admin@demo.local</div>
          </div>
        </div>
      </div>
    </header>
  );
}
