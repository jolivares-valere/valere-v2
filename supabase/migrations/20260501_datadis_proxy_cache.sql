-- ─────────────────────────────────────────────────────────────────────────────
-- Migración: datadis_proxy_cache — cache general de respuestas del proxy Datadis
-- Fecha: 2026-05-01
-- Propósito:
--   Guardar las respuestas de la API Datadis en Supabase para:
--   1. Servir datos guardados sin esperar a Datadis (visualización inmediata)
--   2. Mantener histórico aunque Datadis esté caído o lento
--   3. Actualización manual bajo demanda por el operador
--   4. Base para futura actualización automática programada (cron)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.datadis_proxy_cache (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación de la solicitud
  datadis_username  text        NOT NULL DEFAULT 'master',
                                -- 'master' para cuenta Valere, email para cuenta cliente
  action            text        NOT NULL,
                                -- 'get_supplies' | 'get_contractual' | 'get_consumption'
                                --  | 'get_max_power' | 'get_reactive'
  cache_key         text        NOT NULL,
                                -- Clave única: datadis_username + ':' + action + ':' + cups + ':' + params_hash
  cups              text,       -- NULL para get_supplies (lista todos); CUPS concreto para el resto
  params_snapshot   jsonb,      -- Parámetros originales de la petición (para debugging y re-fetch)

  -- Respuesta guardada
  response_data     jsonb       NOT NULL,
                                -- Respuesta íntegra del proxy: { ok, data }
                                -- Formato depende del action (ver docs/PLAN_INTEGRACION_DATADIS.md)

  -- Control de frescura
  -- is_stale se calcula en la Edge Function (JS): fetched_at + stale_after_hours < now()
  -- No se usa GENERATED ALWAYS AS porque now() no es inmutable en PostgreSQL.
  fetched_at        timestamptz NOT NULL DEFAULT now(),
  stale_after_hours int         NOT NULL DEFAULT 24,
                                -- get_supplies: 24h, get_contractual: 168h (7d),
                                -- get_consumption/max_power/reactive: 6h

  -- Auditoría
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT datadis_proxy_cache_key_unique UNIQUE (cache_key)
);

-- Índices de acceso frecuente
CREATE INDEX IF NOT EXISTS idx_datadis_proxy_cache_action_username
  ON public.datadis_proxy_cache (action, datadis_username);

CREATE INDEX IF NOT EXISTS idx_datadis_proxy_cache_cups
  ON public.datadis_proxy_cache (cups)
  WHERE cups IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_datadis_proxy_cache_fetched
  ON public.datadis_proxy_cache (fetched_at DESC);

COMMENT ON TABLE public.datadis_proxy_cache IS
  'Cache persistente de respuestas del proxy Datadis. Permite visualizar datos '
  'aunque Datadis esté caído. Actualización manual o automática (cron futuro). '
  'Solo la Edge Function datadis-proxy escribe (service_role). '
  'Los usuarios autenticados solo leen.';

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.datadis_proxy_cache ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier usuario autenticado del CRM
CREATE POLICY "datadis_proxy_cache_select"
  ON public.datadis_proxy_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Escritura / borrado: solo service_role (la Edge Function datadis-proxy)
-- No se crean políticas INSERT/UPDATE/DELETE para 'authenticated':
-- los clientes del frontend no pueden escribir directamente en el cache.


-- ── Función: updated_at automático ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_datadis_cache_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_datadis_proxy_cache_updated_at
  BEFORE UPDATE ON public.datadis_proxy_cache
  FOR EACH ROW EXECUTE FUNCTION public.set_datadis_cache_updated_at();


-- ── Función: limpiar entradas muy antiguas (>30d expiradas) ──────────────────

CREATE OR REPLACE FUNCTION public.cleanup_datadis_proxy_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.datadis_proxy_cache
  WHERE fetched_at < now() - interval '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_datadis_proxy_cache() IS
  'Elimina entradas del cache Datadis con más de 30 días. '
  'Invocar desde pg_cron o manualmente.';
