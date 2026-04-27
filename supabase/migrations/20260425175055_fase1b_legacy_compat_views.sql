-- Vistas de compatibilidad — el FE actual aún hace from('retailers') etc.
-- Estas vistas mantienen viva la API legacy hasta que el sprint FE refactor
-- (Fase 3) cambie todas las queries.
-- Drop en sprint FE.

create or replace view public.retailers as
  select id, name, is_active, model, notes, created_at,
         legacy_potencia_com_id, nif, tipo_energia, activa, nombre_normalizado
    from public.comercializadoras;

create or replace view public.retailer_offers as
  select id, comercializadora_id as retailer_id,
         product_name, access_rate, surplus_model, energy_prices, power_prices,
         surplus_price_per_kwh, entry_fee_eur, entry_fee_per_kw,
         annual_management_fee_eur, tender_fee_pct, activation_fee_eur,
         battery_fee_per_kwp_eur, allow_zero_invoice, min_contract_months,
         include_in_comparison, show_tolls_separately, notes, created_at
    from public.comercializadora_ofertas;

create or replace view public.boe_regulated_prices as
  select id, tariff, period, price, created_at
    from public.precios_regulados_boe;

comment on view public.retailers is 'LEGACY VIEW — usar comercializadoras. Drop tras sprint FE Fase 3.';
comment on view public.retailer_offers is 'LEGACY VIEW — usar comercializadora_ofertas. Drop tras sprint FE Fase 3.';
comment on view public.boe_regulated_prices is 'LEGACY VIEW — usar precios_regulados_boe. Drop tras sprint FE Fase 3.';

-- INSERT/UPDATE/DELETE rules para las vistas (mantener escrituras del FE legacy)
create or replace function public.legacy_retailers_insert() returns trigger language plpgsql security invoker as $$
begin
  insert into public.comercializadoras (id, name, is_active, model, notes, created_at, legacy_potencia_com_id, nif, tipo_energia, activa, nombre_normalizado)
    values (coalesce(new.id, gen_random_uuid()), new.name, new.is_active, new.model, new.notes,
            coalesce(new.created_at, now()), new.legacy_potencia_com_id, new.nif, new.tipo_energia, new.activa, new.nombre_normalizado);
  return new;
end;$$;

create trigger retailers_insert instead of insert on public.retailers for each row execute function public.legacy_retailers_insert();

create or replace function public.legacy_retailer_offers_insert() returns trigger language plpgsql security invoker as $$
begin
  insert into public.comercializadora_ofertas (id, comercializadora_id, product_name, access_rate, surplus_model,
    energy_prices, power_prices, surplus_price_per_kwh, entry_fee_eur, entry_fee_per_kw,
    annual_management_fee_eur, tender_fee_pct, activation_fee_eur, battery_fee_per_kwp_eur,
    allow_zero_invoice, min_contract_months, include_in_comparison, show_tolls_separately, notes, created_at)
  values (coalesce(new.id, gen_random_uuid()), new.retailer_id, new.product_name, new.access_rate, new.surplus_model,
    new.energy_prices, new.power_prices, new.surplus_price_per_kwh, new.entry_fee_eur, new.entry_fee_per_kw,
    new.annual_management_fee_eur, new.tender_fee_pct, new.activation_fee_eur, new.battery_fee_per_kwp_eur,
    new.allow_zero_invoice, new.min_contract_months, new.include_in_comparison, new.show_tolls_separately, new.notes,
    coalesce(new.created_at, now()));
  return new;
end;$$;

create trigger retailer_offers_insert instead of insert on public.retailer_offers for each row execute function public.legacy_retailer_offers_insert();
