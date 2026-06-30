# FV sync — fix zona/subdominio dinámico FusionSolar (uni003 → uni004)

**Fecha:** 2026-06-16
**Archivo tocado:** `scripts/fv-sync/fusionsolar_client.py` (solo Python, sin cambios TS)

## Problema
`jolivares` fallaba con `AUTH_REDIRECT` en `station-list`. Causa raíz: su sesión
FusionSolar queda autenticada en **uni004eu5** (region-4), pero `StorageStateClient`
seguía usando la `base_url` fija de la credencial (**uni003eu5**). Las llamadas API a
uni003eu5 con cookies/sesión de uni004eu5 → FusionSolar redirige a login.

`JOLIVARES` (cookies Renovador) funcionaba porque su zona real ES uni003eu5.

## Fix aplicado
En `StorageStateClient`:

1. Extraído el cálculo de `_api_base_url` a un `@staticmethod _derive_api_base(base_url)`
   (misma regla de siempre: quitar prefijo `uniNNN` del subdominio → `eu5`).
2. En `login()`, **tras** capturar `current_url` (`self._portal_url`), se deriva la base
   real (`scheme://netloc`) y, si difiere de `self.base_url`, se actualizan
   `self.base_url` y `self._api_base_url` con logs:
   - `FusionSolar zona real detectada tras login: <url>`
   - `FusionSolar base_url actualizada: <old> -> <new>`

No se hardcodea uni004; se deriva de la URL post-login.
- jolivares: uni003eu5 → uni004eu5 (api eu5) ✅
- JOLIVARES: uni003eu5 se mantiene ✅

## Validación pendiente (entorno sandbox bloqueado)
El mount Linux servía un snapshot viejo (May 14) de `fusionsolar_client.py` y había
`.git/index.lock` + rama vacía `claud`. No se pudo correr py_compile/tsc/tests desde
Cowork. La lógica del parche SÍ se validó aislada (asserts uni003/uni004/sin-prefijo OK).

**Juan debe** correr en su terminal (ver respuesta de la sesión):
`python -m py_compile`, `npx tsc --noEmit`, `npm test -- --run`, `git diff`, commit+PR.

## Prueba funcional esperada en logs tras merge
- "FusionSolar zona real detectada uni004eu5" para jolivares
- "base_url actualizada uni003eu5 -> uni004eu5"
- station-list ya NO redirige a login
- si day-real-kpi da 503 → se salta (waf_503_skip), no tumba el sync
