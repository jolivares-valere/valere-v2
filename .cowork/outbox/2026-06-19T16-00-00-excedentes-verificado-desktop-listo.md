# Excedentes verificado + bloque arranque Desktop (2026-06-19b)

## Hecho
- Verificado en Supabase: fv_kpi_diario tiene balance real (8/12 consumo, 7/12 excedente).
  4 plantas NULL = sin medidor (legitimo). compra_red_kwh NULL en todas (menor).
- Creado docs/ACTUALIZACION_PREVIA_PROMPT_MVP_FV.md: pegar ANTES del prompt en Desktop.

## Pendiente proxima sesion
- Lanzar MVP fase 1 en Desktop (ACTUALIZACION_PREVIA + PROMPT_MVP).
- (menor) compra_red_kwh NULL: revisar mainsUsePower en v1.
- (no bloqueante) day-real-kpi 503 intradia.
