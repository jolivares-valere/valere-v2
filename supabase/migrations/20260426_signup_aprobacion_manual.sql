-- =============================================================================
-- Migration: Signup público con aprobación manual del admin
-- Fecha: 2026-04-26
-- Sprint: signup-aprobacion-manual
--
-- OBJETIVO
--   Habilitar el flujo en el que cualquiera puede darse de alta vía /signup,
--   queda con `approved = false` + `status = 'pendiente'`, y solo Juan (master)
--   lo aprueba desde Admin. Tras 7 días sin aprobar, auto-rechazo.
--
-- CAMBIOS
--   1. Update trigger handle_new_user para capturar nombre + apellidos desde
--      raw_user_meta_data y marcar status='pendiente' si no es el master.
--   2. Helper is_approved() - usable en RLS como defensa en profundidad.
--   3. Función SECURITY DEFINER admin_reject_user(uuid) - borra el user de
--      auth.users (cascade a user_profiles). Solo callable por master.
--   4. Función cleanup_pending_users_older_than_7_days() - borra los que
--      llevan >7d sin aprobar. Idempotente.
--   5. Extensión pg_cron + job diario a las 03:00 UTC que invoca el cleanup.
--
-- ROLLBACK
--   Ver bloque al final del archivo (comentado).
-- =============================================================================

-- 1. Trigger handle_new_user actualizado (nombre + apellidos + status pendiente)
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_nombre    text;
  v_apellidos text;
  v_full_name text;
  v_is_master boolean;
BEGIN
  -- Master único hardcoded - nunca queda pendiente
  v_is_master := (NEW.email = 'jolivares@valereconsultores.com');

  -- Extraer nombre / apellidos del metadata enviado en signUp({options:{data:{...}}})
  v_nombre    := COALESCE(NEW.raw_user_meta_data->>'nombre', '');
  v_apellidos := COALESCE(NEW.raw_user_meta_data->>'apellidos', '');

  -- full_name derivado para compatibilidad con la UI legacy que aún lo lee
  v_full_name := NULLIF(TRIM(v_nombre || ' ' || v_apellidos), '');
  IF v_full_name IS NULL THEN
    -- Fallback si signUp no envió metadata (ej: signup vía CLI o link externo)
    v_full_name := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    );
  END IF;

  INSERT INTO public.user_profiles (
    id, email, full_name, nombre, apellidos, role, status, approved
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    NULLIF(v_nombre, ''),
    NULLIF(v_apellidos, ''),
    CASE WHEN v_is_master THEN 'master' ELSE 'client' END,
    CASE WHEN v_is_master THEN 'active' ELSE 'pendiente' END,
    v_is_master
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Crea fila en user_profiles tras INSERT en auth.users. Captura nombre/apellidos del metadata. Master = aprobado, resto = pendiente.';


-- 2. Helper is_approved() - útil para RLS defensiva
CREATE OR REPLACE FUNCTION public.is_approved()
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT approved FROM public.user_profiles WHERE id = auth.uid()),
    false
  )
$function$;

COMMENT ON FUNCTION public.is_approved() IS
  'Devuelve true si el usuario actual (auth.uid()) tiene approved=true en user_profiles.';


-- 3. Función para que el master rechace/borre un usuario pendiente
--    Borrar de auth.users hace cascade a user_profiles (FK ON DELETE CASCADE).
CREATE OR REPLACE FUNCTION public.admin_reject_user(p_user_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
  v_caller_role text;
BEGIN
  -- Solo master puede rechazar usuarios. Manager queda fuera intencionalmente.
  SELECT role INTO v_caller_role
  FROM public.user_profiles
  WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'master' THEN
    RAISE EXCEPTION 'Solo el rol master puede rechazar usuarios. Caller role: %', COALESCE(v_caller_role, '(null)');
  END IF;

  -- Idempotente: si el user ya no existe, no falla
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$function$;

COMMENT ON FUNCTION public.admin_reject_user(uuid) IS
  'Borra un usuario de auth.users (cascade a user_profiles). Solo callable por master.';

-- Permitir que authenticated users invoquen la función (la función internamente
-- valida que el caller sea master)
REVOKE ALL ON FUNCTION public.admin_reject_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reject_user(uuid) TO authenticated;


-- 4. Cleanup automático de pendientes >7 días
CREATE OR REPLACE FUNCTION public.cleanup_pending_users_older_than_7_days()
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
  v_deleted_count integer;
BEGIN
  WITH old_pending AS (
    SELECT up.id
    FROM public.user_profiles up
    WHERE up.approved = false
      AND COALESCE(up.status, '') = 'pendiente'
      AND COALESCE(up.created_at, NOW()) < NOW() - INTERVAL '7 days'
  )
  DELETE FROM auth.users u
  USING old_pending op
  WHERE u.id = op.id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'cleanup_pending_users_older_than_7_days: % usuarios borrados', v_deleted_count;
  RETURN v_deleted_count;
END;
$function$;

COMMENT ON FUNCTION public.cleanup_pending_users_older_than_7_days() IS
  'Borra usuarios con approved=false + status=pendiente + created_at >7d. Idempotente. Invocada por pg_cron diario.';


-- 5. Extensión pg_cron + job diario a las 03:00 UTC (05:00 hora española en verano)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Limpiar job previo si existe (idempotencia)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup_pending_users_daily') THEN
    PERFORM cron.unschedule('cleanup_pending_users_daily');
  END IF;
END;
$$;

SELECT cron.schedule(
  'cleanup_pending_users_daily',
  '0 3 * * *',  -- 03:00 UTC todos los días
  $$ SELECT public.cleanup_pending_users_older_than_7_days(); $$
);


-- =============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN (ejecutar manualmente para confirmar)
-- =============================================================================
-- SELECT proname FROM pg_proc WHERE proname IN ('handle_new_user','is_approved','admin_reject_user','cleanup_pending_users_older_than_7_days');
-- SELECT * FROM cron.job WHERE jobname = 'cleanup_pending_users_daily';

-- =============================================================================
-- ROLLBACK (descomentar si hace falta revertir)
-- =============================================================================
-- SELECT cron.unschedule('cleanup_pending_users_daily');
-- DROP FUNCTION IF EXISTS public.cleanup_pending_users_older_than_7_days();
-- DROP FUNCTION IF EXISTS public.admin_reject_user(uuid);
-- DROP FUNCTION IF EXISTS public.is_approved();
-- -- handle_new_user: restaurar versión previa que solo metía full_name (sin
-- -- nombre/apellidos). Ver pg_proc histórico antes de aplicar esta migration.
