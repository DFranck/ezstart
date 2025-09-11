Write-Host "=== Development Server Status ===" -ForegroundColor Cyan
Write-Host ""

$projects = @(
    @{Name="EZAuth API"; Port=8081; Path="apps/ezauth/api"},
    @{Name="EZ-Billing API"; Port=4101; Path="apps/ez-billing/api"},
    @{Name="Tower Defense API"; Port=4201; Path="apps/tower-defense/api"},
    @{Name="EZStart Web"; Port=3000; Path="apps/ezstart/web"},
    @{Name="EZAuth Web"; Port=4000; Path="apps/ezauth/web"},
    @{Name="EZ-Billing Web"; Port=4100; Path="apps/ez-billing/web"},
    @{Name="Tower Defense Web"; Port=4200; Path="apps/tower-defense/web"},
    @{Name="ASC-TCD Web"; Port=5000; Path="apps/asc-tcd/web"},
    @{Name="FengShui Web"; Port=6000; Path="apps/fengshui/web"}
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
Write-Host "Use: pnpm dev:billing, pnpm dev:td, pnpm dev:ez, etc." -ForegroundColor Yellow