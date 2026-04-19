# Estado actual del proyecto Valere v2

> Última actualización: 2026-04-19 por Cowork (bucket documentos + FASE 28.1 decidida)

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
