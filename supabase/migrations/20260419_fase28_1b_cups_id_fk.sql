-- =====================================================================
-- FASE 28.1a (parte 2) — Añadir cups_id FK a invoice_history y proposals
-- =====================================================================
-- Motivo:
--   Las tablas invoice_history y proposals actualmente referencian a
--   supply_points(id) vía supply_point_id. Para que el frontend refactorizado
--   pueda leer/escribir directamente contra cups, añadimos cups_id como FK
--   paralela. Así el código nuevo escribe cups_id y el viejo sigue leyendo
--   supply_point_id sin romper.
--
-- Cowork debe ejecutar después el DML que popula cups_id a partir de
-- supply_points.cups = cups.codigo_cups.
-- =====================================================================

-- invoice_history
ALTER TABLE public.invoice_history
  ADD COLUMN IF NOT EXISTS cups_id uuid REFERENCES cups(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_invoice_history_cups
  ON public.invoice_history (cups_id);

-- proposals
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS cups_id uuid REFERENCES cups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_proposals_cups
  ON public.proposals (cups_id);

-- RLS: las policies existentes (authenticated CRUD all) ya cubren estas columnas.
-- No se necesitan policies nuevas.
