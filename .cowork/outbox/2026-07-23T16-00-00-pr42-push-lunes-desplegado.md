# PR-4.2 · Push de los lunes — DESPLEGADO (2/4 de semana 4)
**Fecha:** 2026-07-23 · **De:** Cowork (sesión 13) · **Para:** Juan + auditor

## Qué se desplegó (con OK de Juan + verificación previa del auditor)
- Edge Function `push-lunes` (Deno, `verify_jwt=false`, patrón x-cron-secret
  idéntico a datadis-sync/datadis-consumos/esios-price-cache).
- RPC `check_push_cron_secret` + secreto `push_cron_secret` en Vault (valor
  aleatorio, nunca expuesto).
- Cron `push-lunes-weekly` — **lunes 07:00 UTC, jobid 7, ACTIVO**.
- Fuente: `supabase/functions/push-lunes/index.ts` + `config.toml`.
- Migración documental: `supabase/migrations/_MANUAL_cron_push_lunes.sql`
  (mismo patrón que `_MANUAL_cron_datadis_consumos.sql`: el secreto se crea
  aparte, nunca en el repo).

## Corrección vinculante del auditor (aplicada antes de desplegar)
Destinatarios NO son solo `role='master'`. El equipo operativo que gestiona
renovaciones (Julia, Antonio `arodriguez@`, `administracion@`) está en
`role='consultant'`. Query final: `role IN ('master','consultant')` +
`is_approved=true` → **6 destinatarios** verificados por SQL independiente
antes del deploy:
- master: `soporte@`, `jolivares@`, `juanolivarespena@gmail.com`
- consultant: `administracion@`, `arodriguez@`, `info@`

## Verificación del auditor (SQL independiente, no solo email-vs-UI)
Las 2 críticas del mes son exactas: **REAL CANOE NATACION CLUB** (05-jul) y
**PANADERIAS EL MIMBRE SL** (17-jul), ambas `detectada` sin renovar. La query
de la EF replica literalmente `v_renovaciones_kpi` (activas = estado NOT IN
renovado/perdido) + el filtro de mes de PR-2.2 (incluye vencidas del mes en
curso).

## Envío de prueba (antes de soltar el cron)
Añadido `test_to` a la EF: si se pasa, ignora la lista de staff y manda SOLO
ahí — así se pudo probar sin CC a los 6 destinatarios reales. Prueba
ejecutada dirigida a `jolivares@valereconsultores.com` únicamente:
```json
{"dry_run":false,"criticas_del_mes":2,"incidencias_vivas":11,
 "destinatarios":["jolivares@valereconsultores.com"],
 "es_prueba":true,"enviado":true,"ok":true}
```
Status HTTP 200, cuadrado contra `audit_log` (parte del run, reutiliza la
tabla — no crea tabla nueva). **PENDIENTE: confirmación visual de Juan** de
que el email se ve bien antes de dar el cron por verificado end-to-end (ya
está activo; el próximo disparo real será el lunes 27-jul 07:00 UTC).

## Incidente operativo del día (para no repetirlo)
Los tres ficheros de PR-4.2 se escribieron primero con herramientas locales
del sandbox de la nube, que NO llegan al mount real de Windows — quedaron
huérfanos en un filesystem que Juan no puede ver ni commitear. Detectado al
intentar `grep` desde `device_bash` (no encontraba el fichero). Corregido
transfiriendo el contenido vía base64 a través de `device_bash`, que sí
escribe en el mount real. Lección: para cualquier fichero nuevo de este
proyecto, escribir/editar SIEMPRE a través de `device_bash` (o verificar con
`device_list_dir` que el fichero aparece en el mount) antes de darlo por
creado.

## Comandos PowerShell (uno a uno, sin &&)
```powershell
git checkout main
git branch --show-current
git pull origin main
git add supabase/functions/push-lunes/index.ts supabase/functions/push-lunes/config.toml supabase/migrations/_MANUAL_cron_push_lunes.sql docs/ESTADO.md docs/PLAN_CRM_UTIL_4SEMANAS.md .cowork/outbox/2026-07-23T15-00-00-pr41-mergeado-aviso-paseo.md .cowork/outbox/2026-07-23T16-00-00-pr42-push-lunes-desplegado.md
git commit -m "feat(pr4.2): push de los lunes desplegado (EF + cron + secreto) - renovaciones criticas + incidencias Datadis a master+consultant"
git push origin main
```
(Ya está deployado y funcionando en producción; este commit es solo para que
el repo refleje lo que ya corre — no requiere PR/rama, como los flecos del
cron.)

## Siguiente
F2 — edición de suministros tras crear (hallazgo de Julia, aplazado a esta
semana) → luego PR-4.3 velocidad. GATE V4 = viernes 31.
