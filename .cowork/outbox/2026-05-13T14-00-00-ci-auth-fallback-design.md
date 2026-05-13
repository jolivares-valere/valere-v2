# CI Auth Fallback — Diseño acordado con Juan (2026-05-13)

## Contexto
El cron diario de GitHub Actions (07:00 UTC) falla con AUTH_REDIRECT porque las
cookies de FusionSolar son IP-tied. `StorageStateClient` usa cookies extraídas
localmente (IP de Juan) que el runner de Azure rechaza.

## Objetivo de la próxima sesión
Implementar fallback WebAuthClient en `sync_job.py` para que el runner pueda
hacer login fresco sin depender de cookies locales.

## Diseño acordado (NO cambiar sin consultar a Juan)

```
sync_credencial()
1. intenta StorageStateClient
2. si AUTH_REDIRECT:
   - clasificar auth en fv_sync_audit (audit record con ok=False, error_tipo='auth')
   - desencriptar password_enc desde fv_credenciales_secret
   - crear WebAuthClient
   - login fresco desde runner (headless Chromium)
   - guardar nuevo storage_state en fv_credenciales_secret
   - reintentar sync UNA SOLA VEZ con el nuevo storage_state
3. si vuelve a fallar:
   - estado_sesion = 'caducada' o 'error'
   - continuar con la siguiente credencial
```

## Guardarraíles (obligatorios, no negociables)
- Máximo 1 relogin por credencial por run (sin bucle infinito)
- `password_enc` NUNCA en logs (usar `***` si hay que loggear algo)
- Registrar `intentos=2` o flag `auth_retry=true` en fv_sync_audit
- Si aparece CAPTCHA, marcar `error_tipo='auth'` con `error_raw='captcha_required'`

## Verificaciones previas antes de tocar código
1. `FV_ENCRYPTION_KEY` existe en GitHub Secrets (Actions → Settings → Secrets)
2. WebAuthClient funciona headless en runner ubuntu-22.04 con Playwright+Chromium
3. `extract_cookies.py` y `WebAuthClient` comparten el mismo formato `storage_state`
   (verificar que ambos escriben en el mismo schema de Playwright storage)

## Archivos a tocar
- `scripts/fv-sync/sync_job.py` — función `sync_credencial()` (~línea 420)
- Posiblemente `scripts/fv-sync/fusionsolar_client.py` si hay que adaptar WebAuthClient

## Nota
Este cambio desbloquea el cron diario real. Hasta que esté, el sync solo funciona
si Juan renueva cookies manualmente con `extract_cookies.py`.
