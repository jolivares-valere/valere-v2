# CLAUDE.md — Valere v2 (CRM + Calculadora energética)
> Este archivo es leído automáticamente por Claude Code al inicio de cada sesión.
> **Actualízalo siempre antes de cerrar una sesión de trabajo.**

---

## Identidad del proyecto

- **Producto**: CRM unificado con calculadora energética para VALERE CONSULTORES
- **Propietario**: Juan Olivares (jolivares@valereconsultores.com)
- **Repo**: https://github.com/jolivares-valere/valere-v2
- **Rama de desarrollo activa**: ver sección "Git" más abajo
- **Supabase proyecto**: PROYECTO VALERE — ref `gtphkowfcuiqbvfkwjxb`
- **URL Supabase**: https://gtphkowfcuiqbvfkwjxb.supabase.co

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite 6 + TypeScript 5 + Tailwind 4 |
| Backend | Supabase (Postgres + Auth + Storage + RLS) |
| Data fetching | React Query |
| Deploy | Vercel (conectado al repo GitHub) |
| Tests | 39 tests + CI activo (GitHub Actions) |

---

## Estado actual del proyecto

### Fases COMPLETADAS (código en PR #1, pendiente merge a main)

| Fase | Descripción |
|---|---|
| 20.0–20.10 | Fusión CRM + Calculadora, arquitectura feature-based |
| 21.a–21.c | Pipeline energético, alertas vencimiento, timelines |
| 22 | Incidencias |
| 23 | Renovaciones |
| 24 | Documentos + Storage |
| 25 | Notificaciones |
| 26 | Exportación CSV + Informes |
| 27 | Calendario |
| 28 ejes 1–3 | Custom fields, Dashboards por rol, Automatizaciones |
| 28.1–28.5 | Hardening SQL, unificación visual, accesibilidad, DROP legacy |

### Fase EN CURSO

**28.6 — Limpieza y endurecimiento RLS granular**
- Script SQL corregido: `supabase/fase-28.6-rls-granular.sql`
- Estado: **PENDIENTE DE EJECUTAR en Supabase SQL Editor**
- El script es idempotente y seguro (CREATE antes de DROP)

### Pendiente tras 28.6

1. **Merge PR #1 a main** (squash & merge desde GitHub UI)
   - PR: https://github.com/jolivares-valere/valere-v2/pull/1
   - Mensaje de merge preparado en `docs/ESTADO.md`
2. **Tag v2.0.0** en main tras el merge
3. **Vercel**: ya configurado, despliega automático al mergear a main
   - Env vars necesarias: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GEMINI_API_KEY`

---

## Estado de la base de datos (Supabase real)

### Helper de roles existente
```sql
public.get_user_rol()  -- devuelve TEXT con el rol del usuario
-- Roles posibles: 'master', 'admin', 'manager', 'jefe_equipo', 'comercial'
```

### Helper a crear (script 28.6)
```sql
public.is_manager_or_above()  -- wrapper SECURITY DEFINER sobre get_user_rol()
-- Devuelve TRUE si rol IN ('admin','master','manager')
```

### Policies RLS actuales (ANTES de ejecutar 28.6)
| Tabla | Policy | Tipo | Condición |
|---|---|---|---|
| notificaciones | n_own | ALL | `usuario_id = auth.uid() OR get_user_rol() = 'admin'` |
| custom_fields_schema | cfs_admin | ALL | `get_user_rol() = ANY(ARRAY['admin','master','manager'])` |
| custom_fields_schema | cfs_read | SELECT | `true` |
| custom_fields_values | cfv_all | ALL | `get_user_rol() = ANY(ARRAY['admin','master','manager','jefe_equipo','comercial'])` |

### Policies RLS DESPUÉS de ejecutar 28.6 (resultado esperado)
| Tabla | Policies creadas |
|---|---|
| notificaciones | notif_select, notif_insert, notif_update, notif_delete |
| custom_fields_schema | cfs_select_authenticated, cfs_insert_authenticated, cfs_update_authenticated, cfs_delete_authenticated |
| custom_fields_values | cfv_select_authenticated, cfv_insert_authenticated, cfv_update_authenticated, cfv_delete_authenticated |

---

## Git

### Ramas activas
| Rama | Propósito | Estado |
|---|---|---|
| `main` | Base estable | Tiene código v2 inicial (pre-fase 20) |
| `claude/valere-crm-architecture-2vvEV` | Fases 20–28.5 completas | PR #1 abierto, pendiente merge |
| `claude/resume-valere-v2-pzzQ7` | Fase 28.6 SQL + .gitignore | PR #3 abierto (draft) |

### PRs abiertos
- **PR #1**: `feat: Valere v2 — CRM + Calculadora unificados` → merge a main con squash
- **PR #3**: `sql: FASE 28.6 — RLS granular corregido` → draft, para referencia

### Próximo commit esperado
Tras merge de PR #1 y tag v2.0.0, crear rama `release/v2.0.0` o trabajar directo en main.

---

## Estructura de archivos clave

```
valere-v2/
├── CLAUDE.md                          ← este archivo (memoria de sesión)
├── docs/
│   └── ESTADO.md                      ← historial detallado de fases
├── supabase/
│   └── fase-28.6-rls-granular.sql     ← migración pendiente de ejecutar
├── supabase-migration.sql             ← migración inicial (fases 1-19)
├── src/
│   ├── types/database.ts              ← tipos centralizados (source of truth)
│   ├── lib/
│   │   ├── supabase.ts                ← cliente Supabase
│   │   ├── calculator.ts              ← motor de cálculo energético
│   │   ├── tariffs.ts                 ← tarifas reguladas BOE
│   │   └── utils.ts                   ← helpers, CSV, formateo
│   ├── hooks/
│   │   ├── useAuth.tsx                ← autenticación + roles
│   │   └── useSupabaseQuery.ts        ← fetch genérico reutilizable
│   ├── components/
│   │   ├── Layout.tsx                 ← sidebar + header
│   │   ├── LoginPage.tsx
│   │   ├── ConsultantChat.tsx         ← chat IA con Gemini
│   │   └── ui/                        ← componentes shadcn/ui
│   └── modules/
│       ├── Dashboard.tsx
│       ├── Clients.tsx
│       ├── DataCapture.tsx
│       ├── Analysis.tsx
│       ├── Proposals.tsx
│       ├── Tracking.tsx
│       └── AdminPanel.tsx
└── vercel.json
```

---

## Variables de entorno necesarias

```env
VITE_SUPABASE_URL=https://gtphkowfcuiqbvfkwjxb.supabase.co
VITE_SUPABASE_ANON_KEY=<copiar de Supabase → Settings → API → anon public>
VITE_GEMINI_API_KEY=AIzaSyDqjcyy328DMa9-5mPoohJZPqvF4JfjYuE
```

---

## Comandos frecuentes

```bash
npm run dev          # arrancar dev server (localhost:3000)
npm run build        # build de producción (tsc -b && vite build)
npm test             # 39 tests
npx tsc --noEmit     # verificar tipos sin compilar
```

---

## Instrucción para Claude al inicio de sesión

Cuando arranques una sesión nueva en este proyecto:
1. Lee este archivo completo
2. Lee `docs/ESTADO.md` para el historial detallado
3. Ejecuta `git log --oneline -5` para ver los últimos commits
4. Pregunta a Juan: "¿Continúo desde [último estado] o hay cambios nuevos?"
5. NO ejecutes migraciones SQL sin confirmación explícita de Juan
6. Rama de trabajo activa: confirmar con `git branch --show-current`
