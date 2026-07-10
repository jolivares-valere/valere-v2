-- ═══════════════════════════════════════════════════════════════════
-- Tabla datadis_incidencias — incidencias de calidad de datos detectadas
-- por el worker datadis-sync al cruzar Datadis (partner) con el CRM.
--
-- Tipos:
--   'cups_falta_en_crm' → Datadis reporta un CUPS autorizado que el CRM no tiene
--                         (guardamos distribuidora/dirección/municipio para darlo de alta).
--   'cups_no_coincide'  → la empresa está autorizada pero NINGÚN CUPS del CRM
--                         cuadra con los de Datadis (CUPS mal cargado/antiguo).
--
-- El worker refresca la tabla en cada ejecución (borra las de las empresas que
-- procesa y reinserta las vigentes) → autorreparable: al corregir el dato, la
-- incidencia desaparece en la siguiente sincronización.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.datadis_incidencias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nif text,
  tipo text not null check (tipo in ('cups_falta_en_crm', 'cups_no_coincide')),
  cups_codigo text,
  distribuidora text,
  direccion text,
  municipio text,
  provincia text,
  detalle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_datadis_incidencias_empresa on public.datadis_incidencias(empresa_id);
create index if not exists idx_datadis_incidencias_tipo on public.datadis_incidencias(tipo);

alter table public.datadis_incidencias enable row level security;

-- Lectura: cualquier usuario autenticado (el dashboard la consume).
drop policy if exists datadis_incidencias_select on public.datadis_incidencias;
create policy datadis_incidencias_select
  on public.datadis_incidencias for select
  to authenticated
  using (true);

-- Escritura: solo service_role (el worker). service_role ignora RLS, así que
-- no hacen falta policies de insert/update/delete para authenticated.
revoke all on public.datadis_incidencias from anon;
