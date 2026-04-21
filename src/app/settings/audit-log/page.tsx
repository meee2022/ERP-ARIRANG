// @ts-nocheck
"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
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
    case "logout": return "bg-gray-100 text-gray-700";
    default:       return "bg-gray-100 text-gray-700";
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
          <p className="text-lg font-semibold text-gray-700">{t("permissionDenied")}</p>
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">{t("auditLogs")}</h1>
        </div>
        <span className="text-sm text-gray-500">{filtered?.length ?? 0} {t("records")}</span>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className={`absolute top-2.5 h-4 w-4 text-gray-400 ${isRTL ? "right-2" : "left-2"}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            className={`w-full border border-gray-300 rounded-lg py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none ${isRTL ? "pr-8 pl-3" : "pl-8 pr-3"}`}
          />
        </div>

        {/* Module filter */}
        <select
          value={filterModule}
          onChange={(e) => setFilterModule(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none"
        >
          <option value="">{t("allModules")}</option>
          {MODULE_OPTIONS.map((m) => (
            <option key={m} value={m}>{labelModule(m, t)}</option>
          ))}
        </select>

        {/* Action filter */}
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none"
        >
          <option value="">{t("allActions")}</option>
          {ACTION_OPTIONS.map((a) => (
            <option key={a} value={a}>{labelAction(a, t)}</option>
          ))}
        </select>

        {/* Date filter */}
        <div className="flex items-center gap-1 border border-gray-300 rounded-lg px-2 bg-white">
          <Calendar className="h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="py-2 text-sm bg-transparent outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-start font-semibold text-gray-600">{t("timestamp")}</th>
              <th className="px-4 py-3 text-start font-semibold text-gray-600">{t("userName")}</th>
              <th className="px-4 py-3 text-start font-semibold text-gray-600">{t("action")}</th>
              <th className="px-4 py-3 text-start font-semibold text-gray-600">{t("module")}</th>
              <th className="px-4 py-3 text-start font-semibold text-gray-600">{t("documentType")}</th>
              <th className="px-4 py-3 text-start font-semibold text-gray-600">{t("documentId")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {logs === undefined ? (
              <tr><td colSpan={6} className="py-10 text-center text-gray-400">{t("loading")}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-10 text-center text-gray-400">{t("noAuditLogs")}</td></tr>
            ) : (
              filtered.map((log: any) => (
                <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString(isRTL ? "ar-QA" : "en-GB")}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{log.userName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${actionBadgeClass(log.action)}`}>
                      {labelAction(log.action, t)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{labelModule(log.module, t)}</td>
                  <td className="px-4 py-3 text-gray-600">{log.documentType ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 truncate max-w-[140px]">
                    {log.documentId ? log.documentId.slice(-8) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
