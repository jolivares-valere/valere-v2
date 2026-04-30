# Auditoría exhaustiva: app `valere-gestion-potencias` vs módulo Potencias del CRM

**Fecha:** 2026-04-30
**Autor:** Cowork (auditoría autónoma)
**Objetivo:** comparar el estado funcional del proyecto `valere-gestion-potencias` (Supabase `alesfvxqtwlrwlmkoosg` + repo `jolivares-valere/valere-gestion-potencias` + deploy `valere-gestion-potencias.vercel.app`) contra su integración en el CRM (Supabase `gtphkowfcuiqbvfkwjxb` + repo `jolivares-valere/valere-v2` + deploy `valere-v2.vercel.app`). Identificar todo lo que NO se trasladó.

---

## TL;DR — los 4 gaps que explican que "no funcione"

1. **NO se migraron los triggers automáticos**. POT tiene `trg_power_requests_alertas` que dispara `fn_calcular_alertas` en INSERT/UPDATE de `power_requests`. En el CRM **ese trigger no existe**. Resultado: 0 filas en `alertas` del CRM aunque hay 41 solicitudes de potencia.
2. **NO se migró la lib de PDF + email + import Excel + cálculo de ahorros**. El repo `musing-kalam` tiene `src/lib/` con 9 ficheros (`autorizacion-valere-pdf.tsx`, `pdf-fill.ts`, `excel-import.ts`, `email-sender.ts`, `email-signatures.ts`, `email-templates.ts`, `client-docs.ts`, `presentacion-pdf.tsx`, `savings.ts`) y un endpoint `api/send-email.ts`. **Ninguno existe en el CRM.** `src/lib/` no existe en el CRM siquiera.
3. **NO se migraron 7 componentes shared** del repo POT: `GenerateAuthorizationDialog`, `GenerateGroupAuthValereDialog`, `MultiSupplyImportDialog`, `SendPresentationDialog`, `TemplateMappingDialog`, `UploadSignedAuthDialog`, `ClientDocuments`, `HelpPanel`. Cero de los 8 están en el CRM. Eso desactiva flujos completos como "generar autorización", "enviar presentación", "subir autorización firmada".
4. **Datos faltantes de la migración aditiva**: 6 empresas + 3 CUPS no migradas. 31 de 41 expedientes con `created_by = NULL` (mapeo de users incompleto).

Estos 4 gaps explican por qué el dashboard se ve, los datos de lectura están, pero las acciones no avanzan, no se generan alertas y no se pueden hacer flujos complejos como envío de autorizaciones.

---

## 1. Capa BD — Schema y datos

### 1.1 Tablas en POT que SÍ están en CRM (con renames)

| POT | CRM | Notas |
|---|---|---|
| `clients` | `empresas` | Schema preservado + columnas extra (segmento, comercial_id, holded_*) |
| `supplies` | `cups` | Schema preservado + columnas extra (datadis_*, fv_*) |
| `expedientes` | `expedientes` | `supply_id`→`cups_id`, `client_id`→`empresa_id`. Schema OK. |
| `power_requests` | `solicitudes_potencia` | Schema 1:1, mismas 35 columnas. |
| `ciclos` | `ciclos` | Schema 1:1. |
| `savings_calculations` | `savings_calculations` | Schema 1:1. |
| `client_communications` | `comunicaciones_cliente` | `client_id`→`empresa_id`. Schema OK. |
| `comercializadoras` | `comercializadoras` | ⚠️ tiene **doble nomenclatura**: `name`/`nombre`, `is_active`/`activa`, `notes`/`notas` (heredado de la tabla `retailers` original del CRM). Necesita decisión de canónica. |
| `comercializadora_docs` | `comercializadora_docs` | Schema OK. |
| `email_templates` | `email_templates` | Schema OK. |
| `excel_import_templates` | `excel_import_templates` | Schema OK (vacía en ambos). |
| `regulated_rates` | `precios_regulados_boe` | Renamed. |
| `alerts` | `alertas` | `client_id`/`supply_id`→`empresa_id`/`cups_id`. Schema OK. |
| `status_log` | `status_log` | + columnas polimórficas (`entidad_tipo`, `entidad_id`). |
| `client_documents` | `documentos` | **Tabla polimórfica del CRM absorbe 3 tablas de POT** (client_documents + expediente_documents + documentacion). |
| `expediente_documents` | `documentos` | idem |
| `documentacion` | `documentos` | idem |
| `profiles` | `user_profiles` | ⚠️ Cambio de nomenclatura: `rol`→`role`, `activo`→`status` + `approved`. Desbloquea CRM con multi-rol y aprobación manual. |

### 1.2 Tablas extras en CRM (no estaban en POT)

- `comercializadora_ofertas` (vacía hoy) — perteneciente a la calculadora del CRM, no migrada de POT.
- `audit_log`, `_migration_*_map` (7 tablas), `crm_*`, `holded_*`, `fv_*`, `datadis_*` — features propias del CRM, fuera del scope de POT.

### 1.3 ⚠️ TRIGGERS POT NO PRESENTES EN CRM

| Trigger POT | Tabla | Función | Estado en CRM |
|---|---|---|---|
| `trg_power_requests_alertas` (INSERT) | power_requests | `fn_calcular_alertas` | ❌ **NO EXISTE** |
| `trg_power_requests_alertas` (UPDATE) | power_requests | `fn_calcular_alertas` | ❌ **NO EXISTE** |
| `trg_expedientes_updated` (UPDATE) | expedientes | `fn_updated_at` | ⚠️ probablemente cubierto por trigger genérico `set_updated_at` del CRM, pero falta verificación |

**Impacto:** las alertas amarilla/naranja/roja de fechas de los power_requests **NO se generan automáticamente** en el CRM. La tabla `alertas` tiene 0 filas pese a tener 41 solicitudes.

### 1.4 ⚠️ FUNCIONES POT NO MIGRADAS AL CRM

- `fn_calcular_alertas()` — calcula `fecha_alerta_amarilla/naranja/roja` y crea registros en `alertas`. **NO está en CRM.**

### 1.5 RLS — diferencia clave

| Lado | Política |
|---|---|
| POT | 1 policy `Authenticated users full access` por tabla → **todo abierto** para cualquier authenticated. |
| CRM | Policies granulares por operación (`expedientes_select`, `expedientes_insert`, `expedientes_update`, `expedientes_delete` separadas). |

**Implicación:** algunas acciones que en POT funcionaban porque era todo abierto, en el CRM pueden fallar por RLS más estricta. Verificar policies que requieran columnas como `created_by` (que está NULL en 31/41 expedientes).

### 1.6 Estado de datos al 2026-04-30 en el CRM

| Tabla | CRM | POT | Diff |
|---|---|---|---|
| empresas (con legacy_potencia_id) | 24 | 30 clients | **-6** ⚠️ |
| cups (con legacy_potencia_id) | 72 | 75 supplies | **-3** ⚠️ |
| expedientes | 41 | 41 | 0 ✅ |
| ciclos | 41 | 41 | 0 ✅ |
| solicitudes_potencia / power_requests | 41 | 41 | 0 ✅ |
| savings_calculations | 41 | 41 | 0 ✅ |
| comunicaciones_cliente / client_communications | 31 | 31 | 0 ✅ |
| status_log | 91 | 91 | 0 ✅ |
| comercializadoras | 8 | 2 | +6 (CRM tiene retailers propios) |
| comercializadora_docs | 1 | 1 | 0 ✅ |
| documentos (todos los tipos) | 98 | ~70 + 27 + 1 ≈ 98 | 0 ✅ |
| alertas | **0** | (n/a) | ⚠️ trigger no migrado |
| comercializadora_ofertas | 0 | (no existe) | extra |
| email_templates | 2 | 2 | 0 ✅ |
| excel_import_templates | 0 | 0 | 0 |

### 1.7 Problemas de integridad detectados

- **31 expedientes (75%) con `created_by = NULL`** en CRM. Mapeo `_migration_user_map` insuficiente.
- **0 ciclos en estados avanzados** (`bajada_aprobada`, `subida_pendiente`, `subida_activa`, `completado`). Todos en `bajada_pendiente` (39) o `bajada_activa` (2). Indica que las acciones del frontend para avanzar estados no se han usado o no funcionan.

---

## 2. Capa código — repos comparados

### 2.1 Páginas de POT (`musing-kalam/src/pages/`) vs CRM (`src/features/`)

| POT | CRM | Estado |
|---|---|---|
| `ClientsPage.tsx` | `src/features/empresas/EmpresasPage.tsx` | ✅ migrado (reusa Empresas del CRM) |
| `ClientDetailPage.tsx` | `src/features/empresas/EmpresaDetailPage.tsx` | ✅ |
| `SuppliesPage.tsx` | `src/features/potencias/SuministrosPotenciasPage.tsx` | ✅ |
| `ExpedientesPage.tsx` | `src/features/potencias/ExpedientesPage.tsx` | ✅ |
| `ExpedienteDetailPage.tsx` | `src/features/potencias/ExpedienteDetailPage.tsx` | ✅ |
| `NewExpedientePage.tsx` | `src/features/potencias/components/NuevoExpedienteModal.tsx` | ⚠️ convertido a modal |
| `CalendarPage.tsx` | `src/features/calendario/CalendarioPage.tsx` (CRM genérico) | ⚠️ existe pero genérico, no de Potencias |
| `DocumentacionPage.tsx` | `src/features/potencias/DocumentacionPage.tsx` | ✅ |
| (no existe) | `src/features/potencias/ComunicacionesPage.tsx` | ➕ extra CRM |
| (no existe) | `src/features/potencias/PotenciasDashboardPage.tsx` | ➕ extra CRM |
| (no existe) | `src/features/potencias/InformesPotenciasPage.tsx` | ➕ extra CRM |
| (no existe) | `src/features/potencias/ConfiguracionPotenciasPage.tsx` | ➕ extra CRM |

### 2.2 ⚠️ COMPONENTES SHARED de POT NO migrados al CRM

Verificado con grep, **0 ocurrencias de cada uno en `src/`**:

| Componente POT | Función | Migrado |
|---|---|---|
| `GenerateAuthorizationDialog.tsx` | Generar PDF de autorización para distribuidora | ❌ |
| `GenerateGroupAuthValereDialog.tsx` | Generar autorizaciones agrupadas | ❌ |
| `MultiSupplyImportDialog.tsx` | Importar múltiples suministros desde Excel | ❌ |
| `SendPresentationDialog.tsx` | Enviar presentación al cliente | ❌ |
| `TemplateMappingDialog.tsx` | Mapeo de plantillas de comercializadora | ❌ |
| `UploadSignedAuthDialog.tsx` | Subir autorización firmada por el cliente | ❌ |
| `ClientDocuments.tsx` | Listado de documentos del cliente | ❌ |
| `HelpPanel.tsx` | Panel de ayuda contextual | ❌ |

**Impacto:** desaparecen flujos enteros de la app POT:
- Generación automática de PDFs de autorización.
- Subida de autorización firmada.
- Importación masiva de suministros vía Excel.
- Envío de presentación al cliente.

### 2.3 ⚠️ LIBS de POT NO migradas al CRM

Verificado: **`src/lib/` no existe en el CRM** (solo hay `src/core/` y `src/features/`).

| Lib POT | Función | Migrado |
|---|---|---|
| `src/lib/autorizacion-valere-pdf.tsx` | Generación PDF autorización | ❌ |
| `src/lib/pdf-fill.ts` | Rellenar PDFs con datos | ❌ |
| `src/lib/presentacion-pdf.tsx` | Generación PDF presentación | ❌ |
| `src/lib/presentacion.ts` | Lógica de presentación | ❌ |
| `src/lib/excel-import.ts` | Parser Excel multisuministros | ❌ |
| `src/lib/email-sender.ts` | Wrapper Resend para envío | ❌ |
| `src/lib/email-signatures.ts` | Firmas de email | ❌ |
| `src/lib/email-templates.ts` | Plantillas hardcoded | ❌ |
| `src/lib/savings.ts` | Cálculo de ahorros (P1-P5) | ❌ |
| `src/lib/client-docs.ts` | Helpers documentos cliente | ❌ |

### 2.4 ⚠️ ENDPOINT API de POT NO migrado al CRM

| POT | CRM | Estado |
|---|---|---|
| `api/send-email.ts` (Vercel Function) | (ninguno equivalente) | ❌ NO existe |

El CRM tiene 5 Edge Functions Supabase (`chat-consultor`, `ask-crm-docs`, `daily-contract-check`, `notify-admin-pending-user`, `notify-user-approval-decision`) pero **ninguna específica para enviar emails de potencias** (autorización, presentación, comunicaciones del flujo).

### 2.5 Comandos extra del CRM (no en POT)

- Module FV (`src/features/seguimiento-fv/`) — sync FusionSolar.
- Asistente RAG (`ask-crm-docs` Edge Function + tabla `crm_help_embeddings`).
- Audit log (`audit_log` tabla + triggers).
- Signup con aprobación manual (`notify-admin-*` Edge Functions).
- Holded ERP integration.
- Dashboards genéricos por rol, custom fields, automatizaciones.

---

## 3. Capa funcional — flujos de acciones

### 3.1 Flujo "Crear expediente"

| Paso | POT | CRM | Estado |
|---|---|---|---|
| Página `NewExpedientePage` | sí | reemplazado por modal `NuevoExpedienteModal` | ✅ |
| Selección cliente + suministro | combo box | combo box | ✅ |
| Cálculo `max_ciclos_permitidos` por normativa | inline | `normativas.config.ts` | ✅ migrado |

### 3.2 Flujo "Generar autorización" (CRÍTICO — roto en CRM)

| Paso | POT | CRM | Estado |
|---|---|---|---|
| Botón "Generar autorización" | `GenerateAuthorizationDialog` | (no existe) | ❌ |
| Rellenar PDF con datos cliente | `lib/pdf-fill.ts` + `lib/autorizacion-valere-pdf.tsx` | (no existe) | ❌ |
| Subir PDF firmado | `UploadSignedAuthDialog` | (no existe) | ❌ |
| Guardar `doc_autorizacion_id` en `solicitudes_potencia` | columna existe ✅ | columna existe ✅ | datos no llegan |

**Resultado:** **el flujo completo de autorización está roto en CRM.**

### 3.3 Flujo "Enviar presentación al cliente"

| Paso | POT | CRM | Estado |
|---|---|---|---|
| Botón "Enviar presentación" | `SendPresentationDialog` | (no existe) | ❌ |
| Generar PDF presentación | `lib/presentacion-pdf.tsx` | (no existe) | ❌ |
| Endpoint envío email | `api/send-email.ts` | (no existe) | ❌ |
| Registro en `comunicaciones_cliente` | sí | tabla existe pero sin endpoint que la llene | ⚠️ |

### 3.4 Flujo "Importar Excel multisuministros"

| Paso | POT | CRM | Estado |
|---|---|---|---|
| Botón "Importar Excel" | `MultiSupplyImportDialog` | (no existe) | ❌ |
| Parser Excel | `lib/excel-import.ts` | (no existe) | ❌ |
| Mapeo columnas | `TemplateMappingDialog` | (no existe) | ❌ |
| Plantillas en BD | `excel_import_templates` 0 filas | `excel_import_templates` 0 filas | ⚠️ tabla vacía |

### 3.5 Flujo "Avance de estado del ciclo" (CRÍTICO)

POT define estos estados de ciclo: `bajada_pendiente → bajada_activa → bajada_aprobada → subida_pendiente → subida_activa → completado`.

CRM hoy tiene solo `bajada_pendiente` (39) y `bajada_activa` (2). **Ninguno avanzó más allá**, lo que sugiere que el botón de cambio de estado en `ExpedienteDetailPage.tsx` del CRM o no funciona, o no se ha usado.

Verificar:
- ¿Existe la mutation `useUpdateCicloEstado` en el CRM?
- ¿Lo invoca correctamente el botón en ExpedienteDetailPage?
- ¿Las RLS granulares permiten al usuario actualizar `ciclos.estado`?

### 3.6 Flujo "Generación automática de alertas"

POT: trigger `trg_power_requests_alertas` ejecuta `fn_calcular_alertas` en INSERT/UPDATE de power_requests, calcula fechas y crea registros en `alerts`.

CRM: **NI el trigger NI la función existen**. La tabla `alertas` está vacía pese a las 41 solicitudes_potencia.

---

## 4. Acciones recomendadas (priorizadas)

### 🔴 P0 — Restaurar funcionalidad core
1. **Migrar la función `fn_calcular_alertas`** + trigger `trg_power_requests_alertas` al CRM.
2. **Verificar mutation de cambio de estado de ciclos** en `ExpedienteDetailPage.tsx` del CRM. Si está rota, arreglar.
3. **Mapear `created_by` para los 31 expedientes huérfanos** desde `_migration_user_map`.
4. **Migrar las 6 empresas + 3 CUPS faltantes** desde el proyecto potencias.

### 🟡 P1 — Restaurar flujos críticos
5. **Reportar `src/lib/`** del repo POT al CRM:
   - `email-sender.ts`, `email-templates.ts`, `email-signatures.ts` → migrar como Edge Function `send-potencia-email` o como `src/core/email/` + Vercel Function.
   - `pdf-fill.ts`, `autorizacion-valere-pdf.tsx`, `presentacion-pdf.tsx`, `presentacion.ts` → migrar a `src/core/pdf/` o `src/features/potencias/lib/`.
   - `excel-import.ts` → migrar a `src/core/excel/`.
   - `savings.ts` → migrar a `src/core/energia/savings.ts`.
   - `client-docs.ts` → integrar con `src/features/documentos/`.
6. **Migrar los 8 componentes shared** a `src/features/potencias/components/` o `src/core/components/`.
7. **Crear endpoint `api/send-email.ts`** o Edge Function equivalente.

### 🟢 P2 — Cleanup
8. Decidir nomenclatura canónica en `comercializadoras` (eliminar duplicados `name`/`nombre`, `is_active`/`activa`, `notes`/`notas`).
9. Revisar si `comercializadora_ofertas` (vacía) sigue teniendo sentido o eliminar.
10. Endurecer RLS de POT (`Authenticated users full access`) por si se mantiene el proyecto activo como staging.

---

## 5. Decisión sobre el destino del proyecto Supabase `alesfvxqtwlrwlmkoosg`

**Mientras los gaps P0 y P1 no se cierren, NO archivar el proyecto POT.** La aplicación `valere-gestion-potencias.vercel.app` sigue siendo el flujo funcional completo, y el CRM solo tiene parcialmente migrada esa funcionalidad.

Cuando se complete la migración (P0+P1), entonces sí se puede:
- Pausar `alesfvxqtwlrwlmkoosg` en Supabase (no borrar — mantener 3 meses).
- Archivar el repo `jolivares-valere/valere-gestion-potencias` en GitHub.
- Apagar el proyecto Vercel `valere-gestion-potencias`.
- Redirigir a usuarios al CRM (`valere-v2.vercel.app/potencias`).

Estimación: 2-3 sprints de 1 día cada uno para cerrar P0+P1.

---

## Apéndice — listado completo de ficheros del repo `musing-kalam` (POT)

### Páginas (`src/pages/`)
- CalendarPage.tsx
- ClientDetailPage.tsx
- ClientsPage.tsx
- DocumentacionPage.tsx
- ExpedienteDetailPage.tsx
- ExpedientesPage.tsx
- NewExpedientePage.tsx
- SuppliesPage.tsx

### Componentes shared (`src/components/shared/`)
- ClientDocuments.tsx
- GenerateAuthorizationDialog.tsx
- GenerateGroupAuthValereDialog.tsx
- HelpPanel.tsx
- MultiSupplyImportDialog.tsx
- SendPresentationDialog.tsx
- TemplateMappingDialog.tsx
- UploadSignedAuthDialog.tsx

### Lib (`src/lib/`)
- autorizacion-valere-pdf.tsx
- client-docs.ts
- email-sender.ts
- email-signatures.ts
- email-templates.ts
- excel-import.ts
- pdf-fill.ts
- presentacion-pdf.tsx
- presentacion.ts
- savings.ts

### API (`api/`)
- send-email.ts

### Migrations Supabase (`supabase/migrations/`)
- 005_client_documents.sql
- 006_authorization_workflow.sql
- 007_excel_import_templates.sql
- 008_gestor_field.sql
