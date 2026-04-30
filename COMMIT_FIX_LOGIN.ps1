Set-Location $PSScriptRoot
Remove-Item .git\index.lock -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300

git add scripts/fv-sync/fusionsolar_client.py
git commit -m "fix(fv-sync): usar force=True en click de login (elemento no visible en headless CI)

El campo username del SSO FusionSolar existe en el DOM pero no es visible
inmediatamente en modo headless (animacion CSS del SPA). force=True bypasea
el check de visibilidad de Playwright. Tambien se agrega wait de 1.5s para
que la animacion termine antes de interactuar con el formulario."

git push origin main

Write-Host "Push OK - lanzar Run #14" -ForegroundColor Green
