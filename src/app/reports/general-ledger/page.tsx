// @ts-nocheck
"use client";
import React, { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatDateShort } from "@/lib/utils";
import { BookOpen } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

function startOfYearISO() { return `${new Date().getFullYear()}-01-01`; }
function todayISO() { return new Date().toISOString().split("T")[0]; }

export default function GeneralLedgerPage() {
  const { t, isRTL, formatCurrency } = useI18n();
  const [fromDate, setFromDate] = useState(startOfYearISO());
  const [toDate, setToDate] = useState(todayISO());
  const [accountId, setAccountId] = useState("");

  const selectedBranch = useAppStore((s) => s.selectedBranch);
  const branchArg = selectedBranch !== "all" ? selectedBranch : undefined;

  const companies = useQuery(api.seed.getCompanies, {});
  const company = companies?.[0];
  const accounts = useQuery(api.accounts.getAll, company ? { companyId: company._id } : "skip");
  const postableAccounts = (accounts ?? []).filter((a: any) => a.isPostable && a.isActive);

  const data = useQuery(
    api.reports.getGeneralLedger,
    company && accountId ? { accountId: accountId as any, fromDate, toDate, branchId: branchArg as any } : "skip"
  );
  const loading = data === undefined && !!accountId;
  const lines = data?.lines ?? [];
  const summary = data?.summary ?? { openingBalance: 0, totalDebit: 0, totalCredit: 0, closingBalance: 0 };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}>
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">{t("generalLedgerTitle")}</h1>
          <p className="text-xs text-[color:var(--ink-500)] mt-0.5">{t("reportPostedOnly")}</p>
        </div>
      </div>

      <div className="surface-card p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5"><span className="text-xs text-[color:var(--ink-500)]">{t("fromDate")}:</span><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input-field h-9 w-auto" /></div>
        <div className="flex items-center gap-1.5"><span className="text-xs text-[color:var(--ink-500)]">{t("toDate")}:</span><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input-field h-9 w-auto" /></div>
        <div className="flex-1 min-w-[280px]">
          <select value={accountId} onChange={e => setAccountId(e.target.value)} className="input-field h-9 w-full">
            <option value="">{t("selectAccount")}</option>
            {postableAccounts.map((a: any) => <option key={a._id} value={a._id}>{a.code} — {isRTL ? a.nameAr : (a.nameEn || a.nameAr)}</option>)}
          </select>
        </div>
      </div>

      {!accountId ? (
        <div className="surface-card py-20 text-center text-[color:var(--ink-400)]">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t("selectAccountToView")}</p>
        </div>
      ) : (
        <>
          <div className="surface-card p-3 grid grid-cols-4 gap-4 text-center text-sm">
            <div><p className="text-xs text-[color:var(--ink-500)] mb-1">{t("openingBalance")}</p><p className="font-bold tabular-nums">{formatCurrency(summary.openingBalance)}</p></div>
            <div><p className="text-xs text-[color:var(--ink-500)] mb-1">{t("totalDebit")}</p><p className="font-bold tabular-nums">{formatCurrency(summary.totalDebit)}</p></div>
            <div><p className="text-xs text-[color:var(--ink-500)] mb-1">{t("totalCredit")}</p><p className="font-bold tabular-nums">{formatCurrency(summary.totalCredit)}</p></div>
            <div><p className="text-xs text-[color:var(--ink-500)] mb-1">{t("closingBalance")}</p><p className="font-bold tabular-nums text-[color:var(--brand-700)]">{formatCurrency(summary.closingBalance)}</p></div>
          </div>

          <div className="surface-card overflow-hidden">
            {loading ? <div className="p-8 text-center"><div className="animate-spin h-8 w-8 border-2 border-[color:var(--brand-600)] border-t-transparent rounded-full mx-auto mb-3" /></div>
            : lines.length === 0 ? <div className="py-12 text-center text-[color:var(--ink-400)]"><p className="text-sm">{t("noResults")}</p></div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full zebra-table text-sm">
                  <thead className="bg-[color:var(--brand-800)] text-white text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-start font-semibold">{t("date")}</th>
                      <th className="px-4 py-3 text-start font-semibold">{t("journalNo")}</th>
                      <th className="px-4 py-3 text-start font-semibold">{t("description")}</th>
                      <th className="px-4 py-3 text-end font-semibold">{t("debit")}</th>
                      <th className="px-4 py-3 text-end font-semibold">{t("credit")}</th>
                      <th className="px-4 py-3 text-end font-semibold">{t("balance")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l: any, i: number) => (
                      <tr key={i} className="border-t border-[color:var(--ink-100)] hover:bg-[color:var(--brand-50)]/40">
                        <td className="px-4 py-2.5 text-[color:var(--ink-600)]">{formatDateShort(l.date)}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-[color:var(--brand-700)]">{l.entryNumber}</td>
                        <td className="px-4 py-2.5 text-[color:var(--ink-700)] max-w-[300px] truncate">{l.description}</td>
                        <td className="px-4 py-2.5 text-end tabular-nums">{l.debit ? formatCurrency(l.debit) : ""}</td>
                        <td className="px-4 py-2.5 text-end tabular-nums">{l.credit ? formatCurrency(l.credit) : ""}</td>
                        <td className={`px-4 py-2.5 text-end tabular-nums font-medium ${l.balance < 0 ? "text-red-600" : ""}`}>{formatCurrency(Math.abs(l.balance))}{l.balance < 0 ? ` ${t("credit")}` : ` ${t("debit")}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
