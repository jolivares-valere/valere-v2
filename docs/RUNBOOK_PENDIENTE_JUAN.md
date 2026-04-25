# Runbook consolidado — pendientes Juan (sprints 5+6+7+8 + paralelos A/B/C)

> **Generado**: 2026-04-25 por sprint paralelo C (Cowork).
> **Propósito**: un solo documento para cerrar todo lo acumulado de los últimos sprints autónomos. Sustituye el ejercicio de releer 4-5 handoffs separados.
>
> **Cómo leerlo**: el runbook está ordenado por **dependencias y orden de ejecución**. Lee la sección "Mapa de dependencias" primero. Cada bloque indica tiempo estimado + qué desbloquea.

---

## TL;DR

Si tienes **30 min**: ejecuta solo el **Bloque 1** (script PowerShell de cierre acumulado). Cierra commits del PR #6 y limpia el repo.

Si tienes **2-3 horas**: ejecuta **Bloque 1 + Bloque 2** (Fase 2 datos vía pg_dump+psql). Desbloquea el resto del sprint Unificación.

Si tienes **medio día**: ejecuta los **5 bloques principales** (1, 2, 3, 4, 5) — cierras la unificación end-to-end y dejas el ecosistema preparado para Fase 5 cleanup.

---

## Mapa de dependencias

```
Bloque 1 (cierre PR #6)
    ↓
Bloque 2 (Fase 2 datos prod)
    ↓
    ├─ Bloque 3 (smoke tests post-Fase 2)
    │     ↓
    │     ├─ Bloque 4 (inventario apps satélite)  ← independiente, se puede hacer antes
    │     │     ↓
    │     │     Bloque 5 (cutover apps satélite a CRM)
    │     │           ↓
    │     │           Bloque 6 (decisión storage PDFs)  ← decisión paralela
    │     │
    │     └─ Bloque 7 (aplicar RLS hardening)
    │
    └─ Bloque 8 (limpieza Supabase Dashboard — chat-consultor + opcional pause Potencias)
```

Bloques **independientes** (se pueden hacer en cualquier momento sin depender de los demás):

- Bloque 4 (inventario apps satélite — solo necesita PowerShell local).
- Bloque 6 (decisión storage PDFs — discusión, no ejecución).
- Bloque 8 (limpieza Dashboard — manual web).

---

## Bloque 1 — Cierre acumulado PR #6 (≈10 min)

**Objetivo**: commit + push de todo lo que los sprints 5, 6, 7 y 8 dejaron preparado pero no commiteado (sandbox no puede tocar `.git`).

**Bloquea**: nada empieza limpio hasta que esto esté hecho. Es el primer paso siempre.

**Script unificado** (combina sprint 5 + 6 + 7 + 8):

```powershell
cd $HOME\valere-v2

# 1. Sincronizar rama PR #6
git fetch origin claude/docs-cierre-2026-04-23
git checkout claude/docs-cierre-2026-04-23
git pull origin claude/docs-cierre-2026-04-23
git checkout -- .   # reset CRLF noise

# 2. Borrar legacy/junk (sprint 5 + 8)
git rm -r src/features/chat-ia 2>$null
git rm -r supabase/functions/chat-consultor 2>$null
git rm -f q 2>$null
git rm -f useAuth.ts 2>$null
git rm -f "import { useEffect } from 'react'.txt" 2>$null
git rm -f "import { useState } from 'react'.txt" 2>$null
git rm -f tsc_output.txt 2>$null
git rm -f supabase-migration.sql 2>$null
git rm -f src/core/types/database_canonical_2026-04-26.ts 2>$null
if (Test-Path "CRM VALERE") { Remove-Item -Recurse -Force "CRM VALERE" }

# 3. Add cambios sprints 5+6+7+8 + paralelo C
git add docs/INVENTARIO_GEMINI_2026-04-25.md
git add supabase/functions/_shared/ai-adapter.ts
git add supabase/migrations/20260426_fase1_unificacion_renames_schema.sql
git add scripts/unificacion_fase2_protocolo.md
git add scripts/unificacion_fase2_a_staging.sql
git add scripts/unificacion_fase2_b_dedupe_y_transform.sql
git add scripts/unificacion_fase2_c_verificacion.sql
git add docs/REFACTOR_FE_FASE3_2026-04-26.md
git add docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md
git add supabase/migrations/_draft_rls_hardening_8_tables.sql
git add src/features/admin/AdminPage.tsx
git add src/features/analisis/AnalisisPage.tsx
git add src/types/database.ts
git add src/core/types/database.ts
git add docs/ESTADO.md

# Sprint paralelo C (este runbook + comunicado + inventario template + agent playbook)
git add docs/INVENTARIO_APPS_SATELITE_TEMPLATE.md
git add scripts/inventario_apps_satelite.ps1
git add docs/COMUNICADO_UNIFICACION_DRAFT.md
git add docs/RUNBOOK_PENDIENTE_JUAN.md
git add .cowork/AGENT_PLAYBOOK.md

# Outboxes acumulados
git add ".cowork/outbox/2026-04-25T16-40-00-sprint-autonomo-5-rag-verificado-y-sync.md"
git add ".cowork/outbox/2026-04-25T17-19-00-sprint-autonomo-6-unificacion-fase1-fase2-listas.md"
git add ".cowork/outbox/2026-04-25T19-00-00-sprint-autonomo-7-fase1-aplicada-fe-refactor-y-fase2-pendiente-juan.md"
git add ".cowork/outbox/2026-04-25T19-30-00-sprint-autonomo-8-validacion-plan-fases-4-5-rls-draft.md"
git add ".cowork/outbox/sprint-paralelo-C-coordinacion-*.md"

# 4. Verificar
npx tsc --noEmit
npm test -- --run

# Si TSC o tests fallan: parar, capturar el error, reportar en próxima sesión Cowork.

# 5. Commit + push
git commit -m "feat(unificacion): sprints 5+6+7+8 + paralelo C - asistente RAG verificado + Fase 1 schema + FE refactor + plan Fase 4-5 + apps satelite inventory + comunicado

DB:
- Fase 1 unificacion aplicada: renames retailers/retailer_offers/boe_regulated_prices + col retailer_id->comercializadora_id + 7 cols precios_regulados_boe + backfill
- Compat views legacy con SECURITY INVOKER + INSTEAD OF INSERT triggers (red de seguridad)
- ai-adapter.ts: gemini-2.5-flash + gemini-embedding-001 (sync repo<->deployed)

FE:
- Refactor 100% completo: AdminPage, AnalisisPage, src/types/database.ts
- src/core/types/database.ts regenerado post-rename

Cleanup:
- delete chat-ia + chat-consultor (huerfanos desde FASE 20.8)
- delete legacy junk en raiz
- delete src/core/types/database_canonical_2026-04-26.ts (duplicado)

Docs:
- INVENTARIO_GEMINI, PLAN_UNIFICACION_FASES_4_5, REFACTOR_FE_FASE3, ESTADO sprints 5-8
- _draft_rls_hardening_8_tables.sql (no aplicado, pending Fase 2)
- INVENTARIO_APPS_SATELITE_TEMPLATE + script PowerShell (sprint paralelo C)
- COMUNICADO_UNIFICACION_DRAFT (sprint paralelo C)
- RUNBOOK_PENDIENTE_JUAN (sprint paralelo C, este doc)
- AGENT_PLAYBOOK (sprint paralelo C)

Pendiente Juan:
- Fase 2 data import via pg_dump+psql
- Storage bucket migration decision
- Apps satelite refactor / cutover
- Aplicar RLS hardening tras Fase 2"

git push origin claude/docs-cierre-2026-04-23
```

**Verificación post-bloque**:
- `git status` limpio.
- PR #6 muestra los commits nuevos en GitHub.
- TSC 0 errores, 39/39 tests verdes.

**Tiempo total**: ≈10 min (5 min ejecución + 5 min verificación).

---

## Bloque 2 — Fase 2 datos prod (≈30-60 min)

**Objetivo**: importar las ~408 filas de datos reales del proyecto Potencias al CRM (con dedupe por CIF/CUPS y mapeo legacy→canonical).

**Bloquea**: smoke tests, cutover apps satélite, RLS hardening realista. **Es el bloque crítico.**

**Prerequisito**:
- Bloque 1 hecho (TSC 0 + tests verdes).
- Connection strings de los 2 proyectos Supabase (los lees del Dashboard, no se commitean).

**Cómo conseguir las passwords**:
- CRM: https://supabase.com/dashboard/project/gtphkowfcuiqbvfkwjxb/settings/database → "Connection pooling" → Session mode → "Show password".
- Potencias: https://supabase.com/dashboard/project/alesfvxqtwlrwlmkoosg/settings/database → idem.

**Ejecución** (sigue íntegramente `scripts/unificacion_fase2_protocolo.md`):

```powershell
$env:PGPASSWORD_CRM = "<password CRM>"
$env:PGPASSWORD_POT = "<password Potencias>"

# Conexiones (ajustar región si es distinta)
$ConnCrm = "postgresql://postgres.gtphkowfcuiqbvfkwjxb:$env:PGPASSWORD_CRM@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
$ConnPot = "postgresql://postgres.alesfvxqtwlrwlmkoosg:$env:PGPASSWORD_POT@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

# 1. BACKUPS (siempre)
$Stamp = Get-Date -Format "yyyyMMdd_HHmm"
pg_dump $ConnCrm --no-owner --no-acl --schema=public > $HOME\valere-backups\crm_pre_fase2_$Stamp.sql
pg_dump $ConnPot --no-owner --no-acl --schema=public > $HOME\valere-backups\potencias_pre_fase2_$Stamp.sql

# 2. Crear staging fresh
psql $ConnCrm -f .\scripts\unificacion_fase2_a_staging.sql

# 3. Dump+load Potencias data
pg_dump $ConnPot --data-only --column-inserts --no-owner --no-acl --schema=public `
  -t public.clients -t public.supplies -t public.profiles `
  -t public.comercializadoras -t public.regulated_rates -t public.email_templates `
  -t public.expedientes -t public.ciclos -t public.power_requests `
  -t public.savings_calculations -t public.client_communications `
  -t public.client_documents -t public.expediente_documents `
  -t public.comercializadora_docs -t public.documentacion `
  -t public.status_log > $HOME\valere-backups\potencias_data_only.sql

# Sustituir public. → _potencia_staging.
$content = Get-Content $HOME\valere-backups\potencias_data_only.sql -Raw
$content -replace 'public\.', '_potencia_staging.' | Out-File -Encoding utf8 $HOME\valere-backups\potencias_data_only_staged.sql
psql $ConnCrm -f $HOME\valere-backups\potencias_data_only_staged.sql

# 4. Transform — primero ROLLBACK para validar
# (en scripts/unificacion_fase2_b_dedupe_y_transform.sql, descomentar ROLLBACK del final, comentar COMMIT)
psql $ConnCrm -f .\scripts\unificacion_fase2_b_dedupe_y_transform.sql

# 5. Verificación
psql $ConnCrm -f .\scripts\unificacion_fase2_c_verificacion.sql

# 6. Si la verificación cuadra → COMMIT real
# (volver a poner COMMIT, comentar ROLLBACK en _b_dedupe_y_transform.sql)
psql $ConnCrm -f .\scripts\unificacion_fase2_b_dedupe_y_transform.sql

# 7. Verificar de nuevo
psql $ConnCrm -f .\scripts\unificacion_fase2_c_verificacion.sql

# 8. Limpiar staging cuando todo cuadre + apps satélite estén apuntando al CRM
# psql $ConnCrm -c "DROP SCHEMA _potencia_staging CASCADE;"   # NO ejecutar todavía
```

**Counts esperados** (verificar al final):

```sql
SELECT 'empresas (~30 + 3 test)' AS t, count(*) FROM empresas
UNION ALL SELECT 'cups (~75 + 1 test)', count(*) FROM cups
UNION ALL SELECT 'expedientes (~41)', count(*) FROM expedientes
UNION ALL SELECT 'ciclos (~41)', count(*) FROM ciclos
UNION ALL SELECT 'solicitudes_potencia (~41)', count(*) FROM solicitudes_potencia;
```

**Si algo falla**: el `BEGIN…COMMIT` envuelve toda la transformación. Si el verifier `_c_verificacion.sql` reporta orphans > 0 o counts < esperados, **NO HAGAS COMMIT** — vuelve a la versión con `ROLLBACK` y debugea con Cowork antes de seguir.

**Tiempo total**: 30-60 min (depende de latencia de red para los `pg_dump`).

---

## Bloque 3 — Smoke tests post-Fase 2 (≈30 min)

**Objetivo**: verificar que la app sigue funcionando con los datos reales importados.

**Prerequisito**: Bloque 2 hecho.

**Pasos** (Fase 4.B del plan):

1. **Login** en `https://valere-v2.pages.dev`.
2. **Empresas** → ver listado, abrir 2-3 que vinieron de Potencias (con `legacy_potencia_id` no null), ver detalles.
3. **CUPS** → mismo: listado, detalle, comprobar `p1_kw..p6_kw`, dirección.
4. **Expedientes** (si la pantalla está habilitada — depende de Opción A/B) → listado.
5. **Admin → Comercializadoras** → ver 6 originales + 2 importadas o fusionadas.
6. **Admin → Ofertas** → si hay ofertas creadas, ver. Crear una nueva. Editar. Borrar.
7. **Análisis** → seleccionar empresa con CUPS, ejecutar análisis. Comprobar carga `comercializadora_ofertas` y `precios_regulados_boe`.
8. **Asistente RAG** → preguntar algo. Debe responder igual que antes.
9. **Logs Edge Function**: verificar 0 errores nuevos vía MCP `get_logs` o Dashboard.

**Si algo falla**: capturar el error específico (screenshot + URL + mensaje) y avisar a Cowork. La mayoría de fallos serán o queries con nombre viejo de tabla (refactor incompleto) o RLS bloqueando lectura.

**Tiempo total**: 30 min.

---

## Bloque 4 — Inventario apps satélite (≈5 min ejecución + 10 min revisión)

**Objetivo**: rellenar `docs/INVENTARIO_APPS_SATELITE_<fecha>.md` con datos reales de los 3 repos no-mounted.

**Prerequisito**: ninguno (independiente). Se puede hacer en paralelo con cualquier otro bloque.

**Ejecución**:

```powershell
cd $HOME\valere-v2
powershell -ExecutionPolicy Bypass -File scripts\inventario_apps_satelite.ps1

# Output en $HOME\valere-backups\inventario-apps-satelite-<stamp>.md
# Revisa el archivo y, si es útil, súbelo al repo:
Copy-Item $HOME\valere-backups\inventario-apps-satelite-<stamp>.md docs\INVENTARIO_APPS_SATELITE_$(Get-Date -Format yyyy-MM-dd).md
git add docs\INVENTARIO_APPS_SATELITE_*.md
git commit -m "docs: inventario apps satelite (script automatico)"
git push
```

**Qué hacer con el output**:
- Si las apps **no existen localmente** (script reporta `[WARN] No existe`): edita la sección CONFIG del script con las rutas correctas y vuelve a ejecutar. Si los repos no están clonados: `gh repo clone jolivares-valere/valere-gestion-potencias` (idem para los otros).
- Si las apps existen y se inventarían: pásale el `.md` a Cowork en próxima sesión para diseñar las compat views específicas.

**Bloquea**: Bloque 5 (cutover apps satélite). Sin saber qué tablas y env vars usa cada app, las compat views se diseñan a ciegas.

**Tiempo total**: 15 min.

---

## Bloque 5 — Cutover apps satélite a CRM (≈30 min por app, máximo 1.5h)

**Objetivo**: cambiar las apps satélite (Potencias, Excedentes, Energética) para que apunten al CRM canónico.

**Prerequisito**: Bloque 2 (datos en CRM) + Bloque 3 (smoke tests OK) + Bloque 4 (inventario completo).

**Decisión previa Juan**: Opción A (apps separadas, solo cambia URL) vs Opción B (absorber en CRM). Ver `docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md` §4.D.

**Si Opción A** (recomendada para cutover urgente):

1. Cowork crea las compat views específicas en una nueva migration `supabase/migrations/<fecha>_compat_views_apps_satelite.sql`. (Pendiente — depende del Bloque 4).
2. Aplicar la migration vía MCP o Dashboard.
3. En cada app satélite (PowerShell local del repo):

   ```powershell
   # Ejemplo para Potencias:
   cd $HOME\valere-gestion-potencias
   # Editar .env / .env.production
   # VITE_SUPABASE_URL = https://gtphkowfcuiqbvfkwjxb.supabase.co
   # VITE_SUPABASE_ANON_KEY = <anon key CRM, dashboard>
   git commit -am "chore: apuntar Supabase al proyecto CRM canonico"
   git push origin main
   # Cloudflare Pages auto-deploya
   ```

4. Smoke test rápido en cada app: login + ver una pantalla con datos.

**Si Opción B**: este bloque se sustituye por un sprint dedicado (3-4 días) de implementación de features en el CRM. Ver §4.D del plan.

**Tiempo total**: 30 min/app × 3 = 1.5h máx (si todas existen y compat views ya están aplicadas).

---

## Bloque 6 — Decisión storage bucket PDFs Potencias (≈30 min discusión)

**Objetivo**: decidir qué hacer con los PDFs almacenados en el bucket del proyecto Potencias.

**Prerequisito**: ninguno (decisión, no ejecución). Pero **bloquea Fase 5 cleanup** (no se puede pausar el proyecto Potencias sin resolver esto).

**Contexto**: la Fase 2 migra registros de `client_documents` y `expediente_documents` al CRM, pero los `storage_path` apuntan a buckets del proyecto Potencias. Si pausamos el proyecto Potencias, las URLs rompen.

**Opciones**:

- **A. Copiar bucket completo Potencias→CRM**. Estimación: 1-2h vía Supabase CLI o script. Riesgo: paths cambian, hay que reescribir `storage_path` en el CRM.
- **B. Mantener Potencias project vivo** solo como CDN de los PDFs viejos. Coste: gratis (free tier suficiente). Operativamente sucio (proyecto fantasma).
- **C. Asumir pérdida** de PDFs viejos y empezar de cero en CRM. Solo viable si los PDFs no son críticos (consultar legal/cumplimiento).

**Recomendación Cowork**: A es la opción limpia. Plan en sprint dedicado (1 día):
1. Inventario de blobs en bucket Potencias.
2. Script de copia bucket→bucket.
3. UPDATE masivo en CRM de `storage_path` con los nuevos paths.
4. Verificación de URLs accesibles.

**Acción inmediata Juan**: decidir entre A/B/C en próxima sesión Cowork. No se ejecuta hasta tener decisión.

**Tiempo discusión**: 30 min. Tiempo ejecución (si Opción A): 1 día persona aparte.

---

## Bloque 7 — Aplicar RLS hardening (≈20 min)

**Objetivo**: sustituir las 8 policies `USING(true)` por policies granulares (creator-or-manager).

**Prerequisito**: Bloques 2 + 3 hechos. Necesitamos datos reales y usuarios reales para verificar que las policies no rompen el día a día.

**Ejecución**:

1. Renombrar el draft para que se aplique:

   ```powershell
   cd $HOME\valere-v2
   git mv supabase/migrations/_draft_rls_hardening_8_tables.sql supabase/migrations/20260427_rls_hardening_8_tables.sql
   ```

2. Aplicar via MCP o Dashboard:
   - **MCP** (recomendado, pide Cowork en próxima sesión): `apply_migration` con el contenido del archivo.
   - **Dashboard**: pegar en SQL Editor y Run.

3. Verificar advisors:

   ```sql
   -- Esperado: 0 ERRORs, < 5 WARNs (idealmente solo auth_leaked_password_protection Pro plan)
   SELECT * FROM mcp__get_advisors;  -- vía MCP
   ```

4. Smoke test con usuarios de distinto rol (admin, gestor, comercial) — verificar que cada uno ve/edita lo esperado.

**Si rompe algo**: el draft es revertible — basta con un `DROP POLICY` y volver a las USING(true). Pero coordina con Cowork antes de revertir.

**Tiempo total**: 20 min ejecución + 30 min smoke test multi-rol = 50 min.

---

## Bloque 8 — Limpieza Supabase Dashboard (≈10 min)

**Objetivo**: borrar artefactos huérfanos en Supabase que el código del repo ya no usa.

**Prerequisito**: ninguno (independiente). Recomendado tras Bloque 1 (commits del cleanup en repo).

**Acciones manuales en Supabase Dashboard**:

1. **Borrar Edge Function `chat-consultor`** (huérfana desde FASE 20.8):
   - https://supabase.com/dashboard/project/gtphkowfcuiqbvfkwjxb/functions
   - Buscar `chat-consultor` → Delete.
   - **Por qué**: el deploy local no la borra remotamente. MCP no expone `delete_edge_function`.

2. **Verificar que `GEMINI_API_KEY` está configurada** en Edge Function secrets:
   - https://supabase.com/dashboard/project/gtphkowfcuiqbvfkwjxb/settings/functions
   - Confirmar que la key está activa y funciona (el asistente RAG ya está operativo, así que esto es solo verificación).

3. **(Opcional, tras Bloque 5 + 1 semana estable)**: pausar proyecto Potencias.
   - https://supabase.com/dashboard/project/alesfvxqtwlrwlmkoosg/settings/general → "Pause project".
   - Antes de pausar: `pg_dump` final como backup permanente en `$HOME\valere-backups\potencias_final_archive.sql`.
   - **NO PAUSAR** sin haber resuelto Bloque 6 (storage PDFs).

**Tiempo total**: 10 min (sin contar la pausa del proyecto Potencias).

---

## Tareas paralelas opcionales (cuando tengas un hueco)

Estas tareas no bloquean nada del sprint Unificación, pero quedan en pendiente desde sprints anteriores y conviene cerrarlas:

### Backup Arsys (correos)
- Estado: bloqueado por Arsys (esperando que el backup esté listo).
- Doc: `docs/PLAN_ARSYS_CONVERSION_IMPORT.md`.
- Acción: revisar email Arsys / panel para ver si el backup ya está disponible.

### Refactor Potencias a serverless (eliminar `VITE_GEMINI_API_KEY` del bundle)
- Estado: pendiente, **alto impacto seguridad**.
- Doc: `docs/PLAN_MIGRACION_POTENCIAS_CLOUDFLARE.md`.
- Acción: 1.5h refactor + 1.5h migración Cloudflare + 30 min verificación.
- Solo necesario si Bloque 4 confirma que `VITE_GEMINI_API_KEY` sigue en el bundle de Potencias.

### Migración Auth → Google Identity
- Estado: planificado, no urgente.
- Doc: `docs/PLAN_MIGRACION_AUTH_GOOGLE_IDENTITY.md`.
- Acción: 4-6h trabajo + comunicación + dual-mode + cleanup.

### Inventario Gemini cross-app
- Estado: parcialmente cubierto por Bloque 4 (script PowerShell).
- Doc: `docs/INVENTARIO_GEMINI_2026-04-25.md`.
- Acción: ejecutar Bloque 4 ya cubre el inventario de las 3 apps.

### Comunicado al equipo (post-cutover)
- Estado: borrador listo.
- Doc: `docs/COMUNICADO_UNIFICACION_DRAFT.md`.
- Acción: cuando Bloque 3 (smoke tests) esté verde y Bloque 5 (cutover) hecho, enviar.

---

## Estado al cierre del sprint paralelo C

| Bloque | Estado | Quién | Tiempo |
|---|---|---|---|
| 1. Cierre PR #6 | ⏸️ pendiente | Juan | 10 min |
| 2. Fase 2 datos | ⏸️ pendiente (passwords) | Juan | 30-60 min |
| 3. Smoke tests post-Fase 2 | 🔒 bloqueado por 2 | Juan | 30 min |
| 4. Inventario apps satélite | ⏸️ pendiente (script listo) | Juan | 15 min |
| 5. Cutover apps satélite | 🔒 bloqueado por 2+3+4 + decisión A/B | Juan + Cowork | 1.5h |
| 6. Decisión storage PDFs | ⏸️ pendiente (decisión) | Juan | 30 min |
| 7. RLS hardening | 🔒 bloqueado por 2+3 | Cowork (vía MCP) | 50 min |
| 8. Cleanup Dashboard | ⏸️ pendiente (independiente) | Juan | 10 min |
| **Total camino crítico** | | | **~3-4h Juan + 1h Cowork** |

---

## Para sesiones futuras

Cuando retomes una sesión Cowork con este runbook abierto:

1. Lee solo este documento + `docs/ESTADO.md`.
2. Cuéntale a Cowork qué bloques has completado.
3. Cowork actualiza este runbook (marca completados, ajusta pendientes), genera siguientes pasos.
4. Si algún bloque rompe (TSC error, smoke test fail, advisor ERROR nuevo), captura el output exacto y abre conversación con Cowork.

Este runbook se actualiza cuando se completa un bloque, no cuando se crea trabajo nuevo. Para trabajo nuevo, sigue el patrón de handoff en `.cowork/outbox/`.

---

## Referencias

- `.cowork/outbox/2026-04-25T16-40-00-sprint-autonomo-5-rag-verificado-y-sync.md`
- `.cowork/outbox/2026-04-25T17-19-00-sprint-autonomo-6-unificacion-fase1-fase2-listas.md`
- `.cowork/outbox/2026-04-25T19-00-00-sprint-autonomo-7-fase1-aplicada-fe-refactor-y-fase2-pendiente-juan.md`
- `.cowork/outbox/2026-04-25T19-30-00-sprint-autonomo-8-validacion-plan-fases-4-5-rls-draft.md`
- `docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md`
- `scripts/unificacion_fase2_protocolo.md`
- `scripts/inventario_apps_satelite.ps1`
- `docs/INVENTARIO_APPS_SATELITE_TEMPLATE.md`
- `docs/COMUNICADO_UNIFICACION_DRAFT.md`
- `.cowork/AGENT_PLAYBOOK.md`
