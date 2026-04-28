/**
 * useCompanySettings — single source of truth for company branding data.
 *
 * Usage:
 *   const { company, companyName, logoUrl, isLoading } = useCompanySettings();
 *
 * - companyName  respects the current UI language (AR / EN)
 * - logoUrl      is the permanent Convex-storage URL (or undefined)
 * - company      is the raw DB record for access to address/phone/taxNumber
 */
"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useI18n } from "./useI18n";

export function useCompanySettings() {
  const { isRTL } = useI18n();
  const company = useQuery(api.company.getCompany, {});

  const isLoading = company === undefined;

  const companyName =
    company
      ? isRTL
        ? company.nameAr
        : (company.nameEn || company.nameAr)
      : undefined;

  const logoUrl = company?.logoUrl ?? undefined;

  return {
    company,
    companyName,
    logoUrl,
    isLoading,
  };
}
