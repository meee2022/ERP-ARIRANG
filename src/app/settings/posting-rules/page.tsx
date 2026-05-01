// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Zap, CheckCircle2, AlertTriangle, RefreshCw,
  BookOpen, Save, Info, ChevronDown,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import { SearchableSelect } from "@/components/ui/searchable-select";

const ACCENT = "#22d3ee";

// ─── Account selector dropdown ───────────────────────────────────────────────
function AccountSelect({
  value,
  onChange,
  accounts,
  placeholder,
  isRTL,
}: {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  accounts: any[];
  placeholder: string;
  isRTL: boolean;
}) {
  return (
    <SearchableSelect
      isRTL={isRTL}
      value={value ?? ""}
      onChange={(v) => onChange(v || undefined)}
      placeholder={placeholder}
      searchPlaceholder={isRTL ? "ابحث بالاسم أو الكود..." : "Search by name or code..."}
      emptyMessage={isRTL ? "لا توجد نتائج" : "No results"}
      options={accounts.map((a) => ({
        value: a._id,
        label: `${a.code} — ${isRTL ? (a.nameAr || a.nameEn) : (a.nameEn || a.nameAr)}`,
      }))}
    />
  );
}

// ─── One rule row ─────────────────────────────────────────────────────────────
function RuleRow({
  label,
  desc,
  fieldKey,
  color,
  draft,
  setDraft,
  accounts,
  isRTL,
}: {
  label: string;
  desc: string;
  fieldKey: string;
  color: string;
  draft: Record<string, string | undefined>;
  setDraft: (d: any) => void;
  accounts: any[];
  isRTL: boolean;
}) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 rounded-xl border border-white/8"
      style={{ background: "var(--background)" }}
    >
      {/* Label */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: color }} />
          <p className="text-[12.5px] font-semibold" style={{ color: "var(--foreground)" }}>
            {label}
          </p>
        </div>
        <p className="text-[10.5px] mt-0.5 ml-4" style={{ color: "var(--muted-foreground)" }}>
          {desc}
        </p>
      </div>
      {/* Selector */}
      <div className="sm:w-64">
        <AccountSelect
          value={draft[fieldKey]}
          onChange={(id) => setDraft((prev: any) => ({ ...prev, [fieldKey]: id }))}
          accounts={accounts}
          placeholder={isRTL ? "— اختر حساباً —" : "— Select account —"}
          isRTL={isRTL}
        />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PostingRulesPage() {
  const { isRTL } = useI18n();

  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const existingRules = useQuery(
    api.postingRules.getPostingRules,
    companyId ? { companyId } : "skip"
  );

  // All postable + active accounts
  const allAccounts = useQuery(
    api.accounts.getAll,
    companyId ? { companyId } : "skip"
  ) ?? [];
  const postableAccounts = allAccounts.filter((a: any) => a.isPostable && a.isActive);

  const saveRules      = useMutation(api.postingRules.savePostingRules);
  const autoDetect     = useMutation(api.postingRules.autoDetectPostingRules);

  const [draft, setDraft]           = useState<Record<string, string | undefined>>({});
  const [saving, setSaving]         = useState(false);
  const [detecting, setDetecting]   = useState(false);
  const [saved, setSaved]           = useState(false);
  const [detected, setDetected]     = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Populate draft when rules load
  useEffect(() => {
    if (existingRules) {
      const { _id, _creationTime, companyId: _c, updatedAt, updatedBy, ...fields } = existingRules;
      setDraft(fields as any);
    }
  }, [existingRules]);

  if (!companyId) return <LoadingState />;

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await saveRules({ companyId, ...draft } as any);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAutoDetect() {
    setDetecting(true);
    setDetected(false);
    setError(null);
    try {
      const result = await autoDetect({ companyId });
      // Populate draft with detected IDs
      const cleaned: Record<string, string | undefined> = {};
      for (const [k, v] of Object.entries(result.rules as any)) {
        if (v) cleaned[k] = v as string;
      }
      setDraft(cleaned);
      setDetected(true);
      setTimeout(() => setDetected(false), 4000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDetecting(false);
    }
  }

  // ── Rule groups ────────────────────────────────────────────────────────────
  type RuleDef = { fieldKey: string; label: string; desc: string; color: string };
  type GroupDef = { title: string; rules: RuleDef[] };

  const groups: GroupDef[] = [
    {
      title: isRTL ? "المبيعات" : "Sales",
      rules: [
        {
          fieldKey: "cashSalesAccountId",
          label: isRTL ? "حساب المبيعات النقدية" : "Cash Sales Account",
          desc: isRTL ? "الصندوق أو الخزينة — يُقيَّد بالدين عند البيع نقداً" : "Cash box / till — debited on cash sales",
          color: "#34d399",
        },
        {
          fieldKey: "cardSalesAccountId",
          label: isRTL ? "حساب مبيعات البطاقة (POS)" : "Card Sales Account (POS)",
          desc: isRTL ? "حساب بطاقة الائتمان أو POS — يُقيَّد بالدين عند البيع بالبطاقة" : "Credit card / POS settlement account",
          color: "#34d399",
        },
        {
          fieldKey: "arAccountId",
          label: isRTL ? "حساب الذمم المدينة (ع. عملاء)" : "Accounts Receivable",
          desc: isRTL ? "يُقيَّد بالدين عند البيع الآجل" : "Debited on credit sales",
          color: "#60a5fa",
        },
        {
          fieldKey: "defaultRevenueAccountId",
          label: isRTL ? "حساب الإيراد الافتراضي (المبيعات)" : "Default Revenue Account",
          desc: isRTL ? "يُقيَّد بالدائن عند تسجيل أي فاتورة مبيعات" : "Credited on every sales invoice",
          color: "#a78bfa",
        },
        {
          fieldKey: "cogsAccountId",
          label: isRTL ? "حساب تكلفة البضاعة المباعة (COGS)" : "COGS Account",
          desc: isRTL ? "يُقيَّد بالدين عند بيع أي صنف مخزني" : "Debited when a stocked item is sold",
          color: "#f472b6",
        },
        {
          fieldKey: "inventoryAccountId",
          label: isRTL ? "حساب المخزون" : "Inventory Account",
          desc: isRTL ? "يُقيَّد بالدائن عند استهلاك المخزون في البيع أو الإنتاج" : "Credited when stock is consumed in sales / production",
          color: "#fbbf24",
        },
      ],
    },
    {
      title: isRTL ? "المشتريات" : "Purchases",
      rules: [
        {
          fieldKey: "apAccountId",
          label: isRTL ? "حساب الذمم الدائنة (ع. موردين)" : "Accounts Payable",
          desc: isRTL ? "يُقيَّد بالدائن عند فاتورة الشراء الآجل" : "Credited on credit purchase invoices",
          color: "#60a5fa",
        },
        {
          fieldKey: "purchaseAccountId",
          label: isRTL ? "حساب المشتريات" : "Purchases Account",
          desc: isRTL ? "يُقيَّد بالدين عند استلام البضاعة (غير المخزنية)" : "Debited on non-inventory purchases",
          color: "#fbbf24",
        },
      ],
    },
    {
      title: isRTL ? "الخزينة" : "Treasury",
      rules: [
        {
          fieldKey: "mainCashAccountId",
          label: isRTL ? "الصندوق الرئيسي" : "Main Cash Account",
          desc: isRTL ? "حساب الخزينة/الكاش — يُستخدم في سندات القبض والصرف" : "Main cash till — used in receipts & payments",
          color: "#22d3ee",
        },
        {
          fieldKey: "bankAccountId",
          label: isRTL ? "حساب البنك" : "Bank Account",
          desc: isRTL ? "يُستخدم في التحويلات البنكية وسندات الشيكات" : "Used for bank transfers and cheque transactions",
          color: "#a78bfa",
        },
      ],
    },
    {
      title: isRTL ? "الرواتب" : "Payroll",
      rules: [
        {
          fieldKey: "salaryExpenseAccountId",
          label: isRTL ? "مصروف الرواتب" : "Salary Expense Account",
          desc: isRTL ? "يُقيَّد بالدين عند ترحيل مسير الرواتب" : "Debited when payroll is posted",
          color: "#4ade80",
        },
        {
          fieldKey: "salaryPayableAccountId",
          label: isRTL ? "رواتب مستحقة الدفع" : "Salary Payable Account",
          desc: isRTL ? "يُقيَّد بالدائن (ذمة للموظفين) عند ترحيل الرواتب" : "Credited as a liability until payroll is paid out",
          color: "#4ade80",
        },
      ],
    },
    {
      title: isRTL ? "الأصول الثابتة" : "Fixed Assets",
      rules: [
        {
          fieldKey: "depreciationExpenseAccountId",
          label: isRTL ? "مصروف الإهلاك" : "Depreciation Expense Account",
          desc: isRTL ? "يُقيَّد بالدين عند ترحيل الإهلاك الدوري" : "Debited on each depreciation run",
          color: "#94a3b8",
        },
        {
          fieldKey: "accumulatedDepreciationAccountId",
          label: isRTL ? "مجمع الإهلاك" : "Accumulated Depreciation Account",
          desc: isRTL ? "يُقيَّد بالدائن — يُظهر صافي قيمة الأصل في الميزانية" : "Credited — reduces asset net book value in balance sheet",
          color: "#94a3b8",
        },
      ],
    },
    {
      title: isRTL ? "الإنتاج والهدر" : "Production & Wastage",
      rules: [
        {
          fieldKey: "wipAccountId",
          label: isRTL ? "إنتاج تحت التشغيل (WIP)" : "Work-in-Progress (WIP) Account",
          desc: isRTL ? "يُستخدم عند ترحيل أوامر الإنتاج الجارية" : "Used when production orders are in progress",
          color: "#f472b6",
        },
        {
          fieldKey: "wastageExpenseAccountId",
          label: isRTL ? "مصروف الهدر والتالف" : "Wastage / Spoilage Expense Account",
          desc: isRTL ? "يُقيَّد بالدين عند تسجيل الهدر أو التالف" : "Debited when wastage or spoilage is recorded",
          color: "#f87171",
        },
      ],
    },
  ];

  const filledCount = Object.values(draft).filter(Boolean).length;
  const totalFields = 16;
  const pct = Math.round((filledCount / totalFields) * 100);

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title={isRTL ? "قواعد الترحيل التلقائي" : "Auto-Posting Rules"}
        subtitle={isRTL
          ? "حدد الحسابات الافتراضية لكل نوع عملية حتى يرحّل النظام القيود تلقائياً"
          : "Map each transaction type to a default account so the system can post journals automatically"}
        icon={Zap}
        iconColor={ACCENT}
      />

      {/* ── Progress bar ── */}
      <div className="rounded-xl border p-4 space-y-2"
        style={{ background: "var(--card)", borderColor: "rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>
            {isRTL ? `تم تعيين ${filledCount} من ${totalFields} حساباً` : `${filledCount} of ${totalFields} accounts mapped`}
          </p>
          <p className="text-[12px] font-bold" style={{ color: pct === 100 ? "#34d399" : ACCENT }}>
            {pct}%
          </p>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: pct === 100
                ? "linear-gradient(90deg, #34d399, #059669)"
                : "linear-gradient(90deg, #22d3ee, #0891b2)",
            }}
          />
        </div>
      </div>

      {/* ── Auto-detect button ── */}
      <div className="rounded-xl border p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
        style={{ background: "var(--card)", borderColor: "rgba(255,255,255,0.1)" }}>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" style={{ color: ACCENT }} />
            <p className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
              {isRTL ? "اكتشاف تلقائي" : "Auto-Detect"}
            </p>
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            {isRTL
              ? "يقوم النظام بمطابقة الحسابات تلقائياً حسب الكود المحاسبي والاسم — اضغط ثم راجع النتيجة قبل الحفظ"
              : "System matches accounts by code and name keywords — press then review before saving"}
          </p>
        </div>
        <button
          onClick={handleAutoDetect}
          disabled={detecting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12.5px] font-semibold transition-all disabled:opacity-60"
          style={{ background: detecting ? "#0e7490" : "linear-gradient(135deg,#0891b2,#0284c7)", color: "white" }}
        >
          {detecting
            ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />{isRTL ? "جارٍ الاكتشاف..." : "Detecting..."}</>
            : <><Zap className="h-3.5 w-3.5" />{isRTL ? "اكتشف تلقائياً" : "Auto-Detect Accounts"}</>}
        </button>
      </div>

      {/* Feedback banners */}
      {detected && (
        <div className="rounded-xl p-3 border border-green-500/30 flex items-center gap-3"
          style={{ background: "#34d39910" }}>
          <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
          <p className="text-[12px]" style={{ color: "#34d399" }}>
            {isRTL
              ? "✅ تم اكتشاف الحسابات بنجاح — راجعها أدناه ثم اضغط حفظ لتفعيلها"
              : "✅ Accounts detected — review below then press Save to activate"}
          </p>
        </div>
      )}
      {saved && (
        <div className="rounded-xl p-3 border border-green-500/30 flex items-center gap-3"
          style={{ background: "#34d39910" }}>
          <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
          <p className="text-[12px]" style={{ color: "#34d399" }}>
            {isRTL ? "✅ تم حفظ قواعد الترحيل بنجاح" : "✅ Posting rules saved successfully"}
          </p>
        </div>
      )}
      {error && (
        <div className="rounded-xl p-3 border border-red-500/30 flex items-center gap-3"
          style={{ background: "#f8717110" }}>
          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <p className="text-[12px]" style={{ color: "#f87171" }}>❌ {error}</p>
        </div>
      )}

      {/* ── Rule groups ── */}
      {groups.map((group) => (
        <div key={group.title} className="rounded-xl border overflow-hidden"
          style={{ background: "var(--card)", borderColor: "rgba(255,255,255,0.1)" }}>
          {/* Group header */}
          <div className="px-4 py-2.5 border-b border-white/8 flex items-center gap-2"
            style={{ background: "var(--background)" }}>
            <BookOpen className="h-3.5 w-3.5" style={{ color: ACCENT }} />
            <p className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>
              {group.title}
            </p>
          </div>
          {/* Rules */}
          <div className="p-3 space-y-2">
            {group.rules.map((rule) => (
              <RuleRow
                key={rule.fieldKey}
                {...rule}
                draft={draft}
                setDraft={setDraft}
                accounts={postableAccounts}
                isRTL={isRTL}
              />
            ))}
          </div>
        </div>
      ))}

      {/* ── Info note ── */}
      <div className="rounded-xl p-4 border border-white/8 flex items-start gap-3"
        style={{ background: "var(--card)" }}>
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: ACCENT }} />
        <div className="space-y-1">
          <p className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>
            {isRTL ? "كيف يعمل الترحيل التلقائي؟" : "How does auto-posting work?"}
          </p>
          <p className="text-[11.5px]" style={{ color: "var(--muted-foreground)" }}>
            {isRTL
              ? "بعد الحفظ، عند تسجيل فاتورة مبيعات أو مشتريات أو سند قبض — يقرأ النظام هذه القواعد تلقائياً ويُنشئ القيد المحاسبي الصحيح دون تدخل منك. مثال: فاتورة مبيعات نقدية → قيد: دائن إيراد + دائن ضريبة + مدين صندوق + مدين COGS + دائن مخزون."
              : "After saving, whenever a sales invoice, purchase invoice, or cash receipt is posted — the system reads these rules and auto-creates the correct journal entry. Example: cash sale → Dr Cash, Dr COGS, Cr Revenue, Cr Inventory."}
          </p>
        </div>
      </div>

      {/* ── Save button ── */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-bold text-[14px] transition-all disabled:opacity-50"
        style={{ background: saving ? "#0e7490" : "linear-gradient(135deg,#0891b2,#0284c7)", color: "white" }}
      >
        {saving
          ? <><RefreshCw className="h-4 w-4 animate-spin" />{isRTL ? "جارٍ الحفظ..." : "Saving..."}</>
          : <><Save className="h-4 w-4" />{isRTL ? "حفظ قواعد الترحيل" : "Save Posting Rules"}</>}
      </button>
    </div>
  );
}
