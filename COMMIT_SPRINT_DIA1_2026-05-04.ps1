# Sprint Operativo Captacion - Cierre Dia 1 (v2 robusta)
# Ejecutar desde PowerShell en C:\Users\joliv\valere-v2

Set-Location C:\Users\joliv\valere-v2

# ---------------------------------------------------------------
# 0. Limpieza: index.lock colgado de proceso git previo crasheado
# ---------------------------------------------------------------
if (Test-Path .git\index.lock) {
  Write-Host "index.lock colgado, eliminando..." -ForegroundColor Yellow
  Remove-Item .git\index.lock -Force
}

# ---------------------------------------------------------------
# 1. Stash de cambios locales + pull ff-only + pop (mantiene mis cambios)
# ---------------------------------------------------------------
Write-Host "=== 1/7 Stash + pull + pop ===" -ForegroundColor Cyan
git checkout main
if ($LASTEXITCODE -ne 0) { Write-Host "git checkout fallo" -ForegroundColor Red; exit 1 }

# Stash incluyendo untracked (-u) — guarda mis cambios temporalmente
git stash push -u -m "sprint-dia1-pre-pull"
$stashCreated = ($LASTEXITCODE -eq 0)

git pull origin main --ff-only
if ($LASTEXITCODE -ne 0) {
  Write-Host "git pull fallo - revisa estado y reintenta" -ForegroundColor Red
  if ($stashCreated) { git stash pop }
  exit 1
}

if ($stashCreated) {
  Write-Host "Reaplicando mis cambios..." -ForegroundColor Yellow
  git stash pop
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Conflicto al reaplicar stash - resuelve a mano y vuelve a ejecutar el script" -ForegroundColor Red
    exit 1
  }
}

# ---------------------------------------------------------------
# 2. Verificar TSC limpio
# ---------------------------------------------------------------
Write-Host ""
Write-Host "=== 2/7 Verificar TSC limpio ===" -ForegroundColor Cyan
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
  Write-Host "TSC con errores - revisar antes de commitear" -ForegroundColor Red
  exit 1
}

# ---------------------------------------------------------------
# 3. Verificar tests
# ---------------------------------------------------------------
Write-Host ""
Write-Host "=== 3/7 Verificar tests ===" -ForegroundColor Cyan
npm test -- --run
if ($LASTEXITCODE -ne 0) {
  Write-Host "Tests fallan - revisar antes de commitear" -ForegroundColor Red
  exit 1
}

# ---------------------------------------------------------------
# 4. Stage de los ficheros del Dia 1 + cierre sesion ayer
# ---------------------------------------------------------------
Write-Host ""
Write-Host "=== 4/7 Stage de ficheros explicitos ===" -ForegroundColor Cyan
$files = @(
  'supabase/migrations/20260504_sprint_operativo_captacion_dia1.sql',
  'src/core/auth/permissions.ts',
  'src/App.tsx',
  'src/components/layout/Sidebar.tsx',
  'src/features/captacion/api.ts',
  'src/features/captacion/motivos.ts',
  'src/features/captacion/components/OportunidadDrawer.tsx',
  'src/features/captacion/components/BandejaCard.tsx',
  'src/features/captacion/CaptacionPage.tsx',
  'src/features/captacion/AnalisisPage.tsx',
  'src/features/captacion/CarteraSeniorPage.tsx',
  'docs/ESTADO.md',
  'docs/SMOKE_TEST_4_USERS_2026-05-04.md',
  'docs/ONBOARDING_4_USERS_2026-05-04.md',
  'docs/FEEDBACK_USO_REAL.md',
  'docs/BACKLOG_PERMISOS_GRANULARES_2026-05-03.md',
  'docs/SESIONES/2026-05-04-resumen.md',
  'docs/SPRINT_OPERATIVO_CAPTACION_2026-05-04.md',
  '.cowork/outbox/2026-05-03T00-00-00-uso-real-1-semana.md',
  '.cowork/outbox/2026-05-04T00-00-00-uso-real-arrancado.md'
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

# ---------------------------------------------------------------
# 5. Verificar staging
# ---------------------------------------------------------------
Write-Host ""
Write-Host "=== 5/7 Diff staged ===" -ForegroundColor Cyan
git diff --staged --stat

# ---------------------------------------------------------------
# 6. Commit (mensaje desde fichero externo para evitar problemas PS)
# ---------------------------------------------------------------
Write-Host ""
Write-Host "=== 6/7 Commit ===" -ForegroundColor Cyan
git commit -F COMMIT_MSG_DIA1.txt
if ($LASTEXITCODE -ne 0) { Write-Host "git commit fallo" -ForegroundColor Red; exit 1 }

# ---------------------------------------------------------------
# 7. Push
# ---------------------------------------------------------------
Write-Host ""
Write-Host "=== 7/7 Push origin main ===" -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) { Write-Host "git push fallo" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=== HECHO ===" -ForegroundColor Green
git log --oneline -3
