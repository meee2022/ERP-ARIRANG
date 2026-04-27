/**
 * PageHeader — unified page title / subtitle / actions area.
 * Used at the top of every main page.
 *
 * Props:
 *   icon        — Lucide icon component (optional)
 *   title       — h1 text
 *   subtitle    — small descriptor text
 *   actions     — slot for buttons / badges on the right
 *   badge       — a small pill appended after the title (e.g. record count)
 */
import React from "react";

interface PageHeaderProps {
  icon?: React.ElementType;
  iconColor?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  icon: Icon,
  iconColor = "var(--brand-700)",
  title,
  subtitle,
  actions,
  badge,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-4 ${className}`}>
      {/* left: icon + text */}
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div
            className="shrink-0 h-10 w-10 rounded-xl flex items-center justify-center"
            style={{
              background: `color-mix(in srgb, ${iconColor} 10%, white)`,
              border: `1px solid color-mix(in srgb, ${iconColor} 16%, transparent)`,
            }}
          >
            <Icon className="h-5 w-5" style={{ color: iconColor }} />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[22px] font-bold tracking-tight text-[color:var(--ink-900)] leading-tight">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="text-xs text-[color:var(--ink-500)] mt-0.5 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* right: action buttons */}
      {actions && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
