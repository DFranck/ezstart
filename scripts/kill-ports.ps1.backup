Write-Host "=== Kill Ports & Node.js Processes ===" -ForegroundColor Cyan
Write-Host ""

# Ask if user wants to kill all Node.js processes
Write-Host "Options:" -ForegroundColor Yellow
Write-Host "1. Kill only @ezstart ports (50xx range)" -ForegroundColor White
Write-Host "2. Kill ALL Node.js processes (nuclear option)" -ForegroundColor Red
Write-Host ""
$choice = Read-Host "Enter choice (1 or 2, default is 1)"

if ($choice -eq "2") {
    Write-Host ""
    Write-Host "Killing ALL Node.js processes..." -ForegroundColor Red
    
    # Kill all node.exe processes
    $nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        foreach ($process in $nodeProcesses) {
            Write-Host "Killing Node.js process $($process.Id) - $($process.ProcessName)" -ForegroundColor Red
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
        Write-Host "All Node.js processes killed!" -ForegroundColor Green
    } else {
        Write-Host "No Node.js processes found." -ForegroundColor Gray
    }
} else {
    Write-Host ""
    Write-Host "Checking @ezstart ports (50xx range)..." -ForegroundColor Cyan
    Write-Host "APIs: 5010 (ezauth), 5020 (ezbill), 5030 (tower-defense)" -ForegroundColor Gray
    Write-Host "Web apps: 5015 (ezauth), 5025 (ezbill), 5035 (tower-defense)" -ForegroundColor Gray
    Write-Host "Web apps: 5045 (ezstart), 5055 (asc-tcd), 5065 (fengshui)" -ForegroundColor Gray
    
    # Show current status
    netstat -ano | findstr ":5010 :5015 :5020 :5025 :5030 :5035 :5045 :5055 :5065"
    
    Write-Host ""
    Write-Host "Killing processes on development ports..." -ForegroundColor Yellow
    
    # Get all processes listening on our development ports
    $netstatOutput = netstat -ano | Select-String "LISTENING"
    # Updated ports to 50xx range
    $devPorts = @(":5010", ":5015", ":5020", ":5025", ":5030", ":5035", ":5045", ":5055", ":5065")
    
    $killedAny = $false
    foreach ($line in $netstatOutput) {
        foreach ($port in $devPorts) {
            if ($line -match $port) {
                # Extract PID (last column)
                $parts = ($line -replace "\s+", " ").Trim() -split " "
                $processId = $parts[-1]
                if ($processId -and $processId -ne "0") {
                    try {
                        Write-Host "Killing process $processId on port $port" -ForegroundColor Red
                        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                        $killedAny = $true
                    } catch {
                        # Ignore errors
                    }
                }
            }
        }
    }
    
    if (-not $killedAny) {
        Write-Host "No processes found on @ezstart ports." -ForegroundColor Gray
    } else {
        Write-Host "All @ezstart ports cleared!" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Final port check (50xx range):" -ForegroundColor Cyan
netstat -ano | findstr ":5010 :5015 :5020 :5025 :5030 :5035 :5045 :5055 :5065"

$remaining = netstat -ano | findstr ":5010 :5015 :5020 :5025 :5030 :5035 :5045 :5055 :5065"
if (-not $remaining) {
    Write-Host "✅ All ports are free!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Ready to run 'pnpm dev' or 'pnpm dev:types'" -ForegroundColor Green