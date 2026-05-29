-- =====================================================================
-- FASE 1 · Migración 09/09 — RPC publish_oferta_with_versioning
-- =====================================================================
-- Función principal del versionado: publica una oferta nueva y archiva
-- la versión anterior con la misma combinación lógica
-- (comercializadora, product_name, access_rate, zona principal).
--
-- IMPORTANTE (v1.1 tras revisión ChatGPT):
--   1. El casteo de arrays JSON → numeric[] usa la sintaxis correcta
--      de PostgreSQL con jsonb_array_elements_text(...) WITH ORDINALITY.
--   2. El SELECT de la versión anterior FILTRA POR ZONA PRINCIPAL
--      (zones[1]) para no archivar ofertas de Península al publicar
--      Baleares, y viceversa.
--   3. SECURITY DEFINER bypassea RLS → la función comprueba al inicio
--      que auth.uid() corresponda a un user_profiles.approved = true,
--      y si no, lanza excepción.
-- =====================================================================

create or replace function public.publish_oferta_with_versioning(
  p_comercializadora_id uuid,
  p_product_name        text,
  p_access_rate         text,
  p_payload             jsonb,
  p_source_document_id  uuid default null,
  p_validated_by        uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_id        uuid;
  v_old_version   int;
  v_new_id        uuid;
  v_energy_prices numeric[];
  v_power_prices  numeric[];
  v_zones         text[];
  v_main_zone     text;
  v_channels      text[];
begin
  -- ── Control de autorización (SECURITY DEFINER bypassea RLS) ──────
  -- Verificar que quien invoca es un usuario authenticated y aprobado
  -- en user_profiles. Sin esto, cualquier authenticated podría insertar
  -- tarifas en producción sin pasar por la bandeja de validación.
  if auth.uid() is null or not exists (
    select 1 from public.user_profiles
     where id = auth.uid() and approved = true
  ) then
    raise exception 'not authorized: user not approved or not authenticated'
      using errcode = '42501';  -- insufficient_privilege
  end if;

  -- ── Convertir arrays JSON → arrays nativos PostgreSQL ────────────
  -- Sintaxis correcta: jsonb_array_elements_text WITH ORDINALITY.
  -- IMPORTANTE: v_zones se calcula ANTES de buscar la versión anterior
  -- porque el versionado debe filtrar por zona principal (v_zones[1]),
  -- no sólo por comercializadora+producto+acceso. Si no, publicar una
  -- oferta nueva de Baleares supersedería la de Península incorrectamente.
  v_energy_prices := case
    when p_payload ? 'energy_prices' then array(
      select nullif(t.value, '')::numeric
        from jsonb_array_elements_text(p_payload->'energy_prices')
             with ordinality as t(value, ord)
       order by t.ord
    )
    else null
  end;

  v_power_prices := case
    when p_payload ? 'power_prices' then array(
      select nullif(t.value, '')::numeric
        from jsonb_array_elements_text(p_payload->'power_prices')
             with ordinality as t(value, ord)
       order by t.ord
    )
    else null
  end;

  v_zones := case
    when p_payload ? 'zones' then array(
      select t.value
        from jsonb_array_elements_text(p_payload->'zones')
             with ordinality as t(value, ord)
       order by t.ord
    )
    else array['peninsula']
  end;

  v_channels := case
    when p_payload ? 'sales_channels' then array(
      select t.value
        from jsonb_array_elements_text(p_payload->'sales_channels')
             with ordinality as t(value, ord)
       order by t.ord
    )
    else null
  end;

  -- Zona principal = primer elemento del array de zonas.
  -- Convención: el array se ordena con la zona principal en posición 1.
  v_main_zone := v_zones[1];

  -- ── Buscar la versión vigente actual de esta combinación lógica ──
  -- Filtro completo: comercializadora + producto + acceso + ZONA PRINCIPAL.
  -- Si la oferta antigua tiene zones NULL (datos legacy pre-Fase 1) o
  -- coincide su primera zona con v_main_zone, es la candidata.
  select id, version
    into v_old_id, v_old_version
    from public.comercializadora_ofertas
   where comercializadora_id = p_comercializadora_id
     and product_name = p_product_name
     and access_rate = p_access_rate
     and status = 'published'
     and (
       zones is null                       -- legacy sin zona declarada
       or array_length(zones, 1) is null   -- array vacío
       or zones[1] = v_main_zone           -- misma zona principal
     )
   order by version desc nulls last
   limit 1;

  -- ── Insertar nueva versión ───────────────────────────────────────
  insert into public.comercializadora_ofertas (
    comercializadora_id,
    product_name,
    access_rate,
    energy_prices,
    power_prices,
    power_unit,
    pricing_type,
    index_margin_per_kwh,
    surplus_model,
    surplus_price_per_kwh,
    entry_fee_eur,
    entry_fee_per_kw,
    annual_management_fee_eur,
    tender_fee_pct,
    activation_fee_eur,
    battery_fee_per_kwp_eur,
    allow_zero_invoice,
    min_contract_months,
    include_in_comparison,
    show_tolls_separately,
    notes,
    valid_from,
    valid_to,
    status,
    version,
    source_document_id,
    extracted_by_ai,
    confidence_score,
    validated_by,
    validated_at,
    zones,
    power_p1_threshold_kw,
    power_p1_threshold_op,
    telemedida,
    exempt_electricity_tax,
    contractable,
    green_energy_gdo,
    sales_channels,
    requires_electronic_invoice,
    auto_renewal_months,
    tempo_hours_discount_pct,
    tempo_hours_description,
    price_revision_terms,
    discount_description,
    discount_pct_energy,
    discount_pct_power,
    discount_fixed_eur_year,
    is_promotional,
    non_promotional_oferta_id,
    extension_data
  )
  values (
    p_comercializadora_id,
    p_product_name,
    p_access_rate,
    v_energy_prices,
    v_power_prices,
    coalesce(p_payload->>'power_unit', 'eur_kw_year'),
    coalesce(p_payload->>'pricing_type', 'fixed'),
    nullif(p_payload->>'index_margin_per_kwh', '')::numeric,
    p_payload->>'surplus_model',
    nullif(p_payload->>'surplus_price_per_kwh', '')::numeric,
    nullif(p_payload->>'entry_fee_eur', '')::numeric,
    nullif(p_payload->>'entry_fee_per_kw', '')::numeric,
    nullif(p_payload->>'annual_management_fee_eur', '')::numeric,
    nullif(p_payload->>'tender_fee_pct', '')::numeric,
    nullif(p_payload->>'activation_fee_eur', '')::numeric,
    nullif(p_payload->>'battery_fee_per_kwp_eur', '')::numeric,
    coalesce((p_payload->>'allow_zero_invoice')::bool, false),
    nullif(p_payload->>'min_contract_months', '')::int,
    coalesce((p_payload->>'include_in_comparison')::bool, true),
    coalesce((p_payload->>'show_tolls_separately')::bool, false),
    p_payload->>'notes',
    coalesce(nullif(p_payload->>'valid_from', '')::date, current_date),
    nullif(p_payload->>'valid_to', '')::date,
    'published',
    coalesce(v_old_version, 0) + 1,
    p_source_document_id,
    coalesce((p_payload->>'extracted_by_ai')::bool, p_source_document_id is not null),
    nullif(p_payload->>'confidence_score', '')::numeric,
    p_validated_by,
    case when p_validated_by is not null then now() else null end,
    v_zones,
    nullif(p_payload->>'power_p1_threshold_kw', '')::numeric,
    p_payload->>'power_p1_threshold_op',
    coalesce(p_payload->>'telemedida', 'ambos'),
    coalesce((p_payload->>'exempt_electricity_tax')::bool, false),
    coalesce((p_payload->>'contractable')::bool, true),
    coalesce((p_payload->>'green_energy_gdo')::bool, false),
    v_channels,
    coalesce((p_payload->>'requires_electronic_invoice')::bool, false),
    nullif(p_payload->>'auto_renewal_months', '')::int,
    nullif(p_payload->>'tempo_hours_discount_pct', '')::numeric,
    p_payload->>'tempo_hours_description',
    p_payload->>'price_revision_terms',
    p_payload->>'discount_description',
    nullif(p_payload->>'discount_pct_energy', '')::numeric,
    nullif(p_payload->>'discount_pct_power', '')::numeric,
    nullif(p_payload->>'discount_fixed_eur_year', '')::numeric,
    coalesce((p_payload->>'is_promotional')::bool, false),
    nullif(p_payload->>'non_promotional_oferta_id', '')::uuid,
    case when p_payload ? 'extension_data' then p_payload->'extension_data' else null end
  )
  returning id into v_new_id;

  -- ── Archivar versión anterior, si existía ────────────────────────
  if v_old_id is not null then
    update public.comercializadora_ofertas
       set status        = 'superseded',
           valid_to      = current_date - interval '1 day',
           superseded_by = v_new_id
     where id = v_old_id;
  end if;

  return v_new_id;
end;
$$;

-- Grant ejecución a usuarios autenticados. El control fino de quién
-- puede invocar (approved = true) está dentro del propio cuerpo de la
-- función, vía RAISE EXCEPTION.
grant execute on function public.publish_oferta_with_versioning(uuid, text, text, jsonb, uuid, uuid)
  to authenticated;

NOTIFY pgrst, 'reload schema';
