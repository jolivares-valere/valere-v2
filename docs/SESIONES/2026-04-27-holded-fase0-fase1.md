# Sesión 2026-04-27 — Sprint Holded Fase 0 + Fase 1

**Agente**: Cowork (Claude)
**Sprint**: holded-fase0 + holded-fase1
**Plan padre**: `docs/PLAN_INTEGRACION_HOLDED.md`
**Branch objetivo**: `claude/holded-integration` (pendiente crear — git index corrupto)

---

## Contexto inicial

Juan lanzó nueva sesión Cowork con prompt detallado de Holded. Trabajo previo encadenado:

- ✅ Fase 2 unificación Potencias cerrada (526 filas migradas).
- ✅ RLS hardening 8 tablas Potencias-side aplicado.
- ✅ Auditoría seguridad 2026-04-27 con C-02/C-05/M-08 cerrados via apply_migration.
- ⚠️ ESTADO.md decía "NO arrancar Holded hasta C-01 + M-06" — discrepancia con propio audit que marca C-01 ✅ resuelto y M-06 decisión NO aplicar (Pro plan). Juan confirma arrancar.

## Bloqueos detectados al arranque

1. **Git index corrupto**: `fatal: unknown index entry format 0x00730000`. No se puede crear rama desde sandbox. Juan ejecuta `RUNBOOK.ps1 -OnlyRepair` antes del commit final.
2. **HOLDED_API_KEY**: confirmado en Edge Function Secrets del proyecto `gtphkowfcuiqbvfkwjxb` (digest `...728993b0ecb498c...`), NO en Vault. Patrón correcto.

## Decisiones tomadas en sesión

| # | Decisión | Razón |
|---|---|---|
| 1 | Arrancar sprint inmediatamente sin esperar M-06 | Juan confirma; M-06 requiere Pro plan, riesgo aceptado |
| 2 | Roles canónicos master/manager/consultant/client en TODAS las nuevas tablas | Audit C-03 |
| 3 | Worker invocado por pg_cron via pg_net + X-Cron-Secret | Patrón canónico Supabase Edge Functions schedule |
| 4 | Logs holded_integration_logs INSERT-ONLY (sin UPDATE/DELETE policies) | Audit log inmutable, RGPD |
| 5 | NIF/IBAN siempre enmascarados antes de loggear | RGPD compliance, helpers SQL + JS |
| 6 | NO migration de limpieza destructiva en Fase 0 | Datos en estado bueno post-Fase 2; correcciones por exclusión + revisión manual |
| 7 | Dry-run BEGIN/ROLLBACK contra prod antes de cada apply | Patrón usado en Fase 1/2 unificación |

## Entregables creados (NO aplicados todavía)

### Migrations
- `supabase/migrations/20260427_holded_data_audit.sql` (~250 líneas)
  - Función `valida_nif_cif(text)` IMMUTABLE — algoritmo letra control NIF/NIE + dígito CIF + 28 prefijos VAT UE.
  - Función `clasifica_nif_cif(text)` → `'NIF'|'NIE'|'CIF'|'VAT'|'INVALID'|'EMPTY'`.
  - Función `normaliza_nif_cif(text)`.
  - Vistas `holded_audit_empresas`, `holded_audit_resumen`, `holded_audit_duplicados_nif` con `security_invoker=on`.
  - REVOKE/GRANT ajustado para authenticated/service_role.

- `supabase/migrations/20260427_holded_infrastructure.sql` (~520 líneas)
  - `CREATE EXTENSION pg_net`.
  - Helper `is_master()` SECURITY DEFINER (faltaba en el set is_manager_or_above/is_approved).
  - Helpers `holded_mask_nif(text)`, `holded_mask_iban(text)` IMMUTABLE.
  - Cols `holded_id` (UNIQUE parcial), `holded_etag`, `holded_synced_at` en empresas, contactos, oportunidades, actividades, contratos.
  - 5 tablas nuevas con CHECK constraints, FK a user_profiles, índices apropiados:
    - `holded_config` singleton seed enabled=false dry_run productos_sync_mode=read.
    - `holded_sync_queue` con idempotency_key UNIQUE + estados pending/processing/done/error/skipped/dead_letter.
    - `holded_integration_logs` insert-only inmutable.
    - `holded_conflicts` con resolution enum.
    - `holded_sync_state` con 13 entidades seedeadas.
  - 18 policies granulares con roles canónicos (4 por tabla excepto logs que es insert-only).
  - Trigger `holded_set_updated_at()` reusable.
  - Helpers `holded_get_config()`, `holded_enqueue()` SECURITY DEFINER idempotente, `holded_dispatch_worker()` que lee CRON_SECRET de Vault.
  - pg_cron job `holded_worker_5min` programado (skip silencioso si disabled).

### Edge Functions Deno
- `supabase/functions/_shared/holded-client.ts` — cliente HTTP reusable.
- `supabase/functions/holded-worker/index.ts` — worker pg_cron.
- `supabase/functions/notify-integration-error/index.ts` — Resend errors digest.

### Frontend
- `src/core/integrations/holded/validators.ts` — gemelo JS-side de funciones SQL.
- `src/core/integrations/holded/validators.test.ts` — 35+ tests Vitest.
- `src/features/admin/components/HoldedTab.tsx` — UI mínima Fase 1.
- `src/features/admin/AdminPage.tsx` — añadido tab "Holded" sin tocar otros.

### Documentación
- `docs/AUDIT_DATOS_VALERE_PRE_HOLDED_2026-04-27.md` — reporte ejecutivo Fase 0.
- Esta sesión + handoff outbox + RUNBOOK PS1.

## Tests dry-run ejecutados contra prod (read-only)

| Test | Resultado |
|---|---|
| 10 unitarios `valida_nif_cif()` (B10759520, NIE válido, CIF mal control, etc.) | ✅ 10/10 PASS |
| Auditoría empresas reales (27 filas) | ✅ Hallazgos: 23 OK, 3 checksum mal, 1 sin NIF |
| Migration infraestructura DDL puro | ✅ 5 tablas + 18 policies + 15 cols dominio + 0 errores |
| Verificación count cols holded_*: empresas/contactos/oportunidades/actividades/contratos = 3 cada una | ✅ |

## Lo que NO está hecho (intencional o forzado)

- ❌ **Apply migrations en prod**: esperando OK Juan tras revisar dry-run.
- ❌ **Deploy Edge Functions**: requiere `HOLDED_CRON_SECRET` configurado primero.
- ❌ **Crear secret HOLDED_CRON_SECRET**: Juan lo genera (gen_random_uuid()) y lo mete en Vault + Edge Function Secrets.
- ❌ **Commits / PR**: git index corrupto en local.
- ❌ **TSC + tests pasando**: sandbox no tiene node_modules. Juan ejecuta `npx tsc --noEmit` y `npm test -- --run` en su máquina.
- ❌ **Smoke test UI tab Holded**: requiere deploy + login admin.

## Métricas del sprint

- 8 archivos nuevos creados.
- 1 archivo modificado (AdminPage.tsx).
- 0 archivos borrados.
- 0 commits desde sandbox (git roto).
- 4 empresas detectadas para revisión (3 tests + 1 real con NIF inválido).
- 0 cambios destructivos en prod.

## Próxima sesión

Lee este archivo + handoff outbox `.cowork/outbox/2026-04-27T<HHMMSS>-holded-fase01-handoff.md` + `docs/PLAN_INTEGRACION_HOLDED.md` Fase 2.

Sprint Fase 2: pull-only catálogos Holded → CRM (funnels, stages, productos, tesorerías, métodos pago, series, cuentas contables, tags, impuestos). Tablas espejo `holded_funnels`, `holded_stages`, etc. (read-only, fuente verdad Holded). Edge Function `holded-pull-catalogs` + cron `holded_pull_catalogs_daily` 03:30 UTC.
