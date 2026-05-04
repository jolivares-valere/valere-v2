-- Sprint Operativo Captación — Día 3 (aplicado en BD prod via MCP 2026-05-04)
-- Helper user_has_funcion + policies adicionales en bucket documentos y tabla documentos
-- para que usuarios con funcion telemarketing/analista/asesor_senior puedan operar.

CREATE OR REPLACE FUNCTION public.user_has_funcion(p_funcion text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
      AND p_funcion = ANY(funciones)
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_funcion(text) TO authenticated;

DROP POLICY IF EXISTS documentos_insert_funciones_captacion ON storage.objects;
CREATE POLICY documentos_insert_funciones_captacion ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documentos' AND (
      public.user_has_funcion('telemarketing')
      OR public.user_has_funcion('analista')
      OR public.user_has_funcion('asesor_senior')
      OR public.user_has_funcion('admin')
    )
  );

DROP POLICY IF EXISTS documentos_update_funciones_captacion ON storage.objects;
CREATE POLICY documentos_update_funciones_captacion ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documentos' AND (
      public.user_has_funcion('telemarketing')
      OR public.user_has_funcion('analista')
      OR public.user_has_funcion('asesor_senior')
      OR public.user_has_funcion('admin')
    )
  );

DROP POLICY IF EXISTS documentos_delete_funciones_admin ON storage.objects;
CREATE POLICY documentos_delete_funciones_admin ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documentos' AND public.user_has_funcion('admin')
  );

DROP POLICY IF EXISTS documentos_insert_funciones ON public.documentos;
CREATE POLICY documentos_insert_funciones ON public.documentos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_has_funcion('telemarketing')
    OR public.user_has_funcion('analista')
    OR public.user_has_funcion('asesor_senior')
    OR public.user_has_funcion('admin')
  );

DROP POLICY IF EXISTS documentos_update_funciones ON public.documentos;
CREATE POLICY documentos_update_funciones ON public.documentos
  FOR UPDATE
  TO authenticated
  USING (
    public.user_has_funcion('telemarketing')
    OR public.user_has_funcion('analista')
    OR public.user_has_funcion('asesor_senior')
    OR public.user_has_funcion('admin')
  );

DROP POLICY IF EXISTS documentos_select_funciones ON public.documentos;
CREATE POLICY documentos_select_funciones ON public.documentos
  FOR SELECT
  TO authenticated
  USING (
    public.user_has_funcion('telemarketing')
    OR public.user_has_funcion('analista')
    OR public.user_has_funcion('asesor_senior')
    OR public.user_has_funcion('admin')
  );
