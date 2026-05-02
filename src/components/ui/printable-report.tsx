"use client";
/**
 * PrintableReportPage
 * ───────────────────
 * Wraps every report in a professional document layout:
 *  • On screen  → white card centred on grey background, company header always visible
 *  • On print   → full-width, shadow removed, beautiful document output
 *
 * Usage:
 *   <PrintableReportPage
 *     company={printCompany}
 *     isRTL={isRTL}
 *     title="Trial Balance"
 *     period="2026-01-01 — 2026-05-02"
 *     actions={<>…buttons…</>}
 *     filters={<>…filter panels…</>}   ← hidden on print automatically
 *     summary={<SummaryStrip … />}
 *   >
 *     {table / content}
 *   </PrintableReportPage>
 */

import React from "react";
import { Printer } from "lucide-react";

interface Company {
  nameAr: string;
  nameEn?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  taxNumber?: string;
  email?: string;
}

interface Props {
  company?: Company | null;
  isRTL?: boolean;
  title: string;
  period?: string;
  /** Buttons shown in top-right toolbar (hidden on print) */
  actions?: React.ReactNode;
  /** Filter panels – always hidden on print */
  filters?: React.ReactNode;
  /** KPI / summary strip – shown on both screen and print */
  summary?: React.ReactNode;
  children: React.ReactNode;
  dir?: "ltr" | "rtl";
}

const BRAND = "#6b1523";
const GOLD  = "#c9a84c";

export function PrintableReportPage({
  company,
  isRTL = true,
  title,
  period,
  actions,
  filters,
  summary,
  children,
}: Props) {
  const dir = isRTL ? "rtl" : "ltr";

  const primaryName   = isRTL ? (company?.nameAr ?? "") : (company?.nameEn || company?.nameAr || "");
  const secondaryName = isRTL ? (company?.nameEn ?? "") : (company?.nameAr ?? "");
  const contactParts: string[] = [];
  if (company?.phone)     contactParts.push(company.phone);
  if (company?.address)   contactParts.push(company.address);
  if (company?.email)     contactParts.push(company.email);
  if (company?.taxNumber) contactParts.push((isRTL ? "الرقم الضريبي: " : "TRN: ") + company.taxNumber);

  return (
    <div
      dir={dir}
      className="min-h-screen print:min-h-0"
      style={{ background: "var(--ink-50, #f8f8f6)" }}
    >
      {/* ── Screen-only toolbar ───────────────────────────────── */}
      <div className="printable-report-toolbar no-print sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-[color:var(--ink-150)] px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-base font-bold text-[color:var(--ink-900)] leading-tight">{title}</h1>
          {period && (
            <p className="text-xs text-[color:var(--ink-400)] font-mono mt-0.5">{period}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {actions}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium btn-ghost"
          >
            <Printer className="h-4 w-4" />
            {isRTL ? "طباعة" : "Print"}
          </button>
        </div>
      </div>

      {/* ── Filters (screen only) ─────────────────────────────── */}
      {filters && (
        <div className="no-print px-6 pt-4">
          {filters}
        </div>
      )}

      {/* ── Document card ─────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto my-6 print:my-0 print:max-w-none px-4 print:px-0 space-y-0">
        <div
          className="printable-report-card bg-white print:bg-white overflow-hidden"
          style={{
            borderRadius: "12px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          {/* ── Company header (always visible) ───────────────── */}
          <div style={{ direction: dir }}>
            {/* Top accent bar */}
            <div style={{
              height: 5,
              background: `linear-gradient(90deg, ${BRAND} 0%, ${GOLD} 55%, ${BRAND} 100%)`,
            }} />

            {/* Brand row */}
            <div style={{
              display: "flex",
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              gap: 18,
              padding: "16px 24px 14px",
              background: "#fafaf8",
              borderBottom: `1px solid ${GOLD}30`,
            }}>
              {/* Logo or monogram */}
              {company?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={company.logoUrl}
                  alt={primaryName}
                  style={{
                    height: 64,
                    width: "auto",
                    maxWidth: 120,
                    objectFit: "contain",
                    flexShrink: 0,
                    borderRadius: 8,
                  }}
                />
              ) : (
                <div style={{
                  height: 60,
                  width: 60,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${BRAND}, #9a1f33)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 26,
                  fontWeight: 900,
                  flexShrink: 0,
                }}>
                  {(primaryName || "?").slice(0, 1).toUpperCase()}
                </div>
              )}

              {/* Company info */}
              <div style={{ flex: 1, textAlign: isRTL ? "right" : "left" }}>
                <div style={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: BRAND,
                  lineHeight: 1.2,
                  fontFamily: "'Cairo','IBM Plex Sans Arabic',Arial,sans-serif",
                }}>
                  {primaryName || "—"}
                </div>
                {secondaryName && (
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#6b7280",
                    marginTop: 2,
                    fontFamily: "'Cairo','IBM Plex Sans Arabic',Arial,sans-serif",
                  }}>
                    {secondaryName}
                  </div>
                )}
                {contactParts.length > 0 && (
                  <div style={{
                    fontSize: 10,
                    color: "#9ca3af",
                    marginTop: 4,
                    fontFamily: "'Cairo','IBM Plex Sans Arabic',Arial,sans-serif",
                    direction: "ltr",
                    textAlign: isRTL ? "right" : "left",
                  }}>
                    {contactParts.join("  ·  ")}
                  </div>
                )}
              </div>

              {/* Document title badge */}
              <div style={{
                textAlign: "center",
                padding: "10px 20px",
                background: BRAND,
                borderRadius: 8,
                flexShrink: 0,
              }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "rgba(255,255,255,0.9)",
                  textTransform: isRTL ? "none" : "uppercase",
                  letterSpacing: isRTL ? "0" : "0.06em",
                  fontFamily: "'Cairo','IBM Plex Sans Arabic',Arial,sans-serif",
                }}>
                  {title}
                </div>
                {period && (
                  <div style={{
                    fontSize: 10,
                    color: GOLD,
                    marginTop: 4,
                    fontFamily: "monospace",
                    direction: "ltr",
                    letterSpacing: "0.04em",
                  }}>
                    {period}
                  </div>
                )}
              </div>
            </div>

            {/* Gold divider */}
            <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}80, transparent)` }} />
          </div>

          {/* ── Summary strip ──────────────────────────────────── */}
          {summary && (
            <div className="px-6 py-4 border-b border-[color:var(--ink-100)]">
              {summary}
            </div>
          )}

          {/* ── Report content ─────────────────────────────────── */}
          <div>
            {children}
          </div>

          {/* ── Print footer ───────────────────────────────────── */}
          <div
            className="print-only"
            style={{
              borderTop: `1px solid ${GOLD}40`,
              padding: "8px 24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 9,
              color: "#9ca3af",
              direction: dir,
            }}
          >
            <span>{isRTL ? "تمت الطباعة بواسطة النظام المالي" : "Printed by the Financial System"}</span>
            <span style={{ fontFamily: "monospace" }}>
              {new Date().toLocaleDateString(isRTL ? "ar-QA" : "en-QA")} {new Date().toLocaleTimeString(isRTL ? "ar-QA" : "en-QA", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
