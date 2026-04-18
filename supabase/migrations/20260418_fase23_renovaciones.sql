-- FASE 23 — Módulo de Renovaciones
-- Seguimiento del ciclo de renovación de contratos vencidos o próximos a vencer.

-- Types
DO $$ BEGIN
  CREATE TYPE public.estado_renovacion AS ENUM (
    'detectada', 'contactado', 'oferta_enviada',
    'negociacion', 'renovado', 'perdido'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.prioridad_renovacion AS ENUM ('critica', 'alta', 'media', 'baja', 'ok');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabla
CREATE TABLE IF NOT EXISTS public.renovaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  estado public.estado_renovacion NOT NULL DEFAULT 'detectada',
  prioridad public.prioridad_renovacion NOT NULL DEFAULT 'media',
  fecha_deteccion timestamptz NOT NULL DEFAULT now(),
  fecha_vencimiento_contrato timestamptz,
  motivo_perdida text,
  nuevo_contrato_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL,
  asignado_a uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_renovaciones_contrato ON public.renovaciones(contrato_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_renovaciones_empresa ON public.renovaciones(empresa_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_renovaciones_estado ON public.renovaciones(estado) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_renovaciones_asignado ON public.renovaciones(asignado_a) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_renovaciones_vencimiento ON public.renovaciones(fecha_vencimiento_contrato) WHERE deleted_at IS NULL;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_renovaciones_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_renovaciones_touch ON public.renovaciones;
CREATE TRIGGER tg_renovaciones_touch
  BEFORE UPDATE ON public.renovaciones
  FOR EACH ROW EXECUTE FUNCTION public.tg_renovaciones_touch();

-- RLS
ALTER TABLE public.renovaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "renovaciones_all_authenticated" ON public.renovaciones;
CREATE POLICY "renovaciones_all_authenticated" ON public.renovaciones
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- KPI view
CREATE OR REPLACE VIEW public.v_renovaciones_kpi AS
SELECT
  COUNT(*) FILTER (WHERE estado NOT IN ('renovado', 'perdido'))::int AS activas,
  COUNT(*) FILTER (WHERE estado NOT IN ('renovado', 'perdido') AND prioridad = 'critica')::int AS criticas,
  COUNT(*) FILTER (WHERE estado = 'renovado')::int AS renovadas,
  COUNT(*) FILTER (WHERE estado = 'perdido')::int AS perdidas
FROM public.renovaciones
WHERE deleted_at IS NULL;

COMMENT ON TABLE public.renovaciones IS 'FASE 23 — Seguimiento de renovaciones de contratos.';
