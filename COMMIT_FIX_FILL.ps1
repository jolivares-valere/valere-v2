Set-Location $PSScriptRoot
Remove-Item .git\index.lock -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300

git add scripts/fv-sync/fusionsolar_client.py

$msg = @'
fix(fv-sync): quitar force=True de fill — parametro no existe en Playwright Python

Locator.fill no acepta force=True, solo click/check/tap lo aceptan.
La llamada fill con force=True lanzaba TypeError en runtime y causaba
fallo del job en 10 segundos. fill ya ignora visibilidad por defecto.
'@

git commit -m $msg

git push origin main

Write-Host "Push OK - lanzar Run #15 desde GitHub Actions" -ForegroundColor Green
