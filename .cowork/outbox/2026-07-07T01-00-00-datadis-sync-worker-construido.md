# Datadis sincronización — WORKER CONSTRUIDO Y CONEXIÓN ESTABLE (2026-07-07 madrugada)

> Autorizado por Juan a trabajar autónomo. Construido, desplegado, probado en producción.
> Complementa el diagnóstico de `2026-07-07T00-00-00-datadis-sincronizacion-diagnostico.md`.

## Qué se ha construido (todo en producción, verificado)

### 1. Worker `datadis-sync` (Edge Function)
- Código en repo: `supabase/functions/datadis-sync/` (index.ts + config.toml). **Pendiente de commit.**
- Desplegado y ACTIVE (version 4). `verify_jwt=false` pero **protegido por `x-cron-secret`** (patrón esios).
- **Modelo correcto**: cuenta PARTNER de Valere (secrets) → `get-supplies` AGREGADO (sin authorizedNif) → mapea cada CUPS a su empresa por **código CUPS**.
- **NO-DESTRUCTIVO (protege otras fases, exigido por Juan)**:
  - Campos `datadis_*`: se escriben siempre.
  - Campos COMPARTIDOS (`distribuidor`, `direccion_suministro`, `ciudad_suministro`): **solo se rellenan si están vacíos**; nunca pisan dato del libro de ventas / Potencias. Cuenta los conflictos evitados en `campos_comerciales_protegidos`.
  - NUNCA toca `empresa_id`, `contrato_id` ni vínculos.
  - CUPS de Datadis sin match en CRM → se reportan (`sin_match_en_crm`), NO se crean a ciegas.
- `dry_run=true` por defecto (doble seguridad); el cron pasa `dry_run:false`.

### 2. Conexión estable automática (cron)
- Secret en Vault: `datadis_cron_secret`.
- Validador SQL: `public.check_datadis_cron_secret(text)` (security definer, revocado de anon/authenticated).
- Cron `datadis-sync-nightly`: **diario 05:15 UTC**, `net.http_post` con `x-cron-secret` desde vault + `dry_run:false`. Patrón idéntico a `esios-nightly`.
- **Probado end-to-end**: ejecución manual del cron (request_id 48) → 13 CUPS de CHEMTROL re-sincronizados. Funciona.

### 3. Auditoría de integridad (antes de escribir)
- CHEMTROL: 15 CUPS, **15/15 mantienen vínculo con empresa**, 9 contratos intactos. El enriquecimiento NO rompió nada.
- Confirmado que el worker solo toca campos de datos, nunca relaciones.

## Estado de datos ahora
- **CHEMTROL sincronizado** con datos oficiales de Datadis (13 CUPS: distribuidora real I-DE/EDISTRIBUCIÓN, código distribuidora, tipo punto, ciudad).
- **El agregado partner solo contiene CHEMTROL (14 CUPS) por ahora.** Los demás clientes aparecerán en el agregado —y el cron los sincronizará solo— a medida que Juan tramite sus autorizaciones por la vía partner en Datadis.
- 1 CUPS que Datadis conoce y el CRM no (`…01EB0F`, Monesterio/Badajoz) → reportado, pendiente de decidir si se crea.

## Pendiente (Juan / próxima sesión)
- **Commit del worker**: `git add supabase/functions/datadis-sync/ && git commit && push` (rama actual `claude/ui-renovaciones` o una nueva `claude/datadis-sync`).
- **Borrar `datadis-diag-temp`** del dashboard Supabase (neutralizada, ya no hace nada).
- Endurecer `datadis-proxy` si se quiere (no urgente; el worker no lo usa).
- Cuando el agregado crezca (más autorizaciones tramitadas): el cron los sincroniza solo. Revisar `sin_match_en_crm` para decidir altas de CUPS nuevos (con staging).

## Cómo disparar el worker a mano (además del cron diario)
SQL: `select net.http_post(url:='.../functions/v1/datadis-sync', headers:=jsonb_build_object('x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='datadis_cron_secret'),'Content-Type','application/json'), body:='{"dry_run":true}'::jsonb);`
(dry_run:true para simular sin escribir; false para aplicar.)
