# Estado actual del proyecto Valere v2

> Última actualización: 2026-04-24 por Cowork — Resuelto merge huérfano en `claude/mcp-setup` (locks limpiados, ruido CRLF descartado) · 3 docs sin commitear de la sesión 2026-04-23 movidos a PR #6 (rama `claude/docs-cierre-2026-04-23`) · rama local `claude/mcp-setup` borrada (ya estaba squash en main vía PR #5)


## Sesión 2026-04-24 — Limpieza merge huérfano + PR #6 docs

**Rama:** `claude/docs-cierre-2026-04-23` → PR #6 abierto contra main.

### Qué pasaba
Working tree de Cowork tenía un `git merge` de `origin/main` (`ef3aa68`) en `claude/mcp-setup` (`5a7590e`) **a medio cerrar**: 6 lock files huérfanos (`.git/index.lock`, `HEAD.lock`, `ORIG_HEAD.lock`, `refs/heads/claude/mcp-setup.lock`) que el sandbox no podía borrar (`Operation not permitted` por mount Windows), 198 ficheros mostrados como "modified" que en realidad eran 100% ruido CRLF/LF (mismo nº de inserciones que de borrados línea a línea), y 3 docs sin commitear de la sesión cowork del día anterior.

Como PR #5 ya se había mergeado a main por **squash** (`ef3aa68`), `claude/mcp-setup` y `origin/main` contenían exactamente el mismo código — la rama local quedaba obsoleta.

### Acciones
- ✅ `mcp__cowork__allow_cowork_file_delete` para desbloquear los locks → `rm -f` los 6 lock files.
- ✅ `git merge --abort` + `git checkout -- .` → working tree limpio (sólo 3 untracked docs reales).
- ✅ Rama nueva `claude/docs-cierre-2026-04-23` desde `origin/main` (ef3aa68) con los 3 docs.
- ✅ Commit `68720bd` + push + **PR #6** abierto (`docs: cierre sesión 2026-04-23 + planning apps satélite`).
- ✅ Rama local `claude/mcp-setup` borrada (estaba squash en main).

### Docs commiteados en PR #6
- `docs/PLANNING_APPS_SATELITE.md` (12.9 KB)
- `docs/SCRIPT_SUBIR_POTENCIAS_A_GITHUB.md` (8.8 KB)
- `docs/SESIONES/2026-04-23-cierre-tarde.md` (4.2 KB)

### Pendientes que siguen vivos (de sesión 2026-04-23)
- ⏳ Regenerar `RESEND_API_KEY` (expuesta en chat).
- ⏳ Investigar repo privado `jolivares-valere/valere-gestion-energetica`.
- ⏳ Borrar carpeta vacía `CRM VALERE/` en raíz del clone Windows.
- ⏳ Migration unificación `oportunidades.etapa` (`ganada` vs `cerrada_ganada`).
- ⏳ Activar Pro plan Supabase cuando se escale.
- ⏳ Cerrar PR #6 (mergear cuando CI pase).


## Sesion 2026-04-23 — MCPs + hardening seguridad

**Rama:** claude/mcp-setup (PR #5 abierto -> main).

### Hitos
- Supabase MCP conectado desde Cowork - operativo contra gtphkowfcuiqbvfkwjxb
- Vercel MCP conectado desde Cowork
- GitHub fuera de MCP (decision opcion b) - gh CLI instalado localmente
- Migration fase28_6_rls_policies_cleanup aplicada
- Migration fase28_7a_views_security_invoker aplicada (8 ERRORs cerrados)
- Migration fase28_7b_rls_policies_tightening aplicada (15 WARNs cerrados)
- Migration fase28_7c_functions_search_path aplicada (6 WARNs cerrados)
- Auth password hardening: minimum length 12 + mixed complexity
- docs/ARQUITECTURA_PROYECTOS.md nuevo
- docs/SEGURIDAD.md nuevo
- docs/MCP_SETUP.md actualizado a opcion b

### Advisors Supabase: 34 -> 1
Solo queda auth_leaked_password_protection WARN - requiere Pro plan, mitigado.

### Pendientes abiertos
- Localizar repo valere-gestion-potencias
- Carpeta CRM VALERE/ vacia en mount Cowork - borrar o reutilizar
- Activar Pro plan cuando se escale
- PR #5 pendiente de merge cuando CI pase


## Sesión 2026-04-23 — MCPs + hardening seguridad

**Rama:** `claude/mcp-setup` (PR #5 abierto → main).

### Hitos
- ✅ Supabase MCP conectado desde Cowork — `list_projects`, `execute_sql`, `apply_migration`, `get_advisors` operativos contra `gtphkowfcuiqbvfkwjxb`
- ✅ Vercel MCP conectado desde Cowork
- ✅ GitHub fuera de MCP (decisión "opción b") — `gh` CLI instalado localmente; `.mcp.json` sólo tiene supabase + vercel
- ✅ Migration `fase28_6_rls_policies_cleanup` aplicada (notificaciones granular + drop policies duplicadas custom_fields)
- ✅ Migration `fase28_7a_views_security_invoker` aplicada (8 vistas → SECURITY INVOKER, 8 ERRORs cerrados)
- ✅ Migration `fase28_7b_rls_policies_tightening` aplicada (9 policies granularizadas, 15 WARNs cerrados)
- ✅ Migration `fase28_7c_functions_search_path` aplicada (6 funciones con search_path fijo, 6 WARNs cerrados)
- ✅ Auth password hardening en dashboard: minimum length 12 + lowercase/uppercase/digits/symbols
- ✅ `docs/ARQUITECTURA_PROYECTOS.md` nuevo — mapea CRM + valere-gestion-potencias + futuras apps satélite
- ✅ `docs/SEGURIDAD.md` nuevo — registro de decisiones de seguridad (incluye decisión de no upgrade a Pro por leaked password protection)
- ✅ `docs/MCP_SETUP.md` actualizado para opción b (GitHub vía gh, no MCP)

### Advisors Supabase: 34 → 1
Solo queda `auth_leaked_password_protection` WARN — requiere Pro plan, mitigado con password length + complexity. Decisión documentada en `docs/SEGURIDAD.md` §1.

### Pendientes abiertos
- Localizar repo de `valere-gestion-potencias` (búsqueda GitHub jolivares-valere devuelve solo valere-v2 público → repo privado o local sin subir)
- Carpeta `CRM VALERE/` vacía en mount Cowork — borrar o reutilizar
- Activar Pro plan cuando se escale (desbloquea leaked password protection + PITR)
- PR #5 `claude/mcp-setup` pendiente de merge cuando CI pase



## Rama de desarrollo

`claude/valere-crm-architecture-2vvEV` — PR #1 abierto → main.
HEAD actual: `f0ac5fa`. 27 commits desde la última actualización de este fichero.

## Resumen ejecutivo

CRM + Calculadora fusionados bajo arquitectura feature-based (`src/features/`). **27 fases del roadmap completadas + FASE 28 completa (3 ejes) + FASE 28.1–28.5 hardening y polish**. TSC 0 errores · 39/39 tests · build OK.

**Audit completo 2026-04-19:** 0 P0 pendientes · 0 P1 pendientes. Consolidado en `docs/AUDIT_2026-04-19.md`.

**DROP legacy ejecutado 2026-04-21**: Cowork dropeó `clients` y `supply_points` en Supabase (datos de PAZ Y BIEN test migrados a empresas). `proposals` (EN) se queda — la usa activamente AnalisisPage/PropuestasEnergiaPage/TrackingPage.

## Commits (sesiones 2026-04-20 y 2026-04-21)

### FASE 28 — Personalización + Eje 1/2/3 (2026-04-20 AM)

| Commit | Qué hace |
|--------|----------|
| `a29ac79` | FASE 28.1 — Refactor 4 features Calculadora → cups/empresas/facturas (adapter pattern) |
| `4aaf82f` | FASE 28 Eje 2 — Dashboards por rol (useDashboardScope + badge visual) |
| `f28d9a3` | FASE 28 Eje 1 — Custom fields (useCustomFields, CustomFieldsPanel, CustomFieldsManager, tab "campos" en empresas y oportunidades) |
| `abff85a` | FASE 28 Eje 3 — Automatizaciones (oportunidad ganada → borrador contrato; contrato activado → tarea 30d) |
| `f51bfc8` | Hardening: role gating /admin, focus trap ConfirmDialog, CSP meta tag |
| `be8585b` | FASE 28.2 fixes post-test Cowork: slug custom fields, profileLoaded flag (fix BUG 5 /admin directo), encoding â€" → —, migration SQL con RLS policies + recrear FKs a user_profiles |
| `2df6d7e` | FASE 28.3: fix automatización ganada→contrato con canonicalEtapa, logger con serializeError (elimina [object Object]), +11 tests (17→28) |
| `29d2eff` | FASE 28.4: eliminar etapas legacy del form de oportunidades; normalizarEtapa() convierte legacy→canónica al cargar |
| `c9e2594` | CI de GitHub Actions (tsc + test + build) + ESTADO.md |
| `a40634e` | Persistir fix get_user_rol() (master/manager → admin) en migration fase28.2 |
| `6c5d9aa` | Handoff doc `docs/HANDOFF_2026-04-20.md` |
| `9f22a8c` | Informe de diseño `docs/DESIGN_REVIEW_2026-04-20.md` (hallazgos priorizados en 3 sprints) |
| `79a7b6b` | Referenciar informe de diseño desde handoff |

### Integración Datadis + sistema multi-agente (2026-04-22 Cowork)

| Commit | Qué hace |
|--------|----------|
| `29b3e97` | Sprint 2 parte 3: skeleton DatosPage facturas + ESTADO.md |
| `8073c71` | feat(agentes): sistema multi-agente + CLAUDE.md actualizado + Datadis integration (service, hooks, panel, migration) |

### Sprint 2 visual (2026-04-22 autónomo)

| Commit | Qué hace |
|--------|----------|
| `0c6eea2` | Sprint 2 parte 1: toasts faltantes (useUpdateEtapa, useToggleTareaCompletada, useMarcarTodasLeidas) + skeletons en PropuestasEnergiaPage y TrackingPage + badges inline de ActividadesPage y Dashboard → StatusBadge + eliminar interface `Client` legacy (0 consumidores tras DROP) |
| `3422117` | Sprint 2 parte 2: skeletons en AdminPage (3 tabs) + CustomFieldsManager |
| `TBD` | Sprint 2 parte 3: skeleton en DatosPage listado de facturas + actualización ESTADO.md |

### FASE 28 continuación — Sprint 1 A11y + Sprint 2 visual + DROP legacy (2026-04-21)

| Commit | Qué hace |
|--------|----------|
| `5b7d0ff` | Sprint 1 accesibilidad: 5 confirm() nativos → ConfirmDialog, aria-labels + focus-visible, bonus OffersTab con confirmación |
| `b1169f5` | README deploy Edge Function `chat-consultor` (código ya hardeniado: JWT + CORS + validación) |
| `f855890` | +11 tests de hooks (useAutomatizaciones + useCustomFields, total 28→39) + dashboard tokens valere (bg-valere-blue vs bg-blue-500 decorativos) |
| `359a0fb` | BUG 6 (fecha display) + aria-labels contextuales en contactos/contratos/incidencias/renovaciones/documentos + NotificationBell aria-expanded/haspopup |
| `6905bd4` | `docs/LEGACY_TABLES_KILL_LIST.md` + test refuerzo BUG 6 (fecha_actividad ≠ fecha_vencimiento) |
| `d665f24` | Frontend pre-DROP: elimina fallback `supply_points?.clients?.company_name` en TrackingPage y PropuestasEnergiaPage |
| `397fdc1` | **TAREA 2 unificación visual**: rounded-md/lg → rounded-xl en 11 features CRM, H1 homologados al estilo Calc, StatusBadge genérico con 7 variantes semánticas, migración de EstadoBadge + IncidenciasPage + RenovacionesPage |
| `d90a97a` | BUG 7 migration SQL (FK eventos.asignado_a — fallará y se corrige en f0ac5fa) + rounded-md residuales (ExportButton, Sidebar, ConfirmDialog, LoginPage, GlobalSearch, Skeleton, DocumentosTab) |
| `7f38b2b` | Post-DROP: limpiar tipos TS (`src/core/types/database.ts` -145 líneas, 0 refs a clients/supply_points) |
| `f0ac5fa` | **BUG 7 corregido**: la columna real es `usuario_id` (no `asignado_a`). Migration + interface Evento + useEventosEnRango + EventoForm alineados al schema real |

## Fases completadas (27/27 + FASE 28)

*(FASE 20–27 igual que antes)*

### FASE 28 — Personalización ✅

| Eje | Descripción | Estado |
|-----|-------------|--------|
| **28.1** | Refactor 4 features Calculadora → `cups/empresas/facturas` | ✅ |
| **Eje 2** | Dashboards por rol: `useDashboardScope` filtra por `comercial_id`; master/manager ven todo; badge visual en header | ✅ |
| **Eje 1** | Custom fields: admin define campos por entidad (empresa/oportunidad/contacto/contrato); comerciales rellenan en la ficha | ✅ |
| **Eje 3** | Automatizaciones: oportunidad `cerrada_ganada` → auto-borrador contrato; contrato `activo` → auto-tarea seguimiento 30d | ✅ |

## Hardening aplicado (2026-04-20)

| Mejora | Archivo | Estado |
|--------|---------|--------|
| Role gating `/admin` — solo `master`/`manager` | `App.tsx`, `Sidebar.tsx` | ✅ |
| Focus trap en ConfirmDialog (Tab cíclico, restore foco) | `ConfirmDialog.tsx` | ✅ |
| CSP meta tag (default-src 'self', Supabase WSS, Fonts, Gemini) | `index.html` | ✅ |

## Archivos clave nuevos (FASE 28)

| Archivo | Propósito |
|---------|-----------|
| `src/core/hooks/useCustomFields.ts` | CRUD hooks para custom_fields_schema + values |
| `src/core/hooks/useAutomatizaciones.ts` | useCrearContratoDesdeOportunidad + useCrearTareaDesdeContrato |
| `src/core/components/CustomFieldsPanel.tsx` | Render/edit genérico para valores de campos personalizados |
| `src/features/admin/components/CustomFieldsManager.tsx` | UI admin para definir campos personalizados por entidad |
| `src/core/energia/adapters.ts` | cupsToSupplyPoint, supplyPointFormToCupsPayload, empresaToClient |

## Pendientes (NO bloqueantes)

| Tarea | Bloqueador | Urgencia |
|-------|-----------|---------|
| ~~Ejecutar SQL fase28.5 corregido (FK eventos_usuario_id_fkey, BUG 7)~~ | ~~Cowork aplicó 2026-04-21 y verificó end-to-end~~ | ✅ Cerrado |
| ~~Sprint 2 del informe de diseño: toasts + skeletons + badges inline~~ | ~~Aplicado 2026-04-22 (commits 0c6eea2, 3422117)~~ | ✅ Cerrado |
| ~~Policies granulares para `notificaciones`~~ | ~~Migration `fase28.6` preparada~~ | ✅ Ejecutado en Supabase 2026-04-22 |
| ~~Retirar policies duplicadas `cfs_admin/cfv_admin`~~ | ~~Incluido en `fase28.6`~~ | ✅ Ejecutado en Supabase 2026-04-22 |
| ~~Integración Datadis~~ | ~~Migration + service + hooks + panel~~ | ✅ Completo 2026-04-22 |
| Regenerar tipos TypeScript con `supabase gen types` automático | Requiere `SUPABASE_ACCESS_TOKEN` en harness | Baja |
| Deploy Edge Function `chat-consultor` | CLI: `supabase functions deploy chat-consultor` + secrets GEMINI_API_KEY/ALLOWED_ORIGIN | Media |
| ~~Retirar policies duplicadas `cfs_admin/cfv_admin` (duplicado arriba)~~ | Incluido en `fase28.6` | ✅ Código listo |
| Tipos legacy `Client`/`SupplyPoint` en `src/types/database.ts` | Sin consumidores tras el DROP; eliminar en sprint dedicado | Baja |
| Testar CSP en dev (`npm run dev`) | Si algo falla: aflojar `connect-src` o `script-src` | Baja |

## Acciones completadas esta semana (2026-04-20/21)

- ✅ FASE 28 Eje 1 (Custom fields), Eje 2 (Dashboards por rol), Eje 3 (Automatizaciones)
- ✅ Sprint 1 a11y del informe de diseño (ConfirmDialog, aria-labels, focus-visible)
- ✅ TAREA 2 escuela visual rounded-xl unificada + H1 homologados + StatusBadge genérico
- ✅ DROP `clients` + `supply_points` ejecutado por Cowork en Supabase (2026-04-21)
- ✅ Tipos TS limpiados post-DROP (-145 líneas en database.ts)
- ✅ Migration fase28.2: RLS policies para custom_fields + recrear FKs a user_profiles
- ✅ Fix get_user_rol() persistido en migration (master/manager → admin)
- ✅ CI GitHub Actions (tsc + test + build en cada push)
- ⏳ Migration fase28.5: BUG 7 FK eventos.usuario_id — SQL corregido, pendiente ejecución por Cowork

## Re-test Cowork 2026-04-20 (tras aplicar fase28.2 SQL)

| Bloque | Estado |
|--------|--------|
| A — Custom fields (crear/editar/guardar/toggle) | ✅ PASA (tras fix RLS adicional: get_user_rol() mapea master/manager → 'admin') |
| B — Automatización ganada→contrato | ⚠️ Pendiente re-test tras commit 2df6d7e (canonicalEtapa fix) |
| B — Automatización contrato activo→tarea | ⚠️ Pendiente (depende de B.1) |
| C — Dashboard badge vista global/personal | ✅ PASA |
| D — /admin directo URL | ✅ PASA (tras commit be8585b profileLoaded) |
| D — CSP sin errores en consola | ✅ PASA |
| Extra — BUG 2 slug autogenera `sector_empresa` | ✅ PASA |
| Extra — encoding placeholders `—` en lugar de `â€"` | ✅ PASA |

### Fix RLS aplicado por Cowork (PERMANENTE, excelente)

```sql
-- Hace que master/manager hereden permisos de admin en las 20 policies existentes
-- sin tocarlas una a una. También beneficia a policies futuras.
CREATE OR REPLACE FUNCTION public.get_user_rol() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT CASE
    WHEN (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('master', 'manager') THEN 'admin'
    ELSE (SELECT role FROM user_profiles WHERE id = auth.uid())
  END;
$$;
```

## Estado de las tablas

| Tabla | Estado | Notas |
|-------|--------|-------|
| `user_profiles` | ✅ activa | Canónica |
| `empresas` | ✅ activa | |
| `cups` | ✅ activa | |
| `facturas` | ✅ activa | Renombrada de invoice_history |
| `clients` | ❌ DROPPED | Cowork 2026-04-21. Fallback eliminado en frontend previamente. |
| `supply_points` | ❌ DROPPED | Cowork 2026-04-21. Ídem. |
| `proposals` (Calc EN) | ✅ activa | NO dropear: uso activo en AnalisisPage (insert) + PropuestasEnergiaPage/TrackingPage (listados). Vacía en prod hoy. |
| `custom_fields_schema` | ✅ activa | UI implementada en admin |
| `custom_fields_values` | ✅ activa | UI implementada en fichas. Unique index (schema_id, entidad_id) en fase28.2 |
| `contratos` | ✅ activa | |
| `oportunidades` | ✅ activa | |
| `incidencias` | ✅ activa | |
| `renovaciones` | ✅ activa | |
| `actividades` | ✅ activa | |
| `documentos` (tabla + bucket) | ✅ activa | |
| `eventos` | ✅ activa | Columna real: `usuario_id` (no `asignado_a` como asumió el código originalmente). FK pendiente de aplicar con fase28.5. |

## Migrations aplicadas en Supabase

- `20260418_fase20.9_rls_granular.sql`: RLS granular para 11 tablas CRM, helper `is_manager_or_above()`.
- `20260419_fase28_1b_cups_id_fk.sql`: `cups_id` FK en facturas y proposals (FASE 28.1).
- `20260420_fase28_2_fixes_rls_fks.sql`: RLS custom_fields, recrear FKs a user_profiles (16 tablas), mapeo `get_user_rol()` → 'admin' para master/manager. ✅ Cowork aplicó 2026-04-20.
- DROP manual: `clients`, `supply_points` + 2 DELETE previos del registro PAZ Y BIEN test. ✅ Cowork aplicó 2026-04-21. 60 → 52 policies tras CASCADE.
- `20260421_fase28_5_fk_eventos_asignado_a.sql`: FK `eventos.usuario_id` → `user_profiles(id)` (corrigió asunción inicial de `asignado_a`). ✅ Cowork aplicó 2026-04-21. BUG 7 cerrado end-to-end (verificado `/calendario` sin PGRST200).
- `20260422_fase28_6_rls_policies_cleanup.sql`: policies granulares para `notificaciones` + limpieza de policies duplicadas. ✅ Ejecutado en Supabase 2026-04-22.
- `20260422_datadis_integracion.sql`: columnas datadis_* en cups + tabla datadis_tokens + tabla datadis_consumptions + RLS granular. ✅ Ejecutado en Supabase 2026-04-22.

## Cómo arrancar una nueva sesión

### Claude Code (CLI/Desktop)
```bash
cd ~/valere-v2 && claude -c
```

### Claude Cowork (Web — claude.ai/code)
```
Trabajas en valere-v2, rama claude/valere-crm-architecture-2vvEV.
git pull origin claude/valere-crm-architecture-2vvEV
cat CLAUDE.md docs/ESTADO.md
ls .cowork/outbox/ .cowork/inbox/
git log --oneline -10
```


## Rama de desarrollo

`claude/valere-crm-architecture-2vvEV` — **88 commits ahead de `main`**.

## Resumen ejecutivo

CRM + Calculadora fusionados bajo arquitectura feature-based (`src/features/`). **27 de 27 fases del roadmap completadas** (código + SQL) + 2 mejoras de plataforma (code-splitting, Vitest). TSC 0 errores · 17/17 tests · build OK (253 kB main).

**Audit completo 2026-04-19 (3 agentes):** Cowork (backend/DB) + Claude Code (frontend/UX/security) + Security Reviewer.
- Resultado: ✅ 0 P0 pendientes · ✅ 0 P1 pendientes · 2 P2 (info)
- Consolidado en: `docs/AUDIT_2026-04-19.md` (commit 3fa667c)

## Fases completadas (27/27 + 2 mejoras plataforma)

| FASE | Descripción | Tipo |
|---|---|---|
| 20.0–20.6 | Fusión CRM+Calc, migrar módulos, unificar auth, eliminar legacy | Arquitectura |
| 20.7.a | users_profile merge → no-op (ya era user_profiles) | SQL ✅ |
| 20.7.b | clients → empresas (1 fila: PAZ Y BIEN 5002AP) | SQL ✅ |
| 20.7.c | supply_points → cups (1 fila migrada, contrato_id nullable) | SQL ✅ |
| 20.7.d | invoice_history → facturas (rename) | SQL ✅ |
| 20.8 | Edge Function chat-consultor + refactor ChatIAPanel (API key fuera del cliente) | Feature + SQL ✅ |
| 20.9 | RLS granular multitenant (SQL creado, no aplicado) | SQL ✅ |
| 20.10 | Audit: ediciones, autoprefixer, shadcn config | Limpieza |
| 21.a | Pipeline energético: Kanban 8 etapas, ahorro anual, probabilidades | Feature + SQL ✅ |
| 21.b | Alertas vencimiento contratos: semáforo + widget dashboard | Feature + SQL ✅ |
| 21.c | Timeline actividades en fichas empresa y contrato | Feature |
| 22 | Incidencias: tabla + listado + filtros + KPI | Feature + SQL ✅ |
| 23 | Renovaciones: tabla + listado + filtros + KPI | Feature + SQL ✅ |
| 24 | Documentos/Storage: tabla + upload/download + DocumentosTab | Feature + SQL ✅ |
| 25 | Notificaciones in-app con badge en header | Feature |
| 26.a | Exportación CSV en todos los listados | Feature |
| 26.b | Informes predefinidos (comercial mensual + cartera activa) | Feature |
| 27 | Calendario/Agenda: tabla eventos + vista mes + CRUD | Feature + SQL ✅ |
| Plataforma | Code-splitting React.lazy + Vitest + 17 tests | Calidad |
| Audit P0/P1 | useAuth StrictMode + signed URLs + navegación + UX | Fix |

## Fixes aplicados en audit 2026-04-19

| Fix | Estado |
|-----|--------|
| P0.1: Bucket `documentos` creado (50MB, private, 4 policies) | ✅ HECHO |
| P0.2: RLS incidencias+renovaciones `public→authenticated` | ✅ HECHO |
| P1.1: 10 tablas con trigger `updated_at` aplicado | ✅ HECHO |
| P1.2: 3 índices creados (eventos, notificaciones, oportunidades) | ✅ HECHO |
| P1.3: cups RLS policy NULL support | ✅ HECHO |
| Security: Edge Function JWT+CORS+rate-limit hardening | ✅ HECHO |
| Security: sanitize file extension upload | ✅ HECHO |
| Security: VITE_GEMINI_API_KEY eliminado de .env.example | ✅ HECHO |
| 3 console.error → logError | ✅ HECHO |

## Tareas pendientes antes de FASE 28 personalización

| Tarea | Bloqueador | Urgencia |
|-------|-----------|---------|
| Deploy Edge Function chat-consultor | CLI: `supabase functions deploy chat-consultor` | Alta |
| Secrets Supabase | `supabase secrets set GEMINI_API_KEY=<valor> ALLOWED_ORIGIN=<url>` | Alta |
| **FASE 28.1a** — Refactor 4 features Calculadora → empresas/cups | Claude Code (próxima sesión) | Alta |
| **FASE 28.1b** — Migración datos + ACK DROP legacy | Cowork + Claude Code + ACK cruzado | Media |
| Regenerar tipos TypeScript | `npx supabase gen types typescript` | Baja |

## Próximas fases

| FASE | Descripción | ETA |
|------|-------------|-----|
| **28.1a** | Refactor Calculadora: DatosPage, AnalisisPage, TrackingPage, PropuestasEnergiaPage → `empresas/cups` | Próxima sesión Claude Code |
| **28.1b** | Migración datos residuales clients→empresas + ACK DROP + DROP legacy | Sesión Cowork siguiente |
| **28** | Personalización: custom fields, dashboards por rol, automatizaciones flujo | Post 28.1 |

## Ejes de personalización FASE 28 (priorizados por valor)

| Eje | Descripción | Complejidad |
|-----|-------------|-------------|
| Custom fields en empresas + oportunidades | Campos propios por consultoría (tarifa habitual, clasificación, próximo contacto...) | Media — tabla `custom_fields_schema` ya existe |
| Dashboards por rol | Comercial: sus oportunidades + pipeline + vencimientos. Jefe equipo: equipo. Admin: todo | Baja-Media — widgets ya existen, filtrar por rol |
| Automatizaciones de flujo | Oportunidad ganada→contrato automático. Contrato firmado→actividad 30d. Alerta 60d vencimiento | Media-Alta — triggers SQL o tabla de reglas |

## Estado de las tablas

| Tabla | Estado | Filas | Notas |
|-------|--------|-------|-------|
| `user_profiles` | ✅ activa | 1 | Nombre correcto |
| `empresas` | ✅ activa | 1 | PAZ Y BIEN 5002AP migrada |
| `clients` | ⚠️ legacy | 1 | DROP bloqueado — 4 features Calculadora leen de ella (FASE 28.1) |
| `cups` | ✅ activa | 1 | CUPS migrado; contrato_id nullable; policy NULL fix ✅ |
| `supply_points` | ⚠️ legacy | 1 | DROP bloqueado — 4 features Calculadora leen de ella (FASE 28.1) |
| `facturas` | ✅ activa | 1 | Renombrada desde invoice_history |
| `invoice_history` | ❌ eliminada | - | Renombrada a facturas |
| `oportunidades` | ✅ activa | 1 | Pipeline energético |
| `eventos` | ✅ activa | 0 | FASE 27 — sin datos aún |
| `incidencias` | ✅ activa | ? | RLS fixed ✅ |
| `renovaciones` | ✅ activa | ? | RLS fixed ✅ |
| `documentos` (tabla) | ✅ activa | 0 | FASE 24 |
| `documentos` (bucket) | ✅ activa | 0 | Creado 2026-04-19, 4 policies |

## Archivos clave

| Archivo | Propósito |
|---|---|
| `CLAUDE.md` | Contexto del proyecto — ambos Claudes lo leen al arrancar |
| `docs/ROADMAP_FUSION.md` | Roadmap detallado con checklists |
| `docs/ESTADO.md` | **Este fichero** — estado en tiempo real |
| `docs/AUDIT_2026-04-19.md` | Audit completo (3 agentes) — 0 P0, 0 P1 pendientes |
| `docs/BACKUP_PROTOCOL.md` | Protocolo de backup + prompt inicio sesión + reglas críticas |
| `.cowork/inbox/2026-04-19T24-00-00-bucket-documentos-creado.md` | Confirmación P0.1 cerrado |

## Cómo arrancar una nueva sesión

### Claude Cowork (Web — claude.ai/code)
```
Trabajas en valere-v2, rama claude/valere-crm-architecture-2vvEV.
Ejecuta:
git pull origin claude/valere-crm-architecture-2vvEV
cat CLAUDE.md docs/ESTADO.md
ls .cowork/outbox/ .cowork/inbox/
git log --oneline -10
Lee todo y dime dónde nos quedamos. Continúa desde ahí.
```

### Claude Code (CLI/Desktop)
```bash
cd ~/valere-v2 && claude -c
```

