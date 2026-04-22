-- =====================================================================
-- FASE 28.1a (parte 2) — Añadir cups_id FK a facturas y proposals
-- =====================================================================
-- Motivo:
--   Las tablas facturas (ex invoice_history — renombrada en FASE 20.7.d)
--   y proposals actualmente referencian a supply_points(id) vía
--   supply_point_id. Para que el frontend refactorizado pueda leer/escribir
--   directamente contra cups, añadimos cups_id como FK paralela. Así el
--   código nuevo escribe cups_id y el viejo sigue leyendo supply_point_id
--   sin romper.
--
-- Cowork debe ejecutar después el DML que popula cups_id a partir de
-- supply_points.cups = cups.codigo_cups.
-- =====================================================================

-- facturas (ex invoice_history)
ALTER TABLE public.facturas
  ADD COLUMN IF NOT EXISTS cups_id uuid REFERENCES cups(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_facturas_cups
  ON public.facturas (cups_id);

-- proposals
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS cups_id uuid REFERENCES cups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_proposals_cups
  ON public.proposals (cups_id);

-- RLS: las policies existentes (authenticated CRUD all) ya cubren estas columnas.
-- No se necesitan policies nuevas.
