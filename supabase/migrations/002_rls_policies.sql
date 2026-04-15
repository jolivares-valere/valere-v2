-- ============================================================================
-- VALERE CRM · Migration 002 · RLS policies por rol
-- ============================================================================
-- Roles definidos en users_profile.rol:
--   admin       → SELECT/INSERT/UPDATE/DELETE en todo
--   jefe_equipo → SELECT/INSERT/UPDATE (sin filtro comercial); no DELETE
--   comercial   → SELECT/INSERT/UPDATE solo registros donde comercial_id=auth.uid()
--   visor       → SELECT donde deleted_at IS NULL; ningún write
-- ============================================================================

-- ─── Helper ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_rol() RETURNS text AS $$
  SELECT rol FROM users_profile WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─── users_profile ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS up_read ON users_profile;
CREATE POLICY up_read ON users_profile FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS up_self_update ON users_profile;
CREATE POLICY up_self_update ON users_profile FOR UPDATE TO authenticated
  USING (id = auth.uid() OR get_user_rol() = 'admin')
  WITH CHECK (id = auth.uid() OR get_user_rol() = 'admin');

DROP POLICY IF EXISTS up_admin_insert ON users_profile;
CREATE POLICY up_admin_insert ON users_profile FOR INSERT TO authenticated
  WITH CHECK (get_user_rol() = 'admin' OR id = auth.uid());

-- ─── empresas ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS e_read ON empresas;
CREATE POLICY e_read ON empresas FOR SELECT TO authenticated USING (
  deleted_at IS NULL AND (
    get_user_rol() IN ('admin','jefe_equipo','visor')
    OR comercial_id = auth.uid()
    OR created_by   = auth.uid()
  )
);

DROP POLICY IF EXISTS e_insert ON empresas;
CREATE POLICY e_insert ON empresas FOR INSERT TO authenticated
  WITH CHECK (get_user_rol() IN ('admin','jefe_equipo','comercial'));

DROP POLICY IF EXISTS e_update ON empresas;
CREATE POLICY e_update ON empresas FOR UPDATE TO authenticated
  USING (
    get_user_rol() IN ('admin','jefe_equipo')
    OR (get_user_rol() = 'comercial' AND comercial_id = auth.uid())
  )
  WITH CHECK (
    get_user_rol() IN ('admin','jefe_equipo')
    OR (get_user_rol() = 'comercial' AND comercial_id = auth.uid())
  );

DROP POLICY IF EXISTS e_delete ON empresas;
CREATE POLICY e_delete ON empresas FOR DELETE TO authenticated
  USING (get_user_rol() = 'admin');

-- ─── contactos (herencia desde empresa) ─────────────────────────────────────
DROP POLICY IF EXISTS co_read ON contactos;
CREATE POLICY co_read ON contactos FOR SELECT TO authenticated USING (
  deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM empresas e WHERE e.id = contactos.empresa_id
    AND (
      get_user_rol() IN ('admin','jefe_equipo','visor')
      OR e.comercial_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS co_write ON contactos;
CREATE POLICY co_write ON contactos FOR ALL TO authenticated
  USING (
    get_user_rol() IN ('admin','jefe_equipo','comercial')
    AND EXISTS (
      SELECT 1 FROM empresas e WHERE e.id = contactos.empresa_id
      AND (get_user_rol() IN ('admin','jefe_equipo') OR e.comercial_id = auth.uid())
    )
  )
  WITH CHECK (get_user_rol() IN ('admin','jefe_equipo','comercial'));

-- ─── contratos ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS c_read ON contratos;
CREATE POLICY c_read ON contratos FOR SELECT TO authenticated USING (
  deleted_at IS NULL AND (
    get_user_rol() IN ('admin','jefe_equipo','visor')
    OR comercial_id = auth.uid()
  )
);

DROP POLICY IF EXISTS c_insert ON contratos;
CREATE POLICY c_insert ON contratos FOR INSERT TO authenticated
  WITH CHECK (get_user_rol() IN ('admin','jefe_equipo','comercial'));

DROP POLICY IF EXISTS c_update ON contratos;
CREATE POLICY c_update ON contratos FOR UPDATE TO authenticated
  USING (
    get_user_rol() IN ('admin','jefe_equipo')
    OR (get_user_rol() = 'comercial' AND comercial_id = auth.uid())
  );

DROP POLICY IF EXISTS c_delete ON contratos;
CREATE POLICY c_delete ON contratos FOR DELETE TO authenticated
  USING (get_user_rol() = 'admin');

-- ─── cups (herencia desde contrato) ─────────────────────────────────────────
DROP POLICY IF EXISTS cu_all ON cups;
CREATE POLICY cu_all ON cups FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM contratos c WHERE c.id = cups.contrato_id
    AND (get_user_rol() IN ('admin','jefe_equipo','visor') OR c.comercial_id = auth.uid())
  ))
  WITH CHECK (get_user_rol() IN ('admin','jefe_equipo','comercial'));

-- ─── oportunidades ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS op_read ON oportunidades;
CREATE POLICY op_read ON oportunidades FOR SELECT TO authenticated USING (
  deleted_at IS NULL AND (
    get_user_rol() IN ('admin','jefe_equipo','visor')
    OR comercial_id = auth.uid()
  )
);

DROP POLICY IF EXISTS op_write ON oportunidades;
CREATE POLICY op_write ON oportunidades FOR ALL TO authenticated
  USING (
    get_user_rol() IN ('admin','jefe_equipo')
    OR (get_user_rol() = 'comercial' AND comercial_id = auth.uid())
  )
  WITH CHECK (get_user_rol() IN ('admin','jefe_equipo','comercial'));

-- ─── actividades ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS a_read ON actividades;
CREATE POLICY a_read ON actividades FOR SELECT TO authenticated USING (
  deleted_at IS NULL AND (
    get_user_rol() IN ('admin','jefe_equipo')
    OR usuario_id = auth.uid()
    OR asignado_a = auth.uid()
    OR privada = false
  )
);

DROP POLICY IF EXISTS a_write ON actividades;
CREATE POLICY a_write ON actividades FOR ALL TO authenticated
  USING (usuario_id = auth.uid() OR get_user_rol() IN ('admin','jefe_equipo'))
  WITH CHECK (get_user_rol() IN ('admin','jefe_equipo','comercial'));

-- ─── propuestas (herencia desde oportunidad) ────────────────────────────────
DROP POLICY IF EXISTS p_all ON propuestas;
CREATE POLICY p_all ON propuestas FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM oportunidades o WHERE o.id = propuestas.oportunidad_id
    AND (get_user_rol() IN ('admin','jefe_equipo','visor') OR o.comercial_id = auth.uid())
  ))
  WITH CHECK (get_user_rol() IN ('admin','jefe_equipo','comercial'));

-- ─── custom_fields_schema / values ──────────────────────────────────────────
DROP POLICY IF EXISTS cfs_read ON custom_fields_schema;
CREATE POLICY cfs_read ON custom_fields_schema FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS cfs_admin ON custom_fields_schema;
CREATE POLICY cfs_admin ON custom_fields_schema FOR ALL TO authenticated
  USING (get_user_rol() = 'admin') WITH CHECK (get_user_rol() = 'admin');

DROP POLICY IF EXISTS cfv_all ON custom_fields_values;
CREATE POLICY cfv_all ON custom_fields_values FOR ALL TO authenticated
  USING (get_user_rol() IN ('admin','jefe_equipo','comercial','visor'))
  WITH CHECK (get_user_rol() IN ('admin','jefe_equipo','comercial'));

-- ─── notificaciones ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS n_own ON notificaciones;
CREATE POLICY n_own ON notificaciones FOR ALL TO authenticated
  USING (usuario_id = auth.uid() OR get_user_rol() = 'admin')
  WITH CHECK (usuario_id = auth.uid() OR get_user_rol() = 'admin');