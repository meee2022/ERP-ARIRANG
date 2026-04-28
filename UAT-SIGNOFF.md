# PrimeBalance ERP — UAT Sign-Off Document

> **Version:** 1.0  
> **Last Updated:** 2026-04-20  
> **Project:** PrimeBalance ERP  
> **Stack:** Next.js 16 + Convex + Tailwind CSS  
> **Testing Environment:** Staging (separate Convex project from production)  
> **Purpose:** Formal acceptance that User Acceptance Testing is complete and the system is approved for production go-live.

---

## 1. Test Summary

### 1.1 Scope

| Item | Value |
|------|-------|
| Total modules tested | 12 |
| Total test cases (reference: UAT-CHECKLIST.md) | 130+ |
| Test languages covered | Arabic (AR) + English (EN) |
| Test roles covered | admin, accountant, sales, warehouse, viewer |
| Test users | admin@demo.local, accountant@demo.local, sales@demo.local, warehouse@demo.local |
| Test data | Demo data seeded via `seedInitialData` + `seedDemoTransactions` on staging |

### 1.2 Test Coverage by Module

| Module | Test Cases | Coverage |
|--------|-----------|----------|
| Auth + Session Management | ~10 | Login, logout, wrong password, session expiry, role enforcement |
| Branch Context & Picker | ~8 | Branch switching, data isolation, branch-scoped reports |
| Sales (Invoices + Returns) | ~20 | Create, draft, post, print, AR impact, returns |
| Purchases (Invoices + Returns) | ~18 | Create, draft, post, GRN, AP impact, returns |
| Treasury (Cash/Bank/Cheques) | ~15 | Cash receipt, cash payment, bank transfer, cheque lifecycle |
| Inventory (Stock + Adjustments) | ~12 | Stock adjustment, item management, balance verification |
| Journal Entries | ~10 | Manual entry, balance enforcement, GL impact |
| Reports (TB/GL/IS/BS/AR/AP) | ~18 | All 6 report types, date filters, branch filters, export |
| Fiscal Year & Period Control | ~8 | Year create/close, period open/close, posting enforcement |
| Print / PDF Export | ~6 | Invoice print, report PDF, Arabic RTL layout |
| Dashboard & KPIs | ~8 | KPI cards, charts, branch-level data, date range |
| Settings & Users Management | ~8 | User CRUD, role assignment, branch assignment, audit log |

### 1.3 Known Issues at Time of UAT Completion

| # | Issue | Severity | Status | Notes |
|---|-------|----------|--------|-------|
| 1 | `ignoreBuildErrors: true` in `next.config.ts` | Medium | Open | Build-time TypeScript errors are suppressed. See PRODUCTION-OPEN-ITEMS.md. |
| 2 | No retained earnings carry-forward on fiscal year close | Low | Accepted | Manual journal entry workaround documented. Post-launch roadmap item. |
| 3 | No automated backup scheduling | Low | Accepted | Manual backup procedure documented in RUNBOOK-BACKUP-RESTORE.md. Acceptable for MVP. |
| 4 | No external error monitoring (Sentry / LogRocket) | Low | Accepted | Convex dashboard logs used for monitoring. Post-launch roadmap item. |
| 5 | SHA-256 password hashing (not bcrypt/Argon2) | Medium | Accepted | Sufficient for MVP. Upgrade path documented in PRODUCTION-READINESS.md § 9. |

> If additional issues were found during UAT, add rows above before signing.

---

## 2. Module Sign-Off Table

> **Instructions:** For each module, the tester must:
> 1. Execute all test cases for that module (reference UAT-CHECKLIST.md).
> 2. Record any failures or deviations in the Notes column.
> 3. Sign off only when all test cases pass or deviations are formally accepted.

| Module | Status | Tester Name | Date | Notes |
|--------|--------|-------------|------|-------|
| **Auth & Session Management** | PASS / FAIL / PARTIAL | | | |
| **Branch Context & Picker** | PASS / FAIL / PARTIAL | | | |
| **Sales — Invoices** | PASS / FAIL / PARTIAL | | | |
| **Sales — Returns** | PASS / FAIL / PARTIAL | | | |
| **Purchases — Invoices** | PASS / FAIL / PARTIAL | | | |
| **Purchases — GRN & Returns** | PASS / FAIL / PARTIAL | | | |
| **Treasury — Cash Receipts & Payments** | PASS / FAIL / PARTIAL | | | |
| **Treasury — Bank Transfers & Cheques** | PASS / FAIL / PARTIAL | | | |
| **Inventory — Items & Stock Adjustments** | PASS / FAIL / PARTIAL | | | |
| **Journal Entries** | PASS / FAIL / PARTIAL | | | |
| **Reports (all 6 types)** | PASS / FAIL / PARTIAL | | | |
| **Fiscal Year & Period Control** | PASS / FAIL / PARTIAL | | | |
| **Print / PDF Export** | PASS / FAIL / PARTIAL | | | |
| **Dashboard & KPIs** | PASS / FAIL / PARTIAL | | | |
| **Settings & Users Management** | PASS / FAIL / PARTIAL | | | |
| **Audit Log** | PASS / FAIL / PARTIAL | | | |

---

## 3. Acceptance Criteria Verification

### 3.1 Functional Acceptance Criteria

| Criterion | Status | Evidence / Notes |
|-----------|--------|-----------------|
| All 5 RBAC roles (admin, accountant, sales, warehouse, viewer) enforce correct access boundaries | PASS / FAIL | |
| Branch-aware data filtering prevents cross-branch data leakage | PASS / FAIL | |
| Sales invoice full lifecycle: create → post → journal entries → print works end-to-end | PASS / FAIL | |
| Purchase invoice full lifecycle: create → post → journal entries works end-to-end | PASS / FAIL | |
| All 3 treasury flows (cash receipt, cash payment, bank transfer) post correctly to GL | PASS / FAIL | |
| Stock adjustment correctly updates inventory balance | PASS / FAIL | |
| Manual journal entries are balanced-only (debit = credit enforced) | PASS / FAIL | |
| All 6 reports (TB, GL, IS, BS, AR Aging, AP Aging) generate without error | PASS / FAIL | |
| Fiscal period enforcement: posting to a closed period is blocked | PASS / FAIL | |
| Posting to an open period succeeds | PASS / FAIL | |
| Print / PDF export produces correctly formatted bilingual (AR/EN) output | PASS / FAIL | |
| Dashboard KPI cards reflect real transaction data | PASS / FAIL | |
| Audit log records all significant write actions | PASS / FAIL | |

### 3.2 Non-Functional Acceptance Criteria

| Criterion | Status | Notes |
|-----------|--------|-------|
| System is accessible over HTTPS | PASS / FAIL | |
| Pages load within acceptable time on staging environment | PASS / FAIL | |
| No data loss occurs across normal user operations | PASS / FAIL | |
| Error messages are user-friendly (no raw stack traces to end users) | PASS / FAIL | |
| Arabic RTL layout renders correctly across all modules | PASS / FAIL | |
| English LTR layout renders correctly across all modules | PASS / FAIL | |
| All 4 test-user roles can log in and perform their primary tasks | PASS / FAIL | |

### 3.3 Security Acceptance Criteria

| Criterion | Status | Notes |
|-----------|--------|-------|
| Unauthenticated users cannot access any protected routes | PASS / FAIL | |
| Unauthorized role cannot access out-of-scope modules | PASS / FAIL | |
| Passwords are hashed (SHA-256 + salt) — plain text never stored or logged | PASS / FAIL | |
| Audit log cannot be deleted by non-admin users | PASS / FAIL | |
| Session is terminated on logout | PASS / FAIL | |

---

## 4. Defect Summary

> List all defects found during UAT. Mark each as Resolved, Accepted (as known limitation), or Blocking (must fix before go-live).

| ID | Module | Description | Severity | Resolution | Status |
|----|--------|-------------|----------|------------|--------|
| UAT-001 | Build | `ignoreBuildErrors: true` suppresses TypeScript errors at build time | Medium | Accepted as known limitation — see PRODUCTION-OPEN-ITEMS.md | Accepted |
| UAT-002 | Finance | No automatic retained earnings carry-forward on fiscal year close | Low | Accepted for MVP — manual JE workaround | Accepted |
| | | | | | |
| | | | | | |

> Add rows for any defects found during your UAT session.

---

## 5. UAT Environment Details

| Item | Value |
|------|-------|
| UAT Environment | Staging — separate Convex project |
| Application URL | _(enter staging URL)_ |
| Convex Project (Staging) | _(enter staging project name)_ |
| Test Data Loaded | `seedInitialData` + `seedDemoTransactions` |
| Browser(s) Tested | _(e.g., Chrome 124, Edge 124)_ |
| Device(s) Tested | _(e.g., Desktop Windows 10, iPad)_ |
| Testing Period | From: __________ To: __________ |

---

## 6. Conditional Approvals

> If any module received a PARTIAL or FAIL status that is being accepted conditionally, document it here with the specific condition that must be met before or after go-live.

| Module | Condition | Owner | Due Date |
|--------|-----------|-------|----------|
| | | | |
| | | | |

---

## 7. Sign-Off

> By signing below, each signatory confirms that:
> - They have reviewed the test results documented above.
> - They accept any known limitations listed in Section 1.3 and the defect summary.
> - They authorize the system to proceed to production go-live.

### 7.1 Project Owner

> Confirms the system meets business requirements and authorizes go-live.

| Field | Value |
|-------|-------|
| Name | |
| Title | |
| Signature | |
| Date | |
| Comments | |

### 7.2 Technical Lead

> Confirms the system is technically stable and deployment procedures are in place.

| Field | Value |
|-------|-------|
| Name | |
| Title | |
| Signature | |
| Date | |
| Comments | |

### 7.3 Finance / Key User

> Confirms the accounting workflows meet operational needs and data integrity requirements.

| Field | Value |
|-------|-------|
| Name | |
| Title | |
| Signature | |
| Date | |
| Comments | |

### 7.4 Additional Signatories (if required)

| Name | Role | Signature | Date |
|------|------|-----------|------|
| | | | |
| | | | |

---

## 8. Post-UAT Actions

Before proceeding to production:

- [ ] All FAIL items resolved or formally accepted with documented rationale
- [ ] Conditional approvals (Section 6) reviewed and accepted
- [ ] GO-LIVE-CHECKLIST.md completed fully
- [ ] PRODUCTION-OPEN-ITEMS.md reviewed and accepted by Project Owner
- [ ] Production environment prepared (separate Convex project, no demo data)
- [ ] User training completed for all production user roles

---

*Related Documents:*
- *GO-LIVE-CHECKLIST.md — pre-production infrastructure and functional gate*
- *PRODUCTION-OPEN-ITEMS.md — known limitations, blockers, and post-launch roadmap*
- *PRODUCTION-READINESS.md — environment configuration and security guidance*
- *DEPLOYMENT-CHECKLIST.md — step-by-step deployment procedure*
