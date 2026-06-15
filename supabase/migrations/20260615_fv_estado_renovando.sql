-- Fase 3: añadir estado 'renovando' a fv_credenciales.estado_sesion
-- Additivo y seguro. Permite que el CRM marque una credencial mientras el
-- usuario renueva las cookies con el Renovador local.
ALTER TABLE public.fv_credenciales
  DROP CONSTRAINT IF EXISTS fv_credenciales_estado_sesion_check;

ALTER TABLE public.fv_credenciales
  ADD CONSTRAINT fv_credenciales_estado_sesion_check
  CHECK (estado_sesion = ANY (ARRAY[
    'activa'::text, 'por_caducar'::text, 'caducada'::text,
    'error'::text, 'desconocida'::text, 'renovando'::text
  ]));
