# Resolver conflictos del stash pop tras COMMIT_SPRINT_DIA1_2026-05-04.ps1
# Estrategia: tomar version "theirs" (= stash) en los 6 archivos conflictivos.
# Justificacion: el stash contenia mi version Dia 1 superpuesta sobre PR #9.
# La version theirs = base PR #9 + cambios Dia 1 = lo que queremos commitear.

Set-Location C:\Users\joliv\valere-v2

# ---------------------------------------------------------------
# 1. Resolver conflictos: theirs gana en los 6 archivos
# ---------------------------------------------------------------
Write-Host "=== 1/6 Resolviendo conflictos (theirs = stash gana) ===" -ForegroundColor Cyan
$conflictFiles = @(
  'src/components/layout/Sidebar.tsx',
  'src/features/captacion/AnalisisPage.tsx',
  'src/features/captacion/CaptacionPage.tsx',
  'src/features/captacion/CarteraSeniorPage.tsx',
  'src/features/captacion/api.ts',
  'src/features/captacion/components/BandejaCard.tsx'
)
foreach ($f in $conflictFiles) {
  git checkout --theirs -- $f
  if ($LASTEXITCODE -ne 0) { Write-Host ("Fallo checkout --theirs " + $f) -ForegroundColor Red; exit 1 }
  git add -- $f
  if ($LASTEXITCODE -ne 0) { Write-Host ("Fallo add " + $f) -ForegroundColor Red; exit 1 }
  Write-Host ("  Resuelto " + $f) -ForegroundColor Green
}

# ---------------------------------------------------------------
# 2. Asegurar que el archivo de la migration extra (de PR #9) queda
# ---------------------------------------------------------------
# El stash tenia un archivo que ya existia en HEAD (migration MVP add_asignada).
# El error "already exists, no checkout" significa que ese archivo ya esta en
# el working tree con la version de HEAD. Lo dejamos como esta.

# ---------------------------------------------------------------
# 3. Verificar que NO quedan conflictos
# ---------------------------------------------------------------
Write-Host ""
Write-Host "=== 2/6 Verificar que no quedan conflictos ===" -ForegroundColor Cyan
$unmerged = git diff --name-only --diff-filter=U
if ($unmerged) {
  Write-Host "Aun hay archivos sin resolver:" -ForegroundColor Red
  Write-Host $unmerged
  exit 1
}
Write-Host "Sin conflictos pendientes" -ForegroundColor Green

# ---------------------------------------------------------------
# 4. Drop del stash (ya aplicado)
# ---------------------------------------------------------------
Write-Host ""
Write-Host "=== 3/6 Drop del stash residual ===" -ForegroundColor Cyan
git stash drop
if ($LASTEXITCODE -ne 0) { Write-Host "stash drop fallo (puede que ya estuviera dropped)" -ForegroundColor Yellow }

# ---------------------------------------------------------------
# 5. TSC
# ---------------------------------------------------------------
Write-Host ""
Write-Host "=== 4/6 Verificar TSC limpio ===" -ForegroundColor Cyan
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
  Write-Host "TSC con errores - revisar antes de commitear" -ForegroundColor Red
  exit 1
}

# ---------------------------------------------------------------
# 6. Tests
# ---------------------------------------------------------------
Write-Host ""
Write-Host "=== 5/6 Verificar tests ===" -ForegroundColor Cyan
npm test -- --run
if ($LASTEXITCODE -ne 0) {
  Write-Host "Tests fallan - revisar antes de commitear" -ForegroundColor Red
  exit 1
}

# ---------------------------------------------------------------
# 7. Stage del resto + commit + push
# ---------------------------------------------------------------
Write-Host ""
Write-Host "=== 6/6 Commit + push ===" -ForegroundColor Cyan

# Asegurar staging completo (los conflictos ya estan add'ed; faltan los nuevos)
$extraFiles = @(
  'supabase/migrations/20260504_sprint_operativo_captacion_dia1.sql',
  'src/core/auth/permissions.ts',
  'src/App.tsx',
  'src/features/captacion/motivos.ts',
  'src/features/captacion/components/OportunidadDrawer.tsx',
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
foreach ($f in $extraFiles) {
  if (Test-Path $f) { git add -- $f }
}

git diff --staged --stat

git commit -F COMMIT_MSG_DIA1.txt
if ($LASTEXITCODE -ne 0) { Write-Host "git commit fallo" -ForegroundColor Red; exit 1 }

git push origin main
if ($LASTEXITCODE -ne 0) { Write-Host "git push fallo" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=== HECHO ===" -ForegroundColor Green
git log --oneline -3
