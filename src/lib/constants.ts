// ============================================================
// ERP V1 — UI CONSTANTS & CONFIGURATION
// ============================================================

import type {
  DocumentStatus,
  PostingStatus,
  PaymentStatus,
  AllocationStatus,
  ChequeStatus,
  PeriodStatus,
  AccountType,
  JournalType,
  MovementType,
} from "./types";

// ─── MONETARY ─────────────────────────────────────────────────────────────────

export const DEFAULT_CURRENCY = "SAR";
export const VAT_RATE = 0.15;
export const PAGINATION_PAGE_SIZE = 50;

// ─── DOCUMENT STATUS CONFIG ───────────────────────────────────────────────────

export const DOCUMENT_STATUS_CONFIG: Record<
  DocumentStatus | "reversed",
  { labelAr: string; labelEn: string; color: string; bgColor: string; textColor: string }
> = {
  draft: {
    labelAr: "مسودة",
    labelEn: "Draft",
    color: "gray",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
  },
  approved: {
    labelAr: "معتمد",
    labelEn: "Approved",
    color: "blue",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
  },
  cancelled: {
    labelAr: "ملغي",
    labelEn: "Cancelled",
    color: "red",
    bgColor: "bg-red-100",
    textColor: "text-red-700",
  },
  reversed: {
    labelAr: "معكوس",
    labelEn: "Reversed",
    color: "orange",
    bgColor: "bg-orange-100",
    textColor: "text-orange-700",
  },
};

// ─── POSTING STATUS CONFIG ────────────────────────────────────────────────────

export const POSTING_STATUS_CONFIG: Record<
  PostingStatus,
  { labelAr: string; labelEn: string; bgColor: string; textColor: string }
> = {
  unposted: {
    labelAr: "غير مرحل",
    labelEn: "Unposted",
    bgColor: "bg-gray-100",
    textColor: "text-gray-600",
  },
  posted: {
    labelAr: "مرحل",
    labelEn: "Posted",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
  },
  reversed: {
    labelAr: "معكوس",
    labelEn: "Reversed",
    bgColor: "bg-orange-100",
    textColor: "text-orange-700",
  },
};

// ─── PAYMENT STATUS CONFIG ────────────────────────────────────────────────────

export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { labelAr: string; labelEn: string; bgColor: string; textColor: string }
> = {
  not_applicable: {
    labelAr: "نقدي",
    labelEn: "Cash",
    bgColor: "bg-gray-100",
    textColor: "text-gray-600",
  },
  unpaid: {
    labelAr: "غير مدفوع",
    labelEn: "Unpaid",
    bgColor: "bg-red-100",
    textColor: "text-red-700",
  },
  partial: {
    labelAr: "مدفوع جزئياً",
    labelEn: "Partial",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-700",
  },
  paid: {
    labelAr: "مدفوع",
    labelEn: "Paid",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
  },
};

// ─── ALLOCATION STATUS CONFIG ──────────────────────────────────────────────────

export const ALLOCATION_STATUS_CONFIG: Record<
  AllocationStatus,
  { labelAr: string; labelEn: string; bgColor: string; textColor: string }
> = {
  unallocated: {
    labelAr: "غير مخصص",
    labelEn: "Unallocated",
    bgColor: "bg-red-100",
    textColor: "text-red-700",
  },
  partial: {
    labelAr: "مخصص جزئياً",
    labelEn: "Partial",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-700",
  },
  fully_allocated: {
    labelAr: "مخصص كاملاً",
    labelEn: "Fully Allocated",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
  },
};

// ─── CHEQUE STATUS CONFIG ─────────────────────────────────────────────────────

export const CHEQUE_STATUS_CONFIG: Record<
  ChequeStatus,
  { labelAr: string; labelEn: string; bgColor: string; textColor: string }
> = {
  received: {
    labelAr: "مستلم",
    labelEn: "Received",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
  },
  deposited: {
    labelAr: "مودع",
    labelEn: "Deposited",
    bgColor: "bg-indigo-100",
    textColor: "text-indigo-700",
  },
  cleared: {
    labelAr: "محصل",
    labelEn: "Cleared",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
  },
  bounced: {
    labelAr: "مرتد",
    labelEn: "Bounced",
    bgColor: "bg-red-100",
    textColor: "text-red-700",
  },
  issued: {
    labelAr: "صادر",
    labelEn: "Issued",
    bgColor: "bg-purple-100",
    textColor: "text-purple-700",
  },
  presented: {
    labelAr: "مقدم",
    labelEn: "Presented",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-700",
  },
  cleared_issued: {
    labelAr: "مصروف",
    labelEn: "Cleared (Issued)",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
  },
  stopped: {
    labelAr: "موقوف",
    labelEn: "Stopped",
    bgColor: "bg-gray-100",
    textColor: "text-gray-600",
  },
};

// ─── PERIOD STATUS CONFIG ─────────────────────────────────────────────────────

export const PERIOD_STATUS_CONFIG: Record<
  PeriodStatus,
  { labelAr: string; labelEn: string; bgColor: string; textColor: string }
> = {
  open: {
    labelAr: "مفتوحة",
    labelEn: "Open",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
  },
  soft_closed: {
    labelAr: "مغلقة مؤقتاً",
    labelEn: "Soft Closed",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-700",
  },
  closed: {
    labelAr: "مغلقة",
    labelEn: "Closed",
    bgColor: "bg-orange-100",
    textColor: "text-orange-700",
  },
  locked: {
    labelAr: "مقفلة",
    labelEn: "Locked",
    bgColor: "bg-red-100",
    textColor: "text-red-700",
  },
};

// ─── ACCOUNT TYPE LABELS ──────────────────────────────────────────────────────

export const ACCOUNT_TYPE_LABELS: Record<
  AccountType,
  { ar: string; en: string; normalBalance: "debit" | "credit" }
> = {
  asset: { ar: "أصول", en: "Assets", normalBalance: "debit" },
  liability: { ar: "خصوم", en: "Liabilities", normalBalance: "credit" },
  equity: { ar: "حقوق الملكية", en: "Equity", normalBalance: "credit" },
  revenue: { ar: "إيرادات", en: "Revenue", normalBalance: "credit" },
  expense: { ar: "مصروفات", en: "Expenses", normalBalance: "debit" },
};

export const ACCOUNT_SUBTYPE_LABELS: Record<string, { ar: string; en: string }> = {
  current_asset: { ar: "أصول متداولة", en: "Current Assets" },
  fixed_asset: { ar: "أصول ثابتة", en: "Fixed Assets" },
  cash_bank: { ar: "نقد وبنوك", en: "Cash & Banks" },
  accounts_receivable: { ar: "ذمم مدينة", en: "Accounts Receivable" },
  inventory: { ar: "مخزون", en: "Inventory" },
  current_liability: { ar: "خصوم متداولة", en: "Current Liabilities" },
  accounts_payable: { ar: "ذمم دائنة", en: "Accounts Payable" },
  vat_payable: { ar: "ضريبة مستحقة", en: "VAT Payable" },
  vat_receivable: { ar: "ضريبة قابلة للاسترداد", en: "VAT Receivable" },
  long_term_liability: { ar: "خصوم طويلة الأمد", en: "Long-term Liabilities" },
  capital: { ar: "رأس المال", en: "Capital" },
  retained_earnings: { ar: "أرباح محتجزة", en: "Retained Earnings" },
  sales_revenue: { ar: "إيرادات المبيعات", en: "Sales Revenue" },
  cost_of_goods: { ar: "تكلفة المبيعات", en: "Cost of Goods Sold" },
  operating_expense: { ar: "مصروفات تشغيلية", en: "Operating Expenses" },
  other_income: { ar: "إيرادات أخرى", en: "Other Income" },
  other_expense: { ar: "مصروفات أخرى", en: "Other Expenses" },
};

// ─── JOURNAL TYPE LABELS ──────────────────────────────────────────────────────

export const JOURNAL_TYPE_LABELS: Record<JournalType, { ar: string; en: string }> = {
  general:        { ar: "قيد عام",             en: "General Journal" },
  cash:           { ar: "قيد نقدي",            en: "Cash Journal" },
  expenses:       { ar: "قيد مصروفات",         en: "Expenses Journal" },
  adjustments:    { ar: "قيد تسوية",           en: "Adjustment" },
  closing:        { ar: "قيد إقفال",           en: "Closing Entry" },
  reversing:      { ar: "قيد عكسي",            en: "Reversing Entry" },
  opening:        { ar: "قيد افتتاحي",         en: "Opening Entry" },
  auto_sales:     { ar: "مبيعات (تلقائي)",     en: "Sales (Auto)" },
  auto_purchase:  { ar: "مشتريات (تلقائي)",    en: "Purchases (Auto)" },
  auto_inventory: { ar: "مخزون (تلقائي)",      en: "Inventory (Auto)" },
  auto_receipt:   { ar: "قبض (تلقائي)",        en: "Receipt (Auto)" },
  auto_payment:   { ar: "صرف (تلقائي)",        en: "Payment (Auto)" },
  auto_cheque:    { ar: "شيك (تلقائي)",        en: "Cheque (Auto)" },
  auto_transfer:  { ar: "تحويل (تلقائي)",      en: "Transfer (Auto)" },
};

// ─── MOVEMENT TYPE LABELS ─────────────────────────────────────────────────────

export const MOVEMENT_TYPE_LABELS: Record<MovementType, { ar: string; en: string }> = {
  purchase_receipt: { ar: "استلام مشتريات", en: "Purchase Receipt" },
  sales_issue: { ar: "إصدار مبيعات", en: "Sales Issue" },
  sales_return: { ar: "مرتجع مبيعات", en: "Sales Return" },
  purchase_return: { ar: "مرتجع مشتريات", en: "Purchase Return" },
  adjustment_in: { ar: "تسوية زيادة", en: "Adjustment In" },
  adjustment_out: { ar: "تسوية نقص", en: "Adjustment Out" },
  transfer_out: { ar: "تحويل خروج", en: "Transfer Out" },
  transfer_in: { ar: "تحويل دخول", en: "Transfer In" },
  opening_stock: { ar: "رصيد افتتاحي", en: "Opening Stock" },
};

// ─── AGING BUCKET LABELS ──────────────────────────────────────────────────────

export const BUCKET_LABELS = {
  current: { ar: "جاري", en: "Current" },
  days1_30: { ar: "1-30 يوم", en: "1-30 Days" },
  days31_60: { ar: "31-60 يوم", en: "31-60 Days" },
  days61_90: { ar: "61-90 يوم", en: "61-90 Days" },
  days91Plus: { ar: "+90 يوم", en: "90+ Days" },
};

// ─── INVOICE TYPE LABELS ──────────────────────────────────────────────────────

export const INVOICE_TYPE_LABELS = {
  cash_sale: { ar: "نقدي", en: "Cash Sale" },
  credit_sale: { ar: "آجل", en: "Credit Sale" },
  mixed_sale: { ar: "مختلط", en: "Mixed Sale" },
};

export const PURCHASE_INVOICE_TYPE_LABELS = {
  stock_purchase: { ar: "شراء بضاعة", en: "Stock Purchase" },
  expense_purchase: { ar: "شراء مصروفات", en: "Expense Purchase" },
  mixed: { ar: "مختلط", en: "Mixed" },
};

// ─── ITEM TYPE LABELS ─────────────────────────────────────────────────────────

export const ITEM_TYPE_LABELS = {
  raw_material: { ar: "مادة خام", en: "Raw Material" },
  semi_finished: { ar: "نصف مصنع", en: "Semi-Finished" },
  finished_good: { ar: "منتج تام", en: "Finished Good" },
  service: { ar: "خدمة", en: "Service" },
  expense_item: { ar: "صنف مصاريف", en: "Expense Item" },
};

// ─── WAREHOUSE TYPE LABELS ────────────────────────────────────────────────────

export const WAREHOUSE_TYPE_LABELS = {
  main: { ar: "رئيسي", en: "Main" },
  transit: { ar: "عبور", en: "Transit" },
  waste: { ar: "هالك", en: "Waste" },
};

// ─── USER ROLE LABELS ─────────────────────────────────────────────────────────

export const USER_ROLE_LABELS = {
  admin: { ar: "مدير النظام", en: "Admin" },
  manager: { ar: "مدير", en: "Manager" },
  accountant: { ar: "محاسب", en: "Accountant" },
  cashier: { ar: "كاشير", en: "Cashier" },
  sales: { ar: "مبيعات", en: "Sales" },
  warehouse: { ar: "مخازن", en: "Warehouse" },
};

// ─── PAYMENT METHOD LABELS ────────────────────────────────────────────────────

export const PAYMENT_METHOD_LABELS = {
  cash: { ar: "نقد", en: "Cash" },
  transfer: { ar: "تحويل بنكي", en: "Bank Transfer" },
  card: { ar: "بطاقة", en: "Card" },
  cheque: { ar: "شيك", en: "Cheque" },
};

// ─── MONTHS ───────────────────────────────────────────────────────────────────

export const MONTH_NAMES_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export const MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
