# ACTUALIZACIÓN PREVIA AL PROMPT MVP FV — 2026-06-19

> Pegar este bloque ANTES de `docs/PROMPT_MVP_FV_para_Desktop.md` al arrancar Claude Desktop.
> Corrige cualquier premisa residual del prompt sobre energy-balance.

**Energy-balance ya está resuelto y NO debe tratarse como bloqueado.**

## Estado verificado (Supabase, 2026-06-19)
- PR #42 mergeado: FusionSolar `energy-balance` pasa de endpoint **v3 a v1**.
- Run FV Sync `27691355853` verificado: cero `ROA_EXFRAME` / HTTP 500.
- `fv_kpi_diario` ya recibe datos reales de balance energético.
- Última fecha con datos verificados: **2026-06-17**.
- En esa fecha, **8 de 12 plantas** tienen `consumo_kwh` / `autoconsumo_kwh` real.
- **7 de 12** tienen `excedente_kwh` real.
- Las **4 plantas restantes con campos NULL** (CORTIJO EL CABRIL, FOAM JAEN, GUADIX,
  HOTEL SIERRA LUZ) deben tratarse como **"sin medidor de consumo / balance no disponible"**,
  NO como error. (existMeter=false: solo generan, no miden consumo.)
- `compra_red_kwh` está NULL en TODAS las filas por ahora. **No bloquear MVP por esto.**
  Mostrar "—" o dejar para fase posterior. NO inventar compra a red salvo que se implemente
  una derivación validada (aprox. `max(consumo_kwh - autoconsumo_kwh, 0)`, sin validar todavía).

## Implicación para la implementación
- La pestaña **Excedentes** YA puede conectarse a datos reales usando `fv_kpi_diario.excedente_kwh`.
- La pestaña **Producción** puede usar `fv_kpi_diario.energia_kwh`, `consumo_kwh`,
  `autoconsumo_kwh` y `excedente_kwh` cuando existan.
- Para plantas sin medidor, mostrar estado honesto: "Sin medidor / balance no disponible".
- **Datadis** sigue sin cruce completo por CUPS, así que la columna Datadis puede seguir como
  "—" o empty state específico.
- `day-real-kpi` / curva intradía sigue **pendiente y NO bloquea el MVP**: usar datos
  diarios, no intradía.

## Prioridad para Desktop
1. Implementar Excedentes con datos reales desde `fv_kpi_diario.excedente_kwh`.
2. Implementar Producción diaria desde `fv_kpi_diario`.
3. Evitar datos mock o fixtures en producción.
4. Mantener empty states honestos para plantas sin medidor o campos NULL.

## Detalle menor a revisar (NO bloqueante, otra sesión)
- `compra_red_kwh` NULL en todas las plantas pese a que el resto del balance llega.
  Revisar si la clave `mainsUsePower` que parsea `get_energy_balance` es la correcta en
  la respuesta v1, o si las plantas no la reportan.
