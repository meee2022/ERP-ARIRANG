// ============================================================

// INTERNATIONALIZATION — ARABIC / ENGLISH (v2)

// Centralized i18n + formatters + React hook.

// ============================================================

export type Language = "ar" | "en";

export type TKey = keyof typeof translations;

export const translations = {

  // ── App ────────────────────────────────────────────────

  appName:        { ar: "PrimeBalance ERP", en: "PrimeBalance ERP" },

  appSubtitle:    { ar: "نظام محاسبي وتوزيع", en: "Accounting & Distribution ERP" },

  brandBadge:     { ar: "نسخة احترافية", en: "Premium" },

  // ── Nav sections ──────────────────────────────────────

  navMain:        { ar: "الرئيسية",   en: "Main" },

  navFinance:     { ar: "المحاسبة",   en: "Accounting" },

  navOperations:  { ar: "العمليات",   en: "Operations" },

  navMasters:     { ar: "البيانات الأساسية", en: "Masters" },

  // ── Nav items ─────────────────────────────────────────

  dashboard:          { ar: "لوحة التحكم",     en: "Dashboard" },

  chartOfAccounts:    { ar: "دليل الحسابات",   en: "Chart of Accounts" },

  journalEntries:     { ar: "القيود اليومية",  en: "Journal Entries" },

  cashReceipts:       { ar: "سندات القبض",     en: "Cash Receipts" },

  salesInvoices:      { ar: "فواتير المبيعات", en: "Sales Invoices" },

  customers:          { ar: "العملاء",         en: "Customers" },

  suppliers:          { ar: "الموردون",        en: "Suppliers" },

  items:              { ar: "الأصناف",         en: "Items" },

  // ── Page titles & subtitles ────────────────────────────

  dashboardTitle:     { ar: "لوحة التحكم", en: "Dashboard" },

  dashboardSubtitle:  { ar: "نظرة عامة على النشاط المالي", en: "An overview of your financial activity" },

  customersTitle:     { ar: "العملاء",     en: "Customers" },

  suppliersTitle:     { ar: "الموردون",    en: "Suppliers" },

  itemsTitle:         { ar: "الأصناف",     en: "Items" },

  chartOfAccountsTitle: { ar: "دليل الحسابات", en: "Chart of Accounts" },

  salesInvoicesTitle: { ar: "فواتير المبيعات", en: "Sales Invoices" },

  cashReceiptsTitle:  { ar: "سندات القبض",     en: "Cash Receipts" },

  journalEntriesTitle:{ ar: "القيود اليومية",  en: "Journal Entries" },

  // ── Common actions ────────────────────────────────────

  save:           { ar: "حفظ",          en: "Save" },

  saving:         { ar: "جار الحفظ...",  en: "Saving..." },

  cancel:         { ar: "إلغاء",         en: "Cancel" },

  edit:           { ar: "تعديل",         en: "Edit" },

  delete:         { ar: "حذف",           en: "Delete" },

  activate:       { ar: "تفعيل",         en: "Activate" },

  deactivate:     { ar: "تعطيل",         en: "Deactivate" },

  add:            { ar: "إضافة",         en: "Add" },

  new:            { ar: "جديد",          en: "New" },

  search:         { ar: "بحث",           en: "Search" },

  searchPlaceholder:{ ar: "بحث...",      en: "Search..." },

  filter:         { ar: "تصفية",         en: "Filter" },

  all:            { ar: "الكل",          en: "All" },

  active:         { ar: "نشط",           en: "Active" },

  inactive:       { ar: "غير نشط",       en: "Inactive" },

  confirm:        { ar: "تأكيد",         en: "Confirm" },

  close:          { ar: "إغلاق",         en: "Close" },

  back:           { ar: "رجوع",          en: "Back" },

  view:           { ar: "عرض",           en: "View" },

  print:          { ar: "طباعة",         en: "Print" },

  export:         { ar: "تصدير",         en: "Export" },

  refresh:        { ar: "تحديث",         en: "Refresh" },

  // ── Field labels ──────────────────────────────────────

  code:           { ar: "الكود",          en: "Code" },

  name:           { ar: "الاسم",          en: "Name" },

  nameAr:         { ar: "الاسم العربي",   en: "Arabic Name" },

  nameEn:         { ar: "الاسم الإنجليزي", en: "English Name" },

  phone:          { ar: "هاتف",          en: "Phone" },

  mobile:         { ar: "جوال",          en: "Mobile" },

  email:          { ar: "البريد الإلكتروني", en: "Email" },

  address:        { ar: "العنوان",        en: "Address" },

  notes:          { ar: "ملاحظات",        en: "Notes" },

  status:         { ar: "الحالة",         en: "Status" },

  type:           { ar: "النوع",          en: "Type" },

  category:       { ar: "الفئة",          en: "Category" },

  unit:           { ar: "وحدة القياس",    en: "Unit" },

  costPrice:      { ar: "سعر التكلفة",   en: "Cost Price" },

  sellingPrice:   { ar: "سعر البيع",     en: "Selling Price" },

  reorderPoint:   { ar: "حد إعادة الطلب", en: "Reorder Point" },

  creditLimit:    { ar: "حد الائتمان",   en: "Credit Limit" },

  creditDays:     { ar: "أيام الائتمان", en: "Credit Days" },

  paymentTerms:   { ar: "شروط الدفع (يوم)", en: "Payment Terms (days)" },

  taxNumber:      { ar: "الرقم الضريبي",  en: "Tax Number" },

  contact:        { ar: "التواصل",        en: "Contact" },

  days:           { ar: "يوم",            en: "days" },

  currency:       { ar: "العملة",         en: "Currency" },

  amount:         { ar: "المبلغ",         en: "Amount" },

  date:           { ar: "التاريخ",        en: "Date" },

  number:         { ar: "الرقم",          en: "Number" },

  description:    { ar: "الوصف",          en: "Description" },

  debit:          { ar: "مدين",           en: "Debit" },

  credit:         { ar: "دائن",           en: "Credit" },

  balance:        { ar: "الرصيد",         en: "Balance" },

  reference:      { ar: "المرجع",         en: "Reference" },

  actions:        { ar: "إجراءات",        en: "Actions" },

  required:       { ar: "مطلوب",          en: "Required" },

  // ── Entity row counts ─────────────────────────────────

  customersCount: { ar: "عميل",  en: "customer(s)" },

  suppliersCount: { ar: "مورد",  en: "supplier(s)" },

  itemsCount:     { ar: "صنف",   en: "item(s)" },

  // ── Modal titles ──────────────────────────────────────

  addCustomer:    { ar: "إضافة عميل جديد", en: "Add New Customer" },

  editCustomer:   { ar: "تعديل عميل",       en: "Edit Customer" },

  addSupplier:    { ar: "إضافة مورد جديد",  en: "Add New Supplier" },

  editSupplier:   { ar: "تعديل مورد",       en: "Edit Supplier" },

  addItem:        { ar: "إضافة صنف جديد",   en: "Add New Item" },

  editItem:       { ar: "تعديل صنف",        en: "Edit Item" },

  // ── CTA ───────────────────────────────────────────────

  newCustomer:    { ar: "عميل جديد",  en: "New Customer" },

  newSupplier:    { ar: "مورد جديد",  en: "New Supplier" },

  newItem:        { ar: "صنف جديد",   en: "New Item" },

  newInvoice:     { ar: "فاتورة جديدة", en: "New Invoice" },

  newReceipt:     { ar: "سند جديد",   en: "New Voucher" },

  newJournal:     { ar: "قيد جديد",   en: "New Journal" },

  newAccount:     { ar: "حساب جديد",  en: "New Account" },

  // ── Empty/error states ────────────────────────────────

  noResults:      { ar: "لا توجد نتائج",         en: "No results" },

  noCustomersYet: { ar: "لا يوجد عملاء بعد",     en: "No customers yet" },

  noSuppliersYet: { ar: "لا يوجد موردون بعد",    en: "No suppliers yet" },

  noItemsYet:     { ar: "لا يوجد أصناف بعد",     en: "No items yet" },

  addFirstCustomer:{ar: "إضافة أول عميل",        en: "Add first customer" },

  addFirstSupplier:{ar: "إضافة أول مورد",        en: "Add first supplier" },

  addFirstItem:   { ar: "إضافة أول صنف",         en: "Add first item" },

  loading:        { ar: "جاري التحميل...",       en: "Loading..." },

  // ── Search placeholders ───────────────────────────────

  searchCustomers:{ ar: "بحث بالاسم أو الكود أو الهاتف...", en: "Search by name, code or phone..." },

  searchSuppliers:{ ar: "بحث بالاسم أو الكود...",           en: "Search by name or code..." },

  searchItems:    { ar: "بحث بالاسم أو الكود...",           en: "Search by name or code..." },

  // ── Item types ────────────────────────────────────────

  itemType:          { ar: "نوع الصنف", en: "Item Type" },

  typeAll:           { ar: "كل الأنواع", en: "All types" },

  rawMaterial:       { ar: "مواد خام",   en: "Raw Material" },

  semiFinishedGood:  { ar: "نصف مصنع",   en: "Semi-Finished" },

  finishedGood:      { ar: "منتج تام",   en: "Finished Good" },

  service:           { ar: "خدمة",       en: "Service" },

  expenseItem:       { ar: "مصروف",      en: "Expense Item" },

  // ── Validation / errors ───────────────────────────────

  nameArRequired:    { ar: "الاسم العربي مطلوب",   en: "Arabic name is required" },

  unitRequired:      { ar: "وحدة القياس مطلوبة",  en: "Unit of measure is required" },

  duplicateCode:     { ar: "الكود مستخدم مسبقاً",   en: "Code already in use" },

  noArAccount:       { ar: "لا يوجد حساب مدينون. أضف حساباً في دليل الحسابات أولاً.",

                       en: "No receivable account found. Add one in the Chart of Accounts first." },

  noApAccount:       { ar: "لا يوجد حساب دائنون. أضف حساباً في دليل الحسابات أولاً.",
                       en: "No payable account found. Add one in the Chart of Accounts first." },

  noUnits:           { ar: "تنبيه: لا توجد وحدات قياس. أضف وحدات قياس أولاً من الإعدادات.",
                       en: "Warning: No units of measure found. Please add units in Settings first." },


  selectUnit:        { ar: "اختر وحدة القياس",     en: "Select a unit" },

  withoutCategory:   { ar: "بدون فئة",              en: "No category" },

  // ── Dashboard cards / KPIs ────────────────────────────

  kpiCustomers:      { ar: "إجمالي العملاء",  en: "Total Customers" },

  kpiSuppliers:      { ar: "إجمالي الموردين", en: "Total Suppliers" },

  kpiItems:          { ar: "إجمالي الأصناف",  en: "Total Items" },

  kpiAccounts:       { ar: "الحسابات",         en: "Accounts" },

  kpiSalesToday:     { ar: "مبيعات اليوم",     en: "Today's Sales" },

  kpiReceipts:       { ar: "قبض اليوم",        en: "Today's Receipts" },

  kpiOpenPeriod:     { ar: "الفترة المفتوحة",  en: "Open Period" },

  kpiPaymentsToday:  { ar: "صرف اليوم",        en: "Today's Payments" },

  kpiCashOnHand:     { ar: "النقد في الصندوق", en: "Cash on Hand" },

  kpiPendingInvoices:{ ar: "فواتير معلقة",     en: "Pending Invoices" },

  recentActivity:    { ar: "آخر الحركات",      en: "Recent Activity" },

  quickActions:      { ar: "إجراءات سريعة",    en: "Quick Actions" },

  noRecentActivity:  { ar: "لا توجد حركات حديثة", en: "No recent activity" },

  // ── Document type labels for recent activity ───────────────────────────
  typeSalesInvoice:  { ar: "فاتورة مبيعات",  en: "Sales Invoice" },
  typeCashReceipt:   { ar: "سند قبض",         en: "Cash Receipt" },
  typeCashPayment:   { ar: "سند صرف",         en: "Cash Payment" },
  typeGRN:           { ar: "استلام بضاعة",    en: "Goods Receipt" },
  typeBankTransfer:  { ar: "تحويل بنكي",      en: "Bank Transfer" },
  typeStockAdj:      { ar: "تسوية مخزون",     en: "Stock Adjustment" },

  openNow:           { ar: "مفتوحة",           en: "Open" },

  periodApril2026:   { ar: "أبريل 2026",       en: "April 2026" },

  // ── Header & shell ────────────────────────────────────

  toggleSidebar:     { ar: "تبديل الشريط الجانبي", en: "Toggle sidebar" },

  toggleLanguage:    { ar: "تغيير اللغة",           en: "Change language" },

  notifications:     { ar: "الإشعارات",             en: "Notifications" },

  profile:           { ar: "الملف الشخصي",         en: "Profile" },

  settings:          { ar: "الإعدادات",             en: "Settings" },

  logout:            { ar: "تسجيل الخروج",         en: "Logout" },

  adminUser:         { ar: "المدير العام",          en: "Administrator" },

  home:              { ar: "الرئيسية",              en: "Home" },

  // ── Sales/receipts/journal minimal (top-level) ────────

  invoiceNo:         { ar: "رقم الفاتورة", en: "Invoice No" },

  receiptNo:         { ar: "رقم السند",    en: "Voucher No" },

  journalNo:         { ar: "رقم القيد",    en: "Journal No" },

  customer:          { ar: "العميل",        en: "Customer" },

  supplier:          { ar: "المورد",        en: "Supplier" },

  draft:             { ar: "مسودة",         en: "Draft" },

  posted:            { ar: "مرحّل",         en: "Posted" },

  voided:            { ar: "ملغى",          en: "Voided" },

  account:           { ar: "الحساب",        en: "Account" },

  accountType:       { ar: "نوع الحساب",    en: "Account Type" },

  asset:             { ar: "أصل",           en: "Asset" },

  liability:         { ar: "التزام",        en: "Liability" },

  equity:            { ar: "حقوق ملكية",    en: "Equity" },

  revenue:           { ar: "إيراد",         en: "Revenue" },

  expense:           { ar: "مصروف",         en: "Expense" },

  // ── Journal / receipt form extras ─────────────────────

  newJournalEntry:   { ar: "قيد يومية جديد",    en: "New Journal Entry" },

  newReceiptVoucher: { ar: "سند قبض جديد",     en: "New Receipt Voucher" },

  journalType:       { ar: "نوع القيد",         en: "Journal Type" },

  jtGeneral:         { ar: "قيد عام",           en: "General" },

  jtCash:            { ar: "قيد نقدي",          en: "Cash" },

  jtExpenses:        { ar: "قيد مصروفات",       en: "Expenses" },

  jtAdjustments:     { ar: "قيد تسوية",         en: "Adjustments" },

  jtOpening:         { ar: "رصيد افتتاحي",      en: "Opening Balance" },

  selectAccount:     { ar: "— اختر حساباً —",  en: "— Select account —" },

  selectCustomer:    { ar: "— اختر عميلاً —",  en: "— Select customer —" },

  narration:         { ar: "البيان",            en: "Narration" },

  addLine:           { ar: "إضافة سطر",         en: "Add line" },

  totalDebit:        { ar: "إجمالي المدين",     en: "Total Debit" },

  totalCredit:       { ar: "إجمالي الدائن",     en: "Total Credit" },

  difference:        { ar: "الفرق",             en: "Difference" },

  entryUnbalanced:   { ar: "القيد غير متوازن",  en: "Entry is not balanced" },

  entryBalanced:     { ar: "القيد متوازن",      en: "Entry is balanced" },

  postImmediately:   { ar: "ترحيل فوري",        en: "Post immediately" },

  saveDraft:         { ar: "حفظ كمسودة",        en: "Save as draft" },

  allTypes:          { ar: "جميع الأنواع",      en: "All types" },

  allStatuses:       { ar: "جميع الحالات",      en: "All statuses" },

  statusDraft:       { ar: "مسودة",             en: "Draft" },

  statusPosted:      { ar: "مرحّل",             en: "Posted" },

  statusReversed:    { ar: "معكوس",             en: "Reversed" },

  statusUnposted:    { ar: "غير مرحل",          en: "Unposted" },

  statusUnallocated: { ar: "غير مخصص",          en: "Unallocated" },

  statusPartial:     { ar: "جزئي",              en: "Partial" },

  statusFull:        { ar: "مخصص كاملاً",       en: "Fully allocated" },

  fromDate:          { ar: "من",                en: "From" },

  toDate:            { ar: "إلى",               en: "To" },

  receivedFrom:      { ar: "مستلم من",          en: "Received from" },

  receiptType:       { ar: "نوع الإيصال",        en: "Receipt Type" },

  rtCustomerPayment: { ar: "دفعة عميل",          en: "Customer payment" },

  rtOther:           { ar: "إيصال آخر",          en: "Other receipt" },

  paymentMethod:     { ar: "طريقة الدفع",        en: "Payment Method" },

  pmCash:            { ar: "نقد",                en: "Cash" },

  pmTransfer:        { ar: "تحويل بنكي",         en: "Bank transfer" },

  pmCard:            { ar: "بطاقة",              en: "Card" },

  pmCheque:          { ar: "شيك",                en: "Cheque" },

  cashOrBankAccount: { ar: "حساب الصندوق/البنك", en: "Cash / Bank Account" },

  errMustSelectCashAccount: { ar: "يجب اختيار حساب الصندوق/البنك", en: "Please select a cash/bank account" },

  errInvalidAmount:  { ar: "المبلغ غير صحيح",    en: "Invalid amount" },

  errNeedDescription:{ ar: "يجب إدخال وصف القيد", en: "Description is required" },

  autoGenerated:     { ar: "تلقائي",             en: "Auto" },

  manual:            { ar: "يدوي",               en: "Manual" },

  source:            { ar: "المصدر",             en: "Source" },

  reverse:           { ar: "عكس",                en: "Reverse" },

  entryCount:        { ar: "قيد",                en: "entries" },

  receiptCount:      { ar: "سند",                en: "vouchers" },

  totalReceipts:     { ar: "إجمالي المقبوضات",   en: "Total Receipts" },

  salesInvoicesTitleCount: { ar: "فاتورة", en: "invoices" },

  // ── Cash Payments (CPV) ───────────────────────────────

  cashPaymentsTitle:    { ar: "سندات الصرف",          en: "Cash Payments" },

  newPayment:           { ar: "سند صرف جديد",          en: "New Payment" },

  newPaymentVoucher:    { ar: "إنشاء سند صرف",         en: "New Payment Voucher" },

  paidTo:               { ar: "مدفوع إلى",              en: "Paid To" },

  paymentType:          { ar: "نوع الدفعة",             en: "Payment Type" },

  ptSupplierPayment:    { ar: "دفعة مورد",              en: "Supplier payment" },

  ptExpensePayment:     { ar: "مصروف",                  en: "Expense payment" },

  ptOther:              { ar: "أخرى",                   en: "Other" },

  paymentNo:            { ar: "رقم سند الصرف",          en: "Payment No" },

  paymentCount:         { ar: "سند",                    en: "payments" },

  totalPayments:        { ar: "إجمالي المدفوعات",       en: "Total Payments" },

  selectSupplier:       { ar: "— اختر مورداً —",        en: "— Select supplier —" },

  // ── Cheques ───────────────────────────────────────────

  chequesTitle:         { ar: "إدارة الشيكات",          en: "Cheques" },

  newCheque:            { ar: "شيك جديد",               en: "New Cheque" },

  newChequeForm:        { ar: "إضافة شيك",              en: "Add Cheque" },

  chequeNo:             { ar: "رقم الشيك",              en: "Cheque No" },

  chequeType:           { ar: "نوع الشيك",              en: "Cheque Type" },

  chequeTypeReceived:   { ar: "مستلم",                  en: "Received" },

  chequeTypeIssued:     { ar: "صادر",                   en: "Issued" },

  chequeDate:           { ar: "تاريخ الشيك",            en: "Cheque Date" },

  chequeStatus:         { ar: "حالة الشيك",             en: "Cheque Status" },

  drawerName:           { ar: "اسم الساحب",             en: "Drawer Name" },

  bankName:             { ar: "اسم البنك",              en: "Bank Name" },

  draweeBank:           { ar: "بنك المسحوب عليه",       en: "Drawee Bank" },

  chequeCount:          { ar: "شيك",                    en: "cheques" },

  totalCheques:         { ar: "إجمالي الشيكات",         en: "Total Cheques" },

  receivedCheques:      { ar: "شيكات مستلمة",           en: "Received Cheques" },

  issuedCheques:        { ar: "شيكات صادرة",            en: "Issued Cheques" },

  allCheques:           { ar: "جميع الشيكات",           en: "All Cheques" },

  updateStatus:         { ar: "تحديث الحالة",           en: "Update Status" },

  markDeposited:        { ar: "إيداع",                  en: "Deposit" },

  markCleared:          { ar: "تحصيل",                  en: "Cleared" },

  markBounced:          { ar: "مرتجع",                  en: "Bounced" },

  markPresented:        { ar: "مُقدَّم",                en: "Presented" },

  markClearedIssued:    { ar: "منصرف",                  en: "Cleared (Issued)" },

  markStopped:          { ar: "موقوف",                  en: "Stopped" },

  dueDate:              { ar: "تاريخ الاستحقاق",        en: "Due Date" },

  glAccount:            { ar: "الحساب المرتبط",         en: "GL Account" },

  bankAccount:          { ar: "حساب البنك",             en: "Bank Account" },

  navTreasury: { ar: "الخزينة", en: "Treasury" },
  navSales: { ar: "المبيعات", en: "Sales" },
  navPurchases: { ar: "المشتريات", en: "Purchases" },
  navInventory: { ar: "المخزون", en: "Inventory" },
  navReports: { ar: "التقارير", en: "Reports" },
  navSettings: { ar: "الإعدادات", en: "Settings" },
  userManagement: { ar: "إدارة المستخدمين", en: "User Management" },
  cashPayments: { ar: "سندات الصرف", en: "Cash Payments" },
  cheques: { ar: "الشيكات", en: "Cheques" },
  bankTransfers: { ar: "التحويلات البنكية", en: "Bank Transfers" },
  purchaseInvoices: { ar: "فواتير المشتريات", en: "Purchase Invoices" },
  grn: { ar: "استلام البضاعة", en: "Goods Receipts" },
  warehouses: { ar: "المستودعات", en: "Warehouses" },
  stockAdjustments: { ar: "تعديلات المخزون", en: "Stock Adjustments" },
  trialBalance: { ar: "ميزان المراجعة", en: "Trial Balance" },
  generalLedger: { ar: "دفتر الأستاذ", en: "General Ledger" },
  arAging: { ar: "عمر الذمم - عملاء", en: "AR Aging" },
  apAging: { ar: "عمر الذمم - موردون", en: "AP Aging" },
  bankTransfersTitle: { ar: "التحويلات البنكية", en: "Bank Transfers" },
  purchaseInvoicesTitle: { ar: "فواتير المشتريات", en: "Purchase Invoices" },
  grnTitle: { ar: "سندات استلام البضاعة", en: "Goods Receipt Notes" },
  warehousesTitle: { ar: "المستودعات", en: "Warehouses" },
  stockAdjustmentsTitle: { ar: "تعديلات المخزون", en: "Stock Adjustments" },
  trialBalanceTitle: { ar: "ميزان المراجعة", en: "Trial Balance" },
  generalLedgerTitle: { ar: "دفتر الأستاذ العام", en: "General Ledger" },
  arAgingTitle: { ar: "تقرير عمر الذمم - العملاء", en: "AR Aging Report" },
  apAgingTitle: { ar: "تقرير عمر الذمم - الموردون", en: "AP Aging Report" },
  reportPostedOnly: { ar: "يعرض القيود المرحلة فقط", en: "Posted entries only" },
  includeZeroBalances: { ar: "تضمين الحسابات ذات الرصيد الصفري", en: "Include zero balances" },
  asOfDate: { ar: "بتاريخ", en: "As of date" },
  openingBalance: { ar: "رصيد أول المدة", en: "Opening Balance" },
  closingBalance: { ar: "رصيد آخر المدة", en: "Closing Balance" },
  openingDebit: { ar: "مدين أول المدة", en: "Opening Dr" },
  openingCredit: { ar: "دائن أول المدة", en: "Opening Cr" },
  closingDebit: { ar: "مدين آخر المدة", en: "Closing Dr" },
  closingCredit: { ar: "دائن آخر المدة", en: "Closing Cr" },
  accountCode: { ar: "كود الحساب", en: "Account Code" },
  selectAccountToView: { ar: "اختر حسابًا لعرض حركاته", en: "Select an account to view its movements" },
  current: { ar: "حالي", en: "Current" },
  aging30: { ar: "1-30 يوم", en: "1-30 Days" },
  aging60: { ar: "31-60 يوم", en: "31-60 Days" },
  aging90: { ar: "61-90 يوم", en: "61-90 Days" },
  agingOver90: { ar: "أكثر من 90 يوم", en: "Over 90 Days" },
  invoiceCount: { ar: "فاتورة", en: "invoices" },
  fromAccount: { ar: "من حساب", en: "From Account" },
  toAccount: { ar: "إلى حساب", en: "To Account" },
  newGRN: { ar: "سند استلام جديد", en: "New GRN" },
  grnNo: { ar: "رقم الاستلام", en: "GRN No." },
  warehouse: { ar: "المستودع", en: "Warehouse" },
  item: { ar: "الصنف", en: "Item" },
  quantity: { ar: "الكمية", en: "Quantity" },
  unitCost: { ar: "سعر الوحدة", en: "Unit Cost" },
  statusApproved: { ar: "معتمد", en: "Approved" },
  statusCancelled: { ar: "ملغى", en: "Cancelled" },
  errRequiredFields: { ar: "يرجى تعبئة الحقول المطلوبة", en: "Please fill required fields" },
  total: { ar: "الإجمالي", en: "Total" },
  branch: { ar: "الفرع", en: "Branch" },

  // ── Sales Invoice form ────────────────────────────────
  invoiceDate:      { ar: "تاريخ الفاتورة",     en: "Invoice Date" },
  invoiceType:      { ar: "نوع الفاتورة",        en: "Invoice Type" },
  cash:             { ar: "نقدي",                en: "Cash" },
  creditSale:       { ar: "آجل",                 en: "Credit" },
  lines:            { ar: "الأصناف",             en: "Lines" },
  unitPrice:        { ar: "سعر الوحدة",          en: "Unit Price" },
  lineTotal:        { ar: "إجمالي السطر",        en: "Line Total" },
  subtotal:         { ar: "المجموع الفرعي",      en: "Subtotal" },
  removeLine:       { ar: "حذف السطر",           en: "Remove line" },
  saveAsDraft:      { ar: "حفظ كمسودة",          en: "Save as Draft" },
  post:             { ar: "ترحيل",               en: "Post" },
  outlet:           { ar: "منفذ البيع",          en: "Outlet" },
  selectWarehouse:  { ar: "— اختر مستودعاً —",  en: "— Select warehouse —" },
  selectItem:       { ar: "— اختر صنفاً —",      en: "— Select item —" },
  selectOutlet:     { ar: "— اختر منفذاً —",    en: "— Select outlet —" },
  newSalesInvoice:  { ar: "فاتورة مبيعات جديدة", en: "New Sales Invoice" },
  errNoLines:       { ar: "أضف صنفاً واحداً على الأقل",       en: "Add at least one line" },
  errNoCustomer:    { ar: "يجب اختيار العميل للفواتير الآجلة", en: "Customer is required for credit invoices" },
  errNoWarehouse:   { ar: "يجب اختيار المستودع",               en: "Warehouse is required" },
  posting:          { ar: "جار الترحيل...",      en: "Posting..." },
  postingStatus:    { ar: "حالة الترحيل",        en: "Posting Status" },

  // ── Bank Transfers ────────────────────────────────────────
  newBankTransfer:    { ar: "تحويل بنكي جديد",       en: "New Bank Transfer" },
  transferDate:       { ar: "تاريخ التحويل",          en: "Transfer Date" },
  transferAmount:     { ar: "مبلغ التحويل",           en: "Transfer Amount" },
  selectBankAccount:  { ar: "— اختر حساباً بنكياً —", en: "— Select bank account —" },
  errSameAccount:     { ar: "لا يمكن التحويل من وإلى نفس الحساب", en: "From and To accounts must be different" },

  // ── Purchase Invoice form ──────────────────────────────
  newPurchaseInvoice: { ar: "فاتورة مشتريات جديدة", en: "New Purchase Invoice" },
  errNoSupplier:    { ar: "يجب اختيار المورد",              en: "Supplier is required" },

  // ── Warehouses CRUD ───────────────────────────────────
  newWarehouse:     { ar: "مستودع جديد",           en: "New Warehouse" },
  warehouseCode:    { ar: "كود المستودع",           en: "Warehouse Code" },
  editWarehouse:    { ar: "تعديل المستودع",         en: "Edit Warehouse" },
  toggleActive:     { ar: "تبديل الحالة",           en: "Toggle Active" },
  warehouseType:    { ar: "نوع المستودع",           en: "Warehouse Type" },
  wtMain:           { ar: "رئيسي",                  en: "Main" },
  wtTransit:        { ar: "عبور",                   en: "Transit" },
  wtWaste:          { ar: "هوالك",                  en: "Waste" },

  // ── Customer Outlets ──────────────────────────────────
  outlets:           { ar: "منافذ التوصيل",     en: "Outlets" },
  customerOutlets:   { ar: "منافذ توصيل العميل", en: "Customer Outlets" },
  outletCode:        { ar: "كود المنفذ",         en: "Outlet Code" },
  addOutlet:         { ar: "إضافة منفذ",         en: "Add Outlet" },
  editOutlet:        { ar: "تعديل المنفذ",        en: "Edit Outlet" },
  noOutlets:         { ar: "لا توجد منافذ توصيل بعد", en: "No delivery locations yet" },
  addFirstOutlet:    { ar: "أضف أول منفذ توصيل",      en: "Add first delivery location" },
  deliveryNotes:     { ar: "ملاحظات التوصيل",    en: "Delivery Notes" },
  contactPerson:     { ar: "الشخص المسؤول",      en: "Contact Person" },
  outletAddress:     { ar: "عنوان المنفذ",        en: "Outlet Address" },
  outletName:        { ar: "اسم المنفذ",          en: "Outlet Name" },
  manageOutlets:     { ar: "إدارة المنافذ",       en: "Manage Outlets" },
  hideOutlets:       { ar: "إخفاء المنافذ",       en: "Hide Outlets" },

  // ── Inventory Adjustments ────────────────────────────
  newAdjustment:    { ar: "تسوية جديدة",            en: "New Adjustment" },
  adjustmentDate:   { ar: "تاريخ التسوية",          en: "Adjustment Date" },
  adjustmentType:   { ar: "نوع التسوية",            en: "Adjustment Type" },
  increase:         { ar: "زيادة",                  en: "Increase" },
  decrease:         { ar: "نقص",                    en: "Decrease" },
  reason:           { ar: "السبب",                  en: "Reason" },
  totalCost:        { ar: "إجمالي التكلفة",         en: "Total Cost" },
  adjustmentNumber: { ar: "رقم التسوية",            en: "Adjustment No" },
  errNoWarehouseAdj:{ ar: "يجب اختيار المستودع",   en: "Warehouse is required" },
  errNoAdjLines:    { ar: "أضف صنفاً واحداً على الأقل", en: "Add at least one line" },
  errNoAdjAccount:  { ar: "لا يوجد حساب مخزون (1401). تحقق من دليل الحسابات.", en: "No inventory account (1401) found. Check chart of accounts." },

  // ── Auth / Permissions ───────────────────────────────
  accessDenied:      { ar: "رفض الوصول",               en: "Access Denied" },
  permissionDenied:  { ar: "ليس لديك صلاحية لهذا الإجراء", en: "You don't have permission for this action" },
  changePassword:    { ar: "تغيير كلمة المرور",         en: "Change Password" },
  currentPassword:   { ar: "كلمة المرور الحالية",        en: "Current Password" },
  newPassword:       { ar: "كلمة المرور الجديدة",        en: "New Password" },
  confirmPassword:   { ar: "تأكيد كلمة المرور",         en: "Confirm Password" },

  // ── Role labels ───────────────────────────────────────
  roleAdmin:         { ar: "مدير النظام",    en: "Admin" },
  roleAccountant:    { ar: "محاسب",          en: "Accountant" },
  roleSales:         { ar: "مبيعات",         en: "Sales" },
  roleWarehouse:     { ar: "مستودع",         en: "Warehouse" },
  roleViewer:        { ar: "مشاهد",          en: "Viewer" },
  roleManager:       { ar: "مدير",           en: "Manager" },
  roleCashier:       { ar: "أمين صندوق",     en: "Cashier" },

  // ── Users Management ─────────────────────────────────────────────────────────
  usersManagement:   { ar: "إدارة المستخدمين",    en: "User Management" },
  addUser:           { ar: "إضافة مستخدم",         en: "Add User" },
  editUser:          { ar: "تعديل مستخدم",          en: "Edit User" },
  resetPassword:     { ar: "إعادة تعيين كلمة المرور", en: "Reset Password" },
  userEmail:         { ar: "البريد الإلكتروني",    en: "Email" },
  userName:          { ar: "اسم المستخدم",          en: "User Name" },
  userRole:          { ar: "الدور",                 en: "Role" },
  selectRole:        { ar: "اختر الدور",            en: "Select Role" },
  selectBranches:    { ar: "اختر الفروع",           en: "Select Branches" },
  userCreated:       { ar: "تم إنشاء المستخدم بنجاح", en: "User created successfully" },
  userUpdated:       { ar: "تم تحديث المستخدم بنجاح", en: "User updated successfully" },
  passwordReset:     { ar: "تم إعادة تعيين كلمة المرور", en: "Password reset successfully" },
  cannotEditOwnRole: { ar: "لا يمكنك تغيير دورك الخاص", en: "You cannot change your own role" },
  emailExists:       { ar: "البريد الإلكتروني مسجّل مسبقاً", en: "Email already registered" },
  passwordMismatch:  { ar: "كلمتا المرور غير متطابقتين", en: "Passwords do not match" },
  passwordTooShort:  { ar: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", en: "Password must be at least 6 characters" },
  statusActive:      { ar: "نشط",                   en: "Active" },
  statusInactive:    { ar: "غير نشط",               en: "Inactive" },
  noUsersYet:        { ar: "لا يوجد مستخدمون بعد", en: "No users yet" },
  passwordLabel:     { ar: "كلمة المرور",            en: "Password" },
  confirmPasswordLabel: { ar: "تأكيد كلمة المرور",  en: "Confirm Password" },
  branches:          { ar: "الفروع",                 en: "Branches" },
  newPasswordLabel:  { ar: "كلمة المرور الجديدة",    en: "New Password" },
  allRoles:          { ar: "جميع الأدوار",           en: "All Roles" },
  showInactive:      { ar: "عرض غير النشطين",        en: "Show Inactive" },
  deactivateUser:    { ar: "تعطيل المستخدم",         en: "Deactivate User" },
  activateUser:      { ar: "تفعيل المستخدم",         en: "Activate User" },
  records:           { ar: "سجل",                    en: "record(s)" },

  // ── Audit Log ─────────────────────────────────────────
  auditLog:          { ar: "سجل التدقيق",        en: "Audit Log" },
  auditLogs:         { ar: "سجلات التدقيق",      en: "Audit Logs" },
  actionCreate:      { ar: "إنشاء",              en: "Create" },
  actionPost:        { ar: "ترحيل",              en: "Post" },
  actionEdit:        { ar: "تعديل",              en: "Edit" },
  actionDelete:      { ar: "حذف",               en: "Delete" },
  actionLogin:       { ar: "تسجيل دخول",        en: "Login" },
  actionLogout:      { ar: "تسجيل خروج",        en: "Logout" },
  moduleSales:       { ar: "المبيعات",           en: "Sales" },
  modulePurchases:   { ar: "المشتريات",          en: "Purchases" },
  moduleTreasury:    { ar: "الخزينة",            en: "Treasury" },
  moduleInventory:   { ar: "المخزون",            en: "Inventory" },
  moduleFinance:     { ar: "المحاسبة",           en: "Finance" },
  moduleAuth:        { ar: "المصادقة",           en: "Auth" },
  documentType:      { ar: "نوع المستند",        en: "Document Type" },
  noAuditLogs:       { ar: "لا توجد سجلات تدقيق", en: "No audit logs found" },

  // ── Financial Reports ─────────────────────────────────────────────────────
  incomeStatement:          { ar: "قائمة الدخل",                         en: "Income Statement" },
  balanceSheet:             { ar: "الميزانية العمومية",                  en: "Balance Sheet" },
  revenues:                 { ar: "الإيرادات",                           en: "Revenue" },
  expenses:                 { ar: "المصروفات",                           en: "Expenses" },
  netIncome:                { ar: "صافي الربح",                          en: "Net Income" },
  netLoss:                  { ar: "صافي الخسارة",                        en: "Net Loss" },
  totalRevenue:             { ar: "إجمالي الإيرادات",                    en: "Total Revenue" },
  totalExpenses:            { ar: "إجمالي المصروفات",                    en: "Total Expenses" },
  assets:                   { ar: "الأصول",                              en: "Assets" },
  liabilities:              { ar: "الالتزامات",                          en: "Liabilities" },
  equitySection:            { ar: "حقوق الملكية",                        en: "Equity" },
  totalAssets:              { ar: "إجمالي الأصول",                       en: "Total Assets" },
  totalLiabilities:         { ar: "إجمالي الالتزامات",                   en: "Total Liabilities" },
  totalEquity:              { ar: "إجمالي حقوق الملكية",                 en: "Total Equity" },
  totalLiabilitiesAndEquity:{ ar: "إجمالي الالتزامات وحقوق الملكية",    en: "Total Liabilities & Equity" },
  retainedEarnings:         { ar: "أرباح محتجزة",                       en: "Retained Earnings" },
  currentPeriodIncome:      { ar: "أرباح الفترة الحالية",                en: "Current Period Income" },
  balanced:                 { ar: "متوازنة",                             en: "Balanced" },
  unbalanced:               { ar: "غير متوازنة",                         en: "Unbalanced" },
  asOfDateLabel:            { ar: "كما في تاريخ",                        en: "As of Date" },
  period:                   { ar: "الفترة",                              en: "Period" },
  allBranches:              { ar: "كل الفروع",                           en: "All Branches" },
  currentBranch:            { ar: "الفرع الحالي",                        en: "Current Branch" },
  switchBranch:             { ar: "تغيير الفرع",                         en: "Switch Branch" },
  hideZeroBalances:         { ar: "إخفاء الأرصدة الصفرية",               en: "Hide Zero Balances" },
  printReport:              { ar: "طباعة التقرير",                       en: "Print Report" },
  incomeStatementTitle:     { ar: "قائمة الدخل",                         en: "Income Statement" },
  balanceSheetTitle:        { ar: "الميزانية العمومية",                  en: "Balance Sheet" },

  // ── Legacy Data Section ───────────────────────────────────────────────────────
  navLegacy:              { ar: "بيانات قديمة",             en: "Legacy Data" },
  legacyItems:            { ar: "أصناف قديمة",              en: "Legacy Items" },
  legacyRecipes:          { ar: "وصفات قديمة",              en: "Legacy Recipes" },
  legacyInventory:        { ar: "مخزون قديم",               en: "Legacy Inventory" },
  legacyPL:               { ar: "أرباح وخسائر قديمة",       en: "Legacy P&L" },
  legacyStaff:            { ar: "موظفون قدامى",             en: "Legacy Staff" },
  legacyItemsTitle:       { ar: "الأصناف القديمة",          en: "Legacy Items" },
  legacyRecipesTitle:     { ar: "الوصفات القديمة",          en: "Legacy Recipes" },
  legacyInventoryTitle:   { ar: "لقطة المخزون القديمة",     en: "Legacy Inventory Snapshot" },
  legacyPLTitle:          { ar: "لقطة الأرباح والخسائر",   en: "Legacy P&L Snapshot" },
  legacyStaffTitle:       { ar: "بيانات الموظفين القديمة",  en: "Legacy Staff Snapshot" },
  legacyDashboardTitle:   { ar: "مساحة البيانات القديمة",   en: "Legacy Workspace" },
  legacyDashboardSubtitle:{ ar: "استعراض وإدارة البيانات المستوردة من ملفات Excel", en: "Review and manage data imported from Excel files" },
  itemGroup:              { ar: "مجموعة الصنف",             en: "Item Group" },
  sourceFile:             { ar: "الملف المصدر",             en: "Source File" },
  reviewStatus:           { ar: "حالة المراجعة",            en: "Review Status" },
  fgCode:                 { ar: "كود المنتج",               en: "FG Code" },
  fgName:                 { ar: "اسم المنتج",               en: "FG Name" },
  componentCode:          { ar: "كود المكوّن",              en: "Component Code" },
  componentName:          { ar: "اسم المكوّن",              en: "Component Name" },
  componentUom:           { ar: "وحدة المكوّن",             en: "Component UOM" },
  branchName:             { ar: "اسم الفرع",                en: "Branch Name" },
  openingQty:             { ar: "كمية الافتتاح",            en: "Opening Qty" },
  totalReceivedQty:       { ar: "إجمالي المستلم",           en: "Total Received Qty" },
  totalOutQty:            { ar: "إجمالي الصادر",            en: "Total Out Qty" },
  balanceQty:             { ar: "كمية الرصيد",              en: "Balance Qty" },
  balanceValue:           { ar: "قيمة الرصيد",              en: "Balance Value" },
  metricName:             { ar: "اسم المقياس",              en: "Metric Name" },
  excelValue:             { ar: "القيمة",                   en: "Value" },
  periodLabel:            { ar: "الفترة",                   en: "Period" },
  extraLabel:             { ar: "تسمية إضافية",             en: "Extra Label" },
  employeeNo:             { ar: "رقم الموظف",               en: "Employee No" },
  employeeName:           { ar: "اسم الموظف",               en: "Employee Name" },
  position:               { ar: "المسمى الوظيفي",           en: "Position" },
  location:               { ar: "الموقع",                   en: "Location" },
  basic:                  { ar: "الراتب الأساسي",           en: "Basic" },
  allowances:             { ar: "البدلات",                  en: "Allowances" },
  totalPackage:           { ar: "إجمالي الراتب",            en: "Total Package" },
  rsImported:             { ar: "مستورد",                   en: "Imported" },
  rsReviewed:             { ar: "تمت المراجعة",             en: "Reviewed" },
  rsCleaned:              { ar: "تم التنظيف",               en: "Cleaned" },
  rsMapped:               { ar: "تم الربط",                 en: "Mapped" },
  filterBySourceFile:     { ar: "تصفية بالملف",             en: "Filter by File" },
  filterByStatus:         { ar: "تصفية بالحالة",            en: "Filter by Status" },
  filterByBranch:         { ar: "تصفية بالفرع",             en: "Filter by Branch" },
  filterByLocation:       { ar: "تصفية بالموقع",            en: "Filter by Location" },
  allFiles:               { ar: "كل الملفات",               en: "All Files" },
  allStatuses3:           { ar: "كل الحالات",               en: "All Statuses" },
  allBranches2:           { ar: "كل الفروع",                en: "All Branches" },
  allLocations:           { ar: "كل المواقع",               en: "All Locations" },
  noLegacyItems:          { ar: "لا توجد أصناف قديمة",      en: "No legacy items found" },
  noLegacyRecipes:        { ar: "لا توجد وصفات قديمة",      en: "No legacy recipes found" },
  noLegacyInventory:      { ar: "لا توجد بيانات مخزون",     en: "No inventory data found" },
  noLegacyPL:             { ar: "لا توجد بيانات أرباح",     en: "No P&L data found" },
  noLegacyStaff:          { ar: "لا توجد بيانات موظفين",    en: "No staff data found" },
  markAsReviewed:         { ar: "تحديد كمراجَع",            en: "Mark as Reviewed" },
  markAsCleaned:          { ar: "تحديد كمُنقَّح",           en: "Mark as Cleaned" },
  markAsMapped:           { ar: "تحديد كمربوط",             en: "Mark as Mapped" },
  editRecord:             { ar: "تعديل السجل",              en: "Edit Record" },
  saveChanges:            { ar: "حفظ التغييرات",            en: "Save Changes" },
  updatedBy:              { ar: "حُدِّث بواسطة",            en: "Updated By" },
  updatedAt:              { ar: "تاريخ التحديث",            en: "Updated At" },
  progress:               { ar: "التقدم",                   en: "Progress" },
  reviewed:               { ar: "مراجَعة",                  en: "Reviewed" },
  cleaned:                { ar: "منقّحة",                   en: "Cleaned" },
  mapped:                 { ar: "مربوطة",                   en: "Mapped" },
  totals:                 { ar: "الإجماليات",               en: "Totals" },
  groupByFG:              { ar: "تجميع بالمنتج",            en: "Group by FG" },

  // ── Legacy Workspace hardening ─────────────────────────────────────────────
  legacyWarningBannerEN:  { ar: "Legacy Workspace — Reference / Review / Mapping Only. This data does not affect accounting operations or reports.", en: "Legacy Workspace — Reference / Review / Mapping Only. This data does not affect accounting operations or reports." },
  legacyWarningBannerAR:  { ar: "مساحة البيانات القديمة — للمراجعة والربط المرجعي فقط. هذه البيانات لا تؤثر على العمليات المحاسبية أو التقارير.", en: "مساحة البيانات القديمة — للمراجعة والربط المرجعي فقط. هذه البيانات لا تؤثر على العمليات المحاسبية أو التقارير." },
  legacyAccessDeniedMsg:  { ar: "هذه الصفحة متاحة للمشرفين فقط.", en: "This page is available to administrators only." },
  goHome:                 { ar: "الذهاب للرئيسية",          en: "Go Home" },
  rsArchived:             { ar: "مؤرشف",                    en: "Archived" },
  mappedItem:             { ar: "الصنف المربوط",            en: "Mapped Item" },
  mappedOutputItem:       { ar: "المنتج النهائي المربوط",   en: "Mapped Output Item" },
  mappedUser:             { ar: "المستخدم المربوط",         en: "Mapped User" },
  mappedWarehouse:        { ar: "المخزن المربوط",           en: "Mapped Warehouse" },
  mappedAccount:          { ar: "الحساب المربوط",           en: "Mapped Account" },
  completionPct:          { ar: "نسبة اكتمال الربط",        en: "Mapping Completion" },
  recentChanges:          { ar: "التغييرات الأخيرة",        en: "Recent Changes" },
  overallProgress:        { ar: "التقدم الإجمالي",          en: "Overall Progress" },

  // ── Print / Invoice Detail ─────────────────────────────────────────────────
  printInvoice:     { ar: "طباعة الفاتورة",         en: "Print Invoice" },
  invoiceDetails:   { ar: "تفاصيل الفاتورة",         en: "Invoice Details" },
  billTo:           { ar: "فاتورة إلى",               en: "Bill To" },
  invoiceNumber:    { ar: "رقم الفاتورة",             en: "Invoice Number" },
  signatureLine:    { ar: "التوقيع",                  en: "Signature" },
  preparedBy:       { ar: "أعد بواسطة",               en: "Prepared By" },
  approvedBy:       { ar: "اعتمد بواسطة",             en: "Approved By" },
  companyNameLabel: { ar: "اسم الشركة",               en: "Company Name" },
  outletLabel:      { ar: "منفذ التوصيل",             en: "Delivery Outlet" },
  grandTotal:       { ar: "الإجمالي الكلي",           en: "Grand Total" },
  taxAmount:        { ar: "ضريبة القيمة المضافة",     en: "VAT" },
  backToList:       { ar: "العودة إلى القائمة",       en: "Back to List" },
  notFound:         { ar: "لم يُعثر على الفاتورة",   en: "Invoice not found" },
  uom:              { ar: "الوحدة",                   en: "UOM" },
  itemCode:         { ar: "كود الصنف",                en: "Item Code" },

  // ── Returns (Sales & Purchase) ────────────────────────────────────────────
  salesReturns:     { ar: "مرتجعات المبيعات",       en: "Sales Returns" },
  purchaseReturns:  { ar: "مرتجعات المشتريات",      en: "Purchase Returns" },
  newReturn:        { ar: "مرتجع جديد",              en: "New Return" },
  originalInvoice:  { ar: "الفاتورة الأصلية",        en: "Original Invoice" },
  returnDate:       { ar: "تاريخ المرتجع",           en: "Return Date" },
  returnNumber:     { ar: "رقم المرتجع",             en: "Return Number" },
  returnReason:     { ar: "سبب الإرجاع",             en: "Return Reason" },
  returnQuantity:   { ar: "الكمية المرتجعة",         en: "Return Quantity" },
  maxQuantity:      { ar: "الحد الأقصى",             en: "Max Quantity" },
  selectInvoice:    { ar: "اختر الفاتورة",           en: "Select Invoice" },
  noReturnsYet:     { ar: "لا توجد مرتجعات بعد",     en: "No returns yet" },
  returnPosted:     { ar: "تم ترحيل المرتجع",        en: "Return posted" },
  returnCreated:    { ar: "تم إنشاء المرتجع",        en: "Return created" },
  errNoInvoice:     { ar: "يجب اختيار فاتورة أصلية", en: "Select an original invoice" },

  // ── Fiscal Years ─────────────────────────────────────────────────────────
  fiscalYears:           { ar: "السنوات المالية",          en: "Fiscal Years" },
  fiscalYearsTitle:      { ar: "إدارة السنوات المالية",     en: "Fiscal Year Management" },
  fiscalYearsSubtitle:   { ar: "إنشاء وإدارة السنوات والفترات المالية", en: "Create and manage fiscal years and periods" },
  newFiscalYear:         { ar: "سنة مالية جديدة",          en: "New Fiscal Year" },
  fiscalYearName:        { ar: "اسم السنة المالية",         en: "Fiscal Year Name" },
  fiscalYearCode:        { ar: "كود السنة",                en: "Year Code" },
  fiscalYearStart:       { ar: "تاريخ البداية",            en: "Start Date" },
  fiscalYearEnd:         { ar: "تاريخ النهاية",            en: "End Date" },
  fiscalYearStatus:      { ar: "الحالة",                   en: "Status" },
  closeFiscalYear:       { ar: "إغلاق السنة المالية",      en: "Close Fiscal Year" },
  closePeriod:           { ar: "إغلاق الفترة",             en: "Close Period" },
  reopenPeriod:          { ar: "إعادة فتح الفترة",         en: "Reopen Period" },
  periodName:            { ar: "اسم الفترة",               en: "Period Name" },
  noFiscalYearsYet:      { ar: "لا توجد سنوات مالية بعد", en: "No fiscal years yet" },
  fiscalYearCreated:     { ar: "تم إنشاء السنة المالية",   en: "Fiscal year created" },
  fiscalYearClosed:      { ar: "تم إغلاق السنة المالية",   en: "Fiscal year closed" },
  periodClosed:          { ar: "تم إغلاق الفترة",          en: "Period closed" },
  periodReopened:        { ar: "تم إعادة فتح الفترة",      en: "Period reopened" },
  confirmClosePeriod:    { ar: "هل أنت متأكد من إغلاق هذه الفترة؟", en: "Are you sure you want to close this period?" },
  confirmReopenPeriod:   { ar: "هل أنت متأكد من إعادة فتح هذه الفترة؟", en: "Are you sure you want to reopen this period?" },
  confirmCloseFiscalYear: { ar: "هل أنت متأكد من إغلاق هذه السنة المالية؟ سيتم إغلاق جميع فتراتها.", en: "Are you sure you want to close this fiscal year? All open periods will be closed." },
  monthlyPeriods:        { ar: "الفترات الشهرية",          en: "Monthly Periods" },
  showPeriods:           { ar: "عرض الفترات",              en: "Show Periods" },
  hidePeriods:           { ar: "إخفاء الفترات",            en: "Hide Periods" },

  // ── Audit Log column headers ──────────────────────────────────────────────
  timestamp:             { ar: "الوقت",                    en: "Timestamp" },
  action:                { ar: "الإجراء",                  en: "Action" },
  module:                { ar: "الوحدة",                   en: "Module" },
  documentId:            { ar: "معرّف المستند",            en: "Document ID" },
  allModules:            { ar: "كل الوحدات",               en: "All Modules" },
  allActions:            { ar: "كل الإجراءات",             en: "All Actions" },

  // ── Missing general keys ──────────────────────────────────────────────────
  periodStatus:          { ar: "حالة الفترة",              en: "Period Status" },
  asOfDateLabel2:        { ar: "كما في تاريخ",             en: "As of Date" },

  // ── Sales Returns / Purchase Returns extra ────────────────────────────────
  salesReturnsTitle:     { ar: "مرتجعات المبيعات",        en: "Sales Returns" },
  purchaseReturnsTitle:  { ar: "مرتجعات المشتريات",       en: "Purchase Returns" },

  // ── Customers page extras ─────────────────────────────────────────────────
  allStatuses2:          { ar: "كل الحالات",               en: "All Statuses" },

  // ── Common validation errors (shared across modules) ─────────────────────
  errNoBranch:           { ar: "لا يوجد فرع افتراضي للشركة",                 en: "No default branch found for this company" },
  errNoPeriod:           { ar: "لا توجد فترة محاسبية مفتوحة للتاريخ المحدد", en: "No open accounting period for the selected date" },
  errNoUser:             { ar: "لا يوجد مستخدم في النظام",                   en: "No user found in the system" },
  errNoCurrency:         { ar: "لا توجد عملة افتراضية في النظام",            en: "No default currency configured" },
  errNoItemAccount:      { ar: "الأصناف المختارة ليس لها حساب تكلفة مرتبط. يرجى ربط حسابات بالأصناف أولاً.", en: "Selected items have no cost account linked. Please link accounts to items first." },
  errUnexpected:         { ar: "حدث خطأ غير متوقع",                         en: "An unexpected error occurred" },
  errNoReturnQty:        { ar: "يجب تحديد كمية مرتجعة لصنف واحد على الأقل", en: "Please enter a return quantity for at least one item" },
  errNoWarehouseReturn:  { ar: "يجب اختيار مخزن",                            en: "Warehouse is required" },
  errPosting:            { ar: "خطأ في الترحيل",                             en: "Posting error" },

  // ── Invoice detail / print ────────────────────────────────────────────────
  cashCustomer:          { ar: "عميل نقدي",                                  en: "Cash Customer" },
  itemName:              { ar: "اسم الصنف",                                  en: "Item Name" },
  discount:              { ar: "الخصم",                                      en: "Discount" },
  serviceCharge:         { ar: "رسوم الخدمة",                                en: "Service Charge" },
  printedBy:             { ar: "طُبع بواسطة PrimeBalance ERP",              en: "Printed via PrimeBalance ERP" },

  // ── Document actions ──────────────────────────────────────────────────────
  approve:               { ar: "اعتماد",            en: "Approve" },
  approving:             { ar: "جار الاعتماد...",    en: "Approving..." },
  reversing:             { ar: "جار العكس...",       en: "Reversing..." },
  postTransfer:          { ar: "ترحيل التحويل",      en: "Post Transfer" },

  // ── Stock Transfers ───────────────────────────────────────────────────────
  stockTransfers:        { ar: "تحويلات المخزون",    en: "Stock Transfers" },
  stockTransfersTitle:   { ar: "تحويلات المخزون",    en: "Stock Transfers" },
  newTransfer:           { ar: "تحويل جديد",         en: "New Transfer" },
  fromWarehouse:         { ar: "من مستودع",           en: "From Warehouse" },
  toWarehouse:           { ar: "إلى مستودع",          en: "To Warehouse" },
  transferNo:            { ar: "رقم التحويل",         en: "Transfer No." },
  errSameWarehouse:      { ar: "لا يمكن التحويل للمستودع نفسه", en: "Cannot transfer to the same warehouse" },

  // ── Reports (new) ─────────────────────────────────────────────────────────
  salesReport:           { ar: "تقرير المبيعات",      en: "Sales Report" },
  salesReportTitle:      { ar: "تقرير المبيعات",      en: "Sales Report" },
  purchaseReport:        { ar: "تقرير المشتريات",     en: "Purchase Report" },
  purchaseReportTitle:   { ar: "تقرير المشتريات",     en: "Purchase Report" },
  stockValuation:        { ar: "تقييم المخزون",        en: "Stock Valuation" },
  stockValuationTitle:   { ar: "تقرير تقييم المخزون", en: "Stock Valuation Report" },

  groupBy:               { ar: "تجميع حسب",           en: "Group By" },
  groupByDay:            { ar: "يوم",                  en: "Day" },
  groupByItem:           { ar: "صنف",                  en: "Item" },
  groupByCategory:       { ar: "فئة",                  en: "Category" },
  groupByCustomer:       { ar: "عميل",                 en: "Customer" },
  groupBySupplier:       { ar: "مورد",                 en: "Supplier" },

  totalSales:            { ar: "إجمالي المبيعات",      en: "Total Sales" },
  totalPurchases:        { ar: "إجمالي المشتريات",     en: "Total Purchases" },
  purchaseCount:         { ar: "فاتورة شراء",          en: "purchase invoices" },
  avgCost:               { ar: "متوسط التكلفة",        en: "Avg. Cost" },
  totalValue:            { ar: "القيمة الإجمالية",     en: "Total Value" },
  totalInventoryValue:   { ar: "إجمالي قيمة المخزون",  en: "Total Inventory Value" },
  lastUpdated:           { ar: "آخر تحديث",             en: "Last Updated" },
} as const;

// ============================================================

// FORMATTERS  (QAR — Qatari Riyal is the base currency)

// ============================================================

export const BASE_CURRENCY = "QAR" as const;

export function formatCurrency(

  value: number | null | undefined,

  lang: Language = "ar",

  opts: { currency?: string; compact?: boolean } = {}

): string {

  const n = typeof value === "number" && isFinite(value) ? value : 0;

  const currency = opts.currency ?? BASE_CURRENCY;

  try {

    return new Intl.NumberFormat(lang === "ar" ? "ar-QA" : "en-QA", {

      style: "currency",

      currency,

      minimumFractionDigits: 2,

      maximumFractionDigits: 2,

      notation: opts.compact ? "compact" : "standard",

    }).format(n);

  } catch {

    const sym = lang === "ar" ? "ر.ق" : "QAR";

    return `${n.toFixed(2)} ${sym}`;

  }

}

export function formatNumber(value: number | null | undefined, lang: Language = "ar"): string {

  const n = typeof value === "number" && isFinite(value) ? value : 0;

  return new Intl.NumberFormat(lang === "ar" ? "ar-QA" : "en-US").format(n);

}

export function formatDate(value: string | number | Date, lang: Language = "ar"): string {

  const d = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat(lang === "ar" ? "ar-QA" : "en-GB", {

    year: "numeric", month: "short", day: "2-digit",

  }).format(d);

}

// ============================================================

// Hook-free helper (for utilities that run outside React)

// ============================================================

export function tr(key: TKey, lang: Language): string {

  const entry = translations[key] as { ar: string; en: string } | undefined;

  if (!entry) return key;

  return entry[lang] ?? entry.ar ?? key;

}

