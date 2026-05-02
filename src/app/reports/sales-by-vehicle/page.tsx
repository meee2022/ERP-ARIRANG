// @ts-nocheck
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/useAppStore";
import { Truck, Banknote, CreditCard, Shuffle, LayoutList } from "lucide-react";

const TX_TYPES = [
  { value: "all",         Icon: LayoutList, color: "#6b1523", bg: "#fdf2f4", labelAr: "الكل",   labelEn: "All"    },
  { value: "cash_sale",   Icon: Banknote,   color: "#16a34a", bg: "#f0fdf4", labelAr: "نقدي",   labelEn: "Cash"   },
  { value: "credit_sale", Icon: CreditCard, color: "#2563eb", bg: "#eff6ff", labelAr: "آجل",    labelEn: "Credit" },
  { value: "mixed_sale",  Icon: Shuffle,    color: "#d97706", bg: "#fffbeb", labelAr: "مختلط",  labelEn: "Mixed"  },
] as const;
type TxType = typeof TX_TYPES[number]["value"];
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { ColorKPIGrid } from "@/components/ui/data-display";
import { Wallet, Hash } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PrintableReportPage } from "@/components/ui/printable-report";

function todayISO() { return new Date().toISOString().split("T")[0]; }
function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function SalesByVehiclePage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const { company: printCompany } = useCompanySettings();
  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const [txType, setTxType] = useState<TxType>("all");
  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const report = useQuery(api.reports.getSalesByVehicle, {
    fromDate,
    toDate,
    branchId: branchArg as any,
    invoiceType: txType !== "all" ? (txType as any) : undefined,
  });

  const rows = report?.rows ?? [];
  const totals = report?.totals ?? { invoiceCount: 0, totalSales: 0, cashSales: 0, creditSales: 0 };

  return (
    <PrintableReportPage
      company={printCompany}
      isRTL={isRTL}
      title={t("salesByVehicleTitle")}
      period={`${fromDate} — ${toDate}`}
      filters={
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {TX_TYPES.map(({ value, Icon, color, bg, labelAr, labelEn }) => {
              const active = txType === value;
              return (
                <button key={value} onClick={() => setTxType(value)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all border"
                  style={{ background: active ? color : bg, color: active ? "white" : color, borderColor: active ? color : color + "30", boxShadow: active ? `0 2px 8px ${color}40` : "none" }}>
                  <Icon className="h-3.5 w-3.5" />
                  {isRTL ? labelAr : labelEn}
                </button>
              );
            })}
          </div>
          <FilterPanel>
            <FilterField label={t("fromDate")}>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input-field h-8 w-auto text-sm" />
            </FilterField>
            <FilterField label={t("toDate")}>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input-field h-8 w-auto text-sm" />
            </FilterField>
          </FilterPanel>
        </div>
      }
      summary={
        <ColorKPIGrid cols={4} items={[
          { label: t("totalSales"), value: formatCurrency(totals.totalSales),
            color: "#6b1523", bg: "#fdf2f4", border: "#6b152330", icon: Wallet, big: true,
            hint: `${totals.invoiceCount} ${t("invoiceCount").toLowerCase()}` },
          { label: t("cashSales"), value: formatCurrency(totals.cashSales),
            color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", icon: Banknote },
          { label: t("creditSales"), value: formatCurrency(totals.creditSales),
            color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", icon: CreditCard },
          { label: t("invoiceCount"), value: String(totals.invoiceCount),
            color: "#7c3aed", bg: "#faf5ff", border: "#ddd6fe", icon: Hash },
        ]} />
      }
    >
      {report === undefined ? (
        <div className="loading-spinner"><div className="spinner" /><span className="spinner-label">{t("loading")}</span></div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Truck} title={t("noResults")} />
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("vehicleCode")}</th>
                <th>{t("vehicleDescription")}</th>
                <th className="text-end">{t("invoiceCount")}</th>
                <th className="text-end">{t("cashSales")}</th>
                <th className="text-end">{t("creditSales")}</th>
                <th className="text-end">{t("totalSales")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any, index: number) => (
                <tr key={row.vehicleId ?? index}>
                  <td className="code">{row.vehicleCode || "—"}</td>
                  <td>{isRTL ? row.vehicleDescriptionAr : (row.vehicleDescriptionEn || row.vehicleDescriptionAr)}</td>
                  <td className="numeric text-end">{row.invoiceCount}</td>
                  <td className="numeric text-end">{formatCurrency(row.cashSales)}</td>
                  <td className="numeric text-end">{formatCurrency(row.creditSales)}</td>
                  <td className="numeric text-end font-semibold">{formatCurrency(row.totalSales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PrintableReportPage>
  );
}
