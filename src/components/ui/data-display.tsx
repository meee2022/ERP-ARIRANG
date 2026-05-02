/**
 * SummaryStrip — a horizontal KPI / summary number bar.
 * Used in Trial Balance, Income Statement, Cash Movement, etc.
 *
 * Each item: { label, value, accent? }
 * accent = optional color for the value (e.g. red for expenses, green for profit)
 */
import React from "react";

interface SummaryItem {
  label: string;
  value: React.ReactNode;
  accent?: string;        // CSS color for the value
  borderColor?: string;   // override top accent border
}

interface SummaryStripProps {
  items: SummaryItem[];
  className?: string;
}

export function SummaryStrip({ items, className = "" }: SummaryStripProps) {
  return (
    <div className={`overflow-x-auto ${className}`}
      style={{ WebkitOverflowScrolling: "touch" as any }}>
      <div
        className="grid gap-px rounded-xl overflow-hidden border border-[color:var(--ink-200)] bg-[color:var(--ink-200)]"
        style={{
          gridTemplateColumns: `repeat(${items.length}, minmax(120px, 1fr))`,
        }}
      >
        {items.map((item, i) => (
          <div
            key={i}
            className="bg-white px-4 py-3.5 flex flex-col gap-1"
            style={{ borderTop: `3px solid ${item.borderColor ?? "var(--ink-200)"}` }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--ink-400)] whitespace-nowrap">
              {item.label}
            </span>
            <span
              className="text-[17px] font-bold tabular-nums leading-tight"
              style={{ color: item.accent ?? "var(--ink-900)" }}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * SectionCard — a content card with optional title and actions.
 */
interface SectionCardProps {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
  className?: string;
}

export function SectionCard({
  title,
  actions,
  children,
  noPadding = false,
  className = "",
}: SectionCardProps) {
  return (
    <div className={`surface-card overflow-hidden ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[color:var(--ink-100)]">
          {title && (
            <span className="text-sm font-bold text-[color:var(--ink-900)]">
              {title}
            </span>
          )}
          {actions && (
            <div className="flex items-center gap-2">{actions}</div>
          )}
        </div>
      )}
      <div className={noPadding ? "" : "p-5"}>{children}</div>
    </div>
  );
}

/**
 * TableWrapper — consistent table container with sticky header support.
 */
export function TableWrapper({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  );
}

/**
 * Th — table header cell with default styling.
 */
export function Th({
  children,
  align = "start",
  className = "",
}: {
  children?: React.ReactNode;
  align?: "start" | "end" | "center";
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 text-${align} text-xs font-semibold text-[color:var(--ink-500)] uppercase tracking-wider bg-[color:var(--ink-50)] border-b border-[color:var(--ink-200)] whitespace-nowrap ${className}`}
    >
      {children}
    </th>
  );
}

/**
 * Td — table body cell with default styling.
 */
export function Td({
  children,
  align = "start",
  className = "",
  muted = false,
  numeric = false,
}: {
  children?: React.ReactNode;
  align?: "start" | "end" | "center";
  className?: string;
  muted?: boolean;
  numeric?: boolean;
}) {
  return (
    <td
      className={`px-4 py-2.5 text-${align} border-b border-[color:var(--ink-100)] ${muted ? "text-[color:var(--ink-400)]" : "text-[color:var(--ink-800)]"} ${numeric ? "tabular-nums font-medium" : ""} ${className}`}
    >
      {children}
    </td>
  );
}

/**
 * TotalRow — summary / total row at the bottom of a table.
 */
export function TotalRow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={`bg-[color:var(--ink-50)] border-t-2 border-[color:var(--ink-300)] font-bold ${className}`}
    >
      {children}
    </tr>
  );
}

/**
 * KPICard — a single KPI block with label, value, icon, and optional accent border.
 */
interface KPICardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
  iconColor?: string;
  accent?: string;         // left border color
  valueColor?: string;     // value text color
  sub?: React.ReactNode;   // small subtext below value
  className?: string;
}

export function KPICard({
  label,
  value,
  icon: Icon,
  iconColor = "var(--brand-700)",
  accent,
  valueColor,
  sub,
  className = "",
}: KPICardProps) {
  return (
    <div
      className={`kpi-card flex flex-col gap-1 ${className}`}
      style={accent ? { borderInlineStart: `3px solid ${accent}` } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--ink-400)]">
            {label}
          </div>
          <div
            className="mt-1.5 text-2xl font-bold tabular-nums leading-tight truncate"
            style={{ color: valueColor ?? "var(--ink-900)" }}
          >
            {value}
          </div>
          {sub && (
            <div className="mt-0.5 text-[11px] text-[color:var(--ink-400)]">{sub}</div>
          )}
        </div>
        {Icon && (
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: `color-mix(in srgb, ${iconColor} 10%, white)`,
              border: `1px solid color-mix(in srgb, ${iconColor} 18%, transparent)`,
            }}
          >
            <Icon className="h-[18px] w-[18px]" style={{ color: iconColor }} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ColorKPI — single colored KPI tile (rounded, bg-tint, icon chip, big number).
 * Used by ColorKPIGrid below. Same visual language as the AR/AP Aging headers.
 */
export interface ColorKPIItem {
  label: string;
  value: string | number;
  color: string;       // text + accent color, e.g. "#16a34a"
  bg: string;          // tile background, e.g. "#f0fdf4"
  border: string;      // tile border, e.g. "#bbf7d0"
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  hint?: string;       // small subtext below the value
  big?: boolean;       // larger number (for primary tile)
}

export function ColorKPI({
  label, value, color, bg, border, icon: Icon, hint, big = false,
}: ColorKPIItem) {
  return (
    <div className="rounded-2xl border p-3.5" style={{ background: bg, borderColor: border }}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && (
          <span
            className="h-6 w-6 rounded-md flex items-center justify-center"
            style={{ background: color + "20" }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color }} />
          </span>
        )}
        <p className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color }}>
          {label}
        </p>
      </div>
      <p
        className={`${big ? "text-[22px]" : "text-[18px]"} font-black tabular-nums leading-tight`}
        style={{ color }}
      >
        {value}
      </p>
      {hint && (
        <p className="text-[10.5px] mt-0.5" style={{ color: color + "aa" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * ColorKPIGrid — responsive grid of colored KPI tiles. Use anywhere you want
 * the same colorful header look as the AR/AP Aging report.
 *
 * @param cols  Tailwind cols at lg breakpoint (default 6). Auto-adapts on smaller screens.
 */
export function ColorKPIGrid({
  items,
  cols = 6,
  className = "",
}: {
  items: ColorKPIItem[];
  cols?: 3 | 4 | 5 | 6 | 7 | 8;
  className?: string;
}) {
  const lgCols: Record<number, string> = {
    3: "lg:grid-cols-3", 4: "lg:grid-cols-4", 5: "lg:grid-cols-5",
    6: "lg:grid-cols-6", 7: "lg:grid-cols-7", 8: "lg:grid-cols-8",
  };
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 ${lgCols[cols]} gap-3 ${className}`}>
      {items.map((it, i) => (
        <ColorKPI key={i} {...it} />
      ))}
    </div>
  );
}

/**
 * LoadingState — centered spinner + label for async content areas.
 */
export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="loading-spinner">
      <div className="spinner" />
      <span className="spinner-label">{label}</span>
    </div>
  );
}
