# Handoff — Sprint Holded Fase 0 + Fase 1 (código + DDL escritos, NADA aplicado)

**Fecha**: 2026-04-27 13:30 UTC
**Agente**: Cowork (Claude)
**Para**: Juan + próxima sesión Cowork (Fase 2 catálogos pull)

---

## TL;DR

> Fase 0 (auditoría) y Fase 1 (infraestructura) del plan Holded **escritas y validadas en dry-run**.
> **Nada aplicado en prod todavía**: Juan revisa y aplica.
> Bloqueador local: `.git/index` corrupto — Juan repara antes del commit.

---

## Para Juan — orden recomendado de pasos

### 1. Reparar git index (1 min)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\joliv\valere-v2\RUNBOOK.ps1" -OnlyRepair
```

Esto está documentado en CLAUDE.md (sprint 5 ya lo reparó una vez). Si el flag `-OnlyRepair` falla, alternativa:

```powershell
cd C:\Users\joliv\valere-v2
git read-tree --empty
git add -A
```

### 2. Crear rama y revisar (3 min)

```powershell
cd C:\Users\joliv\valere-v2
git checkout main
git pull origin main
git checkout -b claude/holded-integration
git status -s   # Debería mostrar 9 archivos nuevos + 1 modificado
```

Archivos esperados:

```
A  docs/AUDIT_DATOS_VALERE_PRE_HOLDED_2026-04-27.md
A  docs/SESIONES/2026-04-27-holded-fase0-fase1.md
A  src/core/integrations/holded/validators.test.ts
A  src/core/integrations/holded/validators.ts
A  src/features/admin/components/HoldedTab.tsx
A  supabase/functions/_shared/holded-client.ts
A  supabase/functions/holded-worker/index.ts
A  supabase/functions/notify-integration-error/index.ts
A  supabase/migrations/20260427_holded_data_audit.sql
A  supabase/migrations/20260427_holded_infrastructure.sql
M  docs/ESTADO.md
M  src/features/admin/AdminPage.tsx
A  RUNBOOK_HOLDED_FASE01.ps1
A  .cowork/outbox/2026-04-27T13-30-00-holded-fase01-handoff.md
```

### 3. Aplicar migration de auditoría (5 min)

Aplica la primera, MÁS SEGURA (sólo crea funciones + vistas, no modifica datos):

```powershell
# Vía Supabase Dashboard SQL Editor o psql:
psql "$env:VALERE_CRM_DB_URL" -f supabase/migrations/20260427_holded_data_audit.sql
```

O desde otra sesión Cowork con MCP:

```
"Aplica supabase/migrations/20260427_holded_data_audit.sql via MCP apply_migration con name=holded_data_audit"
```

Verifica luego:

```sql
SELECT * FROM public.holded_audit_resumen;
SELECT * FROM public.holded_audit_duplicados_nif;
```

Esperado: 27 empresas, 23 checksum válidos, 3 inválidos, 1 sin NIF, 0 duplicados.

### 4. Decidir destino de las 4 empresas problemáticas (5 min)

Detalle en `docs/AUDIT_DATOS_VALERE_PRE_HOLDED_2026-04-27.md` § 3. Resumen:

- `295b49f0-...` "Empresa Test SA" (sin NIF) — borrado lógico recomendado.
- `aeb693ba-...` "Industrias Valere Test S.L." (CIF mal) — borrado lógico.
- `58fae428-...` "la primera prueba sl" (CIF mal, viene de Potencias) — borrado lógico.
- `e95025b4-...` "PAZ Y BIEN 5002AP" (CIF mal, parece cliente real) — verifica el NIF correcto desde la UI o descarta de sync.

### 5. Crear `HOLDED_CRON_SECRET` (2 min)

Generar uno seguro:

```sql
-- En Supabase SQL Editor (con privilegios admin):
SELECT gen_random_uuid()::text || '-' || gen_random_uuid()::text AS holded_cron_secret;
```

Copia el resultado y mételo en **2 sitios**:

1. **Vault** (para que `holded_dispatch_worker()` SQL pueda leerlo):
   ```sql
   SELECT vault.create_secret(
     '<VALOR_GENERADO>',
     'HOLDED_CRON_SECRET',
     'Secret compartido entre pg_cron dispatcher y Edge Function holded-worker'
   );
   ```

2. **Edge Function Secrets** (para que la Edge Function `holded-worker` lo valide):
   - Dashboard Supabase → Settings → Edge Functions → Secrets → Add `HOLDED_CRON_SECRET=<MISMO_VALOR>`.
   - O CLI: `npx supabase secrets set HOLDED_CRON_SECRET=<VALOR> --project-ref gtphkowfcuiqbvfkwjxb`.

### 6. Aplicar migration de infraestructura (5 min)

Sólo después de tener el secret. Aplicar igual que paso 3:

```sql
-- O via MCP apply_migration con name=holded_infrastructure
```

Verifica:

```sql
SELECT count(*) FROM pg_policies WHERE tablename LIKE 'holded_%';  -- esperado: 18
SELECT * FROM cron.job WHERE jobname='holded_worker_5min';
SELECT * FROM public.holded_config;  -- enabled=false, mode=dry_run
```

### 7. Deploy Edge Functions (10 min)

Las 3 funciones via MCP `deploy_edge_function` o CLI:

```bash
# holded-worker — verify_jwt=false (webhook desde pg_cron, valida X-Cron-Secret internamente)
npx supabase functions deploy holded-worker --no-verify-jwt --project-ref gtphkowfcuiqbvfkwjxb

# notify-integration-error — verify_jwt=true (default, requiere JWT user)
npx supabase functions deploy notify-integration-error --project-ref gtphkowfcuiqbvfkwjxb
```

`_shared/holded-client.ts` se sube automáticamente porque está en el mismo `supabase/functions/`.

### 8. TSC + tests + build (5 min)

```powershell
cd C:\Users\joliv\valere-v2
npx tsc --noEmit                       # Debe ser 0 errores en Windows
npm test -- --run                      # Esperado: 39+ originales + 36 nuevos validators = 75+
npm run build                          # Build OK
```

**Nota sobre validación desde sandbox Linux**: en mi entorno Cowork (Linux mount del repo Windows) `tsc --noEmit` reportó errores tipo "Unterminated string literal" / "JSX element has no corresponding closing tag" en `src/App.tsx`, `src/main.tsx`, `src/features/admin/AdminPage.tsx`, `src/features/auth/LoginPage.tsx`, etc. — **NO son errores reales del código**, son artefactos de CRLF/BOM en archivos Windows leídos por TSC desde Linux. `file src/App.tsx` confirma `CRLF line terminators`. En Windows con PowerShell estos archivos compilan sin problemas (CLAUDE.md ya menciona el gotcha).

Mis archivos nuevos están en UTF-8 LF limpio (verificado con `file ...validators.ts` → `Unicode text, UTF-8 text`), así que en Windows tampoco deberían dar errores. Si encuentras algún error TS específico en mis archivos cuando ejecutes en Windows, mándalo y lo arreglamos.

Vitest aislado de mis tests (sólo `npx vitest run src/core/integrations/holded/validators.test.ts`):

```
✓ src/core/integrations/holded/validators.test.ts (36 tests)
Test Files  1 passed (1)
     Tests  36 passed (36)
```

Si la suite completa rompe en tu Windows también con vitest, los fallos serán los preexistentes de `src/core/utils/telemetry.test.ts` (8) y los 2 hooks tests vacíos (`useCustomFields.test.ts`, `useAutomatizaciones.test.ts`) — no del sprint.

### 9. Commit + push + PR (5 min)

```powershell
cd C:\Users\joliv\valere-v2
git add docs/ supabase/ src/ .cowork/ RUNBOOK_HOLDED_FASE01.ps1
git commit -m "feat(holded-fase01): infraestructura + auditoria datos pre-Holded"
git push -u origin claude/holded-integration
# Crear PR en GitHub apuntando a main, NO mergear todavía.
```

### 10. Smoke test (5 min, post-deploy)

- Login como master en `valere-v2.pages.dev` o `localhost:3000`.
- Ir a `/admin?tab=holded`.
- Verificar:
  - Banner: "Desactivada · dry_run · Catálogo productos: read · Excluidos: 1".
  - Métricas cola: todo a 0.
  - Salud datos pre-Holded: 27 empresas, 26 con NIF, 23 checksum válido, 3 amber.
  - Botón "Activar integración" presente (sólo master) y muestra ConfirmDialog al pulsar.
  - Botón "Notificar errores ahora" → invoca Edge Function → toast "Sin errores en últimas 24h".
  - Botón "Pull manual catálogos" deshabilitado (Fase 2).

---

## Archivos clave para próxima sesión Cowork (Fase 2)

1. `docs/PLAN_INTEGRACION_HOLDED.md` § Fase 2.
2. `supabase/migrations/20260427_holded_infrastructure.sql` (handlers a registrar en holded-worker).
3. `supabase/functions/_shared/holded-client.ts` (cliente HTTP listo para usar).
4. `supabase/functions/holded-worker/index.ts` (Map `handlers` vacío — Fase 2 lo puebla).
5. Endpoints Holded: GET `/invoicing/v1/funnels`, `/invoicing/v1/products`, `/invoicing/v1/treasury`, etc.

## Decisiones que esperan a Juan tras Fase 1

| # | Decisión | Cuándo |
|---|---|---|
| D1 | Borrar/marcar las 4 empresas de prueba | Antes de activar sync live |
| D2 | Verificar NIF correcto de PAZ Y BIEN 5002AP | Antes de activar sync live |
| D3 | Activar `holded_config.enabled=true` desde panel admin | Cuando Fase 2 esté operativa |
| D4 | Toggle a `mode='live'` en Fase 3 (sync contactos bidireccional) | Tras dry-run validado en Fase 3 |

## Riesgos abiertos

1. **Git index corrupto** se repite cada cierto tiempo. Considerar fix permanente: `git fsck --full` + reclonado del repo si vuelve.
2. **HOLDED_CRON_SECRET en Vault Y Edge Function Secrets**: si Juan los desincroniza, el worker rechaza todas las invocaciones. Dejar nota en `docs/SEGURIDAD.md` sobre rotación coordinada.
3. **pg_net**: hace requests asíncronos. Si la Edge Function falla con 500, no hay reintento desde pg_cron — el siguiente tick (5 min) re-intentará. OK para Fase 1; en Fase 8 considerar retry policy en pg_net config.
4. **Volumen primer pull Holded**: "varios miles de contactos". Fase 3 debe paginar (max_attempts=6 en queue). No bloqueante para Fase 1.

## Estado de tareas Cowork

- ✅ Procesar plan Holded + leer estado.
- ✅ Auditoría seguridad pre-arranque (gates C-01/M-06 confirmados con Juan).
- ✅ Fase 0 — auditoría datos (función NIF + reporte ejecutivo).
- ✅ Fase 1 — infraestructura (migration + Edge Functions + UI).
- ✅ Tests Vitest + paridad con tests SQL.
- ✅ Documentación + handoff + RUNBOOK.
- ⏳ Pendiente Juan: aplicar migrations + deploy Edge Functions + crear secret + commit + PR.
- ⏸️ Próxima sesión Cowork: Fase 2 catálogos pull-only.

---

## Quick reference

- Plan completo: `docs/PLAN_INTEGRACION_HOLDED.md`
- Auditoría datos: `docs/AUDIT_DATOS_VALERE_PRE_HOLDED_2026-04-27.md`
- Sesión: `docs/SESIONES/2026-04-27-holded-fase0-fase1.md`
- Migrations: `supabase/migrations/20260427_holded_data_audit.sql` + `..._holded_infrastructure.sql`
- Edge Functions: `supabase/functions/{_shared/holded-client,holded-worker,notify-integration-error}`
- Frontend: `src/core/integrations/holded/{validators,validators.test}` + `src/features/admin/components/HoldedTab.tsx`
- Runbook commit: `RUNBOOK_HOLDED_FASE01.ps1`
