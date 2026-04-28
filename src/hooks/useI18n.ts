"use client";
import { useCallback, useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import {
  translations,
  formatCurrency as fmtCur,
  formatNumber as fmtNum,
  formatDate as fmtDate,
  type Language,
  type TKey,
} from "@/lib/i18n";

/**
 * Central i18n hook — returns translator, current language, direction helpers,
 * and locale-aware formatters (defaults to QAR currency).
 */
export function useI18n() {
  const language = useAppStore((s) => s.language) as Language;
  const toggleLanguage = useAppStore((s) => s.toggleLanguage);

  const t = useCallback(
    (key: TKey, fallback?: string): string => {
      const entry = translations[key] as { ar: string; en: string } | undefined;
      if (!entry) return fallback ?? key;
      return entry[language] ?? entry.ar ?? fallback ?? key;
    },
    [language]
  );

  const formatCurrency = useCallback(
    (v: number | null | undefined, opts?: { currency?: string; compact?: boolean }) =>
      fmtCur(v, language, opts),
    [language]
  );

  const formatNumber = useCallback(
    (v: number | null | undefined) => fmtNum(v ?? 0, language),
    [language]
  );

  const formatDate = useCallback(
    (v: string | number | Date) => fmtDate(typeof v === "number" ? new Date(v) : v, language),
    [language]
  );

  return useMemo(
    () => ({
      t,
      lang: language,
      isRTL: language === "ar",
      dir: language === "ar" ? ("rtl" as const) : ("ltr" as const),
      toggleLanguage,
      formatCurrency,
      formatNumber,
      formatDate,
    }),
    [t, language, toggleLanguage, formatCurrency, formatNumber, formatDate]
  );
}
