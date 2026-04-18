# CLAUDE.md

Fichero de contexto persistente para agentes Claude (Code, Cowork, API). Leer siempre antes de trabajar en el repo.

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
npm run dev            # Vite dev server (localhost:5173)
npm run build          # Build producción
npx tsc --noEmit       # Type-check (DEBE estar a 0 errores antes de commit)
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
