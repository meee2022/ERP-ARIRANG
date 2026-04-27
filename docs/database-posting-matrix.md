# Database + Posting Matrix — ERP V1
**Status: FINAL**

---

## 1. Table Inventory (V1 Only)

| Table | Purpose | Soft Delete |
|---|---|---|
| companies | Single company config | No |
| branches | Multi-branch | isActive flag |
| currencies | Currency master | isActive flag |
| exchangeRates | Daily rates | No |
| fiscalYears | Fiscal year definitions | status field |
| accountingPeriods | Monthly periods | status field |
| documentSequences | Auto-number counters | No |
| users | System users | isActive flag |
| accounts | Chart of accounts | isActive flag |
| costCenters | Cost center hierarchy | isActive flag |
| taxClasses | VAT/tax rates | isActive flag |
| customers | Customer master | isActive flag |
| suppliers | Supplier master | isActive flag |
| itemCategories | Item grouping | isActive flag |
| unitOfMeasure | UoM master | isActive flag |
| items | Item master | isActive flag |
| warehouses | Warehouse master | isActive flag |
| stockBalance | Current stock cache | No (always updated) |
| recipes | Recipe / BOM header | isActive flag |
| recipeLines | BOM components | No |
| salesInvoices | Sales invoice header | documentStatus=cancelled |
| salesInvoiceLines | Sales line items | No |
| salesReturns | Sales return header | documentStatus=cancelled |
| salesReturnLines | Return line items | No |
| purchaseOrders | PO header | documentStatus=cancelled |
| purchaseOrderLines | PO line items | No |
| goodsReceiptNotes | GRN header | documentStatus=cancelled |
| grnLines | GRN line items | No |
| purchaseInvoices | Purchase invoice header | documentStatus=cancelled |
| purchaseInvoiceLines | Purchase line items | No |
| purchaseReturns | Purchase return header | documentStatus=cancelled |
| purchaseReturnLines | Return line items | No |
| bankAccounts | Bank account master | isActive flag |
| cashBoxes | Petty cash boxes | isActive flag |
| cashReceiptVouchers | Cash receipts | documentStatus=cancelled |
| cashPaymentVouchers | Cash payments | documentStatus=cancelled |
| cheques | Cheque master | chequeStatus tracks lifecycle |
| bankTransfers | Inter-bank transfers | documentStatus=cancelled |
| journalEntries | All accounting entries | postingStatus=reversed |
| journalLines | Debit/credit lines | No (immutable with entry) |
| receiptAllocations | AR receipt → invoice link | isReversed flag |
| paymentAllocations | AP payment → invoice link | isReversed flag |
| inventoryMovements | Stock movement header | documentStatus=cancelled |
| inventoryMovementLines | Movement details | No |
| stockAdjustments | Stock adjustment header | documentStatus=cancelled |
| stockAdjustmentLines | Adjustment details | No |
| auditLogs | Immutable change log | Never deleted |

**DEFERRED TO V2 (NOT in V1 schema):**
fixedAssets, assetCategories, depreciationRuns, employees, payrollRuns, payrollComponents, budgetLines, bankReconciliation, bankStatements, approvalWorkflows, approvalRecords

---

## 2. Key Field Decisions

| Issue | Decision |
|---|---|
| Monetary storage | JavaScript `number` type in Convex. Max 2 decimal places enforced in app layer. |
| String IDs | Convex auto-generates `Id<"tableName">` — used everywhere as FK |
| Dates | Stored as `string` (ISO: "2026-04-19") for easy filtering. Timestamps as `number` (Date.now()). |
| Deleted records | Never physically deleted. isActive=false for masters. Status field for transactions. |
| AR/AP balance | NOT stored. Computed from journalLines at query time for reports. |
| stockBalance | IS stored as cache. Updated atomically in same mutation as inventory movement. |
| cashBox.currentBalance | IS stored as cache. Updated on every petty cash transaction post. |

---

## 3. Critical Indexes

```typescript
// journalLines — the most queried table
.index("by_entry", ["entryId"])                           // get all lines for an entry
.index("by_account", ["accountId"])                       // account statement
.index("by_account_date", ["accountId", "entryDate"])     // FUTURE: add entryDate to line

// stockBalance — unique per item+warehouse
.index("by_item_warehouse", ["itemId", "warehouseId"])    // unique enforced in app

// salesInvoices
.index("by_branch_date", ["branchId", "invoiceDate"])
.index("by_customer_status", ["customerId", "paymentStatus"])

// cheques
.index("by_status_due", ["chequeStatus", "dueDate"])      // due cheques report
```

---

## 4. Posting Matrix (Complete V1)

### Rules Applied to Every Post Operation
1. Period status must be `open`
2. Sum(debit lines) must equal Sum(credit lines) — exact match
3. All accounts must have `isPostable: true`
4. Source document must have `documentStatus: approved` (or draft for auto-posts)
5. After post: document is immutable. Only reversal allowed.

---

### Transaction 1: Cash Sale

| Field | Value |
|---|---|
| Source | salesInvoice (invoiceType=cash_sale) |
| Pre-conditions | period open · lines not empty · cash received = total · stock available |
| Journal DR | Cash/POS account `[totalAmount]` |
| Journal CR | Revenue accounts (per line) `[line subtotals]` |
| Journal CR | VAT Payable `[vatAmount]` |
| Journal CR | Service Charge Payable `[serviceCharge if >0]` |
| Journal DR | COGS accounts (per line) `[unitCost × qty]` |
| Journal CR | Inventory accounts (per line) `[unitCost × qty]` |
| Stock effect | `sales_issue` movement. stockBalance.quantity -= qty per line |
| AR/AP effect | None |
| paymentStatus after | `not_applicable` |
| Reversible | Yes — reverses journal + restores stock at original unitCost |
| Edge cases | Zero-cost item: COGS=0, warning shown. Service item: no stock movement. |

---

### Transaction 2: Credit Sale

| Field | Value |
|---|---|
| Source | salesInvoice (invoiceType=credit_sale) |
| Pre-conditions | period open · customerId required · dueDate required · credit limit check |
| Journal DR | Accounts Receivable — [Customer] `[totalAmount]` |
| Journal CR | Revenue accounts `[subtotals per line]` |
| Journal CR | VAT Payable `[vatAmount]` |
| Journal DR | COGS `[cost per line]` |
| Journal CR | Inventory `[cost per line]` |
| Stock effect | `sales_issue` |
| AR/AP effect | AR balance increases by totalAmount |
| paymentStatus after | `unpaid` → changes to `partial`/`paid` via receipt allocations |
| Reversible | Yes — but de-allocate receipts first if any exist |

---

### Transaction 3: Mixed Payment Sale

| Field | Value |
|---|---|
| Source | salesInvoice (invoiceType=mixed_sale) |
| Pre-conditions | cashReceived + cardReceived + creditAmount = totalAmount |
| Journal DR | Cash account `[cashReceived]` |
| Journal DR | Card Clearing account `[cardReceived if >0]` |
| Journal DR | AR — [Customer] `[creditAmount if >0]` |
| Journal CR | Revenue, VAT, Service Charge |
| Journal DR/CR | COGS / Inventory |
| AR effect | AR increases by creditAmount only |
| paymentStatus after | If creditAmount=0 → `not_applicable`. Else → `unpaid` |

---

### Transaction 4a: Sales Return — Cash Refund

| Field | Value |
|---|---|
| Journal DR | Revenue accounts `[subtotal]` |
| Journal DR | VAT Payable `[vatAmount]` |
| Journal CR | Cash account `[totalAmount]` |
| Journal DR | Inventory `[qty × currentAvgCost]` |
| Journal CR | COGS `[same]` |
| Stock effect | `sales_return` — increases stockBalance |

---

### Transaction 4b: Sales Return — Credit to AR

| Field | Value |
|---|---|
| Journal DR | Revenue accounts `[subtotal]` |
| Journal DR | VAT Payable `[vatAmount]` |
| Journal CR | AR — [Customer] `[totalAmount]` |
| Journal DR | Inventory / CR COGS |
| AR effect | AR decreases (customer credit) |

---

### Transaction 5: Purchase Invoice — Stock Items

| Field | Value |
|---|---|
| Source | purchaseInvoice (invoiceType=stock_purchase) |
| Pre-conditions | period open · unique(supplierId, supplierInvoiceNo) · approved |
| Journal DR | Inventory accounts (per line) `[lineTotal]` |
| Journal DR | VAT Receivable `[vatAmount]` |
| Journal CR | Accounts Payable — [Supplier] `[totalAmount]` |
| Stock effect | `purchase_receipt`. Weighted average recalculated: `newAvg = (oldQty×oldAvg + newQty×newCost) / (oldQty+newQty)` |
| AP effect | AP balance increases |
| paymentStatus after | `unpaid` |
| Reversal | Yes — but warns if stock already partially consumed |

---

### Transaction 6: Purchase Invoice — Expense/Service

| Field | Value |
|---|---|
| Journal DR | Expense accounts (per line account mapping) `[lineTotal]` |
| Journal DR | VAT Receivable `[vatAmount]` |
| Journal CR | Accounts Payable — [Supplier] `[totalAmount]` |
| Stock effect | None |
| AP effect | AP increases |

---

### Transaction 7: Purchase Return

| Field | Value |
|---|---|
| Journal DR | AP — [Supplier] `[totalAmount]` |
| Journal CR | Inventory / Expense account `[net amount]` |
| Journal CR | VAT Receivable `[vatAmount]` |
| Stock effect | `purchase_return` — reduces stockBalance |
| AP effect | AP decreases |

---

### Transaction 8: Cash Receipt Voucher

| Field | Value |
|---|---|
| Journal DR | Cash/Bank account `[amount]` |
| Journal CR | AR — [Customer] `[amount]` |
| AR effect | AR decreases |
| Allocation | Separate step — receiptAllocation records link voucher to invoices |
| Note | Allocation creates NO journal entry. AR already credited in voucher. |
| Reversal | Yes — reverse journal + mark allocations as reversed |

---

### Transaction 9: Cash Payment Voucher

| Field | Value |
|---|---|
| Journal DR | AP — [Supplier] `[amount]` |
| Journal CR | Cash/Bank account `[amount]` |
| AP effect | AP decreases |
| Allocation | Separate step — paymentAllocation records |

---

### Transaction 10: Cheque Received (Initial Entry)

| Field | Value |
|---|---|
| Journal DR | Cheques Under Collection `[amount]` |
| Journal CR | AR — [Customer] `[amount]` |
| chequeStatus | `received` |

### Transaction 11: Cheque Deposited

| Field | Value |
|---|---|
| Journal entry | None |
| chequeStatus | `received` → `deposited` |
| Action | Records depositDate |

### Transaction 12: Cheque Cleared

| Field | Value |
|---|---|
| Journal DR | Bank account `[amount]` |
| Journal CR | Cheques Under Collection `[amount]` |
| chequeStatus | `deposited` → `cleared` |

### Transaction 13: Cheque Bounced

| Field | Value |
|---|---|
| Journal DR | AR — [Customer] `[amount]` |
| Journal CR | Cheques Under Collection `[amount]` |
| Journal DR | Bank Charges Expense `[fee if charged]` |
| Journal CR | Bank account `[fee if charged]` |
| chequeStatus | `deposited` → `bounced` |
| AR effect | AR restored |

### Transaction 14: Cheque Issued (to Supplier)

| Field | Value |
|---|---|
| Journal DR | AP — [Supplier] `[amount]` |
| Journal CR | Cheques Issued (liability) `[amount]` |
| chequeStatus | `issued` |

### Transaction 15: Issued Cheque Cleared

| Field | Value |
|---|---|
| Journal DR | Cheques Issued `[amount]` |
| Journal CR | Bank account `[amount]` |
| chequeStatus | `presented` → `cleared_issued` |

### Transaction 16: Bank Transfer

| Field | Value |
|---|---|
| Journal DR | Destination bank GL `[amount]` |
| Journal DR | Bank Charges Expense `[fee if >0]` |
| Journal CR | Source bank GL `[amount + fee]` |

### Transaction 17: Petty Cash Fund

| Field | Value |
|---|---|
| Journal DR | Petty Cash account `[amount]` |
| Journal CR | Main Cash/Bank `[amount]` |
| cashBox.currentBalance | += amount |

### Transaction 18: Petty Cash Settlement

| Field | Value |
|---|---|
| Journal DR | Expense accounts (per receipt) `[amounts]` |
| Journal DR | VAT Receivable `[if applicable]` |
| Journal CR | Petty Cash account `[total]` |
| cashBox.currentBalance | -= total expenses |

### Transaction 19: Stock Adjustment — Increase

| Field | Value |
|---|---|
| Pre-conditions | approvedBy set |
| Journal DR | Inventory account `[varianceQty × avgCost]` |
| Journal CR | Inventory Adjustment / Other Income account `[same]` |
| Stock effect | `adjustment_in` — stockBalance.quantity += variance |

### Transaction 20: Stock Adjustment — Decrease

| Field | Value |
|---|---|
| Journal DR | Inventory Loss / Adjustment account `[varianceQty × avgCost]` |
| Journal CR | Inventory account `[same]` |
| Stock effect | `adjustment_out` — stockBalance.quantity -= variance |

### Transaction 21: Stock Transfer

| Field | Value |
|---|---|
| Journal DR | Inventory — Destination warehouse GL `[qty × avgCost]` |
| Journal CR | Inventory — Source warehouse GL `[same]` |
| Note | If both warehouses share same GL account → no journal needed |
| Stock effect | Source: `transfer_out` -qty. Destination: `transfer_in` +qty. AvgCost transferred as-is. |

---

## 5. Reversal Rules (All Transactions)

| Rule | Detail |
|---|---|
| Creates new entry | `journalEntries.isReversingEntry = true` |
| Swaps all lines | DR → CR, CR → DR, same amounts |
| Date | Reversal date specified by user. Must be in open period. |
| Links | `original.reversalEntryId = new._id` · `new.reversedEntryId = original._id` |
| Original | Stays `posted`. Immutable. |
| New entry | `postingStatus = posted` immediately |
| Stock | Restored at original unitCost from inventoryMovementLine |
| Allocation | Must de-allocate receipts/payments before reversing invoice |

---

## 6. Document Status Transitions

```
INVOICES (sales + purchase):
draft ──[approve]──▶ approved ──[post]──▶ posted
draft ──[cancel]──▶ cancelled
approved ──[cancel]──▶ cancelled (manager+)
posted ──[reverse]──▶ posted (reversalEntryId set; new reversing entry created)

VOUCHERS (receipt + payment):
draft ──[post]──▶ posted
posted ──[reverse]──▶ posted (same pattern)

CHEQUES:
received ──▶ deposited ──▶ cleared
deposited ──▶ bounced ──▶ [resolved manually]
issued ──▶ presented ──▶ cleared_issued
issued ──▶ stopped

PERIODS:
open ──[soft-close]──▶ soft_closed ──[close]──▶ closed ──[lock]──▶ locked
closed ──[reopen]──▶ open (manager+)
locked ──[unlock]──▶ closed (admin only)
```

---

## 7. Allocation Engine

```
Receipt Voucher posted → journal: DR Cash, CR AR (full amount)

Allocation (separate action):
  receiptAllocation { voucherId, invoiceId, allocatedAmount }

Rules:
  SUM(allocations for voucher) ≤ voucher.amount
  SUM(allocations for invoice) ≤ invoice.totalAmount

After each allocation:
  invoice.remainingBalance = totalAmount - SUM(active allocations)
  invoice.paymentStatus recalculated:
    = 0 → paid
    0 < x < total → partial
    = total → unpaid

Overpayment:
  allocation.allocatedAmount < voucher.amount
  voucher.allocationStatus = partial
  Surplus stays in voucher as unapplied credit
  Report: "سندات قبض غير مخصصة بالكامل"

Reversal:
  receiptAllocation.isReversed = true
  invoice.paymentStatus recalculated
  voucher.allocationStatus recalculated
  No journal entry needed
```
