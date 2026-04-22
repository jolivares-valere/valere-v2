# Valere v2

CRM + Calculadora de ofertas energéticas para Valere Consultores (consultora energética española).

## Qué es

Una sola aplicación web que cubre dos flujos que antes vivían separados:

- **CRM comercial**: empresas, contactos, contratos, oportunidades (pipeline kanban), actividades, incidencias, renovaciones, documentos, calendario, informes, importador CSV, búsqueda global.
- **Calculadora energética**: captura de facturas, análisis comparativo de tarifas vs ofertas de comercializadoras, generación de propuestas, seguimiento, chat IA (Gemini via Edge Function).

Ambos bloques comparten usuarios, roles y entidad "empresa". Personalización por consultoría vía custom fields (empresas y oportunidades) y automatizaciones (oportunidad ganada → borrador de contrato; contrato activado → tarea de seguimiento a 30 días).

## Tech stack

- **Frontend**: React 19 + TypeScript 5 + Vite 6
- **UI**: Tailwind CSS 4 + shadcn/ui primitives + Framer Motion + sonner (toasts) + recharts
- **Estado/server**: @tanstack/react-query 5 + Zustand (auth)
- **Formularios**: react-hook-form + zod
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions)
- **IA**: Google Gemini (via Supabase Edge Function, API key server-side)
- **Testing**: Vitest + @testing-library/react (39 tests)
- **CI**: GitHub Actions (tsc + test + build en cada push)

## Arquitectura

Feature-based:

```
src/
├── core/               # transversal
│   ├── supabase/       # cliente
│   ├── hooks/          # useAuth, useCustomFields, useAutomatizaciones, useDashboardScope
│   ├── stores/         # Zustand (auth)
│   ├── types/          # entities.ts + database.ts (Supabase generados)
│   ├── utils/          # dates, format, logger, energy
│   ├── components/     # StatusBadge, StatCard, EmptyState, ExportButton, CustomFieldsPanel
│   └── energia/        # calculator, tariffs, adapters (lógica Calculadora)
├── features/           # 20 dominios de negocio
│   ├── empresas/       # cada feature: api.ts + Page.tsx + components/
│   ├── contactos/
│   ├── contratos/
│   ├── oportunidades/
│   ├── actividades/
│   ├── incidencias/
│   ├── renovaciones/
│   ├── documentos/
│   ├── calendario/
│   ├── dashboard/
│   ├── informes/
│   ├── importador/
│   ├── notificaciones/
│   ├── admin/
│   ├── datos/
│   ├── analisis/
│   ├── propuestas-energia/
│   ├── tracking/
│   ├── chat-ia/
│   └── auth/
├── components/
│   ├── ui/             # shadcn primitives + ConfirmDialog + Skeleton
│   ├── layout/         # AppShell + Sidebar
│   └── search/         # GlobalSearch
├── types/              # tipos legacy (src/types/database.ts — pendiente consolidar en core)
└── main.tsx
```

Regla: código nuevo va a `src/core/*` o `src/features/<dominio>/*`. No se crean `src/hooks/` o `src/lib/` (están eliminados).

## Arrancar en local

Prerrequisitos:
- Node 20+
- Una instancia de Supabase (propia o compartida)

```bash
git clone https://github.com/jolivares-valere/valere-v2.git
cd valere-v2
npm install
cp .env.example .env   # y rellenar VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev            # localhost:3000
```

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Vite dev server (port 3000) con HMR |
| `npm run build` | Build producción (`dist/`) |
| `npm run preview` | Preview del build local |
| `npm run test` | Vitest single run |
| `npm run test:watch` | Vitest watch |
| `npm run lint` | `tsc --noEmit` (type check) |

## Deploy

Ver [`docs/DEPLOY.md`](docs/DEPLOY.md) para instrucciones paso a paso de Vercel y Cloudflare Tunnel.

## Documentación

| Archivo | Qué |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Contexto para agentes Claude (Code, Cowork) — cómo arrancar sesión nueva |
| [`docs/ESTADO.md`](docs/ESTADO.md) | Estado actual: commits, tablas, pendientes, migrations aplicadas |
| [`docs/ROADMAP_FUSION.md`](docs/ROADMAP_FUSION.md) | Roadmap detallado (FASE 20→28) con checklists |
| [`docs/DESIGN_REVIEW_2026-04-20.md`](docs/DESIGN_REVIEW_2026-04-20.md) | Auditoría UX/a11y + top 10 mejoras priorizadas |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | Guía de deploy (Vercel + Cloudflare Tunnel) |
| [`docs/MERGE_STRATEGY.md`](docs/MERGE_STRATEGY.md) | Propuesta para mergear `claude/valere-crm-architecture-2vvEV` → `main` |
| [`docs/LEGACY_TABLES_KILL_LIST.md`](docs/LEGACY_TABLES_KILL_LIST.md) | Análisis del DROP `clients`/`supply_points` (ejecutado 2026-04-21) |
| [`docs/SESIONES/`](docs/SESIONES/) | Log por sesión de los agentes |
| [`supabase/migrations/`](supabase/migrations/) | Migraciones SQL (aplicadas todas salvo las que indique ESTADO.md) |
| [`supabase/functions/chat-consultor/README.md`](supabase/functions/chat-consultor/README.md) | Deploy de la Edge Function del chat IA |

## Convenciones

- **Idioma de código**: español para dominio de negocio (`empresas`, `contratos`, `comercial_id`); inglés para técnicos (`isLoading`, `onSubmit`).
- **Idioma de UI**: castellano.
- **Tipos**: derivados de `Database` generado por Supabase (`src/core/types/database.ts`) + interfaces manuales en `src/core/types/entities.ts`.
- **Mutaciones**: siempre con toast de éxito + error en mutaciones iniciadas por usuario.
- **Confirmaciones destructivas**: `ConfirmDialog` (nunca `window.confirm`).
- **Loading**: `<Skeleton>` o `<SkeletonRow>` (no spinners fullscreen).
- **Badges de estado**: `<StatusBadge variant="...">` (no inline).
- **Border radius**: `rounded-xl` por defecto (tanto en CRM como en Calc).
- **H1 de página**: `text-3xl font-display font-bold text-valere-blue-dark`.

## Autenticación y roles

Supabase Auth con 4 roles en `user_profiles.role`:

- `master`: acceso total (admin efectivo).
- `manager`: acceso total (admin efectivo). Hereda permisos de admin vía `get_user_rol()` en Postgres.
- `consultant`: ve solo empresas donde `comercial_id = auth.uid()`.
- `client`: similar a consultant. El portal de cliente no está implementado todavía.

RLS granular por `comercial_id` activo en todas las tablas CRM (FASE 20.9 + 28.2).

## Licencia

Propietario — Valere Consultores.

## Contacto

jolivares@valereconsultores.es
