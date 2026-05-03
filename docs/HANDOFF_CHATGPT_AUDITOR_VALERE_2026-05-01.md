# Handoff completo para auditor externo — Valere CRM v2 (1 mayo 2026)

> **Para ChatGPT u otro auditor externo.** Este documento es autocontenido. Permite auditar el proyecto sin acceso directo al repo. Acompañado del ZIP `valere-crm-audit-pack-2026-05-01.zip` con docs + código no sensible.

---

# 0. Cómo usar este documento

**Si tienes 30 minutos**: lee solo secciones 1, 6, 7, 10.

**Si tienes 2 horas**: lee todo en orden. Las secciones 4 (schema) y 5 (flujos) son las más densas; las puedes saltar si solo te interesa producto/roadmap.

**Documentos auxiliares (orden de lectura)**:
1. `INDEX_PROYECTO_VALERE.md` — punto de entrada general.
2. `ESTADO_TECNICO_ACTUAL.md` — stack y arquitectura.
3. `ROADMAP_VIGENTE.md` — qué viene.
4. `DEUDA_TECNICA_PRIORIZADA.md` — qué duele.

---

# 1. Mapa del repo

## Estructura

```
valere-v2/
├── .cowork/                  # Bus de mensajes entre agentes Claude (inbox/outbox)
├── .github/                  # GitHub Actions workflows (CI, regenerate embeddings, FV sync)
├── docs/                     # Documentación operativa y estratégica (~50 docs)
│   ├── help/                 # Documentación funcional consumida por RAG asistente
│   ├── SESIONES/             # Logs de sesiones Claude (continuidad)
│   └── *.md                  # Auditorías, planes, runbooks, comunicados
├── public/                   # Assets estáticos
├── scripts/                  # Scripts auxiliares (generate-help-embeddings.mjs, etc.)
├── src/
│   ├── components/           # Layout, search, ui (shadcn primitives)
│   ├── core/                 # Hooks, stores, supabase client, utils, types
│   └── features/             # 24 features autocontenidas (CRM + Calculadora + Potencias + FV)
├── supabase/
│   ├── functions/            # Edge Functions Deno (8 desplegadas)
│   └── migrations/           # 33 migrations SQL aplicadas
├── valere-crm-audit-pack-... # ZIP audit (este paquete)
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.* / index.css
├── .env.example
├── CLAUDE.md                 # Instrucciones persistentes para agentes Claude
└── README.md
```

## Ramas activas

```
main                                   ← rama estable, recomendada
claude/sprint2-lib-potencias *         ← rama en uso, TSC roto, NO mergear todavía
claude/valere-crm-architecture-2vvEV   ← rama histórica fusión, posiblemente obsoleta
claude/audit-log                       ← rama feature audit log
claude/back-button-contextual          ← rama feature
claude/holded-integration              ← rama integración Holded
claude/importador-xlsx-tarifas         ← rama feature
claude/kanban-oportunidades            ← rama feature
claude/potencias-sidebar-section       ← rama feature
claude/signup-aprobacion-manual        ← rama feature
claude/docs-cierre-2026-04-23          ← rama docs
backup_main_pre_reconcile_20260427     ← backup pre-reconcile
```

## Rama estable recomendada

**`main`**.

## Ramas que NO deben mergearse todavía

- `claude/sprint2-lib-potencias` — TSC roto (~60 errores). Cerrar antes de cualquier merge.

## Trabajo pendiente por rama

- `main`: nada bloqueante. Acepta merges desde feature branches con TSC verde.
- `claude/sprint2-lib-potencias`: cerrar TSC siguiendo `docs/SPRINT3_TSC_PENDIENTE.md`. Tiene **30+ archivos del Sprint A autónomo aplicado 1 mayo 2026** sin commit.
- `claude/valere-crm-architecture-2vvEV`: revisar si todavía tiene cambios no portados a main. Probable obsoleta.
- `claude/holded-integration`: ya integrada según `holded-config` y `holded-worker` en prod. Probable obsoleta.

---

# 2. Estado git actual

## git status (working tree de `claude/sprint2-lib-potencias`)

**30+ archivos modificados/nuevos sin commit:**

### Migrations aplicadas en BD prod, espejo SQL pendiente
- `supabase/migrations/20260501_fase30_1_daily_contract_check_pgcron.sql` (nuevo)
- `supabase/migrations/20260501_fase30_3_cerrar_etapas_legacy.sql` (nuevo)
- `supabase/migrations/20260501_fase30_8_incidencias_cups_id_fk.sql` (nuevo)

### Frontend Sprint A — código nuevo
- `src/core/utils/sentry.ts` (nuevo) — wrapper Sentry lazy.
- `src/features/datadis/components/AsociarEmpresaDialog.tsx` (nuevo).

### Frontend Sprint A — código modificado
- `src/main.tsx` — Sentry init React 19.
- `src/core/hooks/useAuth.ts` — setSentryUser tras login.
- `src/core/utils/logger.ts` — forward a captureException.
- `src/core/types/entities.ts` — EtapaOportunidad reducido a 8 valores.
- `src/features/oportunidades/components/KanbanCard.tsx` — importes visibles.
- `src/features/oportunidades/components/KanbanColumn.tsx` — suma columna.
- `src/features/oportunidades/components/OportunidadForm.tsx` — ETAPAS array limpio.
- `src/features/empresas/EmpresasPage.tsx` — wizard 2 pasos.
- `src/features/datadis/api.ts` — hook useAsociarSuministroAEmpresa.
- `src/features/datadis/DatadisPage.tsx` — botón Asociar.
- `package.json` — `@sentry/react@^10` añadido.
- `.env.example` — VITE_SENTRY_DSN documentado.

### Documentación nueva (15 docs)
- `docs/AUDIT_2026-05-01_MEJORAS_CRM.md`
- `docs/AUDIT_2026-05-01_PROFESIONAL_SECTOR.md`
- `docs/COMPARATIVA_COWORK_VS_CHATGPT_2026-05-01.md`
- `docs/PLAN_CAROLINA_ENGINE_2026-05-01.md`
- `docs/PLAN_CAPTACION_PROFESIONAL_2026-05-01.md`
- `docs/RELEASE_1_CAPTACION_2026-05-01.md`
- `docs/PROMPT_CHATGPT_SECOND_OPINION_2026-05-01.md`
- `docs/PLAN_DEPURACION_2026-05-01.md`
- `docs/CHECKLIST_QA_SPRINT_A_2026-05-01.md`
- `docs/INDICE_2026-05-01.md`
- `docs/INDEX_PROYECTO_VALERE.md`
- `docs/ESTADO_TECNICO_ACTUAL.md`
- `docs/ROADMAP_VIGENTE.md`
- `docs/DEUDA_TECNICA_PRIORIZADA.md`
- `docs/HANDOFF_CHATGPT_AUDITOR_VALERE_2026-05-01.md` (este)

### Documentación modificada
- `docs/ROADMAP_FUSION.md` — añadidas FASES 30-33.
- `docs/ESTADO.md` — encabezamiento sesión actual.

### Sesiones
- `docs/SESIONES/2026-05-01-resumen.md` (nuevo)
- `docs/SESIONES/2026-05-01-tarde-sprint-a-autonomo.md` (nuevo)
- `.cowork/outbox/2026-05-01-audit-mejoras-crm-handoff.md` (nuevo)
- `.cowork/outbox/2026-05-01-sprint-a-autonomo-aplicado.md` (nuevo)

## Últimos 15 commits

```
fe4066e feat(datadis): cache persistente en Supabase - proxy v8
7980c6b feat(datadis): SupplyDetailPage + navegacion desde listado
c5a6155 fix(datadis): CORS + credenciales override en datadis-proxy v5
cd4708d feat(datadis): pagina Datadis en sidebar con listado de suministros
6aa361c feat(datadis): proxy v4 funcional Bearer fix cookie sesion
d9947fa feat(datadis): proxy v2 abstraccion dual portal/terceros + provincias
231b2ed feat(datadis): Edge Function proxy v1 + migración cache + spec real API
43ef2a7 fix(fv-sync): reescribir sync_job.py completo (era truncado a 333 lineas)
31f8ac4 WIP sprint3: integracion lib Potencias parcial - TSC pendiente
a388e04 feat(fv): migracion mantenimiento externo + workflow informes
00243bd feat(fv): rediseno schema multi-credencial + fix fill + tipos regenerados
982f456 docs: ESTADO.md + resumen sesion noche 2026-04-29
a3d4a21 fix: dashboard 0-clientes + asistente 500 + ExpedienteDetail mejoras
6464a89 fix(fv-sync): usar force=True en click de login (elemento no visible en headless CI)
f36c812 fix(fv-sync): pre-instalar libasound2t64 para Playwright en Ubuntu 22/24
```

---

# 3. Arquitectura técnica

(Resumen, detalle en `ESTADO_TECNICO_ACTUAL.md`)

## Frontend

- React 19 + TypeScript 5.8 + Vite 6 + Tailwind 4 + shadcn/ui.
- 24 features bajo `src/features/`. Arquitectura feature-based.
- React-router-dom 6, code-splitting con `React.lazy`.
- Tanstack Query 5 para fetching/caching.
- React-hook-form + zod para formularios.
- Supabase JS SDK 2.100 con tipos `Database` regenerados.

## Backend Supabase

- **Proyecto**: `gtphkowfcuiqbvfkwjxb` (PROYECTO VALERE), eu-west-1, Postgres 17.
- **63 tablas** en schema `public` (ver sección 4).
- **RLS habilitada en 62/63 tablas** (`datadis_provincias` pendiente).
- **Política RLS actual**: mayoría `all_authenticated` (permisivo). Plan FASE 20.9 con políticas granulares por `comercial_id` escrito pero NO aplicado.
- **Bucket Storage**: `documentos` (privado, 50MB max).
- **Vault**: usado para secretos en cron jobs (HOLDED_CRON_SECRET).
- **Extensiones**: pgvector (RAG), pg_cron, pg_net, pgcrypto.

## Edge Functions Deno (8 desplegadas)

| Slug | Versión | verify_jwt | Propósito |
|---|---|---|---|
| `chat-consultor` | v15 | sí | Chat IA Gemini para consultoría |
| `ask-crm-docs` | v19 | sí | RAG asistente CRM (embeddings) |
| `notify-admin-pending-user` | v9 | sí | Email Resend al admin tras signup |
| `notify-user-approval-decision` | v9 | sí | Email Resend al usuario tras aprobación/rechazo |
| `holded-worker` | v3 | no | Sync Holded (con X-Cron-Secret header) |
| `notify-integration-error` | v3 | sí | Alertas de errores integración |
| `notify-expediente-estado` | v2 | sí | Notif Potencias |
| `datadis-proxy` | v8 | sí | Proxy a Datadis con cache persistente |

**Edge Function `daily-contract-check`** existe en repo pero NO desplegada. Lógica vive ahora en SQL `run_daily_contract_check()` desde FASE 30.1.

## Cron jobs (3 activos)

```sql
SELECT jobid, schedule, command, jobname, active FROM cron.job;
```

| jobname | schedule | command |
|---|---|---|
| `cleanup_pending_users_daily` | `0 3 * * *` | `SELECT public.cleanup_pending_users_older_than_7_days();` |
| `holded_worker_5min` | `*/5 * * * *` | `SELECT public.holded_dispatch_worker();` (HTTP a Edge Function vía pg_net) |
| `daily_contract_check` | `0 4 * * *` | `SELECT public.run_daily_contract_check();` (lógica plpgsql in-process) |

## Storage buckets

- `documentos` — privado, max 50MB. 98 filas en tabla `documentos` apuntando aquí. Tipos: factura, oferta, contrato_firmado, certificado, autorizacion.

## Integraciones externas

| Servicio | Estado | Notas |
|---|---|---|
| **Datadis** | ✅ funcional | Proxy v8, modo `portal` con credenciales del usuario. Solicitud terceros oficial pendiente. |
| **Holded** (ERP/contabilidad) | ✅ funcional | Sync bidireccional, 13 estados sincronizables, worker cron 5 min. |
| **Resend** (email) | ✅ funcional | Plan free 100/día. Dominio `valereconsultores.com` verificado. |
| **Gemini** (Google) | ✅ funcional | Edge Functions `chat-consultor` y `ask-crm-docs`. |
| **FusionSolar** (Huawei) | ✅ funcional | Playwright web scraping vía GitHub Actions. |
| **OMIE** | ❌ sin integrar | Plan FASE 34. |
| **eSIOS / REE** | ❌ sin integrar | Plan FASE 34. |
| **SIPS** (CNMC) | ❌ sin integrar | Plan FASE 34, requiere acuerdo regulatorio. |
| **eInforma / Axesor** | ❌ sin integrar | Plan FASE 34 para enriquecimiento leads. |
| **Lista Robinson** (ADIGITAL) | ❌ sin integrar | Plan FASE 34, ~€200-500/año suscripción. |
| **Google Workspace** | 🟡 en migración | Plan documentado SSO + Gmail API + Drive + Calendar. |

---

# 4. Schema de base de datos

## Vista global de las 63 tablas en schema `public`

### Tablas principales CRM (12)

| Tabla | Filas | Comentario |
|---|---|---|
| `empresas` | 27 | Cuentas comerciales |
| `contactos` | 1 | Personas en empresas — cartera vacía |
| `contratos` | 2 | Contratos energéticos |
| `cups` | 72 | Suministros (con campos Datadis y FV) |
| `oportunidades` | 4 | Pipeline (etapas energéticas tras FASE 30.3) |
| `actividades` | 1 | Polimórfica (tareas/llamadas/emails/etc.) |
| `propuestas` | 0 | Propuestas comerciales |
| `incidencias` | 0 | FASE 22, con `cups_id` añadido FASE 30.8 |
| `renovaciones` | 0 | FASE 23 — vacía, candidata DROP |
| `notificaciones` | 0 | Bell icon |
| `documentos` | 98 | FASE 24, polimórfica con bucket Storage |
| `eventos` | 0 | Calendario polimórfico |

### Tablas Calculadora energética (5)

| Tabla | Filas | Comentario |
|---|---|---|
| `facturas` | 0 | Facturas históricas (con consumo P1-P6) |
| `comercializadoras` | 8 | Catálogo (renombrada de retailers) |
| `comercializadora_ofertas` | 0 | Ofertas (renombrada de retailer_offers) |
| `proposals` | 0 | Legacy, candidata renombrar a `analisis_comparativo` |
| `precios_regulados_boe` | 47 | Precios BOE (renombrada de boe_regulated_prices) |

### Tablas Datadis (4)

| Tabla | Filas | Comentario |
|---|---|---|
| `datadis_tokens` | 0 | Credenciales por empresa |
| `datadis_consumptions` | 0 | Consumo horario |
| `datadis_consumos_cache` | 0 | Cache local |
| `datadis_proxy_cache` | 0 | Cache proxy Edge Function |
| `consentimientos_datadis` | 0 | Consentimientos titulares |
| `datadis_provincias` | 52 | INE provincias (sin RLS) |

### Tablas Plantas FV (12)

| Tabla | Filas | Comentario |
|---|---|---|
| `fv_credenciales` | 1 | Credenciales FusionSolar (JOLIVARES) |
| `fv_planta` | 0 | Plantas físicas (UNIQUE plataforma+region+station) |
| `fv_planta_credencial` | 0 | N:M credenciales↔plantas |
| `fv_dispositivo` | 0 | Inversores/baterías por planta |
| `fv_kpi_diario` | 0 | KPIs por día |
| `fv_kpi_realtime` | 0 | KPIs tiempo real |
| `fv_alarma` | 0 | Alarmas FV |
| `fv_resumen_semanal` | 0 | Resúmenes auto |
| `fv_informe_mensual` | 0 | Informes (workflow estados) |
| `fv_empresa_mantenimiento` | 0 | Empresas mantenimiento externo |
| `fv_mantenimiento` | 0 | Intervenciones por planta |
| `fv_config_informe` | 0 | Config envío informes por cliente |
| `fv_sync_log` | 20 | Log sync FusionSolar |

### Tablas Potencias (RDL 17/2021) (8)

| Tabla | Filas | Comentario |
|---|---|---|
| `expedientes` | 41 | Expedientes potencia |
| `ciclos` | 41 | Ciclos por expediente |
| `solicitudes_potencia` | 41 | Solicitudes (con trigger alertas) |
| `savings_calculations` | 41 | Cálculos ahorro |
| `comercializadora_docs` | 1 | Plantillas docs |
| `comunicaciones_cliente` | 31 | Comms con cliente |
| `alertas` | 0 | Alertas activas |
| `email_templates` | 2 | Plantillas email |

### Tablas Holded (5)

| Tabla | Filas | Comentario |
|---|---|---|
| `holded_config` | 1 | Singleton |
| `holded_sync_queue` | 0 | Cola pendientes |
| `holded_integration_logs` | 0 | Log llamadas |
| `holded_conflicts` | 0 | Conflictos resolución manual |
| `holded_sync_state` | 13 | Estado pull/push por entidad |

### Tablas auxiliares / sistema (10)

| Tabla | Filas | Comentario |
|---|---|---|
| `user_profiles` | 6 | Roles master/manager/consultant/client |
| `custom_fields_schema` | 2 | Campos custom polimórficos |
| `custom_fields_values` | 2 | Valores custom |
| `tareas` | 0 | Legacy, no usada (actividades.tipo='tarea' es el patrón) |
| `crm_help_embeddings` | 268 | Vectores RAG (pgvector) |
| `crm_asistente_log` | 15 | Log preguntas anonimizado |
| `audit_log` | 9 | Audit trail entidades CRM |
| `excel_import_templates` | 0 | Plantillas import |
| `status_log` | 91 | Log cambios estado |
| `global_config` | 1 | Config global Calculadora |

### Tablas auxiliares migración (legacy DROP candidatos)

| Tabla | Filas | Comentario |
|---|---|---|
| `_migration_user_map` | 4 | Mapeo migración Potencias |
| `_migration_empresa_map` | 30 | idem |
| `_migration_cups_map` | 75 | idem |
| `_migration_comercializadora_map` | 2 | idem |
| `_migration_expediente_map` | 41 | idem |
| `_migration_ciclo_map` | 41 | idem |
| `_migration_request_map` | 41 | idem |

## Relaciones importantes

```
empresas (1) ─┬─ contactos (N) [empresa_id]
              ├─ contratos (N) [empresa_id]
              ├─ cups (N) [empresa_id]
              ├─ oportunidades (N) [empresa_id]
              ├─ propuestas (N) [empresa_id]
              ├─ incidencias (N) [empresa_id]
              ├─ documentos (N) [polimórfica via entidad_tipo='empresa']
              └─ eventos (N) [polimórfica]

contratos (1) ─┬─ cups (N) [contrato_id]
               ├─ oportunidades (N) [contrato_origen_id]
               ├─ renovaciones (N) [contrato_id]  ← deprecada
               └─ incidencias (N) [contrato_id]

cups (1) ─┬─ datadis_consumptions (N) [cups_id]
          ├─ facturas (N) [cups_id]
          ├─ proposals (N) [cups_id]  ← legacy
          └─ incidencias (N) [cups_id]  ← FK añadida FASE 30.8

oportunidades (1) ─┬─ propuestas (N) [oportunidad_id]
                   └─ actividades (N) [polimórfica entidad_tipo='oportunidad']

user_profiles (1) ─┬─ empresas (N) [comercial_id]
                   ├─ contratos (N) [comercial_id]
                   ├─ oportunidades (N) [comercial_id]
                   ├─ actividades (N) [usuario_id, asignado_a]
                   ├─ incidencias (N) [asignado_a]
                   └─ notificaciones (N) [usuario_id]

empresas (1) ─┬─ fv_planta (N) [empresa_id]
              ├─ fv_credenciales (N) [empresa_id]  ← multi-cliente
              └─ fv_config_informe (N) [empresa_id]

fv_planta (1) ─┬─ fv_dispositivo (N) [planta_id]
               ├─ fv_kpi_diario (N) [planta_id]
               ├─ fv_alarma (N) [planta_id]
               └─ fv_mantenimiento (N) [planta_id]

empresas (1) ─┬─ expedientes (N) [empresa_id]  ← Potencias
              └─ solicitudes_potencia (N) [empresa_id]

expedientes (1) ─┬─ ciclos (N) [expediente_id]
                 ├─ solicitudes_potencia (N) [expediente_id]
                 ├─ savings_calculations (N) [expediente_id]
                 └─ comunicaciones_cliente (N) [expediente_id]
```

## Tablas vacías (síntomas a investigar)

- `contactos: 1 fila` — síntoma claro de que **el alta de contactos no se está usando** (FASE 30.5 wizard intenta resolver).
- `oportunidades: 4` — pipeline mínimo, casi sin uso.
- `actividades: 1` — equipo no registra actividades.
- `incidencias: 0` — workflow sin uso (sin alertas auto, FASE 32.1 lo resolvería).
- `renovaciones: 0` — DROP candidata.
- `notificaciones: 0` — sin uso.
- `eventos: 0` — calendario sin uso.
- `tareas: 0` — legacy DROP.

## Tablas legacy (candidatas DROP futuro)

- `tareas` — `actividades.tipo='tarea'` es el patrón vivo.
- `proposals` — renombrar a `analisis_comparativo` (Calculadora).
- `renovaciones` — consolidar en `oportunidades.tipo='renovacion'`.
- `_migration_*_map` (7 tablas) — auxiliares migración Potencias→CRM, ya no necesarias.

## RLS estado

| Capa | Estado |
|---|---|
| RLS enabled | 62/63 tablas (`datadis_provincias` la única sin) |
| Política activa | mayoría `all_authenticated` (cualquier user logueado ve todo) |
| RLS granular FASE 20.9 | escrita en migration, NO aplicada en prod |
| Bloqueo dependiente | portal cliente (FASE 32.3) |

---

# 5. Flujos funcionales reales

## Empresas

- **Origen alta**: manual (UI), CSV importador, futuro Datadis batch (FASE 30.7).
- **Tras FASE 30.5**: alta UI exige paso 2 con contacto decisor. ConfirmDialog para abandonar.
- **EmpresaDetailPage**: tabs Resumen, Contactos, Contratos, Actividades, Documentos, Propuestas, Campos Custom, Plantas FV.
- **Búsqueda**: por nombre o NIF, con `or` filter en api.ts.
- **Estado**: 27 empresas, 1 con contacto.

## Contactos

- **Vinculación**: `empresa_id` obligatorio.
- **Campos clave**: `es_decisor: bool`, `es_firmante: bool` (no rol_energetico todavía — FASE 31.6).
- **Estado**: 1 fila — **disfuncional** en práctica.

## Oportunidades

- **Modelo Kanban** + tabla.
- **Etapas (FASE 30.3)**: prospecto → auditoria_consumo → oferta_presentada → negociacion → contrato_firmado → activo → cerrada_ganada / cerrada_perdida.
- **Tipos**: nueva_venta, renovacion, ampliacion, recuperacion.
- **Cron `daily_contract_check`** crea oportunidades tipo='renovacion' automáticas para contratos con fecha_fin en próximos 60 días.
- **Importes** (visibles tras FASE 30.4): valor_estimado_eur + ahorro_anual_estimado.
- **Estado**: 4 oportunidades (3 cerrada_ganada + 1 auditoria_consumo).

## Contratos

- **Modelo**: empresa_id, contacto_firmante_id, comercial_id, numero_contrato, compania, tarifa_acceso, tarifa_cliente, tipo_energia, tipo_precio, fecha_firma, fecha_inicio, fecha_fin, duracion_meses, consumo_sips_kwh, consumo_po_kwh, potencia_contratada, comisión integra/comercial/jefe, estado, observaciones.
- **Estados**: borrador, tramite, activo, vencido, baja, incidencia, cancelado.
- **Falta**: precios P1-P6 €/kWh y €/kW·año (FASE 31.1 pendiente).
- **Estado**: 2 contratos activos.

## CUPS

- **Modelo rico**: empresa_id, contrato_id, codigo_cups, direccion_suministro, distribuidor, estado, tarifa_acceso, potencias_contratadas (Record), comercializadora_actual, autoconsumo (modelo, manual), potencia_fv_kwp, coste_instalacion_fv_eur, fecha_instalacion_fv, marca_inversor, energia_p1..p6_kwh.
- **Campos Datadis**: datadis_sincronizado, datadis_ultima_sync, datadis_distribuidor_cod, datadis_punto_tipo.
- **Campos Potencias**: p1_kw..p6_kw, denominacion, tension_kv, potencia_maxima_disponible, channel.
- **Estado**: 72 CUPS — la mayoría sin empresa_id (Datadis aislado).

## Datadis

- **Edge Function `datadis-proxy` v8** con cache `datadis_proxy_cache`.
- **5 endpoints**: get_supplies, get_consumption, get_max_power, get_contractual, get_reactive.
- **Modo `portal`** funcional (con credenciales usuario). Modo `terceros` (oficial) pendiente aprobación.
- **DatadisPage**: lista de 14 suministros del cliente piloto CHEMTROL.
- **Tras FASE 30.6**: botón Asociar a empresa por fila + AsociarEmpresaDialog.
- **Pendiente FASE 30.7**: vinculación masiva por NIF.

## Plantas FV (Seguimiento FV)

- **Sync via Playwright** desde GitHub Actions (workflow `fv-sync`).
- **Multi-credencial**: 1 instalador puede ver plantas de varios clientes.
- **Workflow informe mensual**: borrador → revision_pendiente → aprobado → enviado.
- **Mantenimiento externo**: registro empresas + intervenciones.
- **Estado**: 1 credencial JOLIVARES, 0 plantas sincronizadas (pipeline pendiente Run #15).

## Potencias (RDL 17/2021)

- **Módulo separado** con 7 sub-rutas: dashboard, expedientes, comunicaciones, informes, documentación, configuración, suministros.
- **Trigger `fn_calcular_alertas_solicitudes`** activo.
- **41 expedientes** con created_by asignado tras migración 1+2 abril 2026.
- **TSC roto** en sprint integración librería Potencias (~60 errores documentados).

## Propuestas

- **Tabla `propuestas`** (CRM): vinculada a `oportunidades` y `empresas`. Estados borrador/enviada/vista/aceptada/rechazada/caducada.
- **Tabla `proposals`** (Calculadora legacy): cups_id FK pero 0 filas. Renombrar a `analisis_comparativo`.
- **Estado**: 0 propuestas en ambas. Sin uso real todavía.

## Renovaciones

- **Tabla `renovaciones`**: 0 filas. Workflow estados detectada/contactado/oferta_enviada/negociacion/renovado/perdido.
- **Cron `daily_contract_check`**: crea `oportunidades.tipo='renovacion'` (NO populates `renovaciones`).
- **Decisión pendiente FASE 30.2**: DROP la tabla y refactorizar UI.

## Incidencias

- **Tabla**: 0 filas. Workflow tipos (facturacion, cambio_comercializadora, corte_suministro, potencia, acceso_red, otro) y estados (abierta, en_gestion, pendiente_cliente, pendiente_comercializadora, resuelta, cerrada).
- **Importe reclamado/recuperado**: campos para métrica trofeo.
- **Tras FASE 30.8**: `cups_id` FK añadido (aditivo, mantiene `cups: text` por compatibilidad).
- **Pendiente FASE 32.1**: `datadis-incidencias-detector` que crea incidencias auto desde alertas Datadis.

---

# 6. Estado exacto del Sprint A (1 mayo 2026)

## Aplicado en producción ✅

3 migrations vía Supabase MCP. Verificadas:

1. **FASE 30.1**: `run_daily_contract_check()` SECURITY DEFINER + cron jobid 3 + `REVOKE EXECUTE` de anon/authenticated tras detectar warning advisor.
2. **FASE 30.8 aditiva**: `incidencias.cups_id uuid REFERENCES cups(id)` + index parcial + populate (0 filas afectadas).
3. **FASE 30.3**: UPDATE 1 fila (contactado→auditoria_consumo) + restringir CHECK a 8 etapas + comment.

Verificación post-aplicación:
```sql
-- Etapas resultantes
cerrada_ganada    3
auditoria_consumo 1
-- Cron registrado
daily_contract_check, 0 4 * * *, active=true
```

## Modificado en frontend (working tree, sin commit) 🟡

10 archivos modificados/nuevos del Sprint A frontend. Detalle en sección 2.

## Pendiente validación QA manual

`docs/CHECKLIST_QA_SPRINT_A_2026-05-01.md` con 6 tests:
1. Importes en Kanban
2. Wizard contacto decisor (incl. flow "salir sin contacto")
3. Asociar Datadis → empresa
4. Sentry SDK lazy sin DSN
5. Cron daily_contract_check ejecutándose
6. Migration cups_id verification

Estimado: 30-45 min de QA + commit.

## Bloqueador del merge

**TSC roto en `claude/sprint2-lib-potencias` (~60 errores)** del sprint integración Potencias del 30 abril.

Plan documentado en `docs/SPRINT3_TSC_PENDIENTE.md` (Fases A-E, ~2.5h).

**Hasta cerrar TSC, no se puede mergear nada a main.**

## Pendientes Sprint A no aplicados

- **30.2**: consolidar `renovaciones` ↔ `oportunidades.tipo='renovacion'`. Decisión: DROP tabla. Requiere refactor `renovaciones/api.ts` y RenovacionesPage. Coste 3-4h.
- **30.7**: vinculación masiva Datadis por NIF. Edge Function nueva. Coste 1d.
- **30.9**: aplicar RLS granular FASE 20.9. Sesión coordinada tabla a tabla con observación EXPLAIN ANALYZE. Coste 2d.

---

# 7. Deuda técnica priorizada

(Detalle completo en `DEUDA_TECNICA_PRIORIZADA.md`)

## Crítica

- TSC roto en `claude/sprint2-lib-potencias` (~60 errores).
- 30+ archivos working tree sin commit.
- Wizard contacto decisor sin validar adopción.

## Importante

- 110 `as never` legados.
- Sub-fases Sprint A pendientes (30.2 / 30.7 / 30.9).
- 14 docs creados hoy con solapamiento.
- Validación contacto decisor solo en CREATE.
- Edge Function `daily-contract-check` huérfana (decidir delete vs deploy).

## Aceptable

- Cobertura tests 3% (33 tests en 6 archivos).
- Dos escuelas visuales (CRM vs Calc).
- A11y gap (30 botones icon-only sin aria-label, 5 confirm() nativos).
- Tabla móvil no responsive.
- RAG asistente CRM con uso bajo (15 consultas/30d).
- Modo oscuro pendiente.

## Riesgos seguridad

- **RLS granular NO aplicada** (mayor riesgo — bloquea portal cliente).
- `datadis_provincias` sin RLS habilitada.
- 15 funciones SECURITY DEFINER expuestas a anon/authenticated (revisar).
- 13 funciones sin search_path explícito.
- Política `alertas_update_leida` con `USING (true)` (warn).
- `auth_leaked_password_protection` deshabilitado.

## Features esqueleto sin cablear

- Datadis ↔ CRM (parcialmente resuelto FASE 30.6).
- Tabla documentos sin generador automático ni firma digital.
- Tabla eventos vacía (calendario sin uso).
- Tabla incidencias vacía (sin auto-generación).
- Tabla tareas legacy (no usada).
- Tabla proposals legacy (renombrar).
- 7 tablas `_migration_*_map` legacy.

---

# 8. Documentos clave

(Mapa completo en `INDEX_PROYECTO_VALERE.md`)

## Para auditor: orden de lectura

1. **`HANDOFF_CHATGPT_AUDITOR_VALERE_2026-05-01.md`** (este).
2. **`INDEX_PROYECTO_VALERE.md`** — mapa general del proyecto.
3. **`ESTADO_TECNICO_ACTUAL.md`** — stack y arquitectura.
4. **`ROADMAP_VIGENTE.md`** — qué viene.
5. **`DEUDA_TECNICA_PRIORIZADA.md`** — qué duele.
6. **`AUDIT_2026-05-01_MEJORAS_CRM.md`** — auditoría técnica vs código.
7. **`AUDIT_2026-05-01_PROFESIONAL_SECTOR.md`** — auditoría sectorial.
8. **`RELEASE_1_CAPTACION_2026-05-01.md`** — plan ejecutable inmediato.

## Roadmap vigente

`ROADMAP_FUSION.md` con FASES 20-29 cerradas + FASES 30-33 vigentes.

`ROADMAP_VIGENTE.md` lo condensa.

## Documentos obsoletos / superados

(Marcados en `INDICE_2026-05-01.md`)

- `PLAN_CAROLINA_ENGINE_2026-05-01.md` — superado por RELEASE_1.
- `PLAN_CAPTACION_PROFESIONAL_2026-05-01.md` — referencia técnica útil pero plan superado.
- `PROMPT_CHATGPT_SECOND_OPINION_2026-05-01.md` — prompt one-shot ya consumido.

---

# 9. Cómo ejecutar localmente

## Pre-requisitos

- Node 20+
- npm 10+
- Acceso al proyecto Supabase `gtphkowfcuiqbvfkwjxb` (o cuenta propia para test)

## Comandos

```bash
# 1. Clonar
git clone https://github.com/jolivares-valere/valere-v2.git
cd valere-v2

# 2. Instalar dependencias
npm install

# 3. Copiar y rellenar .env
cp .env.example .env
# Rellenar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (desde Supabase Dashboard > Settings > API)

# 4. Dev server
npm run dev
# → http://localhost:3000

# 5. Type-check
npx tsc --noEmit

# 6. Tests
npm test -- --run

# 7. Build producción
npm run build

# 8. Preview build
npm run preview
```

## Variables `.env` necesarias (sin secretos)

```
VITE_SUPABASE_URL=https://gtphkowfcuiqbvfkwjxb.supabase.co
VITE_SUPABASE_ANON_KEY=[REDACTED]
VITE_SENTRY_DSN=                       # opcional, vacío en local
VITE_SENTRY_ENVIRONMENT=development
```

## Edge Functions test (requiere Supabase CLI)

```bash
# Supabase CLI
supabase functions serve datadis-proxy --env-file ./supabase/functions/.env.local
# (las secrets reales viven en Supabase Dashboard, no en repo)
```

## Login de prueba

- Master: `jolivares@valereconsultores.com` (auto-aprobado).
- Otros usuarios: alta vía `/signup` con aprobación manual del master desde `/admin` tab Pendientes.

---

# 10. Preguntas abiertas para auditoría

Concretas, ordenadas por importancia.

## Decisiones pendientes (Juan)

1. **`renovaciones` vs `oportunidades.tipo='renovacion'`**: DROP la tabla `renovaciones` (vacía) y refactorizar `/renovaciones` como vista filtrada de `oportunidades`? Mi recomendación: sí, con flag `auto_generated=true` para distinguir las creadas por cron.

2. **Servicios adyacentes prioritarios**: para una consultora pequeña, ¿qué 2 verticales abrir antes? Mi propuesta: **FV** (ticket alto, mercado claro) + **CAEs** (RDL 14/2022, margen alto). Diferir CSRD/PPA/CER/auditoría obligatoria RD 56/2016.

3. **Datadis profundo vs Portal cliente**: solo se puede hacer 1 bien en 6 meses. ¿Cuál? Mi recomendación: Datadis profundo (backend > frontend, alimenta todo lo demás).

4. **CTI Aircall/Ringover ahora o después**: ChatGPT recomienda esperar 2 semanas con Carolina con `tel:` link manual antes de comprar. Acepto.

5. **Validador de facturas — proveedor LLM**: Anthropic Claude / Google Gemini / OpenAI / opción privada (pdfplumber + reglas). Mi propuesta: **híbrido C** — LLM extrae JSON, motor de reglas determinístico valida.

## Dudas técnicas

6. **¿Aplicar RLS granular FASE 20.9 ahora o tras Release 1?** Bloquea portal cliente pero no bloquea Release 1. Riesgo timeout queries con joins.

7. **¿Eliminar Edge Function `daily-contract-check` (no desplegada)?** La lógica vive en SQL ahora. Mantener como referencia o borrar.

8. **¿Cómo gestionar acceso SIPS regulado (CNMC)?** Suscripción comercializadora? Acuerdos por distribuidora? eInforma como proxy? Datadis sigue siendo el único dato curado con consentimiento.

9. **¿Mantener tabla `tareas` o consolidar en `actividades.tipo='tarea'`?** Hoy tareas tiene 0 filas, actividades con tipo='tarea' es lo que usan.

10. **¿Cuándo eliminar las 7 tablas `_migration_*_map`?** Datos de mapeo de migración Potencias→CRM. Si nadie hace rollback, se pueden borrar.

## Áreas donde se quiere segunda opinión

11. **Modelo CRM-céntrico vs CUPS-céntrico vs híbrido**. Concluimos: híbrido (CRM=empresa, Operaciones=CUPS). ¿Es la decisión correcta?

12. **Cadencia automática de captación**: ¿automática (8-12 touches programados) o semi-automática (sistema sugiere, Carolina confirma)? Concluimos semi-automática, R3 tras 100 ciclos manuales.

13. **Cobertura tests**: 3% actual → 30% objetivo. ¿Vale el esfuerzo o crece la app sin tests salvo regresiones críticas?

14. **¿RAG asistente CRM mantener o eliminar?** 15 consultas/30d con 100% éxito y 4.6s promedio. Coste mantenimiento bajo. Mi propuesta: mantener, no priorizar mejoras.

15. **¿Validador facturas como producto separado licenciable a otras consultoras?** Una vez maduro, podría abrir línea SaaS B2B2B. Probable alta complejidad pero potencial real.

## Riesgos no identificados que el auditor pueda ver

Espacio para que ChatGPT añada riesgos que no hemos visto. Algunas pistas:
- ¿Hay riesgo en la dependencia de Datadis modo `portal` (credenciales usuario)?
- ¿Se gestiona bien el churn de empleados en Workspace (Auth se elimina al borrar usuario)?
- ¿Riesgo en regenerar tipos `Database` cuando schema cambia (rotura silenciosa)?
- ¿Backup/restore de Supabase tiene plan probado?

---

# 11. Cierre

Este documento + los 4 auxiliares (`INDEX`, `ESTADO_TECNICO`, `ROADMAP_VIGENTE`, `DEUDA_PRIORIZADA`) + el ZIP `valere-crm-audit-pack-2026-05-01.zip` constituyen el paquete de handoff completo.

Para una auditoría profunda recomendamos al auditor:

1. **Producto y estrategia**: foco en sección 5 (flujos), 6 (Sprint A) y 10 (preguntas abiertas).
2. **Arquitectura técnica**: foco en sección 3 (arquitectura), 4 (schema), 7 (deuda).
3. **Riesgos**: foco en sección 7 (deuda) + RLS no aplicada + advisor seguridad.
4. **Roadmap**: foco en `ROADMAP_VIGENTE.md` + `RELEASE_1_CAPTACION_2026-05-01.md`.

Y volver con:
- Riesgos no identificados.
- Mejor priorización si la nuestra falla.
- Decisiones concretas para las 15 preguntas abiertas (sección 10).

— Cowork, 1 mayo 2026.
