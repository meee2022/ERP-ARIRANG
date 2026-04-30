import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { registerFonts } from "./pdfFonts";
import { base } from "./pdfStyles";
import { PdfHeader, PdfFooter } from "./PdfComponents";

registerFonts();

export interface EmployeeListPdfData {
  companyName: string;
  companyNameEn?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyVatNumber?: string;
  logoUrl?: string;
  generatedDate: string;
  isRTL: boolean;
  employees: Array<{
    idx: number;
    code: string;
    name: string;
    department: string;
    designation: string;
    hireDate: string;
    type: string;
    status: string;
    basicSalary: number;
  }>;
  totalSalary: number;
  formatCurrency: (n: number) => string;
  labels: {
    title: string;
    no: string;
    code: string;
    name: string;
    department: string;
    designation: string;
    hireDate: string;
    type: string;
    status: string;
    salary: string;
    total: string;
    printedBy: string;
  };
}

const BRAND = "#6b1523";
const COL = { no: 22, code: 48, dept: 72, desig: 72, date: 52, type: 48, status: 40, salary: 60 };

export function EmployeeListPdf({ data }: { data: EmployeeListPdfData }) {
  const { labels, formatCurrency, isRTL } = data;

  return (
    <Document title={`${labels.title} - ${data.generatedDate}`}>
      <Page size="A4" orientation="landscape" style={base.page}>
        <PdfHeader
          companyName={data.companyName}
          companyNameEn={data.companyNameEn}
          companyAddress={data.companyAddress}
          companyPhone={data.companyPhone}
          companyVat={data.companyVatNumber}
          logoUrl={data.logoUrl}
          docTitle={labels.title}
          docDate={data.generatedDate}
          isRTL={isRTL}
        />

        {/* Table header */}
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", backgroundColor: BRAND, borderRadius: 3, marginBottom: 1 }}>
          {[
            { w: COL.no,     label: labels.no },
            { w: COL.code,   label: labels.code },
            { flex: 1,       label: labels.name },
            { w: COL.dept,   label: labels.department },
            { w: COL.desig,  label: labels.designation },
            { w: COL.date,   label: labels.hireDate },
            { w: COL.type,   label: labels.type },
            { w: COL.status, label: labels.status },
            { w: COL.salary, label: labels.salary },
          ].map((col, i) => (
            <Text
              key={i}
              style={[
                base.thText,
                col.flex ? { flex: col.flex } : { width: col.w },
                { color: "#fff", textAlign: i >= 8 ? "right" : "left", fontSize: 7.5 },
              ]}
            >
              {col.label}
            </Text>
          ))}
        </View>

        {/* Rows */}
        {data.employees.map((emp, i) => (
          <View
            key={i}
            wrap={false}
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              backgroundColor: i % 2 === 0 ? "#fff" : "#f8fafc",
              borderBottom: "0.5px solid #e2e8f0",
            }}
          >
            {[
              { w: COL.no,     val: String(emp.idx),     muted: true },
              { w: COL.code,   val: emp.code,             mono: true },
              { flex: 1,       val: emp.name,             bold: true },
              { w: COL.dept,   val: emp.department },
              { w: COL.desig,  val: emp.designation },
              { w: COL.date,   val: emp.hireDate },
              { w: COL.type,   val: emp.type },
              { w: COL.status, val: emp.status },
              { w: COL.salary, val: formatCurrency(emp.basicSalary), right: true, bold: true },
            ].map((col: any, j) => (
              <Text
                key={j}
                style={[
                  base.tdText,
                  col.flex ? { flex: col.flex } : { width: col.w },
                  col.right  ? { textAlign: "right" } : {},
                  col.bold   ? { fontWeight: 700 } : {},
                  col.muted  ? { color: "#9ca3af" } : {},
                  col.mono   ? { fontFamily: "Helvetica", fontSize: 7.5 } : {},
                  { fontSize: 7.5 },
                ]}
              >
                {col.val}
              </Text>
            ))}
          </View>
        ))}

        {/* Total row */}
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", backgroundColor: "#f1f5f9", borderTop: `2px solid ${BRAND}`, marginTop: 2 }}>
          <Text style={[base.tdText, { flex: 1, fontWeight: 700, color: "#374151", fontSize: 8 }]}>
            {labels.total} ({data.employees.length})
          </Text>
          <Text style={[base.tdText, { width: COL.salary, textAlign: "right", fontWeight: 700, color: BRAND, fontSize: 8 }]}>
            {formatCurrency(data.totalSalary)}
          </Text>
        </View>

        <PdfFooter printedBy={labels.printedBy} isRTL={isRTL} />
      </Page>
    </Document>
  );
}
