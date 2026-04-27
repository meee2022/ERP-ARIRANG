// @ts-nocheck
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ChefHat, FlaskConical, ClipboardList, TrendingUp, CheckCircle2, Clock } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import Link from "next/link";

const ACCENT = "#22d3ee";

export default function ProductionDashboardPage() {
  const { t, isRTL, formatCurrency } = useI18n();

  const companies  = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId  = companies[0]?._id;

  const recipes = useQuery(
    api.production.listRecipesWithStats,
    companyId ? { companyId } : "skip"
  );
  const summary = useQuery(
    api.production.productionCostSummary,
    companyId ? { companyId } : "skip"
  );

  const loading = !companyId || recipes === undefined || summary === undefined;
  if (loading) return <LoadingState />;

  const orders      = summary?.orders ?? [];
  const planned     = orders.filter((o) => o.status === "planned").length;
  const inProgress  = orders.filter((o) => o.status === "in_progress").length;
  const completed   = orders.filter((o) => o.status === "completed").length;

  const kpis = [
    { label: t("recipes"),          value: recipes.length,  icon: FlaskConical,  color: "#a78bfa", href: "/production/recipes" },
    { label: t("statusPlanned"),    value: planned,          icon: Clock,         color: "#60a5fa", href: "/production/orders"  },
    { label: t("statusInProgress"), value: inProgress,       icon: TrendingUp,    color: "#fbbf24", href: "/production/orders"  },
    { label: t("statusCompleted"),  value: completed,        icon: CheckCircle2,  color: "#34d399", href: "/production/orders"  },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={t("productionDashboard")}
        subtitle={isRTL ? "نظرة عامة على الإنتاج والوصفات وأوامر التصنيع" : "Overview of production recipes and manufacturing orders"}
        icon={ChefHat}
        iconColor={ACCENT}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href}
            className="rounded-xl p-4 border border-white/8 hover:border-white/16 transition-all"
            style={{ background: "var(--card)" }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="h-9 w-9 rounded-lg flex items-center justify-center"
                style={{ background: `${k.color}20`, border: `1px solid ${k.color}30` }}>
                <k.icon className="h-4 w-4" style={{ color: k.color }} />
              </span>
              <span className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>{k.label}</span>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--foreground)" }}>{k.value}</p>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: "/production/recipes",       icon: FlaskConical,  color: "#a78bfa", title: t("recipesTitle"),           desc: isRTL ? "إدارة وصفات الإنتاج ومكوناتها"   : "Manage recipes and ingredients" },
          { href: "/production/orders",        icon: ClipboardList, color: ACCENT,    title: t("productionOrdersTitle"),  desc: isRTL ? "تتبع أوامر الإنتاج وحالتها"      : "Track production orders and status" },
          { href: "/reports/production-cost",  icon: TrendingUp,    color: "#fbbf24", title: t("productionCostTitle"),    desc: isRTL ? "تحليل تكاليف الإنتاج"             : "Analyze production costs" },
        ].map((card) => (
          <Link key={card.href} href={card.href}
            className="rounded-xl p-5 border border-white/8 hover:border-white/20 transition-all"
            style={{ background: "var(--card)" }}>
            <div className="flex items-center gap-3 mb-2">
              <span className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ background: `${card.color}18`, border: `1px solid ${card.color}30` }}>
                <card.icon className="h-5 w-5" style={{ color: card.color }} />
              </span>
              <span className="font-semibold text-[14px]" style={{ color: "var(--foreground)" }}>{card.title}</span>
            </div>
            <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>{card.desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      {orders.length > 0 && (
        <div className="rounded-xl border border-white/8 overflow-hidden" style={{ background: "var(--card)" }}>
          <div className="px-5 py-3 border-b border-white/8 flex items-center justify-between">
            <h3 className="font-semibold text-[13px]" style={{ color: "var(--foreground)" }}>
              {isRTL ? "أحدث أوامر الإنتاج" : "Recent Production Orders"}
            </h3>
            <Link href="/production/orders" className="text-[11px] hover:underline" style={{ color: ACCENT }}>
              {isRTL ? "عرض الكل" : "View all"}
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {[t("orderNumber"), t("outputItem"), t("plannedQty"), t("plannedDate"), t("orderStatus")].map((h) => (
                    <th key={h} className="px-4 py-2.5 font-semibold text-start"
                      style={{ color: "var(--muted-foreground)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 6).map((o) => (
                  <tr key={o._id} className="hover:bg-white/4 transition-colors"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className="px-4 py-2.5 font-mono text-[11px]" style={{ color: ACCENT }}>{o.orderNumber}</td>
                    <td className="px-4 py-2.5" style={{ color: "var(--foreground)" }}>{o.outputItem?.nameAr ?? "—"}</td>
                    <td className="px-4 py-2.5 tabular-nums" style={{ color: "var(--foreground)" }}>{o.plannedQty}</td>
                    <td className="px-4 py-2.5" style={{ color: "var(--muted-foreground)" }}>{o.plannedDate}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={o.status} t={t} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, t }: any) {
  const cfg: Record<string, { label: string; color: string; bg: string }> = {
    planned:     { label: t("statusPlanned"),    color: "#60a5fa", bg: "#60a5fa20" },
    in_progress: { label: t("statusInProgress"), color: "#fbbf24", bg: "#fbbf2420" },
    completed:   { label: t("statusCompleted"),  color: "#34d399", bg: "#34d39920" },
    cancelled:   { label: t("statusCancelled"),  color: "#f87171", bg: "#f8717120" },
  };
  const c = cfg[status] ?? { label: status, color: "#94a3b8", bg: "#94a3b820" };
  return (
    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold"
      style={{ color: c.color, background: c.bg }}>{c.label}</span>
  );
}
