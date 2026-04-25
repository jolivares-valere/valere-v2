# Handoff sprint autónomo 6 → próxima sesión

**Fecha:** 2026-04-25 (tarde, sesión Cowork)
**Duración estimada:** ~2h
**Tema:** Unificación Supabase — Fase 1 lista para aplicar, Fase 2 preparada, Fase 3 mapeada.

## Resumen ejecutivo

Hallazgo clave: **el sprint 4 ya hizo el grueso del schema canónico vía la migration `unificacion_potencias_aditiva`**. El CRM ya tiene 36 tablas con todas las de Potencias añadidas (vacías). Falta solo:

1. **3 renames de tabla** (`retailers`→`comercializadoras`, etc.) + drop tabla legacy `proposals` + 7 columnas a `precios_regulados_boe` con backfill.
2. **Importar 408 filas de datos prod** desde Potencias al CRM (con dedupe por CIF/CUPS).
3. **Refactor FE** en 8 archivos (`from('retailers')` → `from('comercializadoras')`, etc.).

**Decisión arquitectónica**: migración **in-place sobre el CRM existente**, NO crear nuevo proyecto. CRM ya está en eu-west-1, ahorra coste, rollback trivial. Sprint total pasa de 7-9d (planificado) a ~3-5d.

## Logros

1. ✅ **Audit completo de los 2 proyectos** vía Supabase MCP. Conteos verificados, schemas comparados, decisión arquitectónica fundada en datos.

2. ✅ **Fase 1 SQL lista**: `supabase/migrations/20260426_fase1_unificacion_renames_schema.sql` validada vía dry-run (BEGIN…ROLLBACK contra prod).

3. ✅ **Fase 2 scripts preparados** en `scripts/unificacion_fase2_*` (protocolo + staging + transform + verificación).

4. ✅ **Fase 3 mapping FE** en `docs/REFACTOR_FE_FASE3_2026-04-26.md`.

5. ✅ **Tipos TS canónicos** en `src/core/types/database_canonical_2026-04-26.ts`.

6. ✅ **`docs/ESTADO.md`** actualizado con sección sprint 6.

## Entregables (archivos nuevos)

```
supabase/migrations/20260426_fase1_unificacion_renames_schema.sql      # Fase 1 — pendiente aplicar
scripts/unificacion_fase2_protocolo.md                                  # Runbook PowerShell Fase 2
scripts/unificacion_fase2_a_staging.sql                                 # Schema staging (espejo Potencias)
scripts/unificacion_fase2_b_dedupe_y_transform.sql                      # ~400 líneas, transacción única
scripts/unificacion_fase2_c_verificacion.sql                            # Counters + integridad + dups
docs/REFACTOR_FE_FASE3_2026-04-26.md                                    # Mapping 8 archivos a tocar
src/core/types/database_canonical_2026-04-26.ts                         # Tipos TS pre-renames
```

## Cosas que NO hizo este sprint (y por qué)

- ❌ **Aplicar Fase 1 en prod** — operación reversible pero "destructiva" según las reglas del sprint. Quería tu OK. Aplicación es 1 minuto.
- ❌ **Ejecutar Fase 2** — requiere backups + connection strings (passwords de los 2 proyectos) que no están en sandbox.
- ❌ **FE refactor** — depende de Fase 1 aplicada + decisión sobre `proposals`.
- ❌ **Branch Supabase de test** — requiere Pro plan ($25/mo). Pivotamos a dry-run via transacción ROLLBACK.

## Bloqueos / decisiones que requieren tu input

### Decisión 1: ¿conservar `proposals` o eliminarla?

La tabla está vacía (0 rows) pero **3 features del FE la usan**:
- `src/features/analisis/AnalisisPage.tsx:248` (insert al guardar análisis)
- `src/features/tracking/TrackingPage.tsx:20` (lectura)
- `src/features/propuestas-energia/PropuestasEnergiaPage.tsx:25` (lectura)

Opciones:

**A. Eliminar la tabla en Fase 1** (como está en el SQL ahora) y refactor FE inmediato — esto rompe la app hasta que corras el sprint FE.

**B. Comentar el `DROP TABLE` en Fase 1** y dejar la tabla viva hasta que el sprint FE consolide las 3 features bajo `propuestas` canónica.

**Recomendación: B**. Es la opción no-rompedora. Cambio:

```sql
-- En 20260426_fase1_unificacion_renames_schema.sql, línea ~31:
-- drop table if exists public.proposals;
-- ↑ comentar esta línea, dejar el resto como está
```

### Decisión 2: ¿secrets para Fase 2?

Necesito connection strings de Postgres para los 2 proyectos. Te los puedes copiar del Dashboard Supabase:

- CRM: https://supabase.com/dashboard/project/gtphkowfcuiqbvfkwjxb/settings/database → Connection pooling → Session mode
- Potencias: https://supabase.com/dashboard/project/alesfvxqtwlrwlmkoosg/settings/database → Connection pooling → Session mode

Formato: `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`

Si me los pasas mediante 1Password (sin pegarlos en chat), puedo ejecutar yo en próxima sesión. O lo haces tú vía PowerShell siguiendo el protocolo.

## Script PowerShell de cierre del sprint 6 (≈5 min)

```powershell
cd $HOME\valere-v2

# 1. Resetear ruido CRLF heredado (mismo patrón que sprint 5)
git fetch origin claude/docs-cierre-2026-04-23
git checkout claude/docs-cierre-2026-04-23
git pull origin claude/docs-cierre-2026-04-23
git checkout -- .

# 2. Verificar git status — solo deberían aparecer los entregables nuevos
git status -s

# 3. Add nuevos archivos
git add supabase/migrations/20260426_fase1_unificacion_renames_schema.sql
git add scripts/unificacion_fase2_protocolo.md
git add scripts/unificacion_fase2_a_staging.sql
git add scripts/unificacion_fase2_b_dedupe_y_transform.sql
git add scripts/unificacion_fase2_c_verificacion.sql
git add docs/REFACTOR_FE_FASE3_2026-04-26.md
git add src/core/types/database_canonical_2026-04-26.ts
git add docs/ESTADO.md
git add ".cowork/outbox/2026-04-25T17-19-00-sprint-autonomo-6-unificacion-fase1-fase2-listas.md"

# 4. TSC (no debería romper, los tipos canónicos son archivo nuevo no importado)
npx tsc --noEmit

# 5. Commit + push
git commit -m "feat(unificacion): sprint autonomo 6 - fase 1 lista + fase 2 scripts cross-proyecto + fase 3 mapeo FE

- supabase/migrations/20260426_fase1_unificacion_renames_schema.sql: 3 renames tabla + drop proposals + 7 cols precios_regulados_boe + backfill, validada via BEGIN/ROLLBACK contra prod
- scripts/unificacion_fase2_*: protocolo PowerShell + staging schema + transform 400 lineas con dedupe CIF/CUPS y mapeo legacy->canonical en transaccion unica + verificacion
- docs/REFACTOR_FE_FASE3_2026-04-26.md: 8 archivos mapeados (admin, analisis, tracking, propuestas-energia, types) con decision sobre tabla proposals
- src/core/types/database_canonical_2026-04-26.ts: 115KB tipos TS regenerados (3520 lineas vs 2099 anteriores)
- ESTADO.md actualizado: decision in-place sobre nuevo proyecto, sprint pasa de 7-9d a 3-5d gracias a migration aditiva del sprint 4"

git push origin claude/docs-cierre-2026-04-23
```

## Aplicación de Fase 1 (cuando estés listo, después de decisión 1)

Opción rápida via Supabase Dashboard:
1. Abrir https://supabase.com/dashboard/project/gtphkowfcuiqbvfkwjxb/sql/new
2. Pegar el contenido de `supabase/migrations/20260426_fase1_unificacion_renames_schema.sql`
3. (Si decidiste B): comentar la línea `drop table if exists public.proposals;`
4. Run.

Verificación post-aplicación:

```sql
SELECT 'comercializadoras' AS t, count(*) FROM public.comercializadoras
UNION ALL SELECT 'comercializadora_ofertas', count(*) FROM public.comercializadora_ofertas
UNION ALL SELECT 'precios_regulados_boe', count(*) FROM public.precios_regulados_boe
UNION ALL SELECT 'precios_regulados_boe con tariff_type', count(*) FROM public.precios_regulados_boe WHERE tariff_type IS NOT NULL;

-- Esperado: 6, 0, 29, 29
```

## Próximos pasos sugeridos

1. **Hoy/mañana**: aplicar Fase 1 (5 min, reversible).
2. **Próximo sprint**: ejecutar Fase 2 con backups + connection strings (1-2h reales).
3. **Sprint dedicado FE refactor**: 8 archivos + tests + decisión proposals (1-2 días).
4. **Sprint apps satélite**: apuntar Potencias/Excedentes al CRM (1 día).
5. **Sprint cleanup**: tras 1 semana estable, pausar Potencias project (1 día).

Total restante: ~5-7 días persona, **menos de la mitad de la estimación original** (10-12d) gracias al sprint 4 + 6.

## Reglas aprendidas

- **Verificar prod antes de planificar**: el sprint 4's "Fase 0 + tabla aditiva" hicieron casi todo el schema. Asumí en el plan que era solo diseño teórico — la realidad era que ya estaba la mitad ejecutado. Verificar `list_tables` antes de redactar plan ahorra una iteración.
- **Branches Supabase requieren Pro plan** ($25/mo). Para cuentas free, el patrón **`BEGIN…ROLLBACK` contra prod** es buen sustituto para validar DDL.
- **Cross-project data flow** sin Pro plan / sin postgres_fdw setup = `pg_dump --data-only` + load en schema staging + transform SQL. Es 3-4 pasos pero cada uno es atómico y revertible.
- **Polimórfico `documentos`** consolida 3 tablas (`client_documents` + `expediente_documents` + `documentacion`) en una con `entidad_tipo` + `entidad_id` + `empresa_id`/`expediente_id` directos. Reduce JOINs en queries comunes.

## Mensaje para Juan al retomar

"Sprint 6 hecho. Hallazgo grande: el schema canónico ya está casi todo aplicado en CRM (sprint 4 lo hizo). Falta Fase 1 (3 renames + drop + add cols) en `supabase/migrations/20260426_fase1_unificacion_renames_schema.sql`, validada via dry-run, lista para aplicar en 1 minuto. Fase 2 (importar 408 filas Potencias→CRM con dedupe) preparada en 3 scripts SQL — solo te falta ejecutar el protocolo PowerShell con backups + connection strings. Fase 3 (FE refactor) son 8 archivos mapeados, recomendado dejar `proposals` viva (comentar el drop) hasta que el sprint FE consolide las 3 features. Decisión arquitectónica: migración in-place sobre CRM (no proyecto nuevo) — sprint total pasa de 10-12d a 3-5d restantes. ¿Aplicamos Fase 1 ya o quieres revisar antes?"
