Write-Host "=== Kill Ports & Node.js Processes ===" -ForegroundColor Cyan
Write-Host ""

# Get @ezstart ports dynamically from @ezstart/config
Write-Host "Fetching @ezstart ports from config..." -ForegroundColor Gray
try {
    $portsJson = node scripts/get-ezstart-ports.mjs 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Node script failed"
    }
    $ezstartPorts = $portsJson | ConvertFrom-Json

    if ($ezstartPorts.Count -eq 0) {
        Write-Host "Error: No ports found in @ezstart/config" -ForegroundColor Red
        exit 1
    }

    Write-Host "Found $($ezstartPorts.Count) @ezstart ports: $($ezstartPorts -join ', ')" -ForegroundColor Green
} catch {
    Write-Host "Error fetching ports from config: $_" -ForegroundColor Red
    Write-Host "Falling back to hardcoded ports..." -ForegroundColor Yellow
    $ezstartPorts = @(5000, 5005, 5010, 5015, 5020, 5025, 5040, 5045, 5050, 5055, 5065, 5070, 5075, 5080, 5085)
}

Write-Host ""

# Ask if user wants to kill all Node.js processes
Write-Host "Options:" -ForegroundColor Yellow
Write-Host "1. Kill only @ezstart ports (from config)" -ForegroundColor White
Write-Host "2. Kill ALL Node.js processes (nuclear option)" -ForegroundColor Red
Write-Host ""
$choice = Read-Host "Enter choice (1 or 2, default is 1)"

if ($choice -eq "2") {
    Write-Host ""
    Write-Host "Killing ALL Node.js processes..." -ForegroundColor Red

    # Kill all node.exe processes
    $nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        $count = 0
        foreach ($process in $nodeProcesses) {
            Write-Host "Killing Node.js process $($process.Id) - $($process.ProcessName)" -ForegroundColor Red
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
            $count++
        }
        Write-Host "Killed $count Node.js process(es)!" -ForegroundColor Green
    } else {
        Write-Host "No Node.js processes found." -ForegroundColor Gray
    }
} else {
    Write-Host ""
    Write-Host "Checking @ezstart ports..." -ForegroundColor Cyan

    # Show current status
    Write-Host ""
    Write-Host "Current ports in use:" -ForegroundColor Yellow
    $anyPortsInUse = $false
    foreach ($port in $ezstartPorts) {
        $inUse = netstat -ano | Select-String "LISTENING" | Select-String ":$port\s"
        if ($inUse) {
            $anyPortsInUse = $true
            $inUse | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
        }
    }

    if (-not $anyPortsInUse) {
        Write-Host "No @ezstart ports currently in use." -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "Killing processes on @ezstart ports..." -ForegroundColor Yellow

    # Get all processes listening on our development ports
    $netstatOutput = netstat -ano | Select-String "LISTENING"

    $killedAny = $false
    $killedCount = 0
    foreach ($line in $netstatOutput) {
        foreach ($port in $ezstartPorts) {
            if ($line -match ":$port\s") {
                # Extract PID (last column)
                $parts = ($line -replace "\s+", " ").Trim() -split " "
                $processId = $parts[-1]
                if ($processId -and $processId -ne "0") {
                    try {
                        $processName = (Get-Process -Id $processId -ErrorAction SilentlyContinue).ProcessName
                        Write-Host "Killing process $processId ($processName) on port $port" -ForegroundColor Red
                        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                        $killedAny = $true
                        $killedCount++
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
        Write-Host "Killed $killedCount process(es) on @ezstart ports!" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Final port check:" -ForegroundColor Cyan

# Check remaining ports
$remainingPorts = @()
foreach ($port in $ezstartPorts) {
    $inUse = netstat -ano | Select-String "LISTENING" | Select-String ":$port\s"
    if ($inUse) {
        $remainingPorts += $port
        Write-Host "Port $port still in use" -ForegroundColor Yellow
        $inUse | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    }
}

if ($remainingPorts.Count -eq 0) {
    Write-Host "✅ All @ezstart ports are free!" -ForegroundColor Green
} else {
    Write-Host "⚠️  $($remainingPorts.Count) port(s) still in use: $($remainingPorts -join ', ')" -ForegroundColor Yellow
    Write-Host "You may need to manually kill these processes or use option 2 (nuclear)." -ForegroundColor Gray
}

Write-Host ""
Write-Host "Ready to run 'pnpm dev' or 'pnpm dev:ez'" -ForegroundColor Green
