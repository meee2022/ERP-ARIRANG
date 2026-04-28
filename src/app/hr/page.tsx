// @ts-nocheck
"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Users, UserCheck, Plane, ClipboardList,
  Calendar, DollarSign, UserPlus, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/hooks/useI18n";
import { formatCurrency } from "@/lib/i18n";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className ?? "h-6 w-full"}`} />;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  iconBg,
  iconColor,
  loading,
}: {
  icon: any;
  label: string;
  value: number | string;
  sub?: string;
  iconBg: string;
  iconColor: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[color:var(--ink-100)] shadow-[0_2px_10px_rgba(0,0,0,0.04)] p-5 flex items-start gap-4">
      <span className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-[color:var(--ink-500)] uppercase tracking-wider mb-1">
          {label}
        </div>
        {loading ? (
          <SkeletonBlock className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold text-[color:var(--ink-900)] tabular-nums">{value}</div>
        )}
        {sub && !loading && (
          <div className="text-xs text-[color:var(--ink-400)] mt-0.5">{sub}</div>
        )}
      </div>
    </div>
  );
}

// ─── Department Distribution ───────────────────────────────────────────────────

function DeptDistributionCard({ departments, isRTL }: { departments: any[]; isRTL: boolean }) {
  if (!departments || departments.length === 0) return null;

  const maxCount = Math.max(...departments.map((d: any) => d.employeeCount ?? 0), 1);
  const COLORS = [
    "bg-[color:var(--brand-600)]",
    "bg-blue-500",
    "bg-amber-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-indigo-500",
  ];

  return (
    <div className="bg-white rounded-2xl border border-[color:var(--ink-100)] shadow-[0_2px_10px_rgba(0,0,0,0.04)] p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-[color:var(--ink-900)] text-sm">Department Distribution</h3>
        <span className="text-xs text-[color:var(--ink-400)]">{departments.length} departments</span>
      </div>
      <div className="space-y-3">
        {departments
          .sort((a: any, b: any) => (b.employeeCount ?? 0) - (a.employeeCount ?? 0))
          .map((dept: any, idx: number) => {
            const count = dept.employeeCount ?? 0;
            const pct = Math.round((count / maxCount) * 100);
            return (
              <div key={dept._id ?? idx} className="flex items-center gap-3">
                <div className="w-28 text-xs font-semibold text-[color:var(--ink-700)] truncate flex-shrink-0 text-end" dir={isRTL ? "rtl" : "ltr"}>
                  {isRTL ? dept.nameAr : (dept.nameEn || dept.nameAr)}
                </div>
                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${COLORS[idx % COLORS.length]} transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="w-10 text-xs font-bold text-[color:var(--ink-700)] tabular-nums text-end">
                  {count}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ─── Attendance Card ───────────────────────────────────────────────────────────

function TodayAttendanceCard({ attendance, loading }: { attendance: any; loading: boolean }) {
  const total = (attendance?.present ?? 0) + (attendance?.absent ?? 0) + (attendance?.late ?? 0);
  const presentPct = total > 0 ? Math.round(((attendance?.present ?? 0) / total) * 100) : 0;
  const absentPct  = total > 0 ? Math.round(((attendance?.absent ?? 0) / total) * 100)  : 0;
  const latePct    = total > 0 ? Math.round(((attendance?.late ?? 0) / total) * 100)    : 0;

  const bars = [
    { label: "Present", value: attendance?.present ?? 0, pct: presentPct, barCls: "bg-green-500", textCls: "text-green-700" },
    { label: "Absent",  value: attendance?.absent ?? 0,  pct: absentPct,  barCls: "bg-red-400",   textCls: "text-red-600" },
    { label: "Late",    value: attendance?.late ?? 0,    pct: latePct,    barCls: "bg-amber-400", textCls: "text-amber-700" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[color:var(--ink-100)] shadow-[0_2px_10px_rgba(0,0,0,0.04)] p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-[color:var(--ink-900)] text-sm">Today's Attendance</h3>
        <Link
          href="/hr/attendance"
          className="text-xs font-semibold text-[color:var(--brand-600)] hover:text-[color:var(--brand-700)] inline-flex items-center gap-1"
        >
          Go to Attendance <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <SkeletonBlock key={i} className="h-8 w-full" />)}</div>
      ) : (
        <div className="space-y-4 flex-1">
          {bars.map((bar) => (
            <div key={bar.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-[color:var(--ink-600)]">{bar.label}</span>
                <span className={`text-sm font-bold tabular-nums ${bar.textCls}`}>{bar.value}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${bar.barCls} transition-all duration-700`}
                  style={{ width: `${bar.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Latest Payroll Card ───────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const PAY_STATUS_CLS: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-600",
  processed: "bg-blue-100 text-blue-700",
  paid:      "bg-green-100 text-green-800",
};

function LatestPayrollCard({ payroll, loading }: { payroll: any; loading: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-[color:var(--ink-100)] shadow-[0_2px_10px_rgba(0,0,0,0.04)] p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-[color:var(--ink-900)] text-sm">Latest Payroll</h3>
        <Link
          href="/hr/payroll"
          className="text-xs font-semibold text-[color:var(--brand-600)] hover:text-[color:var(--brand-700)] inline-flex items-center gap-1"
        >
          Go to Payroll <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map((i) => <SkeletonBlock key={i} className="h-6 w-full" />)}</div>
      ) : !payroll ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <DollarSign className="mx-auto h-8 w-8 text-[color:var(--ink-200)] mb-2" />
            <p className="text-xs text-[color:var(--ink-400)]">No payroll runs yet</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[color:var(--ink-500)]">Period</span>
            <span className="text-sm font-semibold text-[color:var(--ink-800)]">
              {MONTH_NAMES[(payroll.periodMonth ?? 1) - 1]} {payroll.periodYear}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[color:var(--ink-500)]">Status</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-transparent ${PAY_STATUS_CLS[payroll.status] ?? "bg-gray-100 text-gray-600"}`}>
              {payroll.status}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[color:var(--ink-500)]">Net Pay</span>
            <span className="text-sm font-bold text-[color:var(--ink-900)] tabular-nums">{formatCurrency(payroll.totalNetPay ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[color:var(--ink-500)]">Employees</span>
            <span className="text-sm font-semibold text-[color:var(--ink-700)] tabular-nums">{payroll.employeeCount ?? 0}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Quick Action Button ───────────────────────────────────────────────────────

function QuickAction({ href, icon: Icon, label, description, color }: {
  href: string;
  icon: any;
  label: string;
  description: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-2xl border border-[color:var(--ink-100)] shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-5 flex items-center gap-4 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:border-[color:var(--brand-200)] transition-all duration-200 group"
    >
      <span className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color} group-hover:scale-105 transition-transform`}>
        <Icon className="h-5 w-5 text-white" />
      </span>
      <div>
        <div className="font-bold text-[color:var(--ink-900)] text-sm group-hover:text-[color:var(--brand-700)] transition-colors">
          {label}
        </div>
        <div className="text-xs text-[color:var(--ink-400)] mt-0.5">{description}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-[color:var(--ink-300)] group-hover:text-[color:var(--brand-500)] ms-auto transition-colors" />
    </Link>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function HrDashboardPage() {
  const { t, isRTL } = useI18n();
  const dashboard = useQuery(api.hr.getHrDashboard, {});
  const loading = dashboard === undefined;

  const kpis = dashboard?.kpis ?? {};
  const todayAttendance = dashboard?.todayAttendance ?? null;
  const latestPayroll = dashboard?.latestPayroll ?? null;
  const departments = dashboard?.departmentDistribution ?? [];

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">HR Dashboard</h1>
        <p className="text-sm text-[color:var(--ink-500)] mt-1">Human Resources Overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={Users}
          label="Total Employees"
          value={loading ? "—" : (kpis.totalEmployees ?? 0)}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          loading={loading}
        />
        <KpiCard
          icon={UserCheck}
          label="Active Employees"
          value={loading ? "—" : (kpis.activeEmployees ?? 0)}
          sub={!loading && kpis.totalEmployees > 0 ? `${Math.round((kpis.activeEmployees / kpis.totalEmployees) * 100)}% of total` : undefined}
          iconBg="bg-green-50"
          iconColor="text-green-600"
          loading={loading}
        />
        <KpiCard
          icon={Plane}
          label="On Leave Today"
          value={loading ? "—" : (kpis.onLeaveToday ?? 0)}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          loading={loading}
        />
        <KpiCard
          icon={ClipboardList}
          label="Pending Requests"
          value={loading ? "—" : (kpis.pendingLeaveRequests ?? 0)}
          sub="Leave requests awaiting approval"
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
          loading={loading}
        />
      </div>

      {/* Attendance + Payroll row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <TodayAttendanceCard attendance={todayAttendance} loading={loading} />
        <LatestPayrollCard payroll={latestPayroll} loading={loading} />
      </div>

      {/* Department Distribution */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-[color:var(--ink-100)] p-6 space-y-3">
          <SkeletonBlock className="h-5 w-48" />
          {[1,2,3,4].map((i) => <SkeletonBlock key={i} className="h-7 w-full" />)}
        </div>
      ) : (
        <DeptDistributionCard departments={departments} isRTL={isRTL} />
      )}

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-bold text-[color:var(--ink-700)] mb-3 uppercase tracking-wider">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <QuickAction
            href="/hr/employees"
            icon={UserPlus}
            label="Add Employee"
            description="Onboard a new team member"
            color="bg-[color:var(--brand-600)]"
          />
          <QuickAction
            href="/hr/attendance"
            icon={Calendar}
            label="Mark Attendance"
            description="Record daily attendance"
            color="bg-blue-500"
          />
          <QuickAction
            href="/hr/leave"
            icon={Plane}
            label="Leave Requests"
            description="Manage leave approvals"
            color="bg-amber-500"
          />
          <QuickAction
            href="/hr/payroll"
            icon={DollarSign}
            label="Payroll"
            description="Run & process payroll"
            color="bg-green-600"
          />
        </div>
      </div>
    </div>
  );
}
