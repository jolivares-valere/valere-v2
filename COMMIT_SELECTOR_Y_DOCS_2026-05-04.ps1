# Cierre: fix P1 selector UUID + 11 docs operativos help/
# Un solo commit cohesivo. Dispara workflow regenerate-help-embeddings al pushear.

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
  # Fix selector UUID
  'src/features/captacion/components/OportunidadAcciones.tsx',
  # Docs nuevos captacion
  'docs/help/captacion/crear-lead.md',
  'docs/help/captacion/pedir-factura.md',
  'docs/help/captacion/subir-factura.md',
  'docs/help/captacion/pasar-a-analisis.md',
  'docs/help/captacion/enviar-propuesta.md',
  'docs/help/captacion/cerrar-caso.md',
  # Docs nuevos analisis
  'docs/help/analisis-captacion/recibir-caso.md',
  'docs/help/analisis-captacion/empezar-analisis.md',
  'docs/help/analisis-captacion/subir-propuesta.md',
  # Docs nuevos senior
  'docs/help/cartera-senior/preparar-y-subir-propuesta-senior.md',
  # Docs permisos
  'docs/help/permisos/que-ve-cada-funcion.md',
  # Actualizados
  'docs/help/README.md',
  'docs/help/oportunidades/estados-y-etapas.md',
  'docs/help/documentos/subir-documento.md'
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
git diff --staged --stat

git commit -F COMMIT_MSG_SELECTOR_Y_DOCS.txt
if ($LASTEXITCODE -ne 0) { exit 1 }

git push origin main
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "=== HECHO ===" -ForegroundColor Green
Write-Host "Espera deploy CF (2 min) + workflow embeddings (3-5 min)." -ForegroundColor Yellow
Write-Host "Tras hard refresh, el selector mostrara nombres y el asistente RAG" -ForegroundColor Yellow
Write-Host "respondera con los nuevos docs." -ForegroundColor Yellow
git log --oneline -3
