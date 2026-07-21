-- =====================================================================
-- S0.2 — Cron nocturno datadis-consumos (régimen incremental ligero)
-- Aplicado en producción (gtphkowfcuiqbvfkwjxb) por el auditor
-- 2026-07-21 con OK explícito de Juan. Cron jobid=6, active=true.
-- Calibrado: ~2 CUPS/run, 110s. Patrón pg_net + Vault (como jobs 4 y 5).
-- =====================================================================
select cron.schedule(
  'datadis-consumos-nightly',
  '30 3 * * *',
  $cron$
  select net.http_post(
    url := 'https://gtphkowfcuiqbvfkwjxb.supabase.co/functions/v1/datadis-consumos',
    headers := jsonb_build_object(
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'datadis_cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{"dry_run": false, "max_cups": 2, "max_seconds": 110}'::jsonb
  ) as request_id;
  $cron$
);
