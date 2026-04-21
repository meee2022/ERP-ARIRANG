// @ts-nocheck
"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Users,
  Search,
  Plus,
  Edit2,
  Power,
  MapPin,
  ChevronDown,
  ChevronUp,
  Phone,
  User,
  FileText,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { usePermissions } from "@/hooks/usePermissions";

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
            className="text-xs text-[color:var(--brand-600)] hover:underline font-medium"
          >
            + {t("addFirstOutlet")}
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

export default function CustomersPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { canCreate, canEdit } = usePermissions();

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

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
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
    if (!q) return customers;
    return customers.filter((c: any) =>
      [c.code, c.nameAr, c.nameEn, c.mobile, c.email]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(q))
    );
  }, [customers, search]);

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

  function openNew() {
    reset();
    setShowModal(true);
  }

  function openEdit(c: any) {
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
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center"
            style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}
          >
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">
              {t("customersTitle")}
            </h1>
            <p className="text-xs text-[color:var(--ink-500)] mt-0.5">
              {customers.length} {t("customersCount")}
            </p>
          </div>
        </div>
        {canCreate("sales") && (
        <button
          onClick={openNew}
          className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" /> {t("newCustomer")}
        </button>
        )}
      </div>

      {/* Filters */}
      <div className="surface-card p-3">
        <div className="relative">
          <Search
            className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--ink-400)] ${isRTL ? "right-3" : "left-3"}`}
          />
          <input
            className={`input-field h-10 ${isRTL ? "pr-9" : "pl-9"}`}
            placeholder={t("searchCustomers")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="surface-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="mx-auto h-10 w-10 text-[color:var(--ink-300)]" />
            <div className="mt-3 text-sm text-[color:var(--ink-500)]">{t("noCustomersYet")}</div>
            {canCreate("sales") && (
            <button
              onClick={openNew}
              className="mt-4 btn-primary h-9 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" /> {t("addFirstCustomer")}
            </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[color:var(--ink-600)] text-xs uppercase tracking-wider bg-[color:var(--ink-50)]">
                  <th className="px-4 py-3 text-start font-semibold">{t("code")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("name")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("contact")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("creditLimit")}</th>
                  <th className="px-4 py-3 text-center font-semibold">{t("creditDays")}</th>
                  <th className="px-4 py-3 text-center font-semibold">{t("outlets")}</th>
                  <th className="px-4 py-3 text-center font-semibold">{t("status")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => (
                  <React.Fragment key={c._id}>
                    <tr
                      className={`border-t border-[color:var(--ink-100)] hover:bg-[color:var(--brand-50)]/40 ${expandedCustomerId === c._id ? "bg-[color:var(--brand-50)]/20" : ""}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-[color:var(--ink-700)]">
                        {c.code}
                      </td>
                      <td className="px-4 py-3 font-medium text-[color:var(--ink-900)]">
                        {isRTL ? c.nameAr : (c.nameEn || c.nameAr)}
                        {c.nameEn && isRTL ? (
                          <div className="text-xs text-[color:var(--ink-500)]">{c.nameEn}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--ink-600)]">{c.mobile || "—"}</td>
                      <td className="px-4 py-3 text-end tabular-nums">
                        {formatCurrency(c.creditLimit ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-center text-[color:var(--ink-600)]">
                        {c.creditDays ?? 0} {t("days")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleExpand(c._id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                            expandedCustomerId === c._id
                              ? "bg-[color:var(--brand-600)] text-white"
                              : "bg-[color:var(--brand-50)] text-[color:var(--brand-700)] hover:bg-[color:var(--brand-100)]"
                          }`}
                          title={expandedCustomerId === c._id ? t("hideOutlets") : t("manageOutlets")}
                        >
                          <MapPin className="h-3 w-3" />
                          {expandedCustomerId === c._id ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge-soft ${c.isActive ? "" : "badge-muted"}`}>
                          {c.isActive ? t("active") : t("inactive")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {canEdit("sales") && (
                          <button
                            onClick={() => openEdit(c)}
                            className="h-8 w-8 rounded-md hover:bg-[color:var(--brand-50)] text-[color:var(--ink-600)] hover:text-[color:var(--brand-700)] flex items-center justify-center"
                            title={t("edit")}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          )}
                          <button
                            onClick={() => toggleActive({ id: c._id })}
                            className="h-8 w-8 rounded-md hover:bg-[color:var(--brand-50)] text-[color:var(--ink-600)] hover:text-[color:var(--brand-700)] flex items-center justify-center"
                            title={c.isActive ? t("deactivate") : t("activate")}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Outlets expandable panel */}
                    {expandedCustomerId === c._id && (
                      <tr key={`outlets-${c._id}`}>
                        <td colSpan={8} className="p-0">
                          <OutletsPanel customerId={c._id} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
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
