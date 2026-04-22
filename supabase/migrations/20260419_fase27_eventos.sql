-- FASE 27 — Calendario/Agenda
-- Tabla `eventos` polimórfica (entidad_tipo + entidad_id) con rango temporal.
-- Idempotente: usa IF NOT EXISTS y CREATE OR REPLACE para poder reaplicarse.

-- 1. Tabla principal
CREATE TABLE IF NOT EXISTS public.eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descripcion text,
  tipo text NOT NULL DEFAULT 'reunion'
    CHECK (tipo IN ('reunion','llamada','visita','tarea','vencimiento','otro')),
  fecha_inicio timestamptz NOT NULL,
  fecha_fin timestamptz,
  todo_el_dia boolean NOT NULL DEFAULT false,
  ubicacion text,
  color text,
  entidad_tipo text
    CHECK (entidad_tipo IS NULL OR entidad_tipo IN ('empresa','contacto','contrato','oportunidad','incidencia','renovacion')),
  entidad_id uuid,
  asignado_a uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 2. Índices para listado por rango y por entidad
CREATE INDEX IF NOT EXISTS idx_eventos_fecha_inicio ON public.eventos (fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_eventos_entidad ON public.eventos (entidad_tipo, entidad_id);
CREATE INDEX IF NOT EXISTS idx_eventos_asignado_a ON public.eventos (asignado_a) WHERE deleted_at IS NULL;

-- 3. Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at_eventos()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_eventos_updated_at ON public.eventos;
CREATE TRIGGER trg_eventos_updated_at
  BEFORE UPDATE ON public.eventos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_eventos();

-- 4. RLS — permisivo de momento (alineado con el resto de tablas)
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eventos all auth" ON public.eventos;
CREATE POLICY "eventos all auth"
  ON public.eventos
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
