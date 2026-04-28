import React from "react";
import { Document, Page } from "@react-pdf/renderer";
import { registerFonts } from "./pdfFonts";
import { base } from "./pdfStyles";
import {
  PdfHeader, PdfFooter, InfoGrid,
  LinesTable, TotalsBlock, SignatureStrip, PdfLine,
} from "./PdfComponents";

registerFonts();

export interface PurchaseInvoicePdfData {
  companyName: string; companyNameEn?: string; companyAddress?: string; branchName?: string;
  companyVatNumber?: string; companyPhone?: string; logoUrl?: string;
  invoiceNumber: string; invoiceDate: string; postingStatus: string;
  supplierName: string; supplierAddress?: string; supplierVatNumber?: string;
  lines: Array<{ itemCode?: string; itemNameAr: string; itemNameEn?: string; quantity: number; unitPrice: number; lineTotal: number }>;
  vatAmount: number; totalAmount: number;
  isRTL: boolean;
  labels: {
    title: string; supplierLabel: string; date: string; vatNumber: string;
    no: string; code: string; name: string; qty: string; price: string; total: string;
    subtotal: string; vat: string; invoiceTotal: string;
    preparedBy: string; authorizedBy: string; receivedBy: string; printedBy: string;
  };
  formatCurrency: (n: number) => string;
}

export function PurchaseInvoicePdf({ data }: { data: PurchaseInvoicePdfData }) {
  const { labels, formatCurrency, isRTL } = data;

  const pdfLines: PdfLine[] = data.lines.map((l, i) => ({
    idx: i + 1,
    code: l.itemCode,
    name: isRTL ? l.itemNameAr : (l.itemNameEn || l.itemNameAr),
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    lineTotal: l.lineTotal,
  }));

  const subtotal = data.lines.reduce((s, l) => s + l.lineTotal, 0);
  const vat      = data.vatAmount;
  const total    = data.totalAmount;

  return (
    <Document title={`${labels.title} - ${data.invoiceNumber}`}>
      <Page size="A4" style={base.page} >
        <PdfHeader
          companyName={data.companyName}
          companyNameEn={data.companyNameEn}
          companyAddress={data.companyAddress}
          branchName={data.branchName}
          companyVat={data.companyVatNumber}
          companyPhone={data.companyPhone}
          logoUrl={data.logoUrl}
          docTitle={labels.title}
          docNumber={data.invoiceNumber}
          docDate={data.invoiceDate}
          status={data.postingStatus}
          isRTL={isRTL}
        />

        <InfoGrid
          left={[
            { label: labels.supplierLabel, value: data.supplierName },
            ...(data.supplierAddress ? [{ label: "", value: data.supplierAddress }] : []),
            ...(data.supplierVatNumber ? [{ label: labels.vatNumber, value: data.supplierVatNumber }] : []),
          ]}
          right={[{ label: labels.date, value: data.invoiceDate }]}
          isRTL={isRTL}
        />

        <LinesTable
          lines={pdfLines}
          labels={{ no: labels.no, code: labels.code, name: labels.name, qty: labels.qty, price: labels.price, total: labels.total }}
          formatCurrency={formatCurrency}
          isRTL={isRTL}
        />

        <TotalsBlock
          subtotal={subtotal} vat={vat} total={total}
          labels={{ subtotal: labels.subtotal, vat: labels.vat, total: labels.invoiceTotal }}
          formatCurrency={formatCurrency}
          isRTL={isRTL}
        />

        <SignatureStrip labels={[labels.preparedBy, labels.authorizedBy, labels.receivedBy]} isRTL={isRTL} />
        <PdfFooter printedBy={labels.printedBy} isRTL={isRTL} />
      </Page>
    </Document>
  );
}
