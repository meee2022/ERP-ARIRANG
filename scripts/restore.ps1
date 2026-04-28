# PrimeBalance ERP - Convex Restore Script
# Usage:
#   .\scripts\restore.ps1 -BackupFile ".\backups\backup-2026-04-20_02-00.zip"
#
# Requirements:
#   - Node.js 18+ in PATH
#   - CONVEX_DEPLOY_KEY environment variable set, or prior 'npx convex login'
#
# WARNING: This script performs a FULL REPLACEMENT of all data in the target
# Convex deployment. All current data will be permanently deleted and replaced
# with the contents of the backup file.

param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,

    [switch]$SkipSafetyBackup
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ──────────────────────────────────────────────
# Header
# ──────────────────────────────────────────────
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Red
Write-Host " PrimeBalance ERP - Convex Restore" -ForegroundColor Red
Write-Host "==========================================================" -ForegroundColor Red
Write-Host ""
Write-Host " !! WARNING: DESTRUCTIVE OPERATION !!" -ForegroundColor Red
Write-Host ""
Write-Host " This will PERMANENTLY DELETE all current data in the" -ForegroundColor Yellow
Write-Host " target Convex deployment and replace it with the backup." -ForegroundColor Yellow
Write-Host ""
Write-Host " There is NO UNDO except restoring from another backup." -ForegroundColor Yellow
Write-Host ""

# ──────────────────────────────────────────────
# Verify backup file exists
# ──────────────────────────────────────────────
Write-Host "----------------------------------------------------------"
Write-Host "Backup file : $BackupFile"

if (-not (Test-Path $BackupFile)) {
    Write-Host ""
    Write-Host "[ERROR] Backup file not found: $BackupFile" -ForegroundColor Red
    Write-Host "        Check the path and try again." -ForegroundColor Red
    exit 1
}

$FileInfo = Get-Item $BackupFile
$FileSizeMB = [math]::Round($FileInfo.Length / 1MB, 2)
$FileDate   = $FileInfo.LastWriteTime

Write-Host "File size   : $FileSizeMB MB"
Write-Host "File date   : $FileDate"
Write-Host ""

# ──────────────────────────────────────────────
# Show target deployment
# ──────────────────────────────────────────────
Write-Host "Target deployment (CONVEX_DEPLOY_KEY):"
if ($env:CONVEX_DEPLOY_KEY) {
    # Show only a masked version for safety
    $Key = $env:CONVEX_DEPLOY_KEY
    $MaskedKey = $Key.Substring(0, [Math]::Min(8, $Key.Length)) + "..." + $Key.Substring([Math]::Max(0, $Key.Length - 4))
    Write-Host "  $MaskedKey" -ForegroundColor Yellow
} else {
    Write-Host "  (not set — using 'npx convex login' credentials)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "[WARN] CONVEX_DEPLOY_KEY is not set." -ForegroundColor Yellow
    Write-Host "       Make sure you are targeting the correct deployment." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "----------------------------------------------------------"
Write-Host ""

# ──────────────────────────────────────────────
# Pre-restore verification
# ──────────────────────────────────────────────
Write-Host "[STEP 1/4] Verifying backup file integrity..." -ForegroundColor Cyan

try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($BackupFile)
    $EntryCount = $zip.Entries.Count
    $zip.Dispose()

    if ($EntryCount -eq 0) {
        Write-Host "[ERROR] The backup ZIP file is empty (0 entries)." -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] ZIP archive is readable. Contains $EntryCount file(s)." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Could not open backup file as a ZIP archive: $_" -ForegroundColor Red
    Write-Host "        The file may be corrupted or not a valid Convex export." -ForegroundColor Red
    exit 1
}

Write-Host ""

# ──────────────────────────────────────────────
# Safety backup of current state
# ──────────────────────────────────────────────
if (-not $SkipSafetyBackup) {
    Write-Host "[STEP 2/4] Taking safety backup of current state..." -ForegroundColor Cyan
    Write-Host "           (skip with -SkipSafetyBackup flag if current state is already corrupt)"
    Write-Host ""

    $SafetyLabel = "pre-restore-safety-$(Get-Date -Format 'HH-mm-ss')"
    try {
        & "$PSScriptRoot\backup.ps1" -Label $SafetyLabel
        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Host "[WARN] Safety backup failed (exit code $LASTEXITCODE)." -ForegroundColor Yellow
            Write-Host "       You chose to continue without a safety backup." -ForegroundColor Yellow
            Write-Host "       Type 'CONTINUE' to proceed anyway, or press Ctrl+C to abort:" -ForegroundColor Yellow
            $SafetyConfirm = Read-Host
            if ($SafetyConfirm -ne "CONTINUE") {
                Write-Host "Restore aborted." -ForegroundColor Yellow
                exit 0
            }
        }
    } catch {
        Write-Host ""
        Write-Host "[WARN] Safety backup threw an error: $_" -ForegroundColor Yellow
        Write-Host "       Type 'CONTINUE' to proceed without safety backup, or press Ctrl+C to abort:" -ForegroundColor Yellow
        $SafetyConfirm = Read-Host
        if ($SafetyConfirm -ne "CONTINUE") {
            Write-Host "Restore aborted." -ForegroundColor Yellow
            exit 0
        }
    }
} else {
    Write-Host "[STEP 2/4] Skipping safety backup (-SkipSafetyBackup flag set)." -ForegroundColor Yellow
}

Write-Host ""

# ──────────────────────────────────────────────
# Final confirmation
# ──────────────────────────────────────────────
Write-Host "[STEP 3/4] Final confirmation required." -ForegroundColor Cyan
Write-Host ""
Write-Host " You are about to restore:" -ForegroundColor White
Write-Host "   $BackupFile" -ForegroundColor White
Write-Host ""
Write-Host " This will ERASE all current data and replace it." -ForegroundColor Red
Write-Host ""
Write-Host " Type exactly  YES  (uppercase) and press Enter to proceed." -ForegroundColor Yellow
Write-Host " Type anything else or press Ctrl+C to abort." -ForegroundColor Yellow
Write-Host ""

$Confirmation = Read-Host "Confirm"

if ($Confirmation -ne "YES") {
    Write-Host ""
    Write-Host "Restore aborted. No changes were made." -ForegroundColor Green
    exit 0
}

Write-Host ""

# ──────────────────────────────────────────────
# Run the import
# ──────────────────────────────────────────────
Write-Host "[STEP 4/4] Running Convex import..." -ForegroundColor Cyan
Write-Host ""

try {
    npx convex import --path $BackupFile --yes
    if ($LASTEXITCODE -ne 0) {
        throw "npx convex import exited with code $LASTEXITCODE"
    }
} catch {
    Write-Host ""
    Write-Host "[ERROR] Restore FAILED: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "The system may be in a partial state. Options:" -ForegroundColor Yellow
    Write-Host "  1. Retry: .\scripts\restore.ps1 -BackupFile '$BackupFile' -SkipSafetyBackup"
    Write-Host "  2. Restore the safety backup taken in Step 2 (check .\backups\ for pre-restore-safety-*.zip)"
    Write-Host "  3. Contact Convex support if the issue persists."
    exit 1
}

# ──────────────────────────────────────────────
# Post-restore guidance
# ──────────────────────────────────────────────
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " Restore completed!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Post-restore verification checklist:" -ForegroundColor Cyan
Write-Host "  [ ] Open Convex Dashboard -> Data tab"
Write-Host "      Verify these tables have data:"
Write-Host "      companies, users, fiscalYears, accounts, salesInvoices"
Write-Host ""
Write-Host "  [ ] Open the application and test login"
Write-Host ""
Write-Host "  [ ] Open a key report (Trial Balance, Sales Report)"
Write-Host "      Confirm data renders correctly"
Write-Host ""
Write-Host "  [ ] Check auditLogs — most recent entries should match"
Write-Host "      the backup date (not a later date)"
Write-Host ""
Write-Host "  [ ] Create a test entry (draft invoice) and confirm it saves"
Write-Host ""
Write-Host "See RUNBOOK-BACKUP-RESTORE.md Section 4.4 for full details." -ForegroundColor Cyan
Write-Host ""
