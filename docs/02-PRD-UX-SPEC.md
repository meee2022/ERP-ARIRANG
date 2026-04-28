# ERP V1 — Accountant-First UX Specification

## Guiding Principles
1. **Accountant is the primary user** — power and speed over simplicity
2. **Arabic-first** — all labels, messages, and defaults in Arabic
3. **Keyboard-first** — Tab/Enter navigates. No mouse required for data entry.
4. **Zero ambiguity** — every status, every number, every account shown clearly
5. **Fast recovery** — errors shown inline, not in modals. Fix in place.
6. **Context always visible** — Branch, Period, Currency never hidden

---

## General Interface Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│ HEADER (fixed, 56px)                                                │
│  [≡ Menu]  [Logo]  [Branch: الفرع الرئيسي ▾]  [ف.مالية: يناير 2026 ●]  │
│                         [AR|EN]  [🔔 3]  [خالد ▾]                   │
├──────────────────┬──────────────────────────────────────────────────┤
│                  │ BREADCRUMB (32px)                                 │
│ SIDEBAR          │ الرئيسية > المبيعات > فواتير المبيعات             │
│ (248px, RTL)     ├──────────────────────────────────────────────────┤
│                  │                                                  │
│ Collapsible      │ PAGE CONTENT                                     │
│ sections         │                                                  │
│                  │ Filter bar (if list page)                        │
│ Icons +          │ Data table / Form                                │
│ Arabic labels    │                                                  │
│                  │                                                  │
│                  │                                                  │
└──────────────────┴──────────────────────────────────────────────────┘
```

### Period Status Badge in Header
- `● فتح` (green dot) — period is open
- `◐ إغلاق مؤقت` (yellow) — soft closed
- `■ مغلق` (orange) — closed
- `🔒 مقفل` (red) — locked
- When soft-closed or closed: orange banner below header: "الفترة المحاسبية إغلاق مؤقت — يرجى إتمام إجراءات الإغلاق"

---

## Navigation Structure (Sidebar RTL)

```
الرئيسية
─────────────────────
المالية
  ▾ دليل الحسابات
  ▾ مراكز التكلفة
  ▾ القيود اليومية
    - قيد عام
    - قيد نقدي
    - قيد مصروفات
    - قيد تسويات
  ▾ السنوات المالية
─────────────────────
الخزينة
  ▾ الحسابات البنكية
  ▾ سندات القبض
  ▾ سندات الصرف
  ▾ الشيكات المستلمة
  ▾ الشيكات الصادرة
  ▾ الشيكات المستحقة
─────────────────────
المبيعات
  ▾ العملاء
  ▾ فواتير المبيعات
  ▾ مردودات المبيعات
  ▾ التقارير
─────────────────────
المشتريات
  ▾ الموردون
  ▾ طلبات الشراء
  ▾ استلام البضاعة
  ▾ فواتير المشتريات
  ▾ مردودات المشتريات
  ▾ التقارير
─────────────────────
المخزون
  ▾ الأصناف
  ▾ المستودعات
  ▾ الوصفات
  ▾ تسوية المخزون
  ▾ تحويل مخزون
  ▾ التقارير
─────────────────────
التقارير
  ▾ ميزان المراجعة
  ▾ دفتر الأستاذ العام
  ▾ كشف حساب عميل
  ▾ كشف حساب مورد
  ▾ أعمار ديون عملاء
  ▾ أعمار ديون موردون
  ▾ تقرير المبيعات
  ▾ تقرير المشتريات
  ▾ حركة المخزون
  ▾ سجل الشيكات
─────────────────────
الإعدادات
  ▾ الشركة والفروع
  ▾ المستخدمون
  ▾ العملات
  ▾ الضرائب
  ▾ استيراد / تصدير
```

---

## Keyboard-First Data Entry

### Tab Order in Forms
- All fields in logical reading order (RTL: right to left, top to bottom)
- Tab = next field
- Shift+Tab = previous field
- Enter in text field = Tab (move to next)
- Enter in last field of table row = add new row
- Escape = cancel current field edit, revert to saved value

### Smart Pickers (account, item, customer)
- Type any part of code or name (Arabic or English)
- Dropdown opens after 1 character
- Arrow Up/Down = navigate dropdown
- Enter = select highlighted item
- Escape = close dropdown, keep original value
- Tab = select first item + move to next field

### Numeric Fields
- Click or Tab-focus = select all text (for easy overwrite)
- Only numbers and decimal point accepted
- Negative sign not accepted (use credit side of journal)
- Right-aligned always
- 2 decimal places enforced for currency fields
- 4 decimal places for quantity and unit cost fields

### Journal Entry Table Keyboard Flow
```
Account → Sub-account → Description → Cost Center → Debit → Credit → [Enter=new row]
```
The Debit and Credit cells: typing in one auto-clears the other.

---

## Status Badges — Colors & Arabic Labels

| Status | Arabic | Color Class | Background |
|---|---|---|---|
| draft | مسودة | text-gray-600 | bg-gray-100 |
| approved | معتمد | text-blue-700 | bg-blue-100 |
| posted | مرحّل | text-green-700 | bg-green-100 |
| reversed | مُعكوس | text-orange-700 | bg-orange-100 |
| cancelled | ملغي | text-red-700 | bg-red-100 |
| unpaid | غير مدفوع | text-red-600 | bg-red-50 |
| partial | مدفوع جزئياً | text-yellow-700 | bg-yellow-50 |
| paid | مدفوع | text-green-700 | bg-green-50 |
| unposted | غير مرحّل | text-gray-500 | bg-gray-50 |
| unallocated | غير مخصص | text-gray-500 | bg-gray-50 |
| fully_allocated | مخصص بالكامل | text-green-700 | bg-green-50 |
| open (period) | مفتوحة | text-green-700 | bg-green-100 |
| soft_closed | إغلاق مؤقت | text-yellow-700 | bg-yellow-100 |
| closed | مغلقة | text-orange-700 | bg-orange-100 |
| locked | مقفلة | text-red-700 | bg-red-100 |
| received (cheque) | مستلم | text-blue-600 | bg-blue-50 |
| deposited | مودع | text-purple-600 | bg-purple-50 |
| cleared | محصّل | text-green-700 | bg-green-100 |
| bounced | مرتد | text-red-700 | bg-red-100 |
| issued | صادر | text-blue-600 | bg-blue-50 |
| stopped | موقوف | text-red-700 | bg-red-100 |

---

## Transaction Form Layout Pattern

Every transaction form follows this structure:

```
┌─────────────────────────────────────────────────────────────────────┐
│ PAGE TITLE: فاتورة مبيعات جديدة    [Status Badge]                  │
│ [Document Number: SI-0023-2026]                                      │
├─────────────────────────────────────────────────────────────────────┤
│ SECTION 1: المعلومات الأساسية (header fields — 3 col grid)          │
│  [النوع] [التاريخ] [تاريخ الاستحقاق]                               │
│  [الفرع] [المستودع] [العملة]                                        │
│  [العميل] [مركز التكلفة] [ملاحظات]                                  │
├─────────────────────────────────────────────────────────────────────┤
│ SECTION 2: الأصناف (items table — full width)                       │
│  ┌─────┬──────────────┬──────┬──────┬──────┬──────┬──────┬──────┐  │
│  │  #  │   الصنف      │ الكمية│ الوحدة│ السعر│ خصم% │ ضريبة│الإجمالي│  │
│  └─────┴──────────────┴──────┴──────┴──────┴──────┴──────┴──────┘  │
│  [+ إضافة صنف]                                                      │
├─────────────────────────────────────────────────────────────────────┤
│ SECTION 3: TOTALS (right-aligned, sticky if long form)              │
│                          المجموع الفرعي:   5,000.00 ر.س            │
│                          الخصم:              (250.00)               │
│                          المبلغ الخاضع:    4,750.00                 │
│                          ضريبة القيمة المضافة (15%):  712.50        │
│                          الإجمالي:          5,462.50 ر.س            │
├─────────────────────────────────────────────────────────────────────┤
│ SECTION 4: Payment (for cash/mixed only)                            │
├─────────────────────────────────────────────────────────────────────┤
│ ACTION BAR (sticky bottom)                                          │
│  [حذف] ............. [طباعة] [حفظ مسودة] [اعتماد] [ترحيل]         │
└─────────────────────────────────────────────────────────────────────┘
```

### Action Button Rules
- **حفظ مسودة** (gray): always visible
- **اعتماد** (blue): visible only if status=draft AND user has approve permission
- **ترحيل** (green): visible only if status=approved AND user has post permission
- **عكس القيد** (orange): visible only if posting_status=posted AND user has reverse permission
- **إلغاء** (red outline): visible only if status=draft or approved (not posted)
- **طباعة** (gray): always visible after save
- **تصدير PDF** (gray): always visible after save

---

## Related Documents Panel

On any transaction detail page, a collapsible panel on the left (in RTL = left side of content) shows:

```
المستندات المرتبطة
─────────────────────
▶ القيد المحاسبي: JV-0045-2026  [مرحّل] →
▶ حركة المخزون: SM-0023-2026  →
▶ سند القبض: CR-0012-2026  [مرحّل] →
▶ الفاتورة الأصلية: SI-0018-2026  →
```

Each link opens in the same panel or navigates to the document.

---

## Audit Trail Panel

Collapsible at the bottom of every detail page:

```
سجل التعديلات
─────────────────────
2026-04-19 14:32  خالد أحمد    أنشأ الفاتورة    [مسودة]
2026-04-19 14:45  محمد العلي   اعتمد الفاتورة    [معتمد]
2026-04-19 15:01  خالد أحمد    رحّل الفاتورة     [مرحّل]
```

---

## Journal Entry Screen — Special UX Rules

The journal entry is the most important screen for accountants. Must feel professional.

1. **Balance indicator** — always visible at top of lines table:
   - Green: `✓ القيد متوازن — إجمالي المدين: 5,000.00  إجمالي الدائن: 5,000.00`
   - Red: `⚠ القيد غير متوازن — الفارق: 250.00 (فائض في المدين)`
   
2. **Account search** shows: `[1100] صندوق الفرع الرئيسي` (code + name)
   
3. **Sub-account search** activated when account requires_sub_account:
   - Searching customers for AR accounts
   - Searching suppliers for AP accounts

4. **Line limit**: no artificial limit. Add as many lines as needed.

5. **Copy line button** per row for fast repetitive entry

6. **Template library**: Pre-defined templates for common entries:
   - توزيع الرواتب (Salary distribution)
   - إهلاك الأصول (Depreciation)
   - قيد إغلاق الفترة (Period closing)

7. **Post button tooltip** when disabled: "لا يمكن الترحيل: القيد غير متوازن — الفارق 250.00"

---

## Data Table Behavior (all list pages)

### Columns
- Sortable: click column header
- Right-aligned: all numeric columns
- Right-aligned: date columns (in RTL, dates read right to left naturally)

### Filters
- Search box: always visible, searches across key fields
- Filter chips: status, date range, branch — shown as horizontal row
- Active filters shown as dismissible chips
- Reset All button

### Row Actions
- Hover row → action buttons appear in leftmost column (RTL)
- Common actions: View, Print, and the most likely next action (Approve if draft, Post if approved, Record Payment if unpaid)
- Destructive actions (Cancel, Delete): always behind a confirmation dialog

### Empty State
```
لا توجد فواتير مبيعات بعد
[+ فاتورة جديدة]
```

### Error State
```
⚠ حدث خطأ في تحميل البيانات
تفاصيل الخطأ: [error message]
[إعادة المحاولة]
```

---

## Print / Export Behavior

### Print
- Document number and QR code at top
- Company logo and info
- Branch + date + period
- Full document details
- Footer: Authorized by / Received by / Prepared by (with signature lines)
- Arabic layout, A4 paper
- `window.print()` with @media print CSS

### Export to Excel
- Same data as table, with headers in Arabic
- Formatting preserved (numbers right-aligned, dates formatted)
- Column widths auto-fit

### Export to PDF  
- jsPDF with Arabic font support
- Formal document layout
- Stamp/watermark: "نسخة طباعة" in gray diagonal

---

## Arabic RTL — Specific Rules

1. `dir="rtl"` on `<html>` element — always
2. Use `start/end` instead of `left/right` in Tailwind: `ms-4` not `ml-4`, `pe-2` not `pr-2`
3. Icons: directional icons flip in RTL (arrows, chevrons) — use CSS `[dir=rtl] .icon { transform: scaleX(-1) }`
4. Numbers: Arabic-Indic numerals option in Settings (off by default — uses Western numerals)
5. Font: Tajawal for Arabic text, Inter for numbers (mixed font families)
6. Amounts: always `5,462.50 ر.س` (number then currency symbol, right side)
7. Dates: `١٩/٠٤/٢٠٢٦` (Arabic format with Arabic numerals — or Western based on settings)
8. Input placeholders in Arabic
9. Validation messages in Arabic
10. Toast notifications (success/error) in Arabic, appear bottom-right (which is bottom-left visually in RTL)

---

## Build Roadmap

### Phase 1: Foundation (Week 1–2)
**Deliverables:**
- Convex schema fully deployed
- Company/Branch/User setup screens
- Currency + Tax configuration
- Fiscal Year + Period management
- Chart of Accounts CRUD (tree UI)
- Cost Centers CRUD
- Auth (login/logout, role check)
- App Shell (sidebar + header + RTL)
- Dashboard skeleton (KPI cards, no real data yet)

**Acceptance Criteria:**
- Can create company, 3 branches, 5 users with different roles
- Can create fiscal year with 12 monthly periods
- Can create 50+ accounts in hierarchy
- Login shows correct sidebar per role
- Period status visible in header

**Testing:**
- Create account with children → isPostable auto-set to false
- Try to assign same code to two accounts → blocked
- Period in closed status → verify no transactions can be dated in it

---

### Phase 2: Accounting Core (Week 3–4)
**Deliverables:**
- General Journal Entry (create, post, reverse)
- Cash Journal Entry
- Expenses Journal Entry
- Trial Balance report
- General Ledger report
- Journal report
- Opening Balances import

**Dependencies:** Phase 1 complete, Chart of Accounts populated

**Acceptance Criteria:**
- Create manual journal entry with 6 lines
- Post it → cannot edit after
- Reverse it → new entry created with swapped debits/credits
- Trial Balance shows correct totals
- DR total = CR total (enforced before post)

**Testing:**
- Post journal with DR ≠ CR → blocked
- Post to parent account → blocked
- Post to closed period → blocked
- Reverse a posted entry → original shows reversalEntryId, new entry shows reversedEntryId

---

### Phase 3: Inventory + Procurement + Sales (Week 5–8)
**Deliverables:**
- Items, Categories, UoM, Warehouses CRUD
- Recipes/BOM
- Customers CRUD
- Suppliers CRUD
- Purchase Order → GRN → Purchase Invoice flow
- Purchase Return
- Sales Invoice (cash + credit + mixed)
- Sales Return
- Auto-posting for all above
- Inventory movements tracked
- Stock balance maintained
- AR/AP sub-ledger updated

**Dependencies:** Phase 2 complete

**Acceptance Criteria:**
- Create PO → approve → create GRN → approve → create PI → post → stock increases + AP increases
- Create sales invoice → post → stock decreases + revenue posted
- Post cash receipt → allocate to invoice → invoice shows "مدفوع"
- Trial balance after all above = balanced

**Testing:**
- Post purchase invoice → verify avg cost recalculated correctly
- Post sales invoice for item with zero stock (allowNegativeStock=false) → blocked
- Post sales return → stock restored at original cost
- Duplicate supplier invoice number → blocked

---

### Phase 4: Treasury + Cheques + Reports (Week 9–11)
**Deliverables:**
- Cash Receipt Vouchers + allocation
- Cash Payment Vouchers + allocation
- Cheques full lifecycle
- Bank Transfers
- Petty Cash
- All 15 reports from Reports Matrix
- Export to Excel + PDF
- Print layouts (all documents)

**Dependencies:** Phase 3 complete

**Acceptance Criteria:**
- Receive cheque from customer → deposit → clear → bank balance updated
- Bounce a cheque → AR restored → new journal entry created
- AR aging shows correct buckets as of any date
- Trial Balance exports to Excel correctly
- All reports filter by branch correctly

**Testing:**
- Allocate receipt to invoice: amount > voucher amount → blocked
- Allocate twice to same invoice beyond total → blocked
- Cheque transition: received → cleared (skip deposited) → should work or block based on rule
- Period close checklist shows unresolved items correctly
