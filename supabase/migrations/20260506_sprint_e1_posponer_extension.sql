-- Sprint E1 — Posponer llamada + extensión contacto + próxima acción
-- Aplicado en BD prod via MCP 2026-05-06.
--
-- Origen: feedback real Carolina:
--   - "está de vacaciones, llamar el lunes 11 mayo" → posponer llamada.
--   - "Patricia Cano + extensión" → soporte ext en contactos.
--   - matiz Juan: ver próxima llamada en card sin abrir drawer.
--
-- Cambios aditivos sin breaking.

-- ============================================================
-- 1) Resultado 'pospuesto' en actividades
-- ============================================================
ALTER TABLE public.actividades
  DROP CONSTRAINT IF EXISTS actividades_resultado_check,
  ADD CONSTRAINT actividades_resultado_check
    CHECK (resultado IS NULL OR resultado IN (
      'positivo','neutral','negativo','sin_respuesta','pospuesto'
    ));

-- ============================================================
-- 2) Extensión telefónica en contactos
-- ============================================================
ALTER TABLE public.contactos
  ADD COLUMN IF NOT EXISTS extension text;

COMMENT ON COLUMN public.contactos.extension IS
  'Sprint E1 2026-05-05: extensión telefónica del contacto. UI: "957 767 700 · Ext. 123".';

-- ============================================================
-- 3) Próxima acción en oportunidades
-- ============================================================
ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS siguiente_accion text,
  ADD COLUMN IF NOT EXISTS fecha_siguiente_accion timestamptz;

COMMENT ON COLUMN public.oportunidades.siguiente_accion IS
  'Sprint E1 2026-05-05: descripción libre de la próxima acción. Base para futura pestaña "Hoy".';

COMMENT ON COLUMN public.oportunidades.fecha_siguiente_accion IS
  'Sprint E1 2026-05-05: fecha+hora de la próxima acción. Base para futura agenda interna y Google Calendar.';

-- ============================================================
-- 4) Recrear vistas con los nuevos campos
-- ============================================================

DROP VIEW IF EXISTS public.v_mis_oportunidades;
CREATE VIEW public.v_mis_oportunidades
  WITH (security_invoker = true) AS
SELECT
  o.id, o.empresa_id,
  e.nombre AS empresa_nombre, e.nif AS empresa_nif,
  o.tipo, o.etapa, o.etapa_operativa, o.decisor_identificado,
  o.responsable_actual_id,
  o.factura_fecha_prevista, o.factura_recibida_at, o.factura_documento_id,
  o.propuesta_documento_id, o.propuesta_enviada_at, o.visita_programada_at,
  o.valor_estimado_eur, o.ahorro_anual_estimado,
  o.fecha_vencimiento_contrato_prospecto, o.fuente_vencimiento_contrato_prospecto,
  o.siguiente_accion, o.fecha_siguiente_accion,
  o.created_at, o.updated_at
FROM public.oportunidades o
JOIN public.empresas e ON e.id = o.empresa_id
WHERE o.deleted_at IS NULL AND o.responsable_actual_id = auth.uid();
GRANT SELECT ON public.v_mis_oportunidades TO authenticated;

DROP VIEW IF EXISTS public.v_captacion_todos_mis_casos;
CREATE VIEW public.v_captacion_todos_mis_casos
  WITH (security_invoker = true) AS
SELECT DISTINCT ON (o.id)
  o.id, o.empresa_id,
  e.nombre AS empresa_nombre, e.nif AS empresa_nif,
  o.tipo, o.etapa, o.etapa_operativa, o.decisor_identificado,
  o.responsable_actual_id,
  up_actual.full_name AS responsable_actual_nombre,
  up_actual.funciones AS responsable_actual_funciones,
  o.created_by,
  up_creador.full_name AS creador_nombre,
  up_creador.funciones AS creador_funciones,
  o.factura_fecha_prevista, o.factura_recibida_at, o.factura_documento_id,
  o.propuesta_documento_id, o.propuesta_enviada_at, o.visita_programada_at,
  o.valor_estimado_eur, o.ahorro_anual_estimado,
  o.fecha_vencimiento_contrato_prospecto, o.fuente_vencimiento_contrato_prospecto,
  o.siguiente_accion, o.fecha_siguiente_accion,
  o.created_at, o.updated_at
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

-- ============================================================
-- 5) RPC posponer_llamada
-- ============================================================
CREATE OR REPLACE FUNCTION public.posponer_llamada(
  p_oportunidad_id    uuid,
  p_motivo            text,
  p_fecha_proxima     timestamptz,
  p_notas             text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_funciones  text[];
  v_responsable uuid;
  v_creador    uuid;
  v_actividad_id uuid;
  v_descripcion text;
  v_motivo_legible text;
  v_fecha_legible text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) = 0 THEN
    RAISE EXCEPTION 'Motivo obligatorio';
  END IF;
  IF p_motivo NOT IN ('vacaciones','llamar_mas_tarde','no_disponible','otro') THEN
    RAISE EXCEPTION 'Motivo inválido';
  END IF;
  IF p_fecha_proxima IS NULL THEN
    RAISE EXCEPTION 'Fecha próxima llamada obligatoria';
  END IF;
  IF p_fecha_proxima < (now() - interval '1 hour') THEN
    RAISE EXCEPTION 'La fecha de próxima llamada no puede estar en el pasado';
  END IF;

  SELECT responsable_actual_id, created_by
    INTO v_responsable, v_creador
    FROM public.oportunidades
    WHERE id = p_oportunidad_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Oportunidad no encontrada';
  END IF;

  SELECT funciones INTO v_funciones FROM public.user_profiles WHERE id = v_user_id;

  IF NOT (
    v_responsable = v_user_id
    OR v_creador = v_user_id
    OR (v_funciones IS NOT NULL AND v_funciones && ARRAY['admin','asesor_senior']::text[])
    OR EXISTS (
      SELECT 1 FROM public.oportunidad_handoffs h
      WHERE h.oportunidad_id = p_oportunidad_id
        AND (h.from_user_id = v_user_id OR h.to_user_id = v_user_id)
    )
  ) THEN
    RAISE EXCEPTION 'Sin permisos para posponer esta oportunidad';
  END IF;

  v_motivo_legible := CASE p_motivo
    WHEN 'vacaciones' THEN 'cliente de vacaciones'
    WHEN 'llamar_mas_tarde' THEN 'cliente pidió volver a llamar'
    WHEN 'no_disponible' THEN 'no disponible ahora'
    ELSE 'otro motivo'
  END;
  v_fecha_legible := to_char(p_fecha_proxima AT TIME ZONE 'Europe/Madrid', 'DD/MM/YYYY HH24:MI');

  v_descripcion := 'Llamada pospuesta — ' || v_motivo_legible
    || E'\nVolver a llamar: ' || v_fecha_legible
    || CASE WHEN p_notas IS NOT NULL AND length(trim(p_notas)) > 0
            THEN E'\n' || trim(p_notas) ELSE '' END;

  INSERT INTO public.actividades (
    tipo, titulo, descripcion, resultado,
    entidad_tipo, entidad_id, usuario_id, fecha_actividad
  ) VALUES (
    'llamada','Llamada pospuesta',v_descripcion,'pospuesto',
    'oportunidad',p_oportunidad_id,v_user_id,now()
  )
  RETURNING id INTO v_actividad_id;

  UPDATE public.oportunidades
  SET siguiente_accion = 'Llamar el ' || v_fecha_legible,
      fecha_siguiente_accion = p_fecha_proxima,
      updated_at = now()
  WHERE id = p_oportunidad_id;

  RETURN v_actividad_id;
END;
$$;

REVOKE ALL ON FUNCTION public.posponer_llamada(uuid, text, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.posponer_llamada(uuid, text, timestamptz, text) TO authenticated;

COMMENT ON FUNCTION public.posponer_llamada(uuid, text, timestamptz, text) IS
  'Sprint E1 2026-05-05: posponer llamada con motivo + fecha. Crea actividad llamada/pospuesto y actualiza siguiente_accion.';

-- ============================================================
-- 6) RPCs crear_lead_captacion / actualizar_lead_captacion
--    aceptan ahora "extension" en el jsonb de contactos (lectura tolerante:
--    si el campo no viene, NULLIF lo deja en NULL).
-- ============================================================
-- (Las definiciones completas están en BD; este mirror documenta la diferencia.
--  En el INSERT/UPDATE de contactos se añadió la columna `extension`:
--  INSERT ... (..., telefono, extension, email, ...)
--          VALUES (..., NULLIF(trim(v_contacto->>'telefono'),''),
--                       NULLIF(trim(v_contacto->>'extension'),''), ... )
--  Ver migration ejecutada via MCP 2026-05-06.)
