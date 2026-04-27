# RUNBOOK_FLAT — secuencia adaptativa al estado real del repo

> Sustituye al `RUNBOOK.ps1` (deprecated). Detecta automáticamente si hay remote `origin` y se adapta: con remote sigue el flujo PR; sin remote hace commit local en la rama actual y deja instrucciones para configurar `origin` después.
>
> Validado con PSScriptAnalyzer 1.21.0 + parser pwsh: **0 errores parser, 0 issues `PSUseCompatibleSyntax 5.1`, 0 errores severity=Error**.

## One-liner

```
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\joliv\valere-v2\RUNBOOK_FLAT.ps1"
```

## Bloques (en `RUNBOOK_FLAT.ps1`)

| # | Bloque | Adaptativo |
|---|---|---|
| A | Reparación `.git/` (locks + null bytes) | siempre |
| B | Detección remote + rama (`git remote -v`, `git branch --show-current`) | siempre |
| C | Si `origin` existe → fetch+checkout+pull rama PR. Si no → trabaja sobre rama actual sin tocar remote. | adaptativo |
| D | `git rm` legacy + `npm uninstall framer-motion` (try/catch graceful) | siempre |
| E | `git add` 26 entregables (skip silencioso si no existen) | siempre |
| F | `npx tsc --noEmit` + `npm test -- --run` | siempre |
| G | `git commit` a la **rama actual** (`$workingBranch`, no hardcodeada) | siempre |
| H | Si `origin` existe → `git push origin $workingBranch`. Si no → imprime instrucciones para configurar remote después. | adaptativo |
| I | Pendientes manuales (Fase 2 datos, storage, apps satélite, cleanup Dashboard) | resumen |

## Cambios respecto a la versión anterior

- **No hardcodea rama**: usa `$currentBranch = git branch --show-current` y guarda la rama de trabajo en `$workingBranch`.
- **Detección de remote**: `$hasOrigin = $false` por defecto; solo se pone a `$true` si `git remote -v` lista una línea con `^origin\s`.
- **Sin remote → no toca**: salta `fetch`/`checkout`/`pull` y NO hace `git checkout -- .` (puede haber cambios reales locales si nunca se sincronizó).
- **Limpieza con try/catch**: cada `git rm` y `Remove-Item` envuelto. Si el archivo no está donde se esperaba, imprime aviso y sigue.
- **Push solo si hay remote**: si no, imprime guía: `git remote add origin https://github.com/jolivares-valere/valere-v2.git` y `git push -u origin $workingBranch`.
- **Reset CRLF condicional**: solo se ejecuta si hay remote (porque sin remote, los "modificados" pueden ser cambios locales reales no sincronizados).

## Si Bloque H termina "Sin remote configurado"

El commit local está hecho. Para conectar a GitHub:

```powershell
cd C:\Users\joliv\valere-v2

# Configurar remote (URL ya conocida del proyecto)
git remote add origin https://github.com/jolivares-valere/valere-v2.git

# Verificar
git remote -v

# Push de la rama actual (cualquiera que sea — main / claude/* / etc.)
$current = git branch --show-current
git push -u origin $current
```

Si la rama no existe en remote, `-u` la crea y configura tracking. Si pide credenciales, autoriza con tu token de GitHub.

## Bloque manual — pasos pendientes (Bloque I del script)

### F.1 — Fase 2 datos (~30-60 min)

Importa ~408 filas reales desde Potencias→CRM. Sigue `scripts/unificacion_fase2_protocolo.md`. Resumen:

```powershell
$env:PGPASSWORD_CRM = "<password CRM>"
$env:PGPASSWORD_POT = "<password Potencias>"
$ConnCrm = "postgresql://postgres.gtphkowfcuiqbvfkwjxb:$env:PGPASSWORD_CRM@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
$ConnPot = "postgresql://postgres.alesfvxqtwlrwlmkoosg:$env:PGPASSWORD_POT@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

$Stamp = Get-Date -Format 'yyyyMMdd_HHmm'
mkdir $HOME\valere-backups -ErrorAction SilentlyContinue
pg_dump $ConnCrm --no-owner --no-acl --schema=public > $HOME\valere-backups\crm_pre_fase2_$Stamp.sql
pg_dump $ConnPot --no-owner --no-acl --schema=public > $HOME\valere-backups\potencias_pre_fase2_$Stamp.sql

psql $ConnCrm -f .\scripts\unificacion_fase2_a_staging.sql

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

# Edita _b_dedupe_y_transform.sql para descomentar ROLLBACK (final), comentar COMMIT
psql $ConnCrm -f .\scripts\unificacion_fase2_b_dedupe_y_transform.sql
psql $ConnCrm -f .\scripts\unificacion_fase2_c_verificacion.sql

# Si counts cuadran (~30 empresas, ~75 cups, 41 expedientes, etc.) → vuelve a poner COMMIT
psql $ConnCrm -f .\scripts\unificacion_fase2_b_dedupe_y_transform.sql
psql $ConnCrm -f .\scripts\unificacion_fase2_c_verificacion.sql
```

**Passwords**:
- CRM: <https://supabase.com/dashboard/project/gtphkowfcuiqbvfkwjxb/settings/database>
- Potencias: <https://supabase.com/dashboard/project/alesfvxqtwlrwlmkoosg/settings/database>

### F.2 — Decisión storage PDFs (~30 min)

`client_documents.storage_path` apunta a buckets del proyecto Potencias. Opciones:

| Opción | Coste | Recomendación |
|---|---|---|
| **A. Copiar bucket Potencias→CRM** | 1-2h | **Cowork recomienda** |
| B. Mantener Potencias vivo solo como CDN | 0 | Pragmática transitoria |
| C. Asumir pérdida PDFs viejos | 0 | Solo si no son críticos |

### F.3 — Apps satélite Opción A vs B (~30 min)

Inventario primero:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\inventario_apps_satelite.ps1
```

| Opción | Tiempo |
|---|---|
| **A. Solo cambian env vars + compat views CRM** | 30 min/app — recomendada AHORA |
| B. Absorber features Potencias en CRM | 3-4 días — largo plazo |

### F.4 — Cleanup Dashboard Supabase (~10 min)

1. <https://supabase.com/dashboard/project/gtphkowfcuiqbvfkwjxb/functions> → busca `chat-consultor` → **Delete**.
2. <https://supabase.com/dashboard/project/gtphkowfcuiqbvfkwjxb/settings/functions> → confirma `GEMINI_API_KEY` activa.

NO PAUSAR Potencias todavía (pendiente F.2).

## Validación pre-entrega

- ✅ Parser pwsh 7.4.1: 0 errores
- ✅ PSScriptAnalyzer `PSUseCompatibleSyntax -TargetVersions 5.1`: 0 issues
- ✅ PSScriptAnalyzer `-Severity Error`: 0 issues
- ✅ MD5 `RUNBOOK_FLAT.ps1`: `D6138625D7097B603B013DEDBEC243BD`

Verificación en Windows: `Get-FileHash RUNBOOK_FLAT.ps1 -Algorithm MD5`
