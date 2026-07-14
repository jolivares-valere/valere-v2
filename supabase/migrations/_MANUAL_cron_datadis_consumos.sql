-- ═══════════════════════════════════════════════════════════════════
-- CRON del worker pesado datadis-consumos (C6) — APLICAR TRAS AUDITORÍA + DEPLOY
--
-- Fichero _MANUAL_ (prefijo con guion bajo): NO se aplica en el flujo normal de
-- migraciones. Se ejecuta A MANO por el conector una vez que:
--   1) el código del worker ha pasado por el auditor,
--   2) el worker está desplegado,
--   3) se ha hecho un primer run supervisado en dry_run.
--
-- Desfasado del sync (05:15) para no solapar: 03:30 UTC.
-- Patrón idéntico a esios-nightly / datadis-sync-nightly (x-cron-secret vía Vault).
-- ═══════════════════════════════════════════════════════════════════

select cron.schedule(
  'datadis-consumos-nightly',
  '30 3 * * *',
  $$
  select net.http_post(
    url := 'https://gtphkowfcuiqbvfkwjxb.supabase.co/functions/v1/datadis-consumos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'datadis_cron_secret')
    ),
    body := jsonb_build_object('dry_run', false, 'max_cups', 12, 'max_seconds', 120)::jsonb,
    timeout_milliseconds := 280000
  );
  $$
);

-- Para borrarlo si hiciera falta:  select cron.unschedule('datadis-consumos-nightly');
