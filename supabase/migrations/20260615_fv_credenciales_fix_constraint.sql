-- ═══════════════════════════════════════════════════════════════════════
-- Migración: fix guardado de credenciales FV
-- Fecha: 2026-06-15
--
-- PROBLEMA:
--   La constraint UNIQUE (plataforma, region_url, username) rechaza guardar
--   varias credenciales que reutilizan el mismo usuario instalador (caso real
--   y legítimo: 1 login de instalador → N propósitos/clientes). Además el
--   comportamiento era errático porque region_url entraba a veces como NULL
--   (NULL != NULL en UNIQUE → esas no colisionaban nunca).
--
-- DECISIÓN (con Juan, 2026-06-15): eliminar la constraint sobre campos de
--   negocio editables (la que menos problemas da a futuro). La integridad la
--   garantiza el id (PK). El duplicado accidental exacto se previene con un
--   aviso suave en la Edge Function, no con una constraint rígida.
--
-- ROLLBACK (si hiciera falta revertir):
--   ALTER TABLE public.fv_credenciales
--     ADD CONSTRAINT fv_credenciales_plataforma_region_username_key
--     UNIQUE (plataforma, region_url, username);
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Normalizar region_url existentes (nunca NULL) ──────────────────
-- Defaults espejo de PLATAFORMAS en CredencialFormModal.tsx
UPDATE public.fv_credenciales SET region_url = 'https://uni003eu5.fusionsolar.huawei.com'
  WHERE plataforma = 'fusionsolar' AND (region_url IS NULL OR region_url = '');
UPDATE public.fv_credenciales SET region_url = 'https://www.semsportal.com'
  WHERE plataforma = 'goodwe' AND (region_url IS NULL OR region_url = '');
UPDATE public.fv_credenciales SET region_url = 'https://www.isolarcloud.com'
  WHERE plataforma = 'isolarcloud' AND (region_url IS NULL OR region_url = '');
UPDATE public.fv_credenciales SET region_url = 'https://ennexos.sunnyportal.com'
  WHERE plataforma = 'sma_ennexos' AND (region_url IS NULL OR region_url = '');
UPDATE public.fv_credenciales SET region_url = 'https://monitoring.solaredge.com'
  WHERE plataforma = 'solaredge' AND (region_url IS NULL OR region_url = '');
-- 'otro' sin default conocido: dejar como esté (puede ser NULL legítimamente)

-- ── 2. Eliminar la constraint UNIQUE problemática ─────────────────────
ALTER TABLE public.fv_credenciales
  DROP CONSTRAINT IF EXISTS fv_credenciales_plataforma_region_username_key;

-- ── 3. Índice NO único para acelerar el chequeo de duplicados de la EF ─
CREATE INDEX IF NOT EXISTS idx_fv_credenciales_plataforma_username
  ON public.fv_credenciales (plataforma, username);

COMMENT ON INDEX public.idx_fv_credenciales_plataforma_username IS
  'Acelera el chequeo de duplicado informativo de la Edge Function fv-create-credential. NO es unico: se permite reutilizar el mismo login instalador.';
