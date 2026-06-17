# Checklist / criterio de aceptacion - PR Claude Desktop (Fase 1 MVP FV)

> Linea base ANTES verificada en vivo (Browser, 2026-06-19). La validacion del PR de
> Desktop es BINARIA contra esta tabla.

## ANTES (estado base verificado)
- Excedentes/Datadis: MOCK puro, sin llamada a Supabase. Plantas ficticias (Industrias Perez, Garcia Logistica).
- Incidencias CRM: MOCK puro, sin llamada a incidencias. (Panificadora Norte, Coop. Agricola Levante).
- Informes: MOCK puro, sin llamada a v_informe_mensual.
- Resumen: datos reales (fv_planta+fv_kpi_realtime) MEZCLADOS con bloques mock ("Incidencias abiertas", "Comparativa FV vs Datadis").
- notificaciones: cada carga dispara POST /rest/v1/notificaciones -> 403 (INSERT desde frontend). GET no-leidas = 200 OK.
- Reales ya OK: Resumen(KPIs), Plantas(12), Produccion(balance real), Alarmas(12), Credenciales(3), Sin asignar(5).
- Query base unica: GET /rest/v1/fv_planta?select=*,empresa:empresas(...),kpi_realtime:fv_kpi_realtime(*),cups:cups(...)

## DESPUES esperado (criterio de aceptacion)
- Excedentes/Datadis: sin mock; query real a fv_kpi_diario; excedente_kwh real; columna Datadis = "—".
- Incidencias CRM: sin mock; query real a incidencias o empty state honesto.
- Informes: sin mock; query real a fv_informe_mensual o empty state honesto.
- Resumen: sin bloques ficticios.
- notificaciones: DESAPARECE el POST 403; frontend solo lee/marca leidas.

## 8 PUNTOS ROJOS (rechazar el PR si falla alguno)
1. NO usar FIXTURE_COMPARATIVA / FIXTURE_INCIDENCIAS / FIXTURE_INFORMES en flujo real.
2. NO fallback silencioso a fixtures si Supabase devuelve vacio (empty state honesto).
3. NO crear tablas nuevas inventadas (fv_kpi_diario ya tiene balance; fv_informe_mensual ya existe).
4. NO abrir INSERT generico en notificaciones (frontend solo lee/marca; creacion via sync/service_role o RPC).
5. NO usar tipos de incidencia FV inexistentes (enum tipo_incidencia: facturacion/cambio_comercializadora/corte_suministro/potencia/acceso_red/otro -> usar 'otro').
6. Plantas sin medidor (CORTIJO EL CABRIL, FOAM JAEN, GUADIX, HOTEL SIERRA LUZ) -> "sin medidor / balance no disponible", NUNCA error ni 0.
7. compra_red_kwh NULL -> "—", NO derivar sin validar contra respuesta real.
8. npx tsc --noEmit 0 errores y npm test --run en verde.

## Mapeo alarma->incidencia (enums reales verificados)
- tipo -> 'otro'. severidad->prioridad: critica->critica, mayor->alta, menor->media, aviso->baja. estado inicial -> 'abierta'.
- Si falta empresa_id (NOT NULL) -> NO insertar, accion bloqueada.
- Pestana Incidencias: incidencias no tiene origen/FK a fv_alarma -> empty state + proponer migracion (origen='fv' o fv_alarma_id), no mezclar comerciales.

## Verificacion por red (Browser, post-despliegue)
- POST 403 a notificaciones DEBE desaparecer.
- Deben APARECER llamadas nuevas: Excedentes->fv_kpi_diario, Informes->fv_informe_mensual, Incidencias->incidencias.

## Tareas Fase 1 esperadas (del prompt v3)
quitar mock -> conectar 3 pestanas -> Centro de Operaciones del dia -> alarmas gestionables ->
detalle planta + notas (fv_planta_nota) -> frescura (constante unica verde<6h/ambar 6-24h/rojo>24h) ->
KPIs reales en Resumen, badges derivados de queries (asignadas=empresa_id NOT NULL, sin asignar=NULL).
NO en Fase 1: curva intradia (day-real-kpi 503), Datadis completo (cruce CUPS), informes PDF.
