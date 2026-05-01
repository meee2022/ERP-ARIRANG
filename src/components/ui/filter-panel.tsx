/**
 * FilterPanel — consistent filter bar surface used across all list/report pages.
 *
 * Wraps filter controls in a visually distinct panel with a subtle brand
 * accent on the leading border. Children are the actual filter inputs.
 */
"use client";

import React from "react";
import { SlidersHorizontal } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

interface FilterPanelProps {
  children: React.ReactNode;
  /** Extra right-side element (e.g. Reset button, record count) */
  right?: React.ReactNode;
  /** Hide the "Filters" label and icon */
  hideLabel?: boolean;
  className?: string;
}

export function FilterPanel({
  children,
  right,
  hideLabel = false,
  className = "",
}: FilterPanelProps) {
  const { t } = useI18n();
  return (
    <div
      className={`no-print rounded-xl border border-[color:var(--ink-200)] bg-white px-4 py-3 ${className}`}
      style={{
        boxShadow: "var(--shadow-soft)",
        borderInlineStart: "3px solid var(--brand-600)",
      }}
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {!hideLabel && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[color:var(--brand-700)] shrink-0 select-none">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{t("filters")}</span>
          </div>
        )}
        {/* filter controls injected here */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 flex-1">
          {children}
        </div>
        {right && (
          <div className="ms-auto flex items-center gap-2 shrink-0">{right}</div>
        )}
      </div>
    </div>
  );
}

/**
 * FilterField — a labelled filter control cell.
 */
export function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[120px]">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--ink-400)]">
        {label}
      </span>
      {children}
    </div>
  );
}
