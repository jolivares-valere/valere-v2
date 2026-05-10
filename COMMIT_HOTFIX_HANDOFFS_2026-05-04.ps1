# Hotfix - 3 valores motivo handoff incorrectos detectados por auditoria
# Ejecutar desde PowerShell en C:\Users\joliv\valere-v2

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
Write-Host "=== 4/5 Stage + commit ===" -ForegroundColor Cyan
$files = @(
  'src/features/captacion/components/OportunidadAcciones.tsx',
  'docs/AUDITORIA_SPRINT_CAPTACION_2026-05-04.md',
  'docs/SMOKE_TEST_RUNBOOK.md',
  'docs/FEEDBACK_USO_REAL.md'
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
if ($LASTEXITCODE -ne 0) { Write-Host "git add fallo" -ForegroundColor Red; exit 1 }

git diff --staged --stat

git commit -F COMMIT_MSG_HOTFIX.txt
if ($LASTEXITCODE -ne 0) { Write-Host "commit fallo" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=== 5/5 Push ===" -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) { Write-Host "push fallo" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=== HECHO ===" -ForegroundColor Green
git log --oneline -5
