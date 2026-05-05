-- Multi-contacto con flag principal + RPCs con array (aplicado en BD prod via MCP 2026-05-04)
-- Origen: feedback uso real Carolina A "echo de menos un segundo email".
-- Decisión validada con ChatGPT: opción A (multi-contacto, no parche).
--
-- Cambios:
-- 1. ALTER contactos ADD es_principal boolean DEFAULT false
-- 2. Backfill: contacto más antiguo de cada empresa marcado como principal
-- 3. UNIQUE INDEX parcial: máximo 1 principal por empresa
-- 4. RPC crear_lead_captacion v2: parámetro p_contactos jsonb (array)
-- 5. RPC actualizar_lead_captacion v2: parámetro p_contactos jsonb con
--    soporte de _eliminar (soft-delete) e id (update vs insert)

ALTER TABLE public.contactos
  ADD COLUMN IF NOT EXISTS es_principal boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.contactos.es_principal IS
  'Flag: contacto principal (preferente) de la empresa para captación. Distinto de es_decisor (quien firma).';

-- Backfill: contacto más antiguo por empresa = principal
WITH primeros AS (
  SELECT DISTINCT ON (empresa_id) id
  FROM public.contactos
  WHERE deleted_at IS NULL
  ORDER BY empresa_id, created_at ASC
)
UPDATE public.contactos
SET es_principal = true
WHERE id IN (SELECT id FROM primeros);

-- Constraint: máximo un principal por empresa
CREATE UNIQUE INDEX IF NOT EXISTS contactos_uno_principal_por_empresa
  ON public.contactos (empresa_id)
  WHERE es_principal = true AND deleted_at IS NULL;

-- Las RPCs crear_lead_captacion v2 y actualizar_lead_captacion v2 están en
-- la migration aplicada via MCP. Ver migrations/20260504_multi_contacto_rol_principal
-- en supabase migrations table. El SQL completo se aplicó atómicamente.
