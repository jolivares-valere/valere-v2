-- =====================================================================
-- MVP Captación multi-rol — schema base
-- Aplicada en producción gtphkowfcuiqbvfkwjxb por Cowork 2026-05-01 vía MCP.
--
-- ⚠️ IMPORTANTE: esta migration debe aplicarse JUNTO con
--    20260501_mvp_captacion_fixes_post_audit_chatgpt.sql
--    que corrige tres puntos detectados en auditoría externa post-aplicación:
--      (1) FK to_user_id incoherencia NOT NULL + ON DELETE SET NULL → RESTRICT.
--      (2) v_mis_oportunidades sin security_invoker explícito.
--      (3) Catálogo motivo_perdida_enum + columnas + vista análisis (no incluido
--          aquí; se aplica en la migration de fixes).
--    Si alguien aplica solo esta migration en un entorno nuevo, reintroduce los
--    bugs corregidos. Cuando haya tiempo, consolidar ambas en una única migration
--    para entornos limpios.
--
-- Contexto: tras descripción Juan del flujo real de captación con 4 roles
-- (Carolina Aroca, Carolina Maciñeiras, Antonio, Juan) y handoffs entre ellos,
-- y feedback ChatGPT (simplicidad), se aplica este schema multi-rol.
--
-- Documentación:
--   - docs/FLUJO_REAL_CAPTACION_VALERE_2026-05-01.md (descripción narrativa).
--   - docs/SCHEMA_MVP_CAPTACION_FINAL_2026-05-01.md (decisiones de diseño).
--
-- Cambios aplicados:
--  1. ALTER oportunidades: etapa_operativa (10 valores), responsable_actual_id,
--     decisor_identificado, factura_recibida_at, factura_documento_id,
--     propuesta_documento_id, propuesta_enviada_at, visita_programada_at.
--  2. Tabla oportunidad_handoffs + trigger handoff_apply (auto-actualiza
--     responsable_actual_id en la oportunidad al insertar handoff).
--  3. Tabla oportunidad_emails (decisor vs ejecutor — feedback ChatGPT).
--  4. VIEW v_mis_oportunidades (cada user ve solo lo que le toca AHORA).
--  5. ALTER user_profiles ADD funciones text[].
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. ALTER oportunidades
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS etapa_operativa text;

ALTER TABLE public.oportunidades
  DROP CONSTRAINT IF EXISTS oportunidades_etapa_operativa_check;
ALTER TABLE public.oportunidades
  ADD CONSTRAINT oportunidades_etapa_operativa_check CHECK (
    etapa_operativa IS NULL OR etapa_operativa IN (
      'nuevo','contactado','esperando_factura','factura_recibida',
      'en_analisis','propuesta_en_preparacion','propuesta_lista',
      'propuesta_enviada','seguimiento','cerrado'
    )
  );

COMMENT ON COLUMN public.oportunidades.etapa_operativa IS
  'Workflow micro 10 estados (nivel operativo). Complementa etapa macro (8 valores).';

ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS responsable_actual_id uuid
    REFERENCES public.user_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_oportunidades_responsable_actual
  ON public.oportunidades(responsable_actual_id) WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.oportunidades.responsable_actual_id IS
  'Usuario que tiene la pelota AHORA en esta oportunidad. Se actualiza con cada handoff.';

ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS decisor_identificado boolean NOT NULL DEFAULT false;

ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS factura_recibida_at timestamptz,
  ADD COLUMN IF NOT EXISTS factura_documento_id uuid REFERENCES public.documentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS propuesta_documento_id uuid REFERENCES public.documentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS propuesta_enviada_at timestamptz,
  ADD COLUMN IF NOT EXISTS visita_programada_at timestamptz;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Tabla oportunidad_handoffs + trigger
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.oportunidad_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidad_id uuid NOT NULL REFERENCES public.oportunidades(id) ON DELETE CASCADE,
  from_user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  to_user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  motivo text NOT NULL CHECK (motivo IN (
    'factura_recibida',
    'asignacion_a_senior',
    'propuesta_lista',
    'devuelta_para_revision',
    'reasignacion_manual',
    'otro'
  )),
  notas text,
  etapa_operativa_destino text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_handoffs_oportunidad
  ON public.oportunidad_handoffs(oportunidad_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_handoffs_to_user
  ON public.oportunidad_handoffs(to_user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.tg_oportunidad_handoff_apply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  UPDATE public.oportunidades
     SET responsable_actual_id = NEW.to_user_id,
         etapa_operativa = COALESCE(NEW.etapa_operativa_destino, etapa_operativa),
         updated_at = now()
   WHERE id = NEW.oportunidad_id;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS tg_handoff_apply ON public.oportunidad_handoffs;
CREATE TRIGGER tg_handoff_apply
  AFTER INSERT ON public.oportunidad_handoffs
  FOR EACH ROW EXECUTE FUNCTION public.tg_oportunidad_handoff_apply();

-- Hardening: no exponer función SECURITY DEFINER a anon/authenticated
REVOKE EXECUTE ON FUNCTION public.tg_oportunidad_handoff_apply() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_oportunidad_handoff_apply() FROM anon;
REVOKE EXECUTE ON FUNCTION public.tg_oportunidad_handoff_apply() FROM authenticated;

-- RLS
ALTER TABLE public.oportunidad_handoffs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS handoffs_all_authenticated ON public.oportunidad_handoffs;
CREATE POLICY handoffs_all_authenticated ON public.oportunidad_handoffs
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

COMMENT ON TABLE public.oportunidad_handoffs IS
  'Trazabilidad de cambios de responsable. Trigger handoff_apply actualiza oportunidad.responsable_actual_id automáticamente.';

-- ─────────────────────────────────────────────────────────────────────
-- 3. Tabla oportunidad_emails (decisor vs ejecutor)
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.oportunidad_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidad_id uuid NOT NULL REFERENCES public.oportunidades(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN (
    'presentacion','solicitud_factura','propuesta',
    'introduccion_asesor','seguimiento','otro'
  )),
  enviado_por uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  decidido_por uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  destinatario_email text,
  destinatario_user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  asunto text,
  cuerpo_resumen text,
  enviado_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emails_oportunidad
  ON public.oportunidad_emails(oportunidad_id, enviado_at DESC);

CREATE INDEX IF NOT EXISTS idx_emails_tipo
  ON public.oportunidad_emails(tipo, enviado_at DESC);

ALTER TABLE public.oportunidad_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS emails_all_authenticated ON public.oportunidad_emails;
CREATE POLICY emails_all_authenticated ON public.oportunidad_emails
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

COMMENT ON TABLE public.oportunidad_emails IS
  'Emails enviados a clientes o entre miembros del equipo. Distingue decisor (quien decidió mandarlo) de ejecutor (quien lo envió).';

-- ─────────────────────────────────────────────────────────────────────
-- 4. VIEW v_mis_oportunidades
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_mis_oportunidades AS
SELECT
  o.id,
  o.empresa_id,
  e.nombre AS empresa_nombre,
  e.nif AS empresa_nif,
  o.tipo,
  o.etapa,
  o.etapa_operativa,
  o.decisor_identificado,
  o.responsable_actual_id,
  o.factura_recibida_at,
  o.factura_documento_id,
  o.propuesta_documento_id,
  o.propuesta_enviada_at,
  o.visita_programada_at,
  o.valor_estimado_eur,
  o.ahorro_anual_estimado,
  o.created_at,
  o.updated_at
FROM public.oportunidades o
JOIN public.empresas e ON e.id = o.empresa_id
WHERE o.deleted_at IS NULL
  AND o.responsable_actual_id = auth.uid();

COMMENT ON VIEW public.v_mis_oportunidades IS
  'Cada usuario ve solo las oportunidades de las que es responsable AHORA. Núcleo del producto multi-rol.';

-- ─────────────────────────────────────────────────────────────────────
-- 5. ALTER user_profiles
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS funciones text[] NOT NULL DEFAULT ARRAY[]::text[];

COMMENT ON COLUMN public.user_profiles.funciones IS
  'Funciones operativas del usuario. Valores: telemarketing | analista | asesor_senior | admin. Múltiples permitidas.';
