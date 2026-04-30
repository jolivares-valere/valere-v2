Set-Location "C:\Users\joliv\valere-v2"
$lock = ".git\index.lock"
if (Test-Path $lock) { Remove-Item $lock -Force }

git add docs/ESTADO.md
git add docs/SESIONES/2026-04-29-resumen-noche.md

git commit -m "docs: ESTADO.md + resumen sesion noche 2026-04-29"
git push origin main
Write-Host "Done!" -ForegroundColor Green
