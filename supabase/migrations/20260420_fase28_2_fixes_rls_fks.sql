-- =====================================================================
-- FASE 28.2 — Fixes post-prueba FASE 28
-- =====================================================================
--
-- Soluciona 3 bugs detectados en el test end-to-end:
--
-- BUG 1: custom_fields_schema / custom_fields_values → INSERT devuelve error
--        Causa: RLS habilitada pero sin policies de INSERT/UPDATE/DELETE
--        para el rol `authenticated`.
--
-- BUG 3 + BUG 4: POST/GET a empresas/contratos/etc. falla con
--        "relation users_profile does not exist".
--        Causa: Los FK constraints originales (creados en 001_crm_core.sql)
--        apuntan a `users_profile` (singular, legacy). Esa tabla ya no
--        existe (FASE 20.7.a), así que los JOINs PostgREST que usan
--        `!empresas_comercial_id_fkey` (etc.) fallan.
--        Fix: Recrear los constraints apuntando a `user_profiles` (plural).
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → pegar → Run.
-- Idempotente: se puede ejecutar varias veces sin romper nada.
-- =====================================================================

-- =====================================================================
-- PARTE 1 — RLS policies para custom_fields_schema y custom_fields_values
-- =====================================================================

-- custom_fields_schema
ALTER TABLE public.custom_fields_schema ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cfs_select_authenticated" ON public.custom_fields_schema;
DROP POLICY IF EXISTS "cfs_insert_authenticated" ON public.custom_fields_schema;
DROP POLICY IF EXISTS "cfs_update_authenticated" ON public.custom_fields_schema;
DROP POLICY IF EXISTS "cfs_delete_authenticated" ON public.custom_fields_schema;

CREATE POLICY "cfs_select_authenticated" ON public.custom_fields_schema
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "cfs_insert_authenticated" ON public.custom_fields_schema
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cfs_update_authenticated" ON public.custom_fields_schema
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cfs_delete_authenticated" ON public.custom_fields_schema
  FOR DELETE TO authenticated USING (true);

-- custom_fields_values
ALTER TABLE public.custom_fields_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cfv_select_authenticated" ON public.custom_fields_values;
DROP POLICY IF EXISTS "cfv_insert_authenticated" ON public.custom_fields_values;
DROP POLICY IF EXISTS "cfv_update_authenticated" ON public.custom_fields_values;
DROP POLICY IF EXISTS "cfv_delete_authenticated" ON public.custom_fields_values;

CREATE POLICY "cfv_select_authenticated" ON public.custom_fields_values
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "cfv_insert_authenticated" ON public.custom_fields_values
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cfv_update_authenticated" ON public.custom_fields_values
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cfv_delete_authenticated" ON public.custom_fields_values
  FOR DELETE TO authenticated USING (true);

-- Índice único para que upsert(onConflict: 'schema_id,entidad_id') funcione
CREATE UNIQUE INDEX IF NOT EXISTS ux_custom_fields_values_schema_entidad
  ON public.custom_fields_values (schema_id, entidad_id);

-- =====================================================================
-- PARTE 2 — Recrear FK constraints hacia user_profiles
-- =====================================================================
-- Si un constraint apunta a `users_profile` (tabla inexistente) o no existe,
-- se dropea y recrea apuntando a `user_profiles`. Los nombres coinciden con
-- los que espera el código frontend en los JOINs PostgREST.

-- empresas.comercial_id
ALTER TABLE public.empresas DROP CONSTRAINT IF EXISTS empresas_comercial_id_fkey;
ALTER TABLE public.empresas
  ADD CONSTRAINT empresas_comercial_id_fkey
  FOREIGN KEY (comercial_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- contratos.comercial_id
ALTER TABLE public.contratos DROP CONSTRAINT IF EXISTS contratos_comercial_id_fkey;
ALTER TABLE public.contratos
  ADD CONSTRAINT contratos_comercial_id_fkey
  FOREIGN KEY (comercial_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- oportunidades.comercial_id
ALTER TABLE public.oportunidades DROP CONSTRAINT IF EXISTS oportunidades_comercial_id_fkey;
ALTER TABLE public.oportunidades
  ADD CONSTRAINT oportunidades_comercial_id_fkey
  FOREIGN KEY (comercial_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- actividades.usuario_id y actividades.asignado_a
ALTER TABLE public.actividades DROP CONSTRAINT IF EXISTS actividades_usuario_id_fkey;
ALTER TABLE public.actividades
  ADD CONSTRAINT actividades_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.actividades DROP CONSTRAINT IF EXISTS actividades_asignado_a_fkey;
ALTER TABLE public.actividades
  ADD CONSTRAINT actividades_asignado_a_fkey
  FOREIGN KEY (asignado_a) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- incidencias.asignado_a
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='incidencias') THEN
    EXECUTE 'ALTER TABLE public.incidencias DROP CONSTRAINT IF EXISTS incidencias_asignado_a_fkey';
    EXECUTE 'ALTER TABLE public.incidencias ADD CONSTRAINT incidencias_asignado_a_fkey FOREIGN KEY (asignado_a) REFERENCES public.user_profiles(id) ON DELETE SET NULL';
  END IF;
END $$;

-- renovaciones.asignado_a
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='renovaciones') THEN
    EXECUTE 'ALTER TABLE public.renovaciones DROP CONSTRAINT IF EXISTS renovaciones_asignado_a_fkey';
    EXECUTE 'ALTER TABLE public.renovaciones ADD CONSTRAINT renovaciones_asignado_a_fkey FOREIGN KEY (asignado_a) REFERENCES public.user_profiles(id) ON DELETE SET NULL';
  END IF;
END $$;

-- eventos.asignado_a
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='eventos') THEN
    EXECUTE 'ALTER TABLE public.eventos DROP CONSTRAINT IF EXISTS eventos_asignado_a_fkey';
    EXECUTE 'ALTER TABLE public.eventos ADD CONSTRAINT eventos_asignado_a_fkey FOREIGN KEY (asignado_a) REFERENCES public.user_profiles(id) ON DELETE SET NULL';
  END IF;
END $$;

-- documentos.subido_por
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='documentos') THEN
    EXECUTE 'ALTER TABLE public.documentos DROP CONSTRAINT IF EXISTS documentos_subido_por_fkey';
    EXECUTE 'ALTER TABLE public.documentos ADD CONSTRAINT documentos_subido_por_fkey FOREIGN KEY (subido_por) REFERENCES public.user_profiles(id) ON DELETE SET NULL';
  END IF;
END $$;

-- =====================================================================
-- PARTE 3 — get_user_rol() mapea master/manager → admin (aplicado por Cowork)
-- =====================================================================
-- Razón: ~20 policies existentes usan `get_user_rol() = ANY (ARRAY['admin', ...])`.
-- Ninguna incluía 'master' ni 'manager'. En vez de parchear las 20 una a una,
-- hacemos que master/manager hereden los permisos de admin en la función base.
-- Cualquier policy nueva que use get_user_rol() también se beneficia.

CREATE OR REPLACE FUNCTION public.get_user_rol() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT CASE
    WHEN (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('master', 'manager') THEN 'admin'
    ELSE (SELECT role FROM public.user_profiles WHERE id = auth.uid())
  END;
$$;

-- =====================================================================
-- Forzar reload del schema cache de PostgREST (para que vea los nuevos FK)
-- =====================================================================
NOTIFY pgrst, 'reload schema';
