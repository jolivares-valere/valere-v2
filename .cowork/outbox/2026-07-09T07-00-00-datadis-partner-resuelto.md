# ✅ DATADIS PARTNER RESUELTO — sincronización real con cuenta Valere (2026-07-09)

> Juan cambió los secrets a la cuenta partner de Valere. Diagnóstico, worker reescrito y sincronización verificada. Cierra el hilo abierto en `2026-07-07T02-00-00-datadis-credenciales-cuenta-incorrecta.md`.

## Qué se descubrió (probado en vivo)
- Con la cuenta partner **B10759520 (Valere)**, el login es OK y **`authorizedNif` YA FUNCIONA** (antes daba 403 porque el secret era la cuenta de CHEMTROL A28429348).
- El modelo **agregado** (`get-supplies` sin NIF) devuelve **"No supplies"**: Valere no posee CUPS propios. Por tanto el agregado NO sirve para un partner → **el modelo correcto es bucle por NIF de cliente**.
- Resultado de la prueba por NIF (cuenta partner):
  - ASOC PAZ Y BIEN (G41065566): 200 → 36 CUPS autorizados
  - BLUENET (A91144360): 200 → 19 CUPS
  - CHEMTROL (A28429348): 200 → 14 CUPS
  - BIDAFARMA (F90280116): 403 "No authorized supplies" → aún sin autorización en Datadis
  - AYRA-CREA / JEICA: 404 → sin autorización

## Qué se hizo
1. **Worker `datadis-sync` reescrito al modelo `authorizedNif`** (bucle por NIF, batches de 4). Desplegado **v7**. Repo actualizado: `supabase/functions/datadis-sync/index.ts`. **PENDIENTE COMMIT.**
   - No-destructivo (igual que antes): `datadis_*` siempre; `distribuidor/direccion/ciudad` solo si vacíos; nunca toca vínculos.
   - Protegido por `x-cron-secret` vía RPC `check_datadis_cron_secret(p text)` (Vault). `dry_run=true` por defecto. Acepta `{nifs:[...]}` para acotar.
2. **El cron nocturno (05:15 UTC) ya sincronizó con la cuenta partner**: **75 CUPS** en **13 empresas** (PAZ Y BIEN 30, BLUENET 19, CHEMTROL 13, + 10 pymes de 1-2 CUPS).
3. **Verificación end-to-end de v7**: run manual no-dry sobre CHEMTROL+BLUENET → `datadis_ultima_sync` avanzó a 06:53 UTC. Correcto.

## Integridad (auditado)
- 75/75 sincronizados con distribuidora, código distribuidora y tipo de punto poblados.
- **0 CUPS sincronizados perdieron el vínculo con empresa.** Campos comerciales del libro/Potencias protegidos.

## Reconciliación pendiente (no urgente)
- Algunas empresas tienen más CUPS autorizados en Datadis que en el CRM (p.ej. PAZ Y BIEN: 36 autorizados vs 32 en CRM → ~6 CUPS que Datadis conoce y el CRM no) y algún CUPS del CRM no cruzó. El worker los reporta en `sin_match_en_crm` / `sin_autorizacion`. Revisar con staging antes de dar de alta CUPS nuevos.
- Clientes con 403/404 = aún no han tramitado la autorización a Valere en Datadis. Se sincronizarán solos cuando la firmen (mismo flujo que el módulo de autorizaciones Fase 1).

## Pendiente operativo (Juan / Code)
- **Commit del worker v7**: `git add supabase/functions/datadis-sync/index.ts && git commit -m "feat(datadis): sync por authorizedNif (cuenta partner Valere)" && push` (rama `claude/ui-renovaciones-cups` o nueva).
- **Borrar `datadis-diag-temp`** del dashboard (neutralizada v15, devuelve 410).
