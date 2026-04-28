"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import type { Id } from "../../../convex/_generated/dataModel";

interface CostCenterSelectProps {
  companyId: Id<"companies"> | undefined;
  value: string;
  onChange: (val: string) => void;
  className?: string;
  required?: boolean;
}

/**
 * Reusable dropdown to pick an active cost center.
 * Shows code + name in the user's language.
 * Empty value = "no cost center" (optional field).
 */
export function CostCenterSelect({
  companyId,
  value,
  onChange,
  className = "input-field h-9",
  required = false,
}: CostCenterSelectProps) {
  const { t, isRTL } = useI18n();

  const costCenters = useQuery(
    api.costCenters.getCostCenters,
    companyId ? { companyId, activeOnly: true } : "skip"
  );

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      required={required}
    >
      <option value="">{t("noCostCenter")}</option>
      {(costCenters ?? []).map((cc) => (
        <option key={cc._id} value={cc._id}>
          {cc.code} — {isRTL ? cc.nameAr : (cc.nameEn || cc.nameAr)}
        </option>
      ))}
    </select>
  );
}
