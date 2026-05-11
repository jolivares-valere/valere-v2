# Sesión 2026-05-11 — Sync FV Real conseguido

## Qué se hizo

### Fix principal: `fv_upsert_planta` ambigüedad SQL
- `RETURNS TABLE(id uuid, empresa_id uuid, is_new boolean)` creaba colisión de nombres con las columnas de `fv_planta` dentro del cuerpo PL/pgSQL.
- PostgreSQL no permite `CREATE OR REPLACE` para cambiar el tipo de retorno → hubo que `DROP FUNCTION` primero y luego recrear.
- Nueva firma: `RETURNS TABLE(planta_id uuid, planta_empresa_id uuid, planta_is_new boolean)`.
- UPDATE usa alias `fp` en todas las referencias: `fp.id`, `fp.empresa_id`, `fp.nombre_interno`, etc.
- Aplicado vía MCP Supabase (no como migration file, es hotfix funcional).

### Fix secundario: `fv_alarma` columna inexistente
- `sync_job.py` enviaba `detectada_en` al upsert de `fv_alarma`.
- La tabla tiene `iniciada_en` (timestamp with time zone), no `detectada_en`.
- Fix: renombrar campo + añadir `alarm_id` y `dispositivo` que sí existen en el schema real.

### Fix del fichero truncado en sandbox
- `sync_job.py` aparecía truncado en el sandbox Linux (658 líneas vs 711 reales en Windows).
- Causa: caché del mount de Windows en el sandbox de sesión anterior.
- Fix: reconstruir el tail desde bash con el contenido correcto.

## Resultado final en Supabase

```
fv_planta        = 7 filas (7 plantas reales FusionSolar)
fv_kpi_realtime  = 7 filas
fv_kpi_diario    = 7 filas
fv_sync_log      = 92+ filas (sync OK)
fv_alarma        = 0 alarmas activas (plantas sin incidencias)
```

Sync output limpio:
```
OK cred=21923524: 7 plantas, 0 alarmas en 17.4s
Sync completado: 1/1 OK -- 7 plantas, 0 alarmas
fv_sync_log HTTP/2 201 Created
```

## Commits de la sesión

- `518da18` → `feature/fv-operational-redesign`: fix fv_alarma iniciada_en + planta_id RETURNS TABLE

## Qué queda pendiente

- **Alarmas**: ninguna activa hoy. El upsert ya está corregido; se validará cuando haya alarmas reales.
- **Resumen semanal**: "0 plantas procesadas" porque `fv_kpi_diario` se acaba de poblar hoy — la semana pasada no tenía datos. Se autocorregirá en próximas semanas.
- **Refresco de cookies**: duran ~7 días (expiran ~2026-05-18). Ejecutar `python extract_cookies.py` cuando expired.
- **SQL fase28.6**: `supabase/migrations/20260422_fase28_6_rls_policies_cleanup.sql` — pendiente de ejecutar en Supabase.
- **Edge Function `chat-consultor`**: pendiente deploy.
- **Logs diagnóstico `[DIAG]`**: en `sync_job.py` hay logs `[DIAG]` temporales (keys del primer station). Limpiar cuando el sync sea estable.

## Decisiones tomadas

- No añadir columna `detectada_en` a `fv_alarma` — innecesario, `iniciada_en` cubre el mismo semántico.
- No pushear a `main` directamente — todo en `feature/fv-operational-redesign` hasta PR formal.
