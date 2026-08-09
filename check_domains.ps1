$vercelToken = "YOUR_VERCEL_TOKEN"
$headers = @{ Authorization = "Bearer $vercelToken" }
$projectId = "prj_9Z1OE5GuADYVd4s5x9iVvizCdKjR"

Write-Host "Obteniendo dominios del proyecto..."
try {
    $domains = Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$projectId/domains" -Headers $headers
    $domains.domains | ForEach-Object { Write-Host "- $($_.name)" }
} catch {
    Write-Host "Error obteniendo dominios: $($_.Exception.Message)"
}
