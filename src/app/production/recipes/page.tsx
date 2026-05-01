// @ts-nocheck
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { FlaskConical, Plus, Edit2, Power, ChevronRight, X, Trash2, Search } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/store/toastStore";

export default function RecipesPage() {
  const { t, isRTL, formatCurrency } = useI18n();

  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const [search, setSearch]         = useState("");
  const [showModal, setShowModal]   = useState(false);
  const [editRecipe, setEditRecipe] = useState<any>(null);
  const [detailId, setDetailId]     = useState<string | null>(null);

  const recipes = useQuery(api.production.listRecipesWithStats, companyId ? { companyId } : "skip");
  const detail  = useQuery(api.production.getRecipeWithDetails,  detailId  ? { id: detailId as any } : "skip");
  const items   = useQuery(api.items.getAllItems,   companyId ? { companyId } : "skip") ?? [];
  const units   = useQuery(api.items.getAllUnits,   companyId ? { companyId } : "skip") ?? [];

  const createRecipe = useMutation(api.production.createRecipe);
  const updateRecipe = useMutation(api.production.updateRecipe);
  const upsertLine   = useMutation(api.production.upsertRecipeLine);
  const deleteLine   = useMutation(api.production.deleteRecipeLine);

  if (!companyId || recipes === undefined) return <LoadingState />;

  const filtered = recipes.filter((r) =>
    !search ||
    r.nameAr.includes(search) ||
    (r.nameEn ?? "").toLowerCase().includes(search.toLowerCase()) ||
    r.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaveRecipe = async (data: any) => {
    try {
      if (editRecipe) {
        await updateRecipe({ id: editRecipe._id, ...data });
      } else {
        await createRecipe({ companyId, ...data });
      }
      setShowModal(false);
      setEditRecipe(null);
    } catch (e: any) {
      toast.error(e);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title={t("recipesTitle")}
        subtitle={t("recipesSubtitle")}
        icon={FlaskConical}
        iconColor="var(--brand-700)"
        actions={
          <button onClick={() => { setEditRecipe(null); setShowModal(true); }}
            className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> {t("newRecipe")}
          </button>
        }
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-[color:var(--ink-400)]"
          style={{ [isRTL ? "right" : "left"]: "10px" }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={isRTL ? "بحث في الوصفات..." : "Search recipes..."}
          className="w-full rounded-lg py-2 text-[12.5px] border border-[color:var(--ink-200)] bg-white focus:outline-none focus:border-[color:var(--brand-400)] transition-colors text-[color:var(--ink-900)]"
          style={{ [isRTL ? "paddingRight" : "paddingLeft"]: "34px",
            [isRTL ? "paddingLeft" : "paddingRight"]: "10px" }} />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title={t("noRecipesYet")}
          message={t("addFirstRecipe")}
          action={
            <button onClick={() => { setEditRecipe(null); setShowModal(true); }}
              className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" /> {t("addRecipe")}
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <RecipeCard key={r._id} recipe={r}
              onEdit={() => { setEditRecipe(r); setShowModal(true); }}
              onToggle={() => updateRecipe({ id: r._id, isActive: !r.isActive })}
              onDetail={() => setDetailId(r._id)}
              t={t} isRTL={isRTL} formatCurrency={formatCurrency} />
          ))}
        </div>
      )}

      {showModal && (
        <RecipeModal recipe={editRecipe} items={items} units={units}
          onSave={handleSaveRecipe}
          onClose={() => { setShowModal(false); setEditRecipe(null); }}
          t={t} isRTL={isRTL} />
      )}

      {detailId && detail !== undefined && detail !== null && (
        <IngredientsModal detail={detail} items={items} units={units}
          onClose={() => setDetailId(null)}
          upsertLine={upsertLine} deleteLine={deleteLine}
          t={t} isRTL={isRTL} formatCurrency={formatCurrency} />
      )}
    </div>
  );
}

// ── Recipe Card ───────────────────────────────────────────────────────────────
function RecipeCard({ recipe: r, onEdit, onToggle, onDetail, t, isRTL, formatCurrency }: any) {
  return (
    <div className="bg-white rounded-xl border border-[color:var(--ink-100)] hover:border-[color:var(--ink-200)] hover:shadow-sm transition-all flex flex-col">
      <div className="p-4 border-b border-[color:var(--ink-100)] flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-[color:var(--brand-50)]">
            <FlaskConical className="h-4 w-4 text-[color:var(--brand-700)]" />
          </span>
          <div>
            <p className="font-semibold text-[13px] text-[color:var(--ink-900)]">{r.nameAr}</p>
            {r.nameEn && <p className="text-[11px] text-[color:var(--ink-400)]">{r.nameEn}</p>}
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md shrink-0 bg-[color:var(--ink-100)] text-[color:var(--ink-500)]">{r.code}</span>
      </div>

      <div className="p-4 space-y-2 flex-1">
        {[
          [t("outputItem"),       r.outputItem?.nameAr ?? "—"],
          [t("yieldQuantity"),    `${r.yieldQuantity} ${r.yieldUom?.nameAr ?? ""}`],
          [t("ingredients"),      r.lineCount],
          [t("totalRecipeCost"),  formatCurrency(r.totalCost)],
          [t("costPerUnit"),      formatCurrency(r.costPerUnit)],
        ].map(([label, val]) => (
          <div key={label as string} className="flex justify-between text-[12px]">
            <span className="text-[color:var(--ink-400)]">{label}</span>
            <span className={label === t("totalRecipeCost") ? "font-semibold text-[color:var(--brand-700)]" : "text-[color:var(--ink-700)]"}>{val}</span>
          </div>
        ))}
      </div>

      <div className="px-4 py-2.5 border-t border-[color:var(--ink-100)] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-[color:var(--ink-100)] transition-colors" title={t("edit")}>
            <Edit2 className="h-3.5 w-3.5 text-[color:var(--ink-400)]" />
          </button>
          <button onClick={onToggle} className="p-1.5 rounded-md hover:bg-[color:var(--ink-100)] transition-colors">
            <Power className={`h-3.5 w-3.5 ${r.isActive ? "text-emerald-500" : "text-red-400"}`} />
          </button>
        </div>
        <button onClick={onDetail}
          className="flex items-center gap-1 text-[11.5px] font-medium text-[color:var(--brand-700)] hover:underline">
          {isRTL ? "عرض المكونات" : "View Ingredients"}
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ── Recipe Form Modal ─────────────────────────────────────────────────────────
function RecipeModal({ recipe, items, units, onSave, onClose, t, isRTL }: any) {
  const finishedItems = items.filter((i: any) =>
    i.itemType === "finished_good" || i.itemType === "semi_finished"
  );
  const [form, setForm] = useState({
    code:          recipe?.code ?? "",
    nameAr:        recipe?.nameAr ?? "",
    nameEn:        recipe?.nameEn ?? "",
    outputItemId:  recipe?.outputItemId ?? "",
    yieldQuantity: recipe?.yieldQuantity ?? 1,
    yieldUomId:    recipe?.yieldUomId ?? "",
    notes:         recipe?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ ...form, yieldQuantity: Number(form.yieldQuantity) });
    setSaving(false);
  };

  return (
    <Modal title={recipe ? t("editRecipe") : t("addRecipe")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("recipeCode")} required>
            <input value={form.code} onChange={set("code")} disabled={!!recipe} className="input-field" required />
          </Field>
          <Field label={t("recipeName")} required>
            <input value={form.nameAr} onChange={set("nameAr")} className="input-field" required />
          </Field>
        </div>
        <Field label={t("nameEn")}>
          <input value={form.nameEn} onChange={set("nameEn")} className="input-field" />
        </Field>
        <Field label={t("outputItem")} required>
          <select value={form.outputItemId} onChange={set("outputItemId")} className="input-field" required>
            <option value="">— {t("outputItem")} —</option>
            {finishedItems.map((i: any) => <option key={i._id} value={i._id}>{i.nameAr}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("yieldQuantity")} required>
            <input type="number" min="0.001" step="0.001" value={form.yieldQuantity}
              onChange={set("yieldQuantity")} className="input-field" required />
          </Field>
          <Field label={t("yieldUom")} required>
            <select value={form.yieldUomId} onChange={set("yieldUomId")} className="input-field" required>
              <option value="">— {t("unit")} —</option>
              {units.map((u: any) => <option key={u._id} value={u._id}>{u.nameAr}</option>)}
            </select>
          </Field>
        </div>
        <Field label={t("notes")}>
          <textarea value={form.notes} onChange={set("notes")} rows={2} className="input-field resize-none" />
        </Field>
        <ModalActions onClose={onClose} saving={saving} t={t} />
      </form>
    </Modal>
  );
}

// ── Ingredients Detail Modal ──────────────────────────────────────────────────
function IngredientsModal({ detail, items, units, onClose, upsertLine, deleteLine, t, isRTL, formatCurrency }: any) {
  const rawItems = items.filter((i: any) => i.itemType === "raw_material" || i.itemType === "semi_finished");
  const [adding, setAdding] = useState(false);
  const [newLine, setNewLine] = useState({ itemId: "", quantity: "1", uomId: "", wastePct: "0" });

  const lines     = detail?.lines ?? [];
  const totalCost = lines.reduce((s: number, l: any) => s + (l.unitCost ?? 0) * l.grossQuantity, 0);

  const handleAddLine = async () => {
    if (!newLine.itemId || !newLine.uomId) return;
    const qty      = parseFloat(newLine.quantity) || 1;
    const waste    = parseFloat(newLine.wastePct) || 0;
    const grossQty = qty * (1 + waste);
    const item     = items.find((i: any) => i._id === newLine.itemId);
    await upsertLine({
      recipeId: detail._id, itemId: newLine.itemId as any, quantity: qty,
      uomId: newLine.uomId as any, wastePct: waste, grossQuantity: grossQty,
      unitCost: item?.lastCost ?? item?.standardCost ?? 0,
    });
    setNewLine({ itemId: "", quantity: "1", uomId: "", wastePct: "0" });
    setAdding(false);
  };

  return (
    <Modal title={detail?.nameAr ?? ""} onClose={onClose} wide>
      <p className="text-[11px] -mt-3 mb-3 text-[color:var(--ink-400)]">
        {t("yieldQuantity")}: {detail?.yieldQuantity} {detail?.yieldUom?.nameAr} · {t("outputItem")}: {detail?.outputItem?.nameAr}
      </p>
      <div className="overflow-x-auto max-h-72 rounded-lg border border-[color:var(--ink-100)]">
        <table className="w-full text-[12px]">
          <thead style={{ background: "#6b1523" }}>
            <tr>
              {[t("ingredientItem"), t("ingredientQty"), t("unit"), t("wastePct"), t("grossQty"), t("unitCost"), ""].map((h, i) => (
                <th key={i} className="px-3 py-2 text-start font-semibold text-white/80">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line: any) => (
              <tr key={line._id} className="hover:bg-[color:var(--ink-50)] border-b border-[color:var(--ink-100)]">
                <td className="px-3 py-2 text-[color:var(--ink-900)]">{line.item?.nameAr ?? "—"}</td>
                <td className="px-3 py-2 tabular-nums text-[color:var(--ink-700)]">{line.quantity}</td>
                <td className="px-3 py-2 text-[color:var(--ink-400)]">{line.uom?.nameAr ?? "—"}</td>
                <td className="px-3 py-2 tabular-nums text-[color:var(--ink-400)]">{line.wastePct}%</td>
                <td className="px-3 py-2 tabular-nums text-[color:var(--ink-700)]">{line.grossQuantity.toFixed(3)}</td>
                <td className="px-3 py-2 tabular-nums font-semibold text-[color:var(--brand-700)]">
                  {formatCurrency((line.unitCost ?? 0) * line.grossQuantity)}
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => deleteLine({ id: line._id })}
                    className="p-1 rounded hover:bg-red-50 transition-colors">
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center pt-2">
        <span className="text-[12px] text-[color:var(--ink-400)]">{t("totalRecipeCost")}</span>
        <span className="text-[15px] font-bold text-[color:var(--brand-700)]">{formatCurrency(totalCost)}</span>
      </div>

      {adding ? (
        <div className="pt-3 border-t border-[color:var(--ink-100)] space-y-3">
          <p className="text-[12px] font-semibold text-[color:var(--ink-900)]">{t("addIngredient")}</p>
          <div className="grid grid-cols-2 gap-3">
            <select value={newLine.itemId} onChange={(e) => setNewLine((f) => ({ ...f, itemId: e.target.value }))} className="input-field col-span-2">
              <option value="">— {t("ingredientItem")} —</option>
              {rawItems.map((i: any) => <option key={i._id} value={i._id}>{i.nameAr}</option>)}
            </select>
            <select value={newLine.uomId} onChange={(e) => setNewLine((f) => ({ ...f, uomId: e.target.value }))} className="input-field">
              <option value="">— {t("unit")} —</option>
              {units.map((u: any) => <option key={u._id} value={u._id}>{u.nameAr}</option>)}
            </select>
            <input type="number" min="0" step="0.001" placeholder={t("ingredientQty")}
              value={newLine.quantity} onChange={(e) => setNewLine((f) => ({ ...f, quantity: e.target.value }))} className="input-field" />
            <input type="number" min="0" max="100" step="0.1" placeholder={`${t("wastePct")} %`}
              value={newLine.wastePct} onChange={(e) => setNewLine((f) => ({ ...f, wastePct: e.target.value }))} className="input-field" />
            <div className="flex gap-2">
              <button onClick={handleAddLine} className="btn-primary flex-1 py-2 text-[12px]">{t("save")}</button>
              <button onClick={() => setAdding(false)} className="btn-ghost flex-1 py-2 text-[12px]">{t("cancel")}</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="pt-2 border-t border-[color:var(--ink-100)]">
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-2 text-[12px] font-medium text-[color:var(--brand-700)] hover:underline">
            <Plus className="h-3.5 w-3.5" /> {t("addIngredient")}
          </button>
        </div>
      )}
    </Modal>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────
function Modal({ title, children, onClose, wide = false }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full ${wide ? "max-w-2xl" : "max-w-lg"} bg-white rounded-2xl p-6 shadow-xl border border-[color:var(--ink-100)]`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-[15px] text-[color:var(--ink-900)]">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[color:var(--ink-100)] transition-colors">
            <X className="h-4 w-4 text-[color:var(--ink-400)]" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, children }: any) {
  return (
    <div className="space-y-1">
      <label className="block text-[11.5px] font-medium text-[color:var(--ink-500)]">
        {label}{required && <span className="text-red-500 ms-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function ModalActions({ onClose, saving, t }: any) {
  return (
    <div className="flex gap-3 pt-1">
      <button type="button" onClick={onClose} className="btn-ghost flex-1 py-2 text-[13px]">{t("cancel")}</button>
      <button type="submit" disabled={saving} className="btn-primary flex-1 py-2 text-[13px] disabled:opacity-60">
        {saving ? t("saving") : t("save")}
      </button>
    </div>
  );
}
