-- =============================================================================
-- Migration: Flujo de aprobación de usuarios — columnas auditables + whitelist
-- Fecha:     2026-06-12
-- Sprint:    sprint-domingo-auth-selfsignup
-- Aplicada:  vía MCP Supabase apply_migration el 2026-06-12
--
-- OBJETIVO
--   Refuerza el flujo de signup público (CLAUDE.md sección "Auth & Signup",
--   migration 20260426_signup_aprobacion_manual.sql) añadiendo:
--
--   1. Columnas auditables `is_approved`, `approved_by`, `approved_at` en
--      `user_profiles`. La columna `approved` (boolean) queda como alias
--      legacy — los triggers de esta migration mantienen ambas sincronizadas
--      hasta que todo el frontend migre a `is_approved`.
--
--   2. CHECK constraint NOT VALID que rechaza emails fuera de la whitelist
--      de dominios corporativos (`valereconsultores.com`, `valere.com`) en
--      INSERTs y UPDATEs nuevos. NOT VALID evita romper las cuentas gmail
--      de testing existentes (juanolivarespena@gmail.com,
--      juanolivarespena+signup4@gmail.com).
--
--   3. Backfill: marca a TODOS los user_profiles existentes como
--      is_approved=true (lo están vía `approved`), approved_by=NULL (no
--      tenemos histórico), approved_at=created_at.
--
--   4. Trigger handle_new_user actualizado para escribir también
--      is_approved=true SOLO para el master.
--
-- NO incluye
--   - Endurecimiento de RLS (debe correrse después del backfill + corte
--     coordinado con Juan). Ver `supabase/migrations/_pending_rls_require_is_approved.sql`.
--
-- ROLLBACK
--   ALTER TABLE public.user_profiles
--     DROP COLUMN IF EXISTS is_approved,
--     DROP COLUMN IF EXISTS approved_by,
--     DROP COLUMN IF EXISTS approved_at;
--   ALTER TABLE public.user_profiles
--     DROP CONSTRAINT IF EXISTS user_profiles_email_domain_whitelist;
--   DROP TRIGGER IF EXISTS trg_user_profiles_sync_approved_columns ON public.user_profiles;
--   DROP FUNCTION IF EXISTS public.sync_user_profile_approved_columns();
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Columnas auditables
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

COMMENT ON COLUMN public.user_profiles.is_approved IS
  'Canónico: si la cuenta ha sido aprobada por un admin. Se mantiene sincronizado con la columna legacy `approved` vía trigger.';
COMMENT ON COLUMN public.user_profiles.approved_by IS
  'UUID del user_profiles.id que aprobó la cuenta (NULL = aprobación pre-flow o backfill).';
COMMENT ON COLUMN public.user_profiles.approved_at IS
  'Timestamp en que se aprobó la cuenta. NULL si pendiente.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Backfill: TODOS los perfiles existentes con approved=true pasan a
--    is_approved=true, approved_by=NULL, approved_at=created_at.
--    Los que tengan approved=false quedan en is_approved=false (pendientes).
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.user_profiles
SET
  is_approved = COALESCE(approved, false),
  approved_at = CASE WHEN COALESCE(approved, false) THEN COALESCE(created_at, NOW()) ELSE NULL END,
  approved_by = NULL
WHERE is_approved IS DISTINCT FROM COALESCE(approved, false);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Trigger de sincronización: mantiene `approved` ⇄ `is_approved` consistentes
--    durante la transición. Permite que el código nuevo escriba is_approved
--    y el legacy siga leyendo `approved`.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sync_user_profile_approved_columns()
  RETURNS trigger
  LANGUAGE plpgsql
AS $function$
BEGIN
  -- Si se escribe is_approved, propaga a approved (y viceversa).
  IF TG_OP = 'UPDATE' THEN
    -- Detecta cuál de los dos campos cambió y propaga al otro.
    IF NEW.is_approved IS DISTINCT FROM OLD.is_approved
       AND NEW.approved IS NOT DISTINCT FROM OLD.approved THEN
      NEW.approved := NEW.is_approved;
    ELSIF NEW.approved IS DISTINCT FROM OLD.approved
          AND NEW.is_approved IS NOT DISTINCT FROM OLD.is_approved THEN
      NEW.is_approved := COALESCE(NEW.approved, false);
    END IF;

    -- Si pasa a aprobado y approved_at está vacío, marca timestamp.
    IF COALESCE(NEW.is_approved, false) = true AND NEW.approved_at IS NULL THEN
      NEW.approved_at := NOW();
    END IF;
    -- Si pasa a NO aprobado, limpia approved_at/approved_by.
    IF COALESCE(NEW.is_approved, false) = false THEN
      NEW.approved_at := NULL;
      NEW.approved_by := NULL;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    -- Asegura que ambos campos estén alineados al insertar
    IF NEW.is_approved IS NULL THEN NEW.is_approved := COALESCE(NEW.approved, false); END IF;
    IF NEW.approved IS NULL THEN NEW.approved := NEW.is_approved; END IF;
    IF COALESCE(NEW.is_approved, false) = true AND NEW.approved_at IS NULL THEN
      NEW.approved_at := NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_user_profiles_sync_approved_columns ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_sync_approved_columns
  BEFORE INSERT OR UPDATE OF approved, is_approved, approved_at, approved_by
  ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_profile_approved_columns();

COMMENT ON FUNCTION public.sync_user_profile_approved_columns() IS
  'Mantiene en sincronía las columnas `approved` (legacy) e `is_approved` (canónica) en user_profiles. Marca approved_at automáticamente al aprobar.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CHECK constraint para whitelist de dominios. NOT VALID = solo aplica
--    a INSERTs/UPDATEs nuevos; las filas existentes NO se rechazan.
--    Si en el futuro se quieren admitir más dominios, hay que recrearlo
--    (ver docs/AUTH_SELF_SIGNUP_2026-06-12.md sección "Añadir dominios").
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_email_domain_whitelist;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_email_domain_whitelist
  CHECK (
    email IS NULL
    OR lower(split_part(email, '@', 2)) = ANY (ARRAY['valereconsultores.com','valere.com'])
  )
  NOT VALID;

COMMENT ON CONSTRAINT user_profiles_email_domain_whitelist
  ON public.user_profiles IS
  'Restringe emails nuevos a dominios corporativos Valere. NOT VALID = filas existentes no se validan (cuentas gmail de testing de Juan permanecen).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. handle_new_user actualizado para escribir is_approved + approved_at en
--    el master automáticamente.
-- ─────────────────────────────────────────────────────────────────────────────

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
  v_is_master := (NEW.email = 'jolivares@valereconsultores.com');

  v_nombre    := COALESCE(NEW.raw_user_meta_data->>'nombre', '');
  v_apellidos := COALESCE(NEW.raw_user_meta_data->>'apellidos', '');

  v_full_name := NULLIF(TRIM(v_nombre || ' ' || v_apellidos), '');
  IF v_full_name IS NULL THEN
    v_full_name := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    );
  END IF;

  INSERT INTO public.user_profiles (
    id, email, full_name, nombre, apellidos, role, status,
    approved, is_approved, approved_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    NULLIF(v_nombre, ''),
    NULLIF(v_apellidos, ''),
    CASE WHEN v_is_master THEN 'master' ELSE 'client' END,
    CASE WHEN v_is_master THEN 'active' ELSE 'pendiente' END,
    v_is_master,
    v_is_master,
    CASE WHEN v_is_master THEN NOW() ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Crea fila en user_profiles tras INSERT en auth.users. Captura nombre/apellidos del metadata. Master = aprobado (is_approved=true), resto = pendiente.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. is_approved() helper actualizado para leer la columna canónica nueva
--    (sigue cayendo en `approved` como fallback si is_approved estuviera
--    en NULL en algún caso edge).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_approved()
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT is_approved FROM public.user_profiles WHERE id = auth.uid()),
    (SELECT approved FROM public.user_profiles WHERE id = auth.uid()),
    false
  )
$function$;

COMMENT ON FUNCTION public.is_approved() IS
  'Devuelve true si el usuario actual (auth.uid()) tiene is_approved=true (con fallback a approved legacy).';

COMMIT;

-- =============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- =============================================================================
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='user_profiles'
--   AND column_name IN ('approved','is_approved','approved_by','approved_at');
--
-- SELECT email, approved, is_approved, approved_at FROM public.user_profiles ORDER BY created_at;
--
-- SELECT conname, contype, convalidated
-- FROM pg_constraint
-- WHERE conrelid = 'public.user_profiles'::regclass
--   AND conname = 'user_profiles_email_domain_whitelist';
