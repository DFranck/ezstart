Write-Host "=== Development Server Status ===" -ForegroundColor Cyan
Write-Host ""

$projects = @(
    @{Name="EZAuth API"; Port=5010; Path="apps/ezauth/api"},
    @{Name="EZ-Billing API"; Port=5020; Path="apps/ez-billing/api"},
    @{Name="Tower Defense API"; Port=5030; Path="apps/tower-defense/api"},
    @{Name="EZStart Web"; Port=5045; Path="apps/ezstart/web"},
    @{Name="EZAuth Web"; Port=5015; Path="apps/ezauth/web"},
    @{Name="EZ-Billing Web"; Port=5025; Path="apps/ez-billing/web"},
    @{Name="Tower Defense Web"; Port=5035; Path="apps/tower-defense/web"},
    @{Name="ASC-TCD Web"; Port=5055; Path="apps/asc-tcd/web"},
    @{Name="FengShui Web"; Port=5065; Path="apps/fengshui/web"}
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