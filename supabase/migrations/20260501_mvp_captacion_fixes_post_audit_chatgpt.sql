-- =====================================================================
-- Fixes post-audit ChatGPT al schema MVP Captación multi-rol
-- (1 mayo 2026 noche)
--
-- Aplicada en producción gtphkowfcuiqbvfkwjxb por Cowork 2026-05-01 vía MCP.
--
-- Tres correcciones detectadas en auditoría externa de ChatGPT:
--
-- FIX 1: oportunidad_handoffs.to_user_id era NOT NULL + ON DELETE SET NULL
--   → contradictorio (Postgres lo acepta pero al borrar user fallaría runtime).
--   → Cambio a ON DELETE RESTRICT (mantener integridad histórica handoffs).
--
-- FIX 2: v_mis_oportunidades sin SECURITY INVOKER explícito.
--   → Buena práctica Supabase: WITH (security_invoker = true) para que
--     filtrado RLS use el rol del consumidor, no del creador. Crítico para
--     futuro portal cliente.
--
-- FIX 3: Catálogo motivo_perdida no aplicado (estaba documentado en RELEASE_1
--   pero la migration MVP no lo incluyó — inconsistencia documental señalada).
--   → Aplicar ENUM motivo_perdida_enum + columna motivo_perdida_codigo (aditiva).
--   → SIN trigger obligatorio (lo gestionará UI/backend cuando llegue).
--   → Vista helper v_motivos_perdida_familia para análisis 4 familias.
--
-- Verificación post-aplicación (vía test handoff con rollback):
--   - confdeltype = 'r' (RESTRICT) ✓
--   - reloptions = 'security_invoker=true' ✓
--   - typname = 'motivo_perdida_enum' ✓
--   - 2 columnas + 1 vista nuevas ✓
--   - trigger handoff_apply funciona end-to-end ✓
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- FIX 1: oportunidad_handoffs.to_user_id ON DELETE RESTRICT
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.oportunidad_handoffs
  DROP CONSTRAINT IF EXISTS oportunidad_handoffs_to_user_id_fkey;

ALTER TABLE public.oportunidad_handoffs
  ADD CONSTRAINT oportunidad_handoffs_to_user_id_fkey
  FOREIGN KEY (to_user_id) REFERENCES public.user_profiles(id) ON DELETE RESTRICT;

-- ─────────────────────────────────────────────────────────────────────
-- FIX 2: v_mis_oportunidades con security_invoker
-- ─────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS public.v_mis_oportunidades;

CREATE VIEW public.v_mis_oportunidades
WITH (security_invoker = true) AS
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

GRANT SELECT ON public.v_mis_oportunidades TO authenticated;

COMMENT ON VIEW public.v_mis_oportunidades IS
  'Cada usuario ve solo las oportunidades de las que es responsable AHORA. Núcleo del producto multi-rol. SECURITY INVOKER: respeta RLS del rol consumidor (preparado para portal cliente futuro).';

-- ─────────────────────────────────────────────────────────────────────
-- FIX 3: Catálogo motivo_perdida estructurado
-- ─────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.motivo_perdida_enum AS ENUM (
    -- Familia A — Problema de contacto
    'no_contesta', 'buzon_repetido', 'numero_erroneo',
    'no_es_decisor', 'decisor_no_disponible',
    -- Familia B — Cliente con estatus comercial
    'ya_tiene_consultor', 'acaba_de_renovar',
    'satisfecho_comercializadora', 'no_quiere_mover',
    -- Familia C — Bloqueo en el funnel
    'no_envia_factura', 'no_autoriza_datadis',
    'precio_insuficiente', 'contrato_con_penalizacion',
    -- Familia D — Fuera de perfil / razones externas
    'empresa_fuera_perfil', 'insolvente', 'cierre_empresa',
    'lista_robinson', 'rgpd_eliminacion',
    'sector_excluido', 'geografia_excluida',
    'otro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS motivo_perdida_codigo public.motivo_perdida_enum,
  ADD COLUMN IF NOT EXISTS motivo_perdida_detalle text;

COMMENT ON COLUMN public.oportunidades.motivo_perdida_codigo IS
  'Catálogo cerrado de motivos de pérdida (FASE R1 simulación). Permite análisis a 60 días por familia (contacto/estatus/funnel/fuera_perfil). El campo motivo_perdida text legacy se mantiene por compatibilidad — eliminar tras migración UI.';

COMMENT ON COLUMN public.oportunidades.motivo_perdida_detalle IS
  'Texto libre adicional al codigo. Ejemplo: codigo=ya_tiene_consultor, detalle="trabaja con SegeNet desde 2023".';

-- Vista helper para análisis 60 días por familia
CREATE OR REPLACE VIEW public.v_motivos_perdida_familia
WITH (security_invoker = true) AS
SELECT
  o.id,
  o.empresa_id,
  o.motivo_perdida_codigo,
  CASE
    WHEN o.motivo_perdida_codigo IN ('no_contesta','buzon_repetido','numero_erroneo','no_es_decisor','decisor_no_disponible') THEN 'A_contacto'
    WHEN o.motivo_perdida_codigo IN ('ya_tiene_consultor','acaba_de_renovar','satisfecho_comercializadora','no_quiere_mover') THEN 'B_estatus'
    WHEN o.motivo_perdida_codigo IN ('no_envia_factura','no_autoriza_datadis','precio_insuficiente','contrato_con_penalizacion') THEN 'C_funnel'
    WHEN o.motivo_perdida_codigo IN ('empresa_fuera_perfil','insolvente','cierre_empresa','lista_robinson','rgpd_eliminacion','sector_excluido','geografia_excluida') THEN 'D_fuera_perfil'
    ELSE 'sin_clasificar'
  END AS familia,
  o.motivo_perdida_detalle,
  o.updated_at AS cerrada_at
FROM public.oportunidades o
WHERE o.deleted_at IS NULL
  AND o.etapa IN ('cerrada_perdida','perdida','cancelada');

COMMENT ON VIEW public.v_motivos_perdida_familia IS
  'Agrupa motivos de pérdida en 4 familias para análisis del cuello de botella real (contacto/estatus/funnel/fuera_perfil). Vista helper para dashboards post-MVP.';

GRANT SELECT ON public.v_motivos_perdida_familia TO authenticated;
