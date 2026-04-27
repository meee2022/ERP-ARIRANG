// @ts-nocheck
"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/empty-state";
import { Shield, Search, Filter, Calendar } from "lucide-react";

const MODULE_OPTIONS = ["sales", "purchases", "treasury", "inventory", "finance", "auth"];
const ACTION_OPTIONS = ["create", "post", "edit", "delete", "login", "logout"];

function labelModule(module: string, t: (k: any) => string): string {
  const map: Record<string, any> = {
    sales: "moduleSales", purchases: "modulePurchases", treasury: "moduleTreasury",
    inventory: "moduleInventory", finance: "moduleFinance", auth: "moduleAuth",
  };
  return t(map[module] ?? module);
}

function labelAction(action: string, t: (k: any) => string): string {
  const map: Record<string, any> = {
    create: "actionCreate", post: "actionPost", edit: "actionEdit",
    delete: "actionDelete", login: "actionLogin", logout: "actionLogout",
  };
  return t(map[action] ?? action);
}

function actionBadgeClass(action: string): string {
  switch (action) {
    case "create": return "bg-green-100 text-green-800";
    case "post":   return "bg-blue-100 text-blue-800";
    case "edit":   return "bg-yellow-100 text-yellow-800";
    case "delete": return "bg-red-100 text-red-800";
    case "login":  return "bg-purple-100 text-purple-800";
    case "logout": return "bg-[color:var(--ink-100)] text-[color:var(--ink-700)]";
    default:       return "bg-[color:var(--ink-100)] text-[color:var(--ink-700)]";
  }
}

export default function AuditLogPage() {
  const { t, isRTL } = useI18n();
  const { currentUser } = useAuth() as any;
  const companies = useQuery(api.seed.getCompanies, {});
  const companyId = companies?.[0]?._id ?? (currentUser as any)?.companyId ?? null;

  const [filterModule, setFilterModule] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [search, setSearch] = useState("");

  // Admin-only guard
  if (currentUser && currentUser.role !== "admin") {
    return (
      <div dir={isRTL ? "rtl" : "ltr"} className="flex items-center justify-center min-h-[60vh] p-8">
        <div className="text-center space-y-3">
          <Shield className="mx-auto h-12 w-12 text-red-400" />
          <p className="text-lg font-semibold text-[color:var(--ink-700)]">{t("permissionDenied")}</p>
        </div>
      </div>
    );
  }

  const fromTimestamp = filterDate ? new Date(filterDate).setHours(0, 0, 0, 0) : undefined;
  const toTimestamp   = filterDate ? new Date(filterDate).setHours(23, 59, 59, 999) : undefined;

  const logs = useQuery(
    api.auditLog.getAuditLogs,
    companyId
      ? {
          companyId,
          requesterUserId: currentUser?._id,
          module:        filterModule || undefined,
          action:        filterAction || undefined,
          fromTimestamp: fromTimestamp || undefined,
          toTimestamp:   toTimestamp   || undefined,
          limit: 300,
        }
      : "skip"
  );

  const filtered = useMemo(() => {
    if (!logs) return [];
    if (!search) return logs;
    const s = search.toLowerCase();
    return logs.filter(
      (l: any) =>
        l.userName?.toLowerCase().includes(s) ||
        l.documentType?.toLowerCase().includes(s) ||
        l.documentId?.toLowerCase().includes(s) ||
        l.module?.toLowerCase().includes(s) ||
        l.action?.toLowerCase().includes(s)
    );
  }, [logs, search]);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-5">
      {/* Header */}
      <div className="no-print">
        <PageHeader
          icon={Shield}
          title={t("auditLogs")}
          subtitle={`${filtered?.length ?? 0} ${t("records")}`}
        />
      </div>

      {/* Filters */}
      {/* Modern Filter Strip */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 flex flex-wrap items-end gap-3 w-full shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? "right-3" : "left-3"}`} />
            <input 
              type="text" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("search")}
              className={`w-full h-10 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-400`} 
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">{t("module")}</label>
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="h-10 px-3 border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-400 bg-white min-w-[140px]"
          >
            <option value="">{t("allModules")}</option>
            {MODULE_OPTIONS.map((m) => (
              <option key={m} value={m}>{labelModule(m, t)}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">{t("action")}</label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="h-10 px-3 border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-400 bg-white min-w-[140px]"
          >
            <option value="">{t("allActions")}</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>{labelAction(a, t)}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">{t("date")}</label>
          <div className="relative">
            <Calendar className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? "right-3" : "left-3"}`} />
            <input 
              type="date" 
              value={filterDate} 
              onChange={(e) => setFilterDate(e.target.value)}
              className={`h-10 ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-400 w-[160px]`} 
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-[color:var(--ink-100)] overflow-hidden">
        {logs === undefined ? (
          <LoadingState label={t("loading")} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Shield} title={t("noAuditLogs")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse" dir={isRTL ? "rtl" : "ltr"}>
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("timestamp")}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("userName")}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">{t("action")}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("module")}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("documentType")}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("documentId")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {filtered.map((log: any) => (
                  <tr key={log._id} className="group hover:bg-gray-50/80 transition-all duration-200">
                    <td className="px-6 py-4 text-xs text-gray-500 font-medium whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString(isRTL ? "ar-QA" : "en-GB")}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900 text-sm">{log.userName}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight ${actionBadgeClass(log.action)}`}>
                        {labelAction(log.action, t)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-bold uppercase tracking-tight">
                      {labelModule(log.module, t)}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400 font-medium">{log.documentType ?? "—"}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-gray-50 text-gray-400 border border-gray-100 tabular-nums">
                        {log.documentId ? log.documentId.slice(-8) : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
