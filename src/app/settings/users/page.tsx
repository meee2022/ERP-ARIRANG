// @ts-nocheck
"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import {
  Users,
  Search,
  Plus,
  Edit2,
  KeyRound,
  Power,
  Shield,
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
    case "viewer":     return "bg-gray-100 text-gray-700";
    default:           return "bg-gray-100 text-gray-700";
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
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
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none";

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { t, isRTL } = useI18n();
  const { currentUser } = useAuth() as any;

  // Get companyId from both currentUser and the companies list (consistent with other pages)
  const companies = useQuery(api.seed.getCompanies, {});
  const companyId = (companies?.[0]?._id ?? currentUser?.companyId) ?? null;

  // ── Queries & Mutations ──────────────────────────────────────────────────────
  const users = useQuery(api.users.listUsers, companyId ? { companyId } : "skip") ?? [];
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
          <p className="text-lg font-semibold text-gray-700">{t("permissionDenied")}</p>
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("usersManagement")}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{filtered.length} {t("records")}</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("addUser")}
        </button>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`absolute top-2.5 h-4 w-4 text-gray-400 ${isRTL ? "right-2" : "left-2"}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isRTL ? "بحث بالاسم أو البريد..." : "Search by name or email..."}
            className={`w-full border border-gray-300 rounded-lg py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none ${isRTL ? "pr-8 pl-3" : "pl-8 pr-3"}`}
          />
        </div>

        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none"
        >
          <option value="">{t("allRoles")}</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{roleLabel(r, t)}</option>
          ))}
        </select>

        {/* Show Inactive toggle */}
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
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
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-start font-semibold text-gray-600">{t("userName")}</th>
              <th className="px-4 py-3 text-start font-semibold text-gray-600">{t("userEmail")}</th>
              <th className="px-4 py-3 text-start font-semibold text-gray-600">{t("userRole")}</th>
              <th className="px-4 py-3 text-start font-semibold text-gray-600">{t("branches")}</th>
              <th className="px-4 py-3 text-start font-semibold text-gray-600">{t("status")}</th>
              <th className="px-4 py-3 text-start font-semibold text-gray-600">{t("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users === undefined ? (
              <tr><td colSpan={6} className="py-10 text-center text-gray-400">{t("loading")}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-10 text-center text-gray-400">{t("noUsersYet")}</td></tr>
            ) : (
              filtered.map((u: any) => (
                <tr key={u._id} className={`hover:bg-gray-50 transition-colors ${!u.isActive ? "opacity-50" : ""}`}>
                  {/* Name */}
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                        {u.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      <span>{u.name}</span>
                      {u._id === currentUser?._id && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">
                          {isRTL ? "أنت" : "You"}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleBadgeClass(u.role)}`}>
                      {roleLabel(u.role, t)}
                    </span>
                  </td>

                  {/* Branches */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.branchIds?.length > 0
                        ? u.branchIds.map((bid: string) => (
                            <span key={bid} className="bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-xs">
                              {branchName(bid)}
                            </span>
                          ))
                        : <span className="text-gray-400 text-xs">—</span>
                      }
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
                      {u.isActive ? t("statusActive") : t("statusInactive")}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {/* Edit */}
                      <button
                        onClick={() => openEdit(u)}
                        title={t("editUser")}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      {/* Reset password */}
                      <button
                        onClick={() => openResetPw(u)}
                        title={t("resetPassword")}
                        className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-600 transition-colors"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>

                      {/* Deactivate / Activate */}
                      {u._id !== currentUser?._id && (
                        <button
                          onClick={() => onToggleActive(u)}
                          title={u.isActive ? t("deactivateUser") : t("activateUser")}
                          className={`p-1.5 rounded-lg transition-colors ${u.isActive ? "hover:bg-red-50 text-red-500" : "hover:bg-green-50 text-green-600"}`}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
              className={`${inputClass} ${modal === "edit" ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}`}
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
              className={`${inputClass} ${isSelfEdit ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}`}
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
              <p className="text-sm text-gray-400">{isRTL ? "لا توجد فروع" : "No branches available"}</p>
            ) : (
              <div className="border border-gray-300 rounded-lg p-3 space-y-2 max-h-36 overflow-y-auto">
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
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.isActive ? "bg-green-500" : "bg-gray-300"}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isActive ? (isRTL ? "translate-x-1" : "translate-x-5") : (isRTL ? "translate-x-5" : "translate-x-1")}`} />
                </div>
                <span className="text-sm text-gray-700">
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
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-2 text-sm font-semibold transition-colors"
            >
              {saving ? t("saving") : t("save")}
            </button>
            <button
              onClick={() => { setModal(null); resetForm(); }}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-2 text-sm font-semibold transition-colors"
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
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-2 text-sm font-semibold transition-colors"
            >
              {t("cancel")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
