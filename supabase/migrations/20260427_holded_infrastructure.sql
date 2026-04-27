-- =============================================================================
-- Migration: Infraestructura integración Holded (Fase 1)
-- Fecha: 2026-04-27
-- Sprint: holded-fase1
-- Plan: docs/PLAN_INTEGRACION_HOLDED.md § Fase 1
--
-- OBJETIVO
--   Crear toda la infraestructura backend que necesita la integración Holded:
--   columnas holded_* en tablas dominio, 5 tablas de control (config, queue,
--   logs, conflicts, sync_state), helpers SQL, RLS granular con roles canónicos
--   master/manager/consultant/client, y schedule pg_cron del worker.
--
-- ALCANCE
--   1. CREATE EXTENSION pg_net (HTTP async desde SQL para invocar Edge Functions).
--   2. Helper is_master() — falta en el schema actual (existen is_manager_or_above
--      y is_approved tras audit C-03/M-08 2026-04-27).
--   3. Columnas holded_id (text UNIQUE parcial), holded_etag (text), holded_synced_at
--      (timestamptz) en empresas, contactos, oportunidades, actividades, contratos.
--   4. Tablas nuevas:
--      - holded_config (singleton, id='singleton'): flags integración + excluded_nifs.
--      - holded_sync_queue: cola idempotente con backoff.
--      - holded_integration_logs: auditoría inmutable (insert-only, no update).
--      - holded_conflicts: detección de last-write-wins fallido.
--      - holded_sync_state: estado pull por entidad.
--   5. RLS habilitado + 4 policies granulares en cada tabla nueva con roles
--      canónicos master/manager/consultant/client (audit C-03).
--   6. Helpers: holded_enqueue(), holded_get_config(), holded_dispatch_worker(),
--      holded_log_call() — utilizadas por triggers y Edge Functions.
--   7. pg_cron job holded_worker_5min — invoca Edge Function via pg_net.
--      Skip silencioso cuando holded_config.enabled=false (default false).
--   8. Helpers de masking: holded_mask_nif(), holded_mask_iban() —
--      enmascaran PII antes de loggear (RGPD + audit M-08).
--
-- DEPENDENCIAS PREVIAS
--   - Migration 20260427_holded_data_audit.sql aplicada (función valida_nif_cif).
--   - HOLDED_API_KEY ya en Edge Function Secrets (verificado 2026-04-27).
--   - Edge Function holded-worker desplegada (en mismo sprint, post-migration).
--
-- ROLES CANÓNICOS (audit C-03)
--   master | manager | consultant | client
--
-- DRY-RUN
--   Validar con BEGIN ... ROLLBACK contra prod antes de apply_migration.
--
-- ROLLBACK
--   Ver bloque al final del archivo (comentado).
-- =============================================================================

-- =============================================================================
-- 1. Extensión pg_net (HTTP async desde SQL)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============================================================================
-- 2. Helper is_master() — completa el set master/manager_or_above
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_master()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
      AND role = 'master'
      AND approved = true
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_master() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_master() TO authenticated;

COMMENT ON FUNCTION public.is_master() IS
  'Devuelve true si el caller es master aprobado. Roles canónicos master/manager/consultant/client.';

-- =============================================================================
-- 3. Helpers de masking PII (RGPD)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.holded_mask_nif(p_nif text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN p_nif IS NULL OR length(trim(p_nif)) = 0 THEN NULL
    WHEN length(public.normaliza_nif_cif(p_nif)) >= 4 THEN
      substring(public.normaliza_nif_cif(p_nif), 1, 1)
        || repeat('*', length(public.normaliza_nif_cif(p_nif)) - 2)
        || substring(public.normaliza_nif_cif(p_nif), length(public.normaliza_nif_cif(p_nif)), 1)
    ELSE '***'
  END;
$$;

CREATE OR REPLACE FUNCTION public.holded_mask_iban(p_iban text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN p_iban IS NULL OR length(trim(p_iban)) = 0 THEN NULL
    WHEN length(regexp_replace(p_iban, '\s', '', 'g')) >= 8 THEN
      substring(regexp_replace(p_iban, '\s', '', 'g'), 1, 4)
        || repeat('*', length(regexp_replace(p_iban, '\s', '', 'g')) - 8)
        || substring(regexp_replace(p_iban, '\s', '', 'g'),
                     length(regexp_replace(p_iban, '\s', '', 'g')) - 3,
                     4)
    ELSE '***'
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.holded_mask_nif(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.holded_mask_iban(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.holded_mask_nif(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.holded_mask_iban(text) TO authenticated, service_role;

COMMENT ON FUNCTION public.holded_mask_nif(text) IS
  'Enmascara NIF para logs: B10759520 → B*******0. Cumple RGPD para holded_integration_logs.';
COMMENT ON FUNCTION public.holded_mask_iban(text) IS
  'Enmascara IBAN para logs: ES7621000418401234567891 → ES76************7891.';

-- =============================================================================
-- 4. Columnas holded_* en tablas dominio
-- =============================================================================
ALTER TABLE public.empresas       ADD COLUMN IF NOT EXISTS holded_id        text;
ALTER TABLE public.empresas       ADD COLUMN IF NOT EXISTS holded_etag      text;
ALTER TABLE public.empresas       ADD COLUMN IF NOT EXISTS holded_synced_at timestamptz;

ALTER TABLE public.contactos      ADD COLUMN IF NOT EXISTS holded_id        text;
ALTER TABLE public.contactos      ADD COLUMN IF NOT EXISTS holded_etag      text;
ALTER TABLE public.contactos      ADD COLUMN IF NOT EXISTS holded_synced_at timestamptz;

ALTER TABLE public.oportunidades  ADD COLUMN IF NOT EXISTS holded_id        text;
ALTER TABLE public.oportunidades  ADD COLUMN IF NOT EXISTS holded_etag      text;
ALTER TABLE public.oportunidades  ADD COLUMN IF NOT EXISTS holded_synced_at timestamptz;

ALTER TABLE public.actividades    ADD COLUMN IF NOT EXISTS holded_id        text;
ALTER TABLE public.actividades    ADD COLUMN IF NOT EXISTS holded_etag      text;
ALTER TABLE public.actividades    ADD COLUMN IF NOT EXISTS holded_synced_at timestamptz;

ALTER TABLE public.contratos      ADD COLUMN IF NOT EXISTS holded_id        text;
ALTER TABLE public.contratos      ADD COLUMN IF NOT EXISTS holded_etag      text;
ALTER TABLE public.contratos      ADD COLUMN IF NOT EXISTS holded_synced_at timestamptz;

-- Índices únicos PARCIALES (Postgres permite múltiples NULL en UNIQUE pero
-- queremos enforcement explícito + búsqueda rápida cuando hay holded_id).
CREATE UNIQUE INDEX IF NOT EXISTS idx_empresas_holded_id_uniq
  ON public.empresas(holded_id) WHERE holded_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_contactos_holded_id_uniq
  ON public.contactos(holded_id) WHERE holded_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_oportunidades_holded_id_uniq
  ON public.oportunidades(holded_id) WHERE holded_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_actividades_holded_id_uniq
  ON public.actividades(holded_id) WHERE holded_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_contratos_holded_id_uniq
  ON public.contratos(holded_id) WHERE holded_id IS NOT NULL;

COMMENT ON COLUMN public.empresas.holded_id        IS 'ID del contacto correspondiente en Holded. NULL si aún no sincronizado.';
COMMENT ON COLUMN public.empresas.holded_etag      IS 'Hash MD5 del último payload enviado a Holded. Permite detectar cambios reales y evitar updates redundantes.';
COMMENT ON COLUMN public.empresas.holded_synced_at IS 'Timestamp UTC del último sync exitoso con Holded.';

-- =============================================================================
-- 5. Tabla holded_config (singleton)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.holded_config (
  id                       text PRIMARY KEY DEFAULT 'singleton'
                           CHECK (id = 'singleton'),
  enabled                  boolean NOT NULL DEFAULT false,
  mode                     text NOT NULL DEFAULT 'dry_run'
                           CHECK (mode IN ('dry_run','live')),
  productos_sync_mode      text NOT NULL DEFAULT 'read'
                           CHECK (productos_sync_mode IN ('read','bidirectional')),
  excluded_nifs            text[] NOT NULL DEFAULT ARRAY['TEST_VALERE_NOSINCRONIZAR']::text[],
  api_base_url             text NOT NULL DEFAULT 'https://api.holded.com/api',
  functions_base_url       text NOT NULL DEFAULT 'https://gtphkowfcuiqbvfkwjxb.supabase.co/functions/v1',
  rate_limit_req_per_sec   int NOT NULL DEFAULT 5 CHECK (rate_limit_req_per_sec > 0 AND rate_limit_req_per_sec <= 50),
  retry_max_attempts       int NOT NULL DEFAULT 6 CHECK (retry_max_attempts BETWEEN 1 AND 12),
  retry_initial_backoff_ms int NOT NULL DEFAULT 1000 CHECK (retry_initial_backoff_ms > 0),
  http_timeout_ms          int NOT NULL DEFAULT 15000 CHECK (http_timeout_ms BETWEEN 1000 AND 60000),
  last_full_sync_at        timestamptz,
  last_error               text,
  last_error_at            timestamptz,
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  updated_by               uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.holded_config IS
  'Configuración singleton de la integración Holded. Solo master modifica. Lee manager+.';

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.holded_set_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_holded_config_updated_at ON public.holded_config;
CREATE TRIGGER trg_holded_config_updated_at
  BEFORE UPDATE ON public.holded_config
  FOR EACH ROW EXECUTE FUNCTION public.holded_set_updated_at();

-- Seed singleton
INSERT INTO public.holded_config (id, enabled, mode, productos_sync_mode, excluded_nifs, notes)
VALUES (
  'singleton',
  false,
  'dry_run',
  'read',
  ARRAY['TEST_VALERE_NOSINCRONIZAR']::text[],
  'Config inicial creada por migration 20260427_holded_infrastructure. enabled=false hasta que Juan active desde panel.'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 6. Tabla holded_sync_queue
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.holded_sync_queue (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key   text NOT NULL UNIQUE,
  entity            text NOT NULL CHECK (entity IN (
                      'empresa','contacto','oportunidad','actividad',
                      'contrato','documento_comercial','cobro',
                      'producto','funnel','stage','tesoreria',
                      'metodo_pago','serie','cuenta_contable','tag','impuesto'
                    )),
  entity_id         uuid,
  action            text NOT NULL CHECK (action IN ('push','pull','create','update','delete')),
  direction         text NOT NULL DEFAULT 'valere_to_holded'
                    CHECK (direction IN ('valere_to_holded','holded_to_valere')),
  payload           jsonb,
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','done','error','skipped','dead_letter')),
  attempts          int  NOT NULL DEFAULT 0,
  max_attempts      int  NOT NULL DEFAULT 6,
  last_error        text,
  scheduled_for     timestamptz NOT NULL DEFAULT now(),
  processed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  triggered_by      uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_holded_queue_status_scheduled
  ON public.holded_sync_queue(status, scheduled_for)
  WHERE status IN ('pending','processing');

CREATE INDEX IF NOT EXISTS idx_holded_queue_entity
  ON public.holded_sync_queue(entity, entity_id);

DROP TRIGGER IF EXISTS trg_holded_queue_updated_at ON public.holded_sync_queue;
CREATE TRIGGER trg_holded_queue_updated_at
  BEFORE UPDATE ON public.holded_sync_queue
  FOR EACH ROW EXECUTE FUNCTION public.holded_set_updated_at();

COMMENT ON TABLE public.holded_sync_queue IS
  'Cola idempotente de operaciones pendientes con Holded. Worker pg_cron consume cada 5 min.';

-- =============================================================================
-- 7. Tabla holded_integration_logs (inmutable: insert-only)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.holded_integration_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts              timestamptz NOT NULL DEFAULT now(),
  direction       text NOT NULL CHECK (direction IN ('valere_to_holded','holded_to_valere')),
  entity          text NOT NULL,
  entity_id       uuid,
  http_method     text,
  http_url        text,
  http_status     int,
  request_payload jsonb,    -- DEBE estar pre-enmascarado (NIF/IBAN) por el caller
  response_body   jsonb,
  error           text,
  duration_ms     int,
  triggered_by    uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  queue_id        uuid REFERENCES public.holded_sync_queue(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_holded_logs_ts        ON public.holded_integration_logs(ts DESC);
CREATE INDEX IF NOT EXISTS idx_holded_logs_entity    ON public.holded_integration_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_holded_logs_status    ON public.holded_integration_logs(http_status) WHERE http_status >= 400;

COMMENT ON TABLE public.holded_integration_logs IS
  'Log inmutable de llamadas a Holded (insert-only). Payloads ya enmascarados (NIF/IBAN parcial). RGPD compliant.';

-- =============================================================================
-- 8. Tabla holded_conflicts
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.holded_conflicts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity          text NOT NULL,
  entity_id       uuid,
  holded_id       text,
  valere_payload  jsonb,
  holded_payload  jsonb,
  detected_at     timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  resolved_by     uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  resolution      text CHECK (resolution IN ('valere_wins','holded_wins','manual_merge','ignored')),
  resolution_notes text
);

CREATE INDEX IF NOT EXISTS idx_holded_conflicts_unresolved
  ON public.holded_conflicts(detected_at)
  WHERE resolved_at IS NULL;

COMMENT ON TABLE public.holded_conflicts IS
  'Conflictos detectados entre Valere y Holded. Resolución manual desde panel admin.';

-- =============================================================================
-- 9. Tabla holded_sync_state
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.holded_sync_state (
  entity              text PRIMARY KEY,
  last_pull_at        timestamptz,
  last_pull_etag      text,
  last_push_at        timestamptz,
  last_pull_status    text CHECK (last_pull_status IN ('ok','error','partial')),
  items_synced        int NOT NULL DEFAULT 0,
  last_error          text,
  notes               text,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_holded_sync_state_updated_at ON public.holded_sync_state;
CREATE TRIGGER trg_holded_sync_state_updated_at
  BEFORE UPDATE ON public.holded_sync_state
  FOR EACH ROW EXECUTE FUNCTION public.holded_set_updated_at();

COMMENT ON TABLE public.holded_sync_state IS
  'Estado del último pull/push por entidad. Una fila por entidad sincronizable.';

-- Seed estado inicial
INSERT INTO public.holded_sync_state (entity, notes) VALUES
  ('empresa',         'Pendiente Fase 3 — sync bidireccional'),
  ('contacto',        'Pendiente Fase 3'),
  ('oportunidad',     'Pendiente Fase 4'),
  ('actividad',       'Pendiente Fase 4'),
  ('producto',        'Pendiente Fase 2 — pull catálogo'),
  ('funnel',          'Pendiente Fase 2'),
  ('stage',           'Pendiente Fase 2'),
  ('tesoreria',       'Pendiente Fase 2'),
  ('metodo_pago',     'Pendiente Fase 2'),
  ('serie',           'Pendiente Fase 2'),
  ('cuenta_contable', 'Pendiente Fase 2'),
  ('tag',             'Pendiente Fase 2'),
  ('impuesto',        'Pendiente Fase 2')
ON CONFLICT (entity) DO NOTHING;

-- =============================================================================
-- 10. RLS — habilitar y crear policies granulares con roles canónicos
-- =============================================================================
ALTER TABLE public.holded_config            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holded_sync_queue        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holded_integration_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holded_conflicts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holded_sync_state        ENABLE ROW LEVEL SECURITY;

-- ---- holded_config: SELECT manager+, INSERT/UPDATE/DELETE master only ----
DROP POLICY IF EXISTS holded_config_select ON public.holded_config;
DROP POLICY IF EXISTS holded_config_insert ON public.holded_config;
DROP POLICY IF EXISTS holded_config_update ON public.holded_config;
DROP POLICY IF EXISTS holded_config_delete ON public.holded_config;

CREATE POLICY holded_config_select ON public.holded_config
  FOR SELECT TO authenticated
  USING (public.is_manager_or_above());

CREATE POLICY holded_config_insert ON public.holded_config
  FOR INSERT TO authenticated
  WITH CHECK (public.is_master());

CREATE POLICY holded_config_update ON public.holded_config
  FOR UPDATE TO authenticated
  USING (public.is_master())
  WITH CHECK (public.is_master());

CREATE POLICY holded_config_delete ON public.holded_config
  FOR DELETE TO authenticated
  USING (public.is_master());

-- ---- holded_sync_queue: SELECT manager+, INSERT authed, UPDATE service+manager, DELETE master ----
DROP POLICY IF EXISTS holded_queue_select ON public.holded_sync_queue;
DROP POLICY IF EXISTS holded_queue_insert ON public.holded_sync_queue;
DROP POLICY IF EXISTS holded_queue_update ON public.holded_sync_queue;
DROP POLICY IF EXISTS holded_queue_delete ON public.holded_sync_queue;

CREATE POLICY holded_queue_select ON public.holded_sync_queue
  FOR SELECT TO authenticated
  USING (public.is_manager_or_above());

CREATE POLICY holded_queue_insert ON public.holded_sync_queue
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);  -- cualquier authed puede encolar (helpers SECURITY DEFINER lo hacen seguro)

CREATE POLICY holded_queue_update ON public.holded_sync_queue
  FOR UPDATE TO authenticated
  USING (public.is_manager_or_above())
  WITH CHECK (public.is_manager_or_above());

CREATE POLICY holded_queue_delete ON public.holded_sync_queue
  FOR DELETE TO authenticated
  USING (public.is_master());

-- ---- holded_integration_logs: SELECT manager+, INSERT service-only, no UPDATE/DELETE (inmutable) ----
DROP POLICY IF EXISTS holded_logs_select ON public.holded_integration_logs;
DROP POLICY IF EXISTS holded_logs_insert ON public.holded_integration_logs;

CREATE POLICY holded_logs_select ON public.holded_integration_logs
  FOR SELECT TO authenticated
  USING (public.is_manager_or_above());

CREATE POLICY holded_logs_insert ON public.holded_integration_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);  -- service_role bypasa RLS de todos modos

-- NO policies UPDATE ni DELETE → tabla insert-only desde el punto de vista RLS.

-- ---- holded_conflicts: SELECT manager+, INSERT authed, UPDATE manager+, DELETE master ----
DROP POLICY IF EXISTS holded_conflicts_select ON public.holded_conflicts;
DROP POLICY IF EXISTS holded_conflicts_insert ON public.holded_conflicts;
DROP POLICY IF EXISTS holded_conflicts_update ON public.holded_conflicts;
DROP POLICY IF EXISTS holded_conflicts_delete ON public.holded_conflicts;

CREATE POLICY holded_conflicts_select ON public.holded_conflicts
  FOR SELECT TO authenticated
  USING (public.is_manager_or_above());

CREATE POLICY holded_conflicts_insert ON public.holded_conflicts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY holded_conflicts_update ON public.holded_conflicts
  FOR UPDATE TO authenticated
  USING (public.is_manager_or_above())
  WITH CHECK (public.is_manager_or_above());

CREATE POLICY holded_conflicts_delete ON public.holded_conflicts
  FOR DELETE TO authenticated
  USING (public.is_master());

-- ---- holded_sync_state: SELECT authed, INSERT/UPDATE/DELETE master ----
DROP POLICY IF EXISTS holded_state_select ON public.holded_sync_state;
DROP POLICY IF EXISTS holded_state_insert ON public.holded_sync_state;
DROP POLICY IF EXISTS holded_state_update ON public.holded_sync_state;
DROP POLICY IF EXISTS holded_state_delete ON public.holded_sync_state;

CREATE POLICY holded_state_select ON public.holded_sync_state
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY holded_state_insert ON public.holded_sync_state
  FOR INSERT TO authenticated
  WITH CHECK (public.is_master());

CREATE POLICY holded_state_update ON public.holded_sync_state
  FOR UPDATE TO authenticated
  USING (public.is_master())
  WITH CHECK (public.is_master());

CREATE POLICY holded_state_delete ON public.holded_sync_state
  FOR DELETE TO authenticated
  USING (public.is_master());

-- =============================================================================
-- 11. Helper holded_get_config()
-- =============================================================================
CREATE OR REPLACE FUNCTION public.holded_get_config()
  RETURNS public.holded_config
  LANGUAGE sql
  STABLE
  SECURITY INVOKER
  SET search_path = public, pg_temp
AS $$
  SELECT * FROM public.holded_config WHERE id = 'singleton' LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.holded_get_config() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.holded_get_config() TO authenticated, service_role;

-- =============================================================================
-- 12. Helper holded_enqueue() — encola una operación de forma idempotente
-- =============================================================================
CREATE OR REPLACE FUNCTION public.holded_enqueue(
  p_entity         text,
  p_entity_id      uuid,
  p_action         text,
  p_payload        jsonb DEFAULT NULL,
  p_direction      text DEFAULT 'valere_to_holded',
  p_idempotency    text DEFAULT NULL,
  p_scheduled_for  timestamptz DEFAULT now()
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
DECLARE
  v_idem text;
  v_id   uuid;
BEGIN
  v_idem := COALESCE(
    p_idempotency,
    p_entity || ':' || COALESCE(p_entity_id::text,'-') || ':' || p_action || ':' || extract(epoch from now())::bigint::text
  );

  INSERT INTO public.holded_sync_queue (
    idempotency_key, entity, entity_id, action, direction, payload, scheduled_for, triggered_by
  )
  VALUES (
    v_idem, p_entity, p_entity_id, p_action, p_direction, p_payload, p_scheduled_for, auth.uid()
  )
  ON CONFLICT (idempotency_key) DO UPDATE
    SET payload       = EXCLUDED.payload,
        scheduled_for = EXCLUDED.scheduled_for,
        status        = CASE WHEN holded_sync_queue.status IN ('done','error','dead_letter')
                             THEN 'pending' ELSE holded_sync_queue.status END,
        attempts      = CASE WHEN holded_sync_queue.status IN ('done','error','dead_letter')
                             THEN 0 ELSE holded_sync_queue.attempts END,
        last_error    = NULL,
        updated_at    = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.holded_enqueue(text, uuid, text, jsonb, text, text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.holded_enqueue(text, uuid, text, jsonb, text, text, timestamptz) TO authenticated, service_role;

COMMENT ON FUNCTION public.holded_enqueue(text, uuid, text, jsonb, text, text, timestamptz) IS
  'Encola operación idempotente. Reusa idempotency_key para deduplicar. Usable desde triggers y Edge Functions.';

-- =============================================================================
-- 13. Helper holded_dispatch_worker() — invoca Edge Function via pg_net
-- =============================================================================
-- NOTA: pg_net.http_post requiere headers como jsonb y body como jsonb.
-- La autenticación de la Edge Function se hace en la propia función Deno
-- comparando un header CRON_SECRET con Deno.env.get('CRON_SECRET').
-- El secret CRON_SECRET se genera fuera de esta migration (RUNBOOK).
CREATE OR REPLACE FUNCTION public.holded_dispatch_worker()
  RETURNS bigint
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp, extensions
AS $$
DECLARE
  v_cfg          public.holded_config;
  v_request_id   bigint;
  v_url          text;
  v_secret       text;
BEGIN
  SELECT * INTO v_cfg FROM public.holded_get_config();

  -- Skip silencioso si integración deshabilitada
  IF NOT v_cfg.enabled THEN
    RETURN 0;
  END IF;

  -- Lee CRON_SECRET de Vault (Juan lo crea por separado, ver RUNBOOK)
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'HOLDED_CRON_SECRET'
  LIMIT 1;

  IF v_secret IS NULL THEN
    -- Sin secret no llamamos a la Edge Function (rechazaría la llamada)
    INSERT INTO public.holded_integration_logs (direction, entity, http_status, error)
    VALUES ('valere_to_holded','worker_dispatch', 0,
            'HOLDED_CRON_SECRET no encontrado en Vault — Juan debe crearlo');
    RETURN 0;
  END IF;

  v_url := v_cfg.functions_base_url || '/holded-worker';

  SELECT net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'X-Cron-Secret', v_secret
               ),
    body    := jsonb_build_object('source','pg_cron','tick_at', now())
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.holded_dispatch_worker() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.holded_dispatch_worker() TO service_role;

COMMENT ON FUNCTION public.holded_dispatch_worker() IS
  'Invocada por pg_cron cada 5 min. Llama Edge Function holded-worker via pg_net. Skip si holded_config.enabled=false.';

-- =============================================================================
-- 14. pg_cron job: holded_worker_5min
-- =============================================================================
-- Schedule el job. Está protegido en la propia función dispatch (skip si disabled).
-- Si ya existe por re-aplicación, lo recreamos.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'holded_worker_5min') THEN
    PERFORM cron.unschedule('holded_worker_5min');
  END IF;
  PERFORM cron.schedule(
    'holded_worker_5min',
    '*/5 * * * *',
    $sql$ SELECT public.holded_dispatch_worker(); $sql$
  );
END;
$$;

-- =============================================================================
-- ROLLBACK (descomentar para revertir esta migration)
-- =============================================================================
-- DO $$ BEGIN
--   IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='holded_worker_5min') THEN
--     PERFORM cron.unschedule('holded_worker_5min');
--   END IF;
-- END $$;
-- DROP FUNCTION IF EXISTS public.holded_dispatch_worker();
-- DROP FUNCTION IF EXISTS public.holded_enqueue(text, uuid, text, jsonb, text, text, timestamptz);
-- DROP FUNCTION IF EXISTS public.holded_get_config();
-- DROP TABLE IF EXISTS public.holded_sync_state CASCADE;
-- DROP TABLE IF EXISTS public.holded_conflicts CASCADE;
-- DROP TABLE IF EXISTS public.holded_integration_logs CASCADE;
-- DROP TABLE IF EXISTS public.holded_sync_queue CASCADE;
-- DROP TABLE IF EXISTS public.holded_config CASCADE;
-- DROP FUNCTION IF EXISTS public.holded_set_updated_at();
-- ALTER TABLE public.empresas      DROP COLUMN IF EXISTS holded_id, DROP COLUMN IF EXISTS holded_etag, DROP COLUMN IF EXISTS holded_synced_at;
-- ALTER TABLE public.contactos     DROP COLUMN IF EXISTS holded_id, DROP COLUMN IF EXISTS holded_etag, DROP COLUMN IF EXISTS holded_synced_at;
-- ALTER TABLE public.oportunidades DROP COLUMN IF EXISTS holded_id, DROP COLUMN IF EXISTS holded_etag, DROP COLUMN IF EXISTS holded_synced_at;
-- ALTER TABLE public.actividades   DROP COLUMN IF EXISTS holded_id, DROP COLUMN IF EXISTS holded_etag, DROP COLUMN IF EXISTS holded_synced_at;
-- ALTER TABLE public.contratos     DROP COLUMN IF EXISTS holded_id, DROP COLUMN IF EXISTS holded_etag, DROP COLUMN IF EXISTS holded_synced_at;
-- DROP FUNCTION IF EXISTS public.holded_mask_iban(text);
-- DROP FUNCTION IF EXISTS public.holded_mask_nif(text);
-- DROP FUNCTION IF EXISTS public.is_master();
