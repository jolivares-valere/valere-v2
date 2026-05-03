# Plan Carolina-as-engine — el CRM como motor de captación (1 mayo 2026)

> Tras describir Juan los 3 canales reales de captación (Carolina telemarketing, comerciales, cartera), este plan reordena prioridades del CRM para servir primero al motor de captación real, no al producto teórico.

## El insight que cambia el plan

**Carolina es el motor de captación de Valere.** Llama, pide factura, manda propuesta. El proceso dura días por dependencia de la factura. **Esto no es un cuello de botella técnico, es un cuello de botella de fricción comercial — y el CRM puede atacarlo directamente.**

Ciclo actual estimado del Canal 1 (Carolina):

```
Carolina llama  →  pide factura  →  espera 1-7 días  →  factura llega  →
análisis manual (1-2 h)  →  propuesta a mano (1-2 h)  →  envío email  →  follow-up
```

Tiempo total típico: **5-10 días** desde llamada hasta propuesta enviada. Tasa de conversión cae con cada día que pasa: el cliente potencial pierde interés, otra consultora le llama, etc.

Ciclo objetivo con CRM:

```
Carolina llama  →  pide CUPS (no factura)  →  click "Diagnóstico"  →
SIPS + heurísticas en 30 seg  →  PDF auto generado  →  envía mientras está al teléfono
```

Tiempo total objetivo: **5-15 minutos** desde llamada hasta propuesta inicial. La propuesta se entrega **mientras Carolina sigue al teléfono**. La diferencia entre "te mando una propuesta esta semana" y "te acabo de mandar una propuesta, ¿la has recibido?" es ENORME en cierre.

## Los 3 canales — qué necesita cada uno del CRM

### Canal 1 — Carolina (telemarketing) — **prioridad #1**

**Volumen estimado:** mayor de los 3. El motor de pipeline.

**Lo que necesita Carolina del CRM:**

1. **Pantalla de llamadas activa** — vista que Carolina abre cada mañana con su lista de llamadas del día (leads asignados a ella, follow-ups pendientes, callbacks programados).
2. **Búsqueda rápida CUPS** — al teléfono, escribe el CUPS y aparece SIPS en pantalla (titular, comercializadora, tarifa, potencia). Sin pedir factura.
3. **Botón "Generar diagnóstico"** — un click → PDF white-label con propuesta inicial (FASE 41 modo diagnóstico).
4. **Botón "Enviar al cliente"** — email automático con plantilla personalizable + adjunto el PDF.
5. **Tracking del estado** — sin propuesta / propuesta enviada / propuesta vista / propuesta aceptada / propuesta rechazada.
6. **Llamada → Empresa → Oportunidad en 1 flow** — desde la pantalla de llamadas debe poder dar de alta empresa+contacto+oportunidad sin cambiar de pantalla.

**KPI individual para Carolina:**
- Llamadas/día.
- Propuestas enviadas/día.
- **Tasa de conversión llamada → propuesta** (cuántas llamadas terminan en propuesta enviada).
- **Tiempo medio llamada → propuesta** (días).
- Tasa de conversión propuesta → cliente.

### Canal 2 — Comerciales (captación activa) — **prioridad #2**

**Volumen estimado:** menor que Canal 1 pero ticket medio mayor (clientes industriales, multi-CUPS).

**Diferencia con Canal 1:** los comerciales gestionan ciclo más largo, multi-reunión, multi-stakeholder. Necesitan más herramientas de gestión de relación que de velocidad inicial.

**Lo que necesitan del CRM:**

1. **Generador de propuesta avanzado** (FASE 42) — para clientes ya con Datadis, comparativa de varias ofertas, recomendación argumentada.
2. **Dashboard personal** — pipeline propio, tareas pendientes, oportunidades estancadas.
3. **Adjuntos a propuestas** — facturas, autorizaciones Datadis, PDFs firmados.
4. **Calendario integrado** — visitas, llamadas, follow-ups con recordatorios.
5. **Tracking visitas** — cuándo, con quién, resultado, próximos pasos.

### Canal 3 — Cartera existente (retención) — **prioridad #3**

**Volumen estimado:** 24 empresas hoy, crecerá. Ticket medio renovación + upsell.

**El cron `daily_contract_check` (FASE 30.1, aplicado hoy)** ya cubre el flagship: detecta vencimientos en 60 días y crea oportunidad de renovación + tarea + notificación. Esto es 80% del flujo.

**Lo que falta:**

1. **Optimización trimestral automática** — cada trimestre, para cada CUPS con Datadis, lanzar análisis: ¿potencia bien dimensionada? ¿reactiva? ¿sigue siendo óptima la tarifa? ¿algún cambio de patrón? Si hay oportunidad de mejora → crear oportunidad tipo `optimizacion`.
2. **Reporting mensual al cliente** — PDF que se envía a todos los clientes activos con: consumo del mes, ahorro acumulado vs anterior comercializadora, incidencias gestionadas, próximas acciones. **Esto no es para venderle algo nuevo, es para que vea el valor.** Reduce churn al renovar.
3. **Alertas proactivas** — si el cliente entra en zona de riesgo (>30 días sin contacto, incidencia abierta >7 días, vencimiento <90 días), notificar al gestor.

## El sprint Carolina — versión concreta

Reformulación de las FASES 41 y 42 (modo diagnóstico + generador propuesta) con foco específico en Carolina:

### FASE 41 — Pantalla Carolina + modo diagnóstico (5-6 días)

**41.1: Pantalla `/captacion` (1 día)**

Vista nueva exclusiva para usuarios con role `consultant` (o nuevo `telemarketing`):
- Lista de llamadas del día (tareas tipo `llamada` asignadas, ordenadas por prioridad).
- Búsqueda CUPS prominente arriba.
- Botón "+ Nueva llamada" que abre flow rápido de captación.

**41.2: SIPS lookup Edge Function (1-2 días)**

`Edge Function sips-lookup` que dado un CUPS:
- Identifica distribuidora por prefijo.
- Llama al endpoint SIPS correcto.
- Devuelve titular, NIF, comercializadora actual, tarifa, potencias, fecha último cambio.
- Cache 7 días.

**41.3: Heurísticas sectoriales (1 día)**

Tabla `heuristicas_consumo_sector` con consumo estimado kWh/empleado o kWh/m² por CNAE:
- 4711 — Comercio menor alimentación: ~150 kWh/m²/año.
- 5510 — Hoteles: ~250 kWh/m²/año.
- 1071 — Industria pan: ~500 kWh/m²/año.
- (etc., catálogo de ~30 sectores principales)

Datos de referencia INE / IDAE / Eurostat. Documentación en el archivo SQL.

**41.4: Generador diagnóstico PDF (1-2 días)**

Plantilla PDF "Diagnóstico inicial Valere" con:
- Logo Valere.
- Datos SIPS (lo que ya pagas aproximadamente — "tu tarifa actual en X comercializadora cuesta ~€Y/año estimado").
- Heurística sectorial — "para una empresa de tu sector y tamaño, esperamos consumo de ~Z kWh/año".
- Comparativa OMIE — "el mercado spot últimos 90 días promedió €X/MWh, tu contrato fijo equivaldría a €Y/MWh".
- Top 3 hipótesis ahorro: optimización potencia (si SIPS muestra potencia alta), cambio fijo→indexado, reactiva.
- Cifra final: "estimamos ahorro potencial €X-Y/año".
- Llamada a acción: "Para confirmar este ahorro con tus datos reales, necesitamos 5 minutos de su tiempo y la autorización Datadis".

**41.5: Flow rápido captación (1 día)**

Wizard único en `/captacion` que combina:
- Datos llamada (nombre, teléfono, email).
- CUPS (auto-completa empresa+tarifa+potencias desde SIPS).
- Click "Generar diagnóstico".
- Click "Enviar por email".
- Auto-crea: empresa, contacto, oportunidad (etapa `prospecto`), actividad (tipo `llamada`), documento (tipo `diagnostico_inicial`).

**41.6: Tracking apertura emails (opcional, 0.5 día)**

Pixel de tracking en email enviado → marca `documento.visto_en` cuando el cliente lo abre. Permite a Carolina decir "veo que has abierto el diagnóstico, ¿qué te ha parecido?".

### FASE 42 — Generador propuesta avanzada (3 días)

Para Canal 2 (comerciales) y Canal 3 (renovaciones), donde sí hay Datadis:

**42.1: Hook `useGeneradorPropuesta(empresa_id)` (1 día)**

Combina:
- Curva Datadis 12m del/los CUPS.
- Tabla `omie_precios_horarios` 12m.
- Ofertas comparadas (manual por ahora — lista de comercializadoras con precios actualizados por admin, futuro RFP automático).
- Cálculo de ahorro fijo vs indexado vs hibrido.

**42.2: PDF white-label (1 día)**

Plantilla más completa que el diagnóstico inicial:
- Resumen ejecutivo con cifra ahorro y plazo.
- Análisis de consumo: curva visual, distribución por períodos, baseload vs picos, factor potencia.
- Comparativa 3-5 ofertas con justificación de la recomendada.
- Cláusulas de servicio Valere.

**42.3: Tracking aceptación (1 día)**

Botón "marcar como aceptada" en `propuestas` → mueve oportunidad a `contrato_firmado`, dispara workflow contratación (FASE 32 futuro).

### FASE 43 — Optimización trimestral automática (3 días)

Para Canal 3 (cartera):

**43.1: Edge Function `optimization-detector` cron trimestral**

Para cada CUPS con Datadis activo, comparar:
- Potencia consumida 4-horaria vs potencia contratada (¿sobre/sub dimensionada?).
- Reactiva acumulada (¿penalizable?).
- Patrón consumo (¿cambios significativos vs trimestre anterior?).

Si detecta oportunidad → crear oportunidad tipo `optimizacion` + tarea al gestor.

**43.2: Reporting mensual cliente (2 días)**

PDF auto generado el día 5 de cada mes, enviado a `cliente.contactos[es_decisor]` con:
- Consumo del mes vs mes anterior.
- Ahorro acumulado año en curso.
- Incidencias gestionadas.
- Próximas acciones de Valere.

**Esto es retención pura.** El cliente ve el valor cada mes, renueva sin pestañear.

## Ajuste del plan revisado

Reordenando con la información de los canales:

### Mes 1 — habilitar a Carolina (~14 días)

| Día | Sub-fase | Tarea |
|---|---|---|
| 1-2 | Cierre Sprint A pendiente | 30.2 + 30.3 + 30.7 con input Juan |
| 3-4 | Sprint adopción | KPI uso CRM por usuario + dashboard admin |
| 5-6 | FASE 34-bis | SIPS lookup + OMIE diario |
| 7-12 | FASE 41 | Pantalla `/captacion` + diagnóstico + flow rápido |
| 13-14 | Validación con Carolina | sesión real con leads, iterar pantalla |

**Outcome mes 1:** Carolina genera 10 propuestas/día desde CRM. Ratio llamadas → propuestas se duplica.

### Mes 2 — habilitar a comerciales y retener cartera (~10 días)

| Día | Sub-fase | Tarea |
|---|---|---|
| 1-3 | FASE 42 | Generador propuesta avanzada para Datadis |
| 4-8 | FASE 36-bis | Validador facturas v0 (3 reglas) — sirve a Canal 3 |
| 9-10 | FASE 38-bis | KPI "€ recuperados" home + vista `/suministros` |

### Mes 3 — automatizar retención cartera (~5 días)

| Día | Sub-fase | Tarea |
|---|---|---|
| 1-3 | FASE 43 | Optimización trimestral + reporting mensual cliente |
| 4-5 | Iteración | Bugfixes + mejoras según feedback Carolina/comerciales |

### Diferidos a mes 4+

- FV calculator (FASE 40.1).
- CAEs detector (FASE 40.2).
- Portal cliente (FASE 32.3 — depende RLS 30.9).
- Sentry DSN real cuando haya volumen.
- Tests, convergencia visual, mobile responsive.

## Implicaciones organizativas

### Carolina necesita acompañamiento al rollout

El "Sprint adopción" del mes 1 NO es opcional. Carolina lleva años con su flujo (Excel + email + WhatsApp). Cambiar a CRM requiere:
- Sesión 1:1 con Carolina diseñando la pantalla `/captacion` ANTES de construir.
- Versión beta en sus manos en día 7 — feedback iterativo.
- Reconocer que los primeros 5 días con CRM serán más lentos que sin CRM (curva aprendizaje).
- KPI primer mes: "% llamadas registradas en CRM" (objetivo 80%, no 100%).

### Los comerciales son secundarios pero importantes

Si los comerciales no usan FASE 42 (generador propuesta avanzada), seguirán usando Word + Excel. Mismo riesgo de adopción. Mismo enfoque: 1:1, beta iterativo, ganar adopción con velocidad de generación.

### El cliente final no necesita el CRM (todavía)

El "Portal cliente" estaba en sprints anteriores como diferenciador. **Con esta nueva información, baja en prioridad.** El cliente percibe valor por:
- Velocidad de Valere en mandar propuestas (Canal 1+2).
- Reporting mensual (Canal 3).
- Resolución de incidencias.

Ninguno de estos requiere portal. El portal es nice-to-have para 6-12 meses, no diferenciador inmediato.

## Pregunta concreta a Juan antes de empezar Sprint Carolina

Para diseñar bien `/captacion` necesito saber:

1. **¿Carolina trabaja sola o con equipo de telemarketing?** Si hay equipo, multiusuario; si es ella sola, single-user.
2. **¿Sus leads vienen de una lista (compra/heredada/organic) o construye ella la lista?** Cambia si necesitamos importador masivo o no.
3. **¿Cuántas llamadas hace al día actualmente? ¿Cuántas propuestas envía a la semana?** Para dimensionar la pantalla.
4. **¿Tiene acceso a SIPS hoy o trabaja a ciegas hasta tener factura?** Si ya consulta SIPS manualmente, el ahorro es masivo. Si no, hay que enseñar.
5. **¿Qué herramienta usa hoy para el seguimiento?** Excel, Hubspot free, Google Sheets, libreta. La transición depende de esto.
6. **¿Qué plantilla de email usa para mandar propuestas?** Para reproducir la voz/tono en el envío automático.

Con respuestas a estas 6 preguntas, en 30 minutos tengo el wireframe definitivo de `/captacion`.

## Cierre

El plan original era "construir CRM vertical de consultoría energética profesional". El plan revisado tras saber los canales es "**construir el CRM que multiplica la productividad de Carolina y luego escalar al resto**". Es más concreto, más medible, y la cifra de ROI se hace evidente: si Carolina pasa de 3 propuestas/día a 10 propuestas/día con la nueva pantalla, el sprint se paga solo en 2 semanas.

Lo demás del roadmap sigue siendo válido — pero la secuencia óptima es **Carolina primero, todo lo demás después**.

— Cowork, 1 mayo 2026.
