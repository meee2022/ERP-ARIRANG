"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Truck, Search, Plus, Edit2, Power } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { usePermissions } from "@/hooks/usePermissions";

export default function SuppliersPage() {
  const { t, isRTL } = useI18n();
  const { canCreate, canEdit } = usePermissions();
  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;
  const suppliers = useQuery(api.suppliers.getAll, companyId ? { companyId } : "skip") ?? [];
  const accounts = useQuery(api.accounts.getAll, companyId ? { companyId } : "skip") ?? [];
  const apAccounts = useMemo(
    () => accounts.filter((a: any) => a.accountSubType === "payable" && a.isActive),
    [accounts]
  );

  const createSupplier = useMutation(api.suppliers.create);
  const updateSupplier = useMutation(api.suppliers.update);
  const toggleActive = useMutation(api.suppliers.toggleActive);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ code: "", nameAr: "", nameEn: "", mobile: "", email: "", taxNumber: "", accountId: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s: any) =>
      [s.code, s.nameAr, s.nameEn, s.mobile].filter(Boolean).some((v: string) => String(v).toLowerCase().includes(q))
    );
  }, [suppliers, search]);

  function reset() {
    setForm({ code: "", nameAr: "", nameEn: "", mobile: "", email: "", taxNumber: "", accountId: apAccounts[0]?._id ?? "" });
    setEditId(null); setErr(null);
  }
  function openNew() { reset(); setShowModal(true); }
  function openEdit(s: any) {
    setEditId(s._id);
    setForm({ code: s.code, nameAr: s.nameAr, nameEn: s.nameEn ?? "", mobile: s.mobile ?? "", email: s.email ?? "", taxNumber: s.taxNumber ?? "", accountId: s.accountId });
    setErr(null); setShowModal(true);
  }

  async function onSave() {
    if (!companyId) return;
    if (!form.nameAr.trim()) { setErr(t("nameArRequired")); return; }
    if (!editId && !form.accountId) { setErr(t("noApAccount")); return; }
    setSaving(true); setErr(null);
    try {
      if (editId) {
        await updateSupplier({ id: editId as any, nameAr: form.nameAr, nameEn: form.nameEn || undefined, mobile: form.mobile || undefined, email: form.email || undefined, taxNumber: form.taxNumber || undefined });
      } else {
        await createSupplier({ companyId: companyId as any, code: form.code, nameAr: form.nameAr, nameEn: form.nameEn || undefined, accountId: form.accountId as any, mobile: form.mobile || undefined, email: form.email || undefined, taxNumber: form.taxNumber || undefined });
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
          <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: "var(--gold-50)", color: "var(--gold-700)" }}>
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">{t("suppliersTitle")}</h1>
            <p className="text-xs text-[color:var(--ink-500)] mt-0.5">{suppliers.length} {t("suppliersCount")}</p>
          </div>
        </div>
        {canCreate("purchases") && (
        <button onClick={openNew} className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4" /> {t("newSupplier")}
        </button>
        )}
      </div>

      <div className="surface-card p-3">
        <div className="relative">
          <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--ink-400)] ${isRTL ? "right-3" : "left-3"}`} />
          <input className={`input-field h-10 ${isRTL ? "pr-9" : "pl-9"}`} placeholder={t("searchSuppliers")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Truck className="mx-auto h-10 w-10 text-[color:var(--ink-300)]" />
            <div className="mt-3 text-sm text-[color:var(--ink-500)]">{t("noSuppliersYet")}</div>
            {canCreate("purchases") && (
            <button onClick={openNew} className="mt-4 btn-primary h-9 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold">
              <Plus className="h-4 w-4" /> {t("addFirstSupplier")}
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
                  <th className="px-4 py-3 text-start font-semibold">{t("contact")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("taxNumber")}</th>
                  <th className="px-4 py-3 text-center font-semibold">{t("status")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s: any) => (
                  <tr key={s._id} className="border-t border-[color:var(--ink-100)] hover:bg-[color:var(--brand-50)]/40">
                    <td className="px-4 py-3 font-mono text-xs text-[color:var(--ink-700)]">{s.code}</td>
                    <td className="px-4 py-3 font-medium text-[color:var(--ink-900)]">{isRTL ? s.nameAr : (s.nameEn || s.nameAr)}{s.nameEn && !isRTL ? null : (s.nameEn ? <div className="text-xs text-[color:var(--ink-500)]">{s.nameEn}</div> : null)}</td>
                    <td className="px-4 py-3 text-[color:var(--ink-600)]">{s.mobile || "—"}</td>
                    <td className="px-4 py-3 text-[color:var(--ink-600)] font-mono text-xs">{s.taxNumber || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge-soft ${s.isActive ? "" : "badge-muted"}`}>{s.isActive ? t("active") : t("inactive")}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {canEdit("purchases") && (
                        <button onClick={() => openEdit(s)} className="h-8 w-8 rounded-md hover:bg-[color:var(--brand-50)] text-[color:var(--ink-600)] hover:text-[color:var(--brand-700)] flex items-center justify-center" title={t("edit")}>
                          <Edit2 className="h-4 w-4" />
                        </button>
                        )}
                        <button onClick={() => toggleActive({ id: s._id })} className="h-8 w-8 rounded-md hover:bg-[color:var(--brand-50)] text-[color:var(--ink-600)] hover:text-[color:var(--brand-700)] flex items-center justify-center" title={s.isActive ? t("deactivate") : t("activate")}>
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
          <div className="surface-card max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[color:var(--ink-900)]">{editId ? t("editSupplier") : t("addSupplier")}</h2>
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
              <Field label={t("mobile")}>
                <input className="input-field" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
              </Field>
              <Field label={t("email")}>
                <input className="input-field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label={t("taxNumber")}>
                <input className="input-field" value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} />
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
