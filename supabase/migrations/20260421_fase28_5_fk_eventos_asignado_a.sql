-- =====================================================================
-- FASE 28.5 — FK eventos.asignado_a → user_profiles (BUG 7)
-- =====================================================================
-- Detectado por Cowork en re-test 2026-04-21.
--
-- Síntoma: al entrar en /calendario, la consola muestra:
--   [ERROR] useEventosEnRango: Could not find a relationship between
--   'eventos' and 'user_profiles' in the schema cache [PGRST200]
--
-- Causa: la tabla `eventos` no tiene ningún FK. El hook hace un JOIN
-- PostgREST usando `!eventos_asignado_a_fkey` pero esa constraint
-- nunca se creó. Resultado: la query falla.
--
-- Fix: añadir el FK constraint con el nombre exacto que usa el código.
-- =====================================================================

ALTER TABLE public.eventos
  DROP CONSTRAINT IF EXISTS eventos_asignado_a_fkey;

ALTER TABLE public.eventos
  ADD CONSTRAINT eventos_asignado_a_fkey
  FOREIGN KEY (asignado_a) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- Forzar reload del schema cache de PostgREST.
NOTIFY pgrst, 'reload schema';
