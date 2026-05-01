// @ts-nocheck
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getNotifications = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    const today  = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const in7str   = new Date(today.getTime() + 7  * 86_400_000).toISOString().split("T")[0];
    const in60str  = new Date(today.getTime() + 60 * 86_400_000).toISOString().split("T")[0];

    const result: {
      id: string;
      severity: "critical" | "warning" | "info";
      count: number;
      titleAr: string;
      titleEn: string;
      bodyAr: string;
      bodyEn: string;
      href: string;
      icon: string;
    }[] = [];

    // ── 1. Sales review queue ─────────────────────────────────────
    const branches = await ctx.db
      .query("branches")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .collect();

    const branchIdSet = new Set(branches.map((b) => b._id));

    let reviewCount = 0;
    for (const branch of branches) {
      const invoices = await ctx.db
        .query("salesInvoices")
        .withIndex("by_branch", (q) => q.eq("branchId", branch._id))
        .filter((q) => q.eq(q.field("reviewStatus"), "submitted"))
        .collect();
      reviewCount += invoices.length;
    }
    if (reviewCount > 0) {
      result.push({
        id: "review_queue",
        severity: "critical",
        count: reviewCount,
        titleAr: "فواتير معلقة للمراجعة",
        titleEn: "Invoices Pending Review",
        bodyAr: `${reviewCount} فاتورة تنتظر المراجعة والاعتماد`,
        bodyEn: `${reviewCount} invoice(s) awaiting review`,
        href: "/sales/review",
        icon: "fileCheck",
      });
    }

    // ── 2. Cheques due within 7 days ──────────────────────────────
    const upcomingCheques = await ctx.db
      .query("cheques")
      .withIndex("by_due_date", (q) => q.gte("dueDate", todayStr))
      .filter((q) =>
        q.and(
          q.lte(q.field("dueDate"), in7str),
          q.neq(q.field("chequeStatus"), "cleared"),
          q.neq(q.field("chequeStatus"), "cleared_issued"),
          q.neq(q.field("chequeStatus"), "stopped"),
          q.neq(q.field("chequeStatus"), "bounced"),
        )
      )
      .collect();

    const dueCheques = upcomingCheques.filter((c) => branchIdSet.has(c.branchId));
    if (dueCheques.length > 0) {
      result.push({
        id: "cheques_due",
        severity: "critical",
        count: dueCheques.length,
        titleAr: "شيكات مستحقة خلال 7 أيام",
        titleEn: "Cheques Due Soon",
        bodyAr: `${dueCheques.length} شيك مستحق قريباً`,
        bodyEn: `${dueCheques.length} cheque(s) due within 7 days`,
        href: "/treasury/cheques",
        icon: "creditCard",
      });
    }

    // ── 3. Pending leave requests ─────────────────────────────────
    const pendingLeave = await ctx.db
      .query("hrLeaveRequests")
      .withIndex("by_company_status", (q) =>
        q.eq("companyId", companyId).eq("status", "pending")
      )
      .collect();

    if (pendingLeave.length > 0) {
      result.push({
        id: "leave_pending",
        severity: "warning",
        count: pendingLeave.length,
        titleAr: "طلبات إجازة معلقة",
        titleEn: "Pending Leave Requests",
        bodyAr: `${pendingLeave.length} طلب إجازة ينتظر الموافقة`,
        bodyEn: `${pendingLeave.length} leave request(s) need approval`,
        href: "/hr/leave",
        icon: "calendar",
      });
    }

    // ── 4. Low stock items ────────────────────────────────────────
    const stockItems = await ctx.db
      .query("items")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .filter((q) => q.gt(q.field("reorderPoint"), 0))
      .collect();

    let lowStockCount = 0;
    for (const item of stockItems.slice(0, 150)) {
      const balances = await ctx.db
        .query("stockBalances")
        .withIndex("by_item", (q) => q.eq("itemId", item._id))
        .collect();
      const totalQty = balances.reduce((s, b) => s + b.quantity, 0);
      if (totalQty <= (item.reorderPoint ?? 0)) lowStockCount++;
    }
    if (lowStockCount > 0) {
      result.push({
        id: "low_stock",
        severity: "warning",
        count: lowStockCount,
        titleAr: "تنبيه: مخزون منخفض",
        titleEn: "Low Stock Alert",
        bodyAr: `${lowStockCount} صنف وصل للحد الأدنى للمخزون`,
        bodyEn: `${lowStockCount} item(s) at or below reorder point`,
        href: "/inventory/low-stock",
        icon: "package",
      });
    }

    // ── 5. QID / Residence permit expiry ─────────────────────────
    const employees = await ctx.db
      .query("hrEmployees")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .filter((q) => q.neq(q.field("qidExpiryDate"), undefined))
      .collect();

    const expired  = employees.filter((e) => e.qidExpiryDate && e.qidExpiryDate < todayStr);
    const expiring = employees.filter(
      (e) => e.qidExpiryDate && e.qidExpiryDate >= todayStr && e.qidExpiryDate <= in60str
    );

    if (expired.length > 0) {
      result.push({
        id: "qid_expired",
        severity: "critical",
        count: expired.length,
        titleAr: "إقامات منتهية الصلاحية",
        titleEn: "Expired Residence Permits",
        bodyAr: `${expired.length} موظف منتهية صلاحية إقامته`,
        bodyEn: `${expired.length} employee(s) with expired permits`,
        href: "/hr/employees",
        icon: "shieldAlert",
      });
    }
    if (expiring.length > 0) {
      result.push({
        id: "qid_expiring",
        severity: "warning",
        count: expiring.length,
        titleAr: "إقامات تنتهي قريباً",
        titleEn: "Permits Expiring Soon",
        bodyAr: `${expiring.length} موظف إقامته تنتهي خلال 60 يوم`,
        bodyEn: `${expiring.length} permit(s) expiring within 60 days`,
        href: "/hr/employees",
        icon: "shield",
      });
    }

    return result;
  },
});
