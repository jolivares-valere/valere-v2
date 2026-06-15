# Outbox 2026-06-15 (cierre) — FV Fase 3 lista, Fase 4 caracterizada

## HITOS DE HOY (en producción)
- Fase 1 credenciales FV: bug guardado RESUELTO (PR #17, migración + EF v6).
- Fase 3 sync semi-automático: DESPLEGADA y PROBADA EN VIVO. Renovador funciona, el WAF deja pasar el login asistido, sync trajo datos de las 7 plantas.

## PENDIENTE INMEDIATO (portar a repo)
1. **fv-upload-cookies**: el fix `upsert→UPDATE` se aplicó DIRECTO a prod (v2) durante la prueba. El index.ts en main aún tiene el upsert roto. PORTAR el fix al repo o un redeploy lo romperá.
2. **anon key** en `scripts/fv-sync/renovar_sesion_fv.py` del repo (sigue con placeholder __ANON_KEY__). La copia del equipo (C:\Users\joliv\.claude\Renovador_Valere_FV\) ya la tiene.

## FASE 4 — Panel consumo/excedentes (sesión dedicada)
- CONFIRMADO con captura real: FusionSolar da generación+consumo+autoconsumo+excedentes por planta (endpoint energy-balance, si existMeter:true). NO depende de Datadis.
- Plan completo: docs/PLAN_FASE4_FV_PANEL_CONSUMO.md. Campos exactos documentados.
- Trabajo: conector (energy-balance) + columnas BD + panel frontend tipo FusionSolar.

## RECORDATORIO renovación
- Las cookies de FusionSolar caducan ~7 días. Renovar con el Renovador del equipo. Avisos email ya activos.
