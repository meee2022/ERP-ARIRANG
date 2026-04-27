import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { StyleSheet } from "@react-pdf/renderer";
import { registerFonts } from "./pdfFonts";
import { base } from "./pdfStyles";
import {
  PdfHeader, PdfFooter, InfoGrid,
  LinesTable, TotalsBlock, SignatureStrip, PdfLine,
} from "./PdfComponents";

registerFonts();

const S = StyleSheet.create({
  refBox: {
    backgroundColor: "#fef9ec", borderLeftWidth: 3, borderLeftColor: "#f59e0b",
    paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12, borderRadius: 3,
  },
  refLabel: { fontSize: 8, color: "#92400e", marginBottom: 2 },
  refValue: { fontSize: 9, fontWeight: 700, color: "#78350f" },
  reasonBox: {
    backgroundColor: "#fff7ed", borderLeftWidth: 3, borderLeftColor: "#ea580c",
    paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10, borderRadius: 3,
  },
  reasonLabel: { fontSize: 8, color: "#9a3412", marginBottom: 2 },
  reasonValue: { fontSize: 9, color: "#c2410c" },
});

export interface PurchaseReturnPdfData {
  companyName: string; companyNameEn?: string; companyAddress?: string; branchName?: string;
  companyVatNumber?: string; companyPhone?: string; logoUrl?: string;
  returnNumber: string; returnDate: string; postingStatus: string;
  supplierName: string; supplierAddress?: string;
  originalInvoiceNumber?: string; originalInvoiceDate?: string;
  reason?: string; notes?: string;
  lines: Array<{ itemCode?: string; itemNameAr: string; itemNameEn?: string; quantity: number; unitPrice: number; lineTotal: number }>;
  vatAmount: number; totalAmount: number;
  isRTL: boolean;
  labels: {
    title: string; supplierLabel: string; date: string;
    originalInvoiceRef: string; reason: string; notes: string;
    no: string; code: string; name: string; qty: string; price: string; total: string;
    subtotal: string; vat: string; returnTotal: string;
    preparedBy: string; authorizedBy: string; returnedBy: string; printedBy: string;
  };
  formatCurrency: (n: number) => string;
}

export function PurchaseReturnPdf({ data }: { data: PurchaseReturnPdfData }) {
  const { labels, formatCurrency, isRTL } = data;

  const pdfLines: PdfLine[] = data.lines.map((l, i) => ({
    idx: i + 1, code: l.itemCode,
    name: isRTL ? l.itemNameAr : (l.itemNameEn || l.itemNameAr),
    quantity: l.quantity, unitPrice: l.unitPrice / 100, lineTotal: l.lineTotal / 100,
  }));

  const subtotal = data.lines.reduce((s, l) => s + l.lineTotal, 0) / 100;
  const vat      = data.vatAmount / 100;
  const total    = data.totalAmount / 100;

  return (
    <Document title={`${labels.title} - ${data.returnNumber}`}>
      <Page size="A4" style={base.page}>
        <PdfHeader
          companyName={data.companyName}
          companyNameEn={data.companyNameEn}
          companyAddress={data.companyAddress}
          branchName={data.branchName}
          companyVat={data.companyVatNumber}
          companyPhone={data.companyPhone}
          logoUrl={data.logoUrl}
          docTitle={labels.title}
          docNumber={data.returnNumber}
          docDate={data.returnDate}
          status={data.postingStatus}
          isRTL={isRTL}
        />

        <InfoGrid
          left={[
            { label: labels.supplierLabel, value: data.supplierName },
            ...(data.supplierAddress ? [{ label: "", value: data.supplierAddress }] : []),
          ]}
          right={[{ label: labels.date, value: data.returnDate }]}
          isRTL={isRTL}
        />

        {data.originalInvoiceNumber && (
          <View style={S.refBox}>
            <Text style={S.refLabel}>{labels.originalInvoiceRef}</Text>
            <Text style={S.refValue}>
              # {data.originalInvoiceNumber}
              {data.originalInvoiceDate ? `  —  ${data.originalInvoiceDate}` : ""}
            </Text>
          </View>
        )}

        {(data.reason || data.notes) && (
          <View style={S.reasonBox}>
            {data.reason && (
              <>
                <Text style={S.reasonLabel}>{labels.reason}</Text>
                <Text style={S.reasonValue}>{data.reason}</Text>
              </>
            )}
            {data.notes && (
              <>
                <Text style={[S.reasonLabel, { marginTop: 4 }]}>{labels.notes}</Text>
                <Text style={S.reasonValue}>{data.notes}</Text>
              </>
            )}
          </View>
        )}

        <LinesTable
          lines={pdfLines}
          labels={{ no: labels.no, code: labels.code, name: labels.name, qty: labels.qty, price: labels.price, total: labels.total }}
          formatCurrency={formatCurrency}
          isRTL={isRTL}
        />

        <TotalsBlock
          subtotal={subtotal} vat={vat} total={total}
          labels={{ subtotal: labels.subtotal, vat: labels.vat, total: labels.returnTotal }}
          formatCurrency={formatCurrency}
          isRTL={isRTL}
        />

        <SignatureStrip labels={[labels.preparedBy, labels.authorizedBy, labels.returnedBy]} isRTL={isRTL} />
        <PdfFooter printedBy={labels.printedBy} isRTL={isRTL} />
      </Page>
    </Document>
  );
}
