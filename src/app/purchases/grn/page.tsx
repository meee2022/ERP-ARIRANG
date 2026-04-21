// @ts-nocheck
"use client";
import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatDateShort } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Truck, Plus, X, Check, Trash2, Search, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppStore } from "@/store/useAppStore";

function todayISO() { return new Date().toISOString().split("T")[0]; }
function startOfMonthISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`; }

interface GRNLine { id: number; itemId: string; quantity: string; unitCost: string; uomId: string }

function NewGRNForm({ company, onClose }: any) {
  const { t, isRTL } = useI18n();
  const createGRN = useMutation(api.purchaseInvoices.createGRN);
  const suppliers = useQuery(api.suppliers.getAll, company ? { companyId: company._id } : "skip");
  const items = useQuery(api.items.getAllItems, company ? { companyId: company._id } : "skip");
  const warehouses = useQuery(api.items.getAllWarehouses, company ? { companyId: company._id } : "skip");
  const units = useQuery(api.items.getAllUnits, company ? { companyId: company._id } : "skip");
  const branch = useQuery(api.branches.getDefaultBranch, company ? { companyId: company._id } : "skip");
  const selectedBranchStore = useAppStore((s) => s.selectedBranch);
  const effectiveBranchId = selectedBranchStore !== "all" ? selectedBranchStore : branch?._id;
  const [receiptDate, setReceiptDate] = React.useState(todayISO());
  const openPeriod = useQuery(api.helpers.getOpenPeriod, company ? { companyId: company._id, date: receiptDate } : "skip");
  const { currentUser: defaultUser } = useAuth();
  const defaultCurrency = useQuery(api.helpers.getDefaultCurrency, {});

  const [form, setForm] = useState({ supplierId: "", warehouseId: "", notes: "" });
  const [lines, setLines] = useState<GRNLine[]>([{ id: 1, itemId: "", quantity: "1", unitCost: "0", uomId: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const addLine = () => setLines(ls => [...ls, { id: Date.now(), itemId: "", quantity: "1", unitCost: "0", uomId: "" }]);
  const removeLine = (id: number) => setLines(ls => ls.filter(l => l.id !== id));
  const updateLine = (id: number, k: keyof GRNLine, v: string) => setLines(ls => ls.map(l => l.id === id ? { ...l, [k]: v } : l));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!effectiveBranchId && !branch) { setError(t("errNoBranch")); return; }
    if (!openPeriod) { setError(t("errNoPeriod")); return; }
    if (!defaultUser) { setError(t("errNoUser")); return; }
    if (!defaultCurrency) { setError(t("errNoCurrency")); return; }
    if (!form.supplierId || !form.warehouseId) { setError(t("errRequiredFields")); return; }
    setSaving(true); setError("");
    try {
      await createGRN({
        companyId: company._id, branchId: (effectiveBranchId ?? branch?._id) as any,
        supplierId: form.supplierId as any, receiptDate: receiptDate,
        periodId: openPeriod._id, warehouseId: form.warehouseId as any,
        currencyId: defaultCurrency._id, exchangeRate: 1,
        notes: form.notes || undefined, createdBy: defaultUser._id,
        lines: lines.filter(l => l.itemId).map(l => ({
          itemId: l.itemId as any, quantity: Number(l.quantity),
          uomId: (l.uomId || units?.[0]?._id) as any,
          unitCost: Math.round(Number(l.unitCost) * 100),
          totalCost: Math.round(Number(l.quantity) * Number(l.unitCost) * 100),
        })),
      });
      onClose();
    } catch(e: any) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[color:var(--ink-900)]">{t("newGRN")}</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[color:var(--ink-50)] text-[color:var(--ink-400)]"><X className="h-4 w-4" /></button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>}
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("supplier")} *</label>
            <select required value={form.supplierId} onChange={e => setF("supplierId", e.target.value)} className="input-field h-9">
              <option value="">—</option>
              {(suppliers ?? []).map((s: any) => <option key={s._id} value={s._id}>{isRTL ? s.nameAr : (s.nameEn || s.nameAr)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("warehouse")} *</label>
            <select required value={form.warehouseId} onChange={e => setF("warehouseId", e.target.value)} className="input-field h-9">
              <option value="">—</option>
              {(warehouses ?? []).map((w: any) => <option key={w._id} value={w._id}>{isRTL ? w.nameAr : (w.nameEn || w.nameAr)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("date")} *</label>
            <input type="date" required value={receiptDate} onChange={e => setReceiptDate(e.target.value)} className="input-field h-9" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--ink-600)] mb-1">{t("notes")}</label>
            <input value={form.notes} onChange={e => setF("notes", e.target.value)} className="input-field h-9" />
          </div>
        </div>

        <div className="overflow-x-auto border border-[color:var(--ink-100)] rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--ink-50)] text-[color:var(--ink-600)] text-xs">
              <tr>
                <th className="px-3 py-2 text-start font-semibold">{t("item")}</th>
                <th className="px-3 py-2 text-end font-semibold w-28">{t("quantity")}</th>
                <th className="px-3 py-2 text-end font-semibold w-36">{t("unitCost")}</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--ink-100)]">
              {lines.map(line => (
                <tr key={line.id}>
                  <td className="px-2 py-1.5">
                    <select value={line.itemId} onChange={e => updateLine(line.id, "itemId", e.target.value)} className="input-field h-8 text-xs">
                      <option value="">—</option>
                      {(items ?? []).map((i: any) => <option key={i._id} value={i._id}>{i.code} — {isRTL ? i.nameAr : (i.nameEn || i.nameAr)}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5"><input type="number" min="0.01" step="0.01" value={line.quantity} onChange={e => updateLine(line.id, "quantity", e.target.value)} className="input-field h-8 text-xs text-end tabular-nums" /></td>
                  <td className="px-2 py-1.5"><input type="number" min="0" step="0.01" value={line.unitCost} onChange={e => updateLine(line.id, "unitCost", e.target.value)} className="input-field h-8 text-xs text-end tabular-nums" /></td>
                  <td className="px-2 py-1.5">{lines.length > 1 && <button type="button" onClick={() => removeLine(line.id)} className="p-1 rounded text-red-400 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={addLine} className="flex items-center gap-1.5 text-sm text-[color:var(--brand-700)]"><Plus className="h-4 w-4" />{t("addLine")}</button>
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary h-10 px-5 rounded-lg inline-flex items-center gap-2 text-sm font-semibold disabled:opacity-60">
            {saving ? t("saving") : <><Check className="h-4 w-4" />{t("save")}</>}
          </button>
          <button type="button" onClick={onClose} className="h-10 px-5 rounded-lg border border-[color:var(--ink-200)] text-[color:var(--ink-700)] text-sm hover:bg-[color:var(--ink-50)]">{t("cancel")}</button>
        </div>
      </form>
    </div>
  );
}

// ─── Approve GRN Button ────────────────────────────────────────────────────

function ApproveGRNButton({ grn, userId }: { grn: any; userId: string | undefined }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const approve = useMutation(api.purchaseInvoices.approveGRN);

  if (grn.documentStatus !== "draft") return null;
  if (!userId) return null;

  const handle = async () => {
    setLoading(true); setErr("");
    try { await approve({ grnId: grn._id, userId: userId as any }); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      {err && <span className="text-xs text-red-600 max-w-[180px] text-end">{err}</span>}
      <button
        onClick={handle}
        disabled={loading}
        className="h-7 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 disabled:opacity-60"
      >
        <CheckCircle className="h-3.5 w-3.5" />
        {loading ? t("approving") : t("approve")}
      </button>
    </div>
  );
}

export default function GRNPage() {
  const { t, isRTL } = useI18n();
  const { canCreate, canPost } = usePermissions();
  const [showForm, setShowForm] = useState(false);
  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const [search, setSearch] = useState("");

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const { currentUser } = useAuth();
  const grns = useQuery(api.purchaseInvoices.listGRNs, company ? { companyId: company._id, fromDate, toDate, branchId: branchArg as any } : "skip");
  const loading = grns === undefined;
  const filtered = (grns ?? []).filter((g: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (g.grnNumber || "").toLowerCase().includes(s) || (g.supplierName || "").toLowerCase().includes(s);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}>
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">{t("grnTitle")}</h1>
            <p className="text-xs text-[color:var(--ink-500)] mt-0.5">{filtered.length}</p>
          </div>
        </div>
        {canCreate("purchases") && (
        <button onClick={() => setShowForm(v => !v)} className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4" />{t("newGRN")}
        </button>
        )}
      </div>

      {showForm && <NewGRNForm company={company} onClose={() => setShowForm(false)} />}

      <div className="surface-card p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5"><span className="text-xs text-[color:var(--ink-500)]">{t("fromDate")}:</span><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input-field h-9 w-auto" /></div>
        <div className="flex items-center gap-1.5"><span className="text-xs text-[color:var(--ink-500)]">{t("toDate")}:</span><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input-field h-9 w-auto" /></div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[color:var(--ink-400)] ${isRTL ? "right-3" : "left-3"}`} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t("searchPlaceholder")} className={`input-field h-9 ${isRTL ? "pr-9" : "pl-9"}`} />
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        {loading ? <div className="p-8 text-center"><div className="animate-spin h-8 w-8 border-2 border-[color:var(--brand-600)] border-t-transparent rounded-full mx-auto mb-3" /><p className="text-sm text-[color:var(--ink-400)]">{t("loading")}</p></div>
        : filtered.length === 0 ? <div className="py-16 text-center text-[color:var(--ink-400)]"><p className="text-sm">{t("noResults")}</p>{canCreate("purchases") && <button onClick={() => setShowForm(true)} className="text-sm text-[color:var(--brand-700)] hover:underline mt-1">+ {t("newGRN")}</button>}</div>
        : (
          <div className="overflow-x-auto">
            <table className="w-full zebra-table text-sm">
              <thead className="bg-[color:var(--ink-50)] text-[color:var(--ink-600)] text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">{t("grnNo")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("date")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("supplier")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("warehouse")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("status")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g: any) => (
                  <tr key={g._id} className="border-t border-[color:var(--ink-100)] hover:bg-[color:var(--brand-50)]/40">
                    <td className="px-4 py-3 font-mono text-xs text-[color:var(--brand-700)]">{g.grnNumber}</td>
                    <td className="px-4 py-3 text-[color:var(--ink-600)]">{formatDateShort(g.receiptDate)}</td>
                    <td className="px-4 py-3 text-[color:var(--ink-700)]">{g.supplierName}</td>
                    <td className="px-4 py-3 text-[color:var(--ink-600)]">{g.warehouseName}</td>
                    <td className="px-4 py-3"><StatusBadge status={g.documentStatus} type="posting" /></td>
                    <td className="px-4 py-3 text-end">
                      {canPost("purchases") && <ApproveGRNButton grn={g} userId={currentUser?._id} />}
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
