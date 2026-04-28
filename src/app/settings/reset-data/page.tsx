// @ts-nocheck
"use client";
import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { AlertTriangle, Trash2, CheckCircle2 } from "lucide-react";

const TABLE_LABELS: Record<string, { ar: string; en: string }> = {
  journalEntries:        { ar: "قيود اليومية",          en: "Journal Entries" },
  journalLines:          { ar: "بنود القيود",            en: "Journal Lines" },
  salesInvoices:         { ar: "فواتير المبيعات",        en: "Sales Invoices" },
  salesInvoiceLines:     { ar: "بنود فواتير المبيعات",   en: "Sales Invoice Lines" },
  salesReturns:          { ar: "مرتجعات المبيعات",       en: "Sales Returns" },
  salesReturnLines:      { ar: "بنود مرتجعات المبيعات",  en: "Sales Return Lines" },
  purchaseOrders:        { ar: "أوامر الشراء",           en: "Purchase Orders" },
  purchaseOrderLines:    { ar: "بنود أوامر الشراء",      en: "Purchase Order Lines" },
  goodsReceiptNotes:     { ar: "إذونات استلام البضاعة",  en: "Goods Receipt Notes" },
  grnLines:              { ar: "بنود إذونات الاستلام",   en: "GRN Lines" },
  purchaseInvoices:      { ar: "فواتير المشتريات",       en: "Purchase Invoices" },
  purchaseInvoiceLines:  { ar: "بنود فواتير المشتريات",  en: "Purchase Invoice Lines" },
  purchaseReturns:       { ar: "مرتجعات المشتريات",      en: "Purchase Returns" },
  purchaseReturnLines:   { ar: "بنود مرتجعات المشتريات", en: "Purchase Return Lines" },
  cashReceiptVouchers:   { ar: "سندات القبض",            en: "Cash Receipts" },
  cashPaymentVouchers:   { ar: "سندات الصرف",            en: "Cash Payments" },
  cheques:               { ar: "الشيكات",               en: "Cheques" },
  bankTransfers:         { ar: "التحويلات البنكية",      en: "Bank Transfers" },
  receiptAllocations:    { ar: "تخصيصات القبض",          en: "Receipt Allocations" },
  paymentAllocations:    { ar: "تخصيصات الصرف",          en: "Payment Allocations" },
  inventoryMovements:    { ar: "حركات المخزون",          en: "Inventory Movements" },
  inventoryMovementLines:{ ar: "بنود حركات المخزون",     en: "Inventory Movement Lines" },
  stockAdjustments:      { ar: "تسويات المخزون",         en: "Stock Adjustments" },
  stockAdjustmentLines:  { ar: "بنود تسويات المخزون",    en: "Stock Adjustment Lines" },
  stockBalance:          { ar: "أرصدة المخزون",          en: "Stock Balances" },
  productionOrders:      { ar: "أوامر الإنتاج",          en: "Production Orders" },
  productionOrderLines:  { ar: "بنود أوامر الإنتاج",     en: "Production Order Lines" },
  auditLogs:             { ar: "سجل التدقيق",            en: "Audit Logs" },
  documentSequences_reset:{ ar: "إعادة تعيين التسلسل",  en: "Sequence Counters Reset" },
};

export default function ResetDataPage() {
  const { t, isRTL } = useI18n();
  const resetData = useMutation(api.admin.resetTransactionalData);

  const [phase, setPhase] = useState<"idle" | "confirm" | "loading" | "done">("idle");
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState("");

  const CONFIRM_WORD = "RESET";

  const handleReset = async () => {
    setPhase("loading");
    setError("");
    try {
      const counts = await resetData({ confirm: "RESET" });
      setResult(counts);
      setPhase("done");
    } catch (e: any) {
      setError(e.message ?? "Error");
      setPhase("confirm");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">
          {isRTL ? "مسح بيانات الاختبار" : "Reset Test Data"}
        </h1>
        <p className="text-sm text-[color:var(--ink-500)] mt-1">
          {isRTL
            ? "يحذف جميع المعاملات ويحتفظ بالبيانات الأساسية (الحسابات، العملاء، الموردين، الأصناف)"
            : "Deletes all transactions and keeps master data (accounts, customers, suppliers, items)"}
        </p>
      </div>

      {phase === "idle" && (
        <div className="surface-card p-6 border-2 border-orange-200 bg-orange-50 rounded-xl">
          <div className="flex gap-4 items-start">
            <AlertTriangle className="h-8 w-8 text-orange-500 shrink-0 mt-0.5" />
            <div className="space-y-3 flex-1">
              <h2 className="font-bold text-orange-800 text-lg">
                {isRTL ? "تحذير: عملية لا يمكن التراجع عنها" : "Warning: This cannot be undone"}
              </h2>
              <p className="text-sm text-orange-700">
                {isRTL
                  ? "سيتم حذف جميع الفواتير والقيود والسندات والشيكات وحركات المخزون وأوامر الإنتاج. تأكد من عمل نسخة احتياطية قبل المتابعة."
                  : "All invoices, journal entries, vouchers, cheques, inventory movements, and production orders will be deleted. Make sure to backup before proceeding."}
              </p>
              <div className="text-xs text-orange-600 font-medium">
                {isRTL ? "البيانات التي ستُحذف:" : "What gets deleted:"}
                <div className="grid grid-cols-2 gap-1 mt-2">
                  {Object.entries(TABLE_LABELS).filter(([k]) => k !== "documentSequences_reset").map(([k, v]) => (
                    <div key={k} className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                      {isRTL ? v.ar : v.en}
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setPhase("confirm")}
                className="mt-2 px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {isRTL ? "المتابعة للتأكيد" : "Proceed to Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "confirm" && (
        <div className="surface-card p-6 border-2 border-red-300 rounded-xl space-y-4">
          <h2 className="font-bold text-red-700 text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {isRTL ? "تأكيد نهائي" : "Final Confirmation"}
          </h2>
          <p className="text-sm text-[color:var(--ink-600)]">
            {isRTL
              ? 'اكتب كلمة "RESET" بالأحرف الكبيرة للتأكيد:'
              : 'Type "RESET" in capital letters to confirm:'}
          </p>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="RESET"
            className="input-field w-full font-mono text-center text-lg tracking-widest"
            autoFocus
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              disabled={typed !== CONFIRM_WORD}
              className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-bold flex items-center justify-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isRTL ? "مسح البيانات الآن" : "Delete Data Now"}
            </button>
            <button
              onClick={() => { setPhase("idle"); setTyped(""); }}
              className="px-4 py-2.5 rounded-lg btn-ghost text-sm font-medium"
            >
              {isRTL ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </div>
      )}

      {phase === "loading" && (
        <div className="surface-card p-10 text-center">
          <div className="animate-spin h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[color:var(--ink-600)] font-medium">
            {isRTL ? "جاري مسح البيانات..." : "Deleting data..."}
          </p>
        </div>
      )}

      {phase === "done" && result && (
        <div className="surface-card p-6 border-2 border-green-200 bg-green-50 rounded-xl space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <h2 className="font-bold text-green-800 text-lg">
              {isRTL ? "تم مسح البيانات بنجاح" : "Data reset successfully"}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(result).map(([table, count]) => (
              <div key={table} className="flex justify-between bg-white rounded-lg px-3 py-1.5 border border-green-100">
                <span className="text-[color:var(--ink-600)]">
                  {isRTL ? TABLE_LABELS[table]?.ar : TABLE_LABELS[table]?.en}
                </span>
                <span className="font-bold text-green-700 tabular-nums">{count}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => { setPhase("idle"); setTyped(""); setResult(null); }}
            className="px-4 py-2 btn-primary rounded-lg text-sm font-medium"
          >
            {isRTL ? "تم" : "Done"}
          </button>
        </div>
      )}
    </div>
  );
}
