-- ─────────────────────────────────────────────────────────────────────────────
-- fv_sync_audit — Trazabilidad por planta, endpoint y ejecución
-- Aplicar DESPUÉS de validar el fix EU5 en main.
-- ─────────────────────────────────────────────────────────────────────────────

-- Tipo ENUM de categorías de error
DO $$ BEGIN
    CREATE TYPE fv_error_category AS ENUM (
        'auth',          -- AUTH_REDIRECT / 401 / 403 — cookies expiradas
        'rate_limit',    -- 503 persistente tras retry — FusionSolar throttling
        'payload',       -- campo incorrecto en body (ej: stationCodes vs dn)
        'overflow',      -- valor numérico fuera de rango aceptable
        'empty',         -- respuesta válida pero sin datos (planta desconectada)
        'timeout',       -- job cancelado por GitHub Actions
        'mapping',       -- campo de FusionSolar no mapeado / desconocido
        'unknown'        -- error no clasificado
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabla principal de auditoría
CREATE TABLE IF NOT EXISTS public.fv_sync_audit (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Agrupa todos los registros de una misma ejecución del workflow
    run_id           uuid        NOT NULL,

    -- Relaciones (nullable: puede fallar antes de tener planta_id)
    credencial_id    uuid        REFERENCES public.fv_credenciales(id) ON DELETE CASCADE,
    planta_id        uuid        REFERENCES public.fv_planta(id) ON DELETE CASCADE,

    -- Qué se intentó sincronizar
    fecha_dato       date,                                       -- día del dato (null para realtime/alarmas)
    endpoint         text        NOT NULL,                       -- 'station_list' | 'daily_kpi' | 'realtime_kpi' | 'alarms'

    -- Resultado
    ok               boolean     NOT NULL DEFAULT false,
    error_tipo       fv_error_category,
    error_raw        text,                                       -- mensaje bruto de la excepción

    -- Métricas
    intentos         int         NOT NULL DEFAULT 1,
    filas_insertadas int         NOT NULL DEFAULT 0,
    ms_elapsed       int,                                        -- milisegundos que tardó la llamada

    creado_en        timestamptz NOT NULL DEFAULT now()
);

-- Índices para las consultas habituales del CRM
CREATE INDEX IF NOT EXISTS idx_fv_sync_audit_planta_fecha
    ON public.fv_sync_audit (planta_id, fecha_dato DESC);

CREATE INDEX IF NOT EXISTS idx_fv_sync_audit_credencial_fecha
    ON public.fv_sync_audit (credencial_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_fv_sync_audit_ok_error
    ON public.fv_sync_audit (ok, error_tipo);

CREATE INDEX IF NOT EXISTS idx_fv_sync_audit_run
    ON public.fv_sync_audit (run_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Vista: último estado de salud por planta y endpoint (para el dashboard CRM)
-- DISTINCT ON es O(n log n) con el índice — no hace full scan
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.fv_sync_health_latest AS
SELECT DISTINCT ON (a.planta_id, a.endpoint)
    a.planta_id,
    a.credencial_id,
    a.endpoint,
    a.fecha_dato,
    a.ok,
    a.error_tipo,
    a.error_raw,
    a.intentos,
    a.filas_insertadas,
    a.ms_elapsed,
    a.creado_en,
    p.nombre  AS planta_nombre,
    p.estado  AS planta_estado
FROM public.fv_sync_audit a
JOIN public.fv_planta p ON p.id = a.planta_id
ORDER BY a.planta_id, a.endpoint, a.creado_en DESC;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — mismo patrón que fv_planta: filtra por empresa del usuario
-- (no USING (true) — solo ven datos de sus plantas)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.fv_sync_audit ENABLE ROW LEVEL SECURITY;

-- Master y admin ven todo
CREATE POLICY "fv_sync_audit_admin_select"
    ON public.fv_sync_audit FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()
              AND role IN ('master', 'admin')
        )
    );

-- Usuario normal: ve auditorías de plantas cuya empresa tiene comercial_id = auth.uid()
-- Mismo patrón que fv_planta_read_by_empresa (user_profiles no tiene empresa_id)
CREATE POLICY "fv_sync_audit_user_select"
    ON public.fv_sync_audit FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.fv_planta fp
            JOIN public.empresas e ON e.id = fp.empresa_id
            WHERE fp.id = fv_sync_audit.planta_id
              AND e.comercial_id = auth.uid()
        )
    );

-- Solo service_role escribe (el sync Python usa service_role key)
-- No se necesita policy de INSERT para authenticated — Python bypassa RLS

GRANT SELECT ON public.fv_sync_audit TO authenticated;
GRANT SELECT ON public.fv_sync_health_latest TO authenticated;
