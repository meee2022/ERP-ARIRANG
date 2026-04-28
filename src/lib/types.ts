// ============================================================
// ERP V1 — COMPREHENSIVE TYPE DEFINITIONS
// ============================================================

// ─── STATUS ENUMS ─────────────────────────────────────────────────────────────

export type DocumentStatus = "draft" | "approved" | "cancelled";
export type PostingStatus = "unposted" | "posted" | "reversed";
export type PaymentStatus = "not_applicable" | "unpaid" | "partial" | "paid";
export type AllocationStatus = "unallocated" | "partial" | "fully_allocated";
export type PeriodStatus = "open" | "soft_closed" | "closed" | "locked";
export type FiscalYearStatus = "open" | "closing" | "closed" | "locked";

export type ChequeStatus =
  | "received"
  | "deposited"
  | "cleared"
  | "bounced"
  | "issued"
  | "presented"
  | "cleared_issued"
  | "stopped";

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
export type NormalBalance = "debit" | "credit";

export type JournalType =
  | "general"
  | "cash"
  | "expenses"
  | "adjustments"
  | "closing"
  | "reversing"
  | "opening"
  | "auto_sales"
  | "auto_purchase"
  | "auto_inventory"
  | "auto_receipt"
  | "auto_payment"
  | "auto_cheque"
  | "auto_transfer";

export type MovementType =
  | "purchase_receipt"
  | "sales_issue"
  | "sales_return"
  | "purchase_return"
  | "adjustment_in"
  | "adjustment_out"
  | "transfer_out"
  | "transfer_in"
  | "opening_stock";

export type ItemType =
  | "raw_material"
  | "semi_finished"
  | "finished_good"
  | "service"
  | "expense_item";

export type UserRole =
  | "admin"
  | "manager"
  | "accountant"
  | "cashier"
  | "sales"
  | "warehouse";

export type InvoiceType = "cash_sale" | "credit_sale" | "mixed_sale";
export type PurchaseInvoiceType = "stock_purchase" | "expense_purchase" | "mixed";
export type ChequeType = "received" | "issued";
export type PaymentMethod = "cash" | "transfer" | "card" | "cheque";
export type ReceiptType = "customer_payment" | "other_receipt";
export type PaymentType = "supplier_payment" | "expense_payment" | "other";
export type WarehouseType = "main" | "transit" | "waste";
export type AdjustmentType = "increase" | "decrease";
export type LineType = "stock_item" | "expense_item" | "service";
export type RefundMethod = "cash" | "credit_note" | "offset";

// ─── MASTER DATA ENTITIES ──────────────────────────────────────────────────────

export interface Company {
  _id: string;
  nameAr: string;
  nameEn: string;
  commercialReg?: string;
  taxNumber?: string;
  baseCurrency: string;
  fiscalYearStart: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: number;
}

export interface Branch {
  _id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  defaultWarehouseId?: string;
  createdAt: number;
}

export interface Currency {
  _id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  symbol: string;
  isBase: boolean;
  decimalPlaces: number;
  isActive: boolean;
}

export interface FiscalYear {
  _id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  startDate: string;
  endDate: string;
  status: FiscalYearStatus;
  closedBy?: string;
  closedAt?: number;
}

export interface AccountingPeriod {
  _id: string;
  fiscalYearId: string;
  companyId: string;
  periodNumber: number;
  name: string;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  closedBy?: string;
  closedAt?: number;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  branchIds: string[];
  isActive: boolean;
  createdAt: number;
}

// ─── CHART OF ACCOUNTS ────────────────────────────────────────────────────────

export interface Account {
  _id: string;
  companyId: string;
  code: string;
  parentId?: string;
  nameAr: string;
  nameEn: string;
  accountType: AccountType;
  accountSubType?: string;
  isPostable: boolean;
  requiresCostCenter: boolean;
  isActive: boolean;
  normalBalance: NormalBalance;
  notes?: string;
  sortOrder?: number;
  createdAt: number;
  // Computed fields (not stored)
  balance?: number;
  children?: Account[];
  level?: number;
}

export interface CostCenter {
  _id: string;
  companyId: string;
  branchId?: string;
  code: string;
  nameAr: string;
  nameEn: string;
  parentId?: string;
  isActive: boolean;
}

// ─── PARTNERS ─────────────────────────────────────────────────────────────────

export interface Customer {
  _id: string;
  companyId: string;
  branchId?: string;
  code: string;
  nameAr: string;
  nameEn: string;
  accountId?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  currencyId?: string;
  creditLimit: number; // QAR
  creditDays: number;
  isActive: boolean;
  notes?: string;
  createdAt: number;
}

export interface Supplier {
  _id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  accountId?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  currencyId?: string;
  isActive: boolean;
  notes?: string;
  createdAt: number;
}

export interface TaxClass {
  _id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  rate: number;
  accountId?: string;
  isActive: boolean;
}

// ─── ITEMS ────────────────────────────────────────────────────────────────────

export interface ItemCategory {
  _id: string;
  companyId: string;
  parentId?: string;
  code: string;
  nameAr: string;
  nameEn: string;
  defaultInventoryAccountId?: string;
  defaultCogsAccountId?: string;
  isActive: boolean;
}

export interface UnitOfMeasure {
  _id: string;
  companyId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  isBase: boolean;
  baseUomId?: string;
  conversionFactor: number;
}

export interface Item {
  _id: string;
  companyId: string;
  code: string;
  barcode?: string;
  nameAr: string;
  nameEn: string;
  categoryId?: string;
  itemType: ItemType;
  baseUomId: string;
  costingMethod: "weighted_average";
  standardCost: number; // QAR
  lastCost: number; // QAR
  sellingPrice: number; // QAR
  inventoryAccountId?: string;
  cogsAccountId?: string;
  revenueAccountId?: string;
  taxClassId?: string;
  reorderPoint?: number;
  allowNegativeStock: boolean;
  isActive: boolean;
  notes?: string;
  createdAt: number;
  // Computed
  stockQuantity?: number;
  avgCost?: number;
}

export interface Warehouse {
  _id: string;
  companyId: string;
  branchId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  warehouseType: WarehouseType;
  isActive: boolean;
}

export interface StockBalance {
  _id: string;
  itemId: string;
  warehouseId: string;
  quantity: number;
  avgCost: number; // QAR
  totalValue: number; // QAR
  lastUpdated: number;
  // Computed
  item?: Item;
  warehouse?: Warehouse;
}

// ─── SALES DOCUMENTS ──────────────────────────────────────────────────────────

export interface SalesInvoice {
  _id: string;
  companyId: string;
  branchId: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  customerId?: string;
  invoiceDate: string;
  dueDate?: string;
  periodId: string;
  currencyId: string;
  exchangeRate: number;
  costCenterId?: string;
  warehouseId: string;
  subtotal: number; // QAR
  discountAmount: number; // QAR
  taxableAmount: number; // QAR
  vatAmount: number; // QAR
  serviceCharge: number; // QAR
  totalAmount: number; // QAR
  cashReceived: number; // QAR
  cardReceived: number; // QAR
  creditAmount: number; // QAR
  documentStatus: DocumentStatus;
  postingStatus: PostingStatus;
  paymentStatus: PaymentStatus;
  journalEntryId?: string;
  postedBy?: string;
  postedAt?: number;
  approvedBy?: string;
  cancelledBy?: string;
  notes?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  // Computed
  customerName?: string;
  lines?: SalesInvoiceLine[];
}

export interface SalesInvoiceLine {
  _id: string;
  invoiceId: string;
  lineNumber: number;
  itemId: string;
  description?: string;
  quantity: number;
  uomId: string;
  unitPrice: number; // QAR
  discountPct: number;
  discountAmount: number; // QAR
  vatRate: number;
  vatAmount: number; // QAR
  lineTotal: number; // QAR
  unitCost: number; // QAR
  costTotal: number; // QAR
  revenueAccountId?: string;
  cogsAccountId?: string;
  costCenterId?: string;
  warehouseId?: string;
  // Computed
  item?: Item;
  uom?: UnitOfMeasure;
}

// ─── PURCHASE DOCUMENTS ───────────────────────────────────────────────────────

export interface PurchaseInvoice {
  _id: string;
  companyId: string;
  branchId: string;
  invoiceNumber: string;
  supplierInvoiceNo?: string;
  supplierId: string;
  invoiceType: PurchaseInvoiceType;
  invoiceDate: string;
  dueDate?: string;
  periodId: string;
  grnId?: string;
  poId?: string;
  currencyId: string;
  exchangeRate: number;
  subtotal: number; // QAR
  vatAmount: number; // QAR
  totalAmount: number; // QAR
  documentStatus: DocumentStatus;
  postingStatus: PostingStatus;
  paymentStatus: "unpaid" | "partial" | "paid";
  journalEntryId?: string;
  notes?: string;
  createdBy: string;
  createdAt: number;
  // Computed
  supplierName?: string;
  lines?: PurchaseInvoiceLine[];
}

export interface PurchaseInvoiceLine {
  _id: string;
  invoiceId: string;
  grnLineId?: string;
  itemId?: string;
  description?: string;
  lineType: LineType;
  quantity: number;
  uomId?: string;
  unitPrice: number; // QAR
  vatRate: number;
  vatAmount: number; // QAR
  lineTotal: number; // QAR
  accountId?: string;
  costCenterId?: string;
}

export interface GoodsReceiptNote {
  _id: string;
  companyId: string;
  branchId: string;
  grnNumber: string;
  poId?: string;
  supplierId: string;
  receiptDate: string;
  periodId: string;
  warehouseId: string;
  currencyId: string;
  exchangeRate: number;
  documentStatus: "draft" | "approved" | "invoiced" | "cancelled";
  postingStatus: "unposted" | "posted";
  journalEntryId?: string;
  notes?: string;
  createdBy: string;
  createdAt: number;
}

// ─── TREASURY ─────────────────────────────────────────────────────────────────

export interface CashReceiptVoucher {
  _id: string;
  companyId: string;
  branchId: string;
  voucherNumber: string;
  voucherDate: string;
  periodId: string;
  receivedFrom: string;
  customerId?: string;
  receiptType: ReceiptType;
  cashAccountId: string;
  amount: number; // QAR
  currencyId: string;
  exchangeRate: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  documentStatus: DocumentStatus;
  postingStatus: "unposted" | "posted";
  allocationStatus: AllocationStatus;
  journalEntryId?: string;
  notes?: string;
  createdBy: string;
  createdAt: number;
}

export interface CashPaymentVoucher {
  _id: string;
  companyId: string;
  branchId: string;
  voucherNumber: string;
  voucherDate: string;
  periodId: string;
  paidTo: string;
  supplierId?: string;
  paymentType: PaymentType;
  cashAccountId: string;
  amount: number; // QAR
  currencyId: string;
  exchangeRate: number;
  paymentMethod: "cash" | "transfer" | "cheque";
  reference?: string;
  documentStatus: DocumentStatus;
  postingStatus: "unposted" | "posted";
  allocationStatus: AllocationStatus;
  journalEntryId?: string;
  notes?: string;
  createdBy: string;
  createdAt: number;
}

export interface Cheque {
  _id: string;
  companyId: string;
  branchId: string;
  chequeNumber: string;
  chequeType: ChequeType;
  bankAccountId?: string;
  customerId?: string;
  supplierId?: string;
  amount: number; // QAR
  currencyId: string;
  exchangeRate: number;
  issueDate: string;
  dueDate: string;
  drawnOnBank?: string;
  chequeStatus: ChequeStatus;
  sourceVoucherType?: string;
  sourceVoucherId?: string;
  clearingDate?: string;
  depositDate?: string;
  bounceDate?: string;
  bounceReason?: string;
  glAccountId?: string;
  journalEntryId?: string;
  clearingEntryId?: string;
  bounceEntryId?: string;
  notes?: string;
  createdBy: string;
  createdAt: number;
}

// ─── JOURNAL ENTRIES ──────────────────────────────────────────────────────────

export interface JournalEntry {
  _id: string;
  companyId: string;
  branchId: string;
  entryNumber: string;
  journalType: JournalType;
  entryDate: string;
  periodId: string;
  currencyId: string;
  exchangeRate: number;
  costCenterId?: string;
  sourceType?: string;
  sourceId?: string;
  description: string;
  totalDebit: number; // QAR
  totalCredit: number; // QAR
  postingStatus: "draft" | "posted" | "reversed";
  isAutoGenerated: boolean;
  isReversingEntry: boolean;
  reversedEntryId?: string;
  reversalEntryId?: string;
  postedBy?: string;
  postedAt?: number;
  notes?: string;
  createdBy: string;
  createdAt: number;
  // Computed
  lines?: JournalLine[];
}

export interface JournalLine {
  _id: string;
  entryId: string;
  lineNumber: number;
  accountId: string;
  subAccountType?: string;
  subAccountId?: string;
  description?: string;
  costCenterId?: string;
  documentRef?: string;
  debit: number; // QAR
  credit: number; // QAR
  foreignDebit: number;
  foreignCredit: number;
  // Computed
  account?: Account;
  costCenter?: CostCenter;
}

// ─── INVENTORY ────────────────────────────────────────────────────────────────

export interface StockAdjustment {
  _id: string;
  companyId: string;
  branchId: string;
  adjustmentNumber: string;
  adjustmentDate: string;
  periodId: string;
  warehouseId: string;
  adjustmentType: AdjustmentType;
  reason?: string;
  documentStatus: DocumentStatus;
  postingStatus: "unposted" | "posted";
  journalEntryId?: string;
  approvedBy?: string;
  notes?: string;
  createdBy: string;
  createdAt: number;
}

export interface InventoryMovement {
  _id: string;
  companyId: string;
  branchId: string;
  movementNumber: string;
  movementType: MovementType;
  movementDate: string;
  periodId: string;
  warehouseId: string;
  destinationWarehouseId?: string;
  sourceType?: string;
  sourceId?: string;
  documentStatus: "draft" | "confirmed" | "cancelled";
  postingStatus: "unposted" | "posted";
  journalEntryId?: string;
  notes?: string;
  createdBy: string;
  createdAt: number;
}

// ─── REPORT OUTPUT TYPES ──────────────────────────────────────────────────────

export interface TrialBalanceLine {
  accountId: string;
  accountCode: string;
  accountNameAr: string;
  accountNameEn: string;
  accountType: AccountType;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface GeneralLedgerLine {
  entryDate: string;
  entryNumber: string;
  description: string;
  journalType: JournalType;
  debit: number;
  credit: number;
  runningBalance: number;
  entryId: string;
}

export interface AgingBuckets {
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  days91Plus: number;
}

export interface ARAgingResult {
  summary: AgingBuckets;
  totalOutstanding: number;
  byCustomer: Array<{
    customer: Customer | null;
    buckets: AgingBuckets;
  }>;
}

export interface APAgingResult {
  summary: AgingBuckets;
  totalOutstanding: number;
  bySupplier: Array<{
    supplier: Supplier | null;
    buckets: AgingBuckets;
  }>;
}

export interface StockValuationItem {
  itemId: string;
  itemCode: string;
  itemNameAr: string;
  itemNameEn: string;
  warehouseId: string;
  warehouseNameAr: string;
  quantity: number;
  avgCost: number;
  totalValue: number;
  lastUpdated: number;
}

// ─── FORM INPUT TYPES ─────────────────────────────────────────────────────────

export interface SalesInvoiceLineInput {
  itemId: string;
  description?: string;
  quantity: number;
  uomId: string;
  unitPrice: number; // QAR
  discountPct: number;
  discountAmount: number;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
  revenueAccountId?: string;
  cogsAccountId?: string;
  costCenterId?: string;
  // UI helpers
  itemName?: string;
  itemCode?: string;
  stockQty?: number;
}

export interface SalesInvoiceFormInput {
  invoiceType: InvoiceType;
  customerId?: string;
  branchId: string;
  warehouseId: string;
  invoiceDate: string;
  dueDate?: string;
  periodId: string;
  currencyId: string;
  exchangeRate: number;
  costCenterId?: string;
  discountAmount: number;
  serviceCharge: number;
  cashReceived: number;
  cardReceived: number;
  notes?: string;
  lines: SalesInvoiceLineInput[];
}

export interface JournalLineInput {
  accountId: string;
  accountName?: string;
  accountCode?: string;
  subAccountType?: string;
  subAccountId?: string;
  description?: string;
  costCenterId?: string;
  documentRef?: string;
  debit: number; // displayed value
  credit: number;
}

// ─── POSTING RULES ────────────────────────────────────────────────────────────

export interface PostingRule {
  module: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  condition?: string;
}

export const POSTING_RULES: PostingRule[] = [
  {
    module: "Sales Invoice",
    description: "Cash sales",
    debitAccount: "Cash Account",
    creditAccount: "Revenue Account",
  },
  {
    module: "Sales Invoice",
    description: "Credit sales",
    debitAccount: "Accounts Receivable",
    creditAccount: "Revenue Account",
  },
  {
    module: "Sales Invoice",
    description: "VAT on sales",
    debitAccount: "—",
    creditAccount: "VAT Payable",
  },
  {
    module: "Sales Invoice",
    description: "Cost of goods sold",
    debitAccount: "COGS",
    creditAccount: "Inventory",
  },
  {
    module: "Purchase Invoice",
    description: "Stock purchase",
    debitAccount: "Inventory",
    creditAccount: "Accounts Payable",
  },
  {
    module: "Purchase Invoice",
    description: "VAT on purchases",
    debitAccount: "VAT Receivable",
    creditAccount: "—",
  },
  {
    module: "Cash Receipt",
    description: "Customer payment",
    debitAccount: "Cash/Bank",
    creditAccount: "Accounts Receivable",
  },
  {
    module: "Cash Payment",
    description: "Supplier payment",
    debitAccount: "Accounts Payable",
    creditAccount: "Cash/Bank",
  },
];

// ─── DASHBOARD TYPES ──────────────────────────────────────────────────────────

export interface DashboardKPIs {
  todaySales: number;
  outstandingAR: number;
  outstandingAP: number;
  cashPosition: number;
}

export interface DashboardAlert {
  type: "overdue_invoice" | "due_cheque" | "low_stock" | "pending_approval";
  severity: "error" | "warning" | "info";
  message: string;
  count: number;
  link?: string;
}

// ─── NAVIGATION TYPES ─────────────────────────────────────────────────────────

export interface NavItem {
  title: string;
  titleEn?: string;
  href: string;
  icon?: string;
  roles?: UserRole[];
  badge?: number;
}

export interface NavSection {
  label: string;
  labelEn?: string;
  items: NavItem[];
  icon?: string;
  roles?: UserRole[];
}

// ─── COLUMN DEFINITION (for DataTable) ────────────────────────────────────────

export interface ColumnDef<T> {
  key: keyof T | string;
  headerAr: string;
  headerEn?: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: "start" | "center" | "end";
}

// ─── LEGACY TYPES (kept for backward compatibility) ────────────────────────────

export type MaterialType = "RAW" | "PKG";
export type MaterialCategory =
  | "RM Chilled"
  | "RM Frozen"
  | "RM Dry"
  | "Fruits & Vegetables"
  | "RM Bakery";

export type StaffCategory = "Senior" | "Worker" | "Junior";
export type AttendanceStatus = "P" | "A" | "O" | "Ex" | "SL" | "";
