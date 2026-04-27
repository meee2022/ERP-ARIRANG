import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { StyleSheet } from "@react-pdf/renderer";
import { registerFonts } from "./pdfFonts";
import { base, BRAND, INK, rowDir, textStart, textEnd } from "./pdfStyles";
import { PdfHeader, PdfFooter, TreeNode, TreeSection } from "./PdfComponents";

registerFonts();

// ── Sub-type label maps ───────────────────────────────────────────────────────
const SUB_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  current_asset:       { ar: "أصول متداولة",        en: "Current Assets" },
  cash:                { ar: "النقدية",              en: "Cash" },
  receivable:          { ar: "الذمم المدينة",        en: "Receivables" },
  inventory:           { ar: "المخزون",              en: "Inventory" },
  prepaid:             { ar: "مدفوعات مقدمة",       en: "Prepaid" },
  fixed_asset:         { ar: "الأصول الثابتة",       en: "Fixed Assets" },
  other_asset:         { ar: "أصول أخرى",            en: "Other Assets" },
  current_liability:   { ar: "التزامات متداولة",      en: "Current Liabilities" },
  payable:             { ar: "الذمم الدائنة",         en: "Payables" },
  tax_payable:         { ar: "ضرائب مستحقة",         en: "Tax Payable" },
  accrual:             { ar: "مستحقات",              en: "Accruals" },
  long_term_liability: { ar: "التزامات طويلة الأجل", en: "Long-term Liabilities" },
  capital:             { ar: "رأس المال",             en: "Capital" },
  retained_earnings:   { ar: "أرباح محتجزة",         en: "Retained Earnings" },
  other_equity:        { ar: "حقوق ملكية أخرى",     en: "Other Equity" },
  other:               { ar: "أخرى",                  en: "Other" },
};

const ASSET_ORDER     = ["current_asset","cash","receivable","inventory","prepaid","fixed_asset","other_asset"];
const LIABILITY_ORDER = ["current_liability","payable","tax_payable","accrual","long_term_liability"];
const EQUITY_ORDER    = ["capital","retained_earnings","other_equity"];

function subTypeLabel(st: string, isRTL: boolean): string {
  const l = SUB_TYPE_LABELS[st];
  return l ? (isRTL ? l.ar : l.en) : st;
}

function groupBySubType(accounts: BSAccountRow[], order: string[]) {
  const groups: Record<string, BSAccountRow[]> = {};
  for (const acc of accounts) {
    const st = acc.accountSubType || "other";
    if (!groups[st]) groups[st] = [];
    groups[st].push(acc);
  }
  const sortedKeys = [
    ...order.filter((k) => groups[k]),
    ...Object.keys(groups).filter((k) => !order.includes(k)),
  ];
  return sortedKeys.map((key) => ({ subType: key, accounts: groups[key] }));
}

/** Build TreeNode[] for a balance sheet section */
function buildNodes(
  sectionLabel: string,
  groups: { subType: string; accounts: BSAccountRow[] }[],
  total: number,
  totalLabel: string,
  isRTL: boolean,
  extra?: TreeNode[],   // e.g. retained earnings injection
): TreeNode[] {
  const nodes: TreeNode[] = [
    { label: sectionLabel, amount: 0, level: 0 },
  ];
  for (const { subType, accounts } of groups) {
    nodes.push({ label: subTypeLabel(subType, isRTL), amount: 0, level: 1 });
    for (const acc of accounts) {
      nodes.push({
        code: acc.code,
        label: isRTL ? acc.nameAr : (acc.nameEn || acc.nameAr),
        amount: acc.balance / 100,
        level: 2,
      });
    }
  }
  if (extra) nodes.push(...extra);
  nodes.push({ label: totalLabel, amount: total / 100, level: 0, isTotal: true });
  return nodes;
}

// ── Local StyleSheet ──────────────────────────────────────────────────────────
const S = StyleSheet.create({
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  kpiBox: {
    flex: 1, borderRadius: 5, paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, alignItems: "center",
  },
  kpiLabel: { fontSize: 8, color: "#64748b", marginBottom: 2 },
  kpiValue: { fontSize: 11, fontWeight: 700 },
  balanceCheck: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 5, paddingHorizontal: 10, paddingVertical: 6,
    marginBottom: 12,
  },
  balanceCheckText: { fontSize: 9, fontWeight: 700 },
  grandTotal: {
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 8, paddingVertical: 8,
    borderRadius: 4, marginTop: 8,
    backgroundColor: "#1e3a8a",
  },
  grandTotalLabel: { fontSize: 11, fontWeight: 700, color: "#fff" },
  grandTotalValue: { fontSize: 11, fontWeight: 700, color: "#fff" },
});

// ── Types ─────────────────────────────────────────────────────────────────────
export interface BSAccountRow {
  accountId: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  accountSubType?: string;
  balance: number; // in smallest unit (halala)
}

export interface BalanceSheetPdfData {
  companyName: string; companyNameEn?: string; companyAddress?: string; branchName?: string;
  companyPhone?: string; logoUrl?: string;
  asOfDate: string;
  assets:      { accounts: BSAccountRow[]; total: number };
  liabilities: { accounts: BSAccountRow[]; total: number };
  equity:      { accounts: BSAccountRow[]; retainedEarnings: number; total: number };
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  isRTL: boolean;
  labels: {
    title: string; asOfDate: string;
    assets: string;      totalAssets: string;
    liabilities: string; totalLiabilities: string;
    equity: string;      totalEquity: string;
    currentPeriodIncome: string;
    totalLiabilitiesAndEquity: string;
    balanced: string; unbalanced: string;
    printedBy: string;
  };
  formatCurrency: (n: number) => string;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function BalanceSheetPdf({ data }: { data: BalanceSheetPdfData }) {
  const { labels, formatCurrency, isRTL } = data;
  const dir   = rowDir(isRTL);
  const start = textStart(isRTL);
  const end   = textEnd(isRTL);

  // Filter zero-balance accounts
  const assetAccounts     = data.assets.accounts.filter((a) => a.balance !== 0);
  const liabilityAccounts = data.liabilities.accounts.filter((a) => a.balance !== 0);
  const equityAccounts    = data.equity.accounts.filter((a) => a.balance !== 0);

  const assetGroups     = groupBySubType(assetAccounts,     ASSET_ORDER);
  const liabilityGroups = groupBySubType(liabilityAccounts, LIABILITY_ORDER);
  const equityGroups    = groupBySubType(equityAccounts,    EQUITY_ORDER);

  // Retained earnings injected as extra node in equity section
  const retainedNode: TreeNode[] = data.equity.retainedEarnings !== 0
    ? [{
        label: labels.currentPeriodIncome,
        amount: data.equity.retainedEarnings / 100,
        level: 2,
      }]
    : [];

  const assetNodes     = buildNodes(labels.assets,      assetGroups,     data.assets.total,      labels.totalAssets,      isRTL);
  const liabilityNodes = buildNodes(labels.liabilities, liabilityGroups, data.liabilities.total, labels.totalLiabilities, isRTL);
  const equityNodes    = buildNodes(labels.equity,      equityGroups,    data.equity.total,       labels.totalEquity,      isRTL, retainedNode);

  return (
    <Document title={`${labels.title} - ${data.asOfDate}`}>
      <Page size="A4" style={base.page}>
        <PdfHeader
          companyName={data.companyName}
          companyNameEn={data.companyNameEn}
          companyAddress={data.companyAddress}
          branchName={data.branchName}
          companyPhone={data.companyPhone}
          logoUrl={data.logoUrl}
          docTitle={`${labels.title}  —  ${data.asOfDate}`}
          isRTL={isRTL}
        />

        {/* Balance status + KPI row */}
        <View style={[
          S.balanceCheck,
          { flexDirection: dir,
            backgroundColor: data.isBalanced ? "#f0fdf4" : "#fef2f2",
            borderWidth: 1,
            borderColor: data.isBalanced ? "#86efac" : "#fca5a5" }
        ]}>
          <Text style={[S.balanceCheckText, { color: data.isBalanced ? "#166534" : "#991b1b", textAlign: start }]}>
            {data.isBalanced ? `✓ ${labels.balanced}` : `✗ ${labels.unbalanced}`}
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={[S.balanceCheckText, { color: "#1e3a8a", textAlign: end }]}>
            {labels.totalAssets}: {formatCurrency(data.totalAssets / 100)}
          </Text>
        </View>

        {/* KPI boxes */}
        <View style={[S.kpiRow, { flexDirection: dir }]}>
          <View style={[S.kpiBox, { backgroundColor: "#eff6ff", borderColor: "#93c5fd" }]}>
            <Text style={S.kpiLabel}>{labels.totalAssets}</Text>
            <Text style={[S.kpiValue, { color: "#1d4ed8" }]}>{formatCurrency(data.totalAssets / 100)}</Text>
          </View>
          <View style={[S.kpiBox, { backgroundColor: "#fff1f2", borderColor: "#fca5a5" }]}>
            <Text style={S.kpiLabel}>{labels.totalLiabilities}</Text>
            <Text style={[S.kpiValue, { color: "#991b1b" }]}>{formatCurrency(data.liabilities.total / 100)}</Text>
          </View>
          <View style={[S.kpiBox, { backgroundColor: "#f0fdf4", borderColor: "#86efac" }]}>
            <Text style={S.kpiLabel}>{labels.totalEquity}</Text>
            <Text style={[S.kpiValue, { color: "#166534" }]}>{formatCurrency(data.equity.total / 100)}</Text>
          </View>
        </View>

        {/* Assets section */}
        <TreeSection nodes={assetNodes} formatCurrency={formatCurrency} isRTL={isRTL} />

        {/* Liabilities section */}
        <TreeSection nodes={liabilityNodes} formatCurrency={formatCurrency} isRTL={isRTL} />

        {/* Equity section */}
        <TreeSection nodes={equityNodes} formatCurrency={formatCurrency} isRTL={isRTL} />

        {/* Grand total: Total Liabilities + Equity */}
        <View style={[S.grandTotal, { flexDirection: dir }]} wrap={false}>
          <Text style={[S.grandTotalLabel, { textAlign: start }]}>{labels.totalLiabilitiesAndEquity}</Text>
          <Text style={[S.grandTotalValue, { textAlign: end }]}>{formatCurrency(data.totalLiabilitiesAndEquity / 100)}</Text>
        </View>

        <PdfFooter printedBy={labels.printedBy} isRTL={isRTL} />
      </Page>
    </Document>
  );
}
