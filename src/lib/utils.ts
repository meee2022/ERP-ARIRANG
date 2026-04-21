import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AgingBuckets, SalesInvoice } from "./types";

// ─── TAILWIND CLASS MERGE ─────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ─── CURRENCY FORMATTING ──────────────────────────────────────────────────────

/**
 * Formats a monetary value stored as integer * 100 for display.
 * @param amount - value stored as integer * 100 (e.g. 150075 = 1500.75)
 * @param currency - ISO currency code, defaults to "QAR"
 * @param locale - "ar" for Arabic locale, "en" for English
 */
export function formatCurrency(
  amount: number,
  currency: string = "QAR",
  locale: "ar" | "en" = "ar"
): string {
  const value = amount / 100;
  const localeStr = locale === "ar" ? "ar-QA" : "en-QA";
  try {
    return new Intl.NumberFormat(localeStr, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    const formatted = value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${currency} ${formatted}`;
  }
}

/**
 * Formats a number without currency symbol.
 */
export function formatNumber(
  value: number,
  decimals: number = 2,
  locale: "ar" | "en" = "ar"
): string {
  const localeStr = locale === "ar" ? "ar-QA" : "en-QA";
  return new Intl.NumberFormat(localeStr, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// ─── DATE FORMATTING ──────────────────────────────────────────────────────────

/**
 * Formats a date string or timestamp.
 */
export function formatDate(date: string | number, locale: "ar" | "en" = "ar"): string {
  const d = typeof date === "number" ? new Date(date) : new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale === "ar" ? "ar-QA" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Formats date as DD/MM/YYYY.
 */
export function formatDateShort(date: string | number): string {
  const d = typeof date === "number" ? new Date(date) : new Date(date);
  if (isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Returns today's date as ISO string "YYYY-MM-DD".
 */
export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── STATUS BADGE CLASSES ─────────────────────────────────────────────────────

const STATUS_CLASSES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  approved: "bg-blue-100 text-blue-700",
  posted: "bg-green-100 text-green-700",
  reversed: "bg-orange-100 text-orange-700",
  cancelled: "bg-red-100 text-red-700",
  unposted: "bg-gray-100 text-gray-600",
  not_applicable: "bg-gray-100 text-gray-600",
  unpaid: "bg-red-100 text-red-700",
  partial: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  unallocated: "bg-red-100 text-red-700",
  fully_allocated: "bg-green-100 text-green-700",
  open: "bg-green-100 text-green-700",
  soft_closed: "bg-yellow-100 text-yellow-700",
  closed: "bg-orange-100 text-orange-700",
  locked: "bg-red-100 text-red-700",
  received: "bg-blue-100 text-blue-700",
  deposited: "bg-indigo-100 text-indigo-700",
  cleared: "bg-green-100 text-green-700",
  bounced: "bg-red-100 text-red-700",
  issued: "bg-purple-100 text-purple-700",
  presented: "bg-yellow-100 text-yellow-700",
  cleared_issued: "bg-green-100 text-green-700",
  stopped: "bg-gray-100 text-gray-600",
};

/**
 * Returns Tailwind classes for a status badge.
 */
export function getStatusBadgeClass(status: string): string {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
  const specific = STATUS_CLASSES[status] ?? "bg-gray-100 text-gray-600";
  return `${base} ${specific}`;
}

// ─── DOCUMENT REFERENCE GENERATION ────────────────────────────────────────────

/**
 * Generates a formatted document reference.
 * e.g. generateDocRef("SI", 5) → "SI-0005-2026"
 */
export function generateDocRef(
  prefix: string,
  num: number,
  padding: number = 4,
  year?: number
): string {
  const padded = String(num).padStart(padding, "0");
  const yearStr = year ?? new Date().getFullYear();
  return `${prefix}-${padded}-${yearStr}`;
}

// ─── WEIGHTED AVERAGE COST ────────────────────────────────────────────────────

/**
 * Calculates the new weighted average cost after receiving new stock.
 */
export function calcWeightedAvgCost(
  oldQty: number,
  oldAvg: number,
  newQty: number,
  newCost: number
): number {
  if (oldQty + newQty === 0) return newCost;
  return Math.round((oldQty * oldAvg + newQty * newCost) / (oldQty + newQty));
}

// ─── JOURNAL BALANCE VALIDATION ───────────────────────────────────────────────

/**
 * Validates that total debits equal total credits.
 */
export function validateJournalBalance(
  lines: Array<{ debit: number; credit: number }>
): { valid: boolean; difference: number; totalDebit: number; totalCredit: number } {
  const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  return { valid: difference <= 1, difference, totalDebit, totalCredit };
}

// ─── GENERIC UTILITIES ────────────────────────────────────────────────────────

export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key]);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

export function sumBy<T>(arr: T[], key: keyof T): number {
  return arr.reduce((s, item) => {
    const val = item[key];
    return s + (typeof val === "number" ? val : 0);
  }, 0);
}

// ─── AR AGING BUCKETS ─────────────────────────────────────────────────────────

export function calcARAgingBuckets(
  invoices: Pick<SalesInvoice, "dueDate" | "invoiceDate" | "creditAmount" | "paymentStatus">[],
  asOfDate: string
): AgingBuckets {
  const asOf = new Date(asOfDate);
  const buckets: AgingBuckets = {
    current: 0,
    days1_30: 0,
    days31_60: 0,
    days61_90: 0,
    days91Plus: 0,
  };

  for (const inv of invoices) {
    if (inv.paymentStatus === "paid" || inv.paymentStatus === "not_applicable") continue;
    if (inv.creditAmount <= 0) continue;
    const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.invoiceDate);
    const daysPast = Math.floor(
      (asOf.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysPast <= 0) buckets.current += inv.creditAmount;
    else if (daysPast <= 30) buckets.days1_30 += inv.creditAmount;
    else if (daysPast <= 60) buckets.days31_60 += inv.creditAmount;
    else if (daysPast <= 90) buckets.days61_90 += inv.creditAmount;
    else buckets.days91Plus += inv.creditAmount;
  }

  return buckets;
}

// ─── RTL DETECTION ────────────────────────────────────────────────────────────

export function isRTL(): boolean {
  if (typeof document === "undefined") return true;
  return document.documentElement.dir === "rtl" || document.documentElement.lang === "ar";
}

// ─── MISC ─────────────────────────────────────────────────────────────────────

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "…";
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function calcPercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 10000) / 100;
}

export function exportToCSV(
  data: Record<string, any>[],
  filename: string,
  headers?: Record<string, string>
): void {
  if (data.length === 0) return;
  const keys = Object.keys(data[0]);
  const headerRow = headers ? keys.map((k) => headers[k] ?? k) : keys;
  const rows = data.map((row) =>
    keys
      .map((k) => {
        const val = row[k];
        const str = val === null || val === undefined ? "" : String(val);
        return str.includes(",") || str.includes('"')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(",")
  );
  const csv = [headerRow.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
