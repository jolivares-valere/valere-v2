-- ============================================================================
-- Migración FV MVP operativo — 2026-06-18
-- APLICADA EN PRODUCCIÓN vía MCP Supabase el 2026-06-18 (este fichero la versiona).
-- Objetivo: soporte mínimo de BD para el MVP del módulo Seguimiento Plantas FV.
-- Solo lo IMPRESCINDIBLE. El resto de tablas que el plan creía "faltantes" YA
-- EXISTEN en Supabase (verificado 2026-06-18):
--   fv_kpi_diario  -> ya tiene consumo_kwh, autoconsumo_kwh, excedente_kwh,
--                     compra_red_kwh (NO crear fv_produccion_diaria).
--   fv_informe_mensual -> ya existe completa (NO crear).
--   fv_alarma -> ya tiene severidad, descripcion, activa, iniciada_en,
--                resuelta_en (NO crear; el sync debe rellenar bien).
-- NO se crean: fv_produccion_intradia (bloqueada por day-real-kpi),
--              fv_excedente_datadis (depende de energy-balance + CUPS cruzado).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) NOTAS POR PLANTA
-- fv_planta NO tiene columna de notas. Creamos tabla fv_planta_nota con
-- historial (autor + fecha), para anotar lo que no está en FusionSolar.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fv_planta_nota (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planta_id      uuid NOT NULL REFERENCES public.fv_planta(id) ON DELETE CASCADE,
  texto          text NOT NULL,
  autor_id       uuid REFERENCES public.user_profiles(id),
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fv_planta_nota_planta ON public.fv_planta_nota(planta_id);

CREATE OR REPLACE FUNCTION public.fv_planta_nota_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''   -- seguridad: search_path fijo (advisor function_search_path_mutable)
AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fv_planta_nota_touch ON public.fv_planta_nota;
CREATE TRIGGER trg_fv_planta_nota_touch
  BEFORE UPDATE ON public.fv_planta_nota
  FOR EACH ROW EXECUTE FUNCTION public.fv_planta_nota_touch();

ALTER TABLE public.fv_planta_nota ENABLE ROW LEVEL SECURITY;

-- Lectura: admin, o comercial de la empresa dueña de la planta (mismo patrón
-- que fv_alarma_read / fv_kpi_diario_read).
CREATE POLICY fv_planta_nota_read ON public.fv_planta_nota
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fv_planta p
      JOIN public.empresas e ON e.id = p.empresa_id
      WHERE p.id = fv_planta_nota.planta_id
        AND (fv_is_admin() OR e.comercial_id = auth.uid())
    )
  );

-- Inserción: usuario autenticado con acceso de lectura a la planta, atribuida a
-- sí mismo (autor_id = auth.uid()).
CREATE POLICY fv_planta_nota_insert ON public.fv_planta_nota
  FOR INSERT TO authenticated
  WITH CHECK (
    autor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.fv_planta p
      JOIN public.empresas e ON e.id = p.empresa_id
      WHERE p.id = fv_planta_nota.planta_id
        AND (fv_is_admin() OR e.comercial_id = auth.uid())
    )
  );

-- Edición: solo el autor o admin.
CREATE POLICY fv_planta_nota_update ON public.fv_planta_nota
  FOR UPDATE TO authenticated
  USING      (autor_id = auth.uid() OR fv_is_admin())
  WITH CHECK (autor_id = auth.uid() OR fv_is_admin());

-- Borrado: solo el autor o admin.
CREATE POLICY fv_planta_nota_delete ON public.fv_planta_nota
  FOR DELETE TO authenticated
  USING (autor_id = auth.uid() OR fv_is_admin());

-- ----------------------------------------------------------------------------
-- 2) NOTIFICACIONES — NO se añade policy de INSERT para authenticated.
-- DECISIÓN (Juan, 2026-06-18): las notificaciones de alarmas FV las crea el
-- SYNC con service_role (que bypasea RLS). El frontend NO inserta.
-- ----------------------------------------------------------------------------

-- FIN
