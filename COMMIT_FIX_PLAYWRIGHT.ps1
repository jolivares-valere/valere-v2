Set-Location $PSScriptRoot
Remove-Item .git\index.lock -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300

git add .github/workflows/fv-sync.yml
git commit -m "fix(fv-sync): pre-instalar libasound2t64 para Playwright en Ubuntu 22/24

En Ubuntu 22+, libasound2 fue renombrado a libasound2t64.
playwright install chromium --with-deps falla porque busca libasound2.
Solución: instalar libasound2t64 antes para satisfacer la dependencia virtual."

git push origin main

Write-Host "Push completado. Lanzando Run #12..." -ForegroundColor Green
