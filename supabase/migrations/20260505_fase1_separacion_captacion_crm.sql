-- FASE 1 — Separación CRM ↔ Captación (BD)
-- Aplicado en BD prod via MCP 2026-05-05
--
-- Origen: feedback Juan 2026-05-05 — "no quiero mezclar leads con clientes
-- reales. Captación debe operar como app independiente del CRM hasta
-- conversión explícita por contrato firmado".
--
-- Decisión arquitectónica: separación lógica fuerte (estado_relacion +
-- contexto), NO duplicar tablas. Ver docs/AUDITORIA_SEPARACION_*.md.
--
-- Resultado verificado tras backfill:
--   - 24 empresas cliente (origen: cliente_historico)
--   - 9 empresas prospecto (origen: captacion) — DEMO 4 + TEST SMOKE 2 +
--     leads reales Carolina A 3
--   - 4 oportunidades contexto=crm
--   - 9 oportunidades contexto=captacion
--   - 0 inconsistencias

-- =====================================================
-- A) Schema aditivo en empresas
-- =====================================================
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS estado_relacion text NOT NULL DEFAULT 'cliente',
  ADD COLUMN IF NOT EXISTS origen_relacion text,
  ADD COLUMN IF NOT EXISTS convertido_cliente_at timestamptz,
  ADD COLUMN IF NOT EXISTS convertido_cliente_por uuid;

ALTER TABLE public.empresas
  DROP CONSTRAINT IF EXISTS empresas_estado_relacion_check,
  ADD CONSTRAINT empresas_estado_relacion_check
    CHECK (estado_relacion IN ('prospecto','cliente','ex_cliente','descartado'));

ALTER TABLE public.empresas
  DROP CONSTRAINT IF EXISTS empresas_origen_relacion_check,
  ADD CONSTRAINT empresas_origen_relacion_check
    CHECK (origen_relacion IS NULL OR origen_relacion IN ('captacion','cliente_historico','importacion','manual','otro'));

ALTER TABLE public.empresas
  DROP CONSTRAINT IF EXISTS empresas_convertido_cliente_por_fkey,
  ADD CONSTRAINT empresas_convertido_cliente_por_fkey
    FOREIGN KEY (convertido_cliente_por) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- =====================================================
-- B) Schema aditivo en oportunidades
-- =====================================================
ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS contexto text NOT NULL DEFAULT 'crm',
  ADD COLUMN IF NOT EXISTS convertida_a_crm_at timestamptz,
  ADD COLUMN IF NOT EXISTS convertida_a_crm_por uuid;

ALTER TABLE public.oportunidades
  DROP CONSTRAINT IF EXISTS oportunidades_contexto_check,
  ADD CONSTRAINT oportunidades_contexto_check
    CHECK (contexto IN ('captacion','crm'));

ALTER TABLE public.oportunidades
  DROP CONSTRAINT IF EXISTS oportunidades_convertida_a_crm_por_fkey,
  ADD CONSTRAINT oportunidades_convertida_a_crm_por_fkey
    FOREIGN KEY (convertida_a_crm_por) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- =====================================================
-- C) Backfill ya aplicado en prod (DEMO/TEST/Carolina A → prospecto)
-- =====================================================
-- (Ver migration aplicada via MCP. No re-ejecutar en otros entornos.)

-- =====================================================
-- D) Trigger de coherencia
-- =====================================================
CREATE OR REPLACE FUNCTION public.enforce_oportunidad_contexto_coherence()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_estado_empresa text;
BEGIN
  IF NEW.contexto = 'crm' THEN
    SELECT estado_relacion INTO v_estado_empresa
    FROM public.empresas WHERE id = NEW.empresa_id;
    IF v_estado_empresa IS NULL THEN
      RAISE EXCEPTION 'Empresa % no encontrada', NEW.empresa_id;
    END IF;
    IF v_estado_empresa <> 'cliente' THEN
      RAISE EXCEPTION 'No se puede asignar contexto=crm a oportunidad cuya empresa está en estado %. Usa convertir_prospecto_a_cliente().', v_estado_empresa;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_enforce_oportunidad_contexto ON public.oportunidades;
CREATE TRIGGER tg_enforce_oportunidad_contexto
  BEFORE INSERT OR UPDATE OF contexto, empresa_id ON public.oportunidades
  FOR EACH ROW EXECUTE FUNCTION public.enforce_oportunidad_contexto_coherence();

-- =====================================================
-- E) RPC convertir_prospecto_a_cliente
-- =====================================================
-- (Ver definición completa en BD prod aplicada via MCP. Puente único entre
-- captación y CRM. Solo asesor_senior/admin. Atómico.)

-- =====================================================
-- F) Vistas separadas
-- =====================================================
-- v_captacion_empresas, v_crm_empresas_clientes,
-- v_captacion_oportunidades, v_crm_oportunidades
-- Todas con security_invoker=true para que respeten RLS del consumidor.

-- =====================================================
-- G) crear_lead_captacion v3
-- =====================================================
-- Actualizada para que las empresas creadas desde Captación nazcan con:
--   estado_relacion='prospecto', origen_relacion='captacion'
-- Y las oportunidades con contexto='captacion'.
