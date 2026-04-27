# Sprint domingo lane 2 — Refactor tipado FE + dead code + telemetry tests + ErrorBoundary audit

> Cierre: 2026-04-26 ~11:15 (Cowork autónomo, sin commits)
> Lane disjunto del resto de sprints en paralelo (lanes 1, 3, 4 NO tocados)

## Restricciones respetadas

- ❌ No tocado `supabase/`
- ❌ No tocado `docs/` salvo `docs/AUDITORIA_FE_ERRORBOUNDARY.md` y `docs/REFACTOR_TIPADO_2026-04-26.md`
- ❌ No tocado `.cowork/AGENT_PLAYBOOK.md`
- ❌ Sin commits — Juan / RUNBOOK.ps1 los hará

## Entregables

### Código (modificados)

- `src/core/hooks/useDatadis.ts` — eliminado el alias `const db = supabase as any` y todos los `as any`. Tipos derivados directamente de `Database['public']['Tables']` para `datadis_tokens`, `datadis_consumptions`, `cups`, `facturas`. Comentario obsoleto sobre "tablas no en Database" actualizado.
- `src/features/admin/AdminPage.tsx` — `OfferFormState = Omit<RetailerOffer, 'id' | 'created_at'>` + `OfferWithRetailer` para los joins. 13 `any` eliminados. Helper `buildEmptyForm()` deduplicado.
- `src/features/analisis/AnalisisPage.tsx` — `(powers as any)[…]` → `(powers as Record<string, number | undefined>)[…]`.
- `src/features/propuestas-energia/PropuestasEnergiaPage.tsx` — interface `ComparisonResultRow` documenta el JSONB `comparison_results`.
- `src/features/datos/DatosPage.tsx` — 7 `any` reducidos a casts narrowing.
- `src/core/hooks/useSupabaseQuery.ts` — `catch (err: any)` → `catch (err: unknown)` con guard `instanceof Error`.
- `src/core/hooks/useCustomFields.test.ts` — `as any` → `as unknown as typeof fromMock` (boundary).
- `src/core/hooks/useAutomatizaciones.test.ts` — idem.
- `src/core/utils/telemetry.ts` — único cambio: nuevo export `__resetTelemetryForTests` (sólo para uso en tests).

### Código (nuevos)

- `src/core/utils/telemetry.test.ts` — 8 casos sintéticos: window.error, unhandledrejection (Error y string reason), TTFB con mock de `performance.getEntriesByType`, fallback sin PerformanceObserver, `trackRouteChange`, buffer cap 200, idempotencia de `initTelemetry`. **No ejecutados en sandbox** — listos para `npm test` de Juan.

### Documentación (nueva)

- `docs/REFACTOR_TIPADO_2026-04-26.md` — before/after, recuento, archivos tocados, riesgo residual, lista de comandos `git rm` para dead UI shadcn.
- `docs/AUDITORIA_FE_ERRORBOUNDARY.md` — qué captura el ErrorBoundary, qué no, propuestas de mejora no bloqueantes.

## Cifras

| Métrica | Antes | Después |
|---|---|---|
| `any` literal en `src/` (incl. comentarios) | 36 | 4 (1 atributo HTML, 1 vitest matcher, 2 comentarios) |
| `any` reales en TS (`: any`, `as any`, `<any>`, `Record<*, any>`) | 30+ | **0** |
| Test files de telemetry | 0 | 1 (8 cases) |
| Docs de auditoría FE | 1 | 3 |

## Pendientes para Juan / siguiente sesión

1. **Validar build**: `cd ~/valere-v2 && npx tsc --noEmit && npm test -- --run`.
   - Esperable: 0 errores TSC, 39 + 8 = 47 tests OK.
   - Riesgo: si `surplus_model as SurplusModel` o algún narrowing de DatosPage da error, ver §5 del refactor doc.
2. **Decidir borrado dead UI shadcn** (§2.3 del refactor doc):
   ```powershell
   git rm src/components/ui/{sonner,switch,scroll-area,label,checkbox,textarea,input,select}.tsx
   git rm src/core/types/database_canonical_2026-04-26.ts
   ```
   Coste de borrar: 30s con `pnpm dlx shadcn add <name>` si vuelven a hacer falta.
3. **Considerar** eliminar `formatDateRange` (en `dates.ts`) y `formatCUPS` (en `energy.ts`) — exports nunca importados. `calcEstadoReal` y `necesitaRenovacion` quedan (parecen API pública de cara a renovaciones).
4. **NO** tocar `canDo` de `permissions.ts` — es infraestructura para el sprint RLS hardening pendiente (`_draft_rls_hardening_8_tables.sql`).

## No bloqueantes detectados

- `useSupabaseMutation` acepta `Record<string, unknown>` como contrato. Una mejora futura: hacer que infiera el tipo Insert/Update por nombre de tabla (`<T extends keyof Database['public']['Tables']>`). Eliminaría todos los casts intermedios en formularios. Estimación: ~1h, propio sprint.
- `OfferWithRetailer.surplus_model: SurplusModel` confía en que la BD nunca tenga un valor fuera de la unión. Validador zod a la entrada lo blindaría.

## Atajos rápidos para sesión siguiente

```bash
# Verificar resultado del refactor
git diff --stat src/                                  # archivos tocados
grep -rn '\bany\b' src/ --include='*.ts' --include='*.tsx' \
  | grep -v 'expect\.any\|step="any"\|comment'        # → 0 líneas
grep -rn ': any\|as any' src/                         # → solo el comentario en useDatadis.ts

# Lanzar el auditor cuando estés listo
# (skill valere-auditor)

# Borrar dead UI si decides hacerlo
git rm src/components/ui/{sonner,switch,scroll-area,label,checkbox,textarea,input,select}.tsx
git rm src/core/types/database_canonical_2026-04-26.ts
```

## Cross-lane

Este sprint NO ha tocado nada de:
- Lane 1 (lo que sea que haya estado haciendo)
- Lane 3 (idem)
- Lane 4 (idem)
- `supabase/` (intacto)
- `.cowork/AGENT_PLAYBOOK.md` (intacto)

Si hay merge conflict, será exclusivamente en:
- `src/core/hooks/useDatadis.ts`
- `src/features/admin/AdminPage.tsx`
- `src/features/{analisis,propuestas-energia,datos}/{Analisis,PropuestasEnergia,Datos}Page.tsx`
- `src/core/hooks/{useSupabaseQuery.ts,useCustomFields.test.ts,useAutomatizaciones.test.ts}`
- `src/core/utils/telemetry.ts`
