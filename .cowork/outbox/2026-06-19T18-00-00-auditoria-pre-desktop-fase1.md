# Auditoria pre-Desktop MVP FV -- 2026-06-19c

## Hecho
- Re-auditoria en vivo del CRM tras PR #42/#43/#44.
- Resumen y Produccion ya muestran datos reales de las 12 plantas.
- energy-balance se refleja visualmente: plantas con medidor (consumo/excedente/autoconsumo),
  plantas sin medidor (estado honesto, campos "--").
- Las 3 pestanas de Fase 1 (Excedentes/Datadis, Incidencias, Informes) siguen pendientes:
  no consultan Supabase, siguen con fixtures/mock.

## Decision
No lanzar Desktop con dos bloques contradictorios. Prompt MVP v3 fusionado y coherente:
energy-balance resuelto; Excedentes con fv_kpi_diario.excedente_kwh real; Produccion diaria con
fv_kpi_diario; Datadis completo y curva intradia siguen pendientes/no bloqueantes.

## Proxima sesion
- Lanzar Claude Desktop con el prompt unico (docs/PROMPT_MVP_FV_para_Desktop.md, NO el de actualizacion).
- Auditar resultado tras despliegue.
- (menor) compra_red_kwh NULL: revisar mainsUsePower en v1.
- (no bloqueante) day-real-kpi 503 intradia.
