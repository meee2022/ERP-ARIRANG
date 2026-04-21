"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface FormSectionProps {
  titleAr: string;
  titleEn?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  actions?: React.ReactNode;
}

export function FormSection({
  titleAr,
  titleEn,
  description,
  children,
  className,
  actions,
}: FormSectionProps) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white overflow-hidden", className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
        <div>
          <h3 className="text-base font-semibold text-slate-800">{titleAr}</h3>
          {titleEn && <p className="text-xs text-slate-400 mt-0.5">{titleEn}</p>}
          {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Section Body */}
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─── FORM GRID ────────────────────────────────────────────────────────────────

interface FormGridProps {
  cols?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}

export function FormGrid({ cols = 2, children, className }: FormGridProps) {
  const colClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  }[cols];

  return <div className={cn("grid gap-4", colClass, className)}>{children}</div>;
}

// ─── FORM FIELD ───────────────────────────────────────────────────────────────

interface FormFieldProps {
  labelAr: string;
  labelEn?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  labelAr,
  labelEn,
  required,
  error,
  hint,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="flex items-center gap-1 text-sm font-medium text-slate-700">
        {labelAr}
        {labelEn && <span className="text-slate-400 font-normal text-xs">({labelEn})</span>}
        {required && <span className="text-red-500 mr-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── FORM DIVIDER ─────────────────────────────────────────────────────────────

export function FormDivider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px bg-slate-200" />
      {label && <span className="text-xs text-slate-400 whitespace-nowrap">{label}</span>}
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}
