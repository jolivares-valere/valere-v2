-- RPC actualizar_lead_captacion (aplicado en BD prod via MCP 2026-05-04)
-- Permite editar lead desde el drawer de Captación tras feedback Carolina A.
-- SECURITY DEFINER + check funciones operativas + check ownership.

CREATE OR REPLACE FUNCTION public.actualizar_lead_captacion(
  p_oportunidad_id    uuid,
  p_empresa_nombre    text,
  p_empresa_nif       text DEFAULT NULL,
  p_empresa_telefono  text DEFAULT NULL,
  p_empresa_email     text DEFAULT NULL,
  p_empresa_ciudad    text DEFAULT NULL,
  p_empresa_segmento  text DEFAULT NULL,
  p_contacto_nombre   text DEFAULT NULL,
  p_contacto_cargo    text DEFAULT NULL,
  p_contacto_telefono text DEFAULT NULL,
  p_contacto_email    text DEFAULT NULL,
  p_notas             text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_funciones text[];
  v_empresa_id uuid;
  v_contacto_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT funciones INTO v_funciones FROM public.user_profiles WHERE id = v_user_id;

  IF v_funciones IS NULL OR NOT (
    'telemarketing' = ANY(v_funciones)
    OR 'analista' = ANY(v_funciones)
    OR 'asesor_senior' = ANY(v_funciones)
    OR 'admin' = ANY(v_funciones)
  ) THEN
    RAISE EXCEPTION 'Usuario sin función operativa para editar leads';
  END IF;

  IF p_empresa_nombre IS NULL OR length(trim(p_empresa_nombre)) = 0 THEN
    RAISE EXCEPTION 'Nombre de empresa obligatorio';
  END IF;

  SELECT empresa_id INTO v_empresa_id
  FROM public.oportunidades
  WHERE id = p_oportunidad_id AND deleted_at IS NULL;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Oportunidad no encontrada o eliminada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.oportunidades
    WHERE id = p_oportunidad_id
      AND (
        responsable_actual_id = v_user_id
        OR created_by = v_user_id
        OR 'admin' = ANY(v_funciones)
      )
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para editar este caso';
  END IF;

  -- 1) Actualizar empresa
  UPDATE public.empresas
  SET
    nombre = trim(p_empresa_nombre),
    nif = NULLIF(trim(COALESCE(p_empresa_nif, '')), ''),
    telefono_principal = NULLIF(trim(COALESCE(p_empresa_telefono, '')), ''),
    email_principal = NULLIF(trim(COALESCE(p_empresa_email, '')), ''),
    ciudad = NULLIF(trim(COALESCE(p_empresa_ciudad, '')), ''),
    segmento = COALESCE(p_empresa_segmento, segmento),
    updated_at = NOW(),
    updated_by = v_user_id
  WHERE id = v_empresa_id;

  -- 2) Actualizar o crear contacto principal
  SELECT id INTO v_contacto_id
  FROM public.contactos
  WHERE empresa_id = v_empresa_id AND deleted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_contacto_id IS NOT NULL THEN
    IF p_contacto_nombre IS NOT NULL OR p_contacto_telefono IS NOT NULL
       OR p_contacto_email IS NOT NULL OR p_contacto_cargo IS NOT NULL THEN
      UPDATE public.contactos
      SET
        nombre = COALESCE(NULLIF(trim(COALESCE(p_contacto_nombre, '')), ''), nombre),
        cargo = NULLIF(trim(COALESCE(p_contacto_cargo, '')), ''),
        telefono = NULLIF(trim(COALESCE(p_contacto_telefono, '')), ''),
        email = NULLIF(trim(COALESCE(p_contacto_email, '')), ''),
        updated_at = NOW()
      WHERE id = v_contacto_id;
    END IF;
  ELSIF p_contacto_nombre IS NOT NULL OR p_contacto_telefono IS NOT NULL
        OR p_contacto_email IS NOT NULL THEN
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
    )
    RETURNING id INTO v_contacto_id;
  END IF;

  -- 3) Actualizar notas
  IF p_notas IS NOT NULL THEN
    UPDATE public.oportunidades
    SET notas = p_notas, updated_at = NOW()
    WHERE id = p_oportunidad_id;
  END IF;

  RETURN jsonb_build_object(
    'oportunidad_id', p_oportunidad_id,
    'empresa_id', v_empresa_id,
    'contacto_id', v_contacto_id,
    'updated_at', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.actualizar_lead_captacion(uuid,text,text,text,text,text,text,text,text,text,text,text) TO authenticated;
