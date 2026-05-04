-- Sprint Operativo Captación — Día 1 (aplicado en BD prod via MCP 2026-05-04)
-- Migración aditiva: factura_fecha_prevista + RPC crear_lead_captacion + vista cross-bandeja
--
-- Origen: feedback Juan 2026-05-04 — bandejas captación son solo lectura, falta operativa.
-- Plan completo: docs/SPRINT_OPERATIVO_CAPTACION_2026-05-04.md

-- 1. Fecha prevista de factura (cliente promete enviar)
ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS factura_fecha_prevista timestamptz NULL;

COMMENT ON COLUMN public.oportunidades.factura_fecha_prevista IS
  'Fecha en que el cliente prometió enviar factura. Comparar con factura_recibida_at para medir tiempo de cumplimiento.';

-- 2. Vista cross-bandeja para Captación: casos donde Carolina A fue parte alguna vez
CREATE OR REPLACE VIEW public.v_captacion_todos_mis_casos
  WITH (security_invoker = true) AS
SELECT DISTINCT ON (o.id)
  o.id,
  o.empresa_id,
  e.nombre AS empresa_nombre,
  e.nif AS empresa_nif,
  o.tipo,
  o.etapa,
  o.etapa_operativa,
  o.decisor_identificado,
  o.responsable_actual_id,
  up_actual.full_name AS responsable_actual_nombre,
  up_actual.funciones AS responsable_actual_funciones,
  o.factura_fecha_prevista,
  o.factura_recibida_at,
  o.factura_documento_id,
  o.propuesta_documento_id,
  o.propuesta_enviada_at,
  o.visita_programada_at,
  o.valor_estimado_eur,
  o.ahorro_anual_estimado,
  o.created_at,
  o.updated_at
FROM public.oportunidades o
JOIN public.empresas e ON e.id = o.empresa_id
LEFT JOIN public.user_profiles up_actual ON up_actual.id = o.responsable_actual_id
WHERE o.deleted_at IS NULL
  AND (
    o.responsable_actual_id = auth.uid()
    OR o.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.oportunidad_handoffs h
      WHERE h.oportunidad_id = o.id
        AND (h.from_user_id = auth.uid() OR h.to_user_id = auth.uid())
    )
  )
ORDER BY o.id, o.updated_at DESC;

GRANT SELECT ON public.v_captacion_todos_mis_casos TO authenticated;

COMMENT ON VIEW public.v_captacion_todos_mis_casos IS
  'Vista para Carolina Aroca (telemarketing): todos los casos donde fue/es responsable, creadora o aparece en handoffs. Permite seguir el hilo aunque haya hecho handoff a analista/senior.';

-- 3. RPC crear lead desde Captación (transacción atómica empresa + contacto + oportunidad + actividad)
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
SECURITY INVOKER
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

COMMENT ON FUNCTION public.crear_lead_captacion(text,text,text,text,text,text,text,text,text,text,text,text) IS
  'RPC para Carolina Aroca: crea empresa + contacto + oportunidad en una transacción atómica desde el modal "+ Nuevo lead" de Captación. Valida función telemarketing/admin.';

GRANT EXECUTE ON FUNCTION public.crear_lead_captacion(text,text,text,text,text,text,text,text,text,text,text,text) TO authenticated;
