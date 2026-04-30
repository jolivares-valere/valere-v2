-- ═══════════════════════════════════════════════════════════════════════
-- Migración: rediseño schema FV para soportar credenciales multi-cliente
-- Contexto del problema:
--   - Un instalador (ej. JOLIVARES) puede ver plantas de múltiples clientes
--   - Un cliente puede tener sus propias credenciales que solapan con las del instalador
--   - La misma planta física NO debe duplicarse en fv_planta
--   - El nombre en FusionSolar puede no coincidir con el nombre que usa Valere
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. fv_credenciales: añadir descripción y tipo ─────────────────────
ALTER TABLE public.fv_credenciales
  ADD COLUMN IF NOT EXISTS descripcion TEXT,
  ADD COLUMN IF NOT EXISTS tipo TEXT
    CHECK (tipo IN (
      'instalador_multicliente',  -- un instalador que ve plantas de varios clientes
      'cliente_monoplanta',       -- el propio cliente, solo ve su planta
      'cliente_multiplanta'       -- el propio cliente, ve varias de sus plantas
    ));

-- Etiquetar la credencial JOLIVARES existente
UPDATE public.fv_credenciales
SET descripcion = 'Instalador JOLIVARES — acceso a FOAM, PAZ Y BIEN, JUAN RUBIO',
    tipo        = 'instalador_multicliente'
WHERE id = '21923524-cbb1-4b5c-b816-7df1611d8d12';

-- La constraint actual (empresa_id, plataforma, username) es incorrecta
-- para multi-cliente porque empresa_id es NULL y NULL != NULL en UNIQUE.
-- Sustituimos por (plataforma, region_url, username) que es la identidad real.
ALTER TABLE public.fv_credenciales
  DROP CONSTRAINT IF EXISTS fv_credenciales_empresa_id_plataforma_username_key;

ALTER TABLE public.fv_credenciales
  ADD CONSTRAINT fv_credenciales_plataforma_region_username_key
  UNIQUE (plataforma, region_url, username);


-- ── 2. fv_planta: un registro por planta física ───────────────────────
-- Añadir nombre_interno (el nombre que usa Valere) y nombre_fusionsolar (el del API)
ALTER TABLE public.fv_planta
  ADD COLUMN IF NOT EXISTS nombre_interno      TEXT,   -- editable desde el CRM
  ADD COLUMN IF NOT EXISTS nombre_fusionsolar  TEXT;   -- tal como llega del sync (no editar)

-- Poblar nombre_fusionsolar con el nombre actual antes de cambiar la semántica
UPDATE public.fv_planta
SET nombre_fusionsolar = nombre
WHERE nombre_fusionsolar IS NULL;

-- Quitar constraint incorrecta (empresa_id, plataforma, station_code)
-- que permite la misma planta con empresa NULL y empresa X
ALTER TABLE public.fv_planta
  DROP CONSTRAINT IF EXISTS fv_planta_empresa_id_plataforma_station_code_key;

-- Nueva constraint: la planta es única por (plataforma, region_url, station_code)
-- que es su identidad física en la plataforma, independiente del cliente.
-- region_url distingue si algún día hay portales FusionSolar distintos (EU3, EU5, etc.)
ALTER TABLE public.fv_planta
  ADD COLUMN IF NOT EXISTS region_url TEXT;

-- Copiar region_url desde la credencial asociada
UPDATE public.fv_planta p
SET region_url = c.region_url
FROM public.fv_credenciales c
WHERE c.id = p.credencial_id AND p.region_url IS NULL;

-- Default para las que no tengan credencial
UPDATE public.fv_planta
SET region_url = 'https://uni003eu5.fusionsolar.huawei.com'
WHERE region_url IS NULL;

ALTER TABLE public.fv_planta
  ADD CONSTRAINT fv_planta_plataforma_region_station_code_key
  UNIQUE (plataforma, region_url, station_code);


-- ── 3. fv_planta_credencial: tabla de relación N:M ───────────────────
-- Una planta puede ser visible desde múltiples credenciales (instalador + cliente).
-- Esto permite saber qué credenciales dan acceso a cada planta.
CREATE TABLE IF NOT EXISTS public.fv_planta_credencial (
  planta_id     UUID NOT NULL REFERENCES public.fv_planta(id)      ON DELETE CASCADE,
  credencial_id UUID NOT NULL REFERENCES public.fv_credenciales(id) ON DELETE CASCADE,
  primera_vez   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (planta_id, credencial_id)
);

COMMENT ON TABLE public.fv_planta_credencial IS
  'Qué credenciales dan acceso a qué plantas. Una planta puede aparecer en varias cuentas.';

-- Poblar con los vínculos actuales
INSERT INTO public.fv_planta_credencial (planta_id, credencial_id)
SELECT id, credencial_id
FROM public.fv_planta
WHERE credencial_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE public.fv_planta_credencial ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fv_planta_cred_admin_only"
  ON public.fv_planta_credencial FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );


-- ── 4. Regla: el sync no sobreescribe empresa_id si ya está asignada ──
-- Función helper que el sync_job puede llamar para hacer upsert seguro.
-- Inserta si no existe; si existe, actualiza todo EXCEPTO empresa_id cuando
-- ya tiene valor (protege las asignaciones manuales desde el CRM).
CREATE OR REPLACE FUNCTION public.fv_upsert_planta(
  p_plataforma     TEXT,
  p_region_url     TEXT,
  p_station_code   TEXT,
  p_credencial_id  UUID,
  p_nombre         TEXT,
  p_pais           TEXT,
  p_capacidad_kwp  NUMERIC,
  p_tiene_bateria  BOOLEAN,
  p_fecha_conexion TEXT,
  p_estado         TEXT,
  p_empresa_id     UUID DEFAULT NULL
)
RETURNS TABLE(id UUID, empresa_id UUID, is_new BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id         UUID;
  v_empresa_id UUID;
  v_is_new     BOOLEAN := FALSE;
BEGIN
  -- Buscar planta existente por identidad física
  SELECT p.id, p.empresa_id
  INTO v_id, v_empresa_id
  FROM public.fv_planta p
  WHERE p.plataforma   = p_plataforma
    AND p.region_url   = p_region_url
    AND p.station_code = p_station_code;

  IF NOT FOUND THEN
    -- Nueva planta: insertar con empresa_id del parámetro
    INSERT INTO public.fv_planta (
      plataforma, region_url, station_code, credencial_id,
      nombre, nombre_fusionsolar, pais, capacidad_kwp,
      tiene_bateria, fecha_conexion, estado, empresa_id
    ) VALUES (
      p_plataforma, p_region_url, p_station_code, p_credencial_id,
      p_nombre, p_nombre, p_pais, p_capacidad_kwp,
      p_tiene_bateria, p_fecha_conexion::DATE, p_estado, p_empresa_id
    )
    RETURNING fv_planta.id, fv_planta.empresa_id INTO v_id, v_empresa_id;
    v_is_new := TRUE;
  ELSE
    -- Planta existente: actualizar datos técnicos pero NO empresa_id si ya tiene valor
    UPDATE public.fv_planta SET
      nombre_fusionsolar = p_nombre,  -- siempre actualizar nombre del sistema
      nombre             = COALESCE(nombre_interno, p_nombre),  -- nombre interno tiene prioridad
      capacidad_kwp      = COALESCE(p_capacidad_kwp, capacidad_kwp),
      tiene_bateria      = p_tiene_bateria,
      estado             = p_estado,
      actualizado_en     = now(),
      -- empresa_id: solo asignar si aún no tiene valor
      empresa_id         = CASE WHEN empresa_id IS NULL THEN p_empresa_id ELSE empresa_id END
    WHERE id = v_id
    RETURNING fv_planta.empresa_id INTO v_empresa_id;
  END IF;

  -- Registrar el vínculo credencial ↔ planta
  INSERT INTO public.fv_planta_credencial (planta_id, credencial_id)
  VALUES (v_id, p_credencial_id)
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT v_id, v_empresa_id, v_is_new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fv_upsert_planta TO service_role;


-- ── 5. Comentarios actualizados ───────────────────────────────────────
COMMENT ON COLUMN public.fv_planta.nombre          IS 'Nombre mostrado en CRM (nombre_interno si existe, si no nombre_fusionsolar)';
COMMENT ON COLUMN public.fv_planta.nombre_interno  IS 'Nombre personalizado por Valere — editable desde CRM, tiene prioridad';
COMMENT ON COLUMN public.fv_planta.nombre_fusionsolar IS 'Nombre original de FusionSolar — solo lectura, actualizado por sync';
COMMENT ON COLUMN public.fv_planta.region_url      IS 'URL del portal FusionSolar (EU5, EU3...) — parte de la identidad física de la planta';
COMMENT ON COLUMN public.fv_credenciales.descripcion IS 'Descripción del propietario/instalador de la cuenta';
COMMENT ON COLUMN public.fv_credenciales.tipo IS 'instalador_multicliente | cliente_monoplanta | cliente_multiplanta';
