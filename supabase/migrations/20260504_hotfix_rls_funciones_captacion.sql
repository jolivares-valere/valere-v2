-- Hotfix RLS — desbloquea operativa Captación (aplicado en BD prod via MCP 2026-05-04 tarde)
--
-- Origen: P0 detectado durante Test 1 del smoke. La RPC crear_lead_captacion
-- devolvía 403 a Carolina Aroca porque era SECURITY INVOKER y las policies
-- INSERT de oportunidades/contactos/actividades solo aceptaban roles legacy
-- (admin/jefe_equipo/comercial). Carolina A es role='consultant' con
-- funciones=['telemarketing'] -> bloqueada por RLS al hacer los inserts internos.
--
-- 2 fixes:
-- A) crear_lead_captacion -> SECURITY DEFINER (su check interno user_has_funcion
--    asegura que solo telemarketing/admin la ejecuta).
-- B) Policies aditivas por funciones en las tablas que las mutaciones directas
--    del frontend tocan (useCambiarEtapa, useRegistrarActividad, useHacerHandoff).

-- =====================================================
-- A) RPC crear_lead_captacion -> SECURITY DEFINER
-- =====================================================
CREATE OR REPLACE FUNCTION public.crear_lead_captacion(
  p_empresa_nombre   text,
  p_empresa_nif      text DEFAULT NULL,
  p_empresa_telefono text DEFAULT NULL,
  p_empresa_email    text DEFAULT NULL,
  p_empresa_ciudad   text DEFAULT NULL,
  p_empresa_segmento text DEFAULT 'comercial',
  p_contacto_nombre   text DEFAULT NULL,
  p_contacto_cargo    text DEFAULT NULL,
  p_contacto_telefono text DEFAULT NULL,
  p_contacto_email    text DEFAULT NULL,
  p_origen text DEFAULT 'cold',
  p_notas  text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_funciones text[];
  v_empresa_id uuid;
  v_oportunidad_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT funciones INTO v_funciones FROM public.user_profiles WHERE id = v_user_id;

  IF v_funciones IS NULL OR NOT (
    'telemarketing' = ANY(v_funciones) OR 'admin' = ANY(v_funciones)
  ) THEN
    RAISE EXCEPTION 'Usuario sin función telemarketing/admin para crear leads de captación';
  END IF;

  IF p_empresa_nombre IS NULL OR length(trim(p_empresa_nombre)) = 0 THEN
    RAISE EXCEPTION 'Nombre de empresa obligatorio';
  END IF;

  INSERT INTO public.empresas (
    nombre, nif, telefono_principal, email_principal, ciudad, segmento,
    comercial_id, asesor_id, created_by
  ) VALUES (
    trim(p_empresa_nombre),
    NULLIF(trim(p_empresa_nif), ''),
    NULLIF(trim(p_empresa_telefono), ''),
    NULLIF(trim(p_empresa_email), ''),
    NULLIF(trim(p_empresa_ciudad), ''),
    p_empresa_segmento,
    v_user_id, v_user_id, v_user_id
  )
  RETURNING id INTO v_empresa_id;

  IF p_contacto_nombre IS NOT NULL OR p_contacto_telefono IS NOT NULL OR p_contacto_email IS NOT NULL THEN
    INSERT INTO public.contactos (
      empresa_id, nombre, cargo, telefono, email, es_decisor, created_by
    ) VALUES (
      v_empresa_id,
      COALESCE(NULLIF(trim(p_contacto_nombre), ''), '(sin nombre)'),
      NULLIF(trim(p_contacto_cargo), ''),
      NULLIF(trim(p_contacto_telefono), ''),
      NULLIF(trim(p_contacto_email), ''),
      false,
      v_user_id
    );
  END IF;

  INSERT INTO public.oportunidades (
    empresa_id, tipo, nombre, etapa, etapa_operativa,
    responsable_actual_id, comercial_id, created_by,
    decisor_identificado, notas
  ) VALUES (
    v_empresa_id,
    'nueva_venta',
    'Lead captación — ' || trim(p_empresa_nombre),
    'prospecto',
    'nuevo',
    v_user_id, v_user_id, v_user_id,
    false,
    'Origen: ' || COALESCE(p_origen, 'cold') || E'\n\n' || COALESCE(p_notas, '')
  )
  RETURNING id INTO v_oportunidad_id;

  RETURN v_oportunidad_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crear_lead_captacion(text,text,text,text,text,text,text,text,text,text,text,text) TO authenticated;

-- =====================================================
-- B) Policies aditivas por funciones operativas
-- =====================================================
-- Coexisten con las originales (OR semantics).

-- oportunidades
DROP POLICY IF EXISTS oportunidades_insert_funciones ON public.oportunidades;
CREATE POLICY oportunidades_insert_funciones ON public.oportunidades
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_funcion('telemarketing')
    OR public.user_has_funcion('analista')
    OR public.user_has_funcion('asesor_senior')
    OR public.user_has_funcion('admin')
  );

DROP POLICY IF EXISTS oportunidades_update_funciones ON public.oportunidades;
CREATE POLICY oportunidades_update_funciones ON public.oportunidades
  FOR UPDATE TO authenticated
  USING (
    public.user_has_funcion('telemarketing')
    OR public.user_has_funcion('analista')
    OR public.user_has_funcion('asesor_senior')
    OR public.user_has_funcion('admin')
  );

DROP POLICY IF EXISTS oportunidades_select_funciones ON public.oportunidades;
CREATE POLICY oportunidades_select_funciones ON public.oportunidades
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      public.user_has_funcion('telemarketing')
      OR public.user_has_funcion('analista')
      OR public.user_has_funcion('asesor_senior')
      OR public.user_has_funcion('admin')
    )
  );

-- contactos
DROP POLICY IF EXISTS contactos_insert_funciones ON public.contactos;
CREATE POLICY contactos_insert_funciones ON public.contactos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_funcion('telemarketing')
    OR public.user_has_funcion('analista')
    OR public.user_has_funcion('asesor_senior')
    OR public.user_has_funcion('admin')
  );

DROP POLICY IF EXISTS contactos_select_funciones ON public.contactos;
CREATE POLICY contactos_select_funciones ON public.contactos
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      public.user_has_funcion('telemarketing')
      OR public.user_has_funcion('analista')
      OR public.user_has_funcion('asesor_senior')
      OR public.user_has_funcion('admin')
    )
  );

-- empresas (UPDATE; INSERT ya estaba cubierto por e_insert con created_by)
DROP POLICY IF EXISTS empresas_update_funciones ON public.empresas;
CREATE POLICY empresas_update_funciones ON public.empresas
  FOR UPDATE TO authenticated
  USING (
    public.user_has_funcion('telemarketing')
    OR public.user_has_funcion('analista')
    OR public.user_has_funcion('asesor_senior')
    OR public.user_has_funcion('admin')
  );

-- actividades
DROP POLICY IF EXISTS actividades_insert_funciones ON public.actividades;
CREATE POLICY actividades_insert_funciones ON public.actividades
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_funcion('telemarketing')
    OR public.user_has_funcion('analista')
    OR public.user_has_funcion('asesor_senior')
    OR public.user_has_funcion('admin')
  );

DROP POLICY IF EXISTS actividades_select_funciones ON public.actividades;
CREATE POLICY actividades_select_funciones ON public.actividades
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      public.user_has_funcion('telemarketing')
      OR public.user_has_funcion('analista')
      OR public.user_has_funcion('asesor_senior')
      OR public.user_has_funcion('admin')
    )
  );

-- oportunidad_handoffs
DROP POLICY IF EXISTS oportunidad_handoffs_insert_funciones ON public.oportunidad_handoffs;
CREATE POLICY oportunidad_handoffs_insert_funciones ON public.oportunidad_handoffs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_funcion('telemarketing')
    OR public.user_has_funcion('analista')
    OR public.user_has_funcion('asesor_senior')
    OR public.user_has_funcion('admin')
  );

DROP POLICY IF EXISTS oportunidad_handoffs_select_funciones ON public.oportunidad_handoffs;
CREATE POLICY oportunidad_handoffs_select_funciones ON public.oportunidad_handoffs
  FOR SELECT TO authenticated
  USING (
    public.user_has_funcion('telemarketing')
    OR public.user_has_funcion('analista')
    OR public.user_has_funcion('asesor_senior')
    OR public.user_has_funcion('admin')
  );
