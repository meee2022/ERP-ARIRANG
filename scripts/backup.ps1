# PrimeBalance ERP - Convex Backup Script
# Usage:
#   .\scripts\backup.ps1
#   .\scripts\backup.ps1 -BackupDir "D:\my-backups"
#   .\scripts\backup.ps1 -Label "pre-deploy"
#   .\scripts\backup.ps1 -BackupDir "D:\my-backups" -Label "pre-deploy"
#
# Requirements:
#   - Node.js 18+ in PATH
#   - CONVEX_DEPLOY_KEY environment variable set, or prior 'npx convex login'

param(
    [string]$BackupDir = ".\backups",
    [string]$Label = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────
$MinExpectedSizeBytes = 10240   # 10 KB — flag anything smaller as suspicious
$LogFile = Join-Path $BackupDir "backup.log"

# ──────────────────────────────────────────────
# Build filename
# ──────────────────────────────────────────────
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
if ($Label -ne "") {
    $FileName = "backup-${Timestamp}-${Label}.zip"
} else {
    $FileName = "backup-${Timestamp}.zip"
}

$BackupPath = Join-Path $BackupDir $FileName

# ──────────────────────────────────────────────
# Ensure backup directory exists
# ──────────────────────────────────────────────
if (-not (Test-Path $BackupDir)) {
    Write-Host "[INFO] Creating backup directory: $BackupDir" -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# ──────────────────────────────────────────────
# Check CONVEX_DEPLOY_KEY
# ──────────────────────────────────────────────
if (-not $env:CONVEX_DEPLOY_KEY) {
    Write-Host "[WARN] CONVEX_DEPLOY_KEY is not set. Falling back to 'npx convex login' credentials." -ForegroundColor Yellow
    Write-Host "       If this fails, set the environment variable and retry." -ForegroundColor Yellow
}

# ──────────────────────────────────────────────
# Run the export
# ──────────────────────────────────────────────
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host " PrimeBalance ERP - Convex Backup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host " Timestamp : $Timestamp"
Write-Host " Label     : $(if ($Label) { $Label } else { '(none)' })"
Write-Host " Output    : $BackupPath"
Write-Host ""
Write-Host "[STEP 1/3] Running Convex export..." -ForegroundColor Cyan

try {
    npx convex export --path $BackupPath
    if ($LASTEXITCODE -ne 0) {
        throw "npx convex export exited with code $LASTEXITCODE"
    }
} catch {
    Write-Host ""
    Write-Host "[ERROR] Backup FAILED: $_" -ForegroundColor Red
    $LogEntry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') | FAILED | $BackupPath | Error: $_"
    Add-Content -Path $LogFile -Value $LogEntry -Encoding UTF8
    exit 1
}

# ──────────────────────────────────────────────
# Verify the file was created
# ──────────────────────────────────────────────
Write-Host ""
Write-Host "[STEP 2/3] Verifying backup file..." -ForegroundColor Cyan

if (-not (Test-Path $BackupPath)) {
    Write-Host "[ERROR] Backup file not found at: $BackupPath" -ForegroundColor Red
    Write-Host "        The export command may have succeeded but written to a different path." -ForegroundColor Red
    $LogEntry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') | FAILED | $BackupPath | File not found after export"
    Add-Content -Path $LogFile -Value $LogEntry -Encoding UTF8
    exit 1
}

$FileInfo = Get-Item $BackupPath
$FileSizeBytes = $FileInfo.Length
$FileSizeMB = [math]::Round($FileSizeBytes / 1MB, 2)

if ($FileSizeBytes -lt $MinExpectedSizeBytes) {
    Write-Host "[WARN] Backup file is very small: $FileSizeBytes bytes ($FileSizeMB MB)" -ForegroundColor Yellow
    Write-Host "       This may indicate an empty or corrupted export." -ForegroundColor Yellow
    Write-Host "       Run: .\scripts\verify-backup.ps1 -BackupFile '$BackupPath'" -ForegroundColor Yellow
} else {
    Write-Host "[OK] File exists and size looks reasonable: $FileSizeMB MB" -ForegroundColor Green
}

# ──────────────────────────────────────────────
# Log the backup
# ──────────────────────────────────────────────
Write-Host ""
Write-Host "[STEP 3/3] Logging backup entry..." -ForegroundColor Cyan

$LogEntry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') | SUCCESS | $FileSizeBytes bytes | $BackupPath"
Add-Content -Path $LogFile -Value $LogEntry -Encoding UTF8
Write-Host "[OK] Logged to: $LogFile" -ForegroundColor Green

# ──────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────
Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host " Backup completed successfully!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host " File : $BackupPath"
Write-Host " Size : $FileSizeMB MB"
Write-Host " Log  : $LogFile"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  - Verify: .\scripts\verify-backup.ps1 -BackupFile '$BackupPath'"
Write-Host "  - Copy to offsite storage (see RUNBOOK-BACKUP-RESTORE.md Section 8)"
Write-Host ""
