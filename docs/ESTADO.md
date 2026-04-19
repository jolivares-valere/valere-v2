# Estado actual del proyecto Valere v2

> Última actualización: 2026-04-19 por Claude Code (sesión `session_01UX5paRru1AQDLFJykrc8Gt`)

## Rama de desarrollo

`claude/valere-crm-architecture-2vvEV` — 68 commits ahead de `main`.

## Resumen ejecutivo

CRM + Calculadora fusionados bajo arquitectura feature-based (`src/features/`).
22 de 26 fases del roadmap completadas. Las 4 restantes dependen de acceso
externo (Supabase CLI, dashboard, EXPLAIN ANALYZE en producción).

## Fases completadas

| FASE | Descripción | Tipo |
|---|---|---|
| 20.0–20.6 | Fusión CRM+Calc, migrar módulos, unificar auth, eliminar legacy | Arquitectura |
| 20.10 | Pendientes audit: ediciones, autoprefixer, shadcn config | Limpieza |
| 21.a | Pipeline energético: Kanban 8 etapas, ahorro anual, probabilidades | Feature + SQL ✅ |
| 21.b | Alertas vencimiento contratos: semáforo + widget dashboard | Feature + SQL ✅ |
| 21.c | Timeline actividades en fichas empresa y contrato | Feature |
| 22 | Incidencias: tabla + listado + filtros + KPI | Feature + SQL ✅ |
| 23 | Renovaciones: tabla + listado + filtros + KPI | Feature + SQL ✅ |
| 24 | Documentos/Storage: tabla + upload/download + DocumentosTab en fichas | Feature + SQL ✅ |
| 25 | Notificaciones in-app con badge en header | Feature |
| 26.a | Exportación CSV en todos los listados | Feature |
| 26.b | Informes predefinidos (comercial mensual + cartera activa) | Feature |

## Fases pendientes

| FASE | Descripción | Bloqueador |
|---|---|---|
| 20.7 | Unificar schema: `cups.contrato_id` nullable para migrar `supply_points` | Claude Code: SQL + commit |
| 20.8 | Edge Function chat-consultor | Supabase CLI deploy + secret GEMINI_API_KEY |
| 20.9 | RLS granular multitenant | EXPLAIN ANALYZE antes de aplicar en producción |
| 20.7c | Migrar `supply_points` → `cups` | Depende de 20.7 nullable fix |

## Trabajo nocturno de Cowork (2026-04-19)

- ✅ 20.7.a: `users_profile` → `user_profiles` (no-op, ya estaba)
- ✅ 20.7.b: `clients` → `empresas` (1 fila migrada: PAZ Y BIEN)
- ❌ 20.7.c: `supply_points` → `cups` (bloqueado: `contrato_id NOT NULL`)
- ✅ 20.7.d: `invoice_history` → `facturas` (renombrada OK)
- ✅ 20.9: SQL creado, NO aplicado (como se pidió)
- ✅ 20.8: Edge Function creada, deploy pendiente
- ✅ 21.a SQL: migración aplicada en Supabase

## Tareas manuales pendientes

- [ ] Crear bucket Storage `documentos` en Supabase Dashboard (public=false, 50MB)
- [ ] `supabase secrets set GEMINI_API_KEY=<valor>`
- [ ] `supabase functions deploy chat-consultor`
- [ ] Refactorizar `ChatIAPanel.tsx` → `supabase.functions.invoke('chat-consultor')`

## Archivos clave

| Archivo | Propósito |
|---|---|
| `CLAUDE.md` | Contexto del proyecto — ambos Claudes lo leen al arrancar |
| `docs/ROADMAP_FUSION.md` | Roadmap detallado con checklists |
| `docs/ESTADO.md` | **Este fichero** — estado en tiempo real |
| `.cowork/outbox/` | Mensajes Claude Code → Cowork |
| `.cowork/inbox/` | Mensajes Cowork → Claude Code |
| `.cowork/protocol.md` | Protocolo del bus de mensajes |

## Cómo arrancar una nueva sesión

### Claude Code (CLI/Desktop)
```bash
cd ~/valere-v2 && claude -c
# O sesión nueva con contexto:
# "Lee CLAUDE.md, docs/ESTADO.md, docs/ROADMAP_FUSION.md y git log --oneline -10"
```

### Claude Cowork (Web — claude.ai/code)
Pegar al inicio de la conversación:
```
Trabajas en valere-v2, rama claude/valere-crm-architecture-2vvEV.
Ejecuta:
  git pull origin claude/valere-crm-architecture-2vvEV
  cat CLAUDE.md docs/ESTADO.md docs/ROADMAP_FUSION.md
  ls .cowork/outbox/ .cowork/inbox/
  git log --oneline -10
Lee todo y dime dónde nos quedamos. Continúa desde ahí.
```

## Conversaciones guardadas

- `docs/SESIONES/2026-04-18-claude-code-sesion-anterior.jsonl` — sesión larga (FASE 22-24)
- `docs/SESIONES/2026-04-19-claude-code-sesion-actual.jsonl` — sesión actual
- `docs/SESIONES/2026-04-19-resumen-sesiones.md` — resumen legible
- Conversación de Cowork web: ver prompt de exportación más abajo
