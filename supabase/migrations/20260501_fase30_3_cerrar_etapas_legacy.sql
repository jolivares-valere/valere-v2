-- =====================================================================
-- FASE 30.3 — Cerrar migración FASE 21.a (etapas legacy)
--
-- Pre-verificación (1 mayo 2026 21:00 UTC):
--   1 fila con etapa='contactado', 3 con 'cerrada_ganada'.
--
-- Aplicada en producción (gtphkowfcuiqbvfkwjxb) por Cowork 2026-05-01 vía MCP.
-- Tras aplicar: 3 cerrada_ganada + 1 auditoria_consumo. CHECK ahora rechaza
-- cualquier intento de insertar etapas legacy.
--
-- También limpiados:
--   - src/core/types/entities.ts: EtapaOportunidad reducido a 8 valores
--   - src/features/oportunidades/components/OportunidadForm.tsx: ETAPAS array
-- El mapeo defensivo legacy→canónica en OportunidadesPage.tsx y
-- OportunidadForm.tsx se mantiene como capa de seguridad por si llegan
-- datos legacy desde algún flujo no migrado todavía.
-- =====================================================================

UPDATE public.oportunidades
   SET etapa = CASE etapa
                 WHEN 'contactado'        THEN 'auditoria_consumo'
                 WHEN 'analisis'          THEN 'auditoria_consumo'
                 WHEN 'propuesta_enviada' THEN 'oferta_presentada'
                 WHEN 'ganada'            THEN 'cerrada_ganada'
                 WHEN 'perdida'           THEN 'cerrada_perdida'
                 WHEN 'cancelada'         THEN 'cerrada_perdida'
                 ELSE etapa
               END
 WHERE etapa IN ('contactado','analisis','propuesta_enviada','ganada','perdida','cancelada');

ALTER TABLE public.oportunidades
  DROP CONSTRAINT IF EXISTS oportunidades_etapa_check;

ALTER TABLE public.oportunidades
  ADD CONSTRAINT oportunidades_etapa_check CHECK (etapa IN (
    'prospecto',
    'auditoria_consumo',
    'oferta_presentada',
    'negociacion',
    'contrato_firmado',
    'activo',
    'cerrada_ganada',
    'cerrada_perdida'
  ));

COMMENT ON COLUMN public.oportunidades.etapa IS
  'FASE 30.3 — Pipeline 100% energético: prospecto / auditoria_consumo / oferta_presentada / negociacion / contrato_firmado / activo / cerrada_ganada / cerrada_perdida.';
