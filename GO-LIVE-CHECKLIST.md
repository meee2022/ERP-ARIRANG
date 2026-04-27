# PrimeBalance ERP — Go-Live Checklist

> **Version:** 1.0  
> **Last Updated:** 2026-04-20  
> **Purpose:** Final gate before switching production traffic to PrimeBalance ERP.  
> Complete every item below. Do NOT go live with any unchecked box unless it is explicitly marked as a post-launch item.

---

## How to Use This Document

1. Work through each section in order.
2. Check each box only after you have personally verified the item — not just assumed it.
3. For each item that references another document, open that document and confirm.
4. When all boxes are checked, sign off in Section 7.

---

## Section 1 — Infrastructure

### 1.1 Convex Backend
- [ ] Production Convex project created at [dashboard.convex.dev](https://dashboard.convex.dev) (separate from dev/staging)
- [ ] `npx convex deploy` succeeded against the production project (exit code 0, no errors)
- [ ] Convex Dashboard → Logs: no function errors in the past 5 minutes post-deploy
- [ ] `CONVEX_DEPLOY_KEY` for production stored in a secure secrets manager (NOT in Git)
- [ ] Convex backup retention enabled in dashboard (see RUNBOOK-BACKUP-RESTORE.md § 3)

### 1.2 Frontend Hosting
- [ ] Frontend deployed to production hosting (Vercel / Netlify / self-hosted)
- [ ] `NEXT_PUBLIC_CONVEX_URL` is set to the **production** Convex URL in the hosting dashboard
- [ ] Production build (`npm run build`) completed with no blocking errors
- [ ] App loads at the production URL — no blank screen, no 500 error

### 1.3 Domain & SSL
- [ ] Custom domain configured and DNS propagated (if applicable)
- [ ] SSL/HTTPS is active — padlock visible in browser, no mixed-content warnings
- [ ] HTTP → HTTPS redirect is enforced (port 80 redirects to 443)

### 1.4 Backup Readiness
- [ ] `scripts/backup.ps1` tested successfully against production (`.\scripts\backup.ps1 -Label "pre-golive"`)
- [ ] Backup file verified with `.\scripts\verify-backup.ps1`
- [ ] Offsite backup destination configured (Azure Blob / S3 / OneDrive — see RUNBOOK-BACKUP-RESTORE.md § 8)
- [ ] Pre-go-live backup taken and stored offsite before any live users access the system

---

## Section 2 — Data

### 2.1 Company & Initial Data
- [ ] `seedInitialData` run once in production (company, chart of accounts, branches, warehouses, currencies, UoM created)
- [ ] Company name, default currency, and address verified in Settings → Company
- [ ] Demo/test data is confirmed NOT present — no records from `seedDemoTransactions` (check: Sales Invoices list should be empty)

### 2.2 Chart of Accounts
- [ ] Chart of accounts reviewed by the accountant/finance team and matches the real business structure
- [ ] All required account categories present: Assets, Liabilities, Equity, Revenue, Expenses
- [ ] Control accounts confirmed (AR, AP, Inventory, Cash/Bank)
- [ ] No placeholder or seed-named accounts left active (e.g., accounts named "Demo" or "Test")

### 2.3 Fiscal Year & Periods
- [ ] Fiscal year created for the current accounting year (Settings → Fiscal Years)
- [ ] Current accounting period is **Open** — confirm status is not Closed or Pending
- [ ] Prior periods (if any) set to Closed to prevent backdated posting

### 2.4 Users & Access
- [ ] All real users created with correct roles (admin / accountant / sales / warehouse / viewer)
- [ ] Each user assigned to the correct branch(es)
- [ ] Seed admin (`admin@demo.local` / `admin123`) deactivated or deleted
- [ ] All `@demo.local` accounts deactivated
- [ ] Every user's login tested successfully with their assigned credentials
- [ ] No `@demo.local` or `@test.local` emails present in active user list

### 2.5 Reference Data
- [ ] At least one real customer record created (or confirmed ready for first invoice)
- [ ] At least one real supplier record created (or confirmed ready for first purchase)
- [ ] Item / product catalog reviewed — no demo items left active

---

## Section 3 — Security

- [ ] Default seed admin password (`admin123`) changed or account deactivated
- [ ] All active user accounts have strong passwords (minimum 8 characters, not guessable)
- [ ] Admin account is a real named user — not a shared "admin" account
- [ ] RBAC verified: each role can only access its permitted modules (spot-check at least 2 roles)
- [ ] Audit log is active — Settings → Audit Log shows entries for actions taken during setup
- [ ] `.env.local` is NOT committed to Git (verify `.gitignore` includes `.env.local`)
- [ ] `NEXT_PUBLIC_CONVEX_URL` points to the production Convex project (not dev/staging)
- [ ] Session expiry confirmed — users are logged out after inactivity (check `convex/auth.ts`)
- [ ] HTTPS enforced — no sensitive data transmitted over plain HTTP

---

## Section 4 — Functional Verification

Run each flow manually in the production environment before declaring go-live.

### 4.1 Authentication & Access Control
- [ ] Login works for admin role
- [ ] Login works for accountant role
- [ ] Login works for sales role
- [ ] Login works for warehouse role
- [ ] Logout works — session is cleared, user is redirected to login
- [ ] Unauthorized access attempt is blocked (e.g., warehouse user cannot access journal entries)

### 4.2 Branch Context
- [ ] Branch picker displays and switches branches correctly for multi-branch users
- [ ] Data filtered by branch — a sales user for Branch A does not see Branch B invoices
- [ ] Branch-scoped reports return branch-specific data

### 4.3 Sales
- [ ] Sales invoice: create → save as draft → post → verify journal entries created
- [ ] Sales invoice: print / PDF export works
- [ ] Sales returns: create return against a posted invoice
- [ ] Customer list loads; customer search works

### 4.4 Purchases
- [ ] Purchase invoice: create → save as draft → post → verify journal entries created
- [ ] GRN (Goods Receipt Note) created and linked to purchase invoice
- [ ] Purchase returns: create return against a posted invoice
- [ ] Supplier list loads; supplier search works

### 4.5 Treasury
- [ ] Cash receipt voucher: create → post → verify journal entries
- [ ] Cash payment voucher: create → post → verify journal entries
- [ ] Bank transfer: create → post → verify journal entries
- [ ] Cheque management: create cheque, update status

### 4.6 Inventory
- [ ] Stock adjustment: create → post → verify stock balance updated
- [ ] Item list loads; item search and filtering work
- [ ] Stock balance report shows correct quantities

### 4.7 Journal Entries
- [ ] Manual journal entry: create → post → verify in general ledger
- [ ] Balanced journal entry enforced (debit = credit)
- [ ] Journal entry with unbalanced amounts is rejected

### 4.8 Reports
- [ ] Trial Balance: generates without error, debits = credits
- [ ] General Ledger: generates for at least one account, shows transactions
- [ ] Income Statement: generates, shows revenue and expense accounts
- [ ] Balance Sheet: generates, Assets = Liabilities + Equity
- [ ] AR Aging: generates, shows outstanding customer balances
- [ ] AP Aging: generates, shows outstanding supplier balances

### 4.9 Fiscal Period Enforcement
- [ ] Posting to a closed period is blocked with a clear error message
- [ ] Posting to an open period succeeds normally
- [ ] Fiscal year status displayed correctly in Settings → Fiscal Years

### 4.10 Dashboard
- [ ] Dashboard loads without errors or empty-state placeholders on real data
- [ ] KPI cards show correct values (verify at least one: Total Revenue or Cash Balance)
- [ ] Charts/graphs render correctly
- [ ] Branch-level KPIs update when branch is switched

### 4.11 Settings & Administration
- [ ] Users Management: create, edit, deactivate user works
- [ ] Audit Log: entries visible and include recent setup actions
- [ ] Company settings: editable and saved correctly

---

## Section 5 — Operations Readiness

- [ ] Backup schedule established — daily backup job configured in Windows Task Scheduler / GitHub Actions / Azure Automation (see RUNBOOK-BACKUP-RESTORE.md § 3.3)
- [ ] Backup procedure tested end-to-end: backup → verify → test restore to staging (see RUNBOOK-BACKUP-RESTORE.md § 5.3)
- [ ] Rollback procedure reviewed by the person responsible for deployments (see DEPLOYMENT-CHECKLIST.md § E)
- [ ] Monitoring plan in place — at minimum, Convex Dashboard → Logs checked daily
- [ ] Support contact defined: who do users call if the system is down?
- [ ] Escalation path documented: if on-call cannot resolve, who is next?
- [ ] All production credentials documented in a secure location (password manager or secrets vault) accessible to at least two authorized people
- [ ] PRODUCTION-OPEN-ITEMS.md reviewed — all blocking items resolved, known limitations accepted by project owner

---

## Section 6 — Pre-Go-Live Final Snapshot

Complete these steps in order, on the day of go-live:

1. - [ ] Take a final pre-go-live backup: `.\scripts\backup.ps1 -Label "pre-golive-final"`
2. - [ ] Verify backup: `.\scripts\verify-backup.ps1 -BackupFile ".\backups\backup-...-pre-golive-final.zip"`
3. - [ ] Copy backup to offsite storage
4. - [ ] Confirm all Section 1–5 boxes above are checked
5. - [ ] Announce go-live to users with login instructions

---

## Section 7 — Go-Live Sign-Off

> All items in Sections 1–6 must be checked before signing.

| Role | Name | Signature / Initials | Date |
|------|------|---------------------|------|
| Project Owner | | | |
| Technical Lead | | | |
| Finance / Key User | | | |

**Go-Live Approved:** YES / NO (circle one)

**Conditional Approval Notes (if any):**
```
____________________________________________________________________________
____________________________________________________________________________
```

---

*References:*
- *PRODUCTION-READINESS.md — environment setup, seed data policy, security checklist*
- *DEPLOYMENT-CHECKLIST.md — step-by-step deployment procedure and rollback*
- *RUNBOOK-BACKUP-RESTORE.md — backup/restore procedures and scripts*
- *UAT-SIGNOFF.md — formal UAT acceptance*
- *PRODUCTION-OPEN-ITEMS.md — known limitations and open items*
