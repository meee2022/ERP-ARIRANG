/**
 * Shared react-pdf building blocks used across all PDF documents.
 * RTL support: pass isRTL={true} to flip layout for Arabic documents.
 */
import React from "react";
import { View, Text, Image } from "@react-pdf/renderer";
import { base, badgeColors, COL, rowDir, textStart, textEnd, alignEnd } from "./pdfStyles";

// ── Page Footer (page number) ─────────────────────────────────────────────────
export function PdfFooter({ printedBy, isRTL }: { printedBy?: string; isRTL?: boolean }) {
  const dir = rowDir(isRTL ?? false);
  return (
    <View style={[base.footer, { flexDirection: dir }]} fixed>
      <Text style={base.footerText}>{printedBy ?? ""}</Text>
      <Text
        style={base.footerText}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

// ── Company / Doc header ──────────────────────────────────────────────────────
const BRAND_COLOR = "#6b1523";

export function PdfHeader({
  companyName, companyNameEn, companyAddress, branchName, companyVat, companyPhone, logoUrl,
  docTitle, docNumber, docDate, status, isRTL,
}: {
  companyName: string; companyNameEn?: string; companyAddress?: string; branchName?: string;
  companyVat?: string; companyPhone?: string; logoUrl?: string;
  docTitle: string; docNumber?: string; docDate?: string; status?: string; isRTL?: boolean;
}) {
  const rtl = isRTL ?? false;
  const bc = status ? badgeColors(status) : null;
  const dir = rowDir(rtl);
  const docTextAlign = textEnd(rtl);

  return (
    <View style={{ marginBottom: 14 }}>
      {/* Main header row: company block + doc info */}
      <View style={{ flexDirection: dir, justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 10 }}>
        {/* Company block — logo + names + meta */}
        <View style={{ flexDirection: dir, alignItems: "flex-start" }}>
          {/* Logo (conditional) */}
          {logoUrl ? (
            <View style={{ marginRight: rtl ? 0 : 10, marginLeft: rtl ? 10 : 0 }}>
              <Image
                src={logoUrl}
                style={{ width: 60, height: 60, objectFit: "contain" }}
              />
            </View>
          ) : null}
          {/* Company name(s) + meta */}
          <View>
            <Text style={base.companyName}>{companyName}</Text>
            {companyNameEn ? (
              <Text style={[base.companyMeta, { fontSize: 9, color: "#475569" }]}>{companyNameEn}</Text>
            ) : null}
            {companyAddress ? <Text style={base.companyMeta}>{companyAddress}</Text> : null}
            {branchName     ? <Text style={base.companyMeta}>{branchName}</Text>     : null}
            {companyVat     ? <Text style={base.companyMeta}>Tax No: {companyVat}</Text> : null}
            {companyPhone   ? <Text style={base.companyMeta}>Tel: {companyPhone}</Text>  : null}
          </View>
        </View>
        {/* Doc info block */}
        <View style={{ alignItems: alignEnd(rtl) }}>
          <Text style={[base.docTitle,  { textAlign: docTextAlign, color: BRAND_COLOR }]}>{docTitle}</Text>
          {docNumber ? <Text style={[base.docNumber, { textAlign: docTextAlign }]}>#{docNumber}</Text> : null}
          {docDate ? <Text style={[base.docDate,   { textAlign: docTextAlign }]}>{docDate}</Text> : null}
          {bc && (
            <View style={[base.badge, { backgroundColor: bc.bg, marginTop: 4 }]}>
              <Text style={[base.badgeText, { color: bc.fg }]}>{status?.toUpperCase()}</Text>
            </View>
          )}
        </View>
      </View>
      {/* Brand color divider line */}
      <View style={{ height: 2.5, backgroundColor: BRAND_COLOR, borderRadius: 1 }} />
    </View>
  );
}

// ── Two-column info block ──────────────────────────────────────────────────────
export function InfoGrid({ left, right, isRTL }: {
  left:  { label: string; value: string; sub?: string }[];
  right: { label: string; value: string; sub?: string }[];
  isRTL?: boolean;
}) {
  const rtl = isRTL ?? false;
  const dir = rowDir(rtl);
  // In RTL, swap which column appears first visually
  const [first, second] = rtl ? [right, left] : [left, right];

  const renderCol = (items: typeof left, align: "left" | "right") => (
    <View style={[base.infoBlock, { alignItems: align === "right" ? "flex-end" : "flex-start" }]}>
      {items.map((item, i) => (
        <View key={i} style={{ marginBottom: 4, alignItems: align === "right" ? "flex-end" : "flex-start" }}>
          <Text style={[base.infoLabel, { textAlign: align }]}>{item.label}</Text>
          <Text style={[base.infoValue, { textAlign: align }]}>{item.value}</Text>
          {item.sub ? <Text style={[base.infoSub, { textAlign: align }]}>{item.sub}</Text> : null}
        </View>
      ))}
    </View>
  );

  return (
    <View style={[base.infoGrid, { flexDirection: dir }]}>
      {renderCol(first,  rtl ? "right" : "left")}
      {renderCol(second, rtl ? "left"  : "right")}
    </View>
  );
}

// ── Lines Table ───────────────────────────────────────────────────────────────
export interface PdfLine {
  idx: number;
  code?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export function LinesTable({
  lines, labels, formatCurrency, isRTL,
}: {
  lines: PdfLine[];
  labels: { no: string; code: string; name: string; qty: string; price: string; total: string };
  formatCurrency: (n: number) => string;
  isRTL?: boolean;
}) {
  const rtl = isRTL ?? false;
  const dir = rowDir(rtl);
  const numAlign  = textEnd(rtl);
  const nameAlign = textStart(rtl);

  // Column definitions — render in LTR or RTL order
  const cols = [
    { key: "idx",   width: COL.idx,   align: nameAlign, th: labels.no,    renderTd: (l: PdfLine) => String(l.idx) },
    { key: "code",  width: COL.code,  align: nameAlign, th: labels.code,  renderTd: (l: PdfLine) => l.code ?? "—" },
    { key: "name",  flex: 1,          align: nameAlign, th: labels.name,  renderTd: (l: PdfLine) => l.name },
    { key: "qty",   width: COL.qty,   align: numAlign,  th: labels.qty,   renderTd: (l: PdfLine) => String(l.quantity) },
    { key: "price", width: COL.price, align: numAlign,  th: labels.price, renderTd: (l: PdfLine) => formatCurrency(l.unitPrice) },
    { key: "total", width: COL.total, align: numAlign,  th: labels.total, renderTd: (l: PdfLine) => formatCurrency(l.lineTotal) },
  ];
  const orderedCols = rtl ? [...cols].reverse() : cols;

  return (
    <View style={{ marginBottom: 8 }}>
      {/* Header row */}
      <View style={[base.tableHeader, { flexDirection: dir }]}>
        {orderedCols.map((col) => (
          <Text
            key={col.key}
            style={[base.thText, col.flex ? { flex: col.flex } : { width: col.width as number }, { textAlign: col.align }]}
          >
            {col.th}
          </Text>
        ))}
      </View>
      {/* Data rows */}
      {lines.map((line, i) => (
        <View key={i} style={[base.tableRow, { flexDirection: dir }, i % 2 === 1 ? base.tableRowAlt : {}]} wrap={false}>
          {orderedCols.map((col) => (
            <Text
              key={col.key}
              style={[
                base.tdText,
                col.flex ? { flex: col.flex } : { width: col.width as number },
                { textAlign: col.align },
                col.key === "code"  ? { fontSize: 8, fontFamily: "Helvetica" } : {},
                col.key === "total" ? { fontWeight: 700 } : {},
              ]}
            >
              {col.renderTd(line)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Totals block ──────────────────────────────────────────────────────────────
export function TotalsBlock({
  subtotal, vat, total, labels, formatCurrency, isRTL,
}: {
  subtotal: number; vat: number; total: number;
  labels: { subtotal: string; vat: string; total: string };
  formatCurrency: (n: number) => string;
  isRTL?: boolean;
}) {
  const rtl = isRTL ?? false;
  const blockAlign = rtl ? "flex-start" : "flex-end";
  const dir = rowDir(rtl);

  return (
    <View style={[base.totalsBlock, { alignItems: blockAlign }]}>
      <View style={[base.totalsRow, { flexDirection: dir }]}>
        <Text style={base.totalsLabel}>{labels.subtotal}</Text>
        <Text style={base.totalsValue}>{formatCurrency(subtotal)}</Text>
      </View>
      {vat > 0 && (
        <View style={[base.totalsRow, { flexDirection: dir }]}>
          <Text style={base.totalsLabel}>{labels.vat}</Text>
          <Text style={base.totalsValue}>{formatCurrency(vat)}</Text>
        </View>
      )}
      <View style={[base.totalsFinal, { flexDirection: dir }]}>
        <Text style={base.totalsFinalLabel}>{labels.total}</Text>
        <Text style={base.totalsFinalValue}>{formatCurrency(total)}</Text>
      </View>
    </View>
  );
}

// ── Signature strip ───────────────────────────────────────────────────────────
export function SignatureStrip({ labels, isRTL }: { labels: string[]; isRTL?: boolean }) {
  const dir = rowDir(isRTL ?? false);
  return (
    <View style={[base.sigStrip, { flexDirection: dir }]}>
      {labels.map((label) => (
        <View key={label} style={base.sigBox}>
          <View style={base.sigLine} />
          <Text style={base.sigLabel}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Tree section for hierarchical reports (Balance Sheet / P&L) ──────────────
export interface TreeNode {
  code?: string;
  label: string;
  amount: number;
  level: number; // 0 = group header, 1 = sub-group, 2 = account leaf
  isTotal?: boolean;
}

export function TreeSection({
  nodes, formatCurrency, isRTL,
}: {
  nodes: TreeNode[];
  formatCurrency: (n: number) => string;
  isRTL?: boolean;
}) {
  const rtl = isRTL ?? false;
  const dir = rowDir(rtl);
  const numAlign = textEnd(rtl);
  const textAlign = textStart(rtl);

  return (
    <View style={{ marginBottom: 8 }}>
      {nodes.map((node, i) => {
        const indent = node.level * 10;
        const isHeader   = node.level === 0;
        const isSubGroup = node.level === 1;
        const isTotal    = node.isTotal === true;
        const bg = isHeader
          ? "#dbeafe"
          : isSubGroup
          ? "#f1f5f9"
          : isTotal
          ? "#e0e7ef"
          : i % 2 === 1
          ? "#f8fafc"
          : "#fff";
        const fontWeight = isHeader || isTotal ? 700 : isSubGroup ? 600 : 400;
        const fontSize   = isHeader ? 9 : isSubGroup ? 8 : 8;

        return (
          <View
            key={i}
            style={[
              base.tableRow,
              { flexDirection: dir, backgroundColor: bg, borderBottomColor: isTotal ? "#94a3b8" : "#e2e8f0" },
            ]}
            wrap={false}
          >
            <Text
              style={[
                base.tdText,
                { flex: 1, fontWeight, fontSize, textAlign },
                rtl ? { paddingRight: indent } : { paddingLeft: indent },
              ]}
            >
              {node.code ? `${node.code}  ` : ""}{node.label}
            </Text>
            <Text style={[base.tdText, { width: 80, textAlign: numAlign, fontWeight, fontSize }]}>
              {isHeader && node.amount === 0 ? "" : formatCurrency(node.amount)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
