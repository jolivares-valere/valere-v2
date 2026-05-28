-- =====================================================================
-- FASE 1 · Migración 07/09 — Tabla comercializadora_productos_servicios
-- =====================================================================
-- Catálogo paralelo de servicios opcionales (PyS = Productos y
-- Servicios) que ofrecen las comercializadoras además de la tarifa.
-- Ejemplo Iberdrola: Pack Hogar 8.95€/mes, Protección Eléctrica
-- Hogar Plus 8.95€/mes, etc. Pueden dar descuento sobre la tarifa
-- principal (PyS Tier 1/2).
-- =====================================================================

create table if not exists public.comercializadora_productos_servicios (
  id                          uuid primary key default gen_random_uuid(),
  comercializadora_id         uuid not null
    references public.comercializadoras(id) on delete cascade,
  nombre                      text not null,
  tipo                        text
    check (tipo in ('asistencia','seguro','mantenimiento','digital','solar','aerotermia','movilidad','otros')),
  precio_mes_eur              numeric,
  precio_mes_eur_con_iva      numeric,
  precio_mes_eur_con_igic     numeric,
  precio_mes_eur_con_ipsi     numeric,
  cliente_objetivo            text,
  promocion                   text,
  descuento_tier              int
    check (descuento_tier is null or descuento_tier in (1,2)),
  valid_from                  date,
  valid_to                    date,
  status                      text default 'published'
    check (status in ('published','superseded','draft','rejected')),
  source_document_id          uuid references public.tariff_documents(id) on delete set null,
  notes                       text,
  created_at                  timestamptz default now() not null
);

create index if not exists idx_productos_servicios_comercializadora
  on public.comercializadora_productos_servicios(comercializadora_id);

-- IMPORTANTE: NO usar current_date en WHERE de índice parcial
-- (no es IMMUTABLE). Indexar valid_to como columna en su lugar.
create index if not exists idx_productos_servicios_published
  on public.comercializadora_productos_servicios(comercializadora_id, nombre, valid_to)
  where status = 'published';

alter table public.comercializadora_productos_servicios enable row level security;

drop policy if exists productos_servicios_all_approved on public.comercializadora_productos_servicios;
create policy productos_servicios_all_approved
  on public.comercializadora_productos_servicios
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
