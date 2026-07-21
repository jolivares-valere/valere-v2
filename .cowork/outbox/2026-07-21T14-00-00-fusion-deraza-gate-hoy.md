# Fusión DERAZA ejecutada + gate V1 adelantado a HOY (2026-07-21)

## Fusión DERAZA (OK explícito de Juan, ejecutada por Cowork, pendiente cuadre auditor)
- Diagnóstico: 3 fichas con NIF correlativos B45728805/06/07. Checksum CIF: solo **B45728805 es válido** (control de B+4572880 = 5); 806/807 fabricados en la carga Fase 1 (05-jul).
- Sin solape de CUPS entre fichas (verificado pre-fusión). Barrido de 20 tablas con FK a empresas: solo cups(2)+contratos(2)+renovaciones(2) en la 806; la 807 vacía.
- Ejecutado en transacción: repunte de 2+2+2 a la canónica `8e396ec6-4a91-4c1e-b14d-e17a3835e682`, nombre corregido a "DERAZA IBÉRICO, S.L." (con tilde), soft-delete de `ef861df7…` y `db3cc860…`.
- **Verificación post: canónica = 5 CUPS · 10 contratos · 10 renovaciones · 2 incidencias Datadis. Duplicadas borradas y a cero.**
- Para el auditor: cuadre independiente + añadir el caso al informe del gate. Lección para el workstream datos: la carga Fase 1 pudo fabricar NIFs correlativos en más empresas — auditar `empresas` por NIFs con checksum inválido.

## S0.2 (del parte del auditor)
- Cron `datadis-consumos-nightly` sellado (jobid 6, 03:30 UTC, patrón Vault). SQL de referencia commiteado en `supabase/migrations/_MANUAL_cron_datadis_consumos.sql`.
- S0.2-bis (no bloqueante): triaje CUPS todo-400, abortar ante 429, run fantasma 16-jul.
- Borrar scheduled task DG0F obsoleta (auditor, cuando quiera).

## GATE V1 — HOY (decisión de Juan, 21-jul)
Paseo cronometrado de los 5 clientes: CHEMTROL, PAZ Y BIEN, BLUENET, **DERAZA (recién fusionada: 5 CUPS/10 contratos)**, Bidafarma. T1 <10s lista→ficha. Veredicto del auditor POR ESCRITO en `docs/PLAN_CRM_UTIL_4SEMANAS.md`.
Si CIERRA: semana 1 COMPLETA con 3 días de adelanto → lunes replanificación ligera de semana 2 (listas que trabajan, PR-2.1→2.5).

## Pendientes sin fecha (sin cambios)
CSV credenciales (rotar+filter-repo), poda 68 ramas remotas.
