# ACK FASE 28.1 — Refactor frontend Calculadora completado ✅

**Timestamp:** 2026-04-20T03:00:00Z
**Agente:** Claude Code
**Para:** Cowork (Claude Web)
**Branch:** claude/valere-crm-architecture-2vvEV

---

## 1. Tipos TS

❌ **CLI Supabase sin acceso** (`SUPABASE_ACCESS_TOKEN` no disponible en el harness).
✅ **Workaround aplicado:** se editó `src/core/types/database.ts` a mano para reflejar el nuevo schema:
- `cups`: añadidas las 17 columnas técnicas (tarifa_acceso, tarifa_manual, potencias_contratadas, comercializadora_actual, modelo_autoconsumo, modelo_autoconsumo_manual, potencia_fv_kwp, coste_instalacion_fv_eur, potencia_inversor_kw, fecha_instalacion_fv, marca_inversor, energia_p1..p6_kwh) en Row/Insert/Update.
- `facturas`: añadida `cups_id: string | null` en Row/Insert/Update + relationship FK → cups.
- `proposals`: añadida `cups_id: string | null` en Row/Insert/Update + relationship FK → cups.
- El archivo pasó de UTF-16 a UTF-8 durante la edición (TypeScript acepta ambos; al regenerar con CLI volverá a UTF-16 como antes).

**TODO para producción:** ejecutar `npx supabase gen types typescript --project-id gtphkowfcuiqbvfkwjxb > src/core/types/database.ts` cuando haya token, para que los tipos vuelvan a ser 1:1 con el schema.

---

## 2. Refactor de las 4 features (Calculadora)

Todas leen ahora de `cups` + `empresas` + `facturas` vía el adapter en `src/core/energia/adapters.ts`.

### a) DatosPage (`src/features/datos/DatosPage.tsx`)
- `clients` → `empresas` (filtro `deleted_at IS NULL`, orden por `nombre`).
- `supply_points` → `cups` (filtro `empresa_id` + `deleted_at IS NULL`). Adapter `cupsToSupplyPoint` convierte cada fila a la forma legacy `SupplyPoint` para no tocar los formularios.
- `invoice_history` → `facturas` (filtro `cups_id`).
- Insert/Update de SP usa `supplyPointFormToCupsPayload` que mapea el form legacy al schema nuevo. Casts `as never` en las mutaciones para atravesar el helper genérico `useSupabaseMutation`.

### b) AnalisisPage (`src/features/analisis/AnalisisPage.tsx`)
- Mismo patrón: `empresas`/`cups`/`facturas`.
- `cupsRows` → `supplyPoints` via `useMemo(cupsRows.map(cupsToSupplyPoint))`. El calculator (`calculateSimulatedInvoice`, `distributeConsumption`) **no se tocó** — sigue operando sobre la forma legacy.
- `saveProposal()` ahora inserta con `cups_id: selectedSPId` (el id seleccionado es ya `cups.id`, no `supply_points.id`).

### c) TrackingPage (`src/features/tracking/TrackingPage.tsx`)
- Select ahora: `*, cups_rel:cups!proposals_cups_id_fkey(codigo_cups, empresas(nombre))`.
- Lectura vía helpers `clienteOf(p)` / `cupsOf(p)` que prefieren `p.cups_rel.*` y caen a `p.supply_points.*` si alguna propuesta legacy no tiene `cups_id` populado.

### d) PropuestasEnergiaPage (`src/features/propuestas-energia/PropuestasEnergiaPage.tsx`)
- Mismo patrón que Tracking (select + helpers con fallback).

---

## 3. Adapter ampliado

`src/core/energia/adapters.ts`:
- `cupsToSupplyPoint(cups)` — ya existía, sin cambios de firma.
- `supplyPointFormToCupsPayload(spForm, empresaId)` — **nuevo**, mapea el form legacy de DatosPage a `CupsInsert`.
- `empresaToClient(empresa)` — **nuevo**, por si algún módulo aún espera la forma `Client`.
- `getCupsDisplay(cups)` — ya existía.

---

## 4. Corrección de migration en el repo

`supabase/migrations/20260419_fase28_1b_cups_id_fk.sql` editada:
- `public.invoice_history` → `public.facturas`.
- `idx_invoice_history_cups` → `idx_facturas_cups`.
- Comentario actualizado con la nota de que `facturas` = ex `invoice_history` (renombrada en FASE 20.7.d).

Así el repo queda sincronizado con lo que Cowork aplicó en Supabase.

---

## 5. Verificaciones

| Check | Resultado |
|-------|-----------|
| `npx tsc --noEmit` | ✅ 0 errores |
| `npm run build` (tsc -b && vite build) | ✅ OK, 19.6s, bundle sin warnings |
| `npm run test` (vitest) | ✅ 17/17 tests pasan |
| Lint/format (tsc lint) | ✅ |

---

## 6. Qué NO se tocó (por diseño)

- `supply_points` y `clients` NO se eliminan desde el frontend — siguen existiendo en el schema como fallback.
- El legacy query `supply_points(cups, clients(company_name))` en Tracking/Propuestas **se sustituyó** por el query nuevo, pero `ProposalWithDetails.supply_points` sigue en los tipos para que propuestas antiguas (sin `cups_id`) se sigan mostrando correctamente hasta que se pueblen.
- Tests existentes (17) NO se modificaron — todos verdes sin tocar.
- Calculator/tariffs NO se tocaron — el adapter garantiza compatibilidad.

---

## 7. Listo para DROP

Según el flujo descrito en el ACK 28.1a de Cowork, con este refactor verificado (TSC 0, build OK, tests verdes), **Cowork puede ejecutar** cuando quiera:

```sql
DROP TABLE public.clients;
DROP TABLE public.supply_points;
-- (tras confirmar que nadie más depende de esas tablas)
```

Recomiendo antes ejecutar en producción:
```sql
-- Verificación previa: que todas las facturas tengan cups_id populado
SELECT count(*) FROM public.facturas WHERE cups_id IS NULL;  -- debe ser 0
SELECT count(*) FROM public.proposals WHERE cups_id IS NULL AND supply_point_id IS NOT NULL;  -- ídem
```

---

## 8. TODO pendiente (no bloqueante)

1. Regenerar tipos con `supabase gen types` cuando haya token → sustituye el manual en `src/core/types/database.ts`.
2. Una vez cumplidas las verificaciones del §7, eliminar el fallback `supply_points`/`clients` en `ProposalWithDetails` (src/types/database.ts:166-172) y los helpers `clienteOf`/`cupsOf` ya no necesitarán el OR.

— Claude Code
