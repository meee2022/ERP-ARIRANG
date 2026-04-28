# MVP Scope — ERP V1
**Status: FINAL | No draft items | All decisions resolved**

---

## Core Decisions (Resolved)

| Decision | Choice |
|---|---|
| Costing method | Weighted Average only |
| Stock balance storage | Maintained cache table (updated atomically per movement) |
| Financial balance source of truth | `journalLines` table only |
| AR/AP balance source | Computed from journalLines at query time |
| Approval workflow | Role-based permission check only (no workflow engine) |
| Currency | Base currency only (SAR). Multi-currency → V2 |
| Tenant model | Single company per deployment |
| Auth | Convex-stored users with role enum |
| Negative stock | Per-item flag. Default: blocked |
| 3-way match | Optional per company setting. Default: off in V1 |
| Period lock | Hard block — no posting to closed/locked period |
| Document immutability | Posted docs: no edit, no delete. Reversal only |

---

## V1 In-Scope Modules

### 1. System Foundation
| Feature | Included |
|---|---|
| Company setup | ✓ |
| Branches (multi) | ✓ |
| Users + roles (admin/manager/accountant/cashier/sales/warehouse) | ✓ |
| Fiscal years | ✓ |
| Accounting periods (monthly) | ✓ |
| Document sequences per branch/year/type | ✓ |
| Base currency (SAR) | ✓ |
| Tax classes (VAT) | ✓ |
| Audit log (append-only) | ✓ |
| Settings screens | ✓ |

### 2. Chart of Accounts & Finance Core
| Feature | Included |
|---|---|
| Chart of accounts (tree, main + sub) | ✓ |
| Cost centers | ✓ |
| Opening balances | ✓ |
| General journal (manual) | ✓ |
| Cash journal | ✓ |
| Expenses journal | ✓ |
| Adjustments journal | ✓ |
| Auto-posting engine | ✓ |
| Period close (checklist + lock) | ✓ |
| Reversal entries | ✓ |

### 3. Customers & Sales Cycle
| Feature | Included |
|---|---|
| Customer master (AR sub-ledger) | ✓ |
| Cash sales invoice | ✓ |
| Credit sales invoice | ✓ |
| Mixed payment invoice | ✓ |
| Sales return (with/without source invoice) | ✓ |
| Credit limit check (warning mode) | ✓ |
| Cash receipt voucher | ✓ |
| Receipt allocation to invoices | ✓ |

### 4. Suppliers & Purchase Cycle
| Feature | Included |
|---|---|
| Supplier master (AP sub-ledger) | ✓ |
| Purchase order | ✓ |
| Goods Receipt Note (GRN) | ✓ |
| Purchase invoice (stock + expense types) | ✓ |
| Purchase return | ✓ |
| Cash payment voucher | ✓ |
| Payment allocation to invoices | ✓ |

### 5. Treasury
| Feature | Included |
|---|---|
| Bank accounts | ✓ |
| Cash boxes | ✓ |
| Cheque received (full lifecycle) | ✓ |
| Cheque issued (full lifecycle) | ✓ |
| Bank transfer | ✓ |
| Petty cash (fund + settle) | ✓ |

### 6. Inventory & Costing
| Feature | Included |
|---|---|
| Items master (raw/semi/finished/service/expense) | ✓ |
| Item categories | ✓ |
| Units of measure | ✓ |
| Warehouses | ✓ |
| Stock balance (per item × warehouse) | ✓ |
| Inventory movements (auto + manual) | ✓ |
| Stock adjustment (increase/decrease) | ✓ |
| Stock transfer between warehouses | ✓ |
| Recipes / BOM | ✓ |
| Weighted average costing | ✓ |

### 7. Core Reports (V1)
| Report | Included |
|---|---|
| Trial balance | ✓ |
| General ledger (account statement) | ✓ |
| Journal report | ✓ |
| Customer statement | ✓ |
| Supplier statement | ✓ |
| AR aging (5 buckets) | ✓ |
| AP aging (5 buckets) | ✓ |
| Sales report (by day/item/category/customer) | ✓ |
| Purchase report | ✓ |
| Inventory movement | ✓ |
| Stock balance | ✓ |
| Stock valuation | ✓ |
| Cash & bank movement | ✓ |
| Cheque register | ✓ |
| VAT summary | ✓ |

---

## V2 Deferred (Explicit)

| Module | Why Deferred |
|---|---|
| Fixed assets (register, depreciation, disposal) | Separate accounting domain, not blocking V1 ops |
| HR & Payroll | Not core to accounting launch |
| Budget vs Actual | Requires budget data model not in V1 |
| Bank reconciliation (auto-match engine) | Complex; manual matching in V2 |
| Multi-currency FX gain/loss | Complex settlement accounting |
| FIFO costing | Weighted average covers V1 needs |
| Approval workflow engine | Role-based permissions sufficient for V1 |
| Inter-branch accounting | Single-entity model in V1 |
| Events & catering (complex features) | Simple version only in V1 |
| Customer/supplier portal | External-facing, post-launch |
| API integrations (POS, delivery) | Integration layer post-launch |
| Batch/expiry tracking | Operational complexity, V2 |
| Accruals/prepayments module | Manual journal covers V1 |
| Landed cost allocation | Simple landed cost field in V1 |

---

## Module → Screen → Report Linkage

```
FINANCE
  Setup:     /finance/chart-of-accounts, /finance/cost-centers, /finance/fiscal-years
  Journals:  /finance/journals/general, /finance/journals/cash,
             /finance/journals/expenses, /finance/journals/adjustments
  Reports:   /reports/trial-balance, /reports/general-ledger, /reports/journals

SALES
  Masters:   /sales/customers
  Txns:      /sales/invoices, /sales/invoices/new, /sales/invoices/[id]
             /sales/returns, /sales/returns/new
  Treasury:  /treasury/receipts, /treasury/receipts/new
  Reports:   /reports/sales, /reports/customer-statement, /reports/ar-aging

PURCHASES
  Masters:   /purchases/suppliers
  Txns:      /purchases/orders, /purchases/grn, /purchases/invoices,
             /purchases/returns
  Treasury:  /treasury/payments, /treasury/payments/new
  Reports:   /reports/purchases, /reports/supplier-statement, /reports/ap-aging

TREASURY
  Setup:     /treasury/bank-accounts
  Txns:      /treasury/receipts, /treasury/payments, /treasury/transfers
             /treasury/cheques/received, /treasury/cheques/issued
  Review:    /treasury/cheques/due
  Reports:   /reports/cash-bank, /reports/cheque-register

INVENTORY
  Setup:     /inventory/items, /inventory/warehouses, /inventory/recipes
  Txns:      /inventory/adjustments, /inventory/transfers
  Reports:   /reports/inventory-movement, /reports/stock-balance,
             /reports/stock-valuation

SETTINGS
  /settings/company, /settings/branches, /settings/users,
  /settings/currencies, /settings/tax, /settings/import-export
```
