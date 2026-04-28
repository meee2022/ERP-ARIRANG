"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  isRTL?: boolean;
}

/**
 * Searchable dropdown — replaces native <select> when options are many.
 * Supports Arabic/English, RTL, keyboard nav (↑ ↓ Enter Esc).
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "اختر...",
  searchPlaceholder = "ابحث...",
  emptyMessage = "لا توجد نتائج",
  className,
  disabled = false,
  required = false,
  isRTL = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = query.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sublabel ?? "").toLowerCase().includes(query.toLowerCase())
      )
    : options;

  // Reset highlight when filter changes
  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  // Focus search input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
      // scroll selected item into view
      const idx = filtered.findIndex((o) => o.value === value);
      if (idx >= 0) setHighlighted(idx);
    } else {
      setQuery("");
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = useCallback(
    (val: string) => {
      onChange(val);
      setOpen(false);
      setQuery("");
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlighted]) select(filtered[highlighted].value);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    const item = listRef.current?.children[highlighted] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          "input-field h-9 w-full flex items-center justify-between gap-2 text-start cursor-pointer",
          disabled && "opacity-60 cursor-not-allowed",
          open && "ring-2 ring-[color:var(--brand-400)] border-[color:var(--brand-400)]"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={cn("flex-1 truncate text-sm", !selected && "text-[color:var(--ink-400)]")}>
          {selected ? selected.label : placeholder}
        </span>
        {value && !disabled ? (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); select(""); }}
            className="text-[color:var(--ink-300)] hover:text-[color:var(--ink-600)] shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : (
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-[color:var(--ink-400)] transition-transform", open && "rotate-180")} />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1 w-full min-w-[220px] rounded-xl border border-[color:var(--ink-200)] bg-white shadow-xl overflow-hidden",
            isRTL ? "right-0" : "left-0"
          )}
          dir={isRTL ? "rtl" : "ltr"}
        >
          {/* Search input */}
          <div className="p-2 border-b border-[color:var(--ink-100)]">
            <div className="relative">
              <Search className={cn(
                "absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[color:var(--ink-400)]",
                isRTL ? "right-2.5" : "left-2.5"
              )} />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className={cn(
                  "w-full h-8 text-sm rounded-lg border border-[color:var(--ink-200)] bg-[color:var(--ink-50)] focus:outline-none focus:border-[color:var(--brand-400)]",
                  isRTL ? "pr-8 pl-3" : "pl-8 pr-3"
                )}
                onKeyDown={(e) => {
                  // Don't propagate up to container for regular typing
                  if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter" && e.key !== "Escape") {
                    e.stopPropagation();
                  }
                }}
              />
            </div>
          </div>

          {/* Options list */}
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-56 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-[color:var(--ink-400)] text-center">{emptyMessage}</li>
            ) : (
              filtered.map((opt, idx) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={opt.value === value}
                  onMouseDown={(e) => { e.preventDefault(); select(opt.value); }}
                  onMouseEnter={() => setHighlighted(idx)}
                  className={cn(
                    "px-3 py-2 cursor-pointer text-sm transition-colors",
                    idx === highlighted
                      ? "bg-[color:var(--brand-50)] text-[color:var(--brand-700)]"
                      : "text-[color:var(--ink-800)] hover:bg-[color:var(--ink-50)]",
                    opt.value === value && "font-semibold"
                  )}
                >
                  <span className="block truncate">{opt.label}</span>
                  {opt.sublabel && (
                    <span className="block text-[11px] text-[color:var(--ink-400)] truncate mt-0.5">{opt.sublabel}</span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {/* Hidden input for form validation */}
      {required && (
        <input
          tabIndex={-1}
          required
          value={value}
          onChange={() => {}}
          className="absolute inset-0 opacity-0 pointer-events-none h-0"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
