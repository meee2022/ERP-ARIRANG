import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { registerFonts } from "./pdfFonts";
import { base } from "./pdfStyles";
import { PdfHeader, PdfFooter, InfoGrid, LinesTable, SignatureStrip, PdfLine } from "./PdfComponents";

registerFonts();

export interface LpoPdfData {
  companyName: string;
  companyNameEn?: string;
  companyAddress?: string;
  branchName?: string;
  companyPhone?: string;
  logoUrl?: string;

  poNumber: string;
  orderDate: string;
  expectedDate?: string;
  documentStatus: string;
  supplierName: string;
  supplierPhone?: string;
  supplierEmail?: string;
  warehouseName: string;
  notes?: string;

  lines: Array<{
    itemCode?: string;
    itemNameAr: string;
    itemNameEn?: string;
    quantity: number;
    receivedQty: number;
    remainingQty: number;
    uomName: string;
    unitPrice: number;
    vatRate: number;
    lineTotal: number;
  }>;

  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  isRTL: boolean;

  labels: {
    title: string;
    lpoNo: string;
    date: string;
    expected: string;
    supplier: string;
    warehouse: string;
    no: string; code: string; name: string;
    ordered: string; received: string; remaining: string;
    uom: string; unitPrice: string; vat: string; total: string;
    subtotal: string; vatLabel: string; grandTotal: string;
    preparedBy: string; authorizedBy: string; supplierAck: string;
    printedBy: string; notes: string;
  };
  formatCurrency: (n: number) => string;
}

export function LpoPdf({ data }: { data: LpoPdfData }) {
  const { labels, formatCurrency, isRTL } = data;

  const pdfLines: PdfLine[] = data.lines.map((l, i) => ({
    idx: i + 1,
    code: l.itemCode,
    name: isRTL ? l.itemNameAr : (l.itemNameEn || l.itemNameAr),
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    lineTotal: l.lineTotal,
  }));

  return (
    <Document title={`${labels.title} - ${data.poNumber}`}>
      <Page size="A4" style={base.page}>
        <PdfHeader
          companyName={data.companyName}
          companyNameEn={data.companyNameEn}
          companyAddress={data.companyAddress}
          branchName={data.branchName}
          companyPhone={data.companyPhone}
          logoUrl={data.logoUrl}
          docTitle={labels.title}
          docNumber={data.poNumber}
          docDate={data.orderDate}
          status={data.documentStatus}
          isRTL={isRTL}
        />

        <InfoGrid
          left={[
            { label: labels.supplier,  value: data.supplierName },
            ...(data.supplierPhone ? [{ label: "Tel", value: data.supplierPhone }] : []),
            ...(data.supplierEmail ? [{ label: "Email", value: data.supplierEmail }] : []),
            { label: labels.warehouse, value: data.warehouseName },
          ]}
          right={[
            { label: labels.date, value: data.orderDate },
            ...(data.expectedDate ? [{ label: labels.expected, value: data.expectedDate }] : []),
          ]}
          isRTL={isRTL}
        />

        <LinesTable
          lines={pdfLines}
          labels={{
            no: labels.no, code: labels.code, name: labels.name,
            qty: labels.ordered, price: labels.unitPrice, total: labels.total,
          }}
          formatCurrency={formatCurrency}
          isRTL={isRTL}
        />

        {/* Totals block */}
        <View style={[base.totalsBlock]}>
          <View style={base.totalsRow}>
            <Text style={base.totalsLabel}>{labels.subtotal}</Text>
            <Text style={base.totalsValue}>{formatCurrency(data.subtotal)}</Text>
          </View>
          <View style={base.totalsRow}>
            <Text style={base.totalsLabel}>{labels.vatLabel}</Text>
            <Text style={base.totalsValue}>{formatCurrency(data.vatAmount)}</Text>
          </View>
          <View style={base.totalsFinal}>
            <Text style={base.totalsFinalLabel}>{labels.grandTotal}</Text>
            <Text style={base.totalsFinalValue}>{formatCurrency(data.totalAmount)}</Text>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={{ marginTop: 12, padding: 8, backgroundColor: "#fffbeb", borderRadius: 4 }}>
            <Text style={{ fontSize: 8, fontWeight: 700, color: "#92400e", marginBottom: 3 }}>{labels.notes}</Text>
            <Text style={{ fontSize: 9, color: "#78350f" }}>{data.notes}</Text>
          </View>
        )}

        <SignatureStrip labels={[labels.preparedBy, labels.authorizedBy, labels.supplierAck]} isRTL={isRTL} />
        <PdfFooter printedBy={labels.printedBy} isRTL={isRTL} />
      </Page>
    </Document>
  );
}
