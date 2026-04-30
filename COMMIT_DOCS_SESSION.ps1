Set-Location $PSScriptRoot
Remove-Item .git\index.lock -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300

git add docs/ESTADO.md
git add docs/SESIONES/2026-04-30-resumen.md

git commit -m "docs: ESTADO.md + resumen sesion 2026-04-30 FV redesign"
git push origin main

Write-Host "Docs actualizados" -ForegroundColor Green
