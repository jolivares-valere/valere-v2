-- =====================================================================
-- Fix: habilitar RLS en tablas sin RLS detectadas por Supabase Advisor
-- ESTADO: APLICADO MANUALMENTE vía MCP el 2026-05-13
--   Detectado via email Supabase Security Advisor (rls_disabled_in_public)
--   NO re-ejecutar — ya está en producción.
-- =====================================================================
--
-- Tablas afectadas:
--   (1) fv_credenciales_backup_20260511 — backup temporal pre-migración 11/05
--   (2) fv_planta_backup_20260511       — backup temporal pre-migración 11/05
--   (3) fv_sync_log_backup_20260511     — backup temporal pre-migración 11/05
--       → RLS activado sin policies: acceso bloqueado para anon/authenticated.
--         Solo service_role puede leer. Pendiente DROP cuando se confirme
--         que las migraciones del 11/05 están consolidadas.
--
--   (4) datadis_provincias — tabla de referencia (provincias españolas para Datadis)
--       → RLS activado + policy lectura authenticated.
--         No contiene datos de clientes.
-- =====================================================================

-- (1-3) Backup tables: bloquear todo acceso externo
ALTER TABLE public.fv_credenciales_backup_20260511 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fv_planta_backup_20260511        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fv_sync_log_backup_20260511      ENABLE ROW LEVEL SECURITY;
-- Sin policies → authenticated/anon denegados por defecto. Solo service_role.

-- (4) Referencia pública: habilitar RLS + lectura para authenticated
ALTER TABLE public.datadis_provincias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "datadis_provincias_read_authenticated"
    ON public.datadis_provincias
    FOR SELECT
    TO authenticated
    USING (true);

-- ─────────────────────────────────────────────────────────────────────
-- Limpieza futura (ejecutar cuando migraciones 20260511 estén consolidadas):
-- ─────────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS public.fv_credenciales_backup_20260511;
-- DROP TABLE IF EXISTS public.fv_planta_backup_20260511;
-- DROP TABLE IF EXISTS public.fv_sync_log_backup_20260511;

NOTIFY pgrst, 'reload schema';
