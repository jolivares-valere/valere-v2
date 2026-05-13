-- ═══════════════════════════════════════════════════════════════════════
-- Migración: alta manual de credenciales FV + separación de secretos
-- Fecha: 2026-05-10
--
-- MODELO DE SEGURIDAD:
--   fv_credenciales         → datos operativos (admin/master pueden leer)
--   fv_credenciales_secret  → secretos (SOLO service_role — Python + Edge Functions)
--
-- El role 'authenticated' NUNCA puede leer fv_credenciales_secret.
-- Aunque fallen las RLS de la tabla pública, los secretos están en otra tabla.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. fv_credenciales: tabla pública — sin secretos ─────────────────
-- Añadir campo nombre (display name corto en el CRM)
ALTER TABLE public.fv_credenciales
  ADD COLUMN IF NOT EXISTS nombre TEXT;

UPDATE public.fv_credenciales
SET nombre = COALESCE(descripcion, username)
WHERE nombre IS NULL;

-- username_masked: generado automáticamente para mostrar en UI
-- Ej: "jolivares@fusionsolar.eu" → "jo**********eu"
ALTER TABLE public.fv_credenciales
  ADD COLUMN IF NOT EXISTS username_masked TEXT
    GENERATED ALWAYS AS (
      CASE
        WHEN position('@' IN username) > 0 THEN
          left(username, 2) || repeat('*', greatest(length(split_part(username, '@', 1)) - 2, 0))
          || '@' || split_part(username, '@', 2)
        WHEN length(username) > 4 THEN
          left(username, 2) || repeat('*', length(username) - 4) || right(username, 2)
        ELSE repeat('*', length(username))
      END
    ) STORED;

-- Ampliar check de plataforma
ALTER TABLE public.fv_credenciales
  DROP CONSTRAINT IF EXISTS fv_credenciales_plataforma_check;

ALTER TABLE public.fv_credenciales
  ADD CONSTRAINT fv_credenciales_plataforma_check
  CHECK (plataforma IN ('fusionsolar', 'goodwe', 'isolarcloud', 'sma_ennexos', 'solaredge', 'otro'));

-- ── 2. fv_credenciales_secret: tabla de secretos — SOLO service_role ─
CREATE TABLE IF NOT EXISTS public.fv_credenciales_secret (
  credencial_id     UUID PRIMARY KEY REFERENCES public.fv_credenciales(id) ON DELETE CASCADE,
  password_enc      TEXT NOT NULL,        -- AES-256-GCM cifrado por Edge Function
  session_cookies   TEXT,                 -- cookies de sesión cifradas por conector Python
  cookies_expires_at TIMESTAMPTZ,
  cookies_updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.fv_credenciales_secret IS
  'Secretos de credenciales FV. Acceso SOLO vía service_role (Edge Functions + Python). NUNCA desde frontend.';
COMMENT ON COLUMN public.fv_credenciales_secret.password_enc IS
  'AES-256-GCM. Cifrado por Edge Function fv-create-credential. Formato: AES256GCM:v1:<iv_b64>:<ct_b64>';
COMMENT ON COLUMN public.fv_credenciales_secret.session_cookies IS
  'Cookies de sesión extraídas por el conector Python (Playwright). Cifradas con la misma clave AES.';

-- RLS en la tabla de secretos: NINGUNA policy para authenticated
-- Solo service_role (que bypassa RLS) puede acceder
ALTER TABLE public.fv_credenciales_secret ENABLE ROW LEVEL SECURITY;
-- Sin políticas = nadie autenticado puede leer/escribir — solo service_role bypassa

-- Revocación explícita de permisos de tabla (defense in depth)
REVOKE ALL ON public.fv_credenciales_secret FROM authenticated, anon;

-- ── 3. Migrar datos existentes a la tabla de secretos ─────────────────
-- Mover password_enc y session_cookies de fv_credenciales a fv_credenciales_secret
INSERT INTO public.fv_credenciales_secret (credencial_id, password_enc, session_cookies, cookies_expires_at)
SELECT
  id,
  COALESCE(password_enc, 'PENDING_ENCRYPT'),  -- placeholder si no hay valor
  session_cookies,
  cookies_expires_at
FROM public.fv_credenciales
ON CONFLICT (credencial_id) DO NOTHING;

-- Eliminar columnas sensibles de fv_credenciales (ya están en fv_credenciales_secret)
ALTER TABLE public.fv_credenciales
  DROP COLUMN IF EXISTS password_enc,
  DROP COLUMN IF EXISTS session_cookies,
  DROP COLUMN IF EXISTS cookies_expires_at;   -- se queda en secret

-- ── 4. fv_planta: ajustes para alta manual ───────────────────────────
-- empresa_id nullable (plantas detectadas antes de ser asignadas)
ALTER TABLE public.fv_planta
  ALTER COLUMN empresa_id DROP NOT NULL;

-- cups_id: vinculación opcional al CUPS del CRM
ALTER TABLE public.fv_planta
  ADD COLUMN IF NOT EXISTS cups_id UUID REFERENCES public.cups(id) ON DELETE SET NULL;

-- sync_enabled: desactivar sync por planta si es necesario
ALTER TABLE public.fv_planta
  ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN NOT NULL DEFAULT true;

-- nombre_fusionsolar: nombre original del portal (no editar)
ALTER TABLE public.fv_planta
  ADD COLUMN IF NOT EXISTS nombre_fusionsolar TEXT;

-- nombre_interno: nombre editable desde el CRM (prioridad en UI)
ALTER TABLE public.fv_planta
  ADD COLUMN IF NOT EXISTS nombre_interno TEXT;

UPDATE public.fv_planta
SET nombre_fusionsolar = nombre
WHERE nombre_fusionsolar IS NULL;

-- ── 5. RLS fv_credenciales (tabla pública — sin secretos) ────────────
-- Solo admin/master puede leer filas de credenciales
-- (Los secretos están en otra tabla; aunque esta policy falle, no expone passwords)
DROP POLICY IF EXISTS "fv_credenciales_admin_select"  ON public.fv_credenciales;
DROP POLICY IF EXISTS "fv_credenciales_admin_write"   ON public.fv_credenciales;

CREATE POLICY "fv_credenciales_admin_select"
  ON public.fv_credenciales FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'master')
    )
  );

-- INSERT/UPDATE/DELETE en fv_credenciales: también solo admin/master
-- Pero password_enc ya no existe aquí — los secretos van a fv_credenciales_secret
-- a través de la Edge Function (que usa service_role)
CREATE POLICY "fv_credenciales_admin_write"
  ON public.fv_credenciales FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'master')
    )
  );

CREATE POLICY "fv_credenciales_admin_update"
  ON public.fv_credenciales FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'master')
    )
  );

-- ── 6. RLS fv_planta: plantas sin empresa visible solo para admin ─────
DROP POLICY IF EXISTS "fv_planta_sin_asignar_admin" ON public.fv_planta;
CREATE POLICY "fv_planta_sin_asignar_admin"
  ON public.fv_planta FOR SELECT
  TO authenticated
  USING (
    empresa_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'master')
    )
  );

-- ── 7. Comentarios ───────────────────────────────────────────────────
COMMENT ON COLUMN public.fv_credenciales.nombre IS 'Nombre descriptivo para el CRM (ej: "FusionSolar Instalador Valere")';
COMMENT ON COLUMN public.fv_credenciales.username_masked IS 'Username parcialmente oculto para mostrar en UI. Generado automáticamente.';
COMMENT ON COLUMN public.fv_planta.cups_id IS 'CUPS vinculado a esta planta (nullable — asignación manual desde CRM)';
COMMENT ON COLUMN public.fv_planta.sync_enabled IS 'false = conector Python ignora esta planta en el sync';
COMMENT ON COLUMN public.fv_planta.empresa_id IS 'NULL = detectada por sync pero sin cliente asignado en CRM';
