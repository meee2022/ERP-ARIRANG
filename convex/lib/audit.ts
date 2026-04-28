import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export interface AuditParams {
  companyId: Id<"companies">;
  userId: Id<"users">;
  action: string;       // 'create' | 'post' | 'edit' | 'delete' | 'login' | 'logout'
  module: string;       // 'sales' | 'purchases' | 'treasury' | 'inventory' | 'finance' | 'auth'
  documentType?: string; // e.g. 'salesInvoice', 'purchaseInvoice', 'cheque'
  documentId?: string;   // _id of the affected document as string
  details?: string;      // JSON string with extra context
}

/**
 * Insert an audit log entry. Call AFTER the main operation succeeds.
 */
export async function logAudit(ctx: MutationCtx, params: AuditParams): Promise<void> {
  await ctx.db.insert("auditLogs", {
    companyId: params.companyId,
    userId: params.userId,
    action: params.action,
    module: params.module,
    documentType: params.documentType,
    documentId: params.documentId,
    details: params.details,
    timestamp: Date.now(),
  });
}
