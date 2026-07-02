# Commit Sprint Carolina 2026-05-19 (Hallazgos #2 + #3 — Vista Tabla Captacion)
#
# Sprint con TSC verde y backend ya aplicado en prod:
#   - 3 vistas SQL: v_captacion_historico_completo, v_captacion_enviados_en_seguimiento, v_mis_llamadas
#   - 3 RPCs: editar_campo_oportunidad, editar_campo_empresa, recordar_a_responsable
#   - Edge Function: enviar-recordatorio (desplegada)
#
# Frontend incluido (backend listo, falta integracion en CaptacionPage):
#   - Hooks: useCaptacionHistorico, useCaptacionEnviados, useMisLlamadas,
#            useEditarCampoOportunidad, useEditarCampoEmpresa, useRecordarAResponsable
#   - Componentes: SelectorVista, BuscadorCaptacion, CeldaEditable,
#                  ChipsFiltros, PaginacionIncremental, TablaCaptacion
#   - Util: exportToExcel
#
# Bonus: arreglado TSC preexistente en DashboardPage.tsx (PrecioPoolCard
# truncado de un sprint inacabado anterior). El sprint OMIE puede retomarse
# desde git history cuando se quiera.
#
# Pendiente proxima sesion (no bloquea):
#   - Componente MisLlamadasView
#   - Integracion CaptacionPage (tab Enviados, toggle Vista, buscador, etc.)
#   - Bloque accion "Recordar a responsable" en card Enviados
#   - Tests vista tabla
#   - Regenerar tipos TS Supabase para eliminar (supabase as any) en nuevos hooks

$ErrorActionPreference = "Stop"

Set-Location C:\Users\joliv\valere-v2

Write-Host "==> Pull de origin/main..." -ForegroundColor Cyan
git pull origin main
if ($LASTEXITCODE -ne 0) { Write-Host "Pull fallo. Resuelve conflictos y reintenta." -ForegroundColor Red; exit 1 }

Write-Host "==> Verificando TSC..." -ForegroundColor Cyan
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { Write-Host "TSC con errores. Abortando." -ForegroundColor Red; exit 1 }

Write-Host "==> Corriendo tests..." -ForegroundColor Cyan
npm test -- --run
if ($LASTEXITCODE -ne 0) { Write-Host "Tests fallidos. Abortando." -ForegroundColor Red; exit 1 }

Write-Host "==> Build de produccion..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Build fallido. Abortando." -ForegroundColor Red; exit 1 }

Write-Host "==> Stage de cambios..." -ForegroundColor Cyan
git add `
  supabase/migrations/20260519_sprint_vista_tabla_captacion.sql `
  supabase/functions/enviar-recordatorio/index.ts `
  supabase/functions/enviar-recordatorio/config.toml `
  src/features/captacion/api.ts `
  src/features/captacion/components/SelectorVista.tsx `
  src/features/captacion/components/BuscadorCaptacion.tsx `
  src/features/captacion/components/CeldaEditable.tsx `
  src/features/captacion/components/ChipsFiltros.tsx `
  src/features/captacion/components/PaginacionIncremental.tsx `
  src/features/captacion/components/TablaCaptacion.tsx `
  src/core/utils/exportToExcel.ts `
  src/features/dashboard/DashboardPage.tsx `
  src/features/dashboard/api.ts `
  docs/ESTADO.md `
  docs/SESIONES/2026-05-19-resumen.md `
  .cowork/outbox/

Write-Host "==> Commit..." -ForegroundColor Cyan
$commitMsg = @"
feat(captacion): vista tabla + edicion inline + pestana Enviados (sprint Carolina 2026-05-19)

Hallazgos #2 + #3 de revision con Carolina Aroca 2026-05-19.

Backend (aplicado en prod):
- supabase/migrations/20260519_sprint_vista_tabla_captacion.sql
  + 3 vistas: v_captacion_historico_completo, v_captacion_enviados_en_seguimiento, v_mis_llamadas
  + 3 RPCs: editar_campo_oportunidad, editar_campo_empresa, recordar_a_responsable
- supabase/functions/enviar-recordatorio (desplegada via CLI)

Frontend (hooks + componentes base, falta integracion en CaptacionPage):
- src/features/captacion/api.ts: 6 hooks nuevos con invalidacion cascada
- src/features/captacion/components/: SelectorVista, BuscadorCaptacion,
  CeldaEditable, ChipsFiltros, PaginacionIncremental, TablaCaptacion
- src/core/utils/exportToExcel.ts (SheetJS)

Bonus:
- Limpieza DashboardPage.tsx (PrecioPoolCard truncado de sprint inacabado).
  TSC vuelve a 0 errores tras meses con error preexistente.

Decisiones firmadas Juan 2026-05-19:
- Una pestana Enviados con sub-chips Analisis/Senior (siempre desde historial unificado).
- Edicion inline propagable (whitelist segura en RPC backend).
- Recordatorio = notificacion CRM + email via Resend.
- SLA: 3d amarillo / 5d rojo en pestana Enviados.
- Paginacion incremental con prompt al llegar a 200.

Proxima sesion: integrar componentes en CaptacionPage + tab Mis llamadas + tests.

Refs: docs/SESIONES/2026-05-19-resumen.md
"@

git commit -m $commitMsg

if ($LASTEXITCODE -ne 0) { Write-Host "Commit fallido." -ForegroundColor Red; exit 1 }

Write-Host "==> Push a origin/main..." -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) { Write-Host "Push rechazado. Revisa origen." -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "==> SPRINT COMMITEADO" -ForegroundColor Green
Write-Host "Backend ya en prod (SQL + Edge Function)." -ForegroundColor Green
Write-Host "Cloudflare Pages desplegara el frontend en ~2 min: https://valere-v2.pages.dev" -ForegroundColor Green
Write-Host ""
Write-Host "Recuerda regenerar tipos TS en algun momento:" -ForegroundColor Yellow
Write-Host "  npx supabase gen types typescript --project-id gtphkowfcuiqbvfkwjxb > src/core/types/database.ts" -ForegroundColor Yellow
