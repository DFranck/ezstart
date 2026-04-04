Write-Host "=== Kill @ezstart Ports ===" -ForegroundColor Cyan
Write-Host ""

# Hardcoded ports — all @ezstart dev ports
$ezstartPorts = @(6100, 6101, 6110, 6111, 6120, 6121, 6130, 6131, 6141, 6151, 6160, 6161, 6170, 6171)

# Also catch fallback ports (+1, +2) that happen when primary port is busy
$allPorts = @()
foreach ($port in $ezstartPorts) {
    $allPorts += $port
    $allPorts += ($port + 1)
    $allPorts += ($port + 2)
}

$killedPids = @{}
$killedCount = 0

foreach ($port in $allPorts) {
    $netstatLines = netstat -ano 2>$null | Select-String "LISTENING" | Select-String ":${port}\b"
    foreach ($line in $netstatLines) {
        $parts = ($line.ToString() -replace "\s+", " ").Trim() -split " "
        $procId = $parts[-1]
        if ($procId -and $procId -ne "0" -and -not $killedPids.ContainsKey($procId)) {
            try {
                $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Host "  Kill PID $procId ($($proc.ProcessName)) on port $port" -ForegroundColor Yellow
                    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                    $killedPids[$procId] = $true
                    $killedCount++
                }
            } catch {}
        }
    }
}

if ($killedCount -eq 0) {
    Write-Host "  No processes found on @ezstart ports." -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "Killed $killedCount process(es)." -ForegroundColor Green
}

# Verify
Start-Sleep -Milliseconds 500
Write-Host ""
$remaining = @()
foreach ($port in $ezstartPorts) {
    $inUse = netstat -ano 2>$null | Select-String "LISTENING" | Select-String ":${port}\b"
    if ($inUse) { $remaining += $port }
}

if ($remaining.Count -eq 0) {
    Write-Host "All ports free. Ready for pnpm dev:*" -ForegroundColor Green
} else {
    Write-Host "Ports still in use: $($remaining -join ', ') - may be system processes" -ForegroundColor Yellow
}
