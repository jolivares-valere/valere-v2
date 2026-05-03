# Estado técnico actual — Valere CRM v2 (1 mayo 2026)

## Stack

### Frontend
- React 19.0
- TypeScript 5.8
- Vite 6.2
- Tailwind CSS 4.1 + shadcn/ui (Radix UI primitives)
- react-router-dom 6.28
- @tanstack/react-query 5.59
- react-hook-form 7.72 + zod 4.3
- @dnd-kit (drag-drop Kanban)
- recharts 3.8
- lucide-react 0.546 (iconos)
- sonner 2.0 (toasts)
- date-fns 4.1
- react-markdown 10.1
- react-dropzone 15.0
- xlsx 0.18 (SheetJS)
- papaparse 5.4 (CSV)
- @sentry/react ^10 (lazy, sin DSN configurado)

### Backend / BD
- Supabase (proyecto `gtphkowfcuiqbvfkwjxb`, eu-west-1, ACTIVE_HEALTHY)
- Postgres 17.6.1.104
- Extensiones: pgvector (RAG), pg_cron, pg_net, pgcrypto, vault, supabase_vault
- Auth: Supabase Auth nativo (email/password). Plan migración a Google Identity SSO.
- Storage: bucket `documentos` (privado, 50MB max)
- Realtime: no usado todavía

### Edge Functions Deno (8 desplegadas)
1. `chat-consultor` — chat IA Gemini
2. `ask-crm-docs` — RAG asistente CRM
3. `notify-admin-pending-user` — email Resend al admin
4. `notify-user-approval-decision` — email Resend al usuario
5. `holded-worker` — sync Holded ERP/contabilidad
6. `notify-integration-error` — alertas integraciones
7. `notify-expediente-estado` — notif Potencias
8. `datadis-proxy` v8 — proxy Datadis con cache persistente
9. `daily-contract-check` — código en repo, NO desplegado (lógica en SQL desde FASE 30.1)

### Cron jobs (3 activos)
- `cleanup_pending_users_daily` — 03:00 UTC, borra usuarios pendientes >7d
- `holded_worker_5min` — cada 5 min, dispatch Holded
- `daily_contract_check` — 04:00 UTC, rollover renovaciones (recién creado FASE 30.1)

### Hosting y CI
- **Frontend**: Cloudflare Pages, dominio `valere-v2.pages.dev` (migrado desde Vercel suspendido en abril 2026)
- **CI**: GitHub Actions (build + TSC + tests)
- **Workspace selectado**: `C:\Users\joliv\valere-v2` (Windows + PowerShell)

### Integraciones externas
- **Datadis** (CNMC): proxy v8 funcional con cache. 14 suministros sincronizados (cliente CHEMTROL).
- **Holded**: ERP/contabilidad sincronización bidireccional. 13 entidades sincronizables.
- **Resend**: email transaccional (notificaciones admin/aprobación). Plan free 100/día.
- **Gemini**: vía Edge Function `chat-consultor` y `ask-crm-docs`. API key en Supabase Secrets.
- **FusionSolar (Huawei)**: plantas FV vía Playwright web scraping (workflow GitHub Actions).
- **Datadis API oficial (terceros)**: solicitada, no aprobada — modo `portal` con credenciales del usuario.
- **Migración a Google Workspace** en curso: Gmail, Calendar, Drive, Identity (plan documentado).

### Variables `.env` requeridas (sin secretos)
```
VITE_SUPABASE_URL=             # https://gtphkowfcuiqbvfkwjxb.supabase.co
VITE_SUPABASE_ANON_KEY=        # [REDACTED — copiar desde Supabase Dashboard]
VITE_SENTRY_DSN=               # opcional, vacío en local. Si vacío, SDK no carga.
VITE_SENTRY_ENVIRONMENT=       # development / production
```

### Variables Supabase Edge Function Secrets (backend)
```
GEMINI_API_KEY                 # [REDACTED]
GEMINI_API_KEY_EMBEDDINGS      # [REDACTED] (también en GitHub Actions)
RESEND_API_KEY                 # [REDACTED]
HOLDED_API_KEY                 # [REDACTED]
HOLDED_CRON_SECRET             # [REDACTED] (en Vault)
DATADIS_USER / DATADIS_PASS    # [REDACTED] (cliente piloto)
SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  # auto-inyectados
```

## Arquitectura frontend

```
src/
├── main.tsx                   # Bootstrap React 19 + Sentry init lazy
├── App.tsx                    # Routing + AuthGuard + ErrorBoundary
├── index.css                  # Tailwind + tokens Valere (CSS variables)
├── components/
│   ├── layout/                # AppShell, Sidebar (CRM + Potencias dual)
│   ├── search/                # GlobalSearch
│   └── ui/                    # shadcn/ui primitives (16 componentes)
├── core/
│   ├── components/            # ConfirmDialog, ErrorBoundary, StatCard, ExportButton
│   ├── email/                 # email-sender, email-templates, email-signatures
│   ├── energia/               # calculator, tariffs, savings_potencias, adapters
│   ├── excel/                 # excel-import (importadores XLSX)
│   ├── hooks/                 # useAuth, useDebounce, useQueryBase, useSupabaseQuery, useDatadis, useRealtime
│   ├── pdf/                   # autorizacion-valere-pdf, presentacion-pdf, pdf-fill
│   ├── services/              # datadis (cliente)
│   ├── stores/                # authStore, uiStore (zustand)
│   ├── supabase/              # client (con Database types)
│   ├── types/                 # entities, api, database (regenerado)
│   └── utils/                 # cn, dates, energy, format, logger, sentry, telemetry, permissions
└── features/                  # 24 features autocontenidas
    ├── actividades/           # tareas, llamadas, emails, reuniones
    ├── admin/                 # panel admin master/manager (tabs)
    ├── analisis/              # análisis comparativo Calculadora
    ├── asistente-crm/         # widget RAG flotante
    ├── auth/                  # login, signup, pending-approval
    ├── calendario/            # vista mes con eventos polimórficos
    ├── chat-ia/               # chat IA Gemini
    ├── contactos/             # CRUD contactos B2B
    ├── contratos/             # CRUD contratos energéticos
    ├── dashboard/             # KPIs Carolina/Juan
    ├── datadis/               # listado suministros + AsociarEmpresaDialog (FASE 30.6)
    ├── datos/                 # captura datos cliente Calculadora
    ├── documentos/            # adjuntos polimórficos
    ├── empresas/              # CRUD empresas + wizard contacto decisor (FASE 30.5)
    ├── importador/            # CSV imports (empresas, contactos, contratos, XLSX tarifas)
    ├── incidencias/           # workflow incidencias
    ├── informes/              # comercial mensual + cartera activa
    ├── notificaciones/        # bell icon + panel
    ├── oportunidades/         # Kanban pipeline + tabla
    ├── potencias/             # módulo RDL 17/2021 (7 sub-rutas)
    ├── propuestas-energia/    # propuestas calculadora
    ├── renovaciones/          # módulo renovaciones (deprecado, consolidar a oportunidades)
    ├── seguimiento-fv/        # plantas fotovoltaicas
    └── tracking/              # tracking propuestas
```

**Convenciones features:**
- `<Domain>Page.tsx` — page component (ruta).
- `api.ts` — todas las llamadas Supabase + tipos derivados.
- `components/` — componentes privados.
- Tipos derivados de `Database['public']['Tables']['<tabla>']['Row']` (regenerados).

## Configuración tsconfig

- `target: ES2022, lib: ES2022 + DOM, jsx: react-jsx, strict: true`.
- `paths`: alias `@/*` → `src/*`.
- `noUnusedLocals/Parameters: true`.

## Configuración Vite

- Plugin `@vitejs/plugin-react`.
- Plugin `@tailwindcss/vite`.
- Build: `manualChunks` para vendors (recharts, supabase, dnd-kit, etc.).
- Code-splitting con `React.lazy` por ruta.

## Comandos clave

```bash
npm run dev            # Vite dev server :3000
npm run build          # tsc -b && vite build
npm run preview        # Preview build local
npm run lint           # tsc --noEmit
npm test -- --run      # Vitest run all
npx tsc --noEmit       # Type-check sin emit (debe ser 0 errores)
```

## Estado del repo (1 mayo 2026 21:00 UTC)

- **Rama actual**: `claude/sprint2-lib-potencias`
- **TSC en esta rama**: roto (~60 errores documentados en `docs/SPRINT3_TSC_PENDIENTE.md`)
- **TSC en main**: 0 errores
- **Working tree**: 30+ archivos modificados/nuevos del Sprint A autónomo (sin commit)
- **Tests**: 6 ficheros, 33 invocaciones, ~3% cobertura del dominio

## Aplicado en producción 1 mayo 2026

3 migrations vía Supabase MCP:

1. **`fase30_1_daily_contract_check_pgcron`** — función SQL `run_daily_contract_check()` + cron 04:00 UTC + revoke EXECUTE de roles públicos.
2. **`fase30_8_incidencias_cups_id_fk`** — column + index + populate (0 filas, tabla incidencias vacía).
3. **`fase30_3_cerrar_etapas_legacy_oportunidades`** — UPDATE 1 fila + restringir CHECK a 8 etapas energéticas.

## Notas operativas

- Sandbox Linux donde se ejecuta Cowork tiene index git corrupto (`g\xc4\xb1S` extension). Funciona con `git --no-optional-locks` para lectura. Para escritura/commit, usar PowerShell del usuario.
- 2 proyectos Supabase distintos: `gtphkowfcuiqbvfkwjxb` (CRM activo) y `alesfvxqtwlrwlmkoosg` (Potencias original, plan unificación pendiente).
