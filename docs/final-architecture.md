# Final Architecture — ERP V1
**Status: FINAL | All decisions resolved | No alternatives listed**

---

## Stack (Final)

| Layer | Choice | Reason |
|---|---|---|
| Frontend framework | Next.js 16 (App Router) | Already installed, SSR+CSR hybrid |
| Language | TypeScript 5 | Type safety for accounting logic |
| Styling | Tailwind CSS v4 | Already installed |
| Components | shadcn/ui + Radix UI | Already installed, accessible |
| State | Zustand | Already installed, minimal boilerplate |
| Backend | Convex | Already installed, ACID mutations, real-time |
| Database | Convex document store | Single source, managed |
| Auth | Custom (Convex users table + Zustand session) | Simple enough for V1 |
| File storage | Convex storage | Built-in, no extra setup |
| Charts | Recharts | Already installed |
| Icons | lucide-react | Already installed |
| Date | date-fns | Already installed |
| Export | xlsx (already installed) + jsPDF (add) | Excel + PDF reports |
| Fonts | Tajawal (Arabic) via Google Fonts | Modern, RTL-optimized |
| Deployment | Vercel (frontend) + Convex Cloud (backend) | Zero-config |

---

## Accounting Engine Architecture

```
User Action (form submit)
        ↓
Convex Mutation (atomic transaction)
        ↓
   ┌────────────────────────────────┐
   │  1. validatePeriodOpen()       │  → throws if period closed/locked
   │  2. validatePermission()       │  → throws if role insufficient
   │  3. validateDocumentState()    │  → throws if wrong status
   │  4. buildJournalEntry()        │  → constructs journal lines
   │  5. validateJournalBalance()   │  → throws if DR ≠ CR
   │  6. validatePostableAccounts() │  → throws if non-postable account
   │  7. insertJournalEntry()       │  → persists to journalEntries + journalLines
   │  8. updateStockBalance()       │  → updates stockBalance cache (if inventory)
   │  9. updateDocumentStatus()     │  → sets postingStatus=posted on source doc
   │ 10. recalculatePaymentStatus() │  → updates paymentStatus on invoices
   │ 11. logAudit()                 │  → appends to auditLogs
   └────────────────────────────────┘
        ↓
   Convex returns updated doc
        ↓
   React query auto-refreshes UI
```

**Key invariant:** Steps 7–10 are inside a single Convex mutation = atomic. Either all succeed or none do.

---

## Multi-Branch Data Model

```
Every table has: companyId (for company isolation) + branchId (for branch filtering)

Queries always filter by:
  1. companyId = current company (from Zustand store)
  2. branchId IN user.authorizedBranches (from Zustand store)
     EXCEPTION: admin/manager role → no branch filter (consolidated view)

Branch selector in header → updates Zustand selectedBranchId
  → all list queries use selectedBranchId (or null = all authorized branches)
```

---

## Document Sequence Generation (Atomic)

```typescript
// Inside mutation — uses optimistic locking
async function nextDocumentNumber(ctx, branchId, fiscalYearId, docType) {
  const seq = await ctx.db.query("documentSequences")
    .withIndex("by_branch_year_type", q =>
      q.eq("branchId", branchId).eq("fiscalYearId", fiscalYearId).eq("documentType", docType)
    ).first();
  
  const next = (seq?.currentNumber ?? 0) + 1;
  const padded = String(next).padStart(seq?.padding ?? 4, "0");
  const number = `${seq?.prefix ?? docType}-${padded}`;
  
  if (seq) await ctx.db.patch(seq._id, { currentNumber: next });
  else await ctx.db.insert("documentSequences", { branchId, fiscalYearId, documentType: docType, currentNumber: 1, prefix: docType, padding: 4, resetYearly: true });
  
  return number;
}
```

---

## Stock Balance Update (Weighted Average)

```typescript
async function updateStockBalance(ctx, itemId, warehouseId, qty, unitCost, movementType) {
  const balance = await ctx.db.query("stockBalance")
    .withIndex("by_item_warehouse", q => q.eq("itemId", itemId).eq("warehouseId", warehouseId))
    .first();

  const currentQty = balance?.quantity ?? 0;
  const currentAvg = balance?.avgCost ?? 0;

  let newQty: number;
  let newAvg: number;

  if (["purchase_receipt", "adjustment_in", "transfer_in", "opening_stock"].includes(movementType)) {
    // Inbound: recalculate weighted average
    newQty = currentQty + qty;
    newAvg = newQty > 0 ? ((currentQty * currentAvg) + (qty * unitCost)) / newQty : 0;
  } else {
    // Outbound: use current average, just reduce quantity
    newQty = currentQty - qty;
    newAvg = currentAvg; // avg cost does not change on outbound
    if (newQty < 0 && !item.allowNegativeStock) throw new Error("NEGATIVE_STOCK");
  }

  if (balance) {
    await ctx.db.patch(balance._id, { quantity: newQty, avgCost: newAvg, totalValue: newQty * newAvg, lastUpdated: Date.now() });
  } else {
    await ctx.db.insert("stockBalance", { itemId, warehouseId, quantity: newQty, avgCost: newAvg, totalValue: newQty * newAvg, lastUpdated: Date.now() });
  }

  return { qtyBefore: currentQty, qtyAfter: newQty, avgCostBefore: currentAvg, avgCostAfter: newAvg };
}
```

---

## Audit Log Strategy

```typescript
// Called at end of every mutating operation
async function logAudit(ctx, { userId, action, entityType, entityId, branchId, oldValues, newValues }) {
  await ctx.db.insert("auditLogs", {
    userId, action, entityType, entityId, branchId,
    oldValues: JSON.stringify(oldValues ?? {}),
    newValues: JSON.stringify(newValues ?? {}),
    createdAt: Date.now(),
  });
  // auditLogs table: no delete mutation ever. Append-only by application design.
}
```

---

## Frontend File Structure (Final)

```
src/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # dir="rtl", Tajawal font, ConvexProvider, AppShell
│   ├── page.tsx                  # Dashboard
│   ├── finance/
│   │   ├── chart-of-accounts/page.tsx
│   │   ├── cost-centers/page.tsx
│   │   ├── journals/
│   │   │   ├── general/page.tsx + new/page.tsx + [id]/page.tsx
│   │   │   ├── cash/page.tsx + new/page.tsx
│   │   │   ├── expenses/page.tsx + new/page.tsx
│   │   │   └── adjustments/page.tsx + new/page.tsx
│   │   └── fiscal-years/page.tsx
│   ├── sales/
│   │   ├── customers/page.tsx + new/page.tsx + [id]/page.tsx
│   │   ├── invoices/page.tsx + new/page.tsx + [id]/page.tsx
│   │   └── returns/page.tsx + new/page.tsx + [id]/page.tsx
│   ├── purchases/
│   │   ├── suppliers/page.tsx + new/page.tsx + [id]/page.tsx
│   │   ├── orders/page.tsx + new/page.tsx + [id]/page.tsx
│   │   ├── grn/page.tsx + new/page.tsx + [id]/page.tsx
│   │   ├── invoices/page.tsx + new/page.tsx + [id]/page.tsx
│   │   └── returns/page.tsx + new/page.tsx + [id]/page.tsx
│   ├── treasury/
│   │   ├── bank-accounts/page.tsx
│   │   ├── receipts/page.tsx + new/page.tsx + [id]/page.tsx
│   │   ├── payments/page.tsx + new/page.tsx + [id]/page.tsx
│   │   ├── cheques/received/page.tsx + issued/page.tsx + due/page.tsx
│   │   └── transfers/page.tsx + new/page.tsx
│   ├── inventory/
│   │   ├── items/page.tsx + new/page.tsx + [id]/page.tsx
│   │   ├── warehouses/page.tsx
│   │   ├── recipes/page.tsx + new/page.tsx + [id]/page.tsx
│   │   ├── adjustments/page.tsx + new/page.tsx
│   │   └── transfers/page.tsx + new/page.tsx
│   ├── reports/
│   │   ├── trial-balance/page.tsx
│   │   ├── general-ledger/page.tsx
│   │   ├── customer-statement/page.tsx
│   │   ├── supplier-statement/page.tsx
│   │   ├── ar-aging/page.tsx
│   │   ├── ap-aging/page.tsx
│   │   ├── sales/page.tsx
│   │   ├── purchases/page.tsx
│   │   ├── inventory-movement/page.tsx
│   │   ├── stock-balance/page.tsx
│   │   ├── stock-valuation/page.tsx
│   │   ├── cash-bank/page.tsx
│   │   ├── cheque-register/page.tsx
│   │   └── vat-summary/page.tsx
│   └── settings/
│       ├── company/page.tsx
│       ├── branches/page.tsx
│       ├── users/page.tsx
│       ├── currencies/page.tsx
│       └── tax/page.tsx
│
├── components/
│   ├── layout/
│   │   ├── app-shell.tsx         # Sidebar + Header + main area
│   │   ├── sidebar.tsx           # Module navigation
│   │   └── header.tsx            # Branch selector, period badge, user menu
│   ├── ui/                       # shadcn/ui components + custom
│   │   ├── status-badge.tsx      # All status types
│   │   ├── data-table.tsx        # Reusable sortable table
│   │   ├── amount-input.tsx      # Currency-aware numeric input
│   │   ├── account-picker.tsx    # Smart account search
│   │   ├── item-picker.tsx       # Smart item search with stock
│   │   ├── customer-picker.tsx   # Customer search
│   │   ├── supplier-picker.tsx   # Supplier search
│   │   └── form-section.tsx      # Section wrapper with title
│   ├── shared/
│   │   ├── document-actions.tsx  # Save/Approve/Post/Reverse/Cancel buttons
│   │   ├── related-documents.tsx # Linked docs panel
│   │   ├── audit-trail.tsx       # Change history
│   │   └── totals-panel.tsx      # Sticky totals display
│   └── forms/
│       ├── invoice-lines.tsx     # Reusable invoice line items table
│       └── journal-lines.tsx     # Journal entry lines table
│
├── lib/
│   ├── types.ts                  # All TypeScript types
│   ├── constants.ts              # Status configs, labels, defaults
│   ├── utils.ts                  # formatCurrency, formatDate, etc.
│   └── posting-helpers.ts        # Client-side calculation helpers
│
├── store/
│   └── useAppStore.ts            # Zustand: user, selectedBranch, selectedPeriod, locale
│
└── hooks/
    ├── useCurrentBranch.ts
    ├── useCurrentPeriod.ts
    └── usePermissions.ts
```

---

## Convex Backend Structure (Final)

```
convex/
├── schema.ts                 # All 35+ table definitions
├── lib/
│   └── posting.ts            # Core posting engine (shared helpers)
├── accounts.ts               # Chart of accounts CRUD
├── costCenters.ts            # Cost centers CRUD
├── fiscalYears.ts            # Fiscal years + periods
├── users.ts                  # User management
├── company.ts                # Company settings
├── branches.ts               # Branch management
├── customers.ts              # Customer master + balance queries
├── suppliers.ts              # Supplier master + balance queries
├── items.ts                  # Item master
├── warehouses.ts             # Warehouse management
├── stockBalance.ts           # Stock balance queries
├── recipes.ts                # Recipe / BOM
├── salesInvoices.ts          # Sales invoices + posting
├── salesReturns.ts           # Sales returns + posting
├── purchaseOrders.ts         # Purchase orders
├── goodsReceiptNotes.ts      # GRN + stock receipt
├── purchaseInvoices.ts       # Purchase invoices + posting
├── purchaseReturns.ts        # Purchase returns
├── cashReceipts.ts           # Cash receipt vouchers + allocation
├── cashPayments.ts           # Cash payment vouchers + allocation
├── cheques.ts                # Cheque lifecycle
├── bankTransfers.ts          # Bank transfers
├── journalEntries.ts         # Manual journals
├── inventoryMovements.ts     # Stock movements
├── stockAdjustments.ts       # Stock adjustments
├── reports.ts                # All report queries
└── seed.ts                   # Initial data seed
```

---

## Convex Indexes (Required for Performance)

```typescript
// Key indexes — all others follow same pattern
salesInvoices: [
  .index("by_branch", ["branchId"]),
  .index("by_customer", ["customerId"]),
  .index("by_period", ["periodId"]),
  .index("by_status", ["documentStatus", "postingStatus"]),
  .index("by_branch_date", ["branchId", "invoiceDate"]),
]

journalLines: [
  .index("by_entry", ["entryId"]),
  .index("by_account", ["accountId"]),
  .index("by_account_period", ["accountId", "entryId"]),
  .index("by_sub_account", ["subAccountId"]),
]

stockBalance: [
  .index("by_item_warehouse", ["itemId", "warehouseId"]),  // unique
  .index("by_warehouse", ["warehouseId"]),
]

inventoryMovements: [
  .index("by_item_warehouse", ["warehouseId"]),
  .index("by_source", ["sourceType", "sourceId"]),
]
```
