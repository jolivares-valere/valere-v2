-- ─────────────────────────────────────────────────────────────────────────────
-- Migración: Datadis — tabla de cache de consumos + columnas en cups
-- Fecha: 2026-04-30
-- Relacionado: docs/PLAN_INTEGRACION_DATADIS.md
--              supabase/functions/datadis-proxy/index.ts
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Cache de respuestas Datadis ─────────────────────────────────────────
--
-- TTL 24h (los datos de Datadis tienen latencia D-1/D-2).
-- Clave única: (cups, periodo_inicio, periodo_fin, endpoint).
-- Solo la Edge Function puede insertar/actualizar (SECURITY DEFINER implícito
-- si se llama desde service_role). Los clientes solo leen.

CREATE TABLE IF NOT EXISTS public.datadis_consumos_cache (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cups             TEXT        NOT NULL,
  distributor_code TEXT        NOT NULL,                                -- cod_disitribuidora (typo oficial Datadis)
  endpoint         TEXT        NOT NULL,                                -- 'consumos' | 'max_power' | 'contractual' | 'reactive'
  periodo_inicio   DATE        NOT NULL,
  periodo_fin      DATE        NOT NULL,
  payload          JSONB       NOT NULL,                                -- respuesta íntegra de Datadis (normalizada a ISO dates)
  fetched_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ttl_expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  point_type       SMALLINT,                                            -- tipoPunto (1..5)
  tarifa_code      TEXT,                                                -- ej: '3T', '2.0TD'

  UNIQUE (cups, distributor_code, endpoint, periodo_inicio, periodo_fin)
);

COMMENT ON TABLE public.datadis_consumos_cache IS
  'Cache 24h de respuestas de la API Datadis. Ver docs/PLAN_INTEGRACION_DATADIS.md.';

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_datadis_cache_cups
  ON public.datadis_consumos_cache (cups, periodo_inicio, periodo_fin);

CREATE INDEX IF NOT EXISTS idx_datadis_cache_ttl
  ON public.datadis_consumos_cache (ttl_expires_at);

-- RLS
ALTER TABLE public.datadis_consumos_cache ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier usuario autenticado del CRM puede leer el cache
CREATE POLICY "datadis_cache_select_authenticated"
  ON public.datadis_consumos_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Escritura: solo service_role (Edge Function datadis-proxy)
-- No se crea política de INSERT/UPDATE/DELETE para authenticated →
-- los usuarios no pueden escribir directamente.


-- ── 2. Consentimientos RGPD ────────────────────────────────────────────────
--
-- Registro inmutable (sin DELETE, sin UPDATE libre) de consentimientos de
-- clientes para acceso de Valere a sus datos en Datadis.

CREATE TABLE IF NOT EXISTS public.consentimientos_datadis (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cups                     TEXT        NOT NULL,
  cliente_id               UUID        REFERENCES public.empresas(id) ON DELETE SET NULL,
  firmado_por_email        TEXT        NOT NULL,
  firmado_por_nombre       TEXT,
  fecha_firma              TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_firma                 INET        NOT NULL,
  texto_legal              TEXT        NOT NULL,                        -- texto íntegro firmado (inmutable)
  hash_texto               TEXT        NOT NULL,                        -- SHA-256 de texto_legal
  fecha_inicio_autorizacion TIMESTAMPTZ NOT NULL,
  fecha_fin_autorizacion   TIMESTAMPTZ NOT NULL,                       -- máx 2 años desde firma
  revocado_at              TIMESTAMPTZ,                                 -- NULL = consentimiento vigente
  revocado_motivo          TEXT,
  created_by               UUID        REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.consentimientos_datadis IS
  'Registro RGPD de consentimientos de clientes para que Valere acceda a sus datos en Datadis.';

CREATE INDEX IF NOT EXISTS idx_consentimientos_cups
  ON public.consentimientos_datadis (cups);
CREATE INDEX IF NOT EXISTS idx_consentimientos_cliente
  ON public.consentimientos_datadis (cliente_id);
CREATE INDEX IF NOT EXISTS idx_consentimientos_vigentes
  ON public.consentimientos_datadis (fecha_fin_autorizacion)
  WHERE revocado_at IS NULL;

ALTER TABLE public.consentimientos_datadis ENABLE ROW LEVEL SECURITY;

-- Lectura: autenticados (solo su cartera — refinar con comercial_id en FASE 20.9 avanzada)
CREATE POLICY "consentimientos_datadis_select"
  ON public.consentimientos_datadis
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE: solo service_role (Edge Function)
-- DELETE: prohibido para todos (RGPD — inmutabilidad)


-- ── 3. Columnas auxiliares en cups ────────────────────────────────────────

ALTER TABLE public.cups
  ADD COLUMN IF NOT EXISTS datadis_autorizado       BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS datadis_autorizacion_id  UUID        REFERENCES public.consentimientos_datadis(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS datadis_ultimo_fetch      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS datadis_distributor_code  TEXT,              -- cod_disitribuidora de Datadis
  ADD COLUMN IF NOT EXISTS datadis_point_type        SMALLINT,          -- tipoPunto (1..5)
  ADD COLUMN IF NOT EXISTS datadis_tarifa_code       TEXT;              -- ej: '3T', '2.0TD'

COMMENT ON COLUMN public.cups.datadis_autorizado      IS 'true si el cliente ha autorizado el NIF de Valere en Datadis';
COMMENT ON COLUMN public.cups.datadis_distributor_code IS 'cod_disitribuidora de Datadis (typo oficial: doble i)';
COMMENT ON COLUMN public.cups.datadis_point_type       IS 'tipoPunto Datadis (1..5). 4 y 5 los más comunes en cartera';


-- ── 4. Cleanup automático del cache (cron) ────────────────────────────────
--
-- Borrar filas expiradas del cache. Se programa como pg_cron job o
-- se llama desde la Edge Function al inicio de cada request.

CREATE OR REPLACE FUNCTION public.cleanup_datadis_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.datadis_consumos_cache
  WHERE ttl_expires_at < now();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_datadis_cache() IS
  'Elimina filas expiradas del cache Datadis. Invocar desde cron o Edge Function.';
