# energy-balance HTTP 500 RESUELTO (2026-06-19)

## Resuelto
Era endpoint v3/overview/energy-balance roto en EU5. Fix: v3->v1 (PR #42).
- PR #40 timeZoneStr (no era), PR #41 diagnostico variantes, PR #42 fix v1.
- Run 27691355853 verificado: consumo/excedente reales, cero ROA_EXFRAME.

## Impacto MVP
fv_kpi_diario.consumo_kwh/autoconsumo_kwh/excedente_kwh/compra_red_kwh YA se pueblan.
Pestana Excedentes puede conectarse a fv_kpi_diario.excedente_kwh real (no empty state).
Prompt MVP actualizado.

## Pendiente FV (no bloqueante)
- day-real-kpi 503 (curva intradia). Otro endpoint.
- Lanzar MVP fase 1 en Desktop.
