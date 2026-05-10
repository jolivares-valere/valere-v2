# Sprint C — Visibilidad post-handoff + comentarios internos
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
  'src/features/captacion/api.ts',
  'src/features/captacion/CaptacionPage.tsx',
  'src/features/captacion/components/OportunidadDrawer.tsx',
  'src/features/captacion/components/BandejaCard.tsx',
  'supabase/migrations/20260505_sprint_c_visibilidad_post_handoff.sql'
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

git commit -F COMMIT_MSG_SPRINT_C.txt
if ($LASTEXITCODE -ne 0) { exit 1 }

git push origin main
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "=== HECHO. Espera deploy CF 2 min y haz hard refresh. ===" -ForegroundColor Green
Write-Host ""
Write-Host "Smoke esperado:" -ForegroundColor Yellow
Write-Host " 1. Login Carolina A" -ForegroundColor Yellow
Write-Host " 2. /captacion -> pestania 'Todos mis casos'" -ForegroundColor Yellow
Write-Host " 3. Herba debe mostrar badge azul 'Solo seguimiento'" -ForegroundColor Yellow
Write-Host " 4. Click -> drawer con cabecera Responsable/Creador + banner azul + boton Anadir comentario" -ForegroundColor Yellow
Write-Host " 5. Probar comentario -> aparece en timeline" -ForegroundColor Yellow
Write-Host ""
git log --oneline -3
