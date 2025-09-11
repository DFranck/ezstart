Write-Host "Checking occupied ports..." -ForegroundColor Cyan
netstat -ano | findstr ":3000 :3100 :3101 :4000 :4100 :4101 :4200 :4201 :5000 :5100 :6000 :6100 :7000 :7100 :8000 :8001 :8080 :8081"

Write-Host ""
Write-Host "Killing processes on development ports..." -ForegroundColor Yellow

# Get all processes listening on our development ports
$netstatOutput = netstat -ano | Select-String "LISTENING"
$devPorts = @(":3000", ":3100", ":3101", ":4000", ":4100", ":4101", ":4200", ":4201", ":5000", ":5100", ":6000", ":6100", ":7000", ":7100", ":8000", ":8001", ":8080", ":8081")

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
netstat -ano | findstr ":3000 :3100 :3101 :4000 :4100 :4101 :4200 :4201 :5000 :5100 :6000 :6100 :7000 :7100 :8000 :8001 :8080 :8081"