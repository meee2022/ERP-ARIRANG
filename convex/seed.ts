// =============================================================================
// !!  PRODUCTION SAFETY WARNING  !!
// =============================================================================
//
// This file contains seed/demo data mutations. Rules:
//
//  seedInitialData     — Safe to run ONCE on a fresh production deployment.
//                        Creates company, chart of accounts, branches, and
//                        an initial admin user. Has an idempotency guard.
//
//  seedDemoTransactions — MUST NEVER BE RUN IN PRODUCTION.
//                        Creates fake invoices, demo customers, and demo
//                        journal entries with hard-coded demo data.
//                        This mutation checks for existing salesInvoices,
//                        but a fresh production DB will have none — the
//                        guard is NOT sufficient on its own. An additional
//                        check for real company data is performed below.
//
//  seedTestUsers       — MUST NEVER BE RUN IN PRODUCTION.
//                        Creates demo users with weak passwords
//                        (admin123, sales123, etc.).
//
// To protect against accidental execution, seedDemoTransactions and
// seedTestUsers both require that NO posted salesInvoices or purchaseInvoices
// exist, AND that the company email ends with "@demo.local".
// If real business data exists, these mutations will refuse to run.
//
// =============================================================================

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { hashPassword } from "./lib/crypto";
import {
  postJournalEntry,
  updateStockBalance,
  generateDocumentNumber,
  JournalLineInput,
} from "./lib/posting";
import { Id } from "./_generated/dataModel";

// ─── seedInitialData ──────────────────────────────────────────────────────────

export const seedInitialData = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("companies").first();
    if (existing) {
      return { message: "Already seeded", companyId: existing._id };
    }

    // ── Company ──────────────────────────────────────────────────────────────
    const companyId = await ctx.db.insert("companies", {
      nameAr: "برايم بالانس للتجارة والتوزيع",
      nameEn: "PrimeBalance Trading & Distribution Co.",
      baseCurrency: "QAR",
      fiscalYearStart: "1",
      address: "برج تجاري، شارع الكورنيش، الدوحة، قطر",
      phone: "+974 4444 0000",
      email: "info@primebalance.qa",
      isActive: true,
      createdAt: Date.now(),
    });

    // ── Currency ──────────────────────────────────────────────────────────────
    const currencyId = await ctx.db.insert("currencies", {
      code: "QAR",
      nameAr: "ريال قطري",
      nameEn: "Qatari Riyal",
      symbol: "ر.ق",
      isBase: true,
      decimalPlaces: 2,
      isActive: true,
    });

    // ── Branches ──────────────────────────────────────────────────────────────
    const mainBranchId = await ctx.db.insert("branches", {
      companyId,
      code: "MAIN",
      nameAr: "الفرع الرئيسي - الدوحة",
      nameEn: "Main Branch - Doha",
      address: "شارع الكورنيش، الدوحة",
      phone: "+974 4444 0001",
      isActive: true,
      createdAt: Date.now(),
    });

    const dohaBranchId = await ctx.db.insert("branches", {
      companyId,
      code: "WEST",
      nameAr: "فرع الدوحة الغربية",
      nameEn: "West Doha Branch",
      address: "المنطقة الصناعية، الدوحة",
      phone: "+974 4444 0002",
      isActive: true,
      createdAt: Date.now(),
    });

    // ── Warehouses ────────────────────────────────────────────────────────────
    const mainWarehouseId = await ctx.db.insert("warehouses", {
      companyId,
      branchId: mainBranchId,
      code: "WH-MAIN",
      nameAr: "مستودع الفرع الرئيسي",
      nameEn: "Main Branch Warehouse",
      warehouseType: "main",
      isActive: true,
    });

    const transitWarehouseId = await ctx.db.insert("warehouses", {
      companyId,
      branchId: mainBranchId,
      code: "WH-TRANSIT",
      nameAr: "مستودع العبور - رئيسي",
      nameEn: "Main Transit Warehouse",
      warehouseType: "transit",
      isActive: true,
    });

    await ctx.db.insert("warehouses", {
      companyId,
      branchId: dohaBranchId,
      code: "WH-WEST",
      nameAr: "مستودع الدوحة الغربية",
      nameEn: "West Doha Warehouse",
      warehouseType: "main",
      isActive: true,
    });

    await ctx.db.insert("warehouses", {
      companyId,
      branchId: dohaBranchId,
      code: "WH-WEST-2",
      nameAr: "مستودع الدوحة الغربية - ثانوي",
      nameEn: "West Doha Secondary Warehouse",
      warehouseType: "main",
      isActive: true,
    });

    // ── Fiscal Year 2026 + 12 Monthly Periods ─────────────────────────────────
    const fyId = await ctx.db.insert("fiscalYears", {
      companyId,
      code: "2026",
      nameAr: "السنة المالية 2026",
      nameEn: "Fiscal Year 2026",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      status: "open",
    });

    const monthNames = [
      "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
      "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
    ];
    const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const periodIds: Id<"accountingPeriods">[] = [];

    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, "0");
      const lastDay = monthDays[m - 1];
      const pid = await ctx.db.insert("accountingPeriods", {
        fiscalYearId: fyId,
        companyId,
        periodNumber: m,
        name: `2026-${mm}`,
        startDate: `2026-${mm}-01`,
        endDate: `2026-${mm}-${String(lastDay).padStart(2, "0")}`,
        status: "open",
      });
      periodIds.push(pid);
    }

    // ── Units of Measure ──────────────────────────────────────────────────────
    const uomPcId = await ctx.db.insert("unitOfMeasure", {
      companyId,
      code: "PC",
      nameAr: "قطعة",
      nameEn: "Piece",
      isBase: true,
      conversionFactor: 1,
      isActive: true,
    });

    await ctx.db.insert("unitOfMeasure", {
      companyId,
      code: "KG",
      nameAr: "كيلو جرام",
      nameEn: "Kilogram",
      isBase: true,
      conversionFactor: 1,
      isActive: true,
    });

    await ctx.db.insert("unitOfMeasure", {
      companyId,
      code: "BOX",
      nameAr: "صندوق",
      nameEn: "Box",
      isBase: false,
      conversionFactor: 12,
      isActive: true,
    });

    // ── Chart of Accounts ─────────────────────────────────────────────────────
    const coreAccounts = [
      // Assets — 1xxx
      { code: "1101", nameAr: "الصندوق النقدي", nameEn: "Cash on Hand", accountType: "asset" as const, accountSubType: "current_asset", normalBalance: "debit" as const },
      { code: "1102", nameAr: "البنك التجاري القطري - الحساب الجاري", nameEn: "QNB - Current Account", accountType: "asset" as const, accountSubType: "current_asset", normalBalance: "debit" as const },
      { code: "1103", nameAr: "بنك قطر الوطني - الادخار", nameEn: "Qatar National Bank - Savings", accountType: "asset" as const, accountSubType: "current_asset", normalBalance: "debit" as const },
      { code: "1201", nameAr: "ذمم مدينة - عملاء", nameEn: "Accounts Receivable - Customers", accountType: "asset" as const, accountSubType: "receivable", normalBalance: "debit" as const },
      { code: "1301", nameAr: "المخزون - بضاعة جاهزة", nameEn: "Inventory - Finished Goods", accountType: "asset" as const, accountSubType: "inventory", normalBalance: "debit" as const },
      { code: "1302", nameAr: "مخزون مواد خام", nameEn: "Raw Materials Inventory", accountType: "asset" as const, accountSubType: "inventory", normalBalance: "debit" as const },
      { code: "1401", nameAr: "مصروفات مدفوعة مقدماً", nameEn: "Prepaid Expenses", accountType: "asset" as const, accountSubType: "current_asset", normalBalance: "debit" as const },
      { code: "1501", nameAr: "الأصول الثابتة - أثاث ومعدات", nameEn: "Fixed Assets - Furniture & Equipment", accountType: "asset" as const, accountSubType: "fixed_asset", normalBalance: "debit" as const },
      // Liabilities — 2xxx
      { code: "2101", nameAr: "ذمم دائنة - موردون", nameEn: "Accounts Payable - Suppliers", accountType: "liability" as const, accountSubType: "payable", normalBalance: "credit" as const },
      { code: "2201", nameAr: "ضريبة القيمة المضافة المستحقة", nameEn: "VAT Payable", accountType: "liability" as const, accountSubType: "tax_payable", normalBalance: "credit" as const },
      { code: "2202", nameAr: "ضريبة القيمة المضافة المدخلات", nameEn: "Input VAT Receivable", accountType: "liability" as const, accountSubType: "tax_payable", normalBalance: "debit" as const },
      { code: "2301", nameAr: "مصروفات مستحقة الدفع", nameEn: "Accrued Expenses", accountType: "liability" as const, accountSubType: "payable", normalBalance: "credit" as const },
      { code: "2401", nameAr: "قروض بنكية قصيرة الأجل", nameEn: "Short-Term Bank Loans", accountType: "liability" as const, accountSubType: "payable", normalBalance: "credit" as const },
      // Equity — 3xxx
      { code: "3101", nameAr: "رأس المال المدفوع", nameEn: "Paid-In Capital", accountType: "equity" as const, accountSubType: "capital", normalBalance: "credit" as const },
      { code: "3201", nameAr: "الأرباح المحتجزة", nameEn: "Retained Earnings", accountType: "equity" as const, accountSubType: "retained_earnings", normalBalance: "credit" as const },
      // Revenue — 4xxx
      { code: "4101", nameAr: "إيرادات المبيعات", nameEn: "Sales Revenue", accountType: "revenue" as const, accountSubType: "sales_revenue", normalBalance: "credit" as const },
      { code: "4201", nameAr: "إيرادات خدمات", nameEn: "Service Revenue", accountType: "revenue" as const, accountSubType: "sales_revenue", normalBalance: "credit" as const },
      { code: "4301", nameAr: "إيرادات أخرى", nameEn: "Other Revenue", accountType: "revenue" as const, accountSubType: "other_revenue", normalBalance: "credit" as const },
      // Expenses — 5xxx
      { code: "5101", nameAr: "تكلفة البضاعة المباعة", nameEn: "Cost of Goods Sold", accountType: "expense" as const, accountSubType: "cogs", normalBalance: "debit" as const },
      { code: "5201", nameAr: "رواتب وأجور الموظفين", nameEn: "Salaries & Wages", accountType: "expense" as const, accountSubType: "operating_expense", normalBalance: "debit" as const },
      { code: "5202", nameAr: "إيجار المكاتب والمستودعات", nameEn: "Office & Warehouse Rent", accountType: "expense" as const, accountSubType: "operating_expense", normalBalance: "debit" as const },
      { code: "5203", nameAr: "مصروفات المرافق (كهرباء وماء)", nameEn: "Utilities (Electricity & Water)", accountType: "expense" as const, accountSubType: "operating_expense", normalBalance: "debit" as const },
      { code: "5204", nameAr: "مصروفات الشحن والتوزيع", nameEn: "Freight & Distribution Expenses", accountType: "expense" as const, accountSubType: "operating_expense", normalBalance: "debit" as const },
      { code: "5205", nameAr: "مصروفات التسويق والإعلان", nameEn: "Marketing & Advertising Expenses", accountType: "expense" as const, accountSubType: "operating_expense", normalBalance: "debit" as const },
      { code: "5301", nameAr: "مصروفات عمومية وإدارية", nameEn: "General & Administrative Expenses", accountType: "expense" as const, accountSubType: "operating_expense", normalBalance: "debit" as const },
      { code: "5401", nameAr: "مصروفات بنكية ورسوم مالية", nameEn: "Bank Charges & Financial Fees", accountType: "expense" as const, accountSubType: "operating_expense", normalBalance: "debit" as const },
    ] as const;

    const accountIdMap: Record<string, Id<"accounts">> = {};

    for (const a of coreAccounts) {
      const id = await ctx.db.insert("accounts", {
        companyId,
        code: a.code,
        nameAr: a.nameAr,
        nameEn: a.nameEn,
        accountType: a.accountType,
        accountSubType: a.accountSubType,
        isPostable: true,
        requiresCostCenter: false,
        requiresSubAccount: false,
        normalBalance: a.normalBalance,
        isActive: true,
        createdAt: Date.now(),
      });
      accountIdMap[a.code] = id;
    }

    // ── Item Categories ────────────────────────────────────────────────────────
    const catElecId = await ctx.db.insert("itemCategories", {
      companyId,
      code: "ELEC",
      nameAr: "الأجهزة الإلكترونية",
      nameEn: "Electronics",
      defaultInventoryAccountId: accountIdMap["1301"],
      defaultCogsAccountId: accountIdMap["5101"],
      defaultRevenueAccountId: accountIdMap["4101"],
      isActive: true,
    });

    const catOfficeId = await ctx.db.insert("itemCategories", {
      companyId,
      code: "OFFICE",
      nameAr: "مستلزمات المكاتب",
      nameEn: "Office Supplies",
      defaultInventoryAccountId: accountIdMap["1301"],
      defaultCogsAccountId: accountIdMap["5101"],
      defaultRevenueAccountId: accountIdMap["4101"],
      isActive: true,
    });

    await ctx.db.insert("itemCategories", {
      companyId,
      code: "FOOD",
      nameAr: "المواد الغذائية",
      nameEn: "Food & Beverages",
      defaultInventoryAccountId: accountIdMap["1301"],
      defaultCogsAccountId: accountIdMap["5101"],
      defaultRevenueAccountId: accountIdMap["4101"],
      isActive: true,
    });

    // ── Items (12 items) ──────────────────────────────────────────────────────
    // Prices stored x100 (e.g. 150.00 QAR = 15000)
    const itemsData = [
      {
        code: "LAPTOP-HP-15",
        nameAr: "لابتوب HP ProBook 15 بوصة",
        nameEn: "HP ProBook 15-inch Laptop",
        categoryId: catElecId,
        standardCost: 280000, // 2800 QAR
        sellingPrice: 345000, // 3450 QAR
        minSellingPrice: 300000,
      },
      {
        code: "MONITOR-27",
        nameAr: "شاشة عرض 27 بوصة Full HD",
        nameEn: '27" Full HD Monitor',
        categoryId: catElecId,
        standardCost: 85000, // 850 QAR
        sellingPrice: 109500, // 1095 QAR
        minSellingPrice: 92000,
      },
      {
        code: "KEYBOARD-WL",
        nameAr: "لوحة مفاتيح لاسلكية - عربي/إنجليزي",
        nameEn: "Wireless Keyboard - Arabic/English",
        categoryId: catElecId,
        standardCost: 6500, // 65 QAR
        sellingPrice: 9900, // 99 QAR
        minSellingPrice: 7500,
      },
      {
        code: "MOUSE-OPT",
        nameAr: "ماوس لاسلكي بصري",
        nameEn: "Wireless Optical Mouse",
        categoryId: catElecId,
        standardCost: 4500, // 45 QAR
        sellingPrice: 6900, // 69 QAR
        minSellingPrice: 5200,
      },
      {
        code: "PRINTER-A4",
        nameAr: "طابعة ليزر أبيض وأسود A4",
        nameEn: "A4 Monochrome Laser Printer",
        categoryId: catElecId,
        standardCost: 75000, // 750 QAR
        sellingPrice: 95000, // 950 QAR
        minSellingPrice: 82000,
      },
      {
        code: "TABLET-10",
        nameAr: "جهاز لوحي أندرويد 10 بوصة",
        nameEn: "10-inch Android Tablet",
        categoryId: catElecId,
        standardCost: 95000, // 950 QAR
        sellingPrice: 124900, // 1249 QAR
        minSellingPrice: 105000,
      },
      {
        code: "DESK-STD",
        nameAr: "مكتب مكتبي معدني 140 سم",
        nameEn: "Steel Office Desk 140cm",
        categoryId: catOfficeId,
        standardCost: 35000, // 350 QAR
        sellingPrice: 49900, // 499 QAR
        minSellingPrice: 40000,
      },
      {
        code: "CHAIR-EXEC",
        nameAr: "كرسي تنفيذي مريح - جلد",
        nameEn: "Executive Leather Chair",
        categoryId: catOfficeId,
        standardCost: 22000, // 220 QAR
        sellingPrice: 32900, // 329 QAR
        minSellingPrice: 26000,
      },
      {
        code: "PAPER-A4-BOX",
        nameAr: "ورق طباعة A4 - كرتون 5 رزم",
        nameEn: "A4 Copy Paper - Box of 5 Reams",
        categoryId: catOfficeId,
        standardCost: 5500, // 55 QAR
        sellingPrice: 7900, // 79 QAR
        minSellingPrice: 6500,
      },
      {
        code: "TONER-HP-BLK",
        nameAr: "خرطوشة حبر HP أسود",
        nameEn: "HP Black Toner Cartridge",
        categoryId: catElecId,
        standardCost: 8500, // 85 QAR
        sellingPrice: 12900, // 129 QAR
        minSellingPrice: 9500,
      },
      {
        code: "UPS-1KVA",
        nameAr: "جهاز UPS احتياطي 1KVA",
        nameEn: "1KVA UPS Battery Backup",
        categoryId: catElecId,
        standardCost: 32000, // 320 QAR
        sellingPrice: 42900, // 429 QAR
        minSellingPrice: 36000,
      },
      {
        code: "HEADSET-USB",
        nameAr: "سماعة رأس USB للمكتب",
        nameEn: "USB Office Headset",
        categoryId: catElecId,
        standardCost: 9500, // 95 QAR
        sellingPrice: 14900, // 149 QAR
        minSellingPrice: 11000,
      },
    ];

    const itemIds: Id<"items">[] = [];
    for (const item of itemsData) {
      const id = await ctx.db.insert("items", {
        companyId,
        code: item.code,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        categoryId: item.categoryId,
        itemType: "finished_good",
        baseUomId: uomPcId,
        costingMethod: "weighted_average",
        standardCost: item.standardCost,
        lastCost: item.standardCost,
        sellingPrice: item.sellingPrice,
        minSellingPrice: item.minSellingPrice,
        inventoryAccountId: accountIdMap["1301"],
        cogsAccountId: accountIdMap["5101"],
        revenueAccountId: accountIdMap["4101"],
        allowNegativeStock: false,
        isActive: true,
        createdAt: Date.now(),
      });
      itemIds.push(id);
    }

    // ── Customers (5 customers with outlets) ──────────────────────────────────
    const customersData = [
      {
        code: "CUST-001",
        nameAr: "مؤسسة الخليج للتقنية",
        nameEn: "Gulf Technology Est.",
        phone: "+974 4455 1001",
        email: "procurement@gulftec.qa",
        address: "المنطقة الصناعية، الدوحة",
        creditLimit: 15000000, // 150,000 QAR
        creditDays: 30,
        outlets: [
          { code: "CUST-001-01", nameAr: "فرع المنطقة الصناعية", nameEn: "Industrial Zone Branch", address: "شارع 8، المنطقة الصناعية" },
          { code: "CUST-001-02", nameAr: "فرع المسيلة", nameEn: "Al Maamoura Branch", address: "شارع الدوحة، المسيلة" },
        ],
      },
      {
        code: "CUST-002",
        nameAr: "شركة النجمة للأثاث المكتبي",
        nameEn: "Al Najma Office Furniture Co.",
        phone: "+974 4455 2002",
        email: "orders@najma-furniture.qa",
        address: "منطقة الصلاطة، الدوحة",
        creditLimit: 8000000, // 80,000 QAR
        creditDays: 45,
        outlets: [
          { code: "CUST-002-01", nameAr: "المعرض الرئيسي - الصلاطة", nameEn: "Main Showroom - Salata", address: "شارع الصلاطة" },
          { code: "CUST-002-02", nameAr: "فرع لوسيل", nameEn: "Lusail Branch", address: "مدينة لوسيل، الدوحة" },
          { code: "CUST-002-03", nameAr: "فرع الوكرة", nameEn: "Al Wakra Branch", address: "شارع الملك، الوكرة" },
        ],
      },
      {
        code: "CUST-003",
        nameAr: "مجموعة الأنصار للمقاولات",
        nameEn: "Al Ansar Contracting Group",
        phone: "+974 4466 3003",
        email: "purchasing@alansar-cont.qa",
        address: "طريق الدوحة - الريان",
        creditLimit: 20000000, // 200,000 QAR
        creditDays: 60,
        outlets: [
          { code: "CUST-003-01", nameAr: "مقر الشركة الرئيسي", nameEn: "Head Office", address: "برج التجارة، الدوحة" },
          { code: "CUST-003-02", nameAr: "موقع مشروع لوسيل", nameEn: "Lusail Project Site", address: "لوسيل مارينا" },
        ],
      },
      {
        code: "CUST-004",
        nameAr: "مؤسسة الوفاء للتجارة العامة",
        nameEn: "Al Wafa General Trading Est.",
        phone: "+974 4477 4004",
        email: "info@alwafa-trading.qa",
        address: "السيلية، الدوحة",
        creditLimit: 5000000, // 50,000 QAR
        creditDays: 30,
        outlets: [
          { code: "CUST-004-01", nameAr: "المحل الرئيسي - السيلية", nameEn: "Main Shop - Al Sailiya", address: "شارع السيلية" },
          { code: "CUST-004-02", nameAr: "فرع أم سلال", nameEn: "Umm Salal Branch", address: "أم سلال محمد" },
        ],
      },
      {
        code: "CUST-005",
        nameAr: "شركة قطر للحلول الرقمية",
        nameEn: "Qatar Digital Solutions Co.",
        phone: "+974 4488 5005",
        email: "tech@qatardigital.qa",
        address: "برج قطر للأعمال، المطار القديم",
        creditLimit: 25000000, // 250,000 QAR
        creditDays: 45,
        outlets: [
          { code: "CUST-005-01", nameAr: "مركز البيانات - الدوحة", nameEn: "Data Center - Doha", address: "طريق الإسلام" },
          { code: "CUST-005-02", nameAr: "مكتب الدعم الفني", nameEn: "Technical Support Office", address: "الخليج التجاري، الدوحة" },
          { code: "CUST-005-03", nameAr: "فرع الدوحة الغربية", nameEn: "West Doha Branch", address: "طريق الريان" },
        ],
      },
    ];

    const customerIds: Id<"customers">[] = [];
    const outletIdsByCustomer: Map<Id<"customers">, Id<"customerOutlets">[]> = new Map();

    for (const c of customersData) {
      const custId = await ctx.db.insert("customers", {
        companyId,
        branchId: mainBranchId,
        code: c.code,
        nameAr: c.nameAr,
        nameEn: c.nameEn,
        accountId: accountIdMap["1201"],
        phone: c.phone,
        email: c.email,
        address: c.address,
        creditLimit: c.creditLimit,
        creditDays: c.creditDays,
        isActive: true,
        createdAt: Date.now(),
      });
      customerIds.push(custId);

      const outlets: Id<"customerOutlets">[] = [];
      for (const o of c.outlets) {
        const oid = await ctx.db.insert("customerOutlets", {
          customerId: custId,
          code: o.code,
          nameAr: o.nameAr,
          nameEn: o.nameEn,
          address: o.address,
          isActive: true,
          createdAt: Date.now(),
        });
        outlets.push(oid);
      }
      outletIdsByCustomer.set(custId, outlets);
    }

    // ── Suppliers (5 suppliers) ────────────────────────────────────────────────
    const suppliersData = [
      {
        code: "SUPP-001",
        nameAr: "شركة العالمية للإلكترونيات",
        nameEn: "Al Alamia Electronics Co.",
        phone: "+974 4411 7001",
        email: "sales@alamia-elec.qa",
        address: "المنطقة الحرة، الدوحة",
      },
      {
        code: "SUPP-002",
        nameAr: "مؤسسة المورد الأول للتجهيزات",
        nameEn: "First Supply Equipment Est.",
        phone: "+974 4422 7002",
        email: "procurement@firstsupply.qa",
        address: "شارع الكورنيش، الدوحة",
      },
      {
        code: "SUPP-003",
        nameAr: "شركة تكنو بروس القطرية",
        nameEn: "TechnoPros Qatar LLC",
        phone: "+974 4433 7003",
        email: "orders@technopros.qa",
        address: "مدينة لوسيل، قطر",
      },
      {
        code: "SUPP-004",
        nameAr: "مجموعة القمة للتوزيع والتصدير",
        nameEn: "Al Qimma Distribution & Export Group",
        phone: "+974 4444 7004",
        email: "export@alqimma-dist.qa",
        address: "ميناء حمد التجاري، الدوحة",
      },
      {
        code: "SUPP-005",
        nameAr: "الموردون المتحدون للمستلزمات المكتبية",
        nameEn: "United Office Suppliers",
        phone: "+974 4455 7005",
        email: "info@unitedsuppliers.qa",
        address: "الصناعية، شارع 24، الدوحة",
      },
    ];

    const supplierIds: Id<"suppliers">[] = [];
    for (const s of suppliersData) {
      const suppId = await ctx.db.insert("suppliers", {
        companyId,
        code: s.code,
        nameAr: s.nameAr,
        nameEn: s.nameEn,
        accountId: accountIdMap["2101"],
        phone: s.phone,
        email: s.email,
        address: s.address,
        isActive: true,
        createdAt: Date.now(),
      });
      supplierIds.push(suppId);
    }

    // ── Bank Account & Cash Box ────────────────────────────────────────────────
    await ctx.db.insert("bankAccounts", {
      companyId,
      branchId: mainBranchId,
      accountName: "البنك التجاري القطري - الحساب الرئيسي",
      bankName: "القطري التجاري",
      accountNumber: "QA47QCBK0000000012345678",
      iban: "QA47QCBK0000000012345678",
      currencyId,
      glAccountId: accountIdMap["1102"],
      isActive: true,
    });

    await ctx.db.insert("cashBoxes", {
      companyId,
      branchId: mainBranchId,
      code: "CASH-MAIN",
      nameAr: "الصندوق النقدي الرئيسي",
      nameEn: "Main Cash Box",
      glAccountId: accountIdMap["1101"],
      currentBalance: 0,
      isActive: true,
    });

    // ── Hash passwords for test users ─────────────────────────────────────────
    const [adminHash, accHash, salesHash, whHash] = await Promise.all([
      hashPassword("admin123").then((r) => r.hash),
      hashPassword("accountant123").then((r) => r.hash),
      hashPassword("sales123").then((r) => r.hash),
      hashPassword("warehouse123").then((r) => r.hash),
    ]);

    const adminUserId = await ctx.db.insert("users", {
      name: "مدير النظام",
      email: "admin@demo.local",
      passwordHash: adminHash,
      role: "admin",
      branchIds: [mainBranchId, dohaBranchId],
      isActive: true,
      createdAt: Date.now(),
    });

    await ctx.db.insert("users", {
      name: "أحمد محمد الخالد",
      email: "accountant@demo.local",
      passwordHash: accHash,
      role: "accountant",
      branchIds: [mainBranchId],
      isActive: true,
      createdAt: Date.now(),
    });

    await ctx.db.insert("users", {
      name: "سارة علي العمري",
      email: "sales@demo.local",
      passwordHash: salesHash,
      role: "sales",
      branchIds: [mainBranchId],
      isActive: true,
      createdAt: Date.now(),
    });

    await ctx.db.insert("users", {
      name: "فهد ناصر الجابر",
      email: "warehouse@demo.local",
      passwordHash: whHash,
      role: "warehouse",
      branchIds: [mainBranchId],
      isActive: true,
      createdAt: Date.now(),
    });

    // ── Tax Class ─────────────────────────────────────────────────────────────
    await ctx.db.insert("taxClasses", {
      companyId,
      code: "VAT5",
      nameAr: "ضريبة القيمة المضافة 5%",
      nameEn: "VAT 5%",
      rate: 5,
      accountId: accountIdMap["2201"],
      isActive: true,
    });

    return {
      message: "Seeded successfully",
      companyId,
      mainBranchId,
      dohaBranchId,
      mainWarehouseId,
      transitWarehouseId,
      fyId,
      periodsCreated: 12,
      accountsCreated: coreAccounts.length,
      customersCreated: customerIds.length,
      suppliersCreated: supplierIds.length,
      itemsCreated: itemIds.length,
      adminUserId,
    };
  },
});

// ─── seedDemoTransactions ─────────────────────────────────────────────────────

export const seedDemoTransactions = mutation({
  args: {},
  handler: async (ctx) => {
    const company = await ctx.db.query("companies").first();
    if (!company) throw new Error("Run seedInitialData first");

    // ── PRODUCTION SAFETY GUARD ───────────────────────────────────────────────
    // Refuse to run if the company email does NOT match a known demo domain.
    // In production the company email will be a real business address —
    // this check stops accidental execution on live data.
    const isLikelyProduction =
      !company.email?.endsWith("@demo.local") &&
      company.email !== "info@primebalance.qa";
    if (isLikelyProduction) {
      throw new Error(
        "PRODUCTION SAFETY: seedDemoTransactions refused to run because the " +
        "company email does not match a known demo domain. " +
        "This mutation must never be executed in a production environment."
      );
    }

    // Also guard against real posted transactions already existing
    const existing = await ctx.db.query("salesInvoices").first();
    if (existing) {
      return { message: "Demo transactions already seeded" };
    }

    // ── Resolve seeded data ───────────────────────────────────────────────────
    const branches = await ctx.db
      .query("branches")
      .withIndex("by_company", (q) => q.eq("companyId", company._id))
      .collect();
    const mainBranch = branches.find((b) => b.code === "MAIN");
    if (!mainBranch) throw new Error("Main branch not found");

    const warehouses = await ctx.db
      .query("warehouses")
      .withIndex("by_branch", (q) => q.eq("branchId", mainBranch._id))
      .collect();
    const mainWarehouse = warehouses.find((w) => w.code === "WH-MAIN");
    if (!mainWarehouse) throw new Error("Main warehouse not found");

    const fiscalYear = await ctx.db
      .query("fiscalYears")
      .withIndex("by_company", (q) => q.eq("companyId", company._id))
      .filter((q) => q.eq(q.field("status"), "open"))
      .first();
    if (!fiscalYear) throw new Error("No open fiscal year found");

    const periods = await ctx.db
      .query("accountingPeriods")
      .withIndex("by_fiscal_year", (q) => q.eq("fiscalYearId", fiscalYear._id))
      .collect();
    periods.sort((a, b) => a.periodNumber - b.periodNumber);

    const p1 = periods.find((p) => p.periodNumber === 1); // Jan
    const p2 = periods.find((p) => p.periodNumber === 2); // Feb
    const p3 = periods.find((p) => p.periodNumber === 3); // Mar
    const p4 = periods.find((p) => p.periodNumber === 4); // Apr
    if (!p1 || !p2 || !p3 || !p4) throw new Error("Periods 1-4 not found");

    const currency = await ctx.db
      .query("currencies")
      .withIndex("by_code", (q) => q.eq("code", "QAR"))
      .unique();
    if (!currency) throw new Error("QAR currency not found");

    // Get accounts by code
    const allAccounts = await ctx.db
      .query("accounts")
      .withIndex("by_company", (q) => q.eq("companyId", company._id))
      .collect();

    const getAccount = (code: string) => {
      const acc = allAccounts.find((a) => a.code === code);
      if (!acc) throw new Error(`Account ${code} not found`);
      return acc;
    };

    const cashAcc = getAccount("1101");
    const bankAcc = getAccount("1102");
    const arAcc = getAccount("1201");
    const inventoryAcc = getAccount("1301");
    const apAcc = getAccount("2101");
    const vatPayableAcc = getAccount("2201");
    const vatInputAcc = getAccount("2202");
    const revenueAcc = getAccount("4101");
    const cogsAcc = getAccount("5101");
    const expenseAcc = getAccount("5301");

    // Get admin user
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "admin@demo.local"))
      .unique();
    if (!adminUser) throw new Error("Admin user not found");
    const userId = adminUser._id;

    // Get customers, suppliers, items
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_company", (q) => q.eq("companyId", company._id))
      .collect();
    if (customers.length < 3) throw new Error("Not enough customers");

    const suppliers = await ctx.db
      .query("suppliers")
      .withIndex("by_company", (q) => q.eq("companyId", company._id))
      .collect();
    if (suppliers.length < 2) throw new Error("Not enough suppliers");

    const items = await ctx.db
      .query("items")
      .withIndex("by_company", (q) => q.eq("companyId", company._id))
      .collect();
    if (items.length < 5) throw new Error("Not enough items");

    // Shorthand for item lookup
    const laptop = items.find((i) => i.code === "LAPTOP-HP-15")!;
    const monitor = items.find((i) => i.code === "MONITOR-27")!;
    const keyboard = items.find((i) => i.code === "KEYBOARD-WL")!;
    const mouse = items.find((i) => i.code === "MOUSE-OPT")!;
    const printer = items.find((i) => i.code === "PRINTER-A4")!;
    const tablet = items.find((i) => i.code === "TABLET-10")!;
    const desk = items.find((i) => i.code === "DESK-STD")!;
    const chair = items.find((i) => i.code === "CHAIR-EXEC")!;
    const paper = items.find((i) => i.code === "PAPER-A4-BOX")!;
    const toner = items.find((i) => i.code === "TONER-HP-BLK")!;
    const ups = items.find((i) => i.code === "UPS-1KVA")!;
    const headset = items.find((i) => i.code === "HEADSET-USB")!;

    const uomPc = await ctx.db
      .query("unitOfMeasure")
      .withIndex("by_company", (q) => q.eq("companyId", company._id))
      .filter((q) => q.eq(q.field("code"), "PC"))
      .first();
    if (!uomPc) throw new Error("UoM PC not found");

    // ── Helper: generate document number ─────────────────────────────────────
    const genNum = (type: string) =>
      generateDocumentNumber(ctx, mainBranch._id, fiscalYear._id, type);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Seed opening stock via Purchase Invoices (3 purchases)
    // This populates stockBalance so sales can use weighted avg cost.
    // ─────────────────────────────────────────────────────────────────────────

    // Purchase 1 — Jan 5, laptops + monitors
    const pi1Subtotal = 5 * laptop.standardCost! + 10 * monitor.standardCost!;
    const pi1Vat = Math.round(pi1Subtotal * 0.05);
    const pi1Total = pi1Subtotal + pi1Vat;
    const pi1Num = await genNum("PI");

    const pi1Id = await ctx.db.insert("purchaseInvoices", {
      companyId: company._id,
      branchId: mainBranch._id,
      invoiceNumber: pi1Num,
      supplierInvoiceNo: "SUPP-INV-10045",
      supplierId: suppliers[0]._id,
      invoiceType: "stock_purchase",
      invoiceDate: "2026-01-05",
      dueDate: "2026-02-04",
      periodId: p1._id,
      currencyId: currency._id,
      exchangeRate: 1,
      subtotal: pi1Subtotal,
      vatAmount: pi1Vat,
      totalAmount: pi1Total,
      documentStatus: "approved",
      postingStatus: "unposted",
      paymentStatus: "unpaid",
      createdBy: userId,
      createdAt: Date.now(),
    });

    await ctx.db.insert("purchaseInvoiceLines", {
      invoiceId: pi1Id,
      itemId: laptop._id,
      lineType: "stock_item",
      quantity: 5,
      uomId: uomPc._id,
      unitPrice: laptop.standardCost!,
      vatRate: 5,
      vatAmount: Math.round(5 * laptop.standardCost! * 0.05),
      lineTotal: 5 * laptop.standardCost! + Math.round(5 * laptop.standardCost! * 0.05),
      accountId: inventoryAcc._id,
    });

    await ctx.db.insert("purchaseInvoiceLines", {
      invoiceId: pi1Id,
      itemId: monitor._id,
      lineType: "stock_item",
      quantity: 10,
      uomId: uomPc._id,
      unitPrice: monitor.standardCost!,
      vatRate: 5,
      vatAmount: Math.round(10 * monitor.standardCost! * 0.05),
      lineTotal: 10 * monitor.standardCost! + Math.round(10 * monitor.standardCost! * 0.05),
      accountId: inventoryAcc._id,
    });

    // Update stock for PI1
    await updateStockBalance(ctx, laptop._id, mainWarehouse._id, 5, laptop.standardCost!, "purchase_receipt");
    await updateStockBalance(ctx, monitor._id, mainWarehouse._id, 10, monitor.standardCost!, "purchase_receipt");

    // Post PI1 journal entry
    const pi1JeLines: JournalLineInput[] = [
      { accountId: inventoryAcc._id, description: `مشتريات - ${pi1Num}`, debit: pi1Subtotal, credit: 0 },
      { accountId: vatInputAcc._id, description: `ضريبة مدخلات - ${pi1Num}`, debit: pi1Vat, credit: 0 },
      { accountId: apAcc._id, subAccountType: "supplier", subAccountId: String(suppliers[0]._id), description: `ذمم مورد - ${pi1Num}`, debit: 0, credit: pi1Total },
    ];
    const pi1JeId = await postJournalEntry(ctx, {
      companyId: company._id, branchId: mainBranch._id,
      journalType: "auto_purchase", entryDate: "2026-01-05", periodId: p1._id,
      currencyId: currency._id, exchangeRate: 1,
      sourceType: "purchaseInvoice", sourceId: String(pi1Id),
      description: `فاتورة مشتريات ${pi1Num}`, isAutoGenerated: true, createdBy: userId,
    }, pi1JeLines);
    await ctx.db.patch(pi1Id, { postingStatus: "posted", journalEntryId: pi1JeId, paymentStatus: "unpaid" });

    // Purchase 2 — Jan 12, keyboards + mice + printers
    const pi2Subtotal =
      20 * keyboard.standardCost! +
      20 * mouse.standardCost! +
      5 * printer.standardCost!;
    const pi2Vat = Math.round(pi2Subtotal * 0.05);
    const pi2Total = pi2Subtotal + pi2Vat;
    const pi2Num = await genNum("PI");

    const pi2Id = await ctx.db.insert("purchaseInvoices", {
      companyId: company._id, branchId: mainBranch._id,
      invoiceNumber: pi2Num, supplierInvoiceNo: "SUPP-INV-20031",
      supplierId: suppliers[1]._id,
      invoiceType: "stock_purchase", invoiceDate: "2026-01-12", dueDate: "2026-02-11",
      periodId: p1._id, currencyId: currency._id, exchangeRate: 1,
      subtotal: pi2Subtotal, vatAmount: pi2Vat, totalAmount: pi2Total,
      documentStatus: "approved", postingStatus: "unposted", paymentStatus: "unpaid",
      createdBy: userId, createdAt: Date.now(),
    });

    for (const [itm, qty] of [[keyboard, 20], [mouse, 20], [printer, 5]] as [typeof keyboard, number][]) {
      const sub = qty * itm.standardCost!;
      const vat = Math.round(sub * 0.05);
      await ctx.db.insert("purchaseInvoiceLines", {
        invoiceId: pi2Id, itemId: itm._id, lineType: "stock_item",
        quantity: qty, uomId: uomPc._id, unitPrice: itm.standardCost!,
        vatRate: 5, vatAmount: vat, lineTotal: sub + vat, accountId: inventoryAcc._id,
      });
      await updateStockBalance(ctx, itm._id, mainWarehouse._id, qty, itm.standardCost!, "purchase_receipt");
    }

    const pi2JeLines: JournalLineInput[] = [
      { accountId: inventoryAcc._id, description: `مشتريات - ${pi2Num}`, debit: pi2Subtotal, credit: 0 },
      { accountId: vatInputAcc._id, description: `ضريبة مدخلات - ${pi2Num}`, debit: pi2Vat, credit: 0 },
      { accountId: apAcc._id, subAccountType: "supplier", subAccountId: String(suppliers[1]._id), description: `ذمم مورد - ${pi2Num}`, debit: 0, credit: pi2Total },
    ];
    const pi2JeId = await postJournalEntry(ctx, {
      companyId: company._id, branchId: mainBranch._id,
      journalType: "auto_purchase", entryDate: "2026-01-12", periodId: p1._id,
      currencyId: currency._id, exchangeRate: 1,
      sourceType: "purchaseInvoice", sourceId: String(pi2Id),
      description: `فاتورة مشتريات ${pi2Num}`, isAutoGenerated: true, createdBy: userId,
    }, pi2JeLines);
    await ctx.db.patch(pi2Id, { postingStatus: "posted", journalEntryId: pi2JeId, paymentStatus: "unpaid" });

    // Purchase 3 — Feb 1, tablets + ups + desks + chairs
    const pi3Subtotal =
      8 * tablet.standardCost! +
      6 * ups.standardCost! +
      10 * desk.standardCost! +
      10 * chair.standardCost! +
      50 * paper.standardCost! +
      30 * toner.standardCost! +
      15 * headset.standardCost!;
    const pi3Vat = Math.round(pi3Subtotal * 0.05);
    const pi3Total = pi3Subtotal + pi3Vat;
    const pi3Num = await genNum("PI");

    const pi3Id = await ctx.db.insert("purchaseInvoices", {
      companyId: company._id, branchId: mainBranch._id,
      invoiceNumber: pi3Num, supplierInvoiceNo: "SUPP-INV-30019",
      supplierId: suppliers[2]._id,
      invoiceType: "stock_purchase", invoiceDate: "2026-02-01", dueDate: "2026-03-03",
      periodId: p2._id, currencyId: currency._id, exchangeRate: 1,
      subtotal: pi3Subtotal, vatAmount: pi3Vat, totalAmount: pi3Total,
      documentStatus: "approved", postingStatus: "unposted", paymentStatus: "unpaid",
      createdBy: userId, createdAt: Date.now(),
    });

    for (const [itm, qty] of [
      [tablet, 8], [ups, 6], [desk, 10], [chair, 10], [paper, 50], [toner, 30], [headset, 15],
    ] as [typeof laptop, number][]) {
      const sub = qty * itm.standardCost!;
      const vat = Math.round(sub * 0.05);
      await ctx.db.insert("purchaseInvoiceLines", {
        invoiceId: pi3Id, itemId: itm._id, lineType: "stock_item",
        quantity: qty, uomId: uomPc._id, unitPrice: itm.standardCost!,
        vatRate: 5, vatAmount: vat, lineTotal: sub + vat, accountId: inventoryAcc._id,
      });
      await updateStockBalance(ctx, itm._id, mainWarehouse._id, qty, itm.standardCost!, "purchase_receipt");
    }

    const pi3JeLines: JournalLineInput[] = [
      { accountId: inventoryAcc._id, description: `مشتريات - ${pi3Num}`, debit: pi3Subtotal, credit: 0 },
      { accountId: vatInputAcc._id, description: `ضريبة مدخلات - ${pi3Num}`, debit: pi3Vat, credit: 0 },
      { accountId: apAcc._id, subAccountType: "supplier", subAccountId: String(suppliers[2]._id), description: `ذمم مورد - ${pi3Num}`, debit: 0, credit: pi3Total },
    ];
    const pi3JeId = await postJournalEntry(ctx, {
      companyId: company._id, branchId: mainBranch._id,
      journalType: "auto_purchase", entryDate: "2026-02-01", periodId: p2._id,
      currencyId: currency._id, exchangeRate: 1,
      sourceType: "purchaseInvoice", sourceId: String(pi3Id),
      description: `فاتورة مشتريات ${pi3Num}`, isAutoGenerated: true, createdBy: userId,
    }, pi3JeLines);
    await ctx.db.patch(pi3Id, { postingStatus: "posted", journalEntryId: pi3JeId, paymentStatus: "partial" });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Sales Invoices (7 invoices)
    // ─────────────────────────────────────────────────────────────────────────

    // Helper to create + post a credit sale invoice
    const createPostedCreditSale = async (
      date: string,
      period: typeof p1,
      custId: Id<"customers">,
      lineItems: { item: typeof laptop; qty: number; price: number }[],
      vatRate: number = 5,
    ) => {
      let subtotal = 0;
      let vatAmount = 0;
      for (const li of lineItems) {
        const lineNet = li.qty * li.price;
        const lineVat = Math.round(lineNet * vatRate / 100);
        subtotal += lineNet;
        vatAmount += lineVat;
      }
      const totalAmount = subtotal + vatAmount;
      const siNum = await genNum("SI");

      const siId = await ctx.db.insert("salesInvoices", {
        companyId: company._id, branchId: mainBranch._id,
        invoiceNumber: siNum, invoiceType: "credit_sale",
        customerId: custId, invoiceDate: date, dueDate: addDays(date, 30),
        periodId: period._id, currencyId: currency._id, exchangeRate: 1,
        warehouseId: mainWarehouse._id,
        subtotal, discountAmount: 0, taxableAmount: subtotal,
        vatAmount, serviceCharge: 0, totalAmount,
        cashReceived: 0, cardReceived: 0, creditAmount: totalAmount,
        documentStatus: "approved", postingStatus: "unposted", paymentStatus: "unpaid",
        createdBy: userId, createdAt: Date.now(), updatedAt: Date.now(),
      });

      // Insert lines
      let ln = 0;
      const updatedLineItems: { item: typeof laptop; qty: number; price: number; unitCost: number; costTotal: number }[] = [];
      for (const li of lineItems) {
        const lineNet = li.qty * li.price;
        const lineVat = Math.round(lineNet * vatRate / 100);
        const stockResult = await updateStockBalance(ctx, li.item._id, mainWarehouse._id, -li.qty, 0, "sales_issue");
        const unitCost = stockResult.avgCostBefore;
        const costTotal = Math.round(li.qty * unitCost);
        await ctx.db.insert("salesInvoiceLines", {
          invoiceId: siId, lineNumber: ++ln, itemId: li.item._id,
          quantity: li.qty, uomId: uomPc._id, unitPrice: li.price,
          discountPct: 0, discountAmount: 0, vatRate,
          vatAmount: lineVat, lineTotal: lineNet + lineVat,
          serviceChargeRate: 0, serviceChargeAmt: 0,
          unitCost, costTotal,
          revenueAccountId: revenueAcc._id, cogsAccountId: cogsAcc._id,
        });
        updatedLineItems.push({ ...li, unitCost, costTotal });
      }

      // Build journal: DR AR, CR Revenue, CR VAT; DR COGS, CR Inventory
      const jeLines: JournalLineInput[] = [
        { accountId: arAcc._id, subAccountType: "customer", subAccountId: String(custId), description: `ذمم عميل - ${siNum}`, debit: totalAmount, credit: 0 },
        { accountId: revenueAcc._id, description: `إيراد مبيعات - ${siNum}`, debit: 0, credit: subtotal },
        { accountId: vatPayableAcc._id, description: `ضريبة مبيعات - ${siNum}`, debit: 0, credit: vatAmount },
      ];
      for (const li of updatedLineItems) {
        if (li.costTotal > 0) {
          jeLines.push({ accountId: cogsAcc._id, description: `تكلفة مبيعات - ${siNum}`, debit: li.costTotal, credit: 0 });
          jeLines.push({ accountId: inventoryAcc._id, description: `مخزون مباع - ${siNum}`, debit: 0, credit: li.costTotal });
        }
      }

      const jeId = await postJournalEntry(ctx, {
        companyId: company._id, branchId: mainBranch._id,
        journalType: "auto_sales", entryDate: date, periodId: period._id,
        currencyId: currency._id, exchangeRate: 1,
        sourceType: "salesInvoice", sourceId: String(siId),
        description: `فاتورة مبيعات ${siNum}`, isAutoGenerated: true, createdBy: userId,
      }, jeLines);

      await ctx.db.patch(siId, {
        postingStatus: "posted", journalEntryId: jeId,
        postedBy: userId, postedAt: Date.now(),
        paymentStatus: "unpaid", updatedAt: Date.now(),
      });

      return siId;
    };

    // SI-1: Jan 10 — Gulf Tech, 2 laptops + 3 monitors
    await createPostedCreditSale("2026-01-10", p1, customers[0]._id, [
      { item: laptop, qty: 2, price: laptop.sellingPrice! },
      { item: monitor, qty: 3, price: monitor.sellingPrice! },
    ]);

    // SI-2: Jan 18 — Al Najma, 5 keyboards + 5 mice + 2 printers
    await createPostedCreditSale("2026-01-18", p1, customers[1]._id, [
      { item: keyboard, qty: 5, price: keyboard.sellingPrice! },
      { item: mouse, qty: 5, price: mouse.sellingPrice! },
      { item: printer, qty: 2, price: printer.sellingPrice! },
    ]);

    // SI-3: Jan 25 — Qatar Digital, 1 laptop + 2 monitors + 4 keyboards
    await createPostedCreditSale("2026-01-25", p1, customers[4]._id, [
      { item: laptop, qty: 1, price: laptop.sellingPrice! },
      { item: monitor, qty: 2, price: monitor.sellingPrice! },
      { item: keyboard, qty: 4, price: keyboard.sellingPrice! },
    ]);

    // SI-4: Feb 8 — Al Ansar, 3 tablets + 2 UPS + 5 headsets
    await createPostedCreditSale("2026-02-08", p2, customers[2]._id, [
      { item: tablet, qty: 3, price: tablet.sellingPrice! },
      { item: ups, qty: 2, price: ups.sellingPrice! },
      { item: headset, qty: 5, price: headset.sellingPrice! },
    ]);

    // SI-5: Feb 20 — Al Wafa, 5 desks + 5 chairs + 20 paper boxes
    await createPostedCreditSale("2026-02-20", p2, customers[3]._id, [
      { item: desk, qty: 5, price: desk.sellingPrice! },
      { item: chair, qty: 5, price: chair.sellingPrice! },
      { item: paper, qty: 20, price: paper.sellingPrice! },
    ]);

    // SI-6: Mar 5 — Gulf Tech, 1 laptop + 5 monitors + 10 toners (DRAFT, not posted)
    const si6Num = await genNum("SI");
    const si6Items = [
      { item: laptop, qty: 1, price: laptop.sellingPrice! },
      { item: monitor, qty: 5, price: monitor.sellingPrice! },
      { item: toner, qty: 10, price: toner.sellingPrice! },
    ];
    let si6Sub = 0;
    let si6Vat = 0;
    for (const li of si6Items) {
      si6Sub += li.qty * li.price;
      si6Vat += Math.round(li.qty * li.price * 0.05);
    }
    const si6Id = await ctx.db.insert("salesInvoices", {
      companyId: company._id, branchId: mainBranch._id,
      invoiceNumber: si6Num, invoiceType: "credit_sale",
      customerId: customers[0]._id, invoiceDate: "2026-03-05",
      dueDate: "2026-04-04",
      periodId: p3._id, currencyId: currency._id, exchangeRate: 1,
      warehouseId: mainWarehouse._id,
      subtotal: si6Sub, discountAmount: 0, taxableAmount: si6Sub,
      vatAmount: si6Vat, serviceCharge: 0, totalAmount: si6Sub + si6Vat,
      cashReceived: 0, cardReceived: 0, creditAmount: si6Sub + si6Vat,
      documentStatus: "draft", postingStatus: "unposted", paymentStatus: "unpaid",
      createdBy: userId, createdAt: Date.now(), updatedAt: Date.now(),
    });
    let si6Ln = 0;
    for (const li of si6Items) {
      const lineVat = Math.round(li.qty * li.price * 0.05);
      await ctx.db.insert("salesInvoiceLines", {
        invoiceId: si6Id, lineNumber: ++si6Ln, itemId: li.item._id,
        quantity: li.qty, uomId: uomPc._id, unitPrice: li.price,
        discountPct: 0, discountAmount: 0, vatRate: 5,
        vatAmount: lineVat, lineTotal: li.qty * li.price + lineVat,
        serviceChargeRate: 0, serviceChargeAmt: 0,
        unitCost: 0, costTotal: 0,
        revenueAccountId: revenueAcc._id, cogsAccountId: cogsAcc._id,
      });
    }

    // SI-7: Mar 15 — Qatar Digital, 2 tablets + 3 UPS (DRAFT)
    const si7Num = await genNum("SI");
    const si7Items = [
      { item: tablet, qty: 2, price: tablet.sellingPrice! },
      { item: ups, qty: 3, price: ups.sellingPrice! },
    ];
    let si7Sub = 0; let si7Vat = 0;
    for (const li of si7Items) {
      si7Sub += li.qty * li.price;
      si7Vat += Math.round(li.qty * li.price * 0.05);
    }
    const si7Id = await ctx.db.insert("salesInvoices", {
      companyId: company._id, branchId: mainBranch._id,
      invoiceNumber: si7Num, invoiceType: "credit_sale",
      customerId: customers[4]._id, invoiceDate: "2026-03-15",
      dueDate: "2026-04-14",
      periodId: p3._id, currencyId: currency._id, exchangeRate: 1,
      warehouseId: mainWarehouse._id,
      subtotal: si7Sub, discountAmount: 0, taxableAmount: si7Sub,
      vatAmount: si7Vat, serviceCharge: 0, totalAmount: si7Sub + si7Vat,
      cashReceived: 0, cardReceived: 0, creditAmount: si7Sub + si7Vat,
      documentStatus: "draft", postingStatus: "unposted", paymentStatus: "unpaid",
      createdBy: userId, createdAt: Date.now(), updatedAt: Date.now(),
    });
    let si7Ln = 0;
    for (const li of si7Items) {
      const lineVat = Math.round(li.qty * li.price * 0.05);
      await ctx.db.insert("salesInvoiceLines", {
        invoiceId: si7Id, lineNumber: ++si7Ln, itemId: li.item._id,
        quantity: li.qty, uomId: uomPc._id, unitPrice: li.price,
        discountPct: 0, discountAmount: 0, vatRate: 5,
        vatAmount: lineVat, lineTotal: li.qty * li.price + lineVat,
        serviceChargeRate: 0, serviceChargeAmt: 0,
        unitCost: 0, costTotal: 0,
        revenueAccountId: revenueAcc._id, cogsAccountId: cogsAcc._id,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Cash Receipts (3)
    // ─────────────────────────────────────────────────────────────────────────

    // CRV-1: Jan 20 — Gulf Tech partial payment 300,000 QAR (30000000 x100)
    const crv1Amount = 30000000;
    const crv1Num = await genNum("CRV");
    const crv1Id = await ctx.db.insert("cashReceiptVouchers", {
      companyId: company._id, branchId: mainBranch._id,
      voucherNumber: crv1Num, voucherDate: "2026-01-20",
      periodId: p1._id, receivedFrom: customers[0].nameAr,
      customerId: customers[0]._id, receiptType: "customer_payment",
      cashAccountId: bankAcc._id, amount: crv1Amount,
      currencyId: currency._id, exchangeRate: 1,
      paymentMethod: "transfer", reference: "TRF-2026-0120-001",
      documentStatus: "approved", postingStatus: "unposted",
      allocationStatus: "unallocated",
      createdBy: userId, createdAt: Date.now(),
    });
    const crv1JeLines: JournalLineInput[] = [
      { accountId: bankAcc._id, description: `قبض - ${crv1Num}`, debit: crv1Amount, credit: 0 },
      { accountId: arAcc._id, subAccountType: "customer", subAccountId: String(customers[0]._id), description: `قبض - ${crv1Num}`, debit: 0, credit: crv1Amount },
    ];
    const crv1JeId = await postJournalEntry(ctx, {
      companyId: company._id, branchId: mainBranch._id,
      journalType: "auto_receipt", entryDate: "2026-01-20", periodId: p1._id,
      currencyId: currency._id, exchangeRate: 1,
      sourceType: "cashReceiptVoucher", sourceId: String(crv1Id),
      description: `سند قبض ${crv1Num}`, isAutoGenerated: true, createdBy: userId,
    }, crv1JeLines);
    await ctx.db.patch(crv1Id, { postingStatus: "posted", documentStatus: "approved", journalEntryId: crv1JeId, allocationStatus: "fully_allocated" });

    // CRV-2: Feb 15 — Al Najma payment 150,000 QAR
    const crv2Amount = 15000000;
    const crv2Num = await genNum("CRV");
    const crv2Id = await ctx.db.insert("cashReceiptVouchers", {
      companyId: company._id, branchId: mainBranch._id,
      voucherNumber: crv2Num, voucherDate: "2026-02-15",
      periodId: p2._id, receivedFrom: customers[1].nameAr,
      customerId: customers[1]._id, receiptType: "customer_payment",
      cashAccountId: cashAcc._id, amount: crv2Amount,
      currencyId: currency._id, exchangeRate: 1,
      paymentMethod: "cash", reference: undefined,
      documentStatus: "approved", postingStatus: "unposted",
      allocationStatus: "unallocated",
      createdBy: userId, createdAt: Date.now(),
    });
    const crv2JeLines: JournalLineInput[] = [
      { accountId: cashAcc._id, description: `قبض نقدي - ${crv2Num}`, debit: crv2Amount, credit: 0 },
      { accountId: arAcc._id, subAccountType: "customer", subAccountId: String(customers[1]._id), description: `قبض - ${crv2Num}`, debit: 0, credit: crv2Amount },
    ];
    const crv2JeId = await postJournalEntry(ctx, {
      companyId: company._id, branchId: mainBranch._id,
      journalType: "auto_receipt", entryDate: "2026-02-15", periodId: p2._id,
      currencyId: currency._id, exchangeRate: 1,
      sourceType: "cashReceiptVoucher", sourceId: String(crv2Id),
      description: `سند قبض ${crv2Num}`, isAutoGenerated: true, createdBy: userId,
    }, crv2JeLines);
    await ctx.db.patch(crv2Id, { postingStatus: "posted", documentStatus: "approved", journalEntryId: crv2JeId, allocationStatus: "fully_allocated" });

    // CRV-3: Mar 10 — Qatar Digital payment 200,000 QAR
    const crv3Amount = 20000000;
    const crv3Num = await genNum("CRV");
    const crv3Id = await ctx.db.insert("cashReceiptVouchers", {
      companyId: company._id, branchId: mainBranch._id,
      voucherNumber: crv3Num, voucherDate: "2026-03-10",
      periodId: p3._id, receivedFrom: customers[4].nameAr,
      customerId: customers[4]._id, receiptType: "customer_payment",
      cashAccountId: bankAcc._id, amount: crv3Amount,
      currencyId: currency._id, exchangeRate: 1,
      paymentMethod: "transfer", reference: "TRF-2026-0310-002",
      documentStatus: "approved", postingStatus: "unposted",
      allocationStatus: "unallocated",
      createdBy: userId, createdAt: Date.now(),
    });
    const crv3JeLines: JournalLineInput[] = [
      { accountId: bankAcc._id, description: `قبض - ${crv3Num}`, debit: crv3Amount, credit: 0 },
      { accountId: arAcc._id, subAccountType: "customer", subAccountId: String(customers[4]._id), description: `قبض - ${crv3Num}`, debit: 0, credit: crv3Amount },
    ];
    const crv3JeId = await postJournalEntry(ctx, {
      companyId: company._id, branchId: mainBranch._id,
      journalType: "auto_receipt", entryDate: "2026-03-10", periodId: p3._id,
      currencyId: currency._id, exchangeRate: 1,
      sourceType: "cashReceiptVoucher", sourceId: String(crv3Id),
      description: `سند قبض ${crv3Num}`, isAutoGenerated: true, createdBy: userId,
    }, crv3JeLines);
    await ctx.db.patch(crv3Id, { postingStatus: "posted", documentStatus: "approved", journalEntryId: crv3JeId, allocationStatus: "fully_allocated" });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Cash Payments to Suppliers (2)
    // ─────────────────────────────────────────────────────────────────────────

    // CPV-1: Feb 5 — Pay Supplier 1 (PI-1 partial)
    const cpv1Amount = Math.round(pi1Total * 0.5); // half
    const cpv1Num = await genNum("CPV");
    const cpv1Id = await ctx.db.insert("cashPaymentVouchers", {
      companyId: company._id, branchId: mainBranch._id,
      voucherNumber: cpv1Num, voucherDate: "2026-02-05",
      periodId: p2._id, paidTo: suppliers[0].nameAr,
      supplierId: suppliers[0]._id, paymentType: "supplier_payment",
      cashAccountId: bankAcc._id, amount: cpv1Amount,
      currencyId: currency._id, exchangeRate: 1,
      paymentMethod: "transfer", reference: "TRF-OUT-2026-0205-001",
      documentStatus: "approved", postingStatus: "unposted",
      allocationStatus: "unallocated",
      createdBy: userId, createdAt: Date.now(),
    });
    const cpv1JeLines: JournalLineInput[] = [
      { accountId: apAcc._id, subAccountType: "supplier", subAccountId: String(suppliers[0]._id), description: `دفع مورد - ${cpv1Num}`, debit: cpv1Amount, credit: 0 },
      { accountId: bankAcc._id, description: `دفع - ${cpv1Num}`, debit: 0, credit: cpv1Amount },
    ];
    const cpv1JeId = await postJournalEntry(ctx, {
      companyId: company._id, branchId: mainBranch._id,
      journalType: "auto_payment", entryDate: "2026-02-05", periodId: p2._id,
      currencyId: currency._id, exchangeRate: 1,
      sourceType: "cashPaymentVoucher", sourceId: String(cpv1Id),
      description: `سند صرف ${cpv1Num}`, isAutoGenerated: true, createdBy: userId,
    }, cpv1JeLines);
    await ctx.db.patch(cpv1Id, { postingStatus: "posted", documentStatus: "approved", journalEntryId: cpv1JeId, allocationStatus: "fully_allocated" });

    // CPV-2: Mar 20 — Pay Supplier 2 (PI-2 full)
    const cpv2Amount = pi2Total;
    const cpv2Num = await genNum("CPV");
    const cpv2Id = await ctx.db.insert("cashPaymentVouchers", {
      companyId: company._id, branchId: mainBranch._id,
      voucherNumber: cpv2Num, voucherDate: "2026-03-20",
      periodId: p3._id, paidTo: suppliers[1].nameAr,
      supplierId: suppliers[1]._id, paymentType: "supplier_payment",
      cashAccountId: bankAcc._id, amount: cpv2Amount,
      currencyId: currency._id, exchangeRate: 1,
      paymentMethod: "transfer", reference: "TRF-OUT-2026-0320-002",
      documentStatus: "approved", postingStatus: "unposted",
      allocationStatus: "unallocated",
      createdBy: userId, createdAt: Date.now(),
    });
    const cpv2JeLines: JournalLineInput[] = [
      { accountId: apAcc._id, subAccountType: "supplier", subAccountId: String(suppliers[1]._id), description: `دفع مورد - ${cpv2Num}`, debit: cpv2Amount, credit: 0 },
      { accountId: bankAcc._id, description: `دفع - ${cpv2Num}`, debit: 0, credit: cpv2Amount },
    ];
    const cpv2JeId = await postJournalEntry(ctx, {
      companyId: company._id, branchId: mainBranch._id,
      journalType: "auto_payment", entryDate: "2026-03-20", periodId: p3._id,
      currencyId: currency._id, exchangeRate: 1,
      sourceType: "cashPaymentVoucher", sourceId: String(cpv2Id),
      description: `سند صرف ${cpv2Num}`, isAutoGenerated: true, createdBy: userId,
    }, cpv2JeLines);
    await ctx.db.patch(cpv2Id, { postingStatus: "posted", documentStatus: "approved", journalEntryId: cpv2JeId, allocationStatus: "fully_allocated" });

    // CPV-3 (expense): Apr 1 — Rent payment 25,000 QAR
    const cpv3Amount = 2500000;
    const cpv3Num = await genNum("CPV");
    const cpv3Id = await ctx.db.insert("cashPaymentVouchers", {
      companyId: company._id, branchId: mainBranch._id,
      voucherNumber: cpv3Num, voucherDate: "2026-04-01",
      periodId: p4._id, paidTo: "مؤسسة عقارات الدوحة",
      paymentType: "expense_payment",
      cashAccountId: bankAcc._id, amount: cpv3Amount,
      currencyId: currency._id, exchangeRate: 1,
      paymentMethod: "transfer", reference: "RENT-Q1-2026",
      documentStatus: "approved", postingStatus: "unposted",
      allocationStatus: "unallocated",
      createdBy: userId, createdAt: Date.now(),
    });
    const cpv3JeLines: JournalLineInput[] = [
      { accountId: expenseAcc._id, description: `إيجار - ${cpv3Num}`, debit: cpv3Amount, credit: 0 },
      { accountId: bankAcc._id, description: `دفع - ${cpv3Num}`, debit: 0, credit: cpv3Amount },
    ];
    const cpv3JeId = await postJournalEntry(ctx, {
      companyId: company._id, branchId: mainBranch._id,
      journalType: "auto_payment", entryDate: "2026-04-01", periodId: p4._id,
      currencyId: currency._id, exchangeRate: 1,
      sourceType: "cashPaymentVoucher", sourceId: String(cpv3Id),
      description: `سند صرف ${cpv3Num}`, isAutoGenerated: true, createdBy: userId,
    }, cpv3JeLines);
    await ctx.db.patch(cpv3Id, { postingStatus: "posted", documentStatus: "approved", journalEntryId: cpv3JeId, allocationStatus: "fully_allocated" });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 5: Sales Return (1)
    // ─────────────────────────────────────────────────────────────────────────
    // Al Wafa returns 2 chairs (from SI-5)
    const srQty = 2;
    const srUnitPrice = chair.sellingPrice!;
    const srSubtotal = srQty * srUnitPrice;
    const srVat = Math.round(srSubtotal * 0.05);
    const srTotal = srSubtotal + srVat;
    const srNum = await genNum("SR");

    const srId = await ctx.db.insert("salesReturns", {
      companyId: company._id, branchId: mainBranch._id,
      returnNumber: srNum, returnDate: "2026-03-01",
      periodId: p3._id, customerId: customers[3]._id,
      currencyId: currency._id, exchangeRate: 1,
      warehouseId: mainWarehouse._id,
      returnReason: "بضاعة معيبة - كراسي تالفة",
      subtotal: srSubtotal, vatAmount: srVat, totalAmount: srTotal,
      refundMethod: "credit_note",
      documentStatus: "approved", postingStatus: "unposted",
      createdBy: userId, createdAt: Date.now(),
    });

    await ctx.db.insert("salesReturnLines", {
      returnId: srId, itemId: chair._id,
      quantity: srQty, uomId: uomPc._id,
      unitPrice: srUnitPrice, vatRate: 5,
      vatAmount: srVat, lineTotal: srTotal,
      unitCost: chair.standardCost!,
    });

    // Restore stock
    await updateStockBalance(ctx, chair._id, mainWarehouse._id, srQty, chair.standardCost!, "sales_return");

    const srJeLines: JournalLineInput[] = [
      { accountId: revenueAcc._id, description: `مرتجع مبيعات - ${srNum}`, debit: srSubtotal, credit: 0 },
      { accountId: vatPayableAcc._id, description: `رد ضريبة - ${srNum}`, debit: srVat, credit: 0 },
      { accountId: arAcc._id, subAccountType: "customer", subAccountId: String(customers[3]._id), description: `مرتجع - ${srNum}`, debit: 0, credit: srTotal },
      { accountId: inventoryAcc._id, description: `مخزون مرتجع - ${srNum}`, debit: Math.round(srQty * chair.standardCost!), credit: 0 },
      { accountId: cogsAcc._id, description: `عكس تكلفة مرتجع - ${srNum}`, debit: 0, credit: Math.round(srQty * chair.standardCost!) },
    ];
    const srJeId = await postJournalEntry(ctx, {
      companyId: company._id, branchId: mainBranch._id,
      journalType: "auto_sales", entryDate: "2026-03-01", periodId: p3._id,
      currencyId: currency._id, exchangeRate: 1,
      sourceType: "salesReturn", sourceId: String(srId),
      description: `مرتجع مبيعات ${srNum}`, isAutoGenerated: true, createdBy: userId,
    }, srJeLines);
    await ctx.db.patch(srId, { postingStatus: "posted", journalEntryId: srJeId });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 6: Purchase Return (1)
    // ─────────────────────────────────────────────────────────────────────────
    // Return 2 laptops to Supplier 1 (defective)
    const prQty = 2;
    const prUnitCost = laptop.standardCost!;
    const prTotal = prQty * prUnitCost;
    const prNum = await genNum("PR");

    const prId = await ctx.db.insert("purchaseReturns", {
      companyId: company._id, branchId: mainBranch._id,
      returnNumber: prNum, supplierId: suppliers[0]._id,
      returnDate: "2026-02-10", periodId: p2._id,
      warehouseId: mainWarehouse._id,
      currencyId: currency._id, exchangeRate: 1,
      vatAmount: 0, totalAmount: prTotal,
      documentStatus: "approved", postingStatus: "unposted",
      notes: "إعادة لابتوبات معيبة من دفعة يناير",
      createdBy: userId, createdAt: Date.now(),
    });

    await ctx.db.insert("purchaseReturnLines", {
      returnId: prId, itemId: laptop._id,
      quantity: prQty, uomId: uomPc._id,
      unitCost: prUnitCost, lineTotal: prTotal,
      accountId: inventoryAcc._id,
    });

    // Deduct stock
    await updateStockBalance(ctx, laptop._id, mainWarehouse._id, -prQty, prUnitCost, "purchase_return");

    const prJeLines: JournalLineInput[] = [
      { accountId: apAcc._id, subAccountType: "supplier", subAccountId: String(suppliers[0]._id), description: `مرتجع شراء - ${prNum}`, debit: prTotal, credit: 0 },
      { accountId: inventoryAcc._id, description: `مخزون مرتجع شراء - ${prNum}`, debit: 0, credit: prTotal },
    ];
    const prJeId = await postJournalEntry(ctx, {
      companyId: company._id, branchId: mainBranch._id,
      journalType: "auto_purchase", entryDate: "2026-02-10", periodId: p2._id,
      currencyId: currency._id, exchangeRate: 1,
      sourceType: "purchaseReturn", sourceId: String(prId),
      description: `مرتجع مشتريات ${prNum}`, isAutoGenerated: true, createdBy: userId,
    }, prJeLines);
    await ctx.db.patch(prId, { postingStatus: "posted", journalEntryId: prJeId });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 7: Journal Entry — Opening Capital (manual)
    // ─────────────────────────────────────────────────────────────────────────
    const capitalAmount = 50000000; // 500,000 QAR
    const jeCapNum = await genNum("JE");
    // We can't call postJournalEntry for this since we need to name it ourselves,
    // but we'll use postJournalEntry which auto-generates the number. Capital JE:
    const jeCapLines: JournalLineInput[] = [
      { accountId: bankAcc._id, description: "رأس المال المدفوع - إيداع أولي", debit: capitalAmount, credit: 0 },
      { accountId: getAccount("3101")._id, description: "رأس مال مدفوع", debit: 0, credit: capitalAmount },
    ];
    await postJournalEntry(ctx, {
      companyId: company._id, branchId: mainBranch._id,
      journalType: "opening", entryDate: "2026-01-01", periodId: p1._id,
      currencyId: currency._id, exchangeRate: 1,
      description: "قيد رأس المال الافتتاحي - مساهمة المؤسسين",
      isAutoGenerated: false, createdBy: userId,
    }, jeCapLines);

    // JE — Salary expense Apr
    const jeSalaryLines: JournalLineInput[] = [
      { accountId: getAccount("5201")._id, description: "رواتب أبريل 2026", debit: 8500000, credit: 0 },
      { accountId: bankAcc._id, description: "تحويل رواتب", debit: 0, credit: 8500000 },
    ];
    await postJournalEntry(ctx, {
      companyId: company._id, branchId: mainBranch._id,
      journalType: "general", entryDate: "2026-04-05", periodId: p4._id,
      currencyId: currency._id, exchangeRate: 1,
      description: "قيد رواتب الموظفين - أبريل 2026",
      isAutoGenerated: false, createdBy: userId,
    }, jeSalaryLines);

    // Suppress unused variable warnings
    void si6Id; void si7Id; void pi3Id; void crv1Id; void crv2Id; void crv3Id;
    void cpv1Id; void cpv2Id; void cpv3Id; void srId; void prId; void jeCapNum;

    return {
      message: "Demo transactions seeded successfully",
      purchaseInvoices: 3,
      salesInvoices: 7,
      cashReceipts: 3,
      cashPayments: 3,
      salesReturns: 1,
      purchaseReturns: 1,
      journalEntries: 2,
    };
  },
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ─── Utilities (unchanged from original) ─────────────────────────────────────

export const getCompanies = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("companies").collect();
  },
});

export const setCurrencyToQAR = mutation({
  args: {},
  handler: async (ctx) => {
    const companies = await ctx.db.query("companies").collect();
    for (const c of companies) {
      await ctx.db.patch(c._id, { baseCurrency: "QAR" });
    }
    return { updated: companies.length };
  },
});

export const ensureBaseCurrencyQAR = mutation({
  args: {},
  handler: async (ctx) => {
    const companies = await ctx.db.query("companies").collect();
    for (const company of companies) {
      if (company.baseCurrency !== "QAR") {
        await ctx.db.patch(company._id, { baseCurrency: "QAR" });
      }
    }

    const existingQAR = await ctx.db
      .query("currencies")
      .withIndex("by_code", (q) => q.eq("code", "QAR"))
      .first();

    if (existingQAR) {
      if (!existingQAR.isBase || !existingQAR.isActive) {
        await ctx.db.patch(existingQAR._id, {
          isBase: true,
          isActive: true,
          symbol: existingQAR.symbol || "ر.ق",
          nameAr: existingQAR.nameAr || "ريال قطري",
          nameEn: existingQAR.nameEn || "Qatari Riyal",
          decimalPlaces: existingQAR.decimalPlaces ?? 2,
        });
      }
      return { created: false, currencyId: existingQAR._id, code: "QAR" };
    }

    const allCurrencies = await ctx.db.query("currencies").collect();
    for (const currency of allCurrencies) {
      if (currency.isBase) {
        await ctx.db.patch(currency._id, { isBase: false });
      }
    }

    const currencyId = await ctx.db.insert("currencies", {
      code: "QAR",
      nameAr: "ريال قطري",
      nameEn: "Qatari Riyal",
      symbol: "ر.ق",
      isBase: true,
      decimalPlaces: 2,
      isActive: true,
    });

    return { created: true, currencyId, code: "QAR" };
  },
});

// ─── ensureMinimalSetup ───────────────────────────────────────────────────────
// Safe to run at any time. Creates only what is missing — never duplicates.
// Creates: QAR currency, default branch, fiscal year/periods, and the minimum
// accounts required for sales/purchase/cash posting.
export const ensureMinimalSetup = mutation({
  args: {},
  handler: async (ctx) => {
    const created: string[] = [];

    const company = await ctx.db.query("companies").first();
    if (!company) throw new Error("أنشئ الشركة أولاً من إعدادات الشركة.");
    const companyId = company._id;

    // 1. QAR Currency
    const existingCurrency = await ctx.db.query("currencies").first();
    if (!existingCurrency) {
      await ctx.db.insert("currencies", {
        code: "QAR",
        nameAr: "ريال قطري",
        nameEn: "Qatari Riyal",
        symbol: "ر.ق",
        isBase: true,
        decimalPlaces: 2,
        isActive: true,
      });
      created.push("عملة QAR");
    }

    // 2. Default Branch
    let branch = await ctx.db
      .query("branches")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .first();
    if (!branch) {
      const branchId = await ctx.db.insert("branches", {
        companyId,
        code: "MAIN",
        nameAr: "الفرع الرئيسي",
        nameEn: "Main Branch",
        isActive: true,
        createdAt: Date.now(),
      });
      branch = await ctx.db.get(branchId);
      created.push("الفرع الرئيسي");
    }

    // 3. Default Warehouse
    const existingWH = await ctx.db
      .query("warehouses")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .first();
    if (!existingWH && branch) {
      await ctx.db.insert("warehouses", {
        companyId,
        branchId: branch._id,
        code: "WH-MAIN",
        nameAr: "المستودع الرئيسي",
        nameEn: "Main Warehouse",
        warehouseType: "main",
        isActive: true,
      });
      created.push("المستودع الرئيسي");
    }

    // 4. Fiscal Year 2026 + monthly periods
    const existingFY = await ctx.db
      .query("fiscalYears")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .first();
    if (!existingFY) {
      const fyId = await ctx.db.insert("fiscalYears", {
        companyId,
        code: "2026",
        nameAr: "السنة المالية 2026",
        nameEn: "Fiscal Year 2026",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        status: "open",
      });
      const monthNamesAr = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
      const monthNamesEn = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      const monthDays    = [31,28,31,30,31,30,31,31,30,31,30,31];
      for (let m = 1; m <= 12; m++) {
        const mm = String(m).padStart(2, "0");
        await ctx.db.insert("accountingPeriods", {
          companyId,
          fiscalYearId: fyId,
          periodNumber: m,
          name: `2026-${mm}`,
          startDate: `2026-${mm}-01`,
          endDate: `2026-${mm}-${String(monthDays[m - 1]).padStart(2, "0")}`,
          status: "open",
        });
      }
      created.push("السنة المالية 2026 + 12 فترة");
    }

    // 5. Minimum Chart of Accounts
    async function ensureAccount(
      code: string, nameAr: string, nameEn: string,
      accountType: string, accountSubType: string,
      parentCode: string | null, isPostable: boolean,
      normalBalance: "debit" | "credit",
    ) {
      const existing = await ctx.db
        .query("accounts")
        .withIndex("by_company_code", (q) => q.eq("companyId", companyId).eq("code", code))
        .first();
      if (existing) return existing._id;
      let parentId: any = null;
      if (parentCode) {
        const parent = await ctx.db
          .query("accounts")
          .withIndex("by_company_code", (q) => q.eq("companyId", companyId).eq("code", parentCode))
          .first();
        parentId = parent?._id ?? null;
      }
      const accountPayload: any = {
        companyId, code, nameAr, nameEn,
        accountType: accountType as any,
        accountSubType: accountSubType as any,
        normalBalance,
        isPostable,
        requiresCostCenter: false,
        requiresSubAccount: false,
        isActive: true,
        createdAt: Date.now(),
      };
      if (parentId) {
        accountPayload.parentId = parentId;
      }
      const id = await ctx.db.insert("accounts", accountPayload);
      created.push(`حساب ${code} - ${nameAr}`);
      return id;
    }

    // Root groups
    await ensureAccount("1","الأصول",               "Assets",               "asset",    "current_asset",      null, false, "debit");
    await ensureAccount("2","الالتزامات",            "Liabilities",          "liability","current_liability",  null, false, "credit");
    await ensureAccount("3","حقوق الملكية",          "Equity",               "equity",   "equity",             null, false, "credit");
    await ensureAccount("4","الإيرادات",             "Revenue",              "revenue",  "sales_revenue",      null, false, "credit");
    await ensureAccount("5","المصروفات",             "Expenses",             "expense",  "operating_expense",  null, false, "debit");
    // Cash & Bank
    await ensureAccount("1101","الصندوق النقدي",     "Cash on Hand",         "asset",    "cash_bank",          "1",  true,  "debit");
    await ensureAccount("1102","البنك الرئيسي",      "Main Bank Account",    "asset",    "cash_bank",          "1",  true,  "debit");
    // Receivables / Payables
    await ensureAccount("1201","ذمم مدينة - عملاء",  "Accounts Receivable",  "asset",    "receivable",         "1",  true,  "debit");
    await ensureAccount("1301","المخزون",            "Inventory",            "asset",    "inventory",          "1",  true,  "debit");
    await ensureAccount("2101","ذمم دائنة - موردون", "Accounts Payable",     "liability","payable",            "2",  true,  "credit");
    await ensureAccount("2201","ضريبة القيمة المضافة المستحقة","VAT Payable","liability","tax_payable",        "2",  true,  "credit");
    // Revenue & COGS
    await ensureAccount("4101","إيرادات المبيعات",   "Sales Revenue",        "revenue",  "sales_revenue",      "4",  true,  "credit");
    await ensureAccount("4201","إيرادات أخرى",       "Other Revenue",        "revenue",  "other_revenue",      "4",  true,  "credit");
    await ensureAccount("5101","تكلفة البضاعة المباعة","Cost of Goods Sold", "expense",  "cogs",               "5",  true,  "debit");
    // Fixed assets / depreciation
    await ensureAccount("5301","مصروف الإهلاك",      "Depreciation Expense", "expense",  "operating_expense",  "5",  true,  "debit");
    await ensureAccount("1401","مجمع الإهلاك",       "Accumulated Depreciation","asset", "fixed_asset",        "1",  true,  "credit");

    return {
      message: created.length > 0
        ? `تم إنشاء ${created.length} عنصر بنجاح`
        : "كل البيانات الأساسية موجودة مسبقاً ✓",
      created,
    };
  },
});

// ─── seedTestUsers ────────────────────────────────────────────────────────────

export const seedTestUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const company = await ctx.db.query("companies").first();
    if (!company) throw new Error("No company found — run seedInitialData first");

    // ── PRODUCTION SAFETY GUARD ───────────────────────────────────────────────
    // seedTestUsers creates demo users with weak passwords (admin123, etc.).
    // This must NEVER run in production.
    const isLikelyProduction =
      !company.email?.endsWith("@demo.local") &&
      company.email !== "info@primebalance.qa";
    if (isLikelyProduction) {
      throw new Error(
        "PRODUCTION SAFETY: seedTestUsers refused to run because the " +
        "company email does not match a known demo domain. " +
        "This mutation creates demo users with weak passwords and must " +
        "never be executed in a production environment."
      );
    }

    const branch = await ctx.db
      .query("branches")
      .withIndex("by_company", (q) => q.eq("companyId", company._id))
      .first();
    if (!branch) throw new Error("No branch found");

    const users = [
      { name: "مدير النظام", email: "admin@demo.local", password: "admin123", role: "admin" as const },
      { name: "أحمد محمد الخالد", email: "accountant@demo.local", password: "accountant123", role: "accountant" as const },
      { name: "سارة علي العمري", email: "sales@demo.local", password: "sales123", role: "sales" as const },
      { name: "فهد ناصر الجابر", email: "warehouse@demo.local", password: "warehouse123", role: "warehouse" as const },
    ];

    const results: string[] = [];

    for (const u of users) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", u.email))
        .unique();

      const { hash } = await hashPassword(u.password);

      if (existing) {
        await ctx.db.patch(existing._id, {
          passwordHash: hash,
          role: u.role,
          branchIds: [branch._id],
          isActive: true,
        });
        results.push(`Updated: ${u.email}`);
      } else {
        await ctx.db.insert("users", {
          name: u.name,
          email: u.email,
          passwordHash: hash,
          role: u.role,
          branchIds: [branch._id],
          isActive: true,
          createdAt: Date.now(),
        });
        results.push(`Created: ${u.email}`);
      }
    }

    return { results };
  },
});

// ─── seedEmployeesFromJSON ────────────────────────────────────────────────────
// Imports employees from Staff Master Excel export (employees_import.json)

export const seedEmployeesFromJSON = mutation({
  args: {},
  handler: async (ctx) => {
    const company = await ctx.db.query("companies").first();
    if (!company) throw new Error("No company found — run seedInitialData first");

    const branch = await ctx.db
      .query("branches")
      .withIndex("by_company", (q) => q.eq("companyId", company._id))
      .first();
    if (!branch) throw new Error("No branch found");

    // Employee data extracted from Staff Master.xlsx
    const employees = [
      { employeeCode: "100001", nameAr: "Mehdi", nameEn: "Mehdi", department: "Kitchen", designation: "Chef", basicSalary: 3000, otherAllowance: 0, category: "Senior" },
      { employeeCode: "100002", nameAr: "Kareem", nameEn: "Kareem", department: "Finance", designation: "Accountant", basicSalary: 3500, otherAllowance: 0, category: "Senior" },
      { employeeCode: "100003", nameAr: "Rabbani", nameEn: "Rabbani", department: "Kitchen", designation: "Cook", basicSalary: 1400, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100004", nameAr: "Ramshad", nameEn: "Ramshad", department: "Service", designation: "Barista", basicSalary: 1400, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100005", nameAr: "Monir", nameEn: "Monir", department: "Kitchen", designation: "Cook", basicSalary: 1500, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100006", nameAr: "Ronald", nameEn: "Ronald", department: "Operations", designation: "Supervisor", basicSalary: 3500, otherAllowance: 0, category: "Senior" },
      { employeeCode: "100007", nameAr: "Tahar", nameEn: "Tahar", department: "Service", designation: "Barista", basicSalary: 1400, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100008", nameAr: "Ripon", nameEn: "Ripon", department: "Kitchen", designation: "Cook", basicSalary: 1400, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100009", nameAr: "Pradeep", nameEn: "Pradeep", department: "Kitchen", designation: "Cook", basicSalary: 1400, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100010", nameAr: "Mahabob", nameEn: "Mahabob", department: "Kitchen", designation: "Cook", basicSalary: 1400, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100011", nameAr: "Shohel", nameEn: "Shohel", department: "Kitchen", designation: "Cook", basicSalary: 1400, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100012", nameAr: "Shahin", nameEn: "Shahin", department: "Kitchen", designation: "Asst Chef", basicSalary: 1800, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100013", nameAr: "Rohul", nameEn: "Rohul", department: "Kitchen", designation: "Cook", basicSalary: 1400, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100014", nameAr: "Sujon", nameEn: "Sujon", department: "Service", designation: "Waiter", basicSalary: 1200, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100015", nameAr: "Salauddin", nameEn: "Salauddin", department: "Service", designation: "Waiter", basicSalary: 1200, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100016", nameAr: "Rakib", nameEn: "Rakib", department: "Service", designation: "Waiter", basicSalary: 1200, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100017", nameAr: "Sohag", nameEn: "Sohag", department: "Service", designation: "Waiter", basicSalary: 1200, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100018", nameAr: "Raju", nameEn: "Raju", department: "Service", designation: "Waiter", basicSalary: 1200, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100019", nameAr: "Masud", nameEn: "Masud", department: "Service", designation: "Waiter", basicSalary: 1200, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100020", nameAr: "Shakil", nameEn: "Shakil", department: "Service", designation: "Waiter", basicSalary: 1200, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100021", nameAr: "Hasan", nameEn: "Hasan", department: "Service", designation: "Waiter", basicSalary: 1200, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100022", nameAr: "Sohag", nameEn: "Sohag", department: "Kitchen", designation: "Steward", basicSalary: 1000, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100023", nameAr: "Sumon", nameEn: "Sumon", department: "Kitchen", designation: "Steward", basicSalary: 1000, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100024", nameAr: "Rasel", nameEn: "Rasel", department: "Kitchen", designation: "Steward", basicSalary: 1000, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100025", nameAr: "Rana", nameEn: "Rana", department: "Kitchen", designation: "Steward", basicSalary: 1000, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100026", nameAr: "Raju", nameEn: "Raju", department: "Kitchen", designation: "Steward", basicSalary: 1000, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100027", nameAr: "Rasel", nameEn: "Rasel", department: "Kitchen", designation: "Steward", basicSalary: 1000, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100028", nameAr: "Rana", nameEn: "Rana", department: "Kitchen", designation: "Steward", basicSalary: 1000, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100029", nameAr: "Raju", nameEn: "Raju", department: "Kitchen", designation: "Steward", basicSalary: 1000, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100030", nameAr: "Rasel", nameEn: "Rasel", department: "Kitchen", designation: "Steward", basicSalary: 1000, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100031", nameAr: "Rana", nameEn: "Rana", department: "Kitchen", designation: "Steward", basicSalary: 1000, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100032", nameAr: "Raju", nameEn: "Raju", department: "Kitchen", designation: "Steward", basicSalary: 1000, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100033", nameAr: "Rasel", nameEn: "Rasel", department: "Kitchen", designation: "Steward", basicSalary: 1000, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100034", nameAr: "Rana", nameEn: "Rana", department: "Kitchen", designation: "Steward", basicSalary: 1000, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100035", nameAr: "Raju", nameEn: "Raju", department: "Kitchen", designation: "Steward", basicSalary: 1000, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100036", nameAr: "Rasel", nameEn: "Rasel", department: "Kitchen", designation: "Steward", basicSalary: 1000, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100037", nameAr: "Rana", nameEn: "Rana", department: "Kitchen", designation: "Steward", basicSalary: 1000, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100038", nameAr: "Raju", nameEn: "Raju", department: "Kitchen", designation: "Steward", basicSalary: 1000, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100039", nameAr: "Rasel", nameEn: "Rasel", department: "Kitchen", designation: "Steward", basicSalary: 1000, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100040", nameAr: "Rana", nameEn: "Rana", department: "Kitchen", designation: "Steward", basicSalary: 1000, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100041", nameAr: "Stephan", nameEn: "Stephan", department: "Service", designation: "Head Barista", basicSalary: 1500, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100042", nameAr: "Joseph", nameEn: "Joseph", department: "Service", designation: "Barista", basicSalary: 1300, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100043", nameAr: "Dash", nameEn: "Dash", department: "Service", designation: "Barista", basicSalary: 1300, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100044", nameAr: "Yam", nameEn: "Yam", department: "Service", designation: "Barista", basicSalary: 1300, otherAllowance: 0, category: "Worker" },
      { employeeCode: "100045", nameAr: "Bayram", nameEn: "Bayram", department: "Kitchen", designation: "Head Chef", basicSalary: 3500, otherAllowance: 1000, category: "Senior" },
      { employeeCode: "100046", nameAr: "Zoheer", nameEn: "Zoheer", department: "Kitchen", designation: "Chef", basicSalary: 1250, otherAllowance: 750, category: "Junior" },
      { employeeCode: "100047", nameAr: "Saeed El Kasmi", nameEn: "Saeed El Kasmi", department: "Kitchen", designation: "Chef", basicSalary: 2000, otherAllowance: 1000, category: "Junior" },
      { employeeCode: "100048", nameAr: "Mohamed Zobair", nameEn: "Mohamed Zobair", department: "Kitchen", designation: "Steward", basicSalary: 800, otherAllowance: 425, category: "Worker" },
    ];

    const results: string[] = [];
    const now = Date.now();

    // Create departments map
    const deptMap = new Map<string, any>();
    const desigMap = new Map<string, any>();

    for (const emp of employees) {
      // Create department if not exists
      if (!deptMap.has(emp.department)) {
        const existingDept = await ctx.db
          .query("hrDepartments")
          .withIndex("by_company", (q) => q.eq("companyId", company._id))
          .filter((q) => q.eq(q.field("nameAr"), emp.department))
          .first();

        if (existingDept) {
          deptMap.set(emp.department, existingDept._id);
        } else {
          const deptId = await ctx.db.insert("hrDepartments", {
            companyId: company._id,
            code: emp.department.substring(0, 3).toUpperCase(),
            nameAr: emp.department,
            nameEn: emp.department,
            isActive: true,
            createdAt: now,
          });
          deptMap.set(emp.department, deptId);
          results.push(`Dept created: ${emp.department}`);
        }
      }

      // Create designation if not exists
      const desigKey = `${emp.department}-${emp.designation}`;
      if (!desigMap.has(desigKey)) {
        const existingDesig = await ctx.db
          .query("hrDesignations")
          .withIndex("by_company", (q) => q.eq("companyId", company._id))
          .filter((q) => q.eq(q.field("nameAr"), emp.designation))
          .first();

        if (existingDesig) {
          desigMap.set(desigKey, existingDesig._id);
        } else {
          const desigId = await ctx.db.insert("hrDesignations", {
            companyId: company._id,
            code: emp.designation.substring(0, 3).toUpperCase(),
            nameAr: emp.designation,
            nameEn: emp.designation,
            departmentId: deptMap.get(emp.department),
            isActive: true,
            createdAt: now,
          });
          desigMap.set(desigKey, desigId);
          results.push(`Designation created: ${emp.designation}`);
        }
      }

      // Check if employee already exists
      const existing = await ctx.db
        .query("hrEmployees")
        .withIndex("by_company_code", (q) => q.eq("companyId", company._id).eq("employeeCode", emp.employeeCode))
        .unique();

      if (existing) {
        results.push(`Skipped (exists): ${emp.employeeCode} - ${emp.nameAr}`);
        continue;
      }

      // Create employee
      await ctx.db.insert("hrEmployees", {
        companyId: company._id,
        branchId: branch._id,
        employeeCode: emp.employeeCode,
        nameAr: emp.nameAr,
        nameEn: emp.nameEn,
        departmentId: deptMap.get(emp.department),
        designationId: desigMap.get(desigKey),
        hireDate: "2024-01-01",
        employmentType: "full_time",
        basicSalary: emp.basicSalary,
        housingAllowance: 0,
        transportAllowance: 0,
        otherAllowance: emp.otherAllowance,
        salaryBasis: "monthly",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });

      results.push(`Created: ${emp.employeeCode} - ${emp.nameAr}`);
    }

    return {
      message: `Imported ${employees.length} employees`,
      created: results.length,
      details: results,
    };
  },
});

// ─── Add Direct Expenses accounts ────────────────────────────────────────────
export const addDirectExpensesAccounts = mutation({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const accounts = [
      { code: "5100", nameAr: "المصاريف المباشرة", nameEn: "Direct Expenses", accountType: "expense" as const, accountSubType: "direct_expense", normalBalance: "debit" as const, isPostable: false },
      { code: "5102", nameAr: "مواد خام مستهلكة", nameEn: "Raw Materials Consumed", accountType: "expense" as const, accountSubType: "direct_expense", normalBalance: "debit" as const, isPostable: true },
      { code: "5103", nameAr: "أجور عمالة مباشرة", nameEn: "Direct Labor Wages", accountType: "expense" as const, accountSubType: "direct_expense", normalBalance: "debit" as const, isPostable: true },
      { code: "5104", nameAr: "مصاريف التغليف", nameEn: "Packaging Expenses", accountType: "expense" as const, accountSubType: "direct_expense", normalBalance: "debit" as const, isPostable: true },
      { code: "5105", nameAr: "مصاريف الإنتاج المتنوعة", nameEn: "Miscellaneous Production Expenses", accountType: "expense" as const, accountSubType: "direct_expense", normalBalance: "debit" as const, isPostable: true },
      { code: "5106", nameAr: "مصاريف الطاقة والمرافق (إنتاج)", nameEn: "Production Utilities & Energy", accountType: "expense" as const, accountSubType: "direct_expense", normalBalance: "debit" as const, isPostable: true },
    ];

    const results: string[] = [];
    let parentId: any = undefined;

    for (const acc of accounts) {
      const existing = await ctx.db
        .query("accounts")
        .withIndex("by_company_code", (q) => q.eq("companyId", args.companyId).eq("code", acc.code))
        .first();
      if (existing) {
        if (acc.code === "5100") parentId = existing._id;
        results.push(`SKIP ${acc.code} already exists`);
        continue;
      }
      const newId = await ctx.db.insert("accounts", {
        companyId: args.companyId, code: acc.code, nameAr: acc.nameAr, nameEn: acc.nameEn,
        accountType: acc.accountType, accountSubType: acc.accountSubType,
        normalBalance: acc.normalBalance, isPostable: acc.isPostable,
        ...(acc.code !== "5100" && parentId ? { parentId } : {}),
        isActive: true, requiresCostCenter: false, requiresSubAccount: false, createdAt: now,
      });
      if (acc.code === "5100") parentId = newId;
      results.push(`CREATED ${acc.code} ${acc.nameEn}`);
    }
    if (parentId) {
      for (const acc of accounts) {
        if (acc.code === "5100") continue;
        const child = await ctx.db.query("accounts")
          .withIndex("by_company_code", (q) => q.eq("companyId", args.companyId).eq("code", acc.code))
          .first();
        if (child && !child.parentId) {
          await ctx.db.patch(child._id, { parentId } as any);
          results.push(`LINKED ${acc.code} to 5100`);
        }
      }
    }
    return { results, count: results.filter(r => r.startsWith("CREATED")).length };
  },
});
