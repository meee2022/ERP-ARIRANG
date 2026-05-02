// @ts-nocheck
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { generateDocumentNumber } from "./lib/posting";
import { assertUserPermission, assertUserBranch } from "./lib/permissions";
import { logAudit } from "./lib/audit";

// ═══════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════

// ─── List Purchase Orders (LPOs) ────────────────────────────────────────────
export const listPurchaseOrders = query({
  args: {
    companyId: v.id("companies"),
    branchId: v.optional(v.id("branches")),
    supplierId: v.optional(v.id("suppliers")),
    documentStatus: v.optional(v.string()),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
  },
  handler: async (ctx, { companyId, branchId, supplierId, documentStatus, fromDate, toDate }) => {
    let pos = await ctx.db
      .query("purchaseOrders")
      .filter((q) => q.eq(q.field("companyId"), companyId))
      .order("desc")
      .take(300);

    if (branchId)       pos = pos.filter((p) => p.branchId === branchId);
    if (supplierId)     pos = pos.filter((p) => p.supplierId === supplierId);
    if (documentStatus) pos = pos.filter((p) => p.documentStatus === documentStatus);
    if (fromDate)       pos = pos.filter((p) => p.orderDate >= fromDate);
    if (toDate)         pos = pos.filter((p) => p.orderDate <= toDate);

    return Promise.all(
      pos.map(async (p) => {
        const supplier = await ctx.db.get(p.supplierId);
        const warehouse = await ctx.db.get(p.warehouseId);
        const lines = await ctx.db
          .query("purchaseOrderLines")
          .withIndex("by_po", (q) => q.eq("poId", p._id))
          .collect();
        const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
        const receivedQty = lines.reduce((s, l) => s + (l.receivedQty ?? 0), 0);
        return {
          ...p,
          supplierName: supplier?.nameAr || "",
          supplierNameEn: (supplier as any)?.nameEn || supplier?.nameAr || "",
          warehouseName: warehouse?.nameAr || "",
          itemCount: lines.length,
          totalQty,
          receivedQty,
          progressPct: totalQty > 0 ? Math.round((receivedQty / totalQty) * 100) : 0,
        };
      })
    );
  },
});

// ─── Get Purchase Order by ID (detail + print view) ─────────────────────────
export const getPurchaseOrderById = query({
  args: { poId: v.id("purchaseOrders") },
  handler: async (ctx, args) => {
    const po = await ctx.db.get(args.poId);
    if (!po) return null;

    const lines = await ctx.db
      .query("purchaseOrderLines")
      .withIndex("by_po", (q) => q.eq("poId", args.poId))
      .collect();

    const enrichedLines = await Promise.all(
      lines.map(async (line) => {
        const item = await ctx.db.get(line.itemId);
        const uom  = await ctx.db.get(line.uomId);
        const remainingQty = Math.max(0, line.quantity - (line.receivedQty ?? 0));
        return {
          ...line,
          remainingQty,
          itemNameAr: item?.nameAr ?? "",
          itemNameEn: (item as any)?.nameEn ?? item?.nameAr ?? "",
          itemCode: item?.code ?? "",
          uomNameAr: uom?.nameAr ?? "",
          uomNameEn: (uom as any)?.nameEn ?? uom?.nameAr ?? "",
        };
      })
    );

    const supplier  = await ctx.db.get(po.supplierId);
    const warehouse = await ctx.db.get(po.warehouseId);
    const branch    = await ctx.db.get(po.branchId);
    const company   = await ctx.db.get(po.companyId);
    const currency  = await ctx.db.get(po.currencyId);

    return {
      ...po,
      lines: enrichedLines,
      supplierNameAr:  supplier?.nameAr ?? "",
      supplierNameEn:  (supplier as any)?.nameEn ?? supplier?.nameAr ?? "",
      supplierCode:    (supplier as any)?.code ?? "",
      supplierPhone:   (supplier as any)?.phone ?? (supplier as any)?.mobile ?? "",
      supplierEmail:   (supplier as any)?.email ?? "",
      supplierAddress: (supplier as any)?.address ?? "",
      warehouseNameAr: warehouse?.nameAr ?? "",
      warehouseNameEn: (warehouse as any)?.nameEn ?? warehouse?.nameAr ?? "",
      branchNameAr:    branch?.nameAr ?? "",
      branchNameEn:    (branch as any)?.nameEn ?? branch?.nameAr ?? "",
      companyNameAr:   company?.nameAr ?? "",
      companyNameEn:   (company as any)?.nameEn ?? company?.nameAr ?? "",
      companyAddress:  (company as any)?.address ?? "",
      companyPhone:    (company as any)?.phone ?? "",
      currencyCode:    (currency as any)?.code ?? "",
    };
  },
});

// ─── Count Pending LPOs (for sidebar badge) ─────────────────────────────────
export const countPendingLPOs = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    const approved = await ctx.db
      .query("purchaseOrders")
      .withIndex("by_company_status", (q) => q.eq("companyId", companyId).eq("documentStatus", "approved"))
      .collect();
    return approved.length;
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

// ─── Create Purchase Order (Draft) ──────────────────────────────────────────
export const createPurchaseOrder = mutation({
  args: {
    companyId: v.id("companies"),
    branchId: v.id("branches"),
    supplierId: v.id("suppliers"),
    orderDate: v.string(),
    expectedDate: v.optional(v.string()),
    warehouseId: v.id("warehouses"),
    currencyId: v.id("currencies"),
    exchangeRate: v.number(),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    lines: v.array(
      v.object({
        itemId: v.id("items"),
        quantity: v.number(),
        uomId: v.id("unitOfMeasure"),
        unitPrice: v.number(),
        vatRate: v.number(),
        lineTotal: v.number(),
        accountId: v.optional(v.id("accounts")),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await assertUserPermission(ctx, args.createdBy, "purchases", "create");
    assertUserBranch(user, args.branchId);

    if (args.lines.length === 0) throw new Error("لا يمكن إنشاء طلب بدون أصناف");

    // Compute totals
    const subtotal  = args.lines.reduce((s, l) => s + (l.unitPrice * l.quantity), 0);
    const vatAmount = args.lines.reduce((s, l) => s + (l.unitPrice * l.quantity * (l.vatRate / 100)), 0);
    const totalAmount = subtotal + vatAmount;

    // Generate LPO number from sequence
    const fiscalYear = await ctx.db
      .query("fiscalYears")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .filter((q) => q.eq(q.field("status"), "open"))
      .first();

    let poNumber = `LPO-${Date.now()}`;
    if (fiscalYear) {
      try {
        poNumber = await generateDocumentNumber(ctx, args.branchId, fiscalYear._id, "LPO");
      } catch {
        // Fallback to timestamp-based number if sequence missing
        poNumber = `LPO-${Date.now()}`;
      }
    }

    const poId = await ctx.db.insert("purchaseOrders", {
      companyId: args.companyId,
      branchId: args.branchId,
      poNumber,
      supplierId: args.supplierId,
      orderDate: args.orderDate,
      expectedDate: args.expectedDate,
      warehouseId: args.warehouseId,
      currencyId: args.currencyId,
      exchangeRate: args.exchangeRate,
      subtotal: Math.round(subtotal * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      documentStatus: "draft",
      notes: args.notes,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });

    for (const line of args.lines) {
      await ctx.db.insert("purchaseOrderLines", {
        poId,
        itemId: line.itemId,
        quantity: line.quantity,
        receivedQty: 0,
        uomId: line.uomId,
        unitPrice: line.unitPrice,
        vatRate: line.vatRate,
        lineTotal: Math.round(line.lineTotal * 100) / 100,
        accountId: line.accountId,
      });
    }

    await logAudit(ctx, {
      companyId: args.companyId,
      userId: args.createdBy,
      action: "create",
      module: "purchases",
      documentType: "purchaseOrder",
      documentId: String(poId),
    });

    return { poId, poNumber };
  },
});

// ─── Update Draft Purchase Order ────────────────────────────────────────────
export const updateDraftPurchaseOrder = mutation({
  args: {
    poId: v.id("purchaseOrders"),
    userId: v.id("users"),
    supplierId: v.id("suppliers"),
    orderDate: v.string(),
    expectedDate: v.optional(v.string()),
    warehouseId: v.id("warehouses"),
    notes: v.optional(v.string()),
    lines: v.array(
      v.object({
        itemId: v.id("items"),
        quantity: v.number(),
        uomId: v.id("unitOfMeasure"),
        unitPrice: v.number(),
        vatRate: v.number(),
        lineTotal: v.number(),
        accountId: v.optional(v.id("accounts")),
      })
    ),
  },
  handler: async (ctx, args) => {
    const po = await ctx.db.get(args.poId);
    if (!po) throw new Error("طلب التوريد غير موجود");
    if (po.documentStatus !== "draft") throw new Error("يمكن تعديل المسودات فقط");

    await assertUserPermission(ctx, args.userId, "purchases", "edit");

    if (args.lines.length === 0) throw new Error("لا يمكن حفظ طلب بدون أصناف");

    // Delete old lines
    const oldLines = await ctx.db
      .query("purchaseOrderLines")
      .withIndex("by_po", (q) => q.eq("poId", args.poId))
      .collect();
    for (const l of oldLines) await ctx.db.delete(l._id);

    // Insert new lines
    const subtotal  = args.lines.reduce((s, l) => s + (l.unitPrice * l.quantity), 0);
    const vatAmount = args.lines.reduce((s, l) => s + (l.unitPrice * l.quantity * (l.vatRate / 100)), 0);
    const totalAmount = subtotal + vatAmount;

    for (const line of args.lines) {
      await ctx.db.insert("purchaseOrderLines", {
        poId: args.poId,
        itemId: line.itemId,
        quantity: line.quantity,
        receivedQty: 0,
        uomId: line.uomId,
        unitPrice: line.unitPrice,
        vatRate: line.vatRate,
        lineTotal: Math.round(line.lineTotal * 100) / 100,
        accountId: line.accountId,
      });
    }

    await ctx.db.patch(args.poId, {
      supplierId: args.supplierId,
      orderDate: args.orderDate,
      expectedDate: args.expectedDate,
      warehouseId: args.warehouseId,
      notes: args.notes,
      subtotal: Math.round(subtotal * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
    });

    await logAudit(ctx, {
      companyId: po.companyId,
      userId: args.userId,
      action: "update",
      module: "purchases",
      documentType: "purchaseOrder",
      documentId: String(args.poId),
    });
  },
});

// ─── Approve Purchase Order ─────────────────────────────────────────────────
export const approvePurchaseOrder = mutation({
  args: { poId: v.id("purchaseOrders"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const po = await ctx.db.get(args.poId);
    if (!po) throw new Error("طلب التوريد غير موجود");
    if (po.documentStatus !== "draft") throw new Error("يمكن اعتماد المسودات فقط");

    await assertUserPermission(ctx, args.userId, "purchases", "edit");

    await ctx.db.patch(args.poId, {
      documentStatus: "approved",
      approvedBy: args.userId,
      approvedAt: Date.now(),
    });

    await logAudit(ctx, {
      companyId: po.companyId,
      userId: args.userId,
      action: "approve",
      module: "purchases",
      documentType: "purchaseOrder",
      documentId: String(args.poId),
    });
  },
});

// ─── Mark Purchase Order as Sent (to supplier) ──────────────────────────────
export const markAsSent = mutation({
  args: { poId: v.id("purchaseOrders"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const po = await ctx.db.get(args.poId);
    if (!po) throw new Error("طلب التوريد غير موجود");
    if (po.documentStatus !== "approved") throw new Error("يجب اعتماد الطلب قبل إرساله");

    await assertUserPermission(ctx, args.userId, "purchases", "edit");

    await ctx.db.patch(args.poId, {
      documentStatus: "sent",
      sentBy: args.userId,
      sentAt: Date.now(),
    });

    await logAudit(ctx, {
      companyId: po.companyId,
      userId: args.userId,
      action: "send",
      module: "purchases",
      documentType: "purchaseOrder",
      documentId: String(args.poId),
    });
  },
});

// ─── Cancel Purchase Order ──────────────────────────────────────────────────
export const cancelPurchaseOrder = mutation({
  args: { poId: v.id("purchaseOrders"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const po = await ctx.db.get(args.poId);
    if (!po) throw new Error("طلب التوريد غير موجود");
    if (po.documentStatus === "cancelled") throw new Error("الطلب ملغي بالفعل");
    if (po.documentStatus === "fully_received") throw new Error("لا يمكن إلغاء طلب مستلم بالكامل");

    // Block if any GRN already references this PO
    const linkedGrn = await ctx.db
      .query("goodsReceiptNotes")
      .withIndex("by_po", (q) => q.eq("poId", args.poId))
      .first();
    if (linkedGrn) throw new Error("لا يمكن الإلغاء — يوجد إذن استلام مرتبط بهذا الطلب");

    await assertUserPermission(ctx, args.userId, "purchases", "edit");

    await ctx.db.patch(args.poId, { documentStatus: "cancelled" });

    await logAudit(ctx, {
      companyId: po.companyId,
      userId: args.userId,
      action: "cancel",
      module: "purchases",
      documentType: "purchaseOrder",
      documentId: String(args.poId),
    });
  },
});

// ─── Delete Draft Purchase Order ────────────────────────────────────────────
export const deleteDraftPurchaseOrder = mutation({
  args: { poId: v.id("purchaseOrders"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const po = await ctx.db.get(args.poId);
    if (!po) throw new Error("طلب التوريد غير موجود");
    if (po.documentStatus !== "draft") throw new Error("يمكن حذف المسودات فقط");

    await assertUserPermission(ctx, args.userId, "purchases", "delete");

    const lines = await ctx.db
      .query("purchaseOrderLines")
      .withIndex("by_po", (q) => q.eq("poId", args.poId))
      .collect();
    for (const l of lines) await ctx.db.delete(l._id);
    await ctx.db.delete(args.poId);

    await logAudit(ctx, {
      companyId: po.companyId,
      userId: args.userId,
      action: "delete",
      module: "purchases",
      documentType: "purchaseOrder",
      documentId: String(args.poId),
    });
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER — Called from approveGRN to sync received qty back to PO
// ═══════════════════════════════════════════════════════════════════════════
export const syncReceivedQtyFromGRN = mutation({
  args: { grnId: v.id("goodsReceiptNotes") },
  handler: async (ctx, { grnId }) => {
    const grn = await ctx.db.get(grnId);
    if (!grn || !grn.poId) return;

    const grnLines = await ctx.db
      .query("grnLines")
      .withIndex("by_grn", (q) => q.eq("grnId", grnId))
      .collect();

    // For each grn line linked to a PO line, recompute received qty
    const touchedPoLineIds = new Set<string>();
    for (const gl of grnLines) {
      if (!gl.poLineId) continue;
      touchedPoLineIds.add(String(gl.poLineId));
    }

    for (const poLineIdStr of touchedPoLineIds) {
      // Get PO line
      const poLine = await ctx.db.get(poLineIdStr as any);
      if (!poLine) continue;

      // Sum from all approved+ GRN lines pointing to this poLineId
      // (we sum across all GRN lines — invoiced/approved both count as received)
      const allLinkedGrnLines = await ctx.db
        .query("grnLines")
        .filter((q) => q.eq(q.field("poLineId"), poLineIdStr as any))
        .collect();

      // Only count from non-cancelled GRNs
      let totalReceived = 0;
      for (const linked of allLinkedGrnLines) {
        const parentGrn = await ctx.db.get(linked.grnId);
        if (parentGrn && parentGrn.documentStatus !== "cancelled" && parentGrn.documentStatus !== "draft") {
          totalReceived += linked.quantity;
        }
      }

      await ctx.db.patch(poLineIdStr as any, { receivedQty: totalReceived });
    }

    // Recompute PO status
    const poLines = await ctx.db
      .query("purchaseOrderLines")
      .withIndex("by_po", (q) => q.eq("poId", grn.poId))
      .collect();

    const allFull = poLines.every((l) => (l.receivedQty ?? 0) >= l.quantity);
    const anyReceived = poLines.some((l) => (l.receivedQty ?? 0) > 0);
    const newStatus = allFull
      ? "fully_received"
      : anyReceived
        ? "partially_received"
        : undefined;

    if (newStatus) {
      await ctx.db.patch(grn.poId, { documentStatus: newStatus as any });
    }
  },
});
