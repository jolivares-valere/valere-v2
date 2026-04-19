-- =====================================================================
-- FASE 28.1a — Ampliar tabla `cups` con columnas técnicas de Calculadora
-- =====================================================================
-- Motivo:
--   Las 4 features de Calculadora (datos, analisis, tracking, propuestas-energia)
--   leen de `supply_points` (legacy) y tienen ~14 columnas técnicas que NO existen
--   en `cups`. Para refactorizar estas features a `cups`/`empresas` sin perder
--   funcionalidad, ampliamos `cups` con las columnas equivalentes.
--
-- Mapping supply_points -> cups:
--   tariff                         -> tarifa_acceso                 TEXT
--   manual_tariff                  -> tarifa_manual                 TEXT
--   powers (JSON)                  -> potencias_contratadas         JSONB
--   current_retailer               -> comercializadora_actual       TEXT
--   autoconsumption_model          -> modelo_autoconsumo            TEXT
--   manual_autoconsumption_model   -> modelo_autoconsumo_manual     TEXT
--   pv_power_kwp                   -> potencia_fv_kwp               NUMERIC
--   fv_installation_cost_eur       -> coste_instalacion_fv_eur      NUMERIC
--   inverter_power_kw              -> potencia_inversor_kw          NUMERIC
--   installation_date              -> fecha_instalacion_fv          DATE
--   inverter_brand                 -> marca_inversor                TEXT
--   e1_kwh..e6_kwh                 -> energia_p1_kwh..energia_p6_kwh NUMERIC
--
-- Idempotente: todas las columnas usan ADD COLUMN IF NOT EXISTS, NULL permitido.
-- No afecta filas existentes (todas las columnas son NULL por defecto).
-- =====================================================================

-- Datos tarifarios / potencias
ALTER TABLE public.cups
  ADD COLUMN IF NOT EXISTS tarifa_acceso           text,
  ADD COLUMN IF NOT EXISTS tarifa_manual           text,
  ADD COLUMN IF NOT EXISTS potencias_contratadas   jsonb,
  ADD COLUMN IF NOT EXISTS comercializadora_actual text;

-- Autoconsumo
ALTER TABLE public.cups
  ADD COLUMN IF NOT EXISTS modelo_autoconsumo         text,
  ADD COLUMN IF NOT EXISTS modelo_autoconsumo_manual  text;

-- Instalación fotovoltaica
ALTER TABLE public.cups
  ADD COLUMN IF NOT EXISTS potencia_fv_kwp           numeric,
  ADD COLUMN IF NOT EXISTS coste_instalacion_fv_eur  numeric,
  ADD COLUMN IF NOT EXISTS potencia_inversor_kw      numeric,
  ADD COLUMN IF NOT EXISTS fecha_instalacion_fv      date,
  ADD COLUMN IF NOT EXISTS marca_inversor            text;

-- Energías anuales por periodo (kWh)
ALTER TABLE public.cups
  ADD COLUMN IF NOT EXISTS energia_p1_kwh numeric,
  ADD COLUMN IF NOT EXISTS energia_p2_kwh numeric,
  ADD COLUMN IF NOT EXISTS energia_p3_kwh numeric,
  ADD COLUMN IF NOT EXISTS energia_p4_kwh numeric,
  ADD COLUMN IF NOT EXISTS energia_p5_kwh numeric,
  ADD COLUMN IF NOT EXISTS energia_p6_kwh numeric;

-- Comentarios descriptivos (ayuda a diagnóstico vía information_schema)
COMMENT ON COLUMN public.cups.tarifa_acceso           IS 'Tarifa de acceso detectada (2.0TD, 3.0TD, 6.1TD, etc.)';
COMMENT ON COLUMN public.cups.tarifa_manual           IS 'Override manual de tarifa si el parser automático falla';
COMMENT ON COLUMN public.cups.potencias_contratadas   IS 'JSON {p1..p6} con potencias contratadas en kW';
COMMENT ON COLUMN public.cups.comercializadora_actual IS 'Nombre de la comercializadora actual del suministro';
COMMENT ON COLUMN public.cups.modelo_autoconsumo      IS 'Modelo detectado: sin_autoconsumo, individual_sin_excedentes, etc.';
COMMENT ON COLUMN public.cups.modelo_autoconsumo_manual IS 'Override manual del modelo de autoconsumo';
COMMENT ON COLUMN public.cups.potencia_fv_kwp         IS 'Potencia de la instalación fotovoltaica (kWp)';
COMMENT ON COLUMN public.cups.coste_instalacion_fv_eur IS 'Coste total de la instalación FV (EUR)';
COMMENT ON COLUMN public.cups.potencia_inversor_kw    IS 'Potencia nominal del inversor (kW)';
COMMENT ON COLUMN public.cups.fecha_instalacion_fv    IS 'Fecha de puesta en marcha de la instalación FV';
COMMENT ON COLUMN public.cups.marca_inversor          IS 'Marca/modelo del inversor';
COMMENT ON COLUMN public.cups.energia_p1_kwh          IS 'Consumo anual estimado periodo 1 (kWh)';
COMMENT ON COLUMN public.cups.energia_p2_kwh          IS 'Consumo anual estimado periodo 2 (kWh)';
COMMENT ON COLUMN public.cups.energia_p3_kwh          IS 'Consumo anual estimado periodo 3 (kWh)';
COMMENT ON COLUMN public.cups.energia_p4_kwh          IS 'Consumo anual estimado periodo 4 (kWh)';
COMMENT ON COLUMN public.cups.energia_p5_kwh          IS 'Consumo anual estimado periodo 5 (kWh)';
COMMENT ON COLUMN public.cups.energia_p6_kwh          IS 'Consumo anual estimado periodo 6 (kWh)';

-- Índice útil para filtrar instalaciones FV en el Tracking
CREATE INDEX IF NOT EXISTS idx_cups_potencia_fv
  ON public.cups (potencia_fv_kwp)
  WHERE potencia_fv_kwp IS NOT NULL;
