# S0.2-ter EJECUTADO — flag de autorizacion + 400 masivo = run fallido — 2026-07-22/23
Encargo del auditor (via Juan) tras el run 03:30: 96 candidatos, 2 CUPS, 8/8 llamadas
400, 0 filas, y el parte lo contaba como run limpio (0 errores).

## Diagnostico verificado en datadis_runs (no de palabra)
- Run 03:30: candidatos 96 · 2 CUPS procesados · status {contrato:{400:2},
  maximetro:{400:2}, consumo:{400:4}} · 0 filas · errores []. Runs previos: 200/429.
- CAUSA RAIZ: datadis_sincronizado es PEGAJOSO (se marca al aparecer en supplies y
  nunca se desmarca al revocar la autorizacion) → CUPS revocados entran en el lote,
  van los primeros (sin datos = mas antiguos) y queman el presupuesto en 400s.
- datadis_autorizado existia como columna pero estaba sin poblar (0 true) y sin usar.

## Ejecutado
1. FLAG POBLADO por SQL con la evidencia del sync de hoy (datadis_ultima_sync >=
   hoy = aparecio en supplies): 95 true / 3 false (los 3 = revocados, incluyen los
   del 400 masivo).
2. datadis-sync v10 DESPLEGADO: mantiene el flag FRESCO en cada run — true al
   matchear supply; false para CUPS procesados que no aparecen (revocado). Nuevo
   campo en el parte: flag_autorizado {marcados_true, marcados_false}.
3. datadis-consumos v6 DESPLEGADO: (T1) candidatos = sincronizado AND autorizado;
   (T2) 400 masivo → out.ok=false + parado_por='400_masivo' + entrada en errores
   (el parte ya no cuenta como limpio un run que no avanzo) + aborta el lote en
   cuanto detecta ≥8 llamadas todas-400 (no quema cuota).
4. BONUS: el fuente de datadis-consumos NO estaba en el repo (solo desplegado) —
   añadido supabase/functions/datadis-consumos/index.ts (v6 completo).

## Verificacion (auditor, madrugada del 23)
- Run 03:30 consumos: candidatos ~95, primer CUPS de worklist con datos → filas > 0;
  resumen.ok=true. Si vuelve el 400 masivo: run marcado FALLIDO y abortado pronto.
- Run 05:15 sync: flag_autorizado en el parte; los 3 false se mantienen o se
  recuperan si el cliente re-autoriza.
- Los 3 CUPS con autorizado=false: identificar y decidir (¿re-tramitar autorizacion?).

## Guion commit Juan
```powershell
cd C:\Users\joliv\valere-v2
git add supabase/functions/datadis-sync/index.ts supabase/functions/datadis-consumos/index.ts docs/ESTADO.md .cowork/outbox/2026-07-22T18-00-00-s02ter-flag-autorizacion.md
git commit -m "fix(s02ter): flag datadis_autorizado fresco (sync v10) + candidatos por flag y 400 masivo = run fallido (consumos v6, fuente añadido al repo)"
git push origin main
```
