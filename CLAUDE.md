# CLAUDE.md

Fichero de contexto persistente para agentes Claude (Code, Cowork, API). Leer siempre antes de trabajar en el repo.

---

## 🔗 ENLACES DE SERVICIOS (NO MODIFICAR)

| Servicio | URL / Referencia |
|---|---|
| **GitHub repo** | https://github.com/jolivares-valere/valere-v2 |
| **Supabase proyecto** | https://supabase.com/dashboard/project/gtphkowfcuiqbvfkwjxb |
| **Supabase API URL** | https://gtphkowfcuiqbvfkwjxb.supabase.co |
| **Hosting CRM** | **https://valere-v2.pages.dev** (Cloudflare Pages — migrado 2026-04-24) |
| **Vercel** | ❌ Cuenta suspendida desde 2026-04-24. CRM ya migrado. Potencias pendiente. |
| **Dev local** | http://localhost:3000 (puerto fijo, vite --port 3000) |
| **Drive logos/branding** | https://drive.google.com/drive/folders/1JxJR7w2iuHnGJZXg4EQXr82r9g1-FoJe |
| **Drive empresa Valere** | https://drive.google.com/drive/folders/1wZBFZuhACbDKMndJWo4S1EJLbQp8PrvN |
| **GitHub Actions CI** | https://github.com/jolivares-valere/valere-v2/actions |

**Puerto de desarrollo: SIEMPRE 3000.** No usar 5173 ni otros. Si el servidor no arranca en 3000, matar proceso y reiniciar.

---

## 🤖 SISTEMA DE AGENTES

Este proyecto usa 4 agentes especializados que trabajan en paralelo. Cada agente tiene su capa de responsabilidad y NO debe tocar las capas de los demás.

### Agente 1 — Cowork (coordinador + features de backend)
- **Quién:** Claude en la app Cowork de escritorio (este agente)
- **Responsabilidad:** planificación, features nuevas, hooks, API calls, SQL migrations, documentación
- **Toca:** `src/features/`, `src/core/`, `supabase/migrations/`, `docs/`
- **NO toca:** tokens de diseño CSS, identidad visual

### Agente 2 — Claude Code CLI (implementación + QA)
- **Quién:** Claude Code en terminal del ordenador de Juan
- **Responsabilidad:** ejecutar builds, tests, commits, push, debugging interactivo
- **Toca:** todo el repo, especialmente verificación TSC + tests antes de cada PR
- **Prompt de arranque para Claude Code:**
  ```
  cd ~/valere-v2
  git pull origin main
  cat CLAUDE.md docs/ESTADO.md
  ls .cowork/inbox/
  git log --oneline -5
  Continúa desde donde lo dejamos. Rama de trabajo: claude/<descripcion>.
  ```

### Agente 3 — Claude Design (diseño visual)
- **Quién:** Claude Design (app independiente) o Claude in Chrome apuntando a localhost:3000
- **Responsabilidad:** analizar screenshots de la app, comparar con branding Valere, generar propuestas CSS/tokens
- **Toca:** SOLO genera archivos de diseño que Cowork implementa. NO hace commits.
- **Input que necesita:** screenshots de pantallas actuales + archivos de branding del Drive
- **Output que produce:** especificaciones de tokens (colores, tipografía, spacing) en formato markdown + componentes HTML de referencia
- **Branding Valere disponible en:** https://drive.google.com/drive/folders/1JxJR7w2iuHnGJZXg4EQXr82r9g1-FoJe

### Agente 4 — Auditor autónomo (skill valere-auditor)
- **Quién:** subagente lanzado por Cowork o Code al final de cada feature
- **Responsabilidad:** TSC 0 errores, 39/39 tests, build OK, RLS correcto, sin regresiones
- **Activa con:** skill `valere-auditor` (ver `.claude/skills/valere-auditor/`)
- **Output:** informe en `docs/AUDIT_<YYYY-MM-DD>.md`

---

## 📋 PROTOCOLO DE SESIÓN AUTOMÁTICO

### Al ABRIR sesión (ejecutar SIEMPRE, en este orden):
```bash
git pull origin main
cat CLAUDE.md
cat docs/ESTADO.md
ls .cowork/inbox/ 2>/dev/null || echo "(inbox vacío)"
git log --oneline -5
```
Después decir: "He leído el estado. Estamos en: [resumen de 2 líneas de ESTADO.md]."

### Al CERRAR sesión (ejecutar SIEMPRE):
```bash
# 1. Actualizar docs/ESTADO.md (fecha, commits, pendientes)
# 2. Crear resumen en docs/SESIONES/YYYY-MM-DD-resumen.md
# 3. Dejar mensajes en .cowork/outbox/ si hay instrucciones para siguiente sesión
# 4. Commit y push
git add docs/ESTADO.md docs/SESIONES/
git commit -m "docs: actualizar ESTADO.md sesión $(date +%Y-%m-%d)"
git push origin main
```

### Bus de mensajes entre sesiones:
- **`.cowork/inbox/`** — mensajes que esta sesión RECIBE de sesiones anteriores (leer al abrir)
- **`.cowork/outbox/`** — mensajes que esta sesión DEJA para la siguiente (escribir al cerrar)
- Formato de archivo: `YYYY-MM-DDTHH-MM-SS-descripcion.md`

---

## Producto

**Valere** — plataforma para Valere Consultores, consultora energética española. Dos grandes bloques funcionales que ahora conviven en este repo y que estamos fusionando bajo una sola arquitectura:

1. **CRM de ventas**: empresas, contactos, contratos, oportunidades (kanban), actividades, dashboard comercial, importador CSV, búsqueda global.
2. **Calculadora de ofertas energéticas**: captura de facturas, análisis comparativo contra ofertas de comercializadoras, generación de propuestas, tracking, chat IA con Gemini.

Ambos módulos comparten usuarios (roles) y cliente/empresa.

## Arquitectura

Arquitectura unificada feature-based (fusión completada FASE 20.3-20.6):

| Dominio | Ubicación |
|---|---|
| CRM | `src/features/` (empresas, contactos, contratos, oportunidades, actividades, dashboard, importador) |
| Calculadora | `src/features/` (admin, datos, analisis, propuestas-energia, tracking, chat-ia) |
| Transversal | `src/core/` (hooks, supabase, types, utils, energia, components, stores) |
| UI (shadcn) | `src/components/ui/` |
| Layout/Search | `src/components/layout/`, `src/components/search/` |

**Regla:** todo va a `src/core/` o `src/features/<dominio>/`. `src/modules/`, `src/lib/`, `src/hooks/` ya no existen.

### Estructura de una feature

```
src/features/<dominio>/
  <Dominio>Page.tsx        # Page component (ruta)
  api.ts                   # Todas las llamadas a Supabase + tipos derivados
  components/              # Componentes privados a esta feature
    <Dominio>Form.tsx
    ...
```

`src/core/` contiene lo transversal: `supabase/client.ts`, `hooks/useAuth.ts`, `stores/`, `types/entities.ts`, `types/api.ts`, `utils/`.

## Stack

- React 19 + TypeScript 5 + Vite 6
- Tailwind CSS 4 (`@tailwindcss/vite`)
- Supabase JS SDK 2.100.x
- @tanstack/react-query 5
- react-hook-form 7 + zod 4
- Framer Motion 11
- sonner (toasts), recharts (gráficos), react-dropzone, react-markdown
- Google GenAI SDK (`@google/genai`) — chat IA (pendiente mover a Edge Function)

## Schema Supabase

**Estado actual: 22 tablas** (verificado abril 2026 contra el proyecto vivo).

**Tabla de perfiles de usuario canónica: `user_profiles`** (Calculadora, plural, convención estándar). La tabla `users_profile` (CRM, singular) se considera **legacy a fusionar**. Ambas tienen 1 fila actualmente — migración trivial.

### Tablas CRM (13)
`users_profile` (legacy, migrar a `user_profiles`), `empresas`, `contactos`, `contratos`, `cups`, `oportunidades`, `actividades`, `propuestas`, `custom_fields_schema`, `custom_fields_values`, `notificaciones`, `documentos`, `eventos`.

- `documentos`: polimórfica (`entidad_tipo` + `entidad_id` + `ruta_storage`), para adjuntos de cualquier entidad. 0 filas hoy, sin feature frontend aún.
- `eventos`: polimórfica (`entidad_tipo` + `entidad_id` + `fecha_inicio/fin` + `todo_el_dia`), para calendario/agenda. 0 filas hoy, sin feature frontend aún.

### Tablas Calculadora (9)
`user_profiles` (canónica), `clients`, `supply_points`, `invoice_history` (con `consumption_p1..p6`, `surplus_p1..p6` añadidas en FASE 20.0.1), `retailers`, `retailer_offers`, `proposals`, `global_config`, `boe_regulated_prices`.

### Mapa de migración Calculadora → CRM
| Origen | Destino | Nota |
|---|---|---|
| `users_profile` (CRM legacy) | `user_profiles` (canónica) | Migrar 1 fila, luego DROP `users_profile`. **Código CRM se adapta, no al revés.** |
| `clients` | `empresas` | Migrar con mapeo; `clients.consultor_asignado` (TEXT email) → `empresas.comercial_id` (UUID → FK `user_profiles`) |
| `supply_points` | `cups` | Ya existe `cups` en CRM (tabla única, verificado) |
| `proposals` | nueva `analisis_comparativo` | Dejar `propuestas` como comerciales (CRM), crear tabla propia para resultados de cálculo |
| `invoice_history` | renombrar a `facturas` (FK a `cups`) | Se queda, se renombra |
| `retailers`, `retailer_offers` | **conservar** tal cual | — |
| `global_config`, `boe_regulated_prices` | **conservar** tal cual | — |

## Convenciones

- **Idioma de código**: identificadores en español cuando la entidad es del dominio de negocio (`empresas`, `contratos`, `comercial_id`); inglés para primitivos técnicos (`isLoading`, `onSubmit`).
- **Idioma de UI**: español (castellano).
- **Tipos**: derivados de `Database` generado por Supabase (`Database['public']['Tables']['<tabla>']['Row']`). Cuando `Database = any` (estado actual), usar interfaces en `src/core/types/entities.ts`. FASE 20.1 regenera los tipos reales.
- **Paginación**: función `paginate<T>` devuelve `PaginatedResult<T> = { data: T[]; count: number; page: number; pageSize: number }`. Siempre acceder con `.data`.
- **Mutaciones Supabase**: un `.insert`/`.update` con un objeto tipado. Si TSC infiere `never`, es porque `Database = any` — a regenerar (no parchear con más `as never`).
- **Toasts**: `sonner` (import `toast` de `sonner`). Success/error siempre en mutaciones de usuario.
- **Confirmaciones destructivas**: `ConfirmDialog` de `src/core/components/`.
- **Skeletons**: durante `isLoading`, no spinners.

## Comandos útiles

```bash
npm run dev            # Vite dev server → http://localhost:3000 (SIEMPRE puerto 3000)
npm run build          # Build producción
npx tsc --noEmit       # Type-check (DEBE estar a 0 errores antes de commit)
npm test -- --run      # Tests (deben pasar 39/39)
npm run preview        # Preview build local
```

Regenerar tipos Supabase (requiere CLI y project-ref):
```bash
supabase gen types typescript --project-id <PROJECT_REF> > src/core/types/database.ts
```

## Git

- **Branch de desarrollo**: `claude/valere-crm-architecture-2vvEV`.
- **PR activo**: #1 draft → main.
- Siempre commitear con TSC a 0 errores.
- Mensaje de commit: `<tipo>(fase<n>.<sub>): <descripción corta>`. Ej: `feat(fase20.2): migrar AdminPanel a features/admin`.

## Decisiones tomadas

1. **Fusionar CRM y Calculadora en una sola app** bajo arquitectura feature-based (decisión abril 2026). ✅ COMPLETADO FASE 20.6.
2. **`Database = any`** temporal en `src/core/supabase/client.ts` hasta FASE 20.1 (regeneración de tipos). �� COMPLETADO.
3. **`src/modules` eliminado** — migración completada en FASE 20.5-20.6. Exclusión del tsconfig removida.
4. **Chat Gemini expone la API key en cliente**. Pendiente mover a Edge Function de Supabase (FASE 20.8).
5. **RLS permisivo actual** (all authenticated CRUD all). Se endurece en FASE 20.9 con filtrado por `comercial_id` / `consultor_asignado`.

## Gotchas conocidos

- ~~**useAuth duplicado**~~: RESUELTO en FASE 20.3. Solo existe `src/core/hooks/useAuth.ts` leyendo de `user_profiles`.
- **Cowork trabaja en `main`**, nosotros en `claude/valere-crm-architecture-2vvEV`. Antes de fusionar comprobar `git log origin/main --oneline` por si hay commits nuevos que portar.
- **PowerShell Windows + sandbox Linux**: parte de los flujos aplican parches en el Windows del usuario vía PowerShell; usar `[regex]::Replace()` o `@'...'@` heredocs para evitar problemas de CRLF/LF.
- **Tipos Calc en `src/types/database.ts`**: tipos de la Calculadora (Client, SupplyPoint, etc.) aún viven aquí. Se integrarán con los tipos generados de Supabase en FASE 20.7.

## Roadmap

Ver [`docs/ROADMAP_FUSION.md`](docs/ROADMAP_FUSION.md) para el plan detallado de la fusión (FASE 20.1 → 20.9).

## Memoria persistente entre sesiones

### Archivos de estado
- **`docs/ESTADO.md`**: estado actual del proyecto (qué está hecho, qué falta, tareas pendientes). Actualizar al final de cada sesión.
- **`docs/ROADMAP_FUSION.md`**: roadmap detallado con checklists ✅.
- **`docs/SESIONES/`**: log de sesiones anteriores (JSONL raw + resumen legible).
- **`.cowork/inbox/` y `.cowork/outbox/`**: bus de mensajes entre agentes Claude.

### Arranque de sesión nueva

**Claude Code (CLI/Desktop):**
```bash
cd ~/valere-v2 && claude -c   # continuar última sesión
# O sesión nueva:
# "Lee CLAUDE.md, docs/ESTADO.md y git log --oneline -10. Continúa."
```

**Claude Cowork (Web — claude.ai/code):**
```
Trabajas en valere-v2, rama claude/valere-crm-architecture-2vvEV.
Ejecuta:
  git pull origin claude/valere-crm-architecture-2vvEV
  cat CLAUDE.md docs/ESTADO.md docs/ROADMAP_FUSION.md
  ls .cowork/outbox/ .cowork/inbox/
  git log --oneline -10
Lee todo y dime dónde nos quedamos.
```

### Al cerrar sesión
1. Actualizar `docs/ESTADO.md` con lo que se hizo y lo que queda.
2. Si la sesión fue larga, añadir entrada en `docs/SESIONES/`.
3. Commit + push.

---

## 🗺️ MAPA DE DOCUMENTACIÓN ESTRATÉGICA

Entrada rápida para orientarte. Todos los planes vivos en `docs/`:

| Archivo | Propósito |
|---|---|
| `docs/ESTADO.md` | Estado actual del proyecto — actualizar al cerrar sesión |
| `docs/ROADMAP_FUSION.md` | Roadmap técnico histórico del CRM |
| `docs/ARQUITECTURA_PROYECTOS.md` | Mapa de apps del ecosistema Valere |
| `docs/SEGURIDAD.md` | Registro de decisiones de seguridad |
| `docs/DEPLOY.md` | Guía de deploy |
| `docs/MCP_SETUP.md` | Setup MCPs Supabase/Vercel |
| `docs/PLAN_UNIFICACION_SUPABASE.md` | **Sprint futuro**: unificar los 2 proyectos Supabase (6 fases, 10-12d) |
| `docs/PLAN_ASISTENTE_RAG_CRM.md` | **Plan asistente RAG** — ruta estable única (5 fases) |
| `docs/PLAN_MIGRACION_POTENCIAS_CLOUDFLARE.md` | Migrar Potencias de Vercel a Cloudflare (incluye refactor pre-migración) |
| `docs/PLAN_ARSYS_CONVERSION_IMPORT.md` | Plan rescate correos Arsys cuando backup esté listo |
| `docs/SETUP_OPENCLAW_MISSION_CONTROL.md` | Setup OpenClaw para control remoto desde Cowork |
| `docs/AUDIT_SEGURIDAD_2026-04-24.md` | Auditoría preventiva del repo (limpio) |
| `docs/CREDENCIALES_1PASSWORD.csv` | Importable a 1Password |
| `docs/COMUNICADO_NUEVO_URL_CRM.md` | Borrador email/Slack para equipo |
| `docs/SESIONES/` | Resúmenes históricos de sesiones |
| `docs/help/` | **Documentación de ayuda consumida por el asistente RAG del CRM** |

## 💬 Asistente RAG del CRM

El CRM tiene un widget flotante de ayuda (`AsistentePanel`) accesible desde todas las páginas autenticadas. Arquitectura:

- **Frontend**: `src/features/asistente-crm/`
- **Backend**: `supabase/functions/ask-crm-docs/` (Edge Function)
- **Adapter IA sustituible**: `supabase/functions/_shared/ai-adapter.ts` (Gemini por defecto)
- **Datos**: tabla `crm_help_embeddings` + función `match_crm_help` (pgvector)
- **Pipeline**: `.github/workflows/regenerate-help-embeddings.yml` regenera embeddings cuando `docs/help/**` cambia
- **Script local**: `scripts/generate-help-embeddings.mjs`

**Para activarlo completamente** hace falta:
1. Configurar secrets GitHub: `GEMINI_API_KEY_EMBEDDINGS`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`.
2. Ejecutar el workflow manualmente la primera vez (o hacer push que modifique `docs/help/`).
3. Configurar secret Supabase de la Edge Function: `GEMINI_API_KEY`.
4. Deploy: `supabase functions deploy ask-crm-docs`.

Ver `docs/PLAN_ASISTENTE_RAG_CRM.md` para plan completo.
