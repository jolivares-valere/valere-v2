# Fix2 — actualizar docs/help (Sprint Fase 1-3 + C + D1)
# Fecha: 2026-05-05
# Solo docs. NO toca código. Workflow GH Actions regenerará embeddings al detectar push.

Set-Location C:\Users\joliv\valere-v2

if (Test-Path .git\index.lock) {
  Remove-Item .git\index.lock -Force
}

Write-Host "=== 1/3 Pull main ===" -ForegroundColor Cyan
git checkout main
if ($LASTEXITCODE -ne 0) { exit 1 }
git pull origin main --ff-only
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "=== 2/3 Verificar archivos ===" -ForegroundColor Cyan
$files = @(
  'docs/help/captacion/separacion-prospecto-cliente.md',
  'docs/help/captacion/seguimiento-tras-handoff.md',
  'docs/help/captacion/vencimiento-y-semaforo.md',
  'docs/help/captacion/crear-lead.md',
  'docs/help/captacion/pasar-a-analisis.md',
  'docs/help/README.md'
)
foreach ($f in $files) {
  if (Test-Path $f) {
    Write-Host ("  OK  " + $f) -ForegroundColor Green
  } else {
    Write-Host ("  FALTA  " + $f) -ForegroundColor Red
    exit 1
  }
}

Write-Host ""
Write-Host "=== 3/3 Stage + commit + push ===" -ForegroundColor Cyan
git add -- $files
git diff --staged --stat

git commit -F COMMIT_MSG_FIX2_DOCS.txt
if ($LASTEXITCODE -ne 0) { exit 1 }

git push origin main
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "=== HECHO. Workflow GH Actions regenera embeddings ahora. ===" -ForegroundColor Green
Write-Host ""
Write-Host "Espera 3-5 minutos antes de probar el asistente." -ForegroundColor Yellow
Write-Host "Puedes seguir el progreso en:" -ForegroundColor Yellow
Write-Host "  https://github.com/jolivares-valere/valere-v2/actions" -ForegroundColor Yellow
Write-Host ""
Write-Host "Smoke esperado tras embeddings actualizados:" -ForegroundColor Yellow
Write-Host " 1. '?Que significa Solo seguimiento?' -> respuesta operativa" -ForegroundColor Yellow
Write-Host " 2. '?Como anado un comentario en una oportunidad?' -> pasos" -ForegroundColor Yellow
Write-Host " 3. '?Que es un prospecto vs un cliente?' -> diferencias claras" -ForegroundColor Yellow
Write-Host " 4. '?Como registro la fecha de vencimiento del contrato?' -> pasos + semaforo" -ForegroundColor Yellow
Write-Host " 5. Ninguna respuesta debe terminar con 'Fuentes:' (ya validado en Fix1)" -ForegroundColor Yellow
Write-Host ""
git log --oneline -3
