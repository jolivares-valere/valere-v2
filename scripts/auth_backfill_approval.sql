-- =============================================================================
-- Script: auth_backfill_approval.sql
-- Fecha:  2026-06-12
-- Sprint: sprint-domingo-auth-selfsignup
--
-- USO
--   Marca a TODOS los user_profiles existentes como is_approved = true.
--   Pensado para correrlo ANTES de aplicar la migration
--   `_pending_rls_require_is_approved.sql`, para que ningún usuario humano
--   activo pierda acceso al CRM cuando el corte RLS entre en vigor.
--
--   Mantiene `approved` (legacy) en sincronía vía el trigger
--   `trg_user_profiles_sync_approved_columns` añadido en la migration
--   20260612000001_user_approval_flow.sql, así que solo necesitamos tocar
--   `is_approved`.
--
--   El campo `approved_by` queda NULL deliberadamente: no podemos atribuir
--   la aprobación a un humano concreto en el backfill. `approved_at` se
--   pone igual a `created_at` para que el dato sea sensato auditorialmente.
--
-- CÓMO EJECUTARLO
--   Opción A — Supabase Dashboard:
--     Dashboard → SQL Editor → pegar este archivo entero → Run.
--   Opción B — supabase CLI:
--     supabase db execute --project-ref gtphkowfcuiqbvfkwjxb --file scripts/auth_backfill_approval.sql
--   Opción C — Cowork con MCP:
--     execute_sql con el contenido entre BEGIN/COMMIT (sin los comentarios).
--
-- IDEMPOTENCIA
--   Sí. Se puede correr varias veces sin efecto secundario.
--
-- VERIFICACIÓN ESPERADA
--   - Antes: pueden existir filas con is_approved=false (usuarios pendientes
--     reales O legacy pre-flow).
--   - Después: TODOS los user_profiles tienen is_approved=true. Si quieres
--     dejar a alguien fuera, usa el WHERE NOT IN (...) al final.
--
-- IMPORTANTE
--   Este script aprueba a TODOS, incluidos los que ahora mismo están
--   `status = 'pendiente'`. Si en el momento de correrlo hay solicitudes
--   abiertas que NO se quieren aprobar masivamente, AÑADE a mano sus emails
--   al `WHERE` para excluirlos:
--
--     UPDATE public.user_profiles
--        SET is_approved = true, ...
--      WHERE email NOT IN ('pendiente-a-rechazar@ejemplo.com', ...);
-- =============================================================================

BEGIN;

-- Diagnóstico previo (informativo, no muta nada)
DO $$
DECLARE
  v_total   integer;
  v_aprobados integer;
  v_pendientes integer;
BEGIN
  SELECT count(*),
         count(*) FILTER (WHERE is_approved = true),
         count(*) FILTER (WHERE is_approved = false OR is_approved IS NULL)
    INTO v_total, v_aprobados, v_pendientes
  FROM public.user_profiles;
  RAISE NOTICE 'Antes del backfill: total=%, aprobados=%, pendientes=%',
    v_total, v_aprobados, v_pendientes;
END;
$$;

UPDATE public.user_profiles
SET
  is_approved = true,
  approved_at = COALESCE(approved_at, created_at, NOW()),
  approved_by = NULL  -- explícito: aprobación de backfill, sin autor humano
WHERE is_approved IS DISTINCT FROM true;
-- ↑ Si necesitas excluir cuentas concretas, añade aquí:
--     AND email NOT IN ('foo@valereconsultores.com','bar@valere.com')

-- Diagnóstico posterior
DO $$
DECLARE
  v_total   integer;
  v_aprobados integer;
  v_pendientes integer;
BEGIN
  SELECT count(*),
         count(*) FILTER (WHERE is_approved = true),
         count(*) FILTER (WHERE is_approved = false OR is_approved IS NULL)
    INTO v_total, v_aprobados, v_pendientes
  FROM public.user_profiles;
  RAISE NOTICE 'Después del backfill: total=%, aprobados=%, pendientes=%',
    v_total, v_aprobados, v_pendientes;
END;
$$;

COMMIT;

-- =============================================================================
-- POST: lista de quiénes quedaron aprobados (auditable)
-- =============================================================================
-- SELECT id, email, role, status, is_approved, approved_at, approved_by
-- FROM public.user_profiles
-- ORDER BY approved_at NULLS LAST;
