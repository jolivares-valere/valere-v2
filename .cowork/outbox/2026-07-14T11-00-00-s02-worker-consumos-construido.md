# S0.2 — Worker pesado datadis-consumos CONSTRUIDO (2026-07-14)

> Código escrito, NO desplegado. Gate: auditoría del código antes del deploy (regla del auditor).

## Contexto
Migración S0.1 aplicada+verificada ayer. Hoy: worker de persistencia (curva+maxímetro+contrato)
con la arquitectura de dos workers + ingesta incremental, aprobada por el auditor con condiciones C1-C6.

## Ficheros nuevos (rama a crear: claude/energia-v2-s0 o nueva)
- `supabase/migrations/20260714_energia_v2_s0_observabilidad_dst.sql`
  - C1: tabla `datadis_runs` (trazabilidad, RLS is_staff).
  - C3: relaja `datadis_consumptions_hora_check` a 0..24 (día de 25 h de octubre).
  - C4: vista `v_datadis_consumos_cursor` (última fecha por CUPS, sin tabla nueva).
- `supabase/functions/datadis-consumos/index.ts` (worker pesado) + `config.toml` (verify_jwt=false).
  - Endpoints reales (verificados en src/core/services/datadis.ts): get-contract-detail,
    get-consumption-data (measurementType=0, pointType, fechas YYYY/MM/DD), get-max-power (defensivo, no había código).
  - Curva → datadis_consumptions (upsert cups_id,fecha,hora); maxímetro → datadis_maximetro; contrato → datadis_contratos (delete+insert por CUPS, evita null en UNIQUE fecha_inicio).
  - C2: presupuesto por tiempo (max_seconds) + CUPS (max_cups); se para limpio.
  - C4: cursor incremental, prioriza CUPS con datos más antiguos; ventana rodante 24m.
  - C5: maxímetro histórico va aquí (lo necesita el optimizador S2.1).
  - prioridad_cups: lista de CUPS que entran primero (decisión comercial).
  - C1: registra cada run en datadis_runs.
  - dry_run=true por defecto (el primer run mide tiempos reales).
- `supabase/migrations/_MANUAL_cron_datadis_consumos.sql` (C6): cron 03:30 UTC, aplicar A MANO tras deploy.

## Diferido (task #34)
Endurecimiento B3/B4 de `datadis-sync` (base20_duplicado, upsert ON CONFLICT incidencias, comprobar error insert):
el fichero aparece como `M` en el working tree con `.git/index.lock` bloqueado (rareza del mount). Reconciliar antes de tocarlo. Es un redeploy de worker en producción → deliberado + auditoría.

## Datos verificados en producción
- cups: datadis_distributor_code, datadis_point_type (auxiliares para las llamadas).
- datadis_consumptions ya tiene UNIQUE(cups_id,fecha,hora).
- Formato curva EDISTRIBUCIÓN: measureMagnitudeActive (kWh), energyPoured (excedente), hour (fin intervalo → hora=hour-1), metodoObtencion. period="ANUAL" (P1-P6 se derivan al agregar, S0.4).

## Próximo punto de parada
Código → AUDITOR → aplicar migración 20260714 → deploy datadis-consumos → cron → primer run dry_run supervisado → producción.
