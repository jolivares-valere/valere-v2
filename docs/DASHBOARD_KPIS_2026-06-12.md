# Dashboard CRM — KPIs y Reportes (sprint domingo 2026-06-12)

Sprint para reforzar el Dashboard del CRM Valere con KPIs reales orientados a la
operativa diaria y completar los reportes básicos del módulo Informes. Pensado
para llegar al lunes 7 días con métricas accionables para los comerciales y para
dirección.

## Resumen ejecutivo

- **Dashboard** (`src/features/dashboard/`): se mantiene todo el dashboard
  existente (alertas de vencimiento, KPIs base, KPIs avanzados, pipeline, precio
  pool OMIE, alertas accionables, contratos huérfanos, mis tareas) y se añade un
  bloque nuevo "Cartera y operativa" con 4 cards:
  - Suministros bajo gestión (total + breakdown electricidad/gas + top tarifas).
  - Ahorro entregado (€/año estimado + comisión cartera).
  - Asistente IA (24h) (consultas, % con respuesta, similitud media).
  - Alertas operativas (incidencias + renovaciones pendientes + contratos sin
    firmar > 30 días).
- **Informes** (`src/features/informes/`): añadidos 3 reportes a los 2
  existentes (`Comercial mensual` y `Cartera activa`):
  - **Pipeline de oportunidades** — listado con valor, ahorro, probabilidad,
    días sin actividad y comercial. Export CSV.
  - **Renovaciones próximas** — contratos por vencer en ventana 30/60/90/180
    días, con CUPS, comercializadora, tarifa, consumo y comercial. Export CSV.
  - **Histórico de propuestas** — propuestas con estado, fechas envío/respuesta,
    ahorro estimado y comisión. Export CSV.
- **Permisos**:
  - Dashboard sigue accesible a todos los usuarios autenticados (con scope
    automático por rol — master/manager ven global, resto ve sus datos).
  - Informes restringido a `master`, `manager`, `admin` y `comercial` vía
    `AuthGuard roles`. Sidebar filtra el link por el mismo criterio.
  - Constante `INFORMES_ROLES_PERMITIDOS` exportada desde
    `src/features/informes/InformesPage.tsx` para reutilizar.

## Archivos tocados

```
src/features/dashboard/api.ts            (+queries: useSuministrosKPI,
                                          useAhorroAcumulado, useAsistenteRagKPI,
                                          useAlertasOperativas)
src/features/dashboard/DashboardPage.tsx (+sección "Cartera y operativa" con
                                          4 cards nuevas + CardShell/Skeleton/Error)
src/features/informes/api.ts             (+queries: useInformePipeline,
                                          useInformeRenovacionesProximas,
                                          useInformePropuestasHist)
src/features/informes/InformesPage.tsx   (refactor a array de tabs + 3 tabs nuevas
                                          + export INFORMES_ROLES_PERMITIDOS)
src/features/informes/components/InformePipeline.tsx               (nuevo)
src/features/informes/components/InformeRenovacionesProximas.tsx   (nuevo)
src/features/informes/components/InformePropuestasHist.tsx         (nuevo)
src/App.tsx                              (roles en /informes)
src/components/layout/Sidebar.tsx        (filtro roles en item Informes)
src/core/auth/permissions.ts             (+/informes en whitelist asesor_senior)
```

No se han tocado: `supabase/functions/generar-propuesta-pptx/`,
`src/features/analisis/`, `src/features/propuestas-energia/`, ESIOS/datadis,
`src/features/auth/`, `src/features/admin/PendingUsersPage*`. Tampoco se han
creado migraciones (no han hecho falta — todas las queries usan tablas
existentes).

## KPIs implementados (cartera y operativa)

### Suministros bajo gestión
- **Query**: `useSuministrosKPI(comercialId?)`.
- **Fuente**: `cups` (estado='activo', deleted_at IS NULL).
- **Scope**: si hay comercialId, primero busca empresas con
  `empresas.comercial_id = comercialId` y filtra CUPS por `empresa_id IN (...)`.
  Si no hay empresas, devuelve 0 sin llamar a `cups` (early return).
- **Categorización energética**: helper `categorizarTarifa()` clasifica por
  prefijo del código de tarifa:
  - `RL.*`, `GAS*` → gas.
  - `2.0TD`, `3.0TD`, `6.x`, `*TD` → electricidad.
  - Resto → otro.
- **Output**: `{ total, por_tipo: { electricidad, gas, otro }, por_tarifa: [...] }`.
- **Datos reales (12 jun 2026)**: 69 CUPS activos, todos electricidad
  (34× 6.1TD, 33× 3.0TD, 1× 6.2TD, 1× sin tarifa).

### Ahorro entregado
- **Query**: `useAhorroAcumulado(comercialId?)`.
- **Fuente**:
  - `oportunidades.ahorro_anual_estimado` sumado para etapas
    `cerrada_ganada`, `contrato_firmado`, `activo`.
  - `contratos.comision_integra` sumado para `estado='activo'`.
- **Output**: `{ ahorro_anual_eur, comision_cartera_eur, oportunidades_ganadas }`.
- **Limitación**: depende de que el comercial rellene
  `ahorro_anual_estimado` al cerrar la oportunidad. Si no, este KPI muestra "—".
  No es un cálculo real desde facturas (eso vive en `savings_calculations` del
  módulo Potencias, fuera del alcance de este sprint).

### Asistente IA (últimas 24h)
- **Query**: `useAsistenteRagKPI()` (sin scope — el log es anónimo).
- **Fuente**: `crm_asistente_log` filtrado por `fecha > now() - 24h`.
- **Output**: `{ consultas_24h, pct_encontrada, similitud_media }`.
- **Edge case**: 0 consultas en 24h → no peta, muestra "Sin consultas en las
  últimas 24h".

### Alertas operativas
- **Query**: `useAlertasOperativas(comercialId?)`.
- **Fuente**:
  - `contratos` (estado='incidencia') → `facturas_incidencia`.
  - `renovaciones` (deleted_at IS NULL, estado NOT IN ('renovado','perdido'))
    → `renovaciones_pendientes`. **Nota**: la tabla `renovaciones` no tiene
    `comercial_id` propio, no se filtra por scope (límite aceptado).
  - `contratos` (estado='tramite', created_at < hoy-30d)
    → `contratos_sin_firmar_30d`.
- **Output**: `{ facturas_incidencia, renovaciones_pendientes,
  contratos_sin_firmar_30d }`.

### Performance esperada

- Todas las queries usan `head: true` + `count: 'exact'` cuando solo necesitamos
  el contador (no traen filas).
- `staleTime: 60s` en los 4 hooks nuevos para evitar refetch en cada
  navegación.
- React Query deduplica entre componentes (los hooks comparten cache via
  queryKey).
- La query de `useSuministrosKPI` con scope hace 2 round-trips (empresas →
  cups). Con 50 empresas y 70 CUPS la latencia es despreciable (<200ms).

## Reportes implementados

### Pipeline de oportunidades
- Lista `oportunidades` no cerradas, joinando empresa y comercial.
- Filtros: comercial (selector).
- Métricas totales: count, valor pipeline, ahorro anual estimado.
- Resalta en naranja días sin actividad > 30.
- Export CSV con `ExportButton` (utilidad ya existente).

### Renovaciones próximas
- Lista `contratos` activos con `fecha_fin` dentro de los próximos
  30/60/90/180 días (selector ventana).
- Joinea primer CUPS asociado al contrato (consulta separada por
  `contrato_id`, indexada).
- Badge de color por días restantes (rojo <30, naranja <60, amber resto).
- Export CSV.

### Histórico de propuestas
- Lista tabla `propuestas` con joins a empresa y oportunidad.
- Si hay scope, filtra por `oportunidad.comercial_id`.
- Métricas totales: total, enviadas/vistas, aceptadas, comisión estimada.
- Estado con badge de color por estado canónico
  (borrador/enviada/vista/aceptada/rechazada/caducada).
- Export CSV.
- **Edge case (12 jun 2026)**: tabla `propuestas` está vacía en prod (0 filas).
  Empty state lo refleja: "Aún no hay propuestas registradas en el sistema".

## Edge cases cubiertos

| Caso | Comportamiento |
|---|---|
| 0 CUPS activos | Card muestra "0" + "Aún no hay CUPS activos asociados", no peta. |
| 0 oportunidades ganadas | Card ahorro muestra "—" y mensaje, no peta. |
| 0 consultas RAG en 24h | Card muestra "0" + mensaje neutro. |
| 0 alertas operativas | Card muestra "0" en verde + "Sin alertas operativas abiertas". |
| Loading | Cada card tiene su skeleton de animación pulse. |
| Error | Cada card vira a rojo suave con mensaje "No se pudo cargar este KPI". |
| 0 propuestas en BD | Reporte muestra empty state propio. |
| Comercial sin empresas asignadas | `useSuministrosKPI` hace early return con 0. |
| Tabla `renovaciones` vacía | Query no peta (count=0). |
| Sin permiso a Informes | AuthGuard redirige a /dashboard. Sidebar oculta el item. |

## Validación

- **TSC** (`npx tsc --noEmit`): **no he podido ejecutarlo desde el sandbox**.
  El mount Linux del repo Windows está sirviendo archivos truncados (problema
  pre-existente de Cowork, ver `feedback_sandbox_git_writes.md`), tanto los míos
  como otros que ni siquiera he tocado. En disco Windows los archivos están
  íntegros — verificado leyendo varios offsets con la herramienta `Read` del
  filesystem nativo.

  **Acción para Juan (Claude Code CLI en Windows):**
  ```
  cd C:\Users\joliv\valere-v2
  npx tsc --noEmit
  npm test -- --run
  npm run dev
  ```
  Si TSC pasa a 0 errores y los tests siguen verdes, se puede pushear.

- **Datos reales del CRM (snapshot 12 jun 2026)** sobre los que se han validado
  las queries vía Supabase MCP:
  - 53 empresas, 30 oportunidades, 2 contratos activos, 69 CUPS activos.
  - 34 crm_asistente_log totales, 0 en últimas 24h.
  - 0 propuestas, 0 renovaciones, 0 incidencias.

- **Simulación visual**: cada card cubre los 4 estados (loading, error, empty,
  con datos). Reportes incluyen filtros, totales y export CSV.

## Notas para sprints futuros

1. El KPI "Ahorro entregado" usa `oportunidades.ahorro_anual_estimado` como
   proxy. Cuando el equipo de Potencias termine la integración de
   `savings_calculations` con CRM, sustituir por el cómputo real desde facturas.

2. El filtro por comercial en "Renovaciones pendientes" no aplica porque la
   tabla `renovaciones` no tiene `comercial_id`. Si en el futuro se añade,
   actualizar `useAlertasOperativas`.

3. Reportes exportan CSV. Si se quiere XLSX, instalar SheetJS y crear un
   `ExportXlsxButton` paralelo a `ExportButton` (no se ha hecho por mantener el
   alcance reducido y no añadir dependencias).

4. La tabla `propuestas` está vacía. Cuando entren propuestas reales,
   monitorizar performance del reporte histórico (ahora hace fetch completo
   sin paginar — fine hasta ~500 filas).

5. La sección "Cartera y operativa" se ha insertado antes del widget OMIE.
   Si quedara muy cargada la home, considerar moverla a una tab dentro del
   dashboard.
</content>
</invoke>