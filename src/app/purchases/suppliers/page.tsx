// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Truck, Search, Plus, Edit2, Power, Package, Trash2, X, AlertTriangle, Building2, Phone, Mail, MapPin, Hash, Clock, FileText, DollarSign, TrendingUp, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { usePermissions } from "@/hooks/usePermissions";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const PURCHASE_TYPE_LABELS: Record<string, { ar: string; en: string; cls: string }> = {
  RM:     { ar: "خامات",      en: "Raw Material",  cls: "bg-blue-50 text-blue-700" },
  PACK:   { ar: "تعبئة",      en: "Packaging",     cls: "bg-purple-50 text-purple-700" },
  OTHERS: { ar: "أخرى",       en: "Others",        cls: "bg-gray-50 text-gray-600" },
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const { t, isRTL, formatCurrency, formatDate } = useI18n();
  const { canCreate, canEdit } = usePermissions();

  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const suppliers = useQuery(api.suppliers.getWithStats, companyId ? { companyId } : "skip") ?? [];
  const accounts = useQuery(api.accounts.getAll, companyId ? { companyId } : "skip") ?? [];

  const apAccounts = useMemo(() => accounts.filter((a: any) => a.accountSubType === "payable" && a.isActive), [accounts]);

  const createSupplier     = useMutation(api.suppliers.create);
  const updateSupplier     = useMutation(api.suppliers.update);
  const toggleActive       = useMutation(api.suppliers.toggleActive);
  const deleteSupplier     = useMutation(api.suppliers.deleteSupplier);

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const addSupplierItem    = useMutation(api.supplierItems.add);
  const removeSupplierItem = useMutation(api.supplierItems.remove);

  const [search, setSearch]               = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [activeTab, setActiveTab]         = useState<"info" | "items" | "invoices">("info");
  const [editMode, setEditMode]           = useState(false);

  // Create / Edit form
  const [form, setForm] = useState({
    code: "", nameAr: "", nameEn: "", phone: "", mobile: "", email: "", address: "", taxNumber: "", paymentTerms: "", notes: "", accountId: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState<string | null>(null);

  // Add-item-to-supplier modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemForm, setItemForm] = useState({ itemId: "", supplierItemCode: "", supplierPrice: "" });
  const [itemSaving, setItemSaving] = useState(false);
  const [itemErr, setItemErr]       = useState<string | null>(null);

  const allItems = useQuery(api.items.getAllItems, companyId ? { companyId } : "skip") ?? [];

  const stats = useMemo(() => ({
    total:      suppliers.length,
    active:     suppliers.filter((s: any) => s.isActive).length,
    totalItems: suppliers.reduce((n: number, s: any) => n + (s.itemCount ?? 0), 0),
    unresolved: suppliers.reduce((n: number, s: any) => n + (s.unresolvedCount ?? 0), 0),
  }), [suppliers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s: any) =>
      [s.code, s.nameAr, s.nameEn, s.phone, s.mobile, s.email].filter(Boolean).some((v: string) => String(v).toLowerCase().includes(q))
    );
  }, [suppliers, search]);

  function lbl(ar: string, en: string) { return isRTL ? ar : en; }

  function openDrawer(s: any, tab: "info" | "items" | "invoices" = "info") {
    setSelectedSupplier(s);
    setActiveTab(tab);
    setEditMode(false);
    setForm({
      code: s.code ?? "",
      nameAr: s.nameAr ?? "",
      nameEn: s.nameEn ?? "",
      phone: s.phone ?? "",
      mobile: s.mobile ?? "",
      email: s.email ?? "",
      address: s.address ?? "",
      taxNumber: s.taxNumber ?? "",
      paymentTerms: s.paymentTerms != null ? String(s.paymentTerms) : "",
      notes: s.notes ?? "",
      accountId: s.accountId ?? "",
    });
    setErr(null);
  }

  function closeDrawer() { setSelectedSupplier(null); setEditMode(false); }

  async function onSave() {
    if (!companyId) return;
    if (!form.nameAr.trim()) { setErr(lbl("اسم المورد مطلوب", "Supplier name required")); return; }
    setSaving(true); setErr(null);
    try {
      if (editMode && selectedSupplier) {
        await updateSupplier({
          id: selectedSupplier._id,
          nameAr: form.nameAr,
          nameEn: form.nameEn || undefined,
          phone: form.phone || undefined,
          mobile: form.mobile || undefined,
          email: form.email || undefined,
          address: form.address || undefined,
          taxNumber: form.taxNumber || undefined,
          paymentTerms: form.paymentTerms ? Number(form.paymentTerms) : undefined,
          notes: form.notes || undefined,
        });
        setEditMode(false);
      } else {
        if (!form.code.trim()) { setErr(lbl("الكود مطلوب", "Code required")); setSaving(false); return; }
        if (!form.accountId) { setErr(lbl("اختر حساب", "Select account")); setSaving(false); return; }
        await createSupplier({
          companyId: companyId as any,
          code: form.code,
          nameAr: form.nameAr,
          nameEn: form.nameEn || undefined,
          accountId: form.accountId as any,
          phone: form.phone || undefined,
          mobile: form.mobile || undefined,
          email: form.email || undefined,
          address: form.address || undefined,
          taxNumber: form.taxNumber || undefined,
          paymentTerms: form.paymentTerms ? Number(form.paymentTerms) : undefined,
          notes: form.notes || undefined,
        });
        setForm({ code: "", nameAr: "", nameEn: "", phone: "", mobile: "", email: "", address: "", taxNumber: "", paymentTerms: "", notes: "", accountId: "" });
      }
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally { setSaving(false); }
  }

  async function onAddItem() {
    if (!selectedSupplier || !itemForm.itemId) return;
    setItemSaving(true); setItemErr(null);
    try {
      await addSupplierItem({
        supplierId: selectedSupplier._id,
        companyId: companyId as any,
        itemId: itemForm.itemId as any,
        supplierItemCode: itemForm.supplierItemCode || undefined,
        supplierPrice: itemForm.supplierPrice ? Number(itemForm.supplierPrice) : undefined,
      });
      setShowItemModal(false);
      setItemForm({ itemId: "", supplierItemCode: "", supplierPrice: "" });
    } catch (e: any) {
      setItemErr(String(e.message || e));
    } finally { setItemSaving(false); }
  }

  async function onRemoveItem(supplierItemId: string) {
    if (!confirm(lbl("تأكيد الحذف؟", "Confirm delete?"))) return;
    await removeSupplierItem({ supplierItemId: supplierItemId as any });
  }

  const linkItemMutation = useMutation(api.supplierItems.linkItem);

  async function onLinkItem(supplierItemId: string, itemId: string) {
    await linkItemMutation({ supplierItemId: supplierItemId as any, itemId: itemId as any });
  }

  if (suppliers === undefined) return <LoadingState />;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      <div className="no-print">
        <PageHeader
          icon={Truck}
          title={t("suppliersTitle")}
          badge={<span className="badge-soft">{suppliers.length} {t("suppliersCount")}</span>}
          actions={
            canCreate("purchases") ? (
              <button onClick={() => { setSelectedSupplier(null); setEditMode(false); setForm({ code: "", nameAr: "", nameEn: "", phone: "", mobile: "", email: "", address: "", taxNumber: "", paymentTerms: "", notes: "", accountId: "" }); setErr(null); setActiveTab("info"); setSelectedSupplier({ _id: "NEW", isNew: true }); }} className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
                <Plus className="h-4 w-4" /> {t("newSupplier")}
              </button>
            ) : undefined
          }
        />
      </div>

      {/* Stats Cards — master data only, no purchase history */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
        <StatCard icon={Truck}         color="brand"   value={stats.total}      label={lbl("إجمالي الموردين","Total Suppliers")} />
        <StatCard icon={CheckCircle}   color="emerald" value={stats.active}     label={lbl("نشط","Active")} />
        <StatCard icon={Package}       color="violet"  value={stats.totalItems} label={lbl("أصناف الموردين","Catalog Items")} />
        <StatCard icon={AlertTriangle} color="amber"   value={stats.unresolved} label={lbl("غير مربوطة","Unresolved")} />
      </div>

      {/* Search */}
      <div className="surface-card p-3 no-print">
        <div className="relative">
          <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--ink-400)] ${isRTL ? "right-3" : "left-3"}`} />
          <input className={`input-field ${isRTL ? "pr-9" : "pl-9"}`} placeholder={lbl("ابحث بالاسم أو الكود...", "Search by name or code...")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="surface-card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Truck} title={lbl("لا يوجد موردون", "No suppliers")} />
        ) : (
          <>
          <div className="mobile-list p-3 space-y-2.5">
            {filtered.map((s: any) => (
              <div key={s._id} className="record-card cursor-pointer" onClick={() => openDrawer(s, "info")}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--ink-100)] text-[var(--ink-600)] inline-block mb-1">{s.code}</span>
                    <p className="text-[14px] font-bold text-[var(--ink-900)]">{s.nameAr}</p>
                    {s.nameEn && s.nameEn !== s.nameAr && <p className="text-[11.5px] text-[var(--ink-500)]">{s.nameEn}</p>}
                    {s.mobile && <p className="text-[11.5px] text-[var(--ink-400)] mt-0.5">{s.mobile}</p>}
                  </div>
                  <div className="shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-400 border-gray-200"}`}>
                      {s.isActive ? "نشط" : "غير نشط"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="desktop-table overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("code")}</th>
                  <th>{lbl("اسم المورد","Supplier")}</th>
                  <th>{lbl("الأصناف","Items")}</th>
                  <th>{lbl("التواصل","Contact")}</th>
                  <th>{t("status")}</th>
                  <th className="text-end">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s: any) => (
                  <tr key={s._id} className="cursor-pointer hover:bg-[color:var(--brand-50)]/40" onClick={() => openDrawer(s, "info")}>
                    <td className="code">{s.code}</td>
                    <td>
                      <div className="font-medium text-[color:var(--ink-900)]">{s.nameAr}</div>
                      {s.nameEn && s.nameEn !== s.nameAr && <div className="text-xs text-[color:var(--ink-500)]">{s.nameEn}</div>}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        {(s.itemCount ?? 0) > 0
                          ? <span className="inline-flex items-center gap-1 text-xs font-medium bg-[color:var(--brand-50)] text-[color:var(--brand-700)] px-2 py-0.5 rounded-full"><Package className="h-3 w-3" />{s.itemCount}</span>
                          : <span className="text-xs text-[color:var(--ink-300)]">—</span>}
                        {(s.unresolvedCount ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                            <AlertTriangle className="h-3 w-3" />{s.unresolvedCount}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-xs text-[color:var(--ink-500)]">
                      {s.mobile || s.phone || s.email || <span className="text-[color:var(--ink-300)]">—</span>}
                    </td>
                    <td><span className={`badge-soft ${s.isActive ? "" : "badge-muted"}`}>{s.isActive ? t("active") : t("inactive")}</span></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openDrawer(s, "items")} className="h-8 w-8 rounded-md hover:bg-[color:var(--brand-50)] text-[color:var(--ink-500)] hover:text-[color:var(--brand-700)] flex items-center justify-center"><Package className="h-4 w-4" /></button>
                        {canEdit("purchases") && <button onClick={() => openDrawer(s, "info")} className="h-8 w-8 rounded-md hover:bg-[color:var(--brand-50)] text-[color:var(--ink-500)] hover:text-[color:var(--brand-700)] flex items-center justify-center"><Edit2 className="h-4 w-4" /></button>}
                        <button onClick={() => toggleActive({ id: s._id })} className="h-8 w-8 rounded-md hover:bg-[color:var(--brand-50)] text-[color:var(--ink-500)] hover:text-[color:var(--brand-700)] flex items-center justify-center"><Power className="h-4 w-4" /></button>
                        {canEdit("purchases") && (
                          <button
                            onClick={() => setDeleteConfirm({ id: s._id, name: s.nameAr })}
                            className="h-8 w-8 rounded-md hover:bg-red-50 text-[color:var(--ink-400)] hover:text-red-600 flex items-center justify-center"
                            title="حذف المورد"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* ═══ SUPPLIER DETAIL DRAWER ═══════════════════════════════════════════ */}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="font-bold text-gray-900">{isRTL ? "حذف المورد" : "Delete Supplier"}</div>
                <div className="text-sm text-gray-500 mt-0.5">{isRTL ? "سيتم حذف المورد وجميع أصنافه المرتبطة" : "The supplier and all linked items will be deleted"}</div>
              </div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm text-red-800 font-medium mb-5">
              {deleteConfirm.name}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="h-9 px-4 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
              >
                {isRTL ? "إلغاء" : "Cancel"}
              </button>
              <button
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await deleteSupplier({ id: deleteConfirm.id as any });
                    setDeleteConfirm(null);
                    if (selectedSupplier?._id === deleteConfirm.id) closeDrawer();
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

      {selectedSupplier && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={closeDrawer} />
          <div className="fixed inset-y-0 end-0 z-50 w-full max-w-lg flex flex-col bg-white shadow-2xl border-s border-gray-200" style={{ direction: isRTL ? "rtl" : "ltr" }}>
            {/* Drawer header */}
            <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
              <div className="min-w-0">
                <div className="text-[10px] text-gray-400 font-mono mb-0.5">{selectedSupplier.code}</div>
                <h2 className="text-lg font-bold text-gray-900 truncate">{selectedSupplier.nameAr}</h2>
                {selectedSupplier.nameEn && selectedSupplier.nameEn !== selectedSupplier.nameAr && (
                  <div className="text-sm text-gray-500 truncate">{selectedSupplier.nameEn}</div>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`badge-soft text-xs ${selectedSupplier.isActive ? "" : "badge-muted"}`}>{selectedSupplier.isActive ? t("active") : t("inactive")}</span>
                  {(selectedSupplier.unresolvedCount ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                      <AlertTriangle className="h-3 w-3" /> {selectedSupplier.unresolvedCount} {lbl("غير مربوط", "unresolved")}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={closeDrawer} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 shrink-0"><X className="h-4 w-4" /></button>
            </div>

            {/* Catalog summary strip — items only, no purchase history */}
            {(selectedSupplier.itemCount ?? 0) > 0 && (
              <div className="grid grid-cols-2 border-b border-gray-100 shrink-0">
                <StripCell label={lbl("الأصناف المرتبطة", "Catalog Items")} value={String(selectedSupplier.itemCount ?? 0)} />
                <StripCell label={lbl("غير مربوطة", "Unresolved")} value={String(selectedSupplier.unresolvedCount ?? 0)} small />
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-gray-100 shrink-0">
              {[
                { id: "info",     icon: Building2, label: t("info") },
                { id: "items",    icon: Package,   label: lbl("الأصناف", "Items") },
                { id: "invoices", icon: FileText,  label: lbl("الفواتير", "Invoices") },
              ].map((t) => (
                <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === t.id ? "border-[color:var(--brand-600)] text-[color:var(--brand-600)]" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <t.icon className="h-4 w-4" /> {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === "info" && (
                editMode || selectedSupplier.isNew ? (
                  <div className="space-y-4">
                    {err && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{err}</div>}
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t("code")} required={!selectedSupplier._id || selectedSupplier.isNew}>
                        <input className="input-field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!selectedSupplier._id && !selectedSupplier.isNew} />
                      </Field>
                      <Field label={t("nameAr")} required>
                        <input className="input-field" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
                      </Field>
                      <Field label={t("nameEn")}>
                        <input className="input-field" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
                      </Field>
                      <Field label={lbl("حساب المورد", "AP Account")} required={selectedSupplier.isNew}>
                        <select className="input-field" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
                          <option value="">{lbl("اختر حساب", "Select account")}</option>
                          {apAccounts.map((a: any) => (
                            <option key={a._id} value={a._id}>{a.nameAr} ({a.code})</option>
                          ))}
                        </select>
                      </Field>
                      <Field label={t("phone")}>
                        <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                      </Field>
                      <Field label={t("mobile")}>
                        <input className="input-field" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
                      </Field>
                      <Field label={t("email")}>
                        <input className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      </Field>
                      <Field label={t("taxNumber")}>
                        <input className="input-field" value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} />
                      </Field>
                      <Field label={lbl("أيام السداد", "Payment Terms")}>
                        <input className="input-field" type="number" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} />
                      </Field>
                    </div>
                    <Field label={t("address")}>
                      <textarea className="input-field w-full" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </Field>
                    <Field label={t("notes")}>
                      <textarea className="input-field w-full" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </Field>

                    <div className="flex items-center gap-2 pt-2">
                      <button onClick={onSave} disabled={saving} className="btn-primary h-10 px-5 rounded-lg text-sm font-semibold">{saving ? t("saving") : t("save")}</button>
                      {!selectedSupplier.isNew && <button onClick={() => setEditMode(false)} className="btn-ghost h-10 px-4 rounded-lg text-sm font-semibold">{t("cancel")}</button>}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <InfoRow icon={Building2}  label={t("nameAr")}           value={selectedSupplier.nameAr} />
                    {selectedSupplier.nameEn && <InfoRow icon={Building2} label={t("nameEn")} value={selectedSupplier.nameEn} />}
                    <InfoRow icon={Phone}      label={t("phone")}            value={selectedSupplier.phone} />
                    <InfoRow icon={Phone}      label={t("mobile")}           value={selectedSupplier.mobile} />
                    <InfoRow icon={Mail}       label={t("email")}            value={selectedSupplier.email} />
                    <InfoRow icon={MapPin}     label={t("address")}          value={selectedSupplier.address} />
                    <InfoRow icon={Hash}       label={t("taxNumber")}        value={selectedSupplier.taxNumber} mono />
                    <InfoRow icon={Clock}      label={t("paymentTerms")}     value={selectedSupplier.paymentTerms != null ? `${selectedSupplier.paymentTerms} ${lbl("يوم","days")}` : undefined} />
                    {selectedSupplier.notes && <InfoRow icon={FileText} label={t("notes")} value={selectedSupplier.notes} />}
                    {/* Purchase history rows removed — will populate from real ERP transactions */}

                    {canEdit("purchases") && (
                      <div className="pt-3">
                        <button onClick={() => setEditMode(true)} className="btn-primary h-10 px-5 rounded-lg text-sm font-semibold inline-flex items-center gap-2">
                          <Edit2 className="h-4 w-4" /> {t("edit")}
                        </button>
                      </div>
                    )}
                  </div>
                )
              )}

              {activeTab === "items" && (
                <ItemsTab
                  supplier={selectedSupplier}
                  allItems={allItems}
                  onAdd={() => setShowItemModal(true)}
                  onRemove={onRemoveItem}
                  onLink={onLinkItem}
                  canEdit={canEdit}
                  isRTL={isRTL}
                  lbl={lbl}
                />
              )}

              {activeTab === "invoices" && (
                <InvoicesTab supplier={selectedSupplier} formatCurrency={formatCurrency} formatDate={formatDate} lbl={lbl} />
              )}
            </div>
          </div>
        </>
      )}

      {/* Add-item modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => !itemSaving && setShowItemModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()} style={{ direction: isRTL ? "rtl" : "ltr" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{lbl("ربط صنف بالمورد", "Link Item to Supplier")}</h3>
              <button onClick={() => setShowItemModal(false)} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"><X className="h-4 w-4" /></button>
            </div>
            {itemErr && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{itemErr}</div>}
            <div className="space-y-3">
              <Field label={lbl("الصنف", "Item")} required>
                <select className="input-field" value={itemForm.itemId} onChange={(e) => setItemForm({ ...itemForm, itemId: e.target.value })}>
                  <option value="">— {lbl("اختر الصنف", "Select item")} —</option>
                  {(["RM", "PACK", "OTHERS"] as const).map((type) => {
                    const typeItems = allItems.filter((i: any) => i.isActive && i.purchaseType === type);
                    if (!typeItems.length) return null;
                    const groupLabel = isRTL ? PURCHASE_TYPE_LABELS[type].ar : PURCHASE_TYPE_LABELS[type].en;
                    return (
                      <optgroup key={type} label={groupLabel}>
                        {typeItems.map((i: any) => (
                          <option key={i._id} value={i._id}>{i.nameAr}{i.nameEn && i.nameEn !== i.nameAr ? ` / ${i.nameEn}` : ""} ({i.code})</option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={lbl("كود المورد", "Supplier Item Code")}>
                  <input className="input-field" value={itemForm.supplierItemCode} onChange={(e) => setItemForm({ ...itemForm, supplierItemCode: e.target.value })} placeholder={lbl("اختياري", "Optional")} />
                </Field>
                <Field label={lbl("سعر المورد", "Supplier Price")}>
                  <input className="input-field" type="number" value={itemForm.supplierPrice} onChange={(e) => setItemForm({ ...itemForm, supplierPrice: e.target.value })} placeholder="0.00" />
                </Field>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button onClick={() => setShowItemModal(false)} disabled={itemSaving} className="btn-ghost h-10 px-4 rounded-lg text-sm font-semibold">{t("cancel")}</button>
              <button onClick={onAddItem} disabled={itemSaving || !itemForm.itemId} className="btn-primary h-10 px-5 rounded-lg text-sm font-semibold">{itemSaving ? t("saving") : t("save")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function ItemsTab({ supplier, allItems, onAdd, onRemove, onLink, canEdit, isRTL, lbl }: any) {
  const items = useQuery(api.supplierItems.getBySupplier, { supplierId: supplier._id }) ?? [];
  const [typeFilter, setTypeFilter] = useState<"ALL" | "RM" | "PACK" | "OTHERS" | "UNRESOLVED">("ALL");

  const filtered = useMemo(() => {
    if (typeFilter === "ALL") return items;
    if (typeFilter === "UNRESOLVED") return items.filter((i: any) => i.isUnresolved);
    return items.filter((i: any) => i.item?.purchaseType === typeFilter);
  }, [items, typeFilter]);

  const counts = useMemo(() => ({
    ALL: items.length,
    RM: items.filter((i: any) => i.item?.purchaseType === "RM").length,
    PACK: items.filter((i: any) => i.item?.purchaseType === "PACK").length,
    OTHERS: items.filter((i: any) => i.item?.purchaseType === "OTHERS").length,
    UNRESOLVED: items.filter((i: any) => i.isUnresolved).length,
  }), [items]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-gray-700">{lbl("كاتالوج المورد", "Supplier Catalog")} <span className="text-gray-400 font-normal">({items.length})</span></div>
        {canEdit("purchases") && (
          <button onClick={onAdd} className="h-8 px-3 rounded-lg bg-[color:var(--brand-600)] text-white text-xs font-semibold inline-flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" /> {lbl("إضافة صنف", "Add Item")}
          </button>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(["ALL", "RM", "PACK", "OTHERS", "UNRESOLVED"] as const).map((v) => {
            const count = v === "ALL" ? items.length : counts[v];
            const label = v === "ALL" ? lbl("الكل", "All") : v === "UNRESOLVED" ? lbl("غير مربوط", "Unresolved") : (isRTL ? PURCHASE_TYPE_LABELS[v].ar : PURCHASE_TYPE_LABELS[v].en);
            return (
              <button key={v} onClick={() => setTypeFilter(v)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors border ${typeFilter === v ? "bg-[color:var(--brand-600)] text-white border-[color:var(--brand-600)]" : "bg-white text-gray-600 border-gray-200 hover:border-[color:var(--brand-300)]"}`}>
                {label} {count > 0 && <span className="opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-10 text-sm text-gray-400">
          <Package className="h-8 w-8 mx-auto mb-2 text-gray-200" />
          {lbl("لا توجد أصناف", "No items in catalog")}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((si: any) => (
            <CatalogRow
              key={si._id}
              si={si}
              allItems={allItems}
              onRemove={onRemove}
              onLink={onLink}
              canEdit={canEdit}
              isRTL={isRTL}
              lbl={lbl}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Catalog Row ──────────────────────────────────────────────────────────────
function CatalogRow({ si, allItems, onRemove, onLink, canEdit, isRTL, lbl }: any) {
  const displayName = si.supplierItemName || si.item?.nameAr || "—";
  const isUnresolved = !!si.isUnresolved;
  const typeInfo = si.item?.purchaseType ? PURCHASE_TYPE_LABELS[si.item.purchaseType] : null;
  const [linking, setLinking] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");

  return (
    <div className={`flex items-start gap-3 px-3 py-3 rounded-lg border group transition-colors ${isUnresolved ? "border-amber-200 bg-amber-50/50" : "border-gray-100 hover:bg-gray-50"}`}>
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isUnresolved ? "bg-amber-100" : "bg-[color:var(--brand-50)]"}`}>
        {isUnresolved ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : <Package className="h-4 w-4 text-[color:var(--brand-600)]" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-gray-900 break-words">{displayName}</span>
          {isUnresolved
            ? <span className="shrink-0 inline-flex items-center gap-0.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium"><AlertTriangle className="h-3 w-3" />{lbl("غير مربوط", "Unresolved")}</span>
            : typeInfo && <span className={`shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full ${typeInfo.cls}`}>{isRTL ? typeInfo.ar : typeInfo.en}</span>
          }
          {!isUnresolved && si.item?.purchaseCategory && (
            <span className="shrink-0 text-xs text-gray-400 font-mono">{si.item.purchaseCategory.replace(/_/g, " ")}</span>
          )}
        </div>
        {!isUnresolved && si.item && si.supplierItemName && si.item.nameAr !== si.supplierItemName && (
          <div className="text-xs text-gray-400 mt-0.5">{lbl("الكتالوج:", "Catalog:")} {si.item.nameAr}</div>
        )}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {/* lastPrice shown as Reference Price — imported from Excel, not a real transaction price */}
          {si.lastPrice != null && (
            <span className="text-xs text-gray-600">
              {lbl("سعر مرجعي:", "Ref. Price:")} <strong className="text-[color:var(--brand-700)]">{si.lastPrice.toFixed(2)}</strong>
              <span className="text-[10px] text-gray-400 ml-1">{lbl("(مستورد من الملف)", "(imported)")}</span>
            </span>
          )}
          {si.purchaseUom && <span className="text-xs font-mono bg-gray-100 px-1 rounded text-gray-500">{si.purchaseUom}</span>}
          {/* avgPrice and purchaseCount intentionally hidden — must come from real ERP transactions */}
        </div>

        {/* Link UI for unresolved items */}
        {isUnresolved && canEdit("purchases") && (
          <div className="mt-3">
            {!linking ? (
              <button
                onClick={() => setLinking(true)}
                className="h-7 px-3 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Package className="h-3.5 w-3.5" />
                {lbl("ربط بصنف", "Link to item")}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  className="input-field h-8 text-xs py-1"
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                >
                  <option value="">{lbl("اختر الصنف", "Select item")}</option>
                  {allItems.filter((i: any) => i.isActive).map((i: any) => (
                    <option key={i._id} value={i._id}>{i.nameAr} ({i.code})</option>
                  ))}
                </select>
                <button
                  disabled={!selectedItemId}
                  onClick={() => { onLink(si._id, selectedItemId); setLinking(false); setSelectedItemId(""); }}
                  className="h-8 px-3 rounded-md bg-[color:var(--brand-600)] text-white text-xs font-semibold disabled:opacity-50"
                >
                  {lbl("ربط", "Link")}
                </button>
                <button
                  onClick={() => { setLinking(false); setSelectedItemId(""); }}
                  className="h-8 px-2 rounded-md text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {canEdit("purchases") && (
        <button onClick={() => onRemove(si._id)} className="h-7 w-7 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Invoices Tab ─────────────────────────────────────────────────────────────
function InvoicesTab({ supplier, formatCurrency, formatDate, lbl }: any) {
  const invoices = useQuery(api.purchaseInvoices.listPurchaseInvoices, { supplierId: supplier._id }) ?? [];
  const stats = useMemo(() => ({
    total: invoices.reduce((s: number, i: any) => s + i.totalAmount, 0),
    unpaid: invoices.filter((i: any) => i.paymentStatus === "unpaid").reduce((s: number, i: any) => s + i.totalAmount, 0),
  }), [invoices]);

  const statusCfg: Record<string, { label: string; cls: string; icon: any }> = {
    unpaid:  { label: lbl("غير مدفوع", "Unpaid"),  cls: "bg-red-50 text-red-700",         icon: AlertCircle },
    partial: { label: lbl("جزئي", "Partial"),       cls: "bg-amber-50 text-amber-700",     icon: Clock },
    paid:    { label: lbl("مدفوع", "Paid"),         cls: "bg-emerald-50 text-emerald-700", icon: CheckCircle },
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl border border-gray-100">
          <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{lbl("إجمالي", "Total")}</div>
          <div className="text-lg font-bold text-gray-900">{formatCurrency(stats.total)}</div>
        </div>
        <div className="p-3 rounded-xl border border-gray-100">
          <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{lbl("مستحق", "Unpaid")}</div>
          <div className="text-lg font-bold text-red-600">{formatCurrency(stats.unpaid)}</div>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-10 text-sm text-gray-400">
          <FileText className="h-8 w-8 mx-auto mb-2 text-gray-200" />
          {lbl("لا توجد فواتير", "No invoices")}
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv: any) => {
            const cfg = statusCfg[inv.paymentStatus] || statusCfg.unpaid;
            const Icon = cfg.icon;
            return (
              <div key={inv._id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900">#{inv.invoiceNumber}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cfg.cls}`}><Icon className="h-3 w-3 inline-block align-[-2px] mr-0.5" />{cfg.label}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{formatDate(inv.invoiceDate)}</div>
                </div>
                <div className="text-sm font-bold text-gray-900">{formatCurrency(inv.totalAmount)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── UI Components ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, color, value, label }: any) {
  const colorMap: Record<string, { gradient: string; iconBg: string }> = {
    brand:   { gradient: "from-blue-500 to-blue-600", iconBg: "bg-blue-100" },
    emerald: { gradient: "from-green-500 to-green-600", iconBg: "bg-green-100" },
    violet:  { gradient: "from-purple-500 to-purple-600", iconBg: "bg-purple-100" },
    amber:   { gradient: "from-amber-500 to-amber-600", iconBg: "bg-amber-100" },
  };
  const colors = colorMap[color] || colorMap.brand;
  return (
    <div className={`relative overflow-hidden rounded-xl bg-white shadow-sm border p-4 hover:shadow-md transition-all duration-300 group`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      <div className="relative flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br ${colors.gradient} text-white`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</div>
          <div className="text-xl font-bold text-gray-900 tabular-nums">{value}</div>
        </div>
      </div>
    </div>
  );
}

function StripCell({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className={`px-5 py-3 ${small ? "" : "border-e border-gray-100"}`}>
      <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</div>
      <div className={`font-bold text-gray-900 ${small ? "text-sm" : "text-base"}`}>{value}</div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, mono }: { icon: any; label: string; value?: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
      <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-400 mb-0.5">{label}</div>
        <div className={`text-sm text-gray-800 font-medium break-all ${mono ? "font-mono" : ""}`}>{value}</div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-[color:var(--brand-600)]">*</span>}
      </div>
      {children}
    </label>
  );
}
