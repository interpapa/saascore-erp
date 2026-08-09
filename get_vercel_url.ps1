$vercelToken = "YOUR_VERCEL_TOKEN"
$headers = @{ Authorization = "Bearer $vercelToken" }

Write-Host "Obteniendo datos del proyecto activo en Vercel..."
try {
    $project = Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/prj_9Z1OE5GuADYVd4s5x9iVvizCdKjR" -Headers $headers
    Write-Host "URLs de produccion (Production URLs):"
    $project.targets.production.url | ForEach-Object { Write-Host "https://$_" }
    Write-Host ""
    Write-Host "URLs del proyecto (Project URLs):"
    $project.latestDeployments | Select-Object -First 3 | ForEach-Object { Write-Host "https://$($_.url)" }
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
