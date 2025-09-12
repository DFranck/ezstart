Write-Host "Checking occupied ports..." -ForegroundColor Cyan
Write-Host "Web apps: 4100 (ez-billing), 4200 (tower-defense), 4300 (asc-tcd), 4400 (fengshui), 8080 (ezauth)" -ForegroundColor Gray
Write-Host "APIs: 4101 (ez-billing), 4201 (tower-defense), 8081 (ezauth)" -ForegroundColor Gray
netstat -ano | findstr ":4100 :4101 :4200 :4201 :4300 :4400 :8080 :8081"

Write-Host ""
Write-Host "Killing processes on development ports..." -ForegroundColor Yellow

# Get all processes listening on our development ports
$netstatOutput = netstat -ano | Select-String "LISTENING"
# Only kill ports actually used by @ezstart projects
$devPorts = @(":4100", ":4101", ":4200", ":4201", ":4300", ":4400", ":8080", ":8081")

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
                } catch {
                    # Ignore errors
                }
            }
        }
    }
}

Write-Host ""
Write-Host "All development ports cleared!" -ForegroundColor Green
Write-Host "Final port check:" -ForegroundColor Cyan
netstat -ano | findstr ":4100 :4101 :4200 :4201 :4300 :4400 :8080 :8081"