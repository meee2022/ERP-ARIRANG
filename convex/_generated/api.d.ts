/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as admin from "../admin.js";
import type * as auditLog from "../auditLog.js";
import type * as auth from "../auth.js";
import type * as backup from "../backup.js";
import type * as branches from "../branches.js";
import type * as company from "../company.js";
import type * as costCenters from "../costCenters.js";
import type * as customerOutlets from "../customerOutlets.js";
import type * as customers from "../customers.js";
import type * as dashboard from "../dashboard.js";
import type * as dashboardQueries from "../dashboardQueries.js";
import type * as excelCustomerData from "../excelCustomerData.js";
import type * as excelData from "../excelData.js";
import type * as fiscalYears from "../fiscalYears.js";
import type * as fixedAssets from "../fixedAssets.js";
import type * as helpers from "../helpers.js";
import type * as hr from "../hr.js";
import type * as importCustomers from "../importCustomers.js";
import type * as importData from "../importData.js";
import type * as importFromExcel from "../importFromExcel.js";
import type * as inventory from "../inventory.js";
import type * as items from "../items.js";
import type * as journalEntries from "../journalEntries.js";
import type * as legacy from "../legacy.js";
import type * as legacyImport from "../legacyImport.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_crypto from "../lib/crypto.js";
import type * as lib_fiscalControl from "../lib/fiscalControl.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as lib_posting from "../lib/posting.js";
import type * as notifications from "../notifications.js";
import type * as postingRules from "../postingRules.js";
import type * as production from "../production.js";
import type * as productionItemsSeed from "../productionItemsSeed.js";
import type * as purchaseInvoices from "../purchaseInvoices.js";
import type * as purchaseReturns from "../purchaseReturns.js";
import type * as reports from "../reports.js";
import type * as salesInvoices from "../salesInvoices.js";
import type * as salesMasters from "../salesMasters.js";
import type * as salesReturns from "../salesReturns.js";
import type * as search from "../search.js";
import type * as seed from "../seed.js";
import type * as seedDemoItems from "../seedDemoItems.js";
import type * as seedStaff from "../seedStaff.js";
import type * as supplierItems from "../supplierItems.js";
import type * as suppliers from "../suppliers.js";
import type * as treasury from "../treasury.js";
import type * as users from "../users.js";
import type * as wastage from "../wastage.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  admin: typeof admin;
  auditLog: typeof auditLog;
  auth: typeof auth;
  backup: typeof backup;
  branches: typeof branches;
  company: typeof company;
  costCenters: typeof costCenters;
  customerOutlets: typeof customerOutlets;
  customers: typeof customers;
  dashboard: typeof dashboard;
  dashboardQueries: typeof dashboardQueries;
  excelCustomerData: typeof excelCustomerData;
  excelData: typeof excelData;
  fiscalYears: typeof fiscalYears;
  fixedAssets: typeof fixedAssets;
  helpers: typeof helpers;
  hr: typeof hr;
  importCustomers: typeof importCustomers;
  importData: typeof importData;
  importFromExcel: typeof importFromExcel;
  inventory: typeof inventory;
  items: typeof items;
  journalEntries: typeof journalEntries;
  legacy: typeof legacy;
  legacyImport: typeof legacyImport;
  "lib/audit": typeof lib_audit;
  "lib/crypto": typeof lib_crypto;
  "lib/fiscalControl": typeof lib_fiscalControl;
  "lib/permissions": typeof lib_permissions;
  "lib/posting": typeof lib_posting;
  notifications: typeof notifications;
  postingRules: typeof postingRules;
  production: typeof production;
  productionItemsSeed: typeof productionItemsSeed;
  purchaseInvoices: typeof purchaseInvoices;
  purchaseReturns: typeof purchaseReturns;
  reports: typeof reports;
  salesInvoices: typeof salesInvoices;
  salesMasters: typeof salesMasters;
  salesReturns: typeof salesReturns;
  search: typeof search;
  seed: typeof seed;
  seedDemoItems: typeof seedDemoItems;
  seedStaff: typeof seedStaff;
  supplierItems: typeof supplierItems;
  suppliers: typeof suppliers;
  treasury: typeof treasury;
  users: typeof users;
  wastage: typeof wastage;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
