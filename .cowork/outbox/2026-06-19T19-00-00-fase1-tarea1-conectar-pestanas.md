# FASE 1 Tarea 1 -- conectar 3 pestanas a Supabase (2026-06-19e)

## Hecho (PR #47, cfd3cc9) -- revisado Browser OK
- 3 hooks reales en api.ts. SeguimientoFVPage sin FIXTURE_*. tsc 0, 195 tests.
- Cero mock en Excedentes/Incidencias/Informes.

## Deuda (corregir en tareas 2-6)
- excedente_fv_kwh = 0 en sin-medidor -> deberia ser null.
- useIncidenciasFV importa FxIncidencia de fixtures.ts -> mover a types.ts del modulo.

## Pendiente Fase 1 (tareas 2-6)
Centro Operaciones, alarmas gestionables, detalle planta+notas, frescura, KPIs derivados.
Por partes (Cowork, scripts .py) o Desktop. Revisar con CHECKLIST.

## Metodo
file-tool de Cowork NO llega al disco real de valere-v2. Usar script .py via PowerShell.
