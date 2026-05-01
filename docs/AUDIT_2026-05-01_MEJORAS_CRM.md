# Auditoría de mejora — Valere CRM (1 mayo 2026)

> **Auditor:** Claude Cowork (sesión 2026-05-01) sobre rama `claude/sprint2-lib-potencias` (HEAD `7980c6b`).
> **Disparada por:** análisis estratégico de Juan en navegador (5 áreas + matriz de priorización).
> **Objetivo:** verificar el análisis del browser contra el código real, ampliarlo con capa técnica + UX y proponer un roadmap accionable.
> **Veredicto rápido:** el análisis del browser apunta a las palancas correctas, pero subestima lo que ya existe en BD/Edge Functions y sobreestima alguna carencia. Cada área tiene piezas hechas que sólo necesitan **conectarse** — el grueso de la deuda no es construir, es **cablear**.

---

## Resumen ejecutivo

| Área | Estado real | Brecha principal | Esfuerzo agregado |
|---|---|---|---|
| 1. Comercial | Pipeline energético creado (FASE 21.a), pero datos económicos huecos | Falta cablear CUPS↔Oportunidad y exigir contactos | 🟡 Medio |
| 2. Contratos | Modelo decente + alertas de vencimiento + Edge Function rollover | Edge Function sin programar; faltan precios P1–P6 €/kWh; sin historial | 🟠 Alto |
| 3. Post-venta | Tabla `incidencias` lista, pero `cups` es TEXT (no FK); sin validador facturas | Validador facturas + alertas Datadis → incidencias auto + portal cliente | 🔴 Muy alto |
| 4. Datos/analítica | 2 informes existentes, Datadis aislado del CRM | Vincular CUPS↔empresa al sincronizar Datadis; ampliar informes | 🟡 Medio |
| 5. Escalabilidad | RLS granular escrito (no aplicado), roles definidos sin UI específica | Aplicar FASE 20.9 + portal cliente + firma digital | 🟠 Alto |
| 6. Técnica | TS regenerados ✅; 111 `as never` legados; 6 ficheros test (cobertura ~3%) | Limpiar deuda de tipos + ampliar tests + observabilidad | 🟡 Medio |
| 7. UX/diseño | "Dos escuelas" CRM/Calc; aria-label gap 46%; 5 `confirm()` nativos | Convergencia visual gradual + a11y básica | 🟡 Medio |

---

## Metodología

Para cada carencia descrita por el browser se ha:

1. Buscado la entidad o feature en `src/features/`, `src/core/types/entities.ts` y `supabase/migrations/`.
2. Comprobado si existe SQL/triggers/Edge Functions que ya cubran el caso.
3. Distinguido tres categorías:
   - ✅ **Resuelto en código** (aunque el navegador no lo refleje porque no hay datos cargados).
   - 🟡 **Esqueleto creado, sin cablear** (el SQL/feature existe pero no se usa o no hay automatización).
   - ❌ **No existe** (ni schema ni código).

Esa distinción cambia totalmente las estimaciones: lo que está en categoría 🟡 cuesta horas, no semanas.

---

## Área 1 — Comercial

### 1.1 Pipeline "no habla el idioma de la consultoría energética"

**Veredicto del navegador:** parcialmente correcto. **Real:** 🟡 esqueleto sin cablear.

El check de `oportunidades.etapa` ya fue ampliado en `supabase/migrations/20260418_fase21a_pipeline_energetico.sql:21-38` para aceptar las etapas energéticas (`prospecto → auditoria_consumo → oferta_presentada → negociacion → contrato_firmado → activo → cerrada_ganada → cerrada_perdida`). El problema real es que `src/core/types/entities.ts:14` mantiene las dos familias mezcladas:

```ts
export type EtapaOportunidad =
  | 'prospecto' | 'contactado' | 'analisis' | 'propuesta_enviada'
  | 'negociacion' | 'ganada' | 'perdida' | 'cancelada'   // genéricas (legacy)
  | 'auditoria_consumo' | 'oferta_presentada'
  | 'contrato_firmado' | 'activo'
  | 'cerrada_ganada' | 'cerrada_perdida'                  // energéticas (FASE 21.a)
```

Y `src/features/dashboard/DashboardPage.tsx:20-26` sólo dibuja barras para el subset genérico (`prospecto/contactado/analisis/propuesta_enviada/negociacion`). Resultado: el comercial mueve oportunidades por etapas energéticas pero el dashboard sigue contando con las viejas.

**No es un problema de modelo, es un problema de migración de datos no terminada.** Fase 21.a se quedó a medias.

**Acción concreta (½ día):** migración de datos `etapa_genérica → etapa_energética` (`contactado→auditoria_consumo`, `propuesta_enviada→oferta_presentada`, `ganada→cerrada_ganada`, `perdida→cerrada_perdida`), retirar las genéricas del CHECK y del enum TS, refactorizar `DashboardPage.tsx` para iterar sobre las 8 etapas vivas.

### 1.2 Auditoría consumo aislada de Datadis

**Veredicto del navegador:** correcto. **Real:** ❌ no existe.

`Oportunidad` no tiene campo `cups_id` ni `cups[]`. La única conexión con datos energéticos es `contrato_origen_id` (que sólo aplica a renovaciones, no a captaciones nuevas). No hay endpoint que, al mover una oportunidad a `auditoria_consumo`, llame a `datadis-proxy` para precargar los últimos 12 meses.

Los datos sí están: `cups.energia_p1_kwh..p6_kwh` y la cache `datadis_consumos_cache` (creada en FASE Datadis del 2026-04-30) pueden alimentar el cálculo. Falta:

1. Tabla intermedia `oportunidad_cups` (N:M) o columna `cups_ids uuid[]` en `oportunidades`.
2. Hook `useAhorroEstimado(oportunidad_id)` que lea `cups.energia_p*_kwh` × `precio_referencia_mercado` − `precio_ofertado_oportunidad`.
3. Trigger UI: al mover a `auditoria_consumo`, abrir un drawer con el resumen + botón "Recalcular contra Datadis".

### 1.3 Contactos vacíos

**Veredicto del navegador:** correcto en producto, ya cubierto en schema. **Real:** 🟡 esqueleto.

`Contacto` (entities.ts:64-82) tiene `es_decisor: boolean` y `es_firmante: boolean`, pero no `rol_energetico` ('decisor' | 'tecnico' | 'administrativo' | 'propietario') ni `canal_preferido`. La propuesta del navegador es razonable pero conviene reutilizar los dos booleanos existentes en lugar de añadir campos paralelos.

**Acción concreta:** añadir `rol_energetico text CHECK IN (...)` y `canal_preferido text CHECK IN ('email','telefono','whatsapp','presencial')` (½ día). Crear validación de formulario que **bloquee guardar empresa nueva sin al menos un contacto con `es_decisor=true` o `rol_energetico='decisor'`**.

### 1.4 Importes huecos en oportunidad

**Veredicto del navegador:** parcialmente correcto. **Real:** ✅ campos existen, ❌ no se usan.

`Oportunidad.valor_estimado_eur` y `Oportunidad.ahorro_anual_estimado` ya están en BD (FASE 21.a). La vista `v_oportunidades_kpi` agrega ambos por etapa. La carencia real es que `OportunidadForm.tsx` no exige completarlos y `KanbanCard.tsx` no los muestra de forma prominente. **Es UI, no schema.**

**Faltan los campos energéticos detallados** que pidió el navegador (`consumo_anual_kwh`, `precio_actual_kwh`, `precio_ofertado_kwh`, `fee_valere_pct`, `plazo_meses`). Estos sí son tabla nueva.

---

## Área 2 — Contratos

### 2.1 Contratos vacíos en producción

**Veredicto del navegador:** correcto en datos, **el schema sí es rico**. La cobertura del modelo es decente:

```
contratos: numero_contrato, compania, tarifa_acceso, tarifa_cliente, tipo_energia, tipo_precio,
fecha_firma, fecha_inicio, fecha_fin, duracion_meses, consumo_sips_kwh, consumo_po_kwh,
potencia_contratada, comision_integra, comision_comercial, comision_jefe, estado, ...
```

**Carencia real:** falta el desglose por período P1–P6 de **precios** (energía €/kWh y potencia €/kW·año). Las potencias están en `cups.p1_kw..p6_kw` ✅, pero el contrato sólo tiene `potencia_contratada` (un único número). Para contratos 3.0TD/6.x donde hay 6 períodos diferenciados, el dato actual es insuficiente.

**Acción:** añadir a `contratos`:
- `precio_energia_p1..p6 numeric(8,5)` (€/kWh por período)
- `precio_potencia_p1..p6 numeric(10,2)` (€/kW·año por período)
- `documento_firmado_id uuid REFERENCES documentos(id)` para enlazar el PDF.

### 2.2 Alerta vencimiento desconectada — INCORRECTO

**Veredicto del navegador:** ❌ incorrecto. **Real:** ✅ existe Edge Function pero 🟡 sin programar.

Hay:
- Vista `contratos_por_vencer` con `dias_restantes` y `estado_alerta` ('critica'/'proxima'/'futura') — `supabase/migrations/20260418_fase21b_alertas_vencimiento.sql`.
- Función `get_resumen_vencimientos(comercial_id)` consumida por el dashboard.
- Edge Function `daily-contract-check` (`supabase/functions/daily-contract-check/index.ts`) que:
  1. Marca contratos `activo → vencido` si `fecha_fin < today`.
  2. Para los que vencen en ≤60 días sin oportunidad de renovación abierta, **crea una `oportunidades` `tipo='renovacion'`**.
  3. Crea una `actividad` tipo `tarea` para el comercial (vencimiento = fecha_fin − 30d).
  4. Crea una `notificacion` para el comercial.

**Lo que falta:** programar la Edge Function vía pg_cron. Sólo está el README explicándolo, no hay migration que la programe (mientras que `cleanup_pending_users_daily` sí lo está, en `20260426_signup_aprobacion_manual.sql:172`). **15 min de trabajo, no días.**

**Discrepancia de diseño con la tabla `renovaciones`:** la Edge Function crea oportunidades, no rows en `renovaciones`. El módulo `/renovaciones` es manual. Decidir: o se conecta el cron a `renovaciones` también, o se elimina la tabla y `/renovaciones` filtra `oportunidades.tipo='renovacion'`. **Recomendación: filtrar oportunidades** — `renovaciones` duplica datos.

### 2.3 Sin historial de precios

**Veredicto del navegador:** correcto. **Real:** ❌ no existe.

No hay tabla `historial_precios_contrato`. Tampoco columnas `precio_anterior_*` en `contratos`. Cuando se renueva, se reescribe sobre el mismo registro y se pierde el dato comparativo. Diseño correcto pero hay que decidir granularidad: `historial_precios_contrato` por renovación (1 fila por evento) frente a snapshots diarios para hacer benchmark contra OMIE. La primera opción es 80% del valor y 10% del coste.

---

## Área 3 — Servicio post-venta

### 3.1 Incidencias desconectadas de Datadis

**Veredicto del navegador:** correcto en lo importante. **Real:** ❌ no existe automatización; 🟡 vinculación débil a CUPS.

`incidencias.cups: text` (no `cups_id uuid` FK — `entities.ts:323`). Si se renombra el código CUPS o se borra, la incidencia queda huérfana. Y no hay ningún trigger ni Edge Function que abra incidencias desde alertas Datadis.

**Datos disponibles ya:**
- `datadis_consumos_cache` con `metodo_obtencion='estimada'` (lectura estimada).
- Cierres mensuales en `cups.energia_p*_kwh`.
- Potencias máximas en respuestas Datadis (no persistidas todavía).

**Acción:**
1. ALTER `incidencias`: `cups_id uuid REFERENCES cups(id)`. Migración de datos para los textos existentes.
2. Edge Function nueva `datadis-incidencias-detector` (cron diario) que:
   - Detecta lecturas estimadas en últimos 7 días → incidencia tipo `facturacion`.
   - Detecta excesos de potencia → incidencia tipo `potencia` con período + kW.
   - Detecta reactiva fuera de umbral → incidencia tipo `facturacion`.

### 3.2 Validador de facturas

**Veredicto del navegador:** correcto. **Real:** ❌ no existe módulo de validación; ✅ existe el dato.

La tabla `facturas` (renombrada desde `invoice_history` en FASE 20.7) tiene `consumption_p1..p6` y `surplus_p1..p6` desde FASE 20.0.1. La feature `analisis` (`/analisis`) usa esos datos para **calcular ahorro frente a ofertas de mercado** — no para **validar la factura emitida por la comercializadora**.

Son dos productos distintos. El validador sería:

```
Factura PDF → extracción LLM → comparativa contra cierres Datadis del CUPS →
diff por concepto (energía P*, potencia P*, reactiva, IE, IVA) →
estado OK/discrepancia → si discrepancia: incidencia auto + draft de reclamación.
```

**Esfuerzo:** alto (Edge Function con OCR/LLM + módulo UI + plantillas reclamación). **Impacto en servicio:** muy alto — es el diferenciador comercial más sólido.

### 3.3 Portal cliente

**Veredicto del navegador:** correcto. **Real:** ❌ no existe.

`UserProfile.role` admite `'master' | 'manager' | 'consultant' | 'client'` (entities.ts:6 limita a 3, pero CLAUDE.md y migraciones reconocen los 4). En `src/App.tsx:129` solo se hace gating real para `/admin` (`master|manager`). No hay rutas `/cliente/*` ni `AuthGuard` con `roles=['client']`.

**Fricción adicional:** las RLS granulares (`fase20.9`) nunca se aplicaron en producción (`docs/ESTADO.md` lo confirma). Sin RLS, un cliente podría ver datos de otros clientes — el portal no se puede abrir hasta que esto esté.

**Dependencia secuencial:**
```
RLS granular aplicado → User mapping cliente↔empresa_id → Portal cliente UI
```

---

## Área 4 — Datos y analítica

### 4.1 Informes vacíos

**Veredicto del navegador:** correcto. **Real:** 🟡 sólo 2 informes.

`InformesPage.tsx` muestra dos pestañas (Comercial mensual, Cartera activa). No hay informes energéticos sobre la cartera real (consumo, ahorro acumulado, penalizaciones, distribución tarifaria). Los datos están mayoritariamente en `cups`, `facturas`, `contratos` — falta SQL agregado y UI.

**5 informes propuestos** (orden por valor inmediato):

1. **Ahorro generado 12m** (€) — `SUM(ahorro_anual_estimado)` de oportunidades `tipo='renovacion' AND etapa='cerrada_ganada' WHERE fecha_cierre > now()-12m`.
2. **Vencen en 90d con precio actual vs OMIE** — `contratos_por_vencer` × precio mercado (requiere fuente OMIE: API o snapshot manual).
3. **Distribución tarifaria de la cartera** — `COUNT(*) GROUP BY tarifa_acceso, tipo_precio` sobre contratos activos.
4. **Top consumidores con ahorro relativo bajo** — para upsell. Cruza `cups.energia_p*` × `comisiones_contrato`.
5. **Reactiva acumulada último mes** — requiere tabla `datadis_reactiva` (sólo cache hoy).

### 4.2 Segmentación

**Veredicto del navegador:** parcialmente correcto. **Real:** 🟡 incompleto.

`Empresa.segmento` existe con valores `'industrial' | 'comercial' | 'servicios' | 'agricola' | 'residencial_colectivo'`. Es razonable pero **no granular como el navegador propone** (Hostelería/Sanitario/Deporte separadas). Y faltan:

- `tamano_empleados` (rango).
- `consumo_anual_estimado_kwh` (rellenado desde Datadis al asociar CUPS).

**Acción:** ampliar el ENUM de `segmento` con 3 valores extra (hosteleria, sanitario, deportivo) o convertirlo en `subsegmento` separado, y añadir las dos columnas. Migración trivial.

### 4.3 Datadis aislado — confirmado y crítico

**Real:** ❌ Datadis es un módulo huérfano.

`src/features/datadis/DatadisPage.tsx` no llama nunca a `empresas` ni asocia los CUPS bajadas a registros del CRM. La tabla `cups` tiene columnas `datadis_*` listas (entities.ts:140-144) pero no hay flujo UI que vincule el listado bajado de Datadis con un `empresa_id`.

**Es el cable más rentable del audit.** Una vez vinculado:

- Las fichas de empresa muestran sus CUPS reales con curva.
- Las oportunidades pueden precalcular ahorro en `auditoria_consumo`.
- Las incidencias automáticas tienen `cups_id` correcto.
- Los informes energéticos cuentan con el universo completo.

**Acción:** botón "Asociar a empresa" en cada fila del listado Datadis + asociación masiva por NIF Datadis ↔ `empresas.nif`. ½–1 día.

---

## Área 5 — Escalabilidad

### 5.1 Roles y permisos

**Veredicto del navegador:** parcialmente correcto. **Real:** 🟡 escrito sin aplicar.

- Roles definidos: `master | manager | consultant | client`.
- Único gating UI real: `/admin` requiere `master|manager` (`App.tsx:129`).
- RLS granular SQL existe (`20260418_fase20.9_rls_granular.sql` + `_draft_rls_hardening_8_tables.sql`) pero `docs/ESTADO.md` confirma "aplicación pendiente EXPLAIN ANALYZE en producción". La política activa sigue siendo `all_authenticated`.

**Riesgo de seguridad:** cualquier usuario aprobado ve toda la BD. Para multi-tenant con clientes externos esto es bloqueante — y bloquea por dependencia el portal cliente.

**Acción:** validar plan EXPLAIN, aplicar `fase20.9` en producción con feature flag por tabla (`empresas` primero, observar 48 h, después contactos, contratos, oportunidades, etc.).

### 5.2 Automatizaciones

**Veredicto del navegador:** parcialmente correcto. **Real:**

- ✅ Edge Function `daily-contract-check` lista (sin cron).
- ✅ Cron `cleanup_pending_users_daily` aplicado.
- ✅ Trigger `fn_calcular_alertas_solicitudes` activo en `solicitudes_potencia`.
- ❌ Sin notificaciones programadas al cliente final.
- ❌ Sin "envíame resumen semanal" configurable.

**Acción priorizada:** programar el cron del `daily-contract-check` (15 min) + Edge Function `weekly-digest` que mande email semanal al comercial con sus oportunidades estancadas y vencimientos.

### 5.3 Documentos y firma digital

**Real:** ✅ documentos ya existen, ❌ firma digital no.

Tabla `documentos` polimórfica (`entidad_tipo + entidad_id + ruta_storage`) creada en FASE 24. Bucket `documentos` operativo. Lo que falta:

- Campo `firmado_el timestamptz` en `documentos`.
- Integración con Signaturit/DocuSign o flujo manual con upload del PDF firmado + verificación de hash.
- Generador de "Autorización Datadis" desde el CRM (hoy se hace por email manual).

El módulo Potencias ya tiene `src/features/potencias/lib/client-docs.ts` — reutilizar la base.

---

## Área 6 — Capa técnica (añadida)

| Item | Estado | Nota |
|---|---|---|
| `Database` types regenerados | ✅ | `src/core/types/database.ts` 5011 líneas. `client.ts:1-20` usa `Database` real (no `any`). |
| `as never` legados | 🟡 | 111 ocurrencias todavía en `src/`. Mayoría en `incidencias/api.ts` (25), `renovaciones/api.ts` (20), `calendario/api.ts` (17). Indican que esas tablas no están en el `Database` regenerado o tienen FKs raras. |
| Tests | 🔴 | 6 archivos `.test.*` con 33 invocaciones `it()`. Cobertura efectiva del dominio ≈ 3%. CLAUDE.md menciona "39/39 tests" — el número real son 33. |
| Edge Functions activas | ✅ | 7 desplegadas: `_shared`, `ask-crm-docs`, `chat-consultor`, `daily-contract-check`, `datadis-proxy`, `notify-admin-pending-user`, `notify-user-approval-decision`. |
| Gemini en cliente | ✅ | Resuelto vía `chat-consultor` Edge Function. CLAUDE.md aún lo lista como pendiente — actualizar. |
| pg_cron | 🟡 | Sólo `cleanup_pending_users_daily` programado. `daily-contract-check` huérfano. |
| Observabilidad | 🔴 | `logger.ts` propio sin sink remoto. Sin Sentry/Datadog/Logtail. Sin tracking de errores en producción. Edge Functions: solo `console.log` capturado por Supabase. |
| CI | 🟡 | GitHub Actions ejecuta build + TSC, pero según outbox 2026-04-30 hay **~60 errores TSC pendientes** en rama `claude/sprint2-lib-potencias`. Bloqueará merge a main. |
| Variables `.env.example` | 🟡 | Sólo 2 expuestas (URL + ANON_KEY). Falta documentar las requeridas por Edge Functions. |

---

## Área 7 — UX/diseño (añadida)

Resumen del `docs/DESIGN_REVIEW_2026-04-20.md` ya existente, vigente:

| Issue | Severidad | Coste de fix |
|---|---|---|
| **Dos escuelas visuales** (CRM `rounded-md` vs Calc `rounded-xl`) | Crítico | Alto (refactor gradual) |
| **Padding inconsistente** (`p-8` vs `p-4 md:p-8`) | Mejora | Bajo (sed con cuidado) |
| **5 `confirm()` nativos** en lugar de `ConfirmDialog` | Bug a11y | Bajo |
| **30 botones icon-only sin `aria-label`** (de 65, 46% gap) | A11y | Bajo |
| **3 patrones de loading** (`Skeleton`, `Loader2`, texto plano) | Mejora | Medio |
| **Colores fuera del DS** (`bg-blue-500` vs `bg-valere-blue-medium`) | Mejora | Bajo |
| **Tipografía H1 mixta** (`font-display` ausente en CRM features) | Mejora | Trivial |

**Adicionales encontrados en esta auditoría:**

- **Sidebar dual** (CRM + Potencias) con duplicación de algunas rutas (`/empresas`, `/calendario`). Puede confundir al usuario que percibe el CRM como "1 app, 2 columnas" en lugar de "2 apps".
- **Sin modo oscuro** — el sistema de variables CSS está preparado pero no hay toggle. Bajo coste si se decide priorizar.
- **Mobile**: `AppShell` tiene drawer móvil pero las páginas listado (`EmpresasPage` con tabla densa) no son responsivas — la tabla se desborda en móvil.
- **Densidad de información en Pipeline (Kanban)**: las tarjetas no muestran `ahorro_anual_estimado`. Es el campo que el browser pidió y ya existe — UI no lo aprovecha.

---

## Matriz priorización refinada

Reformulación de la matriz del navegador con los hallazgos del audit. Esfuerzo en días-persona. Impacto cualitativo (×1=bajo, ×3=alto).

| # | Acción | Imp. ventas | Imp. servicio | Esfuerzo | Score (Imp./Esf.) | Prioridad |
|---|---|---|---|---|---|---|
| 1 | Programar cron `daily-contract-check` + decidir `renovaciones` vs `oportunidades` | ×3 | ×3 | 0.5 | **12** | 🔴 P0 |
| 2 | Vincular CUPS Datadis ↔ Empresa (botón asociar masivo) | ×3 | ×3 | 1 | **6** | 🔴 P0 |
| 3 | Cerrar migración FASE 21.a (limpiar etapas legacy) | ×2 | ×1 | 0.5 | **6** | 🟠 P1 |
| 4 | Aplicar RLS granular FASE 20.9 (con feature flag) | ×1 | ×3 | 1 | **4** | 🟠 P1 |
| 5 | Añadir precios P1–P6 €/kWh y €/kW·año a contratos | ×3 | ×2 | 1 | **5** | 🟠 P1 |
| 6 | Validación: empresa nueva exige ≥1 contacto decisor | ×2 | ×1 | 0.25 | **12** | 🟠 P1 |
| 7 | Mostrar `ahorro_anual_estimado` en Kanban + tabla oportunidades | ×3 | ×1 | 0.25 | **16** | 🟠 P1 |
| 8 | `incidencias.cups: text → cups_id uuid FK` + migración | ×1 | ×3 | 0.5 | **8** | 🟠 P1 |
| 9 | Edge Function `datadis-incidencias-detector` (cron diario) | ×1 | ×3 | 2 | **2** | 🟡 P2 |
| 10 | Tabla `historial_precios_contrato` + KPI ahorro acumulado | ×3 | ×2 | 1.5 | **3.3** | 🟡 P2 |
| 11 | Validador de facturas (Edge Function + UI) | ×2 | ×3 | 5 | **1** | 🟡 P2 |
| 12 | Portal cliente (depende de #4) | ×3 | ×3 | 5 | **1.2** | 🟡 P2 |
| 13 | 5 informes energéticos | ×3 | ×2 | 2 | **2.5** | 🟡 P2 |
| 14 | `rol_energetico` + `canal_preferido` en contactos | ×2 | ×1 | 0.5 | **6** | 🟡 P2 |
| 15 | Convergencia visual (CRIT-1, CRIT-2 design review) | ×1 | ×2 | 3 | **1** | 🟡 P3 |
| 16 | Firma digital (Signaturit) en contratos | ×2 | ×2 | 3 | **1.3** | 🟡 P3 |
| 17 | Limpiar 111 `as never` legados | ×0 | ×1 | 1 | **1** | 🟢 P3 |
| 18 | Ampliar tests a 30% cobertura dominio | ×0 | ×2 | 5 | **0.4** | 🟢 P3 |
| 19 | Observabilidad (Sentry o equivalente) | ×0 | ×3 | 1 | **3** | 🟠 P1 |

**P0 = bloqueante / fruta colgando.** Score >5 con esfuerzo <1 día.

---

## Roadmap accionable

Tres sprints de 1 semana laboral para completar todo lo P0+P1, siguiendo la convención de FASES del proyecto. Detalle integrado en `docs/ROADMAP_FUSION.md` (FASES 30 → 32).

### Sprint A — "Cablear lo que ya existe" (FASE 30) · 5 días

Objetivo: convertir esqueletos en flujos funcionales sin escribir SQL nuevo significativo.

| FASE | Tarea | Días |
|---|---|---|
| 30.1 | Programar pg_cron de `daily-contract-check` (migration) | 0.25 |
| 30.2 | Decidir `renovaciones` vs `oportunidades.tipo='renovacion'` y consolidar | 0.5 |
| 30.3 | Cerrar migración FASE 21.a (limpiar etapas legacy + dashboard) | 0.5 |
| 30.4 | Mostrar `ahorro_anual_estimado` y `valor_estimado_eur` en Kanban + tabla | 0.25 |
| 30.5 | Validación form: empresa nueva sin contacto decisor → bloqueado | 0.25 |
| 30.6 | Botón "Asociar a empresa" en `DatadisPage` (filas individuales) | 0.5 |
| 30.7 | Vinculación masiva Datadis↔Empresa por NIF (acción admin) | 0.5 |
| 30.8 | `incidencias.cups: text → cups_id uuid FK` + migración de datos | 0.5 |
| 30.9 | Aplicar RLS granular FASE 20.9 con feature flag (1 tabla por día) | 1 |
| 30.10 | Sentry SDK (o Logtail) en frontend + Edge Functions críticas | 0.75 |

**Criterio de éxito:** todas las funcionalidades del navegador que decían "no funciona" empiezan a funcionar sin schema nuevo. PR mergeado a `main`.

### Sprint B — "Ampliar el modelo energético" (FASE 31) · 5 días

Objetivo: completar el modelo de datos para que la palanca económica esté en BD.

| FASE | Tarea | Días |
|---|---|---|
| 31.1 | ALTER `contratos`: `precio_energia_p1..p6`, `precio_potencia_p1..p6`, `documento_firmado_id` | 0.5 |
| 31.2 | ALTER `oportunidades`: `consumo_anual_kwh`, `precio_actual_kwh`, `precio_ofertado_kwh`, `fee_valere_pct`, `plazo_meses` | 0.5 |
| 31.3 | Tabla `oportunidad_cups` (N:M) + UI multi-select en form | 0.5 |
| 31.4 | Tabla `historial_precios_contrato` + trigger snapshot al renovar | 1 |
| 31.5 | ALTER `empresas`: `subsegmento`, `tamano_empleados`, `consumo_anual_estimado_kwh` (auto desde Datadis) | 0.5 |
| 31.6 | ALTER `contactos`: `rol_energetico`, `canal_preferido` | 0.25 |
| 31.7 | Hook `useAhorroEstimado(oportunidad_id)` con cálculo Datadis × precios mercado | 0.75 |
| 31.8 | 5 informes energéticos (informes/components/* + SQL agregado) | 1 |

**Criterio de éxito:** el comercial puede meter una nueva oportunidad y ver el ahorro estimado calculado contra Datadis del CUPS asociado. Informe "Ahorro generado 12m" muestra cifra real.

### Sprint C — "Diferenciar el servicio" (FASE 32) · 5 días

Objetivo: las dos palancas de fidelización (validador + portal) y la automatización post-venta.

| FASE | Tarea | Días |
|---|---|---|
| 32.1 | Edge Function `datadis-incidencias-detector` (cron diario) | 1 |
| 32.2 | Validador de facturas v0: subida PDF + extracción LLM (Claude o Gemini) + comparativa básica contra `cups.energia_p*` | 2 |
| 32.3 | Portal cliente v0: ruta `/cliente/*` + AuthGuard role=client + dashboard mínimo (suministros, ahorro, incidencias) | 1.5 |
| 32.4 | Generador de Autorización Datadis desde CRM (reutilizar lib Potencias) | 0.5 |

**Criterio de éxito:** Valere puede ofrecer al cliente un login propio donde ve sus suministros y ahorros — argumento comercial diferencial.

### Sprints diferidos (FASE 33+)

- Firma digital con Signaturit (o flujo manual con upload + hash).
- Convergencia visual completa (3 días dedicados a refactor `rounded-*`, padding, H1, eliminación `confirm()` nativo, aria-labels).
- Tests a 30% cobertura dominio.
- Limpieza de los 111 `as never` legados.
- Modo oscuro.
- Tabla móvil responsive (cards en lugar de tablas en `<lg`).

---

## Riesgos y dependencias

1. **`claude/sprint2-lib-potencias` con TSC roto.** Cualquier sprint nuevo que entre en `main` antes de cerrar `SPRINT3_TSC_PENDIENTE.md` se va a mezclar. Decisión: o cerramos Sprint 3 Potencias antes de empezar Sprint A, o trabajamos Sprint A en una rama hermana con cherry-pick selectivo.

2. **RLS granular sin EXPLAIN.** Si `is_manager_or_above()` causa timeouts en `oportunidades` (la consulta tiene 4 joins), aplicar la fase 30.9 puede degradar el dashboard. Mitigación: aplicar tabla a tabla, comparar `EXPLAIN ANALYZE` antes/después, rollback si p95 > 500 ms.

3. **Datadis `terceros` no aprobado.** El proxy v4 funciona en modo `portal` con credenciales del usuario. Para el portal cliente y vinculación masiva conviene tener acceso oficial — la solicitud está pendiente (ver `docs/ESTADO.md`).

4. **OMIE como fuente de precio mercado.** El informe "Vencen en 90d con precio actual vs OMIE" requiere fuente externa. Decidir entre snapshot manual semanal vs API OMIE (gratuita pero compleja) antes de Sprint B.

5. **Validador de facturas y privacidad.** Procesar PDFs con LLM expone datos del cliente. Decidir proveedor (Anthropic Claude, Gemini, OpenAI) y firmar DPA antes de Sprint C. Alternativa privada: pdfplumber + reglas determinísticas.

---

## Aclaraciones al análisis del navegador

Por transparencia, los puntos donde el navegador no acertó plenamente:

- **"No hay alerta de vencimiento"** → existe `daily-contract-check` y vista `contratos_por_vencer`. Falta programar el cron.
- **"Las oportunidades no tienen importe de ahorro"** → `valor_estimado_eur` y `ahorro_anual_estimado` ya existen en BD; sólo falta exponerlos en UI.
- **"No hay segmentación"** → `Empresa.segmento` existe (5 valores). Es limitada, no inexistente.
- **"Las incidencias están desconectadas de los suministros"** → técnicamente sí están conectadas vía `incidencias.cups: text`, pero es una FK débil; lo que falta es la **automatización**.
- **"39/39 tests"** (CLAUDE.md) → el número real son 33 invocaciones en 6 ficheros. Actualizar CLAUDE.md.

Y donde el navegador acertó plenamente:

- Datadis aislado del CRM — confirmado, es el cable más rentable.
- Validador de facturas inexistente — confirmado, es producto nuevo.
- Portal cliente inexistente — confirmado, depende de RLS.
- Falta historial de precios — confirmado, tabla nueva.
- Pipeline cosmético (etapas mezcladas) — confirmado, FASE 21.a a medias.
- Roles sin permisos diferenciados en UI — confirmado.

---

## Próximos pasos

1. Validar este audit y la priorización con Juan en sesión cara a cara o async.
2. Si OK → mover Sprint A al outbox `.cowork/outbox/` para que Claude Code lo recoja.
3. Pre-requisito: cerrar TSC pendiente de `claude/sprint2-lib-potencias` (`docs/SPRINT3_TSC_PENDIENTE.md`).
4. Una FASE por commit. TSC=0 antes del commit. Marcar ✅ en `docs/ROADMAP_FUSION.md`.

— Cowork, 1 mayo 2026.
