// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Package, Search, Plus, Edit2, Power, X, ChevronRight,
  Users, TrendingUp, Trash2, RefreshCw,
  Box, Layers, ShoppingCart, Percent
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { usePermissions } from "@/hooks/usePermissions";
import { PageHeader } from "@/components/ui/page-header";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEM_TYPES = [
  { value: "raw_material",       label: "Raw Material"    },
  { value: "semi_finished",      label: "Semi-Finished"   },
  { value: "finished_good",      label: "Finished Good"   },
  { value: "service",            label: "Service"         },
  { value: "expense_item",       label: "Expense Item"    },
];

// Tabs for quick filtering
const PURCHASE_TYPES = [
  { value: "all",  label: "All Items",      icon: Layers },
  { value: "RM",   label: "Raw Materials",  icon: Box,         color: "bg-blue-100 text-blue-800 border-blue-200"     },
  { value: "PACK", label: "Packaging",      icon: ShoppingCart, color: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "FG",   label: "Finished Goods", icon: TrendingUp,  color: "bg-green-100 text-green-800 border-green-200"  },
];

// Category config: label + color for badge
const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  // RM Dry
  flour:              { label: "Flour & Grain",       color: "bg-amber-100  text-amber-800  border-amber-200"  },
  sweeteners:         { label: "Sweeteners",           color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  fats_oils:          { label: "Fats & Oils",          color: "bg-orange-100 text-orange-800 border-orange-200" },
  leavening_improvers:{ label: "Leavening",            color: "bg-lime-100   text-lime-800   border-lime-200"   },
  flavors_fillings:   { label: "Flavors & Fillings",   color: "bg-pink-100   text-pink-800   border-pink-200"   },
  chocolate:          { label: "Chocolate",            color: "bg-brown-100  text-amber-900  border-amber-300"  },
  nuts_seeds:         { label: "Nuts & Seeds",         color: "bg-stone-100  text-stone-800  border-stone-200"  },
  // RM Chilled / Dairy
  dairy_eggs:         { label: "Dairy & Eggs",         color: "bg-sky-100    text-sky-800    border-sky-200"    },
  // RM Frozen
  frozen:             { label: "Frozen",               color: "bg-cyan-100   text-cyan-800   border-cyan-200"   },
  // Produce
  vegetables_fruits:  { label: "Veg & Fruits",         color: "bg-green-100  text-green-800  border-green-200"  },
  // Beverages
  beverages:          { label: "Beverages",            color: "bg-teal-100   text-teal-800   border-teal-200"   },
  // Packaging
  packaging:          { label: "Packaging",            color: "bg-purple-100 text-purple-800 border-purple-200" },
  disposables:        { label: "Disposables",          color: "bg-violet-100 text-violet-800 border-violet-200" },
  // FG Categories
  bread:              { label: "Breads",               color: "bg-amber-100  text-amber-800  border-amber-200"  },
  sliced_bread:       { label: "Sliced Bread",         color: "bg-amber-50   text-amber-700  border-amber-200"  },
  buns_rolls:         { label: "Buns & Rolls",         color: "bg-orange-100 text-orange-800 border-orange-200" },
  croissants:         { label: "Croissants & Puffs",   color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  cakes_pastries:     { label: "Cakes & Pastries",     color: "bg-pink-100   text-pink-800   border-pink-200"   },
  toast:              { label: "Toast",                color: "bg-stone-100  text-stone-800  border-stone-200"  },
  flatbreads:         { label: "Flatbreads",           color: "bg-lime-100   text-lime-800   border-lime-200"   },
  pizza:              { label: "Pizza",                color: "bg-red-100    text-red-800    border-red-200"    },
  // Generic
  other_rm:           { label: "Other RM",             color: "bg-slate-100  text-slate-700  border-slate-200"  },
  cleaning:           { label: "Cleaning",             color: "bg-cyan-50    text-cyan-700   border-cyan-200"   },
  misc:               { label: "Misc",                 color: "bg-gray-100   text-gray-700   border-gray-200"   },
};

function catLabel(c: string) { return CATEGORY_CONFIG[c]?.label ?? c; }
function catColor(c: string) { return CATEGORY_CONFIG[c]?.color ?? "bg-slate-100 text-slate-700 border-slate-200"; }

// Item type display config
const ITEM_TYPE_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  raw_material:   { label: "RM",   color: "bg-blue-100 text-blue-800",   dot: "bg-blue-500"   },
  semi_finished:  { label: "SFG",  color: "bg-orange-100 text-orange-800", dot: "bg-orange-400" },
  finished_good:  { label: "FG",   color: "bg-green-100 text-green-800", dot: "bg-green-500"  },
  service:        { label: "SVC",  color: "bg-teal-100 text-teal-800",   dot: "bg-teal-400"   },
  expense_item:   { label: "EXP",  color: "bg-slate-100 text-slate-600", dot: "bg-slate-400"  },
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ItemsPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { canCreate, canEdit } = usePermissions();
  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const itemsWithStats = useQuery(api.items.getAllItemsWithStats, companyId ? { companyId } : "skip") ?? [];
  const units         = useQuery(api.items.getAllUnits, companyId ? { companyId } : "skip") ?? [];
  const categories    = useQuery(api.items.getAllCategories, companyId ? { companyId } : "skip") ?? [];
  const suppliers     = useQuery(api.suppliers.getAll, companyId ? { companyId } : "skip") ?? [];

  const createItem = useMutation(api.items.createItem);
  const updateItem = useMutation(api.items.updateItem);
  const toggleActive = useMutation(api.items.toggleItemActive);
  const deleteItem   = useMutation(api.items.deleteItem);
  const createLink   = useMutation(api.supplierItems.createLink);
  const seedFGItems  = useMutation(api.seedStaff.seedFGItems);
  const seedWHItems         = useMutation(api.seedStaff.seedWHItems);
  const seedSupplierLinks   = useMutation(api.seedStaff.seedSupplierLinks);
  const [seedingFG, setSeedingFG]               = useState(false);
  const [seedingWH, setSeedingWH]               = useState(false);
  const [seedingSuppliers, setSeedingSuppliers] = useState(false);

  const [purchaseTypeTab, setPurchaseTypeTab] = useState("all");
  const [categoryFilter, setCategoryFilter]   = useState("all");
  const [search, setSearch]                   = useState("");
  const [showModal, setShowModal]             = useState(false);
  const [editId, setEditId]                   = useState<string | null>(null);
  const [detailItem, setDetailItem]           = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm]     = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting]               = useState(false);
  const [form, setForm] = useState({
    code: "", nameAr: "", nameEn: "", itemType: "raw_material",
    baseUomId: "", categoryId: "", standardCost: 0, sellingPrice: 0, reorderPoint: 0,
  });
  // Supplier link fields shown in the create form
  const [linkSupplierId, setLinkSupplierId]   = useState("");
  const [linkUom, setLinkUom]                 = useState("");
  const [linkRefPrice, setLinkRefPrice]       = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState<string | null>(null);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total  = itemsWithStats.length;
    const rm     = itemsWithStats.filter((i: any) => i.itemType === "raw_material").length;
    const pack   = itemsWithStats.filter((i: any) => i.purchaseType === "PACK").length;
    const fg     = itemsWithStats.filter((i: any) => i.itemType === "finished_good").length;
    const withPrice  = itemsWithStats.filter((i: any) => i.itemType === "finished_good" && (i.sellingPrice ?? 0) > 0).length;
    const withSuppliers = itemsWithStats.filter((i: any) => (i.supplierCount ?? 0) > 0).length;
    return { total, rm, pack, fg, withPrice, withSuppliers };
  }, [itemsWithStats]);

  // ── Available categories for current tab ─────────────────────────────────────
  const availableCategories = useMemo(() => {
    const pool = purchaseTypeTab === "all"
      ? itemsWithStats
      : purchaseTypeTab === "FG"
        ? itemsWithStats.filter((i: any) => i.itemType === "finished_good")
        : itemsWithStats.filter((i: any) => i.purchaseType === purchaseTypeTab);
    const cats = new Set(pool.map((i: any) => i.purchaseCategory).filter(Boolean));
    return Array.from(cats) as string[];
  }, [itemsWithStats, purchaseTypeTab]);

  // Is FG tab active?
  const isFGTab = purchaseTypeTab === "FG";

  // ── Filtered items ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return itemsWithStats.filter((i: any) => {
      if (purchaseTypeTab === "FG") {
        if (i.itemType !== "finished_good") return false;
      } else if (purchaseTypeTab === "RM") {
        if (i.itemType !== "raw_material") return false;
      } else if (purchaseTypeTab === "PACK") {
        if (i.purchaseType !== "PACK") return false;
      }
      // hide expense_item and service from all tabs except "all"
      if (purchaseTypeTab !== "all" && (i.itemType === "expense_item" || i.itemType === "service")) return false;
      if (categoryFilter !== "all" && i.purchaseCategory !== categoryFilter) return false;
      if (!q) return true;
      return [i.code, i.nameAr, i.nameEn].filter(Boolean).some((v: string) => String(v).toLowerCase().includes(q));
    });
  }, [itemsWithStats, purchaseTypeTab, categoryFilter, search]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function reset() {
    setForm({ code: "", nameAr: "", nameEn: "", itemType: "raw_material", baseUomId: units[0]?._id ?? "", categoryId: "", standardCost: 0, sellingPrice: 0, reorderPoint: 0 });
    setEditId(null); setErr(null);
    setLinkSupplierId(""); setLinkUom(""); setLinkRefPrice("");
  }
  async function handleSeedFG() {
    if (!window.confirm("This will DELETE all existing Finished Goods and replace them with 85 items from the F-26 price list. Continue?")) return;
    setSeedingFG(true);
    try {
      const res = await seedFGItems({});
      alert(`Done!\n\nItems:\n  ✅ Inserted: ${res.inserted}\n  🔄 Updated (names only, prices kept): ${res.updated}\n  🗑️ Deleted: ${res.deleted}\n\nRecipes:\n  🗑️ Deleted (orphaned): ${res.recipesDeleted}\n  ✅ Kept (valid): ${res.recipesKept}`);
    } catch (e: any) {
      const msg = String(e?.message || e).replace(/\[CONVEX.*?\]\s*/g, "").replace(/Server Error\s*/gi, "").trim();
      alert("Error: " + msg);
    } finally {
      setSeedingFG(false);
    }
  }

  async function handleSeedWH() {
    if (!window.confirm(
      "This will:\n" +
      "  ✅ Keep all existing FG items (85 items)\n" +
      "  🔄 Upsert 154 RM/Packaging/Others items from WH.xlsx\n" +
      "  🗑️ DELETE all other non-FG items not in WH list\n\n" +
      "Continue?"
    )) return;
    setSeedingWH(true);
    try {
      const res = await seedWHItems({});
      alert(
        `WH Import Done!\n\n` +
        `  ✅ Inserted: ${res.inserted}\n` +
        `  🔄 Updated (name + price): ${res.updated}\n` +
        `  🗑️ Deleted (not in WH): ${res.deleted}\n` +
        `  🔒 FG items kept untouched: ${res.fgKept}\n` +
        `  📦 Total WH RM items: ${res.totalWH}`
      );
    } catch (e: any) {
      const msg = String(e?.message || e).replace(/\[CONVEX.*?\]\s*/g, "").replace(/Server Error\s*/gi, "").trim();
      alert("Error: " + msg);
    } finally {
      setSeedingWH(false);
    }
  }

  async function handleSeedSupplierLinks() {
    if (!window.confirm(
      "This will:\n" +
      "  🏭 Upsert 20 suppliers from April 2026 purchases\n" +
      "  🔗 Create 65 supplier-item price links\n" +
      "  🗑️ Delete ALL existing supplierItems for this company first\n" +
      "  ➕ Add 3 missing April items (APR-001/002/003)\n\n" +
      "Continue?"
    )) return;
    setSeedingSuppliers(true);
    try {
      const res = await seedSupplierLinks({});
      alert(
        `Supplier Links Done!\n\n` +
        `  🏭 Suppliers created: ${res.suppCreated}\n` +
        `  ✅ Suppliers existing: ${res.suppExisting}\n` +
        `  ➕ New items added: ${res.newItemsAdded}\n` +
        `  🔗 Links created: ${res.supplierLinksCreated}\n` +
        `  ⚠️ Skipped (no supplier): ${res.skipped}`
      );
    } catch (e: any) {
      const msg = String(e?.message || e).replace(/\[CONVEX.*?\]\s*/g, "").replace(/Server Error\s*/gi, "").trim();
      alert("Error: " + msg);
    } finally {
      setSeedingSuppliers(false);
    }
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
        await updateItem({ id: editId as any, nameAr: form.nameAr, nameEn: form.nameEn || undefined, itemType: form.itemType as any, baseUomId: form.baseUomId as any, categoryId: (form.categoryId || undefined) as any, standardCost: Number(form.standardCost) || 0, sellingPrice: Number(form.sellingPrice) || 0, reorderPoint: Number(form.reorderPoint) || 0 });
      } else {
        const newId = await createItem({ companyId: companyId as any, code: form.code, nameAr: form.nameAr, nameEn: form.nameEn || undefined, itemType: form.itemType as any, baseUomId: form.baseUomId as any, categoryId: (form.categoryId || undefined) as any, standardCost: Number(form.standardCost) || 0, sellingPrice: Number(form.sellingPrice) || 0, reorderPoint: Number(form.reorderPoint) || 0 });
        // If a supplier was selected, create the link
        if (linkSupplierId && newId) {
          try {
            await createLink({
              companyId: companyId as any,
              supplierId: linkSupplierId as any,
              itemId: newId as any,
              supplierItemName: form.nameAr,
              purchaseUom: linkUom || undefined,
              lastPrice: linkRefPrice ? Number(linkRefPrice) : undefined,
            });
          } catch (_e) {
            // Link creation failure is non-fatal
          }
        }
      }
      setShowModal(false); reset();
    } catch (e: any) {
      const msg = String(e.message || e);
      if (/DUPLICATE_CODE|duplicate/i.test(msg)) setErr(t("duplicateCode"));
      else setErr(msg);
    } finally { setSaving(false); }
  }

  if (itemsWithStats === undefined) return <LoadingState />;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      <div className="no-print">
        <PageHeader
          icon={Package}
          title={t("itemsTitle")}
          badge={<span className="badge-soft">{itemsWithStats.length} {t("itemsCount")}</span>}
          actions={
            canCreate("inventory") ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSeedSupplierLinks}
                  disabled={seedingSuppliers}
                  className="h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                >
                  <Users className={`h-4 w-4 ${seedingSuppliers ? "animate-spin" : ""}`} />
                  {seedingSuppliers ? "Linking..." : "Seed Supplier Links"}
                </button>
                <button
                  onClick={handleSeedWH}
                  disabled={seedingWH}
                  className="h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${seedingWH ? "animate-spin" : ""}`} />
                  {seedingWH ? "Importing..." : "Import WH Items (154)"}
                </button>
                <button
                  onClick={handleSeedFG}
                  disabled={seedingFG}
                  className="h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${seedingFG ? "animate-spin" : ""}`} />
                  {seedingFG ? "Importing..." : "Replace FG Items"}
                </button>
                <button onClick={openNew} className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold" disabled={units.length === 0}>
                  <Plus className="h-4 w-4" /> {t("newItem")}
                </button>
              </div>
            ) : undefined
          }
        />
      </div>

      {/* ── Stats Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { icon: Package,    label: "Total Items",      value: stats.total,        color: "from-slate-500 to-slate-600" },
          { icon: Box,        label: "Raw Materials",    value: stats.rm,           color: "from-blue-500 to-blue-600"   },
          { icon: ShoppingCart, label: "Packaging",      value: stats.pack,         color: "from-purple-500 to-purple-600"},
          { icon: TrendingUp, label: "Finished Goods",   value: stats.fg,           color: "from-green-500 to-green-600"  },
          { icon: Percent,    label: "FG with Prices",   value: stats.withPrice,    color: "from-emerald-500 to-emerald-600"},
        ].map((s) => (
          <div key={s.label} className={`relative overflow-hidden rounded-xl bg-white shadow-sm border p-4 hover:shadow-md transition-all duration-300 group flex-1`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
            <div className="relative flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br ${s.color} text-white`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">{s.label}</div>
                <div className="text-xl font-bold text-gray-900 tabular-nums">{s.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-[color:var(--ink-100)] pb-0">
        {PURCHASE_TYPES.map((pt) => {
          const count = pt.value === "all"
            ? itemsWithStats.length
            : pt.value === "FG"
              ? itemsWithStats.filter((i: any) => i.itemType === "finished_good").length
              : pt.value === "RM"
                ? itemsWithStats.filter((i: any) => i.itemType === "raw_material").length
                : itemsWithStats.filter((i: any) => i.purchaseType === pt.value).length;
          const Icon = pt.icon;
          const isActive = purchaseTypeTab === pt.value;
          return (
            <button
              key={pt.value}
              onClick={() => { setPurchaseTypeTab(pt.value); setCategoryFilter("all"); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                isActive
                  ? "border-[color:var(--brand-600)] text-[color:var(--brand-600)]"
                  : "border-transparent text-[color:var(--ink-500)] hover:text-[color:var(--ink-900)] hover:bg-[color:var(--ink-50)]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {pt.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? "bg-[color:var(--brand-100)] text-[color:var(--brand-700)]" : "bg-[color:var(--ink-100)] text-[color:var(--ink-500)]"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Category pills ───────────────────────────────────────────────────── */}
      {availableCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              categoryFilter === "all"
                ? "bg-[color:var(--brand-600)] text-white border-[color:var(--brand-600)]"
                : "text-[color:var(--ink-600)] border-[color:var(--ink-200)] hover:bg-[color:var(--ink-50)]"
            }`}
          >All categories</button>
          {availableCategories.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                categoryFilter === c
                  ? "bg-[color:var(--brand-600)] text-white border-[color:var(--brand-600)]"
                  : "text-[color:var(--ink-600)] border-[color:var(--ink-200)] hover:bg-[color:var(--ink-50)]"
              }`}
            >{catLabel(c)}</button>
          ))}
        </div>
      )}

      {/* ── Search ──────────────────────────────────────────────────────────── */}
      <FilterPanel>
        <FilterField label={t("searchItems")}>
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--ink-400)] ${isRTL ? "right-3" : "left-3"}`} />
            <input className={`input-field h-9 ${isRTL ? "pr-9" : "pl-9"}`} placeholder={t("searchItems")} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </FilterField>
      </FilterPanel>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="surface-card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t("noItemsYet")}
            action={
              canCreate("inventory") ? (
                <button onClick={openNew} className="btn-primary h-9 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold" disabled={units.length === 0}>
                  <Plus className="h-4 w-4" /> {t("addFirstItem")}
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
          {/* Mobile item cards */}
          <div className="mobile-list p-3 space-y-2.5">
            {filtered.map((i: any) => {
              const cost = i.standardCost ?? i.refPrice ?? null;
              const sell = i.sellingPrice ?? null;
              const gp   = (sell && cost && sell > 0) ? Math.round(((sell - cost) / sell) * 100) : null;
              const typeCfg = ITEM_TYPE_CONFIG[i.itemType] ?? { label: i.itemType, color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
              return (
                <div key={i._id} className="record-card cursor-pointer" onClick={() => setDetailItem(i)}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--ink-100)] text-[var(--ink-600)]">{i.code}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${typeCfg.color}`}>{typeCfg.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${i.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {i.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-[14px] font-bold text-[var(--ink-900)]">{isRTL ? i.nameAr : (i.nameEn || i.nameAr)}</p>
                      {i.nameEn && i.nameAr && <p className="text-[11px] text-[var(--ink-400)]">{isRTL ? i.nameEn : i.nameAr}</p>}
                    </div>
                    <div className="text-end shrink-0">
                      {sell != null && sell > 0 && <p className="text-[15px] font-bold text-green-700 tabular-nums">{formatCurrency(sell)}</p>}
                      {cost != null && cost > 0 && <p className="text-[11.5px] text-[var(--ink-500)] tabular-nums">{formatCurrency(cost)}</p>}
                      {gp !== null && <p className="text-[11px] font-bold text-blue-600">GP: {gp}%</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-[var(--ink-100)] text-[11px] text-[var(--ink-500)]">
                    {i.purchaseCategory && <span>{catLabel(i.purchaseCategory)}</span>}
                    <ChevronRight className="h-3.5 w-3.5 text-[var(--ink-300)] ms-auto" />
                  </div>
                </div>
              );
            })}
          </div>
          {/* Desktop table */}
          <div className="desktop-table overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-24">{t("code")}</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("name")}</th>
                  {purchaseTypeTab === "all" && <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-20">Type</th>}
                  <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-36">Category</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-end w-28">Cost Price</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-end w-28">Sell Price</th>
                  {isFGTab && <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center w-20">GP%</th>}
                  {!isFGTab && <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center w-20">Suppliers</th>}
                  <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center w-20">{t("status")}</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-end w-28">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((i: any, idx: number) => {
                  const cost = i.standardCost ?? i.refPrice ?? null;
                  const sell = i.sellingPrice ?? null;
                  const gp   = (sell && cost && sell > 0) ? Math.round(((sell - cost) / sell) * 100) : null;
                  const typeCfg = ITEM_TYPE_CONFIG[i.itemType] ?? { label: i.itemType, color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };

                  return (
                    <tr key={i._id} className={`group cursor-pointer transition-all duration-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`} onClick={() => setDetailItem(i)}>
                      {/* Code */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">{i.code}</span>
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-start gap-3">
                          <span className={`mt-1.5 inline-block w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${typeCfg.dot}`} />
                          <div>
                            <span className="font-semibold text-gray-900 text-sm">{isRTL ? i.nameAr : (i.nameEn || i.nameAr)}</span>
                            {i.nameEn && i.nameAr && (
                              <div className="text-[11px] text-gray-400 mt-0.5">{isRTL ? i.nameEn : i.nameAr}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type badge — only in "All" tab */}
                      {purchaseTypeTab === "all" && (
                        <td>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${typeCfg.color}`}>
                            {typeCfg.label}
                          </span>
                        </td>
                      )}

                      {/* Category */}
                      <td>
                        {i.purchaseCategory
                          ? <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium ${catColor(i.purchaseCategory)}`}>
                              {catLabel(i.purchaseCategory)}
                            </span>
                          : <span className="text-xs text-[color:var(--ink-300)]">—</span>}
                      </td>

                      {/* Cost Price */}
                      <td className="text-end">
                        {cost != null && cost > 0
                          ? <span className="text-sm font-medium text-[color:var(--ink-700)]">{formatCurrency(cost)}</span>
                          : <span className="text-xs text-[color:var(--ink-300)]">—</span>}
                      </td>

                      {/* Sell Price */}
                      <td className="text-end">
                        {sell != null && sell > 0
                          ? <span className={`text-sm font-semibold ${i.itemType === "finished_good" ? "text-green-700" : "text-[color:var(--ink-600)]"}`}>
                              {formatCurrency(sell)}
                            </span>
                          : <span className="text-xs text-[color:var(--ink-300)]">—</span>}
                      </td>

                      {/* GP% — FG tab only */}
                      {isFGTab && (
                        <td className="text-center">
                          {gp != null
                            ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                gp >= 40 ? "bg-green-100 text-green-800"
                                : gp >= 25 ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                              }`}>{gp}%</span>
                            : <span className="text-xs text-[color:var(--ink-300)]">—</span>}
                        </td>
                      )}

                      {/* Suppliers — non-FG tabs */}
                      {!isFGTab && (
                        <td className="text-center">
                          {(i.supplierCount ?? 0) > 0
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                                <Users className="h-3 w-3" />{i.supplierCount}
                              </span>
                            : <span className="text-xs text-[color:var(--ink-300)]">—</span>}
                        </td>
                      )}

                      {/* Status */}
                      <td className="text-center">
                        <span className={`badge-soft text-xs ${i.isActive ? "" : "badge-muted"}`}>
                          {i.isActive ? t("active") : t("inactive")}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                          {canEdit("inventory") && (
                            <button onClick={() => openEdit(i)} className="h-8 w-8 rounded-md hover:bg-[color:var(--brand-50)] text-[color:var(--ink-600)] hover:text-[color:var(--brand-700)] flex items-center justify-center" title={t("edit")}>
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={() => toggleActive({ id: i._id })} className="h-8 w-8 rounded-md hover:bg-[color:var(--brand-50)] text-[color:var(--ink-600)] hover:text-[color:var(--brand-700)] flex items-center justify-center" title={i.isActive ? t("deactivate") : t("activate")}>
                            <Power className="h-4 w-4" />
                          </button>
                          {canEdit("inventory") && (
                            <button onClick={() => setDeleteConfirm({ id: i._id, name: i.nameAr })} className="h-8 w-8 rounded-md hover:bg-red-50 text-[color:var(--ink-400)] hover:text-red-600 flex items-center justify-center" title="حذف الصنف">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={() => setDetailItem(i)} className="h-8 w-8 rounded-md hover:bg-[color:var(--brand-50)] text-[color:var(--ink-400)] hover:text-[color:var(--brand-700)] flex items-center justify-center">
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* ── Item Detail Drawer ───────────────────────────────────────────────── */}
      {detailItem && (
        <ItemDetailDrawer item={detailItem} onClose={() => setDetailItem(null)} formatCurrency={formatCurrency} />
      )}

      {/* ── Create / Edit Modal ──────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,19,22,0.55)] p-4" onClick={() => !saving && setShowModal(false)}>
          <div className="bg-white max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto custom-scrollbar rounded-xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[color:var(--ink-900)]">{editId ? t("editItem") : t("addItem")}</h2>
              <button onClick={() => setShowModal(false)} className="text-[color:var(--ink-500)] hover:text-[color:var(--brand-700)]"><X className="h-5 w-5" /></button>
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
                <select className="input-field" value={form.itemType} onChange={(e) => setForm({ ...form, itemType: e.target.value })}>
                  {ITEM_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label={t("unit")} required={!editId}>
                <select className="input-field" value={form.baseUomId} onChange={(e) => setForm({ ...form, baseUomId: e.target.value })}>
                  <option value="">{t("selectUnit")}</option>
                  {units.map((u: any) => <option key={u._id} value={u._id}>{u.nameEn || u.nameAr}</option>)}
                </select>
              </Field>
              <Field label={t("category")}>
                <select className="input-field" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">{t("withoutCategory")}</option>
                  {categories.map((c: any) => <option key={c._id} value={c._id}>{c.nameEn || c.nameAr}</option>)}
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

            {/* Supplier section — new items only */}
            {!editId && (
              <div className="mt-5 rounded-xl border border-[color:var(--ink-100)] p-4 bg-[color:var(--ink-50)]">
                <div className="text-xs font-bold text-[color:var(--ink-700)] uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Package className="h-3.5 w-3.5" /> ربط بمورد (اختياري)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="المورد">
                    <select className="input-field" value={linkSupplierId} onChange={(e) => setLinkSupplierId(e.target.value)}>
                      <option value="">— بدون مورد</option>
                      {suppliers.map((s: any) => (
                        <option key={s._id} value={s._id}>{s.nameAr}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="وحدة الشراء (UOM)">
                    <input className="input-field" placeholder="KG / PCS / BOX ..." value={linkUom} onChange={(e) => setLinkUom(e.target.value)} />
                  </Field>
                  <Field label="السعر المرجعي">
                    <input className="input-field" type="number" placeholder="0.00" value={linkRefPrice} onChange={(e) => setLinkRefPrice(e.target.value)} />
                  </Field>
                </div>
                {linkSupplierId && (
                  <p className="text-[10px] text-[color:var(--ink-400)] mt-2">
                    سيتم إنشاء رابط تلقائي بين الصنف والمورد بعد الحفظ.
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-ghost h-10 px-4 rounded-lg text-sm font-semibold" disabled={saving}>{t("cancel")}</button>
              <button onClick={onSave} className="btn-primary h-10 px-5 rounded-lg text-sm font-semibold" disabled={saving}>
                {saving ? t("saving") : t("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="font-bold text-gray-900">{isRTL ? "حذف الصنف" : "Delete Item"}</div>
                <div className="text-sm text-gray-500 mt-0.5">{isRTL ? "سيتم إلغاء ربطه بالموردين أيضاً" : "Will unlink from suppliers as well"}</div>
              </div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm text-red-800 font-medium mb-5">
              {deleteConfirm.name}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} disabled={deleting} className="h-9 px-4 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
                {isRTL ? "إلغاء" : "Cancel"}
              </button>
              <button
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await deleteItem({ id: deleteConfirm.id as any });
                    setDeleteConfirm(null);
                    if (detailItem?._id === deleteConfirm.id) setDetailItem(null);
                  } finally { setDeleting(false); }
                }}
                className="h-9 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                {deleting ? (isRTL ? "جاري الحذف..." : "Deleting...") : (isRTL ? "حذف نهائي" : "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Item Detail Drawer ─────────────────────────────────────────────────────

function ItemDetailDrawer({ item, onClose, formatCurrency }: { item: any; onClose: () => void; formatCurrency: (n: number) => string }) {
  const supplierRows = useQuery(api.supplierItems.getByItem, { itemId: item._id }) ?? [];
  const units        = useQuery(api.items.getAllUnits, item.companyId ? { companyId: item.companyId } : "skip") ?? [];
  const [tab, setTab] = useState<"info" | "suppliers">("info");

  function uomName(id: string) {
    const u = units.find((u: any) => u._id === id);
    return u ? (u.nameEn || u.nameAr) : id;
  }

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <div className="w-full max-w-lg h-full bg-white shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-[color:var(--ink-100)] flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-[color:var(--ink-500)] font-mono mb-1">{item.code}</div>
            <h2 className="text-base font-bold text-[color:var(--ink-900)]">{item.nameAr}</h2>
            {item.nameEn && <div className="text-sm text-[color:var(--ink-500)]">{item.nameEn}</div>}
            <div className="flex flex-wrap gap-2 mt-2">
              {item.purchaseType && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                  item.purchaseType === "RM" ? "bg-blue-100 text-blue-800 border-blue-200"
                  : item.purchaseType === "PACK" ? "bg-purple-100 text-purple-800 border-purple-200"
                  : "bg-slate-100 text-slate-700 border-slate-200"
                }`}>{item.purchaseType}</span>
              )}
              {item.purchaseCategory && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium ${catColor(item.purchaseCategory)}`}>
                  {catLabel(item.purchaseCategory)}
                </span>
              )}
              <span className={`badge-soft text-xs ${item.isActive ? "" : "badge-muted"}`}>{item.isActive ? "Active" : "Inactive"}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[color:var(--ink-50)] text-[color:var(--ink-400)]"><X className="h-5 w-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[color:var(--ink-100)] px-5">
          {["info", "suppliers"].map((t) => (
            <button key={t} onClick={() => setTab(t as any)}
              className={`py-2.5 px-4 text-sm font-semibold capitalize border-b-2 transition-colors ${
                tab === t ? "border-[color:var(--brand-600)] text-[color:var(--brand-600)]" : "border-transparent text-[color:var(--ink-500)] hover:text-[color:var(--ink-900)]"
              }`}>{t === "info" ? "Info" : `Suppliers (${supplierRows.length})`}</button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {tab === "info" && (
            <>
              {/* Key price metrics */}
              {(() => {
                const cost = item.standardCost ?? item.refPrice ?? null;
                const sell = item.sellingPrice ?? null;
                const gp   = (sell && cost && sell > 0) ? Math.round(((sell - cost) / sell) * 100) : null;
                const isFG = item.itemType === "finished_good";
                return (
                  <div className={`grid gap-3 ${isFG ? "grid-cols-3" : "grid-cols-2"}`}>
                    <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-center">
                      <div className="text-[10px] text-blue-500 font-semibold uppercase mb-1">Cost Price</div>
                      <div className="text-base font-bold text-blue-800">{cost != null && cost > 0 ? formatCurrency(cost) : "—"}</div>
                    </div>
                    {isFG && (
                      <div className="rounded-xl bg-green-50 border border-green-100 p-3 text-center">
                        <div className="text-[10px] text-green-500 font-semibold uppercase mb-1">Sell Price</div>
                        <div className="text-base font-bold text-green-800">{sell != null && sell > 0 ? formatCurrency(sell) : "—"}</div>
                      </div>
                    )}
                    <div className={`rounded-xl p-3 text-center ${isFG
                      ? gp != null
                        ? gp >= 40 ? "bg-emerald-50 border border-emerald-100" : gp >= 25 ? "bg-yellow-50 border border-yellow-100" : "bg-red-50 border border-red-100"
                        : "bg-slate-50 border border-slate-100"
                      : "bg-slate-50 border border-slate-100"
                    }`}>
                      <div className="text-[10px] text-slate-500 font-semibold uppercase mb-1">{isFG ? "Gross Profit" : "Suppliers"}</div>
                      <div className="text-base font-bold text-slate-800">
                        {isFG ? (gp != null ? `${gp}%` : "—") : String(item.supplierCount ?? 0)}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Fields */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <InfoRow label="Item Code"            value={item.code} />
                <InfoRow label="Base UOM"             value={uomName(item.baseUomId)} />
                <InfoRow label="Item Type"            value={item.itemType?.replace(/_/g, " ")} />
                <InfoRow label="Category"             value={item.purchaseCategory ? catLabel(item.purchaseCategory) : "—"} />
                <InfoRow label="Cost Price"           value={item.standardCost != null && item.standardCost > 0 ? formatCurrency(item.standardCost) : "—"} />
                <InfoRow label="Selling Price"        value={item.sellingPrice != null && item.sellingPrice > 0 ? formatCurrency(item.sellingPrice) : "—"} />
                <InfoRow label="Ref. Price"           value={item.refPrice != null ? formatCurrency(item.refPrice) : "—"} />
                <InfoRow label="Reorder Point"        value={String(item.reorderPoint ?? 0)} />
              </dl>
            </>
          )}

          {tab === "suppliers" && (
            supplierRows.length === 0 ? (
              <div className="text-sm text-[color:var(--ink-400)] py-8 text-center">No supplier catalog entries for this item</div>
            ) : (
              <div className="space-y-3">
                {supplierRows.map((row: any) => (
                  <div key={row._id} className="rounded-xl border border-[color:var(--ink-100)] p-4">
                    <div className="font-semibold text-[color:var(--ink-900)] text-sm">{row.supplier?.nameAr || row.supplier?.nameEn || "—"}</div>
                    {row.supplierItemName && <div className="text-xs text-[color:var(--ink-500)] mt-0.5">{row.supplierItemName}</div>}
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div className="text-center">
                        <div className="text-xs text-[color:var(--ink-500)]">Ref. Price</div>
                        <div className="text-sm font-bold text-[color:var(--brand-700)]">{row.lastPrice != null ? formatCurrency(row.lastPrice) : "—"}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-[color:var(--ink-500)]">UOM</div>
                        <div className="text-sm font-bold text-[color:var(--ink-700)]">{row.purchaseUom ?? "—"}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-[color:var(--ink-500)]">Purchases</div>
                        <div className="text-sm font-bold text-[color:var(--ink-400)]">—</div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2 text-[10px] text-[color:var(--ink-500)]">
                      {row.purchaseUom && <span>UOM: {row.purchaseUom}</span>}
                      <span className="text-[color:var(--ink-300)]">· purchase history from real transactions</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-xs text-[color:var(--ink-500)]">{label}</dt>
      <dd className="text-sm font-medium text-[color:var(--ink-900)] text-end">{value}</dd>
    </>
  );
}
