// @ts-nocheck
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  RefreshCw, CheckCircle2, AlertTriangle, ChefHat,
  TrendingUp, BarChart3, Zap,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";

export default function RecipeCostsPage() {
  const { isRTL } = useI18n();
  const companies   = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId   = companies[0]?._id;

  const recipes = useQuery(
    api.production.listRecipesWithStats,
    companyId ? { companyId } : "skip"
  ) ?? [];

  const recalculate = useMutation(api.production.recalculateAllRecipeCosts);

  const [running,  setRunning]  = useState(false);
  const [result,   setResult]   = useState<any>(null);
  const [error,    setError]    = useState<string | null>(null);

  if (!companyId) return <LoadingState />;

  async function handleRecalculate() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await recalculate({ companyId: companyId as any });
      setResult(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  const totalCostSum   = recipes.reduce((s: number, r: any) => s + (r.totalCost ?? 0), 0);
  const avgCostPerUnit = recipes.length
    ? recipes.reduce((s: number, r: any) => s + (r.costPerUnit ?? 0), 0) / recipes.length
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={isRTL ? "تكاليف الوصفات" : "Recipe Costs"}
        subtitle={isRTL
          ? "إعادة حساب تكاليف جميع الوصفات تلقائياً بناءً على متوسط التكلفة الحالي للمواد"
          : "Auto-recalculate all recipe costs based on current weighted-average material costs"}
        icon={ChefHat}
        iconColor="var(--brand-700)"
      />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: isRTL ? "إجمالي الوصفات" : "Total Recipes",        value: recipes.length,                                    icon: ChefHat,   iconCls: "text-[color:var(--brand-700)]", numCls: "text-[color:var(--brand-700)]" },
          { label: isRTL ? "إجمالي تكلفة المواد" : "Total Material Cost", value: `${totalCostSum.toFixed(2)} ${isRTL?"ر.ق":"QAR"}`, icon: BarChart3, iconCls: "text-violet-600",               numCls: "text-violet-700" },
          { label: isRTL ? "متوسط تكلفة الوحدة" : "Avg Cost / Unit",    value: `${avgCostPerUnit.toFixed(3)} ${isRTL?"ر.ق":"QAR"}`, icon: TrendingUp,iconCls: "text-emerald-600",              numCls: "text-emerald-700" },
        ].map(({ label, value, icon: Icon, iconCls, numCls }) => (
          <div key={label} className="bg-white rounded-xl border border-[color:var(--ink-100)] p-4 text-center">
            <Icon className={`h-5 w-5 mx-auto mb-1 ${iconCls}`} />
            <p className={`text-[18px] font-bold ${numCls}`}>{value}</p>
            <p className="text-[11px] mt-0.5 text-[color:var(--ink-400)]">{label}</p>
          </div>
        ))}
      </div>

      {/* Recalculate button */}
      <div className="bg-white rounded-2xl border border-[color:var(--ink-100)] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[color:var(--brand-700)]" />
            <p className="text-[13px] font-semibold text-[color:var(--ink-900)]">
              {isRTL ? "إعادة الحساب التلقائي" : "Auto Recalculate"}
            </p>
          </div>
          <p className="text-[11.5px] mt-1 text-[color:var(--ink-400)]">
            {isRTL
              ? "يقوم النظام بجلب متوسط التكلفة المرجحة لكل مادة خام من المخزون ثم يحدّث تكاليف جميع سطور الوصفات تلقائياً. لا تأثير على المبيعات أو القيود."
              : "Fetches the weighted-average cost for each raw material from stock and updates all recipe line costs automatically. No effect on posted invoices or journal entries."}
          </p>
        </div>
        <button
          onClick={handleRecalculate}
          disabled={running}
          className="btn-primary flex items-center gap-2 whitespace-nowrap disabled:opacity-60">
          {running
            ? <><RefreshCw className="h-4 w-4 animate-spin" />{isRTL ? "جارٍ الحساب..." : "Calculating..."}</>
            : <><Zap className="h-4 w-4" />{isRTL ? "أعد حساب التكاليف" : "Recalculate Costs"}</>}
        </button>
      </div>

      {/* Result banner */}
      {result && (
        <div className="rounded-xl p-4 border border-emerald-200 bg-emerald-50 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-bold text-emerald-700">
              {isRTL ? "✅ تم إعادة الحساب بنجاح" : "✅ Recalculation Complete"}
            </p>
            <p className="text-[12px] mt-1 text-[color:var(--ink-500)]">
              {isRTL
                ? `تم تحديث ${result.updatedLines} سطر في ${result.updatedRecipes} وصفة من أصل ${result.totalRecipes}`
                : `Updated ${result.updatedLines} lines across ${result.updatedRecipes} of ${result.totalRecipes} recipes`}
            </p>
          </div>
        </div>
      )}
      {error && (
        <div className="rounded-xl p-3 border border-red-200 bg-red-50 flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <p className="text-[12px] text-red-600">{error}</p>
        </div>
      )}

      {/* Recipes table */}
      <div className="bg-white rounded-2xl border border-[color:var(--ink-100)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[color:var(--ink-100)]">
          <p className="text-[12px] font-semibold text-[color:var(--ink-900)]">
            {isRTL ? "تفاصيل تكاليف الوصفات" : "Recipe Cost Breakdown"}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: "#6b1523" }}>
                {[
                  isRTL ? "الكود" : "Code",
                  isRTL ? "الوصفة" : "Recipe",
                  isRTL ? "الناتج" : "Yield",
                  isRTL ? "عدد المكونات" : "Ingredients",
                  isRTL ? "إجمالي التكلفة" : "Total Cost",
                  isRTL ? "تكلفة الوحدة" : "Cost / Unit",
                ].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-start font-semibold text-white/80">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recipes.map((recipe: any) => (
                <tr key={recipe._id} className="border-b border-[color:var(--ink-100)] hover:bg-[color:var(--ink-50)] transition-colors">
                  <td className="px-4 py-3 font-mono text-[11px] text-[color:var(--ink-400)]">
                    {recipe.code}
                  </td>
                  <td className="px-4 py-3 font-semibold text-[color:var(--ink-900)]">
                    {isRTL ? recipe.nameAr : recipe.nameEn || recipe.nameAr}
                  </td>
                  <td className="px-4 py-3 text-[color:var(--ink-500)]">
                    {recipe.yieldQuantity}
                  </td>
                  <td className="px-4 py-3 text-center text-[color:var(--ink-500)]">
                    {recipe.lineCount ?? 0}
                  </td>
                  <td className="px-4 py-3 font-bold text-violet-700">
                    {(recipe.totalCost ?? 0).toFixed(3)} {isRTL ? "ر.ق" : "QAR"}
                  </td>
                  <td className="px-4 py-3 font-bold text-[color:var(--brand-700)]">
                    {(recipe.costPerUnit ?? 0).toFixed(4)} {isRTL ? "ر.ق" : "QAR"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
