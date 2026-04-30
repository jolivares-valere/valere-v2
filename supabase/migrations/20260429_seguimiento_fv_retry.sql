-- ============================================================
-- RETRY: Limpiar tablas FV si quedaron a medias y re-ejecutar
-- Ejecutar en Supabase SQL Editor si la migración anterior falló a medias
-- ============================================================

-- Limpiar en orden (respetando FK)
DROP TABLE IF EXISTS public.fv_sync_log      CASCADE;
DROP TABLE IF EXISTS public.fv_alarma        CASCADE;
DROP TABLE IF EXISTS public.fv_kpi_realtime  CASCADE;
DROP TABLE IF EXISTS public.fv_kpi_diario    CASCADE;
DROP TABLE IF EXISTS public.fv_dispositivo   CASCADE;
DROP TABLE IF EXISTS public.fv_planta        CASCADE;
DROP TABLE IF EXISTS public.fv_credenciales  CASCADE;
DROP FUNCTION IF EXISTS public.fv_set_actualizado_en() CASCADE;
DROP FUNCTION IF EXISTS public.fv_is_admin() CASCADE;

-- ──────────────────────────────────────────────
-- 1. Credenciales de acceso a plataformas FV
-- ──────────────────────────────────────────────
CREATE TABLE public.fv_credenciales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plataforma      TEXT NOT NULL CHECK (plataforma IN ('fusionsolar', 'goodwe', 'isolarcloud', 'sma_ennexos')),
  username        TEXT NOT NULL,
  password_enc    TEXT NOT NULL,
  region_url      TEXT,
  activo          BOOLEAN NOT NULL DEFAULT true,
  ultimo_ok_at    TIMESTAMPTZ,
  ultimo_error    TEXT,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, plataforma, username)
);

-- ──────────────────────────────────────────────
-- 2. Plantas fotovoltaicas
-- ──────────────────────────────────────────────
CREATE TABLE public.fv_planta (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  credencial_id   UUID REFERENCES public.fv_credenciales(id) ON DELETE SET NULL,
  station_code    TEXT NOT NULL,
  plataforma      TEXT NOT NULL DEFAULT 'fusionsolar',
  nombre          TEXT NOT NULL,
  pais            TEXT DEFAULT 'ES',
  capacidad_kwp   NUMERIC(10, 2),
  tiene_bateria   BOOLEAN DEFAULT false,
  tiene_esss      BOOLEAN DEFAULT false,
  fecha_conexion  DATE,
  estado          TEXT DEFAULT 'desconocido' CHECK (estado IN ('normal', 'defectuoso', 'desconectado', 'desconocido')),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, plataforma, station_code)
);

-- ──────────────────────────────────────────────
-- 3. Dispositivos por planta
-- ──────────────────────────────────────────────
CREATE TABLE public.fv_dispositivo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planta_id       UUID NOT NULL REFERENCES public.fv_planta(id) ON DELETE CASCADE,
  device_id       TEXT NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('inversor', 'bateria', 'optimizador', 'smart_meter', 'otro')),
  nombre          TEXT,
  modelo          TEXT,
  numero_serie    TEXT,
  estado          TEXT DEFAULT 'desconocido',
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (planta_id, device_id)
);

-- ──────────────────────────────────────────────
-- 4. KPIs diarios
-- ──────────────────────────────────────────────
CREATE TABLE public.fv_kpi_diario (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planta_id       UUID NOT NULL REFERENCES public.fv_planta(id) ON DELETE CASCADE,
  fecha           DATE NOT NULL,
  energia_kwh     NUMERIC(12, 3),
  potencia_max_kw NUMERIC(10, 3),
  ingresos_eur    NUMERIC(10, 2),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (planta_id, fecha)
);

-- ──────────────────────────────────────────────
-- 5. KPIs realtime
-- ──────────────────────────────────────────────
CREATE TABLE public.fv_kpi_realtime (
  planta_id           UUID PRIMARY KEY REFERENCES public.fv_planta(id) ON DELETE CASCADE,
  potencia_actual_kw  NUMERIC(10, 3),
  energia_hoy_kwh     NUMERIC(12, 3),
  energia_mes_kwh     NUMERIC(12, 3),
  energia_total_kwh   NUMERIC(14, 3),
  ingresos_hoy_eur    NUMERIC(10, 2),
  actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────
-- 6. Alarmas
-- ──────────────────────────────────────────────
CREATE TABLE public.fv_alarma (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planta_id       UUID NOT NULL REFERENCES public.fv_planta(id) ON DELETE CASCADE,
  alarm_id        TEXT NOT NULL,
  codigo          TEXT,
  severidad       TEXT CHECK (severidad IN ('critica', 'mayor', 'menor', 'advertencia', 'desconocida')),
  descripcion     TEXT,
  dispositivo     TEXT,
  iniciada_en     TIMESTAMPTZ,
  resuelta_en     TIMESTAMPTZ,
  activa          BOOLEAN NOT NULL DEFAULT true,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (planta_id, alarm_id)
);

-- ──────────────────────────────────────────────
-- 7. Log de sincronización
-- ──────────────────────────────────────────────
CREATE TABLE public.fv_sync_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  plataforma      TEXT,
  ok              BOOLEAN NOT NULL,
  plantas_sync    INT DEFAULT 0,
  alarmas_sync    INT DEFAULT 0,
  mensaje         TEXT,
  iniciado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
  duracion_ms     INT
);

-- ──────────────────────────────────────────────
-- 8. Trigger actualizado_en
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fv_set_actualizado_en()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fv_credenciales_updated
  BEFORE UPDATE ON public.fv_credenciales
  FOR EACH ROW EXECUTE FUNCTION public.fv_set_actualizado_en();

CREATE TRIGGER trg_fv_planta_updated
  BEFORE UPDATE ON public.fv_planta
  FOR EACH ROW EXECUTE FUNCTION public.fv_set_actualizado_en();

CREATE TRIGGER trg_fv_dispositivo_updated
  BEFORE UPDATE ON public.fv_dispositivo
  FOR EACH ROW EXECUTE FUNCTION public.fv_set_actualizado_en();

CREATE TRIGGER trg_fv_alarma_updated
  BEFORE UPDATE ON public.fv_alarma
  FOR EACH ROW EXECUTE FUNCTION public.fv_set_actualizado_en();

-- ──────────────────────────────────────────────
-- 9. RLS
-- ──────────────────────────────────────────────
ALTER TABLE public.fv_credenciales  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fv_planta        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fv_dispositivo   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fv_kpi_diario    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fv_kpi_realtime  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fv_alarma        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fv_sync_log      ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.fv_is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'master')
  )
$$;

-- fv_credenciales: solo admin
CREATE POLICY "fv_cred_admin_all"
  ON public.fv_credenciales FOR ALL
  USING (public.fv_is_admin())
  WITH CHECK (public.fv_is_admin());

-- fv_planta: SELECT por empresa, resto admin
CREATE POLICY "fv_planta_read_by_empresa"
  ON public.fv_planta FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.empresas e
      WHERE e.id = fv_planta.empresa_id
        AND (public.fv_is_admin() OR e.comercial_id = auth.uid())
    )
  );
CREATE POLICY "fv_planta_write_admin"
  ON public.fv_planta FOR ALL
  USING (public.fv_is_admin())
  WITH CHECK (public.fv_is_admin());

-- fv_dispositivo
CREATE POLICY "fv_dispositivo_read"
  ON public.fv_dispositivo FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.fv_planta p
      JOIN public.empresas e ON e.id = p.empresa_id
      WHERE p.id = fv_dispositivo.planta_id
        AND (public.fv_is_admin() OR e.comercial_id = auth.uid())
    )
  );
CREATE POLICY "fv_dispositivo_write_admin"
  ON public.fv_dispositivo FOR ALL
  USING (public.fv_is_admin())
  WITH CHECK (public.fv_is_admin());

-- fv_kpi_diario
CREATE POLICY "fv_kpi_diario_read"
  ON public.fv_kpi_diario FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.fv_planta p
      JOIN public.empresas e ON e.id = p.empresa_id
      WHERE p.id = fv_kpi_diario.planta_id
        AND (public.fv_is_admin() OR e.comercial_id = auth.uid())
    )
  );
CREATE POLICY "fv_kpi_diario_write_admin"
  ON public.fv_kpi_diario FOR ALL
  USING (public.fv_is_admin())
  WITH CHECK (public.fv_is_admin());

-- fv_kpi_realtime
CREATE POLICY "fv_kpi_realtime_read"
  ON public.fv_kpi_realtime FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.fv_planta p
      JOIN public.empresas e ON e.id = p.empresa_id
      WHERE p.id = fv_kpi_realtime.planta_id
        AND (public.fv_is_admin() OR e.comercial_id = auth.uid())
    )
  );
CREATE POLICY "fv_kpi_realtime_write_admin"
  ON public.fv_kpi_realtime FOR ALL
  USING (public.fv_is_admin())
  WITH CHECK (public.fv_is_admin());

-- fv_alarma
CREATE POLICY "fv_alarma_read"
  ON public.fv_alarma FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.fv_planta p
      JOIN public.empresas e ON e.id = p.empresa_id
      WHERE p.id = fv_alarma.planta_id
        AND (public.fv_is_admin() OR e.comercial_id = auth.uid())
    )
  );
CREATE POLICY "fv_alarma_write_admin"
  ON public.fv_alarma FOR ALL
  USING (public.fv_is_admin())
  WITH CHECK (public.fv_is_admin());

-- fv_sync_log: lectura autenticados, INSERT solo con WITH CHECK (no USING en INSERT)
CREATE POLICY "fv_sync_log_read_authenticated"
  ON public.fv_sync_log FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "fv_sync_log_write_admin"
  ON public.fv_sync_log FOR INSERT
  WITH CHECK (public.fv_is_admin());

-- ──────────────────────────────────────────────
-- 10. Índices
-- ──────────────────────────────────────────────
CREATE INDEX idx_fv_planta_empresa       ON public.fv_planta(empresa_id);
CREATE INDEX idx_fv_dispositivo_planta   ON public.fv_dispositivo(planta_id);
CREATE INDEX idx_fv_kpi_diario_planta    ON public.fv_kpi_diario(planta_id, fecha DESC);
CREATE INDEX idx_fv_alarma_planta_activa ON public.fv_alarma(planta_id, activa);
CREATE INDEX idx_fv_sync_log_empresa     ON public.fv_sync_log(empresa_id, iniciado_en DESC);
