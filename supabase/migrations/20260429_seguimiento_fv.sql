-- ============================================================
-- FASE: Módulo Seguimiento Planta FV
-- Fecha: 2026-04-29
-- Descripción: Tablas para monitorización de instalaciones FV
--              (FusionSolar y futuras plataformas)
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. Credenciales de acceso a plataformas FV
-- ──────────────────────────────────────────────
-- Las contraseñas se almacenan cifradas AES-256-GCM por el conector Python.
-- El CRM solo lee/escribe el blob cifrado; NUNCA maneja la clave maestra.

CREATE TABLE IF NOT EXISTS public.fv_credenciales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  plataforma      TEXT NOT NULL CHECK (plataforma IN ('fusionsolar', 'goodwe', 'isolarcloud', 'sma_ennexos')),
  username        TEXT NOT NULL,
  password_enc    TEXT NOT NULL,   -- AES-256-GCM cifrado en base64 (conector Python)
  region_url      TEXT,            -- Ej: 'https://uni003eu5.fusionsolar.huawei.com' (FusionSolar)
  activo          BOOLEAN NOT NULL DEFAULT true,
  ultimo_ok_at    TIMESTAMPTZ,
  ultimo_error    TEXT,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (empresa_id, plataforma, username)
);

COMMENT ON TABLE public.fv_credenciales IS 'Credenciales cifradas por empresa para acceder a plataformas de monitorización FV';
COMMENT ON COLUMN public.fv_credenciales.password_enc IS 'AES-256-GCM en base64; solo el conector Python conoce la clave maestra (FV_ENCRYPTION_KEY)';

-- ──────────────────────────────────────────────
-- 2. Plantas fotovoltaicas
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fv_planta (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  credencial_id   UUID REFERENCES public.fv_credenciales(id) ON DELETE SET NULL,
  station_code    TEXT NOT NULL,   -- ID externo de la plataforma
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

COMMENT ON TABLE public.fv_planta IS 'Plantas FV por empresa. Un cliente puede tener N plantas en la misma o distintas plataformas.';

-- ──────────────────────────────────────────────
-- 3. Dispositivos por planta
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fv_dispositivo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planta_id       UUID NOT NULL REFERENCES public.fv_planta(id) ON DELETE CASCADE,
  device_id       TEXT NOT NULL,   -- ID externo del dispositivo
  tipo            TEXT NOT NULL CHECK (tipo IN ('inversor', 'bateria', 'optimizador', 'smart_meter', 'otro')),
  nombre          TEXT,
  modelo          TEXT,
  numero_serie    TEXT,
  estado          TEXT DEFAULT 'desconocido',
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (planta_id, device_id)
);

COMMENT ON TABLE public.fv_dispositivo IS 'Inversores, baterías, optimizadores, etc. por planta FV';

-- ──────────────────────────────────────────────
-- 4. KPIs diarios (histórico de producción)
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fv_kpi_diario (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planta_id       UUID NOT NULL REFERENCES public.fv_planta(id) ON DELETE CASCADE,
  fecha           DATE NOT NULL,
  energia_kwh     NUMERIC(12, 3),  -- Producción del día
  potencia_max_kw NUMERIC(10, 3),  -- Pico de potencia del día
  ingresos_eur    NUMERIC(10, 2),  -- Ingresos estimados si disponible
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (planta_id, fecha)
);

COMMENT ON TABLE public.fv_kpi_diario IS 'Producción diaria por planta. Upsert idempotente por (planta_id, fecha).';

-- ──────────────────────────────────────────────
-- 5. KPIs en tiempo real (último valor sincronizado)
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fv_kpi_realtime (
  planta_id           UUID PRIMARY KEY REFERENCES public.fv_planta(id) ON DELETE CASCADE,
  potencia_actual_kw  NUMERIC(10, 3),
  energia_hoy_kwh     NUMERIC(12, 3),
  energia_mes_kwh     NUMERIC(12, 3),
  energia_total_kwh   NUMERIC(14, 3),
  ingresos_hoy_eur    NUMERIC(10, 2),
  actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.fv_kpi_realtime IS '1 fila por planta con los últimos KPIs. Upsert en cada sincronización.';

-- ──────────────────────────────────────────────
-- 6. Alarmas activas
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fv_alarma (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planta_id       UUID NOT NULL REFERENCES public.fv_planta(id) ON DELETE CASCADE,
  alarm_id        TEXT NOT NULL,   -- ID externo de la alarma
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

COMMENT ON TABLE public.fv_alarma IS 'Alarmas FV. activa=false cuando desaparece de la plataforma.';

-- ──────────────────────────────────────────────
-- 7. Log de sincronización
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fv_sync_log (
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

COMMENT ON TABLE public.fv_sync_log IS 'Log de cada ejecución del conector FV. Accesible desde el CRM para diagnóstico.';

-- ──────────────────────────────────────────────
-- 8. Trigger actualizado_en automático
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
-- 9. RLS — Row Level Security
-- ──────────────────────────────────────────────
-- Modelo: usuarios autenticados ven SOLO datos de sus empresas asignadas.
-- El conector Python usa service_role key → salta RLS (correcto para sync).

ALTER TABLE public.fv_credenciales  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fv_planta        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fv_dispositivo   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fv_kpi_diario    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fv_kpi_realtime  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fv_alarma        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fv_sync_log      ENABLE ROW LEVEL SECURITY;

-- Helper: ¿el usuario es admin?
-- (reutiliza la función is_admin ya existente del proyecto, si no, crea una local)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'fv_is_admin'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION public.fv_is_admin()
      RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS '
        SELECT EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role IN (''admin'', ''master'')
        )
      ';
    $fn$;
  END IF;
END $$;

-- ── fv_credenciales: solo admin (contiene passwords cifradas) ──
CREATE POLICY "fv_cred_admin_all"
  ON public.fv_credenciales FOR ALL
  USING (public.fv_is_admin())
  WITH CHECK (public.fv_is_admin());

-- ── fv_planta: usuarios ven plantas de sus empresas ──
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

-- ── fv_dispositivo: hereda acceso de la planta ──
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

-- ── fv_kpi_diario ──
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

-- ── fv_kpi_realtime ──
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

-- ── fv_alarma ──
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

-- ── fv_sync_log: todos los autenticados pueden leer ──
CREATE POLICY "fv_sync_log_read_authenticated"
  ON public.fv_sync_log FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "fv_sync_log_write_admin"
  ON public.fv_sync_log FOR INSERT
  USING (public.fv_is_admin())
  WITH CHECK (public.fv_is_admin());

-- ──────────────────────────────────────────────
-- 10. Índices de rendimiento
-- ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_fv_planta_empresa    ON public.fv_planta(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fv_dispositivo_planta ON public.fv_dispositivo(planta_id);
CREATE INDEX IF NOT EXISTS idx_fv_kpi_diario_planta  ON public.fv_kpi_diario(planta_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_fv_alarma_planta_activa ON public.fv_alarma(planta_id, activa);
CREATE INDEX IF NOT EXISTS idx_fv_sync_log_empresa   ON public.fv_sync_log(empresa_id, iniciado_en DESC);
