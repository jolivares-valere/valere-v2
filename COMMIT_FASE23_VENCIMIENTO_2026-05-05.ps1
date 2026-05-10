# Sprint Fase 2-3 separación CRM/Captación + vencimiento contrato prospecto
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
  # Frontend captación (drawer + modales + form vencimiento + api hooks/types/helper)
  'src/features/captacion/api.ts',
  'src/features/captacion/components/OportunidadDrawer.tsx',
  'src/features/captacion/components/NuevoLeadModal.tsx',
  'src/features/captacion/components/EditarLeadModal.tsx',
  'src/features/captacion/components/VencimientoContratoForm.tsx',

  # Filtros estado_relacion / contexto en CRM
  'src/features/empresas/api.ts',
  'src/features/contactos/api.ts',
  'src/features/oportunidades/api.ts',
  'src/features/dashboard/api.ts',
  'src/components/search/GlobalSearch.tsx',

  # BD mirrors
  'supabase/migrations/20260505_fase1_separacion_captacion_crm.sql',
  'supabase/migrations/20260505_vencimiento_contrato_prospecto.sql'
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

git commit -F COMMIT_MSG_FASE23_VENCIMIENTO.txt
if ($LASTEXITCODE -ne 0) { exit 1 }

git push origin main
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "=== HECHO. Espera deploy CF 2 min y haz hard refresh. ===" -ForegroundColor Green
git log --oneline -3
