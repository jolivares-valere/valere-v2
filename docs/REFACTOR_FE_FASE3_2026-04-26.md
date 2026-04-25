# Fase 3 — Refactor frontend tras renames de tabla

> Generado por sprint autónomo 6 (2026-04-26).
> Lista exhaustiva de archivos a modificar tras aplicar
> `supabase/migrations/20260426_fase1_unificacion_renames_schema.sql`.

## Mapping de cambios

| Antes (legacy) | Después (canónico) |
|---|---|
| Tabla `retailers` | `comercializadoras` |
| Tabla `retailer_offers` | `comercializadora_ofertas` |
| Tabla `boe_regulated_prices` | `precios_regulados_boe` |
| Tabla `proposals` | **eliminada** (residuo Calculadora pre-fusión, 0 rows) |
| Columna `retailer_offers.retailer_id` | `comercializadora_ofertas.comercializadora_id` |

## Archivos a tocar (8)

### `src/features/admin/AdminPage.tsx`
- Línea 151: `table: 'retailers'` → `table: 'comercializadoras'`
- Línea 300: `table: 'retailer_offers'` → `table: 'comercializadora_ofertas'`
- Línea 304: `useSupabaseQuery<Retailer>({ table: 'retailers' })` → `useSupabaseQuery<Comercializadora>({ table: 'comercializadoras' })`
- Línea 314, 321, 337, 373, 439, 440: `retailer_id` → `comercializadora_id`

### `src/features/analisis/AnalisisPage.tsx`
- Línea 158: `.from('retailer_offers')` → `.from('comercializadora_ofertas')`
- Línea 165: `.from('boe_regulated_prices')` → `.from('precios_regulados_boe')`
- Línea 248: `supabase.from('proposals').insert({...})` → **revisar si esto guarda algo útil**, en cuyo caso reescribir contra `propuestas` (CRM canónica) o eliminar el guardado.

### `src/features/tracking/TrackingPage.tsx`
- Línea 20: `table: 'proposals'` → **revisar caso de uso**. El propósito de `tracking` es seguir propuestas comerciales — actualizar a `propuestas` (CRM canónica) si encaja, o eliminar la página si era de la Calculadora pre-fusión.

### `src/features/propuestas-energia/PropuestasEnergiaPage.tsx`
- Línea 25: `table: 'proposals'` → **revisar**. Igual que tracking — quizás se reescribe sobre `propuestas` o se elimina.

### `src/types/database.ts` (tipos legacy de Calculadora)
- Línea 80: `retailer_id: string` → `comercializadora_id: string`
- Probablemente todo este archivo está obsoleto y se sustituye por `src/core/types/database.ts`. Verificar.

### `src/core/types/database.ts` (tipos generados Supabase)
- Líneas 1534, 1556, 1578, 1586, 1587: regenerar tipos (`mcp__generate_typescript_types`) tras aplicar la migration. Los nombres de tabla y columna se actualizan automáticamente.

### `src/features/asistente-crm/components/SourcesCitation.tsx`
Si hay docs `help/` que mencionen las tablas viejas, regenerar embeddings (workflow GitHub se autoejecuta al modificar `docs/help/`).

## Caso especial: `proposals` (tabla eliminada)

Tres archivos invocan `proposals`. Antes de eliminar la tabla, hay que decidir qué hacer con cada feature:

1. **`AnalisisPage.tsx` línea 248** — el flujo de "guardar análisis" hace `.insert` a `proposals`. Si es legacy (la página fue migrada en FASE 20), eliminar el insert. Si es necesario, reescribir contra `propuestas` con el `tipo='analisis_calculadora'`.

2. **`TrackingPage.tsx`** — feature de tracking de propuestas. La tabla canónica `propuestas` ya tiene el flujo. Migrar la página o eliminarla.

3. **`PropuestasEnergiaPage.tsx`** — idem.

**Recomendación**: hacer un grep del FE por "proposals" / "Proposal" y consolidar las 3 features en una sola que opere sobre la canónica `propuestas`. Es trabajo de medio día. Si no se hace, la Fase 1 migration tiene que dejar `proposals` viva (volver a crearla) hasta que el FE se limpie.

**Alternativa rápida**: aplicar Fase 1 SIN el `DROP TABLE proposals`, dejar la tabla viva pero "frozen" (sin escrituras nuevas), y limpiar en sprint posterior. La migration tiene esto fácil de modificar — comentar la línea `drop table if exists public.proposals;`.

## Caso especial: columnas en `retailers`/`comercializadoras`

La tabla `retailers` ya tenía columnas duplicadas tras `unificacion_potencias_aditiva` (sprint 4):
- `name` (legacy) y `nombre_normalizado` (canónica)
- `is_active` (legacy) y `activa` (canónica)

**Recomendación**: la Fase 1 NO toca estas. El FE sigue usando `name` e `is_active` mientras tanto. En un sprint futuro, después de:
1. Backfillear `name` ↔ `nombre_normalizado` para que ambas siempre coincidan (trigger).
2. Migrar el FE a leer/escribir `nombre_normalizado` y `activa`.
3. Drop columnas viejas.

Mismo patrón para `empresas.nombre`/(faltante `nombre_fiscal`), `empresas.nif`/(faltante `cif_nif`), etc. Esos cambios de columna requieren un sprint dedicado coordinado FE+DB.

## Tests a actualizar

- Buscar tests que mocken las tablas viejas: `grep -ri "retailer\|proposals\|boe_regulated_prices" src/**/*.test.ts`.
- Probable que solo haya 1-2 tests de admin y analisis tocados.

## Estimación

- Cambios de string `from('X')`: 1-2h.
- Decisión sobre `proposals` (consolidar 3 features o conservar tabla): 0.5-1 día (parte producto, parte código).
- TSC + 39 tests pasando: 0.5h.
- Smoke test manual: 0.5h.

**Total**: 1-2 días persona, una vez Fase 1 está aplicada en prod.
