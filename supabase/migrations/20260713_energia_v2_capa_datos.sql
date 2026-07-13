-- ═══════════════════════════════════════════════════════════════════
-- Módulo Energía v2 — Sprint 0: capa de datos energéticos (Datadis)
--
-- Reutiliza lo ya existente:
--   · datadis_consumptions (curva horaria: cups_id, fecha, hora, consumo_kwh,
--     excedente_kwh, origen) → NO se recrea.
--   · facturas ya tiene: origen, billed_days, cups_id, documento_url,
--     fecha_inicio/fin, consumption_p1..p6, surplus_p1..p6.
--
-- Añade lo que falta:
--   · datadis_maximetro   (maxímetro por periodo → optimizador de potencia)
--   · datadis_contratos   (detalle de contrato/ATR + potencias contratadas)
--   · facturas.es_estimada, facturas.origen_ref (puente/anti-bug de estimación)
--
-- RLS: lectura authenticated; escritura solo service_role (worker).
-- Idempotente (IF NOT EXISTS).
-- ═══════════════════════════════════════════════════════════════════

-- ── Maxímetro (potencia máxima demandada por periodo) ────────────────
create table if not exists public.datadis_maximetro (
  id uuid primary key default gen_random_uuid(),
  cups_id uuid not null references public.cups(id) on delete cascade,
  fecha date not null,                 -- día/mes del registro de maxímetro
  periodo smallint not null check (periodo between 1 and 6),
  potencia_kw numeric(10,3),           -- potencia máxima demandada
  momento timestamptz,                 -- instante del máximo (si Datadis lo da)
  origen text not null default 'datadis',
  created_at timestamptz not null default now(),
  unique (cups_id, fecha, periodo)
);
create index if not exists idx_datadis_maximetro_cups on public.datadis_maximetro(cups_id);
create index if not exists idx_datadis_maximetro_fecha on public.datadis_maximetro(fecha);

alter table public.datadis_maximetro enable row level security;
drop policy if exists datadis_maximetro_select on public.datadis_maximetro;
-- RLS endurecida (auditoría 2026-07-13, B5): solo staff, NUNCA authenticated a secas.
-- Estas tablas contienen NIF/CUPS/consumos = dato personal (RGPD). El día que exista
-- un usuario role='client', authenticated using(true) sería fuga multitenant.
create policy datadis_maximetro_select on public.datadis_maximetro
  for select to authenticated using (public.is_staff());
revoke all on public.datadis_maximetro from anon;

-- ── Contrato / ATR (detalle de contrato + potencias contratadas) ─────
create table if not exists public.datadis_contratos (
  id uuid primary key default gen_random_uuid(),
  cups_id uuid not null references public.cups(id) on delete cascade,
  tarifa_acceso text,                  -- 2.0TD / 3.0TD / 6.1TD ...
  comercializadora text,
  distribuidora text,
  potencia_p1 numeric(10,3),
  potencia_p2 numeric(10,3),
  potencia_p3 numeric(10,3),
  potencia_p4 numeric(10,3),
  potencia_p5 numeric(10,3),
  potencia_p6 numeric(10,3),
  fecha_inicio date,
  fecha_fin date,
  autoconsumo_tipo text,               -- si aplica (FV)
  provincia text,
  municipio text,
  datos_raw jsonb,                     -- payload original por si acaso
  origen text not null default 'datadis',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (cups_id, fecha_inicio)       -- histórico: un contrato por inicio
);
create index if not exists idx_datadis_contratos_cups on public.datadis_contratos(cups_id);

alter table public.datadis_contratos enable row level security;
drop policy if exists datadis_contratos_select on public.datadis_contratos;
create policy datadis_contratos_select on public.datadis_contratos
  for select to authenticated using (public.is_staff());
revoke all on public.datadis_contratos from anon;

-- ── Puente a facturas (campos que faltan) ────────────────────────────
alter table public.facturas
  add column if not exists es_estimada boolean not null default false,
  add column if not exists origen_ref text;

comment on column public.facturas.es_estimada is 'true si el mes se agregó con menos días de dato que días naturales (estimación parcial)';
comment on column public.facturas.origen_ref is 'referencia a la ejecución de sync que generó/actualizó la fila (trazabilidad)';

-- ── Índice útil para agregación desde la curva ───────────────────────
-- (datadis_consumptions ya tiene UNIQUE(cups_id, fecha, hora) → idempotencia OK)
create index if not exists idx_datadis_consumptions_cups_fecha
  on public.datadis_consumptions(cups_id, fecha);

-- ── Endurecer RLS de datadis_incidencias (auditoría 2026-07-13, B5) ───
-- Estaba con USING(true) para authenticated. Contiene NIF/CUPS/direcciones.
-- Restringir a staff antes de que exista el primer usuario role='client'.
drop policy if exists datadis_incidencias_select on public.datadis_incidencias;
create policy datadis_incidencias_select on public.datadis_incidencias
  for select to authenticated using (public.is_staff());

-- ── Idempotencia de incidencias (auditoría 2026-07-13, B4) ───────────
-- Evita duplicados si un run manual solapa con el cron. El worker de
-- persistencia (S0.2) usará ON CONFLICT sobre esta clave en vez de delete+insert.
create unique index if not exists uq_datadis_incidencias_dedupe
  on public.datadis_incidencias (empresa_id, tipo, coalesce(cups_codigo, ''));

-- ── Permitir el tipo base20_duplicado (auditoría 2026-07-13, B3) ─────
-- Para cuando el worker detecte dos puntos frontera con el mismo base20
-- (caso FV: …0F consumo vs …1F generación) y lo reporte en vez de sobrescribir.
alter table public.datadis_incidencias drop constraint if exists datadis_incidencias_tipo_check;
alter table public.datadis_incidencias add constraint datadis_incidencias_tipo_check
  check (tipo in ('cups_falta_en_crm', 'cups_no_coincide', 'base20_duplicado'));

-- NOTA (worker, fuera de esta migración): implementar en datadis-sync la
-- detección de colisión base20 en ambos lados (B3) y el cambio de
-- delete+insert a upsert ON CONFLICT (B4). Ver docs/ROADMAP_MODULO_ENERGIA_V2.md S0.2.
