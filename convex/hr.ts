// @ts-nocheck
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: resolve companyId from the first company (matches existing patterns)
// ─────────────────────────────────────────────────────────────────────────────
async function getCompanyId(ctx: any, companyId?: string) {
  if (companyId) return companyId;
  const company = await ctx.db.query("companies").first();
  if (!company) throw new Error("No company found");
  return company._id;
}

// ═════════════════════════════════════════════════════════════════════════════
// DEPARTMENTS
// ═════════════════════════════════════════════════════════════════════════════

export const listDepartments = query({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args) => {
    const cid = args.companyId ?? (await ctx.db.query("companies").first())?._id;
    if (!cid) return [];
    return ctx.db.query("hrDepartments").withIndex("by_company", (q) => q.eq("companyId", cid)).collect();
  },
});

export const createDepartment = mutation({
  args: {
    companyId: v.optional(v.id("companies")),
    code: v.string(),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    parentId: v.optional(v.id("hrDepartments")),
  },
  handler: async (ctx, args) => {
    const cid = await getCompanyId(ctx, args.companyId);
    return ctx.db.insert("hrDepartments", {
      companyId: cid,
      code: args.code,
      nameAr: args.nameAr,
      nameEn: args.nameEn,
      parentId: args.parentId,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const updateDepartment = mutation({
  args: {
    id: v.id("hrDepartments"),
    code: v.optional(v.string()),
    nameAr: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    const updates: any = {};
    if (rest.code !== undefined) updates.code = rest.code;
    if (rest.nameAr !== undefined) updates.nameAr = rest.nameAr;
    if (rest.nameEn !== undefined) updates.nameEn = rest.nameEn;
    if (rest.isActive !== undefined) updates.isActive = rest.isActive;
    await ctx.db.patch(id, updates);
    return id;
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// DESIGNATIONS
// ═════════════════════════════════════════════════════════════════════════════

export const listDesignations = query({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args) => {
    const cid = args.companyId ?? (await ctx.db.query("companies").first())?._id;
    if (!cid) return [];
    return ctx.db.query("hrDesignations").withIndex("by_company", (q) => q.eq("companyId", cid)).collect();
  },
});

export const createDesignation = mutation({
  args: {
    companyId: v.optional(v.id("companies")),
    code: v.string(),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    departmentId: v.optional(v.id("hrDepartments")),
  },
  handler: async (ctx, args) => {
    const cid = await getCompanyId(ctx, args.companyId);
    return ctx.db.insert("hrDesignations", {
      companyId: cid,
      code: args.code,
      nameAr: args.nameAr,
      nameEn: args.nameEn,
      departmentId: args.departmentId,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const updateDesignation = mutation({
  args: {
    id: v.id("hrDesignations"),
    code: v.optional(v.string()),
    nameAr: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    departmentId: v.optional(v.id("hrDepartments")),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    const updates: any = {};
    if (rest.code !== undefined) updates.code = rest.code;
    if (rest.nameAr !== undefined) updates.nameAr = rest.nameAr;
    if (rest.nameEn !== undefined) updates.nameEn = rest.nameEn;
    if (rest.departmentId !== undefined) updates.departmentId = rest.departmentId;
    if (rest.isActive !== undefined) updates.isActive = rest.isActive;
    await ctx.db.patch(id, updates);
    return id;
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// LEAVE TYPES
// ═════════════════════════════════════════════════════════════════════════════

export const listLeaveTypes = query({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args) => {
    const cid = args.companyId ?? (await ctx.db.query("companies").first())?._id;
    if (!cid) return [];
    return ctx.db.query("hrLeaveTypes").withIndex("by_company", (q) => q.eq("companyId", cid)).collect();
  },
});

export const createLeaveType = mutation({
  args: {
    companyId: v.optional(v.id("companies")),
    code: v.string(),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    isPaid: v.boolean(),
    defaultDaysPerYear: v.number(),
  },
  handler: async (ctx, args) => {
    const cid = await getCompanyId(ctx, args.companyId);
    return ctx.db.insert("hrLeaveTypes", {
      companyId: cid,
      code: args.code,
      nameAr: args.nameAr,
      nameEn: args.nameEn,
      isPaid: args.isPaid,
      defaultDaysPerYear: args.defaultDaysPerYear,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const updateLeaveType = mutation({
  args: {
    id: v.id("hrLeaveTypes"),
    nameAr: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    isPaid: v.optional(v.boolean()),
    defaultDaysPerYear: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    const updates: any = {};
    if (rest.nameAr !== undefined) updates.nameAr = rest.nameAr;
    if (rest.nameEn !== undefined) updates.nameEn = rest.nameEn;
    if (rest.isPaid !== undefined) updates.isPaid = rest.isPaid;
    if (rest.defaultDaysPerYear !== undefined) updates.defaultDaysPerYear = rest.defaultDaysPerYear;
    if (rest.isActive !== undefined) updates.isActive = rest.isActive;
    await ctx.db.patch(id, updates);
    return id;
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// EMPLOYEES
// ═════════════════════════════════════════════════════════════════════════════

export const listEmployees = query({
  args: {
    companyId: v.optional(v.id("companies")),
    status: v.optional(v.string()),
    departmentId: v.optional(v.id("hrDepartments")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cid = args.companyId ?? (await ctx.db.query("companies").first())?._id;
    if (!cid) return [];

    let rows: any[];
    if (args.status) {
      rows = await ctx.db.query("hrEmployees")
        .withIndex("by_company_status", (q) => q.eq("companyId", cid).eq("status", args.status as any))
        .collect();
    } else {
      rows = await ctx.db.query("hrEmployees")
        .withIndex("by_company", (q) => q.eq("companyId", cid))
        .collect();
    }

    if (args.departmentId) rows = rows.filter((r) => r.departmentId === args.departmentId);
    if (args.search) {
      const q = args.search.toLowerCase();
      rows = rows.filter((r) =>
        r.nameAr?.toLowerCase().includes(q) ||
        r.nameEn?.toLowerCase().includes(q) ||
        r.employeeCode?.toLowerCase().includes(q)
      );
    }

    // Enrich with department/designation names
    const depts = await ctx.db.query("hrDepartments").withIndex("by_company", (q) => q.eq("companyId", cid)).collect();
    const desigs = await ctx.db.query("hrDesignations").withIndex("by_company", (q) => q.eq("companyId", cid)).collect();
    const deptMap = Object.fromEntries(depts.map((d: any) => [d._id, d]));
    const desigMap = Object.fromEntries(desigs.map((d: any) => [d._id, d]));

    return rows.map((r: any) => ({
      ...r,
      department: r.departmentId ? deptMap[r.departmentId] : null,
      designation: r.designationId ? desigMap[r.designationId] : null,
    }));
  },
});

export const getEmployeeById = query({
  args: { id: v.id("hrEmployees") },
  handler: async (ctx, args) => {
    const emp = await ctx.db.get(args.id);
    if (!emp) return null;

    const [dept, desig, manager] = await Promise.all([
      emp.departmentId ? ctx.db.get(emp.departmentId) : null,
      emp.designationId ? ctx.db.get(emp.designationId) : null,
      emp.managerId ? ctx.db.get(emp.managerId) : null,
    ]);

    return { ...emp, department: dept, designation: desig, manager };
  },
});

export const createEmployee = mutation({
  args: {
    companyId: v.optional(v.id("companies")),
    branchId: v.id("branches"),
    employeeCode: v.string(),
    nameAr: v.string(),
    nameEn: v.optional(v.string()),
    nationalId: v.optional(v.string()),
    nationality: v.optional(v.string()),
    passportNumber: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    mobile: v.optional(v.string()),
    address: v.optional(v.string()),
    departmentId: v.optional(v.id("hrDepartments")),
    designationId: v.optional(v.id("hrDesignations")),
    managerId: v.optional(v.id("hrEmployees")),
    hireDate: v.string(),
    employmentType: v.union(
      v.literal("full_time"), v.literal("part_time"),
      v.literal("contractor"), v.literal("temporary")
    ),
    basicSalary: v.number(),
    housingAllowance: v.optional(v.number()),
    transportAllowance: v.optional(v.number()),
    otherAllowance: v.optional(v.number()),
    salaryBasis: v.union(v.literal("monthly"), v.literal("daily"), v.literal("hourly")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cid = await getCompanyId(ctx, args.companyId);
    const now = Date.now();
    const { companyId: _c, ...rest } = args;

    // Check code uniqueness
    const existing = await ctx.db.query("hrEmployees")
      .withIndex("by_company_code", (q) => q.eq("companyId", cid).eq("employeeCode", rest.employeeCode))
      .unique();
    if (existing) throw new Error("Employee code already exists");

    const id = await ctx.db.insert("hrEmployees", {
      ...rest,
      companyId: cid,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    // Auto-create leave balances for all active leave types for current year
    const year = new Date().getFullYear();
    const leaveTypes = await ctx.db.query("hrLeaveTypes")
      .withIndex("by_company", (q) => q.eq("companyId", cid))
      .collect();
    for (const lt of leaveTypes) {
      if (lt.isActive) {
        await ctx.db.insert("hrLeaveBalances", {
          companyId: cid,
          employeeId: id,
          leaveTypeId: lt._id,
          year,
          allocatedDays: lt.defaultDaysPerYear,
          usedDays: 0,
          pendingDays: 0,
        });
      }
    }

    return id;
  },
});

export const updateEmployee = mutation({
  args: {
    id: v.id("hrEmployees"),
    nameAr: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    nationalId: v.optional(v.string()),
    nationality: v.optional(v.string()),
    passportNumber: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    mobile: v.optional(v.string()),
    address: v.optional(v.string()),
    departmentId: v.optional(v.id("hrDepartments")),
    designationId: v.optional(v.id("hrDesignations")),
    managerId: v.optional(v.id("hrEmployees")),
    hireDate: v.optional(v.string()),
    employmentType: v.optional(v.union(
      v.literal("full_time"), v.literal("part_time"),
      v.literal("contractor"), v.literal("temporary")
    )),
    basicSalary: v.optional(v.number()),
    housingAllowance: v.optional(v.number()),
    transportAllowance: v.optional(v.number()),
    otherAllowance: v.optional(v.number()),
    salaryBasis: v.optional(v.union(v.literal("monthly"), v.literal("daily"), v.literal("hourly"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    const updates: any = { ...rest, updatedAt: Date.now() };
    // Remove undefined values
    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);
    await ctx.db.patch(id, updates);
    return id;
  },
});

export const updateEmployeeStatus = mutation({
  args: {
    id: v.id("hrEmployees"),
    status: v.union(
      v.literal("active"), v.literal("inactive"),
      v.literal("terminated"), v.literal("on_leave")
    ),
    terminationDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: any = { status: args.status, updatedAt: Date.now() };
    if (args.terminationDate) updates.terminationDate = args.terminationDate;
    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

export const deleteEmployee = mutation({
  args: {
    id: v.id("hrEmployees"),
  },
  handler: async (ctx, args) => {
    const employee = await ctx.db.get(args.id);
    if (!employee) {
      throw new Error("Employee not found");
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// ATTENDANCE
// ═════════════════════════════════════════════════════════════════════════════

export const listAttendanceByDate = query({
  args: {
    companyId: v.optional(v.id("companies")),
    attendanceDate: v.string(),
  },
  handler: async (ctx, args) => {
    const cid = args.companyId ?? (await ctx.db.query("companies").first())?._id;
    if (!cid) return [];
    const records = await ctx.db.query("hrAttendance")
      .withIndex("by_company_date", (q) => q.eq("companyId", cid).eq("attendanceDate", args.attendanceDate))
      .collect();
    // Enrich with employee names
    const empIds = [...new Set(records.map((r: any) => r.employeeId))];
    const emps = await Promise.all(empIds.map((id: any) => ctx.db.get(id)));
    const empMap = Object.fromEntries(emps.filter(Boolean).map((e: any) => [e._id, e]));
    return records.map((r: any) => ({ ...r, employee: empMap[r.employeeId] ?? null }));
  },
});

export const listAttendanceByEmployee = query({
  args: {
    employeeId: v.id("hrEmployees"),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let rows = await ctx.db.query("hrAttendance")
      .withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId))
      .collect();
    if (args.fromDate) rows = rows.filter((r: any) => r.attendanceDate >= args.fromDate!);
    if (args.toDate) rows = rows.filter((r: any) => r.attendanceDate <= args.toDate!);
    return rows;
  },
});

export const getAttendanceSummary = query({
  args: {
    employeeId: v.optional(v.id("hrEmployees")),
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    if (!args.employeeId) {
      return {
        present: 0, absent: 0, late: 0, half_day: 0,
        on_leave: 0, holiday: 0, weekend: 0, totalOvertimeHours: 0,
      };
    }
    const fromDate = `${args.year}-${String(args.month).padStart(2, "0")}-01`;
    const lastDay = new Date(args.year, args.month, 0).getDate();
    const toDate = `${args.year}-${String(args.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const rows = await ctx.db.query("hrAttendance")
      .withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId))
      .collect();
    const filtered = rows.filter((r: any) => r.attendanceDate >= fromDate && r.attendanceDate <= toDate);

    const summary = {
      present: 0, absent: 0, late: 0, half_day: 0,
      on_leave: 0, holiday: 0, weekend: 0, totalOvertimeHours: 0,
    };
    for (const r of filtered) {
      if (r.status in summary) (summary as any)[r.status]++;
      summary.totalOvertimeHours += r.overtimeHours ?? 0;
    }
    return summary;
  },
});

export const upsertAttendance = mutation({
  args: {
    companyId: v.optional(v.id("companies")),
    employeeId: v.id("hrEmployees"),
    attendanceDate: v.string(),
    status: v.union(
      v.literal("present"), v.literal("absent"), v.literal("late"),
      v.literal("half_day"), v.literal("on_leave"), v.literal("holiday"), v.literal("weekend")
    ),
    checkIn: v.optional(v.string()),
    checkOut: v.optional(v.string()),
    workedHours: v.optional(v.number()),
    overtimeHours: v.optional(v.number()),
    lateMinutes: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cid = await getCompanyId(ctx, args.companyId);
    const existing = await ctx.db.query("hrAttendance")
      .withIndex("by_employee_date", (q) => q.eq("employeeId", args.employeeId).eq("attendanceDate", args.attendanceDate))
      .unique();

    const data = {
      companyId: cid,
      employeeId: args.employeeId,
      attendanceDate: args.attendanceDate,
      status: args.status,
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      workedHours: args.workedHours,
      overtimeHours: args.overtimeHours,
      lateMinutes: args.lateMinutes,
      notes: args.notes,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    } else {
      return ctx.db.insert("hrAttendance", { ...data, createdAt: Date.now() });
    }
  },
});

export const bulkMarkAttendance = mutation({
  args: {
    companyId: v.optional(v.id("companies")),
    attendanceDate: v.string(),
    status: v.union(
      v.literal("present"), v.literal("absent"), v.literal("late"),
      v.literal("half_day"), v.literal("on_leave"), v.literal("holiday"), v.literal("weekend")
    ),
  },
  handler: async (ctx, args) => {
    const cid = await getCompanyId(ctx, args.companyId);
    const employees = await ctx.db.query("hrEmployees")
      .withIndex("by_company_status", (q) => q.eq("companyId", cid).eq("status", "active"))
      .collect();

    for (const emp of employees) {
      const existing = await ctx.db.query("hrAttendance")
        .withIndex("by_employee_date", (q) => q.eq("employeeId", emp._id).eq("attendanceDate", args.attendanceDate))
        .unique();
      if (!existing) {
        await ctx.db.insert("hrAttendance", {
          companyId: cid,
          employeeId: emp._id,
          attendanceDate: args.attendanceDate,
          status: args.status,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }
    return true;
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// LEAVE REQUESTS & BALANCES
// ═════════════════════════════════════════════════════════════════════════════

export const listLeaveRequests = query({
  args: {
    companyId: v.optional(v.id("companies")),
    status: v.optional(v.string()),
    employeeId: v.optional(v.id("hrEmployees")),
  },
  handler: async (ctx, args) => {
    const cid = args.companyId ?? (await ctx.db.query("companies").first())?._id;
    if (!cid) return [];

    let rows: any[];
    if (args.status) {
      rows = await ctx.db.query("hrLeaveRequests")
        .withIndex("by_company_status", (q) => q.eq("companyId", cid).eq("status", args.status as any))
        .collect();
    } else {
      rows = await ctx.db.query("hrLeaveRequests")
        .withIndex("by_company", (q) => q.eq("companyId", cid))
        .collect();
    }

    if (args.employeeId) rows = rows.filter((r) => r.employeeId === args.employeeId);

    const empIds = [...new Set(rows.map((r: any) => r.employeeId))];
    const ltIds = [...new Set(rows.map((r: any) => r.leaveTypeId))];
    const [emps, lts] = await Promise.all([
      Promise.all(empIds.map((id: any) => ctx.db.get(id))),
      Promise.all(ltIds.map((id: any) => ctx.db.get(id))),
    ]);
    const empMap = Object.fromEntries(emps.filter(Boolean).map((e: any) => [e._id, e]));
    const ltMap = Object.fromEntries(lts.filter(Boolean).map((l: any) => [l._id, l]));

    return rows.map((r: any) => ({
      ...r,
      employee: empMap[r.employeeId] ?? null,
      leaveType: ltMap[r.leaveTypeId] ?? null,
    }));
  },
});

export const createLeaveRequest = mutation({
  args: {
    companyId: v.optional(v.id("companies")),
    employeeId: v.id("hrEmployees"),
    leaveTypeId: v.id("hrLeaveTypes"),
    startDate: v.string(),
    endDate: v.string(),
    totalDays: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cid = await getCompanyId(ctx, args.companyId);
    const id = await ctx.db.insert("hrLeaveRequests", {
      companyId: cid,
      employeeId: args.employeeId,
      leaveTypeId: args.leaveTypeId,
      startDate: args.startDate,
      endDate: args.endDate,
      totalDays: args.totalDays,
      reason: args.reason,
      status: "pending",
      createdAt: Date.now(),
    });

    // Update pending days in balance
    const year = new Date(args.startDate).getFullYear();
    const balance = await ctx.db.query("hrLeaveBalances")
      .withIndex("by_employee_type_year", (q) =>
        q.eq("employeeId", args.employeeId).eq("leaveTypeId", args.leaveTypeId).eq("year", year)
      )
      .unique();
    if (balance) {
      await ctx.db.patch(balance._id, { pendingDays: balance.pendingDays + args.totalDays });
    }

    return id;
  },
});

export const approveLeaveRequest = mutation({
  args: {
    id: v.id("hrLeaveRequests"),
    approvedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const req = await ctx.db.get(args.id);
    if (!req) throw new Error("Leave request not found");
    if (req.status !== "pending") throw new Error("Request is not pending");

    await ctx.db.patch(args.id, {
      status: "approved",
      approvedBy: args.approvedBy,
      approvedAt: Date.now(),
    });

    // Update leave balance: move pending → used
    const year = new Date(req.startDate).getFullYear();
    const balance = await ctx.db.query("hrLeaveBalances")
      .withIndex("by_employee_type_year", (q) =>
        q.eq("employeeId", req.employeeId).eq("leaveTypeId", req.leaveTypeId).eq("year", year)
      )
      .unique();
    if (balance) {
      await ctx.db.patch(balance._id, {
        usedDays: balance.usedDays + req.totalDays,
        pendingDays: Math.max(0, balance.pendingDays - req.totalDays),
      });
    }

    // Update employee status if approved leave covers today
    const today = new Date().toISOString().split("T")[0];
    if (req.startDate <= today && req.endDate >= today) {
      await ctx.db.patch(req.employeeId, { status: "on_leave", updatedAt: Date.now() });
    }

    return args.id;
  },
});

export const rejectLeaveRequest = mutation({
  args: {
    id: v.id("hrLeaveRequests"),
    rejectionReason: v.optional(v.string()),
    rejectedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const req = await ctx.db.get(args.id);
    if (!req) throw new Error("Leave request not found");
    if (req.status !== "pending") throw new Error("Request is not pending");

    await ctx.db.patch(args.id, {
      status: "rejected",
      approvedBy: args.rejectedBy,
      approvedAt: Date.now(),
      rejectionReason: args.rejectionReason,
    });

    // Restore pending days in balance
    const year = new Date(req.startDate).getFullYear();
    const balance = await ctx.db.query("hrLeaveBalances")
      .withIndex("by_employee_type_year", (q) =>
        q.eq("employeeId", req.employeeId).eq("leaveTypeId", req.leaveTypeId).eq("year", year)
      )
      .unique();
    if (balance) {
      await ctx.db.patch(balance._id, {
        pendingDays: Math.max(0, balance.pendingDays - req.totalDays),
      });
    }

    return args.id;
  },
});

export const getLeaveBalances = query({
  args: {
    employeeId: v.id("hrEmployees"),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const year = args.year ?? new Date().getFullYear();
    const balances = await ctx.db.query("hrLeaveBalances")
      .withIndex("by_employee_year", (q) => q.eq("employeeId", args.employeeId).eq("year", year))
      .collect();

    const ltIds = balances.map((b: any) => b.leaveTypeId);
    const lts = await Promise.all(ltIds.map((id: any) => ctx.db.get(id)));
    const ltMap = Object.fromEntries(lts.filter(Boolean).map((l: any) => [l._id, l]));

    return balances.map((b: any) => ({
      ...b,
      remainingDays: Math.max(0, b.allocatedDays - b.usedDays - b.pendingDays),
      leaveType: ltMap[b.leaveTypeId] ?? null,
    }));
  },
});

export const initLeaveBalances = mutation({
  args: {
    companyId: v.optional(v.id("companies")),
    employeeId: v.id("hrEmployees"),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const cid = await getCompanyId(ctx, args.companyId);
    const leaveTypes = await ctx.db.query("hrLeaveTypes")
      .withIndex("by_company", (q) => q.eq("companyId", cid))
      .collect();

    for (const lt of leaveTypes) {
      if (!lt.isActive) continue;
      const existing = await ctx.db.query("hrLeaveBalances")
        .withIndex("by_employee_type_year", (q) =>
          q.eq("employeeId", args.employeeId).eq("leaveTypeId", lt._id).eq("year", args.year)
        )
        .unique();
      if (!existing) {
        await ctx.db.insert("hrLeaveBalances", {
          companyId: cid,
          employeeId: args.employeeId,
          leaveTypeId: lt._id,
          year: args.year,
          allocatedDays: lt.defaultDaysPerYear,
          usedDays: 0,
          pendingDays: 0,
        });
      }
    }
    return true;
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// PAYROLL
// ═════════════════════════════════════════════════════════════════════════════

export const listPayrollRuns = query({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args) => {
    const cid = args.companyId ?? (await ctx.db.query("companies").first())?._id;
    if (!cid) return [];
    return ctx.db.query("hrPayrollRuns")
      .withIndex("by_company", (q) => q.eq("companyId", cid))
      .order("desc")
      .take(50);
  },
});

export const getPayrollRunById = query({
  args: { id: v.id("hrPayrollRuns") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.id);
    if (!run) return null;
    const items = await ctx.db.query("hrPayrollItems")
      .withIndex("by_run", (q) => q.eq("runId", args.id))
      .collect();

    const empIds = items.map((i: any) => i.employeeId);
    const emps = await Promise.all(empIds.map((id: any) => ctx.db.get(id)));
    const empMap = Object.fromEntries(emps.filter(Boolean).map((e: any) => [e._id, e]));

    return {
      ...run,
      items: items.map((i: any) => ({ ...i, employee: empMap[i.employeeId] ?? null })),
    };
  },
});

export const previewPayrollRun = query({
  args: {
    companyId: v.optional(v.id("companies")),
    periodYear: v.number(),
    periodMonth: v.number(),
  },
  handler: async (ctx, args) => {
    const cid = args.companyId ?? (await ctx.db.query("companies").first())?._id;
    if (!cid) return [];

    const employees = await ctx.db.query("hrEmployees")
      .withIndex("by_company_status", (q) => q.eq("companyId", cid).eq("status", "active"))
      .collect();

    const fromDate = `${args.periodYear}-${String(args.periodMonth).padStart(2, "0")}-01`;
    const lastDay = new Date(args.periodYear, args.periodMonth, 0).getDate();
    const toDate = `${args.periodYear}-${String(args.periodMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const results = [];
    for (const emp of employees) {
      // Attendance for period
      const attendance = await ctx.db.query("hrAttendance")
        .withIndex("by_employee", (q) => q.eq("employeeId", emp._id))
        .collect();
      const periodAttendance = attendance.filter((a: any) => a.attendanceDate >= fromDate && a.attendanceDate <= toDate);

      const presentDays = periodAttendance.filter((a: any) => ["present", "late"].includes(a.status)).length;
      const halfDays = periodAttendance.filter((a: any) => a.status === "half_day").length;
      const absentDays = periodAttendance.filter((a: any) => a.status === "absent").length;
      const totalOvertimeHours = periodAttendance.reduce((s: number, a: any) => s + (a.overtimeHours ?? 0), 0);

      // Unpaid leave deduction
      const unpaidLeaveRequests = await ctx.db.query("hrLeaveRequests")
        .withIndex("by_employee", (q) => q.eq("employeeId", emp._id))
        .collect();
      const approvedUnpaid = unpaidLeaveRequests.filter((r: any) => {
        if (r.status !== "approved") return false;
        if (r.startDate > toDate || r.endDate < fromDate) return false;
        return true;
      });

      // Get leave types to check isPaid
      let leaveDeductionDays = 0;
      for (const req of approvedUnpaid) {
        const lt = await ctx.db.get(req.leaveTypeId);
        if (lt && !lt.isPaid) leaveDeductionDays += req.totalDays;
      }

      const workingDaysInMonth = lastDay - 8; // approximate (subtract weekends)
      const dailySalary = emp.salaryBasis === "monthly" ? emp.basicSalary / workingDaysInMonth : emp.basicSalary;

      const housing = emp.housingAllowance ?? 0;
      const transport = emp.transportAllowance ?? 0;
      const other = emp.otherAllowance ?? 0;
      const totalAllowances = housing + transport + other;

      // Overtime: 1.5x hourly rate
      const hourlyRate = emp.salaryBasis === "monthly" ? emp.basicSalary / (workingDaysInMonth * 8) : emp.basicSalary / 8;
      const overtimePay = totalOvertimeHours * hourlyRate * 1.5;

      // Unpaid leave deduction
      const unpaidLeaveDeduction = leaveDeductionDays * dailySalary;

      // Half-day deduction
      const halfDayDeduction = halfDays * (dailySalary / 2);

      const grossSalary = emp.basicSalary + totalAllowances + overtimePay;
      const totalDeductions = unpaidLeaveDeduction + halfDayDeduction;
      const netSalary = Math.max(0, grossSalary - totalDeductions);

      results.push({
        employeeId: emp._id,
        employee: emp,
        basicSalary: emp.basicSalary,
        housingAllowance: housing,
        transportAllowance: transport,
        otherAllowance: other,
        overtimePay: Math.round(overtimePay * 100) / 100,
        unpaidLeaveDeduction: Math.round((unpaidLeaveDeduction + halfDayDeduction) * 100) / 100,
        otherDeductions: 0,
        grossSalary: Math.round(grossSalary * 100) / 100,
        netSalary: Math.round(netSalary * 100) / 100,
        workingDays: workingDaysInMonth,
        presentDays: presentDays + halfDays,
        absentDays,
        overtimeHours: totalOvertimeHours,
        leaveDeductionDays,
      });
    }

    return results;
  },
});

export const createPayrollRun = mutation({
  args: {
    companyId: v.optional(v.id("companies")),
    branchId: v.id("branches"),
    periodYear: v.number(),
    periodMonth: v.number(),
    createdBy: v.id("users"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cid = await getCompanyId(ctx, args.companyId);

    // Check for existing run
    const existing = await ctx.db.query("hrPayrollRuns")
      .withIndex("by_company_period", (q) =>
        q.eq("companyId", cid).eq("periodYear", args.periodYear).eq("periodMonth", args.periodMonth)
      )
      .unique();
    if (existing) throw new Error("Payroll run for this period already exists");

    const employees = await ctx.db.query("hrEmployees")
      .withIndex("by_company_status", (q) => q.eq("companyId", cid).eq("status", "active"))
      .collect();

    const fromDate = `${args.periodYear}-${String(args.periodMonth).padStart(2, "0")}-01`;
    const lastDay = new Date(args.periodYear, args.periodMonth, 0).getDate();
    const toDate = `${args.periodYear}-${String(args.periodMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const workingDaysInMonth = lastDay - 8;

    let totalBasic = 0, totalAllowances = 0, totalDeductions = 0, totalOvertimePay = 0, totalNet = 0;

    const runId = await ctx.db.insert("hrPayrollRuns", {
      companyId: cid,
      branchId: args.branchId,
      periodYear: args.periodYear,
      periodMonth: args.periodMonth,
      status: "draft",
      totalBasic: 0, totalAllowances: 0, totalDeductions: 0, totalOvertimePay: 0, totalNetPay: 0,
      employeeCount: employees.length,
      notes: args.notes,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });

    for (const emp of employees) {
      const attendance = await ctx.db.query("hrAttendance")
        .withIndex("by_employee", (q) => q.eq("employeeId", emp._id))
        .collect();
      const pa = attendance.filter((a: any) => a.attendanceDate >= fromDate && a.attendanceDate <= toDate);

      const presentDays = pa.filter((a: any) => ["present", "late"].includes(a.status)).length;
      const halfDays = pa.filter((a: any) => a.status === "half_day").length;
      const absentDays = pa.filter((a: any) => a.status === "absent").length;
      const totalOTHrs = pa.reduce((s: number, a: any) => s + (a.overtimeHours ?? 0), 0);

      const leaveReqs = await ctx.db.query("hrLeaveRequests")
        .withIndex("by_employee", (q) => q.eq("employeeId", emp._id))
        .collect();
      let leaveDeductionDays = 0;
      for (const req of leaveReqs) {
        if (req.status !== "approved" || req.startDate > toDate || req.endDate < fromDate) continue;
        const lt = await ctx.db.get(req.leaveTypeId);
        if (lt && !lt.isPaid) leaveDeductionDays += req.totalDays;
      }

      const dailySalary = emp.salaryBasis === "monthly" ? emp.basicSalary / workingDaysInMonth : emp.basicSalary;
      const hourlyRate = dailySalary / 8;
      const housing = emp.housingAllowance ?? 0;
      const transport = emp.transportAllowance ?? 0;
      const other = emp.otherAllowance ?? 0;
      const totalAllow = housing + transport + other;
      const overtimePay = Math.round(totalOTHrs * hourlyRate * 1.5 * 100) / 100;
      const unpaidLeaveDeduction = Math.round((leaveDeductionDays * dailySalary + halfDays * dailySalary / 2) * 100) / 100;
      const grossSalary = emp.basicSalary + totalAllow + overtimePay;
      const netSalary = Math.max(0, Math.round((grossSalary - unpaidLeaveDeduction) * 100) / 100);

      await ctx.db.insert("hrPayrollItems", {
        companyId: cid,
        runId,
        employeeId: emp._id,
        basicSalary: emp.basicSalary,
        housingAllowance: housing,
        transportAllowance: transport,
        otherAllowance: other,
        overtimePay,
        unpaidLeaveDeduction,
        otherDeductions: 0,
        grossSalary: Math.round(grossSalary * 100) / 100,
        netSalary,
        workingDays: workingDaysInMonth,
        presentDays: presentDays + halfDays,
        absentDays,
        overtimeHours: totalOTHrs,
        leaveDeductionDays,
      });

      totalBasic += emp.basicSalary;
      totalAllowances += totalAllow;
      totalDeductions += unpaidLeaveDeduction;
      totalOvertimePay += overtimePay;
      totalNet += netSalary;
    }

    await ctx.db.patch(runId, {
      totalBasic: Math.round(totalBasic * 100) / 100,
      totalAllowances: Math.round(totalAllowances * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      totalOvertimePay: Math.round(totalOvertimePay * 100) / 100,
      totalNetPay: Math.round(totalNet * 100) / 100,
    });

    return runId;
  },
});

export const updatePayrollRunStatus = mutation({
  args: {
    id: v.id("hrPayrollRuns"),
    status: v.union(v.literal("draft"), v.literal("processed"), v.literal("paid")),
  },
  handler: async (ctx, args) => {
    const updates: any = { status: args.status };
    if (args.status === "processed") updates.processedAt = Date.now();
    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// HR DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════

export const getHrDashboard = query({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args) => {
    const cid = args.companyId ?? (await ctx.db.query("companies").first())?._id;
    if (!cid) return null;

    const allEmployees = await ctx.db.query("hrEmployees")
      .withIndex("by_company", (q) => q.eq("companyId", cid))
      .collect();

    const active = allEmployees.filter((e: any) => e.status === "active").length;
    const onLeave = allEmployees.filter((e: any) => e.status === "on_leave").length;
    const terminated = allEmployees.filter((e: any) => e.status === "terminated").length;
    const inactive = allEmployees.filter((e: any) => e.status === "inactive").length;

    // Department distribution
    const departments = await ctx.db.query("hrDepartments")
      .withIndex("by_company", (q) => q.eq("companyId", cid))
      .collect();
    const deptDist = departments.map((d: any) => ({
      nameAr: d.nameAr,
      nameEn: d.nameEn,
      count: allEmployees.filter((e: any) => e.departmentId === d._id).length,
    })).filter((d: any) => d.count > 0);

    // Today's attendance
    const today = new Date().toISOString().split("T")[0];
    const todayAttendance = await ctx.db.query("hrAttendance")
      .withIndex("by_company_date", (q) => q.eq("companyId", cid).eq("attendanceDate", today))
      .collect();
    const presentToday = todayAttendance.filter((a: any) => ["present", "late"].includes(a.status)).length;
    const absentToday = todayAttendance.filter((a: any) => a.status === "absent").length;
    const lateToday = todayAttendance.filter((a: any) => a.status === "late").length;

    // Pending leave requests
    const pendingLeaves = await ctx.db.query("hrLeaveRequests")
      .withIndex("by_company_status", (q) => q.eq("companyId", cid).eq("status", "pending"))
      .take(20);

    // Latest payroll
    const latestPayroll = await ctx.db.query("hrPayrollRuns")
      .withIndex("by_company", (q) => q.eq("companyId", cid))
      .order("desc")
      .first();

    return {
      headcount: allEmployees.length,
      active, onLeave, terminated, inactive,
      deptDistribution: deptDist,
      todayAttendance: { present: presentToday, absent: absentToday, late: lateToday },
      pendingLeaveCount: pendingLeaves.length,
      latestPayroll,
    };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// REPORTS
// ═════════════════════════════════════════════════════════════════════════════

export const getEmployeeDirectoryReport = query({
  args: {
    companyId: v.optional(v.id("companies")),
    status: v.optional(v.string()),
    departmentId: v.optional(v.id("hrDepartments")),
  },
  handler: async (ctx, args) => {
    const cid = args.companyId ?? (await ctx.db.query("companies").first())?._id;
    if (!cid) return [];

    let rows = await ctx.db.query("hrEmployees")
      .withIndex("by_company", (q) => q.eq("companyId", cid))
      .collect();

    if (args.status) rows = rows.filter((r: any) => r.status === args.status);
    if (args.departmentId) rows = rows.filter((r: any) => r.departmentId === args.departmentId);

    const depts = await ctx.db.query("hrDepartments").withIndex("by_company", (q) => q.eq("companyId", cid)).collect();
    const desigs = await ctx.db.query("hrDesignations").withIndex("by_company", (q) => q.eq("companyId", cid)).collect();
    const deptMap = Object.fromEntries(depts.map((d: any) => [d._id, d]));
    const desigMap = Object.fromEntries(desigs.map((d: any) => [d._id, d]));

    return rows.map((r: any) => ({
      ...r,
      department: r.departmentId ? deptMap[r.departmentId] : null,
      designation: r.designationId ? desigMap[r.designationId] : null,
    }));
  },
});

export const getAttendanceReport = query({
  args: {
    companyId: v.optional(v.id("companies")),
    fromDate: v.string(),
    toDate: v.string(),
    employeeId: v.optional(v.id("hrEmployees")),
    departmentId: v.optional(v.id("hrDepartments")),
  },
  handler: async (ctx, args) => {
    const cid = args.companyId ?? (await ctx.db.query("companies").first())?._id;
    if (!cid) return [];

    let employees = await ctx.db.query("hrEmployees")
      .withIndex("by_company", (q) => q.eq("companyId", cid))
      .collect();
    if (args.employeeId) employees = employees.filter((e: any) => e._id === args.employeeId);
    if (args.departmentId) employees = employees.filter((e: any) => e.departmentId === args.departmentId);

    const results = [];
    for (const emp of employees) {
      const att = await ctx.db.query("hrAttendance")
        .withIndex("by_employee", (q) => q.eq("employeeId", emp._id))
        .collect();
      const filtered = att.filter((a: any) => a.attendanceDate >= args.fromDate && a.attendanceDate <= args.toDate);
      const summary = { present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0, overtime: 0 };
      for (const a of filtered) {
        if (a.status === "present") summary.present++;
        else if (a.status === "absent") summary.absent++;
        else if (a.status === "late") { summary.present++; summary.late++; }
        else if (a.status === "half_day") summary.half_day++;
        else if (a.status === "on_leave") summary.on_leave++;
        summary.overtime += a.overtimeHours ?? 0;
      }
      results.push({ employee: emp, ...summary });
    }
    return results;
  },
});

export const getLeaveReport = query({
  args: {
    companyId: v.optional(v.id("companies")),
    year: v.optional(v.number()),
    employeeId: v.optional(v.id("hrEmployees")),
    leaveTypeId: v.optional(v.id("hrLeaveTypes")),
  },
  handler: async (ctx, args) => {
    const cid = args.companyId ?? (await ctx.db.query("companies").first())?._id;
    if (!cid) return [];

    let rows = await ctx.db.query("hrLeaveRequests")
      .withIndex("by_company", (q) => q.eq("companyId", cid))
      .collect();
    if (args.employeeId) rows = rows.filter((r: any) => r.employeeId === args.employeeId);
    if (args.leaveTypeId) rows = rows.filter((r: any) => r.leaveTypeId === args.leaveTypeId);
    if (args.year) {
      rows = rows.filter((r: any) => new Date(r.startDate).getFullYear() === args.year);
    }

    const empIds = [...new Set(rows.map((r: any) => r.employeeId))];
    const ltIds = [...new Set(rows.map((r: any) => r.leaveTypeId))];
    const [emps, lts] = await Promise.all([
      Promise.all(empIds.map((id: any) => ctx.db.get(id))),
      Promise.all(ltIds.map((id: any) => ctx.db.get(id))),
    ]);
    const empMap = Object.fromEntries(emps.filter(Boolean).map((e: any) => [e._id, e]));
    const ltMap = Object.fromEntries(lts.filter(Boolean).map((l: any) => [l._id, l]));

    return rows.map((r: any) => ({
      ...r,
      employee: empMap[r.employeeId] ?? null,
      leaveType: ltMap[r.leaveTypeId] ?? null,
    }));
  },
});

export const getPayrollReport = query({
  args: {
    companyId: v.optional(v.id("companies")),
    periodYear: v.optional(v.number()),
    periodMonth: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cid = args.companyId ?? (await ctx.db.query("companies").first())?._id;
    if (!cid) return [];

    let runs = await ctx.db.query("hrPayrollRuns")
      .withIndex("by_company", (q) => q.eq("companyId", cid))
      .order("desc")
      .take(24);

    if (args.periodYear) runs = runs.filter((r: any) => r.periodYear === args.periodYear);
    if (args.periodMonth) runs = runs.filter((r: any) => r.periodMonth === args.periodMonth);

    return runs;
  },
});
