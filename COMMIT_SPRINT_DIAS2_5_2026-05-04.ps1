# Sprint Operativo Captacion - Cierre Dias 2-5
# Ejecutar desde PowerShell en C:\Users\joliv\valere-v2

Set-Location C:\Users\joliv\valere-v2

if (Test-Path .git\index.lock) {
  Write-Host "index.lock colgado, eliminando..." -ForegroundColor Yellow
  Remove-Item .git\index.lock -Force
}

Write-Host "=== 1/6 Pull main ===" -ForegroundColor Cyan
git checkout main
if ($LASTEXITCODE -ne 0) { Write-Host "checkout fallo" -ForegroundColor Red; exit 1 }
git pull origin main --ff-only
if ($LASTEXITCODE -ne 0) { Write-Host "pull fallo" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=== 2/6 TSC ===" -ForegroundColor Cyan
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
  Write-Host "TSC con errores - revisar antes de commitear" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "=== 3/6 Tests ===" -ForegroundColor Cyan
npm test -- --run
if ($LASTEXITCODE -ne 0) {
  Write-Host "Tests fallan - revisar antes de commitear" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "=== 4/6 Build (verificacion final) ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host "Build fallo - revisar" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "=== 5/6 Stage de los ficheros del sprint dias 2-5 ===" -ForegroundColor Cyan
$files = @(
  # Dia 3 BD
  'supabase/migrations/20260504_sprint_captacion_dia3_storage_policies.sql',
  # Frontend nuevo
  'src/features/captacion/storage.ts',
  'src/features/captacion/components/NuevoLeadModal.tsx',
  'src/features/captacion/components/OportunidadAcciones.tsx',
  # Frontend modificado
  'src/features/captacion/api.ts',
  'src/features/captacion/components/OportunidadDrawer.tsx',
  'src/features/captacion/CaptacionPage.tsx',
  # Tests
  'src/features/captacion/motivos.test.ts',
  'src/features/captacion/storage.test.ts',
  'src/core/auth/permissions.test.ts',
  # Docs
  'docs/SPRINT_OPERATIVO_CAPTACION_2026-05-04.md',
  'docs/ESTADO.md',
  'docs/SESIONES/2026-05-04-tarde-sprint-autonomo.md',
  '.cowork/outbox/2026-05-04T20-00-00-sprint-captacion-completo.md'
)
$missing = @()
foreach ($f in $files) {
  if (Test-Path $f) {
    Write-Host ("  OK  " + $f) -ForegroundColor Green
  } else {
    Write-Host ("  FALTA  " + $f) -ForegroundColor Red
    $missing += $f
  }
}
if ($missing.Count -gt 0) {
  Write-Host "Faltan ficheros - aborto" -ForegroundColor Red
  exit 1
}
git add -- $files
if ($LASTEXITCODE -ne 0) { Write-Host "git add fallo" -ForegroundColor Red; exit 1 }

git diff --staged --stat

Write-Host ""
Write-Host "=== 6/6 Commit + push ===" -ForegroundColor Cyan
git commit -F COMMIT_MSG_DIAS2_5.txt
if ($LASTEXITCODE -ne 0) { Write-Host "commit fallo" -ForegroundColor Red; exit 1 }

git push origin main
if ($LASTEXITCODE -ne 0) { Write-Host "push fallo" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=== HECHO ===" -ForegroundColor Green
git log --oneline -3
