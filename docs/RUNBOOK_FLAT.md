# RUNBOOK_FLAT — secuencia plana de comandos

> **Estrategia**: comandos planos, sin helpers custom. Pega cada bloque en una consola PowerShell 5.1 (la default de Windows, `powershell.exe`).
> **Renuncia**: `RUNBOOK.ps1` (con helpers custom) está marcado deprecated por incompatibilidades repetidas con PS 5.1. Usa este documento o `RUNBOOK_FLAT.ps1` (validado con PSScriptAnalyzer + parser pwsh).

## Cómo usar

Tienes 3 opciones:

1. **Pegar bloques A-E uno por uno** en `powershell.exe`. Lee el resultado esperado antes de seguir al siguiente.
2. **Ejecutar `RUNBOOK_FLAT.ps1`** completo (atajo). Se para automáticamente si TSC o tests fallan.
3. **Bloques manuales (Bloque F)** sin ejecutar — son decisiones / acciones manuales que requieren tu input.

```
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\joliv\valere-v2\RUNBOOK_FLAT.ps1"
```

---

## Bloque A — Reparación `.git/` (idempotente)

Mueve locks huérfanos + limpia null bytes de `.git/config`, `HEAD`, `refs/`. Necesario porque el sandbox de Cowork sobre mount Windows corrompe esos archivos.

```powershell
cd C:\Users\joliv\valere-v2

$gitDir = 'C:\Users\joliv\valere-v2\.git'
$stamp = Get-Date -Format 'yyyyMMddHHmmss'

# A.1 mover locks huerfanos
foreach ($lock in @('index.lock','config.lock','HEAD.lock','ORIG_HEAD.lock')) {
    $p = Join-Path $gitDir $lock
    if (Test-Path $p) {
        try { Move-Item -Path $p -Destination ($p + '.bak.' + $stamp) -Force -ErrorAction Stop; Write-Host "  Movido: $lock" }
        catch { try { Remove-Item -Path $p -Force -ErrorAction Stop; Write-Host "  Borrado: $lock" } catch { Write-Host "  Sin tocar: $lock" } }
    }
}

# A.2 limpiar null bytes
$crit = @((Join-Path $gitDir 'config'), (Join-Path $gitDir 'HEAD'), (Join-Path $gitDir 'ORIG_HEAD'), (Join-Path $gitDir 'FETCH_HEAD'), (Join-Path $gitDir 'packed-refs'))
$refsDir = Join-Path $gitDir 'refs'
if (Test-Path $refsDir) { Get-ChildItem -Path $refsDir -Recurse -File | ForEach-Object { $crit += $_.FullName } }
foreach ($f in $crit) {
    if (-not (Test-Path $f)) { continue }
    $bytes = [System.IO.File]::ReadAllBytes($f)
    if ($bytes.Length -eq 0) { continue }
    if ($bytes -notcontains 0) { continue }
    $clean = $bytes | Where-Object { $_ -ne 0 }
    [System.IO.File]::WriteAllBytes($f, [byte[]]$clean)
    Write-Host ("  Null bytes limpiados: " + $f.Replace('C:\Users\joliv\valere-v2\', ''))
}

# A.3 validar git
git branch --show-current
```

**Resultado esperado**: una línea con el nombre de la rama (probablemente `claude/docs-cierre-2026-04-23` si ya estás en ella, o `main` si no). Si en su lugar ves un error de git tipo `fatal: bad config line`, vuelve a ejecutar A.2 (idempotente). Si persiste, llama a Cowork.

---

## Bloque B — Switch rama PR + reset CRLF + git rm legacy + uninstall framer-motion

```powershell
cd C:\Users\joliv\valere-v2

# B.1 sincronizar rama PR #6
git fetch origin claude/docs-cierre-2026-04-23
git checkout claude/docs-cierre-2026-04-23
git pull origin claude/docs-cierre-2026-04-23

# B.2 reset CRLF noise
git checkout -- .

# B.3 git rm legacy (cada uno con 2>$null para ignorar si ya fue borrado)
git rm -r -f -- "src/features/chat-ia" 2>$null
git rm -r -f -- "supabase/functions/chat-consultor" 2>$null
git rm -f -- "q" 2>$null
git rm -f -- "useAuth.ts" 2>$null
git rm -f -- "import { useEffect } from 'react'.txt" 2>$null
git rm -f -- "import { useState } from 'react'.txt" 2>$null
git rm -f -- "tsc_output.txt" 2>$null
git rm -f -- "supabase-migration.sql" 2>$null
git rm -f -- "src/core/types/database_canonical_2026-04-26.ts" 2>$null

# B.4 carpeta CRM VALERE vacía
if (Test-Path 'C:\Users\joliv\valere-v2\CRM VALERE') {
    Remove-Item -Path 'C:\Users\joliv\valere-v2\CRM VALERE' -Recurse -Force
}

# B.5 framer-motion
npm uninstall framer-motion
```

**Resultado esperado**:

- `git fetch` y `git pull`: avanzar la rama o `Already up to date`.
- `git checkout`: `Switched to branch 'claude/docs-cierre-2026-04-23'` (o `Already on …`).
- `git checkout -- .`: silencio.
- Cada `git rm`: una línea `rm '...'` o silencio si ya estaba borrado.
- `npm uninstall framer-motion`: línea diciendo que removió 1 package y actualizó `package-lock.json`.

Si `git checkout` falla por cambios sin commitear: ejecuta `git stash push -u -m runbook-stash` y reintenta. Recuperas con `git stash pop` después.

---

## Bloque C — `git add` 26 entregables (lista expandida, sin lógica)

```powershell
cd C:\Users\joliv\valere-v2

git add -- "docs/INVENTARIO_GEMINI_2026-04-25.md"
git add -- "supabase/functions/_shared/ai-adapter.ts"
git add -- "supabase/migrations/20260426_fase1_unificacion_renames_schema.sql"
git add -- "scripts/unificacion_fase2_protocolo.md"
git add -- "scripts/unificacion_fase2_a_staging.sql"
git add -- "scripts/unificacion_fase2_b_dedupe_y_transform.sql"
git add -- "scripts/unificacion_fase2_c_verificacion.sql"
git add -- "docs/REFACTOR_FE_FASE3_2026-04-26.md"
git add -- "src/features/admin/AdminPage.tsx"
git add -- "src/features/analisis/AnalisisPage.tsx"
git add -- "src/types/database.ts"
git add -- "src/core/types/database.ts"
git add -- "docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md"
git add -- "supabase/migrations/_draft_rls_hardening_8_tables.sql"
git add -- "docs/INVENTARIO_APPS_SATELITE_TEMPLATE.md"
git add -- "scripts/inventario_apps_satelite.ps1"
git add -- "docs/COMUNICADO_UNIFICACION_DRAFT.md"
git add -- "docs/RUNBOOK_PENDIENTE_JUAN.md"
git add -- "docs/RUNBOOK_FLAT.md"
git add -- ".cowork/AGENT_PLAYBOOK.md"
git add -- "docs/ESTADO.md"
git add -- "RUNBOOK.ps1"
git add -- "RUNBOOK_FLAT.ps1"
git add -- "package.json"
git add -- "package-lock.json"
git add -- ".cowork/outbox/2026-04-25T16-40-00-sprint-autonomo-5-rag-verificado-y-sync.md"
git add -- ".cowork/outbox/2026-04-25T17-19-00-sprint-autonomo-6-unificacion-fase1-fase2-listas.md"
git add -- ".cowork/outbox/2026-04-25T19-00-00-sprint-autonomo-7-fase1-aplicada-fe-refactor-y-fase2-pendiente-juan.md"
git add -- ".cowork/outbox/2026-04-25T19-30-00-sprint-autonomo-8-validacion-plan-fases-4-5-rls-draft.md"

git status --short
```

**Resultado esperado**: `git status --short` muestra ~26 líneas con prefijo `A `, `M ` o `D ` (added, modified, deleted). Si ves archivos en rojo sin staging (`??`), revisa si quieres añadirlos manualmente.

Si algún `git add` da `pathspec '...' did not match any files`: el archivo no existe — es OK, ya estaba borrado o no fue generado por algún paralelo. Sigue.

---

## Bloque D — TSC + tests

```powershell
cd C:\Users\joliv\valere-v2

npx tsc --noEmit
if ($LASTEXITCODE -eq 0) { npm test -- --run } else { Write-Host "TSC fallo - NO commitees" -ForegroundColor Red }
```

**Resultado esperado**:

- `npx tsc --noEmit`: silencio si compila. Si hay errores, los lista por archivo:línea.
- `npm test -- --run`: corre vitest, debe terminar con `Test Files 39 passed (39)` o similar.

Si TSC falla con errores tipo `Property 'X' does not exist on type 'Y'` — captura el output y mándamelo (Cowork). NO sigas al Bloque E hasta que esté arreglado.

---

## Bloque E — Commit + push

```powershell
cd C:\Users\joliv\valere-v2

# E.1 mensaje en archivo temporal (evita problemas con quotes/here-strings en PS 5.1)
$msg = "feat(unificacion): sprints 5+6+7+8 + paralelo C - cierre acumulado`n`nDB: Fase 1 unificacion aplicada en prod + compat views legacy + ai-adapter sync`nFE: refactor 100% + tipos regenerados`nCleanup: chat-ia + chat-consultor + legacy junk + framer-motion`nDocs: INVENTARIO_GEMINI, PLAN_UNIFICACION_FASES_4_5, REFACTOR_FE_FASE3, RUNBOOK_FLAT`nPendiente Juan: Fase 2 datos, storage decision, apps satelite, RLS hardening"
$tmpFile = New-TemporaryFile
Set-Content -Path $tmpFile.FullName -Value $msg -Encoding utf8
git commit -F $tmpFile.FullName
Remove-Item -Path $tmpFile.FullName -Force

# E.2 push
git push origin claude/docs-cierre-2026-04-23
```

**Resultado esperado**:

- `git commit`: una línea `[claude/docs-cierre-2026-04-23 <sha>] feat(unificacion):...` y debajo `XX files changed, NN insertions(+), MM deletions(-)`.
- `git push`: las líneas tipo `Counting objects`, `Compressing`, finalizando con `<old>..<new>  claude/docs-cierre-2026-04-23 -> claude/docs-cierre-2026-04-23`.

Si el commit dice `nothing to commit, working tree clean`: ya estaba commiteado de un intento previo. OK, salta al push.

Si push pide auth (browser/token): autoriza. Si dice `rejected (non-fast-forward)`: ejecuta `git pull --rebase origin claude/docs-cierre-2026-04-23` y reintenta el push.

---

## Bloque F — Pasos manuales pendientes (no ejecutar como script)

Lo que sigue requiere TU mano. No hay scripts. Lee y decide.

### F.1 — Fase 2: importar datos prod desde Potencias (~30-60 min)

**Objetivo**: importar las ~408 filas reales (clientes, suministros, expedientes…) del proyecto Supabase Potencias al CRM canónico, con dedupe por CIF/CUPS.

**Prerequisitos**:
- `psql` y `pg_dump` instalados (vienen con PostgreSQL — `choco install postgresql` o instalador oficial).
- Connection strings de los 2 proyectos.

**Cómo conseguir las passwords (NO se commitean)**:
- CRM: <https://supabase.com/dashboard/project/gtphkowfcuiqbvfkwjxb/settings/database> → Connection pooling → Session mode → "Show password".
- Potencias: <https://supabase.com/dashboard/project/alesfvxqtwlrwlmkoosg/settings/database> → idem.

**Ejecución**: sigue íntegramente `scripts/unificacion_fase2_protocolo.md` o el Bloque 2 de `docs/RUNBOOK_PENDIENTE_JUAN.md`. Resumen express:

```powershell
$env:PGPASSWORD_CRM = "<password CRM>"
$env:PGPASSWORD_POT = "<password Potencias>"
$ConnCrm = "postgresql://postgres.gtphkowfcuiqbvfkwjxb:$env:PGPASSWORD_CRM@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
$ConnPot = "postgresql://postgres.alesfvxqtwlrwlmkoosg:$env:PGPASSWORD_POT@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

# Backups
$Stamp = Get-Date -Format 'yyyyMMdd_HHmm'
mkdir $HOME\valere-backups -ErrorAction SilentlyContinue
pg_dump $ConnCrm --no-owner --no-acl --schema=public > $HOME\valere-backups\crm_pre_fase2_$Stamp.sql
pg_dump $ConnPot --no-owner --no-acl --schema=public > $HOME\valere-backups\potencias_pre_fase2_$Stamp.sql

# Crear staging
psql $ConnCrm -f .\scripts\unificacion_fase2_a_staging.sql

# Dump+load Potencias data
pg_dump $ConnPot --data-only --column-inserts --no-owner --no-acl --schema=public `
  -t public.clients -t public.supplies -t public.profiles `
  -t public.comercializadoras -t public.regulated_rates -t public.email_templates `
  -t public.expedientes -t public.ciclos -t public.power_requests `
  -t public.savings_calculations -t public.client_communications `
  -t public.client_documents -t public.expediente_documents `
  -t public.comercializadora_docs -t public.documentacion `
  -t public.status_log > $HOME\valere-backups\potencias_data_only.sql

(Get-Content $HOME\valere-backups\potencias_data_only.sql -Raw) -replace 'public\.', '_potencia_staging.' | Out-File -Encoding utf8 $HOME\valere-backups\potencias_data_only_staged.sql
psql $ConnCrm -f $HOME\valere-backups\potencias_data_only_staged.sql

# Transform — primero ROLLBACK para validar (edita el .sql para descomentar ROLLBACK / comentar COMMIT)
psql $ConnCrm -f .\scripts\unificacion_fase2_b_dedupe_y_transform.sql
psql $ConnCrm -f .\scripts\unificacion_fase2_c_verificacion.sql

# Si counts cuadran y 0 orphans → vuelve a poner COMMIT y reejecuta
psql $ConnCrm -f .\scripts\unificacion_fase2_b_dedupe_y_transform.sql
psql $ConnCrm -f .\scripts\unificacion_fase2_c_verificacion.sql
```

**Counts esperados** tras el COMMIT:

| Tabla | Filas esperadas |
|---|---:|
| empresas | ~30 + 3 test = 33 |
| cups | ~75 + 1 test = 76 |
| expedientes | 41 |
| ciclos | 41 |
| solicitudes_potencia | 41 |
| savings_calculations | 41 |
| comunicaciones_cliente | 31 |
| documentos | ~98 (70+27+1) |

Si verifier reporta `orphans > 0`: **NO commitees**, reverter a la versión con ROLLBACK y avisar a Cowork.

### F.2 — Decisión storage PDFs (~30 min discusión)

`client_documents.storage_path` apunta a buckets del proyecto Potencias. Si pausamos Potencias, las URLs rompen.

| Opción | Coste | Pros | Contras |
|---|---|---|---|
| **A. Copiar bucket Potencias→CRM** | 1-2h script | Limpia, drop Potencias luego | Hay que reescribir storage_path post-copia |
| B. Mantener Potencias project vivo solo como CDN | 0 (free tier) | Inmediato | Proyecto fantasma, complica auditorías |
| C. Asumir pérdida PDFs viejos | 0 | Simple | Solo viable si los PDFs no son críticos (legal/cumplimiento) |

**Recomendación Cowork**: A. Plan en sprint dedicado de 1 día.

**Acción**: decide A/B/C y avísame en próxima sesión Cowork. No ejecutes nada hasta tenerlo claro.

### F.3 — Apps satélite Opción A vs B (~30 min)

| Opción | Tiempo | Recomendación |
|---|---|---|
| **A. Apps separadas, solo cambian env vars (URL CRM + ANON_KEY CRM)**. Cowork crea compat views CRM con nombres viejos. | 30 min/app | Para transición. Recomendada AHORA. |
| B. Absorber features Potencias en el CRM. | 3-4 días | Largo plazo, UX unificada. |

**Acción inmediata**: ejecuta primero el Bloque 4 de `docs/RUNBOOK_PENDIENTE_JUAN.md` (inventario apps satélite, 5 min):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\inventario_apps_satelite.ps1
```

Con el output, Cowork diseña las compat views A o el plan B.

### F.4 — Cleanup Supabase Dashboard (~10 min)

**Objetivo**: borrar Edge Function `chat-consultor` (huérfana desde FASE 20.8).

**Por qué**: el deploy local no la borra remotamente. MCP no expone `delete_edge_function`.

**Pasos**:

1. <https://supabase.com/dashboard/project/gtphkowfcuiqbvfkwjxb/functions> → busca `chat-consultor` → **Delete**.
2. (Opcional, verificación) <https://supabase.com/dashboard/project/gtphkowfcuiqbvfkwjxb/settings/functions> → confirma que `GEMINI_API_KEY` está activa.

**NO PAUSAR el proyecto Potencias todavía**. Pendiente F.2 (storage PDFs).

---

## Si algo falla

| Error | Causa | Solución |
|---|---|---|
| `fatal: bad config line` | Null bytes en `.git/config` | Re-ejecutar Bloque A |
| `fatal: Unable to create '.git/index.lock'` | Lock huérfano | Re-ejecutar Bloque A |
| `git checkout` falla "Your local changes…" | Cambios sin commitear | `git stash push -u -m runbook-stash` y reintenta |
| TSC error desconocido | Cambio post-rename rompió tipos | Captura output, mándalo a Cowork |
| Tests fallan | Igual que TSC | Captura output, mándalo a Cowork |
| `git push rejected (non-fast-forward)` | Otro paralelo pusheó | `git pull --rebase origin claude/docs-cierre-2026-04-23` y reintenta |
| `npm uninstall framer-motion` falla | npm cache | `npm cache clean --force` y reintenta |

---

## Estado tras este runbook (post-ejecución completa A→E)

- ✅ Bloque 1 del `RUNBOOK_PENDIENTE_JUAN.md` cerrado.
- 🟡 Pendiente F (manual): Fase 2 datos, storage, apps satélite, Dashboard.

Para próxima sesión Cowork:

```
"He ejecutado RUNBOOK_FLAT bloques A-E sin errores. Pendientes manuales: [...]"
```
