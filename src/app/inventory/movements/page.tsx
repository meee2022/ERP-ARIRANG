// @ts-nocheck
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader } from "@/components/ui/page-header";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { RotateCcw, Search } from "lucide-react";
import { formatDateShort } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";

function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function todayISO() { return new Date().toISOString().split("T")[0]; }

const MOVEMENT_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  purchase_receipt:  { ar: "استلام شراء",       en: "Purchase Receipt"  },
  sales_issue:       { ar: "إصدار مبيعات",      en: "Sales Issue"       },
  sales_return:      { ar: "مرتجع مبيعات",      en: "Sales Return"      },
  purchase_return:   { ar: "مرتجع مشتريات",     en: "Purchase Return"   },
  adjustment_in:     { ar: "تسوية زيادة",       en: "Adjustment In"     },
  adjustment_out:    { ar: "تسوية نقص",          en: "Adjustment Out"    },
  transfer_out:      { ar: "تحويل صادر",        en: "Transfer Out"      },
  transfer_in:       { ar: "تحويل وارد",        en: "Transfer In"       },
  opening_stock:     { ar: "رصيد افتتاحي",      en: "Opening Stock"     },
};

const TYPE_COLORS: Record<string, string> = {
  purchase_receipt: "bg-blue-50 text-blue-700 border-blue-100",
  sales_issue:      "bg-green-50 text-green-700 border-green-100",
  sales_return:     "bg-orange-50 text-orange-700 border-orange-100",
  purchase_return:  "bg-yellow-50 text-yellow-700 border-yellow-100",
  adjustment_in:    "bg-purple-50 text-purple-700 border-purple-100",
  adjustment_out:   "bg-red-50 text-red-700 border-red-100",
  transfer_out:     "bg-gray-50 text-gray-700 border-gray-100",
  transfer_in:      "bg-teal-50 text-teal-700 border-teal-100",
  opening_stock:    "bg-amber-50 text-amber-700 border-amber-100",
};

export default function InventoryMovementsPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const selectedBranch = useAppStore((s) => s.selectedBranch);

  const [fromDate, setFromDate] = useState(startOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];

  const movements = useQuery(
    api.inventory.getInventoryMovements,
    company
      ? {
          companyId: company._id,
          fromDate,
          toDate,
          branchId: selectedBranch !== "all" ? (selectedBranch as any) : undefined,
        }
      : "skip"
  );

  const loading = movements === undefined;

  const filtered = (movements ?? []).filter((m: any) => {
    if (typeFilter !== "all" && m.movementType !== typeFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (m.movementNumber || "").toLowerCase().includes(s) ||
      (m.warehouseName || "").toLowerCase().includes(s) ||
      (m.notes || "").toLowerCase().includes(s)
    );
  });

  const totalMovements = filtered.length;
  const totalLines = filtered.reduce((sum: number, m: any) => sum + (m.lineCount ?? 0), 0);

  function movTypeLabel(type: string) {
    const lbl = MOVEMENT_TYPE_LABELS[type];
    if (!lbl) return type;
    return isRTL ? lbl.ar : lbl.en;
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      <div className="no-print">
        <PageHeader
          icon={RotateCcw}
          title={isRTL ? "سجل حركات المخزون" : "Inventory Movement Log"}
          badge={
            <span className="badge-soft">
              {totalMovements} {isRTL ? "حركة" : "movements"}
            </span>
          }
        />
      </div>

      <FilterPanel>
        <FilterField label={t("fromDate")}>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="input-field h-9 w-auto"
          />
        </FilterField>
        <FilterField label={t("toDate")}>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="input-field h-9 w-auto"
          />
        </FilterField>
        <FilterField label={t("type")}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input-field h-9 w-auto"
          >
            <option value="all">{t("all")}</option>
            {Object.entries(MOVEMENT_TYPE_LABELS).map(([key, lbl]) => (
              <option key={key} value={key}>
                {isRTL ? lbl.ar : lbl.en}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label={t("search")}>
          <div className="relative">
            <Search
              className={`absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[color:var(--ink-400)] ${isRTL ? "right-3" : "left-3"}`}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className={`input-field h-9 ${isRTL ? "pr-9" : "pl-9"}`}
            />
          </div>
        </FilterField>
      </FilterPanel>

      {/* Summary strip */}
      {totalMovements > 0 && (
        <div className="flex gap-4 flex-wrap">
          {[
            { label: isRTL ? "إجمالي الحركات" : "Total Movements", value: totalMovements },
            { label: isRTL ? "إجمالي الأسطر"  : "Total Lines",     value: totalLines    },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border px-4 py-2.5 text-sm"
              style={{ background: "rgba(255,255,255,0.6)", borderColor: "rgba(0,0,0,0.07)" }}
            >
              <span className="text-[color:var(--ink-500)]">{item.label}:</span>{" "}
              <span className="font-bold text-[color:var(--ink-900)]">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="surface-card overflow-hidden">
        {loading ? (
          <LoadingState label={t("loading")} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={RotateCcw}
            title={isRTL ? "لا توجد حركات في هذه الفترة" : "No movements in this period"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{isRTL ? "رقم الحركة" : "Movement No"}</th>
                  <th>{isRTL ? "النوع" : "Type"}</th>
                  <th>{isRTL ? "التاريخ" : "Date"}</th>
                  <th>{isRTL ? "المستودع" : "Warehouse"}</th>
                  <th className="text-center">{isRTL ? "الأسطر" : "Lines"}</th>
                  <th className="text-center">{isRTL ? "الحالة" : "Status"}</th>
                  <th>{isRTL ? "الترحيل" : "Posting"}</th>
                  <th>{isRTL ? "ملاحظات" : "Notes"}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m: any) => (
                  <tr key={m._id}>
                    <td className="code">{m.movementNumber}</td>
                    <td>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${TYPE_COLORS[m.movementType] ?? "badge-soft"}`}
                      >
                        {movTypeLabel(m.movementType)}
                      </span>
                    </td>
                    <td className="muted">{formatDateShort(m.movementDate)}</td>
                    <td>{m.warehouseName ?? "—"}</td>
                    <td className="text-center tabular-nums">{m.lineCount ?? 0}</td>
                    <td className="text-center">
                      <StatusBadge status={m.documentStatus} type="document" />
                    </td>
                    <td className="text-center">
                      <StatusBadge status={m.postingStatus} type="posting" />
                    </td>
                    <td className="muted text-xs max-w-[200px] truncate" title={m.notes}>
                      {m.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
