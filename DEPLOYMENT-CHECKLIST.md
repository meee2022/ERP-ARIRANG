# PrimeBalance ERP — Deployment Checklist

> Use this checklist for every deployment to staging or production.  
> Check off each item as you complete it. Do NOT skip steps.

---

## A. Pre-Deployment

- [ ] **Code review complete.** All changes reviewed and approved.
- [ ] **TypeScript clean.** Run: `npx tsc --noEmit` — must report 0 errors.
- [ ] **Branch is up to date.** `git pull origin main` — no unresolved merge conflicts.
- [ ] **Staging tests passed.** The same code has been validated on the staging environment.
- [ ] **No seed mutations in deploy pipeline.** Confirm no script calls `seedDemoTransactions` or `seedTestUsers` as part of automated deployment.
- [ ] **Environment variables confirmed.** `NEXT_PUBLIC_CONVEX_URL` is set to the correct environment's Convex URL in the hosting dashboard.
- [ ] **Schema changes reviewed.** If `convex/schema.ts` changed, verify backward compatibility (see PRODUCTION-READINESS.md § 8).

---

## B. Deploy Convex Backend

```powershell
# Run from: C:\Users\M\Desktop\github for local\khaled finance\app
npx convex deploy
```

- [ ] Command exited with code 0 (success).
- [ ] No error messages in output.
- [ ] Open Convex Dashboard → Logs — confirm no function errors in the last 2 minutes.
- [ ] If this is the **first production deploy only:**
  - [ ] Run `seedInitialData` once via Convex Dashboard → Functions tab → `seed:seedInitialData` → Run.
  - [ ] Confirm return message: `"Seeded successfully"`.
  - [ ] Do NOT run `seedDemoTransactions` or `seedTestUsers`.

---

## C. Deploy Frontend

### Option A — Vercel

```bash
vercel --prod
```

- [ ] Build completed without errors.
- [ ] Deployment URL returned. Note it: `___________________________`
- [ ] `NEXT_PUBLIC_CONVEX_URL` is set in Vercel Dashboard → Environment Variables (Production).

### Option B — Netlify

```bash
npx netlify deploy --prod --dir=.next
```

- [ ] Build completed without errors.
- [ ] `NEXT_PUBLIC_CONVEX_URL` is set in Netlify → Site Settings → Environment Variables.

### Option C — Self-Hosted

```powershell
npm run build
# Then restart the Node.js process / service
```

- [ ] `npm run build` succeeded.
- [ ] Server restarted and responding on the expected port.

---

## D. Post-Deployment Verification

Perform these checks immediately after deployment. If any fail, proceed to Section E (Rollback).

| # | Check | Pass? |
|---|---|---|
| 1 | App loads at production URL (no blank screen, no 500 error) | [ ] |
| 2 | Login page renders correctly | [ ] |
| 3 | Login works with admin credentials | [ ] |
| 4 | Dashboard KPI cards display data (not loading spinners) | [ ] |
| 5 | Sales → Invoices list loads | [ ] |
| 6 | Purchases → Invoices list loads | [ ] |
| 7 | Reports → Trial Balance generates without error | [ ] |
| 8 | Reports → Income Statement generates without error | [ ] |
| 9 | Settings → Audit Log shows entries | [ ] |
| 10 | Convex Dashboard → Logs: no new errors in last 5 minutes | [ ] |
| 11 | Browser console: no uncaught errors on critical pages | [ ] |

All 11 checks passed? → Deployment complete. Proceed to Section F.

---

## E. Rollback (if issues found in Section D)

### E1. Rollback Frontend

**Vercel:**
```bash
# List deployments
vercel ls

# Promote the last known-good deployment
vercel promote <deployment-url>
```

**Netlify:**
- Dashboard → Deploys → click the previous successful deploy → "Publish deploy"

**Self-hosted:**
- Restore the previous `.next/` build artifact and restart the server.

- [ ] Frontend rolled back. App loads correctly.

### E2. Rollback Convex Backend (if schema or functions changed)

```powershell
# 1. Checkout the previous good commit
git log --oneline -10    # find the commit hash
git checkout <previous-commit-hash>

# 2. Redeploy old functions
npx convex deploy

# 3. Return to main branch
git checkout main
```

- [ ] Convex functions rolled back.
- [ ] Post-deployment verification (Section D) passed on the rolled-back version.

### E3. Escalation

If rollback does not resolve the issue:
- [ ] Open Convex Dashboard → Logs for detailed error traces.
- [ ] Check Convex Dashboard → Backups if data corruption is suspected.
- [ ] Contact Convex support if a data restore is needed.

---

## F. Post-Deployment Sign-Off

- [ ] Deployment verified by: `___________________________` (name)
- [ ] Date / time: `___________________________`
- [ ] Deployment notes (optional):

```
___________________________________________________________________________
___________________________________________________________________________
```

---

## G. First Production Deploy — Additional Steps

> Complete this section ONLY for the very first production deployment.

- [ ] `seedInitialData` ran successfully (company, COA, branches created).
- [ ] Logged in with seed admin (`admin@demo.local` / `admin123`).
- [ ] Created a real admin user with a strong password via Settings → Users.
- [ ] Deactivated the seed admin user (`admin@demo.local`).
- [ ] Confirmed new admin can log in.
- [ ] Removed or deactivated all `@demo.local` accounts.
- [ ] Fiscal year created and opened for the current year.
- [ ] Company name, currency, and address verified in Settings.

---

## H. Recurring Deployment Notes

- Convex handles real-time syncing automatically — no cache flush needed.
- No database migrations are needed for purely additive schema changes.
- For non-additive changes, refer to PRODUCTION-READINESS.md § 8 before deploying.
