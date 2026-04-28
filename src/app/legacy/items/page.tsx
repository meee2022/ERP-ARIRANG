// @ts-nocheck
"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Archive, Search, Edit2, X, Check, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
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
    imported:  "rsImported",
    reviewed:  "rsReviewed",
    cleaned:   "rsCleaned",
    mapped:    "rsMapped",
    archived:  "rsArchived",
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

export default function LegacyItemsPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { currentUser, isLoading } = useAuth();

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const rows = useQuery(api.legacy.listLegacyItems, {
    search: search || undefined,
    sourceFile: sourceFilter !== "all" ? sourceFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: 300,
  }) ?? [];

  const updateItem = useMutation(api.legacy.updateLegacyItem);

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function openEdit(row: any) {
    setEditId(row._id);
    setEditForm({
      itemName: row.itemName ?? "",
      itemGroup: row.itemGroup ?? "",
      itemType: row.itemType ?? "",
      uom: row.uom ?? "",
      unitPrice: row.unitPrice ?? "",
      notes: row.notes ?? "",
      reviewStatus: row.reviewStatus ?? "imported",
      mappedItemId: row.mappedItemId ?? "",
    });
  }

  async function onSave() {
    if (!editId) return;
    setSaving(true);
    try {
      await updateItem({
        id: editId as any,
        itemName: editForm.itemName || undefined,
        itemGroup: editForm.itemGroup || undefined,
        itemType: editForm.itemType || undefined,
        uom: editForm.uom || undefined,
        unitPrice: editForm.unitPrice !== "" ? Number(editForm.unitPrice) : undefined,
        notes: editForm.notes || undefined,
        reviewStatus: editForm.reviewStatus || undefined,
        mappedItemId: editForm.mappedItemId || undefined,
      });
      setEditId(null);
    } finally {
      setSaving(false);
    }
  }

  // All rows for filter options
  const allRows = useQuery(api.legacy.listLegacyItems, { limit: 5000 }) ?? [];
  const uniqueSources = useMemo(() => [...new Set(allRows.map((r: any) => r.sourceFile))].filter(Boolean), [allRows]);

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

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}>
            <Archive className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">{t("legacyItemsTitle")}</h1>
            <p className="text-xs text-[color:var(--ink-500)] mt-0.5">{rows.length} {t("records")}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="surface-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--ink-400)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchItems")}
            className="w-full h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] ps-9 pe-3 text-sm"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-sm"
        >
          <option value="all">{t("allFiles")}</option>
          {uniqueSources.map((s: string) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-sm"
        >
          <option value="all">{t("allStatuses3")}</option>
          {REVIEW_STATUSES.map((s) => (
            <option key={s} value={s}>{statusLabel(s, t)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="surface-card overflow-hidden rounded-lg shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface-muted)]">
                <th className="px-4 py-3 text-start font-semibold text-[color:var(--ink-600)]">{t("itemCode")}</th>
                <th className="px-4 py-3 text-start font-semibold text-[color:var(--ink-600)]">{t("itemName")}</th>
                <th className="px-4 py-3 text-start font-semibold text-[color:var(--ink-600)]">{t("itemType")}</th>
                <th className="px-4 py-3 text-start font-semibold text-[color:var(--ink-600)]">{t("unit")}</th>
                <th className="px-4 py-3 text-start font-semibold text-[color:var(--ink-600)]">{t("unitPrice")}</th>
                <th className="px-4 py-3 text-start font-semibold text-[color:var(--ink-600)]">{t("sourceFile")}</th>
                <th className="px-4 py-3 text-start font-semibold text-[color:var(--ink-600)]">{t("reviewStatus")}</th>
                <th className="px-4 py-3 text-start font-semibold text-[color:var(--ink-600)]">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-[color:var(--ink-400)]">{t("noLegacyItems")}</td></tr>
              )}
              {rows.map((row: any) => (
                <React.Fragment key={row._id}>
                  <tr
                    className="border-b border-[color:var(--border)] hover:bg-[color:var(--surface-hover)] cursor-pointer transition-colors"
                    onClick={() => setExpandedId(expandedId === row._id ? null : row._id)}
                  >
                    <td className="px-4 py-3 font-mono text-xs">{row.itemCode}</td>
                    <td className="px-4 py-3 font-medium">{row.itemName}</td>
                    <td className="px-4 py-3 text-[color:var(--ink-500)]">{row.itemType ?? "—"}</td>
                    <td className="px-4 py-3 text-[color:var(--ink-500)]">{row.uom ?? "—"}</td>
                    <td className="px-4 py-3">{row.unitPrice != null ? formatCurrency(row.unitPrice) : "—"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-[color:var(--surface-muted)] text-[color:var(--ink-500)]">{row.sourceFile}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium border ${statusBadge(row.reviewStatus)}`}>
                        {statusLabel(row.reviewStatus, t)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(row); }}
                        className="p-1.5 rounded-lg hover:bg-[color:var(--surface-muted)] text-[color:var(--ink-500)]"
                        title={t("edit")}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                  {expandedId === row._id && (
                    <tr key={`${row._id}-expand`} className="bg-[color:var(--surface-muted)]">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div><span className="font-semibold text-[color:var(--ink-600)]">{t("itemGroup")}:</span> <span>{row.itemGroup ?? "—"}</span></div>
                          <div><span className="font-semibold text-[color:var(--ink-600)]">{t("notes")}:</span> <span>{row.notes ?? "—"}</span></div>
                          <div><span className="font-semibold text-[color:var(--ink-600)]">{t("mappedItem")}:</span> <span className="font-mono text-xs">{row.mappedItemId ?? "—"}</span></div>
                          <div><span className="font-semibold text-[color:var(--ink-600)]">{t("updatedBy")}:</span> <span>{row.updatedBy ?? "—"}</span></div>
                          <div><span className="font-semibold text-[color:var(--ink-600)]">{t("updatedAt")}:</span> <span>{row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : "—"}</span></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
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
                { key: "itemName", label: t("itemName") },
                { key: "itemGroup", label: t("itemGroup") },
                { key: "itemType", label: t("itemType") },
                { key: "uom", label: t("unit") },
                { key: "unitPrice", label: t("unitPrice"), type: "number" },
                { key: "notes", label: t("notes") },
                { key: "mappedItemId", label: t("mappedItem") },
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
