# Sprint domingo — Pulido módulos CRM + observabilidad básica

Fecha: 2026-06-12
Agente: Cowork (Claude)
Estado: parcial — bloqueado por incidencia técnica de filesystem

## Lo entregado

### Archivos NUEVOS (persisten ✅)
- `docs/AUDIT_MODULOS_2026-06-12.md` — auditoría de los 8 módulos.
- `docs/PULIDO_MODULOS_2026-06-12.md` — reporte final con recetas de reaplicación.
- `src/core/components/ErrorState.tsx`
- `src/core/components/FieldError.tsx`
- `src/core/utils/validators.ts` — NIF, CIF, NIE, CUPS, teléfono ES, email, CP.
- `src/core/utils/validators.test.ts` — **24/24 tests pasan** verificado en sandbox.
- `src/features/admin/TelemetriaPage.tsx` — pantalla `/admin/telemetria`.
- `supabase/functions/client-telemetry-ingest/` (Edge Function + config.toml).
- 8 smoke tests: `src/features/<modulo>/<Modulo>Page.smoke.test.tsx`.

### Base de datos (aplicado en prod via MCP ✅)
- Migración `client_telemetry` aplicada en proyecto `gtphkowfcuiqbvfkwjxb`. Tabla + RLS:
  - INSERT: cualquier authenticated.
  - SELECT: solo `master`/`admin`/`manager`.

### Edits sobre archivos existentes — VERIFICAR ⚠️
Durante la sesión el linter/watcher revirtió varios edits sobre archivos ya existentes (ver "Incidencia" abajo). El siguiente listado puede haberse o no persistido — el reporte tiene recetas de cómo reaplicar:

- `src/core/utils/telemetry.ts` — trackEvent, trackRouteChange, trackSupabaseQuery, getOrCreateCorrelationId, flush a backend.
- `src/core/components/ErrorBoundary.tsx` — resetKey, botón Reportar, mensaje enmascarado en prod, correlation id.
- `src/App.tsx` — RouteTracker, ruta /admin/telemetria, resetKey={location.pathname} en ErrorBoundary.
- `src/features/empresas/components/EmpresaForm.tsx` — validators NIF/CIF/CP/teléfono.
- `src/features/contactos/components/ContactoForm.tsx` — validators teléfono ES.
- `src/features/{contactos,contratos,actividades,calendario,incidencias,renovaciones,oportunidades}/...Page.tsx` — ErrorState en cada query, error/refetch destructuring.
- `src/features/oportunidades/OportunidadesPage.tsx` — confirm dialog al cerrar ganada (drag-drop), EmptyState para pipeline vacío.
- `src/features/actividades/api.ts` — `useToggleTareaCompletada` con optimistic update + rollback. **Snapshot reciente confirma persistido ✅**.

## Acción inmediata para próxima sesión

1. `git status` y `git diff` en Windows (no en sandbox) para confirmar qué edits persistieron.
2. Para los que falten, copiar las recetas de `docs/PULIDO_MODULOS_2026-06-12.md` sección "Cómo reaplicar".
3. Desplegar la Edge Function:
   ```powershell
   npx supabase functions deploy client-telemetry-ingest --project-ref gtphkowfcuiqbvfkwjxb
   ```
4. Una vez reaplicados los wirings, lanzar smoke tests + validators.test:
   ```powershell
   npx vitest run src/core/utils/validators.test.ts src/features/**/*.smoke.test.tsx
   ```
5. Verificar TSC: `npx tsc --noEmit` debe quedar a 0 errores.

## Sin commits

NO se ha commiteado nada. La rama es `main` (otros sprints en paralelo).

## NO se tocó

Confirmado: NO he tocado `supabase/functions/generar-propuesta-pptx/`, `src/features/analisis/AnalisisPage.tsx`, `src/features/propuestas-energia/`, ESIOS/datadis, `src/features/auth/`, `src/features/admin/PendingUsersPage*`, `src/features/dashboard/`, `src/features/informes/`.

## Bugs detectados (NO arreglados — fuera de scope)

Registrados en `AUDIT_MODULOS_2026-06-12.md`:
1. **Oportunidades**: drag-drop a "cerrada_ganada" auto-crea contrato sin confirm (parche sí estaba listo — verificar si persiste).
2. **Contratos**: `validateCUPS()` no se invoca en el form (el form no captura CUPS — está en detalle). Sprint dedicado.
3. **Calendario**: `EventoForm` ya usa `ConfirmDialog` ✅ (era falsa alarma de auditoría inicial).
4. **Contactos**: `useContactos` carga lista completa sin paginación → revisar si > 200 contactos en cuentas reales.

## Incidencia técnica 🛑

Filesystem entre Windows ↔ sandbox Linux desincronizado durante la sesión. Edits `Edit` sobre archivos existentes se reflejaban en `Read` (Windows) pero NO en bash/vitest (Linux mount mostraba bytes pre-edit, p.ej. 16033 bytes en IncidenciasPage.tsx). Tests fallaban con "Unexpected end of file" porque esbuild leía la versión corrupta.

Causa posible: CRLF/LF + algún linter externo revirtiendo silenciosamente. Otros sprints en paralelo (Fase 2 + ESIOS + Datadis) escriben main al mismo tiempo.

**Recomendación**: si vuelve a pasar, hacer una pasada de `git status` en Windows real y `dos2unix` sobre archivos sospechosos. Considerar bloquear sprint paralelos sobre los mismos paths.

## Bloqueo real

NO hay bloqueo. Los wirings pendientes son mecánicos y están documentados línea a línea en `PULIDO_MODULOS_2026-06-12.md`. La próxima sesión puede terminar el sprint en < 30 min siguiendo las recetas.
