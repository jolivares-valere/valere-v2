# Arranque semana 4 + flecos del cron desplegados
**Fecha:** 2026-07-23 · **De:** Cowork · **Para:** Juan + auditor

## 1 · Flecos del cron (encargo auditor 23-jul) — HECHOS Y DESPLEGADOS

### (a) 400s mezclados → ahora dicen QUÉ CUPS
`datadis-consumos` **v7** desplegada. Cada respuesta 400 de Datadis añade una
entrada en `errores` del parte con `{ cups, etapa (contrato_400 | maximetro_400 |
consumo_400), error (primeros 150 chars del cuerpo) }`. El CUPS con flag=true
que anoche rebotó sus 4 llamadas quedará identificado en el run de las 03:30
de esta madrugada. Si repite → sonda de matriz sobre ese CUPS (ya integrada
en el worker, parámetro `sonda_cups`).

### (b) run de datadis-sync sin rastro → ahora deja parte
`datadis-sync` **v11** desplegada. Abre fila en `datadis_runs` al arrancar
(worker='datadis-sync') y la cierra SIEMPRE (éxito o error) con:
finished_at, cups_procesados (autorizados emparejados), llamadas (NIFs
consultados), filas_insertadas (updates aplicados) y resumen
{ok, nifs, sin_autorizacion, incidencias, zombis_purgadas, flag_autorizado, error}.
El run de las 05:15 deja de ser invisible.

### Verificación (madrugada del 24, la hace Cowork)
- `datadis_runs` debe tener DOS filas nuevas: 03:30 (consumos) y 05:15 (sync).
- En el parte de las 03:30: si hay 400s, el campo `errores` nombra el CUPS.

## 2 · Gate V3 — veredicto registrado
CIERRA CONDICIONAL escrito en el plan (bloque del auditor). Condición:
cronómetro <2 min con la próxima alta real Nagini de Julia; Cowork verificará
por SQL que nace en 'tramite' y con created_by relleno.

## 3 · Semana 4 — replanificación escrita en el plan
Orden vinculante: **PR-4.1 curva → PR-4.2 push lunes → F2 edición suministros
→ PR-4.3 velocidad**. GATE V4 = cierre del mes, viernes 31 (Juan demuestra
los 5 trabajos cronometrados + retro 30 min).

## 4 · Commit (lo ejecuta Juan)
Los fuentes v11/v7 ya desplegados + docs van directos a main (precedente c2b30f6:
worker ya desplegado = fix, no PR).

## 5 · Siguiente
Cowork arranca PR-4.1 (curva en pestaña Suministros: mensual + zoom diario +
CSV; 🟡 backfill incompleto; CHEMTROL como caso de aceptación) en rama
`claude/pr-4-1-curva-consumo`.
