"use client";

import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import {
  Building2, Save, Upload, X, Image as ImageIcon, Phone,
  Mail, MapPin, Hash, AlertCircle, CheckCircle2, Database,
} from "lucide-react";

export default function CompanySettingsPage() {
  const { t, isRTL, lang } = useI18n();
  const { currentUser } = useAuth();
  const company = useQuery(api.company.getCompany, currentUser ? { userId: currentUser._id as any } : "skip");
  const updateCompany = useMutation(api.company.updateCompany);
  const generateUploadUrl = useMutation(api.company.generateLogoUploadUrl);
  const saveLogoUrl = useMutation(api.company.saveLogoUrl);
  const removeLogo = useMutation(api.company.removeLogo);
  const seedInitialData = useMutation(api.seed.seedInitialData);
  const ensureMinimalSetup = useMutation(api.seed.ensureMinimalSetup);
  const defaultCurrency = useQuery(api.helpers.getDefaultCurrency, {});

  const [seeding, setSeeding] = useState(false);
  const [seedDone, setSeedDone] = useState(false);

  async function handleSeed() {
    setSeeding(true);
    try {
      const result = await ensureMinimalSetup({});
      setSeedDone(true);
      alert((result as any)?.message ?? "تم الإعداد بنجاح");
      window.location.reload();
    } catch (e: any) {
      alert(isRTL ? `خطأ: ${e.message}` : `Error: ${e.message}`);
    } finally {
      setSeeding(false);
    }
  }

  /* ── local form state ──────────────────────────────────────── */
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── logo state ─────────────────────────────────────────────── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  /* ── seed form from DB ──────────────────────────────────────── */
  useEffect(() => {
    if (company) {
      setNameAr(company.nameAr ?? "");
      setNameEn(company.nameEn ?? "");
      setAddress(company.address ?? "");
      setPhone(company.phone ?? "");
      setEmail(company.email ?? "");
      setTaxNumber(company.taxNumber ?? "");
      setLogoPreview(company.logoUrl ?? null);
    }
  }, [company]);

  if (company === undefined) {
    return (
      <div className="space-y-5">
        <PageHeader icon={Building2} title={t("companySettings")} />
        <LoadingState label={t("loading")} />
      </div>
    );
  }

  if (company === null) {
    return (
      <div className="space-y-5">
        <PageHeader icon={Building2} title={t("companySettings")} />
        <div className="surface-card p-8 text-center text-[color:var(--ink-400)] text-sm">
          {t("noCompanyFound")}
        </div>
      </div>
    );
  }

  /* ── handlers ───────────────────────────────────────────────── */
  async function handleSave() {
    if (!company) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await updateCompany({
        companyId: company._id,
        userId: currentUser!._id as any,
        nameAr: nameAr.trim() || undefined,
        nameEn: nameEn.trim() || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        taxNumber: taxNumber.trim() || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoFile(file: File) {
    if (!company) return;
    if (!file.type.startsWith("image/")) {
      setLogoError(t("invalidImageType"));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError(t("imageTooLarge"));
      return;
    }
    setLogoError(null);
    setLogoUploading(true);
    try {
      // 1. Preview locally
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      // 2. Upload to Convex storage
      const uploadUrl: string = await generateUploadUrl({ userId: currentUser!._id as any });
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = await res.json();

      // 3. Persist the URL on the company record
      const url = await saveLogoUrl({ companyId: company._id, userId: currentUser!._id as any, storageId });
      setLogoPreview(url);
    } catch (e: any) {
      setLogoError(e?.message ?? "Upload failed");
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleRemoveLogo() {
    if (!company) return;
    setLogoPreview(null);
    await removeLogo({ companyId: company._id, userId: currentUser!._id as any });
  }

  /* ── render ─────────────────────────────────────────────────── */
  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>

      {/* ── No-currency warning banner ─────────────────────────── */}
      {defaultCurrency === null && (
        <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              {isRTL ? "لم يتم تهيئة النظام بعد" : "System not initialized"}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {isRTL
                ? "لا توجد عملة افتراضية. اضغط على الزر لإنشاء البيانات الأساسية (عملة QAR، فرع، دليل حسابات)."
                : "No default currency found. Click to initialize base data (QAR currency, branch, chart of accounts)."}
            </p>
          </div>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            <Database className="h-3.5 w-3.5" />
            {seeding
              ? (isRTL ? "جارٍ التهيئة…" : "Initializing…")
              : (isRTL ? "تهيئة النظام" : "Initialize System")}
          </button>
        </div>
      )}

      <div className="no-print">
        <PageHeader
          icon={Building2}
          title={t("companySettings")}
          subtitle={t("companySettingsDesc")}
          actions={
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary h-10 px-5 rounded-lg inline-flex items-center gap-2 text-sm font-semibold disabled:opacity-60"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : saved ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? t("saving") : saved ? t("saved") : t("save")}
            </button>
          }
        />
      </div>

      {error && (
        <div className="surface-card p-4 border-red-300 bg-red-50 flex items-center gap-3 text-red-700 text-sm rounded-xl">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Logo Card ─────────────────────────────────────────── */}
        <div className="surface-card p-6 flex flex-col items-center gap-5 rounded-xl lg:col-span-1">
          <h2 className="section-title w-full">{t("companyLogo")}</h2>

          {/* Logo preview */}
          <div
            className="w-36 h-36 rounded-2xl border-2 border-dashed border-[color:var(--ink-300)] flex items-center justify-center overflow-hidden bg-[color:var(--ink-50)] relative"
            onClick={() => fileInputRef.current?.click()}
            style={{ cursor: "pointer" }}
          >
            {logoUploading ? (
              <div className="w-8 h-8 border-2 border-[color:var(--brand-600)] border-t-transparent rounded-full animate-spin" />
            ) : logoPreview ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoPreview}
                alt="logo"
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-[color:var(--ink-400)]">
                <ImageIcon className="h-10 w-10 opacity-40" />
                <span className="text-xs text-center px-2">{t("clickToUploadLogo")}</span>
              </div>
            )}
          </div>

          {logoError && (
            <p className="text-xs text-red-600 text-center">{logoError}</p>
          )}

          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={logoUploading}
              className="btn-secondary flex-1 h-9 rounded-lg text-sm inline-flex items-center justify-center gap-2"
            >
              <Upload className="h-4 w-4" /> {t("uploadLogo")}
            </button>
            {logoPreview && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="h-9 w-9 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <p className="text-[11px] text-[color:var(--ink-400)] text-center">
            {t("logoHint")}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleLogoFile(f);
              e.target.value = "";
            }}
          />
        </div>

        {/* ── Info Fields ───────────────────────────────────────── */}
        <div className="surface-card p-6 rounded-xl lg:col-span-2 space-y-5">
          <h2 className="section-title">{t("companyInfo")}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Arabic name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[color:var(--ink-500)]">
                {t("companyNameAr")} *
              </label>
              <input
                className="input-field"
                dir="rtl"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="اسم الشركة بالعربية"
              />
            </div>

            {/* English name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[color:var(--ink-500)]">
                {t("companyNameEn")}
              </label>
              <input
                className="input-field"
                dir="ltr"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Company Name in English"
              />
            </div>

            {/* Tax number */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[color:var(--ink-500)] flex items-center gap-1.5">
                <Hash className="h-3 w-3" /> {t("taxNumber")}
              </label>
              <input
                className="input-field"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                placeholder="300000000000003"
              />
            </div>

            {/* Phone */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[color:var(--ink-500)] flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> {t("phone")}
              </label>
              <input
                className="input-field"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+966 xx xxx xxxx"
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[color:var(--ink-500)] flex items-center gap-1.5">
                <Mail className="h-3 w-3" /> {t("email")}
              </label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@company.com"
              />
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[color:var(--ink-500)] flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> {t("address")}
              </label>
              <textarea
                className="input-field resize-none"
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("companyAddress")}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Preview Card ─────────────────────────────────────────── */}
      <div className="surface-card p-6 rounded-xl">
        <h2 className="section-title mb-4">{t("printHeaderPreview")}</h2>
        <div
          className="rounded-xl border border-[color:var(--ink-200)] p-5 bg-white"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <div className="flex items-center gap-3" style={{ flexDirection: isRTL ? "row-reverse" : "row" }}>
            {logoPreview && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={logoPreview} alt="logo" className="h-12 w-auto object-contain max-w-[80px]" />
            )}
            <div style={{ textAlign: isRTL ? "right" : "left" }}>
              <div className="text-lg font-bold text-[color:var(--ink-900)]">
                {(isRTL ? nameAr : nameEn || nameAr) || "—"}
              </div>
              {(address || phone) && (
                <div className="text-xs text-[color:var(--ink-400)] mt-0.5">
                  {address}{address && phone ? " · " : ""}{phone}
                </div>
              )}
            </div>
          </div>
          <div className="border-b-2 border-[color:var(--brand-600)] opacity-60 my-3" />
          <div className="text-center text-sm font-semibold text-[color:var(--ink-700)]">
            {t("sampleDocumentTitle")}
          </div>
        </div>
      </div>
    </div>
  );
}
