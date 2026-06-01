-- Sprint Vista Tabla Captación (Hallazgos #2 + #3 de Carolina 2026-05-19)
--
-- Origen: revisión con Carolina Aroca 2026-05-19. Hallazgos:
--   #2 — Buscador inline + pestaña "Enviados" con sub-chips Análisis/Senior + recordatorios CRM+email.
--   #3 — Vista tabla con edición inline (propagable), "Mis llamadas" (log cronológico), export Excel.
--
-- Decisiones firmadas Juan 2026-05-19:
--   - propuesta_enviada vuelve a "Por llamar" (texto = "Llamar para seguimiento — propuesta enviada hace Xd").
--   - Una pestaña "Enviados" + sub-chips (Análisis / Senior). Drawer cliente con historial unificado.
--   - Recordatorio = notificación CRM + email vía Resend.
--   - SLA: 3d amarillo / 5d rojo en pestaña Enviados.
--
-- Esta migration NO toca tablas core. Solo añade:
--   1. Vista v_captacion_historico_completo (tabla full filtrable).
--   2. Vista v_captacion_enviados_en_seguimiento (pestaña Enviados con SLA).
--   3. Vista v_mis_llamadas (log cronológico actividades tipo llamada).
--   4. RPC editar_campo_oportunidad (whitelist campos inline).
--   5. RPC editar_campo_empresa (whitelist campos inline con cascade).
--   6. RPC recordar_a_responsable (crea actividad + notificación + dispara email).
--
-- IDEMPOTENTE: usa DROP IF EXISTS + CREATE OR REPLACE.

-- ============================================================
-- 1) VIEW v_captacion_historico_completo
-- ============================================================
-- Tabla full para la pestaña "Histórico" con vista Tabla.
-- Incluye TODAS las oportunidades donde el user fue parte alguna vez
-- (responsable actual, creador, o aparece en handoff) — sin filtro de etapa.
-- Campos derivados: dias_vencimiento, dias_sin_movimiento, dias_desde_envio.

DROP VIEW IF EXISTS public.v_captacion_historico_completo;

CREATE VIEW public.v_captacion_historico_completo
  WITH (security_invoker = true) AS
SELECT DISTINCT ON (o.id)
  o.id,
  o.empresa_id,
  e.nombre AS empresa_nombre,
  e.nif AS empresa_nif,
  e.telefono_principal AS empresa_telefono,
  e.email_principal AS empresa_email,
  e.ciudad AS empresa_ciudad,
  e.segmento AS empresa_segmento,
  e.estado_relacion AS empresa_estado_relacion,
  o.tipo,
  o.etapa,
  o.etapa_operativa,
  o.contexto,
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
  o.siguiente_accion,
  o.fecha_siguiente_accion,
  e.origen_relacion AS origen,
  o.motivo_perdida,
  o.motivo_perdida_codigo,
  o.motivo_perdida_detalle,
  o.notas,
  o.created_at,
  o.updated_at,
  -- Días hasta vencimiento contrato actual (negativo = vencido). NULL si sin fecha.
  CASE
    WHEN o.fecha_vencimiento_contrato_prospecto IS NULL THEN NULL
    ELSE (o.fecha_vencimiento_contrato_prospecto::date - CURRENT_DATE)
  END AS dias_vencimiento,
  -- Días desde la última modificación (actividad o cambio de campo).
  EXTRACT(DAY FROM (now() - o.updated_at))::int AS dias_sin_movimiento
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

GRANT SELECT ON public.v_captacion_historico_completo TO authenticated;

COMMENT ON VIEW public.v_captacion_historico_completo IS
  'Sprint 2026-05-19: vista full para tab Histórico (modo tabla). Todas las oportunidades donde el user fue parte alguna vez, con campos derivados de SLA y vencimiento. Sin filtro de etapa.';

-- ============================================================
-- 2) VIEW v_captacion_enviados_en_seguimiento
-- ============================================================
-- Pestaña "Enviados" con sub-chips Análisis/Senior + SLA visual.
-- Filtro: el user creó el lead, ya no es responsable, sigue vivo.

DROP VIEW IF EXISTS public.v_captacion_enviados_en_seguimiento;

CREATE VIEW public.v_captacion_enviados_en_seguimiento
  WITH (security_invoker = true) AS
WITH ultimo_handoff AS (
  SELECT DISTINCT ON (h.oportunidad_id)
    h.oportunidad_id,
    h.created_at AS ultimo_handoff_at,
    h.to_user_id AS ultimo_handoff_to,
    h.motivo AS ultimo_handoff_motivo
  FROM public.oportunidad_handoffs h
  ORDER BY h.oportunidad_id, h.created_at DESC
)
SELECT
  o.id,
  o.empresa_id,
  e.nombre AS empresa_nombre,
  e.nif AS empresa_nif,
  e.telefono_principal AS empresa_telefono,
  o.tipo,
  o.etapa,
  o.etapa_operativa,
  o.responsable_actual_id,
  up_actual.full_name AS responsable_actual_nombre,
  up_actual.funciones AS responsable_actual_funciones,
  -- Tipo de destinatario (para sub-chip "Análisis" vs "Senior")
  CASE
    WHEN up_actual.funciones && ARRAY['asesor_senior','admin']::text[] THEN 'senior'
    WHEN up_actual.funciones && ARRAY['analista']::text[] THEN 'analista'
    ELSE 'otro'
  END AS tipo_destinatario,
  uh.ultimo_handoff_at,
  uh.ultimo_handoff_motivo,
  -- Días desde el envío (último handoff) — base del SLA visual
  EXTRACT(DAY FROM (now() - uh.ultimo_handoff_at))::int AS dias_desde_envio,
  -- Días desde la última actividad — diferente de "días desde envío"
  EXTRACT(DAY FROM (now() - o.updated_at))::int AS dias_sin_movimiento,
  -- Color SLA — 3d amarillo / 5d rojo (decisión Juan 2026-05-19)
  CASE
    WHEN EXTRACT(DAY FROM (now() - o.updated_at))::int >= 5 THEN 'rojo'
    WHEN EXTRACT(DAY FROM (now() - o.updated_at))::int >= 3 THEN 'amarillo'
    ELSE 'verde'
  END AS sla_color,
  o.valor_estimado_eur,
  o.fecha_vencimiento_contrato_prospecto,
  o.siguiente_accion,
  o.fecha_siguiente_accion,
  o.created_at,
  o.updated_at
FROM public.oportunidades o
JOIN public.empresas e ON e.id = o.empresa_id
JOIN ultimo_handoff uh ON uh.oportunidad_id = o.id
LEFT JOIN public.user_profiles up_actual ON up_actual.id = o.responsable_actual_id
WHERE o.deleted_at IS NULL
  AND o.created_by = auth.uid()
  AND o.responsable_actual_id IS DISTINCT FROM auth.uid()
  AND o.etapa NOT IN ('cerrada_ganada','cerrada_perdida')
ORDER BY o.updated_at ASC;  -- Más vieja primero (mayor urgencia)

GRANT SELECT ON public.v_captacion_enviados_en_seguimiento TO authenticated;

COMMENT ON VIEW public.v_captacion_enviados_en_seguimiento IS
  'Sprint 2026-05-19: casos enviados por el user (creador) que ahora están en manos de Carolina M / asesor senior. Incluye tipo_destinatario para sub-chip y sla_color (3d amarillo / 5d rojo).';

-- ============================================================
-- 3) VIEW v_mis_llamadas
-- ============================================================
-- Log cronológico de actividades tipo 'llamada' creadas por el user.
-- Para el tab "Mis llamadas" con filtros por rango fechas + resultado.

DROP VIEW IF EXISTS public.v_mis_llamadas;

CREATE VIEW public.v_mis_llamadas
  WITH (security_invoker = true) AS
SELECT
  a.id,
  a.fecha_actividad,
  a.titulo,
  a.descripcion,
  a.resultado,
  a.duracion_min,
  a.entidad_id AS oportunidad_id,
  o.empresa_id,
  e.nombre AS empresa_nombre,
  e.nif AS empresa_nif,
  e.telefono_principal AS empresa_telefono,
  o.etapa_operativa,
  o.responsable_actual_id,
  a.usuario_id AS llamada_creada_por,
  up.full_name AS llamada_creada_por_nombre,
  a.created_at
FROM public.actividades a
JOIN public.oportunidades o ON o.id = a.entidad_id AND a.entidad_tipo = 'oportunidad'
JOIN public.empresas e ON e.id = o.empresa_id
LEFT JOIN public.user_profiles up ON up.id = a.usuario_id
WHERE a.tipo = 'llamada'
  AND o.deleted_at IS NULL
ORDER BY a.fecha_actividad DESC;

GRANT SELECT ON public.v_mis_llamadas TO authenticated;

COMMENT ON VIEW public.v_mis_llamadas IS
  'Sprint 2026-05-19: log cronológico de llamadas. El frontend filtra por usuario_id=auth.uid() para "mis llamadas" o sin filtro para vista equipo.';

-- ============================================================
-- 4) RPC editar_campo_oportunidad
-- ============================================================
-- Whitelist de campos editables inline desde la vista tabla.
-- NO permite editar etapa/responsable/decisor (requieren flujo controlado).

CREATE OR REPLACE FUNCTION public.editar_campo_oportunidad(
  p_oportunidad_id uuid,
  p_campo          text,
  p_valor          text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id      uuid := auth.uid();
  v_funciones    text[];
  v_responsable  uuid;
  v_creador      uuid;
  v_old_value    text;
  v_new_value    text;
  v_result       jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Whitelist campos editables inline. Cualquier otro campo se rechaza.
  -- Nota: 'origen' NO se edita aquí porque vive en empresas.origen_relacion
  -- (ver editar_campo_empresa).
  IF p_campo NOT IN (
    'notas',
    'siguiente_accion',
    'fecha_siguiente_accion',
    'fecha_vencimiento_contrato_prospecto',
    'fuente_vencimiento_contrato_prospecto',
    'valor_estimado_eur',
    'ahorro_anual_estimado'
  ) THEN
    RAISE EXCEPTION 'Campo % no editable inline. Whitelist: notas, siguiente_accion, fecha_siguiente_accion, fecha_vencimiento_contrato_prospecto, fuente_vencimiento_contrato_prospecto, valor_estimado_eur, ahorro_anual_estimado.', p_campo;
  END IF;

  -- Verificar permisos: responsable, creador, admin/senior, parte del handoff.
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
    RAISE EXCEPTION 'Sin permisos para editar esta oportunidad';
  END IF;

  -- Validaciones por campo
  IF p_campo = 'fecha_siguiente_accion' OR p_campo = 'fecha_vencimiento_contrato_prospecto' THEN
    IF p_valor IS NOT NULL AND p_valor <> '' THEN
      PERFORM p_valor::timestamptz;  -- lanza si no es fecha válida
    END IF;
  END IF;

  IF p_campo IN ('valor_estimado_eur','ahorro_anual_estimado') THEN
    IF p_valor IS NOT NULL AND p_valor <> '' THEN
      PERFORM p_valor::numeric;  -- lanza si no es número
    END IF;
  END IF;

  -- UPDATE dinámico con format() — seguro porque p_campo está validado en whitelist arriba.
  EXECUTE format(
    'UPDATE public.oportunidades SET %I = $1, updated_at = now() WHERE id = $2 RETURNING %I::text',
    p_campo, p_campo
  )
  USING NULLIF(p_valor, ''), p_oportunidad_id
  INTO v_new_value;

  -- Registrar cambio en timeline (actividad tipo 'nota' invisible al user pero auditable)
  INSERT INTO public.actividades (
    tipo, titulo, descripcion, entidad_tipo, entidad_id, usuario_id, fecha_actividad
  ) VALUES (
    'nota',
    'Edición inline',
    format('Campo "%s" actualizado a: %s', p_campo, COALESCE(v_new_value, '(vacío)')),
    'oportunidad',
    p_oportunidad_id,
    v_user_id,
    now()
  );

  v_result := jsonb_build_object(
    'oportunidad_id', p_oportunidad_id,
    'campo', p_campo,
    'valor_nuevo', v_new_value,
    'editado_at', now()
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.editar_campo_oportunidad(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.editar_campo_oportunidad(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.editar_campo_oportunidad(uuid, text, text) IS
  'Sprint 2026-05-19: edición inline desde vista tabla. Whitelist de campos seguros. NO permite tocar etapa/responsable/decisor (requieren flujo controlado).';

-- ============================================================
-- 5) RPC editar_campo_empresa
-- ============================================================
-- Whitelist de campos editables inline en empresa.
-- Editar aquí propaga visualmente a oportunidades vinculadas (frontend invalida cache).

CREATE OR REPLACE FUNCTION public.editar_campo_empresa(
  p_empresa_id uuid,
  p_campo      text,
  p_valor      text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_funciones text[];
  v_new_value text;
  v_result    jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF p_campo NOT IN (
    'telefono_principal',
    'email_principal',
    'ciudad',
    'segmento',
    'nif',
    'nombre',
    'origen_relacion'
  ) THEN
    RAISE EXCEPTION 'Campo % no editable inline en empresa.', p_campo;
  END IF;

  -- Permisos: cualquier authenticated por ahora (coincide con RLS empresas actual).
  -- Endurecer más adelante cuando RLS empresas sea granular.
  SELECT funciones INTO v_funciones FROM public.user_profiles WHERE id = v_user_id;

  IF v_funciones IS NULL OR array_length(v_funciones, 1) IS NULL THEN
    RAISE EXCEPTION 'Sin funciones asignadas';
  END IF;

  -- Validaciones mínimas
  IF p_campo = 'segmento' AND p_valor NOT IN ('industrial','comercial','servicios','agricola','residencial_colectivo') THEN
    RAISE EXCEPTION 'Segmento inválido';
  END IF;

  IF p_campo = 'nombre' AND (p_valor IS NULL OR length(trim(p_valor)) < 2) THEN
    RAISE EXCEPTION 'Nombre obligatorio (mínimo 2 caracteres)';
  END IF;

  IF p_campo = 'origen_relacion' AND p_valor IS NOT NULL AND p_valor NOT IN ('captacion','cliente_historico','importacion','manual','otro') THEN
    RAISE EXCEPTION 'Origen inválido';
  END IF;

  EXECUTE format(
    'UPDATE public.empresas SET %I = $1, updated_at = now() WHERE id = $2 RETURNING %I::text',
    p_campo, p_campo
  )
  USING NULLIF(p_valor, ''), p_empresa_id
  INTO v_new_value;

  v_result := jsonb_build_object(
    'empresa_id', p_empresa_id,
    'campo', p_campo,
    'valor_nuevo', v_new_value,
    'editado_at', now()
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.editar_campo_empresa(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.editar_campo_empresa(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.editar_campo_empresa(uuid, text, text) IS
  'Sprint 2026-05-19: edición inline de empresa desde vista tabla. Whitelist segura. Frontend invalida cache de oportunidades vinculadas.';

-- ============================================================
-- 6) RPC recordar_a_responsable
-- ============================================================
-- Crea notificación CRM + dispara Edge Function enviar-recordatorio (email).
-- Solo la pestaña "Enviados" usa esto para que el creador pueda empujar al destinatario.

CREATE OR REPLACE FUNCTION public.recordar_a_responsable(
  p_oportunidad_id uuid,
  p_mensaje        text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id        uuid := auth.uid();
  v_responsable    uuid;
  v_responsable_nombre text;
  v_responsable_email text;
  v_creador        uuid;
  v_empresa_nombre text;
  v_emisor_nombre  text;
  v_notif_id       uuid;
  v_actividad_id   uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF p_mensaje IS NULL OR length(trim(p_mensaje)) = 0 THEN
    RAISE EXCEPTION 'Mensaje obligatorio';
  END IF;

  IF length(p_mensaje) > 2000 THEN
    RAISE EXCEPTION 'Mensaje demasiado largo (máximo 2000 caracteres)';
  END IF;

  -- Cargar datos de la oportunidad + responsable + emisor
  SELECT o.responsable_actual_id, o.created_by, e.nombre
    INTO v_responsable, v_creador, v_empresa_nombre
    FROM public.oportunidades o
    JOIN public.empresas e ON e.id = o.empresa_id
    WHERE o.id = p_oportunidad_id AND o.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Oportunidad no encontrada';
  END IF;

  IF v_responsable IS NULL THEN
    RAISE EXCEPTION 'La oportunidad no tiene responsable actual';
  END IF;

  IF v_responsable = v_user_id THEN
    RAISE EXCEPTION 'No puedes recordarte a ti mismo';
  END IF;

  -- Solo el creador o admin/senior pueden recordar
  IF v_user_id <> v_creador THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = v_user_id
        AND up.funciones && ARRAY['admin','asesor_senior']::text[]
    ) THEN
      RAISE EXCEPTION 'Solo el creador del lead o admin/senior puede mandar recordatorio';
    END IF;
  END IF;

  SELECT full_name, email INTO v_responsable_nombre, v_responsable_email
    FROM public.user_profiles WHERE id = v_responsable;

  SELECT full_name INTO v_emisor_nombre
    FROM public.user_profiles WHERE id = v_user_id;

  -- 1) Notificación CRM (campana del topbar)
  INSERT INTO public.notificaciones (
    usuario_id, tipo, titulo, cuerpo, entidad_tipo, entidad_id
  ) VALUES (
    v_responsable,
    'recordatorio_captacion',
    format('%s te recuerda: %s', COALESCE(v_emisor_nombre, 'Un compañero'), v_empresa_nombre),
    p_mensaje,
    'oportunidad',
    p_oportunidad_id
  )
  RETURNING id INTO v_notif_id;

  -- 2) Actividad timeline (visible en historial del cliente — sub-tipo distinguible)
  INSERT INTO public.actividades (
    tipo, titulo, descripcion, entidad_tipo, entidad_id, usuario_id, fecha_actividad
  ) VALUES (
    'nota',
    format('Recordatorio enviado a %s', COALESCE(v_responsable_nombre, 'responsable')),
    p_mensaje,
    'oportunidad',
    p_oportunidad_id,
    v_user_id,
    now()
  )
  RETURNING id INTO v_actividad_id;

  -- 3) El email se manda desde el frontend invocando la Edge Function
  --    enviar-recordatorio con (oportunidad_id, mensaje, responsable_email).
  --    NO se hace aquí porque PL/pgSQL no tiene cliente HTTP simple.

  RETURN jsonb_build_object(
    'notificacion_id', v_notif_id,
    'actividad_id', v_actividad_id,
    'responsable_id', v_responsable,
    'responsable_email', v_responsable_email,
    'empresa_nombre', v_empresa_nombre,
    'emisor_nombre', v_emisor_nombre
  );
END;
$$;

REVOKE ALL ON FUNCTION public.recordar_a_responsable(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recordar_a_responsable(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.recordar_a_responsable(uuid, text) IS
  'Sprint 2026-05-19 Hallazgo #2: crea notificación CRM + actividad timeline + devuelve datos para que el frontend invoque Edge Function enviar-recordatorio (Resend). Solo creador o admin/senior pueden recordar.';
