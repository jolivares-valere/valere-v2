# Cierre sesión 2026-05-05 (jornada larga, 5 sprints + micro-fix RAG)
# Solo docs + Edge Function index.ts (la EF ya está desplegada v21 via MCP).

Set-Location C:\Users\joliv\valere-v2

if (Test-Path .git\index.lock) {
  Remove-Item .git\index.lock -Force
}

Write-Host "=== Pull main ===" -ForegroundColor Cyan
git checkout main
if ($LASTEXITCODE -ne 0) { exit 1 }
git pull origin main --ff-only
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "=== Stage + commit + push ===" -ForegroundColor Cyan
$files = @(
  'docs/ESTADO.md',
  'docs/SESIONES/2026-05-05-resumen.md',
  '.cowork/outbox/2026-05-06T-d2-vista-tabla.md',
  '.cowork/backlog/agenda-captacion.md',
  'supabase/functions/ask-crm-docs/index.ts'
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

git commit -m "docs: cierre sesion 2026-05-05 + micro-fix RAG v21 + backlog agenda captacion"
if ($LASTEXITCODE -ne 0) { exit 1 }

git push origin main
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "=== HECHO. Sesion cerrada. ===" -ForegroundColor Green
git log --oneline -7
