# PrimeBalance ERP — Backup & Restore Runbook

**Version:** 1.0  
**Last Updated:** 2026-04-20  
**Applies to:** Convex backend (all tables) + Next.js frontend (stateless)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [What Is Backed Up](#2-what-is-backed-up)
3. [Backup Procedure](#3-backup-procedure)
4. [Restore Procedure](#4-restore-procedure)
5. [Backup Verification](#5-backup-verification)
6. [RPO / RTO Estimates](#6-rpo--rto-estimates)
7. [Disaster Recovery Scenarios](#7-disaster-recovery-scenarios)
8. [Offsite / Cloud Storage](#8-offsite--cloud-storage)
9. [Script Reference](#9-script-reference)

---

## 1. Architecture Overview

| Layer | Technology | Backup needed? |
|-------|-----------|---------------|
| Database + API | Convex (cloud-hosted) | **Yes** — snapshot export |
| Frontend | Next.js 16 (Vercel / Netlify) | No — code is in Git |
| Auth | Convex sessions table | Covered by DB snapshot |

The frontend is stateless (all state lives in Convex). Restoring the Convex snapshot is a **full system restore**.

---

## 2. What Is Backed Up

A Convex snapshot export captures **every document in every table** at a point in time. Tables covered:

```
companies           branches            warehouses
accounts            customers           customerOutlets
suppliers           items               itemCategories
unitsOfMeasure      salesInvoices       salesInvoiceLines
salesReturns        salesReturnLines    purchaseInvoices
purchaseInvoiceLines purchaseReturns    purchaseReturnLines
grn                 grnLines            cashReceiptVouchers
cashPaymentVouchers bankTransfers       cheques
journalEntries      journalEntryLines   stockAdjustments
stockBalance        accountingPeriods   fiscalYears
sessions            users               auditLogs
```

> **Not included:** Convex function code (that lives in Git), environment variables (document separately), and any uploaded files stored via Convex file storage (if used — verify separately).

---

## 3. Backup Procedure

### 3.1 Prerequisites

- Node.js 18+ installed
- `npx convex` available (comes with the `convex` npm package)
- `CONVEX_DEPLOY_KEY` environment variable set **or** logged in via `npx convex login`
- Write access to the backup destination directory

> **ACTION NEEDED FROM OWNER:** Store `CONVEX_DEPLOY_KEY` (production deploy key) in a secure secrets manager (e.g., Azure Key Vault, AWS Secrets Manager, or a password manager). Never commit it to Git.

### 3.2 Backup Command

```powershell
npx convex export --path ".\backups\backup-YYYY-MM-DD_HH-mm.zip"
```

The export produces a single `.zip` file containing all table data in JSONL format.

### 3.3 Recommended Backup Schedule

| Environment | Frequency | When |
|-------------|-----------|------|
| Production | Daily | Off-peak hours (e.g., 02:00 local time) |
| Production | Pre-deployment | Before every `npx convex deploy` |
| Production | Pre-migration | Before any schema change |
| Staging | On demand | Before testing destructive operations |

> **ACTION NEEDED FROM OWNER:** Set up a scheduled task (Windows Task Scheduler, GitHub Actions cron, or Azure Automation) to run `scripts/backup.ps1` daily. The script path and credentials must be configured in that scheduler.

### 3.4 Backup Naming Convention

```
backup-YYYY-MM-DD_HH-mm-<environment>.zip
```

Examples:
- `backup-2026-04-20_02-00-prod.zip`
- `backup-2026-04-20_14-30-staging.zip`
- `backup-2026-04-20_pre-deploy-prod.zip`

### 3.5 Using the Helper Script

```powershell
# Default backup to ./backups/ directory
.\scripts\backup.ps1

# Custom backup directory
.\scripts\backup.ps1 -BackupDir "D:\primebalance-backups"

# Label the backup (e.g., pre-deploy)
.\scripts\backup.ps1 -Label "pre-deploy"
```

The script automatically:
- Creates the backup directory if it doesn't exist
- Generates a timestamped filename
- Verifies the file was created and shows its size
- Appends an entry to `backups/backup.log`

---

## 4. Restore Procedure

> **WARNING: A Convex import is a FULL REPLACEMENT. All current data will be deleted and replaced with the snapshot. There is no partial restore. This operation is irreversible without another backup.**

### 4.1 Pre-Restore Checklist

Before running any restore:

- [ ] Confirm you have the correct backup file for the target environment
- [ ] Verify the backup file with `scripts/verify-backup.ps1` (see Section 5)
- [ ] **Take a fresh backup of the current state** before overwriting it
- [ ] Notify all users that the system will be temporarily unavailable
- [ ] Confirm the target Convex deployment URL (do NOT restore prod backup to prod accidentally — double-check if cloning to staging)
- [ ] Have the `CONVEX_DEPLOY_KEY` or be logged in via `npx convex login`

### 4.2 Restore Command

```powershell
npx convex import --path ".\backups\backup-2026-04-20_02-00-prod.zip" --yes
```

The `--yes` flag skips the interactive confirmation prompt. **Omit it** if you want Convex to ask for confirmation before proceeding.

### 4.3 Using the Helper Script

```powershell
.\scripts\restore.ps1 -BackupFile ".\backups\backup-2026-04-20_02-00-prod.zip"
```

The script:
1. Displays warnings and the backup file details
2. Asks for explicit typed confirmation (`YES` — uppercase)
3. Optionally takes a safety backup of current state first
4. Runs the import
5. Prints post-restore verification steps

### 4.4 Post-Restore Verification Steps

After restore completes:

1. **Check critical tables exist and have reasonable row counts**

   Open the [Convex Dashboard](https://dashboard.convex.dev) → your deployment → Data tab.  
   Verify these tables are populated:
   - `companies` — at least 1 row
   - `users` — matches expected user count
   - `fiscalYears` — correct fiscal years present
   - `salesInvoices` — count matches pre-backup records
   - `accounts` — chart of accounts populated

2. **Test login** — open the app and sign in with a known user account

3. **Open a key report** — e.g., Trial Balance or Sales Report — confirm data renders correctly

4. **Check `auditLogs`** — confirm the most recent entries match the backup date, not a later date (which would indicate unexpected data)

5. **Test a write operation** — create a test entry (e.g., a draft invoice), confirm it saves successfully

> **ACTION NEEDED FROM OWNER:** Define the exact expected row counts for critical tables (companies, fiscalYears, users) to make post-restore verification objective and fast.

---

## 5. Backup Verification

### 5.1 Using the Verification Script

```powershell
.\scripts\verify-backup.ps1 -BackupFile ".\backups\backup-2026-04-20_02-00-prod.zip"
```

The script checks:
- File exists at the given path
- File size is above the minimum threshold (default: 10 KB)
- File is a valid ZIP archive (readable)
- Lists JSONL files inside the archive (one per table)
- Reports PASS or FAIL with details

### 5.2 Manual Verification

```powershell
# Check file size (should be several MB for a real database)
(Get-Item ".\backups\backup-2026-04-20_02-00-prod.zip").Length / 1MB

# List contents (requires Expand-Archive or 7-Zip)
$zip = [System.IO.Compression.ZipFile]::OpenRead(".\backups\backup-2026-04-20_02-00-prod.zip")
$zip.Entries | Select-Object Name, Length
$zip.Dispose()
```

### 5.3 Test Restore to Staging (Gold Standard)

The most reliable verification is importing the backup to a staging deployment:

```powershell
# Set staging deploy key
$env:CONVEX_DEPLOY_KEY = "your-staging-deploy-key"

# Import backup to staging
npx convex import --path ".\backups\backup-2026-04-20_02-00-prod.zip" --yes
```

> **ACTION NEEDED FROM OWNER:** Schedule a monthly test restore to staging to confirm backups are actually restorable.

---

## 6. RPO / RTO Estimates

### Recovery Point Objective (RPO)

> **How much data can we afford to lose?**

| Backup Schedule | RPO |
|----------------|-----|
| Daily at 02:00 | Up to ~22 hours of data (worst case: failure at 01:59) |
| Pre-deployment backup | 0 data loss for deployment-related incidents |
| Pre-migration backup | 0 data loss for migration-related incidents |

**Recommended RPO target:** ≤ 24 hours for general operations. For high-volume transaction periods, consider reducing to 4–6 hour intervals.

> **ACTION NEEDED FROM OWNER:** Decide acceptable RPO. If < 24h is required, implement more frequent automated backups or evaluate Convex's built-in point-in-time recovery (check Convex Pro plan features).

### Recovery Time Objective (RTO)

> **How quickly must we restore service?**

Estimated restore timeline:

| Step | Time Estimate |
|------|--------------|
| Identify correct backup file | 2–5 min |
| Run verification script | 1–2 min |
| Take safety backup of current state | 3–10 min (depends on DB size) |
| Run `npx convex import` | 5–20 min (depends on data volume) |
| Post-restore verification | 5–10 min |
| **Total RTO** | **~15–47 minutes** |

**Recommended RTO target:** ≤ 1 hour for a full restore.

> **ACTION NEEDED FROM OWNER:** Test a full restore cycle once and record actual times to replace these estimates with measured values.

---

## 7. Disaster Recovery Scenarios

### Scenario 1: Accidental Data Deletion

**Situation:** A user or admin accidentally deleted records (e.g., cleared all sales invoices for a branch, deleted a chart of accounts).

**Recovery Steps:**

1. **Stop further writes if possible** — ask users to pause work to minimize additional data divergence
2. Identify the last good backup:
   ```powershell
   Get-ChildItem ".\backups\" | Sort-Object LastWriteTime -Descending | Select-Object -First 5
   ```
3. Verify the backup:
   ```powershell
   .\scripts\verify-backup.ps1 -BackupFile ".\backups\backup-2026-04-20_02-00-prod.zip"
   ```
4. Take a safety snapshot of current state (even corrupted state):
   ```powershell
   .\scripts\backup.ps1 -Label "pre-restore-safety"
   ```
5. Run the restore:
   ```powershell
   .\scripts\restore.ps1 -BackupFile ".\backups\backup-2026-04-20_02-00-prod.zip"
   ```
6. Perform post-restore verification (Section 4.4)
7. Notify users that service is restored; inform them of the data cutoff point

**Data loss:** All transactions entered after the backup timestamp will be lost. These must be re-entered manually.

> **ACTION NEEDED FROM OWNER:** Define escalation contacts and communication templates for user notification during outages.

---

### Scenario 2: Bad Deployment Corrupts Data

**Situation:** A code deployment introduced a bug (e.g., a mutation that incorrectly updates records) and has already modified production data.

**Recovery Steps:**

1. **Immediately roll back the Convex functions** to the last known-good deployment:
   ```powershell
   # Check out the previous good commit
   git checkout <last-good-commit-sha>

   # Redeploy the previous version
   npx convex deploy
   ```
   This stops further data corruption from new writes.

2. Assess the damage:
   - When did the bad deployment go live?
   - Which tables and records were affected?
   - Is the corruption contained or widespread?

3. If damage is widespread — restore from pre-deployment backup:
   ```powershell
   # The pre-deploy backup should exist (if pre-deploy backup policy was followed)
   .\scripts\restore.ps1 -BackupFile ".\backups\backup-2026-04-20_pre-deploy-prod.zip"
   ```

4. If damage is limited — consider targeted manual correction via Convex Dashboard or a one-off migration script rather than full restore (to avoid losing valid transactions).

5. After restore or manual fix, redeploy the correct version of the code.

6. Perform post-restore verification (Section 4.4).

> **ACTION NEEDED FROM OWNER:** Enforce the "take a backup before every deployment" policy. The `scripts/backup.ps1 -Label pre-deploy` command should be part of every deployment checklist.

---

### Scenario 3: Clone Production to Staging

**Situation:** You need a copy of production data in the staging environment for testing, debugging, or UAT.

**Steps:**

1. Export from production:
   ```powershell
   # Ensure CONVEX_DEPLOY_KEY is set to the PRODUCTION deploy key
   $env:CONVEX_DEPLOY_KEY = "prod-deploy-key-here"
   .\scripts\backup.ps1 -Label "prod-to-staging-clone"
   ```

2. Switch to the staging deploy key:
   ```powershell
   $env:CONVEX_DEPLOY_KEY = "staging-deploy-key-here"
   ```

3. Import to staging — **confirm you are targeting staging, not production**:
   ```powershell
   .\scripts\restore.ps1 -BackupFile ".\backups\backup-2026-04-20_prod-to-staging-clone.zip"
   ```
   The restore script will display the current `CONVEX_DEPLOY_KEY` environment variable — verify it before confirming.

4. Update any staging-specific configuration (e.g., email settings, test payment gateway keys) to prevent staging from sending real emails or charging real accounts.

> **WARNING:** Staging will contain real customer and financial data after the clone. Ensure staging access is restricted to authorized staff only. Consider anonymizing sensitive fields if staging is shared more broadly.

> **ACTION NEEDED FROM OWNER:** Define who has access to staging, and whether data anonymization is required before sharing staging access with external testers or contractors.

---

## 8. Offsite / Cloud Storage

Local backups are not sufficient — hardware failure, accidental deletion of the backups directory, or ransomware can destroy local copies.

**Recommended offsite options:**

| Option | Cost | Complexity | Notes |
|--------|------|-----------|-------|
| Azure Blob Storage | Low | Low | `azcopy` or Azure Storage Explorer |
| AWS S3 | Low | Low | `aws s3 cp` or AWS CLI |
| Google Cloud Storage | Low | Low | `gsutil cp` |
| OneDrive / SharePoint | Free (M365) | Very low | Simple drag-and-drop or CLI sync |
| Backblaze B2 | Very low | Low | Good price/GB ratio |

**Minimum recommendation:** Copy each backup to at least one offsite location immediately after creation. Retain:
- Daily backups: 30 days
- Weekly backups: 3 months
- Monthly backups: 1 year

> **ACTION NEEDED FROM OWNER:** Choose an offsite storage provider, set up credentials, and add an upload step to `scripts/backup.ps1` (or a separate `scripts/offsite-sync.ps1`). Also define a retention/deletion policy to prevent unbounded storage growth.

---

## 9. Script Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/backup.ps1` | Create a timestamped Convex snapshot | `.\scripts\backup.ps1 [-BackupDir <path>] [-Label <label>]` |
| `scripts/restore.ps1` | Restore from a snapshot with safety confirmations | `.\scripts\restore.ps1 -BackupFile <path>` |
| `scripts/verify-backup.ps1` | Verify a backup file is valid | `.\scripts\verify-backup.ps1 -BackupFile <path>` |

All scripts require:
- Node.js 18+ in PATH
- `npx convex` available (install via `npm install -g convex` or use project's local install)
- `CONVEX_DEPLOY_KEY` environment variable set, or prior `npx convex login`

---

*End of Runbook*
