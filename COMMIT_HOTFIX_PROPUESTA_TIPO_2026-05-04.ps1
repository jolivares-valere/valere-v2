# Hotfix P0 #5 - tipo documento propuesta alineado con CHECK constraint BD

Set-Location C:\Users\joliv\valere-v2

if (Test-Path .git\index.lock) {
  Write-Host "index.lock colgado, eliminando..." -ForegroundColor Yellow
  Remove-Item .git\index.lock -Force
}

Write-Host "=== 1/5 Pull main ===" -ForegroundColor Cyan
git checkout main
if ($LASTEXITCODE -ne 0) { exit 1 }
git pull origin main --ff-only
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "=== 2/5 TSC ===" -ForegroundColor Cyan
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { Write-Host "TSC fallo" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=== 3/5 Tests ===" -ForegroundColor Cyan
npm test -- --run
if ($LASTEXITCODE -ne 0) { Write-Host "Tests fallan" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=== 4/5 Build ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Build fallo" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=== 5/5 Commit + push ===" -ForegroundColor Cyan
git add -- src/features/captacion/storage.ts src/features/captacion/components/OportunidadAcciones.tsx
git diff --staged --stat

git commit -F COMMIT_MSG_HOTFIX_PROPUESTA_TIPO.txt
if ($LASTEXITCODE -ne 0) { exit 1 }

git push origin main
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "=== HECHO. Espera deploy CF 2 min y haz hard refresh. ===" -ForegroundColor Green
Write-Host "PENDIENTE manual: borrar huerfano en Supabase Storage." -ForegroundColor Yellow
Write-Host "  Path: oportunidades/6a4e92f1-553f-4158-ac29-902b3c43d406/propuestas/" -ForegroundColor Yellow
Write-Host "        20260504_1777904593724_propuesta_dummy.pdf" -ForegroundColor Yellow
git log --oneline -3
