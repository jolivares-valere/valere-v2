-- ═══════════════════════════════════════════════════════════════════
-- Fase 2.B — Dedupe + transform staging → canónico
-- ═══════════════════════════════════════════════════════════════════
-- Prerequisitos:
--   • Fase 1 ya aplicada (`20260426_fase1_unificacion_renames_schema.sql`)
--   • Schema `_potencia_staging` poblado vía pg_dump --data-only
--
-- Todo dentro de UNA transacción — si algo falla, ROLLBACK total.
-- Tablas de mapeo `_migration_*_map` quedan persistidas para auditar / re-run.
-- ═══════════════════════════════════════════════════════════════════

begin;

-- ───────── Funciones helper (v2 — endurecidas tras dry-run 2026-04-26) ─────────
-- norm_cif: ahora también elimina `/` (defensivo)
create or replace function pg_temp.norm_cif(input text) returns text
language sql immutable as $$
  select nullif(upper(regexp_replace(coalesce(input,''), '[\s\-\.\\/]', '', 'g')), '');
$$;

create or replace function pg_temp.norm_cups(input text) returns text
language sql immutable as $$
  select nullif(upper(regexp_replace(coalesce(input,''), '\s', '', 'g')), '');
$$;

-- norm_nombre v2:
--   • TRANSLATE() para quitar acentos (sin requerir extension unaccent)
--   • Quita comas, paréntesis, guiones además de puntos/espacios
--   • Soporta SAU/SLU/SCOOP/SCP/SCL/SA/SL al final del string (no en medio)
create or replace function pg_temp.norm_nombre(input text) returns text
language sql immutable as $$
  select nullif(
    upper(
      regexp_replace(
        regexp_replace(
          translate(
            coalesce(input, ''),
            'áéíóúÁÉÍÓÚüÜñÑàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛ',
            'aeiouAEIOUuUnNaeiouAEIOUaeiouAEIOU'
          ),
          '[\.\s,\(\)\-]', '', 'g'
        ),
        '(SAU|SLU|SCOOP|SCP|SCL|SA|SL)$', '', 'i'
      )
    ),
    ''
  );
$$;

-- ───────── Tablas de mapeo (legacy → canonical) ─────────
drop table if exists _migration_user_map;
drop table if exists _migration_empresa_map;
drop table if exists _migration_cups_map;
drop table if exists _migration_comercializadora_map;
drop table if exists _migration_expediente_map;
drop table if exists _migration_ciclo_map;
drop table if exists _migration_request_map;

create table _migration_user_map(legacy_potencia_id uuid primary key, canonical_id uuid not null);
create table _migration_empresa_map(legacy_potencia_id uuid primary key, canonical_id uuid not null, fusionada boolean default false);
create table _migration_cups_map(legacy_potencia_id uuid primary key, canonical_id uuid not null, fusionada boolean default false);
create table _migration_comercializadora_map(legacy_potencia_id uuid primary key, canonical_id uuid not null);
create table _migration_expediente_map(legacy_potencia_id uuid primary key, canonical_id uuid not null);
create table _migration_ciclo_map(legacy_potencia_id uuid primary key, canonical_id uuid not null);
create table _migration_request_map(legacy_potencia_id uuid primary key, canonical_id uuid not null);

-- ═══════════════════════════════════════════════════════════════════
-- 1. USERS (profiles → user_profiles)
-- ═══════════════════════════════════════════════════════════════════
-- Dedupe por email. Si existe el email en CRM, mapeamos al CRM id.
-- Si NO existe, NO insertamos auth.users desde aquí (eso requiere admin SDK
-- y se hace por separado con un script Node). Solo dejamos legacy_potencia_id
-- en user_profiles si coincide email.

insert into _migration_user_map (legacy_potencia_id, canonical_id)
select sp.id, up.id
from _potencia_staging.profiles sp
join public.user_profiles up on lower(up.email) = lower(sp.email);

-- Marcar legacy_potencia_id en los users de CRM que coinciden
update public.user_profiles up
   set legacy_potencia_id = sp.id
  from _potencia_staging.profiles sp
 where lower(up.email) = lower(sp.email)
   and up.legacy_potencia_id is null;

-- Los que NO coinciden quedan en _potencia_staging.profiles SIN entrada en _migration_user_map.
-- En las inserts subsiguientes, las FK a usuarios usarán COALESCE(map.canonical_id, NULL).

-- ═══════════════════════════════════════════════════════════════════
-- 2. COMERCIALIZADORAS (catálogo) — dedupe por nombre normalizado
-- ═══════════════════════════════════════════════════════════════════
-- En CRM ya hay 6 comercializadoras (renombradas desde retailers).
-- En Potencias hay 2. Comparamos por nombre normalizado.

insert into _migration_comercializadora_map (legacy_potencia_id, canonical_id)
select sc.id, c.id
from _potencia_staging.comercializadoras sc
join public.comercializadoras c
  on pg_temp.norm_nombre(coalesce(c.nombre_normalizado, c.name)) = pg_temp.norm_nombre(sc.nombre);

-- Insertar las que NO matchean
-- FIX dry-run 2026-04-26: la columna en CRM se llama `notes` (no `notas`)
insert into public.comercializadoras (id, name, nombre_normalizado, notes, activa, created_at, legacy_potencia_com_id)
select gen_random_uuid(), sc.nombre, pg_temp.norm_nombre(sc.nombre), sc.notas, sc.activa, sc.created_at, sc.id
  from _potencia_staging.comercializadoras sc
 where not exists (
   select 1 from _migration_comercializadora_map m where m.legacy_potencia_id = sc.id
 );

-- Re-añadir mappings de las recién insertadas
insert into _migration_comercializadora_map (legacy_potencia_id, canonical_id)
select c.legacy_potencia_com_id, c.id
  from public.comercializadoras c
 where c.legacy_potencia_com_id is not null
   and not exists (
     select 1 from _migration_comercializadora_map m where m.legacy_potencia_id = c.legacy_potencia_com_id
   );

-- ═══════════════════════════════════════════════════════════════════
-- 3. PRECIOS REGULADOS — append (no sustituir CRM)
-- ═══════════════════════════════════════════════════════════════════
-- regulated_rates de Potencias tiene valid_from/valid_to que CRM no tiene aún (queda NULL).
-- Para evitar duplicar, append solo los (period, tariff_type, valid_from) nuevos.

-- FIX dry-run 2026-04-26: precios_regulados_boe.tariff es NOT NULL en CRM (columna legacy);
-- duplicamos tariff_type → tariff para satisfacer la constraint hasta que Fase 1.5 la elimine.
insert into public.precios_regulados_boe (
  id, tariff, period, tariff_type, rate_eur_kw_day, valid_from, valid_to, updated_by, updated_at, legacy_potencia_id
)
select rr.id, rr.tariff_type, rr.period, rr.tariff_type, rr.rate_eur_kw_day, rr.valid_from, rr.valid_to,
       (select canonical_id from _migration_user_map where legacy_potencia_id = rr.updated_by),
       rr.updated_at, rr.id
  from _potencia_staging.regulated_rates rr
 where not exists (
   select 1 from public.precios_regulados_boe p
    where p.period = rr.period
      and coalesce(p.tariff_type, p.tariff) = rr.tariff_type
      and coalesce(p.valid_from, '0001-01-01'::date) = coalesce(rr.valid_from, '0001-01-01'::date)
 );

-- ═══════════════════════════════════════════════════════════════════
-- 4. EMPRESAS (clients → empresas) — dedupe por CIF normalizado
-- ═══════════════════════════════════════════════════════════════════

-- 4a. Match: si CRM ya tiene empresa con mismo CIF → fusión (mantener CRM id)
insert into _migration_empresa_map (legacy_potencia_id, canonical_id, fusionada)
select sc.id, e.id, true
  from _potencia_staging.clients sc
  join public.empresas e on pg_temp.norm_cif(e.nif) = pg_temp.norm_cif(sc.cif)
 where pg_temp.norm_cif(sc.cif) is not null;

-- Marcar legacy_potencia_id en las fusionadas
update public.empresas e
   set legacy_potencia_id = sc.id
  from _potencia_staging.clients sc
 where pg_temp.norm_cif(e.nif) = pg_temp.norm_cif(sc.cif)
   and pg_temp.norm_cif(sc.cif) is not null
   and e.legacy_potencia_id is null;

-- 4b. Internal Potencias dedup: si hay clientes Potencias con mismo CIF, elegir el más reciente
with potencia_dedup as (
  select distinct on (pg_temp.norm_cif(cif))
         id, nombre_fiscal, cif, persona_contacto, email_contacto, telefono,
         direccion_fiscal, ciudad, codigo_postal, asesor_id, gestor_id,
         notas, activo, created_by, created_at
    from _potencia_staging.clients
   where pg_temp.norm_cif(cif) is not null
   order by pg_temp.norm_cif(cif), created_at desc
), to_insert as (
  select pd.*
    from potencia_dedup pd
   where not exists (
     select 1 from _migration_empresa_map m where m.legacy_potencia_id = pd.id
   )
)
insert into public.empresas (
  id, nombre, nif, persona_contacto, email_principal, telefono_principal,
  direccion, ciudad, cp, comercial_id, asesor_id, notas, activo, legacy_potencia_id,
  created_by, created_at
)
select gen_random_uuid(), ti.nombre_fiscal, ti.cif, ti.persona_contacto, ti.email_contacto, ti.telefono,
       ti.direccion_fiscal, ti.ciudad, ti.codigo_postal,
       (select canonical_id from _migration_user_map where legacy_potencia_id = ti.gestor_id),
       (select canonical_id from _migration_user_map where legacy_potencia_id = ti.asesor_id),
       ti.notas, coalesce(ti.activo, true), ti.id,
       (select canonical_id from _migration_user_map where legacy_potencia_id = ti.created_by),
       ti.created_at
  from to_insert ti;

-- 4c. Re-mapear los IDs internos duplicados de Potencias al canonical_id elegido
insert into _migration_empresa_map (legacy_potencia_id, canonical_id, fusionada)
select sc.id, e.id, false
  from _potencia_staging.clients sc
  join public.empresas e on e.legacy_potencia_id = sc.id
 where not exists (
   select 1 from _migration_empresa_map m where m.legacy_potencia_id = sc.id
 );

-- 4d. Para los duplicados internos sin entrada (clientes con CIF que ya estaba en otro cliente Potencias),
-- mapearlos al mismo canonical_id que el "ganador" de su grupo de CIF.
insert into _migration_empresa_map (legacy_potencia_id, canonical_id, fusionada)
select sc.id, m.canonical_id, true
  from _potencia_staging.clients sc
  join _potencia_staging.clients winner
    on pg_temp.norm_cif(sc.cif) = pg_temp.norm_cif(winner.cif)
   and sc.id != winner.id
   and pg_temp.norm_cif(sc.cif) is not null
  join _migration_empresa_map m on m.legacy_potencia_id = winner.id
 where not exists (
   select 1 from _migration_empresa_map mm where mm.legacy_potencia_id = sc.id
 );

-- 4e. FIX dry-run 2026-04-26: clientes con CIF NULL — insertar como empresa propia (sin dedup).
-- Si NO se hace esto, los clients con CIF NULL se pierden y sus supplies/expedientes
-- quedan huérfanos por falta de entrada en _migration_empresa_map.
-- (En prod actual de Potencias, no hay clients con CIF NULL — pero defensivo.)
insert into public.empresas (
  id, nombre, nif, persona_contacto, email_principal, telefono_principal,
  direccion, ciudad, cp, comercial_id, asesor_id, notas, activo, legacy_potencia_id,
  created_by, created_at
)
select gen_random_uuid(), sc.nombre_fiscal, sc.cif, sc.persona_contacto, sc.email_contacto, sc.telefono,
       sc.direccion_fiscal, sc.ciudad, sc.codigo_postal,
       (select canonical_id from _migration_user_map where legacy_potencia_id = sc.gestor_id),
       (select canonical_id from _migration_user_map where legacy_potencia_id = sc.asesor_id),
       sc.notas, coalesce(sc.activo, true), sc.id,
       (select canonical_id from _migration_user_map where legacy_potencia_id = sc.created_by),
       sc.created_at
  from _potencia_staging.clients sc
 where pg_temp.norm_cif(sc.cif) is null
   and not exists (select 1 from _migration_empresa_map m where m.legacy_potencia_id = sc.id);

insert into _migration_empresa_map (legacy_potencia_id, canonical_id, fusionada)
select sc.id, e.id, false
  from _potencia_staging.clients sc
  join public.empresas e on e.legacy_potencia_id = sc.id
 where pg_temp.norm_cif(sc.cif) is null
   and not exists (select 1 from _migration_empresa_map m where m.legacy_potencia_id = sc.id);

-- ═══════════════════════════════════════════════════════════════════
-- 5. CUPS (supplies → cups) — dedupe por código normalizado
-- ═══════════════════════════════════════════════════════════════════

insert into _migration_cups_map (legacy_potencia_id, canonical_id, fusionada)
select ss.id, c.id, true
  from _potencia_staging.supplies ss
  join public.cups c on pg_temp.norm_cups(c.codigo_cups) = pg_temp.norm_cups(ss.cups);

update public.cups c
   set legacy_potencia_id = ss.id
  from _potencia_staging.supplies ss
 where pg_temp.norm_cups(c.codigo_cups) = pg_temp.norm_cups(ss.cups)
   and c.legacy_potencia_id is null;

with potencia_dedup as (
  select distinct on (pg_temp.norm_cups(cups))
         id, client_id, cups, denominacion, direccion_suministro, ciudad_suministro,
         tariff_type, channel, distribuidora, comercializadora, comercializadora_id,
         p1_kw, p2_kw, p3_kw, p4_kw, p5_kw, p6_kw,
         potencia_maxima_disponible, tension_kv, notas, activo, created_by, created_at
    from _potencia_staging.supplies
   order by pg_temp.norm_cups(cups), created_at desc
), to_insert as (
  select pd.*
    from potencia_dedup pd
   where not exists (
     select 1 from _migration_cups_map m where m.legacy_potencia_id = pd.id
   )
)
insert into public.cups (
  id, codigo_cups, empresa_id, direccion_suministro, ciudad_suministro,
  tarifa_acceso, channel, distribuidor, comercializadora_actual,
  denominacion, tension_kv, potencia_maxima_disponible,
  p1_kw, p2_kw, p3_kw, p4_kw, p5_kw, p6_kw,
  estado, legacy_potencia_id, created_at
)
select gen_random_uuid(), ti.cups,
       (select canonical_id from _migration_empresa_map where legacy_potencia_id = ti.client_id),
       ti.direccion_suministro, ti.ciudad_suministro,
       ti.tariff_type, ti.channel, ti.distribuidora, ti.comercializadora,
       ti.denominacion, ti.tension_kv, ti.potencia_maxima_disponible,
       coalesce(ti.p1_kw, 0), coalesce(ti.p2_kw, 0), coalesce(ti.p3_kw, 0),
       coalesce(ti.p4_kw, 0), coalesce(ti.p5_kw, 0), coalesce(ti.p6_kw, 0),
       case when coalesce(ti.activo, true) then 'activo' else 'baja' end,
       ti.id, ti.created_at
  from to_insert ti;

insert into _migration_cups_map (legacy_potencia_id, canonical_id, fusionada)
select ss.id, c.id, false
  from _potencia_staging.supplies ss
  join public.cups c on c.legacy_potencia_id = ss.id
 where not exists (
   select 1 from _migration_cups_map m where m.legacy_potencia_id = ss.id
 );

-- Duplicados internos
insert into _migration_cups_map (legacy_potencia_id, canonical_id, fusionada)
select ss.id, m.canonical_id, true
  from _potencia_staging.supplies ss
  join _potencia_staging.supplies winner
    on pg_temp.norm_cups(ss.cups) = pg_temp.norm_cups(winner.cups)
   and ss.id != winner.id
  join _migration_cups_map m on m.legacy_potencia_id = winner.id
 where not exists (
   select 1 from _migration_cups_map mm where mm.legacy_potencia_id = ss.id
 );

-- ═══════════════════════════════════════════════════════════════════
-- 6. EXPEDIENTES (con FK re-mapeadas)
-- ═══════════════════════════════════════════════════════════════════

insert into public.expedientes (
  id, empresa_id, cups_id, anio, estado, tipo_normativa,
  ciclos_realizados, max_ciclos_permitidos, notas, legacy_potencia_id,
  created_by, created_at, updated_at
)
select gen_random_uuid(),
       me.canonical_id,
       mc.canonical_id,
       e.anio, e.estado, e.tipo_normativa,
       e.ciclos_realizados, e.max_ciclos_permitidos, e.notas, e.id,
       (select canonical_id from _migration_user_map where legacy_potencia_id = e.created_by),
       e.created_at, e.updated_at
  from _potencia_staging.expedientes e
  join _migration_empresa_map me on me.legacy_potencia_id = e.client_id
  join _migration_cups_map mc on mc.legacy_potencia_id = e.supply_id;

insert into _migration_expediente_map (legacy_potencia_id, canonical_id)
select e.legacy_potencia_id, e.id from public.expedientes e where e.legacy_potencia_id is not null;

-- ═══════════════════════════════════════════════════════════════════
-- 7. CICLOS
-- ═══════════════════════════════════════════════════════════════════

insert into public.ciclos (
  id, expediente_id, numero_ciclo, estado,
  ahorro_previsto_total, ahorro_real_total, legacy_potencia_id, created_at
)
select gen_random_uuid(),
       me.canonical_id,
       c.numero_ciclo, c.estado, c.ahorro_previsto_total, c.ahorro_real_total, c.id, c.created_at
  from _potencia_staging.ciclos c
  join _migration_expediente_map me on me.legacy_potencia_id = c.expediente_id;

insert into _migration_ciclo_map (legacy_potencia_id, canonical_id)
select c.legacy_potencia_id, c.id from public.ciclos c where c.legacy_potencia_id is not null;

-- ═══════════════════════════════════════════════════════════════════
-- 8. SOLICITUDES_POTENCIA (power_requests)
-- ═══════════════════════════════════════════════════════════════════

insert into public.solicitudes_potencia (
  id, ciclo_id, expediente_id, cups_id, empresa_id, tipo, estado,
  comercializadora_nombre, channel_used,
  p1_actual, p1_nueva, p2_actual, p2_nueva, p3_actual, p3_nueva,
  p4_actual, p4_nueva, p5_actual, p5_nueva, p6_referencia,
  fecha_solicitud_enviada, fecha_envio_autorizacion, fecha_firma_cliente,
  fecha_autorizacion, fecha_ejecucion_real,
  fecha_prevista_inicio, fecha_prevista_fin,
  fecha_alerta_amarilla, fecha_alerta_naranja, fecha_alerta_roja,
  ref_solicitud_distribuidora, ref_autorizacion,
  doc_autorizacion_id, doc_autorizacion_firmada_id,
  notas_internas, legacy_potencia_id,
  created_by, created_at, updated_at
)
select gen_random_uuid(),
       mci.canonical_id,
       (select me.canonical_id from _migration_expediente_map me
          join _potencia_staging.ciclos sc on sc.id = pr.ciclo_id
         where me.legacy_potencia_id = sc.expediente_id),
       mcu.canonical_id,
       mem.canonical_id,
       pr.tipo, pr.estado, pr.comercializadora_nombre, pr.channel_used,
       pr.p1_actual, pr.p1_nueva, pr.p2_actual, pr.p2_nueva, pr.p3_actual, pr.p3_nueva,
       pr.p4_actual, pr.p4_nueva, pr.p5_actual, pr.p5_nueva, pr.p6_referencia,
       pr.fecha_solicitud_enviada, pr.fecha_envio_autorizacion, pr.fecha_firma_cliente,
       pr.fecha_autorizacion, pr.fecha_ejecucion_real,
       pr.fecha_prevista_inicio, pr.fecha_prevista_fin,
       pr.fecha_alerta_amarilla, pr.fecha_alerta_naranja, pr.fecha_alerta_roja,
       pr.ref_solicitud_distribuidora, pr.ref_autorizacion,
       pr.doc_autorizacion_id, pr.doc_autorizacion_firmada_id,
       pr.notas_internas, pr.id,
       (select canonical_id from _migration_user_map where legacy_potencia_id = pr.created_by),
       pr.created_at, pr.updated_at
  from _potencia_staging.power_requests pr
  join _migration_ciclo_map mci on mci.legacy_potencia_id = pr.ciclo_id
  join _migration_cups_map mcu on mcu.legacy_potencia_id = pr.supply_id
  join _migration_empresa_map mem on mem.legacy_potencia_id = pr.client_id;

insert into _migration_request_map (legacy_potencia_id, canonical_id)
select s.legacy_potencia_id, s.id from public.solicitudes_potencia s where s.legacy_potencia_id is not null;

-- ═══════════════════════════════════════════════════════════════════
-- 9. SAVINGS_CALCULATIONS
-- ═══════════════════════════════════════════════════════════════════

insert into public.savings_calculations (
  id, request_id, ciclo_id,
  dias_previstos, dias_reales,
  ahorro_previsto_p1, ahorro_real_p1,
  ahorro_previsto_p2, ahorro_real_p2,
  ahorro_previsto_p3, ahorro_real_p3,
  ahorro_previsto_p4, ahorro_real_p4,
  ahorro_previsto_p5, ahorro_real_p5,
  ahorro_previsto_total, ahorro_real_total,
  fecha_calculo
)
select gen_random_uuid(),
       mr.canonical_id,
       mci.canonical_id,
       sc.dias_previstos, sc.dias_reales,
       sc.ahorro_previsto_p1, sc.ahorro_real_p1,
       sc.ahorro_previsto_p2, sc.ahorro_real_p2,
       sc.ahorro_previsto_p3, sc.ahorro_real_p3,
       sc.ahorro_previsto_p4, sc.ahorro_real_p4,
       sc.ahorro_previsto_p5, sc.ahorro_real_p5,
       sc.ahorro_previsto_total, sc.ahorro_real_total,
       sc.fecha_calculo
  from _potencia_staging.savings_calculations sc
  join _migration_request_map mr on mr.legacy_potencia_id = sc.request_id
  join _migration_ciclo_map mci on mci.legacy_potencia_id = sc.ciclo_id;

-- ═══════════════════════════════════════════════════════════════════
-- 10. COMUNICACIONES_CLIENTE (client_communications)
-- ═══════════════════════════════════════════════════════════════════

insert into public.comunicaciones_cliente (
  id, empresa_id, ciclo_id, expediente_id, tipo, asunto, cuerpo_html,
  destinatario_email, cc_email, estado, fecha_envio, resend_message_id,
  error_detalle, legacy_potencia_id, enviado_por, created_at
)
select gen_random_uuid(),
       mem.canonical_id,
       (select canonical_id from _migration_ciclo_map where legacy_potencia_id = cc.ciclo_id),
       (select canonical_id from _migration_expediente_map where legacy_potencia_id = cc.expediente_id),
       cc.tipo, cc.asunto, cc.cuerpo_html,
       cc.destinatario_email, cc.cc_email, cc.estado, cc.fecha_envio, cc.resend_message_id,
       cc.error_detalle, cc.id,
       (select canonical_id from _migration_user_map where legacy_potencia_id = cc.enviado_por),
       cc.created_at
  from _potencia_staging.client_communications cc
  join _migration_empresa_map mem on mem.legacy_potencia_id = cc.client_id;

-- ═══════════════════════════════════════════════════════════════════
-- 11. DOCUMENTOS (consolidación polimórfica de 3 tablas)
-- ═══════════════════════════════════════════════════════════════════
-- FIX dry-run 2026-04-26: el CHECK constraint de `documentos.entidad_tipo`
-- y `documentos.tipo` actualmente solo permiten valores CRM. Para alojar
-- entidad_tipo='expediente'/'general' y tipo='autorizacion' (de Potencias),
-- extendemos las constraints. Estas constraints también se podrían extender
-- en una migración Fase 1.5 separada — el ALTER es idempotente.
alter table public.documentos drop constraint if exists documentos_entidad_tipo_check;
alter table public.documentos add constraint documentos_entidad_tipo_check
  check (entidad_tipo = any (array['empresa','contrato','oportunidad','contacto','expediente','general']));
alter table public.documentos drop constraint if exists documentos_tipo_check;
alter table public.documentos add constraint documentos_tipo_check
  check (tipo is null or tipo = any (array['contrato','factura','documentacion','otro','autorizacion','autorizacion_firmada','licencia','informe']));

-- 11a. client_documents → documentos (entidad_tipo='empresa')
insert into public.documentos (
  id, entidad_tipo, entidad_id, empresa_id, expediente_id, ciclo_id,
  nombre, nombre_archivo, tipo, descripcion, tamano_bytes, ruta_storage,
  metadata, subido_por, created_at
)
select gen_random_uuid(), 'empresa', mem.canonical_id, mem.canonical_id,
       (select canonical_id from _migration_expediente_map where legacy_potencia_id = cd.expediente_id),
       (select canonical_id from _migration_ciclo_map where legacy_potencia_id = cd.ciclo_id),
       cd.nombre, cd.nombre_archivo, cd.tipo, cd.descripcion, cd.tamano_bytes, cd.storage_path,
       cd.metadata,
       (select canonical_id from _migration_user_map where legacy_potencia_id = cd.subido_por),
       cd.created_at
  from _potencia_staging.client_documents cd
  join _migration_empresa_map mem on mem.legacy_potencia_id = cd.client_id;

-- 11b. expediente_documents → documentos (entidad_tipo='expediente')
insert into public.documentos (
  id, entidad_tipo, entidad_id, expediente_id, ciclo_id,
  nombre_archivo, nombre_original, tipo, mime_type, tamano_bytes, ruta_storage, notas,
  nombre, subido_por, created_at
)
select gen_random_uuid(), 'expediente', mexp.canonical_id, mexp.canonical_id,
       (select canonical_id from _migration_ciclo_map where legacy_potencia_id = ed.ciclo_id),
       ed.nombre_archivo, ed.nombre_original, ed.tipo, ed.mime_type, ed.tamano_bytes, ed.storage_path, ed.notas,
       coalesce(ed.nombre_original, ed.nombre_archivo),
       (select canonical_id from _migration_user_map where legacy_potencia_id = ed.subido_por),
       ed.created_at
  from _potencia_staging.expediente_documents ed
  join _migration_expediente_map mexp on mexp.legacy_potencia_id = ed.expediente_id;

-- 11c. documentacion → documentos (entidad_tipo='general')
insert into public.documentos (
  id, entidad_tipo, nombre, descripcion, nombre_archivo, ruta_storage, tamano_bytes,
  subido_por, created_at
)
select gen_random_uuid(), 'general', d.nombre, d.descripcion, d.nombre_archivo, d.storage_path, d.tamano_bytes,
       (select canonical_id from _migration_user_map where legacy_potencia_id = d.subido_por),
       d.created_at
  from _potencia_staging.documentacion d;

-- ═══════════════════════════════════════════════════════════════════
-- 12. COMERCIALIZADORA_DOCS
-- ═══════════════════════════════════════════════════════════════════

insert into public.comercializadora_docs (
  id, comercializadora_id, nombre, descripcion, nombre_archivo, storage_path,
  tamano_bytes, campos_detectados, campos_mapeados, instrucciones,
  es_plantilla_autorizacion, legacy_potencia_id, subido_por, created_at
)
select gen_random_uuid(),
       (select canonical_id from _migration_comercializadora_map where legacy_potencia_id = cd.comercializadora_id),
       cd.nombre, cd.descripcion, cd.nombre_archivo, cd.storage_path, cd.tamano_bytes,
       coalesce(cd.campos_detectados, '{}'), coalesce(cd.campos_mapeados, '{}'), cd.instrucciones,
       coalesce(cd.es_plantilla_autorizacion, false), cd.id,
       (select canonical_id from _migration_user_map where legacy_potencia_id = cd.subido_por),
       cd.created_at
  from _potencia_staging.comercializadora_docs cd;

-- ═══════════════════════════════════════════════════════════════════
-- 13. STATUS_LOG
-- ═══════════════════════════════════════════════════════════════════

insert into public.status_log (
  id, expediente_id, ciclo_id, request_id, estado_anterior, estado_nuevo,
  fecha_cambio, cambiado_por, notas, legacy_potencia_id
)
select gen_random_uuid(),
       (select canonical_id from _migration_expediente_map where legacy_potencia_id = sl.expediente_id),
       (select canonical_id from _migration_ciclo_map where legacy_potencia_id = sl.ciclo_id),
       (select canonical_id from _migration_request_map where legacy_potencia_id = sl.request_id),
       sl.estado_anterior, sl.estado_nuevo, sl.fecha_cambio,
       (select canonical_id from _migration_user_map where legacy_potencia_id = sl.cambiado_por),
       sl.notas, sl.id
  from _potencia_staging.status_log sl;

-- ═══════════════════════════════════════════════════════════════════
-- 14. EMAIL_TEMPLATES — append directo
-- ═══════════════════════════════════════════════════════════════════

insert into public.email_templates (
  id, nombre, tipo, asunto, cuerpo_html, variables_disponibles, activo,
  updated_by, updated_at
)
select gen_random_uuid(), et.nombre, et.tipo, et.asunto, et.cuerpo_html,
       et.variables_disponibles, coalesce(et.activo, true),
       (select canonical_id from _migration_user_map where legacy_potencia_id = et.updated_by),
       et.updated_at
  from _potencia_staging.email_templates et
 where not exists (
   select 1 from public.email_templates pe where pe.tipo = et.tipo and pe.nombre = et.nombre
 );

-- ═══════════════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════════════
-- Si quieres revisar antes de commit, sustituir COMMIT por ROLLBACK.
-- ═══════════════════════════════════════════════════════════════════

-- ROLLBACK;  -- ← descomentar para validar dry-run sin afectar prod
commit;
