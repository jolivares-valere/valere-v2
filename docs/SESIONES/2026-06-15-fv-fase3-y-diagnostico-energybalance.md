# Sesión 2026-06-15 (cont.) — FV Fase 3 desplegada + diagnóstico energy-balance

## Qué se hizo

### Fase 3 — Sync FV semi-automático (DESPLEGADA y probada en vivo)
- EF `fv-upload-cookies` (v2 ACTIVE): recibe cookies del Renovador, cifra server-side, guarda en fv_credenciales_secret. El PC nunca tiene claves.
- Migración: estado `renovando` añadido al check de estado_sesion.
- Front: panel de renovación guiado (sustituye el comando python críptico). PR #19 mergeado.
- Renovador de doble clic (`scripts/fv-sync/renovar_sesion_fv.py` + .bat + instalador). Carpeta lista para el equipo: C:\Users\joliv\.claude\Renovador_Valere_FV\ (anon key incrustada).
- Avisos email de caducidad (≤3 días) en sync_job.
- **PROBADO EN VIVO:** Juan renovó JOLIVARES → login asistido PASA el WAF (14 cookies) → EF guardó → estado activa → sync trajo datos de las 7 plantas (ultimo_dato_diario hoy).

### FIX aplicado a prod durante la prueba (PENDIENTE portar al repo)
- `fv-upload-cookies` hacía `upsert` sin password_enc → 23502. Corregido a `UPDATE` (la fila siempre existe). Redesplegada v2.
- ⚠️ El index.ts en main aún tiene el `upsert`. HAY QUE PORTAR el fix (UPDATE) al repo en la próxima sesión, o un redeploy desde main lo rompería.

### Diagnóstico energy-balance (consumo/excedentes)
- Confirmado por captura de tráfico real (184 llamadas) que FusionSolar SÍ da consumo, autoconsumo y excedentes por planta si tiene medidor (existMeter:true).
- Endpoint: `/rest/pvms/web/station/v3/overview/energy-balance`. Campos: productPower, usePower, selfUsePower, onGridPower, totalBuyPower.
- Plan completo en `docs/PLAN_FASE4_FV_PANEL_CONSUMO.md`. Captura en outputs/fv_captura_184.json (bodies truncados a 8000).

## Pendiente (Fase 4 — sesión dedicada)
1. Portar el fix UPDATE de fv-upload-cookies al repo.
2. Incrustar anon key en el renovar_sesion_fv.py DEL REPO (el de la carpeta del equipo ya la tiene).
3. Ampliar conector para energy-balance + columnas BD + panel CRM (generación+consumo+excedentes).

## Decisiones
- Renovación de cookies cada ~7 días, hecha desde el PC del usuario (multiusuario). Vía EF dedicada (sin claves en PC).
- FusionSolar cubre consumo/excedentes para plantas con medidor → no se depende de Datadis para el panel FV.
