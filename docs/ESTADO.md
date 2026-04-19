# Estado actual del proyecto Valere v2
> Última actualización: 2026-04-19 por Claude Code (sincronización con Cowork)

## Rama de desarrollo
`claude/valere-crm-architecture-2vvEV` — 74 commits ahead de `main`.

## Resumen ejecutivo
CRM + Calculadora fusionados bajo arquitectura feature-based (`src/features/`). **26 de 26 fases del roadmap completadas** (código + SQL). 2 fases tienen deploy/aplicación pendiente de acceso externo (Supabase CLI, EXPLAIN ANALYZE en producción). TSC 0 errores, build OK.

## Fases completadas (26/26)

| FASE | Descripción | Tipo |
|---|---|---|
| 20.0–20.6 | Fusión CRM+Calc, migrar módulos, unificar auth, eliminar legacy | Arquitectura |
| 20.7.a | users_profile merge → no-op (ya era user_profiles) | SQL ✅ |
| 20.7.b | clients → empresas (1 fila: PAZ Y BIEN 5002AP) | SQL ✅ |
| 20.7.c | supply_points → cups (1 fila migrada, contrato_id nullable) | SQL ✅ |
| 20.7.d | invoice_history → facturas (rename) | SQL ✅ |
| 20.8 | Edge Function chat-consultor (archivo creado) | SQL ✅ |
| 20.9 | RLS granular multitenant (SQL creado, no aplicado) | SQL ✅ |
| 20.10 | Pendientes audit: ediciones, autoprefixer, shadcn config | Limpieza |
| 21.a | Pipeline energético: Kanban 8 etapas, ahorro anual, probabilidades | Feature + SQL ✅ |
| 21.b | Alertas vencimiento contratos: semáforo + widget dashboard | Feature + SQL ✅ |
| 21.c | Timeline actividades en fichas empresa y contrato | Feature |
| 22 | Incidencias: tabla + listado + filtros + KPI | Feature + SQL ✅ |
| 23 | Renovaciones: tabla + listado + filtros + KPI | Feature + SQL ✅ |
| 24 | Documentos/Storage: tabla + upload/download + DocumentosTab | Feature + SQL ✅ |
| 25 | Notificaciones in-app con badge en header | Feature |
| 26.a | Exportación CSV en todos los listados | Feature |
| 26.b | Informes predefinidos (comercial mensual + cartera activa) | Feature |

## Tareas de deploy pendientes (requieren acceso externo)

| Tarea | Bloqueador |
|---|---|
| Deploy Edge Function chat-consultor | Supabase CLI + `supabase secrets set GEMINI_API_KEY` |
| Aplicar RLS granular | EXPLAIN ANALYZE antes de activar en producción |
| Crear bucket Storage `documentos` | Supabase Dashboard |
| DROP tablas legacy (clients, supply_points) | Confirmación manual |
| Regenerar tipos TypeScript | `npx supabase gen types typescript` |

## Estado de las tablas (post-sesiones cowork)

| Tabla | Estado | Filas | Notas |
|-------|--------|-------|-------|
| `user_profiles` | ✅ activa | 1 | Nombre correcto (no users_profile) |
| `empresas` | ✅ activa | 1 | PAZ Y BIEN 5002AP migrada desde clients |
| `clients` | ⚠️ legacy | 1 | Pendiente DROP en futura iteración |
| `cups` | ✅ activa | 1 | CUPS migrado; contrato_id ahora nullable |
| `supply_points` | ⚠️ legacy | 1 | Pendiente DROP en futura iteración |
| `facturas` | ✅ activa | 1 | Renombrada desde invoice_history |
| `invoice_history` | ❌ eliminada | - | Renombrada a facturas |
| `oportunidades` | ✅ activa | 1 | Pipeline energético con ahorro_anual_estimado y contacto_id |

## Tareas manuales pendientes
- [ ] Crear bucket Storage `documentos` en Supabase Dashboard (public=false, 50MB)
- [ ] `supabase secrets set GEMINI_API_KEY=<valor>`
- [ ] `supabase functions deploy chat-consultor`
- [ ] Refactorizar `ChatIAPanel.tsx` → `supabase.functions.invoke('chat-consultor')`
- [ ] EXPLAIN ANALYZE antes de aplicar FASE 20.9 RLS en producción
- [ ] Confirmar DROP de `clients` y `supply_points` (datos ya migrados)
- [ ] `npx supabase gen types typescript` para regenerar tipos TS

## Archivos clave

| Archivo | Propósito |
|---|---|
| `CLAUDE.md` | Contexto del proyecto — ambos Claudes lo leen al arrancar |
| `docs/ROADMAP_FUSION.md` | Roadmap detallado con checklists |
| `docs/ESTADO.md` | **Este fichero** — estado en tiempo real |
| `docs/BACKUP_PROTOCOL.md` | Protocolo de backup + prompt inicio sesión + reglas críticas |
| `docs/SESIONES/2026-04-19-cowork-resumen.md` | Memoria persistente de sesiones Cowork |
| `.cowork/outbox/` | Mensajes Claude Code → Cowork |
| `.cowork/inbox/` | Mensajes Cowork → Claude Code |
| `.cowork/protocol.md` | Protocolo del bus de mensajes |

## Cómo arrancar una nueva sesión

### Claude Code (CLI/Desktop)
```bash
cd ~/valere-v2 && claude -c
```

### Claude Cowork (Web — claude.ai/code)
Pegar al inicio de la conversación:
```
Trabajas en valere-v2, rama claude/valere-crm-architecture-2vvEV.
Ejecuta: git pull origin claude/valere-crm-architecture-2vvEV
cat CLAUDE.md docs/ESTADO.md docs/SESIONES/2026-04-19-cowork-resumen.md
ls .cowork/outbox/ .cowork/inbox/
git log --oneline -10
Lee todo y dime dónde nos quedamos. Continúa desde ahí.
```
