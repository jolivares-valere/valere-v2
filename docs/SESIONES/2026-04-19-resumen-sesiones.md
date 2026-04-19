# Resumen de sesiones Valere v2 — Abril 2026

## Sesión 1: 2026-04-17 (Claude Code)
### Fases: 13B → 19
- Construcción completa del CRM: empresas, contactos, contratos, oportunidades
  (Kanban), actividades, dashboard, importador CSV, búsqueda global.
- Arquitectura feature-based en `src/features/`.
- PR #1 draft abierto contra `main`.

---

## Sesión 2: 2026-04-18 (Claude Code — sesión larga)
### Fases: 20.0 → 20.6, 20.10, 21.b, 22, 23, 24, 25, 26.a, 26.b

**Fusión CRM + Calculadora** (20.0–20.6):
- CLAUDE.md y ROADMAP creados.
- Merge de `main` (Calculadora de Cowork) en branch CRM.
- Unificación de `useAuth` → `user_profiles` canónica.
- Migración `src/lib/` → `src/core/energia/` y `src/core/utils/`.
- Migración de 7 módulos Calc a `src/features/` (admin, datos, analisis,
  propuestas-energia, tracking, chat-ia, dashboard fusionado).
- Eliminación de `src/modules/`, `src/hooks/`, `src/lib/`.

**Nuevas features** (21–26):
- 21.b: Alertas de vencimiento de contratos con semáforo y widget dashboard.
  Vista SQL `contratos_por_vencer` + función `get_resumen_vencimientos`.
- 22: Módulo de Incidencias (tabla SQL, enums, trigger, RLS, vista KPI,
  listado con filtros, formulario, badges, export CSV).
- 23: Módulo de Renovaciones (misma estructura que 22).
- 24: Módulo de Documentos (tabla SQL, API Storage upload/download,
  componente DocumentosTab reutilizable).
- 25: Notificaciones in-app con badge en header.
- 26.a: Exportación CSV/Excel en todos los listados.
- 26.b: Informes predefinidos (comercial mensual + cartera activa).
- 20.10: Limpieza audit (autoprefixer, edición ofertas/facturas/puntos).

**Comunicación con Cowork**:
- Creado protocolo `.cowork/` con bus de mensajes vía git.
- Creado agente puente `.claude/agents/cowork-bridge.md`.
- Primer prompt exitoso: Cowork abrió PR #2 como Draft.
- Segundo prompt: aplicar migraciones SQL FASE 22/23/24.

**Fix técnico separado**:
- `useAuth` StrictMode race condition: inflight Map deduplication.
  Branch `claude/fix-useauth-strictmode-X1P82`, merge conflict resuelto.

---

## Sesión 3: 2026-04-18 noche (Cowork — claude.ai web)
### Aplicación SQL FASE 22/23/24

- ✅ Tabla `incidencias` + 3 enums + 6 índices + trigger + RLS + `v_incidencias_kpi`.
- ✅ Tabla `renovaciones` + 2 enums + 5 índices + trigger + RLS + `v_renovaciones_kpi`.
- ✅ Tabla `documentos` + CHECK + 2 índices + RLS.
- Bucket Storage `documentos` pendiente (manual en dashboard).
- ACK en `.cowork/inbox/2026-04-18T16-00-00-migrations-applied-fase22-23-24.md`.

---

## Sesión 4: 2026-04-19 mañana (Claude Code — sesión actual)
### Fases: 21.a frontend, 21.c, 24 extensión + prompts nocturnos

**FASE 21.a — Pipeline energético** (frontend):
- Kanban con 8 etapas energéticas reales + probabilidades por columna.
- Mapeo legacy→canónica para oportunidades existentes.
- Campo `ahorro_anual_estimado` en tipo, form, card, column y export.
- `useUpdateEtapa` sincroniza probabilidad al mover.
- SQL migration file creado (`20260418_fase21a_pipeline_energetico.sql`).

**FASE 21.c** — confirmado que ActividadTimeline ya estaba integrado.

**FASE 24 extensión** — DocumentosTab integrado en EmpresaDetailPage (tab) y
ContratoDetailPage (sección).

**Prompts para Cowork** (trabajo nocturno autónomo):
- 20.7: Unificar schema (4 sub-migraciones).
- 20.8: Edge Function chat-consultor.
- 20.9: RLS granular multitenant.
- 21.a: SQL pipeline energético.

---

## Sesión 5: 2026-04-19 noche (Cowork — claude.ai web)
### Trabajo nocturno autónomo

- ✅ 20.7.a: `users_profile` → `user_profiles` (no-op, ya consolidado).
- ✅ 20.7.b: `clients` → `empresas` (1 fila migrada: PAZ Y BIEN).
- ❌ 20.7.c: `supply_points` → `cups` BLOQUEADO (`contrato_id NOT NULL`).
- ✅ 20.7.d: `invoice_history` → `facturas` (renombrada OK).
- ✅ 20.9: SQL RLS granular creado (11 tablas), NO aplicado como se pidió.
- ✅ 20.8: Edge Function `chat-consultor/index.ts` creada, deploy pendiente.
- ✅ 21.a SQL: migración aplicada en Supabase.
- ACK en `.cowork/inbox/2026-04-19T00-00-00-ack-tareas-nocturnas.md`.

---

## Decisiones arquitectónicas clave

1. **Feature-based en `src/features/`** — todo el código organizado por dominio.
2. **`user_profiles` canónica** (plural) — `users_profile` (singular) eliminada.
3. **`Database = any`** temporal hasta regenerar tipos Supabase.
4. **Cast `as never`** en queries a tablas no tipadas — patrón temporal.
5. **Bus `.cowork/`** para comunicación asíncrona entre agentes Claude.
6. **Merge > rebase** para evitar force-push.
7. **Soft delete** (`deleted_at`) en todas las tablas del CRM.
8. **RLS permisivo** actual (all authenticated) → pendiente 20.9 granular.

## Tecnologías

React 19 · TypeScript 5 · Vite 6 · Tailwind 4 · Supabase · TanStack Query 5 ·
React Hook Form 7 · Zod · @dnd-kit · Framer Motion · Sonner · Recharts ·
Lucide · @google/genai (pendiente mover a Edge Function).
