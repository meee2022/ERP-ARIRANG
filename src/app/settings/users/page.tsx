// @ts-nocheck
"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Users,
  Search,
  Plus,
  Edit2,
  KeyRound,
  Power,
  Shield,
  Trash2,
  X,
  Check,
} from "lucide-react";

// ─── Role badge colors ─────────────────────────────────────────────────────────
function roleBadgeClass(role: string): string {
  switch (role) {
    case "admin":      return "bg-purple-100 text-purple-800";
    case "manager":    return "bg-indigo-100 text-indigo-800";
    case "accountant": return "bg-blue-100 text-blue-800";
    case "cashier":    return "bg-cyan-100 text-cyan-800";
    case "sales":      return "bg-green-100 text-green-800";
    case "warehouse":  return "bg-orange-100 text-orange-800";
    case "viewer":     return "bg-[color:var(--ink-100)] text-[color:var(--ink-700)]";
    default:           return "bg-[color:var(--ink-100)] text-[color:var(--ink-700)]";
  }
}

const ROLES = ["admin", "manager", "accountant", "cashier", "sales", "warehouse", "viewer"] as const;

type Role = typeof ROLES[number];

function roleLabel(role: string, t: (k: any) => string): string {
  const map: Record<string, any> = {
    admin: "roleAdmin",
    manager: "roleManager",
    accountant: "roleAccountant",
    cashier: "roleCashier",
    sales: "roleSales",
    warehouse: "roleWarehouse",
    viewer: "roleViewer",
  };
  return t(map[role] ?? role);
}

// ─── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="surface-card w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--ink-100)]">
          <h2 className="text-lg font-bold text-[color:var(--ink-900)]">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[color:var(--ink-100)] transition-colors">
            <X className="h-5 w-5 text-[color:var(--ink-500)]" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Input helper ──────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-[color:var(--ink-700)] mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full border border-[color:var(--ink-300)] rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[color:var(--brand-400)] outline-none";

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { t, isRTL } = useI18n();
  const { currentUser } = useAuth() as any;

  // Get companyId from both currentUser and the companies list (consistent with other pages)
  const companies = useQuery(api.seed.getCompanies, {});
  const companyId = (companies?.[0]?._id ?? currentUser?.companyId) ?? null;

  // ── Queries & Mutations ──────────────────────────────────────────────────────
  const users = useQuery(api.users.listUsers, companyId && currentUser ? { companyId, userId: currentUser._id as any } : "skip") ?? [];
  const branches = useQuery(api.branches.getAll, companyId ? { companyId } : "skip") ?? [];

  const createUser = useMutation(api.users.createUser);
  const updateUser = useMutation(api.users.updateUser);
  const resetPassword = useMutation(api.users.resetPassword);
  const deleteUser = useMutation(api.users.deleteUser);

  // ── Local state ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Add/Edit modal
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "viewer" as Role,
    branchIds: [] as string[],
    isActive: true,
  });

  // Reset Password modal
  const [pwModal, setPwModal] = useState<any>(null);
  const [pwForm, setPwForm] = useState({ newPassword: "", confirmPassword: "" });

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Admin-only guard ─────────────────────────────────────────────────────────
  if (currentUser && currentUser.role !== "admin") {
    return (
      <div dir={isRTL ? "rtl" : "ltr"} className="flex items-center justify-center min-h-[60vh] p-8">
        <div className="text-center space-y-3">
          <Shield className="mx-auto h-12 w-12 text-red-400" />
          <p className="text-lg font-semibold text-[color:var(--ink-700)]">{t("permissionDenied")}</p>
        </div>
      </div>
    );
  }

  // ── Filtered users ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u: any) => {
      if (!showInactive && !u.isActive) return false;
      if (roleFilter && u.role !== roleFilter) return false;
      if (q) {
        return (
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [users, search, roleFilter, showInactive]);

  // ── Branch name helper ───────────────────────────────────────────────────────
  function branchName(id: string) {
    const b = branches.find((x: any) => x._id === id);
    if (!b) return id.slice(-6);
    return isRTL ? b.nameAr : (b.nameEn || b.nameAr);
  }

  // ── Flash success ────────────────────────────────────────────────────────────
  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  // ── Reset form ───────────────────────────────────────────────────────────────
  function resetForm() {
    setForm({ name: "", email: "", password: "", confirmPassword: "", role: "viewer", branchIds: [], isActive: true });
    setErr(null);
  }

  // ── Open Add ─────────────────────────────────────────────────────────────────
  function openAdd() {
    resetForm();
    setEditTarget(null);
    setModal("add");
  }

  // ── Open Edit ────────────────────────────────────────────────────────────────
  function openEdit(u: any) {
    setEditTarget(u);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      confirmPassword: "",
      role: u.role,
      branchIds: u.branchIds ?? [],
      isActive: u.isActive,
    });
    setErr(null);
    setModal("edit");
  }

  // ── Save (Create or Update) ──────────────────────────────────────────────────
  async function onSave() {
    if (!currentUser || !companyId) return;
    setErr(null);

    if (!form.name.trim()) { setErr(t("name") + " " + t("required")); return; }
    if (!form.email.trim()) { setErr(t("email") + " " + t("required")); return; }
    if (form.branchIds.length === 0) { setErr(t("branches") + " " + t("required")); return; }

    if (modal === "add") {
      if (form.password.length < 6) { setErr(t("passwordTooShort")); return; }
      if (form.password !== form.confirmPassword) { setErr(t("passwordMismatch")); return; }
    }

    setSaving(true);
    try {
      if (modal === "add") {
        await createUser({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: form.role,
          branchIds: form.branchIds as any,
          createdBy: currentUser._id as any,
          companyId: companyId as any,
        });
        flash(t("userCreated"));
      } else {
        const isSelf = editTarget?._id === currentUser._id;
        await updateUser({
          userId: editTarget._id as any,
          name: form.name.trim(),
          role: isSelf ? undefined : form.role,
          branchIds: form.branchIds as any,
          isActive: isSelf ? undefined : form.isActive,
          updatedBy: currentUser._id as any,
          companyId: companyId as any,
        });
        flash(t("userUpdated"));
      }
      setModal(null);
      resetForm();
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("Email already registered")) setErr(t("emailExists"));
      else if (msg.includes("cannotEditOwnRole")) setErr(t("cannotEditOwnRole"));
      else if (msg.includes("6 characters")) setErr(t("passwordTooShort"));
      else setErr(msg || t("errUnexpected"));
    } finally {
      setSaving(false);
    }
  }

  // ── Reset Password ───────────────────────────────────────────────────────────
  function openResetPw(u: any) {
    setPwModal(u);
    setPwForm({ newPassword: "", confirmPassword: "" });
    setErr(null);
  }

  async function onResetPw() {
    if (!currentUser || !companyId || !pwModal) return;
    setErr(null);

    if (pwForm.newPassword.length < 6) { setErr(t("passwordTooShort")); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { setErr(t("passwordMismatch")); return; }

    setSaving(true);
    try {
      await resetPassword({
        userId: pwModal._id as any,
        newPassword: pwForm.newPassword,
        resetBy: currentUser._id as any,
        companyId: companyId as any,
      });
      flash(t("passwordReset"));
      setPwModal(null);
    } catch (e: any) {
      setErr(e?.message ?? t("errUnexpected"));
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle Active (soft delete / reactivate) ──────────────────────────────────
  async function onToggleActive(u: any) {
    if (!currentUser || !companyId) return;
    if (u._id === currentUser._id) {
      setErr(t("permissionDenied"));
      return;
    }
    setSaving(true);
    try {
      if (u.isActive) {
        await deleteUser({
          userId: u._id as any,
          deletedBy: currentUser._id as any,
          companyId: companyId as any,
        });
      } else {
        await updateUser({
          userId: u._id as any,
          isActive: true,
          updatedBy: currentUser._id as any,
          companyId: companyId as any,
        });
      }
      flash(u.isActive ? t("statusInactive") : t("statusActive"));
    } catch (e: any) {
      setErr(e?.message ?? t("errUnexpected"));
    } finally {
      setSaving(false);
    }
  }

  // ── Branch multi-select toggle ────────────────────────────────────────────────
  function toggleBranch(id: string, target: "form" | "pw" = "form") {
    setForm((f) => ({
      ...f,
      branchIds: f.branchIds.includes(id)
        ? f.branchIds.filter((x) => x !== id)
        : [...f.branchIds, id],
    }));
  }

  const isSelfEdit = modal === "edit" && editTarget?._id === currentUser?._id;

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">

      {/* Success Flash */}
      {successMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-green-600 text-white rounded-xl px-4 py-2 shadow-lg text-sm">
          <Check className="h-4 w-4" />
          {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="no-print">
        <PageHeader
          icon={Users}
          title={t("usersManagement")}
          subtitle={`${filtered.length} ${t("records")}`}
          actions={
            <button
              onClick={openAdd}
              className="btn-primary h-10 px-4 rounded-lg inline-flex items-center gap-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              {t("addUser")}
            </button>
          }
        />
      </div>

      {/* Filters */}
      <div className="surface-card p-4 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`absolute top-2.5 h-4 w-4 text-[color:var(--ink-400)] ${isRTL ? "right-2" : "left-2"}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isRTL ? "بحث بالاسم أو البريد..." : "Search by name or email..."}
            className={`w-full border border-[color:var(--ink-300)] rounded-lg py-2 text-sm bg-white focus:ring-2 focus:ring-[color:var(--brand-400)] outline-none ${isRTL ? "pr-8 pl-3" : "pl-8 pr-3"}`}
          />
        </div>

        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-[color:var(--ink-300)] rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[color:var(--brand-400)] outline-none"
        >
          <option value="">{t("allRoles")}</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{roleLabel(r, t)}</option>
          ))}
        </select>

        {/* Show Inactive toggle */}
        <label className="flex items-center gap-2 cursor-pointer text-sm text-[color:var(--ink-600)]">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded"
          />
          {t("showInactive")}
        </label>
      </div>

      {/* Table */}
      <div className="surface-card overflow-hidden">
        {users === undefined ? (
          <LoadingState label={t("loading")} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title={t("noUsersYet")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse" dir={isRTL ? "rtl" : "ltr"}>
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("userName")}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("userEmail")}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("userRole")}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("branches")}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("status")}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-end">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {filtered.map((u: any) => (
                  <tr key={u._id} className={`group hover:bg-gray-50/80 transition-all duration-200 ${!u.isActive ? "opacity-60" : ""}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs border border-blue-100">
                          {u.name?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 text-sm">{u.name}</span>
                          {u._id === currentUser?._id && (
                            <span className="text-[10px] text-blue-500 font-bold uppercase tracking-tight">
                              {isRTL ? "أنت" : "You"}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-medium">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight ${roleBadgeClass(u.role)}`}>
                        {roleLabel(u.role, t)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {u.branchIds?.length > 0
                          ? u.branchIds.map((bid: string) => (
                              <span key={bid} className="bg-gray-100 text-gray-600 rounded-md px-2 py-0.5 text-[10px] font-bold border border-gray-200">
                                {branchName(bid)}
                              </span>
                            ))
                          : <span className="text-gray-300 text-xs">—</span>
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight ${u.isActive ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
                        {u.isActive ? t("statusActive") : t("statusInactive")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-end">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => openEdit(u)}
                          className="h-8 w-8 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-sm flex items-center justify-center transition-all"
                          title={t("editUser")}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openResetPw(u)}
                          className="h-8 w-8 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-amber-600 hover:border-amber-200 hover:shadow-sm flex items-center justify-center transition-all"
                          title={t("resetPassword")}
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                        {u._id !== currentUser?._id && (
                          <button
                            onClick={() => onToggleActive(u)}
                            className={`h-8 w-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center transition-all ${u.isActive ? "text-gray-400 hover:text-red-500 hover:border-red-200 hover:shadow-sm" : "text-gray-400 hover:text-green-600 hover:border-green-200 hover:shadow-sm"}`}
                            title={u.isActive ? t("deactivateUser") : t("activateUser")}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                        )}
                        {u._id !== currentUser?._id && (
                          <button
                            onClick={async () => {
                              if (!confirm(isRTL ? "هل تريد حذف هذا الموظف؟" : "Delete this employee?")) return;
                              try {
                                await deleteUser({
                                  userId: u._id as any,
                                  deletedBy: currentUser._id as any,
                                  companyId: companyId as any,
                                });
                                flash(t("deleted"));
                              } catch (e: any) {
                                setErr(e?.message ?? t("errUnexpected"));
                              }
                            }}
                            className="h-8 w-8 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:shadow-sm flex items-center justify-center transition-all"
                            title={t("delete")}
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
        )}
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      {modal && (
        <Modal
          title={modal === "add" ? t("addUser") : t("editUser")}
          onClose={() => { setModal(null); resetForm(); }}
        >
          {/* Name */}
          <Field label={t("userName")}>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputClass}
              placeholder={isRTL ? "الاسم الكامل" : "Full name"}
            />
          </Field>

          {/* Email — read-only on edit */}
          <Field label={t("userEmail")}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              readOnly={modal === "edit"}
              className={`${inputClass} ${modal === "edit" ? "bg-[color:var(--ink-50)] text-[color:var(--ink-500)] cursor-not-allowed" : ""}`}
              placeholder="user@example.com"
            />
          </Field>

          {/* Password — only on add */}
          {modal === "add" && (
            <>
              <Field label={t("passwordLabel")}>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className={inputClass}
                  placeholder="••••••"
                />
              </Field>
              <Field label={t("confirmPasswordLabel")}>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  className={inputClass}
                  placeholder="••••••"
                />
              </Field>
            </>
          )}

          {/* Role — disabled for self */}
          <Field label={t("userRole")}>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
              disabled={isSelfEdit}
              className={`${inputClass} ${isSelfEdit ? "bg-[color:var(--ink-50)] text-[color:var(--ink-500)] cursor-not-allowed" : ""}`}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{roleLabel(r, t)}</option>
              ))}
            </select>
            {isSelfEdit && (
              <p className="text-xs text-amber-600 mt-1">{t("cannotEditOwnRole")}</p>
            )}
          </Field>

          {/* Branch multi-select */}
          <Field label={t("branches")}>
            {branches.length === 0 ? (
              <p className="text-sm text-[color:var(--ink-400)]">{isRTL ? "لا توجد فروع" : "No branches available"}</p>
            ) : (
              <div className="border border-[color:var(--ink-300)] rounded-lg p-3 space-y-2 max-h-36 overflow-y-auto">
                {branches.map((b: any) => (
                  <label key={b._id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={form.branchIds.includes(b._id)}
                      onChange={() => toggleBranch(b._id)}
                      className="rounded"
                    />
                    <span>{isRTL ? b.nameAr : (b.nameEn || b.nameAr)}</span>
                  </label>
                ))}
              </div>
            )}
          </Field>

          {/* Active toggle — only on edit, not for self */}
          {modal === "edit" && !isSelfEdit && (
            <Field label={t("status")}>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.isActive ? "bg-green-500" : "bg-[color:var(--ink-300)]"}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isActive ? (isRTL ? "translate-x-1" : "translate-x-5") : (isRTL ? "translate-x-5" : "translate-x-1")}`} />
                </div>
                <span className="text-sm text-[color:var(--ink-700)]">
                  {form.isActive ? t("statusActive") : t("statusInactive")}
                </span>
              </label>
            </Field>
          )}

          {/* Error */}
          {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

          {/* Actions */}
          <div className={`flex gap-3 mt-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex-1 btn-primary disabled:opacity-50 rounded-xl py-2 text-sm font-semibold"
            >
              {saving ? t("saving") : t("save")}
            </button>
            <button
              onClick={() => { setModal(null); resetForm(); }}
              className="flex-1 btn-ghost rounded-xl py-2 text-sm font-semibold"
            >
              {t("cancel")}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Reset Password Modal ─────────────────────────────────────────────── */}
      {pwModal && (
        <Modal
          title={`${t("resetPassword")} — ${pwModal.name}`}
          onClose={() => { setPwModal(null); setErr(null); }}
        >
          <Field label={t("newPasswordLabel")}>
            <input
              type="password"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
              className={inputClass}
              placeholder="••••••"
            />
          </Field>

          <Field label={t("confirmPasswordLabel")}>
            <input
              type="password"
              value={pwForm.confirmPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              className={inputClass}
              placeholder="••••••"
            />
          </Field>

          {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

          <div className={`flex gap-3 mt-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            <button
              onClick={onResetPw}
              disabled={saving}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white rounded-xl py-2 text-sm font-semibold transition-colors"
            >
              {saving ? t("saving") : t("resetPassword")}
            </button>
            <button
              onClick={() => { setPwModal(null); setErr(null); }}
              className="flex-1 btn-ghost rounded-xl py-2 text-sm font-semibold"
            >
              {t("cancel")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
