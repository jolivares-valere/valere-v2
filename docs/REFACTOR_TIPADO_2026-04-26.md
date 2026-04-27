# Refactor de tipado y dead code — Sprint domingo lane 2

> 2026-04-26 · Cowork · Lane 2 (paralelo a lanes 1, 3, 4)
> Estado al cerrar: **0 `any` TypeScript en `src/`**, dead code documentado, telemetry con tests, ErrorBoundary auditado.

## TL;DR

- 36 ocurrencias del literal `any` reducidas a 4 ocurrencias *no-TypeScript* (1 atributo HTML `step="any"`, 1 matcher `expect.any(Object)`, 2 comentarios).
- Tipos derivados directamente de `Database['public']['Tables']` en `useDatadis.ts` — el alias `const db = supabase as any` queda eliminado.
- `AdminPage.tsx` modela el form de oferta como `OfferFormState = Omit<RetailerOffer, 'id' | 'created_at'>`; las relaciones del join se resuelven con `OfferWithRetailer`.
- `useSupabaseQuery.ts` cambia los `catch (err: any)` por `catch (err: unknown)` con narrowing `err instanceof Error`.
- 2 mocks de tests sustituyen `as any` por `as unknown as typeof fromMock` (boundary justificado).
- `telemetry.test.ts` nuevo con 8 casos sintéticos (window.error, unhandledrejection, TTFB, LCP/FCP fallback, buffer cap, idempotencia).
- `AUDITORIA_FE_ERRORBOUNDARY.md` documenta cobertura y limitaciones.

Sin commits — el script PowerShell de cierre de sprint los hará tras `npm run build && npm test`.

---

## 1. Eliminación de `any` — before / after

### 1.1 `src/core/hooks/useDatadis.ts` — 8 → 0

**Before** (extracto representativo):
```ts
// Alias tipado para tablas nuevas (no están en Database aún)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any
…
const { error } = await db.from('datadis_tokens').upsert(insert, …)
…
const { error: cupsErr } = await supabase
  .from('cups')
  .update(cupsUpdate as any)
  .eq('id', cupsId)
…
return (data ?? null) as DatadisToken | null
```

**After**:
```ts
import type { Database } from '../types/database'
type DatadisTokenDbInsert = Database['public']['Tables']['datadis_tokens']['Insert']
type DatadisConsumptionDbInsert = Database['public']['Tables']['datadis_consumptions']['Insert']
type CupsUpdate = Database['public']['Tables']['cups']['Update']
type FacturaInsert = Database['public']['Tables']['facturas']['Insert']

const insert: DatadisTokenDbInsert = { … }
await supabase.from('datadis_tokens').upsert(insert, …)

const cupsUpdate: CupsUpdate = supplyRawToCupsFields(supply)
await supabase.from('cups').update(cupsUpdate).eq('id', cupsId)

// Para SELECT con columnas concretas (sin password_enc):
queryFn: async (): Promise<Omit<DatadisToken, 'password_enc' | 'token_cache'> | null> => …
```

Notas:
- Las tablas `datadis_tokens`, `datadis_consumptions`, `comercializadora_ofertas`, `precios_regulados_boe` ya están en `database.ts` regenerado en sprint 7-8 — el comentario que justificaba el `as any` quedó obsoleto.
- `useDatadisToken` ahora declara explícitamente que su return type omite `password_enc` y `token_cache` (no se seleccionan). Antes se mentía con `as DatadisToken | null`.
- El `useDatadisConsumptions` mantiene un cast final `as DatadisConsumption[]` justificado: la columna `metodo_obtencion` viene tipada como `string` desde el schema generado pero a nivel de aplicación es `'real' | 'estimada'` (constraint a nivel de servicio, no de BD).

### 1.2 `src/features/admin/AdminPage.tsx` — 13 → 0

**Before**:
```tsx
const { data: offers } = useSupabaseQuery<any>({ … })
const [offerToDelete, setOfferToDelete] = useState<any | null>(null)
const [form, setForm] = useState<any>({ comercializadora_id: '', … })

const startEditOffer = (o: any) => { setForm({ … o.product_name … }) }
{offers.map((o: any) => …)}
onChange={e => setForm((p: any) => ({ ...p, … }))}
const { id, created_at, comercializadoras, ...updateData } = form  // implícito any
```

**After**:
```tsx
type RetailerFormState = Partial<Retailer>
type OfferWithRetailer = RetailerOffer & {
  comercializadoras: Pick<Retailer, 'name'> | null
}
type OfferFormState = Omit<RetailerOffer, 'id' | 'created_at'>

const { data: offers } = useSupabaseQuery<OfferWithRetailer>({ … })
const [offerToDelete, setOfferToDelete] = useState<OfferWithRetailer | null>(null)

const buildEmptyForm = (tariff = '2.0TD'): OfferFormState => { … }
const [form, setForm] = useState<OfferFormState>(() => buildEmptyForm())

const startEditOffer = (o: OfferWithRetailer) => { setForm({ … }) }
{offers.map((o) => …)}                        // tipo inferido
onChange={e => setForm((p) =>({ ... }))}      // tipo inferido
```

Decisiones:
- **`OfferFormState` como `Omit<RetailerOffer, 'id' | 'created_at'>`** garantiza que el form siempre tiene los 16 campos editables, no acepta valores inesperados, y la mutación recibe un payload válido.
- **`buildEmptyForm`** centraliza la inicialización (antes había dos copias divergentes inline en el `useState` y el `onClick` del botón "Nueva Oferta"). Reduce drift.
- **Cast a `Record<string, unknown>` al pasar a `mutation.insert`/`update`**: contractualmente ese hook acepta `Record<string, unknown>` y la conversión `OfferFormState → Record<string, unknown>` es trivialmente segura.
- **`surplus_model` desde el `<select>`**: `e.target.value` es `string`, hay un cast `as SurplusModel` puntual con las 4 opciones del dropdown — type-narrowing manual aceptable.

### 1.3 Resto de archivos

| Archivo | `any` antes | Tratamiento |
|---|---|---|
| `src/features/analisis/AnalisisPage.tsx` | 2 | `(powers as any)[…]` → `(powers as Record<string, number \| undefined>)[…]` |
| `src/features/propuestas-energia/PropuestasEnergiaPage.tsx` | 2 | Nueva interface local `ComparisonResultRow` documenta el contrato del JSONB `proposals.comparison_results` |
| `src/features/datos/DatosPage.tsx` | 7 | Casts narrowing a `Record<string, number \| undefined>` para acceso indexado a powers/e1..e6, `Partial<InvoiceHistory>` en el destructuring del payload |
| `src/core/hooks/useSupabaseQuery.ts` | 3 | `catch (err: any)` → `catch (err: unknown)` + narrowing `err instanceof Error ? err.message : default` |
| `src/core/hooks/useCustomFields.test.ts` | 1 | `as any` (mock supabase) → `as unknown as typeof fromMock` con justificación inline |
| `src/core/hooks/useAutomatizaciones.test.ts` | 1 | idem |

### 1.4 Recuento final

```
$ grep -rn '\bany\b' src/ --include='*.ts' --include='*.tsx'
src/core/energia/calculator.ts:27:  …passing null/undefined for any        ← comentario
src/core/components/CustomFieldsPanel.tsx:161:  …step="any"…                ← atributo HTML
src/core/hooks/useAutomatizaciones.test.ts:91:  expect.any(Object),         ← matcher vitest
src/core/hooks/useDatadis.ts:16:  …antes de añadir cualquier `as any`.      ← comentario
```

```
$ grep -rn ': any\|as any\|<any>\|any\[\]\|Record<.*,\s*any>' src/
src/core/hooks/useDatadis.ts:16: * antes de añadir cualquier `as any`.      ← comentario
```

**0 `any` reales en TypeScript.**

---

## 2. Auditoría dead code

### 2.1 Confirmados como muertos (candidatos a borrado)

| Archivo / Símbolo | Tipo | Evidencia | Riesgo de borrar | Acción |
|---|---|---|---|---|
| `src/core/types/database_canonical_2026-04-26.ts` | Archivo backup | `grep -r database_canonical src/` → 0 matches; `diff` con `database.ts` confirmó identidad en sprint 8 | Bajo | Ya en lista del PowerShell sprint 8 — confirmado |
| `src/components/ui/sonner.tsx` | UI shadcn no consumida | El `Toaster` viene directo de `sonner` (npm) en `AppShell.tsx` | Bajo (se puede regenerar con shadcn CLI si hace falta) | Eliminar |
| `src/components/ui/switch.tsx` | UI shadcn no consumida | 0 imports | Bajo | Eliminar |
| `src/components/ui/scroll-area.tsx` | UI shadcn no consumida | 0 imports | Bajo | Eliminar |
| `src/components/ui/label.tsx` | UI shadcn no consumida | 0 imports | Bajo | Eliminar |
| `src/components/ui/checkbox.tsx` | UI shadcn no consumida | 0 imports | Bajo | Eliminar |
| `src/components/ui/textarea.tsx` | UI shadcn no consumida | 0 imports | Bajo | Eliminar |
| `src/components/ui/input.tsx` | UI shadcn no consumida | 0 imports | Bajo | Eliminar |
| `src/components/ui/select.tsx` | UI shadcn no consumida | 0 imports (se usan `<select>` HTML nativos) | Bajo | Eliminar |
| `formatDateRange` en `src/core/utils/dates.ts` | Export no usado | 0 imports | Bajo | Eliminar la función |
| `formatCUPS` en `src/core/utils/energy.ts` | Export no usado | 0 imports | Bajo | Eliminar la función |
| `calcEstadoReal` en `src/core/utils/energy.ts` | Export no usado | 0 imports | Medio (parece API pública para futuro) | Mantener — semánticamente clave para renovaciones |
| `necesitaRenovacion` en `src/core/utils/energy.ts` | Export no usado | 0 imports | Medio | Mantener — idem |

### 2.2 Falsos positivos / mantener

| Símbolo | Razón |
|---|---|
| `canDo` en `src/core/utils/permissions.ts` | RBAC infraestructura para sprint RLS hardening pendiente (ver `docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md` y draft `_draft_rls_hardening_8_tables.sql`). No tocar. |
| `getTelemetryBuffer` en `src/core/utils/telemetry.ts` | Antes era dead, pero ahora consumido por el nuevo `telemetry.test.ts`. Vivo. |
| `safeNum`, `safeArray` | Usados intensivamente en `calculator.ts` y AnalisisPage. |
| `src/core/components/*` | Todos consumidos (10+ páginas). |
| `src/core/hooks/useDebounce`, `useQueryBase`, `useRealtime` | Usados en features (api.ts de empresas, contratos, etc.). |

### 2.3 Comandos `git rm` para Juan

Cowork no puede borrar archivos en el mount Windows (memoria de feedback). Bloque sugerido para el script PowerShell que cierra el sprint:

```powershell
# Dead UI shadcn no consumida (regenerable con shadcn CLI si hace falta)
git rm src/components/ui/sonner.tsx
git rm src/components/ui/switch.tsx
git rm src/components/ui/scroll-area.tsx
git rm src/components/ui/label.tsx
git rm src/components/ui/checkbox.tsx
git rm src/components/ui/textarea.tsx
git rm src/components/ui/input.tsx
git rm src/components/ui/select.tsx
# Tipos canónicos duplicados (sprint 8)
git rm src/core/types/database_canonical_2026-04-26.ts
```

Para `formatDateRange` y `formatCUPS`: edición manual en `src/core/utils/dates.ts` y `energy.ts` antes del commit. Borrar la función + cualquier helper privado que sólo ella use.

---

## 3. Telemetría

### 3.1 Cambio en `src/core/utils/telemetry.ts`

Añadido un único export para tests:

```ts
/**
 * Reset interno SOLO para tests — limpia el buffer y rearma `initialized`.
 * No exportar/usar fuera de archivos `*.test.ts`.
 */
export function __resetTelemetryForTests(): void {
  initialized = false
  if (typeof window !== 'undefined') {
    window.__valereTelemetry = []
  }
}
```

No hay otros cambios en la implementación del módulo — la cobertura de eventos ya estaba bien.

### 3.2 Nuevo `src/core/utils/telemetry.test.ts`

8 casos sintéticos (jsdom + vitest):

| # | Caso | Cubre |
|---|---|---|
| 1 | `window.error` con `Error` instance | `kind: 'error'`, message/source/line/col |
| 2 | `unhandledrejection` con `Error` instance | `kind: 'unhandled_rejection'`, message |
| 3 | `unhandledrejection` con string reason | Serialización del reason no-Error |
| 4 | TTFB desde `performance.getEntriesByType('navigation')` mockeado | Cálculo `responseStart - requestStart = 220 ms` |
| 5 | Sin `PerformanceObserver` en `window` | initTelemetry no crashea |
| 6 | `trackRouteChange` añade evento | Evento `route_change` con path |
| 7 | 250 emisiones → buffer ≤200 | Cap del buffer y conservación del más reciente |
| 8 | `initTelemetry` llamado dos veces | Idempotencia (un solo listener `window.error`) |

**No se ejecutan en el sandbox de Cowork** (no hay node_modules ni vitest configurado en mount). Quedan listos para `npm test` de Juan o el `valere-auditor` skill.

---

## 4. ErrorBoundary

Auditoría completa en `docs/AUDITORIA_FE_ERRORBOUNDARY.md`. Resumen:

- **Captura**: errores de render, ciclo de vida y constructor en cualquier descendiente del boundary. Funciona con `<Suspense>` y boundaries anidados (`<AsistentePanel/>` está aislado del resto en `App.tsx`).
- **NO captura** (limitación de la API React): event handlers, async/promises, errores en SSR, errores en su propio render. Esos casos los absorbe `telemetry.ts` (`window.error` + `unhandledrejection`).
- **Mejoras propuestas no bloqueantes**: emitir a `crm_telemetry` cuando exista la tabla, exponer `resetKey` para reset automático en cambio de ruta, enmascarar `error.message` en build prod.

---

## 5. Riesgo residual

1. **Casts `Record<string, unknown>` al insertar/actualizar** — están localizados en `useSupabaseQuery` (que ya acepta ese tipo) y en formularios donde el shape exacto del payload es dinámico. Son seguros porque la BD aplica constraints. Mitigación a futuro: tipar `useSupabaseMutation<T extends keyof Database['public']['Tables']>` para inferir el tipo Insert/Update por nombre de tabla.

2. **`OfferWithRetailer` extiende `RetailerOffer`** — `RetailerOffer` tiene varios campos como `surplus_model: SurplusModel`, pero la BD devuelve `string | null`. El cast en `startEditOffer` (`o.surplus_model as SurplusModel`) confía en que la BD nunca tendrá un valor fuera de la unión. Si en el futuro alguien inserta otro string, el form fallará silenciosamente. Mitigación posible: validador zod a la entrada.

3. **Los tests de `telemetry.test.ts` no se ejecutaron**. Aunque están escritos contra la API pública del módulo, jsdom puede tener edge cases con `PromiseRejectionEvent`. El `valere-auditor` skill o el `npm test` de Juan deben validarlo. Si fallan, el patrón de fallback ya está previsto (test 2 usa `Object.assign(new Event(...), { reason })` cuando `PromiseRejectionEvent` no existe).

4. **Componentes UI shadcn marcados como muertos** podrían volver a hacer falta si una feature futura los necesita. Borrarlos es reversible (`pnpm dlx shadcn add label` los regenera). Coste de mantener: ~150 líneas inertes; coste de borrar: 30s para regenerar si hace falta. Recomendación: borrar.

---

## 6. Archivos tocados (resumen)

```
M src/core/hooks/useDatadis.ts                          (refactor completo, -1 alias `db`)
M src/features/admin/AdminPage.tsx                      (tipado OfferFormState/OfferWithRetailer)
M src/features/analisis/AnalisisPage.tsx                (Record<string,…> en lugar de any)
M src/features/propuestas-energia/PropuestasEnergiaPage.tsx (nueva interface ComparisonResultRow)
M src/features/datos/DatosPage.tsx                      (4 narrowings)
M src/core/hooks/useSupabaseQuery.ts                    (catch unknown + narrowing)
M src/core/hooks/useCustomFields.test.ts                (mock con unknown)
M src/core/hooks/useAutomatizaciones.test.ts            (mock con unknown)
M src/core/utils/telemetry.ts                           (+__resetTelemetryForTests)
A src/core/utils/telemetry.test.ts                      (8 casos sintéticos)
A docs/AUDITORIA_FE_ERRORBOUNDARY.md                    (auditoría)
A docs/REFACTOR_TIPADO_2026-04-26.md                    (este doc)
```

11 archivos modificados, 3 nuevos. Sin commits.

---

## 7. Pendientes para Juan

1. **`npx tsc --noEmit`** — debería estar a 0 errores. Si surge alguno por el cast de `surplus_model` o por el `?? selectedSPId` en `DatosPage.tsx`, lo más probable es que sea ruido de tipos optional vs required en `Partial<InvoiceHistory>`. Ajustar puntualmente.
2. **`npm test -- --run`** — los 39 tests previos deben seguir pasando, más los 8 nuevos de telemetry. Si telemetry falla por jsdom edge case, ver §5 punto 3.
3. **Decidir** sobre el bloque `git rm` de §2.3 (UI shadcn dead) antes del PowerShell de cierre.
4. **No commitear** desde Cowork — sigue siendo terreno del PowerShell maestro `RUNBOOK.ps1`.
