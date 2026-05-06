-- Sprint D1 — exponer vencimiento + factura_fecha_prevista en v_mis_oportunidades
-- Aplicado en BD prod via MCP 2026-05-05.
--
-- Origen: las cards de bandejas operativas (/captacion → "Por llamar",
-- "Esperando factura", etc.) se alimentan de esta vista. Para pintar el
-- semáforo de vencimiento sin abrir el drawer hace falta exponer
-- fecha_vencimiento_contrato_prospecto.
--
-- Aprovecho para añadir factura_fecha_prevista (que ya estaba en el tipo
-- TS pero no en la vista) y fuente_vencimiento por si en el futuro se
-- quiere mostrar contexto en card.

DROP VIEW IF EXISTS public.v_mis_oportunidades;

CREATE VIEW public.v_mis_oportunidades
  WITH (security_invoker = true) AS
SELECT
  o.id,
  o.empresa_id,
  e.nombre AS empresa_nombre,
  e.nif AS empresa_nif,
  o.tipo,
  o.etapa,
  o.etapa_operativa,
  o.decisor_identificado,
  o.responsable_actual_id,
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
WHERE o.deleted_at IS NULL
  AND o.responsable_actual_id = auth.uid();

GRANT SELECT ON public.v_mis_oportunidades TO authenticated;

COMMENT ON VIEW public.v_mis_oportunidades IS
  'Bandejas operativas del responsable actual. Sprint D1 2026-05-05: añadidos fecha_vencimiento_contrato_prospecto y fuente_* para semáforo en cards.';
