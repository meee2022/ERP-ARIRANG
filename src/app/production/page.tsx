// @ts-nocheck
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ChefHat, FlaskConical, ClipboardList, TrendingUp, CheckCircle2, Clock } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import Link from "next/link";

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
    { label: t("recipes"),          value: recipes.length, icon: FlaskConical,  color: "text-[color:var(--brand-700)]", bg: "bg-[color:var(--brand-50)]",  href: "/production/recipes" },
    { label: t("statusPlanned"),    value: planned,         icon: Clock,         color: "text-blue-600",                 bg: "bg-blue-50",                   href: "/production/orders"  },
    { label: t("statusInProgress"), value: inProgress,      icon: TrendingUp,    color: "text-amber-600",                bg: "bg-amber-50",                  href: "/production/orders"  },
    { label: t("statusCompleted"),  value: completed,       icon: CheckCircle2,  color: "text-emerald-600",              bg: "bg-emerald-50",                href: "/production/orders"  },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={t("productionDashboard")}
        subtitle={isRTL ? "نظرة عامة على الإنتاج والوصفات وأوامر التصنيع" : "Overview of production recipes and manufacturing orders"}
        icon={ChefHat}
        iconColor="var(--brand-700)"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href}
            className="bg-white rounded-xl p-4 border border-[color:var(--ink-100)] hover:border-[color:var(--ink-200)] hover:shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-3">
              <span className={`h-9 w-9 rounded-lg flex items-center justify-center ${k.bg}`}>
                <k.icon className={`h-4 w-4 ${k.color}`} />
              </span>
              <span className="text-[12px] text-[color:var(--ink-500)]">{k.label}</span>
            </div>
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: "/production/recipes",       icon: FlaskConical,  iconClass: "text-[color:var(--brand-700)]", bgClass: "bg-[color:var(--brand-50)]", title: t("recipesTitle"),          desc: isRTL ? "إدارة وصفات الإنتاج ومكوناتها"   : "Manage recipes and ingredients" },
          { href: "/production/orders",        icon: ClipboardList, iconClass: "text-blue-600",                 bgClass: "bg-blue-50",                 title: t("productionOrdersTitle"), desc: isRTL ? "تتبع أوامر الإنتاج وحالتها"      : "Track production orders and status" },
          { href: "/reports/production-cost",  icon: TrendingUp,    iconClass: "text-amber-600",                bgClass: "bg-amber-50",                title: t("productionCostTitle"),   desc: isRTL ? "تحليل تكاليف الإنتاج"             : "Analyze production costs" },
        ].map((card) => (
          <Link key={card.href} href={card.href}
            className="bg-white rounded-xl p-5 border border-[color:var(--ink-100)] hover:border-[color:var(--ink-200)] hover:shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-2">
              <span className={`h-10 w-10 rounded-xl flex items-center justify-center ${card.bgClass}`}>
                <card.icon className={`h-5 w-5 ${card.iconClass}`} />
              </span>
              <span className="font-semibold text-[14px] text-[color:var(--ink-900)]">{card.title}</span>
            </div>
            <p className="text-[12px] text-[color:var(--ink-400)]">{card.desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      {orders.length > 0 && (
        <div className="bg-white rounded-xl border border-[color:var(--ink-100)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[color:var(--ink-100)] flex items-center justify-between">
            <h3 className="font-semibold text-[13px] text-[color:var(--ink-900)]">
              {isRTL ? "أحدث أوامر الإنتاج" : "Recent Production Orders"}
            </h3>
            <Link href="/production/orders"
              className="text-[11px] hover:underline text-[color:var(--brand-700)]">
              {isRTL ? "عرض الكل" : "View all"}
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr style={{ background: "#6b1523" }}>
                  {[t("orderNumber"), t("outputItem"), t("plannedQty"), t("plannedDate"), t("orderStatus")].map((h) => (
                    <th key={h} className="px-4 py-2.5 font-semibold text-start text-white/80">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 6).map((o) => (
                  <tr key={o._id}
                    className="hover:bg-[color:var(--ink-50)] transition-colors border-b border-[color:var(--ink-100)]">
                    <td className="px-4 py-2.5 font-mono text-[11px]">
                      <span className="bg-[color:var(--brand-50)] text-[color:var(--brand-700)] px-2 py-0.5 rounded font-semibold">{o.orderNumber}</span>
                    </td>
                    <td className="px-4 py-2.5 text-[color:var(--ink-900)]">{o.outputItem?.nameAr ?? "—"}</td>
                    <td className="px-4 py-2.5 tabular-nums text-[color:var(--ink-700)]">{o.plannedQty}</td>
                    <td className="px-4 py-2.5 text-[color:var(--ink-400)]">{o.plannedDate}</td>
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
  const cfg: Record<string, { label: string; cls: string }> = {
    planned:     { label: t("statusPlanned"),    cls: "bg-blue-50 text-blue-700" },
    in_progress: { label: t("statusInProgress"), cls: "bg-amber-50 text-amber-700" },
    completed:   { label: t("statusCompleted"),  cls: "bg-emerald-50 text-emerald-700" },
    cancelled:   { label: t("statusCancelled"),  cls: "bg-red-50 text-red-600" },
  };
  const c = cfg[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${c.cls}`}>{c.label}</span>
  );
}
