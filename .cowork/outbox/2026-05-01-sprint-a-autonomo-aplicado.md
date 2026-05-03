# Handoff 2026-05-01 — Sprint A autónomo aplicado

**De:** Claude Cowork (sesión 2026-05-01 tarde, autónoma)
**Para:** Claude Code / Juan
**Tipo:** trabajo aplicado en producción + cambios frontend pendientes de TSC.

---

## Resumen ejecutivo

Tras presentar la auditoría `docs/AUDIT_2026-05-01_MEJORAS_CRM.md`, Juan dio luz verde para avanzar de forma autónoma. Esta sesión aplica **6 sub-fases del Sprint A (FASE 30)**:

| Sub-fase | Estado | Aplicado en BD prod | Frontend modificado |
|---|---|---|---|
| 30.1 — pg_cron daily-contract-check | ✅ aplicado | ✅ migration + cron (jobid 3) | n/a |
| 30.4 — Importes en Kanban | ✅ aplicado | n/a | KanbanCard, KanbanColumn |
| 30.5 — Wizard contacto decisor | ✅ aplicado | n/a | EmpresasPage |
| 30.6 — Asociar Datadis a empresa | ✅ aplicado | n/a | DatadisPage, datadis/api.ts, AsociarEmpresaDialog (nuevo) |
| 30.8 (aditiva) — incidencias.cups_id | ✅ aplicado | ✅ migration | n/a (frontend pendiente FASE 30.8b) |
| 30.10 — Sentry SDK base | ✅ aplicado | n/a | main.tsx, useAuth.ts, logger.ts, sentry.ts (nuevo), .env.example, package.json |

Pendientes del Sprint A (con razón):
- **30.2** Consolidar renovaciones↔oportunidades — necesita decisión de Juan.
- **30.3** Cerrar migración FASE 21.a (etapas legacy) — destructivo, pendiente decisión.
- **30.7** Vinculación masiva Datadis por NIF — depende de Edge Function nueva con credenciales Datadis.
- **30.9** Aplicar RLS granular FASE 20.9 — requiere observación tabla a tabla con EXPLAIN ANALYZE; mejor en sesión dedicada con Juan presente.

---

## Cambios aplicados en BD producción (proyecto `gtphkowfcuiqbvfkwjxb`)

Aplicados vía Supabase MCP (`apply_migration`):

### Migration `fase30_1_daily_contract_check_pgcron`
- Nueva función SQL `public.run_daily_contract_check()` que replica la lógica del Edge Function en plpgsql (vence contratos + crea oportunidad de renovación + tarea + notificación).
- Cron `daily_contract_check` programado para `0 4 * * *` (jobid 3, active=true).
- **Verificado**: ejecución manual devolvió `{"vencidos":0,"oportunidades_creadas":0,...}` sin errores. Se ejecutará automáticamente cada día a las 04:00 UTC.
- Espejo en repo: `supabase/migrations/20260501_fase30_1_daily_contract_check_pgcron.sql`.

### Migration `fase30_8_incidencias_cups_id_fk`
- `incidencias` ALTER ADD `cups_id uuid REFERENCES cups(id)`.
- Índice parcial `idx_incidencias_cups_id` (WHERE deleted_at IS NULL).
- UPDATE de población desde `cups: text` → `cups_id` por `codigo_cups` (0 filas afectadas, tabla estaba vacía).
- **La columna `cups: text` se mantiene** por compatibilidad. Eliminar en FASE 30.8b cuando frontend lea cups_id.
- Espejo en repo: `supabase/migrations/20260501_fase30_8_incidencias_cups_id_fk.sql`.

### Estado de la BD tras aplicar
- 24 empresas, 2 contratos activos, 4 oportunidades, 1 contacto, 0 incidencias, 0 renovaciones, 72 CUPS.
- 3 cron jobs activos: `cleanup_pending_users_daily`, `holded_worker_5min`, `daily_contract_check`.

---

## Cambios frontend (pendientes de TSC + tests + commit)

### FASE 30.4 — Importes en Kanban
- `src/features/oportunidades/components/KanbanCard.tsx`: muestra `valor_estimado_eur` (formateado EUR ES) y `ahorro_anual_estimado` (badge emerald "Ahorro: €X/año") debajo del tipo de oportunidad. Nulls/zeros ocultos.
- `src/features/oportunidades/components/KanbanColumn.tsx`: header de columna suma valor y ahorro de las cards. Helper `eur()` con `Intl.NumberFormat`.

### FASE 30.5 — Wizard contacto decisor
- `src/features/empresas/EmpresasPage.tsx`: convertido a wizard 2 pasos al CREAR (no afecta a EDIT).
  1. Paso 1: form de empresa inline → `useCreateEmpresa.mutateAsync(values)` devuelve `Empresa`.
  2. Paso 2: modal con `ContactoForm` precargado con `empresa_id` y `es_decisor=true`.
  3. Si el usuario cierra el paso 2: `ConfirmDialog` pidiendo confirmación explícita "Crear sin contacto".
- Reutiliza `useCreateContacto` de `features/contactos/api.ts` y el componente `ContactoForm` ya existente.

### FASE 30.6 — Asociar suministro Datadis a empresa CRM
- `src/features/datadis/components/AsociarEmpresaDialog.tsx` (nuevo): modal con búsqueda debounced (250ms) sobre `empresas`, lista de resultados, botón "Asociar".
- `src/features/datadis/api.ts`: hook `useAsociarSuministroAEmpresa()` que hace `cups.upsert(..., { onConflict: 'codigo_cups' })` mapeando `DatadisSupply` → columnas de `cups` (incluye `datadis_sincronizado=true`, `datadis_ultima_sync=now()`).
- `src/features/datadis/DatadisPage.tsx`: botón "Asociar" (icono `Link2`) en cada fila + estado para abrir el dialog.
- **Verificado**: tabla `cups` tiene unique constraint `cups_codigo_cups_key UNIQUE (codigo_cups)` — el upsert funcionará.

### FASE 30.10 — Sentry SDK base
- `package.json`: `"@sentry/react": "^10.0.0"` añadido a deps. **Code: `npm install` antes de TSC**.
- `src/core/utils/sentry.ts` (nuevo): wrapper lazy. `initSentry()` carga el SDK dinámicamente sólo si `VITE_SENTRY_DSN` está definido. Expone `captureException`, `getReactErrorHandler`, `setSentryUser`, `isSentryEnabled`.
- `src/main.tsx`: llama a `initSentry()` y registra `onUncaughtError` + `onRecoverableError` en el `createRoot` de React 19.
- `src/core/hooks/useAuth.ts`: tras login, llama a `setSentryUser({id, email})`. Tras logout, `setSentryUser(null)`.
- `src/core/utils/logger.ts`: `logError` reenvía a `captureException(error, context)` (no-op si Sentry no inicializado).
- `.env.example`: documentadas `VITE_SENTRY_DSN` y `VITE_SENTRY_ENVIRONMENT` (ambas opcionales).

**Comportamiento por defecto sin DSN**: no carga `@sentry/react`, no envía eventos, sin coste runtime ni de bundle (lazy import).

---

## Pre-requisitos antes de mergear a main

1. **Cerrar TSC pendiente de Sprint Potencias** (`docs/SPRINT3_TSC_PENDIENTE.md`). Si se mergea esta rama antes, se mezclará con los ~60 errores TSC.
2. **`npm install`** para instalar `@sentry/react`.
3. **`npx tsc --noEmit`** para validar que todos los cambios compilan.
4. **`npm test`** para que los 33 tests existentes sigan pasando (no se han añadido tests nuevos).
5. **Sanity check manual en localhost:3000**:
   - Crear empresa nueva → debe aparecer paso 2 "Primer contacto".
   - Pipeline Kanban → cards muestran valor y ahorro.
   - DatadisPage → botón "Asociar" funcional (probar con un CUPS).
   - Sin DSN, app arranca normal (Sentry no se carga).

---

## Decisiones que necesitan input de Juan (Sprint A pendiente)

### 30.2 — Consolidar `renovaciones` vs `oportunidades.tipo='renovacion'`
La tabla `renovaciones` está vacía (0 rows). Recomendación firme: **eliminar la tabla y usar oportunidades**. Pero antes confirmar:
- ¿El módulo `/renovaciones` debe seguir siendo una vista separada en sidebar? (Probablemente sí — lo refactorizamos para que filtre `oportunidades.tipo='renovacion'`.)
- ¿Hay procesos externos (Holded? backups?) que dependan de la tabla `renovaciones`?

### 30.3 — Etapas legacy en oportunidades
Hay 4 oportunidades en BD. ¿Sus etapas son ya las nuevas (energéticas) o las viejas? Si son las viejas, la migration 30.3 las re-mapeará automáticamente. Verificar antes:
```sql
SELECT etapa, count(*) FROM oportunidades WHERE deleted_at IS NULL GROUP BY etapa;
```

### 30.9 — RLS granular
Aplicarlo requiere:
1. EXPLAIN ANALYZE de `SELECT * FROM oportunidades` antes y después en cada tabla.
2. p95 < 500 ms como criterio.
3. Rollback inmediato si excede.

Recomiendo hacer esta sub-fase en sesión coordinada con Juan presente, no autónoma.

---

## Comandos sugeridos para Code (PowerShell Windows)

```powershell
cd C:\Users\joliv\valere-v2

# 0. Antes: cerrar TSC pendiente Potencias (ver docs/SPRINT3_TSC_PENDIENTE.md)

# 1. Instalar Sentry
npm install

# 2. Verificar TSC
npx tsc --noEmit

# 3. Tests
npm test -- --run

# 4. Si todo OK, ver diff y commitear:
git add `
  supabase/migrations/20260501_fase30_1_daily_contract_check_pgcron.sql `
  supabase/migrations/20260501_fase30_8_incidencias_cups_id_fk.sql `
  src/features/oportunidades/components/KanbanCard.tsx `
  src/features/oportunidades/components/KanbanColumn.tsx `
  src/features/empresas/EmpresasPage.tsx `
  src/features/datadis/DatadisPage.tsx `
  src/features/datadis/api.ts `
  src/features/datadis/components/AsociarEmpresaDialog.tsx `
  src/features/incidencias/api.ts `
  src/main.tsx `
  src/core/hooks/useAuth.ts `
  src/core/utils/logger.ts `
  src/core/utils/sentry.ts `
  .env.example `
  package.json `
  package-lock.json `
  docs/AUDIT_2026-05-01_MEJORAS_CRM.md `
  docs/ROADMAP_FUSION.md `
  docs/ESTADO.md `
  docs/SESIONES/2026-05-01-resumen.md `
  .cowork/outbox/2026-05-01-audit-mejoras-crm-handoff.md `
  .cowork/outbox/2026-05-01-sprint-a-autonomo-aplicado.md

git commit -m "feat(fase30.1+30.4+30.5+30.6+30.8+30.10): sprint A autonomo aplicado

- BD prod (via MCP):
  - run_daily_contract_check() + cron 04:00 UTC (FASE 30.1)
  - incidencias.cups_id uuid FK + index + populate (FASE 30.8 aditiva)
- Frontend:
  - Kanban muestra valor_estimado_eur y ahorro_anual_estimado (FASE 30.4)
  - Wizard 2 pasos al crear empresa: empresa + contacto decisor (FASE 30.5)
  - Boton 'Asociar a empresa' en DatadisPage con dialog de busqueda (FASE 30.6)
  - Sentry SDK lazy con DSN opcional, init en main, hook useAuth, reenvio logger (FASE 30.10)
- Docs:
  - Auditoria 2026-05-01 + roadmap FASE 30-33 + estado + sesion
"

git push origin claude/sprint2-lib-potencias
```

---

## Lo que NO se ha hecho

- **No hay commits en git**. La rama `claude/sprint2-lib-potencias` sigue como estaba — todo es trabajo en working tree + BD producción.
- **No hay tests nuevos** para los componentes/hooks añadidos. Cobertura sigue ~3%. Se aborda en FASE 33.3.
- **Edge Function `daily-contract-check`** NO se desplegó (la lógica vive en SQL ahora). El archivo `supabase/functions/daily-contract-check/index.ts` queda como referencia/backup manual; se puede borrar o dejarlo como documentación.
- **Sentry DSN no creado**. Si quieres activarlo, crea proyecto en sentry.io plan free y pega DSN en `.env`.

---

## Reglas aprendidas en esta sesión

- Cuando el navegador dice "no hay cron", hay que verificar que el Edge Function exista deployed antes — descubrí que `daily-contract-check` no estaba ni desplegado, así que la migración por SQL es más limpia que el HTTP-call patrón.
- `SECURITY DEFINER` + `search_path` explícito es el patrón correcto para funciones invocadas por pg_cron en Supabase.
- Subagentes en paralelo funcionan bien para UI work; evitar para lógica de schema (mejor gestión secuencial con verificación BD entre pasos).
- El index del repo en sandbox Linux está corrupto (`g\xc4\xb1S` extension). Funciona con `git --no-optional-locks` para lectura. Para escritura/commit, hacerlo desde PowerShell Windows.

— Cowork, 1 mayo 2026 (sesión autónoma).
