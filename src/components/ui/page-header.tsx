/**
 * PageHeader — unified page title / subtitle / actions area.
 * Mobile-first: on small screens the actions wrap below the title.
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
  /** If true, action buttons stretch full-width on mobile */
  mobileFullActions?: boolean;
}

export function PageHeader({
  icon: Icon,
  iconColor = "var(--brand-700)",
  title,
  subtitle,
  actions,
  badge,
  className = "",
  mobileFullActions = false,
}: PageHeaderProps) {
  return (
    <div className={`no-print flex flex-wrap items-start justify-between gap-3 ${className}`}>
      {/* Left: icon + title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {Icon && (
          <div
            className="shrink-0 h-10 w-10 rounded-xl flex items-center justify-center"
            style={{
              background: `color-mix(in srgb, ${iconColor} 10%, white)`,
              border: `1px solid color-mix(in srgb, ${iconColor} 18%, transparent)`,
            }}
          >
            <Icon className="h-[18px] w-[18px]" style={{ color: iconColor }} />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-[color:var(--ink-900)] leading-tight">
              {title}
            </h1>
            {badge && (
              <span className="text-[12px] text-[color:var(--ink-400)] font-normal">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11.5px] text-[color:var(--ink-500)] mt-0.5 leading-relaxed">
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