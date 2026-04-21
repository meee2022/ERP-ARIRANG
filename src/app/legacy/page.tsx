// @ts-nocheck
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Archive, Users, BarChart2, Layers, FileText, AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";

function statusBadge(status: string | undefined) {
  const s = status ?? "imported";
  const map: Record<string, string> = {
    imported:  "bg-gray-100 text-gray-600",
    reviewed:  "bg-blue-100 text-blue-700",
    cleaned:   "bg-green-100 text-green-700",
    mapped:    "bg-purple-100 text-purple-700",
    archived:  "bg-gray-200 text-gray-500",
  };
  return map[s] ?? map.imported;
}

function LegacyWarningBanner() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
      <div className="text-sm text-amber-800 space-y-0.5">
        <div className="font-semibold">Legacy Workspace — Reference / Review / Mapping Only. This data does not affect accounting operations or reports.</div>
        <div className="text-amber-700">مساحة البيانات القديمة — للمراجعة والربط المرجعي فقط. هذه البيانات لا تؤثر على العمليات المحاسبية أو التقارير.</div>
      </div>
    </div>
  );
}

function StatusBar({ counts }: { counts: any }) {
  const total = counts.total || 1;
  return (
    <div className="flex h-2 w-full rounded-full overflow-hidden gap-px">
      <div style={{ width: `${(counts.imported / total) * 100}%` }} className="bg-gray-300" title={`Imported: ${counts.imported}`} />
      <div style={{ width: `${(counts.reviewed / total) * 100}%` }} className="bg-blue-400" title={`Reviewed: ${counts.reviewed}`} />
      <div style={{ width: `${(counts.cleaned / total) * 100}%` }} className="bg-green-400" title={`Cleaned: ${counts.cleaned}`} />
      <div style={{ width: `${(counts.mapped / total) * 100}%` }} className="bg-purple-500" title={`Mapped: ${counts.mapped}`} />
      <div style={{ width: `${(counts.archived / total) * 100}%` }} className="bg-gray-400" title={`Archived: ${counts.archived}`} />
    </div>
  );
}

interface TableCardProps {
  icon: React.ReactNode;
  title: string;
  href: string;
  counts: any;
  t: any;
}

function TableCard({ icon, title, href, counts, t }: TableCardProps) {
  const mappedPct = counts.total > 0 ? Math.round((counts.mapped / counts.total) * 100) : 0;
  return (
    <Link href={href} className="surface-card p-5 hover:shadow-md transition-shadow group block">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}>
            {icon}
          </div>
          <div>
            <div className="font-semibold text-[color:var(--ink-800)] group-hover:text-[color:var(--brand-600)] transition-colors">{title}</div>
            <div className="text-xs text-[color:var(--ink-400)]">{counts.total} {t("records")}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold" style={{ color: "var(--brand-600)" }}>{mappedPct}%</div>
          <div className="text-xs text-[color:var(--ink-400)]">{t("completionPct")}</div>
        </div>
      </div>

      {/* Progress bar */}
      <StatusBar counts={counts} />

      {/* Status breakdown */}
      <div className="mt-3 grid grid-cols-5 gap-1 text-center text-xs">
        {[
          { key: "imported",  label: "I",   cls: "text-gray-500" },
          { key: "reviewed",  label: "R",   cls: "text-blue-600" },
          { key: "cleaned",   label: "C",   cls: "text-green-600" },
          { key: "mapped",    label: "M",   cls: "text-purple-600" },
          { key: "archived",  label: "A",   cls: "text-gray-400" },
        ].map(({ key, label, cls }) => (
          <div key={key} className="flex flex-col items-center gap-0.5">
            <span className={`font-bold ${cls}`}>{counts[key] ?? 0}</span>
            <span className="text-[10px] text-[color:var(--ink-400)]">{label}</span>
          </div>
        ))}
      </div>
    </Link>
  );
}

export default function LegacyDashboardPage() {
  const { t } = useI18n();
  const { currentUser, isLoading } = useAuth();

  const counts = useQuery(api.legacy.getLegacyCounts, {});
  const recentLogs = useQuery(api.legacy.getRecentLegacyAuditLogs, { limit: 5 });

  // ── Access control ────────────────────────────────────────────────────────
  if (isLoading) return <div className="p-8 text-center text-[color:var(--ink-400)]">Loading...</div>;
  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-4xl font-bold text-[color:var(--ink-300)]">🔒</div>
        <h2 className="text-xl font-bold text-[color:var(--ink-900)]">{t("accessDenied")}</h2>
        <p className="text-[color:var(--ink-500)]">{t("legacyAccessDeniedMsg")}</p>
        <Link href="/" className="btn-primary h-10 px-6 rounded-lg text-sm">{t("goHome")}</Link>
      </div>
    );
  }

  const tables = [
    {
      key: "legacyItems",
      icon: <Archive className="h-4 w-4" />,
      title: t("legacyItemsTitle"),
      href: "/legacy/items",
    },
    {
      key: "legacyRecipes",
      icon: <Layers className="h-4 w-4" />,
      title: t("legacyRecipesTitle"),
      href: "/legacy/recipes",
    },
    {
      key: "legacyInventorySnapshot",
      icon: <BarChart2 className="h-4 w-4" />,
      title: t("legacyInventoryTitle"),
      href: "/legacy/inventory",
    },
    {
      key: "legacyPLSnapshot",
      icon: <FileText className="h-4 w-4" />,
      title: t("legacyPLTitle"),
      href: "/legacy/pl",
    },
    {
      key: "legacyStaffSnapshot",
      icon: <Users className="h-4 w-4" />,
      title: t("legacyStaffTitle"),
      href: "/legacy/staff",
    },
  ];

  // Overall aggregates
  const overall = counts
    ? tables.reduce(
        (acc, tbl) => {
          const c = (counts as any)[tbl.key] ?? {};
          acc.total += c.total ?? 0;
          acc.imported += c.imported ?? 0;
          acc.reviewed += c.reviewed ?? 0;
          acc.cleaned += c.cleaned ?? 0;
          acc.mapped += c.mapped ?? 0;
          acc.archived += c.archived ?? 0;
          return acc;
        },
        { total: 0, imported: 0, reviewed: 0, cleaned: 0, mapped: 0, archived: 0 }
      )
    : null;

  const overallMappedPct = overall && overall.total > 0 ? Math.round((overall.mapped / overall.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <LegacyWarningBanner />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}>
          <Archive className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">{t("legacyDashboardTitle")}</h1>
          <p className="text-sm text-[color:var(--ink-500)]">{t("legacyDashboardDesc")}</p>
        </div>
      </div>

      {/* Overall Progress */}
      {overall && (
        <div className="surface-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-semibold text-[color:var(--ink-800)]">{t("overallProgress")}</div>
              <div className="text-xs text-[color:var(--ink-400)]">{overall.total} {t("records")} total</div>
            </div>
            <div className="text-2xl font-bold" style={{ color: "var(--brand-600)" }}>{overallMappedPct}%</div>
          </div>
          <StatusBar counts={overall} />
          <div className="mt-4 grid grid-cols-5 gap-2 text-sm text-center">
            {[
              { key: "imported", label: "Imported", cls: "text-gray-500", dot: "bg-gray-300" },
              { key: "reviewed", label: "Reviewed", cls: "text-blue-600", dot: "bg-blue-400" },
              { key: "cleaned",  label: "Cleaned",  cls: "text-green-600", dot: "bg-green-400" },
              { key: "mapped",   label: "Mapped",   cls: "text-purple-600", dot: "bg-purple-500" },
              { key: "archived", label: "Archived", cls: "text-gray-400", dot: "bg-gray-400" },
            ].map(({ key, label, cls, dot }) => (
              <div key={key} className="flex flex-col items-center gap-1">
                <div className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                <span className={`font-bold text-base ${cls}`}>{(overall as any)[key]}</span>
                <span className="text-xs text-[color:var(--ink-400)]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tables.map((tbl) => (
          <TableCard
            key={tbl.key}
            icon={tbl.icon}
            title={tbl.title}
            href={tbl.href}
            counts={counts ? (counts as any)[tbl.key] ?? { total: 0, imported: 0, reviewed: 0, cleaned: 0, mapped: 0, archived: 0 } : { total: 0, imported: 0, reviewed: 0, cleaned: 0, mapped: 0, archived: 0 }}
            t={t}
          />
        ))}
      </div>

      {/* Recent Audit Log */}
      <div className="surface-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-[color:var(--ink-400)]" />
          <h2 className="font-semibold text-[color:var(--ink-800)]">{t("recentChanges")}</h2>
        </div>
        {!recentLogs || recentLogs.length === 0 ? (
          <p className="text-sm text-[color:var(--ink-400)]">No recent changes.</p>
        ) : (
          <div className="space-y-2">
            {recentLogs.map((log: any) => (
              <div key={log._id} className="flex items-start justify-between gap-4 py-2 border-b border-[color:var(--border)] last:border-0">
                <div className="text-sm">
                  <span className="font-medium text-[color:var(--ink-700)]">{log.action}</span>
                  <span className="text-[color:var(--ink-400)] mx-1">·</span>
                  <span className="text-[color:var(--ink-500)] font-mono text-xs">{log.documentType}</span>
                </div>
                <div className="text-xs text-[color:var(--ink-400)] shrink-0">
                  {log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
