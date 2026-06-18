# Auditoria modulo Seguimiento Plantas FV -- datos + codigo (2026-06-18)

> Auditoria AUTONOMA a nivel de datos reales (Supabase) y codigo, NO visual. Mas fiable que
> inspeccion de UI: ve trazabilidad, RLS y huecos de datos. La hizo Cowork via MCP Supabase.

## Que funciona (verificado en datos)
- Sync operativo: 9 syncs en 24h, 12 KPIs realtime actualizados.
- Balance energetico real llega (energy-balance v1, PR #42): ultima fecha 17/06, 8/12 plantas
  con consumo, 7/12 con excedente, 10/12 con generacion.
- Informes mensuales: 3 reales, estado borrador, con energia.
- Alarmas: 12, con severidad y descripcion (NO vacias).

## Problemas detectados (cuantificados)
### Calidad de datos de plantas (12 total)
- Solo 7/12 con empresa asignada (5 huerfanas).
- Solo 6/12 con CUPS (la mitad nunca cruzara con Datadis).
- 5/12 con capacidad_kwp = 0/NULL (sin ratio kWh/kWp).
- 3/12 con estado 'desconocido' (normalizar).
### Alarmas sin clasificar ni gestionar
- Las 12 tienen UNA sola severidad: 'advertencia'. No hay critica/mayor/menor. El SYNC no clasifica.
- 0 resueltas. 0 generan incidencias (tabla incidencias VACIA).
### Frescura: datos del 17/06 ~13h, al auditar (18/06 ~07h) ~17h = AMBAR (6-24h).
### compra_red_kwh = 0/12 (NULL) -> deuda: revisar mainsUsePower v1.
### Incidencias VACIA (0 filas) -> confirma empty state correcto del PR #47.

## Recomendaciones priorizadas
1. Clasificar severidad de alarmas EN EL SYNC (sync_job.py).
2. Asignar empresa + CUPS a plantas huerfanas (datos).
3. Rellenar capacidad_kwp en el sync (5 plantas a 0).
4. Centro de Operaciones: ya hay material real el dia 1 (12 alarmas + 5 sin asignar + ambar).
