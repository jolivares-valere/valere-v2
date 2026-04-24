# Plan de Unificación Supabase — Valere

> Generado: 2026-04-24 por Cowork. Basado en schema real extraído via Supabase MCP.
> Sprint dedicado estimado: 10-12 días persona. **NO improvisar — seguir las 6 fases.**

---

## 1. Estado actual confirmado

| Proyecto | Ref | Región | Tablas | Apps que lo usan |
|---|---|---|---|---|
| **PROYECTO VALERE** (CRM) | `gtphkowfcuiqbvfkwjxb` | eu-west-1 | 24 | valere-v2 (CRM) |
| **valere-gestion-potencias** | `alesfvxqtwlrwlmkoosg` | eu-central-1 | 18 | Potencias + Excedentes |

**Problema crítico**: tablas conceptualmente equivalentes con datos distintos en cada proyecto, en regiones distintas, sin sincronización.

## 2. Mapeo de tablas equivalentes (campo a campo)

### 2.1 `empresas` (CRM) ↔ `clients` (Potencias)

| CRM `empresas` | Potencias `clients` | Tipo | Notas |
|---|---|---|---|
| `id` (uuid PK) | `id` (uuid PK) | uuid | Mantener original como `legacy_*_id` |
| `nombre` | `nombre_fiscal` | text | **Canónico**: `nombre_fiscal` (Potencias gana en claridad legal) |
| `nif` | `cif` | text | **Canónico**: `cif_nif` (acepta ambos formatos) |
| `email_principal` | `email_contacto` | text | **Canónico**: `email_contacto` |
| `telefono_principal` | `telefono` | text | **Canónico**: `telefono_principal` |
| `direccion` | `direccion_fiscal` | text | **Canónico**: `direccion_fiscal` |
| `ciudad` | `ciudad` | text | igual |
| `cp` | `codigo_postal` | text | **Canónico**: `codigo_postal` |
| `provincia` | — | text | Solo CRM — añadir a canónica |
| `pais` | — | text | Solo CRM — añadir a canónica |
| `web` | — | text | Solo CRM |
| `tags` (ARRAY) | — | array | Solo CRM |
| `segmento` | — | text | Solo CRM |
| `tipo` | — | text | Solo CRM |
| `notas` | `notas` | text | igual |
| `comercial_id` (FK user_profiles) | `gestor_id` (FK profiles) | uuid | **Canónico**: `comercial_id` (rol comercial CRM) |
| `created_by` (FK user_profiles) | `created_by` (FK profiles) | uuid | igual |
| — | `asesor_id` (FK profiles) | uuid | Solo Potencias — añadir como rol secundario |
| — | `persona_contacto` | text | Solo Potencias — útil, añadir |
| — | `activo` (boolean) | bool | Solo Potencias — añadir como `activo` |
| `external_id` | — | text | Solo CRM — para integraciones externas |
| `deleted_at` | — | timestamptz | Solo CRM (soft delete) — añadir a canónica |
| `created_at`, `updated_at` | `created_at` | timestamptz | igual |

**Decisión clave**: la tabla canónica se llama **`empresas`** (en castellano, alineada con el resto del CRM) pero contiene la unión de campos de ambas + dedupe por `cif_nif` normalizado.

### 2.2 `cups` (CRM) ↔ `supplies` (Potencias)

| CRM `cups` | Potencias `supplies` | Tipo | Notas |
|---|---|---|---|
| `id` (uuid PK) | `id` (uuid PK) | uuid | mantener legacy_*_id |
| `codigo_cups` | `cups` | text | **Canónico**: `codigo_cups` (más explícito) |
| `empresa_id` (FK empresas) | `client_id` (FK clients) | uuid | **Canónico**: `empresa_id` |
| `direccion_suministro` | `direccion_suministro` | text | igual |
| — | `ciudad_suministro` | text | Solo Potencias — útil, añadir |
| `tarifa_acceso` | `tariff_type` | text | **Canónico**: `tarifa_acceso` |
| `tarifa_manual` | — | text | Solo CRM |
| `distribuidor` | `distribuidora` | text | **Canónico**: `distribuidora` |
| `comercializadora_actual` | `comercializadora` | text | **Canónico**: `comercializadora_actual` |
| — | `comercializadora_id` (FK comercializadoras) | uuid | Solo Potencias — añadir relación a retailers/comercializadoras |
| — | `channel` | text | Solo Potencias |
| — | `denominacion` | text | Solo Potencias — útil |
| — | `tension_kv` | numeric | Solo Potencias — útil |
| — | `potencia_maxima_disponible` | numeric | Solo Potencias — útil |
| — | `p1_kw` ... `p6_kw` (NOT NULL) | numeric | Solo Potencias — **MUY útil para calc potencias** |
| `potencias_contratadas` (jsonb) | — | jsonb | Solo CRM — equivalente a p1..p6 pero en JSON |
| `energia_p1_kwh` ... `p6_kwh` | — | numeric | Solo CRM — consumos por periodo |
| `coste_instalacion_fv_eur` | — | numeric | Solo CRM — fotovoltaica |
| `fecha_instalacion_fv` | — | date | Solo CRM — fotovoltaica |
| `marca_inversor`, `modelo_autoconsumo` | — | text | Solo CRM — fotovoltaica |
| `potencia_fv_kwp`, `potencia_inversor_kw` | — | numeric | Solo CRM — fotovoltaica |
| `datadis_*` (4 campos) | — | varios | Solo CRM — integración Datadis |
| `contrato_id` (FK contratos) | — | uuid | Solo CRM — relación con contratos |
| `estado` | `activo` (bool) | text/bool | **Canónico**: `estado` (text con más opciones) |
| `created_at` | `created_at` | timestamptz | igual |
| `deleted_at` | — | timestamptz | Solo CRM (soft delete) |

**Decisión clave**: tabla canónica **`cups`** con TODOS los campos unidos. Para potencias contratadas, mantener tanto `p1_kw..p6_kw` (NOT NULL para Potencias) Y `potencias_contratadas` jsonb (alternativa flexible). Migration genera p1..p6 desde el jsonb si solo había jsonb.

### 2.3 `retailers` (CRM) ↔ `comercializadoras` (Potencias)

Estas dos tienen propósitos LIGERAMENTE distintos:

- **`retailers`** (CRM): catálogo de comercializadoras con sus ofertas (`retailer_offers` relacionada). 6 filas. Foco: análisis comparativo de ofertas para propuestas comerciales.
- **`comercializadoras`** (Potencias): catálogo de comercializadoras para el flujo de cambios de potencia (qué docs requiere cada una, plantillas autorización). 2 filas. Foco: gestión administrativa.

**Decisión**: mantener AMBAS como tablas separadas en el schema canónico, pero con FK común a un nuevo catálogo maestro:

- **Nueva tabla `comercializadoras_master`** (canónica): id, nombre, NIF, tipo (eléctrica/gas/dual), notas.
- **`retailers`** y **`comercializadoras`** se renombran a **`retailer_offers_meta`** y **`potencia_workflow_meta`** respectivamente, ambas con FK a `comercializadoras_master`.
- Esto evita que en CRM aparezca "Iberdrola" como `Iberdrola` y en Potencias como `IBERDROLA SA` — referencias canónicas.

**Alternativa más simple**: una sola tabla `comercializadoras` con todos los campos y NULLs según contexto. Decisión final en Fase 0.

### 2.4 `boe_regulated_prices` (CRM) ↔ `regulated_rates` (Potencias)

| CRM `boe_regulated_prices` | Potencias `regulated_rates` | Tipo | Notas |
|---|---|---|---|
| `id` | `id` | uuid PK | igual |
| `period` | `period` | text | igual |
| `tariff` | `tariff_type` | text | **Canónico**: `tariff_type` |
| `price` | `rate_eur_kw_day` | numeric | **Canónico**: `rate_eur_kw_day` (más explícito en unidad) |
| — | `valid_from`, `valid_to` | date | **Solo Potencias** — CRÍTICO para histórico, añadir a canónica |
| — | `updated_by` (FK profiles) | uuid | Solo Potencias — añadir |

**Decisión**: tabla canónica **`precios_regulados_boe`** con todos los campos de Potencias (más completos) + datos del CRM si tiene precios distintos.

### 2.5 `user_profiles` (CRM) ↔ `profiles` (Potencias)

| CRM `user_profiles` | Potencias `profiles` | Tipo | Notas |
|---|---|---|---|
| `id` (uuid PK) | `id` (uuid PK) | uuid | mismo (FK a `auth.users` de Supabase) |
| `email` | `email` (NOT NULL) | text | igual |
| `full_name` | `nombre` + `apellidos` (NOT NULL) | text | **Canónico**: separar en `nombre` + `apellidos` (Potencias gana) |
| `role` | `rol` | text | **Canónico**: `rol` (alineado con resto código castellano) |
| `status`, `approved` | `activo` | text/bool | **Canónico**: `activo` (boolean) + `status` (text con detalle) |
| `avatar_url` | — | text | Solo CRM |
| `created_at`, `updated_at` | `created_at` | timestamptz | igual |

**Decisión**: tabla canónica **`user_profiles`** (mantenemos plural CRM por convención SQL). Después de unificación, Supabase Auth seguirá generando un `auth.users` por persona, y `user_profiles` se rellena desde Workspace OAuth (cuando migremos auth).

## 3. Tablas que se quedan tal cual (sin unificar — sin equivalente)

### Solo CRM (van al proyecto unificado intactas)

- `contratos` (con todos sus campos), `contactos`, `oportunidades`, `actividades`, `propuestas`, `retailer_offers`, `facturas`, `tareas`, `incidencias`, `renovaciones`, `notificaciones`, `eventos`, `documentos`, `custom_fields_schema`, `custom_fields_values`, `datadis_tokens`, `datadis_consumptions`, `global_config`.

### Solo Potencias (van al proyecto unificado intactas)

- `expedientes`, `power_requests`, `ciclos`, `savings_calculations`, `excel_import_templates`, `email_templates`, `client_communications`, `client_documents`, `expediente_documents`, `comercializadora_docs`, `documentacion`, `status_log`, `alerts`.

**Total tablas en proyecto unificado**: ~36 (24 + 18 - 6 unificadas).

## 4. Estrategia de dedupe

### 4.1 Identificación canónica de un cliente/empresa

Clave de dedupe = **CIF/NIF normalizado**:
1. Normalizar: trim, uppercase, sin espacios, sin guiones.
2. Si dos filas (una CRM, otra Potencias) tienen mismo CIF normalizado → fusionar en una sola entrada canónica.
3. Conservar el ID del CRM como canónico (más antiguo en intención).
4. Almacenar `legacy_crm_id` y `legacy_potencia_id` como columnas para trazabilidad.
5. Si una empresa solo está en uno de los dos → migrar tal cual con el ID original como nuevo PK.
6. Conflictos en campos (ej. teléfonos distintos): preferir el de Potencias (más reciente) y log el del CRM en campo `notas_migracion`.

### 4.2 Identificación canónica de un CUPS

Clave de dedupe = **código CUPS normalizado** (es identificador único legal en España, 20-22 caracteres):
1. Normalizar: trim, uppercase, sin espacios.
2. Mismo CUPS en ambos proyectos → fusionar.
3. FK a empresa: re-mapear al ID canónico de empresa después del paso 4.1.

### 4.3 Mapeo de FKs después de dedupe

Después de migrar empresas y cups con sus IDs canónicos, hay que re-mapear TODAS las FKs en las tablas dependientes:

- `contratos.empresa_id` → ID canónico empresa
- `cups.empresa_id` → ID canónico empresa
- `contactos.empresa_id` → ID canónico empresa
- `oportunidades.empresa_id` → ID canónico empresa
- `expedientes.client_id` → ID canónico empresa (con rename a `empresa_id`)
- `power_requests.client_id` → ID canónico empresa
- `power_requests.supply_id` → ID canónico cups
- `expedientes.supply_id` → ID canónico cups
- ... (lista completa generada en Fase 1)

## 5. Naming canónico final

Toda tabla y columna en **castellano coherente con el CRM**:
- `empresas`, `cups`, `contratos`, `contactos`, `oportunidades` — sin cambios.
- `clients` → `empresas` ✓
- `supplies` → `cups` ✓
- `profiles` → `user_profiles` ✓
- `regulated_rates` → `precios_regulados_boe` ✓
- `power_requests` → `solicitudes_potencia` (renombrar para coherencia)
- `expedientes`, `ciclos`, `savings_calculations`, `alerts` — mantener
- `comercializadoras` → mantener (ya es castellano)
- `client_communications` → `comunicaciones_cliente`
- `client_documents`, `expediente_documents`, `documentacion` → consolidar en una sola tabla polimórfica `documentos` (entidad_tipo + entidad_id) como ya tiene CRM.

## 6. Plan ejecutivo en 6 fases

### FASE 0 — Análisis y diseño (2-3 días)

- Revisar este documento con stakeholders (Juan, equipo dev).
- Decidir definitivamente nombres canónicos cuando haya dudas.
- Decidir solución `comercializadoras_master` vs tabla única.
- Mapeo completo de FKs (extender el de §4.3).
- Diseñar RLS policies multi-app.
- Plan de rollback.
- Documentar decisiones finales en este mismo archivo (revisión 2).

### FASE 1 — Preparación (1 día)

- `pg_dump --schema=public --data-only` de ambos proyectos.
- Crear nuevo proyecto Supabase `valere-unified` en eu-west-1.
- Activar pgvector + uuid-ossp + pg_trgm.
- Aplicar schema canónico vacío.
- RLS policies en empty state.

### FASE 2 — Migración de datos (2-3 días)

- Scripts SQL idempotentes (ON CONFLICT DO NOTHING / upsert).
- Orden estricto:
  1. Catálogos maestros (`comercializadoras_master` o `comercializadoras`, `precios_regulados_boe`).
  2. Users (`user_profiles` desde ambos).
  3. Empresas dedup por CIF/NIF.
  4. CUPS dedup por código.
  5. Contratos, contactos, oportunidades CRM (con FKs re-mapeadas).
  6. Expedientes, power_requests, ciclos Potencias (con FKs re-mapeadas).
  7. Savings_calculations, alerts.
  8. Documentos (consolidar las 3 tablas).
  9. Communications, status_log.
- Reporte: filas migradas, deduplicadas, conflictos manuales.

### FASE 3 — Refactor de apps (3-4 días)

- CRM:
  - Cambiar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Cloudflare.
  - Regenerar tipos TS (`supabase gen types`).
  - Renombrar imports si hay cambios (la mayoría no).
  - TSC 0 errores.
  - 39 tests pasando.
- Potencias:
  - Apuntar al nuevo proyecto.
  - Renombrar `clients` → `empresas` en queries.
  - Renombrar `supplies` → `cups`.
  - Renombrar `profiles` → `user_profiles`.
  - Adaptar columnas renombradas (`nombre` → `nombre_fiscal`, etc.).
  - Tests Potencias.
- Excedentes (si tiene código separado):
  - Mismo proceso.

### FASE 4 — Deploy + verificación (1 día)

- Deploy CRM a Cloudflare con nuevo Supabase.
- Smoke tests con compañeros (login, CRUD básico, navegación).
- Deploy Potencias a Cloudflare.
- Deploy Excedentes a Cloudflare.
- Monitor logs Supabase 24-48h por errores RLS.

### FASE 5 — Limpieza (1 día)

- Tras 1 semana estable: pausar/borrar los 2 proyectos viejos.
- Actualizar `CLAUDE.md`, `ESTADO.md`, `docs/ARQUITECTURA_PROYECTOS.md`.
- Auditoría credenciales: tokens viejos eliminados.
- Sesión retro.

## 7. Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Pérdida de datos en migración | Baja | `pg_dump` antes, scripts idempotentes con ON CONFLICT |
| Dedupe agresiva fusiona empresas distintas | Media | Reportar fusiones a Juan ANTES de aplicar, validación manual de top 30 casos |
| FK mal re-mapeada | Media | Tests automatizados de integridad después de cada batch |
| Apps rotas tras refactor | Alta | TSC + tests obligatorios antes de deploy, usuario de prueba antes de producción |
| Latencia eu-west-1 vs eu-central-1 para usuarios alemanes | Baja | No tenéis usuarios alemanes — eu-west-1 OK |
| RLS rota multi-app | Media | Diseño policies en Fase 0, testing en Fase 4 |

## 8. Estado de tablas específicas detalladas

Schemas completos extraídos en chat de Cowork session 2026-04-24. Si se necesita re-extraer, usar `mcp__supabase__execute_sql` con la query del documento original.
