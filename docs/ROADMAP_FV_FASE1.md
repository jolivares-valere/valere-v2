# Hoja de ruta -- Modulo Seguimiento Plantas FV (Fase 1 MVP)

## REGLA DE ORO (innegociable)
**Dato no disponible != dato cero.** Sin medidor -> "sin medidor", no 0. compra_red NULL -> "--".
Datadis sin CUPS -> "pendiente". Incidencia no-FV -> empty state. Sin datos recientes -> frescura.

## ESTADO ACTUAL
- energy-balance RESUELTO (v3->v1, PR #42). Balance real en fv_kpi_diario (8/12 con medidor).
- PR #45 prompt v3. PR #46 checklist. PR #47 (MERGEADO): 3 pestanas a Supabase + excedente null sin
  medidor. tsc 0, 195 tests.
- Auditoria datos 2026-06-18: 5 sin empresa, 6 sin CUPS, 5 sin kWp, 12 alarmas sin clasificar/gestionar,
  incidencias vacia, datos ambar. Ver AUDITORIA_FV_DATOS_2026-06-18.

## DEUDA RESTANTE
- useIncidenciasFV importa FxIncidencia de fixtures.ts -> mover a types.ts del modulo.

## PENDIENTE -- ORDEN DE PRs (prioridad = valor companero)
1. Centro de Operaciones del dia (MAXIMA prioridad): bandeja alarmas activas + plantas sin datos +
   sin asignar + sync fallido + potencia 0 + sin medidor. Fila: Planta|Cliente|Problema|Severidad|
   Desde cuando|Ultima sync|Accion. Responde: que mirar HOY.
2. Resumen limpio (quitar bloques mock residuales).
3. Alarmas gestionables (revision/resolver/convertir en incidencia; severidad->prioridad; tipo='otro';
   sin empresa_id NO insertar). REQUIERE clasificar severidad en el SYNC. Migracion futura: origen='fv'+FK.
4. Detalle planta + notas (fv_planta_nota).
5. Frescura (constante unica verde<6h/ambar 6-24h/rojo>24h) + quitar POST 403 notificaciones del front.

## METODO
PRs PEQUENOS, uno por bloque. Validar tsc+tests+auditoria. Herramienta: Claude Desktop/Code con acceso
real al filesystem o desarrollador humano (scripts .py via PowerShell solo para parches 1-2 lineas).
Refactor de paso: separar api.ts (~690 lineas) en api/ cuando crezca.

## OBJETIVO DE PRODUCTO
Responder rapido: que plantas mirar hoy, clientes con problemas, plantas sin datos, alarmas activas,
excedentes relevantes, plantas sin medidor, acciones tomadas. Prioridad: Centro Operaciones > Alarmas
gestionables > Ficha planta+notas > Frescura. Datadis espera al cruce CUPS; mientras "pendiente".

## NO BLOQUEANTE
compra_red_kwh NULL (mainsUsePower v1). day-real-kpi 503 (intradia, sin tabla).
