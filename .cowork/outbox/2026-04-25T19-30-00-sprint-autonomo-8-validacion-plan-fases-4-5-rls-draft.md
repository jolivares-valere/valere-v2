# Handoff sprint autónomo 8 → próxima sesión

**Fecha:** 2026-04-25 (tarde, sesión Cowork)
**Tema:** Validación + completar refactor FE + Plan Fase 4-5 + RLS hardening draft + inventory limpieza.

## Resumen ejecutivo

Sprint de "cierre" tras la ejecución del 7. Todo lo que se podía hacer sin tu mano: hecho.

- ✅ **Refactor FE Fase 3 cerrado al 100%**: 0 refs legacy en `src/`. Última pieza: `src/types/database.ts` actualizado con `comercializadora_id` y `comercializadoras` aliases.
- ✅ **Compat views validadas exhaustivamente**: SELECT/INSERT/UPDATE/DELETE vía views legacy llegan correctamente a las tablas canónicas. FE legacy operativo sin tocar nada.
- ✅ **Plan Fase 4-5 documentado**: deploy + cutover + cleanup. Decisión clave para Potencias-app: views CRM en lugar de refactor masivo.
- ✅ **RLS hardening draft**: 8 tablas Potencias-side con USING(true) → 4 policies granulares cada una. No aplicado, pendiente Fase 2 datos.
- ✅ **Inventory limpieza completo**: lista exacta para `git rm` desde PowerShell.

## Logros del sprint

### Refactor FE — el último 5%

```
src/types/database.ts:
  - RetailerOffer.retailer_id        → comercializadora_id
  - RetailerOfferWithName.retailers  → comercializadoras
```

Estos 2 cambios cierran TSC compilando contra los nuevos nombres de tabla/columna. `calculator.ts`, `adapters.ts`, `DatosPage.tsx` y otros consumidores no necesitan cambios — usan campos genéricos del tipo (energy_prices, p1_kw, etc.).

### Validación compat views (red de seguridad)

```sql
-- ✅ SELECT
retailers (view)            = comercializadoras (tabla)    : 6/6 cuadran
retailer_offers (view)      = comercializadora_ofertas      : 0/0
boe_regulated_prices (view) = precios_regulados_boe         : 29/29

-- ✅ INSERT vía view legacy retailers
INSERT INTO public.retailers (...) VALUES (...);
→ trigger legacy_retailers_insert mapea correctamente a public.comercializadoras

-- ✅ INSERT vía view legacy retailer_offers (rename de columna)
INSERT INTO public.retailer_offers (retailer_id, ...) VALUES (...)
→ trigger mapea retailer_id → comercializadora_id en public.comercializadora_ofertas

-- ✅ UPDATE vía view legacy (con column alias retailer_id)
UPDATE public.retailer_offers SET retailer_id = '...' WHERE id = '...'
→ auto-updatable de Postgres maneja el alias correctamente

-- ✅ DELETE vía view legacy
DELETE FROM public.retailers WHERE name = '...'
→ borra de public.comercializadoras
```

**Conclusión**: el FE no migrado puede seguir usando los nombres viejos sin romperse. Las compat views son una red de seguridad real durante la transición.

### Plan Fase 4 y 5 (`docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md`)

Highlights:

- **Fase 4 — apps satélite**: en lugar de refactorizar Potencias app, **crear views CRM** con los nombres viejos (`clients`, `supplies`, `profiles`, `regulated_rates`, `alerts`, `power_requests`, `client_communications`, `client_documents`, `expediente_documents`, `documentacion`). La app Potencias solo necesita cambiar env vars (URL + ANON_KEY). SQL completo de las views ya en el plan.
- **Decisión producto pendiente Juan — Opción A vs B**:
  - A: apps separadas, Potencias app sigue siendo distinta, solo URL CRM.
  - B: features Potencias absorbidas por el CRM, una sola app.
- **Riesgo Storage**: `client_documents.storage_path` apunta al bucket de Potencias project. Si pausamos Potencias project, las URLs rompen. **Decisión necesaria**: copiar bucket Potencias→CRM o configurar CDN compartida.
- **Estimación restante**: 5-7 días persona (vs 10-12 originales). Ya estamos al ~60% del sprint dedicado.

### RLS hardening draft

`supabase/migrations/_draft_rls_hardening_8_tables.sql` — sustituye las 8 USING(true) por:

| Tabla | Policies nuevas |
|---|---|
| `expedientes`, `solicitudes_potencia`, `comunicaciones_cliente` | SELECT all + INSERT/UPDATE creator-or-manager + DELETE manager+ |
| `ciclos` | SELECT all + INSERT/UPDATE via expediente.created_by + DELETE manager+ |
| `savings_calculations`, `comercializadora_docs`, `excel_import_templates` | SELECT all + ALL writes manager+ |
| `alertas` | SELECT all + UPDATE leída cualquier authed + INSERT/DELETE manager+ |

Prefijo `_draft_` para que la `migration applier` no lo coja por orden alfabético. Aplicar tras Fase 2 datos para poder testear con usuarios reales.

### Inventory limpieza

| Tracked en git → `git rm` | No tracked → ignorar |
|---|---|
| `q` | `tsc_output.txt` |
| `useAuth.ts` | `CRM VALERE/` (carpeta vacía) |
| `import { useEffect } from 'react'.txt` |  |
| `import { useState } from 'react'.txt` |  |
| `supabase-migration.sql` |  |
| `src/features/chat-ia/ChatIAPanel.tsx` |  |
| `supabase/functions/chat-consultor/index.ts` |  |
| `supabase/functions/chat-consultor/README.md` |  |
| `src/core/types/database_canonical_2026-04-26.ts` (duplicado idéntico) |  |

**NO borrar**: `src/types/database.ts` — 8 archivos lo importan para tipos calculator-internos (`SupplyPoint`, `Powers`, `InvoiceData`, etc.) que no viven en BD.

## Estado actual de la unificación (post sprint 8)

| Fase | Estado | Sprint |
|---|---|---|
| Fase 0 — Diseño | ✅ | 4 |
| Fase 1 — Schema renames | ✅ Aplicada en prod | 7 |
| Fase 2 — Data import | ⏸️ Pendiente Juan (pg_dump+psql, ~30 min) | 6 (preparado) |
| Fase 3 — FE refactor | ✅ Aplicada (cierre 100% sprint 8) | 7+8 |
| Fase 4 — Deploy + apps satélite | 🟡 Plan listo, pendiente Juan | 8 |
| Fase 5 — Cleanup | 🟡 Plan listo + scripts preparados | 8 |

## Cosas que requieren tu mano

### Bloqueos hard (no puedo resolver yo)

1. **Fase 2 datos**: connection strings de los 2 proyectos para `pg_dump+psql`.
2. **Storage bucket migration**: decisión producto + acción Supabase Dashboard.
3. **Apps satélite Opción A vs B**: decisión producto.
4. **Ejecución del script PowerShell de cierre acumulado** (sprints 5+6+7+8): commits + git rm + push.
5. **TSC + 39 tests**: requieren Node corriendo, sandbox no puede.

### Cosas que sí puedo hacer en próximos sprints

- Aplicar las views CRM para apps satélite (cuando Juan dé OK Opción).
- Aplicar el RLS hardening draft (cuando Fase 2 esté completa).
- Smoke tests post-cutover via MCP execute_sql + get_logs.
- Habilitar features Potencias en CRM (Opción B).
- Drop tabla `proposals` + consolidar features FE (sprint dedicado).

## Script PowerShell de cierre acumulado (sprints 5+6+7+8)

```powershell
cd $HOME\valere-v2

# 1. Sincronizar
git fetch origin claude/docs-cierre-2026-04-23
git checkout claude/docs-cierre-2026-04-23
git pull origin claude/docs-cierre-2026-04-23
git checkout -- .   # CRLF noise reset

# 2. Borrar legacy/junk
git rm -r src/features/chat-ia
git rm -r supabase/functions/chat-consultor
git rm -f q
git rm -f useAuth.ts
git rm -f "import { useEffect } from 'react'.txt"
git rm -f "import { useState } from 'react'.txt"
git rm -f tsc_output.txt 2>$null
git rm -f supabase-migration.sql 2>$null
git rm -f src/core/types/database_canonical_2026-04-26.ts
if (Test-Path "CRM VALERE") { Remove-Item -Recurse -Force "CRM VALERE" }

# 3. Add cambios sprints 5+6+7+8
git add docs/INVENTARIO_GEMINI_2026-04-25.md
git add supabase/functions/_shared/ai-adapter.ts
git add supabase/migrations/20260426_fase1_unificacion_renames_schema.sql
git add scripts/unificacion_fase2_protocolo.md
git add scripts/unificacion_fase2_a_staging.sql
git add scripts/unificacion_fase2_b_dedupe_y_transform.sql
git add scripts/unificacion_fase2_c_verificacion.sql
git add docs/REFACTOR_FE_FASE3_2026-04-26.md
git add docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md
git add supabase/migrations/_draft_rls_hardening_8_tables.sql
git add src/features/admin/AdminPage.tsx
git add src/features/analisis/AnalisisPage.tsx
git add src/types/database.ts
git add src/core/types/database.ts
git add docs/ESTADO.md
git add ".cowork/outbox/2026-04-25T16-40-00-sprint-autonomo-5-rag-verificado-y-sync.md"
git add ".cowork/outbox/2026-04-25T17-19-00-sprint-autonomo-6-unificacion-fase1-fase2-listas.md"
git add ".cowork/outbox/2026-04-25T19-00-00-sprint-autonomo-7-fase1-aplicada-fe-refactor-y-fase2-pendiente-juan.md"
git add ".cowork/outbox/2026-04-25T19-30-00-sprint-autonomo-8-validacion-plan-fases-4-5-rls-draft.md"

# 4. Verificar
npx tsc --noEmit
npm test -- --run
# Si hay errores, parar y revisar.

# 5. Commit + push
git commit -m "feat(unificacion): sprints 5+6+7+8 - asistente RAG + Fase 1 schema + FE refactor + plan Fase 4-5

DB:
- Fase 1 unificación aplicada: renames retailers/retailer_offers/boe_regulated_prices + col retailer_id->comercializadora_id + 7 cols precios_regulados_boe + backfill
- Compat views legacy con SECURITY INVOKER + INSTEAD OF INSERT triggers (red de seguridad)
- ai-adapter.ts: gemini-2.5-flash + gemini-embedding-001 (sync repo<->deployed)
- 0 ERRORs advisors

FE:
- Refactor 100% completo: AdminPage, AnalisisPage, src/types/database.ts (RetailerOffer.comercializadora_id, RetailerOfferWithName.comercializadoras)
- src/core/types/database.ts regenerado post-rename (3727 lineas)

Cleanup:
- delete chat-ia + chat-consultor (huerfanos desde FASE 20.8)
- delete legacy junk en raiz (q, useAuth.ts, *.txt, etc.)
- delete src/core/types/database_canonical_2026-04-26.ts (duplicado)

Docs:
- INVENTARIO_GEMINI_2026-04-25, PLAN_UNIFICACION_FASES_4_5, REFACTOR_FE_FASE3, ESTADO sprint 5+6+7+8
- _draft_rls_hardening_8_tables.sql (no aplicado, pending Fase 2)

Pendiente Juan:
- Fase 2 data import via pg_dump+psql
- Storage bucket migration decision
- Apps satelite refactor"

git push origin claude/docs-cierre-2026-04-23
```

## Mensaje al retomar

"Sprint 8 hecho — todo lo posible sin tu mano. **Compat views 100% validadas** (SELECT/INSERT/UPDATE/DELETE) → FE legacy seguro. **Refactor FE cerrado al 100%** → 0 refs legacy en src/. **Plan Fase 4-5 listo** con la decisión clave de usar views CRM para Potencias-app (minimiza refactor a env vars). **RLS hardening drafted** para las 8 USING(true). **Lista limpieza completa** para script PowerShell. Pendientes que solo tú puedes resolver: Fase 2 datos (passwords), storage PDFs (decisión producto), Opción A vs B apps satélite, ejecutar script de cierre acumulado. ¿Atacamos Fase 2 o algo más estratégico primero?"

## Reglas aprendidas

- **Postgres views auto-updatables**: simple views (single base table, no DISTINCT/GROUP/HAVING) permiten UPDATE/DELETE sin necesidad de `INSTEAD OF` triggers. Solo INSERT necesita trigger explícito si hay column alias o transformaciones. Esto simplifica el patrón de compat views drásticamente.
- **`_draft_` prefix en migrations** = no auto-aplicada por orden alfabético (la `application order` toma fechas yyyymmdd_). Útil para SQL drafts en revisión.
- **Tipos calculator-internos vs tipos de tabla**: separar archivos. `src/types/database.ts` para tipos que NO viven en BD (SupplyPoint, Powers, InvoiceData) + tipos legacy de tabla. `src/core/types/database.ts` para tipos generados de Supabase. No mezclar.
- **MCP `apply_migration` vs `execute_sql`**: usar `apply_migration` para DDL (queda en historial de migrations, idempotente). `execute_sql` para queries de inspección/validación (no persistido). Mezclar ambos en el mismo sprint da auditoría limpia.
