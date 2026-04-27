-- ═══════════════════════════════════════════════════════════════════
-- Fase 2.C — Verificación post-migración
-- ═══════════════════════════════════════════════════════════════════
-- Lanzar tras `unificacion_fase2_b_dedupe_y_transform.sql` (con commit).
-- Todos los counts deben cuadrar y todos los integrity checks deben ser 0.
-- ═══════════════════════════════════════════════════════════════════

-- ───────── 1. Contadores totales canónicos ─────────
select 'empresas' as tabla, count(*) as filas, count(*) filter (where legacy_potencia_id is not null) as desde_potencias from public.empresas
union all select 'cups', count(*), count(*) filter (where legacy_potencia_id is not null) from public.cups
union all select 'comercializadoras', count(*), count(*) filter (where legacy_potencia_com_id is not null) from public.comercializadoras
union all select 'comercializadora_ofertas', count(*), 0 from public.comercializadora_ofertas
union all select 'precios_regulados_boe', count(*), count(*) filter (where legacy_potencia_id is not null) from public.precios_regulados_boe
union all select 'expedientes', count(*), count(*) filter (where legacy_potencia_id is not null) from public.expedientes
union all select 'ciclos', count(*), count(*) filter (where legacy_potencia_id is not null) from public.ciclos
union all select 'solicitudes_potencia', count(*), count(*) filter (where legacy_potencia_id is not null) from public.solicitudes_potencia
union all select 'savings_calculations', count(*), 0 from public.savings_calculations
union all select 'comunicaciones_cliente', count(*), count(*) filter (where legacy_potencia_id is not null) from public.comunicaciones_cliente
union all select 'documentos', count(*), 0 from public.documentos
union all select 'comercializadora_docs', count(*), count(*) filter (where legacy_potencia_id is not null) from public.comercializadora_docs
union all select 'status_log', count(*), count(*) filter (where legacy_potencia_id is not null) from public.status_log
union all select 'email_templates', count(*), 0 from public.email_templates
union all select 'user_profiles', count(*), count(*) filter (where legacy_potencia_id is not null) from public.user_profiles
order by tabla;

-- Esperado (delta vs pre-migración):
--   empresas: +24 (30 - 6 internos dup) - X coincidencias con CRM (probablemente 0)
--   cups: +72 (75 - 3 internos dup) - X coincidencias con CRM (probablemente 0 o 1)
--   comercializadoras: +0 a +2 (las 2 de Potencias podrían matchear con las 6 del CRM)
--   precios_regulados_boe: +18 = 47
--   expedientes: +41 = 41
--   ciclos: +41 = 41
--   solicitudes_potencia: +41 = 41
--   savings_calculations: +41 = 41
--   comunicaciones_cliente: +31 = 31
--   documentos: +98 = 98 (70 client_documents + 27 expediente_documents + 1 documentacion)
--   comercializadora_docs: +1 = 1
--   status_log: +91 = 91
--   email_templates: +2 = 2

-- ───────── 2. Integridad referencial ─────────
select 'orphans contratos' as check, count(*)
from public.contratos c
where c.empresa_id is not null and not exists (select 1 from public.empresas e where e.id = c.empresa_id)
union all select 'orphans cups (empresa)', count(*)
from public.cups c where not exists (select 1 from public.empresas e where e.id = c.empresa_id)
union all select 'orphans expedientes (empresa)', count(*)
from public.expedientes ex where not exists (select 1 from public.empresas e where e.id = ex.empresa_id)
union all select 'orphans expedientes (cups)', count(*)
from public.expedientes ex where not exists (select 1 from public.cups c where c.id = ex.cups_id)
union all select 'orphans ciclos', count(*)
from public.ciclos ci where not exists (select 1 from public.expedientes ex where ex.id = ci.expediente_id)
union all select 'orphans solicitudes (ciclo)', count(*)
from public.solicitudes_potencia sp where not exists (select 1 from public.ciclos ci where ci.id = sp.ciclo_id)
union all select 'orphans solicitudes (cups)', count(*)
from public.solicitudes_potencia sp where not exists (select 1 from public.cups c where c.id = sp.cups_id)
union all select 'orphans solicitudes (empresa)', count(*)
from public.solicitudes_potencia sp where not exists (select 1 from public.empresas e where e.id = sp.empresa_id)
union all select 'orphans savings_calc (request)', count(*)
from public.savings_calculations sc where not exists (select 1 from public.solicitudes_potencia sp where sp.id = sc.request_id)
union all select 'orphans documentos (empresa via empresa_id)', count(*)
from public.documentos d where d.empresa_id is not null and not exists (select 1 from public.empresas e where e.id = d.empresa_id);

-- Todos deben ser 0.

-- ───────── 3. Duplicados ─────────
-- Normalizers v2 (alineados con script B post dry-run 2026-04-26)
select 'duplicados CIF en empresas' as check, count(*) as filas
from (
  select upper(regexp_replace(coalesce(nif,''), '[\s\-\.\\/]', '', 'g')) as nif_norm, count(*) as n
    from public.empresas
   where nif is not null and nif != ''
   group by upper(regexp_replace(coalesce(nif,''), '[\s\-\.\\/]', '', 'g'))
  having count(*) > 1
) d
union all
select 'duplicados CUPS', count(*)
from (
  select upper(regexp_replace(coalesce(codigo_cups,''), '\s', '', 'g')) as cups_norm, count(*) as n
    from public.cups
   where codigo_cups is not null and codigo_cups != ''
   group by upper(regexp_replace(coalesce(codigo_cups,''), '\s', '', 'g'))
  having count(*) > 1
) d
union all
select 'duplicados nombre comercializadora', count(*)
from (
  select upper(regexp_replace(regexp_replace(translate(coalesce(coalesce(nombre_normalizado, name),''),
            'áéíóúÁÉÍÓÚüÜñÑàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛ','aeiouAEIOUuUnNaeiouAEIOUaeiouAEIOU'),
            '[\.\s,\(\)\-]', '', 'g'), '(SAU|SLU|SCOOP|SCP|SCL|SA|SL)$', '', 'i')) as norm, count(*) as n
    from public.comercializadoras
   group by upper(regexp_replace(regexp_replace(translate(coalesce(coalesce(nombre_normalizado, name),''),
            'áéíóúÁÉÍÓÚüÜñÑàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛ','aeiouAEIOUuUnNaeiouAEIOUaeiouAEIOU'),
            '[\.\s,\(\)\-]', '', 'g'), '(SAU|SLU|SCOOP|SCP|SCL|SA|SL)$', '', 'i'))
  having count(*) > 1
) d;

-- Todos deben ser 0.

-- ───────── 4. Cardinalidad de mapping tables ─────────
select 'map empresas' as check, count(*) as filas, count(*) filter (where fusionada) as fusionadas from _migration_empresa_map
union all select 'map cups', count(*), count(*) filter (where fusionada) from _migration_cups_map
union all select 'map comercializadoras', count(*), 0 from _migration_comercializadora_map
union all select 'map users', count(*), 0 from _migration_user_map
union all select 'map expedientes', count(*), 0 from _migration_expediente_map
union all select 'map ciclos', count(*), 0 from _migration_ciclo_map
union all select 'map requests', count(*), 0 from _migration_request_map;

-- Esperado: map empresas = 30 (todas las clientes Potencias mapeadas)
-- map cups = 75, map expedientes = 41, etc.
