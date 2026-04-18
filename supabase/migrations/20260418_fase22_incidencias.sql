-- FASE 22 — Módulo de Incidencias
-- Gestión de reclamaciones y problemas de clientes con contratos activos.

-- Types
DO $$ BEGIN
  CREATE TYPE public.tipo_incidencia AS ENUM (
    'facturacion', 'cambio_comercializadora', 'corte_suministro',
    'potencia', 'acceso_red', 'otro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.estado_incidencia AS ENUM (
    'abierta', 'en_gestion', 'pendiente_cliente',
    'pendiente_comercializadora', 'resuelta', 'cerrada'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.prioridad_incidencia AS ENUM ('baja', 'media', 'alta', 'critica');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabla
CREATE TABLE IF NOT EXISTS public.incidencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  contrato_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL,
  cups text,
  titulo text NOT NULL,
  descripcion text,
  tipo public.tipo_incidencia NOT NULL DEFAULT 'otro',
  estado public.estado_incidencia NOT NULL DEFAULT 'abierta',
  prioridad public.prioridad_incidencia NOT NULL DEFAULT 'media',
  asignado_a uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  fecha_apertura timestamptz NOT NULL DEFAULT now(),
  fecha_limite timestamptz,
  fecha_resolucion timestamptz,
  importe_reclamado numeric(12, 2),
  importe_recuperado numeric(12, 2),
  notas_resolucion text,
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_incidencias_empresa ON public.incidencias(empresa_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incidencias_contrato ON public.incidencias(contrato_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incidencias_asignado ON public.incidencias(asignado_a) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incidencias_estado ON public.incidencias(estado) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incidencias_prioridad ON public.incidencias(prioridad) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incidencias_fecha_apertura ON public.incidencias(fecha_apertura DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_incidencias_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.estado IN ('resuelta', 'cerrada') AND OLD.estado NOT IN ('resuelta', 'cerrada') THEN
    NEW.fecha_resolucion := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_incidencias_touch ON public.incidencias;
CREATE TRIGGER tg_incidencias_touch
  BEFORE UPDATE ON public.incidencias
  FOR EACH ROW EXECUTE FUNCTION public.tg_incidencias_touch();

-- RLS
ALTER TABLE public.incidencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "incidencias_all_authenticated" ON public.incidencias;
CREATE POLICY "incidencias_all_authenticated" ON public.incidencias
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- KPI agregado para Dashboard
CREATE OR REPLACE VIEW public.v_incidencias_kpi AS
SELECT
  COUNT(*) FILTER (WHERE estado NOT IN ('resuelta', 'cerrada'))::int AS abiertas,
  COUNT(*) FILTER (WHERE estado NOT IN ('resuelta', 'cerrada') AND prioridad = 'critica')::int AS criticas,
  COUNT(*) FILTER (WHERE estado NOT IN ('resuelta', 'cerrada') AND prioridad = 'alta')::int AS altas,
  COUNT(*) FILTER (WHERE fecha_limite IS NOT NULL AND fecha_limite < now() AND estado NOT IN ('resuelta', 'cerrada'))::int AS vencidas
FROM public.incidencias
WHERE deleted_at IS NULL;

COMMENT ON TABLE public.incidencias IS 'FASE 22 — Incidencias y reclamaciones de clientes.';
