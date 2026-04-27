# Plan de Integración Valere CRM ↔ Holded

> **Versión**: 1.0 (2026-04-26)
> **Autor**: Cowork (Claude)
> **Fuente original**: `docs/HOLDED_INFORME_BROWSER_2026-04-26.md` (agente Browser)
> **Adaptación**: este documento ajusta el informe al stack real del proyecto y a las decisiones arquitectónicas tomadas (Sprint 1-N).

---

## 1. Resumen ejecutivo

Integramos el CRM Valere (Supabase + React + Edge Functions, hospedado en Cloudflare Pages) con Holded (ERP de facturación + contabilidad + tesorería) para automatizar el ciclo lead → oportunidad → presupuesto → factura → cobro y eliminar la doble entrada de datos.

**Sin nuevo stack**: aprovechamos lo que el CRM ya tiene en lugar de añadir Redis/BullMQ/microservicios.

| Necesidad | Solución informe original | Solución adaptada Valere |
|---|---|---|
| Cliente HTTP | Service "HoldedClient" Node/PHP | Edge Function Deno `holded-client` |
| Cola asíncrona | Redis + BullMQ/Sidekiq | Tabla `holded_sync_queue` + worker Edge Function llamado por `pg_cron` |
| Polling | Cron interno | `pg_cron` (ya instalado) cada 15 min por entidad |
| Almacenamiento API Key | Vault externo + KMS | Supabase Vault (`vault.create_secret`) — extensión ya instalada |
| Logs/auditoría | Tabla `integration_logs` | Igual + Supabase Logs por Edge Function |
| Panel admin | Custom | Tab nuevo en `src/features/admin/AdminPage.tsx` |
| Notificaciones | Email service externo | Edge Function `notify-integration-error` (mismo patrón que `notify-admin-pending-user`) |

**Coste de infraestructura adicional**: 0€. Todo cabe en plan Free de Supabase + Resend.

---

## 2. Mapeo a tablas existentes Valere

### 2.1 Lo que YA tenemos y encaja

| Concepto Holded | Tabla Valere actual | Acción |
|---|---|---|
| Contacts (empresas) | `empresas` | Añadir 3 columnas + validar dirección desglosada |
| Contacts (personas) | `contactos` (FK a `empresas`) | Añadir 3 columnas |
| Funnels + Stages | `oportunidades.etapa` (enum) | Migrar a tabla `funnels` + `stages` |
| Leads | `oportunidades` | Añadir 3 columnas + reorganizar metadata |
| Products/Services | `retailer_offers` (parcial) + nueva `productos_servicios` | Crear tabla nueva |
| Documents (factura, presupuesto) | `propuestas` (parcial) + nueva `documentos_comerciales` | Crear nueva, `propuestas` queda solo para CRM no facturable |
| Payments | nueva `cobros` | Crear |
| Treasuries | nueva `tesorerias` | Crear (catálogo solo lectura) |
| Tax catalogs | nueva `impuestos` | Crear (catálogo solo lectura) |
| Tags | nueva `tags_holded` | Crear (catálogo solo lectura) |
| Activities/Tasks | `actividades` | Añadir 3 columnas |
| Employees | `user_profiles` | Añadir 3 columnas si se decide sincronizar |
| Projects | n/a (no existe) | Decidir si crear o no |

### 2.2 Las "3 columnas" universales

Cada tabla sincronizable lleva:

```sql
ALTER TABLE <tabla> ADD COLUMN IF NOT EXISTS holded_id text UNIQUE;
ALTER TABLE <tabla> ADD COLUMN IF NOT EXISTS holded_etag text;  -- hash MD5 del payload enviado
ALTER TABLE <tabla> ADD COLUMN IF NOT EXISTS holded_synced_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_<tabla>_holded_id ON <tabla>(holded_id);
```

### 2.3 Tablas nuevas de infraestructura

- `holded_config` — singleton con flags de la integración (enabled, mode=dry-run/live, last_full_sync_at, etc.).
- `holded_sync_queue` — cola de operaciones pendientes (entity, entity_id, action, payload, status, attempts, last_error, scheduled_for).
- `holded_integration_logs` — auditoría de cada llamada (ts, direction, entity, entity_id, http_status, request_payload, response_body, error, duration_ms, triggered_by).
- `holded_conflicts` — registros con conflicto detectado pendientes de resolución humana.
- `holded_sync_state` — estado por entidad (last_pull_at, last_pull_etag, items_synced).

---

## 3. Arquitectura adaptada al stack Valere

```
┌──────────────────────────────────┐
│  Frontend (React)                │
│  - AdminPage → tab "Integración" │
│  - Botones: sincronizar, reintentar, dry-run │
└──────┬───────────────────────────┘
       │ supabase.functions.invoke()
       ▼
┌──────────────────────────────────────────────────────────┐
│  Supabase Edge Functions (Deno)                          │
│                                                          │
│  ├─ holded-sync-contacts        (push/pull contactos)    │
│  ├─ holded-sync-products        (pull catálogo)          │
│  ├─ holded-sync-funnels         (pull catálogo)          │
│  ├─ holded-sync-leads           (push leads)             │
│  ├─ holded-create-document      (push factura/presup)    │
│  ├─ holded-pull-payments        (pull cobros)            │
│  ├─ holded-worker               (consume sync_queue)     │
│  └─ _shared/holded-client.ts    (HTTP + retry + auth)    │
└──────┬───────────────────────────────────────────────────┘
       │
       ├──► Holded REST API (api.holded.com/api/...)
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│  Postgres (Supabase)                                     │
│                                                          │
│  ├─ Tablas dominio + 3 cols holded_*                     │
│  ├─ holded_config (singleton)                            │
│  ├─ holded_sync_queue                                    │
│  ├─ holded_integration_logs                              │
│  ├─ holded_conflicts                                     │
│  ├─ holded_sync_state                                    │
│  └─ vault.secrets → HOLDED_API_KEY (cifrada)             │
│                                                          │
│  pg_cron jobs:                                           │
│  ├─ holded_pull_catalogs_daily   (03:30 UTC)             │
│  ├─ holded_pull_changes_15min    (cada 15 min)           │
│  └─ holded_worker_5min           (cada 5 min)            │
└──────────────────────────────────────────────────────────┘
```

**Decisión de la cola**: en lugar de Redis/BullMQ usamos **tabla `holded_sync_queue` + Edge Function `holded-worker` llamada por `pg_cron` cada 5 min**. Más sencillo, sin coste adicional, suficiente para volúmenes esperados. Si el negocio crece y necesita real-time, migración a Realtime de Supabase es trivial.

**Decisión de la API Key**: usar `vault.create_secret('HOLDED_API_KEY', '<value>')` y leer desde Edge Function via `vault.decrypted_secrets`. Rotación cada 90 días con cron + alerta.

**Decisión de fuente de verdad** (igual que el informe):

| Entidad | Fuente de verdad | Resolución conflicto |
|---|---|---|
| Contactos | Bidireccional | last-write-wins por `updated_at` |
| Productos | Holded | Holded sobreescribe siempre |
| Funnels/Stages | Holded | Idem |
| Leads/Oportunidades | Valere CRM | Valere sobreescribe Holded |
| Documentos comerciales | Holded (post-emisión) | Valere puede crear; tras emisión solo lectura |
| Cobros | Holded | Holded sobreescribe |
| Tesorerías/Impuestos | Holded | Solo lectura en Valere |

---

## 4. Plan de fases adaptado

Las fases siguen el orden del informe original pero con tareas concretas para nuestro stack y respetando el trabajo en curso (signup, unificación Fase 2, Cloudflare Potencias).

### Fase 0 — Auditoría datos Valere (1-2 días)

**Pre-requisito de todo lo demás.** Sin esto, propagamos suciedad a Holded.

- [ ] Validar NIFs de `empresas` con función SQL `valida_nif_cif()` (algoritmo control + dígito).
- [ ] Auditar direcciones concatenadas vs desglosadas en `empresas.direccion`. Reportar % desglosado.
- [ ] Migración: parser de direcciones concatenadas (script Python o Postgres function) con revisión manual de casos dudosos.
- [ ] Deduplicar empresas por NIF (normalizado: sin espacios, mayúsculas).
- [ ] Normalizar países a ISO-3166 alfa-2.
- [ ] Reporte ejecutivo: cuántos contactos están limpios vs sucios, lista de excepciones.

**Entregable**: `docs/AUDIT_DATOS_VALERE_PRE_HOLDED_<fecha>.md` + migration `supabase/migrations/<fecha>_holded_data_cleanup.sql`.

### Fase 1 — Infraestructura base (2-3 días)

- [ ] Crear migration con las 5 tablas nuevas (`holded_config`, `holded_sync_queue`, `holded_integration_logs`, `holded_conflicts`, `holded_sync_state`).
- [ ] Añadir las 3 columnas `holded_*` a tablas dominio (`empresas`, `contactos`, `oportunidades`, `actividades`, `user_profiles` opcional).
- [ ] Crear Edge Function `_shared/holded-client.ts`:
  - Auth via Bearer + key
  - Rate limit token bucket (5 req/s)
  - Retry exponencial (1, 2, 4, 8, 16, 32s, max 6)
  - Logging estructurado a `holded_integration_logs`
  - Timeout 15s
- [ ] Crear secret `HOLDED_API_KEY` en Supabase Vault.
- [ ] Crear Edge Function `holded-worker` que consume `holded_sync_queue`.
- [ ] Crear pg_cron job `holded_worker_5min` (cada 5 min).
- [ ] Crear Edge Function `notify-integration-error` (Resend, mismo patrón que `notify-admin-pending-user`) que avisa cuando hay errores >24h.
- [ ] Tab "Integración Holded" en `AdminPage.tsx` con: estado config, contadores cola, últimos errores, botones manuales.

**Entregable**: rama `claude/holded-fase1-infra` + PR.

### Fase 2 — Pull de catálogos (1 día)

Catálogos read-only: funnels, stages, productos, tesorerías, métodos de pago, series de facturación, cuentas contables, tags, impuestos.

- [ ] Tablas nuevas para cada catálogo (`holded_funnels`, `holded_stages`, `holded_productos`, `holded_tesorerias`, `holded_metodos_pago`, `holded_series`, `holded_cuentas_contables`, `holded_tags`, `holded_impuestos`).
- [ ] Edge Function `holded-pull-catalogs` que hace GET a cada endpoint y upsert en Postgres.
- [ ] pg_cron job `holded_pull_catalogs_daily` (diario 03:30 UTC).
- [ ] Botón "Pull manual ahora" en panel admin.
- [ ] Reporte de discrepancias detectadas.

### Fase 3 — Contactos bidireccional con dry-run (3-4 días)

- [ ] Mapper `valere_empresa ↔ holded_contact` con validaciones.
- [ ] Edge Function `holded-sync-contacts`:
  - Modo `dry_run`: lee de Valere, prepara payload Holded, NO envía. Reporte.
  - Modo `live`: envía y guarda `holded_id`.
- [ ] Pull desde Holded: detecta empresas creadas en Holded sin contraparte en Valere → crea en Valere.
- [ ] Conflictos: si `updated_at` cambió en ambos lados desde último sync → escribir en `holded_conflicts`.
- [ ] UI: tab admin "Conflictos pendientes" con resolución manual.
- [ ] Trigger en `empresas` (UPDATE/INSERT) que enqueue automáticamente en `holded_sync_queue` si la integración está enabled.

### Fase 4 — Leads / oportunidades + actividades (3-4 días)

- [ ] Migrar `oportunidades.etapa` (enum) a FK a `holded_stages.id`.
- [ ] Mapper `oportunidad ↔ lead`.
- [ ] Edge Function `holded-sync-leads`.
- [ ] Sync de actividades relacionadas (`actividades` → notes/tasks de Holded).
- [ ] Trigger automático en `oportunidades`.

### Fase 5 — Documentos comerciales Valere → Holded (4-5 días)

- [ ] Tabla `documentos_comerciales` (cabecera + líneas).
- [ ] UI en CRM: crear presupuesto/factura desde una oportunidad ganada.
- [ ] Edge Function `holded-create-document` (POST a `/invoicing/v1/documents/{type}`).
- [ ] Almacenar `holded_id` + URL del PDF generado por Holded.
- [ ] Estado del documento (borrador/enviado/aceptado/cobrado) sincronizado vía pull.

### Fase 6 — Cobros y conciliación (2-3 días)

- [ ] Tabla `cobros` con FK a `documentos_comerciales`.
- [ ] Edge Function `holded-pull-payments`.
- [ ] pg_cron job `holded_pull_payments_15min`.
- [ ] Trigger automático: cuando llega cobro → marcar oportunidad como cerrada-ganada-cobrada → notificación al comercial.

### Fase 7 — Proyectos y time-tracking (opcional, 3-4 días)

- [ ] Decidir si Valere CRM gestiona proyectos. Si NO → saltar.
- [ ] Si SÍ: tablas `proyectos` + `time_tracking`, sync con Holded Projects API.

### Fase 8 — Optimización y observabilidad (2-3 días)

- [ ] Métricas: `holded_metrics` (latencia, error rate, items sincronizados/día).
- [ ] Dashboard Supabase con las métricas vía Postgres views.
- [ ] Alertas: si error_rate > 5% en 1h → email a admin.
- [ ] Documentación operativa: manual de runbook (rotar key, reintentar, resolver conflicto, rollback).
- [ ] Tests de contrato contra sandbox Holded.

**Estimación total**: 18-25 días persona repartidos en 8 fases. La integración es funcional desde Fase 5 (presupuestos/facturas operativas).

---

## 5. Riesgos vs trabajo en curso

| Riesgo | Trabajo en curso afectado | Mitigación |
|---|---|---|
| Migración de `empresas.direccion` colisiona con Fase 2 unificación Potencias | Fase 2 unificación migra ~410 filas Potencias (clients/supplies) a `empresas`/`cups` | Hacer Fase 0 Holded **DESPUÉS** de Fase 2 unificación. Si no, tendríamos que limpiar 2 veces. |
| Tab "Integración Holded" en AdminPage colisiona con tab "Pendientes" del sprint signup | Sprint signup ya añadió `tab="pendientes"` | Sin conflicto: añadimos `tab="holded"` aparte. Ninguna colisión. |
| Trigger en `empresas` colisiona con el RLS hardening pendiente | `_pending_rls_hardening_8_tables.sql` está en draft | El trigger es `BEFORE UPDATE/INSERT`, ortogonal a RLS. Sin conflicto. |
| Volumen de `empresas` para primera sync | Hay ~3 empresas CRM hoy + ~30 que vendrán en Fase 2 unificación | Volumen mínimo, no hay problema. Holded tiene "varios miles" según informe → polling de Holded con paginación. |
| `pg_cron` ya tiene job `cleanup_pending_users_daily` | Sprint signup creó el job | Sin colisión: añadimos jobs nuevos con jobnames distintos. |
| Cuenta Holded tiene un solo API Key | n/a | Generar key dedicada para Valere CRM (no compartir con otras integraciones). Rotación 90d. |
| Holded sandbox separado | Necesario para no probar en prod | Verificar si el plan Holded actual permite cuenta sandbox separada. Si no, usar contacto de test específico. |

---

## 6. Decisiones tomadas (2026-04-27)

| # | Decisión | Resolución |
|---|---|---|
| 1 | Cuándo arrancar | ✅ Hoy mismo (post-Fase 2 unificación cerrada). |
| 2 | Sandbox Holded | ❌ No verificado / no disponible. **Estrategia**: contacto test en producción llamado `TEST_VALERE_NOSINCRONIZAR` que la integración excluye explícitamente por nombre. Documentar en `holded_config` la lista de NIFs/IDs excluidos. |
| 3 | Productos bidireccional | ⏸️ Empezar pull-only (Holded→CRM). **Flag `productos_sync_mode` en tabla `holded_config`** con valores `'read'` (default) o `'bidirectional'`. Toggle desde panel admin sin tocar código. Activar bidireccional cuando Juan tenga confianza en la integración. |
| 4 | Fase 7 (Proyectos + time-tracking) | ⏸️ Postergar. Hacer Fases 0-6 primero (contactos + facturación operativa). Fase 7 queda opcional para decidir tras tener facturación funcionando. Valere CRM hoy no gestiona proyectos, añadirlo retrasa el valor real ~3-4 días. |
| 5 | Plazo | Cadencia normal: 1 fase por semana, ~5 semanas para tener facturación end-to-end (Fase 5). |
| 6 | Quién ejecuta | Nueva sesión Cowork dedicada con prompt en `docs/COWORK_PROMPT_HOLDED_INTEGRATION.md`. Coordinación con esta sesión via `.cowork/inbox/.cowork/outbox/`. |
| 7 | API key dedicada | ✅ "Valere CRM Integration" generada en Holded → Configuración → Desarrolladores. Guardada en Supabase Edge Functions Secrets como `HOLDED_API_KEY` (mismo patrón que `RESEND_API_KEY`). |

### Implicaciones técnicas

- **Tabla `holded_config`** debe incluir desde Fase 1: `productos_sync_mode text default 'read' check (productos_sync_mode in ('read','bidirectional'))`, `excluded_nifs text[] default array['TEST_VALERE_NOSINCRONIZAR']`.
- **Edge Function de Productos** lee `holded_config.productos_sync_mode` y solo escribe a Holded si es `'bidirectional'`.
- **Mappers de Contacts** filtran cualquier contacto con NIF en `excluded_nifs` antes de sincronizar.

---

## 7. Próximos pasos inmediatos (sin bloquear nada actual)

1. **Tú decides** los 7 puntos de la sección 6 (5 min).
2. **Cierras** trabajos en curso prioritarios:
   - Smoke test signup completar.
   - Fase 2 unificación Potencias (60 min con backups).
   - Cloudflare Potencias rollback URL (5 min, prompt ya redactado).
3. **Generas la API Key Holded** (Configuración → Desarrolladores) y me la pasas (yo la meto en Vault, no toca el repo).
4. **Lanzas nueva sesión Cowork** con el prompt de arranque que verás en `docs/COWORK_PROMPT_HOLDED_INTEGRATION.md` (lo redacto en este sprint).
5. La nueva sesión arranca por **Fase 0 (auditoría datos)** + entrega reporte. Tú validas. Continúa con Fase 1.

---

## 8. Métricas de éxito

| Métrica | Meta |
|---|---|
| Contactos con `holded_id` | 100% (excluyendo opt-outs documentados) |
| Latencia push Valere → Holded | < 5 min en flujo normal, < 30s en flujo síncrono botón "Sincronizar ahora" |
| Tasa de error de sincronización | < 1% sobre invocaciones totales |
| Tiempo de resolución de conflicto | < 24h en panel admin |
| Doble entrada manual eliminada | > 80% (clientes + facturas + cobros) |
| Coste infraestructura | 0€ adicionales |

---

## 9. Referencias

- Informe Browser original: [`docs/HOLDED_INFORME_BROWSER_2026-04-26.md`](./HOLDED_INFORME_BROWSER_2026-04-26.md)
- Holded API docs: https://developers.holded.com
- Stack Valere: ver [`CLAUDE.md`](../CLAUDE.md) sección "Producto"
- Estado actual: ver [`docs/ESTADO.md`](./ESTADO.md)
- Sprint signup (en curso, no bloquea): ver [`docs/SESIONES/2026-04-26-signup-aprobacion.md`](./SESIONES/2026-04-26-signup-aprobacion.md)
- Plan unificación Fase 2 (debe cerrarse antes): ver `scripts/unificacion_fase2_protocolo.md`
- Prompt de arranque para nueva sesión Cowork: [`docs/COWORK_PROMPT_HOLDED_INTEGRATION.md`](./COWORK_PROMPT_HOLDED_INTEGRATION.md) (siguiente entregable)
