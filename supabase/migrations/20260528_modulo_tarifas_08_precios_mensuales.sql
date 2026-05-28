-- =====================================================================
-- FASE 1 · Migración 08/09 — Tabla oferta_precios_mensuales
-- =====================================================================
-- Sub-tabla para tarifas de gas con precios mes a mes (MET, Energya-VM).
-- Una oferta de gas "fija a 12 meses" puede tener 12 valores distintos,
-- uno por mes. También usado para componentes adicionales (MIBGAS,
-- Componente Mg). El componente se identifica con `componente`.
-- =====================================================================

create table if not exists public.oferta_precios_mensuales (
  id                  uuid primary key default gen_random_uuid(),
  oferta_id           uuid not null
    references public.comercializadora_ofertas(id) on delete cascade,
  mes_yyyy_mm         text not null
    check (mes_yyyy_mm ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  precio_energia_kwh  numeric,
  componente          text,
  notes               text,
  created_at          timestamptz default now() not null,
  unique (oferta_id, mes_yyyy_mm, componente)
);

create index if not exists idx_precios_mensuales_oferta
  on public.oferta_precios_mensuales(oferta_id);

create index if not exists idx_precios_mensuales_mes
  on public.oferta_precios_mensuales(mes_yyyy_mm);

alter table public.oferta_precios_mensuales enable row level security;

drop policy if exists precios_mensuales_all_approved on public.oferta_precios_mensuales;
create policy precios_mensuales_all_approved
  on public.oferta_precios_mensuales
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
       where id = auth.uid() and approved = true
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles
       where id = auth.uid() and approved = true
    )
  );

NOTIFY pgrst, 'reload schema';
