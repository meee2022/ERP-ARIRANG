/**
 * EmptyState — consistent empty/zero-data placeholder.
 * Used in table bodies, report containers, and list pages.
 */
import React from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ElementType;
  title?: string;
  message?: string;
  action?: React.ReactNode;
  /** "table" wraps in a single <td> spanning all cols; "block" is a plain div */
  variant?: "table" | "block";
  colSpan?: number;
  className?: string;
}

function EmptyContent({
  icon: Icon = Inbox,
  title,
  message,
  action,
  className = "",
}: Omit<EmptyStateProps, "variant" | "colSpan">) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-8 text-center ${className}`}
    >
      {/* Icon container — brand-tinted with subtle dashed ring */}
      <div className="relative mb-5">
        {/* Outer dashed ring */}
        <div
          className="absolute inset-0 rounded-[28px] scale-[1.35]"
          style={{
            border: "1.5px dashed color-mix(in srgb, var(--brand-600) 22%, transparent)",
          }}
        />
        {/* Icon box */}
        <div
          className="relative h-16 w-16 rounded-2xl flex items-center justify-center"
          style={{
            background: "color-mix(in srgb, var(--brand-600) 7%, white)",
            border: "1px solid color-mix(in srgb, var(--brand-600) 15%, transparent)",
            boxShadow: "0 1px 4px color-mix(in srgb, var(--brand-600) 8%, transparent)",
          }}
        >
          <Icon
            className="h-7 w-7"
            style={{ color: "var(--brand-700)", opacity: 0.75 }}
          />
        </div>
      </div>

      {title && (
        <p className="text-sm font-bold text-[color:var(--ink-800)] mb-1 tracking-tight">
          {title}
        </p>
      )}
      {message && (
        <p className="text-xs text-[color:var(--ink-400)] max-w-xs leading-relaxed mt-0.5">
          {message}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function EmptyState({
  variant = "block",
  colSpan = 8,
  ...rest
}: EmptyStateProps) {
  if (variant === "table") {
    return (
      <tr>
        <td colSpan={colSpan}>
          <EmptyContent {...rest} />
        </td>
      </tr>
    );
  }
  return <EmptyContent {...rest} />;
}
