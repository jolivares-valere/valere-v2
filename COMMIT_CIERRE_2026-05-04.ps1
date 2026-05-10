# Script de cierre sesión 2026-05-04
# Ejecutar desde PowerShell en C:\Users\joliv\valere-v2
# Commitea los 8 docs de la sesión a main y push.

$ErrorActionPreference = 'Stop'
Set-Location C:\Users\joliv\valere-v2

Write-Host "=== 1/5 Asegurar rama main + pull ===" -ForegroundColor Cyan
git checkout main
git pull origin main --ff-only

Write-Host ""
Write-Host "=== 2/5 Verificar ficheros existen ===" -ForegroundColor Cyan
$files = @(
  'docs/ESTADO.md',
  'docs/SMOKE_TEST_4_USERS_2026-05-04.md',
  'docs/ONBOARDING_4_USERS_2026-05-04.md',
  'docs/FEEDBACK_USO_REAL.md',
  'docs/BACKLOG_PERMISOS_GRANULARES_2026-05-03.md',
  'docs/SESIONES/2026-05-04-resumen.md',
  '.cowork/outbox/2026-05-03T00-00-00-uso-real-1-semana.md',
  '.cowork/outbox/2026-05-04T00-00-00-uso-real-arrancado.md'
)
foreach ($f in $files) {
  if (Test-Path $f) {
    Write-Host "  OK  $f" -ForegroundColor Green
  } else {
    Write-Host "  FALTA  $f" -ForegroundColor Red
    exit 1
  }
}

Write-Host ""
Write-Host "=== 3/5 Add + verificar staging ===" -ForegroundColor Cyan
git add $files
git diff --staged --stat

Write-Host ""
Write-Host "=== 4/5 Commit ===" -ForegroundColor Cyan
$msg = @'
docs(uso-real): smoke test + onboarding + feedback ready

Día 1 de uso real con los 4 usuarios reales.

- SMOKE_TEST_4_USERS_2026-05-04.md: auditoría BD + sidebar/rutas
  - BD: cada user verá su demo correcto en v_mis_oportunidades
  - Deploy: HTTP 200 OK
  - Fugas conocidas (sidebar CRM Comercial/Potencias visible a todos,
    rutas sin guard funciones=, RLS permisivo) aceptadas como deuda
- ONBOARDING_4_USERS_2026-05-04.md: 3 borradores listos para enviar
  (Carolina A con password temporal Valere2026Temporal!, Antonio y
  Carolina M con sus credenciales existentes)
- FEEDBACK_USO_REAL.md: plantilla copiable para registrar fricciones,
  6 categorías, trigger automático tras 3+ entradas o 7+ días
- BACKLOG_PERMISOS_GRANULARES_2026-05-03.md: 4 capas de permisos
  diferidas hasta tener evidencia de uso real
- ESTADO.md actualizado con snapshot del cierre
- SESIONES/2026-05-04-resumen.md
- outbox/2026-05-04 nota para próxima sesión

Sin código nuevo. Directriz ChatGPT: "Lo siguiente no es más código,
es uso real con el equipo."
'@
git commit -m $msg

Write-Host ""
Write-Host "=== 5/5 Push origin main ===" -ForegroundColor Cyan
git push origin main

Write-Host ""
Write-Host "=== HECHO ===" -ForegroundColor Green
git log --oneline -3
