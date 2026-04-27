# PrimeBalance ERP — Production Readiness Guide

> **Last updated:** 2026-04-20  
> **Stack:** Next.js 16 + Convex + Tailwind CSS  
> **Auth:** Email + SHA-256 hashed passwords (custom session in Convex)

---

## 1. System Architecture Overview

```
┌───────────────────────────────────────────────────────────────┐
│                        Browser / Client                       │
│           React (Next.js 16)  +  Tailwind CSS                 │
│           Convex React Client  (real-time subscriptions)      │
└──────────────────────────┬────────────────────────────────────┘
                           │  HTTPS + WebSocket
┌──────────────────────────▼────────────────────────────────────┐
│                    Convex Cloud Backend                        │
│  • Queries / Mutations / Actions (TypeScript, edge-deployed)  │
│  • Built-in document database (schema in convex/schema.ts)    │
│  • Scheduled functions, file storage                          │
│  • Auth: custom email/password (SHA-256 hashed in crypto.ts)  │
└───────────────────────────────────────────────────────────────┘
```

**Key files:**
| File | Purpose |
|---|---|
| `convex/schema.ts` | All database tables and indexes |
| `convex/auth.ts` | Login / session management |
| `convex/lib/crypto.ts` | Password hashing (SHA-256) |
| `convex/lib/permissions.ts` | RBAC — role-based access checks |
| `convex/lib/audit.ts` | Audit log writes |
| `convex/seed.ts` | Initial data + demo data (DEV ONLY) |
| `src/components/providers/convex-provider.tsx` | `NEXT_PUBLIC_CONVEX_URL` read here |

---

## 2. Environment Separation

### 2.1 Local / Development

| Item | Value |
|---|---|
| Convex backend | `npx convex dev` (auto-creates/connects dev deployment) |
| Frontend | `npm run dev` (Next.js dev server, port 3000) |
| `.env.local` | `NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud` (auto-set by Convex CLI) |
| Seed data | **OK** — run `seedInitialData`, then optionally `seedDemoTransactions` |
| Real data | **None** |

### 2.2 Staging

| Item | Value |
|---|---|
| Convex backend | Separate Convex project (`staging-primebalance` or similar) |
| Frontend | Deployed to Vercel preview / Netlify staging branch |
| Env vars | `NEXT_PUBLIC_CONVEX_URL` = staging Convex URL (set in hosting dashboard) |
| Seed data | `seedInitialData` + `seedDemoTransactions` allowed for test validation |
| Real data | **None** — test data only |
| Purpose | Pre-production validation, QA, UAT |

### 2.3 Production

| Item | Value |
|---|---|
| Convex backend | Separate Convex project (`prod-primebalance` or similar) |
| Frontend | Deployed to Vercel / Netlify / self-hosted production domain |
| Env vars | `NEXT_PUBLIC_CONVEX_URL` = production Convex URL |
| Seed data | **NEVER run `seedDemoTransactions`** — see Section 5 |
| `seedInitialData` | Run **once** to create company, chart of accounts, and admin user |
| Real data | Live business data only |

### 2.4 What MUST differ between environments

| Setting | Dev | Staging | Production |
|---|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | dev URL | staging URL | prod URL |
| Convex project | dev project | staging project | prod project |
| Demo/test data | Allowed | Allowed | **FORBIDDEN** |
| `seedDemoTransactions` | OK | OK for QA | **NEVER** |
| Admin password | `admin123` (seed) | Strong test password | **Strong unique password** |
| Error verbosity | Full | Full | Minimal (no stack traces to user) |
| HTTPS | Optional | Required | Required |

> **ACTION NEEDED FROM OWNER:**
> 1. Create a `staging` Convex project at dashboard.convex.dev
> 2. Create a `production` Convex project at dashboard.convex.dev
> 3. Set `NEXT_PUBLIC_CONVEX_URL` correctly in each hosting environment

---

## 3. Pre-Deployment Checklist

Run through these before any production deployment:

- [ ] All TypeScript errors resolved (`npx tsc --noEmit`)
- [ ] Staging environment tested and sign-off received
- [ ] Database schema changes reviewed for backward compatibility
- [ ] No `seedDemoTransactions` call present in deployment scripts
- [ ] Admin user will be created with a **strong password** (not `admin123`)
- [ ] `NEXT_PUBLIC_CONVEX_URL` points to the **production** Convex project
- [ ] Frontend build succeeds locally (`npm run build`)
- [ ] No console errors on critical pages (login, dashboard, invoices)
- [ ] Audit log table confirmed active
- [ ] Session expiry policy confirmed (check `convex/auth.ts`)

---

## 4. Deployment Steps (Exact Order)

### Step 1: Deploy Convex Backend

```powershell
# From: C:\Users\M\Desktop\github for local\khaled finance\app

# Ensure CONVEX_DEPLOYMENT env var is set to the production deployment,
# OR use --prod flag if your project has a production deployment configured.
npx convex deploy
```

This command:
- Pushes all functions under `convex/` to your production Convex project
- Applies any schema changes
- Does NOT wipe existing data

> **If deploying to production for the first time:**
> After `npx convex deploy`, run `seedInitialData` once via the Convex dashboard
> (Functions tab → seedInitialData → Run). Do NOT run `seedDemoTransactions`.

### Step 2: Build the Next.js Frontend

```powershell
# Ensure NEXT_PUBLIC_CONVEX_URL is set in your shell or .env.production
npm run build
```

Check the build output for errors. The build should complete with no TypeScript errors (note: `ignoreBuildErrors: true` is set in `next.config.ts` — **ACTION NEEDED FROM OWNER:** consider removing this flag for production builds to catch errors early).

### Step 3: Deploy the Frontend

**Option A — Vercel (recommended):**
```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Deploy to production
vercel --prod
```
Set `NEXT_PUBLIC_CONVEX_URL` in Vercel Dashboard → Project Settings → Environment Variables.

**Option B — Netlify:**
```bash
npx netlify deploy --prod --dir=.next
```
Set `NEXT_PUBLIC_CONVEX_URL` in Netlify Dashboard → Site Settings → Environment Variables.

**Option C — Self-hosted (Node.js):**
```bash
npm run build
npm run start   # Runs on port 3000 by default
```
Use a reverse proxy (nginx, Caddy) to serve over HTTPS on port 443.

### Step 4: Post-Deployment Verification

See Section 6.

---

## 5. Seed Data Policy

### seedInitialData
- **Safe for production (once):** Creates company, chart of accounts, branches, warehouses, currencies, UoM, and an admin user.
- Has a built-in guard: returns early if a company already exists.
- Run via Convex dashboard → Functions → `seed:seedInitialData` → Run.

### seedDemoTransactions
- **PRODUCTION FORBIDDEN.** Creates ~7 fake sales invoices, 3 purchase invoices, demo customers, and demo journal entries.
- Has a guard that checks for existing `salesInvoices` — but in production the table may be empty, so the guard will not catch a fresh deployment.
- **Guard added in code:** The function now checks for a `CONVEX_ALLOW_SEED` environment variable. See `convex/seed.ts` header comment.

### seedTestUsers
- Creates demo users with weak passwords (`admin123`, `sales123`, etc.).
- **NEVER run in production.** Change the admin password immediately after `seedInitialData`.

> **ACTION NEEDED FROM OWNER:**
> After running `seedInitialData` in production, immediately create a real admin user
> with a strong password via the Settings → Users screen, then deactivate the seed admin user.

---

## 6. Post-Deployment Verification

After each deployment, verify these manually or with automated tests:

| Check | How to verify |
|---|---|
| App loads | Open `https://your-domain.com` — no blank screen, no console errors |
| Login works | Login with admin credentials |
| Dashboard renders | Check KPI cards, charts load data |
| Sales invoice list | Navigate to Sales → Invoices, list loads |
| Purchase invoice list | Navigate to Purchases → Invoices |
| Reports | Run Trial Balance, Income Statement |
| Audit log | Navigate to Settings → Audit Log, entries visible |
| Convex function logs | Check Convex dashboard → Logs for errors |

---

## 7. Rollback Procedure

### 7.1 Rolling Back the Frontend

**Vercel:**
```bash
# List recent deployments
vercel ls

# Promote a previous deployment to production
vercel promote <deployment-url>
```

**Netlify:**
- Dashboard → Deploys → click the previous good deploy → "Publish deploy"

**Self-hosted:**
- Keep the previous build artifact (`.next/` directory).
- Stop the running server, swap in the previous build, restart.

### 7.2 Rolling Back Convex Backend

Convex does not have a one-click rollback command for functions. To revert:

```powershell
# 1. Checkout the previous git commit
git checkout <previous-commit-hash>

# 2. Redeploy the old functions
npx convex deploy

# 3. Restore your branch
git checkout main
```

> **Important:** Convex schema changes that added new fields are non-breaking (old documents simply lack the field). Schema changes that removed fields or changed types require a data migration. Do NOT remove columns from `schema.ts` without first migrating the data.

### 7.3 Data Recovery

Convex provides point-in-time backups accessible via the dashboard (Projects → your project → Backups). Contact Convex support for restore procedures.

> **ACTION NEEDED FROM OWNER:** Enable backup retention in the Convex dashboard before going live.

---

## 8. Data Migration Considerations

| Scenario | Approach |
|---|---|
| Adding a new optional field | Add to `schema.ts`, deploy — existing documents are unaffected |
| Adding a required field | Add as optional first, backfill with a one-time migration mutation, then make required |
| Removing a field | Remove usage from code first, deploy, then remove from schema |
| Renaming a field | Add new field, copy data via migration mutation, remove old field in a later deploy |
| Changing index | Add new index, deploy, verify queries use new index, remove old index |

Always test schema migrations on **staging** before applying to production.

---

## 9. Security Checklist

| Item | Status | Notes |
|---|---|---|
| Passwords hashed | SHA-256 via `convex/lib/crypto.ts` | Good. Consider upgrading to bcrypt/Argon2 for stronger hashing. |
| Password salting | Yes — salt stored alongside hash | Confirmed in `crypto.ts` |
| Session management | Server-side in Convex | Sessions expire — verify timeout value in `convex/auth.ts` |
| RBAC enforced | Yes — `convex/lib/permissions.ts` | All mutations check role |
| Audit logging | Yes — `convex/lib/audit.ts` | Every write is logged |
| HTTPS | Required for production | Enforce via hosting provider or reverse proxy |
| Demo credentials in production | **FORBIDDEN** | Never deploy `admin@demo.local` / `admin123` to prod |
| TypeScript strict mode | `ignoreBuildErrors: true` in next.config.ts | **ACTION NEEDED:** Remove for production builds |
| Secrets in git | `.env.local` must be in `.gitignore` | Verify `.gitignore` excludes `.env.local` |
| Input validation | Convex validators on all mutations (`v.*` from `convex/values`) | Confirmed |
| SQL injection | N/A — Convex uses document DB with typed queries | Not applicable |

> **ACTION NEEDED FROM OWNER:**
> - Verify `.env.local` is listed in `.gitignore`
> - Consider upgrading password hashing from SHA-256 to bcrypt or Argon2
> - Remove `ignoreBuildErrors: true` from `next.config.ts` before launch
