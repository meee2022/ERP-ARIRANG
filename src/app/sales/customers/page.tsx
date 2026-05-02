// @ts-nocheck
"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Users, Search, Plus, Edit2, Power, MapPin,
  ChevronDown, ChevronUp, Phone, User, FileText, WalletCards, Briefcase, Activity, Filter, Trash2, CheckCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { usePermissions } from "@/hooks/usePermissions";
import { PageHeader } from "@/components/ui/page-header";
import { FilterPanel } from "@/components/ui/filter-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/store/toastStore";

// ─── Imported Branches Panel (group → branch accounts from customers table) ───

function ImportedBranchesPanel({ groupNorm, companyId }: { groupNorm: string; companyId: string }) {
  const { isRTL } = useI18n();
  const branches = useQuery(api.customers.getBranchesByGroup, { companyId: companyId as any, groupNorm }) ?? [];

  if (branches.length === 0) {
    return (
      <div className="px-4 py-3 text-xs text-gray-400 italic">No imported branches for this group.</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-blue-50/60">
          <tr className="text-blue-700 uppercase tracking-wide">
            <th className="px-4 py-2 text-start font-semibold">Code</th>
            <th className="px-4 py-2 text-start font-semibold">Branch Name</th>
            <th className="px-4 py-2 text-center font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {branches.map((b: any) => (
            <tr key={b._id} className="border-t border-blue-100/80">
              <td className="px-4 py-2 font-mono text-blue-700 font-semibold">{b.code}</td>
              <td className="px-4 py-2 font-medium text-gray-800">
                {isRTL ? b.nameAr : (b.nameEn || b.nameAr)}
              </td>
              <td className="px-4 py-2 text-center">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  b.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-400 border-gray-200"
                }`}>{b.isActive ? "Active" : "Inactive"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Outlet Form Modal ────────────────────────────────────────────────────────

function OutletFormModal({
  customerId,
  outlet,
  onClose,
}: {
  customerId: string;
  outlet?: any;
  onClose: () => void;
}) {
  const { t, isRTL } = useI18n();
  const createOutlet = useMutation(api.customerOutlets.create);
  const updateOutlet = useMutation(api.customerOutlets.update);

  const [form, setForm] = useState({
    code: outlet?.code ?? "",
    nameAr: outlet?.nameAr ?? "",
    nameEn: outlet?.nameEn ?? "",
    address: outlet?.address ?? "",
    contactPerson: outlet?.contactPerson ?? "",
    phone: outlet?.phone ?? "",
    deliveryNotes: outlet?.deliveryNotes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSave() {
    if (!form.code.trim()) { setErr(t("outletCode") + " " + t("required")); return; }
    if (!form.nameAr.trim()) { setErr(t("nameArRequired")); return; }
    setSaving(true); setErr(null);
    try {
      if (outlet) {
        await updateOutlet({
          id: outlet._id,
          code: form.code,
          nameAr: form.nameAr,
          nameEn: form.nameEn || undefined,
          address: form.address || undefined,
          contactPerson: form.contactPerson || undefined,
          phone: form.phone || undefined,
          deliveryNotes: form.deliveryNotes || undefined,
        });
      } else {
        await createOutlet({
          customerId: customerId as any,
          code: form.code,
          nameAr: form.nameAr,
          nameEn: form.nameEn || undefined,
          address: form.address || undefined,
          contactPerson: form.contactPerson || undefined,
          phone: form.phone || undefined,
          deliveryNotes: form.deliveryNotes || undefined,
        });
      }
      onClose();
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,19,22,0.55)] p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        className="surface-card max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[color:var(--ink-900)]">
            {outlet ? t("editOutlet") : t("addOutlet")}
          </h2>
          <button
            onClick={onClose}
            className="text-[color:var(--ink-500)] hover:text-[color:var(--brand-700)] text-xl leading-none"
          >
            ×
          </button>
        </div>

        {err && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
            {err}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <OField label={t("outletCode")} required>
            <input
              className="input-field"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="e.g. 01"
            />
          </OField>
          <OField label={t("nameAr")} required>
            <input
              className="input-field"
              value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
              dir="rtl"
            />
          </OField>
          <OField label={t("nameEn")}>
            <input
              className="input-field"
              value={form.nameEn}
              onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
            />
          </OField>
          <OField label={t("phone")}>
            <input
              className="input-field"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </OField>
          <OField label={t("contactPerson")}>
            <input
              className="input-field"
              value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
            />
          </OField>
          <OField label={t("outletAddress")}>
            <input
              className="input-field"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </OField>
          <div className="md:col-span-2">
            <OField label={t("deliveryNotes")}>
              <textarea
                className="input-field w-full resize-none"
                rows={2}
                value={form.deliveryNotes}
                onChange={(e) => setForm({ ...form, deliveryNotes: e.target.value })}
              />
            </OField>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="btn-ghost h-10 px-4 rounded-lg text-sm font-semibold"
            disabled={saving}
          >
            {t("cancel")}
          </button>
          <button
            onClick={onSave}
            className="btn-primary h-10 px-5 rounded-lg text-sm font-semibold"
            disabled={saving}
          >
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function OField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">
        {label} {required && <span className="text-[color:var(--brand-600)]">*</span>}
      </div>
      {children}
    </label>
  );
}

// ─── Outlets Panel (expanded per customer) ────────────────────────────────────

function OutletsPanel({ customerId }: { customerId: string }) {
  const { t, isRTL } = useI18n();
  const outlets = useQuery(api.customerOutlets.getAllForManagement, { customerId: customerId as any }) ?? [];
  const toggleActive = useMutation(api.customerOutlets.toggleActive);

  const [showForm, setShowForm] = useState(false);
  const [editOutlet, setEditOutlet] = useState<any>(null);

  const activeCount = outlets.filter((o: any) => o.isActive).length;

  return (
    <div className="bg-[color:var(--brand-50)]/30 border-t border-[color:var(--ink-100)] px-4 py-4">
      {/* Panel header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[color:var(--brand-600)]" />
          <span className="text-sm font-semibold text-[color:var(--ink-800)]">
            {t("customerOutlets")}
          </span>
          {outlets.length > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-xs font-bold bg-[color:var(--brand-600)] text-white">
              {outlets.length}
            </span>
          )}
        </div>
        <button
          onClick={() => { setEditOutlet(null); setShowForm(true); }}
          className="h-8 px-3 rounded-lg bg-[color:var(--brand-600)] text-white text-xs font-semibold hover:bg-[color:var(--brand-700)] inline-flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> {t("addOutlet")}
        </button>
      </div>

      {/* Empty state */}
      {outlets.length === 0 ? (
        <div className="py-8 text-center">
          <MapPin className="mx-auto h-8 w-8 text-[color:var(--ink-300)] mb-2" />
          <div className="text-sm text-[color:var(--ink-500)] mb-1">{t("noOutlets")}</div>
          <button
            onClick={() => { setEditOutlet(null); setShowForm(true); }}
            className="btn-primary h-9 px-5 rounded-xl inline-flex items-center gap-2 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" /> {t("addFirstOutlet")}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[color:var(--ink-100)] bg-white">
          <table className="w-full text-xs">
            <thead className="bg-[color:var(--ink-50)]">
              <tr className="text-[color:var(--ink-600)] uppercase tracking-wide">
                <th className="px-3 py-2 text-start font-semibold">{t("outletCode")}</th>
                <th className="px-3 py-2 text-start font-semibold">{t("outletName")}</th>
                <th className="px-3 py-2 text-start font-semibold">{t("outletAddress")}</th>
                <th className="px-3 py-2 text-start font-semibold">{t("contactPerson")}</th>
                <th className="px-3 py-2 text-start font-semibold">{t("phone")}</th>
                <th className="px-3 py-2 text-start font-semibold">{t("deliveryNotes")}</th>
                <th className="px-3 py-2 text-center font-semibold">{t("status")}</th>
                <th className="px-3 py-2 text-end font-semibold">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {outlets.map((o: any) => (
                <tr
                  key={o._id}
                  className={`border-t border-[color:var(--ink-100)] ${!o.isActive ? "opacity-50" : ""}`}
                >
                  <td className="px-3 py-2 font-mono text-[color:var(--brand-700)] font-semibold">
                    {o.code}
                  </td>
                  <td className="px-3 py-2 font-medium text-[color:var(--ink-900)]">
                    <div>{isRTL ? o.nameAr : (o.nameEn || o.nameAr)}</div>
                    {o.nameEn && isRTL && (
                      <div className="text-[color:var(--ink-400)] font-normal">{o.nameEn}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[color:var(--ink-600)] max-w-[140px] truncate">
                    {o.address ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 flex-shrink-0" /> {o.address}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-[color:var(--ink-600)]">
                    {o.contactPerson ? (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 flex-shrink-0" /> {o.contactPerson}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-[color:var(--ink-600)]">
                    {o.phone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 flex-shrink-0" /> {o.phone}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-[color:var(--ink-500)] max-w-[120px] truncate">
                    {o.deliveryNotes ? (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3 flex-shrink-0" /> {o.deliveryNotes}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`badge-soft text-xs ${o.isActive ? "" : "badge-muted"}`}>
                      {o.isActive ? t("active") : t("inactive")}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => { setEditOutlet(o); setShowForm(true); }}
                        className="h-7 w-7 rounded-md hover:bg-[color:var(--brand-50)] text-[color:var(--ink-600)] hover:text-[color:var(--brand-700)] flex items-center justify-center"
                        title={t("edit")}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => toggleActive({ id: o._id })}
                        className="h-7 w-7 rounded-md hover:bg-[color:var(--brand-50)] text-[color:var(--ink-600)] hover:text-[color:var(--brand-700)] flex items-center justify-center"
                        title={o.isActive ? t("deactivate") : t("activate")}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <OutletFormModal
          customerId={customerId}
          outlet={editOutlet}
          onClose={() => { setShowForm(false); setEditOutlet(null); }}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

import { useSearchParams } from "next/navigation";

function CustomerStatCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-white shadow-sm border p-4 hover:shadow-md transition-all duration-300 group flex-1`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      <div className="relative flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br ${color} text-white`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</div>
          <div className="text-xl font-bold text-gray-900 tabular-nums">{value}</div>
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { canCreate, canEdit } = usePermissions();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const removeCustomer = useMutation(api.customers.remove);
  
  const searchParams = useSearchParams();

  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const customers = useQuery(api.customers.getAll, companyId ? { companyId } : "skip") ?? [];
  const accounts = useQuery(api.accounts.getAll, companyId ? { companyId } : "skip") ?? [];
  const arAccounts = useMemo(
    () => accounts.filter((a: any) => a.accountSubType === "receivable" && a.isActive),
    [accounts]
  );

  const createCustomer = useMutation(api.customers.create);
  const updateCustomer = useMutation(api.customers.update);
  const toggleActive = useMutation(api.customers.toggleActive);
  const [showModal, setShowModal] = useState(searchParams.get("new") === "true");
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"groups" | "all">("groups"); // C: default to group view
  const [form, setForm] = useState({
    code: "",
    nameAr: "",
    nameEn: "",
    mobile: "",
    email: "",
    taxNumber: "",
    creditLimit: 0,
    creditDays: 30,
    accountId: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    // C: in groups mode, show only parent accounts; in all mode show everything
    const pool = viewMode === "groups"
      ? customers.filter((c: any) => c.isGroupParent === true)
      : customers;
    if (!q) return pool;
    return pool.filter((c: any) =>
      [c.code, c.nameAr, c.nameEn, c.mobile, c.email, c.customerGroup]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(q))
    );
  }, [customers, search, viewMode]);

  function reset() {
    setForm({
      code: "",
      nameAr: "",
      nameEn: "",
      mobile: "",
      email: "",
      taxNumber: "",
      creditLimit: 0,
      creditDays: 30,
      accountId: arAccounts[0]?._id ?? "",
    });
    setEditId(null);
    setErr(null);
  }

  function openNew(e?: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    reset();
    setShowModal(true);
  }

  function openEdit(c: any, e?: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditId(c._id);
    setForm({
      code: c.code,
      nameAr: c.nameAr,
      nameEn: c.nameEn ?? "",
      mobile: c.mobile ?? "",
      email: c.email ?? "",
      taxNumber: c.taxNumber ?? "",
      creditLimit: c.creditLimit ?? 0,
      creditDays: c.creditDays ?? 30,
      accountId: c.accountId,
    });
    setErr(null);
    setShowModal(true);
  }

  async function onSave() {
    if (!companyId) return;
    if (!form.nameAr.trim()) { setErr(t("nameArRequired")); return; }
    if (!editId && !form.accountId) { setErr(t("noArAccount")); return; }
    setSaving(true);
    setErr(null);
    try {
      if (editId) {
        await updateCustomer({
          id: editId as any,
          nameAr: form.nameAr,
          nameEn: form.nameEn || undefined,
          mobile: form.mobile || undefined,
          email: form.email || undefined,
          creditLimit: Number(form.creditLimit) || 0,
          creditDays: Number(form.creditDays) || 30,
        });
      } else {
        await createCustomer({
          companyId: companyId as any,
          code: form.code,
          nameAr: form.nameAr,
          nameEn: form.nameEn || undefined,
          accountId: form.accountId as any,
          mobile: form.mobile || undefined,
          email: form.email || undefined,
          creditLimit: Number(form.creditLimit) || 0,
          creditDays: Number(form.creditDays) || 30,
        });
      }
      setShowModal(false);
      reset();
    } catch (e: any) {
      const msg = String(e.message || e);
      if (/DUPLICATE_CODE|duplicate/i.test(msg)) setErr(t("duplicateCode"));
      else setErr(msg);
    } finally {
      setSaving(false);
    }
  }

  function toggleExpand(customerId: string) {
    setExpandedCustomerId((prev) => (prev === customerId ? null : customerId));
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">

      <div className="no-print">
      <PageHeader
        icon={Users}
        title={t("customersTitle")}
        badge={<span className="text-xs text-[color:var(--ink-400)] font-normal">({filtered.length})</span>}
        actions={canCreate("sales") ? (
          <button type="button" onClick={openNew}
            className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
            <Plus className="h-4 w-4" /> {t("newCustomer")}
          </button>
        ) : undefined}
      />
      </div>

      {/* Modern Filter Strip - Box Design */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 flex flex-wrap items-end gap-3 w-full">
        {/* C: view mode toggle */}
        <div className="flex rounded-md overflow-hidden border border-gray-200 text-xs font-semibold">
          <button
            onClick={() => { setViewMode("groups"); setExpandedCustomerId(null); }}
            className={`h-9 px-4 transition-colors ${viewMode === "groups" ? "bg-green-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            {isRTL ? "مجموعات" : "Groups"} ({customers.filter((c: any) => c.isGroupParent).length})
          </button>
          <button
            onClick={() => { setViewMode("all"); setExpandedCustomerId(null); }}
            className={`h-9 px-4 border-l border-gray-200 transition-colors ${viewMode === "all" ? "bg-green-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            {isRTL ? "الكل" : "All"} ({customers.length})
          </button>
        </div>

        <button className="h-10 px-3 border border-gray-200 rounded-md flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <Filter className="h-4 w-4" /> {t("filters")}
        </button>

        <div className={`flex-1 min-w-[200px] ${isRTL ? "mr-auto" : "ml-auto"}`}>
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? "right-3" : "left-3"}`} />
            <input 
              type="text" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchCustomers")}
              className={`w-full h-10 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-400`} 
            />
          </div>
        </div>
      </div>

      {/* Premium KPI Cards - Modern Design */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CustomerStatCard 
          title={isRTL ? "المجموعات" : "Groups"} 
          value={customers.filter((c: any) => c.isGroupParent).length} 
          icon={Users}
          color="from-blue-500 to-blue-600"
        />
        <CustomerStatCard 
          title={isRTL ? "الفروع" : "Branches"} 
          value={customers.filter((c: any) => !c.isGroupParent).length} 
          icon={MapPin}
          color="from-purple-500 to-purple-600"
        />
        <CustomerStatCard 
          title={t("active")} 
          value={customers.filter((c: any) => c.isActive).length} 
          icon={CheckCircle}
          color="from-green-500 to-green-600"
        />
        <CustomerStatCard 
          title={isRTL ? "إجمالي العملاء" : "Total"} 
          value={customers.length} 
          icon={Users}
          color="from-emerald-500 to-emerald-600"
        />
      </div>
      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-[color:var(--ink-100)] overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("noCustomersYet")}
            action={canCreate("sales") ? (
              <button onClick={openNew}
                className="btn-primary h-10 px-5 rounded-xl inline-flex items-center gap-2 text-sm font-semibold">
                <Plus className="h-4 w-4" /> {t("addFirstCustomer")}
              </button>
            ) : undefined}
          />
        ) : (
          <>
          {/* Mobile cards */}
          <div className="mobile-list p-3 space-y-2.5">
            {filtered.map((c: any) => (
              <div key={c._id} className="record-card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--ink-100)] text-[var(--ink-600)]">{c.code}</span>
                      {c.isGroupParent && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">GROUP</span>}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${c.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-[var(--ink-50)] text-[var(--ink-400)] border-[var(--ink-200)]"}`}>
                        {c.isActive ? t("active") : t("inactive")}
                      </span>
                    </div>
                    <p className="text-[14px] font-bold text-[var(--ink-900)]">{isRTL ? c.nameAr : (c.nameEn || c.nameAr)}</p>
                    {c.mobile && <p className="text-[11.5px] text-[var(--ink-500)] mt-0.5">{c.mobile}</p>}
                  </div>
                  <div className="text-end shrink-0">
                    <p className="text-[11px] text-[var(--ink-400)]">{t("creditLimit")}</p>
                    <p className="text-[14px] font-bold text-[var(--ink-900)] tabular-nums">{formatCurrency(c.creditLimit ?? 0)}</p>
                    <p className="text-[11px] text-[var(--ink-500)]">{c.creditDays ?? 0} {t("days")}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[var(--ink-100)]">
                  <button onClick={() => toggleExpand(c._id)}
                    className="text-[11.5px] font-semibold text-[var(--brand-600)] flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {isRTL ? "الفروع" : "Outlets"} {c.isGroupParent ? `(${c.branchCount ?? 0})` : ""}
                  </button>
                  {canEdit("sales") && (
                    <button onClick={(e) => openEdit(c, e)}
                      className="text-[11.5px] font-semibold px-3 py-1.5 rounded-lg bg-[var(--ink-50)] text-[var(--ink-700)] border border-[var(--ink-200)] touch-target">
                      {t("edit")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="desktop-table overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse" dir={isRTL ? "rtl" : "ltr"}>
              <thead>
                <tr style={{ background: "var(--brand-700)" }}>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap">{t("code")}</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap">{t("name")}</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-white/80 uppercase tracking-widest whitespace-nowrap">{t("contact")}</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-white/80 uppercase tracking-widest text-end whitespace-nowrap">{t("creditLimit")}</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-white/80 uppercase tracking-widest text-center whitespace-nowrap">{t("creditDays")}</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-white/80 uppercase tracking-widest text-center whitespace-nowrap">{t("outlets")}</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-white/80 uppercase tracking-widest text-center whitespace-nowrap">{t("status")}</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-white/80 uppercase tracking-widest text-end whitespace-nowrap">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c: any) => (
                  <React.Fragment key={c._id}>
                    <tr className={`group transition-all duration-200 ${expandedCustomerId === c._id ? "bg-green-50/30" : "hover:bg-gray-50/80"}`}>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                          {c.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 text-sm">
                          {isRTL ? c.nameAr : (c.nameEn || c.nameAr)}
                        </div>
                        {/* C: group badge */}
                        {c.isGroupParent ? (
                          <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            GROUP · {c.branchCount ?? 0} branches
                          </span>
                        ) : c.customerGroup ? (
                          <div className="text-[10px] text-gray-400 font-medium mt-0.5">{c.customerGroup}</div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 font-medium">{c.mobile || "—"}</td>
                      <td className="px-6 py-4 text-end tabular-nums font-bold text-gray-900 text-sm">{formatCurrency(c.creditLimit ?? 0)}</td>
                      <td className="px-6 py-4 text-center text-xs text-gray-500 font-medium">{c.creditDays ?? 0} {t("days")}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleExpand(c._id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all duration-200 shadow-sm ${
                            expandedCustomerId === c._id
                              ? "bg-green-600 text-white"
                              : "bg-white border border-gray-200 text-gray-600 hover:border-green-300 hover:text-green-600"
                          }`}
                        >
                          <MapPin className="h-3 w-3" />
                          {expandedCustomerId === c._id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight uppercase border ${
                          c.isActive 
                            ? "bg-green-50 text-green-700 border-green-200" 
                            : "bg-gray-50 text-gray-500 border-gray-200"
                        }`}>
                          {c.isActive ? t("active") : t("inactive")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-end">
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {canEdit("sales") && (
                            <button onClick={(e) => openEdit(c, e)}
                              className="h-8 w-8 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-sm flex items-center justify-center transition-all"
                              title={t("edit")}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {isAdmin && (
                            <button onClick={async () => {
                              if (confirm(t("confirmDelete"))) {
                                try {
                                  await removeCustomer({ id: c._id, userId: currentUser?._id });
                                } catch (e: any) {
                                  toast.error(e);
                                }
                              }
                            }}
                              className="h-8 w-8 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:shadow-sm flex items-center justify-center transition-all"
                              title={t("delete")}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => toggleActive({ id: c._id })}
                            className={`h-8 w-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center transition-all hover:shadow-sm ${
                              c.isActive ? "text-gray-400 hover:text-amber-500 hover:border-amber-200" : "text-green-500 border-green-200 hover:bg-green-50"
                            }`}
                            title={c.isActive ? t("deactivate") : t("activate")}>
                            <Power className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedCustomerId === c._id && (
                      <tr key={`outlets-${c._id}`}>
                        <td colSpan={8} className="p-0 bg-white shadow-inner">
                          {/* C: groups mode → show imported branches first, then delivery outlets */}
                          {viewMode === "groups" && c.isGroupParent && c.customerGroupNorm ? (
                            <div>
                              <div className="px-4 pt-3 pb-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Imported Branches</span>
                                  <span className="text-[10px] text-blue-500">({c.branchCount ?? 0} from import)</span>
                                </div>
                                <ImportedBranchesPanel groupNorm={c.customerGroupNorm} companyId={companyId} />
                              </div>
                              <div className="border-t border-dashed border-gray-200 mt-2">
                                <OutletsPanel customerId={c._id} />
                              </div>
                            </div>
                          ) : (
                            <OutletsPanel customerId={c._id} />
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>{/* end desktop-table */}
          </>
        )}
      </div>

      {/* Customer Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,19,22,0.55)] p-4"
          onClick={() => !saving && setShowModal(false)}
        >
          <div
            className="surface-card max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[color:var(--ink-900)]">
                {editId ? t("editCustomer") : t("addCustomer")}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[color:var(--ink-500)] hover:text-[color:var(--brand-700)] text-xl leading-none"
              >
                ×
              </button>
            </div>
            {err && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                {err}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={t("code")} required={!editId}>
                <input
                  className="input-field"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  disabled={!!editId}
                />
              </Field>
              <Field label={t("nameAr")} required>
                <input
                  className="input-field"
                  value={form.nameAr}
                  onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                />
              </Field>
              <Field label={t("nameEn")}>
                <input
                  className="input-field"
                  value={form.nameEn}
                  onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                />
              </Field>
              <Field label={t("mobile")}>
                <input
                  className="input-field"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                />
              </Field>
              <Field label={t("email")}>
                <input
                  className="input-field"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
              <Field label={t("taxNumber")}>
                <input
                  className="input-field"
                  value={form.taxNumber}
                  onChange={(e) => setForm({ ...form, taxNumber: e.target.value })}
                />
              </Field>
              <Field label={t("creditLimit")}>
                <input
                  className="input-field"
                  type="number"
                  value={form.creditLimit}
                  onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })}
                />
              </Field>
              <Field label={t("creditDays")}>
                <input
                  className="input-field"
                  type="number"
                  value={form.creditDays}
                  onChange={(e) => setForm({ ...form, creditDays: Number(e.target.value) })}
                />
              </Field>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn-ghost h-10 px-4 rounded-lg text-sm font-semibold"
                disabled={saving}
              >
                {t("cancel")}
              </button>
              <button
                onClick={onSave}
                className="btn-primary h-10 px-5 rounded-lg text-sm font-semibold"
                disabled={saving}
              >
                {saving ? t("saving") : t("save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-[color:var(--ink-700)] mb-1.5">
        {label} {required && <span className="text-[color:var(--brand-600)]">*</span>}
      </div>
      {children}
    </label>
  );
}
