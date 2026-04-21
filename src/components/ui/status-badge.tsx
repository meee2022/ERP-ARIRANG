"use client";

import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import {
  DOCUMENT_STATUS_CONFIG,
  POSTING_STATUS_CONFIG,
  PAYMENT_STATUS_CONFIG,
  CHEQUE_STATUS_CONFIG,
  PERIOD_STATUS_CONFIG,
  ALLOCATION_STATUS_CONFIG,
} from "@/lib/constants";

export type StatusBadgeType =
  | "document"
  | "payment"
  | "posting"
  | "cheque"
  | "period"
  | "allocation";

interface StatusBadgeProps {
  status: string;
  type: StatusBadgeType;
  size?: "sm" | "md";
}

const LABEL_MAPS: Record<
  StatusBadgeType,
  Record<string, { labelAr: string; labelEn: string; bgColor: string; textColor: string }>
> = {
  document: Object.fromEntries(
    Object.entries(DOCUMENT_STATUS_CONFIG).map(([k, v]) => [
      k,
      { labelAr: v.labelAr, labelEn: v.labelEn, bgColor: v.bgColor, textColor: v.textColor },
    ])
  ),
  posting: Object.fromEntries(
    Object.entries(POSTING_STATUS_CONFIG).map(([k, v]) => [
      k,
      { labelAr: v.labelAr, labelEn: v.labelEn, bgColor: v.bgColor, textColor: v.textColor },
    ])
  ),
  payment: Object.fromEntries(
    Object.entries(PAYMENT_STATUS_CONFIG).map(([k, v]) => [
      k,
      { labelAr: v.labelAr, labelEn: v.labelEn, bgColor: v.bgColor, textColor: v.textColor },
    ])
  ),
  cheque: Object.fromEntries(
    Object.entries(CHEQUE_STATUS_CONFIG).map(([k, v]) => [
      k,
      { labelAr: v.labelAr, labelEn: v.labelEn, bgColor: v.bgColor, textColor: v.textColor },
    ])
  ),
  period: Object.fromEntries(
    Object.entries(PERIOD_STATUS_CONFIG).map(([k, v]) => [
      k,
      { labelAr: v.labelAr, labelEn: v.labelEn, bgColor: v.bgColor, textColor: v.textColor },
    ])
  ),
  allocation: Object.fromEntries(
    Object.entries(ALLOCATION_STATUS_CONFIG).map(([k, v]) => [
      k,
      { labelAr: v.labelAr, labelEn: v.labelEn, bgColor: v.bgColor, textColor: v.textColor },
    ])
  ),
};

export function StatusBadge({ status, type, size = "sm" }: StatusBadgeProps) {
  const { isRTL } = useI18n();
  const map = LABEL_MAPS[type];
  const config = map?.[status];

  const label = config
    ? isRTL
      ? config.labelAr
      : config.labelEn
    : status;
  const bgColor = config?.bgColor ?? "bg-gray-100";
  const textColor = config?.textColor ?? "text-gray-600";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        bgColor,
        textColor
      )}
    >
      {label}
    </span>
  );
}
