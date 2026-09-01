Get-ChildItem -Path 'src' -Recurse -File | Where-Object { $_.Extension -match '\.tsx?$' } | ForEach-Object {
  $content = Get-Content $_.FullName -Raw
  $new = $content -replace ':\s*any\b', ': unknown' -replace '<\s*any\s*>', '<unknown>' -replace 'any\[', 'unknown['
  if ($new -ne $content) {
    Set-Content -Path $_.FullName -Value $new
    Write-Host "Updated $($_.FullName)"
  }
}

  $content = Get-Content $_.FullName | Out-String
  $new = $content -replace ':\s*any\b', ': unknown' -replace '<\s*any\s*>', '<unknown>' -replace 'any\[', 'unknown['
  if ($new -ne $content) {
    Set-Content -Path $_.FullName -Value $new
    Write-Host "Updated $($_.FullName)"
  }
}
