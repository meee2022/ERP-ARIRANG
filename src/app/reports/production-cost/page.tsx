// @ts-nocheck
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ChefHat, TrendingUp, Package, CheckCircle2, BarChart2 } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";

const STATUS_CFG: Record<string, { color: string; bg: string; border: string }> = {
  planned:     { color: "#1d4ed8", bg: "#eff6ff",  border: "#bfdbfe" },
  in_progress: { color: "#b45309", bg: "#fffbeb",  border: "#fde68a" },
  completed:   { color: "#15803d", bg: "#f0fdf4",  border: "#bbf7d0" },
  cancelled:   { color: "#dc2626", bg: "#fef2f2",  border: "#fecaca" },
};

const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  planned:     { ar: "مخطط",    en: "Planned"     },
  in_progress: { ar: "جارٍ",   en: "In Progress"  },
  completed:   { ar: "مكتمل",  en: "Completed"    },
  cancelled:   { ar: "ملغى",   en: "Cancelled"    },
};

export default function ProductionCostReportPage() {
  const { t, isRTL, formatCurrency } = useI18n();

  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const today      = new Date().toISOString().split("T")[0];
  const monthStart = today.slice(0, 7) + "-01";

  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate,   setToDate]   = useState(today);
  const [view,     setView]     = useState<"orders" | "recipes">("orders");

  const summary = useQuery(
    api.production.productionCostSummary,
    companyId ? { companyId, fromDate, toDate } : "skip"
  );
  const recipes = useQuery(
    api.production.listRecipesWithStats,
    companyId ? { companyId } : "skip"
  );

  if (!companyId || summary === undefined || recipes === undefined) return <LoadingState />;

  const { orders = [], kpis } = summary ?? {
    orders: [],
    kpis: { totalProduced: 0, totalMaterialCost: 0, avgCostPerUnit: 0, completed: 0 },
  };

  const recipeMap: Record<string, { nameAr: string; nameEn: string; orders: any[]; totalCost: number; totalQty: number }> = {};
  orders.forEach((o) => {
    const key = o.recipeId as string;
    if (!recipeMap[key]) {
      recipeMap[key] = { nameAr: o.recipe?.nameAr ?? "—", nameEn: o.recipe?.nameEn ?? "—", orders: [], totalCost: 0, totalQty: 0 };
    }
    recipeMap[key].orders.push(o);
    recipeMap[key].totalCost += o.materialCost ?? 0;
    recipeMap[key].totalQty  += o.status === "completed" ? (o.actualQty ?? o.plannedQty) : 0;
  });

  const kpiCards = [
    { label: isRTL ? "إجمالي الإنتاج"    : "Total Produced",    value: kpis.totalProduced.toFixed(1), suffix: isRTL ? "وحدة" : "units", icon: Package,      color: "#7c3aed" },
    { label: isRTL ? "إجمالي تكلفة المواد" : "Total Material Cost", value: formatCurrency(kpis.totalMaterialCost), icon: TrendingUp,   color: "var(--brand-700)" },
    { label: isRTL ? "متوسط تكلفة الوحدة" : "Avg Cost / Unit",   value: formatCurrency(kpis.avgCostPerUnit),     icon: BarChart2,    color: "#b45309" },
    { label: isRTL ? "أوامر مكتملة"      : "Completed Orders",  value: kpis.completed, suffix: isRTL ? "أمر" : "orders",              icon: CheckCircle2, color: "#15803d" },
  ];

  const TH = "px-[14px] py-[10px] text-start font-bold text-[11px] uppercase tracking-wider whitespace-nowrap text-white/85";

  return (
    <div className="space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      <PageHeader
        title={isRTL ? "تقرير تكلفة الإنتاج" : "Production Cost Report"}
        subtitle={isRTL ? "تحليل تكاليف أوامر الإنتاج والوصفات" : "Analyze production order and recipe costs"}
        icon={ChefHat}
      />

      {/* Filters */}
      <FilterPanel>
        <FilterField label={isRTL ? "من" : "From"}>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input-field h-9 w-auto" />
        </FilterField>
        <FilterField label={isRTL ? "إلى" : "To"}>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input-field h-9 w-auto" />
        </FilterField>
        <FilterField label={isRTL ? "العرض" : "View"}>
          <div className="flex rounded-lg overflow-hidden border border-[color:var(--ink-200)]">
            {(["orders", "recipes"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className="px-3 py-1.5 text-[12px] font-medium transition-colors"
                style={{
                  background: view === v ? "var(--brand-700)" : "white",
                  color:      view === v ? "white" : "var(--ink-600)",
                }}>
                {v === "orders" ? (isRTL ? "الأوامر" : "Orders") : (isRTL ? "الوصفات" : "Recipes")}
              </button>
            ))}
          </div>
        </FilterField>
      </FilterPanel>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-[color:var(--ink-100)] overflow-hidden shadow-sm">
            <div className="h-1" style={{ background: k.color }} />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${k.color}15` }}>
                  <k.icon className="h-4 w-4" style={{ color: k.color }} />
                </span>
                <span className="text-[11px] text-[color:var(--ink-500)]">{k.label}</span>
              </div>
              <p className="text-[22px] font-bold text-[color:var(--ink-900)] leading-none tabular-nums">
                {k.value}
                {k.suffix && <span className="text-[12px] font-normal text-[color:var(--ink-400)] ms-1">{k.suffix}</span>}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Recipe cost breakdown */}
      {(recipes ?? []).length > 0 && (
        <div className="bg-white rounded-2xl border border-[color:var(--ink-100)] overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-[color:var(--ink-100)]" style={{ background: "var(--brand-50)" }}>
            <h3 className="font-semibold text-[13px]" style={{ color: "var(--brand-800)" }}>
              {isRTL ? "تكلفة الوصفات الإنتاجية" : "Recipe Cost Breakdown"}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr style={{ background: "#6b1523" }}>
                  {[
                    isRTL ? "الكود"     : "Code",
                    isRTL ? "الوصفة"   : "Recipe",
                    isRTL ? "المنتج"   : "Output Item",
                    isRTL ? "الكمية"   : "Yield Qty",
                    isRTL ? "المكونات" : "Ingredients",
                    isRTL ? "التكلفة الكلية" : "Total Cost",
                    isRTL ? "تكلفة الوحدة"  : "Cost/Unit",
                  ].map((h) => <th key={h} className={TH}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {(recipes ?? []).filter((r) => r.isActive).map((r, i) => (
                  <tr key={r._id}
                    className={`border-b border-[color:var(--ink-50)] hover:bg-[#fdf2f4] transition-colors ${i % 2 === 0 ? "" : "bg-[#fafafa]"}`}>
                    <td className="px-[14px] py-[8px] whitespace-nowrap">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded border text-[color:var(--ink-500)]"
                        style={{ background: "var(--brand-50)", borderColor: "var(--brand-100)" }}>{r.code}</span>
                    </td>
                    <td className="px-[14px] py-[8px] font-medium text-[12.5px] text-[color:var(--ink-900)]" style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {isRTL ? r.nameAr : (r.nameEn || r.nameAr)}
                    </td>
                    <td className="px-[14px] py-[8px] text-[12.5px] text-[color:var(--ink-500)] whitespace-nowrap">{r.outputItem?.nameAr ?? "—"}</td>
                    <td className="px-[14px] py-[8px] tabular-nums text-[12.5px] text-end whitespace-nowrap text-[color:var(--ink-900)]">
                      {r.yieldQuantity} {r.yieldUom?.nameAr ?? ""}
                    </td>
                    <td className="px-[14px] py-[8px] tabular-nums text-[12.5px] text-end whitespace-nowrap text-[color:var(--ink-700)]">{r.lineCount}</td>
                    <td className="px-[14px] py-[8px] tabular-nums text-[12.5px] font-semibold text-end whitespace-nowrap" style={{ color: "var(--brand-700)" }}>
                      {formatCurrency(r.totalCost)}
                    </td>
                    <td className="px-[14px] py-[8px] tabular-nums text-[12.5px] text-end whitespace-nowrap text-[color:var(--ink-700)]">
                      {formatCurrency(r.costPerUnit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orders / Recipe grouped view */}
      {view === "orders" ? (
        <div className="bg-white rounded-2xl border border-[color:var(--ink-100)] overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-[color:var(--ink-100)] flex items-center justify-between" style={{ background: "var(--brand-50)" }}>
            <h3 className="font-semibold text-[13px]" style={{ color: "var(--brand-800)" }}>
              {isRTL ? "تكاليف أوامر الإنتاج" : "Production Order Costs"}
            </h3>
            <span className="text-[11px] text-[color:var(--ink-400)]">
              {orders.length} {isRTL ? "أمر" : "orders"}
            </span>
          </div>
          {orders.length === 0 ? (
            <p className="px-5 py-8 text-center text-[12px] text-[color:var(--ink-400)]">
              {isRTL ? "لا توجد أوامر في هذه الفترة" : "No orders in this period"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr style={{ background: "#6b1523" }}>
                    {[
                      isRTL ? "رقم الأمر"  : "Order No",
                      isRTL ? "الوصفة"    : "Recipe",
                      isRTL ? "المنتج"    : "Output Item",
                      isRTL ? "الكمية المخططة" : "Planned Qty",
                      isRTL ? "الكمية الفعلية" : "Actual Qty",
                      isRTL ? "التاريخ"   : "Date",
                      isRTL ? "تكلفة المواد" : "Material Cost",
                      isRTL ? "الحالة"    : "Status",
                    ].map((h) => <th key={h} className={TH}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => {
                    const cfg = STATUS_CFG[o.status] ?? STATUS_CFG.planned;
                    const lbl = STATUS_LABEL[o.status];
                    return (
                      <tr key={o._id}
                        className={`border-b border-[color:var(--ink-50)] hover:bg-[#fdf2f4] transition-colors ${i % 2 === 0 ? "" : "bg-[#fafafa]"}`}>
                        <td className="px-[14px] py-[8px] whitespace-nowrap">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded border"
                            style={{ background: "var(--brand-50)", color: "var(--brand-700)", borderColor: "var(--brand-100)" }}>
                            {o.orderNumber}
                          </span>
                        </td>
                        <td className="px-[14px] py-[8px] text-[12.5px] whitespace-nowrap text-[color:var(--ink-500)]">{isRTL ? o.recipe?.nameAr : (o.recipe?.nameEn || o.recipe?.nameAr) ?? "—"}</td>
                        <td className="px-[14px] py-[8px] text-[12.5px] font-medium whitespace-nowrap text-[color:var(--ink-900)]">{isRTL ? o.outputItem?.nameAr : (o.outputItem?.nameEn || o.outputItem?.nameAr) ?? "—"}</td>
                        <td className="px-[14px] py-[8px] tabular-nums text-[12.5px] text-end whitespace-nowrap text-[color:var(--ink-700)]">{o.plannedQty} {o.uom?.nameAr ?? ""}</td>
                        <td className="px-[14px] py-[8px] tabular-nums text-[12.5px] text-end whitespace-nowrap text-[color:var(--ink-700)]">{o.actualQty != null ? o.actualQty : "—"}</td>
                        <td className="px-[14px] py-[8px] text-[12.5px] whitespace-nowrap text-[color:var(--ink-500)]">{o.plannedDate}</td>
                        <td className="px-[14px] py-[8px] tabular-nums text-[12.5px] font-semibold text-end whitespace-nowrap" style={{ color: "var(--brand-700)" }}>
                          {formatCurrency(o.materialCost ?? 0)}
                        </td>
                        <td className="px-[14px] py-[8px] whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold border"
                            style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
                            {isRTL ? lbl?.ar : lbl?.en ?? o.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[color:var(--ink-200)] bg-[color:var(--ink-50)] font-bold">
                    <td colSpan={6} className="px-4 py-3 text-[12px] text-[color:var(--ink-700)]">
                      {isRTL ? "الإجمالي" : "Total"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[13px]" style={{ color: "var(--brand-700)" }}>
                      {formatCurrency(orders.reduce((s, o) => s + (o.materialCost ?? 0), 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(recipeMap).length === 0 ? (
            <p className="text-center text-[12px] py-8 text-[color:var(--ink-400)]">
              {isRTL ? "لا توجد أوامر في هذه الفترة" : "No orders in this period"}
            </p>
          ) : (
            Object.entries(recipeMap).map(([key, data]) => (
              <div key={key} className="bg-white rounded-2xl border border-[color:var(--ink-100)] overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-[color:var(--ink-100)] flex items-center justify-between" style={{ background: "var(--brand-50)" }}>
                  <div>
                    <h3 className="font-semibold text-[13px]" style={{ color: "var(--brand-800)" }}>
                      {isRTL ? data.nameAr : data.nameEn}
                    </h3>
                    <p className="text-[11px] mt-0.5 text-[color:var(--ink-400)]">
                      {data.orders.length} {isRTL ? "أمر" : "orders"} — {isRTL ? "الكمية المنتجة:" : "Qty produced:"} {data.totalQty.toFixed(1)}
                    </p>
                  </div>
                  <span className="text-[14px] font-bold" style={{ color: "var(--brand-700)" }}>
                    {formatCurrency(data.totalCost)}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr style={{ background: "#6b1523" }}>
                        {[
                          isRTL ? "رقم الأمر"  : "Order No",
                          isRTL ? "التاريخ"   : "Date",
                          isRTL ? "الكمية المخططة" : "Planned Qty",
                          isRTL ? "الكمية الفعلية" : "Actual Qty",
                          isRTL ? "تكلفة المواد"   : "Material Cost",
                          isRTL ? "الحالة"    : "Status",
                        ].map((h) => <th key={h} className={TH}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {data.orders.map((o, i) => {
                        const cfg = STATUS_CFG[o.status] ?? STATUS_CFG.planned;
                        const lbl = STATUS_LABEL[o.status];
                        return (
                          <tr key={o._id}
                            className={`border-b border-[color:var(--ink-50)] hover:bg-[#fdf2f4] transition-colors ${i % 2 === 0 ? "" : "bg-[#fafafa]"}`}>
                            <td className="px-[14px] py-[8px] font-mono text-[11px] whitespace-nowrap" style={{ color: "var(--brand-700)" }}>{o.orderNumber}</td>
                            <td className="px-[14px] py-[8px] text-[12.5px] whitespace-nowrap text-[color:var(--ink-500)]">{o.plannedDate}</td>
                            <td className="px-[14px] py-[8px] tabular-nums text-[12.5px] text-end whitespace-nowrap text-[color:var(--ink-700)]">{o.plannedQty}</td>
                            <td className="px-[14px] py-[8px] tabular-nums text-[12.5px] text-end whitespace-nowrap text-[color:var(--ink-700)]">{o.actualQty ?? "—"}</td>
                            <td className="px-[14px] py-[8px] tabular-nums text-[12.5px] font-semibold text-end whitespace-nowrap" style={{ color: "var(--brand-700)" }}>{formatCurrency(o.materialCost ?? 0)}</td>
                            <td className="px-[14px] py-[8px] whitespace-nowrap">
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold border"
                                style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
                                {isRTL ? lbl?.ar : lbl?.en ?? o.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
