# Auditoría técnica — Módulo Tarifas y Propuestas Comerciales

> **Fecha:** 2026-05-27
> **Autor:** Claude (Cowork) — sesión proyecto CRM VALERE
> **Estado:** Bloque 1 cerrado · Pendiente de revisión por Juan + ChatGPT antes de pasar a `PLAN_MODULO_TARIFAS_PROPUESTAS.md`
> **Propósito:** Inventario veraz de lo que ya existe en el repo `valere-v2` para el ciclo de tarifas energéticas, comparativa y propuesta comercial. Sin invenciones. Sin asumir.

---

## 0. Resumen ejecutivo

El módulo **NO se construye desde cero**. El CRM v2 ya tiene operativo entre el 60 y el 70 % del recorrido funcional descrito en el briefing de traspaso (sesión Make + ChatGPT, 26-27 mayo 2026). Las piezas existentes son:

- **Catálogo de comercializadoras** (CRUD admin completo).
- **Catálogo de ofertas/tarifas vigentes** (CRUD admin + importador masivo desde Excel).
- **Motor de comparativa** (lee facturas históricas, simula factura con N ofertas, rankea por ahorro, guarda en `proposals`).
- **Visor de propuestas generadas** con KPIs y exportación CSV.
- **Edge Function Gemini server-side** ya desplegada (`chat-consultor`) con patrón reutilizable.
- **Motor de cálculo de factura teórica** (`calculateInvoiceEstimate`) usado en el módulo Datadis para estimar la factura actual del cliente.
- **Sistema completo de roles, signup con aprobación y RLS** sobre el que apoyar permisos del módulo.

Lo que **falta** para cerrar el ciclo "tarifa llega → propuesta enviada al cliente" se enumera al final, en la sección 9, y se desarrolla en `PLAN_MODULO_TARIFAS_PROPUESTAS.md`.

---

## 1. Mapa de features actuales relacionadas

### 1.1 `src/features/admin/AdminPage.tsx`

Pantalla de administración con varios tabs. Dos de ellos son el corazón del módulo de tarifas tal y como existe hoy.

#### 1.1.1 `RetailersTab` (líneas 183-331) — gestión de comercializadoras

- **Tabla:** `comercializadoras`
- **Operaciones:** create / read / update / delete
- **Campos del CRUD:** `name`, `is_active`, `model`, `notes`
- **Campos del schema NO expuestos en UI:** `nif`, `tipo_energia`, `nombre_normalizado`, `legacy_potencia_com_id`, `activa`
- **Logo de comercializadora:** ❌ el campo **no existe en la tabla** y la UI no permite subirlo.

#### 1.1.2 `OffersTab` (líneas 334-627) — gestión de ofertas/tarifas

- **Tabla:** `comercializadora_ofertas` (en español; ver §2)
- **Operaciones:** create / read / update / delete
- **Campos del CRUD:** todos los del schema, con renderizado dinámico según la `access_rate` seleccionada (2.0TD vs 3.0TD vs 6.1TD ajusta nº de períodos visibles).
- **Lista de campos:** `comercializadora_id`, `product_name`, `access_rate`, `energy_prices[]` (P1-P6), `power_prices[]` (P1-P6), `surplus_model`, `surplus_price_per_kwh`, `entry_fee_eur`, `entry_fee_per_kw`, `annual_management_fee_eur`, `tender_fee_pct`, `activation_fee_eur`, `battery_fee_per_kwp_eur`, `allow_zero_invoice`, `min_contract_months`, `include_in_comparison`, `show_tolls_separately`, `notes`.
- **Flag operativo clave:** `include_in_comparison` (boolean). Si está `false`, la oferta existe en BD pero no entra en los análisis de `AnalisisPage`.

#### 1.1.3 `XLSXImportadorTarifas` (`src/features/admin/components/XLSXImportadorTarifas.tsx`)

- **Función real:** importador masivo de tarifas desde un Excel con cabeceras estándar (comercializadora, producto, tarifa, e1-e6, p1-p6, modelo_excedentes, precio_excedente, notas).
- **Comportamiento:** parsea, valida, **crea comercializadoras faltantes** sobre la marcha (línea 214) y hace **upsert** en `comercializadora_ofertas` con conflicto `(comercializadora_id, product_name)` (línea 249).
- **Implicación crítica:** el upsert por `(comercializadora_id, product_name)` significa que **una nueva versión de la misma tarifa pisa la anterior**. No hay histórico, no hay versionado.

### 1.2 `src/features/analisis/AnalisisPage.tsx`

Motor de comparativa ya en producción. No es un "esbozo": ejecuta el análisis real.

- **Lee:** `empresas`, `cups`, `facturas`, `comercializadora_ofertas` (filtrada por `include_in_comparison=true` y `access_rate=<tarifa del CUPS>`), `precios_regulados_boe`, `global_config`.
- **Escribe:** `proposals` (insert).
- **Flujo de usuario:**
  1. Selecciona cliente del dropdown.
  2. Selecciona CUPS de ese cliente.
  3. El sistema valida 4 checks: potencias contratadas, distribución energética, facturas cargadas, importes facturados.
  4. Click "Ejecutar Análisis" → itera cada factura × cada oferta vigente, simula la factura con la oferta, suma anual, rankea por ahorro descendente.
  5. Muestra KPIs + gráfico top-5 + tabla de detalle.
  6. "Guardar Propuesta" → insert en `proposals` con `comparison_results` (JSON con todas las ofertas ordenadas).
- **Función de cálculo:** `calculateSimulatedInvoice()` importada de `/core/energia/calculator` (no es `calculateInvoiceEstimate` — ver §3).
- **Puntos frágiles detectados:**
  - Línea 178: si no hay ofertas para la tarifa del CUPS, lanza error y bloquea.
  - Línea 183: si no hay precios BOE, avisa pero continúa con costes regulados a 0.
  - No hay tests.

### 1.3 `src/features/propuestas-energia/PropuestasEnergiaPage.tsx`

Vista de lectura sobre propuestas ya generadas.

- **Lee:** `proposals` con join a `cups` y `empresas` (FK `proposals_cups_id_fkey`).
- **Escribe:** delete sobre `proposals`.
- **Flujo:** lista de propuestas con 3 KPIs (cantidad, ahorro total, ahorro medio), buscador por cliente/CUPS/comercializadora, detalle modal con comparativa, **export CSV** y eliminación.
- **NO hay generación de PDF.** NO hay flujo de envío al cliente. NO hay borrador de email.

### 1.4 `src/features/datadis/` (relevante)

- **Tabla:** `datadis_supply_price_terms` (precios contractuales del CUPS, alimentada manualmente por el sprint Hito 2).
- **Función:** `useSupplyPriceTerms(cups)` en `src/features/datadis/api.ts:275` — devuelve la fila vigente (`valid_to IS NULL`).
- **Uso:** `SupplyDetailPage.tsx` tab "Factura Teórica" llama a `calculateInvoiceEstimate()` para estimar lo que el cliente está pagando hoy.

### 1.5 `src/features/datos/` y `src/features/captacion/`

Entradas de datos del cliente al CRM (no entran en el alcance directo del módulo de tarifas pero son la fuente de los CUPS/facturas que después se comparan).

---

## 2. Inventario de tablas Supabase relevantes

> **Aviso importante de nomenclatura.** El archivo `src/core/types/database_canonical_2026-04-26.ts` muestra los nombres **antiguos** (`retailers`, `retailer_offers`) porque los tipos están sin regenerar tras las migraciones de abril 2026. Las migraciones reales (`20260425_unificacion_potencias_aditiva.sql`, `20260426_fase1_unificacion_renames_schema.sql`) renombraron a:
>
> | Nombre antiguo (en tipos canónicos) | Nombre real en BD y código |
> |---|---|
> | `retailers` | **`comercializadoras`** |
> | `retailer_offers` | **`comercializadora_ofertas`** |
>
> Todo el código vivo (`AdminPage`, `AnalisisPage`, `XLSXImportadorTarifas`) usa los nombres en español. **Cualquier doc o código nuevo debe usar los nombres en español.** Hay un pendiente abierto en `docs/ESTADO.md` (sesión 2026-05-14): regenerar tipos para reflejar esto.

### 2.1 `comercializadoras`

Catálogo maestro de empresas comercializadoras (electricidad / gas).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | Nombre comercial (NOT NULL) |
| `nif` | text | NIF de la comercializadora |
| `tipo_energia` | text | "electricidad" / "gas" / "ambos" |
| `nombre_normalizado` | text | Para deduplicación |
| `model` | text | Modelo comercial (legacy Potencias) |
| `notes` | text | Notas libres |
| `activa` | bool | Activa para selección |
| `is_active` | bool | Duplicado heredado de fusión Potencias (a deduplicar) |
| `legacy_potencia_com_id` | text | Trazabilidad migración Potencias |
| `created_at` | timestamptz | |

**Faltan campos para el módulo objetivo:** `logo_url`, `web`, `email_contacto`, `agente_referencia`.

### 2.2 `comercializadora_ofertas`

Catálogo de tarifas/ofertas activas para comparativa.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `comercializadora_id` | uuid | FK a `comercializadoras` |
| `product_name` | text | Nombre comercial del producto |
| `access_rate` | text | 2.0TD / 3.0TD / 6.1TD |
| `energy_prices` | numeric[] | Array P1-P6 (€/kWh) |
| `power_prices` | numeric[] | Array P1-P6 (€/kW·día o equivalente) |
| `surplus_model` | text | Modelo de excedentes |
| `surplus_price_per_kwh` | numeric | Precio compensación excedentes |
| `entry_fee_eur` | numeric | Cuota de alta única |
| `entry_fee_per_kw` | numeric | Alta por kW |
| `annual_management_fee_eur` | numeric | Cuota gestión anual |
| `tender_fee_pct` | numeric | % licitación |
| `activation_fee_eur` | numeric | Activación |
| `battery_fee_per_kwp_eur` | numeric | Tarifa batería |
| `allow_zero_invoice` | bool | Permite factura 0 € |
| `min_contract_months` | int | Permanencia |
| `include_in_comparison` | bool | Flag de visibilidad en `AnalisisPage` |
| `show_tolls_separately` | bool | Desglose peajes |
| `notes` | text | |
| `created_at` | timestamptz | |

**Faltan campos críticos para el módulo objetivo:**

- `valid_from` / `valid_to` — vigencia de la tarifa.
- `status` — `pending_validation` / `published` / `superseded` / `rejected`.
- `version` o `superseded_by` — relación con la versión anterior.
- `source_document_id` — FK al documento fuente (PDF/Excel/email) del que vino la tarifa.
- `extracted_by_ai` (bool) + `confidence_score` (numeric) — trazabilidad de IA.
- `validated_by` (uuid → user_profiles) + `validated_at` — humano-en-el-bucle.

### 2.3 `proposals`

Resultado del análisis comparativo. Esta es la "propuesta comercial" tal y como existe hoy.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `cups_id` | uuid | FK a `cups` |
| `supply_point_id` | uuid | Legacy Calculadora (a revisar si sigue en uso) |
| `current_annual_cost_eur` | numeric | Coste actual estimado |
| `best_offer_retailer` | text | Nombre del retailer ganador (snapshot) |
| `best_offer_annual_cost_eur` | numeric | Coste anual con la mejor oferta |
| `best_offer_savings_eur` | numeric | Ahorro absoluto |
| `best_offer_savings_pct` | numeric | Ahorro porcentual |
| `comparison_results` | jsonb | Array completo con todas las ofertas ordenadas |
| `included_offers` | jsonb | IDs/snapshot de ofertas incluidas |
| `pdf_url` | text | **Existe pero no se rellena hoy** (no hay generador) |
| `status` | text | Sin enum documentado |
| `created_at` | timestamptz | |

**Faltan campos para el módulo objetivo:**

- `cliente_id` o `empresa_id` (desambiguar con CUPS).
- `comercial_id` (FK → `user_profiles`) — quién la generó.
- `approved_by` / `approved_at` — flujo de aprobación.
- `sent_at` — cuándo se envió.
- `email_draft_id` — relación con el borrador de email (tabla aún no existe).
- Estados normalizados: `draft` / `pending_review` / `approved` / `sent` / `rejected`.

### 2.4 Tablas auxiliares ya utilizadas

| Tabla | Uso |
|---|---|
| `empresas` | Cliente al que pertenece el CUPS |
| `contactos` | Personas vinculadas a empresa (destinatarios de propuestas) |
| `cups` | Puntos de suministro |
| `contratos` | Contrato vigente / histórico del CUPS |
| `facturas` | Facturas históricas usadas para simular |
| `precios_regulados_boe` | Precios BOE para costes regulados |
| `global_config` | IVA, IEE, etc. |
| `datadis_supply_price_terms` | Precios contractuales por CUPS (Hito 2) |

### 2.5 Tablas que el briefing proponía crear pero **NO hace falta crear**

| Propuesta original (ChatGPT) | Lo que ya existe |
|---|---|
| `tariff_versions` | `comercializadora_ofertas` (extender con `valid_from`/`valid_to`/`status`/`version`) |
| `tariff_products` | Catálogo lógico — basta normalizar `product_name` o añadir tabla `tariff_products_catalog` ligera |
| `tariff_prices` | Ya están como arrays `energy_prices[]` y `power_prices[]` |
| `commercial_comparisons` | `proposals.comparison_results` (JSON) |
| `commercial_proposals` | `proposals` (extender) |

### 2.6 Tablas que **sí** hay que crear (mínimas)

| Tabla nueva | Propósito |
|---|---|
| `tariff_documents` | Documento de origen (PDF/Excel/email) tras la captura por Make. Una fila por documento entrante, con SHA256, ruta Drive, estado, metadatos email. |
| `tariff_extractions` | Respuesta cruda + estructurada de Gemini sobre un documento. Permite reextracción y auditoría. |
| `comercializadora_ofertas_history` | Histórico al sobreescribir una oferta. Alternativa: añadir `valid_to` + estado `superseded` y consultar histórico filtrando. **Recomendación: estado en la misma tabla, sin tabla aparte.** |
| `proposal_email_drafts` | Borrador de email asociado a una propuesta. Estado, asunto, cuerpo, destinatario, fecha de envío. |

---

## 3. Motor de cálculo — Diferenciación crítica

El repo tiene **DOS motores de cálculo distintos** y conviene no mezclarlos.

### 3.1 `calculateInvoiceEstimate` (`src/core/energia/invoiceEstimate.ts`)

- **Input:** una fila de `datadis_supply_price_terms` (los precios reales que el cliente paga hoy) + consumo Datadis del mes.
- **Output:** estimación de la factura que **el cliente está pagando actualmente**.
- **Uso:** tab "Factura Teórica" de `SupplyDetailPage` (módulo Datadis).
- **NO sirve directamente para comparar con ofertas de otras comercializadoras.**

### 3.2 `calculateSimulatedInvoice` (`src/core/energia/calculator`)

- **Input:** una factura histórica + una oferta de `comercializadora_ofertas`.
- **Output:** simulación de lo que esa factura habría costado con esa oferta.
- **Uso:** `AnalisisPage` itera esta función `N facturas × M ofertas` y rankea.
- **Este sí es el motor del comparador.**

**Implicación para el módulo:**

- El comparador ya está hecho (`calculateSimulatedInvoice` + bucle en `AnalisisPage`).
- El "comparador certificado" del que se hablaba en el briefing (con todos los conceptos: alquiler, IEE, IVA, reactiva, excesos) puede apoyarse en lógica de `calculateInvoiceEstimate` para estimar mejor el "coste actual" antes de comparar.
- A futuro convendría **unificar ambos motores** en una sola librería con dos puntos de entrada, pero NO es prerrequisito del módulo.

---

## 4. Patrón Edge Function Gemini — `chat-consultor`

`supabase/functions/chat-consultor/index.ts` está desplegado y operativo. Documenta el patrón a replicar para la futura `tariffs-extract`.

**Características clave del patrón:**

- Runtime Deno + `serve` de `deno.land/std@0.208.0`.
- Cliente Supabase via `npm:@supabase/supabase-js@2.100.0`.
- Gemini via `npm:@google/genai@1.0.0`.
- Secrets: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
- **Verificación JWT obligatoria** (rechaza llamadas sin auth header).
- **CORS estricto** con allowlist (`ALLOWED_ORIGINS`).
- Modelo actual: `gemini-2.0-flash-exp`.
- Estructura `messages: [{role, content}]` traducida a `{role, parts}` para Gemini.
- `systemPrompt` opcional → `config.systemInstruction`.

**Para `tariffs-extract` los cambios serían:**

- Input: documento (PDF/Excel) en Drive + lista de comercializadoras y productos existentes para que la IA proponga match.
- Output: JSON estructurado con campos de `comercializadora_ofertas` + propuesta de match a comercializadora existente o creación nueva.
- Verificación JWT igual (sólo usuarios autenticados pueden disparar extracción).
- Modelo recomendado: `gemini-2.5-flash-lite` o `gemini-3.1-flash-lite` (lee PDFs nativos, coste mínimo).
- **NO necesita Make para llamar a la función.** El flujo es: Make sube doc + metadata → `tariffs-ingest` registra → `tariffs-extract` se ejecuta async (trigger o cola).

---

## 5. Sistema de auth, roles y RLS — estado

Ya construido en sesiones previas (ver `CLAUDE.md`, sección "Auth & Signup"):

- Tabla `user_profiles` con `role`, `approved`, `status`.
- `AuthGuard` en `src/App.tsx` redirige a `/pending-approval` si `approved !== true`.
- Master único hardcoded: `jolivares@valereconsultores.com` se aprueba automáticamente.
- Tab "Pendientes" en `AdminPage` para aprobar/rechazar usuarios.
- Edge Functions `notify-admin-pending-user` y `notify-user-approval-decision` (Resend).
- Cron diario `cleanup_pending_users_daily` (03:00 UTC).
- **RLS granular activa** con 20+ policies.
- Pendiente: SQL `20260422_fase28_6_rls_policies_cleanup.sql` por ejecutar en prod.

**Implicación para el módulo:**

- Los permisos por usuario para "ver tarifas", "validar tarifas", "publicar", "generar propuesta", "aprobar envío" se modelan con `role` en `user_profiles` + policies RLS sobre las tablas nuevas.
- NO hace falta diseñar un sistema de roles nuevo.

---

## 6. Edge Functions desplegadas — inventario

```
supabase/functions/
├── _shared/                          # Helpers compartidos
├── ask-crm-docs/                     # RAG sobre docs del CRM (asistente)
├── chat-consultor/                   # Chat IA con Gemini (patrón base)
├── daily-contract-check/             # Cron contratos
├── fv-create-credential/             # Alta credenciales FusionSolar
├── notify-admin-pending-user/        # Email admin tras signup
├── notify-user-approval-decision/    # Email usuario tras aprobación/rechazo
└── trigger-fv-sync/                  # Trigger sync FV
```

**Pendientes (a crear para el módulo Tarifas):**

- `tariffs-ingest` — recibe webhook de Make con metadatos + archivo en Drive, hace dedup por SHA256, registra en `tariff_documents`.
- `tariffs-extract` — toma un `tariff_document` y llama a Gemini para extraer estructura → guarda en `tariff_extractions` y propone `comercializadora_ofertas` en estado `pending_validation`.
- `proposals-generate-pdf` — genera el PDF de propuesta con plantilla Valere (opción: server-side con `@react-pdf/renderer` o equivalente Deno, o delegar a un servicio).
- `proposals-send-email` — envía email aprobado vía Resend (mismo provider que ya está conectado para auth).

---

## 7. Convención de datos del cliente — Datadis vs Excel

**Hallazgo:** el briefing planteaba "subida de Excel del consumo del cliente" como flujo principal. La realidad del CRM es que **Datadis ya está sincronizado** para clientes con CUPS dado de alta:

- Las facturas reales del cliente viven en la tabla `facturas`.
- `AnalisisPage` ya las consume directamente (línea 142 aprox.).
- Para clientes con Datadis activo, el comparador funciona **sin necesidad de subir nada**.

**Implicación:** el flujo Excel debe ser tratado como **fallback** para casos sin Datadis:

- Prospectos en captación todavía no contratados.
- Clientes nuevos cuyo alta Datadis está pendiente.
- Datos aportados manualmente por colaborador.

Para el MVP del módulo de propuestas esto significa que **NO hay que construir un importador Excel desde cero** — basta con permitir que el comercial seleccione "modo Datadis" (default) o "modo manual" (subir XLSX con columnas P1-P6 kWh + potencias).

---

## 8. Pendientes operativos que afectan tangencialmente al módulo

De `docs/ESTADO.md` (sesión 2026-05-14, última actualización):

- ⏳ **SQL fase 28.6** (`supabase/migrations/20260422_fase28_6_rls_policies_cleanup.sql`) sin ejecutar en prod. No bloquea el módulo pero hay que ejecutarlo antes de tocar RLS de tablas nuevas.
- ⏳ **Regenerar tipos Supabase TypeScript** — afecta `(supabase as any)` cast en datadis y al uso de los nombres `retailers/retailer_offers` antiguos. Conviene hacerlo antes de crear tablas nuevas para que el módulo nazca con tipos limpios.
- ⏳ **RESEND_API_KEY** no configurado en local (warning en sync). El módulo Tarifas usará Resend para el email de propuesta — confirmar que está bien configurado en producción de Supabase Functions secrets.
- ⏳ **Commit local `60ab260` no pusheado** (Hito 2 factura teórica) — verificar antes de abrir rama del módulo.

---

## 9. Resumen del delta — qué falta realmente

> Esta sección es el puente con `PLAN_MODULO_TARIFAS_PROPUESTAS.md`. Aquí solo enumero. El plan detalla cómo.

### Capa 1 — Ingesta y captura

- [ ] **Tabla `tariff_documents`** (nueva).
- [ ] **Edge Function `tariffs-ingest`** (nueva).
- [ ] **Modificar escenario Make** para que tras subir a Drive llame al endpoint `/tariffs/ingest` con metadatos en lugar de operar localmente.
- [ ] **Carpetas Drive** ya existen (`TARIFAS_VIGENTES`, `TARIFAS_HISTORICAS`) — se reutilizan.

### Capa 2 — Extracción IA

- [ ] **Tabla `tariff_extractions`** (nueva).
- [ ] **Edge Function `tariffs-extract`** (nueva, clon de patrón `chat-consultor`).
- [ ] **Diseño del prompt Gemini** específico para tarifa española (P1-P6, accesos, modelo de excedentes, vigencia).
- [ ] **Catálogo de productos normalizados** — decisión de negocio. Mínimo: lista de `product_name` canónicos por comercializadora para que Gemini matchee.

### Capa 3 — Validación y publicación

- [ ] **Extender `comercializadora_ofertas`** con: `valid_from`, `valid_to`, `status` (`pending_validation` / `published` / `superseded` / `rejected`), `source_document_id`, `extracted_by_ai`, `confidence_score`, `validated_by`, `validated_at`.
- [ ] **Logo de comercializadora**: añadir `logo_url` a `comercializadoras` + UI en `RetailersTab` para subida (storage bucket existente).
- [ ] **Pantalla nueva "Bandeja de tarifas pendientes"** — o tab nuevo dentro de `AdminPage` (recomendación: tab, no pantalla nueva).
- [ ] **Botones de acción**: validar, rechazar, ver documento fuente.
- [ ] **Lógica de versionado**: al publicar una nueva oferta de la misma `(comercializadora_id, product_name, access_rate)`, marcar la anterior como `superseded` con `valid_to=now()`.

### Capa 4 — Comparador (mejoras menores)

- [ ] **Modo manual de consumo** (subida XLSX) además del modo Datadis. **NO urgente** — solo para clientes sin Datadis.
- [ ] **Comparador "certificado"**: revisar si `calculateSimulatedInvoice` cubre todos los conceptos (alquiler, IEE, reactiva, excesos). Si no, ampliarlo. Pendiente de Bloque 2 del plan.

### Capa 5 — Propuesta corporativa

- [ ] **Plantilla de propuesta Valere** (HTML / template Deno-renderable). **Requiere decisión de negocio previa** (logo, colores, secciones, tono).
- [ ] **Edge Function `proposals-generate-pdf`** — convierte HTML a PDF y sube a storage. Rellena `proposals.pdf_url`.
- [ ] **Botón "Generar PDF" en `PropuestasEnergiaPage`** o en el detalle de propuesta de `AnalisisPage`.

### Capa 6 — Email con aprobación

- [ ] **Tabla `proposal_email_drafts`** (nueva).
- [ ] **UI de redacción de email** con plantilla precargada.
- [ ] **Estado `pending_review` → `approved` → `sent`**.
- [ ] **Edge Function `proposals-send-email`** (Resend, reutilizar provider de auth).
- [ ] **Log de envío** en la propia tabla `proposals` (`sent_at`, `email_draft_id`).

---

## 10. Riesgos identificados

1. **Romper el comparador actual al extender `comercializadora_ofertas`.** Añadir columnas es seguro; cambiar tipos o renombrar NO. Plan: solo ADD COLUMN, nunca ALTER ni RENAME.
2. **Romper RLS al añadir policies en tablas extendidas.** Plan: revisar policies existentes antes de tocar y testear con role distinto a master.
3. **Confusión de nomenclatura `retailers/comercializadoras`.** El código vivo usa la versión en español pero los tipos TS aún muestran la antigua. Plan: regenerar tipos antes de tocar BD.
4. **El upsert masivo del `XLSXImportadorTarifas` sobreescribe.** Si se publica una migración a la nueva lógica de versionado sin migrar también el importador, las cargas masivas seguirán pisando históricos. Plan: migrar ambos a la vez.
5. **`gemini-2.0-flash-exp` (modelo actual de chat-consultor) puede no leer PDFs nativo.** Verificar al implementar `tariffs-extract` si conviene pasar a `gemini-2.5-flash-lite` o equivalente. Posible mini-refactor de `chat-consultor` para alinear modelos.
6. **`proposals.pdf_url` ya existe pero nunca se ha rellenado.** Asegurar que el storage bucket de propuestas está configurado con RLS coherente antes de empezar a escribirlo.

---

## 11. Decisiones pendientes (no técnicas)

Estas tienen que cerrarse con el equipo de Valere antes de programar las capas 5 y 6:

1. **Catálogo de productos normalizados.** ¿"Power Península fijo 12m" y "Power Península fijo 24m" son uno o dos productos? ¿Quién mantiene el catálogo?
2. **Plantilla de propuesta Valere.** Diseño de portada, secciones, tono, qué información incluir y qué no. Logo + colores + tipografía oficiales.
3. **Política de envío.** ¿Todos los comerciales pueden generar propuesta o solo algunos roles? ¿Quién aprueba el envío (el propio comercial o un supervisor)?
4. **Plantilla de email.** Asunto tipo, cuerpo base, firma, qué adjuntos.
5. **Qué hacer con tarifas que la IA NO logra clasificar.** ¿Quedan en bandeja de error o se descartan?

---

## 12. Conclusión

El módulo Tarifas y Propuestas Comerciales **NO se construye desde cero**. Se completa un trabajo ya iniciado:

- **Modelo de datos:** existe el 80 %. Faltan extensiones puntuales y 4 tablas nuevas.
- **UI:** existe Admin (CRUD comercializadoras + ofertas), Análisis (comparador), Propuestas-energía (visor). Falta bandeja de validación y generador PDF.
- **Lógica de cálculo:** ya hay dos motores (uno para factura actual, otro para comparativa). El comparador funciona end-to-end.
- **Pipeline de IA:** patrón de Edge Function Gemini ya desplegado. Falta clonarlo para extracción de tarifas.
- **Ingesta automática:** Make ya captura y deposita en Drive. Falta un webhook al backend.
- **PDF y email:** lo único realmente nuevo desde cero.

El siguiente paso es el documento `PLAN_MODULO_TARIFAS_PROPUESTAS.md` con fases concretas, archivos a tocar, migraciones SQL específicas y primer commit mínimo recomendado.

---

**Fin del documento.**
