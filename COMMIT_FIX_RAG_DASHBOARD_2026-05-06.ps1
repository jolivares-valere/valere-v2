# Fix RAG - precisar docs Dashboard alertas
# Fecha: 2026-05-06. Solo docs/help.

Set-Location C:\Users\joliv\valere-v2

if (Test-Path .git\index.lock) {
  Remove-Item .git\index.lock -Force
}

Write-Host '=== Pull main ===' -ForegroundColor Cyan
git checkout main
if ($LASTEXITCODE -ne 0) { exit 1 }
git pull origin main --ff-only
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ''
Write-Host '=== Stage + commit + push ===' -ForegroundColor Cyan
$files = @(
  'docs/help/captacion/vencimiento-y-semaforo.md',
  'docs/help/contratos/gestionar-contratos.md'
)
foreach ($f in $files) {
  if (Test-Path $f) {
    Write-Host ('  OK  ' + $f) -ForegroundColor Green
  } else {
    Write-Host ('  FALTA  ' + $f) -ForegroundColor Red
    exit 1
  }
}
git add -- $files
git diff --staged --stat

git commit -m 'docs(help): precisar Dashboard alertas - solo contratos firmados, no prospectos'
if ($LASTEXITCODE -ne 0) { exit 1 }

git push origin main
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ''
Write-Host '=== HECHO. Workflow regenera embeddings (~3-5 min). ===' -ForegroundColor Green
Write-Host ''
Write-Host 'Re-test esperado:' -ForegroundColor Yellow
Write-Host '  Pregunta: Hay alertas en Dashboard de prospectos urgentes?' -ForegroundColor Yellow
Write-Host '  Respuesta correcta: NO. Las alertas Dashboard son de contratos firmados de clientes.' -ForegroundColor Yellow
git log --oneline -3
