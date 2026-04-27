# PrimeBalance ERP — Production Open Items

> **Version:** 1.0  
> **Last Updated:** 2026-04-20  
> **Purpose:** Honest, prioritized list of what is not production-ready, what limitations are accepted for MVP go-live, and what is planned for post-launch improvement.  
> **Audience:** Project owner, technical lead, finance team.

---

## How to Read This Document

| Priority | Meaning |
|----------|---------|
| **BLOCKING** | Must be resolved before go-live. System cannot go live with this open. |
| **ACCEPTED** | Known limitation. Understood and accepted by project owner for MVP. Does not block go-live. |
| **POST-LAUNCH** | Planned improvement. No urgency. Tracked for future sprints. |

---

## Section 1 — Blocking Issues (Must Fix Before Go-Live)

> These items must be resolved before production traffic begins. If they are not addressed, go-live must be delayed.

**Assessment as of 2026-04-20: No confirmed hard blockers.** The items below are conditionally blocking — they become blockers depending on owner decisions.

| # | Item | Detail | Action Required | Owner |
|---|------|--------|-----------------|-------|
| B-01 | Production Convex project not yet created | A separate production Convex project must exist before deployment. Using the dev project for production would expose dev/test data and is not acceptable. | Create production project at dashboard.convex.dev and set `NEXT_PUBLIC_CONVEX_URL` accordingly. See PRODUCTION-READINESS.md § 2.3. | Project Owner |
| B-02 | Seed admin account must be deactivated before go-live | `seedInitialData` creates `admin@demo.local` / `admin123`. If not deactivated, this is a critical security risk on a live system. | Run `seedInitialData` once, immediately create a real admin user, deactivate `admin@demo.local`. See DEPLOYMENT-CHECKLIST.md § G. | Technical Lead |
| B-03 | `ignoreBuildErrors: true` in `next.config.ts` | TypeScript errors are silently ignored during `npm run build`. This means broken code can be deployed to production without any build failure. | Remove `ignoreBuildErrors: true` from `next.config.ts` and fix any resulting TypeScript errors before the production build. | Technical Lead |

> If B-03 is not fixed, the Technical Lead must explicitly accept the risk in writing before go-live and document what TypeScript errors (if any) are currently suppressed.

---

## Section 2 — Known Limitations (Accepted for MVP Go-Live)

> These are real limitations. They were identified during Phase 8–9 stabilization. They are understood, documented, and accepted as part of the MVP scope. They do not block go-live but must be disclosed to the project owner.

### 2.1 Finance & Accounting Limitations

| # | Limitation | Impact | Workaround |
|---|-----------|--------|-----------|
| L-01 | **No retained earnings carry-forward on fiscal year close** | At year-end, net income/loss is NOT automatically moved to a Retained Earnings account. The balance sheet equity section will show the current year's net income as a separate line. | Manual journal entry at year-end: Dr. Income Summary / Cr. Retained Earnings (or vice versa). Requires accountant action. Planned for post-launch (see Section 3). |
| L-02 | **No multi-company support** | The system supports exactly one company. Running multiple legal entities requires separate deployments (separate Convex projects, separate URLs). | Deploy separate instances per company. |
| L-03 | **No multi-currency transactions** | All transactions are recorded in the company's base currency. Foreign currency invoices must be manually converted before entry. | Manual conversion at point of entry. Multi-currency is a post-launch roadmap item. |
| L-04 | **No bank reconciliation module** | There is no dedicated bank reconciliation feature. Bank accounts are tracked via cash/bank transactions, but reconciliation against bank statements must be done externally. | Export GL data and reconcile in a spreadsheet. Post-launch roadmap item. |

### 2.2 Infrastructure & Operations Limitations

| # | Limitation | Impact | Workaround |
|---|-----------|--------|-----------|
| L-05 | **No automated backup scheduling** | Backups must be triggered manually using `.\scripts\backup.ps1`. If the person responsible forgets, backups will not run. | Set up Windows Task Scheduler, GitHub Actions cron, or Azure Automation to call the script on a schedule. See RUNBOOK-BACKUP-RESTORE.md § 3.3. This requires owner action BEFORE go-live. |
| L-06 | **No external error monitoring** | Application errors are only visible in the Convex dashboard logs. There is no real-time alerting, error aggregation (Sentry), or session replay (LogRocket). | Manually check Convex Dashboard → Logs daily. Post-launch improvement: add Sentry or equivalent. |
| L-07 | **No automated test suite** | There are no automated unit, integration, or end-to-end tests. Regression testing is entirely manual. Every deployment requires manual UAT verification. | Manual testing using UAT-SIGNOFF.md. Post-launch improvement: add Playwright E2E tests. |

### 2.3 Security Limitations

| # | Limitation | Impact | Workaround |
|---|-----------|--------|-----------|
| L-08 | **SHA-256 password hashing (not bcrypt or Argon2)** | SHA-256 is a fast hashing algorithm. While salted, it is more vulnerable to brute-force attacks than purpose-built password hashing functions. Acceptable for internal tools with strong passwords; not recommended for internet-facing consumer apps. | Enforce strong passwords on all accounts. Post-launch improvement: upgrade to bcrypt or Argon2 in `convex/lib/crypto.ts`. |
| L-09 | **No password complexity enforcement in UI** | The system does not currently enforce minimum password length or complexity rules in the UI. Weak passwords can be set. | Enforce policy manually: instruct users to set strong passwords during onboarding. |
| L-10 | **No 2FA / MFA** | Multi-factor authentication is not implemented. Compromised credentials give full access. | Enforce strong passwords. Post-launch improvement: add TOTP or email OTP. |

### 2.4 Product Limitations

| # | Limitation | Impact | Workaround |
|---|-----------|--------|-----------|
| L-11 | **No custom report builder** | Reports are fixed-format (TB, GL, IS, BS, AR Aging, AP Aging). Users cannot create custom reports or add/remove columns. | Export data from built-in reports and process in Excel. Post-launch improvement. |
| L-12 | **No email notifications** | The system does not send emails (e.g., invoice notifications, approval reminders). All communication is manual. | Manually share PDFs/prints with customers and suppliers. |
| L-13 | **No approval workflow** | Invoice posting does not require multi-step approval. Any user with post permission can post immediately. | RBAC controls who can post. For formal approval workflows, a post-launch enhancement is needed. |
| L-14 | **Print/PDF uses browser print dialog** | Print and PDF export use the browser's native print function. Output quality may vary by browser and printer configuration. | Test on the primary browser and printer before go-live. Chrome generally produces the best results. |

---

## Section 3 — Post-Go-Live Improvements

> These are planned enhancements. None are required for MVP go-live. Prioritized by estimated business impact.

### High Priority (Recommend within 90 days of go-live)

| # | Improvement | Reason |
|---|------------|--------|
| P-01 | **Retained earnings carry-forward automation** | Accountant must perform year-end close manually. Risk of error. Should be automated. |
| P-02 | **Automated backup scheduling** | Backup script exists but requires manual trigger. Automation reduces risk of missed backups. |
| P-03 | **Remove `ignoreBuildErrors: true`** | TypeScript errors silently pass through. Must fix to maintain code quality and catch regressions early. |
| P-04 | **External error monitoring (Sentry or equivalent)** | Proactive error detection. Without it, users must report errors manually before they are noticed. |
| P-05 | **Password complexity enforcement** | Prevent weak passwords from being set in the first place. |

### Medium Priority (Recommend within 6 months)

| # | Improvement | Reason |
|---|------------|--------|
| P-06 | **Upgrade password hashing to bcrypt or Argon2** | Stronger security posture, especially if the Convex database is ever exposed. |
| P-07 | **Automated test suite (Playwright E2E)** | Eliminate manual regression testing per deployment. Enables confident, faster releases. |
| P-08 | **Multi-currency support** | Required for businesses dealing with foreign customers or suppliers. |
| P-09 | **Bank reconciliation module** | Reduces manual reconciliation work and risk of undetected discrepancies. |

### Lower Priority (Backlog — address based on user demand)

| # | Improvement | Reason |
|---|------------|--------|
| P-10 | **Custom report builder** | Enables user-created reports without developer involvement. |
| P-11 | **Multi-factor authentication (TOTP or email OTP)** | Stronger account security, especially for admin accounts. |
| P-12 | **Email notifications** | Invoice delivery, overdue reminders, approval alerts. |
| P-13 | **Approval workflow for invoice posting** | Adds control layer before financial transactions are finalized. |
| P-14 | **Multi-company support** | Required if business structure includes multiple legal entities. |
| P-15 | **LogRocket or session replay integration** | Helps reproduce and debug user-reported issues. |

---

## Section 4 — Actions Required from Project Owner

> The following decisions must be made by the project owner before go-live. These are not technical tasks — they require business decisions.

| # | Decision / Action | Why It's Needed | Deadline |
|---|-------------------|----------------|---------|
| OW-01 | **Choose production hosting platform** (Vercel, Netlify, or self-hosted) | Determines deployment commands, environment variable setup, and SSL configuration. See PRODUCTION-READINESS.md § 4 Step 3. | Before deployment |
| OW-02 | **Choose and configure custom domain** (or confirm using hosting provider's default URL) | Required for SSL configuration and user communication. | Before go-live |
| OW-03 | **Create production Convex project** at dashboard.convex.dev | Must be separate from dev/staging. Production data cannot go into the dev project. | Before deployment |
| OW-04 | **Enable backup retention** in Convex dashboard | Ensures Convex-side backups are retained. See RUNBOOK-BACKUP-RESTORE.md. | Before go-live |
| OW-05 | **Set up automated backup schedule** | `scripts/backup.ps1` exists but must be scheduled. See RUNBOOK-BACKUP-RESTORE.md § 3.3. | Before go-live (recommended) or immediately post-launch |
| OW-06 | **Choose offsite backup storage** (Azure Blob, AWS S3, OneDrive, etc.) | Local backups alone are insufficient for disaster recovery. | Before go-live (recommended) |
| OW-07 | **Finalize chart of accounts** with finance team | Seed data creates a default chart of accounts. It must be reviewed and adjusted to match the real business structure. | Before go-live |
| OW-08 | **Create real user accounts** for all staff | Seed users use `@demo.local` emails and weak passwords. All production users need real accounts with strong passwords. | Before go-live |
| OW-09 | **Review and accept known limitations** in Section 2 | Project owner must formally acknowledge the limitations and accept them as part of the MVP scope. | Before UAT sign-off |
| OW-10 | **Define support escalation path** | Who do users contact when the system is down? What is the SLA for response? | Before go-live |
| OW-11 | **Review `ignoreBuildErrors: true`** and decide: fix now or accept risk in writing | This is a code-quality risk item. Either it gets fixed (recommended) or the owner accepts the risk explicitly. | Before go-live |

---

## Section 5 — Owner Acceptance

> By signing below, the project owner confirms they have read and understood all open items in this document, accept the known limitations in Section 2 for MVP go-live, and commit to addressing the actions in Section 4.

| Field | Value |
|-------|-------|
| Project Owner Name | |
| Signature | |
| Date | |
| Comments / Conditional Acceptances | |

```
____________________________________________________________________________
____________________________________________________________________________
____________________________________________________________________________
```

---

*Related Documents:*
- *GO-LIVE-CHECKLIST.md — gate checklist before switching production traffic*
- *UAT-SIGNOFF.md — formal UAT acceptance*
- *PRODUCTION-READINESS.md — environment setup, security posture, seed data policy*
- *RUNBOOK-BACKUP-RESTORE.md — backup/restore procedures*
- *DEPLOYMENT-CHECKLIST.md — step-by-step deployment and rollback*
