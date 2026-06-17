# FV Sync FusionSolar -- zona dinamica RESUELTO (2026-06-17)

3 fixes encadenados mergeados a main (PR #31, #32, #33). jolivares pasaba de
AUTH_REDIRECT/0-plantas a 5 plantas OK.

## Que se arreglo
1. PR #31 - StorageStateClient.login() deriva base_url/_api_base_url reales tras login.
2. PR #32 - cerrar WebAuthClient antes de delegar (evita doble Playwright/asyncio loop).
3. PR #33 - pasar host real post-login (client._page.url, uni004 para jolivares) al StorageStateClient.

## Verificado
Run FV Sync 27681662657: jolivares uni003->uni004, 5 plantas, 20 alarmas. Global 3/3 OK.

## PENDIENTE proxima sesion
- energy-balance HTTP 500 (ROA_EXFRAME_EXCEPTION) en v3/overview/energy-balance, TODAS las plantas. No rompe el sync.
- Confirmar n? real de plantas de jolivares (5 vs 7 de memoria).
