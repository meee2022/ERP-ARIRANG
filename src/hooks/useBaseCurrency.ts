/**
 * useBaseCurrency
 *
 * Auto-resolves the company's base currency from Convex.
 * Replaces the pattern of manually passing currencyId to every form.
 *
 * Usage:
 *   const { currency, currencyId, isLoading } = useBaseCurrency();
 *   // then pass currencyId directly to mutations that need it
 */
"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export interface BaseCurrencyResult {
  currency: {
    _id: Id<"currencies">;
    code: string;
    nameAr: string;
    nameEn?: string;
    symbol?: string;
    isBase: boolean;
  } | null;
  currencyId: Id<"currencies"> | null;
  currencyCode: string;
  isLoading: boolean;
  error: string | null;
}

export function useBaseCurrency(): BaseCurrencyResult {
  const currency = useQuery(api.helpers.getBaseCurrency);

  const isLoading = currency === undefined;

  if (isLoading) {
    return { currency: null, currencyId: null, currencyCode: "QAR", isLoading: true, error: null };
  }

  if (!currency) {
    return {
      currency: null,
      currencyId: null,
      currencyCode: "QAR",
      isLoading: false,
      error:
        "لا توجد عملة أساسية في النظام. يرجى تشغيل seedInitialData أو إضافة عملة في الإعدادات.",
    };
  }

  return {
    currency: currency as any,
    currencyId: currency._id as Id<"currencies">,
    currencyCode: currency.code,
    isLoading: false,
    error: null,
  };
}
