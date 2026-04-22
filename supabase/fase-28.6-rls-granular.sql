-- =====================================================================
-- FASE 28.6 — Limpieza y endurecimiento RLS granular (CORREGIDO)
-- Fecha: 2026-04-22
-- =====================================================================
-- Estado real confirmado en DB antes de esta migración:
--   · Helper existente: public.get_user_rol() (devuelve text)
--   · public.is_manager_or_above() NO existe → se crea aquí
--   · notificaciones: única policy "n_own" (ALL)
--   · custom_fields_schema: "cfs_admin" (ALL) + "cfs_read" (SELECT)
--   · custom_fields_values: "cfv_all" (ALL)
--   · Las policies cfs_*_authenticated y cfv_*_authenticated NO existen
-- Estrategia segura: CREAR nuevas policies ANTES de DROP de las antiguas
-- =====================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- BLOQUE 1: Crear helper is_manager_or_above()
-- Wrapper estable sobre get_user_rol() para que el resto del código
-- use un nombre semántico y no dependa de un literal de array.
-- SECURITY DEFINER + search_path fijo evita escalada de privilegios.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_manager_or_above()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_rol() = ANY (ARRAY['admin', 'master', 'manager'])
$$;

-- ─────────────────────────────────────────────────────────────────────
-- BLOQUE 2: notificaciones — policies granulares
-- La policy n_own (ALL) cubría SELECT/INSERT/UPDATE/DELETE con criterio:
--   usuario_id = auth.uid() OR get_user_rol() = 'admin'
-- Se divide en 4 policies; DELETE solo para managers (no para dueño).
-- Orden seguro: DROP nombres nuevos (idempotente) → CREATE nuevas
--               → DROP n_own antigua al final.
-- ─────────────────────────────────────────────────────────────────────

-- Limpieza idempotente de versiones previas de los nombres nuevos
DROP POLICY IF EXISTS notif_select ON public.notificaciones;
DROP POLICY IF EXISTS notif_insert ON public.notificaciones;
DROP POLICY IF EXISTS notif_update ON public.notificaciones;
DROP POLICY IF EXISTS notif_delete ON public.notificaciones;
-- Otros nombres alternativos que el script anterior pudo haber creado
DROP POLICY IF EXISTS notificaciones_all             ON public.notificaciones;
DROP POLICY IF EXISTS notificaciones_all_authenticated ON public.notificaciones;

-- SELECT: el propio usuario o cualquier manager/admin/master
CREATE POLICY notif_select ON public.notificaciones
  FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    OR public.is_manager_or_above()
  );

-- INSERT: el propio usuario o un manager actuando en su nombre
CREATE POLICY notif_insert ON public.notificaciones
  FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id = auth.uid()
    OR public.is_manager_or_above()
  );

-- UPDATE: el propio usuario o un manager
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

-- DELETE: solo managers+ (las notificaciones las borra el sistema/admin)
CREATE POLICY notif_delete ON public.notificaciones
  FOR DELETE TO authenticated
  USING (
    public.is_manager_or_above()
  );

-- Ahora sí: DROP de la única policy antigua (ya hay 4 sustitutos activos)
DROP POLICY IF EXISTS n_own ON public.notificaciones;

-- ─────────────────────────────────────────────────────────────────────
-- BLOQUE 3: custom_fields_schema — policies granulares
-- Estado actual: cfs_admin (ALL para admin/master/manager)
--                cfs_read  (SELECT true → todos los autenticados)
-- Se crean las 4 nuevas ANTES de hacer DROP de las antiguas.
-- ─────────────────────────────────────────────────────────────────────

-- Limpieza idempotente de versiones previas de los nombres nuevos
DROP POLICY IF EXISTS cfs_select_authenticated ON public.custom_fields_schema;
DROP POLICY IF EXISTS cfs_insert_authenticated ON public.custom_fields_schema;
DROP POLICY IF EXISTS cfs_update_authenticated ON public.custom_fields_schema;
DROP POLICY IF EXISTS cfs_delete_authenticated ON public.custom_fields_schema;

-- SELECT: todos los autenticados pueden leer el esquema (igual que cfs_read)
CREATE POLICY cfs_select_authenticated ON public.custom_fields_schema
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: solo admin/master/manager (igual que cfs_admin)
CREATE POLICY cfs_insert_authenticated ON public.custom_fields_schema
  FOR INSERT TO authenticated
  WITH CHECK (public.is_manager_or_above());

-- UPDATE: solo admin/master/manager
CREATE POLICY cfs_update_authenticated ON public.custom_fields_schema
  FOR UPDATE TO authenticated
  USING  (public.is_manager_or_above())
  WITH CHECK (public.is_manager_or_above());

-- DELETE: solo admin/master/manager
CREATE POLICY cfs_delete_authenticated ON public.custom_fields_schema
  FOR DELETE TO authenticated
  USING (public.is_manager_or_above());

-- Ahora sí: DROP de las policies antiguas (sustitutos ya activos)
DROP POLICY IF EXISTS cfs_admin ON public.custom_fields_schema;
DROP POLICY IF EXISTS cfs_read  ON public.custom_fields_schema;

-- ─────────────────────────────────────────────────────────────────────
-- BLOQUE 4: custom_fields_values — policies granulares
-- Estado actual: cfv_all (ALL para admin/master/manager/jefe_equipo/comercial)
-- Se mantiene el mismo conjunto de roles en las 4 policies nuevas.
-- ─────────────────────────────────────────────────────────────────────

-- Limpieza idempotente de versiones previas de los nombres nuevos
DROP POLICY IF EXISTS cfv_select_authenticated ON public.custom_fields_values;
DROP POLICY IF EXISTS cfv_insert_authenticated ON public.custom_fields_values;
DROP POLICY IF EXISTS cfv_update_authenticated ON public.custom_fields_values;
DROP POLICY IF EXISTS cfv_delete_authenticated ON public.custom_fields_values;

-- SELECT: los 5 roles operativos pueden leer valores
CREATE POLICY cfv_select_authenticated ON public.custom_fields_values
  FOR SELECT TO authenticated
  USING (
    public.get_user_rol() = ANY (ARRAY['admin','master','manager','jefe_equipo','comercial'])
  );

-- INSERT: mismos 5 roles
CREATE POLICY cfv_insert_authenticated ON public.custom_fields_values
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_rol() = ANY (ARRAY['admin','master','manager','jefe_equipo','comercial'])
  );

-- UPDATE: mismos 5 roles
CREATE POLICY cfv_update_authenticated ON public.custom_fields_values
  FOR UPDATE TO authenticated
  USING (
    public.get_user_rol() = ANY (ARRAY['admin','master','manager','jefe_equipo','comercial'])
  )
  WITH CHECK (
    public.get_user_rol() = ANY (ARRAY['admin','master','manager','jefe_equipo','comercial'])
  );

-- DELETE: mismos 5 roles
CREATE POLICY cfv_delete_authenticated ON public.custom_fields_values
  FOR DELETE TO authenticated
  USING (
    public.get_user_rol() = ANY (ARRAY['admin','master','manager','jefe_equipo','comercial'])
  );

-- Ahora sí: DROP de la única policy antigua (sustitutos ya activos)
DROP POLICY IF EXISTS cfv_all ON public.custom_fields_values;

-- ─────────────────────────────────────────────────────────────────────
-- BLOQUE 5: Reload schema PostgREST
-- NOTIFY se envía al hacer COMMIT (comportamiento estándar de Postgres)
-- ─────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ─────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN (ejecutar aparte tras el COMMIT)
-- Resultado esperado: 4+4+4 = 12 policies en las 3 tablas
-- ─────────────────────────────────────────────────────────────────────
SELECT
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('notificaciones', 'custom_fields_schema', 'custom_fields_values')
ORDER BY tablename, cmd, policyname;
