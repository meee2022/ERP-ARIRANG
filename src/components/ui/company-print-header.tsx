/**
 * CompanyPrintHeader — Professional document header with logo, company info,
 * divider and document title/period.
 *
 * Hidden on screen by default (print:block). Pass alwaysVisible to show on screen.
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
  if (company?.taxNumber) contactParts.push((isRTL ? "الرقم الضريبي: " : "TRN: ") + company.taxNumber);

  const wrapClass = alwaysVisible
    ? `company-print-header ${className}`
    : `hidden print:block company-print-header ${className}`;

  const BRAND = "#6b1523";
  const GOLD  = "#c9a84c";

  return (
    <div className={wrapClass} style={{ direction: isRTL ? "rtl" : "ltr" }}>

      {/* ── Top accent bar ─────────────────────────────────────── */}
      <div style={{
        height: 5,
        background: `linear-gradient(90deg, ${BRAND} 0%, ${GOLD} 60%, ${BRAND} 100%)`,
        borderRadius: "3px 3px 0 0",
        marginBottom: 0,
      }} />

      {/* ── Brand row ──────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center",
        gap: 18,
        padding: "14px 20px 12px",
        background: "#fafaf8",
        borderLeft: isRTL ? "none" : `4px solid ${BRAND}`,
        borderRight: isRTL ? `4px solid ${BRAND}` : "none",
      }}>
        {/* Logo */}
        {company?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logoUrl}
            alt={primaryName}
            style={{
              height: 72,
              width: "auto",
              maxWidth: 130,
              objectFit: "contain",
              flexShrink: 0,
              borderRadius: 10,
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}
          />
        ) : (
          /* Placeholder monogram when no logo */
          <div style={{
            height: 72,
            width: 72,
            borderRadius: 10,
            background: BRAND,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 28,
            fontWeight: 900,
            flexShrink: 0,
            letterSpacing: "-0.02em",
          }}>
            {(primaryName || "?").slice(0, 1).toUpperCase()}
          </div>
        )}

        {/* Company info */}
        <div style={{ flex: 1, textAlign: isRTL ? "right" : "left" }}>
          {/* Primary name */}
          <div style={{
            fontSize: 24,
            fontWeight: 900,
            color: BRAND,
            lineHeight: 1.15,
            fontFamily: "'Cairo', 'IBM Plex Sans Arabic', Arial, sans-serif",
            letterSpacing: isRTL ? "0.01em" : "-0.02em",
          }}>
            {primaryName || "—"}
          </div>

          {/* Secondary name */}
          {secondaryName && (
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#6b7280",
              marginTop: 2,
              fontFamily: "'Cairo', 'IBM Plex Sans Arabic', Arial, sans-serif",
              letterSpacing: "0.01em",
            }}>
              {secondaryName}
            </div>
          )}

          {/* Contact line */}
          {contactParts.length > 0 && (
            <div style={{
              fontSize: 10,
              color: "#9ca3af",
              marginTop: 6,
              fontFamily: "'Cairo', 'IBM Plex Sans Arabic', Arial, sans-serif",
              lineHeight: 1.6,
              direction: "ltr",
              textAlign: isRTL ? "right" : "left",
            }}>
              {contactParts.join("  ·  ")}
            </div>
          )}
        </div>
      </div>

      {/* ── Divider ─────────────────────────────────────────────── */}
      <div style={{
        height: 0,
        borderBottom: `2px solid ${BRAND}`,
        margin: "0 0 0 0",
      }} />
      <div style={{
        height: 0,
        borderBottom: `1px solid ${GOLD}40`,
        marginBottom: documentTitle ? 14 : 8,
      }} />

      {/* ── Document title + period ─────────────────────────────── */}
      {documentTitle && (
        <div style={{
          textAlign: "center",
          padding: "10px 20px 14px",
          direction: isRTL ? "rtl" : "ltr",
        }}>
          <div style={{
            fontSize: 15,
            fontWeight: 800,
            color: "#1a1a2e",
            letterSpacing: isRTL ? "0.01em" : "0.08em",
            fontFamily: "'Cairo', 'IBM Plex Sans Arabic', Arial, sans-serif",
            textTransform: isRTL ? "none" : "uppercase",
          }}>
            {documentTitle}
          </div>
          {periodLine && (
            <div style={{
              fontSize: 10,
              color: "#6b7280",
              marginTop: 3,
              fontWeight: 500,
              fontFamily: "monospace",
              direction: "ltr",
              letterSpacing: "0.05em",
            }}>
              {periodLine}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
