# Sprint E1 — Posponer llamada + extensión contacto + próxima llamada en card
# Fecha: 2026-05-06

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
  'src/features/captacion/api.ts',
  'src/features/captacion/components/ContactosForm.tsx',
  'src/features/captacion/components/OportunidadAcciones.tsx',
  'src/features/captacion/components/OportunidadDrawer.tsx',
  'src/features/captacion/components/BandejaCard.tsx',
  'src/features/captacion/components/PosponerLlamadaModal.tsx',
  'src/features/captacion/formatTelefono.test.ts',
  'supabase/migrations/20260506_sprint_e1_posponer_extension.sql'
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

git commit -F COMMIT_MSG_SPRINT_E1.txt
if ($LASTEXITCODE -ne 0) { exit 1 }

git push origin main
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "=== HECHO. Espera deploy CF 2 min y haz hard refresh. ===" -ForegroundColor Green
Write-Host ""
Write-Host "Smoke crítico:" -ForegroundColor Yellow
Write-Host " 1. Boton 'Posponer' aparece en bandeja Por llamar" -ForegroundColor Yellow
Write-Host " 2. Modal con motivo + fecha + hora" -ForegroundColor Yellow
Write-Host " 3. Card muestra 'Proxima llamada: dd/mm/yyyy hh:mm'" -ForegroundColor Yellow
Write-Host " 4. Editar contacto: campo Extension funciona" -ForegroundColor Yellow
Write-Host " 5. Drawer muestra '957 767 700 - Ext. 123'" -ForegroundColor Yellow
Write-Host " 6. Sin regresion Sprint C ni D1" -ForegroundColor Yellow
Write-Host ""
git log --oneline -4
