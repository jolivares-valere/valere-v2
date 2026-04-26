# Fase 4 — Dry-run de las compat views para apps satélite

> Sprint paralelo A (backend) — 2026-04-25 noche.
> Continuación de `docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md` §4.C.
> Validado contra prod (`gtphkowfcuiqbvfkwjxb`) en transacción `BEGIN…ROLLBACK` vía MCP.

---

## Resumen

El plan ejecutivo proponía 10 vistas (`clients`, `supplies`, `profiles`, `regulated_rates`, `alerts`, `power_requests`, `client_communications`, `client_documents`, `expediente_documents`, `documentacion`) para que las apps satélite (Potencias / Excedentes) sigan funcionando tras cambiar solo las env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) sin tocar código.

El dry-run encontró **3 desviaciones** entre las definiciones del plan y el schema canónico real. Las cinco restantes compilan sin retoques. Este documento entrega el SQL final ya verificado.

| view | filas (dry-run) | desviación vs plan |
|---|---|---|
| clients | 3 | nombre de columnas (ver §1) |
| supplies | 1 | placeholders por columnas inexistentes (ver §2) |
| profiles | 3 | derivación de `activo` (ver §3) |
| regulated_rates | 29 | OK |
| alerts | 0 | OK |
| power_requests | 0 | OK |
| client_communications | 0 | OK |
| client_documents | 0 | OK |
| expediente_documents | 0 | OK |
| documentacion | 0 | OK |

Las cuentas a 0 reflejan tablas vacías hasta que la Fase 2 cargue datos. La Fase 4 puede aplicarse antes o después de Fase 2 indistintamente — las views son DDL puro sobre el schema actual.

---

## 1) `clients` — desviación crítica

El plan referenciaba columnas que no existen en `empresas`:

| Plan original | Schema real | Acción |
|---|---|---|
| `nombre_fiscal` | `nombre` | aliasar `nombre AS nombre_fiscal` |
| `cif` | `nif` | aliasar `nif AS cif` |
| `email_contacto` | `email_principal` | aliasar |
| `direccion_fiscal` | `direccion` | aliasar |
| `codigo_postal` | `cp` | aliasar |
| `telefono` | `telefono_principal` | aliasar |
| `gestor_id` | `comercial_id` | aliasar |

`empresas.activo`, `created_by`, `notas`, `asesor_id`, `legacy_potencia_id` sí existen → pasan tal cual.

```sql
create view public.clients as
  select
    id,
    nombre              as nombre_fiscal,
    nif                 as cif,
    email_principal     as email_contacto,
    telefono_principal  as telefono,
    direccion           as direccion_fiscal,
    ciudad,
    cp                  as codigo_postal,
    asesor_id,
    notas,
    activo,
    created_by,
    created_at,
    comercial_id        as gestor_id,
    legacy_potencia_id
  from public.empresas;
```

## 2) `supplies` — placeholders donde el canónico no tiene columna

El plan referenciaba columnas inexistentes en `cups`:

| Plan | Schema real | Acción dry-run |
|---|---|---|
| `notas` | (no existe) | `null::text as notas` |
| `created_by` | (no existe) | `null::uuid as created_by` |
| `comercializadora_id` | (no existe; sí `comercializadora_actual TEXT`) | `null::uuid as comercializadora_id` |

Si Potencias-app intenta INSERT/UPDATE de esos campos, fallará silenciosamente (auto-updatable views ignoran columnas computadas). Cuatro opciones:

(a) Asumir que Potencias-app solo lee → mantener placeholders.
(b) Si escribe `notas` o `created_by`, añadir columnas a `cups` (ALTER TABLE — barato, additive).
(c) Si escribe `comercializadora_id`, hace falta INSTEAD OF trigger que mapee a `comercializadora_actual` por nombre.
(d) Refactor real de Potencias-app (estrategia largo plazo).

**Recomendación pragmática**: opción (a) hasta confirmar con grep que Potencias-app no escribe esos 3 campos.

```sql
create view public.supplies as
  select
    c.id,
    c.empresa_id                    as client_id,
    c.codigo_cups                   as cups,
    c.denominacion,
    c.direccion_suministro,
    c.ciudad_suministro,
    c.tarifa_acceso                 as tariff_type,
    c.channel,
    c.distribuidor                  as distribuidora,
    c.comercializadora_actual       as comercializadora,
    c.p1_kw, c.p2_kw, c.p3_kw, c.p4_kw, c.p5_kw, c.p6_kw,
    c.potencia_maxima_disponible,
    c.tension_kv,
    null::text                      as notas,
    (c.estado = 'activo')           as activo,
    c.created_at,
    null::uuid                      as created_by,
    null::uuid                      as comercializadora_id,
    c.legacy_potencia_id
  from public.cups c;
```

## 3) `profiles` — derivación de `activo` y de `nombre/apellidos`

`user_profiles` tiene `email`, `full_name`, `role`, `status`, `approved`, `nombre`, `apellidos`. El plan asume `nombre`, `apellidos`, `activo` directos. Schema real:

- `nombre`/`apellidos` ya existen como columnas separadas — se prefieren.
- `activo` no existe → derivar como `(status='active' OR approved=true)`.

```sql
create view public.profiles as
  select
    id,
    email,
    coalesce(nombre, split_part(coalesce(full_name,''), ' ', 1))            as nombre,
    coalesce(apellidos, regexp_replace(coalesce(full_name,''),'^\S+\s*','')) as apellidos,
    role                                                                     as rol,
    coalesce(status='active', approved, true)                                as activo,
    created_at
  from public.user_profiles;
```

## 4) Resto (sin cambios respecto al plan)

```sql
create view public.regulated_rates as
  select id, tariff_type, period, rate_eur_kw_day, valid_from, valid_to, updated_by, updated_at
  from public.precios_regulados_boe;

create view public.alerts as
  select id, expediente_id, ciclo_id, request_id,
         cups_id    as supply_id,
         empresa_id as client_id,
         tipo, fecha_alerta, mensaje, leida, fecha_lectura, leida_por, created_at
  from public.alertas;

create view public.power_requests as
  select id, ciclo_id, expediente_id,
         cups_id    as supply_id,
         empresa_id as client_id,
         tipo, estado, comercializadora_nombre, channel_used,
         p1_actual, p1_nueva, p2_actual, p2_nueva, p3_actual, p3_nueva,
         p4_actual, p4_nueva, p5_actual, p5_nueva, p6_referencia,
         fecha_solicitud_enviada, fecha_envio_autorizacion, fecha_firma_cliente,
         fecha_autorizacion, fecha_ejecucion_real,
         fecha_prevista_inicio, fecha_prevista_fin,
         fecha_alerta_amarilla, fecha_alerta_naranja, fecha_alerta_roja,
         ref_solicitud_distribuidora, ref_autorizacion,
         doc_autorizacion_id, doc_autorizacion_firmada_id,
         notas_internas, created_by, created_at, updated_at
  from public.solicitudes_potencia;

create view public.client_communications as
  select id, empresa_id as client_id, expediente_id, ciclo_id,
         tipo, asunto, cuerpo_html, destinatario_email, cc_email,
         fecha_envio, enviado_por, resend_message_id, estado, error_detalle, created_at
  from public.comunicaciones_cliente;

create view public.client_documents as
  select id, empresa_id as client_id, tipo, nombre, descripcion, nombre_archivo,
         ruta_storage as storage_path, tamano_bytes, expediente_id, ciclo_id,
         metadata, subido_por, created_at
  from public.documentos
  where entidad_tipo = 'empresa';

create view public.expediente_documents as
  select id, expediente_id, ciclo_id, tipo, nombre_archivo, nombre_original,
         mime_type, tamano_bytes, ruta_storage as storage_path, notas,
         subido_por, created_at
  from public.documentos
  where entidad_tipo = 'expediente';

create view public.documentacion as
  select id, nombre, descripcion, 'normativa'::text as categoria, nombre_archivo,
         ruta_storage as storage_path, tamano_bytes, subido_por, created_at
  from public.documentos
  where entidad_tipo = 'general';
```

## 5) Auto-updatable y limitaciones

Postgres trata como auto-updatable cualquier view donde:
- la `select` tenga sólo una tabla base, sin DISTINCT/GROUP/HAVING/UNION;
- las columnas referenciadas sean **directas** (alias simples cuentan como directas).

Implicaciones por view:

| view | INSERT/UPDATE auto-updatable | INSERT/UPDATE necesita trigger |
|---|---|---|
| clients | sí (todos los campos son alias 1-a-1) | — |
| supplies | parcial (las 3 columnas placeholder no son writable) | si Potencias-app escribe `notas`/`created_by`/`comercializadora_id` |
| profiles | parcial (la columna `activo` es expresión booleana) | si Potencias-app actualiza `activo`, va vía trigger |
| regulated_rates | sí | — |
| alerts, power_requests, client_communications | sí | — |
| client_documents, expediente_documents, documentacion | NO (filtran por `entidad_tipo`) | sí — INSTEAD OF INSERT que ponga `entidad_tipo` |

Patrón de trigger para los 3 últimos (idéntico al usado en sprint 7 para `retailer_offers`):

```sql
create or replace function public.legacy_client_documents_insert() returns trigger
language plpgsql security invoker set search_path='public' as $$
begin
  insert into public.documentos
    (id, entidad_tipo, entidad_id, empresa_id, tipo, nombre, descripcion,
     nombre_archivo, ruta_storage, tamano_bytes, expediente_id, ciclo_id,
     metadata, subido_por, created_at)
  values
    (coalesce(NEW.id, gen_random_uuid()), 'empresa', NEW.client_id,
     NEW.client_id, NEW.tipo, NEW.nombre, NEW.descripcion,
     NEW.nombre_archivo, NEW.storage_path, NEW.tamano_bytes,
     NEW.expediente_id, NEW.ciclo_id, NEW.metadata, NEW.subido_por,
     coalesce(NEW.created_at, now()));
  return NEW;
end$$;

create trigger client_documents_insert_trg
  instead of insert on public.client_documents
  for each row execute function public.legacy_client_documents_insert();
```

Replicar para `expediente_documents` (entidad_tipo='expediente') y `documentacion` (entidad_tipo='general'). Solo si Potencias-app escribe documentos por la app — si no, omitir.

## 6) Verificación dry-run completa

Ejecutado vía MCP `execute_sql` contra prod en transacción única `begin … rollback`:

```sql
-- (10 create view + 1 select counts) — todos verde, 0 errores.
select 'clients' as v, count(*) from public._test_clients union all
select 'supplies', count(*) from public._test_supplies union all
select 'profiles', count(*) from public._test_profiles union all
select 'regulated_rates', count(*) from public._test_regulated_rates union all
select 'alerts', count(*) from public._test_alerts union all
select 'power_requests', count(*) from public._test_power_requests union all
select 'client_communications', count(*) from public._test_client_communications union all
select 'client_documents', count(*) from public._test_client_documents union all
select 'expediente_documents', count(*) from public._test_expediente_documents union all
select 'documentacion', count(*) from public._test_documentacion;

-- Resultado:
-- clients=3 supplies=1 profiles=3 regulated_rates=29 alerts=0 power_requests=0
-- client_communications=0 client_documents=0 expediente_documents=0 documentacion=0
```

## 7) Riesgos identificados

1. **Apps satélite escriben columnas inexistentes** (§2). Mitigación: grep contra repo de Potencias antes de cutover. Si escribe → opción (b) o (c).
2. **`cups.estado='activo'` puede no ser el valor esperado** — el real podría ser `'alta'`, `'baja'`, etc. Verificar `select distinct estado from public.cups` después de Fase 2.
3. **`comercializadora_actual` es TEXT, no FK** — al exponerlo como `comercializadora` y como `comercializadora_id` (uuid placeholder), una app que espere FK podría romperse. Revisar Potencias-app.
4. **Storage** — `client_documents.storage_path` apunta al bucket viejo (Potencias). Las views NO reescriben URLs; los PDFs siguen accesibles solo desde la cuenta original. Ver `docs/SUPABASE_BUCKET_STORAGE_POTENCIAS_2026-04-25.md`.

## 8) Migration final propuesta

Cuando Juan dé OK, crear `supabase/migrations/_draft_fase4_compat_views_apps_satelite.sql` con el SQL del §1-4 + (opcionalmente) los triggers del §5 — patrón `_draft_` para que no se auto-aplique. Aplicar via `mcp__apply_migration` con name `fase4_compat_views_apps_satelite`. Drop documentado en Fase 5.A (ver `docs/SUPABASE_FASE5_DRY_RUN_2026-04-25.md`).
