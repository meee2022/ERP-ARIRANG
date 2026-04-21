"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Package, Search, Plus, Edit2, Power } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { usePermissions } from "@/hooks/usePermissions";

const ITEM_TYPES = [
  { value: "raw_material",       tkey: "rawMaterial"       as const },
  { value: "semi_finished_good", tkey: "semiFinishedGood"  as const },
  { value: "finished_good",      tkey: "finishedGood"      as const },
  { value: "service",            tkey: "service"           as const },
  { value: "expense_item",       tkey: "expenseItem"       as const },
];

export default function ItemsPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { canCreate, canEdit } = usePermissions();
  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const items = useQuery(api.items.getAllItems, companyId ? { companyId } : "skip") ?? [];
  const units = useQuery(api.items.getAllUnits, companyId ? { companyId } : "skip") ?? [];
  const categories = useQuery(api.items.getAllCategories, companyId ? { companyId } : "skip") ?? [];

  const createItem = useMutation(api.items.createItem);
  const updateItem = useMutation(api.items.updateItem);
  const toggleActive = useMutation(api.items.toggleItemActive);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [form, setForm] = useState({
    code: "", nameAr: "", nameEn: "", itemType: "finished_good",
    baseUomId: "", categoryId: "", standardCost: 0, sellingPrice: 0, reorderPoint: 0,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i: any) => {
      if (typeFilter !== "all" && i.itemType !== typeFilter) return false;
      if (!q) return true;
      return [i.code, i.nameAr, i.nameEn].filter(Boolean).some((v: string) => String(v).toLowerCase().includes(q));
    });
  }, [items, search, typeFilter]);

  function typeLabel(v: string) {
    const k = ITEM_TYPES.find((x) => x.value === v)?.tkey;
    return k ? t(k) : v;
  }

  function reset() {
    setForm({ code: "", nameAr: "", nameEn: "", itemType: "finished_good", baseUomId: units[0]?._id ?? "", categoryId: "", standardCost: 0, sellingPrice: 0, reorderPoint: 0 });
    setEditId(null); setErr(null);
  }
  function openNew() { reset(); setShowModal(true); }
  function openEdit(i: any) {
    setEditId(i._id);
    setForm({ code: i.code, nameAr: i.nameAr, nameEn: i.nameEn ?? "", itemType: i.itemType, baseUomId: i.baseUomId, categoryId: i.categoryId ?? "", standardCost: i.standardCost ?? 0, sellingPrice: i.sellingPrice ?? 0, reorderPoint: i.reorderPoint ?? 0 });
    setErr(null); setShowModal(true);
  }

  async function onSave() {
    if (!companyId) return;
    if (!form.nameAr.trim()) { setErr(t("nameArRequired")); return; }
    if (!editId && !form.baseUomId) { setErr(t("unitRequired")); return; }
    setSaving(true); setErr(null);
    try {
      if (editId) {
        await updateItem({ id: editId as any, nameAr: form.nameAr, nameEn: form.nameEn || undefined, standardCost: Number(form.standardCost) || 0, sellingPrice: Number(form.sellingPrice) || 0, reorderPoint: Number(form.reorderPoint) || 0 });
      } else {
        await createItem({ companyId: companyId as any, code: form.code, nameAr: form.nameAr, nameEn: form.nameEn || undefined, itemType: form.itemType as any, baseUomId: form.baseUomId as any, categoryId: (form.categoryId || undefined) as any, standardCost: Number(form.standardCost) || 0, sellingPrice: Number(form.sellingPrice) || 0, reorderPoint: Number(form.reorderPoint) || 0 });
      }
      setShowModal(false); reset();
    } catch (e: any) {
      const msg = String(e.message || e);
      if (/DUPLICATE_CODE|duplicate/i.test(msg)) setErr(t("duplicateCode"));
      else setErr(msg);
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}>
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">{t("itemsTitle")}</h1>
            <p className="text-xs text-[color:var(--ink-500)] mt-0.5">{items.length} {t("itemsCount")}</p>
          </div>
        </div>
        {canCreate("inventory") && (
        <button onClick={openNew} className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold" disabled={units.length === 0}>
          <Plus className="h-4 w-4" /> {t("newItem")}
        </button>
        )}
      </div>

      {units.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm px-4 py-3">{t("noUnits")}</div>
      )}

      <div className="surface-card p-3 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--ink-400)] ${isRTL ? "right-3" : "left-3"}`} />
          <input className={`input-field h-10 ${isRTL ? "pr-9" : "pl-9"}`} placeholder={t("searchItems")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-field h-10 w-auto" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">{t("typeAll")}</option>
          {ITEM_TYPES.map((o) => <option key={o.value} value={o.value}>{t(o.tkey)}</option>)}
        </select>
      </div>

      <div className="surface-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Package className="mx-auto h-10 w-10 text-[color:var(--ink-300)]" />
            <div className="mt-3 text-sm text-[color:var(--ink-500)]">{t("noItemsYet")}</div>
            {canCreate("inventory") && (
            <button onClick={openNew} className="mt-4 btn-primary h-9 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold" disabled={units.length === 0}>
              <Plus className="h-4 w-4" /> {t("addFirstItem")}
            </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full zebra-table text-sm">
              <thead>
                <tr className="text-[color:var(--ink-600)] text-xs uppercase tracking-wider bg-[color:var(--ink-50)]">
                  <th className="px-4 py-3 text-start font-semibold">{t("code")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("name")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("type")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("costPrice")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("sellingPrice")}</th>
                  <th className="px-4 py-3 text-center font-semibold">{t("status")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i: any) => (
                  <tr key={i._id} className="border-t border-[color:var(--ink-100)] hover:bg-[color:var(--brand-50)]/40">
                    <td className="px-4 py-3 font-mono text-xs text-[color:var(--ink-700)]">{i.code}</td>
                    <td className="px-4 py-3 font-medium text-[color:var(--ink-900)]">{isRTL ? i.nameAr : (i.nameEn || i.nameAr)}{i.nameEn && !isRTL ? null : (i.nameEn ? <div className="text-xs text-[color:var(--ink-500)]">{i.nameEn}</div> : null)}</td>
                    <td className="px-4 py-3"><span className="badge-gold">{typeLabel(i.itemType)}</span></td>
                    <td className="px-4 py-3 text-end tabular-nums">{formatCurrency(i.standardCost ?? 0)}</td>
                    <td className="px-4 py-3 text-end tabular-nums">{formatCurrency(i.sellingPrice ?? 0)}</td>
                    <td className="px-4 py-3 text-center"><span className={`badge-soft ${i.isActive ? "" : "badge-muted"}`}>{i.isActive ? t("active") : t("inactive")}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {canEdit("inventory") && (
                        <button onClick={() => openEdit(i)} className="h-8 w-8 rounded-md hover:bg-[color:var(--brand-50)] text-[color:var(--ink-600)] hover:text-[color:var(--brand-700)] flex items-center justify-center" title={t("edit")}>
                          <Edit2 className="h-4 w-4" />
                        </button>
                        )}
                        <button onClick={() => toggleActive({ id: i._id })} className="h-8 w-8 rounded-md hover:bg-[color:var(--brand-50)] text-[color:var(--ink-600)] hover:text-[color:var(--brand-700)] flex items-center justify-center" title={i.isActive ? t("deactivate") : t("activate")}>
                          <Power className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,19,22,0.55)] p-4" onClick={() => !saving && setShowModal(false)}>
          <div className="surface-card max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[color:var(--ink-900)]">{editId ? t("editItem") : t("addItem")}</h2>
              <button onClick={() => setShowModal(false)} className="text-[color:var(--ink-500)] hover:text-[color:var(--brand-700)]">×</button>
            </div>
            {err && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{err}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={t("code")} required={!editId}>
                <input className="input-field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!editId} />
              </Field>
              <Field label={t("nameAr")} required>
                <input className="input-field" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
              </Field>
              <Field label={t("nameEn")}>
                <input className="input-field" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
              </Field>
              <Field label={t("itemType")}>
                <select className="input-field" value={form.itemType} onChange={(e) => setForm({ ...form, itemType: e.target.value })} disabled={!!editId}>
                  {ITEM_TYPES.map((o) => <option key={o.value} value={o.value}>{t(o.tkey)}</option>)}
                </select>
              </Field>
              <Field label={t("unit")} required={!editId}>
                <select className="input-field" value={form.baseUomId} onChange={(e) => setForm({ ...form, baseUomId: e.target.value })} disabled={!!editId}>
                  <option value="">{t("selectUnit")}</option>
                  {units.map((u: any) => <option key={u._id} value={u._id}>{isRTL ? u.nameAr : (u.nameEn || u.nameAr)}</option>)}
                </select>
              </Field>
              <Field label={t("category")}>
                <select className="input-field" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} disabled={!!editId}>
                  <option value="">{t("withoutCategory")}</option>
                  {categories.map((c: any) => <option key={c._id} value={c._id}>{isRTL ? c.nameAr : (c.nameEn || c.nameAr)}</option>)}
                </select>
              </Field>
              <Field label={t("costPrice")}>
                <input className="input-field" type="number" value={form.standardCost} onChange={(e) => setForm({ ...form, standardCost: Number(e.target.value) })} />
              </Field>
              <Field label={t("sellingPrice")}>
                <input className="input-field" type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })} />
              </Field>
              <Field label={t("reorderPoint")}>
                <input className="input-field" type="number" value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: Number(e.target.value) })} />
              </Field>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-ghost h-10 px-4 rounded-lg text-sm font-semibold" disabled={saving}>{t("cancel")}</button>
              <button onClick={onSave} className="btn-primary h-10 px-5 rounded-lg text-sm font-semibold" disabled={saving}>
                {saving ? t("saving") : t("save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">
        {label} {required && <span className="text-[color:var(--brand-600)]">*</span>}
      </div>
      {children}
    </label>
  );
}
