import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  companies: defineTable({
    nameAr: v.string(), nameEn: v.optional(v.string()), commercialReg: v.optional(v.string()),
    taxNumber: v.optional(v.string()), baseCurrency: v.string(), fiscalYearStart: v.optional(v.string()),
    logoUrl: v.optional(v.string()), address: v.optional(v.string()), phone: v.optional(v.string()),
    email: v.optional(v.string()), isActive: v.boolean(), createdAt: v.number(),
  }),

  branches: defineTable({
    companyId: v.id("companies"), code: v.string(), nameAr: v.string(), nameEn: v.optional(v.string()),
    address: v.optional(v.string()), phone: v.optional(v.string()), isActive: v.boolean(),
    defaultWarehouseId: v.optional(v.id("warehouses")), createdAt: v.number(),
  }).index("by_company", ["companyId"]),

  users: defineTable({
    name: v.string(), email: v.string(), passwordHash: v.string(),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("accountant"),
      v.literal("cashier"), v.literal("sales"), v.literal("warehouse"), v.literal("viewer")),
    branchIds: v.array(v.id("branches")), isActive: v.boolean(), createdAt: v.number(),
  }).index("by_email", ["email"]).index("by_role", ["role"]),

  currencies: defineTable({
    code: v.string(), nameAr: v.string(), nameEn: v.optional(v.string()),
    symbol: v.string(), isBase: v.boolean(), decimalPlaces: v.number(), isActive: v.boolean(),
  }).index("by_code", ["code"]),

  exchangeRates: defineTable({
    currencyId: v.id("currencies"), rateDate: v.string(), rate: v.number(),
    createdBy: v.optional(v.id("users")), createdAt: v.number(),
  }).index("by_currency_date", ["currencyId", "rateDate"]),

  fiscalYears: defineTable({
    companyId: v.id("companies"), code: v.string(), nameAr: v.string(), nameEn: v.optional(v.string()),
    startDate: v.string(), endDate: v.string(),
    status: v.union(v.literal("open"), v.literal("closing"), v.literal("closed"), v.literal("locked")),
    closedBy: v.optional(v.id("users")), closedAt: v.optional(v.number()),
  }).index("by_company", ["companyId"])
    .index("by_status", ["status"]),

  accountingPeriods: defineTable({
    fiscalYearId: v.id("fiscalYears"), companyId: v.id("companies"),
    periodNumber: v.number(), name: v.string(), startDate: v.string(), endDate: v.string(),
    status: v.union(v.literal("open"), v.literal("soft_closed"), v.literal("closed"), v.literal("locked")),
    closedBy: v.optional(v.id("users")), closedAt: v.optional(v.number()),
  }).index("by_fiscal_year", ["fiscalYearId"])
    .index("by_company_status", ["companyId", "status"])
    .index("by_company_dates", ["companyId", "startDate"]),

  documentSequences: defineTable({
    branchId: v.id("branches"), fiscalYearId: v.id("fiscalYears"), documentType: v.string(),
    prefix: v.string(), currentNumber: v.number(), padding: v.number(), resetYearly: v.boolean(),
  }).index("by_branch_year_type", ["branchId", "fiscalYearId", "documentType"]),

  taxClasses: defineTable({
    companyId: v.id("companies"), code: v.string(), nameAr: v.string(), nameEn: v.optional(v.string()),
    rate: v.number(), accountId: v.optional(v.id("accounts")), isActive: v.boolean(),
  }).index("by_company", ["companyId"]),

  accounts: defineTable({
    companyId: v.id("companies"), code: v.string(), parentId: v.optional(v.id("accounts")),
    nameAr: v.string(), nameEn: v.optional(v.string()),
    accountType: v.union(v.literal("asset"), v.literal("liability"), v.literal("equity"), v.literal("revenue"), v.literal("expense")),
    accountSubType: v.string(), isPostable: v.boolean(), requiresCostCenter: v.boolean(),
    requiresSubAccount: v.boolean(), normalBalance: v.union(v.literal("debit"), v.literal("credit")),
    isActive: v.boolean(), sortOrder: v.optional(v.number()), notes: v.optional(v.string()), createdAt: v.number(),
    // ── 9A: Operational type for targeted filtering ──
    // Optional; set explicitly on cash/bank/receivable/payable accounts.
    // Values: "cash" | "bank" | "trade_receivable" | "trade_payable" | "other"
    operationalType: v.optional(v.string()),
  }).index("by_company", ["companyId"])
    .index("by_company_code", ["companyId", "code"])
    .index("by_parent", ["parentId"])
    .index("by_company_type", ["companyId", "accountType"]),

  costCenters: defineTable({
    companyId: v.id("companies"), branchId: v.optional(v.id("branches")),
    code: v.string(), nameAr: v.string(), nameEn: v.optional(v.string()),
    parentId: v.optional(v.id("costCenters")), isActive: v.boolean(),
    createdAt: v.number(), updatedAt: v.number(),
  }).index("by_company", ["companyId"]).index("by_branch", ["branchId"]),

  customers: defineTable({
    companyId: v.id("companies"), branchId: v.optional(v.id("branches")),
    code: v.string(), nameAr: v.string(), nameEn: v.optional(v.string()),
    accountId: v.optional(v.id("accounts")), phone: v.optional(v.string()), mobile: v.optional(v.string()),
    email: v.optional(v.string()), address: v.optional(v.string()), taxNumber: v.optional(v.string()),
    currencyId: v.optional(v.id("currencies")), creditLimit: v.number(), creditDays: v.number(),
    isActive: v.boolean(), notes: v.optional(v.string()), createdAt: v.number(),
    // ── Customer group / import fields ────────────────────────────────────────
    normalizedName: v.optional(v.string()),    // upper-trimmed for UPSERT matching
    customerGroup: v.optional(v.string()),     // group display name (e.g. "WOQOD GROUP")
    customerGroupNorm: v.optional(v.string()), // normalized group key
    isGroupParent: v.optional(v.boolean()),    // true = this row is a group header account
    branchCount: v.optional(v.number()),       // total branches in group (parent only)
  }).index("by_company", ["companyId"])
    .index("by_company_code", ["companyId", "code"])
    .index("by_company_normalized", ["companyId", "normalizedName"])
    .index("by_company_group", ["companyId", "customerGroupNorm"])
    .searchIndex("search_customers", { searchField: "nameAr", filterFields: ["companyId"] }),

  customerOutlets: defineTable({
    customerId: v.id("customers"),
    code: v.string(),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    address: v.optional(v.string()),
    contactPerson: v.optional(v.string()),
    phone: v.optional(v.string()),
    deliveryNotes: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_customer", ["customerId"]),

  salesReps: defineTable({
    companyId: v.id("companies"),
    branchId: v.optional(v.id("branches")),
    code: v.string(),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    // ── Commission settings (internal only, never shown on customer invoice) ──
    commissionRate: v.optional(v.number()),  // % e.g. 2.5 = 2.5%
    commissionType: v.optional(v.union(
      v.literal("on_sales"),     // % of total invoice
      v.literal("on_net_sales"), // % of (sales − returns)
      v.literal("on_profit"),    // % of (sales − cost)
    )),
    createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_company_code", ["companyId", "code"]),

  deliveryVehicles: defineTable({
    companyId: v.id("companies"),
    branchId: v.optional(v.id("branches")),
    code: v.string(),
    plateNumber: v.optional(v.string()),
    descriptionAr: v.optional(v.string()),
    descriptionEn: v.optional(v.string()),
    assignedSalesRepId: v.optional(v.id("salesReps")),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_company_code", ["companyId", "code"])
    .index("by_sales_rep", ["assignedSalesRepId"]),

  suppliers: defineTable({
    companyId: v.id("companies"), code: v.string(), nameAr: v.string(), nameEn: v.optional(v.string()),
    accountId: v.optional(v.id("accounts")), phone: v.optional(v.string()), mobile: v.optional(v.string()),
    email: v.optional(v.string()), address: v.optional(v.string()), taxNumber: v.optional(v.string()),
    currencyId: v.optional(v.id("currencies")), paymentTerms: v.optional(v.number()),
    isActive: v.boolean(), notes: v.optional(v.string()), createdAt: v.number(),
    // ── Catalog import fields ─────────────────────────────────────────────────
    normalizedName: v.optional(v.string()),   // upper-trimmed for UPSERT matching
    totalPurchases: v.optional(v.number()),   // cumulative spend from import data
    lastPurchaseDate: v.optional(v.string()), // ISO date of last purchase
    purchaseRows: v.optional(v.number()),     // total purchase transaction count
  }).index("by_company", ["companyId"])
    .index("by_company_code", ["companyId", "code"])
    .index("by_company_normalized", ["companyId", "normalizedName"])
    .searchIndex("search_suppliers", { searchField: "nameAr", filterFields: ["companyId"] }),

  supplierItems: defineTable({
    supplierId: v.id("suppliers"),
    companyId: v.id("companies"),
    itemId: v.optional(v.id("items")),        // optional — null when item is unresolved/unlinked
    supplierItemCode: v.optional(v.string()),
    supplierPrice: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    // ── Catalog import fields ─────────────────────────────────────────────────
    supplierItemName: v.optional(v.string()),   // item name as it appears on supplier invoices
    normalizedItemName: v.optional(v.string()), // upper-trimmed for matching
    purchaseUom: v.optional(v.string()),        // UOM used when purchasing from supplier
    stockUom: v.optional(v.string()),           // UOM used in stock/inventory
    avgPrice: v.optional(v.number()),           // historical average price (purchase UOM)
    lastPrice: v.optional(v.number()),          // last known price (purchase UOM)
    purchaseCount: v.optional(v.number()),      // number of purchase transactions
    lastPurchaseDate: v.optional(v.string()),   // ISO date of last purchase
    isUnresolved: v.optional(v.boolean()),      // true = not yet linked to internal catalog item
  }).index("by_supplier", ["supplierId"])
    .index("by_company", ["companyId"])
    .index("by_supplier_item", ["supplierId", "itemId"])
    .index("by_supplier_normalized_name", ["supplierId", "normalizedItemName"]),

  itemPriceHistory: defineTable({
    supplierItemId: v.id("supplierItems"),
    itemId: v.id("items"),
    supplierId: v.id("suppliers"),
    companyId: v.optional(v.id("companies")),
    oldPrice: v.number(),
    newPrice: v.number(),
    reason: v.optional(v.string()),
    changedAt: v.number(),
  }).index("by_item", ["itemId"])
    .index("by_supplier_item", ["supplierItemId"]),

  itemCategories: defineTable({
    companyId: v.id("companies"), parentId: v.optional(v.id("itemCategories")),
    code: v.string(), nameAr: v.string(), nameEn: v.optional(v.string()),
    defaultInventoryAccountId: v.optional(v.id("accounts")), defaultCogsAccountId: v.optional(v.id("accounts")),
    defaultRevenueAccountId: v.optional(v.id("accounts")), isActive: v.boolean(),
  }).index("by_company", ["companyId"]),

  unitOfMeasure: defineTable({
    companyId: v.id("companies"), code: v.string(), nameAr: v.string(), nameEn: v.optional(v.string()),
    isBase: v.boolean(), baseUomId: v.optional(v.id("unitOfMeasure")), conversionFactor: v.number(), isActive: v.boolean(),
  }).index("by_company", ["companyId"]),

  items: defineTable({
    companyId: v.id("companies"), code: v.string(), barcode: v.optional(v.string()),
    nameAr: v.string(), nameEn: v.optional(v.string()), categoryId: v.optional(v.id("itemCategories")),
    itemType: v.union(v.literal("raw_material"), v.literal("semi_finished"), v.literal("finished_good"), v.literal("service"), v.literal("expense_item")),
    baseUomId: v.id("unitOfMeasure"), costingMethod: v.literal("weighted_average"),
    standardCost: v.optional(v.number()), lastCost: v.optional(v.number()), sellingPrice: v.optional(v.number()),
    minSellingPrice: v.optional(v.number()), inventoryAccountId: v.optional(v.id("accounts")),
    cogsAccountId: v.optional(v.id("accounts")), revenueAccountId: v.optional(v.id("accounts")),
    expenseAccountId: v.optional(v.id("accounts")), taxClassId: v.optional(v.id("taxClasses")),
    reorderPoint: v.optional(v.number()), allowNegativeStock: v.boolean(),
    recipeId: v.optional(v.id("recipes")), isActive: v.boolean(), notes: v.optional(v.string()), createdAt: v.number(),
    // ── Migration / Legacy linking ──────────────────────────────────────────
    // Set when an item is promoted from a legacy system or Excel import.
    // externalCode: the original code from the old system (for traceability)
    // externalSource: "legacy_excel" | "erp_old" | "sql_backup" | etc.
    externalCode: v.optional(v.string()),
    externalSource: v.optional(v.string()),
    // ── Purchase classification (from Excel source) ─────────────────────────
    purchaseType: v.optional(v.union(v.literal("RM"), v.literal("PACK"), v.literal("OTHERS"))),
    purchaseCategory: v.optional(v.string()),   // e.g. "flour", "fats_oils", "packaging_disposables"
    normalizedName: v.optional(v.string()),      // upper-trimmed for UPSERT matching
  }).index("by_company", ["companyId"])
    .index("by_company_code", ["companyId", "code"])
    .index("by_category", ["categoryId"])
    .index("by_external_code", ["externalCode"])
    .index("by_company_normalized", ["companyId", "normalizedName"])
    .searchIndex("search_items", { searchField: "nameAr", filterFields: ["companyId"] }),

  warehouses: defineTable({
    companyId: v.id("companies"), branchId: v.id("branches"), code: v.string(),
    nameAr: v.string(), nameEn: v.optional(v.string()),
    warehouseType: v.union(v.literal("main"), v.literal("transit"), v.literal("waste")), isActive: v.boolean(),
  }).index("by_company", ["companyId"]).index("by_branch", ["branchId"]),

  stockBalance: defineTable({
    itemId: v.id("items"), warehouseId: v.id("warehouses"),
    quantity: v.number(), avgCost: v.number(), totalValue: v.number(), lastUpdated: v.number(),
  }).index("by_item_warehouse", ["itemId", "warehouseId"])
    .index("by_warehouse", ["warehouseId"])
    .index("by_item", ["itemId"]),

  // ─── Monthly Stock Take (الجرد الشهري) ─────────────────────────────────
  stockTakes: defineTable({
    companyId: v.id("companies"),
    branchId: v.id("branches"),
    warehouseId: v.id("warehouses"),
    takeNumber: v.string(),
    takeDate: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("in_progress"),
      v.literal("pending_review"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    // Aggregated counts (updated as user enters data + on completion)
    totalItems: v.number(),
    countedItems: v.number(),
    itemsWithVariance: v.number(),
    totalVarianceQty: v.number(),
    totalVarianceValue: v.number(),
    shortageValue: v.number(),
    excessValue: v.number(),
    // Workflow
    notes: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    submittedBy: v.optional(v.id("users")), submittedAt: v.optional(v.number()),
    reviewedBy:  v.optional(v.id("users")), reviewedAt:  v.optional(v.number()),
    // Optional auto-adjustment link
    adjustmentJournalEntryId: v.optional(v.id("journalEntries")),
    adjustmentCreated: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_branch",            ["branchId"])
    .index("by_warehouse",         ["warehouseId"])
    .index("by_company_status",    ["companyId", "status"])
    .index("by_company_date",      ["companyId", "takeDate"]),

  stockTakeLines: defineTable({
    takeId: v.id("stockTakes"),
    itemId: v.id("items"),
    uomId: v.id("unitOfMeasure"),
    systemQty: v.number(),                  // snapshot at creation
    physicalQty: v.optional(v.number()),    // null until counted
    variance: v.number(),                   // physicalQty - systemQty (0 if uncounted)
    unitCost: v.number(),                   // snapshot at creation
    varianceValue: v.number(),              // variance * unitCost
    reason: v.optional(v.union(
      v.literal("wastage"),
      v.literal("theft"),
      v.literal("damaged"),
      v.literal("production_loss"),
      v.literal("counting_error"),
      v.literal("other"),
    )),
    notes: v.optional(v.string()),
    counted: v.boolean(),                   // true once physicalQty is set
    countedAt: v.optional(v.number()),
    countedBy: v.optional(v.id("users")),
  }).index("by_take", ["takeId"])
    .index("by_take_item", ["takeId", "itemId"]),

  recipes: defineTable({
    companyId: v.id("companies"), code: v.string(), nameAr: v.string(), nameEn: v.optional(v.string()),
    outputItemId: v.id("items"), yieldQuantity: v.number(), yieldUomId: v.id("unitOfMeasure"),
    version: v.number(), isActive: v.boolean(), notes: v.optional(v.string()), createdAt: v.number(),
  }).index("by_company", ["companyId"]).index("by_output_item", ["outputItemId"]),

  recipeLines: defineTable({
    recipeId: v.id("recipes"), itemId: v.id("items"), quantity: v.number(),
    uomId: v.id("unitOfMeasure"), wastePct: v.number(), grossQuantity: v.number(),
    unitCost: v.optional(v.number()), sortOrder: v.optional(v.number()),
  }).index("by_recipe", ["recipeId"]),

  // ─── Production Orders (Phase 21) ──────────────────────────────────────────

  productionOrders: defineTable({
    companyId: v.id("companies"),
    branchId: v.id("branches"),
    orderNumber: v.string(),
    recipeId: v.id("recipes"),
    outputItemId: v.id("items"),
    plannedQty: v.number(),
    actualQty: v.optional(v.number()),
    yieldUomId: v.id("unitOfMeasure"),
    plannedDate: v.string(),
    completedDate: v.optional(v.string()),
    warehouseId: v.optional(v.id("warehouses")),
    status: v.union(
      v.literal("planned"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    materialCost: v.optional(v.number()),
    totalCost: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_branch", ["branchId"])
    .index("by_recipe", ["recipeId"])
    .index("by_status", ["status"])
    .index("by_branch_date", ["branchId", "plannedDate"]),

  productionOrderLines: defineTable({
    orderId: v.id("productionOrders"),
    recipeLineId: v.optional(v.id("recipeLines")),
    itemId: v.id("items"),
    requiredQty: v.number(),
    actualQty: v.optional(v.number()),
    uomId: v.id("unitOfMeasure"),
    unitCost: v.optional(v.number()),
    totalCost: v.optional(v.number()),
    sortOrder: v.optional(v.number()),
  }).index("by_order", ["orderId"]),

  // ─── PRODUCTION REQUESTS (Sales Rep → Production Manager workflow) ────────
  // Each sales rep submits what they want produced for a given date.
  // The production manager aggregates them, edits, and approves into a Plan.
  productionRequests: defineTable({
    companyId:       v.id("companies"),
    branchId:        v.id("branches"),
    requestNumber:   v.string(),               // PR-001-2026
    salesRepId:      v.id("salesReps"),
    productionDate:  v.string(),               // YYYY-MM-DD — when items are needed
    status: v.union(
      v.literal("draft"),                       // rep is still editing
      v.literal("submitted"),                   // sent to production manager
      v.literal("consolidated"),                // included in an approved plan
      v.literal("cancelled"),                   // rejected or cancelled by rep
    ),
    notes:           v.optional(v.string()),
    submittedAt:     v.optional(v.number()),    // timestamp when submitted
    consolidatedAt:  v.optional(v.number()),    // timestamp when included in plan
    consolidatedPlanId: v.optional(v.id("productionPlans")),
    createdBy:       v.optional(v.id("users")),
    createdAt:       v.number(),
    updatedAt:       v.number(),
  })
    .index("by_company",        ["companyId"])
    .index("by_branch",         ["branchId"])
    .index("by_branch_date",    ["branchId", "productionDate"])
    .index("by_rep_date",       ["salesRepId", "productionDate"])
    .index("by_status",         ["status"]),

  productionRequestLines: defineTable({
    requestId:     v.id("productionRequests"),
    itemId:        v.id("items"),
    requestedQty:  v.number(),
    uomId:         v.optional(v.id("unitOfMeasure")),
    notes:         v.optional(v.string()),
    sortOrder:     v.optional(v.number()),
  }).index("by_request", ["requestId"])
    .index("by_item",    ["itemId"]),

  // ─── PRODUCTION PLAN (Manager's consolidated daily plan) ──────────────────
  productionPlans: defineTable({
    companyId:        v.id("companies"),
    branchId:         v.id("branches"),
    planNumber:       v.string(),              // PP-001-2026
    productionDate:   v.string(),              // YYYY-MM-DD
    status: v.union(
      v.literal("draft"),                      // being built/edited
      v.literal("approved"),                   // approved as plan only
      v.literal("converted"),                  // converted to production orders
    ),
    totalRequestedQty: v.optional(v.number()),  // sum across items (for KPI)
    totalApprovedQty:  v.optional(v.number()),
    requestCount:      v.optional(v.number()), // # requests included
    notes:             v.optional(v.string()),
    approvedBy:        v.optional(v.id("users")),
    approvedAt:        v.optional(v.number()),
    convertedAt:       v.optional(v.number()),
    createdBy:         v.optional(v.id("users")),
    createdAt:         v.number(),
    updatedAt:         v.number(),
  })
    .index("by_company",        ["companyId"])
    .index("by_branch",         ["branchId"])
    .index("by_branch_date",    ["branchId", "productionDate"])
    .index("by_status",         ["status"]),

  productionPlanLines: defineTable({
    planId:             v.id("productionPlans"),
    itemId:             v.id("items"),
    totalRequestedQty:  v.number(),                 // sum from all reps
    approvedQty:        v.number(),                 // manager's final number
    uomId:              v.optional(v.id("unitOfMeasure")),
    recipeId:           v.optional(v.id("recipes")),// linked recipe for production
    productionOrderId:  v.optional(v.id("productionOrders")), // after conversion
    sourceRequestIds:   v.array(v.id("productionRequests")),  // tracking
    notes:              v.optional(v.string()),
    sortOrder:          v.optional(v.number()),
  }).index("by_plan", ["planId"])
    .index("by_item", ["itemId"]),

  // ─── PRODUCTION DISTRIBUTION (Per-rep allocation after plan approval) ─────
  // After the plan is approved, each rep's share is calculated and stored here.
  // Status flow: pending → dispatched → confirmed
  productionDistributions: defineTable({
    planId:       v.id("productionPlans"),
    planLineId:   v.id("productionPlanLines"),
    salesRepId:   v.id("salesReps"),
    requestId:    v.id("productionRequests"),
    itemId:       v.id("items"),
    uomId:        v.optional(v.id("unitOfMeasure")),
    requestedQty: v.number(),          // what this rep originally asked for
    allocatedQty: v.number(),          // their proportional share of approved qty
    status:       v.union(v.literal("pending"), v.literal("dispatched"), v.literal("confirmed")),
    dispatchedAt: v.optional(v.number()),
    confirmedAt:  v.optional(v.number()),
    notes:        v.optional(v.string()),
    createdAt:    v.number(),
  }).index("by_plan",     ["planId"])
    .index("by_rep",      ["salesRepId"])
    .index("by_rep_plan", ["salesRepId", "planId"])
    .index("by_request",  ["requestId"]),

  salesInvoices: defineTable({
    companyId: v.id("companies"), branchId: v.id("branches"), invoiceNumber: v.string(),
    externalInvoiceNumber: v.optional(v.string()),
    invoiceType: v.union(v.literal("cash_sale"), v.literal("credit_sale"), v.literal("mixed_sale")),
    paymentMethod: v.optional(v.union(v.literal("cash"), v.literal("hand"), v.literal("main_safe"), v.literal("cash_sales_safe"), v.literal("card"), v.literal("transfer"), v.literal("credit"))),
    customerId: v.optional(v.id("customers")), invoiceDate: v.string(), dueDate: v.optional(v.string()),
    periodId: v.id("accountingPeriods"), currencyId: v.id("currencies"), exchangeRate: v.number(),
    costCenterId: v.optional(v.id("costCenters")), warehouseId: v.id("warehouses"),
    salesRepId: v.optional(v.id("salesReps")), salesRepName: v.optional(v.string()),
    vehicleId: v.optional(v.id("deliveryVehicles")), vehicleCode: v.optional(v.string()),
    subtotal: v.number(), discountAmount: v.number(), taxableAmount: v.number(),
    vatAmount: v.number(), serviceCharge: v.number(), totalAmount: v.number(),
    cashReceived: v.number(), cardReceived: v.number(), creditAmount: v.number(),
    documentStatus: v.union(v.literal("draft"), v.literal("approved"), v.literal("cancelled")),
    reviewStatus: v.optional(v.union(v.literal("draft"), v.literal("submitted"), v.literal("rejected"), v.literal("approved"))),
    rejectionReason: v.optional(v.string()),
    postingStatus: v.union(v.literal("unposted"), v.literal("posted"), v.literal("reversed")),
    paymentStatus: v.union(v.literal("not_applicable"), v.literal("unpaid"), v.literal("partial"), v.literal("paid")),
    journalEntryId: v.optional(v.id("journalEntries")), reversalEntryId: v.optional(v.id("journalEntries")),
    postedBy: v.optional(v.id("users")), postedAt: v.optional(v.number()),
    approvedBy: v.optional(v.id("users")), approvedAt: v.optional(v.number()),
    submittedBy: v.optional(v.id("users")), submittedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id("users")), reviewedAt: v.optional(v.number()),
    cancelledBy: v.optional(v.id("users")), cancelledAt: v.optional(v.number()),
    notes: v.optional(v.string()), internalNotes: v.optional(v.string()),
    customerOutletId: v.optional(v.id("customerOutlets")),
    // ── Sales rep commission (internal — never on customer invoice) ──
    commissionRate:   v.optional(v.number()),
    commissionAmount: v.optional(v.number()),
    commissionStatus: v.optional(v.union(
      v.literal("pending"), v.literal("approved"), v.literal("paid"),
    )),
    commissionApprovedBy: v.optional(v.id("users")), commissionApprovedAt: v.optional(v.number()),
    commissionPaidAt:     v.optional(v.number()),
    commissionVoucherId:  v.optional(v.id("cashPaymentVouchers")),
    createdBy: v.id("users"), createdAt: v.number(), updatedAt: v.number(),
  }).index("by_branch", ["branchId"])
    .index("by_customer", ["customerId"])
    .index("by_period", ["periodId"])
    .index("by_branch_date", ["branchId", "invoiceDate"])
    .index("by_company_date", ["companyId", "invoiceDate"])
    .index("by_rep_date", ["salesRepId", "invoiceDate"])
    .index("by_customer_payment", ["customerId", "paymentStatus"])
    .index("by_number", ["invoiceNumber"]),

  salesInvoiceLines: defineTable({
    invoiceId: v.id("salesInvoices"), lineNumber: v.number(), itemId: v.id("items"),
    description: v.optional(v.string()), quantity: v.number(), uomId: v.id("unitOfMeasure"),
    unitPrice: v.number(), discountPct: v.number(), discountAmount: v.number(),
    vatRate: v.number(), vatAmount: v.number(), serviceChargeRate: v.number(), serviceChargeAmt: v.number(),
    lineTotal: v.number(), unitCost: v.number(), costTotal: v.number(),
    revenueAccountId: v.optional(v.id("accounts")), cogsAccountId: v.optional(v.id("accounts")),
    costCenterId: v.optional(v.id("costCenters")), warehouseId: v.optional(v.id("warehouses")),
  }).index("by_invoice", ["invoiceId"]),

  salesReturns: defineTable({
    companyId: v.id("companies"), branchId: v.id("branches"), returnNumber: v.string(),
    originalInvoiceId: v.optional(v.id("salesInvoices")), returnDate: v.string(),
    periodId: v.id("accountingPeriods"), customerId: v.optional(v.id("customers")),
    currencyId: v.id("currencies"), exchangeRate: v.number(), warehouseId: v.id("warehouses"),
    returnReason: v.optional(v.string()), subtotal: v.number(), vatAmount: v.number(), totalAmount: v.number(),
    refundMethod: v.union(v.literal("cash"), v.literal("credit_note"), v.literal("offset")),
    documentStatus: v.union(v.literal("draft"), v.literal("approved"), v.literal("cancelled")),
    postingStatus: v.union(v.literal("unposted"), v.literal("posted"), v.literal("reversed")),
    journalEntryId: v.optional(v.id("journalEntries")),
    customerOutletId: v.optional(v.id("customerOutlets")),
    postedBy: v.optional(v.id("users")), postedAt: v.optional(v.number()),
    notes: v.optional(v.string()), createdBy: v.id("users"), createdAt: v.number(),
  }).index("by_branch", ["branchId"])
    .index("by_customer", ["customerId"])
    .index("by_original_invoice", ["originalInvoiceId"]),

  salesReturnLines: defineTable({
    returnId: v.id("salesReturns"), originalLineId: v.optional(v.id("salesInvoiceLines")),
    itemId: v.id("items"), quantity: v.number(), uomId: v.id("unitOfMeasure"),
    unitPrice: v.number(), vatRate: v.number(), vatAmount: v.number(), lineTotal: v.number(), unitCost: v.number(),
  }).index("by_return", ["returnId"]),

  purchaseOrders: defineTable({
    companyId: v.id("companies"), branchId: v.id("branches"), poNumber: v.string(),
    supplierId: v.id("suppliers"), orderDate: v.string(), expectedDate: v.optional(v.string()),
    warehouseId: v.id("warehouses"), currencyId: v.id("currencies"), exchangeRate: v.number(),
    subtotal: v.number(), vatAmount: v.number(), totalAmount: v.number(),
    documentStatus: v.union(
      v.literal("draft"), v.literal("approved"), v.literal("sent"),
      v.literal("partially_received"), v.literal("fully_received"), v.literal("cancelled")
    ),
    approvedBy: v.optional(v.id("users")), approvedAt: v.optional(v.number()),
    sentBy:     v.optional(v.id("users")), sentAt:     v.optional(v.number()),
    notes: v.optional(v.string()), createdBy: v.id("users"), createdAt: v.number(),
  }).index("by_branch", ["branchId"])
    .index("by_supplier", ["supplierId"])
    .index("by_status", ["documentStatus"])
    .index("by_company_status", ["companyId", "documentStatus"]),

  purchaseOrderLines: defineTable({
    poId: v.id("purchaseOrders"), itemId: v.id("items"), quantity: v.number(), receivedQty: v.number(),
    uomId: v.id("unitOfMeasure"), unitPrice: v.number(), vatRate: v.number(), lineTotal: v.number(),
    accountId: v.optional(v.id("accounts")),
  }).index("by_po", ["poId"]),

  goodsReceiptNotes: defineTable({
    companyId: v.id("companies"), branchId: v.id("branches"), grnNumber: v.string(),
    poId: v.optional(v.id("purchaseOrders")), supplierId: v.id("suppliers"),
    receiptDate: v.string(), periodId: v.id("accountingPeriods"), warehouseId: v.id("warehouses"),
    currencyId: v.id("currencies"), exchangeRate: v.number(),
    documentStatus: v.union(v.literal("draft"), v.literal("approved"), v.literal("invoiced"), v.literal("cancelled")),
    postingStatus: v.union(v.literal("unposted"), v.literal("posted"), v.literal("reversed")),
    journalEntryId: v.optional(v.id("journalEntries")),
    approvedBy: v.optional(v.id("users")), approvedAt: v.optional(v.number()),
    postedBy: v.optional(v.id("users")),   postedAt: v.optional(v.number()),
    notes: v.optional(v.string()), createdBy: v.id("users"), createdAt: v.number(),
  }).index("by_branch", ["branchId"])
    .index("by_supplier", ["supplierId"])
    .index("by_po", ["poId"]),

  grnLines: defineTable({
    grnId: v.id("goodsReceiptNotes"), poLineId: v.optional(v.id("purchaseOrderLines")),
    itemId: v.id("items"), quantity: v.number(), uomId: v.id("unitOfMeasure"),
    unitCost: v.number(), totalCost: v.number(), invoicedQty: v.number(),
  }).index("by_grn", ["grnId"]),

  purchaseInvoices: defineTable({
    companyId: v.id("companies"), branchId: v.id("branches"), invoiceNumber: v.string(),
    supplierInvoiceNo: v.optional(v.string()), supplierId: v.id("suppliers"),
    invoiceType: v.union(v.literal("stock_purchase"), v.literal("expense_purchase"), v.literal("mixed")),
    invoiceDate: v.string(), dueDate: v.string(), periodId: v.id("accountingPeriods"),
    grnId: v.optional(v.id("goodsReceiptNotes")), poId: v.optional(v.id("purchaseOrders")),
    currencyId: v.id("currencies"), exchangeRate: v.number(),
    subtotal: v.number(), vatAmount: v.number(), totalAmount: v.number(),
    documentStatus: v.union(v.literal("draft"), v.literal("approved"), v.literal("cancelled")),
    postingStatus: v.union(v.literal("unposted"), v.literal("posted"), v.literal("reversed")),
    paymentStatus: v.union(v.literal("unpaid"), v.literal("partial"), v.literal("paid")),
    journalEntryId: v.optional(v.id("journalEntries")), reversalEntryId: v.optional(v.id("journalEntries")),
    approvedBy: v.optional(v.id("users")), approvedAt: v.optional(v.number()),
    postedBy: v.optional(v.id("users")),   postedAt: v.optional(v.number()),
    notes: v.optional(v.string()), createdBy: v.id("users"), createdAt: v.number(),
  }).index("by_branch", ["branchId"])
    .index("by_supplier", ["supplierId"])
    .index("by_period", ["periodId"])
    .index("by_company_date", ["companyId", "invoiceDate"])
    .index("by_branch_date", ["branchId", "invoiceDate"])
    .index("by_supplier_payment", ["supplierId", "paymentStatus"]),

  purchaseInvoiceLines: defineTable({
    invoiceId: v.id("purchaseInvoices"), grnLineId: v.optional(v.id("grnLines")),
    itemId: v.optional(v.id("items")), description: v.optional(v.string()),
    lineType: v.union(v.literal("stock_item"), v.literal("expense_item"), v.literal("service")),
    quantity: v.number(), uomId: v.optional(v.id("unitOfMeasure")),
    unitPrice: v.number(), vatRate: v.number(), vatAmount: v.number(), lineTotal: v.number(),
    accountId: v.id("accounts"), costCenterId: v.optional(v.id("costCenters")),
  }).index("by_invoice", ["invoiceId"]),

  purchaseReturns: defineTable({
    companyId: v.id("companies"), branchId: v.id("branches"), returnNumber: v.string(),
    originalInvoiceId: v.optional(v.id("purchaseInvoices")), supplierId: v.id("suppliers"),
    returnDate: v.string(), periodId: v.id("accountingPeriods"), warehouseId: v.optional(v.id("warehouses")),
    currencyId: v.id("currencies"), exchangeRate: v.number(), vatAmount: v.number(), totalAmount: v.number(),
    documentStatus: v.union(v.literal("draft"), v.literal("approved"), v.literal("cancelled")),
    postingStatus: v.union(v.literal("unposted"), v.literal("posted"), v.literal("reversed")),
    journalEntryId: v.optional(v.id("journalEntries")),
    postedBy: v.optional(v.id("users")), postedAt: v.optional(v.number()),
    notes: v.optional(v.string()), createdBy: v.id("users"), createdAt: v.number(),
  }).index("by_branch", ["branchId"]).index("by_supplier", ["supplierId"]),

  purchaseReturnLines: defineTable({
    returnId: v.id("purchaseReturns"), itemId: v.optional(v.id("items")),
    quantity: v.number(), uomId: v.optional(v.id("unitOfMeasure")),
    unitCost: v.number(), lineTotal: v.number(), accountId: v.id("accounts"),
  }).index("by_return", ["returnId"]),

  bankAccounts: defineTable({
    companyId: v.id("companies"), branchId: v.id("branches"), accountName: v.string(),
    bankName: v.string(), accountNumber: v.string(), iban: v.optional(v.string()),
    currencyId: v.id("currencies"), glAccountId: v.id("accounts"), isActive: v.boolean(),
  }).index("by_company", ["companyId"]).index("by_branch", ["branchId"]),

  cashBoxes: defineTable({
    companyId: v.id("companies"), branchId: v.id("branches"), code: v.string(),
    nameAr: v.string(), nameEn: v.optional(v.string()), glAccountId: v.id("accounts"),
    currentBalance: v.number(), isActive: v.boolean(),
  }).index("by_branch", ["branchId"]),

  cashReceiptVouchers: defineTable({
    companyId: v.id("companies"), branchId: v.id("branches"), voucherNumber: v.string(),
    voucherDate: v.string(), periodId: v.id("accountingPeriods"), receivedFrom: v.string(),
    customerId: v.optional(v.id("customers")),
    receiptType: v.union(v.literal("customer_payment"), v.literal("other_receipt"), v.literal("advance")),
    cashAccountId: v.id("accounts"), amount: v.number(), currencyId: v.id("currencies"), exchangeRate: v.number(),
    paymentMethod: v.union(v.literal("cash"), v.literal("transfer"), v.literal("card"), v.literal("cheque")),
    reference: v.optional(v.string()),
    costCenterId: v.optional(v.id("costCenters")),
    documentStatus: v.union(v.literal("draft"), v.literal("approved"), v.literal("cancelled")),
    postingStatus: v.union(v.literal("unposted"), v.literal("posted"), v.literal("reversed")),
    allocationStatus: v.union(v.literal("unallocated"), v.literal("partial"), v.literal("fully_allocated")),
    journalEntryId: v.optional(v.id("journalEntries")),
    notes: v.optional(v.string()), forMonth: v.optional(v.string()), createdBy: v.id("users"), createdAt: v.number(),
  }).index("by_branch", ["branchId"])
    .index("by_customer", ["customerId"])
    .index("by_period", ["periodId"])
    .index("by_allocation", ["allocationStatus"]),

  cashPaymentVouchers: defineTable({
    companyId: v.id("companies"), branchId: v.id("branches"), voucherNumber: v.string(),
    voucherDate: v.string(), periodId: v.id("accountingPeriods"), paidTo: v.string(),
    supplierId: v.optional(v.id("suppliers")),
    paymentType: v.union(v.literal("supplier_payment"), v.literal("expense_payment"), v.literal("other")),
    cashAccountId: v.id("accounts"), amount: v.number(), currencyId: v.id("currencies"), exchangeRate: v.number(),
    paymentMethod: v.union(v.literal("cash"), v.literal("transfer"), v.literal("cheque")),
    reference: v.optional(v.string()),
    costCenterId: v.optional(v.id("costCenters")),
    documentStatus: v.union(v.literal("draft"), v.literal("approved"), v.literal("cancelled")),
    postingStatus: v.union(v.literal("unposted"), v.literal("posted"), v.literal("reversed")),
    allocationStatus: v.union(v.literal("unallocated"), v.literal("partial"), v.literal("fully_allocated")),
    journalEntryId: v.optional(v.id("journalEntries")),
    notes: v.optional(v.string()), forMonth: v.optional(v.string()), createdBy: v.id("users"), createdAt: v.number(),
  }).index("by_branch", ["branchId"])
    .index("by_supplier", ["supplierId"])
    .index("by_period", ["periodId"]),

  cheques: defineTable({
    companyId: v.id("companies"), branchId: v.id("branches"), chequeNumber: v.string(),
    chequeType: v.union(v.literal("received"), v.literal("issued")),
    bankAccountId: v.id("bankAccounts"), customerId: v.optional(v.id("customers")),
    supplierId: v.optional(v.id("suppliers")), amount: v.number(),
    currencyId: v.id("currencies"), exchangeRate: v.number(),
    issueDate: v.optional(v.string()), dueDate: v.string(), drawnOnBank: v.optional(v.string()),
    chequeStatus: v.union(
      v.literal("received"), v.literal("deposited"), v.literal("cleared"), v.literal("bounced"),
      v.literal("issued"), v.literal("presented"), v.literal("cleared_issued"), v.literal("stopped")
    ),
    sourceVoucherType: v.optional(v.string()), sourceVoucherId: v.optional(v.string()),
    clearingDate: v.optional(v.string()), depositDate: v.optional(v.string()),
    bounceDate: v.optional(v.string()), bounceReason: v.optional(v.string()),
    glAccountId: v.id("accounts"),
    journalEntryId: v.optional(v.id("journalEntries")),
    clearingEntryId: v.optional(v.id("journalEntries")),
    bounceEntryId: v.optional(v.id("journalEntries")),
    notes: v.optional(v.string()), createdBy: v.id("users"), createdAt: v.number(),
  }).index("by_branch", ["branchId"])
    .index("by_type_status", ["chequeType", "chequeStatus"])
    .index("by_customer", ["customerId"])
    .index("by_supplier", ["supplierId"])
    .index("by_due_date", ["dueDate"]),

  bankTransfers: defineTable({
    companyId: v.id("companies"), branchId: v.id("branches"), transferNumber: v.string(),
    transferDate: v.string(), periodId: v.id("accountingPeriods"),
    fromAccountId: v.id("bankAccounts"), toAccountId: v.id("bankAccounts"),
    amount: v.number(), feeAmount: v.number(), feeAccountId: v.optional(v.id("accounts")),
    currencyId: v.id("currencies"), reference: v.optional(v.string()),
    documentStatus: v.union(v.literal("draft"), v.literal("approved"), v.literal("cancelled")),
    postingStatus: v.union(v.literal("unposted"), v.literal("posted")),
    journalEntryId: v.optional(v.id("journalEntries")),
    notes: v.optional(v.string()), createdBy: v.id("users"), createdAt: v.number(),
  }).index("by_branch", ["branchId"]),

  journalEntries: defineTable({
    companyId: v.id("companies"), branchId: v.id("branches"), entryNumber: v.string(),
    journalType: v.union(
      v.literal("general"), v.literal("cash"), v.literal("expenses"), v.literal("adjustments"),
      v.literal("closing"), v.literal("reversing"), v.literal("opening"),
      v.literal("auto_sales"), v.literal("auto_purchase"), v.literal("auto_inventory"),
      v.literal("auto_receipt"), v.literal("auto_payment"), v.literal("auto_cheque"), v.literal("auto_transfer"),
      v.literal("auto_depreciation")
    ),
    entryDate: v.string(), periodId: v.id("accountingPeriods"),
    currencyId: v.id("currencies"), exchangeRate: v.number(),
    costCenterId: v.optional(v.id("costCenters")),
    sourceType: v.optional(v.string()), sourceId: v.optional(v.string()),
    description: v.string(), totalDebit: v.number(), totalCredit: v.number(),
    postingStatus: v.union(v.literal("draft"), v.literal("posted"), v.literal("reversed")),
    isAutoGenerated: v.boolean(), isReversingEntry: v.boolean(),
    reversedEntryId: v.optional(v.id("journalEntries")), reversalEntryId: v.optional(v.id("journalEntries")),
    postedBy: v.optional(v.id("users")), postedAt: v.optional(v.number()),
    notes: v.optional(v.string()), createdBy: v.id("users"), createdAt: v.number(),
  }).index("by_branch", ["branchId"])
    .index("by_period", ["periodId"])
    .index("by_branch_date", ["branchId", "entryDate"])
    .index("by_company_date", ["companyId", "entryDate"])
    .index("by_type", ["journalType"])
    .index("by_source", ["sourceType", "sourceId"])
    .index("by_status", ["postingStatus"]),

  journalLines: defineTable({
    entryId: v.id("journalEntries"), lineNumber: v.number(), accountId: v.id("accounts"),
    subAccountType: v.optional(v.string()), subAccountId: v.optional(v.string()),
    description: v.optional(v.string()), costCenterId: v.optional(v.id("costCenters")),
    documentRef: v.optional(v.string()), debit: v.number(), credit: v.number(),
    foreignDebit: v.number(), foreignCredit: v.number(),
  }).index("by_entry", ["entryId"])
    .index("by_account", ["accountId"])
    .index("by_sub_account", ["subAccountId"]),

  receiptAllocations: defineTable({
    voucherId: v.id("cashReceiptVouchers"), invoiceId: v.id("salesInvoices"),
    allocatedAmount: v.number(), allocationDate: v.string(),
    createdBy: v.id("users"), createdAt: v.number(), isReversed: v.boolean(), reversedAt: v.optional(v.number()),
  }).index("by_voucher", ["voucherId"])
    .index("by_invoice", ["invoiceId"])
    .index("by_voucher_active", ["voucherId", "isReversed"]),

  paymentAllocations: defineTable({
    voucherId: v.id("cashPaymentVouchers"), invoiceId: v.id("purchaseInvoices"),
    allocatedAmount: v.number(), allocationDate: v.string(),
    createdBy: v.id("users"), createdAt: v.number(), isReversed: v.boolean(), reversedAt: v.optional(v.number()),
  }).index("by_voucher", ["voucherId"]).index("by_invoice", ["invoiceId"]),

  inventoryMovements: defineTable({
    companyId: v.id("companies"), branchId: v.id("branches"), movementNumber: v.string(),
    movementType: v.union(
      v.literal("purchase_receipt"), v.literal("sales_issue"), v.literal("sales_return"),
      v.literal("purchase_return"), v.literal("adjustment_in"), v.literal("adjustment_out"),
      v.literal("transfer_out"), v.literal("transfer_in"), v.literal("opening_stock")
    ),
    movementDate: v.string(), periodId: v.id("accountingPeriods"),
    warehouseId: v.id("warehouses"), destinationWarehouseId: v.optional(v.id("warehouses")),
    sourceType: v.optional(v.string()), sourceId: v.optional(v.string()),
    documentStatus: v.union(v.literal("draft"), v.literal("confirmed"), v.literal("cancelled")),
    postingStatus: v.union(v.literal("unposted"), v.literal("posted")),
    journalEntryId: v.optional(v.id("journalEntries")),
    // ── Migration traceability ───────────────────────────────────────────────
    // Set when this movement was generated by a migration/promote run
    migrationRunId: v.optional(v.string()),
    notes: v.optional(v.string()), createdBy: v.id("users"), createdAt: v.number(),
  }).index("by_branch", ["branchId"])
    .index("by_warehouse", ["warehouseId"])
    .index("by_source", ["sourceType", "sourceId"])
    .index("by_type", ["movementType"]),

  inventoryMovementLines: defineTable({
    movementId: v.id("inventoryMovements"), itemId: v.id("items"),
    quantity: v.number(), uomId: v.id("unitOfMeasure"), unitCost: v.number(), totalCost: v.number(),
    qtyBefore: v.number(), qtyAfter: v.number(), avgCostBefore: v.number(), avgCostAfter: v.number(),
  }).index("by_movement", ["movementId"]).index("by_item", ["itemId"]),

  stockAdjustments: defineTable({
    companyId: v.id("companies"), branchId: v.id("branches"), adjustmentNumber: v.string(),
    adjustmentDate: v.string(), periodId: v.id("accountingPeriods"), warehouseId: v.id("warehouses"),
    adjustmentType: v.union(v.literal("increase"), v.literal("decrease")),
    reason: v.optional(v.string()),
    documentStatus: v.union(v.literal("draft"), v.literal("approved"), v.literal("cancelled")),
    postingStatus: v.union(v.literal("unposted"), v.literal("posted")),
    journalEntryId: v.optional(v.id("journalEntries")),
    approvedBy: v.optional(v.id("users")), approvedAt: v.optional(v.number()),
    notes: v.optional(v.string()), createdBy: v.id("users"), createdAt: v.number(),
  }).index("by_branch", ["branchId"]),

  stockAdjustmentLines: defineTable({
    adjustmentId: v.id("stockAdjustments"), itemId: v.id("items"),
    systemQty: v.number(), physicalQty: v.number(), varianceQty: v.number(),
    uomId: v.id("unitOfMeasure"), unitCost: v.number(), totalVarianceValue: v.number(),
    accountId: v.id("accounts"),
  }).index("by_adjustment", ["adjustmentId"]),

  wastageEntries: defineTable({
    companyId: v.id("companies"), branchId: v.id("branches"), warehouseId: v.id("warehouses"),
    entryNumber: v.string(), entryDate: v.string(), periodId: v.id("accountingPeriods"),
    reason: v.string(), notes: v.optional(v.string()), totalCost: v.number(),
    postingStatus: v.union(v.literal("unposted"), v.literal("posted")),
    journalEntryId: v.optional(v.id("journalEntries")),
    createdBy: v.id("users"), createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_branch", ["branchId"]),

  wastageLines: defineTable({
    wastageEntryId: v.id("wastageEntries"), itemId: v.id("items"),
    warehouseId: v.id("warehouses"), quantity: v.number(),
    uomId: v.id("unitOfMeasure"), unitCost: v.number(), totalCost: v.number(),
    notes: v.optional(v.string()),
  }).index("by_entry", ["wastageEntryId"]),

  auditLogs: defineTable({
    companyId: v.id("companies"), userId: v.id("users"), action: v.string(),
    module: v.string(), documentType: v.optional(v.string()), documentId: v.optional(v.string()),
    details: v.optional(v.string()), timestamp: v.number(), ipAddress: v.optional(v.string()),
  }).index("by_company", ["companyId"])
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    isActive: v.boolean(),
  }).index("by_token", ["token"])
    .index("by_user", ["userId"]),

  // ─── Posting Rules (auto-mapped GL accounts for each module) ────────────────

  postingRules: defineTable({
    companyId: v.id("companies"),
    // Sales
    cashSalesAccountId:               v.optional(v.id("accounts")),
    cardSalesAccountId:               v.optional(v.id("accounts")),
    arAccountId:                      v.optional(v.id("accounts")),
    defaultRevenueAccountId:          v.optional(v.id("accounts")),
    cogsAccountId:                    v.optional(v.id("accounts")),
    inventoryAccountId:               v.optional(v.id("accounts")),
    vatPayableAccountId:              v.optional(v.id("accounts")),
    // Purchases
    apAccountId:                      v.optional(v.id("accounts")),
    vatReceivableAccountId:           v.optional(v.id("accounts")),
    purchaseAccountId:                v.optional(v.id("accounts")),
    // Treasury
    mainCashAccountId:                v.optional(v.id("accounts")),
    bankAccountId:                    v.optional(v.id("accounts")),
    // Payroll
    salaryExpenseAccountId:           v.optional(v.id("accounts")),
    salaryPayableAccountId:           v.optional(v.id("accounts")),
    // Fixed Assets
    depreciationExpenseAccountId:     v.optional(v.id("accounts")),
    accumulatedDepreciationAccountId: v.optional(v.id("accounts")),
    // Production
    wipAccountId:                     v.optional(v.id("accounts")),
    // Wastage
    wastageExpenseAccountId:          v.optional(v.id("accounts")),
    updatedAt:                        v.optional(v.number()),
  }).index("by_company", ["companyId"]),

  // ─── Fixed Assets (Phase 19) ─────────────────────────────────────────────────

  fixedAssets: defineTable({
    companyId: v.id("companies"),
    assetCode: v.string(),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    category: v.optional(v.string()),
    purchaseDate: v.number(),
    inServiceDate: v.optional(v.number()),
    purchaseCost: v.number(),
    salvageValue: v.number(),
    usefulLifeMonths: v.number(),
    depreciationMethod: v.string(),
    status: v.union(v.literal("active"), v.literal("fully_depreciated"), v.literal("inactive")),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    costCenterId: v.optional(v.id("costCenters")),
    assetAccountId: v.optional(v.id("accounts")),
    depreciationExpenseAccountId: v.optional(v.id("accounts")),
    accumulatedDepreciationAccountId: v.optional(v.id("accounts")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_company_code", ["companyId", "assetCode"])
    .index("by_company_status", ["companyId", "status"]),

  assetDepreciationRuns: defineTable({
    companyId: v.id("companies"),
    runDate: v.number(),
    periodYear: v.number(),
    periodMonth: v.number(),
    status: v.union(v.literal("draft"), v.literal("posted")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_company_period", ["companyId", "periodYear", "periodMonth"]),

  assetDepreciationEntries: defineTable({
    companyId: v.id("companies"),
    runId: v.id("assetDepreciationRuns"),
    assetId: v.id("fixedAssets"),
    periodYear: v.number(),
    periodMonth: v.number(),
    depreciationAmount: v.number(),
    bookValueBefore: v.number(),
    bookValueAfter: v.number(),
    journalEntryId: v.optional(v.id("journalEntries")),
    createdAt: v.number(),
  }).index("by_run", ["runId"])
    .index("by_asset", ["assetId"]),

  // ─── HR Module (Phase 20) ────────────────────────────────────────────────────

  hrDepartments: defineTable({
    companyId: v.id("companies"),
    code: v.string(),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    parentId: v.optional(v.id("hrDepartments")),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_company", ["companyId"]),

  hrDesignations: defineTable({
    companyId: v.id("companies"),
    code: v.string(),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    departmentId: v.optional(v.id("hrDepartments")),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_company", ["companyId"]),

  hrLeaveTypes: defineTable({
    companyId: v.id("companies"),
    code: v.string(),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    isPaid: v.boolean(),
    defaultDaysPerYear: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_company", ["companyId"]),

  hrEmployees: defineTable({
    companyId: v.id("companies"),
    branchId: v.id("branches"),
    employeeCode: v.string(),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    nationalId: v.optional(v.string()),        // QID number
    qidExpiryDate: v.optional(v.string()),     // QID / Iqama expiry date YYYY-MM-DD
    sponsorshipStatus: v.optional(v.string()), // e.g. "Arirang Bakery", "Outside/PETRO FOAM"
    nationality: v.optional(v.string()),
    passportNumber: v.optional(v.string()),
    passportExpiryDate: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    mobile: v.optional(v.string()),
    address: v.optional(v.string()),
    departmentId: v.optional(v.id("hrDepartments")),
    designationId: v.optional(v.id("hrDesignations")),
    managerId: v.optional(v.id("hrEmployees")),
    hireDate: v.string(),
    terminationDate: v.optional(v.string()),
    employmentType: v.union(
      v.literal("full_time"), v.literal("part_time"),
      v.literal("contractor"), v.literal("temporary")
    ),
    status: v.union(
      v.literal("active"), v.literal("inactive"),
      v.literal("terminated"), v.literal("on_leave")
    ),
    basicSalary: v.number(),
    housingAllowance: v.optional(v.number()),
    transportAllowance: v.optional(v.number()),
    otherAllowance: v.optional(v.number()),
    salaryBasis: v.union(v.literal("monthly"), v.literal("daily"), v.literal("hourly")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_company_code", ["companyId", "employeeCode"])
    .index("by_company_status", ["companyId", "status"])
    .index("by_department", ["departmentId"])
    .searchIndex("search_employees", { searchField: "nameAr", filterFields: ["companyId"] }),

  hrAttendance: defineTable({
    companyId: v.id("companies"),
    employeeId: v.id("hrEmployees"),
    attendanceDate: v.string(),
    status: v.union(
      v.literal("present"), v.literal("absent"), v.literal("late"),
      v.literal("half_day"), v.literal("on_leave"), v.literal("holiday"), v.literal("weekend")
    ),
    checkIn: v.optional(v.string()),
    checkOut: v.optional(v.string()),
    workedHours: v.optional(v.number()),
    overtimeHours: v.optional(v.number()),
    lateMinutes: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_employee", ["employeeId"])
    .index("by_employee_date", ["employeeId", "attendanceDate"])
    .index("by_company_date", ["companyId", "attendanceDate"]),

  hrLeaveRequests: defineTable({
    companyId: v.id("companies"),
    employeeId: v.id("hrEmployees"),
    leaveTypeId: v.id("hrLeaveTypes"),
    startDate: v.string(),
    endDate: v.string(),
    totalDays: v.number(),
    reason: v.optional(v.string()),
    status: v.union(
      v.literal("pending"), v.literal("approved"),
      v.literal("rejected"), v.literal("cancelled")
    ),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_employee", ["employeeId"])
    .index("by_company_status", ["companyId", "status"]),

  hrLeaveBalances: defineTable({
    companyId: v.id("companies"),
    employeeId: v.id("hrEmployees"),
    leaveTypeId: v.id("hrLeaveTypes"),
    year: v.number(),
    allocatedDays: v.number(),
    usedDays: v.number(),
    pendingDays: v.number(),
  }).index("by_employee_year", ["employeeId", "year"])
    .index("by_company_year", ["companyId", "year"])
    .index("by_employee_type_year", ["employeeId", "leaveTypeId", "year"]),

  hrPayrollRuns: defineTable({
    companyId: v.id("companies"),
    branchId: v.id("branches"),
    periodYear: v.number(),
    periodMonth: v.number(),
    status: v.union(v.literal("draft"), v.literal("processed"), v.literal("paid")),
    totalBasic: v.number(),
    totalAllowances: v.number(),
    totalDeductions: v.number(),
    totalOvertimePay: v.number(),
    totalNetPay: v.number(),
    employeeCount: v.number(),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    processedAt: v.optional(v.number()),
  }).index("by_company", ["companyId"])
    .index("by_company_period", ["companyId", "periodYear", "periodMonth"]),

  hrPayrollItems: defineTable({
    companyId: v.id("companies"),
    runId: v.id("hrPayrollRuns"),
    employeeId: v.id("hrEmployees"),
    basicSalary: v.number(),
    housingAllowance: v.number(),
    transportAllowance: v.number(),
    otherAllowance: v.number(),
    overtimePay: v.number(),
    unpaidLeaveDeduction: v.number(),
    otherDeductions: v.number(),
    grossSalary: v.number(),
    netSalary: v.number(),
    workingDays: v.number(),
    presentDays: v.number(),
    absentDays: v.number(),
    overtimeHours: v.number(),
    leaveDeductionDays: v.number(),
  }).index("by_run", ["runId"])
    .index("by_employee", ["employeeId"])
    .index("by_run_employee", ["runId", "employeeId"]),

  // ─── Legacy import tables (READ-ONLY snapshot from Excel — do not modify core tables) ───

  legacyItems: defineTable({
    itemCode: v.string(),
    itemName: v.string(),
    itemGroup: v.optional(v.string()),
    itemType: v.optional(v.string()),
    uom: v.optional(v.string()),
    unitPrice: v.optional(v.number()),
    notes: v.optional(v.string()),
    sourceFile: v.string(),
    reviewStatus: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
    updatedBy: v.optional(v.string()),
    // Mapping fields (reference-only, no FK enforcement)
    mappedItemId: v.optional(v.string()),
  }).index("by_itemCode", ["itemCode"])
    .index("by_sourceFile", ["sourceFile"]),

  legacyRecipes: defineTable({
    fgCode: v.string(),
    fgName: v.optional(v.string()),
    componentCode: v.string(),
    componentName: v.optional(v.string()),
    componentUom: v.optional(v.string()),
    quantity: v.optional(v.number()),
    unitCost: v.optional(v.number()),
    lineTotal: v.optional(v.number()),
    sourceFile: v.string(),
    reviewStatus: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
    updatedBy: v.optional(v.string()),
    // Mapping fields (reference-only, no FK enforcement)
    mappedOutputItemId: v.optional(v.string()),
  }).index("by_fgCode", ["fgCode"]),

  legacyInventorySnapshot: defineTable({
    snapshotDate: v.optional(v.string()),
    branchName: v.optional(v.string()),
    itemCode: v.string(),
    itemName: v.optional(v.string()),
    itemType: v.optional(v.string()),
    category: v.optional(v.string()),
    uom: v.optional(v.string()),
    unitPrice: v.optional(v.number()),
    openingQty: v.optional(v.number()),
    totalReceivedQty: v.optional(v.number()),
    totalOutQty: v.optional(v.number()),
    balanceQty: v.optional(v.number()),
    balanceValue: v.optional(v.number()),
    sourceFile: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  }).index("by_itemCode", ["itemCode"]),
});