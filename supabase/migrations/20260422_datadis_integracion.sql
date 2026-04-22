-- ============================================================
-- MIGRACIÓN: Integración Datadis
-- Fecha: 2026-04-22
-- Descripción:
--   1. Añade columnas datadis_* a la tabla cups
--   2. Crea tabla datadis_tokens (credenciales por empresa)
--   3. Crea tabla datadis_consumptions (consumos horarios)
--   4. RLS granular en las tablas nuevas
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. COLUMNAS DATADIS EN TABLA cups
-- ─────────────────────────────────────────────
ALTER TABLE public.cups
  ADD COLUMN IF NOT EXISTS datadis_sincronizado   BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS datadis_ultima_sync    TIMESTAMPTZ  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS datadis_distribuidor_cod TEXT        DEFAULT NULL,
  -- Código numérico 1-8 que usa la API de Datadis para identificar el distribuidor
  -- 1=Endesa, 2=Iberdrola, 3=UFD, 4=E-REDES (EDP), 5=Naturgy Distribución,
  -- 6=Viesgo, 7=Axpo Iberia, 8=Redes Distribución Eléctrica
  ADD COLUMN IF NOT EXISTS datadis_punto_tipo     INTEGER      DEFAULT NULL;
  -- pointType: 1 = cuarto-horario (contador inteligente), 2 = cierre mensual

-- ─────────────────────────────────────────────
-- 2. TABLA datadis_tokens
--    Una fila por empresa con las credenciales
--    del titular del CUPS en Datadis.
--    Nota: password se almacena cifrado por la
--    Edge Function (no en texto plano).
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.datadis_tokens (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID        NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  username      TEXT        NOT NULL,          -- NIF/NIE/CIF del titular en Datadis
  password_enc  TEXT        NOT NULL,          -- Contraseña cifrada (AES-256 via Edge Fn)
  autorizado    BOOLEAN     NOT NULL DEFAULT false,
  token_cache   TEXT        DEFAULT NULL,      -- JWT Datadis en caché (vida corta)
  token_expira  TIMESTAMPTZ DEFAULT NULL,
  ultimo_error  TEXT        DEFAULT NULL,      -- Último mensaje de error de la API
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id)                          -- Una sola integración por empresa
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_datadis_tokens_updated_at'
  ) THEN
    CREATE TRIGGER trg_datadis_tokens_updated_at
      BEFORE UPDATE ON public.datadis_tokens
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 3. TABLA datadis_consumptions
--    Consumos horarios descargados de Datadis.
--    Granularidad: 1 fila por hora por CUPS.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.datadis_consumptions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cups_id         UUID        NOT NULL REFERENCES public.cups(id) ON DELETE CASCADE,
  fecha           DATE        NOT NULL,
  hora            SMALLINT    NOT NULL CHECK (hora BETWEEN 0 AND 23),
  consumo_kwh     NUMERIC(10,4) NOT NULL DEFAULT 0,
  excedente_kwh   NUMERIC(10,4) NOT NULL DEFAULT 0,
  metodo_obtencion TEXT       NOT NULL DEFAULT 'real',
  -- 'real' = medida real del contador
  -- 'estimada' = estimación del distribuidor
  origen          TEXT        NOT NULL DEFAULT 'datadis',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cups_id, fecha, hora)               -- Evita duplicados en resincronización
);

-- Índice para consultas por rango de fechas (el más habitual)
CREATE INDEX IF NOT EXISTS idx_datadis_consumptions_cups_fecha
  ON public.datadis_consumptions (cups_id, fecha);

-- ─────────────────────────────────────────────
-- 4. RLS — datadis_tokens
-- ─────────────────────────────────────────────
ALTER TABLE public.datadis_tokens ENABLE ROW LEVEL SECURITY;

-- SELECT: el comercial asignado a la empresa O master/manager
CREATE POLICY IF NOT EXISTS "datadis_tokens_select"
  ON public.datadis_tokens FOR SELECT
  TO authenticated
  USING (
    get_user_rol() = 'admin'
    OR empresa_id IN (
      SELECT id FROM public.empresas
      WHERE comercial_id = auth.uid()
    )
  );

-- INSERT: solo admin (master/manager configura la integración)
CREATE POLICY IF NOT EXISTS "datadis_tokens_insert"
  ON public.datadis_tokens FOR INSERT
  TO authenticated
  WITH CHECK (get_user_rol() = 'admin');

-- UPDATE: solo admin
CREATE POLICY IF NOT EXISTS "datadis_tokens_update"
  ON public.datadis_tokens FOR UPDATE
  TO authenticated
  USING (get_user_rol() = 'admin')
  WITH CHECK (get_user_rol() = 'admin');

-- DELETE: solo admin
CREATE POLICY IF NOT EXISTS "datadis_tokens_delete"
  ON public.datadis_tokens FOR DELETE
  TO authenticated
  USING (get_user_rol() = 'admin');

-- ─────────────────────────────────────────────
-- 5. RLS — datadis_consumptions
-- ─────────────────────────────────────────────
ALTER TABLE public.datadis_consumptions ENABLE ROW LEVEL SECURITY;

-- SELECT: a través de la empresa del CUPS
CREATE POLICY IF NOT EXISTS "datadis_consumptions_select"
  ON public.datadis_consumptions FOR SELECT
  TO authenticated
  USING (
    get_user_rol() = 'admin'
    OR cups_id IN (
      SELECT c.id FROM public.cups c
      JOIN public.empresas e ON e.id = c.empresa_id
      WHERE e.comercial_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: solo admin (la sincronización la hace la Edge Function con service_role)
CREATE POLICY IF NOT EXISTS "datadis_consumptions_insert"
  ON public.datadis_consumptions FOR INSERT
  TO authenticated
  WITH CHECK (get_user_rol() = 'admin');

CREATE POLICY IF NOT EXISTS "datadis_consumptions_update"
  ON public.datadis_consumptions FOR UPDATE
  TO authenticated
  USING (get_user_rol() = 'admin')
  WITH CHECK (get_user_rol() = 'admin');

CREATE POLICY IF NOT EXISTS "datadis_consumptions_delete"
  ON public.datadis_consumptions FOR DELETE
  TO authenticated
  USING (get_user_rol() = 'admin');
