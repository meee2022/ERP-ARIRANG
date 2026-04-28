import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { StyleSheet } from "@react-pdf/renderer";
import { registerFonts } from "./pdfFonts";
import { base, BRAND, rowDir, textStart, textEnd } from "./pdfStyles";
import { PdfHeader, PdfFooter, TreeNode, TreeSection } from "./PdfComponents";

registerFonts();

const S = StyleSheet.create({
  sectionTitle: {
    fontSize: 10, fontWeight: 700, color: "#1e3a8a",
    backgroundColor: "#dbeafe",
    paddingHorizontal: 8, paddingVertical: 5,
    marginBottom: 2, marginTop: 10,
    borderRadius: 3,
  },
  netBox: {
    marginTop: 14,
    borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1.5,
  },
  netLabel: { fontSize: 11, fontWeight: 700 },
  netValue: { fontSize: 14, fontWeight: 700, marginTop: 2 },
  kpiRow: {
    flexDirection: "row", gap: 8, marginBottom: 14,
  },
  kpiBox: {
    flex: 1, borderRadius: 5, paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, alignItems: "center",
  },
  kpiLabel: { fontSize: 8, color: "#64748b", marginBottom: 2 },
  kpiValue: { fontSize: 11, fontWeight: 700 },
});

export interface IncomeAccountRow {
  accountId: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  accountSubType?: string;
  balance: number;
}

export interface IncomeStatementPdfData {
  companyName: string; companyNameEn?: string; companyAddress?: string; branchName?: string;
  companyPhone?: string; logoUrl?: string;
  startDate: string; endDate: string;
  revenueAccounts: IncomeAccountRow[];
  expenseAccounts: IncomeAccountRow[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  isRTL: boolean;
  labels: {
    title: string; period: string;
    revenue: string; totalRevenue: string;
    expenses: string; totalExpenses: string;
    netIncome: string; netLoss: string;
    printedBy: string;
  };
  formatCurrency: (n: number) => string;
}

export function IncomeStatementPdf({ data }: { data: IncomeStatementPdfData }) {
  const { labels, formatCurrency, isRTL } = data;
  const dir   = rowDir(isRTL);
  const start = textStart(isRTL);
  const end   = textEnd(isRTL);
  const isProfit = data.netIncome >= 0;

  // Build tree nodes for Revenue
  const revenueNodes: TreeNode[] = [
    { label: labels.revenue, amount: 0, level: 0 },
    ...data.revenueAccounts.map((a) => ({
      code: a.code,
      label: isRTL ? a.nameAr : (a.nameEn || a.nameAr),
      amount: a.balance,
      level: 2,
    })),
    { label: labels.totalRevenue, amount: data.totalRevenue, level: 0, isTotal: true },
  ];

  // Build tree nodes for Expenses
  const expenseNodes: TreeNode[] = [
    { label: labels.expenses, amount: 0, level: 0 },
    ...data.expenseAccounts.map((a) => ({
      code: a.code,
      label: isRTL ? a.nameAr : (a.nameEn || a.nameAr),
      amount: a.balance,
      level: 2,
    })),
    { label: labels.totalExpenses, amount: data.totalExpenses, level: 0, isTotal: true },
  ];

  return (
    <Document title={`${labels.title} - ${data.startDate} → ${data.endDate}`}>
      <Page size="A4" style={base.page}>
        <PdfHeader
          companyName={data.companyName}
          companyNameEn={data.companyNameEn}
          companyAddress={data.companyAddress}
          branchName={data.branchName}
          companyPhone={data.companyPhone}
          logoUrl={data.logoUrl}
          docTitle={`${labels.title}  —  ${data.startDate} → ${data.endDate}`}
          isRTL={isRTL}
        />

        {/* KPI summary row */}
        <View style={[S.kpiRow, { flexDirection: dir }]}>
          <View style={[S.kpiBox, { backgroundColor: "#f0fdf4", borderColor: "#86efac" }]}>
            <Text style={S.kpiLabel}>{labels.totalRevenue}</Text>
            <Text style={[S.kpiValue, { color: "#166534" }]}>{formatCurrency(data.totalRevenue)}</Text>
          </View>
          <View style={[S.kpiBox, { backgroundColor: "#fff1f2", borderColor: "#fca5a5" }]}>
            <Text style={S.kpiLabel}>{labels.totalExpenses}</Text>
            <Text style={[S.kpiValue, { color: "#991b1b" }]}>{formatCurrency(data.totalExpenses)}</Text>
          </View>
          <View style={[S.kpiBox, { backgroundColor: isProfit ? "#eff6ff" : "#fff7ed", borderColor: isProfit ? "#93c5fd" : "#fdba74" }]}>
            <Text style={S.kpiLabel}>{isProfit ? labels.netIncome : labels.netLoss}</Text>
            <Text style={[S.kpiValue, { color: isProfit ? "#1d4ed8" : "#c2410c" }]}>{formatCurrency(Math.abs(data.netIncome))}</Text>
          </View>
        </View>

        {/* Revenue section */}
        <TreeSection nodes={revenueNodes} formatCurrency={formatCurrency} isRTL={isRTL} />

        {/* Expenses section */}
        <TreeSection nodes={expenseNodes} formatCurrency={formatCurrency} isRTL={isRTL} />

        {/* Net Income / Loss box */}
        <View style={[
          S.netBox,
          { flexDirection: dir, justifyContent: "space-between", alignItems: "center" },
          { backgroundColor: isProfit ? "#eff6ff" : "#fff7ed", borderColor: isProfit ? "#93c5fd" : "#fdba74" },
        ]}>
          <Text style={[S.netLabel, { color: isProfit ? "#1e3a8a" : "#9a3412", textAlign: start }]}>
            {isProfit ? labels.netIncome : labels.netLoss}
          </Text>
          <Text style={[S.netValue, { color: isProfit ? BRAND : "#c2410c", textAlign: end }]}>
            {isProfit ? "" : "("}{formatCurrency(Math.abs(data.netIncome))}{isProfit ? "" : ")"}
          </Text>
        </View>

        <PdfFooter printedBy={labels.printedBy} isRTL={isRTL} />
      </Page>
    </Document>
  );
}
