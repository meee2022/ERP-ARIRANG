// @ts-nocheck
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AlertTriangle, Package, TrendingDown, RefreshCw, XCircle, Info } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";

export default function LowStockPage() {
  const { isRTL } = useI18n();
  const companies  = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId  = companies[0]?._id;

  const items = useQuery(
    api.items.getLowStockItems,
    companyId ? { companyId } : "skip"
  );

  if (!companyId || items === undefined) return <LoadingState />;

  const outOfStock = items.filter((i) => i.status === "out_of_stock");
  const lowStock   = items.filter((i) => i.status === "low_stock");

  const kpis = [
    {
      label: isRTL ? "نفاد المخزون" : "Out of Stock",
      value: outOfStock.length,
      icon: XCircle,
      color: "#f87171",
      bg: "#f8717115",
    },
    {
      label: isRTL ? "مخزون منخفض" : "Low Stock",
      value: lowStock.length,
      icon: TrendingDown,
      color: "#fbbf24",
      bg: "#fbbf2415",
    },
    {
      label: isRTL ? "إجمالي تحتاج إجراء" : "Needs Action",
      value: items.length,
      icon: AlertTriangle,
      color: "#fb923c",
      bg: "#fb923c15",
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={isRTL ? "تنبيهات المخزون المنخفض" : "Low Stock Alerts"}
        subtitle={isRTL
          ? "الأصناف التي وصلت إلى حد إعادة الطلب أو أقل"
          : "Items at or below their reorder point"}
        icon={AlertTriangle}
        iconColor="#fbbf24"
      />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border p-4 text-center"
            style={{ background: bg, borderColor: `${color}30` }}>
            <Icon className="h-5 w-5 mx-auto mb-1" style={{ color }} />
            <p className="text-[24px] font-bold" style={{ color }}>{value}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{label}</p>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border p-10 text-center"
          style={{ background: "var(--card)", borderColor: "rgba(255,255,255,0.1)" }}>
          <Package className="h-10 w-10 mx-auto mb-3" style={{ color: "#34d399" }} />
          <p className="text-[15px] font-semibold" style={{ color: "#34d399" }}>
            {isRTL ? "✅ جميع الأصناف فوق نقطة إعادة الطلب" : "✅ All items are above reorder point"}
          </p>
          <p className="text-[12px] mt-1" style={{ color: "var(--muted-foreground)" }}>
            {isRTL ? "لا توجد تنبيهات مخزون الآن" : "No stock alerts at this time"}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden"
          style={{ background: "var(--card)", borderColor: "rgba(255,255,255,0.1)" }}>
          <div className="px-5 py-3 border-b border-white/8 flex items-center gap-2"
            style={{ background: "var(--background)" }}>
            <Info className="h-3.5 w-3.5" style={{ color: "#fbbf24" }} />
            <p className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>
              {isRTL ? `${items.length} صنف يحتاج إعادة طلب` : `${items.length} items need reordering`}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: "var(--background)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {[
                    isRTL ? "الحالة" : "Status",
                    isRTL ? "الكود" : "Code",
                    isRTL ? "الصنف" : "Item",
                    isRTL ? "المخزون الحالي" : "Current Stock",
                    isRTL ? "نقطة الطلب" : "Reorder Pt.",
                    isRTL ? "النقص" : "Shortage",
                    isRTL ? "متوسط التكلفة" : "Avg Cost",
                  ].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-start font-semibold"
                      style={{ color: "var(--muted-foreground)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}
                    className="border-b border-white/5 hover:bg-white/3 transition-colors"
                    style={{ direction: isRTL ? "rtl" : "ltr" }}>
                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={item.status === "out_of_stock"
                          ? { background: "#f8717120", color: "#f87171" }
                          : { background: "#fbbf2420", color: "#fbbf24" }}>
                        {item.status === "out_of_stock"
                          ? (isRTL ? "نفاد" : "OUT")
                          : (isRTL ? "منخفض" : "LOW")}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]"
                      style={{ color: "var(--muted-foreground)" }}>
                      {item.code}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold" style={{ color: "var(--foreground)" }}>
                        {isRTL ? item.nameAr || item.nameEn : item.nameEn || item.nameAr}
                      </p>
                      {item.category && (
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                          {item.category}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold"
                      style={{ color: item.totalQty <= 0 ? "#f87171" : "#fbbf24" }}>
                      {item.totalQty.toFixed(2)}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>
                      {item.reorderPoint.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-bold" style={{ color: "#fb923c" }}>
                      {item.shortage.toFixed(2)}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>
                      {item.avgCost.toFixed(3)} {isRTL ? "ر.ق" : "QAR"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info note */}
      <div className="rounded-xl p-4 border border-white/8 flex items-start gap-3"
        style={{ background: "var(--card)" }}>
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#22d3ee" }} />
        <p className="text-[11.5px]" style={{ color: "var(--muted-foreground)" }}>
          {isRTL
            ? "تظهر هذه الصفحة الأصناف التي لها نقطة إعادة طلب محددة ووصل مخزونها إلى هذا الحد أو أقل. لتحديث نقاط الطلب، اذهب إلى الأصناف → تعديل الصنف."
            : "This page shows items with a defined reorder point that have reached or fallen below it. To update reorder points, go to Items → Edit Item."}
        </p>
      </div>
    </div>
  );
}
