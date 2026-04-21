"use client";
import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

/**
 * Mounts on the client and keeps <html lang="…" dir="…"> in sync with the
 * current language from the Zustand store. Must be rendered once inside
 * the root layout under ClientProviders.
 */
export default function LanguageSync() {
  const language = useAppStore((s) => s.language);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = language;
    html.dir = language === "ar" ? "rtl" : "ltr";
    html.dataset.lang = language;
  }, [language]);

  return null;
}
