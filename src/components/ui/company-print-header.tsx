/**
 * CompanyPrintHeader — Professional print/preview document header.
 *
 * Layout (RTL example):
 *
 *  ┌──────────────────────────────────────────────────────┐
 *  │  [Logo]   مخبز اريرنج                                │
 *  │           Arirang Company                             │
 *  │           عنوان ·  هاتف  ·  رقم ضريبي                │
 *  ├══════════════════════════════════════════════════════╡
 *  │                  عنوان التقرير                        │
 *  │               2026-01-01 — 2026-04-22                │
 *  └──────────────────────────────────────────────────────┘
 *
 * Hidden on screen (print:block).
 * Pass `alwaysVisible` to show on screen too.
 */
"use client";

import React from "react";

interface Company {
  nameAr: string;
  nameEn?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  taxNumber?: string;
  email?: string;
}

interface CompanyPrintHeaderProps {
  company: Company | null | undefined;
  isRTL?: boolean;
  documentTitle?: string;
  periodLine?: string;
  alwaysVisible?: boolean;
  className?: string;
}

export function CompanyPrintHeader({
  company,
  isRTL = true,
  documentTitle,
  periodLine,
  alwaysVisible = false,
  className = "",
}: CompanyPrintHeaderProps) {
  const primaryName   = isRTL ? (company?.nameAr ?? "") : (company?.nameEn || company?.nameAr || "");
  const secondaryName = isRTL ? (company?.nameEn || "") : (company?.nameAr || "");

  const contactParts: string[] = [];
  if (company?.phone)     contactParts.push(company.phone);
  if (company?.address)   contactParts.push(company.address);
  if (company?.email)     contactParts.push(company.email);
  if (company?.taxNumber) contactParts.push((isRTL ? "ض: " : "TRN: ") + company.taxNumber);

  const wrapClass = alwaysVisible
    ? `company-print-header ${className}`
    : `hidden print:block company-print-header ${className}`;

  return (
    <div className={wrapClass}>
      {/* ── Brand row ──────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          gap: "20px",
          paddingBottom: "12px",
          direction: isRTL ? "rtl" : "ltr",
        }}
      >
        {/* Logo */}
        {company?.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logoUrl}
            alt={primaryName}
            style={{
              height: "64px",
              width: "auto",
              maxWidth: "120px",
              objectFit: "contain",
              flexShrink: 0,
              borderRadius: "8px",
            }}
          />
        )}

        {/* Company info — grows to fill remaining space */}
        <div
          style={{
            flex: 1,
            textAlign: isRTL ? "right" : "left",
            direction: isRTL ? "rtl" : "ltr",
          }}
        >
          {/* Primary name — large, bold, brand color */}
          <div
            style={{
              fontSize: "22px",
              fontWeight: 900,
              color: "#1a1a2e",
              lineHeight: 1.2,
              fontFamily: "'Cairo', 'IBM Plex Sans Arabic', sans-serif",
              letterSpacing: isRTL ? "0" : "-0.02em",
            }}
          >
            {primaryName || "—"}
          </div>

          {/* Secondary name (EN/AR) */}
          {secondaryName && (
            <div
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: "#6b7280",
                marginTop: "1px",
                fontFamily: "'Cairo', 'IBM Plex Sans Arabic', sans-serif",
              }}
            >
              {secondaryName}
            </div>
          )}

          {/* Contact line */}
          {contactParts.length > 0 && (
            <div
              style={{
                fontSize: "9.5px",
                color: "#9ca3af",
                marginTop: "4px",
                fontFamily: "'Cairo', 'IBM Plex Sans Arabic', sans-serif",
                lineHeight: 1.5,
              }}
            >
              {contactParts.join("  ·  ")}
            </div>
          )}
        </div>
      </div>

      {/* ── Divider ─────────────────────────────────────────────── */}
      <div
        style={{
          height: "0",
          borderBottom: "2.5px solid #6b1523",
          marginBottom: documentTitle ? "14px" : "8px",
        }}
      />

      {/* ── Document title + period ─────────────────────────────── */}
      {documentTitle && (
        <div
          style={{
            textAlign: "center",
            marginBottom: "16px",
            direction: isRTL ? "rtl" : "ltr",
          }}
        >
          <div
            style={{
              fontSize: "15px",
              fontWeight: 800,
              color: "#1a1a2e",
              letterSpacing: isRTL ? "0.01em" : "0.04em",
              fontFamily: "'Cairo', 'IBM Plex Sans Arabic', sans-serif",
              textTransform: isRTL ? "none" : "uppercase",
            }}
          >
            {documentTitle}
          </div>
          {periodLine && (
            <div
              style={{
                fontSize: "10px",
                color: "#6b7280",
                marginTop: "3px",
                fontWeight: 500,
                fontFamily: "'Cairo', 'IBM Plex Sans Arabic', sans-serif",
                direction: "ltr",
              }}
            >
              {periodLine}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
