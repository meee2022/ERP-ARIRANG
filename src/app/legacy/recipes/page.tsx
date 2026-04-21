// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Archive, Search, Edit2, X, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

const REVIEW_STATUSES = ["imported", "reviewed", "cleaned", "mapped", "archived"] as const;

function statusBadge(status: string | undefined) {
  const s = status ?? "imported";
  const map: Record<string, string> = {
    imported:  "bg-gray-100 text-gray-600 border-gray-200",
    reviewed:  "bg-blue-100 text-blue-700 border-blue-200",
    cleaned:   "bg-green-100 text-green-700 border-green-200",
    mapped:    "bg-purple-100 text-purple-700 border-purple-200",
    archived:  "bg-gray-200 text-gray-500 border-gray-300",
  };
  return map[s] ?? map.imported;
}

function statusLabel(s: string | undefined, t: any) {
  const map: Record<string, any> = {
    imported: "rsImported", reviewed: "rsReviewed",
    cleaned: "rsCleaned", mapped: "rsMapped", archived: "rsArchived",
  };
  return t(map[s ?? "imported"] ?? "rsImported");
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

export default function LegacyRecipesPage() {
  const { t, formatCurrency } = useI18n();
  const { currentUser, isLoading } = useAuth();

  const [search, setSearch] = useState("");
  const [fgFilter, setFgFilter] = useState("all");
  const [grouped, setGrouped] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const rows = useQuery(api.legacy.listLegacyRecipes, {
    search: search || undefined,
    fgCode: fgFilter !== "all" ? fgFilter : undefined,
    limit: 1000,
  }) ?? [];

  const allRows = useQuery(api.legacy.listLegacyRecipes, { limit: 10000 }) ?? [];
  const uniqueFGs = useMemo(() => [...new Set(allRows.map((r: any) => r.fgCode))].filter(Boolean).sort(), [allRows]);

  const updateRecipe = useMutation(api.legacy.updateLegacyRecipe);

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  function openEdit(row: any) {
    setEditId(row._id);
    setEditForm({
      fgName: row.fgName ?? "",
      componentName: row.componentName ?? "",
      componentUom: row.componentUom ?? "",
      quantity: row.quantity ?? "",
      unitCost: row.unitCost ?? "",
      lineTotal: row.lineTotal ?? "",
      reviewStatus: row.reviewStatus ?? "imported",
      mappedOutputItemId: row.mappedOutputItemId ?? "",
    });
  }

  async function onSave() {
    if (!editId) return;
    setSaving(true);
    try {
      await updateRecipe({
        id: editId as any,
        fgName: editForm.fgName || undefined,
        componentName: editForm.componentName || undefined,
        componentUom: editForm.componentUom || undefined,
        quantity: editForm.quantity !== "" ? Number(editForm.quantity) : undefined,
        unitCost: editForm.unitCost !== "" ? Number(editForm.unitCost) : undefined,
        lineTotal: editForm.lineTotal !== "" ? Number(editForm.lineTotal) : undefined,
        reviewStatus: editForm.reviewStatus || undefined,
        mappedOutputItemId: editForm.mappedOutputItemId || undefined,
      });
      setEditId(null);
    } finally {
      setSaving(false);
    }
  }

  // Group rows by fgCode
  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const r of rows) {
      const key = r.fgCode;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return map;
  }, [rows]);

  function toggleGroup(fg: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(fg)) next.delete(fg); else next.add(fg);
      return next;
    });
  }

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

  return (
    <div className="space-y-5">
      {/* Warning Banner */}
      <LegacyWarningBanner />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}>
            <Archive className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">{t("legacyRecipesTitle")}</h1>
            <p className="text-xs text-[color:var(--ink-500)] mt-0.5">{rows.length} {t("records")}</p>
          </div>
        </div>
        <button
          onClick={() => setGrouped(!grouped)}
          className="btn-ghost h-9 px-3 rounded-lg text-sm"
        >
          {t("groupByFG")}
        </button>
      </div>

      {/* Filters */}
      <div className="surface-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--ink-400)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] ps-9 pe-3 text-sm"
          />
        </div>
        <select
          value={fgFilter}
          onChange={(e) => setFgFilter(e.target.value)}
          className="h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-sm"
        >
          <option value="all">{t("all")}</option>
          {uniqueFGs.map((fg: string) => <option key={fg} value={fg}>{fg}</option>)}
        </select>
      </div>

      {/* Grouped Table */}
      <div className="surface-card overflow-hidden rounded-lg shadow-sm">
        {grouped ? (
          <div className="divide-y divide-[color:var(--border)]">
            {[...groups.entries()].map(([fgCode, lines]) => {
              const collapsed = collapsedGroups.has(fgCode);
              const fgName = lines[0]?.fgName ?? "";
              return (
                <div key={fgCode}>
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 bg-[color:var(--surface-muted)] hover:bg-[color:var(--surface-hover)] transition-colors"
                    onClick={() => toggleGroup(fgCode)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{fgCode}</span>
                      {fgName && <span className="text-[color:var(--ink-500)] text-sm">— {fgName}</span>}
                      <span className="text-xs text-[color:var(--ink-400)] bg-[color:var(--border)] rounded-full px-2 py-0.5">{lines.length}</span>
                    </div>
                    {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                  {!collapsed && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[color:var(--border)]">
                          <th className="px-4 py-2 text-start text-xs font-semibold text-[color:var(--ink-500)]">{t("componentCode")}</th>
                          <th className="px-4 py-2 text-start text-xs font-semibold text-[color:var(--ink-500)]">{t("componentName")}</th>
                          <th className="px-4 py-2 text-start text-xs font-semibold text-[color:var(--ink-500)]">{t("quantity")}</th>
                          <th className="px-4 py-2 text-start text-xs font-semibold text-[color:var(--ink-500)]">{t("unitCost")}</th>
                          <th className="px-4 py-2 text-start text-xs font-semibold text-[color:var(--ink-500)]">{t("lineTotal")}</th>
                          <th className="px-4 py-2 text-start text-xs font-semibold text-[color:var(--ink-500)]">{t("reviewStatus")}</th>
                          <th className="px-4 py-2 text-start text-xs font-semibold text-[color:var(--ink-500)]">{t("actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((row: any) => (
                          <tr key={row._id} className="border-b border-[color:var(--border)] hover:bg-[color:var(--surface-hover)]">
                            <td className="px-4 py-2 font-mono text-xs">{row.componentCode}</td>
                            <td className="px-4 py-2">{row.componentName ?? "—"}</td>
                            <td className="px-4 py-2">{row.quantity ?? "—"}</td>
                            <td className="px-4 py-2">{row.unitCost != null ? formatCurrency(row.unitCost) : "—"}</td>
                            <td className="px-4 py-2">{row.lineTotal != null ? formatCurrency(row.lineTotal) : "—"}</td>
                            <td className="px-4 py-2">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium border ${statusBadge(row.reviewStatus)}`}>
                                {statusLabel(row.reviewStatus, t)}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <button onClick={() => openEdit(row)} className="p-1 rounded hover:bg-[color:var(--surface-muted)]" title={t("edit")}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
            {groups.size === 0 && (
              <div className="text-center py-12 text-[color:var(--ink-400)]">{t("noLegacyRecipes")}</div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface-muted)]">
                  <th className="px-4 py-3 text-start font-semibold text-[color:var(--ink-600)]">{t("fgCode")}</th>
                  <th className="px-4 py-3 text-start font-semibold text-[color:var(--ink-600)]">{t("fgName")}</th>
                  <th className="px-4 py-3 text-start font-semibold text-[color:var(--ink-600)]">{t("componentCode")}</th>
                  <th className="px-4 py-3 text-start font-semibold text-[color:var(--ink-600)]">{t("componentName")}</th>
                  <th className="px-4 py-3 text-start font-semibold text-[color:var(--ink-600)]">{t("quantity")}</th>
                  <th className="px-4 py-3 text-start font-semibold text-[color:var(--ink-600)]">{t("unitCost")}</th>
                  <th className="px-4 py-3 text-start font-semibold text-[color:var(--ink-600)]">{t("lineTotal")}</th>
                  <th className="px-4 py-3 text-start font-semibold text-[color:var(--ink-600)]">{t("reviewStatus")}</th>
                  <th className="px-4 py-3 text-start font-semibold text-[color:var(--ink-600)]">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-12 text-[color:var(--ink-400)]">{t("noLegacyRecipes")}</td></tr>
                )}
                {rows.map((row: any) => (
                  <tr key={row._id} className="border-b border-[color:var(--border)] hover:bg-[color:var(--surface-hover)]">
                    <td className="px-4 py-3 font-mono text-xs">{row.fgCode}</td>
                    <td className="px-4 py-3">{row.fgName ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.componentCode}</td>
                    <td className="px-4 py-3">{row.componentName ?? "—"}</td>
                    <td className="px-4 py-3">{row.quantity ?? "—"}</td>
                    <td className="px-4 py-3">{row.unitCost != null ? formatCurrency(row.unitCost) : "—"}</td>
                    <td className="px-4 py-3">{row.lineTotal != null ? formatCurrency(row.lineTotal) : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium border ${statusBadge(row.reviewStatus)}`}>
                        {statusLabel(row.reviewStatus, t)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-[color:var(--surface-muted)]" title={t("edit")}>
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,19,22,0.55)] p-4" onClick={() => !saving && setEditId(null)}>
          <div className="surface-card max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[color:var(--ink-900)]">{t("editRecord")}</h2>
              <button onClick={() => setEditId(null)} className="p-1 rounded hover:bg-[color:var(--surface-muted)]"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              {[
                { key: "fgName", label: t("fgName") },
                { key: "componentName", label: t("componentName") },
                { key: "componentUom", label: t("componentUom") },
                { key: "quantity", label: t("quantity"), type: "number" },
                { key: "unitCost", label: t("unitCost"), type: "number" },
                { key: "lineTotal", label: t("lineTotal"), type: "number" },
                { key: "mappedOutputItemId", label: t("mappedOutputItem") },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-[color:var(--ink-600)] mb-1">{label}</label>
                  <input
                    type={type ?? "text"}
                    value={editForm[key] ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                    className="w-full h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-sm"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-[color:var(--ink-600)] mb-1">{t("reviewStatus")}</label>
                <select
                  value={editForm.reviewStatus ?? "imported"}
                  onChange={(e) => setEditForm({ ...editForm, reviewStatus: e.target.value })}
                  className="w-full h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-sm"
                >
                  {REVIEW_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s, t)}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditId(null)} className="btn-ghost h-10 px-4 rounded-lg text-sm">{t("cancel")}</button>
              <button onClick={onSave} disabled={saving} className="btn-primary h-10 px-4 rounded-lg text-sm">
                {saving ? t("saving") : t("saveChanges")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
