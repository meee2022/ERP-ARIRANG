# PrimeBalance ERP - Backup Verification Script
# Usage:
#   .\scripts\verify-backup.ps1 -BackupFile ".\backups\backup-2026-04-20_02-00.zip"
#   .\scripts\verify-backup.ps1 -BackupFile ".\backups\backup-2026-04-20_02-00.zip" -MinSizeMB 0.5
#
# Exit codes:
#   0 = PASS (backup appears valid)
#   1 = FAIL (backup is missing, empty, too small, or unreadable)

param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,

    [double]$MinSizeMB = 0.01   # 10 KB minimum — override for large known datasets
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Passed = $true
$Issues = @()

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host " PrimeBalance ERP - Verify Backup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host " File: $BackupFile"
Write-Host ""

# ──────────────────────────────────────────────
# Check 1: File exists
# ──────────────────────────────────────────────
Write-Host "[CHECK 1/4] File exists..." -NoNewline

if (-not (Test-Path $BackupFile)) {
    Write-Host " FAIL" -ForegroundColor Red
    $Issues += "File not found: $BackupFile"
    $Passed = $false
} else {
    Write-Host " PASS" -ForegroundColor Green
}

if (-not $Passed) {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Red
    Write-Host " RESULT: FAIL" -ForegroundColor Red
    Write-Host "======================================" -ForegroundColor Red
    foreach ($Issue in $Issues) {
        Write-Host "  - $Issue" -ForegroundColor Red
    }
    Write-Host ""
    exit 1
}

# ──────────────────────────────────────────────
# Check 2: File size is above minimum
# ──────────────────────────────────────────────
Write-Host "[CHECK 2/4] File size..." -NoNewline

$FileInfo    = Get-Item $BackupFile
$SizeBytes   = $FileInfo.Length
$SizeMB      = [math]::Round($SizeBytes / 1MB, 3)
$MinSizeBytes = [long]($MinSizeMB * 1MB)

Write-Host " $SizeMB MB" -NoNewline

if ($SizeBytes -eq 0) {
    Write-Host " — FAIL (file is empty)" -ForegroundColor Red
    $Issues += "File is empty (0 bytes)"
    $Passed = $false
} elseif ($SizeBytes -lt $MinSizeBytes) {
    Write-Host " — WARN (below minimum $MinSizeMB MB)" -ForegroundColor Yellow
    $Issues += "File is smaller than minimum expected size ($SizeMB MB < $MinSizeMB MB). May be an incomplete export."
    # Treat as warning, not failure — operator can decide
} else {
    Write-Host " — PASS" -ForegroundColor Green
}

# ──────────────────────────────────────────────
# Check 3: Valid ZIP archive
# ──────────────────────────────────────────────
Write-Host "[CHECK 3/4] ZIP archive integrity..." -NoNewline

try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($BackupFile)
    $Entries = $zip.Entries
    $EntryCount = $Entries.Count

    if ($EntryCount -eq 0) {
        Write-Host " FAIL (ZIP is valid but contains no files)" -ForegroundColor Red
        $Issues += "ZIP archive is empty (0 entries)"
        $Passed = $false
    } else {
        Write-Host " PASS ($EntryCount file(s) inside)" -ForegroundColor Green
    }

    # ──────────────────────────────────────────────
    # Check 4: List entries (table files)
    # ──────────────────────────────────────────────
    Write-Host "[CHECK 4/4] Listing archive contents..."

    $TableFiles  = @()
    $OtherFiles  = @()

    foreach ($Entry in $Entries) {
        $EntrySize = [math]::Round($Entry.Length / 1KB, 1)
        if ($Entry.Name -match "\.(jsonl|json|csv)$") {
            $TableFiles += [PSCustomObject]@{ Name = $Entry.Name; SizeKB = $EntrySize }
        } else {
            $OtherFiles += [PSCustomObject]@{ Name = $Entry.Name; SizeKB = $EntrySize }
        }
    }

    if ($TableFiles.Count -gt 0) {
        Write-Host ""
        Write-Host "  Table / data files found ($($TableFiles.Count)):" -ForegroundColor Cyan
        foreach ($T in $TableFiles | Sort-Object Name) {
            Write-Host ("    {0,-45} {1,8} KB" -f $T.Name, $T.SizeKB)
        }
    } else {
        Write-Host "  No .jsonl/.json/.csv files found inside the archive." -ForegroundColor Yellow
        Write-Host "  This may be normal if Convex uses a different format, or may indicate a problem." -ForegroundColor Yellow
    }

    if ($OtherFiles.Count -gt 0) {
        Write-Host ""
        Write-Host "  Other files ($($OtherFiles.Count)):" -ForegroundColor Gray
        foreach ($F in $OtherFiles) {
            Write-Host ("    {0,-45} {1,8} KB" -f $F.Name, $F.SizeKB) -ForegroundColor Gray
        }
    }

    $zip.Dispose()

} catch {
    Write-Host " FAIL" -ForegroundColor Red
    $Issues += "Could not open ZIP archive: $_"
    $Passed = $false
}

# ──────────────────────────────────────────────
# Result
# ──────────────────────────────────────────────
Write-Host ""

if ($Passed -and $Issues.Count -eq 0) {
    Write-Host "======================================" -ForegroundColor Green
    Write-Host " RESULT: PASS" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Green
    Write-Host " Backup file appears valid." -ForegroundColor Green
    Write-Host ""
    exit 0
} elseif ($Passed -and $Issues.Count -gt 0) {
    Write-Host "======================================" -ForegroundColor Yellow
    Write-Host " RESULT: PASS WITH WARNINGS" -ForegroundColor Yellow
    Write-Host "======================================" -ForegroundColor Yellow
    Write-Host " Warnings (review before using this backup for restore):" -ForegroundColor Yellow
    foreach ($Issue in $Issues) {
        Write-Host "  - $Issue" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host " Consider doing a test restore to staging to confirm." -ForegroundColor Yellow
    Write-Host ""
    exit 0
} else {
    Write-Host "======================================" -ForegroundColor Red
    Write-Host " RESULT: FAIL" -ForegroundColor Red
    Write-Host "======================================" -ForegroundColor Red
    Write-Host " This backup should NOT be used for restore:" -ForegroundColor Red
    foreach ($Issue in $Issues) {
        Write-Host "  - $Issue" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host " Use a different backup file. See: .\backups\backup.log" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
