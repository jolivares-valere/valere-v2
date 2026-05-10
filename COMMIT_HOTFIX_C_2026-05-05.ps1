# Hotfix Sprint C — toast + drawer vencimiento
# Fecha: 2026-05-05

Set-Location C:\Users\joliv\valere-v2

if (Test-Path .git\index.lock) {
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
Write-Host "=== 5/5 Stage + commit + push ===" -ForegroundColor Cyan
$files = @(
  'src/components/layout/AppShell.tsx',
  'src/features/captacion/components/OportunidadDrawer.tsx'
)
foreach ($f in $files) {
  if (Test-Path $f) {
    Write-Host ("  OK  " + $f) -ForegroundColor Green
  } else {
    Write-Host ("  FALTA  " + $f) -ForegroundColor Red
    exit 1
  }
}
git add -- $files
git diff --staged --stat

git commit -F COMMIT_MSG_HOTFIX_C.txt
if ($LASTEXITCODE -ne 0) { exit 1 }

git push origin main
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "=== HECHO. Espera deploy CF 2 min y haz hard refresh. ===" -ForegroundColor Green
Write-Host ""
Write-Host "Smoke esperado:" -ForegroundColor Yellow
Write-Host " 1. Toast aparece bottom-right, no tapa el +Nuevo lead" -ForegroundColor Yellow
Write-Host " 2. Toast desaparece a los 5s" -ForegroundColor Yellow
Write-Host " 3. Drawer Herba (con fecha) muestra bloque coloreado" -ForegroundColor Yellow
Write-Host " 4. Drawer caso sin fecha muestra placeholder dashed" -ForegroundColor Yellow
Write-Host ""
git log --oneline -3
