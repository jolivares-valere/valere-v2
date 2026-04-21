-- =====================================================================
-- FASE 28.5 — FK eventos.usuario_id → user_profiles (BUG 7, corregido)
-- =====================================================================
-- Detectado por Cowork en re-test 2026-04-21.
--
-- Síntoma: al entrar en /calendario, la consola muestra:
--   [ERROR] useEventosEnRango: Could not find a relationship between
--   'eventos' and 'user_profiles' in the schema cache [PGRST200]
--
-- Diagnóstico (tras primer intento fallido):
--   La columna real en la tabla `eventos` es `usuario_id`, NO
--   `asignado_a` (confirmado por Cowork inspeccionando el schema real).
--   La primera versión de esta migration asumía `asignado_a` y falló con
--   "ERROR 42703: column does not exist". Se corrige el nombre.
--
-- Además, se alinea el frontend: renombrar `asignado_a` → `usuario_id`
-- en la interface Evento, en el hook useEventosEnRango y en EventoForm
-- (commit aparte).
-- =====================================================================

ALTER TABLE public.eventos
  DROP CONSTRAINT IF EXISTS eventos_usuario_id_fkey;

ALTER TABLE public.eventos
  ADD CONSTRAINT eventos_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- Forzar reload del schema cache de PostgREST.
NOTIFY pgrst, 'reload schema';
