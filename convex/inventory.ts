import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  validatePeriodOpen,
  generateDocumentNumber,
  postJournalEntry,
  updateStockBalance,
} from "./lib/posting";
import { assertUserPermission, assertUserBranch } from "./lib/permissions";
import { logAudit } from "./lib/audit";
import { assertPeriodOpen } from "./lib/fiscalControl";

// ─── STOCK ADJUSTMENTS ────────────────────────────────────────────────────────

export const createStockAdjustment = mutation({
  args: {
    companyId: v.id("companies"),
    branchId: v.id("branches"),
    adjustmentDate: v.string(),
    periodId: v.id("accountingPeriods"),
    warehouseId: v.id("warehouses"),
    adjustmentType: v.union(v.literal("increase"), v.literal("decrease")),
    reason: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    lines: v.array(
      v.object({
        itemId: v.id("items"),
        systemQty: v.number(),
        physicalQty: v.number(),
        varianceQty: v.number(),
        uomId: v.id("unitOfMeasure"),
        unitCost: v.number(),
        totalVarianceValue: v.number(),
        accountId: v.id("accounts"),
      })
    ),
  },
  handler: async (ctx, args) => {
    await validatePeriodOpen(ctx, args.periodId);

    const fiscalYear = await ctx.db
      .query("fiscalYears")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .filter((q) => q.eq(q.field("status"), "open"))
      .first();

    let adjustmentNumber = `ADJ-${Date.now()}`;
    if (fiscalYear) {
      adjustmentNumber = await generateDocumentNumber(
        ctx,
        args.branchId,
        fiscalYear._id,
        "ADJ"
      );
    }

    const adjustmentId = await ctx.db.insert("stockAdjustments", {
      companyId: args.companyId,
      branchId: args.branchId,
      adjustmentNumber,
      adjustmentDate: args.adjustmentDate,
      periodId: args.periodId,
      warehouseId: args.warehouseId,
      adjustmentType: args.adjustmentType,
      reason: args.reason,
      documentStatus: "draft",
      postingStatus: "unposted",
      notes: args.notes,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });

    for (const line of args.lines) {
      await ctx.db.insert("stockAdjustmentLines", {
        adjustmentId,
        itemId: line.itemId,
        systemQty: line.systemQty,
        physicalQty: line.physicalQty,
        varianceQty: line.varianceQty,
        uomId: line.uomId,
        unitCost: line.unitCost,
        totalVarianceValue: line.totalVarianceValue,
        accountId: line.accountId,
      });
    }

    return { adjustmentId, adjustmentNumber };
  },
});

export const approveStockAdjustment = mutation({
  args: {
    adjustmentId: v.id("stockAdjustments"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const adj = await ctx.db.get(args.adjustmentId);
    if (!adj) throw new Error("تسوية المخزون غير موجودة");
    if (adj.documentStatus !== "draft") throw new Error("يمكن اعتماد المسودات فقط");

    await ctx.db.patch(args.adjustmentId, {
      documentStatus: "approved",
      approvedBy: args.userId,
    });

    return { success: true };
  },
});

export const postStockAdjustment = mutation({
  args: {
    adjustmentId: v.id("stockAdjustments"),
    userId: v.id("users"),
    inventoryAdjustmentAccountId: v.id("accounts"),
  },
  handler: async (ctx, args) => {
    const adj = await ctx.db.get(args.adjustmentId);
    if (!adj) throw new Error("تسوية المخزون غير موجودة");
    if (adj.documentStatus !== "approved") throw new Error("يجب اعتماد التسوية أولاً");
    if (adj.postingStatus === "posted") throw new Error("التسوية مرحلة مسبقاً");

    await validatePeriodOpen(ctx, adj.periodId);
    await assertPeriodOpen(ctx, adj.adjustmentDate, adj.companyId);

    const lines = await ctx.db
      .query("stockAdjustmentLines")
      .withIndex("by_adjustment", (q) => q.eq("adjustmentId", args.adjustmentId))
      .collect();

    const journalLines: Array<{
      accountId: any;
      description: string;
      debit: number;
      credit: number;
    }> = [];

    for (const line of lines) {
      if (line.varianceQty === 0) continue;

      const item = await ctx.db.get(line.itemId);
      const inventoryAccountId = item?.inventoryAccountId ?? args.inventoryAdjustmentAccountId;

      const stockUpdate = await updateStockBalance(
        ctx,
        line.itemId,
        adj.warehouseId,
        line.varianceQty,
        line.unitCost,
        line.varianceQty > 0 ? "adjustment_in" : "adjustment_out"
      );

      const varianceValue = Math.abs(line.totalVarianceValue);

      if (line.varianceQty > 0) {
        // DR Inventory, CR Adjustment Account
        journalLines.push(
          {
            accountId: inventoryAccountId,
            description: `تسوية مخزون زيادة - ${adj.adjustmentNumber}`,
            debit: varianceValue,
            credit: 0,
          },
          {
            accountId: line.accountId ?? args.inventoryAdjustmentAccountId,
            description: `تسوية مخزون زيادة - ${adj.adjustmentNumber}`,
            debit: 0,
            credit: varianceValue,
          }
        );
      } else {
        // DR Adjustment Account, CR Inventory
        journalLines.push(
          {
            accountId: line.accountId ?? args.inventoryAdjustmentAccountId,
            description: `تسوية مخزون نقص - ${adj.adjustmentNumber}`,
            debit: varianceValue,
            credit: 0,
          },
          {
            accountId: inventoryAccountId,
            description: `تسوية مخزون نقص - ${adj.adjustmentNumber}`,
            debit: 0,
            credit: varianceValue,
          }
        );
      }
    }

    let journalEntryId;
    if (journalLines.length > 0) {
      journalEntryId = await postJournalEntry(
        ctx,
        {
          companyId: adj.companyId,
          branchId: adj.branchId,
          journalType: "auto_inventory",
          entryDate: adj.adjustmentDate,
          periodId: adj.periodId,
          currencyId: (await ctx.db.query("currencies").filter((q) => q.eq(q.field("isBase"), true)).first())?._id!,
          exchangeRate: 1,
          sourceType: "stockAdjustment",
          sourceId: adj._id,
          description: `تسوية مخزون ${adj.adjustmentNumber}`,
          isAutoGenerated: true,
          createdBy: args.userId,
        },
        journalLines
      );
    }

    await ctx.db.patch(args.adjustmentId, {
      postingStatus: "posted",
      journalEntryId,
    });

    // Log inventory movement
    const movementId = await ctx.db.insert("inventoryMovements", {
      companyId: adj.companyId,
      branchId: adj.branchId,
      movementNumber: `IM-${adj.adjustmentNumber}`,
      movementType: adj.adjustmentType === "increase" ? "adjustment_in" : "adjustment_out",
      movementDate: adj.adjustmentDate,
      periodId: adj.periodId,
      warehouseId: adj.warehouseId,
      sourceType: "stockAdjustment",
      sourceId: adj._id,
      documentStatus: "confirmed",
      postingStatus: "posted",
      journalEntryId,
      createdBy: args.userId,
      createdAt: Date.now(),
    });

    return { success: true, journalEntryId };
  },
});

// ─── STOCK TRANSFER ───────────────────────────────────────────────────────────

export const createStockTransfer = mutation({
  args: {
    companyId: v.id("companies"),
    branchId: v.id("branches"),
    transferDate: v.string(),
    periodId: v.id("accountingPeriods"),
    fromWarehouseId: v.id("warehouses"),
    toWarehouseId: v.id("warehouses"),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    lines: v.array(
      v.object({
        itemId: v.id("items"),
        quantity: v.number(),
        uomId: v.id("unitOfMeasure"),
      })
    ),
  },
  handler: async (ctx, args) => {
    await validatePeriodOpen(ctx, args.periodId);

    const fiscalYear = await ctx.db
      .query("fiscalYears")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .filter((q) => q.eq(q.field("status"), "open"))
      .first();

    let movementNumber = `TRF-${Date.now()}`;
    if (fiscalYear) {
      movementNumber = await generateDocumentNumber(
        ctx,
        args.branchId,
        fiscalYear._id,
        "STR"
      );
    }

    const movementId = await ctx.db.insert("inventoryMovements", {
      companyId: args.companyId,
      branchId: args.branchId,
      movementNumber,
      movementType: "transfer_out",
      movementDate: args.transferDate,
      periodId: args.periodId,
      warehouseId: args.fromWarehouseId,
      destinationWarehouseId: args.toWarehouseId,
      documentStatus: "draft",
      postingStatus: "unposted",
      notes: args.notes,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });

    for (const line of args.lines) {
      // Get current balance for cost
      const balance = await ctx.db
        .query("stockBalance")
        .withIndex("by_item_warehouse", (q) =>
          q.eq("itemId", line.itemId).eq("warehouseId", args.fromWarehouseId)
        )
        .unique();

      const unitCost = balance?.avgCost ?? 0;

      await ctx.db.insert("inventoryMovementLines", {
        movementId,
        itemId: line.itemId,
        quantity: line.quantity,
        uomId: line.uomId,
        unitCost,
        totalCost: Math.round(line.quantity * unitCost),
        qtyBefore: balance?.quantity ?? 0,
        qtyAfter: (balance?.quantity ?? 0) - line.quantity,
        avgCostBefore: unitCost,
        avgCostAfter: unitCost,
      });
    }

    return { movementId, movementNumber };
  },
});

export const postStockTransfer = mutation({
  args: {
    movementId: v.id("inventoryMovements"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const movement = await ctx.db.get(args.movementId);
    if (!movement) throw new Error("حركة المخزون غير موجودة");
    if (movement.postingStatus === "posted") throw new Error("الحركة مرحلة مسبقاً");
    if (movement.movementType !== "transfer_out") {
      throw new Error("هذه الوظيفة لتحويل المخزون فقط");
    }
    if (!movement.destinationWarehouseId) {
      throw new Error("المستودع المقصود غير محدد");
    }

    await validatePeriodOpen(ctx, movement.periodId);

    const lines = await ctx.db
      .query("inventoryMovementLines")
      .withIndex("by_movement", (q) => q.eq("movementId", args.movementId))
      .collect();

    for (const line of lines) {
      // Deduct from source warehouse
      await updateStockBalance(
        ctx,
        line.itemId,
        movement.warehouseId,
        -line.quantity,
        line.unitCost,
        "transfer_out"
      );

      // Add to destination warehouse
      await updateStockBalance(
        ctx,
        line.itemId,
        movement.destinationWarehouseId!,
        line.quantity,
        line.unitCost,
        "transfer_in"
      );
    }

    await ctx.db.patch(args.movementId, {
      documentStatus: "confirmed",
      postingStatus: "posted",
    });

    // Create corresponding transfer_in movement record
    const inMovementId = await ctx.db.insert("inventoryMovements", {
      companyId: movement.companyId,
      branchId: movement.branchId,
      movementNumber: `${movement.movementNumber}-IN`,
      movementType: "transfer_in",
      movementDate: movement.movementDate,
      periodId: movement.periodId,
      warehouseId: movement.destinationWarehouseId!,
      sourceType: "stockTransfer",
      sourceId: movement._id,
      documentStatus: "confirmed",
      postingStatus: "posted",
      createdBy: args.userId,
      createdAt: Date.now(),
    });

    for (const line of lines) {
      await ctx.db.insert("inventoryMovementLines", {
        movementId: inMovementId,
        itemId: line.itemId,
        quantity: line.quantity,
        uomId: line.uomId,
        unitCost: line.unitCost,
        totalCost: line.totalCost,
        qtyBefore: 0,
        qtyAfter: line.quantity,
        avgCostBefore: line.unitCost,
        avgCostAfter: line.unitCost,
      });
    }

    return { success: true };
  },
});

// ─── DELETE STOCK TRANSFER (DRAFT ONLY) ───────────────────────────────────────

export const deleteStockTransfer = mutation({
  args: {
    movementId: v.id("inventoryMovements"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const movement = await ctx.db.get(args.movementId);
    if (!movement) throw new Error("Movement not found");
    if (movement.movementType !== "transfer_out") throw new Error("Not a transfer");
    if (movement.documentStatus !== "draft") throw new Error("Only draft transfers can be deleted");
    if (movement.postingStatus === "posted") throw new Error("Posted transfers cannot be deleted");

    // Delete movement lines first
    const lines = await ctx.db
      .query("inventoryMovementLines")
      .withIndex("by_movement", (q) => q.eq("movementId", args.movementId))
      .collect();
    
    for (const line of lines) {
      await ctx.db.delete(line._id);
    }

    // Delete the movement
    await ctx.db.delete(args.movementId);

    return { success: true, deletedLines: lines.length };
  },
});

// ─── STOCK BALANCE QUERIES ────────────────────────────────────────────────────

export const getStockBalance = query({
  args: {
    itemId: v.id("items"),
    warehouseId: v.id("warehouses"),
  },
  handler: async (ctx, args) => {
    const balance = await ctx.db
      .query("stockBalance")
      .withIndex("by_item_warehouse", (q) =>
        q.eq("itemId", args.itemId).eq("warehouseId", args.warehouseId)
      )
      .unique();

    const item = await ctx.db.get(args.itemId);
    const warehouse = await ctx.db.get(args.warehouseId);

    return balance
      ? { ...balance, item, warehouse }
      : {
          itemId: args.itemId,
          warehouseId: args.warehouseId,
          quantity: 0,
          avgCost: 0,
          totalValue: 0,
          item,
          warehouse,
        };
  },
});

export const listStockBalances = query({
  args: {
    warehouseId: v.optional(v.id("warehouses")),
    categoryId: v.optional(v.id("itemCategories")),
    companyId: v.optional(v.id("companies")),
  },
  handler: async (ctx, args) => {
    let balances = args.warehouseId
      ? await ctx.db
          .query("stockBalance")
          .withIndex("by_warehouse", (q) => q.eq("warehouseId", args.warehouseId!))
          .collect()
      : await ctx.db.query("stockBalance").collect();

    const enriched = await Promise.all(
      balances.map(async (b) => {
        const item = await ctx.db.get(b.itemId);
        const warehouse = await ctx.db.get(b.warehouseId);

        if (args.categoryId && item?.categoryId !== args.categoryId) return null;
        if (args.companyId && item?.companyId !== args.companyId) return null;

        return { ...b, item, warehouse };
      })
    );

    return enriched.filter(Boolean);
  },
});

export const getInventoryMovementsSimple = query({
  args: {
    itemId: v.optional(v.id("items")),
    warehouseId: v.optional(v.id("warehouses")),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
    movementType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let movements = args.warehouseId
      ? await ctx.db
          .query("inventoryMovements")
          .withIndex("by_warehouse", (q) => q.eq("warehouseId", args.warehouseId!))
          .collect()
      : await ctx.db.query("inventoryMovements").collect();

    if (args.fromDate) {
      movements = movements.filter((m) => m.movementDate >= args.fromDate!);
    }
    if (args.toDate) {
      movements = movements.filter((m) => m.movementDate <= args.toDate!);
    }
    if (args.movementType) {
      movements = movements.filter((m) => m.movementType === args.movementType);
    }

    if (args.itemId) {
      const movementLines = await ctx.db
        .query("inventoryMovementLines")
        .withIndex("by_item", (q) => q.eq("itemId", args.itemId!))
        .collect();
      const movementIds = new Set(movementLines.map((l) => l.movementId));
      movements = movements.filter((m) => movementIds.has(m._id));
    }

    movements.sort((a, b) => b.movementDate.localeCompare(a.movementDate));

    return movements;
  },
});

// ─── STOCK ADJUSTMENTS LIST ───────────────────────────────────────────────────

export const getStockAdjustments = query({
  args: {
    companyId: v.id("companies"),
    branchId: v.optional(v.id("branches")),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const branches = await ctx.db
      .query("branches")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
    const branchIds = new Set(branches.map((b) => b._id));

    let adjustments = await ctx.db
      .query("stockAdjustments")
      .order("desc")
      .take(200);

    adjustments = adjustments.filter((a) => branchIds.has(a.branchId));

    if (args.branchId) {
      adjustments = adjustments.filter((a) => a.branchId === args.branchId);
    }
    if (args.fromDate) {
      adjustments = adjustments.filter((a) => a.adjustmentDate >= args.fromDate!);
    }
    if (args.toDate) {
      adjustments = adjustments.filter((a) => a.adjustmentDate <= args.toDate!);
    }

    return Promise.all(
      adjustments.map(async (adj) => {
        const warehouse = await ctx.db.get(adj.warehouseId);
        const lines = await ctx.db
          .query("stockAdjustmentLines")
          .withIndex("by_adjustment", (q) => q.eq("adjustmentId", adj._id))
          .collect();
        const totalValue = lines.reduce((s, l) => s + Math.abs(l.totalVarianceValue), 0);
        return {
          ...adj,
          warehouseName: warehouse ? (warehouse.nameAr) : "",
          lineCount: lines.length,
          totalValue,
        };
      })
    );
  },
});

// ─── CREATE STOCK ADJUSTMENT (IMMEDIATE POST) ────────────────────────────────

export const createStockAdjustmentImmediate = mutation({
  args: {
    companyId: v.id("companies"),
    branchId: v.id("branches"),
    warehouseId: v.id("warehouses"),
    periodId: v.id("accountingPeriods"),
    createdBy: v.id("users"),
    currencyId: v.id("currencies"),
    adjustmentDate: v.string(),
    reason: v.optional(v.string()),
    lines: v.array(
      v.object({
        itemId: v.id("items"),
        adjustmentType: v.union(v.literal("increase"), v.literal("decrease")),
        quantity: v.number(),
        unitCost: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Permission check before any DB writes
    const adjUser = await assertUserPermission(ctx, args.createdBy, "inventory", "create");
    assertUserBranch(adjUser, args.branchId);

    await validatePeriodOpen(ctx, args.periodId);

    // Generate adjustment number
    const fiscalYear = await ctx.db
      .query("fiscalYears")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .filter((q) => q.eq(q.field("status"), "open"))
      .first();

    let adjustmentNumber = `ADJ-${Date.now()}`;
    if (fiscalYear) {
      adjustmentNumber = await generateDocumentNumber(ctx, args.branchId, fiscalYear._id, "ADJ");
    }

    // Look up inventory account (1401) and adjustment contra account (5201 fallback)
    const inventoryAccount = await ctx.db
      .query("accounts")
      .withIndex("by_company_code", (q) =>
        q.eq("companyId", args.companyId).eq("code", "1401")
      )
      .first();

    if (!inventoryAccount) {
      throw new Error("لا يوجد حساب مخزون برمز 1401. تحقق من دليل الحسابات.");
    }

    const adjAccount = await ctx.db
      .query("accounts")
      .withIndex("by_company_code", (q) =>
        q.eq("companyId", args.companyId).eq("code", "5201")
      )
      .first();

    // If 5201 not found, look for any expense account
    const contraAccount = adjAccount ?? (await ctx.db
      .query("accounts")
      .withIndex("by_company_type", (q) =>
        q.eq("companyId", args.companyId).eq("accountType", "expense")
      )
      .filter((q) => q.eq(q.field("isPostable"), true))
      .first());

    if (!contraAccount) {
      throw new Error("لا يوجد حساب تسوية مخزون. تحقق من دليل الحسابات.");
    }

    // Build journal lines
    const journalLines: Array<{
      accountId: Id<"accounts">;
      description: string;
      debit: number;
      credit: number;
    }> = [];

    // Insert adjustment record first
    const adjustmentId = await ctx.db.insert("stockAdjustments", {
      companyId: args.companyId,
      branchId: args.branchId,
      adjustmentNumber,
      adjustmentDate: args.adjustmentDate,
      periodId: args.periodId,
      warehouseId: args.warehouseId,
      adjustmentType: args.lines.some((l) => l.adjustmentType === "increase") ? "increase" : "decrease",
      reason: args.reason,
      documentStatus: "approved",
      postingStatus: "unposted",
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });

    // Fetch a fallback UOM once (in case item.baseUomId is not set)
    const fallbackUom = await ctx.db
      .query("unitOfMeasure")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .first();

    // Process each line
    for (const line of args.lines) {
      const totalValue = Math.round(line.quantity * line.unitCost);
      const quantityChange = line.adjustmentType === "increase" ? line.quantity : -line.quantity;

      // Get the item's inventory account or fall back to default 1401
      const item = await ctx.db.get(line.itemId);
      const itemInventoryAccountId = item?.inventoryAccountId ?? inventoryAccount._id;

      // Update stock balance
      await updateStockBalance(
        ctx,
        line.itemId,
        args.warehouseId,
        quantityChange,
        line.unitCost,
        line.adjustmentType === "increase" ? "adjustment_in" : "adjustment_out"
      );

      // Insert adjustment line
      await ctx.db.insert("stockAdjustmentLines", {
        adjustmentId,
        itemId: line.itemId,
        systemQty: 0,
        physicalQty: line.quantity,
        varianceQty: quantityChange,
        uomId: (item?.baseUomId ?? fallbackUom?._id) as Id<"unitOfMeasure">,
        unitCost: line.unitCost,
        totalVarianceValue: totalValue,
        accountId: contraAccount._id,
      });

      // Build journal lines for this line
      if (line.adjustmentType === "increase") {
        // DR Inventory, CR Contra
        journalLines.push(
          {
            accountId: itemInventoryAccountId,
            description: `تسوية مخزون زيادة - ${adjustmentNumber}`,
            debit: totalValue,
            credit: 0,
          },
          {
            accountId: contraAccount._id,
            description: `تسوية مخزون زيادة - ${adjustmentNumber}`,
            debit: 0,
            credit: totalValue,
          }
        );
      } else {
        // DR Contra, CR Inventory
        journalLines.push(
          {
            accountId: contraAccount._id,
            description: `تسوية مخزون نقص - ${adjustmentNumber}`,
            debit: totalValue,
            credit: 0,
          },
          {
            accountId: itemInventoryAccountId,
            description: `تسوية مخزون نقص - ${adjustmentNumber}`,
            debit: 0,
            credit: totalValue,
          }
        );
      }
    }

    // Post journal entry
    let journalEntryId: Id<"journalEntries"> | undefined;
    if (journalLines.length > 0) {
      journalEntryId = await postJournalEntry(
        ctx,
        {
          companyId: args.companyId,
          branchId: args.branchId,
          journalType: "auto_inventory",
          entryDate: args.adjustmentDate,
          periodId: args.periodId,
          currencyId: args.currencyId,
          exchangeRate: 1,
          sourceType: "stockAdjustment",
          sourceId: adjustmentId,
          description: `تسوية مخزون ${adjustmentNumber}`,
          isAutoGenerated: true,
          createdBy: args.createdBy,
        },
        journalLines
      );
    }

    // Update adjustment to posted
    await ctx.db.patch(adjustmentId, {
      documentStatus: "approved",
      postingStatus: "posted",
      journalEntryId,
    });

    // Insert inventory movement record
    await ctx.db.insert("inventoryMovements", {
      companyId: args.companyId,
      branchId: args.branchId,
      movementNumber: `IM-${adjustmentNumber}`,
      movementType: "adjustment_in",
      movementDate: args.adjustmentDate,
      periodId: args.periodId,
      warehouseId: args.warehouseId,
      sourceType: "stockAdjustment",
      sourceId: adjustmentId,
      documentStatus: "confirmed",
      postingStatus: "posted",
      journalEntryId,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });

    await logAudit(ctx, {
      companyId: args.companyId,
      userId: args.createdBy,
      action: "create",
      module: "inventory",
      documentType: "stockAdjustment",
      documentId: String(adjustmentId),
    });

    return { adjustmentId, adjustmentNumber };
  },
});

// ─── INVENTORY MOVEMENTS LOG ─────────────────────────────────────────────────

export const getInventoryMovements = query({
  args: {
    companyId: v.id("companies"),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
    branchId: v.optional(v.id("branches")),
    warehouseId: v.optional(v.id("warehouses")),
    movementType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 500, 1000);

    // Fetch movements — use branch index when available, otherwise full scan
    let movements: any[];
    if (args.branchId) {
      movements = await ctx.db
        .query("inventoryMovements")
        .withIndex("by_branch", (q) => q.eq("branchId", args.branchId!))
        .take(limit);
    } else {
      movements = await ctx.db
        .query("inventoryMovements")
        .take(limit);
    }

    // Filter by company
    movements = movements.filter((m) => m.companyId === args.companyId);

    // Filter by date range
    if (args.fromDate) {
      movements = movements.filter((m) => m.movementDate >= args.fromDate!);
    }
    if (args.toDate) {
      movements = movements.filter((m) => m.movementDate <= args.toDate!);
    }

    // Filter by movement type
    if (args.movementType && args.movementType !== "all") {
      movements = movements.filter((m) => m.movementType === args.movementType);
    }

    // Filter by warehouse
    if (args.warehouseId) {
      movements = movements.filter((m) => m.warehouseId === args.warehouseId);
    }

    // Sort by date descending (most recent first)
    movements.sort((a, b) => (b.movementDate > a.movementDate ? 1 : -1));

    // Enrich with warehouse names
    const warehouseIds = [...new Set(movements.map((m) => m.warehouseId))];
    const destWarehouseIds = [...new Set(movements.map((m) => m.destinationWarehouseId).filter(Boolean))];
    const allWarehouseIds = [...new Set([...warehouseIds, ...destWarehouseIds])];
    
    const warehouses = await Promise.all(allWarehouseIds.map((id) => ctx.db.get(id)));
    const warehouseMap = new Map(
      warehouses.filter(Boolean).map((w) => [w!._id, w!])
    );

    // Count lines per movement
    const enriched = await Promise.all(
      movements.map(async (m) => {
        const lines = await ctx.db
          .query("inventoryMovementLines")
          .withIndex("by_movement", (q) => q.eq("movementId", m._id))
          .collect();
        const wh = warehouseMap.get(m.warehouseId) as any;
        const destWh = m.destinationWarehouseId ? warehouseMap.get(m.destinationWarehouseId) as any : null;
        return {
          ...m,
          warehouseName: wh?.nameAr ?? wh?.nameEn ?? null,
          warehouseNameEn: wh?.nameEn ?? null,
          destinationWarehouseName: destWh?.nameAr ?? destWh?.nameEn ?? null,
          destinationWarehouseNameEn: destWh?.nameEn ?? null,
          lineCount: lines.length,
        };
      })
    );

    return enriched;
  },
});

// ─── PRODUCTION SUPPORT QUERIES ───────────────────────────────────────────────
// Lightweight list helpers used by the production module (recipes & orders).

export const listWarehouses = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("warehouses")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const listUoms = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("unitOfMeasure")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

