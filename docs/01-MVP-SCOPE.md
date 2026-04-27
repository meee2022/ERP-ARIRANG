# ERP V1 — Final MVP Scope

## Decision: Weighted Average costing ONLY. FIFO deferred to V2.
## Decision: Source of truth = journal_lines table. stock_balance is a maintained cache updated atomically inside the same Convex mutation as each inventory movement.
## Decision: All monetary values stored as numbers in Convex. Displayed divided by 1 (no integer multiplication in Convex — numbers are used directly; formatting handles decimal display).
## Decision: Arabic-first RTL. English as secondary.
## Decision: Single-tenant per Convex deployment. Multi-tenant is V2.

---

## IN SCOPE — V1

### System Foundation
- [x] Company setup (single company per deployment)
- [x] Branches (multi-branch, branch selector everywhere)
- [x] Users with roles: admin, manager, accountant, cashier, sales, warehouse
- [x] Role-based permissions per screen and action
- [x] Fiscal Years (create, open, close, lock)
- [x] Accounting Periods (monthly, per fiscal year)
- [x] Document Sequences (per branch, per document type, per fiscal year)
- [x] Currencies (base + additional, exchange rates per date)
- [x] Tax Classes (VAT rate configuration)
- [x] Audit Log (append-only, on all mutations)

### Accounting Core
- [x] Chart of Accounts (tree hierarchy, main + sub accounts)
- [x] Cost Centers (hierarchy)
- [x] Opening Balances import
- [x] General Journal Entry (manual)
- [x] Cash Journal Entry
- [x] Expenses Journal Entry
- [x] Adjustments Journal
- [x] Auto-posting engine (triggered from operational modules)
- [x] Period lock enforcement on all posts
- [x] Journal balance enforcement (debit = credit, hard rule)
- [x] Non-postable parent accounts enforcement
- [x] Reversal entries

### Masters
- [x] Customer master (AR sub-ledger linked)
- [x] Supplier master (AP sub-ledger linked)
- [x] Item master (raw/semi/finished/service/expense)
- [x] Item categories (with default account mapping)
- [x] Units of Measure (with conversion)
- [x] Warehouses

### Sales Cycle
- [x] Cash sales invoice
- [x] Credit sales invoice
- [x] Mixed payment invoice
- [x] Sales return (with/without original reference)
- [x] Customer credit limit check (warning mode in V1)
- [x] Customer payment receipt voucher
- [x] Receipt allocation to invoices
- [x] AR aging

### Purchase Cycle
- [x] Supplier master
- [x] Purchase Order (draft, approve, receive)
- [x] Goods Receipt Note (GRN)
- [x] Purchase Invoice (stock + expense types)
- [x] Purchase Return
- [x] Supplier payment voucher
- [x] Payment allocation to invoices
- [x] AP aging

### Treasury
- [x] Bank accounts
- [x] Cash boxes
- [x] Cash Receipt Voucher
- [x] Cash Payment Voucher
- [x] Cheque received (full lifecycle: received → deposited → cleared/bounced)
- [x] Cheque issued (full lifecycle: issued → presented → cleared/stopped)
- [x] Bank Transfer
- [x] Petty Cash (fund + settlement)

### Inventory
- [x] Item master
- [x] Warehouses
- [x] Stock Balance (per item per warehouse, maintained table)
- [x] Inventory Movements (auto-created from GRN, sales, returns, adjustments)
- [x] Stock Adjustment (increase + decrease, requires approval)
- [x] Stock Transfer between warehouses
- [x] Recipes / BOM (for finished + semi-finished items)
- [x] Weighted average costing (recalculated on every inbound movement)
- [x] Negative stock prevention (configurable per item)

### Core Reports
- [x] Trial Balance
- [x] General Ledger (Account Statement)
- [x] Journal Entries Report
- [x] Customer Statement
- [x] Supplier Statement
- [x] AR Aging (5 buckets)
- [x] AP Aging (5 buckets)
- [x] Sales Report (by day/item/category/customer)
- [x] Purchase Report
- [x] Inventory Movement Report
- [x] Stock Balance Report
- [x] Stock Valuation Report
- [x] Cash & Bank Movement
- [x] Cheque Register (received + issued)
- [x] VAT Summary Report

---

## DEFERRED TO V2

- Fixed Assets (register, depreciation, disposal)
- HR & Payroll
- Budget module
- Events & Catering (complex features)
- Advanced Approval Workflows (V1: simple approve/reject by role)
- Bank Reconciliation (automated matching)
- FIFO costing
- Multi-currency FX gain/loss on settlement
- Inter-branch accounting
- Advanced analytics / BI dashboards
- Customer/Supplier portal
- API integrations (POS, delivery)
- Batch/expiry tracking
- Landed cost allocation
- Manufacturing production orders

---

## Deferred Tables (NOT in V1 schema)
- fixed_assets
- asset_categories
- depreciation_runs
- depreciation_run_lines
- employees
- payroll_runs
- payroll_lines
- payroll_components
- budget_lines
- bank_reconciliation
- bank_statements
- bank_statement_lines
- approval_workflows
- approval_steps
- approval_records
- approval_actions

---

## Spec Contradictions — Resolved

| Contradiction | Resolution |
|---|---|
| stock_balance: cache or authoritative? | **Maintained cache** — updated atomically in same mutation as inventory movement. Never recalculated from scratch. Source of truth for current stock. |
| current_balance on cash_box/bank: cached? | **cash_box.currentBalance**: maintained cache, updated on each voucher post. **bank_account**: system balance computed from GL account balance. |
| Costing method V1 | **Weighted Average ONLY**. FIFO deferred. |
| DB-level vs service-level rules | Journal balance check: **service-level** in posting.ts + **Convex mutation atomicity**. Period lock: **service-level** in every mutation. FK integrity: **service-level** (Convex is document DB, no native FK). |
| AR/AP balances: derived or stored? | **Always derived** from journal_lines at query time for reports. invoice.paymentStatus: maintained on each allocation action. |
| Income Statement source | **journal_lines** WHERE account.accountType IN (revenue,expense). Posted only unless toggle. |
