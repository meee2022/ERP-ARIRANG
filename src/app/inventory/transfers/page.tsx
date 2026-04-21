// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatDateShort } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { ArrowLeftRight, Plus, X, Check, Trash2, Search, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppStore } from "@/store/useAppStore";

function todayISO() { return new Date().toISOString().split("T")[0]; }
function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

interface TransferLine { id: number; itemId: string; quantity: string; uomId: string }

// ─── New Transfer Form ─────────────────────────────────────────────────────────

function NewTransferForm({ onClose }: { onClose: () => void }) {
  const { t, isRTL } = useI18n();
  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const warehouses = useQuery(api.items.getAllWarehouses, company ? { companyId: company._id } : "skip");
  const items = useQuery(api.items.getAllItems, company ? { companyId: company._id } : "skip");
  const units = useQuery(api.items.getAllUnits, company ? { companyId: company._id } : "skip");
  const branch = useQuery(api.branches.getDefaultBranch, company ? { companyId: company._id } : "skip");
  const selectedBranchStore = useAppStore((s) => s.selectedBranch);
  const effectiveBranchId = selectedBranchStore !== "all" ? selectedBranchStore : branch?._id;
  const [transferDate, setTransferDate] = React.useState(todayISO());
  const openPeriod = useQuery(
    api.helpers.getOpenPeriod,
    company ? { companyId: company._id, date: transferDate } : "skip"
  );
  const { currentUser } = useAuth();
  const createTransfer = useMutation(api.inventory.createStockTransfer);

  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<TransferLine[]>([{ id: 1, itemId: "", quantity: "1", uomId: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addLine = () => setLines(ls => [...ls, { id: Date.now(), itemId: "", quantity: "1", uomId: "" }]);
  const removeLine = (id: number) => setLines(ls => ls.filter(l => l.id !== id));
  const updateLine = (id: number, k: keyof TransferLine, v: string) =>
    setLines(ls => ls.map(l => {
      if (l.id !== id) return l;
      const upd = { ...l, [k]: v };
      if (k === "itemId" && v) {
        const found = (items ?? []).find((i: any) => i._id === v);
        if (found?.baseUomId) upd.uomId = found.baseUomId;
      }
      return upd;
    }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!effectiveBranchId && !branch) { setError(t("errNoBranch")); return; }
    if (!openPeriod) { setError(t("errNoPeriod")); return; }
    if (!currentUser) { setError(t("errNoUser")); return; }
    if (!fromWarehouseId || !toWarehouseId) { setError(t("errRequiredFields")); return; }
    if (fromWarehouseId === toWarehouseId) { setError(t("errSameWarehouse")); return; }

    const validLines = lines.filter(l => l.itemId && Number(l.quantity) > 0);
    if (validLines.length === 0) { setError(t("errNoLines")); return; }

    setSaving(true); setError("");
    try {
      await createTransfer({
        companyId: company._id,
        branchId: (effectiveBranchId ?? branch?._id) as any,
        transferDate,
        periodId: openPeriod._id,
        fromWarehouseId: fromWarehouseId as any,
        toWarehouseId: toWarehouseId as any,
        notes: notes || undefined,
        createdBy: currentUser._id,
        lines: validLines.map(l => ({
          itemId: l.itemId as any,
          quantity: Number(l.quantity),
          uomId: (l.uomId || (units ?? [])[0]?._id) as any,
        })),
      });
      onClose();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[color:var(--ink-900)]">{t("newTransfer")}</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[color:var(--ink-50)] text-[color:var(--ink-400)]">
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("fromWarehouse")} *</label>
            <select required value={fromWarehouseId} onChange={e => setFromWarehouseId(e.target.value)} className="input-field h-9">
              <option value="">—</option>
              {(warehouses ?? []).map((w: any) => (
                <option key={w._id} value={w._id}>{isRTL ? w.nameAr : (w.nameEn || w.nameAr)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("toWarehouse")} *</label>
            <select required value={toWarehouseId} onChange={e => setToWarehouseId(e.target.value)} className="input-field h-9">
              <option value="">—</option>
              {(warehouses ?? []).filter((w: any) => w._id !== fromWarehouseId).map((w: any) => (
                <option key={w._id} value={w._id}>{isRTL ? w.nameAr : (w.nameEn || w.nameAr)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("date")} *</label>
            <input type="date" required value={transferDate} onChange={e => setTransferDate(e.target.value)} className="input-field h-9" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("notes")}</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className="input-field h-9" />
          </div>
        </div>

        {/* Lines */}
        <div className="overflow-x-auto border border-[color:var(--ink-100)] rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--ink-50)] text-[color:var(--ink-600)] text-xs">
              <tr>
                <th className="px-3 py-2 text-start font-semibold">{t("item")} *</th>
                <th className="px-3 py-2 text-end font-semibold w-32">{t("quantity")} *</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--ink-100)]">
              {lines.map(line => (
                <tr key={line.id}>
                  <td className="px-2 py-1.5">
                    <select value={line.itemId} onChange={e => updateLine(line.id, "itemId", e.target.value)} className="input-field h-8 text-xs w-full">
                      <option value="">—</option>
                      {(items ?? []).map((i: any) => (
                        <option key={i._id} value={i._id}>{i.code} — {isRTL ? i.nameAr : (i.nameEn || i.nameAr)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min="0.001" step="0.001" value={line.quantity}
                      onChange={e => updateLine(line.id, "quantity", e.target.value)}
                      className="input-field h-8 text-xs text-end w-full tabular-nums" />
                  </td>
                  <td className="px-2 py-1.5">
                    {lines.length > 1 && (
                      <button type="button" onClick={() => removeLine(line.id)} className="p-1 rounded text-red-400 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={addLine} className="flex items-center gap-1.5 text-sm text-[color:var(--brand-700)]">
          <Plus className="h-4 w-4" /> {t("addLine")}
        </button>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="btn-primary h-10 px-5 rounded-lg inline-flex items-center gap-2 text-sm font-semibold disabled:opacity-60">
            {saving ? t("saving") : <><Check className="h-4 w-4" />{t("save")}</>}
          </button>
          <button type="button" onClick={onClose}
            className="h-10 px-5 rounded-lg border border-[color:var(--ink-200)] text-[color:var(--ink-700)] text-sm hover:bg-[color:var(--ink-50)]">
            {t("cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Post Transfer Button ──────────────────────────────────────────────────────

function PostTransferButton({ transfer, userId }: { transfer: any; userId: string | undefined }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const post = useMutation(api.inventory.postStockTransfer);

  if (transfer.postingStatus === "posted") return null;
  if (transfer.documentStatus !== "draft") return null;
  if (!userId) return null;

  const handle = async () => {
    setLoading(true); setErr("");
    try { await post({ movementId: transfer._id, userId: userId as any }); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      {err && <span className="text-xs text-red-600 max-w-[180px] text-end">{err}</span>}
      <button onClick={handle} disabled={loading}
        className="h-7 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-60">
        <Send className="h-3.5 w-3.5" />
        {loading ? t("posting") : t("postTransfer")}
      </button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TransfersPage() {
  const { t, isRTL } = useI18n();
  const { canCreate, canPost } = usePermissions();
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const [search, setSearch] = useState("");

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  // List inventory movements of type transfer_out
  const movements = useQuery(
    api.inventory.getInventoryMovements,
    company
      ? {
          movementType: "transfer_out",
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        }
      : "skip"
  );

  const loading = movements === undefined;
  const filtered = (movements ?? []).filter((m: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (m.movementNumber || "").toLowerCase().includes(s);
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}>
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">{t("stockTransfersTitle")}</h1>
            <p className="text-xs text-[color:var(--ink-500)] mt-0.5">{filtered.length}</p>
          </div>
        </div>
        {canCreate("inventory") && (
          <button onClick={() => setShowForm(v => !v)}
            className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
            <Plus className="h-4 w-4" /> {t("newTransfer")}
          </button>
        )}
      </div>

      {showForm && <NewTransferForm onClose={() => setShowForm(false)} />}

      {/* Filters */}
      <div className="surface-card p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[color:var(--ink-500)]">{t("fromDate")}:</span>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input-field h-9 w-auto" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[color:var(--ink-500)]">{t("toDate")}:</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input-field h-9 w-auto" />
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[color:var(--ink-400)] ${isRTL ? "right-3" : "left-3"}`} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className={`input-field h-9 ${isRTL ? "pr-9" : "pl-9"}`} />
        </div>
      </div>

      {/* Table */}
      <div className="surface-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-[color:var(--brand-600)] border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-[color:var(--ink-400)]">{t("loading")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-[color:var(--ink-400)]">
            <ArrowLeftRight className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t("noResults")}</p>
            {canCreate("inventory") && (
              <button onClick={() => setShowForm(true)} className="text-sm text-[color:var(--brand-700)] hover:underline mt-1">
                + {t("newTransfer")}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full zebra-table text-sm">
              <thead className="bg-[color:var(--ink-50)] text-[color:var(--ink-600)] text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">{t("transferNo")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("date")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("fromWarehouse")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("toWarehouse")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("status")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m: any) => (
                  <tr key={m._id} className="border-t border-[color:var(--ink-100)] hover:bg-[color:var(--brand-50)]/40">
                    <td className="px-4 py-3 font-mono text-xs text-[color:var(--brand-700)]">{m.movementNumber}</td>
                    <td className="px-4 py-3 text-[color:var(--ink-600)]">{formatDateShort(m.movementDate)}</td>
                    <td className="px-4 py-3 text-[color:var(--ink-700)]">{m.warehouseName ?? "—"}</td>
                    <td className="px-4 py-3 text-[color:var(--ink-600)]">{m.destinationWarehouseName ?? "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={m.postingStatus} type="posting" /></td>
                    <td className="px-4 py-3 text-end">
                      {canPost("inventory") && <PostTransferButton transfer={m} userId={currentUser?._id} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
