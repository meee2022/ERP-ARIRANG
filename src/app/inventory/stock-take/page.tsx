// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { usePermissions } from "@/hooks/usePermissions";
import { PageHeader } from "@/components/ui/page-header";
import { ColorKPIGrid, LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ClipboardList, Plus, X, Check, Calendar, Search, Filter, Eye,
  CheckCircle2, Clock, AlertTriangle, Send, FileSearch, Wallet, Hash, Warehouse,
} from "lucide-react";

function todayISO() { return new Date().toISOString().split("T")[0]; }
function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

const STATUS_CONFIG: any = {
  draft:         { ar: "مسودة",          en: "Draft",          bg: "bg-gray-100",   tx: "text-gray-700",   icon: Clock },
  in_progress:   { ar: "قيد التنفيذ",   en: "In Progress",    bg: "bg-blue-100",   tx: "text-blue-700",   icon: ClipboardList },
  pending_review:{ ar: "بانتظار المراجعة", en: "Pending Review", bg: "bg-amber-100", tx: "text-amber-700",  icon: Send },
  completed:     { ar: "مكتمل",          en: "Completed",      bg: "bg-emerald-100", tx: "text-emerald-700", icon: CheckCircle2 },
  cancelled:     { ar: "ملغي",            en: "Cancelled",      bg: "bg-red-100",    tx: "text-red-700",    icon: X },
};

// ─── New Stock Take Form ────────────────────────────────────────────────────
function NewStockTakeForm({ company, onClose, onCreated }: any) {
  const { t, isRTL } = useI18n();
  const create = useMutation(api.stockTake.createStockTake);
  const warehouses = useQuery(api.items.getAllWarehouses, company ? { companyId: company._id } : "skip");
  const branch = useQuery(api.branches.getDefaultBranch, company ? { companyId: company._id } : "skip");
  const { currentUser } = useAuth();
  const selectedBranchStore = useAppStore((s) => s.selectedBranch);
  const effectiveBranchId = selectedBranchStore !== "all" ? selectedBranchStore : branch?._id;

  const [warehouseId, setWarehouseId] = useState("");
  const [takeDate, setTakeDate]       = useState(todayISO());
  const [notes, setNotes]             = useState("");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !currentUser?._id) return;
    if (!effectiveBranchId && !branch) { setError(t("errNoBranch")); return; }
    if (!warehouseId) { setError(isRTL ? "اختر مخزناً" : "Select a warehouse"); return; }
    setSaving(true); setError("");
    try {
      const res = await create({
        companyId: company._id,
        branchId: (effectiveBranchId ?? branch?._id) as any,
        warehouseId: warehouseId as any,
        takeDate,
        notes: notes || undefined,
        createdBy: currentUser._id,
      });
      onCreated?.(res.takeId);
      onClose();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[color:var(--ink-900)]">{t("newStockTake")}</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[color:var(--ink-50)] text-[color:var(--ink-400)]">
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>}
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-[color:var(--ink-600)] mb-1">{t("warehouse")} *</label>
            <select required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="input-field h-10">
              <option value="">— {isRTL ? "اختر" : "select"} —</option>
              {(warehouses ?? []).map((w: any) => (
                <option key={w._id} value={w._id}>
                  {isRTL ? w.nameAr : (w.nameEn || w.nameAr)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[color:var(--ink-600)] mb-1">{t("takeDate")} *</label>
            <input type="date" required value={takeDate} onChange={(e) => setTakeDate(e.target.value)} className="input-field h-10" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[color:var(--ink-600)] mb-1">{t("notes")}</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="input-field h-10" placeholder={isRTL ? "مثلاً: جرد آخر الشهر" : "e.g. End of month"} />
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
          ℹ️ {isRTL
            ? "بمجرد الإنشاء، النظام سيلتقط جميع الأصناف الموجودة في المخزن بكمياتها الحالية. الأصناف المضافة لاحقاً لن تدخل في هذا الجرد."
            : "Once created, the system will snapshot all items in this warehouse with their current quantities. Items added later won't be included in this take."}
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary h-10 px-5 rounded-lg inline-flex items-center gap-2 text-sm font-semibold disabled:opacity-60">
            {saving ? t("saving") : <><Check className="h-4 w-4" />{isRTL ? "إنشاء الجرد" : "Create Stock Take"}</>}
          </button>
          <button type="button" onClick={onClose} className="h-10 px-5 rounded-lg border border-[color:var(--ink-200)] text-[color:var(--ink-700)] text-sm hover:bg-[color:var(--ink-50)]">{t("cancel")}</button>
        </div>
      </form>
    </div>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────
function StatusBadge({ status, isRTL }: any) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${cfg.bg} ${cfg.tx}`}>
      <Icon className="h-3 w-3" />
      {isRTL ? cfg.ar : cfg.en}
    </span>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function StockTakeListPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const router = useRouter();
  const { canCreate } = usePermissions();
  const [showForm, setShowForm] = useState(false);
  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate]     = useState(todayISO());
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch]     = useState("");

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];

  const takes = useQuery(
    api.stockTake.listStockTakes,
    company ? {
      companyId: company._id,
      fromDate, toDate,
      status: statusFilter !== "all" ? statusFilter : undefined,
    } : "skip"
  );
  const loading = takes === undefined;

  const filtered = (takes ?? []).filter((t: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (t.takeNumber || "").toLowerCase().includes(s) || (t.warehouseName || "").toLowerCase().includes(s);
  });

  // KPIs
  const kpis = (takes ?? []).reduce((acc: any, t: any) => {
    if (t.status === "draft" || t.status === "in_progress") acc.active++;
    else if (t.status === "pending_review") acc.pending++;
    else if (t.status === "completed") acc.completed++;
    acc.totalShortage += t.shortageValue ?? 0;
    acc.totalExcess   += t.excessValue ?? 0;
    return acc;
  }, { active: 0, pending: 0, completed: 0, totalShortage: 0, totalExcess: 0 });

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      <PageHeader
        icon={ClipboardList}
        title={t("stockTake")}
        badge={<span className="text-xs text-[color:var(--ink-500)]">{filtered.length}</span>}
        actions={
          canCreate("inventory") && (
            <button onClick={() => setShowForm((v) => !v)} className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
              <Plus className="h-4 w-4" />{t("newStockTake")}
            </button>
          )
        }
      />

      {/* KPIs */}
      <ColorKPIGrid cols={5} items={[
        { label: isRTL ? "نشط حالياً" : "Active Now", value: String(kpis.active),
          color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd", icon: ClipboardList },
        { label: isRTL ? "بانتظار المراجعة" : "Pending Review", value: String(kpis.pending),
          color: "#ca8a04", bg: "#fefce8", border: "#fde68a", icon: Send },
        { label: isRTL ? "مكتمل" : "Completed", value: String(kpis.completed),
          color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: CheckCircle2 },
        { label: isRTL ? "إجمالي النقص" : "Total Shortage", value: formatCurrency(kpis.totalShortage),
          color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: AlertTriangle },
        { label: isRTL ? "إجمالي الزيادة" : "Total Excess", value: formatCurrency(kpis.totalExcess),
          color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: Wallet },
      ]} />

      {showForm && (
        <NewStockTakeForm
          company={company}
          onClose={() => setShowForm(false)}
          onCreated={(id: string) => router.push(`/inventory/stock-take/${id}`)}
        />
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 flex flex-wrap items-end gap-3">
        <button className="h-10 px-3 border border-gray-200 rounded-md flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Filter className="h-4 w-4" /> {t("filters")}
        </button>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">{t("fromDate")}</label>
          <div className="relative">
            <Calendar className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? "right-3" : "left-3"}`} />
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className={`h-10 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} border border-gray-200 rounded-md text-sm w-[160px] focus:outline-none focus:border-gray-400`} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">{t("toDate")}</label>
          <div className="relative">
            <Calendar className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? "right-3" : "left-3"}`} />
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className={`h-10 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} border border-gray-200 rounded-md text-sm w-[160px] focus:outline-none focus:border-gray-400`} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">{t("status")}</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 border border-gray-200 rounded-md text-sm w-[160px] bg-white focus:outline-none focus:border-gray-400">
            <option value="all">{isRTL ? "الكل" : "All"}</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]: any) => (
              <option key={k} value={k}>{isRTL ? v.ar : v.en}</option>
            ))}
          </select>
        </div>
        <div className={`flex-1 min-w-[200px] ${isRTL ? "mr-auto" : "ml-auto"}`}>
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? "right-3" : "left-3"}`} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={isRTL ? "بحث برقم الجرد أو المخزن..." : "Search by take # or warehouse..."}
              className={`w-full h-10 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} border border-gray-200 rounded-md text-sm focus:outline-none focus:border-gray-400`} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-[color:var(--ink-100)] overflow-hidden">
        {loading ? (
          <LoadingState label={t("loading")} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={isRTL ? "لا توجد عمليات جرد" : "No stock takes yet"}
            action={canCreate("inventory") && (
              <button onClick={() => setShowForm(true)} className="btn-primary h-10 px-5 rounded-xl inline-flex items-center gap-2 text-sm font-semibold">
                <Plus className="h-4 w-4" /> {t("newStockTake")}
              </button>
            )}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir={isRTL ? "rtl" : "ltr"}>
              <thead>
                <tr style={{ background: "var(--brand-700)" }}>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/80 uppercase tracking-widest text-start whitespace-nowrap">{t("takeNumber")}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/80 uppercase tracking-widest text-start whitespace-nowrap">{t("takeDate")}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/80 uppercase tracking-widest text-start whitespace-nowrap">{t("warehouse")}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/80 uppercase tracking-widest text-center whitespace-nowrap">{isRTL ? "العد" : "Counted"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/80 uppercase tracking-widest text-end whitespace-nowrap">{isRTL ? "النقص" : "Shortage"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/80 uppercase tracking-widest text-end whitespace-nowrap">{isRTL ? "الزيادة" : "Excess"}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/80 uppercase tracking-widest text-center whitespace-nowrap">{t("status")}</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-white/80 uppercase tracking-widest text-center whitespace-nowrap">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((t: any) => {
                  const pct = t.totalItems > 0 ? Math.round((t.countedItems / t.totalItems) * 100) : 0;
                  return (
                    <tr key={t._id} className="hover:bg-gray-50/80 cursor-pointer" onClick={() => router.push(`/inventory/stock-take/${t._id}`)}>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                          {t.takeNumber}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-700 text-xs tabular-nums">{t.takeDate}</td>
                      <td className="px-5 py-3.5 text-gray-900 font-semibold">
                        <span className="inline-flex items-center gap-1.5">
                          <Warehouse className="h-3.5 w-3.5 text-gray-400" />
                          {isRTL ? t.warehouseName : (t.warehouseNameEn || t.warehouseName)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${pct === 100 ? "bg-emerald-500" : pct > 0 ? "bg-amber-400" : "bg-gray-300"}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] font-bold tabular-nums text-gray-600">{t.countedItems}/{t.totalItems}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-end tabular-nums text-red-600 font-semibold">
                        {t.shortageValue > 0 ? `−${formatCurrency(t.shortageValue)}` : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-end tabular-nums text-emerald-600 font-semibold">
                        {t.excessValue > 0 ? `+${formatCurrency(t.excessValue)}` : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-center"><StatusBadge status={t.status} isRTL={isRTL} /></td>
                      <td className="px-5 py-3.5 text-center">
                        <button onClick={(e) => { e.stopPropagation(); router.push(`/inventory/stock-take/${t._id}`); }}
                          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-blue-600">
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
