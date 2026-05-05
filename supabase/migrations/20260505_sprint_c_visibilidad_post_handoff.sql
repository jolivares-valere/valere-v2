-- Sprint C — Visibilidad post-handoff
-- Aplicado en BD prod via MCP 2026-05-05
--
-- Origen: feedback uso real Carolina Aroca tras smoke test Herba Ricemills.
-- Carolina A creó el lead, lo movió a analista (Carolina M) y al hacer
-- handoff perdió la opción de hacer seguimiento del caso. Ese
-- comportamiento rompe la venta: el creador conoce el contexto comercial
-- y debe poder seguir aportando aunque ya no sea responsable.
--
-- Decisión: el handoff cambia RESPONSABILIDAD pero NO VISIBILIDAD ni
-- capacidad de comentar. Validado con ChatGPT 2026-05-05.

-- =====================================================
-- A) Recrear vista cross-bandeja con info del creador
-- =====================================================
-- Drop necesario: CREATE OR REPLACE no permite añadir/reordenar columnas.
DROP VIEW IF EXISTS public.v_captacion_todos_mis_casos;

CREATE VIEW public.v_captacion_todos_mis_casos
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
  o.created_by,
  up_creador.full_name AS creador_nombre,
  up_creador.funciones AS creador_funciones,
  o.factura_fecha_prevista,
  o.factura_recibida_at,
  o.factura_documento_id,
  o.propuesta_documento_id,
  o.propuesta_enviada_at,
  o.visita_programada_at,
  o.valor_estimado_eur,
  o.ahorro_anual_estimado,
  o.fecha_vencimiento_contrato_prospecto,
  o.fuente_vencimiento_contrato_prospecto,
  o.created_at,
  o.updated_at
FROM public.oportunidades o
JOIN public.empresas e ON e.id = o.empresa_id
LEFT JOIN public.user_profiles up_actual  ON up_actual.id  = o.responsable_actual_id
LEFT JOIN public.user_profiles up_creador ON up_creador.id = o.created_by
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
  'Vista cross-bandeja: casos donde fui responsable, creador o aparezco en handoffs. Expone responsable_actual_* y creador_* para que la UI distinga "soy responsable" vs "solo seguimiento".';

-- =====================================================
-- B) RPC agregar comentario interno
-- =====================================================
-- Inserta una actividad tipo 'nota' (ya existe en el CHECK constraint) sin
-- cambiar etapa. Permitido a responsable, creador, admin/senior, o quien
-- aparezca en handoffs.
CREATE OR REPLACE FUNCTION public.agregar_comentario_oportunidad(
  p_oportunidad_id uuid,
  p_texto          text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id      uuid := auth.uid();
  v_funciones    text[];
  v_responsable  uuid;
  v_creador      uuid;
  v_actividad_id uuid;
  v_es_parte     boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF p_texto IS NULL OR length(trim(p_texto)) = 0 THEN
    RAISE EXCEPTION 'El comentario no puede estar vacío';
  END IF;

  IF length(p_texto) > 4000 THEN
    RAISE EXCEPTION 'Comentario demasiado largo (máximo 4000 caracteres)';
  END IF;

  SELECT responsable_actual_id, created_by
    INTO v_responsable, v_creador
    FROM public.oportunidades
    WHERE id = p_oportunidad_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Oportunidad no encontrada';
  END IF;

  SELECT funciones INTO v_funciones FROM public.user_profiles WHERE id = v_user_id;

  v_es_parte := (
    v_responsable = v_user_id
    OR v_creador = v_user_id
    OR (v_funciones IS NOT NULL AND v_funciones && ARRAY['admin','asesor_senior']::text[])
    OR EXISTS (
      SELECT 1 FROM public.oportunidad_handoffs h
      WHERE h.oportunidad_id = p_oportunidad_id
        AND (h.from_user_id = v_user_id OR h.to_user_id = v_user_id)
    )
  );

  IF NOT v_es_parte THEN
    RAISE EXCEPTION 'Sin permisos para comentar en esta oportunidad';
  END IF;

  INSERT INTO public.actividades (
    tipo, titulo, descripcion, entidad_tipo, entidad_id, usuario_id, fecha_actividad
  ) VALUES (
    'nota',
    'Comentario interno',
    trim(p_texto),
    'oportunidad',
    p_oportunidad_id,
    v_user_id,
    now()
  )
  RETURNING id INTO v_actividad_id;

  -- Tocar updated_at de la oportunidad para que aparezca arriba en bandejas
  UPDATE public.oportunidades
    SET updated_at = now()
    WHERE id = p_oportunidad_id;

  RETURN v_actividad_id;
END;
$$;

REVOKE ALL ON FUNCTION public.agregar_comentario_oportunidad(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.agregar_comentario_oportunidad(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.agregar_comentario_oportunidad(uuid, text) IS
  'Sprint C 2026-05-05: añadir comentario interno (actividad tipo nota) a una oportunidad. Permitido a responsable, creador, admin/senior o usuario que aparezca en handoffs. NO cambia etapa.';
