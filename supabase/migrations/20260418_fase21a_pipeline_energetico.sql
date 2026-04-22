-- FASE 21.a — Pipeline de oportunidades con etapas energéticas
--
-- Cambios sobre `oportunidades`:
--   1. Ampliar CHECK de `etapa` con las etapas reales del sector energético
--      (prospecto → auditoria_consumo → oferta_presentada → negociacion →
--       contrato_firmado → activo → cerrada_ganada → cerrada_perdida).
--      Se conservan las etapas antiguas ('contactado','analisis',
--      'propuesta_enviada','ganada','perdida','cancelada') para no romper
--      datos existentes hasta que se haga la migración de datos en
--      otra FASE.
--   2. Añadir columna `ahorro_anual_estimado numeric(14,2)` (KPI real de
--      venta en consultoría energética).
--   3. Añadir columna `contacto_id uuid` (FK a contactos) — antes figuraba
--      en el código TS pero no en la tabla.

-- 1. CHECK ampliado de etapa
ALTER TABLE public.oportunidades
  DROP CONSTRAINT IF EXISTS oportunidades_etapa_check;

ALTER TABLE public.oportunidades
  ADD CONSTRAINT oportunidades_etapa_check CHECK (etapa IN (
    -- etapas energéticas nuevas (FASE 21.a)
    'prospecto',
    'auditoria_consumo',
    'oferta_presentada',
    'negociacion',
    'contrato_firmado',
    'activo',
    'cerrada_ganada',
    'cerrada_perdida',
    -- etapas antiguas (compatibilidad con datos existentes)
    'contactado',
    'analisis',
    'propuesta_enviada',
    'ganada',
    'perdida',
    'cancelada'
  ));

-- 2. Ahorro anual estimado
ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS ahorro_anual_estimado numeric(14,2);

COMMENT ON COLUMN public.oportunidades.ahorro_anual_estimado IS
  'Ahorro anual estimado (€) — KPI de venta en consultoría energética.';

-- 3. Contacto asociado (si aún no existe)
ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS contacto_id uuid REFERENCES public.contactos(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_oport_contacto ON public.oportunidades (contacto_id);

-- 4. Vista KPI agregada para el Kanban: por etapa, total oportunidades,
--    ahorro anual acumulado y valor_estimado acumulado.
CREATE OR REPLACE VIEW public.v_oportunidades_kpi AS
SELECT
  etapa,
  COUNT(*)                                                     AS total,
  COALESCE(SUM(valor_estimado_eur), 0)::numeric(14,2)          AS valor_acumulado,
  COALESCE(SUM(ahorro_anual_estimado), 0)::numeric(14,2)       AS ahorro_acumulado
FROM public.oportunidades
WHERE deleted_at IS NULL
GROUP BY etapa;

COMMENT ON VIEW public.v_oportunidades_kpi IS
  'FASE 21.a — Agregados por etapa del pipeline (total, valor, ahorro anual).';
