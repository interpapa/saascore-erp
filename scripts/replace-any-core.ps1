Write-Host "Reemplazando 'any' por 'unknown // TODO: definir tipo preciso' en src/lib/core..."
$root = "c:/Users/rodol/OneDrive/Escritorio/programacion/saascore_react/src/lib/core"
Get-ChildItem -Path $root -Recurse -Include *.ts,*.tsx | ForEach-Object {
    $path = $_.FullName
    $content = Get-Content $path -Raw
    $new = $content -replace ':\s*any\b', ': unknown // TODO: definir tipo preciso'
    $new = $new -replace '\bas\s+any\b', 'as unknown // TODO: definir tipo preciso'
    if ($new -ne $content) {
        Set-Content -Path $path -Value $new -Encoding utf8
        Write-Host "Modificado: $path"
    }
}
Write-Host "Reemplazo completado."
