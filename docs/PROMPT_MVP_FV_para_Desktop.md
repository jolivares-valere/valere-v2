# Prompt para Claude Desktop — MVP operativo módulo Seguimiento Plantas FV (v2 FINAL)

> Esquema de Supabase y enums verificados en vivo el 2026-06-18. Usa SOLO las tablas,
> columnas y valores de enum que se citan aquí. NO inventes tablas, columnas ni valores.
> NO crees tablas que ya existen.

---

## Contexto
CRM Valere (React 19 + TS + Vite, Tailwind, Supabase, @tanstack/react-query).
Módulo en `src/features/seguimiento-fv/`. El sync de FusionSolar (GitHub Actions, Python en
`scripts/fv-sync/`) rellena las tablas FV. Objetivo: herramienta operativa diaria, sin datos
ficticios.

## Diagnóstico ya hecho (NO re-investigar, actuar)
En `src/features/seguimiento-fv/SeguimientoFVPage.tsx` (~líneas 42-44), estas tres pestañas
usan fixtures de forma INCONDICIONAL (no es un fallback, están hardcodeadas siempre):
```
const comparativa = FIXTURE_COMPARATIVA   // Excedentes/Datadis -> siempre mock
const incidencias = FIXTURE_INCIDENCIAS   // Incidencias CRM    -> siempre mock
const informes    = FIXTURE_INFORMES      // Informes           -> siempre mock
```
El flag `usarFixtures` (~línea 37) solo afecta Plantas y Sin asignar. Por eso conviven plantas
reales (Plantas/Resumen) con ficticias (Industrias Pérez, MercaVal, García Logística,
Panificadora Norte) en Excedentes/Incidencias/Informes. Esas tres pestañas NUNCA se conectaron
a Supabase. Mocks en `fixtures.ts` (FIXTURE_*) y `src/core/demo/mock-supabase.ts`.

## PASO PREVIO obligatorio (antes de tocar UI)
Busca TODOS los imports desde `fixtures.ts` (`grep -r "from.*fixtures" src/features/seguimiento-fv/`)
y deja en el PR una tabla: import / se ELIMINA del flujo de producción / se conserva solo
demo-dev. No modifiques UI hasta tener ese mapa.

---

## ESQUEMA REAL (usar exactamente estos nombres)

**fv_planta** (12 filas): id, empresa_id, credencial_id, station_code, plataforma, nombre,
nombre_interno, nombre_fusionsolar, pais, capacidad_kwp, tiene_bateria, tiene_esss,
fecha_conexion, estado, cups_id, region_url, empresa_mant_id, contrato_mant_ref,
garantia_hasta, empresa_instaladora, sync_enabled, creado_en, actualizado_en.
  -> Asignadas = empresa_id IS NOT NULL. Sin asignar = empresa_id IS NULL.
     Verificado: 7 asignadas + 5 sin asignar = 12.

**fv_kpi_realtime** (12, 1 por planta): planta_id, potencia_actual_kw, energia_hoy_kwh,
energia_mes_kwh, energia_total_kwh, ingresos_hoy_eur, actualizado_en.

**fv_kpi_diario** (44): planta_id, fecha, energia_kwh, potencia_max_kw, ingresos_eur,
consumo_kwh, autoconsumo_kwh, excedente_kwh, compra_red_kwh, creado_en.
  -> Origen de Producción y Excedentes. NO crear fv_produccion_diaria.
  -> consumo/autoconsumo/excedente/compra_red YA SE POBLAN con datos reales (energy-balance v1
     OK desde 2026-06-19). Cuando una planta no reporte un valor, viene NULL: muéstralo como
     "—"/"sin datos", NUNCA 0 inventado.

**fv_alarma** (12): id, planta_id, alarm_id, codigo, severidad, descripcion, dispositivo,
iniciada_en, resuelta_en, activa, creado_en, actualizado_en.

**fv_informe_mensual** (3): id, empresa_id, mes, estado, energia_total_kwh, ahorro_estimado_eur,
co2_evitado_kg, num_alarmas_criticas, num_alarmas_graves, notas, notas_gestor, gestor_id,
contenido_editado (jsonb), destinatarios (jsonb), generado_en, aprobado_en, enviado_en,
error_envio, creado_en, actualizado_en. -> YA EXISTE, no crear.

**incidencias** (CRM, 1 fila): id, empresa_id, contrato_id, cups, cups_id, titulo, descripcion,
tipo (enum tipo_incidencia), estado (enum estado_incidencia), prioridad (enum prioridad_incidencia),
asignado_a, fecha_apertura, fecha_limite, fecha_resolucion, importe_reclamado, importe_recuperado,
notas_resolucion, created_by, created_at, updated_at, deleted_at.
  ENUMS REALES (verificados):
   - tipo_incidencia: facturacion, cambio_comercializadora, corte_suministro, potencia, acceso_red, otro
     -> OJO: NO hay valor "FV". Ver sección "Mapeo alarma→incidencia".
   - estado_incidencia: abierta, en_gestion, pendiente_cliente, pendiente_comercializadora, resuelta, cerrada
   - prioridad_incidencia: baja, media, alta, critica
  -> NO tiene columna `origen` ni FK a fv_alarma. Hoy NO se puede distinguir una incidencia FV
     de una comercial de forma fiable. (Crítico, ver tareas.)

**fv_credenciales** (3), **fv_planta_credencial** (15), **fv_sync_log** (214),
**fv_sync_audit** (84): estado de sync y frescura.

**notificaciones** (0 filas): id, usuario_id (NOT NULL), tipo, titulo, cuerpo, entidad_tipo,
entidad_id, leida, leida_at, created_at.

**fv_planta_nota** (NUEVA, ya aplicada en prod 2026-06-18): id, planta_id, texto, autor_id,
creado_en, actualizado_en. Para notas por planta. RLS: read/insert/update/delete TO authenticated.

### Patrón RLS del módulo (respetar)
Escritura tablas FV: `fv_is_admin()`. Lectura: `fv_is_admin() OR empresas.comercial_id = auth.uid()`.

---

## REGLA badges/contadores (derivar SIEMPRE de queries reales)
Ningún contador hardcoded ni constante. Todos los badges de pestaña y KPIs se calculan de la query:
- Plantas asignadas = count(fv_planta WHERE empresa_id IS NOT NULL).
- Sin asignar = count(fv_planta WHERE empresa_id IS NULL).
- Total plantas = suma real de ambas.
- Alarmas activas = count(fv_alarma WHERE activa = true), por severidad real.
- Incidencias = count real de incidencias FV (ver mapeo; si no se distinguen, badge = 0 / empty).

## REGLA frescura (umbrales concretos, constante única configurable)
Define una constante única en el frontend (ej. `FRESCURA_UMBRALES = { verde: 6, ambar: 24 }` en horas),
no dispersa por componentes. Aplicada sobre `fv_kpi_realtime.actualizado_en` (y/o última sync):
- VERDE: último dato hace < 6 h.
- ÁMBAR: entre 6 h y 24 h.
- ROJO: > 24 h o sin dato.
Mostrar el indicador en cada planta y credencial, con la hora real de última sync.

## REGLA 403 notificaciones (NO abrir RLS)
NO añadas policy de INSERT en `notificaciones` para `authenticated`. Las notificaciones de
alarmas FV las genera el SYNC/backend (service_role, que bypasea RLS). Localiza el componente
del frontend que intenta insertar (es lo que da 403) y elimina ese flujo: el frontend solo LEE
y ACTUALIZA (marcar leída). Si hace falta creación manual desde UI, propón RPC SECURITY DEFINER,
no INSERT directo ni policy abierta.

## REGLA mock (cero datos inventados en producción)
Elimina el uso AUTOMÁTICO de fixtures en producción. Puedes conservar `fixtures.ts` para
demo/dev aislado, pero NUNCA como fallback ni mezclado con datos reales. Si una pestaña no tiene
datos reales, muestra EMPTY STATE operativo ("Sin datos reales disponibles") con causa probable
y acción siguiente (sincronizar / asignar planta / revisar credencial / vincular CUPS).
Prohibido mostrar Industrias Pérez, MercaVal, García Logística, Panificadora Norte.

## MAPEO alarma FV → incidencia CRM (explícito, NO improvisar)
Al "convertir alarma en incidencia":
- fv_alarma.planta_id -> buscar fv_planta.
- fv_planta.empresa_id -> incidencias.empresa_id (NOT NULL; si es NULL, NO insertar:
  mostrar acción bloqueada "planta sin empresa asignada").
- fv_planta.cups_id -> incidencias.cups_id (si existe; opcional).
- fv_alarma.descripcion -> incidencias.titulo y descripcion (si descripcion vacía, usar codigo/alarm_id).
- fv_alarma.severidad -> incidencias.prioridad:  critica->critica, mayor->alta, menor->media, aviso->baja.
- estado inicial -> 'abierta'.
- tipo -> 'otro'  (NO hay valor FV en el enum tipo_incidencia; NO inventar uno sin migración).
- Si falta empresa_id, NO insertar: acción bloqueada con explicación.

## REGLA pestaña Incidencias (no mezclar comerciales con FV)
HOY no se puede distinguir incidencias FV de comerciales (incidencias no tiene `origen` ni
`fv_alarma_id`, y la única fila existente puede no ser FV). Por tanto:
- La pestaña Incidencias del módulo FV debe mostrar SOLO incidencias realmente FV.
- Como no hay forma fiable de filtrarlas, muestra EMPTY STATE honesto y PROPÓN en el PR una
  migración: añadir `incidencias.origen text` (valor 'fv') y/o FK `fv_alarma_id uuid`.
- NO muestres incidencias comerciales genéricas en el módulo FV.

---

## TAREAS — FASE 1 (solo lo que NO depende de Huawei). En este orden:

1. **Conectar a datos reales las 3 pestañas mock.** En `SeguimientoFVPage.tsx` sustituye
   FIXTURE_COMPARATIVA/INCIDENCIAS/INFORMES por queries reales (hooks en `api.ts`, patrón
   `useTodasLasPlantas`):
   - Informes -> `fv_informe_mensual`.
   - Excedentes/Datadis -> derivar de `fv_kpi_diario` (`excedente_kwh`) - YA POBLADO (energy-balance v1 OK desde 2026-06-19); columna Datadis = sin cruce CUPS/Datadis completo por ahora.
   - Incidencias -> aplicar REGLA pestaña Incidencias (empty state + propuesta migración).

2. **Centro de Operaciones del día** (primero al entrar o en Resumen): bandeja priorizada de
   datos REALES: alarmas activas (fv_alarma.activa=true), plantas con dato antiguo (umbral
   frescura), sin asignar (empresa_id IS NULL), credenciales con sync fallido (fv_credenciales +
   fv_sync_log), potencia 0 / desconectada. Cada fila: planta, empresa, severidad, motivo,
   antigüedad, última sync, acción inline (abrir / marcar revisión / resolver / crear incidencia)
   sin cambiar de pestaña.

3. **Alarmas FV gestionables** sobre `fv_alarma` real. Filtros (severidad/planta/estado),
   acciones: marcar en revisión, resolver (resuelta_en + activa=false), convertir en incidencia
   (ver MAPEO). Contador del header con severidades reales.

4. **Detalle por planta + notas.** Clic en planta abre drawer/página con KPIs reales
   (fv_kpi_realtime/fv_kpi_diario), alarmas de la planta, última sync, credencial, CUPS (cups_id).
   Notas editables en `fv_planta_nota` (autor + fecha, guardado optimista). Tabla ya existe.

5. **Frescura de datos** (aplicar REGLA frescura con la constante única).

6. **KPIs de Resumen coherentes** (aplicar REGLA badges: todo derivado de queries reales).
   Normaliza estados (sin "Desconocido": Operativa/Avería/Sin conexión según último dato).

## BLOQUEADO por fuente de datos (NO implementar en Fase 1)
- Curva intradía (día) -> day-real-kpi 503/WAF, sin tabla fv_produccion_intradia.
- Consumo/autoconsumo/excedente reales -> energy-balance HTTP 500.
- Comparativa Datadis completa -> energy-balance + CUPS cruzado.
- Informes PDF finales.
Para estos: empty state operativo, NO UI sobre tablas vacías.

---

## Entrega
- Código sin uso automático de mock; 3 pestañas conectadas o empty state honesto.
- Centro de Operaciones funcional. Alarmas gestionables. Detalle de planta con notas.
- Frescura visible (constante única). Badges/KPIs derivados de queries reales.
- Validar: `npx tsc --noEmit` (0 errores) y `npm test -- --run` antes de cada commit.
- NO push directo a main: rama `claude/<descripcion>` + PR. (Y verificar `git branch --show-current`
  antes de commitear.)
- Checklist final: qué se conectó, qué quedó en empty state, confirmación de que NO se tocó la
  RLS de notificaciones, y la migración propuesta para distinguir incidencias FV.
