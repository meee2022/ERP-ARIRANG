/**
 * approvalRules.ts
 *
 * Pure functions that determine whether the current user
 * can approve / post / reverse a given document type.
 *
 * Rules:
 *  canApprove → requires "edit"   permission on the document's module
 *  canPost    → requires "post"   permission on the document's module
 *  canReverse → requires "delete" permission on the document's module
 *
 * Document-status guards are applied on top of the role check.
 */

import type { DocType } from "@/components/ui/doc-action-bar";
import type { Module } from "@/hooks/usePermissions";

/** Map each document type to its RBAC module */
export const DOC_MODULE: Record<DocType, Module> = {
  grn:              "purchases",
  purchase_invoice: "purchases",
  sales_invoice:    "sales",
  sales_return:     "sales",
  purchase_return:  "purchases",
  cash_receipt:     "treasury",
  cash_payment:     "treasury",
};

export interface DocState {
  documentStatus: string;   // "draft" | "approved" | "cancelled"
  postingStatus:  string;   // "unposted" | "posted"
}

export interface PermissionChecks {
  canView:   (module: Module) => boolean;
  canCreate: (module: Module) => boolean;
  canEdit:   (module: Module) => boolean;
  canDelete: (module: Module) => boolean;
  canPost:   (module: Module) => boolean;
}

/**
 * Returns which actions the current user may perform on a document.
 * All three return false if permissions are missing OR if the document
 * state doesn't allow the action.
 */
export function resolveDocActions(
  docType: DocType,
  state: DocState,
  perms: PermissionChecks
): { canApprove: boolean; canPost: boolean; canReverse: boolean } {
  const module = DOC_MODULE[docType];

  const isDraft     = state.documentStatus === "draft";
  const isApproved  = state.documentStatus === "approved";
  const isPosted    = state.postingStatus  === "posted";
  const isCancelled = state.documentStatus === "cancelled";

  // Role-aware flags
  const roleCanApprove = perms.canEdit(module);
  const roleCanPost    = perms.canPost(module);
  const roleCanReverse = perms.canDelete(module);

  return {
    // Approve: document must be draft, not cancelled, and user can edit
    canApprove: roleCanApprove && isDraft && !isCancelled,

    // Post: document must not already be posted/cancelled, and user can post
    canPost:    roleCanPost && (isDraft || isApproved) && !isPosted && !isCancelled,

    // Reverse: document must be posted, not cancelled, and user can delete
    canReverse: roleCanReverse && isPosted && !isCancelled,
  };
}

/**
 * Which action buttons are relevant for each document type?
 * (Independent of state — just "does this doc type support Approve?")
 */
export const DOC_SUPPORTS: Record<
  DocType,
  { approve: boolean; post: boolean; reverse: boolean }
> = {
  grn:              { approve: true,  post: false, reverse: true  },
  purchase_invoice: { approve: true,  post: true,  reverse: true  },
  sales_invoice:    { approve: false, post: false, reverse: false },
  sales_return:     { approve: false, post: true,  reverse: true  },
  purchase_return:  { approve: false, post: true,  reverse: true  },
  cash_receipt:     { approve: false, post: false, reverse: false },
  cash_payment:     { approve: false, post: false, reverse: false },
};
