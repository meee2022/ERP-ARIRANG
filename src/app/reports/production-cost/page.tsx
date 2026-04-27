// @ts-nocheck
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  ChefHat, TrendingUp, Package, CheckCircle2, BarChart2,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";

const ACCENT = "#22d3ee";

const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  planned:     { color: "#60a5fa", bg: "#60a5fa20" },
  in_progress: { color: "#fbbf24", bg: "#fbbf2420" },
  completed:   { color: "#34d399", bg: "#34d39920" },
  cancelled:   { color: "#f87171", bg: "#f8717120" },
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

  const { orders = [], kpis } = summary ?? { orders: [], kpis: { totalProduced: 0, totalMaterialCost: 0, avgCostPerUnit: 0, completed: 0 } };

  // Group orders by recipe for recipe view
  const recipeMap: Record<string, { nameAr: string; orders: any[]; totalCost: number; totalQty: number }> = {};
  orders.forEach((o) => {
    const key = o.recipeId as string;
    if (!recipeMap[key]) {
      recipeMap[key] = { nameAr: o.recipe?.nameAr ?? "—", orders: [], totalCost: 0, totalQty: 0 };
    }
    recipeMap[key].orders.push(o);
    recipeMap[key].totalCost += o.materialCost ?? 0;
    recipeMap[key].totalQty  += o.status === "completed" ? (o.actualQty ?? o.plannedQty) : 0;
  });

  const kpiCards = [
    {
      label: t("kpiTotalProduced"),
      value: kpis.totalProduced.toFixed(1),
      suffix: isRTL ? "وحدة" : "units",
      icon: Package,
      color: "#a78bfa",
    },
    {
      label: t("kpiTotalMaterialCost"),
      value: formatCurrency(kpis.totalMaterialCost),
      icon: TrendingUp,
      color: ACCENT,
    },
    {
      label: t("kpiAvgCostPerUnit"),
      value: formatCurrency(kpis.avgCostPerUnit),
      icon: BarChart2,
      color: "#fbbf24",
    },
    {
      label: t("kpiOrdersCompleted"),
      value: kpis.completed,
      suffix: t("ordersCount"),
      icon: CheckCircle2,
      color: "#34d399",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={t("productionCostTitle")}
        subtitle={t("productionCostSubtitle")}
        icon={ChefHat}
        iconColor={ACCENT}
      />

      {/* Date filters */}
      <div
        className="rounded-xl border border-white/8 p-4 flex flex-wrap items-center gap-4"
        style={{ background: "var(--card)" }}
      >
        <div className="flex items-center gap-2">
          <label className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>{t("fromDate")}</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-[12.5px] bg-[var(--background)] border border-white/10 focus:outline-none focus:border-[#22d3ee]/50"
            style={{ color: "var(--foreground)" }}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>{t("toDate")}</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-[12.5px] bg-[var(--background)] border border-white/10 focus:outline-none focus:border-[#22d3ee]/50"
            style={{ color: "var(--foreground)" }}
          />
        </div>

        {/* View toggle */}
        <div className="ms-auto flex rounded-lg overflow-hidden border border-white/10">
          {(["orders", "recipes"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-1.5 text-[12px] font-medium transition-colors"
              style={{
                background: view === v ? ACCENT : "transparent",
                color: view === v ? "#0f172a" : "var(--muted-foreground)",
              }}
            >
              {v === "orders" ? (isRTL ? "الأوامر" : "Orders") : (isRTL ? "الوصفات" : "Recipes")}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((k) => (
          <div
            key={k.label}
            className="rounded-xl p-4 border border-white/8"
            style={{ background: "var(--card)" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span
                className="h-9 w-9 rounded-lg flex items-center justify-center"
                style={{ background: `${k.color}20`, border: `1px solid ${k.color}30` }}
              >
                <k.icon className="h-4 w-4" style={{ color: k.color }} />
              </span>
              <span className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>{k.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
              {k.value}
              {k.suffix && (
                <span className="text-[13px] font-normal ms-1" style={{ color: "var(--muted-foreground)" }}>
                  {k.suffix}
                </span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Recipe cost breakdown (always shown) */}
      {(recipes ?? []).length > 0 && (
        <div className="rounded-xl border border-white/8 overflow-hidden" style={{ background: "var(--card)" }}>
          <div className="px-5 py-3 border-b border-white/8">
            <h3 className="font-semibold text-[13px]" style={{ color: "var(--foreground)" }}>
              {isRTL ? "تكلفة الوصفات الإنتاجية" : "Recipe Cost Breakdown"}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                  {[
                    t("recipeCode"),
                    t("recipeName"),
                    t("outputItem"),
                    t("yieldQuantity"),
                    t("ingredients"),
                    t("totalRecipeCost"),
                    t("costPerUnit"),
                  ].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 font-semibold text-${isRTL ? "right" : "left"}`}
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(recipes ?? []).filter((r) => r.isActive).map((r) => (
                  <tr
                    key={r._id}
                    className="hover:bg-white/4 transition-colors"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <td className="px-4 py-2.5 font-mono text-[11px]" style={{ color: "var(--muted-foreground)" }}>{r.code}</td>
                    <td className="px-4 py-2.5 font-medium" style={{ color: "var(--foreground)" }}>{r.nameAr}</td>
                    <td className="px-4 py-2.5" style={{ color: "var(--muted-foreground)" }}>{r.outputItem?.nameAr ?? "—"}</td>
                    <td className="px-4 py-2.5 tabular-nums" style={{ color: "var(--foreground)" }}>
                      {r.yieldQuantity} {r.yieldUom?.nameAr ?? ""}
                    </td>
                    <td className="px-4 py-2.5 text-center" style={{ color: "var(--foreground)" }}>{r.lineCount}</td>
                    <td className="px-4 py-2.5 tabular-nums font-semibold" style={{ color: ACCENT }}>
                      {formatCurrency(r.totalCost)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums" style={{ color: "var(--foreground)" }}>
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
        <div className="rounded-xl border border-white/8 overflow-hidden" style={{ background: "var(--card)" }}>
          <div className="px-5 py-3 border-b border-white/8 flex items-center justify-between">
            <h3 className="font-semibold text-[13px]" style={{ color: "var(--foreground)" }}>
              {isRTL ? "تكاليف أوامر الإنتاج" : "Production Order Costs"}
            </h3>
            <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
              {orders.length} {t("ordersCount")}
            </span>
          </div>
          {orders.length === 0 ? (
            <p className="px-5 py-8 text-center text-[12px]" style={{ color: "var(--muted-foreground)" }}>
              {isRTL ? "لا توجد أوامر في هذه الفترة" : "No orders in this period"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                    {[
                      t("orderNumber"),
                      t("recipe"),
                      t("outputItem"),
                      t("plannedQty"),
                      t("actualQty"),
                      t("plannedDate"),
                      t("materialCost"),
                      t("orderStatus"),
                    ].map((h) => (
                      <th
                        key={h}
                        className={`px-4 py-3 font-semibold text-${isRTL ? "right" : "left"}`}
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const cfg = STATUS_CFG[o.status] ?? STATUS_CFG.planned;
                    return (
                      <tr
                        key={o._id}
                        className="hover:bg-white/4 transition-colors"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                      >
                        <td className="px-4 py-2.5 font-mono text-[11px]" style={{ color: ACCENT }}>{o.orderNumber}</td>
                        <td className="px-4 py-2.5" style={{ color: "var(--muted-foreground)" }}>{o.recipe?.nameAr ?? "—"}</td>
                        <td className="px-4 py-2.5 font-medium" style={{ color: "var(--foreground)" }}>{o.outputItem?.nameAr ?? "—"}</td>
                        <td className="px-4 py-2.5 tabular-nums" style={{ color: "var(--foreground)" }}>
                          {o.plannedQty} {o.uom?.nameAr ?? ""}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums" style={{ color: "var(--foreground)" }}>
                          {o.actualQty != null ? o.actualQty : "—"}
                        </td>
                        <td className="px-4 py-2.5" style={{ color: "var(--muted-foreground)" }}>{o.plannedDate}</td>
                        <td className="px-4 py-2.5 tabular-nums font-semibold" style={{ color: ACCENT }}>
                          {formatCurrency(o.materialCost ?? 0)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold"
                            style={{ color: cfg.color, background: cfg.bg }}
                          >
                            {t(`status${o.status.charAt(0).toUpperCase() + o.status.replace("_", "").slice(1).replace(/^./, (c) => c.toUpperCase())}` as any) ?? o.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
                    <td colSpan={6} className="px-4 py-3 text-[12px] font-semibold" style={{ color: "var(--muted-foreground)" }}>
                      {isRTL ? "الإجمالي" : "Total"}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-bold text-[13px]" style={{ color: ACCENT }}>
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
        /* Recipe grouped view */
        <div className="space-y-4">
          {Object.entries(recipeMap).length === 0 ? (
            <p className="text-center text-[12px] py-8" style={{ color: "var(--muted-foreground)" }}>
              {isRTL ? "لا توجد أوامر في هذه الفترة" : "No orders in this period"}
            </p>
          ) : (
            Object.entries(recipeMap).map(([key, data]) => (
              <div
                key={key}
                className="rounded-xl border border-white/8 overflow-hidden"
                style={{ background: "var(--card)" }}
              >
                <div className="px-5 py-3 border-b border-white/8 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-[13px]" style={{ color: "var(--foreground)" }}>{data.nameAr}</h3>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                      {data.orders.length} {t("ordersCount")} — {isRTL ? "الكمية المنتجة:" : "Qty produced:"} {data.totalQty.toFixed(1)}
                    </p>
                  </div>
                  <span className="text-[14px] font-bold" style={{ color: ACCENT }}>
                    {formatCurrency(data.totalCost)}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.015)" }}>
                        {[t("orderNumber"), t("plannedDate"), t("plannedQty"), t("actualQty"), t("materialCost"), t("orderStatus")].map((h) => (
                          <th key={h} className={`px-4 py-2 font-semibold text-${isRTL ? "right" : "left"}`} style={{ color: "var(--muted-foreground)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.orders.map((o) => {
                        const cfg = STATUS_CFG[o.status] ?? STATUS_CFG.planned;
                        return (
                          <tr key={o._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }} className="hover:bg-white/4 transition-colors">
                            <td className="px-4 py-2 font-mono text-[10.5px]" style={{ color: ACCENT }}>{o.orderNumber}</td>
                            <td className="px-4 py-2" style={{ color: "var(--muted-foreground)" }}>{o.plannedDate}</td>
                            <td className="px-4 py-2 tabular-nums" style={{ color: "var(--foreground)" }}>{o.plannedQty}</td>
                            <td className="px-4 py-2 tabular-nums" style={{ color: "var(--foreground)" }}>{o.actualQty ?? "—"}</td>
                            <td className="px-4 py-2 tabular-nums font-semibold" style={{ color: ACCENT }}>{formatCurrency(o.materialCost ?? 0)}</td>
                            <td className="px-4 py-2">
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ color: cfg.color, background: cfg.bg }}>
                                {o.status}
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
