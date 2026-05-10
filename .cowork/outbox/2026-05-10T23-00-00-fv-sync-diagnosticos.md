# Mensaje para próxima sesión — FV Sync 2026-05-10

## Estado al cerrar

Commit `cda9a24` pusheado a main. Contiene diagnósticos completos del FV Sync.

## Próximo paso: verificar Run #95

Lanzar workflow desde: https://github.com/jolivares-valere/valere-v2/actions/workflows/fv-sync.yml

### Si AUTH_REDIRECT en CI:
```powershell
cd C:\Users\joliv\valere-v2\scripts\fv-sync
python test_cookie_auth.py  # Probar LOCALMENTE primero
```

- Falla local → sesión expirada → `python extract_cookies.py` → re-lanzar CI
- Pasa local, falla CI → revisar secrets GitHub (SUPABASE_URL, SUPABASE_SERVICE_KEY, FV_ENCRYPTION_KEY)

### Si Playwright también falla (tras renovar cookies):
Evaluar self-hosted runner o cron local (ver docs/SESIONES/2026-05-10-resumen.md §Pendientes)

## Archivos clave de esta sesión

- `scripts/fv-sync/fusionsolar_client.py` — StorageStateClient completo
- `scripts/fv-sync/extract_cookies.py` — usa storage_state() (cookies+localStorage)
- `scripts/fv-sync/test_cookie_auth.py` — diagnóstico local con StorageStateClient
- `scripts/fv-sync/sync_job.py` — catch FusionSolarAuthError con ACCIÓN REQUERIDA
- `.github/workflows/fv-sync.yml` — step diagnóstico de entorno añadido
