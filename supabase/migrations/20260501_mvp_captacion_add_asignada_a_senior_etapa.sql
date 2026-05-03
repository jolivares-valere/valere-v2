-- =====================================================================
-- MVP Captación — añadir 'asignada_a_senior' a etapa_operativa
-- Aplicada en producción gtphkowfcuiqbvfkwjxb por Cowork 2026-05-01 vía MCP.
--
-- Justificación: tras intentar sembrar oportunidades demo se detectó que el
-- workflow necesita un estado intermedio entre `factura_recibida` (Carolina M
-- con factura por analizar) y `propuesta_en_preparacion` (alguien preparando
-- propuesta). Es el momento exacto en que Carolina M ha decidido "senior" y
-- ha asignado al asesor, pero el asesor aún no ha empezado a trabajar.
--
-- Sin este estado, no podríamos distinguir en la UI:
--   - bandeja Carolina Maciñeiras: "Facturas pendientes de analizar"
--   - bandeja asesor senior:       "Casos asignados pendientes de empezar"
--
-- Total estados operativos pasa de 10 → 11.
-- =====================================================================

ALTER TABLE public.oportunidades
  DROP CONSTRAINT IF EXISTS oportunidades_etapa_operativa_check;

ALTER TABLE public.oportunidades
  ADD CONSTRAINT oportunidades_etapa_operativa_check CHECK (
    etapa_operativa IS NULL OR etapa_operativa IN (
      'nuevo','contactado','esperando_factura','factura_recibida',
      'en_analisis','asignada_a_senior',
      'propuesta_en_preparacion','propuesta_lista',
      'propuesta_enviada','seguimiento','cerrado'
    )
  );

COMMENT ON COLUMN public.oportunidades.etapa_operativa IS
  'Workflow micro 11 estados: nuevo → contactado → esperando_factura → factura_recibida → (en_analisis | asignada_a_senior) → propuesta_en_preparacion → propuesta_lista → propuesta_enviada → seguimiento → cerrado.';
