// @ts-nocheck
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { Barcode, Search, Plus, Trash2, ShoppingCart, CheckCircle2, AlertTriangle, X, ChevronRight } from "lucide-react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface CartLine {
  itemId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  unitPrice: number; // in cents
  qty: number;
  uomId: string;
  uomName: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function moneyFmt(cents: number) {
  return new Intl.NumberFormat("ar-QA", { style: "currency", currency: "QAR" }).format(cents);
}

// ─── Item Scan Result Banner ───────────────────────────────────────────────────
function ScanResult({ item, onAdd, onDismiss, isRTL }: { item: any; onAdd: (qty: number) => void; onDismiss: () => void; isRTL: boolean }) {
  const [qty, setQty] = useState(1);
  return (
    <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-4 shadow-lg animate-in slide-in-from-bottom-2">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <div className="font-bold text-emerald-900 text-sm">{isRTL ? item.nameAr : (item.nameEn ?? item.nameAr)}</div>
            <div className="text-xs text-emerald-700">{item.code}</div>
          </div>
        </div>
        <button onClick={onDismiss} className="p-1 rounded-lg hover:bg-emerald-100">
          <X className="h-4 w-4 text-emerald-700" />
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 border border-emerald-300 rounded-xl bg-white overflow-hidden">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-9 h-9 text-lg font-bold text-emerald-800 hover:bg-emerald-50 flex items-center justify-center"
          >−</button>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
            className="w-14 text-center text-sm font-bold text-emerald-900 outline-none border-x border-emerald-200 h-9"
            min={1}
          />
          <button
            onClick={() => setQty((q) => q + 1)}
            className="w-9 h-9 text-lg font-bold text-emerald-800 hover:bg-emerald-50 flex items-center justify-center"
          >+</button>
        </div>
        <div className="text-xs text-emerald-700">
          {isRTL ? "سعر البيع:" : "Price:"}{" "}
          <span className="font-bold">{moneyFmt(item.salePrice ?? item.avgCost ?? 0)}</span>
        </div>
        <button
          onClick={() => onAdd(qty)}
          className="flex-1 h-9 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-1 hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          {isRTL ? "أضف للسلة" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}

// ─── Cart Line Row ─────────────────────────────────────────────────────────────
function CartLineRow({ line, onRemove, onQtyChange, isRTL }: { line: CartLine; onRemove: () => void; onQtyChange: (qty: number) => void; isRTL: boolean }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[color:var(--ink-100)] last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-[color:var(--ink-900)] truncate">
          {isRTL ? line.nameAr : line.nameEn}
        </div>
        <div className="text-xs text-[color:var(--ink-500)]">{line.code}</div>
      </div>
      <div className="flex items-center gap-1 border border-[color:var(--ink-200)] rounded-lg overflow-hidden shrink-0">
        <button
          onClick={() => onQtyChange(Math.max(1, line.qty - 1))}
          className="w-7 h-7 text-sm font-bold text-[color:var(--ink-700)] hover:bg-[color:var(--ink-50)] flex items-center justify-center"
        >−</button>
        <span className="w-8 text-center text-xs font-bold text-[color:var(--ink-900)]">{line.qty}</span>
        <button
          onClick={() => onQtyChange(line.qty + 1)}
          className="w-7 h-7 text-sm font-bold text-[color:var(--ink-700)] hover:bg-[color:var(--ink-50)] flex items-center justify-center"
        >+</button>
      </div>
      <div className="text-sm font-bold text-[color:var(--brand-700)] w-24 text-end shrink-0">
        {moneyFmt(line.unitPrice * line.qty)}
      </div>
      <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-red-50 text-[color:var(--ink-400)] hover:text-red-600">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function BarcodeScannerPage() {
  const { isRTL } = useI18n();
  const { currentUser } = useAuth();
  const companies = useQuery(api.seed.getCompanies, {}) ?? [];
  const companyId = companies[0]?._id;

  const [barcodeInput, setBarcodeInput] = useState("");
  const [lastBarcode, setLastBarcode] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [notFoundMsg, setNotFoundMsg] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Live item lookup (debounced via barcode state)
  const foundItem = useQuery(
    api.items.getItemByBarcode,
    companyId && lastBarcode ? { companyId, barcode: lastBarcode } : "skip"
  );

  // Auto-focus input on mount (works great with USB barcode scanners)
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // When foundItem resolves after a scan
  useEffect(() => {
    if (!lastBarcode) return;
    if (foundItem === undefined) return; // still loading
    if (foundItem === null) {
      setNotFoundMsg(true);
      setScanResult(null);
      setTimeout(() => setNotFoundMsg(false), 2500);
    } else {
      setScanResult(foundItem);
      setNotFoundMsg(false);
    }
    setLastBarcode("");
  }, [foundItem, lastBarcode]);

  const handleBarcodeSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const val = barcodeInput.trim();
    if (!val || !companyId) return;
    setBarcodeInput("");
    setLastBarcode(val);
    setScanResult(null);
    setNotFoundMsg(false);
  }, [barcodeInput, companyId]);

  // Barcode scanners type fast then press Enter. Intercept Enter on keydown.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = barcodeInput.trim();
      if (!val || !companyId) return;
      setBarcodeInput("");
      setLastBarcode(val);
      setScanResult(null);
      setNotFoundMsg(false);
    }
  };

  const addToCart = (item: any, qty: number) => {
    setCart((prev) => {
      const existing = prev.findIndex((l) => l.itemId === item._id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], qty: updated[existing].qty + qty };
        return updated;
      }
      return [
        ...prev,
        {
          itemId: item._id,
          code: item.code,
          nameAr: item.nameAr,
          nameEn: item.nameEn ?? item.nameAr,
          unitPrice: item.salePrice ?? item.avgCost ?? 0,
          qty,
          uomId: item.baseUomId ?? "",
          uomName: "PCS",
        },
      ];
    });
    setScanResult(null);
    inputRef.current?.focus();
  };

  const removeFromCart = (itemId: string) => setCart((p) => p.filter((l) => l.itemId !== itemId));
  const updateQty = (itemId: string, qty: number) =>
    setCart((p) => p.map((l) => (l.itemId === itemId ? { ...l, qty } : l)));

  const totalAmount = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const totalItems  = cart.reduce((s, l) => s + l.qty, 0);

  // Encode cart as query params for passing to new invoice page
  const cartParam = encodeURIComponent(JSON.stringify(cart.map((l) => ({
    itemId: l.itemId, qty: l.qty, unitPrice: l.unitPrice, uomId: l.uomId,
  }))));

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-[color:var(--surface-0)] pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[color:var(--surface-0)]/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-[color:var(--ink-100)]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs font-semibold text-[color:var(--brand-700)] mb-0.5">
              {isRTL ? "إدخال سريع" : "Quick Entry"}
            </div>
            <h1 className="text-xl font-bold text-[color:var(--ink-900)] flex items-center gap-2">
              <Barcode className="h-5 w-5 text-[color:var(--brand-700)]" />
              {isRTL ? "مسح الباركود" : "Barcode Scanner"}
            </h1>
          </div>
          {cart.length > 0 && (
            <Link
              href={`/sales/invoices?new=true&cart=${cartParam}`}
              className="h-10 px-4 rounded-2xl bg-[color:var(--brand-700)] text-white inline-flex items-center gap-2 text-sm font-semibold shadow-sm"
            >
              <ShoppingCart className="h-4 w-4" />
              {isRTL ? `فاتورة (${totalItems})` : `Invoice (${totalItems})`}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {/* Barcode Input */}
        <form onSubmit={handleBarcodeSubmit} className="relative">
          <div className="absolute inset-y-0 start-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-[color:var(--ink-400)]" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRTL ? "امسح الباركود أو اكتب كود الصنف..." : "Scan barcode or type item code..."}
            className="w-full h-12 rounded-2xl border-2 border-[color:var(--brand-300)] bg-white ps-10 pe-4 text-sm font-medium placeholder:text-[color:var(--ink-400)] focus:outline-none focus:border-[color:var(--brand-600)] focus:ring-2 focus:ring-[color:var(--brand-200)]"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {barcodeInput && (
            <button
              type="button"
              onClick={() => setBarcodeInput("")}
              className="absolute inset-y-0 end-3 flex items-center p-1"
            >
              <X className="h-4 w-4 text-[color:var(--ink-400)]" />
            </button>
          )}
        </form>

        {/* Instruction */}
        <p className="text-[10px] text-[color:var(--ink-400)] mt-1.5 text-center">
          {isRTL
            ? "وجّه الماسح الضوئي نحو الباركود — يتعرف عليه تلقائياً ✦ أو اكتب الكود يدوياً واضغط Enter"
            : "Point scanner at barcode — auto-detected ✦ Or type code manually and press Enter"}
        </p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Not found */}
        {notFoundMsg && (
          <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 flex items-center gap-3 animate-in slide-in-from-bottom-2">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <p className="text-sm font-semibold text-red-800">
              {isRTL ? "لم يُعثر على صنف بهذا الباركود" : "No item found for this barcode"}
            </p>
          </div>
        )}

        {/* Scan Result */}
        {scanResult && (
          <ScanResult
            item={scanResult}
            onAdd={(qty) => addToCart(scanResult, qty)}
            onDismiss={() => setScanResult(null)}
            isRTL={isRTL}
          />
        )}

        {/* Cart */}
        {cart.length > 0 ? (
          <div className="rounded-2xl border border-[color:var(--ink-200)] bg-white overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-[color:var(--ink-100)] flex items-center justify-between bg-[color:var(--ink-50)]">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-[color:var(--brand-700)]" />
                <span className="text-sm font-bold text-[color:var(--ink-900)]">
                  {isRTL ? "السلة" : "Cart"} ({cart.length} {isRTL ? "صنف" : "items"})
                </span>
              </div>
              <button
                onClick={() => setCart([])}
                className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isRTL ? "مسح الكل" : "Clear all"}
              </button>
            </div>
            <div className="px-4">
              {cart.map((line) => (
                <CartLineRow
                  key={line.itemId}
                  line={line}
                  onRemove={() => removeFromCart(line.itemId)}
                  onQtyChange={(q) => updateQty(line.itemId, q)}
                  isRTL={isRTL}
                />
              ))}
            </div>
          </div>
        ) : (
          !notFoundMsg && !scanResult && (
            <div className="rounded-2xl border-2 border-dashed border-[color:var(--ink-200)] bg-white p-10 text-center">
              <Barcode className="h-12 w-12 text-[color:var(--ink-300)] mx-auto mb-3" />
              <p className="text-sm font-semibold text-[color:var(--ink-600)]">
                {isRTL ? "السلة فارغة" : "Cart is empty"}
              </p>
              <p className="text-xs text-[color:var(--ink-400)] mt-1">
                {isRTL ? "ابدأ بمسح باركود الصنف" : "Start by scanning an item barcode"}
              </p>
            </div>
          )
        )}
      </div>

      {/* Sticky Footer Total */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-sm border-t border-[color:var(--ink-200)] px-4 py-4 safe-area-bottom">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[color:var(--ink-700)]">
              {isRTL ? `المجموع (${totalItems} وحدة)` : `Total (${totalItems} units)`}
            </span>
            <span className="text-xl font-bold text-[color:var(--brand-700)]">{moneyFmt(totalAmount)}</span>
          </div>
          <Link
            href={`/sales/invoices?new=true&cart=${cartParam}`}
            className="w-full h-13 rounded-2xl bg-[color:var(--brand-700)] text-white flex items-center justify-center gap-2 text-base font-bold shadow-lg hover:bg-[color:var(--brand-800)] transition-colors"
          >
            <ShoppingCart className="h-5 w-5" />
            {isRTL ? "إنشاء فاتورة" : "Create Invoice"}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
