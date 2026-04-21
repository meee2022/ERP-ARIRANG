"use client";

import React, { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";

const translations = {
  ar: {
    title: "PrimeBalance ERP",
    subtitle: "نظام محاسبي وتوزيع",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    submit: "دخول",
    loading: "جارٍ التحقق...",
    error: {
      empty: "يرجى إدخال البريد الإلكتروني وكلمة المرور",
      invalid: "بيانات الدخول غير صحيحة",
      inactive: "الحساب معطّل، تواصل مع المدير",
      network: "خطأ في الاتصال، حاول مرة أخرى",
    },
    switchLang: "English",
  },
  en: {
    title: "PrimeBalance ERP",
    subtitle: "Accounting & Distribution ERP",
    email: "Email Address",
    password: "Password",
    submit: "Sign In",
    loading: "Verifying...",
    error: {
      empty: "Please enter your email and password",
      invalid: "Invalid credentials",
      inactive: "Account is inactive, contact admin",
      network: "Connection error, please try again",
    },
    switchLang: "عربي",
  },
} as const;

type Lang = "ar" | "en";

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const { language, toggleLanguage } = useAppStore();
  const router = useRouter();
  const lang: Lang = language as Lang;
  const t = translations[lang];
  const isRTL = lang === "ar";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already authenticated → redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError(t.error.empty);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(email.trim(), password);
      router.replace("/");
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      if (msg.includes("inactive")) {
        setError(t.error.inactive);
      } else if (msg.includes("Invalid") || msg.includes("credentials")) {
        setError(t.error.invalid);
      } else {
        setError(t.error.network);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, var(--brand-50) 0%, #ffffff 60%, var(--brand-100) 100%)" }}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Language toggle */}
      <button
        onClick={toggleLanguage}
        className="fixed top-5 end-5 h-9 px-4 rounded-lg text-sm font-medium border border-[color:var(--ink-200)] text-[color:var(--ink-600)] hover:bg-[color:var(--ink-50)] transition-colors bg-white"
      >
        {t.switchLang}
      </button>

      <div className="w-full max-w-sm mx-4">
        {/* Card */}
        <div className="surface-card rounded-2xl shadow-lg p-8 space-y-6">
          {/* Logo / Brand */}
          <div className="text-center space-y-2">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto shadow-md"
              style={{ background: "linear-gradient(135deg, var(--brand-700), var(--brand-500))" }}
            >
              <span className="text-white text-2xl font-bold">P</span>
            </div>
            <h1 className="text-2xl font-bold text-[color:var(--ink-900)] tracking-tight">{t.title}</h1>
            <p className="text-sm font-medium text-[color:var(--ink-500)]">{t.subtitle}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 text-center">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[color:var(--ink-700)] mb-1.5">
                {t.email}
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field h-11 w-full text-sm"
                placeholder={lang === "ar" ? "admin@demo.local" : "admin@demo.local"}
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-[color:var(--ink-700)] mb-1.5">
                {t.password}
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field h-11 w-full text-sm"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary h-11 w-full rounded-xl text-sm font-semibold disabled:opacity-60 transition-opacity"
            >
              {loading ? t.loading : t.submit}
            </button>
          </form>

          {/* Dev hint */}
          <p className="text-center text-xs text-[color:var(--ink-400)]">
            {lang === "ar" ? "للاختبار: admin@demo.local / admin123" : "Test: admin@demo.local / admin123"}
          </p>
        </div>
      </div>
    </div>
  );
}
