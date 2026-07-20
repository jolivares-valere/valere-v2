# PR-1.5 codificado + hallazgo DERAZA (2026-07-20)

## PR-1.5 — ficheros (rama `claude/pr-1-5-suministros-curva`)
- `src/features/suministros/api.ts` — `fetchCurvaUltimaFecha(cupsIds)` (datadis_consumptions, 1 query/CUPS, solo pestaña empresa)
- `src/features/suministros/components/SuministrosTable.tsx` — columna "Curva" opcional (prop `curva`): 🟢 ≤45 días / 🟡 parcial con fecha / "—" honesto
- `src/features/suministros/components/SuministrosTab.tsx` — REESCRITO: curva + panel rojo incidencias Datadis (reutiliza `useDatadisIncidencias`) + skeleton
- `docs/help/suministros/ver-suministros.md` — doc RAG actualizada

## CA cuadrado por SQL (Cowork; pendiente cuadre independiente auditor)
- CHEMTROL …774JW → 🟢 hasta 14/07/26 (17.086 filas desde ago-24) · …SA0F → 🟢 hasta 13/07/26
- PAZ Y BIEN …DG0F → 🟡 hasta 31/07/25 (curva parada hace ~1 año — el CUPS del 4º intento del cron; caso 🟡 REAL)
- Bidafarma → 34 CUPS, 0 con curva → columna entera "—" honesto · 0 incidencias (sin panel rojo)
- PAZ Y BIEN además: panel rojo con sus 6 incidencias `cups_falta_en_crm` en la pestaña

## ⚠️ HALLAZGO URGENTE — DERAZA triplicada (y es cliente del gate del viernes)
`empresas` tiene 3 filas DERAZA: "DERAZA IBERICO, S.L." (3 CUPS, 2 incidencias), "DERAZA IBÉRICO, S.L." (2 CUPS), "DERAZA IBÉRICO, S.L." (0 CUPS). Duplicado con/sin tilde.
→ Decidir empresa canónica y fusionar/soft-delete ANTES del gate V1 (paseo de 5 clientes incluye DERAZA). Cauce: workstream datos (plan dedup existente). NO es del PR-1.5.

## Seguridad (para el auditor)
`anon` tiene grants completos (incl. TRUNCATE) sobre `datadis_consumptions`. RLS activo sin policies de anon lo bloquea HOY, pero revocar grants explícitamente (patrón Fase 0.3b). `datadis_incidencias`: authenticated con grants completos pero solo policy SELECT — coherente.

## Notas técnicas
- `v_datadis_consumos_cursor` existe pero SIN grant a authenticated — no usable desde frontend (no hizo falta; si algún día se usa, GRANT SELECT).
- Vacuna git: `pull.ff only` configurado en el repo de Juan (20-jul, tras 4º vim).

## Al mergear: 5/5 — semana 1 COMPLETA. Gate V1 viernes 24-jul.
