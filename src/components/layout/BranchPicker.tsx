"use client";

import { Building2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";

export function BranchPicker() {
  const { t, isRTL } = useI18n();
  const { currentUser } = useAuth();
  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const setSelectedBranch = useAppStore((s) => s.setSelectedBranch);

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];

  const allBranches = useQuery(
    api.branches.getAll,
    company ? { companyId: company._id } : "skip"
  );

  if (!currentUser || !allBranches || allBranches.length === 0) return null;

  const isAdmin = currentUser.role === "admin";

  // For non-admin users: filter to only accessible branches
  const accessibleBranches = isAdmin
    ? allBranches
    : allBranches.filter((b) => currentUser.branchIds.includes(b._id));

  // Single-branch users: just show branch name, no dropdown
  if (accessibleBranches.length === 1) {
    const branch = accessibleBranches[0];
    const name = isRTL ? branch.nameAr : (branch.nameEn || branch.nameAr);
    return (
      <div className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[color:var(--ink-50)] border border-[color:var(--ink-200)] text-sm text-[color:var(--ink-700)]">
        <Building2 className="h-4 w-4 text-[color:var(--brand-700)] shrink-0" />
        <span className="font-medium truncate max-w-[160px]">{name}</span>
      </div>
    );
  }

  const currentBranchName =
    selectedBranch === "all"
      ? t("allBranches")
      : (() => {
          const b = accessibleBranches.find((b) => b._id === selectedBranch);
          return b ? (isRTL ? b.nameAr : (b.nameEn || b.nameAr)) : t("allBranches");
        })();

  return (
    <div className="relative flex items-center gap-1.5">
      <Building2 className="absolute h-4 w-4 text-[color:var(--brand-700)] shrink-0 pointer-events-none z-10"
        style={{ [isRTL ? "right" : "left"]: "10px" }} />
      <select
        value={selectedBranch}
        onChange={(e) => setSelectedBranch(e.target.value)}
        className="h-9 rounded-lg bg-[color:var(--ink-50)] border border-[color:var(--ink-200)] hover:border-[color:var(--brand-400)] text-sm text-[color:var(--ink-700)] font-medium transition-colors cursor-pointer appearance-none"
        style={{
          paddingInlineStart: "32px",
          paddingInlineEnd: "12px",
          minWidth: "140px",
          maxWidth: "200px",
        }}
        title={t("switchBranch")}
      >
        {isAdmin && (
          <option value="all">{t("allBranches")}</option>
        )}
        {accessibleBranches.map((b) => (
          <option key={b._id} value={b._id}>
            {isRTL ? b.nameAr : (b.nameEn || b.nameAr)}
          </option>
        ))}
      </select>
    </div>
  );
}
