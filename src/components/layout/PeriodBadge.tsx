"use client";

import { CalendarDays } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";

export function PeriodBadge() {
  const { t, isRTL } = useI18n();
  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const today = new Date().toISOString().split("T")[0];

  const period = useQuery(
    api.helpers.getOpenPeriod,
    company ? { companyId: company._id, date: today } : "skip"
  );

  // Still loading
  if (company === undefined || period === undefined) return null;
  // No open period
  if (!period) return (
    <div
      className="h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-200"
      title={t("noPeriodOpen")}
    >
      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
      <span>{t("noPeriodOpen")}</span>
    </div>
  );

  const name = period.name; // accountingPeriods only has `name`, not nameAr/nameEn

  return (
    <div
      className="h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium bg-[color:var(--ink-50)] border border-[color:var(--ink-200)] text-[color:var(--ink-700)]"
      title={t("currentPeriod")}
    >
      <CalendarDays className="h-3.5 w-3.5 text-[color:var(--brand-700)] shrink-0" />
      <span className="truncate max-w-[140px]">{name}</span>
    </div>
  );
}
