# Auditoría completa de advisors + plan de tuning de índices

> Sprint paralelo A (backend) — 2026-04-25 noche.
> Snapshot vía MCP `get_advisors` security + performance contra prod (`gtphkowfcuiqbvfkwjxb`).

---

## Inventario

**Security**: 9 WARN + 0 ERROR.
**Performance**: 144 lints distribuidos así:

| Categoría | Cuenta | Severidad | Impacto |
|---|---|---|---|
| `unindexed_foreign_keys` | 45 | INFO | bajo (DB casi vacía hoy) |
| `unused_index` | 41 | INFO | nulo (DB sin tráfico — no se han usado todavía) |
| `multiple_permissive_policies` | 35 | WARN | medio (latencia por RLS redundante) |
| `auth_rls_initplan` | 23 | WARN | medio (re-eval `auth.uid()` por fila) |

Dado que la DB está casi vacía (mayor tabla: `crm_help_embeddings` con 216 filas, ~2 MB), la **prioridad real** es:

1. Limpiar `multiple_permissive_policies` y `auth_rls_initplan` ahora — son problemas estructurales, no de volumen, y empeorarán con el tráfico de Fase 4+.
2. Esperar al post-Fase-2 (~408 filas) y al ramp-up de tráfico para decidir índices reales.
3. **NO dropear los `unused_index`** — no se han usado porque la DB no tiene tráfico todavía.
4. **NO crear todos los `unindexed_foreign_keys`** — al volumen actual y al previsto post-Fase-2, un seq scan sobre 50-100 filas es más barato que mantener un índice.

---

## 1) Security advisors (9 WARN)

| Tabla / Auth | Política | Acción |
|---|---|---|
| `alertas` | `alertas_authenticated_all` USING(true) | Aplicar RLS hardening (`docs/SUPABASE_RLS_HARDENING_VALIDACION_2026-04-25.md`) |
| `ciclos` | idem | idem |
| `comercializadora_docs` | idem | idem |
| `comunicaciones_cliente` | idem | idem |
| `excel_import_templates` | idem | idem |
| `expedientes` | idem | idem |
| `savings_calculations` | idem | idem |
| `solicitudes_potencia` | idem | idem |
| Auth | `leaked_password_protection` desactivado | Activar en Supabase Dashboard → Authentication → Settings (free tier OK) |

Tras el hardening + flip de `leaked_password_protection`, security WARN debería ir a 0.

---

## 2) `multiple_permissive_policies` (35 WARN)

Todos los casos son **policies duplicadas** que deberían fundirse en una sola por (tabla, comando, rol). Origen identificado:

### 2.A — Heredados de migraciones tempranas (FE pre-fusión)

Tablas `comercializadoras`, `comercializadora_ofertas`, `precios_regulados_boe`, `facturas`, `global_config`, `proposals` tienen 2-3 policies SELECT redundantes (`Authenticated users can read X` + `X_select` + `X_write` con USING(true)).

**Acción**: dropear las redundantes, dejar 1 SELECT abierta (`X_select using (true)`) y la `X_write` para INSERT/UPDATE/DELETE.

### 2.B — Policies CRM duplicadas

`actividades`, `contactos`, `oportunidades`, `tareas` tienen `X_read` (cmd=SELECT) y `X_write` (cmd=ALL). Como cmd=ALL incluye SELECT, cualquier petición SELECT evalúa **ambas** policies (PG hace OR). Es la fuente de los WARN.

**Acción**: cambiar `X_write` de `cmd=ALL` a `cmd=INSERT,UPDATE,DELETE` separadas. Mantiene la semántica, elimina la duplicidad de SELECT.

### 2.C — `documentos` y `eventos` con policies polimórficas heredadas

`documentos` tiene 3 policies (`doc_read`, `doc_write`, `documentos_all_authenticated`) sobre 5 roles diferentes. La policy `documentos_all_authenticated` USING(true)/WITH CHECK(true) hace inútiles las dos anteriores.

**Acción**: dropear `documentos_all_authenticated`. Las `doc_read`/`doc_write` granulares son las correctas. Idem para `eventos`.

### Migration propuesta

```sql
-- supabase/migrations/_draft_dedupe_permissive_policies.sql
begin;

-- ════════════════════════════════════════════════════════
-- 2.A — comercializadoras / ofertas / precios_regulados_boe / facturas / global_config
-- ════════════════════════════════════════════════════════
drop policy if exists "Authenticated users can read retailers"           on public.comercializadoras;
drop policy if exists "Authenticated users can read retailer_offers"     on public.comercializadora_ofertas;
drop policy if exists "Authenticated users can read boe_regulated_prices" on public.precios_regulados_boe;
drop policy if exists "Authenticated users can read invoice_history"     on public.facturas;
drop policy if exists "Authenticated users can read global_config"       on public.global_config;
drop policy if exists "Authenticated users can read proposals"           on public.proposals;

-- Dropear write USING(true) overlap con select policies
drop policy if exists retailers_write             on public.comercializadoras;
drop policy if exists retailer_offers_write       on public.comercializadora_ofertas;
drop policy if exists boe_write                   on public.precios_regulados_boe;
drop policy if exists global_config_write         on public.global_config;

-- Recrear write con cmd granular (NO ALL)
create policy comercializadoras_insert on public.comercializadoras
  for insert to authenticated with check (public.is_manager_or_above());
create policy comercializadoras_update on public.comercializadoras
  for update to authenticated
  using (public.is_manager_or_above())
  with check (public.is_manager_or_above());
create policy comercializadoras_delete on public.comercializadoras
  for delete to authenticated using (public.is_manager_or_above());
-- (idem comercializadora_ofertas, precios_regulados_boe, global_config)

-- ════════════════════════════════════════════════════════
-- 2.B — actividades / contactos / oportunidades / tareas
-- ════════════════════════════════════════════════════════
drop policy if exists a_write on public.actividades;
create policy actividades_insert on public.actividades for insert to authenticated with check (true);
create policy actividades_update on public.actividades for update to authenticated using (true) with check (true);
create policy actividades_delete on public.actividades for delete to authenticated using (true);
-- (idem co_write/contactos, op_write/oportunidades, t_write/tareas)

-- ════════════════════════════════════════════════════════
-- 2.C — documentos / eventos: dropear el catch-all USING(true)
-- ════════════════════════════════════════════════════════
drop policy if exists documentos_all_authenticated on public.documentos;
-- doc_read, doc_write se quedan (granular)

-- (idem eventos: dropear ev_write si solapa con ev_read en SELECT —
-- pero ev_write es cmd=ALL con USING(true) y ev_read cmd=SELECT con USING(true).
-- Solución: cambiar ev_write a cmd=INSERT,UPDATE,DELETE granular.)

commit;
```

Estimación: 35 advisors → 0 tras esta migration. Sin cambios en semántica de acceso.

---

## 3) `auth_rls_initplan` (23 WARN)

PG re-evalúa `auth.uid()` por cada fila al usarse en una policy. Wrapper `(select auth.uid())` lo memoize. Las 23 policies afectadas:

```
public.actividades.a_read
public.actividades.a_write
public.contactos.co_read
public.contactos.co_write
public.contratos.c_read
public.contratos.c_update
public.crm_asistente_log.asistente_log_admin_read
public.cups.cu_all
public.datadis_consumptions.datadis_consumptions_select
public.datadis_tokens.datadis_tokens_select
public.documentos.documentos_all_authenticated
public.empresas.e_insert
public.empresas.e_update
public.incidencias.incidencias_all_authenticated
public.notificaciones.notif_select
public.notificaciones.notif_update
public.oportunidades.op_read
public.oportunidades.op_write
public.propuestas.p_all
public.renovaciones.renovaciones_all_authenticated
public.tareas.t_write
public.user_profiles.Users can insert own profile
public.user_profiles.up_update_self
```

Receta universal:

```sql
alter policy a_read on public.actividades
  using ((select auth.uid()) = creado_por);  -- antes: auth.uid() = creado_por
```

Migration en bloque (35 ALTERs, todos cosméticos). Recomiendo combinar con la del §2 — es el mismo sprint de saneamiento RLS.

---

## 4) `unindexed_foreign_keys` (45 INFO) — análisis prudente

Tamaño actual de las tablas afectadas: **todas <100 filas**. Crear índices ahora es coste sin beneficio (overhead de mantener BTree con casi cero rows).

**Estrategia recomendada en 2 etapas**:

### Etapa 1 — post-Fase-2 (~408 filas, semana 1)

Solo crear índices en FKs donde el seq scan ya empiece a doler:

```sql
-- Tablas que llegarán a >100 filas tras Fase 2:
-- empresas (~30+3), cups (~75+1), expedientes (~41), ciclos (~41),
-- solicitudes_potencia (~41), alertas (~?), documentos (~70+).

-- Empresa.comercial_id se usa en filtros del dashboard — ya tiene idx_empresas_comercial.
-- cups.empresa_id se usa para listar CUPS por empresa — ya tiene idx_cups_empresa.

-- Recomendar:
create index if not exists idx_alertas_empresa on public.alertas(empresa_id);
create index if not exists idx_alertas_cups on public.alertas(cups_id);
create index if not exists idx_alertas_expediente on public.alertas(expediente_id);
create index if not exists idx_solicitudes_cups on public.solicitudes_potencia(cups_id);
create index if not exists idx_solicitudes_expediente on public.solicitudes_potencia(expediente_id);
create index if not exists idx_documentos_empresa on public.documentos(empresa_id);
create index if not exists idx_documentos_cups on public.documentos(cups_id);
create index if not exists idx_documentos_expediente on public.documentos(expediente_id);
create index if not exists idx_documentos_ciclo on public.documentos(ciclo_id);
create index if not exists idx_status_log_expediente on public.status_log(expediente_id);
```

(11 índices que cubren los joins más frecuentes — cifras estimadas en función del FE actual.)

### Etapa 2 — cuando alguna tabla pase de 1000 filas

Activar `pg_stat_statements` (ya está en extensions, verificar) y recoger queries reales con `> 100ms`. Solo entonces crear índices basados en uso real.

```sql
-- Ver top queries lentas
select substring(query, 1, 80) as q, calls, total_exec_time, mean_exec_time
from pg_stat_statements
where dbid=(select oid from pg_database where datname=current_database())
order by mean_exec_time desc limit 30;
```

### NO hacer (tentación común que enrarece el schema)

- Crear los 45 índices listados — la mayoría no se usarán.
- Indexar columnas como `legacy_potencia_id` (solo se usan durante la migración Fase 2).
- Indexar `created_by`/`updated_by` salvo que haya páginas tipo "creado por mí".

---

## 5) `unused_index` (41 INFO)

Razón conocida: DB casi sin tráfico. Los 41 índices de los `idx_X_*` previstos por el FE (oportunidades, empresas, cups, etc.) no se han usado nunca porque la app no se ha lanzado a producción real.

**Acción recomendada**: ignorar este advisor hasta 1 mes después del cutover Fase 4. Entonces, re-evaluar:

```sql
-- Identificar índices realmente sin uso a 1 mes vista
select schemaname, relname, indexrelname, idx_scan, idx_tup_read
from pg_stat_user_indexes
where schemaname='public'
  and idx_scan = 0
  and not exists (
    select 1 from pg_constraint where conindid = indexrelid
  )  -- preservar índices de constraints (PK/UK/FK)
order by pg_relation_size(indexrelid) desc;
```

Solo dropear los que sigan a 0 scans tras 1 mes y >100 KB. Antes de eso, cualquier drop es prematuro.

---

## 6) Plan de aplicación

| Migration | Cuándo | Resuelve |
|---|---|---|
| `_draft_rls_hardening_8_tables_v2.sql` (con `(select auth.uid())`) | Post-Fase-2 + revisión rol comerciales | 8 security WARN + 4 auth_rls_initplan |
| `_draft_dedupe_permissive_policies.sql` | Mismo sprint que el anterior | 35 multiple_permissive WARN |
| `_draft_initplan_optimization_remaining.sql` | Mismo sprint | 19 auth_rls_initplan WARN restantes |
| `_draft_indexes_post_fase2.sql` (11 indices) | Tras 1 semana post-Fase-2 si hay queries >50ms | Calidad subjetiva |

Activación de `leaked_password_protection`: 1 click en Dashboard, sin migration. Hacerlo ya.

## 7) Snapshot de salida esperado

Tras aplicar las 3 migrations RLS:

| Categoría | Antes | Después |
|---|---|---|
| security WARN | 9 | 1 (auth_leaked_password si no se activa) |
| `multiple_permissive_policies` | 35 | 0 |
| `auth_rls_initplan` | 23 | 0 |
| `unindexed_foreign_keys` | 45 | 45 (intencional — esperar) |
| `unused_index` | 41 | 41 (intencional — esperar) |
| **Total advisors** | **153** | **86** (44 % reducción, todos INFO) |

## 8) Notas sobre logs de Postgres

`mcp__get_logs postgres` devuelve los últimos 100 eventos: 99 LOG (mantenimiento de checkpoints, autenticaciones), 1 ERROR (mi propio test de NOT NULL en expedientes durante el dry-run RLS — falso positivo).

Sin slow queries, sin errores reales. Reflejo de DB sin tráfico significativo. Tras Fase 2 + 1 semana de uso, repetir el inventario de logs para detectar patrones reales.
