import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { registerFonts } from "./pdfFonts";
import { base } from "./pdfStyles";
import { PdfHeader, PdfFooter, InfoGrid, LinesTable, SignatureStrip, PdfLine } from "./PdfComponents";

registerFonts();

export interface GrnPdfData {
  companyName: string; companyNameEn?: string; companyAddress?: string; branchName?: string;
  companyPhone?: string; logoUrl?: string;
  grnNumber: string; receiptDate: string; documentStatus: string;
  supplierName: string; warehouseName: string;
  lines: Array<{ itemCode?: string; itemNameAr: string; itemNameEn?: string; quantity: number; unitCost: number; totalCost: number }>;
  isRTL: boolean;
  labels: {
    title: string; supplierLabel: string; warehouseLabel: string; date: string;
    no: string; code: string; name: string; qty: string; unitCost: string; total: string;
    totalLabel: string; preparedBy: string; authorizedBy: string; receivedBy: string; printedBy: string;
  };
  formatCurrency: (n: number) => string;
}

export function GrnPdf({ data }: { data: GrnPdfData }) {
  const { labels, formatCurrency, isRTL } = data;

  const pdfLines: PdfLine[] = data.lines.map((l, i) => ({
    idx: i + 1, code: l.itemCode,
    name: isRTL ? l.itemNameAr : (l.itemNameEn || l.itemNameAr),
    quantity: l.quantity, unitPrice: l.unitCost / 100, lineTotal: l.totalCost / 100,
  }));

  const totalValue = data.lines.reduce((s, l) => s + l.totalCost, 0) / 100;

  return (
    <Document title={`${labels.title} - ${data.grnNumber}`}>
      <Page size="A4" style={base.page} >
        <PdfHeader
          companyName={data.companyName}
          companyNameEn={data.companyNameEn}
          companyAddress={data.companyAddress}
          branchName={data.branchName}
          companyPhone={data.companyPhone}
          logoUrl={data.logoUrl}
          docTitle={labels.title}
          docNumber={data.grnNumber}
          docDate={data.receiptDate}
          status={data.documentStatus}
          isRTL={isRTL}
        />

        <InfoGrid
          left={[
            { label: labels.supplierLabel,  value: data.supplierName },
            { label: labels.warehouseLabel, value: data.warehouseName },
          ]}
          right={[{ label: labels.date, value: data.receiptDate }]}
          isRTL={isRTL}
        />

        <LinesTable
          lines={pdfLines}
          labels={{ no: labels.no, code: labels.code, name: labels.name, qty: labels.qty, price: labels.unitCost, total: labels.total }}
          formatCurrency={formatCurrency}
          isRTL={isRTL}
        />

        {/* Simple total line */}
        <View style={[base.totalsBlock]}>
          <View style={base.totalsFinal}>
            <Text style={base.totalsFinalLabel}>{labels.totalLabel}</Text>
            <Text style={base.totalsFinalValue}>{formatCurrency(totalValue)}</Text>
          </View>
        </View>

        <SignatureStrip labels={[labels.preparedBy, labels.authorizedBy, labels.receivedBy]} isRTL={isRTL} />
        <PdfFooter printedBy={labels.printedBy} isRTL={isRTL} />
      </Page>
    </Document>
  );
}
