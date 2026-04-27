# ERP V1 — Final Posting Matrix

## Rules That Apply To ALL Transactions
1. Period must be `open` before any posting
2. Journal debit total MUST equal credit total
3. All accounts in journal lines must have `isPostable = true`
4. After posting: document is IMMUTABLE
5. Reversal creates a NEW journal entry (all debits↔credits swapped)
6. Stock updates happen in same atomic mutation as journal posting

---

## POSTING MATRIX

### 1. Cash Sale
| Field | Value |
|---|---|
| **Source Document** | salesInvoice (invoiceType=cash_sale) |
| **Post Condition** | documentStatus=approved, period=open, lines not empty, cash received=total |
| **Journal Entry** | DR Cash/POS Account `[total incl. VAT]` |
| | CR Revenue by category `[subtotal net]` |
| | CR VAT Payable `[vatAmount]` |
| | CR Service Charge Payable `[serviceCharge if >0]` |
| | DR COGS `[unitCost × qty per line]` |
| | CR Inventory `[same]` |
| **Stock Effect** | `sales_issue` movement — reduces stock_balance per line |
| **AR/AP Effect** | None (cash, no AR created) |
| **Payment Status** | `not_applicable` |
| **Reversible** | Yes |
| **Reversal Logic** | All lines swapped. Inventory restored at original unitCost (from movement line) |
| **Edge Cases** | Item with zero avgCost → COGS=0, show warning. Service items → no stock movement |
| **Validations** | Warehouse has stock OR allowNegativeStock=true. All items active. Period open. |

---

### 2. Credit Sale
| Field | Value |
|---|---|
| **Source Document** | salesInvoice (invoiceType=credit_sale) |
| **Post Condition** | documentStatus=approved, customerId required, dueDate required |
| **Journal Entry** | DR Accounts Receivable — [Customer] `[total incl. VAT]` |
| | CR Revenue `[subtotal]` |
| | CR VAT Payable `[vatAmount]` |
| | DR COGS `[cost per line]` |
| | CR Inventory `[same]` |
| **Stock Effect** | `sales_issue` — reduces stock |
| **AR/AP Effect** | AR increases by total |
| **Payment Status** | Starts `unpaid`. Changes to `partial`/`paid` via receipt allocations |
| **Reversible** | Yes — but only if no allocations exist (or must de-allocate first) |
| **Reversal Logic** | DR Revenue, DR VAT Payable, CR AR. Stock restored. |
| **Edge Cases** | Credit limit exceeded → warning shown (V1: soft warning, not hard block) |
| **Validations** | Customer active, dueDate > invoiceDate, period open |

---

### 3. Mixed Payment Sale
| Field | Value |
|---|---|
| **Source Document** | salesInvoice (invoiceType=mixed_sale) |
| **Post Condition** | cashReceived + cardReceived + creditAmount = totalAmount |
| **Journal Entry** | DR Cash Account `[cashReceived]` |
| | DR Card Clearing Account `[cardReceived]` |
| | DR AR — [Customer] `[creditAmount]` (if >0) |
| | CR Revenue `[subtotal]` |
| | CR VAT Payable `[vatAmount]` |
| | DR COGS / CR Inventory |
| **Stock Effect** | `sales_issue` |
| **AR/AP Effect** | AR increases by creditAmount only |
| **Payment Status** | If creditAmount=0 → `not_applicable`. Else → `unpaid` |
| **Reversible** | Yes |

---

### 4a. Sales Return (Cash Refund)
| Field | Value |
|---|---|
| **Source Document** | salesReturn (refundMethod=cash) |
| **Journal Entry** | DR Revenue `[subtotal]` |
| | DR VAT Payable `[vatAmount]` |
| | CR Cash Account `[total]` |
| | DR Inventory `[qty × currentAvgCost]` |
| | CR COGS `[same]` |
| **Stock Effect** | `sales_return` movement — increases stock_balance |
| **AR/AP Effect** | None |
| **Reversible** | Yes |

---

### 4b. Sales Return (Credit to AR)
| Field | Value |
|---|---|
| **Source Document** | salesReturn (refundMethod=credit_note or offset) |
| **Journal Entry** | DR Revenue `[subtotal]` |
| | DR VAT Payable `[vatAmount]` |
| | CR AR — [Customer] `[total]` |
| | DR Inventory / CR COGS |
| **AR/AP Effect** | AR decreases (customer credit) |

---

### 5. Purchase Invoice — Stock Items
| Field | Value |
|---|---|
| **Source Document** | purchaseInvoice (invoiceType=stock_purchase) |
| **Post Condition** | documentStatus=approved, grnId linked (if enforce3wayMatch=true) |
| **Journal Entry** | DR Inventory — [per item category account] `[lineTotal per line]` |
| | DR VAT Receivable `[vatAmount]` |
| | CR Accounts Payable — [Supplier] `[totalAmount]` |
| **Stock Effect** | `purchase_receipt` movement — increases stock_balance |
| **Weighted Avg Cost Update** | `newAvg = (oldQty × oldAvg + newQty × newUnitCost) / (oldQty + newQty)` |
| **AR/AP Effect** | AP increases by totalAmount |
| **Payment Status** | `unpaid` |
| **Reversible** | Yes — but cannot reverse if stock already consumed (warning) |
| **Validations** | Unique(supplierId, supplierInvoiceNo). Period open. |

---

### 6. Purchase Invoice — Expense/Service
| Field | Value |
|---|---|
| **Source Document** | purchaseInvoice (invoiceType=expense_purchase) |
| **Journal Entry** | DR Expense Account `[lineTotal per line]` |
| | DR VAT Receivable `[vatAmount]` |
| | CR AP — [Supplier] `[totalAmount]` |
| **Stock Effect** | None |
| **AR/AP Effect** | AP increases |

---

### 7. Purchase Return
| Field | Value |
|---|---|
| **Source Document** | purchaseReturn |
| **Journal Entry** | DR AP — [Supplier] `[totalAmount]` |
| | CR Inventory / Expense Account `[net amount]` |
| | CR VAT Receivable `[vatAmount]` |
| **Stock Effect** | `purchase_return` — reduces stock_balance |
| **AR/AP Effect** | AP decreases |

---

### 8. Cash Receipt Voucher (Customer Payment)
| Field | Value |
|---|---|
| **Source Document** | cashReceiptVoucher |
| **Journal Entry** | DR Cash/Bank Account `[amount]` |
| | CR AR — [Customer] `[amount]` |
| **AR/AP Effect** | AR decreases |
| **Allocation** | Separate step — creates receiptAllocation records, updates invoice.paymentStatus |
| **No additional journal** | Allocation is non-accounting (AR already credited in voucher) |
| **Reversible** | Yes — reverses journal. Must also reverse allocations first. |

---

### 9. Cash Payment Voucher (Supplier Payment)
| Field | Value |
|---|---|
| **Source Document** | cashPaymentVoucher |
| **Journal Entry** | DR AP — [Supplier] `[amount]` |
| | CR Cash/Bank Account `[amount]` |
| **AR/AP Effect** | AP decreases |
| **Allocation** | Separate step — paymentAllocation records |

---

### 10. Cheque Received (Initial Entry)
| Field | Value |
|---|---|
| **Source Document** | cheque (chequeType=received) |
| **Journal Entry on Receipt** | DR Cheques Under Collection `[amount]` |
| | CR AR — [Customer] `[amount]` |
| **Status** | received |

### 11. Cheque Deposited
| No journal entry — status change only | chequeStatus → deposited |

### 12. Cheque Cleared
| **Journal Entry** | DR Bank Account `[amount]` |
| | CR Cheques Under Collection `[amount]` |
| **Status** | cleared |

### 13. Cheque Bounced
| **Journal Entry** | DR AR — [Customer] `[amount]` |
| | CR Cheques Under Collection `[amount]` |
| | DR Bank Charges Expense `[fee if any]` |
| | CR Bank Account `[fee if any]` |
| **Status** | bounced |

### 14. Cheque Issued (to Supplier)
| **Journal Entry on Issue** | DR AP — [Supplier] `[amount]` |
| | CR Cheques Issued `[amount]` |
| **Status** | issued |

### 15. Issued Cheque Cleared
| **Journal Entry** | DR Cheques Issued `[amount]` |
| | CR Bank Account `[amount]` |
| **Status** | cleared_issued |

---

### 16. Stock Adjustment — Increase
| Field | Value |
|---|---|
| **Source Document** | stockAdjustment (adjustmentType=increase) |
| **Post Condition** | approvedBy set |
| **Journal Entry** | DR Inventory `[variance qty × avgCost]` |
| | CR Inventory Adjustment Account `[same]` |
| **Stock Effect** | `adjustment_in` — increases stock_balance |

### 17. Stock Adjustment — Decrease
| **Journal Entry** | DR Inventory Adjustment / Loss Account `[variance qty × avgCost]` |
| | CR Inventory `[same]` |
| **Stock Effect** | `adjustment_out` — decreases stock_balance |

---

### 18. Stock Transfer Between Warehouses
| Field | Value |
|---|---|
| **Source Document** | inventoryMovement (transfer_out + transfer_in) |
| **Journal Entry** | DR Inventory — [destination warehouse account] `[qty × avgCost]` |
| | CR Inventory — [source warehouse account] `[same]` |
| **Stock Effect** | Source: `transfer_out`. Destination: `transfer_in`. Avg cost transferred as-is. |
| **Note** | If both warehouses map to same inventory account → no journal needed (same GL account) |

---

### 19. Bank Transfer
| Field | Value |
|---|---|
| **Journal Entry** | DR Destination Bank Account `[amount]` |
| | DR Bank Charges Expense `[feeAmount if >0]` |
| | CR Source Bank Account `[amount + feeAmount]` |

---

### 20. Petty Cash Funding
| **Journal Entry** | DR Petty Cash `[amount]` |
| | CR Main Cash/Bank `[amount]` |

### 21. Petty Cash Settlement
| **Journal Entry** | DR Expense Accounts `[total expenses]` |
| | DR VAT Receivable `[if any]` |
| | CR Petty Cash `[total]` |

---

## Reversal Rules (All Transactions)
- Creates new journal_entry with `isReversingEntry=true`
- All debit lines → credit lines, all credit lines → debit lines
- Same amounts
- Entry date = reversal date specified
- Period of reversal date must be open
- `original.reversalEntryId = newEntry.id`
- `newEntry.reversedEntryId = original.id`
- Original posting_status stays `posted` (immutable)
- New entry posting_status = `posted` immediately

---

## Reports Matrix (V1)

| Report | Source | Filters | Group By | Drilldown |
|---|---|---|---|---|
| **Trial Balance** | journal_lines + accounts | Date range, Branch, Level | account | → Account Statement |
| **General Ledger** | journal_lines + journal_entries | Account, Date, Branch | chronological | → Journal Entry |
| **Journal Report** | journal_entries + lines | Journal type, Date, Status | date | → Journal Entry detail |
| **Customer Statement** | salesInvoices + receiptVouchers + allocations | Customer, Date | date | → Invoice / Voucher |
| **Supplier Statement** | purchaseInvoices + paymentVouchers + allocations | Supplier, Date | date | → Invoice / Voucher |
| **AR Aging** | salesInvoices - allocations | As-of date, Branch | customer | → Customer Statement |
| **AP Aging** | purchaseInvoices - allocations | As-of date, Branch | supplier | → Supplier Statement |
| **Sales Report** | salesInvoices + lines | Date, Branch, Customer, Item | day/item/category | → Invoice |
| **Purchase Report** | purchaseInvoices + lines | Date, Branch, Supplier, Item | day/item | → Invoice |
| **Inventory Movement** | inventoryMovements + lines | Item, Warehouse, Date, Type | chronological | → Source document |
| **Stock Balance** | stockBalance | Warehouse, Category | item | → Inventory Movement |
| **Stock Valuation** | stockBalance | Warehouse, Category | item | — |
| **Cash & Bank Movement** | journalLines (bank/cash accounts) | Account, Date | chronological | → Journal Entry |
| **Cheque Register** | cheques | Type, Status, Date, Bank | date | → Cheque detail |
| **VAT Summary** | journalLines (VAT accounts) | Date, Branch | period | → Journal Entry |

### Report Column Totals
- Trial Balance: Total DR = Total CR (shown bold, validated)
- Sales: Grand total revenue, VAT, discounts
- Aging: Total per bucket, Grand total outstanding
- Inventory Movement: Total In, Total Out
- Stock Valuation: Total Value

### Export Formats (all reports)
- Excel (.xlsx) via xlsx library
- CSV
- Print (browser print dialog, print-specific CSS)
- PDF (jsPDF — install in V1)
