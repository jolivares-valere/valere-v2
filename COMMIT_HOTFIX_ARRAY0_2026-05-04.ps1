# Hotfix P0 #3 - null guard contactos[0] en OportunidadAcciones
# Crash al pulsar "Esperando factura" cuando oportunidad no tiene contactos.

Set-Location C:\Users\joliv\valere-v2

if (Test-Path .git\index.lock) {
  Write-Host "index.lock colgado, eliminando..." -ForegroundColor Yellow
  Remove-Item .git\index.lock -Force
}

Write-Host "=== 1/5 Pull main ===" -ForegroundColor Cyan
git checkout main
if ($LASTEXITCODE -ne 0) { Write-Host "checkout fallo" -ForegroundColor Red; exit 1 }
git pull origin main --ff-only
if ($LASTEXITCODE -ne 0) { Write-Host "pull fallo" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=== 2/5 TSC ===" -ForegroundColor Cyan
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
  Write-Host "TSC fallo - aborto" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "=== 3/5 Tests ===" -ForegroundColor Cyan
npm test -- --run
if ($LASTEXITCODE -ne 0) {
  Write-Host "Tests fallan - aborto" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "=== 4/5 Build ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host "Build fallo - aborto" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "=== 5/5 Commit + push ===" -ForegroundColor Cyan
git add -- src/features/captacion/components/OportunidadAcciones.tsx
git diff --staged --stat

git commit -F COMMIT_MSG_HOTFIX_ARRAY0.txt
if ($LASTEXITCODE -ne 0) { Write-Host "commit fallo" -ForegroundColor Red; exit 1 }

git push origin main
if ($LASTEXITCODE -ne 0) { Write-Host "push fallo" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=== HECHO. Espera deploy CF 2 min y haz hard refresh con Ctrl+Shift+R. ===" -ForegroundColor Green
git log --oneline -3
