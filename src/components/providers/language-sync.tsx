"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

/**
 * LanguageSync — runs client-side only.
 * Reads language from persisted Zustand store and applies
 * lang + dir attributes to <html> so RTL/LTR works everywhere.
 *
 * Must be rendered inside ConvexClientProvider (not in server layout).
 */
export function LanguageSync() {
  const language = useAppStore((s) => s.language);

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("lang", language === "ar" ? "ar" : "en");
    html.setAttribute("dir", language === "ar" ? "rtl" : "ltr");

    // Switch font family: Tajawal for AR, Inter for EN
    if (language === "ar") {
      html.style.fontFamily = "'Tajawal', sans-serif";
    } else {
      html.style.fontFamily = "'Inter', sans-serif";
    }
  }, [language]);

  return null; // renders nothing — side-effect only
}
