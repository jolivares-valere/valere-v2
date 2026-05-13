-- =====================================================================
-- FASE 28.6 — Limpieza y endurecimiento RLS
-- ESTADO: APLICADO MANUALMENTE vía MCP el 2026-05-13
--   Registrado en supabase_migrations como 'fase28_6_rls_policies_cleanup'.
--   NO re-ejecutar con supabase db push — ya está en producción.
-- =====================================================================
--
-- Cierra dos pendientes identificados en auditorías previas:
--
--   (1) notificaciones: hoy tiene una policy FOR ALL permisiva que deja
--       a cualquier usuario authenticated ver/modificar las notificaciones
--       de cualquier otro. Debería ser solo del destinatario (+ master/
--       manager para debug). Granularizar en 3 policies (SELECT/UPDATE/
--       DELETE — no hay INSERT desde cliente, lo genera el trigger).
--
--   (2) custom_fields_schema y custom_fields_values: conviven dos sets
--       de policies — las antiguas cfs_admin/cfv_admin creadas antes de
--       FASE 28.2, y las nuevas cfs_*_authenticated/cfv_*_authenticated.
--       Las nuevas ya cubren todo el CRUD para authenticated (FASE 28.2
--       líneas 34-67). Dejar solo las nuevas.
--
-- Idempotente. Seguro ejecutar varias veces.
-- Depende de la función is_manager_or_above() creada en fase20.9.
-- =====================================================================

-- ---------------------------------------------------------------------
-- (1) notificaciones — policies granulares
-- ---------------------------------------------------------------------

-- Eliminar policies existentes para empezar limpio.
DROP POLICY IF EXISTS notificaciones_all ON public.notificaciones;
DROP POLICY IF EXISTS notificaciones_all_authenticated ON public.notificaciones;
DROP POLICY IF EXISTS notif_select ON public.notificaciones;
DROP POLICY IF EXISTS notif_update ON public.notificaciones;
DROP POLICY IF EXISTS notif_delete ON public.notificaciones;
DROP POLICY IF EXISTS notif_insert ON public.notificaciones;

-- SELECT: el destinatario o master/manager.
CREATE POLICY notif_select ON public.notificaciones
  FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    OR public.is_manager_or_above()
  );

-- UPDATE: solo el destinatario (p.ej. para marcar como leída).
-- master/manager también para debug.
CREATE POLICY notif_update ON public.notificaciones
  FOR UPDATE TO authenticated
  USING (
    usuario_id = auth.uid()
    OR public.is_manager_or_above()
  )
  WITH CHECK (
    usuario_id = auth.uid()
    OR public.is_manager_or_above()
  );

-- DELETE: solo master/manager. Los comerciales no deberían borrar
-- notificaciones — las marcan como leídas.
CREATE POLICY notif_delete ON public.notificaciones
  FOR DELETE TO authenticated
  USING (public.is_manager_or_above());

-- INSERT: las notificaciones se generan server-side (triggers /
-- funciones SQL). No debería haber INSERT directo desde el cliente.
-- Se deja sin policy de INSERT → solo rol service_role puede insertar.

-- ---------------------------------------------------------------------
-- (2) custom_fields_schema — eliminar policies duplicadas antiguas
-- ---------------------------------------------------------------------

-- Las nuevas policies cfs_*_authenticated cubren SELECT/INSERT/UPDATE/DELETE
-- para todos los authenticated (suficiente por ahora; admin-only podría
-- ser fase siguiente si se quiere restringir qué usuarios definen campos).

DROP POLICY IF EXISTS cfs_admin ON public.custom_fields_schema;
DROP POLICY IF EXISTS cfs_read ON public.custom_fields_schema;

-- ---------------------------------------------------------------------
-- (3) custom_fields_values — eliminar policy duplicada antigua
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS cfv_all ON public.custom_fields_values;

-- ---------------------------------------------------------------------
-- (4) Verificación final (opcional, descomentar si se quiere ver el
--     estado post-aplicación en el mismo execution)
-- ---------------------------------------------------------------------

-- SELECT tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('notificaciones', 'custom_fields_schema', 'custom_fields_values')
-- ORDER BY tablename, cmd;

-- Esperado tras aplicar:
--   notificaciones: notif_select (SELECT), notif_update (UPDATE), notif_delete (DELETE)
--   custom_fields_schema: 4 policies *_authenticated (SELECT/INSERT/UPDATE/DELETE)
--   custom_fields_values: 4 policies *_authenticated (SELECT/INSERT/UPDATE/DELETE)

NOTIFY pgrst, 'reload schema';
