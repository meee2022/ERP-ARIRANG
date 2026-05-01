// @ts-nocheck
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AlertTriangle, Package, TrendingDown, XCircle, Info } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { LoadingState } from "@/components/ui/data-display";

export default function LowStockPage() {
  const { isRTL } = useI18n();
  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const items = useQuery(
    api.items.getLowStockItems,
    companyId ? { companyId } : "skip"
  );

  if (!companyId || items === undefined) return <LoadingState />;

  const outOfStock = items.filter((i) => i.status === "out_of_stock");
  const lowStock   = items.filter((i) => i.status === "low_stock");

  const kpis = [
    {
      label:  isRTL ? "نفاد المخزون"  : "Out of Stock",
      value:  outOfStock.length,
      icon:   XCircle,
      bar:    "linear-gradient(90deg,#6b1523,#9b2335)",
      iconBg: "var(--brand-50)",
      iconColor: "var(--brand-700)",
      valueCss:  "var(--brand-700)",
      badgeBg:   "var(--brand-50)",
      badgeColor:"var(--brand-700)",
    },
    {
      label:  isRTL ? "مخزون منخفض"  : "Low Stock",
      value:  lowStock.length,
      icon:   TrendingDown,
      bar:    "linear-gradient(90deg,#9b2335,#b94455)",
      iconBg: "var(--brand-50)",
      iconColor: "#9b2335",
      valueCss:  "#9b2335",
      badgeBg:   "var(--brand-50)",
      badgeColor:"#9b2335",
    },
    {
      label:  isRTL ? "يحتاج إجراء"  : "Needs Action",
      value:  items.length,
      icon:   AlertTriangle,
      bar:    "linear-gradient(90deg,#b94455,#d4636f)",
      iconBg: "var(--brand-50)",
      iconColor: "#b94455",
      valueCss:  "#b94455",
      badgeBg:   "var(--brand-50)",
      badgeColor:"#b94455",
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto" dir={isRTL ? "rtl" : "ltr"}>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm"
          style={{ background: "linear-gradient(135deg,var(--brand-50),var(--brand-100))", border: "1px solid var(--brand-100)" }}>
          <AlertTriangle className="h-6 w-6" style={{ color: "var(--brand-700)" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[color:var(--ink-900)]">
            {isRTL ? "تنبيهات المخزون المنخفض" : "Low Stock Alerts"}
          </h1>
          <p className="text-sm text-[color:var(--ink-400)] mt-0.5">
            {isRTL ? "الأصناف التي وصلت إلى حد إعادة الطلب أو أقل" : "Items at or below their reorder point"}
          </p>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {kpis.map(({ label, value, icon: Icon, bar, iconBg, iconColor, valueCss, badgeBg, badgeColor }) => (
          <div key={label} className="bg-white rounded-2xl border border-[color:var(--brand-100)] overflow-hidden shadow-sm">
            <div className="h-1" style={{ background: bar }} />
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ background: iconBg }}>
                  <Icon className="h-5 w-5" style={{ color: iconColor }} />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{ background: badgeBg, color: badgeColor }}>
                  {value > 0 ? (isRTL ? "تنبيه" : "Alert") : (isRTL ? "جيد" : "Good")}
                </span>
              </div>
              <p className="text-[34px] font-bold leading-none tabular-nums" style={{ color: valueCss }}>{value}</p>
              <p className="text-[12px] text-[color:var(--ink-400)] mt-1.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[color:var(--brand-100)] overflow-hidden shadow-sm">
          <div className="h-1" style={{ background: "linear-gradient(90deg,#6b1523,#9b2335,#b94455)" }} />
          <div className="py-16 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-full flex items-center justify-center"
                style={{ background: "var(--brand-50)" }}>
                <Package className="h-9 w-9" style={{ color: "var(--brand-700)" }} />
              </div>
              <div className="absolute -bottom-1 -end-1 h-7 w-7 rounded-full flex items-center justify-center shadow-md"
                style={{ background: "#16a34a" }}>
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <div className="text-center">
              <p className="text-[17px] font-bold" style={{ color: "var(--brand-700)" }}>
                {isRTL ? "كل الأصناف بمستوى جيد" : "All Items Are Well Stocked"}
              </p>
              <p className="text-[13px] text-[color:var(--ink-400)] mt-1">
                {isRTL ? "لا توجد تنبيهات مخزون الآن" : "No stock alerts at this time"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[color:var(--ink-100)] overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-[color:var(--ink-100)] flex items-center justify-between"
            style={{ background: "var(--brand-50)" }}>
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4" style={{ color: "var(--brand-700)" }} />
              <p className="text-[13px] font-semibold" style={{ color: "var(--brand-700)" }}>
                {isRTL ? `${items.length} صنف يحتاج إعادة طلب` : `${items.length} items need reordering`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {outOfStock.length > 0 && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
                  style={{ background: "var(--brand-50)", color: "var(--brand-700)", borderColor: "var(--brand-100)" }}>
                  {outOfStock.length} {isRTL ? "نافد" : "out"}
                </span>
              )}
              {lowStock.length > 0 && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
                  style={{ background: "var(--brand-50)", color: "#9b2335", borderColor: "var(--brand-100)" }}>
                  {lowStock.length} {isRTL ? "منخفض" : "low"}
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr style={{ background: "#6b1523" }}>
                  {[
                    isRTL ? "الحالة"         : "Status",
                    isRTL ? "الكود"          : "Code",
                    isRTL ? "الصنف"          : "Item",
                    isRTL ? "المخزون الحالي" : "Current Stock",
                    isRTL ? "نقطة الطلب"    : "Reorder Pt.",
                    isRTL ? "النقص"          : "Shortage",
                    isRTL ? "متوسط التكلفة"  : "Avg Cost",
                  ].map((h) => (
                    <th key={h} className="px-5 py-3 text-start font-semibold text-white/80 text-[11px] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item._id}
                    className={`border-b border-[color:var(--ink-50)] hover:bg-[color:var(--brand-50)] transition-colors ${idx % 2 === 0 ? "" : "bg-[#fafafa]"}`}>
                    <td className="px-5 py-3.5">
                      {item.status === "out_of_stock" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border"
                          style={{ background: "var(--brand-50)", color: "var(--brand-700)", borderColor: "var(--brand-100)" }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--brand-700)" }} />
                          {isRTL ? "نفاد" : "OUT"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border"
                          style={{ background: "var(--brand-50)", color: "#9b2335", borderColor: "var(--brand-100)" }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#9b2335" }} />
                          {isRTL ? "منخفض" : "LOW"}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-md border text-[color:var(--ink-500)]"
                        style={{ background: "var(--brand-50)", borderColor: "var(--brand-100)" }}>
                        {item.code}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-[color:var(--ink-900)]">
                        {isRTL ? item.nameAr || item.nameEn : item.nameEn || item.nameAr}
                      </p>
                      {item.category && (
                        <p className="text-[10px] mt-0.5 text-[color:var(--ink-400)]">{item.category}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-bold tabular-nums"
                      style={{ color: item.totalQty <= 0 ? "var(--brand-700)" : "#9b2335" }}>
                      {item.totalQty.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-[color:var(--ink-500)]">
                      {item.reorderPoint.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 font-bold tabular-nums" style={{ color: "#b94455" }}>
                      {item.shortage.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-[color:var(--ink-400)]">
                      {item.avgCost.toFixed(3)} {isRTL ? "ر.ق" : "QAR"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Info Note ───────────────────────────────────────────────────── */}
      <div className="rounded-xl p-4 border flex items-start gap-3"
        style={{ background: "var(--brand-50)", borderColor: "var(--brand-100)" }}>
        <div className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: "var(--brand-100)" }}>
          <Info className="h-3.5 w-3.5" style={{ color: "var(--brand-700)" }} />
        </div>
        <p className="text-[12px] leading-relaxed" style={{ color: "var(--ink-600)" }}>
          {isRTL
            ? "تظهر هذه الصفحة الأصناف التي لها نقطة إعادة طلب محددة ووصل مخزونها إلى هذا الحد أو أقل. لتحديث نقاط الطلب، اذهب إلى الأصناف ← تعديل الصنف."
            : "This page shows items with a defined reorder point that have reached or fallen below it. To update reorder points, go to Items → Edit Item."}
        </p>
      </div>

    </div>
  );
}
