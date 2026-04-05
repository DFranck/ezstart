Write-Host "=== Development Server Status ===" -ForegroundColor Cyan
Write-Host ""

$projects = @(
    @{Name="EZAuth API"; Port=6110; Path="apps/ezauth/api"},
    @{Name="EZBill API"; Port=6120; Path="apps/ezbill/api"},
    @{Name="EZStart Web"; Port=6101; Path="apps/ezstart/web"},
    @{Name="EZAuth Web"; Port=6111; Path="apps/ezauth/web"},
    @{Name="EZBill Web"; Port=6121; Path="apps/ezbill/web"},
    @{Name="ASC-TCD Web"; Port=6141; Path="apps/asc-tcd/web"},
    @{Name="FengShui Web"; Port=6151; Path="apps/fengshui/web"}
)

foreach ($project in $projects) {
    $port = $project.Port
    $name = $project.Name
    $path = $project.Path
    
    # Check if port is in use
    $portInUse = netstat -an | Select-String ":$port " | Select-String "LISTENING"
    
    if ($portInUse) {
        Write-Host "✅ $name" -ForegroundColor Green -NoNewline
        Write-Host " (http://localhost:$port)" -ForegroundColor Gray
    } else {
        Write-Host "❌ $name" -ForegroundColor Red -NoNewline  
        Write-Host " (port $port not running)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Use: pnpm dev:bill, pnpm dev:ez, pnpm dev:gp, etc." -ForegroundColor Yellow