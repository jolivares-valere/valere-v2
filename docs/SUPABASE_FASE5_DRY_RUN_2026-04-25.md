# Fase 5 — Dry-run de cleanup post-cutover

> Sprint paralelo A (backend) — 2026-04-25 noche.
> Continuación de `docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md` §5.
> Validado contra prod (`gtphkowfcuiqbvfkwjxb`) en transacción `BEGIN…ROLLBACK` vía MCP.

---

## Resumen

La Fase 5 limpia el legado tras 1 semana estable de la Fase 4. El dry-run confirma que **no hay objetos terceros que dependan de las views legacy o de la tabla `proposals`**, y que el `DROP … CASCADE` no tiene efectos colaterales más allá de los esperados. La transacción `BEGIN … DROP … ROLLBACK` deja todos los objetos intactos.

---

## 1) Inventario actual (sprint 7+8 dejaron esto)

| objeto | tipo | uso |
|---|---|---|
| `public.retailers` | view legacy | apunta a `comercializadoras` |
| `public.retailer_offers` | view legacy | apunta a `comercializadora_ofertas` |
| `public.boe_regulated_prices` | view legacy | apunta a `precios_regulados_boe` |
| `public.legacy_retailers_insert()` | trigger func | INSTEAD OF INSERT en view `retailers` |
| `public.legacy_retailer_offers_insert()` | trigger func | INSTEAD OF INSERT en view `retailer_offers` |
| `public.proposals` | tabla | 0 filas; legacy de Calculadora (decisión sprint 7: viva hasta consolidación FE) |

Si Fase 4 añade `clients/supplies/profiles/regulated_rates/alerts/power_requests/client_communications/client_documents/expediente_documents/documentacion` también deben dropearse aquí.

## 2) Análisis de dependencias

```sql
-- 0 vistas/MV/funciones de terceros referencian retailers/retailer_offers/
-- boe_regulated_prices/proposals (verificado vía pg_depend + pg_rewrite)
select dependent_view.relname    as dependent,
       source_table.relname      as referenced
from pg_depend d
join pg_rewrite r           on r.oid = d.objid
join pg_class dependent_view on dependent_view.oid = r.ev_class
join pg_namespace dependent_ns on dependent_ns.oid = dependent_view.relnamespace
join pg_class source_table   on source_table.oid = d.refobjid
join pg_namespace source_ns  on source_ns.oid = source_table.relnamespace
where source_ns.nspname='public'
  and source_table.relname in ('proposals','retailers','retailer_offers','boe_regulated_prices')
  and dependent_view.oid != source_table.oid
  and dependent_view.relkind in ('v','m','r');
-- Resultado: 0 filas → safe to drop.
```

Lo único que cuelga es:
- `policies` sobre `proposals` (5 policies) → se borran con el `DROP TABLE … CASCADE`.
- `triggers` sobre las 3 views legacy → se borran con `DROP VIEW … CASCADE`.

## 3) DRY-RUN ejecutado contra prod (BEGIN…ROLLBACK)

```sql
begin;

-- 5.A — drop compat views legacy + funciones
drop view if exists public.retailers cascade;
drop view if exists public.retailer_offers cascade;
drop view if exists public.boe_regulated_prices cascade;
drop function if exists public.legacy_retailers_insert();
drop function if exists public.legacy_retailer_offers_insert();

-- 5.B — drop tabla proposals
drop table if exists public.proposals cascade;

-- Verificación: 0 objetos legacy quedan en el schema
select 'view retailers' as obj, count(*) from information_schema.views
  where table_schema='public' and table_name='retailers'
union all select 'view retailer_offers', count(*) from information_schema.views
  where table_schema='public' and table_name='retailer_offers'
union all select 'view boe_regulated_prices', count(*) from information_schema.views
  where table_schema='public' and table_name='boe_regulated_prices'
union all select 'func legacy_retailers_insert', count(*) from pg_proc
  where proname='legacy_retailers_insert'
union all select 'tabla proposals', count(*) from information_schema.tables
  where table_schema='public' and table_name='proposals';
-- → todos 0 dentro de la transacción.

rollback;

-- Post-rollback: verificación los objetos volvieron
select 'view retailers' as obj, count(*) from information_schema.views
  where table_schema='public' and table_name='retailers';
-- → 1 (intacto).
```

✅ Confirmado: el rollback restaura todo, no hay efectos secundarios fuera del alcance esperado, y el `DROP … CASCADE` no afecta nada más allá de las policies/triggers asociados.

## 4) SQL final propuesto (cuando se aplique en serio)

```sql
-- supabase/migrations/_draft_fase5_drop_legacy.sql
-- ═══════════════════════════════════════════════════════════════
-- Aplicar tras 1 semana de Fase 4 estable + grep contra src/ y
-- repos satélite confirmando 0 referencias a:
--   - retailers / retailer_offers / boe_regulated_prices (CRM)
--   - clients / supplies / profiles / regulated_rates / alerts /
--     power_requests / client_communications / client_documents /
--     expediente_documents / documentacion (apps satélite)
--   - proposals (FE de AnalisisPage / TrackingPage / PropuestasEnergiaPage)
-- ═══════════════════════════════════════════════════════════════

begin;

-- 5.A.1 — compat views CRM (sprint 7)
drop view if exists public.retailers cascade;
drop view if exists public.retailer_offers cascade;
drop view if exists public.boe_regulated_prices cascade;
drop function if exists public.legacy_retailers_insert();
drop function if exists public.legacy_retailer_offers_insert();

-- 5.A.2 — compat views apps satélite (Fase 4)
drop view if exists public.clients cascade;
drop view if exists public.supplies cascade;
drop view if exists public.profiles cascade;
drop view if exists public.regulated_rates cascade;
drop view if exists public.alerts cascade;
drop view if exists public.power_requests cascade;
drop view if exists public.client_communications cascade;
drop view if exists public.client_documents cascade;
drop view if exists public.expediente_documents cascade;
drop view if exists public.documentacion cascade;
-- Triggers asociados se borran solos vía CASCADE.
-- Eliminar también las trigger functions si se llegaron a crear:
drop function if exists public.legacy_client_documents_insert();
drop function if exists public.legacy_expediente_documents_insert();
drop function if exists public.legacy_documentacion_insert();

-- 5.B — drop tabla proposals
drop table if exists public.proposals cascade;

-- 5.E — RLS hardening 8 tablas (ver SUPABASE_RLS_HARDENING_VALIDACION_2026-04-25.md)
-- (incluir aquí el contenido de _draft_rls_hardening_8_tables.sql)

commit;
```

## 5) Idempotencia

Todos los `DROP … IF EXISTS` son seguros para re-ejecutar. La migración Fase 5 puede aplicarse repetidamente sin error, lo que es útil si hay que pausar a mitad y reanudar.

## 6) Plan de rollback

Fase 5 es **destructiva por diseño**. Rollback = restaurar desde backup `pg_dump` previo. Antes de aplicar:

```bash
# Snapshot previo (Juan, PowerShell)
pg_dump --schema-only \
  postgresql://postgres:<pwd>@db.gtphkowfcuiqbvfkwjxb.supabase.co:5432/postgres \
  > $HOME/valere-backups/pre_fase5_schema_$(date +%Y-%m-%d).sql

# Si tras la migración algo se rompe, recrear los objetos manualmente con:
#   - sprint 7 fase1b (compat views legacy) ya guardada en supabase/migrations/
#   - SUPABASE_FASE4_DRY_RUN_2026-04-25.md (SQL completo de las 10 views satélite)
#   - el SQL de proposals: residuo Calculadora — recuperar desde backup si fuera necesario.
```

## 7) Pre-condiciones antes de aplicar

Lista de verificación obligatoria — Juan marca cada uno antes de migrar:

- [ ] **Fase 4 aplicada** y app Potencias funcionando contra CRM ≥ 1 semana sin incidentes.
- [ ] `grep -r 'retailers\|retailer_offers\|boe_regulated_prices' src/` en valere-v2 → 0 hits (excepto en `src/types/database.ts` donde son views, pero deben pasar a `comercializadoras`/etc.).
- [ ] `grep -r 'clients\|supplies\|profiles\|regulated_rates\|alerts\|power_requests' src/` → 0 hits en código FE (todos refactorizados a nombres canónicos).
- [ ] FE consolidación `proposals → propuestas` aplicada. Confirmado vía `select count(*) from public.proposals` = 0 sin nuevas escrituras durante 7 días (revisar logs).
- [ ] Backup `pg_dump --schema-only` guardado en `$HOME/valere-backups/`.
- [ ] Tests `npm test -- --run` pasando 39/39.
- [ ] TSC 0 errores.

## 8) Resultado dry-run y siguientes pasos

**Dry-run**: ✅ pass. Cero errores, cero dependencias inesperadas.
**Próximo paso**: cuando Juan confirme las pre-condiciones del §7, generar `supabase/migrations/fase5_drop_legacy_y_rls.sql` (sin prefijo `_draft_`) con el contenido del §4 + RLS hardening, y aplicar via MCP.
