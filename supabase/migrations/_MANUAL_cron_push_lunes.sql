-- =====================================================================
-- PR-4.2 (semana 4) — RPC de protección + cron del informe de los lunes
-- Aplicado en producción (gtphkowfcuiqbvfkwjxb) por Cowork con OK de Juan.
-- Patrón x-cron-secret idéntico a check_datadis_cron_secret / esios
-- (jobs 4/5/6 en cron.job). El secreto 'push_cron_secret' se crea aparte
-- en Vault (valor aleatorio, NUNCA en el repo ni en el chat — regla de
-- seguridad del proyecto) antes de aplicar este fichero.
-- =====================================================================

create or replace function public.check_push_cron_secret(p text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from vault.decrypted_secrets
    where name = 'push_cron_secret' and decrypted_secret = p
  );
$$;

revoke all on function public.check_push_cron_secret(text) from public;
grant execute on function public.check_push_cron_secret(text) to service_role;

-- Lunes 07:00 UTC (patrón pg_net + Vault, como jobs 4/5/6).
select cron.schedule(
  'push-lunes-weekly',
  '0 7 * * 1',
  $cron$
  select net.http_post(
    url := 'https://gtphkowfcuiqbvfkwjxb.supabase.co/functions/v1/push-lunes',
    headers := jsonb_build_object(
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{"dry_run": false}'::jsonb
  ) as request_id;
  $cron$
);
