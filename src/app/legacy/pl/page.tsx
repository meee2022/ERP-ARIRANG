// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Archive, Edit2, X, AlertTriangle } from "lucide-react";
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

export default function LegacyPLPage() {
  const { t, formatCurrency } = useI18n();
  const { currentUser, isLoading } = useAuth();

  const [branchFilter, setBranchFilter] = useState("all");

  const rows = useQuery(api.legacy.listLegacyPLSnapshot, {
    branchName: branchFilter !== "all" ? branchFilter : undefined,
    limit: 500,
  }) ?? [];

  const allRows = useQuery(api.legacy.listLegacyPLSnapshot, { limit: 10000 }) ?? [];
  const branches = useMemo(() => [...new Set(allRows.map((r: any) => r.branchName).filter(Boolean))].sort(), [allRows]);

  const updateRow = useMutation(api.legacy.updateLegacyPLRow);

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  function openEdit(row: any) {
    setEditId(row._id);
    setEditForm({
      metricName: row.metricName ?? "",
      excelValue: row.excelValue ?? "",
      periodLabel: row.periodLabel ?? "",
      extraLabel: row.extraLabel ?? "",
      reviewStatus: row.reviewStatus ?? "imported",
      mappedAccountId: row.mappedAccountId ?? "",
    });
  }

  async function onSave() {
    if (!editId) return;
    setSaving(true);
    try {
      await updateRow({
        id: editId as any,
        metricName: editForm.metricName || undefined,
        excelValue: editForm.excelValue !== "" ? Number(editForm.excelValue) : undefined,
        periodLabel: editForm.periodLabel || undefined,
        extraLabel: editForm.extraLabel || undefined,
        reviewStatus: editForm.reviewStatus || undefined,
        mappedAccountId: editForm.mappedAccountId || undefined,
      });
      setEditId(null);
    } finally {
      setSaving(false);
    }
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
            <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">{t("legacyPLTitle")}</h1>
            <p className="text-xs text-[color:var(--ink-500)] mt-0.5">{rows.length} {t("records")}</p>
          </div>
        </div>
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="h-9 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-sm"
        >
          <option value="all">{t("allBranches")}</option>
          {branches.map((b: string) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="surface-card overflow-hidden rounded-lg shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface-muted)]">
                <th className="px-4 py-3 text-start font-semibold text-[color:var(--ink-600)]">{t("branch")}</th>
                <th className="px-4 py-3 text-start font-semibold text-[color:var(--ink-600)]">{t("period")}</th>
                <th className="px-4 py-3 text-start font-semibold text-[color:var(--ink-600)]">{t("metricName")}</th>
                <th className="px-4 py-3 text-end font-semibold text-[color:var(--ink-600)]">{t("amount")}</th>
                <th className="px-4 py-3 text-start font-semibold text-[color:var(--ink-600)]">{t("reviewStatus")}</th>
                <th className="px-4 py-3 text-start font-semibold text-[color:var(--ink-600)]">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-[color:var(--ink-400)]">{t("noLegacyPL")}</td></tr>
              )}
              {rows.map((row: any) => (
                <tr key={row._id} className="border-b border-[color:var(--border)] hover:bg-[color:var(--surface-hover)]">
                  <td className="px-4 py-3 text-[color:var(--ink-500)]">{row.branchName ?? "—"}</td>
                  <td className="px-4 py-3 text-[color:var(--ink-500)]">{row.periodLabel ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">{row.metricName}</td>
                  <td className="px-4 py-3 text-end tabular-nums">{row.excelValue != null ? formatCurrency(row.excelValue) : "—"}</td>
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
                { key: "metricName", label: t("metricName") },
                { key: "excelValue", label: t("amount"), type: "number" },
                { key: "periodLabel", label: t("period") },
                { key: "extraLabel", label: t("extraLabel") },
                { key: "mappedAccountId", label: t("mappedAccount") },
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
