// @ts-nocheck
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Download, Database, CheckCircle2, AlertTriangle,
  RefreshCw, Shield, Clock, Package, FileJson,
  Users, ShoppingCart, BarChart3, Wrench,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";

const ACCENT = "#22d3ee";

export default function BackupPage() {
  const { isRTL } = useI18n();
  const [downloading, setDownloading] = useState(false);
  const [lastBackup, setLastBackup]   = useState<string | null>(null);
  const [backupSize, setBackupSize]   = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);

  const companies  = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId  = companies[0]?._id;

  // Load preview stats only (not full data)
  const backupData = useQuery(
    api.backup.exportFullBackup,
    companyId ? { companyId } : "skip"
  );

  if (!companyId) return <LoadingState />;

  const stats = backupData?.meta?.stats;

  async function handleDownload() {
    if (!backupData) return;
    setDownloading(true);
    setError(null);
    try {
      const json    = JSON.stringify(backupData, null, 2);
      const bytes   = new TextEncoder().encode(json).length;
      const kb      = (bytes / 1024).toFixed(1);
      const mb      = (bytes / 1024 / 1024).toFixed(2);
      const sizeStr = bytes > 1024 * 1024 ? `${mb} MB` : `${kb} KB`;

      const blob = new Blob([json], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href     = url;
      a.download = `PrimeBalance_Backup_${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastBackup(new Date().toLocaleString(isRTL ? "ar-QA" : "en-QA"));
      setBackupSize(sizeStr);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDownloading(false);
    }
  }

  const statCards = stats ? [
    { icon: Package,      label: isRTL ? "الأصناف"          : "Items",            value: stats.items,            color: "#22d3ee" },
    { icon: BarChart3,    label: isRTL ? "القيود المحاسبية" : "Journal Entries",  value: stats.journalEntries,   color: "#a78bfa" },
    { icon: ShoppingCart, label: isRTL ? "فواتير المبيعات"  : "Sales Invoices",   value: stats.salesInvoices,    color: "#34d399" },
    { icon: Database,     label: isRTL ? "فواتير المشتريات" : "Purchase Invoices",value: stats.purchaseInvoices, color: "#fbbf24" },
    { icon: Wrench,       label: isRTL ? "الوصفات"          : "Recipes",          value: stats.recipes,          color: "#f472b6" },
    { icon: Users,        label: isRTL ? "الموظفين"         : "Employees",        value: stats.employees,        color: "#fb923c" },
    { icon: Package,      label: isRTL ? "الأصول الثابتة"  : "Fixed Assets",     value: stats.fixedAssets,      color: "#60a5fa" },
    { icon: Database,     label: isRTL ? "حركات المخزون"   : "Inventory Txns",   value: stats.inventoryTxns,    color: "#4ade80" },
  ] : [];

  const sections = [
    { key: "masterData",  label: isRTL ? "البيانات الأساسية"     : "Master Data",       desc: isRTL ? "أصناف، حسابات، مستودعات، وحدات قياس" : "Items, accounts, warehouses, UOMs", color: "#22d3ee" },
    { key: "finance",     label: isRTL ? "المالية والمحاسبة"     : "Finance",           desc: isRTL ? "دليل الحسابات، القيود، السنوات المالية" : "Chart of accounts, journal entries, fiscal years", color: "#a78bfa" },
    { key: "inventory",   label: isRTL ? "المخزون"               : "Inventory",         desc: isRTL ? "حركات، تسويات، تحويلات" : "Transactions, adjustments, transfers", color: "#fbbf24" },
    { key: "production",  label: isRTL ? "الإنتاج"               : "Production",        desc: isRTL ? "وصفات، خطوط الوصفات، أوامر الإنتاج" : "Recipes, recipe lines, production orders", color: "#f472b6" },
    { key: "purchases",   label: isRTL ? "المشتريات"             : "Purchases",         desc: isRTL ? "موردون، فواتير، إيصالات استلام" : "Suppliers, invoices, GRNs, returns", color: "#34d399" },
    { key: "sales",       label: isRTL ? "المبيعات"              : "Sales",             desc: isRTL ? "عملاء، فواتير، مرتجعات" : "Customers, invoices, returns", color: "#60a5fa" },
    { key: "treasury",    label: isRTL ? "الخزينة"               : "Treasury",          desc: isRTL ? "مقبوضات، مدفوعات، شيكات، تحويلات" : "Receipts, payments, cheques, bank transfers", color: "#fb923c" },
    { key: "hr",          label: isRTL ? "الموارد البشرية"       : "Human Resources",   desc: isRTL ? "موظفون، رواتب، حضور، إجازات" : "Employees, payroll, attendance, leave", color: "#4ade80" },
    { key: "fixedAssets", label: isRTL ? "الأصول الثابتة"        : "Fixed Assets",      desc: isRTL ? "أصول، جلسات استهلاك" : "Assets, depreciation runs", color: "#e879f9" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={isRTL ? "النسخ الاحتياطي" : "System Backup"}
        subtitle={isRTL
          ? "تصدير نسخة احتياطية كاملة من جميع بيانات النظام"
          : "Export a complete backup of all system data"}
        icon={Shield}
        iconColor={ACCENT}
      />

      {/* ─── Main backup card ─── */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--card)", borderColor: "rgba(255,255,255,0.1)" }}>

        {/* Header strip */}
        <div className="px-6 py-5 flex items-center gap-4"
          style={{ background: "linear-gradient(135deg, #0c4a6e 0%, #0e7490 100%)" }}>
          <div className="h-12 w-12 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)" }}>
            <FileJson className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-[16px] text-white">
              {isRTL ? "نسخة احتياطية كاملة — JSON" : "Full System Backup — JSON"}
            </p>
            <p className="text-[12px] text-cyan-200 mt-0.5">
              {isRTL
                ? "يشمل جميع الجداول: مبيعات، مشتريات، مخزون، إنتاج، محاسبة، HR، أصول ثابتة"
                : "Includes all tables: sales, purchases, inventory, production, accounting, HR, fixed assets"}
            </p>
          </div>
          {backupData && (
            <div className="text-right">
              <p className="text-[11px] text-cyan-300">
                {isRTL ? "إجمالي السجلات" : "Total records"}
              </p>
              <p className="text-[20px] font-bold text-white">
                {Object.values(stats ?? {}).reduce((a: number, b: number) => a + b, 0).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Stats grid */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {statCards.map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="rounded-xl p-3 border border-white/8"
                  style={{ background: "var(--background)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-3.5 w-3.5" style={{ color }} />
                    <p className="text-[10.5px]" style={{ color: "var(--muted-foreground)" }}>{label}</p>
                  </div>
                  <p className="text-[18px] font-bold" style={{ color }}>
                    {(value ?? 0).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* What's included */}
          <div className="rounded-xl border border-white/8 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/8"
              style={{ background: "var(--background)" }}>
              <p className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>
                {isRTL ? "ما يشمله الباك اب" : "What's included"}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-white/8">
              {sections.map(({ key, label, desc, color }) => (
                <div key={key} className="px-4 py-3 flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
                  <div>
                    <p className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>{label}</p>
                    <p className="text-[10.5px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Last backup info */}
          {lastBackup && (
            <div className="rounded-xl p-3 border border-green-500/30 flex items-center gap-3"
              style={{ background: "#34d39910" }}>
              <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[12px] font-semibold" style={{ color: "#34d399" }}>
                  {isRTL ? "تم تحميل النسخة الاحتياطية بنجاح" : "Backup downloaded successfully"}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                  {isRTL ? `الوقت: ${lastBackup}  •  الحجم: ${backupSize}` : `Time: ${lastBackup}  •  Size: ${backupSize}`}
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl p-3 border border-red-500/30 flex items-center gap-3"
              style={{ background: "#f8717110" }}>
              <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <p className="text-[12px]" style={{ color: "#f87171" }}>❌ {error}</p>
            </div>
          )}

          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={downloading || !backupData}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-bold text-[14px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: downloading ? "#0e7490" : "linear-gradient(135deg, #0891b2 0%, #0284c7 100%)", color: "white" }}>
            {downloading
              ? <><RefreshCw className="h-4.5 w-4.5 animate-spin" />{isRTL ? "جارٍ التجهيز والتحميل..." : "Preparing download..."}</>
              : <><Download className="h-4.5 w-4.5" />{isRTL ? "تحميل النسخة الاحتياطية الكاملة" : "Download Full Backup"}</>}
          </button>

          <p className="text-center text-[11px]" style={{ color: "var(--muted-foreground)" }}>
            {isRTL
              ? "الملف بصيغة JSON — يمكن استعادته لاحقاً أو فتحه في Excel / Python"
              : "JSON format — can be restored later or opened in Excel / Python / any database tool"}
          </p>
        </div>
      </div>

      {/* ─── Tips card ─── */}
      <div className="rounded-2xl border p-5 space-y-3"
        style={{ background: "var(--card)", borderColor: "rgba(255,255,255,0.1)" }}>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" style={{ color: ACCENT }} />
          <p className="font-semibold text-[13px]" style={{ color: "var(--foreground)" }}>
            {isRTL ? "نصائح للنسخ الاحتياطي" : "Backup Best Practices"}
          </p>
        </div>
        {[
          isRTL
            ? "احفظ نسخة احتياطية أسبوعياً على الأقل — ويفضل يومياً في فترة التشغيل"
            : "Save a backup at least weekly — daily is recommended during active operation",
          isRTL
            ? "احتفظ بالنسخ في مكانين مختلفين: Google Drive + جهازك المحلي"
            : "Keep copies in two places: Google Drive + your local machine",
          isRTL
            ? "اسم الملف يحتوي على التاريخ تلقائياً مثل: PrimeBalance_Backup_2025-04-27.json"
            : "File name includes the date automatically: PrimeBalance_Backup_2025-04-27.json",
          isRTL
            ? "الباك اب يشمل كل البيانات — يمكن استعادة أي بيانات منه في أي وقت"
            : "Backup includes all data — any record can be restored from it at any time",
        ].map((tip, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold"
              style={{ background: `${ACCENT}20`, color: ACCENT }}>
              {i + 1}
            </div>
            <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>{tip}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
