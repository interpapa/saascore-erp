Write-Host "Replacing 'any' with 'unknown' and adding TODO comments..."
$files = Get-ChildItem -Path "c:/Users/rodol/OneDrive/Escritorio/programacion/saascore_react/src/lib/core" -Recurse -Include *.ts,*.tsx
foreach ($file in $files) {
  (Get-Content $file.FullName) |
    ForEach-Object {
      $_ -replace "(?<=: )any(?=\s|;|,)", "unknown // TODO: definir tipo preciso" \
         -replace "(?<= as )any(?=\s|;|,)", "unknown // TODO: definir tipo preciso"
    } |
    Set-Content $file.FullName
}
Write-Host "Replacement complete."
