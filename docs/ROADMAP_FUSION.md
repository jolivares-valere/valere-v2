# Roadmap de Fusión CRM + Calculadora

Plan ejecutable para unificar los dos bloques funcionales del repo Valere en una sola arquitectura feature-based. Cada FASE es una unidad independiente: 1 objetivo, 1 commit, verificación con `npx tsc --noEmit` a 0 errores, PR actualizado, listo para ser retomada desde conversación nueva mirando solo el último commit + este fichero.

## Estado de partida (abril 2026)

- Branch `claude/valere-crm-architecture-2vvEV` (HEAD `4d134a6`): CRM completo en arquitectura feature-based (FASE 13B → 19). PR #1 draft abierto a `main`.
- Branch `origin/main` (HEAD `807781a`): Calculadora en arquitectura flat (`src/modules/*`, `src/lib/*`, `src/hooks/*`, `src/components/*`). Cowork aplicando fixes ahí.
- Schema BD: dos schemas SQL coexisten — `supabase-migration.sql` (Calculadora) y `supabase/migrations/001_crm_core.sql` (CRM).

## Decisión

Fusionar ambos bajo la arquitectura CRM feature-based. La Calculadora se reorganiza en `src/features/calculadora/`, `src/features/analisis/`, `src/features/propuestas/`, `src/features/tracking/`, `src/features/admin/`. `src/lib/*` se mueve a `src/core/energia/`. El `useAuth` legacy se unifica con el del CRM. `user_profiles` se migra a `users_profile` y se elimina.

## Mapa Calculadora → Destino

| Origen legacy | Destino feature-based |
|---|---|
| `src/modules/AdminPanel.tsx` | `src/features/admin/AdminPage.tsx` + `components/` |
| `src/modules/Clients.tsx` | **eliminar**: `clients` se migra a `empresas` (ya existente) |
| `src/modules/DataCapture.tsx` | `src/features/datos/DatosPage.tsx` (+ subcomponentes: Cliente, PuntoSuministro, HistoricoFacturas) |
| `src/modules/Analysis.tsx` | `src/features/analisis/AnalisisPage.tsx` |
| `src/modules/Proposals.tsx` | `src/features/propuestas-energia/PropuestasEnergiaPage.tsx` (no confundir con CRM `propuestas` comercial) |
| `src/modules/Tracking.tsx` | `src/features/tracking/TrackingPage.tsx` |
| `src/modules/Dashboard.tsx` | **fusionar** con `src/features/dashboard/DashboardPage.tsx`: KPIs CRM + Calculadora juntos |
| `src/lib/calculator.ts` | `src/core/energia/calculator.ts` |
| `src/lib/tariffs.ts` | `src/core/energia/tariffs.ts` |
| `src/lib/supabase.ts` | **eliminar** — usar `src/core/supabase/client.ts` |
| `src/lib/utils.ts` | fusionar con `src/core/utils/` |
| `src/hooks/useAuth.tsx` | **eliminar** — usar `src/core/hooks/useAuth.ts` |
| `src/hooks/useSupabaseQuery.ts` | `src/core/hooks/useSupabaseQuery.ts` (revisar si aún aporta frente a react-query) |
| `src/components/Layout.tsx` | `src/core/layout/Layout.tsx` + introducir `react-router-dom` (no está en CRM actual: comprobar) |
| `src/components/LoginPage.tsx` | **eliminar** — usar `src/features/auth/LoginPage.tsx` |
| `src/components/ConsultantChat.tsx` | `src/features/chat-ia/ChatIAPanel.tsx` (con Edge Function, FASE 20.8) |
| `src/components/StatCard.tsx`, `EmptyState.tsx`, `ErrorBoundary.tsx` | `src/core/components/` |
| `src/components/ui/*` | se quedan donde están (lib shadcn) |
| `supabase-migration.sql` | migrar tablas nuevas a `supabase/migrations/003_calculadora.sql` |

## Mapa de tablas BD

**Canónica de perfiles: `user_profiles`** (Calc). Invertido respecto a la decisión inicial — código CRM se adapta, no al revés.

| Legacy | Destino | Acción |
|---|---|---|
| `users_profile` (CRM) | `user_profiles` (canónica) | Migrar 1 fila, luego DROP `users_profile`. El código CRM se adapta. |
| `clients` | `empresas` | Migrar filas con mapeo `nombre_comercial→nombre, nif→nif, consultor_asignado (email) → comercial_id (FK user_profiles)`, DROP |
| `supply_points` | `cups` | Migrar con mapeo de campos, DROP |
| `proposals` | nueva tabla `analisis_comparativo` | Dejar `propuestas` como CRM comercial y crear tabla propia calc |
| `invoice_history` | `facturas` (renombrar, FK a `cups`) | Ya tiene `consumption_p1..p6` y `surplus_p1..p6` desde FASE 20.0.1 ✅ |
| `retailers`, `retailer_offers` | iguales | Conservar |
| `boe_regulated_prices`, `global_config` | iguales | Conservar |
| `documentos`, `eventos` | iguales | Ya existen en CRM, polimórficas. Pendiente feature frontend (fuera de fusión). |

---

## FASES

Cada FASE: 1 objetivo, 1 commit. TSC a 0 antes del commit. Si una FASE se queda a medias, el siguiente agente la retoma mirando el último commit.

### FASE 20.0 — Documentación y roadmap ✅
**Objetivo**: crear `CLAUDE.md` y `docs/ROADMAP_FUSION.md`.
**Entregables**: este fichero + CLAUDE.md.
**DONE**: `git log --oneline -1` → `docs(fase20.0): CLAUDE.md y roadmap de fusión CRM+Calculadora`.

### FASE 20.0.1 — Preparar `invoice_history` con consumo por período ✅
**Objetivo**: añadir columnas `consumption_p1..p6` y `surplus_p1..p6` a `invoice_history` para resolver Bug 2 del audit de Cowork.
**Ejecutado por**: Claude Cowork directamente en Supabase (abril 2026).
**SQL aplicado**:
```sql
ALTER TABLE invoice_history
  ADD COLUMN IF NOT EXISTS consumption_p1..p6 numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS surplus_p1..p6 numeric DEFAULT 0;
```
**Pendiente frontend**: consumir estas columnas en FASE 20.5c (migración de DataCapture) en lugar de tocar la versión legacy.
**DONE**: tabla pasa de 11 a 23 columnas, defaults a 0, registros existentes no rotos.

### FASE 20.1 — Regenerar tipos Supabase reales
**Objetivo**: eliminar `Database = any` de `src/core/supabase/client.ts`.
**Prerrequisito**: acceso a Supabase project-ref. El usuario debe ejecutar `supabase gen types typescript --project-id <REF> > src/core/types/database.ts` o copiar desde el dashboard Supabase (Settings → API → TypeScript types).
**Ficheros**:
- `src/core/types/database.ts` (nuevo, tipos generados).
- `src/core/supabase/client.ts`: `import type { Database } from '../types/database'`, eliminar `= any`.
- Eliminar los `as never` de: `src/features/oportunidades/api.ts`, `src/features/importador/components/ImportEmpresas.tsx`.
- Eliminar `src/core/types/entities.ts` (sustituido por `Database['public']['Tables'][...]`) o mantenerlo como capa de alias.
**DONE**: `npx tsc --noEmit` = 0, `npm run build` OK. Commit `fix(fase20.1): tipos Supabase reales, eliminar Database=any y casts as never`.

### FASE 20.2 — Merge de `main` en la branch CRM
**Objetivo**: traer commits de Cowork (`807781a`) a nuestra branch, resolver conflictos.
**Ficheros potencialmente conflictivos**: ninguno directamente (Cowork toca `src/modules/*` que no existen en CRM; CRM toca `src/features/*` que no existen en main). Posibles conflictos: `package.json`, `vite.config.ts`, `supabase-migration.sql`, `index.html`.
**Acciones**:
1. `git fetch origin main`.
2. `git merge origin/main --no-ff -m "merge: origin/main (Cowork fixes 1, 3, 4 + BOE 6.2/6.3/6.4TD) en branch CRM"`.
3. Resolver conflictos priorizando nuestros ficheros en `src/core/` y `src/features/`, los suyos en `src/modules/`, `src/lib/`, `src/hooks/`, `src/components/`.
4. En `tsconfig.json` mantener `"exclude": ["src/modules"]` temporal.
5. `npx tsc --noEmit` = 0.
**DONE**: `git log --oneline -5` muestra merge commit. Commit automático del merge.

### FASE 20.3 — Unificar auth (`useAuth`) apuntando a `user_profiles` canónica
**Objetivo**: eliminar `src/hooks/useAuth.tsx` legacy y adaptar `src/core/hooks/useAuth.ts` (CRM) para leer de la tabla canónica `user_profiles` (Calc). Portar al auth CRM la funcionalidad extra: roles `master/manager/consultant/client`, `approved`, jerarquía.
**Ficheros**:
- `src/core/hooks/useAuth.ts`: cambiar `.from('users_profile')` → `.from('user_profiles')`. Añadir campos `role`, `approved` al tipo. Implementar jerarquía (master=4 > manager=3 > consultant=2 > client=1).
- Eliminar `src/hooks/useAuth.tsx`.
- Buscar imports de `@/hooks/useAuth` y reemplazarlos por `@/core/hooks/useAuth`.
- SQL: migrar la única fila de `users_profile` a `user_profiles` si no existe ya, luego `DROP TABLE users_profile;` (migración `supabase/migrations/003_drop_users_profile.sql`). **Ejecutar solo después del commit de código**.
**DONE**: `grep -r "hooks/useAuth" src/` = 0 matches. `grep -r "users_profile" src/` = 0. TSC = 0. Commit `refactor(fase20.3): useAuth unificado leyendo de user_profiles canónica`.

### FASE 20.4 — Mover `src/lib/*` a `src/core/energia/` y `src/core/utils/`
**Objetivo**: vaciar `src/lib/` entero.
**Acciones**:
- `src/lib/calculator.ts` → `src/core/energia/calculator.ts`.
- `src/lib/tariffs.ts` → `src/core/energia/tariffs.ts`.
- `src/lib/supabase.ts` → eliminar, redirigir imports a `src/core/supabase/client.ts`.
- `src/lib/utils.ts` → fusionar con `src/core/utils/` (revisar duplicados con `src/core/utils/dates.ts`, `energy.ts`, `logger.ts`).
- Actualizar imports en todo `src/modules/*` y cualquier otro consumidor.
**DONE**: `src/lib/` vacío o eliminado. TSC = 0 (con `src/modules` aún excluido). Commit `refactor(fase20.4): src/lib → src/core/energia + src/core/utils`.

### FASE 20.5 — Migrar módulos Calc uno a uno a `src/features/`
Sub-fases independientes. Cada una: un módulo, un commit, TSC = 0, ruta funcional.

#### FASE 20.5.a — `Clients` → fusionar con `empresas`
Eliminar `src/modules/Clients.tsx`. Todos los accesos a tabla `clients` se refactorizan para usar `empresas`. Si aún hay datos en `clients` vivos, se añade una migración SQL `supabase/migrations/004_merge_clients_empresas.sql`.
**DONE**: `clients` ya no se referencia en código. Commit `refactor(fase20.5a): fusionar Clients con empresas`.

#### FASE 20.5.b — `AdminPanel` → `src/features/admin/`
Split en subcomponentes: `AdminPage.tsx` con tabs (Usuarios, Comercializadoras, Ofertas, Config). Cada tab como componente separado en `components/`.
**DONE**: ruta `/admin` funcional. Commit `feat(fase20.5b): migrar AdminPanel a features/admin`.

#### FASE 20.5.c — `DataCapture` → `src/features/datos/`
Subcomponentes: `ClienteSection`, `PuntoSuministroSection`, `HistoricoFacturasSection`. Añadir edición (problema 7 de Cowork).
**DONE**: ruta `/datos` funcional. Commit `feat(fase20.5c): migrar DataCapture a features/datos con edición`.

#### FASE 20.5.d — `Analysis` → `src/features/analisis/`
Mantener lógica `calculator.ts` (ya movido en 20.4).
**DONE**: ruta `/analisis` funcional. Commit `feat(fase20.5d): migrar Analysis a features/analisis`.

#### FASE 20.5.e — `Proposals` → `src/features/propuestas-energia/`
Diferenciar claramente de CRM `propuestas` (comercial). Renombrar tabla `proposals` a `analisis_comparativo` en migración `supabase/migrations/005_rename_proposals.sql`.
**DONE**: ruta `/propuestas-energia` funcional. Commit `feat(fase20.5e): migrar Proposals a features/propuestas-energia`.

#### FASE 20.5.f — `Tracking` → `src/features/tracking/`
Implementar botón "Generar PDF" de "Próximos Pasos" (observación menor de Cowork).
**DONE**: ruta `/tracking` funcional. Commit `feat(fase20.5f): migrar Tracking a features/tracking con PDF`.

#### FASE 20.5.g — `Dashboard` fusionar CRM + Calc
Añadir KPIs de Calculadora al `DashboardPage.tsx` de CRM: total ahorro identificado, % medio, últimos análisis, ConsultantChat embedido.
**DONE**: Dashboard muestra ambos dominios. Commit `feat(fase20.5g): dashboard unificado CRM+Calculadora`.

### FASE 20.6 — Eliminar `src/modules/` y `src/components/*` legacy
**Objetivo**: borrar carpetas vacías/legacy, quitar exclusión del `tsconfig.json`.
**Acciones**:
- Eliminar `src/modules/`.
- Eliminar `src/hooks/`.
- Eliminar `src/lib/`.
- Mover `src/components/Layout.tsx`, `LoginPage.tsx`, `ConsultantChat.tsx`, `StatCard.tsx`, `EmptyState.tsx`, `ErrorBoundary.tsx` a sus destinos (`src/core/layout/`, `src/features/chat-ia/`, `src/core/components/`). Si algo aún no tiene destino claro, parar y decidir.
- Mantener `src/components/ui/` (shadcn).
- `tsconfig.json`: eliminar `"exclude": ["src/modules"]`.
**DONE**: `find src -type d` no contiene `modules/`, `hooks/`, `lib/`. TSC = 0. Commit `refactor(fase20.6): eliminar estructura legacy flat`.

### FASE 20.7 — Unificar schema Supabase
**Objetivo**: una sola migración consolidada. Eliminar duplicaciones. (Nota: `users_profile` ya fue dropeada en FASE 20.3.)
**Acciones**:
1. `supabase/migrations/006_unify_schema.sql`:
   - Migrar `clients` → `empresas` con mapeo de campos y transformar `consultor_asignado (email TEXT)` → `comercial_id (UUID FK user_profiles)` via `SELECT id FROM user_profiles WHERE email = clients.consultor_asignado`.
   - Migrar `supply_points` → `cups`.
   - Renombrar `invoice_history` → `facturas`.
   - Añadir FKs necesarias.
   - DROP tablas vacías: `clients`, `supply_points`.
2. Actualizar queries en `src/features/admin/api.ts`, `src/features/analisis/api.ts`, `src/features/datos/api.ts`, etc.
**DONE**: TSC = 0, schema consistente, app arranca sin errores runtime. Commit `feat(fase20.7): unificar schema Supabase, eliminar tablas duplicadas`.

### FASE 20.8 — Mover chat Gemini a Edge Function
**Objetivo**: quitar la API key del cliente (problema 6 del audit).
**Acciones**:
- Crear `supabase/functions/chat-consultor/index.ts` (Deno) con la lógica de llamada a Gemini, leyendo `GEMINI_API_KEY` de secrets de Supabase.
- Refactorizar `src/features/chat-ia/ChatIAPanel.tsx` para llamar a `supabase.functions.invoke('chat-consultor', { body: { messages } })`.
- Quitar `import.meta.env.VITE_GEMINI_API_KEY` del cliente.
- Documentar en README cómo setear el secret.
**DONE**: chat funciona, API key no visible en bundle. Commit `feat(fase20.8): chat Gemini vía Edge Function, quitar API key del cliente`.

### FASE 20.9 — RLS granular
**Objetivo**: endurecer policies (problema 5).
**Acciones**:
- `supabase/migrations/007_rls_multitenant.sql`:
  - Policy `empresas`: `comercial_id = auth.uid() OR role IN ('master','manager')`.
  - Idem `contactos`, `contratos`, `oportunidades`, `actividades`, `propuestas`, `facturas` (vía JOIN con `cups.empresa_id`).
  - `analisis_comparativo`: FK a `cups`, policy via empresa.
- Probar con dos usuarios reales (uno `consultant`, uno `master`).
**DONE**: usuario `consultant` solo ve sus empresas. Commit `feat(fase20.9): RLS multitenant por comercial_id`.

### FASE 20.10 — Pendientes menores del audit
- Botón **Editar** en Ofertas (Cowork problema 8) — cubierto en FASE 20.5b si se incluye edición.
- Botón **Editar** en Facturas y Puntos de suministro (Cowork problema 7) — cubierto en FASE 20.5c.
- ~~Bug 2 (columnas por período en `invoice_history`)~~ — **ya aplicado en BD en FASE 20.0.1**. Queda solo consumirlas desde el frontend en FASE 20.5c.
- Quitar `autoprefixer` de `devDependencies` (Tailwind 4 no lo necesita).
- Features nuevas a valorar (fuera de fusión estricta): aprovechar `documentos` y `eventos` (tablas polimórficas ya creadas) para un módulo de documentos adjuntos y un calendario/agenda.
**DONE**: audit 100% cerrado. Commit `fix(fase20.10): cerrar pendientes del audit Cowork`.

---

## Checklist final de la fusión

- [ ] Todas las FASES 20.0 → 20.10 commiteadas y pusheadas.
- [ ] PR #1 actualizado con el rango completo.
- [ ] `npx tsc --noEmit` = 0.
- [ ] `npm run build` OK.
- [ ] `npm run dev`: login → dashboard → navegar por las 11+ rutas → funciona todo.
- [ ] Schema Supabase sin tablas duplicadas.
- [ ] API keys Gemini fuera del cliente.
- [ ] RLS granular probado con 2 roles.

## Recomendación operativa

Trabajar **una FASE por conversación de Claude Code**. Al empezar una conversación nueva:
1. `git log --oneline -10` para ver dónde se quedó.
2. Leer `CLAUDE.md` (automático en Claude Code).
3. Abrir `docs/ROADMAP_FUSION.md` y buscar la siguiente FASE no marcada como DONE.
4. Ejecutar.
5. Commit + push + actualizar este fichero (marcar la FASE con ✅).
6. `/compact` o cerrar.

Esto garantiza que ninguna FASE dependa de memoria del chat anterior.
