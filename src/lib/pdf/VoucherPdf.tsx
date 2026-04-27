import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { registerFonts } from "./pdfFonts";
import { base, BRAND, rowDir, textStart, textEnd } from "./pdfStyles";
import { PdfHeader, PdfFooter, SignatureStrip } from "./PdfComponents";
import { StyleSheet } from "@react-pdf/renderer";

registerFonts();

const S = StyleSheet.create({
  amountBox: {
    alignSelf: "center", marginTop: 16, marginBottom: 16,
    borderWidth: 1.5, borderColor: BRAND, borderRadius: 6,
    paddingHorizontal: 24, paddingVertical: 12, alignItems: "center",
  },
  amountLabel: { fontSize: 8, color: "#64748b", marginBottom: 4 },
  amountValue: { fontSize: 22, fontWeight: 700, color: BRAND },
  detailLabel: { fontSize: 9, color: "#64748b", width: 110 },
  detailValue: { fontSize: 9, fontWeight: 700, flex: 1 },
});

export interface VoucherPdfData {
  companyName: string; companyNameEn?: string; companyAddress?: string; branchName?: string;
  companyPhone?: string; logoUrl?: string;
  voucherNumber: string; voucherDate: string;
  partyName: string;
  accountName: string;
  paymentMethod?: string;
  reference?: string;
  amount: number;
  notes?: string;
  isReceipt: boolean;
  isRTL: boolean;
  labels: {
    title: string; date: string; partyLabel: string; accountLabel: string;
    paymentMethodLabel: string; referenceLabel: string; amountLabel: string;
    preparedBy: string; authorizedBy: string; receivedBy: string; printedBy: string;
    notesLabel: string;
  };
  formatCurrency: (n: number) => string;
}

export function VoucherPdf({ data }: { data: VoucherPdfData }) {
  const { labels, formatCurrency, isRTL } = data;
  const dir = rowDir(isRTL);
  const labelAlign = textStart(isRTL);
  const valueAlign = textEnd(isRTL);

  return (
    <Document title={`${labels.title} - ${data.voucherNumber}`}>
      <Page size="A4" style={base.page}>
        <PdfHeader
          companyName={data.companyName}
          companyNameEn={data.companyNameEn}
          companyAddress={data.companyAddress}
          branchName={data.branchName}
          companyPhone={data.companyPhone}
          logoUrl={data.logoUrl}
          docTitle={labels.title}
          docNumber={data.voucherNumber}
          docDate={data.voucherDate}
          isRTL={isRTL}
        />

        {/* Amount highlight box */}
        <View style={S.amountBox}>
          <Text style={S.amountLabel}>{labels.amountLabel}</Text>
          <Text style={S.amountValue}>{formatCurrency(data.amount / 100)}</Text>
        </View>

        {/* Details */}
        <View style={{ marginBottom: 16 }}>
          {[
            [labels.partyLabel,         data.partyName],
            [labels.accountLabel,       data.accountName],
            [labels.paymentMethodLabel, data.paymentMethod ?? "—"],
            [labels.referenceLabel,     data.reference ?? "—"],
            ...(data.notes ? [[labels.notesLabel, data.notes]] : []),
          ].map(([label, value]) => (
            <View key={label} style={[{ flexDirection: dir, marginBottom: 6 }]}>
              <Text style={[S.detailLabel, { textAlign: labelAlign }]}>{label}:</Text>
              <Text style={[S.detailValue, { textAlign: valueAlign }]}>{value}</Text>
            </View>
          ))}
        </View>

        <SignatureStrip labels={[labels.preparedBy, labels.authorizedBy, labels.receivedBy]} isRTL={isRTL} />
        <PdfFooter printedBy={labels.printedBy} isRTL={isRTL} />
      </Page>
    </Document>
  );
}
