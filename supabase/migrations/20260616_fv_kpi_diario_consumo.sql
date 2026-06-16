-- Fase 4: columnas de consumo/excedentes en fv_kpi_diario
-- Aditivo y seguro (todas nullable). Las puebla el conector desde energy-balance.
-- Plantas sin medidor (existMeter=false) dejaran estos campos en NULL.
ALTER TABLE public.fv_kpi_diario
  ADD COLUMN IF NOT EXISTS consumo_kwh      NUMERIC,   -- usePower (consumo total)
  ADD COLUMN IF NOT EXISTS autoconsumo_kwh  NUMERIC,   -- selfUsePower
  ADD COLUMN IF NOT EXISTS excedente_kwh    NUMERIC,   -- onGridPower (vertido a red)
  ADD COLUMN IF NOT EXISTS compra_red_kwh   NUMERIC;   -- totalBuyPower (comprado a red)

COMMENT ON COLUMN public.fv_kpi_diario.consumo_kwh     IS 'Consumo total del dia (FusionSolar usePower). NULL si la planta no tiene medidor.';
COMMENT ON COLUMN public.fv_kpi_diario.autoconsumo_kwh IS 'Autoconsumo desde solar (FusionSolar selfUsePower).';
COMMENT ON COLUMN public.fv_kpi_diario.excedente_kwh   IS 'Excedente vertido a red (FusionSolar onGridPower).';
COMMENT ON COLUMN public.fv_kpi_diario.compra_red_kwh  IS 'Energia comprada a red (FusionSolar totalBuyPower).';
