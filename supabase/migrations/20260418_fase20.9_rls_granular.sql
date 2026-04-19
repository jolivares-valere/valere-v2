-- =====================================================================
-- FASE 20.9 — RLS granular multitenant (por comercial_id)
-- ADVERTENCIA: NO APLICAR aún en producción.
--   Validar con Claude Code que is_manager_or_above() no causa
--   timeouts (EXPLAIN ANALYZE) antes de ejecutar.
-- =====================================================================

-- ============================================================
-- Helper: ¿es el usuario actual master o manager?
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_manager_or_above()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
      AND role IN ('master','manager')
  );
$$;

-- ============================================================
-- empresas
-- ============================================================
DROP POLICY IF EXISTS empresas_all_authenticated ON public.empresas;
DROP POLICY IF EXISTS empresas_select ON public.empresas;
DROP POLICY IF EXISTS empresas_insert ON public.empresas;
DROP POLICY IF EXISTS empresas_update ON public.empresas;
DROP POLICY IF EXISTS empresas_delete ON public.empresas;

CREATE POLICY empresas_select ON public.empresas
  FOR SELECT USING (
    public.is_manager_or_above()
    OR comercial_id = auth.uid()
  );
CREATE POLICY empresas_insert ON public.empresas
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY empresas_update ON public.empresas
  FOR UPDATE
  USING (public.is_manager_or_above() OR comercial_id = auth.uid())
  WITH CHECK (public.is_manager_or_above() OR comercial_id = auth.uid());
CREATE POLICY empresas_delete ON public.empresas
  FOR DELETE USING (public.is_manager_or_above() OR comercial_id = auth.uid());

-- ============================================================
-- contactos (via empresa_id)
-- ============================================================
DROP POLICY IF EXISTS contactos_all_authenticated ON public.contactos;
DROP POLICY IF EXISTS contactos_all ON public.contactos;

CREATE POLICY contactos_all ON public.contactos
  FOR ALL
  USING (
    public.is_manager_or_above()
    OR EXISTS (
      SELECT 1 FROM public.empresas e
      WHERE e.id = contactos.empresa_id AND e.comercial_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_manager_or_above()
    OR EXISTS (
      SELECT 1 FROM public.empresas e
      WHERE e.id = contactos.empresa_id AND e.comercial_id = auth.uid()
    )
  );

-- ============================================================
-- contratos
-- ============================================================
DROP POLICY IF EXISTS contratos_all_authenticated ON public.contratos;
DROP POLICY IF EXISTS contratos_all ON public.contratos;

CREATE POLICY contratos_all ON public.contratos
  FOR ALL
  USING (
    public.is_manager_or_above()
    OR comercial_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.empresas e
      WHERE e.id = contratos.empresa_id AND e.comercial_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_manager_or_above()
    OR comercial_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.empresas e
      WHERE e.id = contratos.empresa_id AND e.comercial_id = auth.uid()
    )
  );

-- ============================================================
-- oportunidades
-- ============================================================
DROP POLICY IF EXISTS oportunidades_all_authenticated ON public.oportunidades;
DROP POLICY IF EXISTS oportunidades_all ON public.oportunidades;

CREATE POLICY oportunidades_all ON public.oportunidades
  FOR ALL
  USING (
    public.is_manager_or_above()
    OR comercial_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.empresas e
      WHERE e.id = oportunidades.empresa_id AND e.comercial_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_manager_or_above()
    OR comercial_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.empresas e
      WHERE e.id = oportunidades.empresa_id AND e.comercial_id = auth.uid()
    )
  );

-- ============================================================
-- actividades (via usuario_id / asignado_a)
-- ============================================================
DROP POLICY IF EXISTS actividades_all_authenticated ON public.actividades;
DROP POLICY IF EXISTS actividades_all ON public.actividades;

CREATE POLICY actividades_all ON public.actividades
  FOR ALL
  USING (
    public.is_manager_or_above()
    OR usuario_id = auth.uid()
    OR asignado_a = auth.uid()
  )
  WITH CHECK (
    public.is_manager_or_above()
    OR usuario_id = auth.uid()
    OR asignado_a = auth.uid()
  );

-- ============================================================
-- propuestas (via empresa_id / creada_por)
-- ============================================================
DROP POLICY IF EXISTS propuestas_all_authenticated ON public.propuestas;
DROP POLICY IF EXISTS propuestas_all ON public.propuestas;

CREATE POLICY propuestas_all ON public.propuestas
  FOR ALL
  USING (
    public.is_manager_or_above()
    OR creada_por = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.empresas e
      WHERE e.id = propuestas.empresa_id AND e.comercial_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_manager_or_above()
    OR creada_por = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.empresas e
      WHERE e.id = propuestas.empresa_id AND e.comercial_id = auth.uid()
    )
  );

-- ============================================================
-- incidencias (via empresa_id / asignado_a / created_by)
-- ============================================================
DROP POLICY IF EXISTS incidencias_all_authenticated ON public.incidencias;
DROP POLICY IF EXISTS incidencias_all ON public.incidencias;

CREATE POLICY incidencias_all ON public.incidencias
  FOR ALL
  USING (
    public.is_manager_or_above()
    OR asignado_a = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.empresas e
      WHERE e.id = incidencias.empresa_id AND e.comercial_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_manager_or_above()
    OR asignado_a = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.empresas e
      WHERE e.id = incidencias.empresa_id AND e.comercial_id = auth.uid()
    )
  );

-- ============================================================
-- renovaciones (via empresa_id / asignado_a / created_by)
-- ============================================================
DROP POLICY IF EXISTS renovaciones_all_authenticated ON public.renovaciones;
DROP POLICY IF EXISTS renovaciones_all ON public.renovaciones;

CREATE POLICY renovaciones_all ON public.renovaciones
  FOR ALL
  USING (
    public.is_manager_or_above()
    OR asignado_a = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.empresas e
      WHERE e.id = renovaciones.empresa_id AND e.comercial_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_manager_or_above()
    OR asignado_a = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.empresas e
      WHERE e.id = renovaciones.empresa_id AND e.comercial_id = auth.uid()
    )
  );

-- ============================================================
-- documentos (via subido_por)
-- ============================================================
DROP POLICY IF EXISTS documentos_all_authenticated ON public.documentos;
DROP POLICY IF EXISTS documentos_all ON public.documentos;

CREATE POLICY documentos_all ON public.documentos
  FOR ALL
  USING (
    public.is_manager_or_above()
    OR subido_por = auth.uid()
  )
  WITH CHECK (
    public.is_manager_or_above()
    OR subido_por = auth.uid()
  );

-- ============================================================
-- cups (via empresa_id)
-- ============================================================
DROP POLICY IF EXISTS cups_all_authenticated ON public.cups;
DROP POLICY IF EXISTS cups_all ON public.cups;

CREATE POLICY cups_all ON public.cups
  FOR ALL
  USING (
    public.is_manager_or_above()
    OR EXISTS (
      SELECT 1 FROM public.empresas e
      WHERE e.id = cups.empresa_id AND e.comercial_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_manager_or_above()
    OR EXISTS (
      SELECT 1 FROM public.empresas e
      WHERE e.id = cups.empresa_id AND e.comercial_id = auth.uid()
    )
  );

-- ============================================================
-- facturas (antes invoice_history) — via supply_point_id → cups
-- ============================================================
DROP POLICY IF EXISTS facturas_all_authenticated ON public.facturas;
DROP POLICY IF EXISTS invoice_history_all_authenticated ON public.facturas;
DROP POLICY IF EXISTS facturas_all ON public.facturas;

CREATE POLICY facturas_all ON public.facturas
  FOR ALL
  USING (
    public.is_manager_or_above()
    OR EXISTS (
      SELECT 1 FROM public.cups c
      JOIN public.empresas e ON e.id = c.empresa_id
      WHERE c.id = facturas.supply_point_id
        AND e.comercial_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_manager_or_above()
    OR EXISTS (
      SELECT 1 FROM public.cups c
      JOIN public.empresas e ON e.id = c.empresa_id
      WHERE c.id = facturas.supply_point_id
        AND e.comercial_id = auth.uid()
    )
  );

-- ============================================================
-- Índices recomendados para rendimiento (si no existen ya)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_empresas_comercial_id ON public.empresas(comercial_id);
CREATE INDEX IF NOT EXISTS idx_cups_empresa_id ON public.cups(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contratos_comercial_id ON public.contratos(comercial_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_comercial_id ON public.oportunidades(comercial_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_empresa_id ON public.incidencias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_renovaciones_empresa_id ON public.renovaciones(empresa_id);
