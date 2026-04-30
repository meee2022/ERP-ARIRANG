"use client";

import React, { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { AlertCircle, Mail, Lock, Loader2 } from "lucide-react";
import Image from "next/image";

const translations = {
  ar: {
    title: "Arirang Bakery",
    subtitle: "نظام محاسبة وتوزيع",
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
    title: "Arirang Bakery",
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
  const [logoError, setLogoError] = useState(false);

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

  const inputBase = "w-full h-11 rounded-xl border border-[color:var(--ink-200)] bg-white text-sm text-[color:var(--ink-900)] transition-all focus:outline-none focus:border-[color:var(--brand-500)] focus:ring-2 focus:ring-[color:var(--brand-500)]/20";

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
        <div className="surface-card rounded-2xl shadow-lg p-8 space-y-6">

          {/* Logo / Brand */}
          <div className="text-center space-y-3">
            {!logoError ? (
              <div className="flex justify-center">
                <Image
                  src="/logo.png"
                  alt="Arirang Bakery"
                  width={80}
                  height={80}
                  className="rounded-2xl object-contain shadow-md"
                  onError={() => setLogoError(true)}
                />
              </div>
            ) : (
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto shadow-md"
                style={{ background: "linear-gradient(135deg, var(--brand-700), var(--brand-500))" }}
              >
                <span className="text-white text-2xl font-bold">A</span>
              </div>
            )}
            <h1 className="text-2xl font-bold text-[color:var(--ink-900)] tracking-tight">{t.title}</h1>
            <p className="text-sm font-medium text-[color:var(--ink-500)]">{t.subtitle}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800">
                    {lang === "ar" ? "خطأ في تسجيل الدخول" : "Login Error"}
                  </p>
                  <p className="text-sm text-red-600 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[color:var(--ink-700)] mb-1.5">
                {t.email}
              </label>
              <div className="relative">
                <Mail className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10 ${isRTL ? "right-3" : "left-3"}`} />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${inputBase} ${isRTL ? "pr-10 pl-4" : "pl-10 pr-4"}`}
                  placeholder="admin@demo.local"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-[color:var(--ink-700)] mb-1.5">
                {t.password}
              </label>
              <div className="relative">
                <Lock className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10 ${isRTL ? "right-3" : "left-3"}`} />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputBase} ${isRTL ? "pr-10 pl-4" : "pl-10 pr-4"}`}
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary h-11 w-full rounded-xl text-sm font-semibold disabled:opacity-60 transition-opacity inline-flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.loading}
                </>
              ) : (
                t.submit
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
