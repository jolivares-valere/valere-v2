-- =====================================================================
-- FASE 30.8 (aditiva) — incidencias.cups_id uuid FK
--
-- Estado actual: incidencias.cups text (vinculación débil por código).
-- Objetivo: añadir cups_id uuid FK manteniendo cups text por compatibilidad
-- y popular cups_id desde el código existente. La columna `cups` text se
-- elimina en una migration futura cuando confirmemos que ningún código TS
-- la lee directamente.
--
-- Aplicada en producción (gtphkowfcuiqbvfkwjxb) por Cowork 2026-05-01 vía MCP.
-- 0 incidencias en la tabla en el momento de la aplicación → migración trivial.
-- =====================================================================

ALTER TABLE public.incidencias
  ADD COLUMN IF NOT EXISTS cups_id uuid
    REFERENCES public.cups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_incidencias_cups_id
  ON public.incidencias(cups_id) WHERE deleted_at IS NULL;

UPDATE public.incidencias i
   SET cups_id = c.id
  FROM public.cups c
 WHERE c.codigo_cups = i.cups
   AND i.cups IS NOT NULL
   AND i.cups_id IS NULL
   AND c.deleted_at IS NULL;

COMMENT ON COLUMN public.incidencias.cups_id IS
  'FASE 30.8 — FK fuerte a cups. Sustituye gradualmente al campo `cups text` (eliminar en FASE 30.8b cuando frontend migre).';
