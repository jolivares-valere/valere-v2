-- =====================================================================
-- Fase puente ★ — espejo documental Drive. Aplicado en producción
-- (gtphkowfcuiqbvfkwjxb) por Cowork con OK de Juan, 23-jul-2026.
-- Patrón x-cron-secret idéntico a check_push_cron_secret / check_datadis_cron_secret.
-- El secreto 'espejo_cron_secret' se crea aparte en Vault (valor aleatorio,
-- NUNCA en el repo ni en el chat) antes de aplicar este fichero, junto con
-- las credenciales OAuth de Drive (espejo_drive_client_id/_secret/
-- _refresh_token y los 4 folder IDs) — ver docs/DISENO_ESPEJO_DOCUMENTAL_DRIVE.md.
-- =====================================================================

-- 1) Tabla de control de reconciliación (nunca se borra: un PDF se
--    considera espejado si tiene fila aquí).
create table if not exists public.espejo_drive_log (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  drive_file_id text not null,
  sha256 text,
  bytes bigint,
  subido_at timestamptz not null default now()
);

comment on table public.espejo_drive_log is
  'Control de reconciliacion del espejo documental a Drive (fase puente ★). Un PDF de documentos/ se considera espejado si tiene fila aqui. Nunca se borra.';

alter table public.espejo_drive_log enable row level security;

create policy espejo_drive_log_service_write
  on public.espejo_drive_log for all
  to service_role
  using (true) with check (true);

create policy espejo_drive_log_authenticated_read
  on public.espejo_drive_log for select
  to authenticated
  using (true);

-- 2) RPC auth cron (patrón check_push_cron_secret).
create or replace function public.check_espejo_cron_secret(p text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from vault.decrypted_secrets
    where name = 'espejo_cron_secret' and decrypted_secret = p
  );
$$;

revoke all on function public.check_espejo_cron_secret(text) from public;
grant execute on function public.check_espejo_cron_secret(text) to service_role;

-- 3) RPC de solo lectura: lista el bucket 'documentos' (storage.objects
--    no está expuesto vía PostgREST).
create or replace function public.espejo_drive_listar_objetos()
returns table(name text, bytes bigint)
language sql
security definer
set search_path = public, storage
as $$
  select o.name, (o.metadata->>'size')::bigint as bytes
  from storage.objects o
  where o.bucket_id = 'documentos'
  order by o.name;
$$;

revoke all on function public.espejo_drive_listar_objetos() from public;
grant execute on function public.espejo_drive_listar_objetos() to service_role;

-- 4) RPC que entrega las credenciales OAuth de Drive + folder IDs a la
--    Edge Function, restringida a service_role.
create or replace function public.espejo_drive_credenciales()
returns json
language sql
security definer
set search_path = public, vault
as $$
  select json_object_agg(name, decrypted_secret)
  from vault.decrypted_secrets
  where name in (
    'espejo_drive_client_id',
    'espejo_drive_client_secret',
    'espejo_drive_refresh_token',
    'espejo_drive_folder_id_empresa',
    'espejo_drive_folder_id_contrato',
    'espejo_drive_folder_id_oportunidades'
  );
$$;

revoke all on function public.espejo_drive_credenciales() from public;
grant execute on function public.espejo_drive_credenciales() to service_role;

-- 5) Cron diario 06:00 UTC (patrón pg_net + Vault, como jobs push-lunes/datadis).
select cron.schedule(
  'espejo-documental-daily',
  '0 6 * * *',
  $cron$
  select net.http_post(
    url := 'https://gtphkowfcuiqbvfkwjxb.supabase.co/functions/v1/espejo-documental',
    headers := jsonb_build_object(
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'espejo_cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{"dry_run": false}'::jsonb
  ) as request_id;
  $cron$
);
