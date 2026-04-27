import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { registerFonts } from "./pdfFonts";
import { base, rowDir, textStart, textEnd } from "./pdfStyles";
import { PdfHeader, PdfFooter } from "./PdfComponents";
import { StyleSheet } from "@react-pdf/renderer";

registerFonts();

const S = StyleSheet.create({
  tableHeader: {
    borderBottomWidth: 1.5, borderBottomColor: "#cbd5e1",
    backgroundColor: "#f1f5f9",
    paddingVertical: 5, paddingHorizontal: 4,
  },
  tableRow: {
    borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0",
    paddingVertical: 5, paddingHorizontal: 4,
  },
  tableRowAlt: { backgroundColor: "#f8fafc" },
  th: { fontSize: 8, fontWeight: 700, color: "#475569" },
  td: { fontSize: 9, color: "#1e293b" },
  summaryRow: {
    paddingVertical: 4, borderTopWidth: 0.5, borderTopColor: "#e2e8f0",
  },
  summaryFinal: {
    paddingVertical: 5, borderTopWidth: 1.5, borderTopColor: "#1e293b", marginTop: 2,
  },
  openingBox: {
    backgroundColor: "#f8fafc", borderRadius: 4, padding: 8, marginBottom: 10,
  },
});

export interface StatementLine {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface StatementPdfData {
  companyName: string; companyNameEn?: string; companyAddress?: string; branchName?: string;
  companyPhone?: string; logoUrl?: string;
  partyName: string;
  fromDate: string; toDate: string;
  openingBalance: number;
  lines: StatementLine[];
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  isRTL: boolean;
  labels: {
    title: string; partyLabel: string; period: string;
    date: string; description: string; debit: string; credit: string; balance: string;
    openingBalance: string; closingBalance: string;
    totalDebit: string; totalCredit: string; printedBy: string;
  };
  formatCurrency: (n: number) => string;
}

export function StatementPdf({ data }: { data: StatementPdfData }) {
  const { labels, formatCurrency, isRTL } = data;
  const dir   = rowDir(isRTL);
  const start = textStart(isRTL);
  const end   = textEnd(isRTL);

  return (
    <Document title={`${labels.title} - ${data.partyName}`}>
      <Page size="A4" style={base.page}>
        <PdfHeader
          companyName={data.companyName}
          companyNameEn={data.companyNameEn}
          companyAddress={data.companyAddress}
          branchName={data.branchName}
          companyPhone={data.companyPhone}
          logoUrl={data.logoUrl}
          docTitle={labels.title}
          docNumber={data.partyName}
          docDate={`${data.fromDate} → ${data.toDate}`}
          isRTL={isRTL}
        />

        {/* Opening balance */}
        <View style={[S.openingBox, { flexDirection: dir }]}>
          <Text style={{ fontSize: 9, color: "#64748b", textAlign: start }}>{labels.openingBalance}</Text>
          <Text style={{ fontSize: 10, fontWeight: 700, textAlign: end }}>{formatCurrency(data.openingBalance / 100)}</Text>
        </View>

        {/* Transactions table */}
        <View style={[S.tableHeader, { flexDirection: dir }]}>
          <Text style={[S.th, { width: 60,             textAlign: start }]}>{labels.date}</Text>
          <Text style={[S.th, { flex: 1,               textAlign: start }]}>{labels.description}</Text>
          <Text style={[S.th, { width: 60,             textAlign: end   }]}>{labels.debit}</Text>
          <Text style={[S.th, { width: 60,             textAlign: end   }]}>{labels.credit}</Text>
          <Text style={[S.th, { width: 70,             textAlign: end   }]}>{labels.balance}</Text>
        </View>
        {data.lines.map((line, i) => (
          <View key={i} style={[S.tableRow, { flexDirection: dir }, i % 2 === 1 ? S.tableRowAlt : {}]} wrap={false}>
            <Text style={[base.tdText, { width: 60,  fontSize: 8,   textAlign: start }]}>{line.date}</Text>
            <Text style={[base.tdText, { flex: 1,                   textAlign: start }]}>{line.description}</Text>
            <Text style={[base.tdText, { width: 60,                 textAlign: end   }]}>{line.debit  > 0 ? formatCurrency(line.debit  / 100) : "—"}</Text>
            <Text style={[base.tdText, { width: 60,                 textAlign: end   }]}>{line.credit > 0 ? formatCurrency(line.credit / 100) : "—"}</Text>
            <Text style={[base.tdText, { width: 70, fontWeight: 700, textAlign: end  }]}>{formatCurrency(line.balance / 100)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={{ marginTop: 8 }}>
          {[
            [labels.totalDebit,    formatCurrency(data.totalDebit    / 100)],
            [labels.totalCredit,   formatCurrency(data.totalCredit   / 100)],
          ].map(([label, value]) => (
            <View key={label} style={[S.summaryRow, { flexDirection: dir }]}>
              <Text style={{ fontSize: 9, color: "#64748b", textAlign: start }}>{label}</Text>
              <Text style={{ fontSize: 9, fontWeight: 700, textAlign: end }}>{value}</Text>
            </View>
          ))}
          <View style={[S.summaryFinal, { flexDirection: dir }]}>
            <Text style={{ fontSize: 10, fontWeight: 700, textAlign: start }}>{labels.closingBalance}</Text>
            <Text style={{ fontSize: 10, fontWeight: 700, textAlign: end }}>{formatCurrency(data.closingBalance / 100)}</Text>
          </View>
        </View>

        <PdfFooter printedBy={labels.printedBy} isRTL={isRTL} />
      </Page>
    </Document>
  );
}
