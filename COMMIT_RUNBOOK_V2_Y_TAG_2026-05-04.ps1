# Cierre sprint Captacion - runbook v2 + tag rollback
# Ejecutar TRAS smoke test verde (o al menos sin P0)
# Si el smoke ha detectado P0, NO ejecutar el tag — solo el commit doc.

Set-Location C:\Users\joliv\valere-v2

if (Test-Path .git\index.lock) {
  Write-Host "index.lock colgado, eliminando..." -ForegroundColor Yellow
  Remove-Item .git\index.lock -Force
}

Write-Host "=== 1/4 Pull main ===" -ForegroundColor Cyan
git checkout main
if ($LASTEXITCODE -ne 0) { Write-Host "checkout fallo" -ForegroundColor Red; exit 1 }
git pull origin main --ff-only
if ($LASTEXITCODE -ne 0) { Write-Host "pull fallo" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=== 2/4 Stage + commit doc-only ===" -ForegroundColor Cyan
git add -- docs/SMOKE_TEST_RUNBOOK.md
git diff --staged --stat

git commit -m "docs(smoke): runbook v2 con clasificacion P0/P1/P2 y permisos cruzados

Ajustes ChatGPT post-dictamen 2026-05-04:
- Material de prueba: PDFs reales >0 bytes (NO vacios). Vacios solo
  como test negativo explicito.
- Clasificacion P0/P1/P2 de fallos: P0 detiene smoke y bloquea
  onboarding; P1 anota y sigue, fix proximo; P2 al backlog.
- Test 6.5 nuevo: 4 verificaciones cruzadas de permisos
  (Carolina A no ve modulos ajenos; Carolina M idem; Antonio no ve
  casos no asignados; UI no expone paths de docs ajenos).
- Instruccion de tag v0.1-captacion-mvp como rollback antes de
  uso real."
if ($LASTEXITCODE -ne 0) { Write-Host "commit fallo" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=== 3/4 Push commit ===" -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) { Write-Host "push fallo" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=== 4/4 Tag de rollback ===" -ForegroundColor Cyan
Write-Host "Si tu smoke test detectó P0, ejecuta CTRL-C ahora para abortar el tag." -ForegroundColor Yellow
Write-Host "Si el smoke fue verde (sin P0, max 2 P1), confirma con Enter." -ForegroundColor Yellow
$null = Read-Host "Press Enter para crear tag v0.1-captacion-mvp (o CTRL-C para abortar)"

git tag -a v0.1-captacion-mvp -m "Captacion MVP operativo - smoke test verde, primera version usable por equipo. Punto de rollback antes de 1a semana de uso real."
if ($LASTEXITCODE -ne 0) { Write-Host "tag fallo (puede que ya exista)" -ForegroundColor Yellow }

git push origin v0.1-captacion-mvp
if ($LASTEXITCODE -ne 0) { Write-Host "push tag fallo" -ForegroundColor Yellow }

Write-Host ""
Write-Host "=== HECHO ===" -ForegroundColor Green
git log --oneline -3
git tag -l "v0.1*"
