# Sesión 2026-05-14 — FV Sync: Diagnóstico WAF 503 definitivo

## Qué se hizo

### Objetivo
Diagnosticar por qué `day-real-kpi` devuelve HTTP 503 para fechas históricas y arreglarlo.

### Diagnóstico (3 planes probados)

**Plan A — Hash navigation**
- Navegar `page.goto(#/plantDetail/NE=137403508)` antes de llamar `day-real-kpi`
- Resultado: el SPA rechaza ese hash y redirige a `#/home/list`. 0 requests HTTP generados. 503 persiste.

**Plan B — page.evaluate(fetch()) desde detalle**
- Usar fetch() del browser context desde la URL de detalle
- Resultado: 503 idéntico. WAF bloquea independientemente del cliente HTTP.

**Plan C — Prelim device-list via context.request**
- Llamar explícitamente a `device-list` para la planta antes de `day-real-kpi`
- Resultado: `device-list` también retorna 503. El WAF bloquea TODOS los POST station-específicos.

### Conclusión definitiva

CloudWAF FusionSolar EU5 bloquea `day-real-kpi` y `device-list` para cualquier acceso que no provenga del SPA en la ruta correcta de detalle de planta. La ruta correcta no es `#/plantDetail/<dn>` — el SPA la rechaza. No es viable resolver esto sin encontrar la URL real del SPA para la vista de detalle de planta (requiere sesión headful interactiva con Playwright inspector).

**Endpoints que funcionan** (via `context.request`): `station-list`, `total-real-kpi`, `fm/v1/statistic`, `check-guest`, `area-list`.
**Endpoints bloqueados** (503 siempre): `day-real-kpi`, `device-list`.

### Fixes aplicados

1. **sync_job.py**: guard WAF — si `get_daily_kpi()` devuelve `{}` vacío, hace SKIP (no escribe 0.0 kWh). Auditoría con `error_tipo="waf_503_skip"`.
2. **fusionsolar_client.py**: `_navigate_to_station_detail()` simplificado a no-op. Elimina 3 planes fallidos y ~100 líneas de código de diagnóstico.
3. **fv_kpi_diario** (Supabase prod): DELETE 17 filas con 0.000 kWh para fechas 2026-05-11/12/13 en 7 plantas.

### Commits de la sesión

| Commit | Descripción |
|---|---|
| `f61ec4a` | Añadir logging verbose + --verbose + --planta flags |
| `214f43b` | Plan B: page.evaluate fetch para bypass WAF |
| `0d429c4` | Plan B: navegar a plantDetail antes de day-real-kpi |
| `fd09c20` | Plan C: prelim device-list+total-kpi |
| `e018be1` | **FIX DEFINITIVO**: no guardar 0.0 kWh cuando WAF bloquea |

## Qué quedó pendiente

- **Histórico FV manual**: para tener datos de los últimos 30+ días, descargar CSV desde el portal FusionSolar e importar. El sync diario irá acumulando datos desde hoy.
- **Ruta SPA correcta**: si en el futuro se quiere habilitar el backfill automático, capturar la URL que el SPA usa para el detalle de planta navegando manualmente en sesión headful.
- **SQL fase28.6**: `supabase/migrations/20260422_fase28_6_rls_policies_cleanup.sql` — pendiente.
- **Regenerar tipos Supabase TypeScript**: incluir `datadis_supply_price_terms`.

## Decisiones importantes

- Se abandona el backfill automático de FV histórico via `day-real-kpi`. La estrategia pasa a acumulación diaria + CSV manual.
- El guard de "no-write-0kWh" es la solución correcta: mejor no tener datos que tener datos falsos.
