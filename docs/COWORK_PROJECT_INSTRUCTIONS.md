# Instrucciones de Proyecto — Valere CRM v2 (Claude Desktop / Cowork)

> Copia este texto en el campo **"Project Instructions"** de tu proyecto de Claude.ai/code (Cowork) o en la configuración de proyecto de Claude Desktop.

---

## Contexto y arranque obligatorio

Trabajas en **Valere CRM v2**, una plataforma web para Valere Consultores (consultora energética española). El repositorio es `jolivares-valere/valere-v2`. **Antes de responder cualquier pregunta o hacer cualquier cambio, ejecuta siempre estos comandos:**

```bash
git pull origin main
cat CLAUDE.md
cat docs/ESTADO.md
ls .cowork/inbox/ .cowork/outbox/
git log --oneline -10
```

Estos archivos son la memoria del proyecto. Si no los lees, trabajarás con información obsoleta.

---

## Qué es este proyecto

**Valere CRM v2** fusiona dos módulos en una sola aplicación:

1. **CRM de ventas** — empresas, contactos, contratos, oportunidades (kanban), actividades, dashboard comercial, importador CSV, búsqueda global, incidencias, renovaciones, documentos, calendario.
2. **Calculadora de ofertas energéticas** — captura de facturas, análisis comparativo contra ofertas de comercializadoras, generación de propuestas, tracking, chat IA con Gemini.

Ambos módulos comparten usuarios (roles), empresas (`empresas`) y puntos de suministro (`cups`).

---

## Stack técnico

- **React 19 + TypeScript 5 + Vite 6**
- **Tailwind CSS 4** (`@tailwindcss/vite`)
- **Supabase JS SDK 2.100.x** — base de datos, auth, storage, realtime
- **@tanstack/react-query 5** — fetching y caché
- **react-hook-form 7 + zod 4** — formularios y validación
- **Framer Motion 11** — animaciones
- **sonner** — toasts, **recharts** — gráficos, **react-dropzone** — uploads
- **Google GenAI SDK** — chat IA (pendiente mover a Edge Function)

**Supabase project:** `gtphkowfcuiqbvfkwjxb` → `https://gtphkowfcuiqbvfkwjxb.supabase.co`

---

## Arquitectura del código

```
src/
├── features/              # Un directorio por dominio de negocio
│   ├── empresas/          # CRUD empresas + custom fields
│   ├── contactos/         # CRUD contactos
│   ├── contratos/         # CRUD contratos + alertas vencimiento
│   ├── oportunidades/     # Kanban pipeline + automatizaciones
│   ├── actividades/       # Tareas y actividades comerciales
│   ├── dashboard/         # KPIs por rol (comercial/manager/admin)
│   ├── importador/        # Importación CSV
│   ├── incidencias/       # Gestión de incidencias
│   ├── renovaciones/      # Gestión de renovaciones
│   ├── documentos/        # Adjuntos (Storage Supabase)
│   ├── calendario/        # Vista de calendario + CRUD eventos
│   ├── notificaciones/    # Notificaciones in-app
│   ├── informes/          # Informes predefinidos + exportación CSV
│   ├── datos/             # Captura facturas energéticas
│   ├── analisis/          # Comparador de ofertas
│   ├── propuestas-energia/ # Propuestas comerciales energía
│   ├── tracking/          # Seguimiento propuestas
│   ├── chat-ia/           # Chat con Gemini
│   └── admin/             # Panel admin (usuarios, comercializadoras, custom fields)
│
└── core/                  # Código transversal
    ├── supabase/client.ts # Cliente Supabase único
    ├── hooks/useAuth.ts   # Auth + roles (ÚNICA fuente de verdad)
    ├── types/entities.ts  # Interfaces de dominio
    ├── types/database.ts  # Tipos generados de Supabase
    ├── components/        # ConfirmDialog, StatusBadge, Skeleton, etc.
    ├── stores/            # Estado global (Zustand si aplica)
    ├── utils/             # Helpers y formatters
    └── energia/           # Lógica calculadora (calculator.ts, tariffs.ts, adapters.ts)
```

**Regla de oro:** Todo va a `src/core/` (transversal) o `src/features/<dominio>/` (específico). Las carpetas `src/modules/`, `src/lib/`, `src/hooks/` ya no existen — fueron eliminadas en la fusión.

### Estructura de una feature

```
src/features/<dominio>/
  <Dominio>Page.tsx        # Componente de ruta
  api.ts                   # Todas las llamadas a Supabase + tipos derivados
  components/              # Componentes privados de esta feature
```

---

## Base de datos (Supabase) — 22 tablas activas

### CRM
`user_profiles`, `empresas`, `contactos`, `contratos`, `cups`, `oportunidades`, `actividades`, `propuestas`, `custom_fields_schema`, `custom_fields_values`, `notificaciones`, `documentos`, `eventos`

### Calculadora energética
`facturas` (antes `invoice_history`), `retailers`, `retailer_offers`, `proposals` (EN, uso activo en AnalisisPage/PropuestasEnergiaPage/TrackingPage), `global_config`, `boe_regulated_prices`

### Tablas eliminadas (NO usar, ya no existen)
- `clients` — DROP ejecutado 2026-04-21 (datos migrados a `empresas`)
- `supply_points` — DROP ejecutado 2026-04-21 (datos migrados a `cups`)
- `users_profile` — era legacy CRM; la canónica es `user_profiles`
- `invoice_history` — renombrada a `facturas`

### Roles de usuario
`comercial` | `manager` | `master` (admin). La función SQL `get_user_rol()` mapea `master`/`manager` → `'admin'` para las RLS policies, por lo que comparten permisos de escritura total.

---

## Convenciones de código

- **Idioma identificadores**: español para entidades de negocio (`empresas`, `comercial_id`), inglés para primitivos técnicos (`isLoading`, `onSubmit`).
- **Idioma UI**: castellano.
- **Toasts**: siempre `sonner` (`import { toast } from 'sonner'`). Éxito y error en todas las mutaciones visibles al usuario.
- **Confirmaciones destructivas**: usar `ConfirmDialog` de `src/core/components/`, nunca `confirm()` nativo.
- **Estados de carga**: usar `Skeleton` (de `src/core/components/Skeleton.tsx`), no spinners fullscreen.
- **Badges de estado**: usar `StatusBadge` de `src/core/components/StatusBadge.tsx`, no badges inline ad-hoc.
- **TypeScript**: TSC debe estar a **0 errores** antes de cualquier commit. Verificar con `npx tsc --noEmit`.
- **Tests**: `npm test -- --run` debe pasar los **39 tests** antes de commit.

---

## Estado actual (2026-04-22)

### Lo que está hecho (completo)
- ✅ 27/27 fases del roadmap de fusión
- ✅ FASE 28: Custom fields por entidad, Dashboards por rol, Automatizaciones (oportunidad ganada → contrato borrador; contrato activo → tarea 30 días)
- ✅ Sprint 1 accesibilidad: ConfirmDialog con focus trap, aria-labels en todos los listados
- ✅ Sprint 2 visual: toasts en todas las mutaciones, skeletons en todas las páginas, StatusBadge unificado
- ✅ RLS granular multitenant (20 policies activas)
- ✅ CI GitHub Actions (tsc + test + build en cada push)
- ✅ TSC 0 errores · 39 tests · build OK (254 kB)

### Pendientes (ordenados por urgencia)

| # | Tarea | Cómo hacerlo | Urgencia |
|---|-------|-------------|----------|
| 1 | **Ejecutar SQL `fase28.6`** en Supabase | Supabase → SQL Editor → pegar `supabase/migrations/20260422_fase28_6_rls_policies_cleanup.sql` → Run | Media |
| 2 | **Deploy en Vercel** | Ver `docs/DEPLOY.md` (15 min, recomendado para producción) | Media |
| 3 | **Deploy Edge Function `chat-consultor`** | Ver `supabase/functions/chat-consultor/README.md` | Media |
| 4 | Regenerar tipos TypeScript | `npx supabase gen types typescript --project-id gtphkowfcuiqbvfkwjxb > src/core/types/database.ts` | Baja |
| 5 | Limpiar tipos legacy `SupplyPoint`/`Client` residuales en `src/types/database.ts` | Verificar con grep que no tienen consumidores y eliminar | Baja |

---

## Ramas Git

- `main` — producción / referencia estable
- `claude/valere-crm-architecture-2vvEV` — rama histórica donde se hizo toda la fusión (ya mergeada en `main` via PR #1)
- Para nueva funcionalidad: crear rama `claude/<descripcion>` desde `main`

---

## Comandos útiles

```bash
npm run dev            # Dev server en localhost:5173
npm run build          # Build producción
npx tsc --noEmit       # Type-check (debe dar 0 errores)
npm test -- --run      # Tests (deben pasar 39/39)
npm run preview        # Preview del build
```

---

## Archivos de referencia del proyecto

| Archivo | Para qué sirve |
|---------|----------------|
| `CLAUDE.md` | Contexto completo del proyecto (leer al arrancar) |
| `docs/ESTADO.md` | Estado actual + historial de commits + pendientes |
| `docs/ROADMAP_FUSION.md` | Roadmap detallado con checklists de todas las fases |
| `docs/DEPLOY.md` | Guía de deploy (Vercel + Cloudflare Tunnel) |
| `docs/DESIGN_REVIEW_2026-04-20.md` | Informe de diseño con sprints priorizados |
| `docs/AUDIT_2026-04-19.md` | Audit completo (0 P0/P1 pendientes) |
| `supabase/migrations/` | Todas las migraciones SQL del proyecto |
| `.cowork/inbox/` | Mensajes de sesiones anteriores de Cowork para Claude Code |
| `.cowork/outbox/` | Mensajes de Claude Code para Cowork |

---

## Reglas de trabajo

1. **Leer antes de escribir.** Siempre `cat CLAUDE.md docs/ESTADO.md` al inicio de sesión.
2. **TSC 0 antes de commit.** `npx tsc --noEmit` debe dar 0 errores.
3. **Tests verdes antes de commit.** `npm test -- --run` debe pasar 39/39.
4. **Actualizar `docs/ESTADO.md`** al cerrar sesión con lo que se hizo y lo que queda.
5. **Mensajes entre agentes vía `.cowork/`**: si necesitas comunicar algo a la sesión de Cowork, crear archivo en `.cowork/outbox/`. Si hay mensajes en `.cowork/inbox/`, leerlos al arrancar.
6. **No tocar tablas `clients`, `supply_points`, `users_profile`** — ya no existen en Supabase.
7. **No usar `confirm()` nativo** — usar `ConfirmDialog`.
8. **No usar spinners fullscreen** — usar `Skeleton`.

---

## Bus de mensajes entre sesiones

Si hay un mensaje en `.cowork/inbox/` que no has leído, léelo antes de empezar. Si necesitas dejar instrucciones para la siguiente sesión (Claude Code CLI o Cowork), crea un archivo en `.cowork/outbox/` con este formato de nombre:

```
YYYY-MM-DDTHH-MM-SS-descripcion-corta.md
```
