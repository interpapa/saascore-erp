$vercelToken = "YOUR_VERCEL_TOKEN"
$headers = @{ Authorization = "Bearer $vercelToken"; "Content-Type" = "application/json" }
$projectId = "prj_9Z1OE5GuADYVd4s5x9iVvizCdKjR"

Write-Host "Intentando asignar saascore-erp.vercel.app..."
$body = @{ name = "saascore-erp.vercel.app" } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$projectId/domains" -Method POST -Headers $headers -Body $body
    Write-Host "Asignado con exito!"
} catch {
    Write-Host "Error asignando dominio: $($_.Exception.Message)"
}
