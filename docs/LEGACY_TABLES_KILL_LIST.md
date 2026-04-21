# Legacy tables — kill list

> Análisis del uso real de las 3 tablas legacy Calc en el código.
> Basado en commit `359a0fb` (branch `claude/valere-crm-architecture-2vvEV`).

## TL;DR

| Tabla | Se puede dropear | Bloqueadores |
|-------|:---:|---|
| `clients` | ✅ Sí (tras cambio en 2 features) | Fallback de display en TrackingPage y PropuestasEnergiaPage |
| `supply_points` | ✅ Sí (tras el mismo cambio) | Ídem + tipos `SupplyPoint` en adapters/calculator |
| `proposals` (EN) | ❌ **No todavía** | Se usa activamente en 3 features. Requiere migración a `analisis_comparativo` o similar |

## `clients` — **DROP seguro tras fix de frontend**

### Uso actual (grep commits pushed)

- **0** lecturas directas: `grep "from('clients')"` → vacío.
- **2** referencias indirectas vía join:
  - `src/features/propuestas-energia/PropuestasEnergiaPage.tsx:37,283`: `p.supply_points?.clients?.company_name`
  - `src/features/tracking/TrackingPage.tsx:28`: ídem
- **2** referencias de tipo:
  - `src/core/energia/adapters.ts`: import `Client`, función `empresaToClient(e: Empresa): Client`
  - `src/types/database.ts:162`: `clients: Pick<Client, 'company_name'>` dentro de `ProposalWithDetails`

### Cambio previo al DROP

```tsx
// PropuestasEnergiaPage.tsx y TrackingPage.tsx — quitar el fallback supply_points:
const clienteOf = (p: ProposalWithDetails) =>
  p.cups_rel?.empresas?.nombre || ''  // ← antes: || p.supply_points?.clients?.company_name
```

```ts
// src/types/database.ts — eliminar supply_points del ProposalWithDetails:
export interface ProposalWithDetails extends Proposal {
  cups_rel?: { codigo_cups: string; empresas?: { nombre: string } | null } | null
  // QUITAR: supply_points?: { cups?: string | null; clients?: Pick<Client, 'company_name'> | null } | null
}
```

```ts
// src/core/energia/adapters.ts — quitar empresaToClient (0 usuarios).
```

**Esfuerzo**: 10 minutos. TSC 0 si se regeneran tipos después.

## `supply_points` — **DROP seguro tras mismo fix**

### Uso actual

- **0** lecturas directas.
- Referencias **solo** como fallback en el join legacy de `proposals.supply_points.*` (arriba).
- Tipo `SupplyPoint` usado extensivamente en:
  - `src/core/energia/calculator.ts` (el motor del comparador)
  - `src/core/energia/adapters.ts::cupsToSupplyPoint()` (mapea `Cups` → `SupplyPoint`)

**Importante**: el **tipo** `SupplyPoint` se puede mantener como interfaz interna de `core/energia/` aunque la tabla SQL se dropee. El calculator sigue funcionando con esa forma de datos; el adapter la construye desde `cups`.

### Cambio previo al DROP

Mismo que `clients`: quitar el fallback en TrackingPage y PropuestasEnergiaPage. No hace falta tocar calculator.ts.

## `proposals` (inglés, Calc) — **NO dropear**

### Uso actual — activo

| Archivo | Línea | Operación |
|---------|-------|-----------|
| `src/features/analisis/AnalisisPage.tsx` | 248 | `supabase.from('proposals').insert({ ... })` |
| `src/features/propuestas-energia/PropuestasEnergiaPage.tsx` | 24 | `table: 'proposals'` (listado) |
| `src/features/tracking/TrackingPage.tsx` | 19 | `table: 'proposals'` (listado) |

### Opciones

1. **Mantener** `proposals` tal cual. Distinta de `propuestas` (ES, CRM comercial). Documentar en CLAUDE.md su propósito exclusivo (análisis comparativos).
2. **Migrar** a nueva tabla `analisis_comparativo` (mencionada en ROADMAP_FUSION.md FASE 20.5.e como pendiente). Requiere migración SQL + refactor de 3 archivos.

La opción 1 es la pragmática y mantiene el contrato actual.

## Plan propuesto

### Hoy (sin dropear todavía)

1. Quitar el fallback `p.supply_points?.*` en las 2 features.
2. Limpiar `ProposalWithDetails` en `src/types/database.ts`.
3. Opcional: quitar `empresaToClient` de adapters si nadie lo usa.

Resultado: el código ya no depende en absoluto de que existan `clients` o `supply_points`. Sigue usando el tipo `SupplyPoint` internamente en calculator.

### Cowork en Supabase (cuando el frontend esté desplegado)

```sql
-- Verificaciones previas
SELECT count(*) FROM public.facturas WHERE cups_id IS NULL;       -- debe ser 0
SELECT count(*) FROM public.proposals WHERE cups_id IS NULL AND supply_point_id IS NOT NULL;  -- idem

-- Si todo OK:
DROP TABLE public.supply_points CASCADE;
DROP TABLE public.clients CASCADE;

-- Verificar que el resto sigue funcionando:
SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
```

### Después

4. Regenerar tipos con `supabase gen types typescript` (requiere token). Desaparecen `clients` y `supply_points` de `src/core/types/database.ts` automáticamente.
5. Retirar el tipo alias `Client` de `src/types/database.ts` y `SupplyPoint` queda como tipo interno del calculator.

## Riesgo

**Cero** para el DROP en sí (siempre que se aplique el paso 1-3 antes).

Si Cowork dropea sin aplicar paso 1-3:
- Al pintar una propuesta vieja sin `cups_id`, el fallback daría error de FK.
- El fix es revertir temporalmente `frontend` al commit previo, no tocar Supabase.
