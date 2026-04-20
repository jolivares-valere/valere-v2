# Estado actual del proyecto Valere v2

> Última actualización: 2026-04-20 por Claude Code (FASE 28 completa — Eje 1, 2, 3 + hardening)

## Rama de desarrollo

`claude/valere-crm-architecture-2vvEV` — PR #1 abierto → main.

## Resumen ejecutivo

CRM + Calculadora fusionados bajo arquitectura feature-based (`src/features/`). **27 fases del roadmap completadas + FASE 28 completada (3 ejes)**. TSC 0 errores · 17/17 tests · build OK.

**Audit completo 2026-04-19:** 0 P0 pendientes · 0 P1 pendientes. Consolidado en `docs/AUDIT_2026-04-19.md`.

## Commits FASE 28 (esta sesión 2026-04-20)

| Commit | Qué hace |
|--------|----------|
| `a29ac79` | FASE 28.1 — Refactor 4 features Calculadora → cups/empresas/facturas (adapter pattern) |
| `4aaf82f` | FASE 28 Eje 2 — Dashboards por rol (useDashboardScope + badge visual) |
| `f28d9a3` | FASE 28 Eje 1 — Custom fields (useCustomFields, CustomFieldsPanel, CustomFieldsManager, tab "campos" en empresas y oportunidades) |
| `abff85a` | FASE 28 Eje 3 — Automatizaciones (oportunidad ganada → borrador contrato; contrato activado → tarea 30d) |
| `f51bfc8` | Hardening: role gating /admin, focus trap ConfirmDialog, CSP meta tag |

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
| DROP `clients` + `supply_points` en Supabase | Cowork verifica `facturas.cups_id IS NULL = 0` primero | Baja |
| Eliminar fallback `supply_points` en `ProposalWithDetails` | Tras DROP confirmado | Baja |
| Regenerar tipos TypeScript (`supabase gen types`) | Requiere `SUPABASE_ACCESS_TOKEN` en harness | Baja |
| Deploy Edge Function `chat-consultor` | CLI: `supabase functions deploy chat-consultor` | Media |
| Secrets Supabase (GEMINI_API_KEY, ALLOWED_ORIGIN) | Acceso al proyecto Supabase | Media |
| Testar CSP en dev (`npm run dev`) | Si algo falla: aflojar `connect-src` o `script-src` | Baja |

## Estado de las tablas

| Tabla | Estado | Notas |
|-------|--------|-------|
| `user_profiles` | ✅ activa | Canónica |
| `empresas` | ✅ activa | |
| `cups` | ✅ activa | |
| `facturas` | ✅ activa | Renombrada de invoice_history |
| `clients` | ⚠️ legacy | DROP pendiente de confirmación Cowork |
| `supply_points` | ⚠️ legacy | DROP pendiente de confirmación Cowork |
| `custom_fields_schema` | ✅ activa | UI implementada en admin |
| `custom_fields_values` | ✅ activa | UI implementada en fichas |
| `contratos` | ✅ activa | |
| `oportunidades` | ✅ activa | |
| `incidencias` | ✅ activa | |
| `renovaciones` | ✅ activa | |
| `actividades` | ✅ activa | |
| `documentos` (tabla + bucket) | ✅ activa | |
| `eventos` | ✅ activa | |

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
