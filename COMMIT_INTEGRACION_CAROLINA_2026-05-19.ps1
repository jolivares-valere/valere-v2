# Commit Integracion UI Carolina 2026-05-19 (Hallazgos #2 + #3 — Vista Tabla Captacion)
#
# Segundo commit del sprint Carolina. El primero (e1eb5cd) dejo el backend +
# componentes base. Este integra todo en CaptacionPage y cierra:
#   - Toggle Vista (Fichas/Tabla) en header con persistencia.
#   - Buscador inline arriba que filtra el tab activo.
#   - Tab "Seguimientos" eliminado, propuesta_enviada vuelve a "Por llamar".
#   - Tab "Enviados" nuevo con SLA (verde/amarillo/rojo).
#   - Tab "Historico" (renombre de "Todos mis casos") con vista Tabla full.
#   - Tab "Mis llamadas" nuevo con filtros + export Excel.
#   - Modal "Recordar a responsable" con notificacion CRM + email Resend.
#
# Tambien incluye:
#   - useRecordarAResponsable extraido a archivo aparte (problemas con cat-heredoc
#     truncando api.ts).
#   - Tipos TS regenerados (limpieza Out-File UTF-8 sin BOM).

$ErrorActionPreference = "Stop"

Set-Location C:\Users\joliv\valere-v2

Write-Host "==> Pull de origin/main..." -ForegroundColor Cyan
git pull origin main
if ($LASTEXITCODE -ne 0) { Write-Host "Pull fallo." -ForegroundColor Red; exit 1 }

Write-Host "==> TSC..." -ForegroundColor Cyan
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { Write-Host "TSC con errores. Abortando." -ForegroundColor Red; exit 1 }

Write-Host "==> Tests..." -ForegroundColor Cyan
npm test -- --run
if ($LASTEXITCODE -ne 0) { Write-Host "Tests fallidos. Abortando." -ForegroundColor Red; exit 1 }

Write-Host "==> Build..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Build fallido. Abortando." -ForegroundColor Red; exit 1 }

Write-Host "==> Stage..." -ForegroundColor Cyan
git add `
  src/features/captacion/CaptacionPage.tsx `
  src/features/captacion/api.ts `
  src/features/captacion/useRecordarAResponsable.ts `
  src/features/captacion/components/MisLlamadasView.tsx `
  src/features/captacion/components/BandejaEnviadosCard.tsx `
  src/features/captacion/components/RecordatorioModal.tsx `
  src/core/types/database.ts

Write-Host "==> Commit..." -ForegroundColor Cyan
# Mensaje en archivo temporal (PowerShell rompe -m con multilinea)
$tmpMsg = New-TemporaryFile
@"
feat(captacion): integracion UI completa sprint Carolina (hallazgos #2 + #3)

Segundo commit del sprint 2026-05-19. Backend ya en e1eb5cd; este integra
todo en CaptacionPage y cierra los tres hallazgos.

Cambios visibles para Carolina y master:
- Selector Vista (Fichas/Tabla) en header con persistencia localStorage.
- Buscador inline (empresa/NIF) que filtra el tab activo.
- Tab Seguimientos eliminado. propuesta_enviada/seguimiento vuelven a Por llamar.
- Tab Enviados NUEVO con badge destinatario y SLA color.
- Tab Historico (renombre): vista Tabla con filtros tipo Excel y edicion inline.
- Tab Mis llamadas NUEVO con stats, filtros y export xlsx.
- Modal Recordatorio con notificacion CRM + email Resend.
"@ | Out-File -Encoding utf8 $tmpMsg.FullName

git commit -F $tmpMsg.FullName
Remove-Item $tmpMsg.FullName -Force
if ($LASTEXITCODE -ne 0) { Write-Host "Commit fallido." -ForegroundColor Red; exit 1 }

Write-Host "==> Push..." -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) { Write-Host "Push rechazado." -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "==> INTEGRACION CAROLINA COMMITEADA" -ForegroundColor Green
Write-Host "Cloudflare Pages desplegara en ~2 min: https://valere-v2.pages.dev" -ForegroundColor Green
Write-Host ""
Write-Host "Tras refrescar (Ctrl+Shift+R):" -ForegroundColor Yellow
Write-Host "  - Veras el selector Vista arriba a la derecha." -ForegroundColor Yellow
Write-Host "  - Buscador inline para filtrar." -ForegroundColor Yellow
Write-Host "  - Tab 'Enviados' nueva." -ForegroundColor Yellow
Write-Host "  - Tab 'Mis llamadas' nueva." -ForegroundColor Yellow
Write-Host "  - En tab 'Historico' activa Vista Tabla para ver filtros tipo Excel." -ForegroundColor Yellow
