import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { StyleSheet } from "@react-pdf/renderer";
import { registerFonts } from "./pdfFonts";
import { base, BRAND, rowDir, textStart, textEnd } from "./pdfStyles";
import { PdfHeader, PdfFooter } from "./PdfComponents";

registerFonts();

const S = StyleSheet.create({
  kpiRow: {
    flexDirection: "row", justifyContent: "space-between",
    marginBottom: 16, gap: 8,
  },
  kpiBox: {
    flex: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, alignItems: "center",
  },
  kpiLabel: { fontSize: 8, color: "#64748b", marginBottom: 3 },
  kpiValue: { fontSize: 11, fontWeight: 700 },
  th: { fontSize: 8, fontWeight: 700, color: "#475569" },
  td: { fontSize: 9, color: "#1e293b" },
  tableHeader: {
    flexDirection: "row", backgroundColor: "#f1f5f9",
    borderBottomWidth: 1.5, borderBottomColor: "#cbd5e1",
    paddingVertical: 5, paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0",
    paddingVertical: 5, paddingHorizontal: 4,
  },
  tableRowAlt: { backgroundColor: "#f8fafc" },
  totalRow: {
    flexDirection: "row", borderTopWidth: 1.5, borderTopColor: "#1e293b",
    paddingVertical: 5, paddingHorizontal: 4, marginTop: 2,
  },
  accountBadge: {
    backgroundColor: "#eff6ff", borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 4, marginBottom: 12, alignSelf: "flex-start",
  },
  accountCode: { fontSize: 8, color: "#1d4ed8", fontFamily: "Helvetica" },
  accountName: { fontSize: 10, fontWeight: 700, color: "#1e3a8a", marginTop: 2 },
});

export interface CashMovementRow {
  date: string;
  debit: number;
  credit: number;
  net: number;
  balance: number;
}

export interface CashMovementPdfData {
  companyName: string; companyNameEn?: string; companyAddress?: string; branchName?: string;
  companyPhone?: string; logoUrl?: string;
  accountCode: string; accountName: string;
  fromDate: string; toDate: string;
  openingBalance: number;
  rows: CashMovementRow[];
  totalDebit: number; totalCredit: number; closingBalance: number;
  isRTL: boolean;
  labels: {
    title: string; period: string; accountLabel: string;
    date: string; debit: string; credit: string; net: string; balance: string;
    openingBalance: string; totalDebit: string; totalCredit: string; closingBalance: string;
    printedBy: string;
  };
  formatCurrency: (n: number) => string;
}

export function CashMovementPdf({ data }: { data: CashMovementPdfData }) {
  const { labels, formatCurrency } = data;

  const kpis = [
    { label: labels.openingBalance, value: data.openingBalance, bg: "#f8fafc", border: "#cbd5e1", fg: "#1e293b" },
    { label: labels.totalDebit,     value: data.totalDebit,     bg: "#f0fdf4", border: "#86efac", fg: "#166534" },
    { label: labels.totalCredit,    value: data.totalCredit,    bg: "#fff1f2", border: "#fca5a5", fg: "#991b1b" },
    { label: labels.closingBalance, value: data.closingBalance, bg: "#eff6ff", border: "#93c5fd", fg: "#1d4ed8" },
  ];

  return (
    <Document title={`${labels.title} - ${data.accountName}`}>
      <Page size="A4" style={base.page}>
        <PdfHeader
          companyName={data.companyName}
          companyNameEn={data.companyNameEn}
          companyAddress={data.companyAddress}
          branchName={data.branchName}
          companyPhone={data.companyPhone}
          logoUrl={data.logoUrl}
          docTitle={`${labels.title}  —  ${data.fromDate} → ${data.toDate}`}
        />

        {/* Account badge */}
        <View style={S.accountBadge}>
          {data.accountCode ? <Text style={S.accountCode}>{data.accountCode}</Text> : null}
          <Text style={S.accountName}>{data.accountName}</Text>
        </View>

        {/* KPI row */}
        <View style={S.kpiRow}>
          {kpis.map((k) => (
            <View key={k.label} style={[S.kpiBox, { backgroundColor: k.bg, borderColor: k.border }]}>
              <Text style={S.kpiLabel}>{k.label}</Text>
              <Text style={[S.kpiValue, { color: k.fg }]}>{formatCurrency(k.value / 100)}</Text>
            </View>
          ))}
        </View>

        {/* Table */}
        <View style={S.tableHeader}>
          <Text style={[S.th, { width: 64 }]}>{labels.date}</Text>
          <Text style={[S.th, { flex: 1, textAlign: "right" }]}>{labels.debit}</Text>
          <Text style={[S.th, { flex: 1, textAlign: "right" }]}>{labels.credit}</Text>
          <Text style={[S.th, { flex: 1, textAlign: "right" }]}>{labels.net}</Text>
          <Text style={[S.th, { flex: 1, textAlign: "right" }]}>{labels.balance}</Text>
        </View>

        {data.rows.map((row, i) => (
          <View key={row.date + i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]} wrap={false}>
            <Text style={[S.td, { width: 64, fontSize: 8, fontFamily: "Helvetica" }]}>{row.date}</Text>
            <Text style={[S.td, { flex: 1, textAlign: "right", color: "#166534" }]}>{row.debit > 0 ? formatCurrency(row.debit / 100) : "—"}</Text>
            <Text style={[S.td, { flex: 1, textAlign: "right", color: "#991b1b" }]}>{row.credit > 0 ? formatCurrency(row.credit / 100) : "—"}</Text>
            <Text style={[S.td, { flex: 1, textAlign: "right", color: row.net >= 0 ? "#166534" : "#991b1b" }]}>
              {row.net >= 0 ? "+" : ""}{formatCurrency(row.net / 100)}
            </Text>
            <Text style={[S.td, { flex: 1, textAlign: "right", fontWeight: 700 }]}>{formatCurrency(row.balance / 100)}</Text>
          </View>
        ))}

        {/* Totals row */}
        <View style={S.totalRow} wrap={false}>
          <Text style={[S.th, { width: 64 }]}>{labels.closingBalance}</Text>
          <Text style={[S.th, { flex: 1, textAlign: "right", color: "#166534" }]}>{formatCurrency(data.totalDebit / 100)}</Text>
          <Text style={[S.th, { flex: 1, textAlign: "right", color: "#991b1b" }]}>{formatCurrency(data.totalCredit / 100)}</Text>
          <Text style={[S.th, { flex: 1, textAlign: "right" }]}>—</Text>
          <Text style={[S.th, { flex: 1, textAlign: "right", color: BRAND }]}>{formatCurrency(data.closingBalance / 100)}</Text>
        </View>

        <PdfFooter printedBy={labels.printedBy} />
      </Page>
    </Document>
  );
}
