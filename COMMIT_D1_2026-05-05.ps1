# Sprint D1 — helper vencimiento + cards mejoradas
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
  'src/features/captacion/utils/vencimiento.ts',
  'src/features/captacion/utils/vencimiento.test.ts',
  'src/features/captacion/api.ts',
  'src/features/captacion/components/VencimientoContratoForm.tsx',
  'src/features/captacion/components/OportunidadDrawer.tsx',
  'src/features/captacion/components/BandejaCard.tsx',
  'supabase/migrations/20260505_d1_v_mis_oportunidades_vencimiento.sql'
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

git commit -F COMMIT_MSG_D1.txt
if ($LASTEXITCODE -ne 0) { exit 1 }

git push origin main
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "=== HECHO. Espera deploy CF 2 min y haz hard refresh. ===" -ForegroundColor Green
Write-Host ""
Write-Host "Smoke esperado:" -ForegroundColor Yellow
Write-Host " 1. Card de Herba (con fecha) muestra badge color + 'Vence en X dias'" -ForegroundColor Yellow
Write-Host " 2. Linea '->' muestra texto urgente si fecha cercana" -ForegroundColor Yellow
Write-Host " 3. Cards sin fecha NO muestran badge venc (sin ruido)" -ForegroundColor Yellow
Write-Host " 4. Drawer sigue funcionando igual" -ForegroundColor Yellow
Write-Host " 5. Sprint C: badge 'Solo seguimiento' sigue saliendo en 'Todos mis casos'" -ForegroundColor Yellow
Write-Host ""
git log --oneline -3
