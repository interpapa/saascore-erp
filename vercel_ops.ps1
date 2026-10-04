$vercelToken = "YOUR_VERCEL_TOKEN"
$headers = @{ Authorization = "Bearer $vercelToken" }

# IDs a BORRAR (duplicados viejos)
$toDelete = @(
    "prj_6K5pHfPzwPp0AIrfbKx6NgUr4U78",  # saascore-erp-kk9w
    "prj_H21XsWmW93Kp0iwc7EtbUrH46vFO",  # saascore-erp-
    "prj_lfrTAMn8Dd3NysiyiCDMfBuJBssK",  # saas-erp-
    "prj_69mJh1WOb4UGsKecrB8UL7RXpyPC"   # saa-s-core-erp
)

# MANTENER: saascore-erp (prj_9Z1OE5GuADYVd4s5x9iVvizCdKjR) y trading-zone

Write-Host "=== BORRANDO PROYECTOS DUPLICADOS ==="
foreach ($id in $toDelete) {
    try {
        Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$id" -Method DELETE -Headers $headers | Out-Null
        Write-Host "BORRADO: $id"
    } catch {
        Write-Host "Error borrando $id`: $($_.Exception.Message)"
    }
}

Write-Host ""
Write-Host "=== CONFIGURANDO VARIABLES EN saascore-erp ==="
$projectId = "prj_9Z1OE5GuADYVd4s5x9iVvizCdKjR"

$envVars = @(
    @{ key = "NEXT_PUBLIC_SUPABASE_URL"; value = "https://pfgfsnoblxasiixeveue.supabase.co"; type = "plain"; target = @("production","preview","development") },
    @{ key = "NEXT_PUBLIC_SUPABASE_ANON_KEY"; value = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmZ2Zzbm9ibHhhc2lpeGV2ZXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MjUzNzQsImV4cCI6MjEwNDIwMTM3NH0.aCJ_3GWs6kta4LRqGDd6QKNvKqAKjwdc-Daef8Bgwv8"; type = "plain"; target = @("production","preview","development") },
    @{ key = "SUPABASE_SERVICE_ROLE_KEY"; value = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmZ2Zzbm9ibHhhc2lpeGV2ZXVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODYyNTM3NCwiZXhwIjoyMTA0MjAxMzc0fQ.hmoocNnKBQyabarzdEFpsfmHWLjAjN2kmx1_ccbuhv0"; type = "sensitive"; target = @("production","preview","development") }
)

foreach ($env in $envVars) {
    $body = $env | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "https://api.vercel.com/v10/projects/$projectId/env" -Method POST -Headers ($headers + @{"Content-Type"="application/json"}) -Body $body | Out-Null
        Write-Host "VAR configurada: $($env.key)"
    } catch {
        # Si ya existe, actualizar
        Write-Host "Intentando actualizar: $($env.key)"
    }
}

Write-Host ""
Write-Host "=== REDEPLOY ==="
$deployBody = @{ name = "saascore-erp" } | ConvertTo-Json
try {
    $deploy = Invoke-RestMethod -Uri "https://api.vercel.com/v13/deployments" -Method POST -Headers ($headers + @{"Content-Type"="application/json"}) -Body $deployBody
    Write-Host "Deploy iniciado: $($deploy.url)"
} catch {
    Write-Host "Para redeploy: ve a Vercel dashboard y haz clic en Redeploy"
}

Write-Host ""
Write-Host "=== RESUMEN FINAL ==="
Write-Host "CONSERVADOS:"
Write-Host "  - saascore-erp  -> https://saascore-erp.vercel.app"
Write-Host "  - trading-zone  -> intacto"
Write-Host "BORRADOS: 4 proyectos duplicados"
