# PRD + UX Spec — ERP V1
**Status: FINAL | Arabic-first RTL | Accountant-first design**

---

## 1. Global UX Principles

| Principle | Implementation |
|---|---|
| Arabic-first | `dir="rtl"` on `<html>`. Font: Tajawal. All labels Arabic. |
| Keyboard-first | Tab → next field. Enter in table row → new row. Escape → cancel. |
| Accountant-first | Status always visible. Totals always sticky. Account search by code or name. |
| Zero ambiguity | Every number has a label. Every status has a badge. No mystery states. |
| Posted = Immutable | Post button becomes Reverse after posting. No edit state for posted docs. |
| Period always visible | Period status badge in header. Orange banner if soft-closed. |

---

## 2. Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER (56px, fixed)                                            │
│  Logo | [الفرع ▾] | [فترة: يناير 2026 ● مفتوحة] | [AR] [🔔] [👤]│
├──────────────┬──────────────────────────────────────────────────┤
│              │ BREADCRUMB (32px)                                │
│ SIDEBAR      ├──────────────────────────────────────────────────┤
│ (256px)      │                                                  │
│ RTL: right   │ PAGE CONTENT AREA                               │
│              │                                                  │
│ Collapsible  │                                                  │
│ sections     │                                                  │
│              │                                                  │
└──────────────┴──────────────────────────────────────────────────┘
```

**Sidebar module order (Arabic labels):**
```
● الرئيسية
─ المالية
  · دليل الحسابات
  · مراكز التكلفة
  · القيود اليومية → [عام | نقدي | مصروفات | تسويات]
  · السنوات المالية
─ الخزينة
  · الحسابات البنكية
  · سندات القبض
  · سندات الصرف
  · الشيكات المستلمة
  · الشيكات الصادرة
  · الشيكات المستحقة
─ المبيعات
  · العملاء
  · فواتير المبيعات
  · مردودات المبيعات
─ المشتريات
  · الموردون
  · طلبات الشراء
  · استلام البضاعة
  · فواتير المشتريات
  · مردودات المشتريات
─ المخزون
  · الأصناف
  · المستودعات
  · الوصفات
  · تسوية المخزون
  · تحويل مخزون
─ التقارير
  · ميزان المراجعة
  · دفتر الأستاذ العام
  · كشف حساب عميل
  · كشف حساب مورد
  · أعمار ديون عملاء
  · أعمار ديون موردون
  · تقرير المبيعات
  · تقرير المشتريات
  · حركة المخزون
  · سجل الشيكات
─ الإعدادات
  · الشركة والفروع
  · المستخدمون
  · العملات
  · الضرائب
```

---

## 3. Status Badge System (Final Colors)

| Status | Arabic | Tailwind Classes |
|---|---|---|
| draft | مسودة | `bg-slate-100 text-slate-600 border-slate-200` |
| approved | معتمد | `bg-blue-50 text-blue-700 border-blue-200` |
| posted | مرحّل | `bg-emerald-50 text-emerald-700 border-emerald-200` |
| reversed | مُعكوس | `bg-orange-50 text-orange-700 border-orange-200` |
| cancelled | ملغي | `bg-red-50 text-red-600 border-red-200` |
| unpaid | غير مدفوع | `bg-red-50 text-red-600 border-red-200` |
| partial | مدفوع جزئياً | `bg-amber-50 text-amber-700 border-amber-200` |
| paid | مدفوع | `bg-emerald-50 text-emerald-700 border-emerald-200` |
| open | مفتوحة | `bg-emerald-50 text-emerald-700 border-emerald-200` |
| soft_closed | إغلاق مؤقت | `bg-amber-50 text-amber-700 border-amber-200` |
| closed | مغلقة | `bg-orange-50 text-orange-700 border-orange-200` |
| locked | مقفلة | `bg-red-50 text-red-600 border-red-200` |
| received | مستلم | `bg-blue-50 text-blue-600 border-blue-200` |
| deposited | مودع | `bg-purple-50 text-purple-600 border-purple-200` |
| cleared | محصّل | `bg-emerald-50 text-emerald-700 border-emerald-200` |
| bounced | مرتد | `bg-red-50 text-red-700 border-red-200` |
| issued | صادر | `bg-blue-50 text-blue-600 border-blue-200` |
| stopped | موقوف | `bg-red-50 text-red-600 border-red-200` |
| unallocated | غير مخصص | `bg-slate-100 text-slate-500 border-slate-200` |
| fully_allocated | مخصص بالكامل | `bg-emerald-50 text-emerald-700 border-emerald-200` |

---

## 4. Screen-by-Screen Specification

---

### 4.1 Dashboard `/`

**Purpose:** Command center. First thing the accountant sees every morning.

**Layout:** 4-col KPI row → 2-col (chart + quick-actions) → alerts row

**KPI Cards:**
| Card | Value | Color |
|---|---|---|
| مبيعات اليوم | Sum posted today | emerald |
| إجمالي الذمم (عملاء) | AR outstanding | blue |
| إجمالي الدائنون (موردون) | AP outstanding | amber |
| الرصيد النقدي والبنكي | Cash+Bank GL balance | slate |

**Quick Actions bar:** `+ فاتورة مبيعات` `+ سند قبض` `+ قيد يومي` `+ فاتورة مشتريات`

**Alerts:**
- فواتير متأخرة (overdue > 0 days)
- شيكات مستحقة هذا الأسبوع
- أصناف تحت مستوى إعادة الطلب
- فترة محاسبية: X يوم متبقي

**Permissions:** All roles see dashboard. KPI values filtered by user's branches.

---

### 4.2 Chart of Accounts `/finance/chart-of-accounts`

**Purpose:** Define and browse full account hierarchy.

**Layout:** Split — collapsible tree (left 40%) + detail panel (right 60%)

**Tree structure:**
```
▼ أصول (Assets)          — total balance
  ▼ أصول متداولة
    · 1101 - الصندوق
    · 1102 - البنك الأهلي
  ▼ أصول ثابتة
▼ التزامات (Liabilities)
▼ حقوق الملكية (Equity)
▼ الإيرادات (Revenue)
▼ المصروفات (Expenses)
```

**Detail panel fields:** Code, Name AR, Name EN, Type, Sub-type, Is Postable, Requires Cost Center, Normal Balance, Notes

**Actions:** `+ حساب رئيسي` `+ حساب فرعي` `تعديل` `إلغاء تفعيل`

**Validation rules:**
- Parent account: isPostable forced to false
- Cannot deactivate: if balance ≠ 0 or has unposted lines
- Code: unique per company, cannot change after use

**Empty state:** "لا توجد حسابات. ابدأ بإضافة حساب رئيسي."

---

### 4.3 Sales Invoice List `/sales/invoices`

**Filters:** Branch | Date from-to | Customer | Type (all/cash/credit/mixed) | Doc Status | Payment Status | Search by number

**Table columns:**
| # | رقم الفاتورة | التاريخ | الاستحقاق | العميل | النوع | الإجمالي | المتبقي | الحالة | الترحيل | إجراءات |

**Row actions (context-aware):**
- Draft: `اعتماد` `تعديل` `إلغاء`
- Approved: `ترحيل` `إلغاء`
- Posted+Unpaid: `سند قبض` `طباعة` `عكس`
- Posted+Paid: `طباعة`

**Summary bar (sticky bottom):** `العدد: N | الإجمالي: X | المدفوع: Y | المتبقي: Z`

**Permissions:** cashier: create only. sales: create+approve. accountant: all. manager: all. admin: all.

---

### 4.4 New Sales Invoice `/sales/invoices/new`

**Sections:**

**HEADER (grid 3-col):**
```
[نوع الفاتورة: نقدي / آجل / مختلط]  [رقم الفاتورة: SI-0001-2026 auto]  [التاريخ: اليوم]
[الفرع]                              [المستودع]                          [تاريخ الاستحقاق: hidden if cash]
[العميل: smart search — required for credit/mixed]
[مركز التكلفة: optional]             [ملاحظات: textarea]
```

**ITEMS TABLE:**
| # | الصنف | الوصف | الكمية | الوحدة | سعر الوحدة | خصم% | ضريبة% | الإجمالي | ✕ |

Keyboard: Tab across cells. Enter on last cell = add new row.
Item picker: search by code or Arabic name → shows current stock level.
Auto-fill: unit price from item.sellingPrice, VAT from item.taxClass.

**TOTALS PANEL (sticky, right-aligned):**
```
المجموع الفرعي:          5,000.00
الخصم:                   (250.00)
المبلغ الخاضع للضريبة:   4,750.00
ضريبة القيمة المضافة 15%:  712.50
إجمالي الفاتورة:         5,462.50 ر.س
```

**PAYMENT SECTION (cash/mixed only):**
```
نقدي: [_____]   بطاقة: [_____]   آجل: [_____]   الإجمالي: 5,462.50
```

**ACTION BAR (sticky bottom):**
`حذف` ··· `طباعة` | `حفظ مسودة` | `اعتماد` | `ترحيل`

**Validation:**
- Lines not empty before approve/post
- Cash: received = total
- Credit: customer required + due date required
- Period open before post
- Stock available (or allowNegative)
- Post button disabled with tooltip if balance check fails

**Status flow:** draft → approved → posted → [unpaid→partial→paid]

---

### 4.5 General Journal Entry `/finance/journals/general/new`

**Header fields (inline row):**
```
نوع القيد: [عام ▾]  التاريخ: [DD/MM/YYYY]  الفرع: [▾]  العملة: [SAR]
مركز التكلفة: [optional]  ملاحظات: [______________]
```

**LINES TABLE:**
| # | الحساب (search by code/name) | الحساب الفرعي | البيان | مركز التكلفة | مدين | دائن |

Rules:
- Debit and credit cannot both be > 0 on same line
- Account picker: searchable, shows code + Arabic name, filters to postable only
- Sub-account picker: appears if account.requiresSubAccount (AR → customer, AP → supplier)

**BALANCE BAR (always visible, updates live):**
```
✓ إجمالي المدين: 5,000.00   إجمالي الدائن: 5,000.00   الفارق: 0.00
```
Red if unbalanced: `⚠ القيد غير متوازن — الفارق: 250.00 فائض في المدين`

**Post button:** Disabled + tooltip if unbalanced or period closed.

**Actions:** `إضافة سطر` | `حفظ مسودة` | `ترحيل` | `عكس` (only after posted)

---

### 4.6 Trial Balance `/reports/trial-balance`

**Filters:** من تاريخ | إلى تاريخ | الفرع (all/specific) | المستوى (ملخص/تفصيل) | إظهار الأرصدة الصفرية

**Table columns:**
| كود | اسم الحساب | رصيد افتتاحي مدين | رصيد افتتاحي دائن | حركة مدين | حركة دائن | رصيد ختامي مدين | رصيد ختامي دائن |

**Totals row:** Bold. DR total must = CR total (shown with green ✓ or red ✗).

**Drilldown:** Click account row → opens General Ledger filtered to that account.

**Export:** Excel | PDF | Print

---

### 4.7 AR Aging `/reports/ar-aging`

**As-of date picker** (default: today)

**Buckets:** جارية | 1-30 يوم | 31-60 يوم | 61-90 يوم | +90 يوم

**Table columns:**
| العميل | جارية | 1-30 | 31-60 | 61-90 | +90 | الإجمالي |

**Totals row** per bucket + grand total.

**Drilldown:** Click customer → Customer Statement with open invoices.

---

### 4.8 Customer Statement `/reports/customer-statement`

**Filters:** Customer (required) | Date from-to

**Table columns:**
| التاريخ | رقم المستند | النوع | مدين | دائن | الرصيد |

Running balance column (starts from opening balance).

**Summary:** رصيد البداية | إجمالي المدين | إجمالي الدائن | رصيد النهاية

---

## 5. Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+S` | Save draft |
| `Ctrl+Enter` | Approve / Post (context-aware) |
| `Ctrl+P` | Print |
| `Ctrl+E` | Export to Excel |
| `Alt+N` | New document (same type) |
| `Escape` | Cancel / close picker |
| `Tab` | Next field |
| `Enter` (in table row) | Add new row |
| `↑↓` in picker | Navigate options |

---

## 6. Related Documents Panel

On every posted document detail page — collapsible right panel:

```
المستندات المرتبطة
──────────────────
→ القيد المحاسبي: JV-0045  [مرحّل]
→ حركة المخزون: SM-0023
→ سند القبض: CR-0012  [مرحّل]
```

---

## 7. Form Error Behavior

- Inline validation (not modal): red border + message below field
- Arabic error messages only
- Server errors: toast notification (bottom-center, 4s duration)
- Posting block: button tooltip explains exactly why blocked

**Example messages:**
- `حقل مطلوب`
- `العميل مطلوب للفواتير الآجلة`
- `الفترة المحاسبية مغلقة — اختر فترة مفتوحة`
- `القيد غير متوازن — الفارق: 250.00`
- `لا يوجد رصيد كافٍ في المخزون لهذا الصنف`
- `تجاوز حد الائتمان للعميل`

---

## 8. Print Layout

All documents print with:
- Company logo + name + address (top right in RTL)
- Document title + number + date + branch (header)
- Main content table
- Totals section
- Signature lines: أعده | اعتمده | استلمه
- Footer: "نسخة طباعة" watermark (gray diagonal)
- A4 portrait. CSS @media print.
