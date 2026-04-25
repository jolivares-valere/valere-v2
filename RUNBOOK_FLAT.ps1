# RUNBOOK_FLAT.ps1 - secuencia plana, sin helpers custom, sin pausas.
# Compatible PowerShell 5.1 (Windows default).
# Uso:
#   powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\joliv\valere-v2\RUNBOOK_FLAT.ps1"
# Notas:
#   - Si fallan TSC o tests, el script PARA antes de commitear.
#   - Las pausas / decisiones manuales (Fase 2 datos, storage, apps satelite,
#     Dashboard) NO estan en este script. Mira docs/RUNBOOK_FLAT.md Bloque F.
#   - Si quieres ver cada paso sin ejecutar nada, abre docs/RUNBOOK_FLAT.md
#     y pega los bloques uno a uno en una consola PowerShell.

$ErrorActionPreference = 'Stop'
Set-Location -Path 'C:\Users\joliv\valere-v2'

Write-Host ''
Write-Host '=== VALERE v2 RUNBOOK_FLAT - Bloque A: reparacion .git ===' -ForegroundColor Cyan

$gitDir = 'C:\Users\joliv\valere-v2\.git'
if (-not (Test-Path $gitDir)) {
    Write-Host '.git no existe. Aborting.' -ForegroundColor Red
    exit 1
}

# A.1 - mover locks huerfanos
$lockFiles = @('index.lock', 'config.lock', 'HEAD.lock', 'ORIG_HEAD.lock')
$stamp = Get-Date -Format 'yyyyMMddHHmmss'
foreach ($lock in $lockFiles) {
    $lockPath = Join-Path $gitDir $lock
    if (Test-Path $lockPath) {
        $bakPath = $lockPath + '.bak.' + $stamp
        try {
            Move-Item -Path $lockPath -Destination $bakPath -Force -ErrorAction Stop
            Write-Host ('  Movido lock: ' + $lock) -ForegroundColor Green
        } catch {
            try {
                Remove-Item -Path $lockPath -Force -ErrorAction Stop
                Write-Host ('  Borrado lock: ' + $lock) -ForegroundColor Green
            } catch {
                Write-Host ('  No pude mover/borrar: ' + $lock) -ForegroundColor Red
            }
        }
    }
}

# A.2 - limpiar null bytes en archivos criticos
$criticalFiles = @(
    (Join-Path $gitDir 'config'),
    (Join-Path $gitDir 'HEAD'),
    (Join-Path $gitDir 'ORIG_HEAD'),
    (Join-Path $gitDir 'FETCH_HEAD'),
    (Join-Path $gitDir 'packed-refs')
)
$refsDir = Join-Path $gitDir 'refs'
if (Test-Path $refsDir) {
    $refs = Get-ChildItem -Path $refsDir -Recurse -File -ErrorAction SilentlyContinue
    foreach ($r in $refs) {
        $criticalFiles += $r.FullName
    }
}
foreach ($f in $criticalFiles) {
    if (-not (Test-Path $f)) { continue }
    $bytes = $null
    try {
        $bytes = [System.IO.File]::ReadAllBytes($f)
    } catch {
        continue
    }
    if ($bytes.Length -eq 0) { continue }
    $hasNull = $false
    foreach ($b in $bytes) {
        if ($b -eq 0) {
            $hasNull = $true
            break
        }
    }
    if (-not $hasNull) { continue }
    $clean = New-Object System.Collections.ArrayList
    foreach ($b in $bytes) {
        if ($b -ne 0) {
            $null = $clean.Add($b)
        }
    }
    $arr = [byte[]]$clean.ToArray([byte])
    [System.IO.File]::WriteAllBytes($f, $arr)
    $relPath = $f.Replace('C:\Users\joliv\valere-v2\', '')
    Write-Host ('  Null bytes limpiados: ' + $relPath) -ForegroundColor Green
}

# Validar git operacional
$branch = & git branch --show-current 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Git sigue roto. Ejecuta git fsck --full o reclona repo.' -ForegroundColor Red
    Write-Host $branch -ForegroundColor Red
    exit 1
}
Write-Host ('  Git OK. Rama actual: ' + $branch) -ForegroundColor Green

Write-Host ''
Write-Host '=== Bloque B: switch rama PR + reset CRLF + git rm + uninstall framer-motion ===' -ForegroundColor Cyan

& git fetch origin claude/docs-cierre-2026-04-23
if ($LASTEXITCODE -ne 0) {
    Write-Host 'git fetch fallo' -ForegroundColor Red
    exit 1
}

& git checkout claude/docs-cierre-2026-04-23
if ($LASTEXITCODE -ne 0) {
    Write-Host 'git checkout fallo - revisa cambios pendientes' -ForegroundColor Red
    exit 1
}

& git pull origin claude/docs-cierre-2026-04-23
if ($LASTEXITCODE -ne 0) {
    Write-Host 'git pull devolvio error - revisa output' -ForegroundColor Yellow
}

& git checkout -- .
Write-Host '  Working tree reseteado' -ForegroundColor Green

# git rm legacy
& git rm -r -f -- 'src/features/chat-ia' 2>&1 | Out-Null
& git rm -r -f -- 'supabase/functions/chat-consultor' 2>&1 | Out-Null
& git rm -f -- 'q' 2>&1 | Out-Null
& git rm -f -- 'useAuth.ts' 2>&1 | Out-Null
& git rm -f -- "import { useEffect } from 'react'.txt" 2>&1 | Out-Null
& git rm -f -- "import { useState } from 'react'.txt" 2>&1 | Out-Null
& git rm -f -- 'tsc_output.txt' 2>&1 | Out-Null
& git rm -f -- 'supabase-migration.sql' 2>&1 | Out-Null
& git rm -f -- 'src/core/types/database_canonical_2026-04-26.ts' 2>&1 | Out-Null
Write-Host '  git rm legacy ejecutado' -ForegroundColor Green

if (Test-Path 'C:\Users\joliv\valere-v2\CRM VALERE') {
    Remove-Item -Path 'C:\Users\joliv\valere-v2\CRM VALERE' -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host '  Carpeta CRM VALERE borrada' -ForegroundColor Green
}

$pkg = Get-Content 'C:\Users\joliv\valere-v2\package.json' -Raw
if ($pkg -match '"framer-motion"') {
    & npm uninstall framer-motion 2>&1 | Out-Null
    Write-Host '  framer-motion desinstalado' -ForegroundColor Green
} else {
    Write-Host '  framer-motion ya no estaba' -ForegroundColor DarkGray
}

Write-Host ''
Write-Host '=== Bloque C: git add 26 entregables ===' -ForegroundColor Cyan

& git add -- 'docs/INVENTARIO_GEMINI_2026-04-25.md'
& git add -- 'supabase/functions/_shared/ai-adapter.ts'
& git add -- 'supabase/migrations/20260426_fase1_unificacion_renames_schema.sql'
& git add -- 'scripts/unificacion_fase2_protocolo.md'
& git add -- 'scripts/unificacion_fase2_a_staging.sql'
& git add -- 'scripts/unificacion_fase2_b_dedupe_y_transform.sql'
& git add -- 'scripts/unificacion_fase2_c_verificacion.sql'
& git add -- 'docs/REFACTOR_FE_FASE3_2026-04-26.md'
& git add -- 'src/features/admin/AdminPage.tsx'
& git add -- 'src/features/analisis/AnalisisPage.tsx'
& git add -- 'src/types/database.ts'
& git add -- 'src/core/types/database.ts'
& git add -- 'docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md'
& git add -- 'supabase/migrations/_draft_rls_hardening_8_tables.sql'
& git add -- 'docs/INVENTARIO_APPS_SATELITE_TEMPLATE.md'
& git add -- 'scripts/inventario_apps_satelite.ps1'
& git add -- 'docs/COMUNICADO_UNIFICACION_DRAFT.md'
& git add -- 'docs/RUNBOOK_PENDIENTE_JUAN.md'
& git add -- 'docs/RUNBOOK_FLAT.md'
& git add -- '.cowork/AGENT_PLAYBOOK.md'
& git add -- 'docs/ESTADO.md'
& git add -- 'RUNBOOK.ps1'
& git add -- 'RUNBOOK_FLAT.ps1'
& git add -- 'package.json'
& git add -- 'package-lock.json'
& git add -- '.cowork/outbox/2026-04-25T16-40-00-sprint-autonomo-5-rag-verificado-y-sync.md'
& git add -- '.cowork/outbox/2026-04-25T17-19-00-sprint-autonomo-6-unificacion-fase1-fase2-listas.md'
& git add -- '.cowork/outbox/2026-04-25T19-00-00-sprint-autonomo-7-fase1-aplicada-fe-refactor-y-fase2-pendiente-juan.md'
& git add -- '.cowork/outbox/2026-04-25T19-30-00-sprint-autonomo-8-validacion-plan-fases-4-5-rls-draft.md'
Write-Host '  git add ejecutado' -ForegroundColor Green

Write-Host ''
Write-Host '=== Bloque D: TSC + tests ===' -ForegroundColor Cyan

& npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host 'TSC fallo. NO se hace commit. Revisa errores arriba.' -ForegroundColor Red
    exit 1
}
Write-Host '  TSC 0 errores' -ForegroundColor Green

& npm test -- --run
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Tests fallaron. NO se hace commit. Revisa errores arriba.' -ForegroundColor Red
    exit 1
}
Write-Host '  Tests verdes' -ForegroundColor Green

Write-Host ''
Write-Host '=== Bloque E: commit + push ===' -ForegroundColor Cyan

# Mensaje de commit como array de lineas (sin here-string)
$msgLines = @(
    'feat(unificacion): sprints 5+6+7+8 + paralelo C - cierre acumulado',
    '',
    'DB: Fase 1 unificacion aplicada en prod + compat views legacy + ai-adapter sync',
    'FE: refactor 100% + tipos regenerados',
    'Cleanup: chat-ia + chat-consultor + legacy junk + framer-motion',
    'Docs: INVENTARIO_GEMINI, PLAN_UNIFICACION_FASES_4_5, REFACTOR_FE_FASE3, RUNBOOK_FLAT',
    'Pendiente Juan: Fase 2 datos, storage decision, apps satelite cutover, RLS hardening'
)
$msgText = $msgLines -join "`n"
$tmp = New-TemporaryFile
Set-Content -Path $tmp.FullName -Value $msgText -Encoding utf8
& git commit -F $tmp.FullName
$commitExit = $LASTEXITCODE
Remove-Item -Path $tmp.FullName -Force -ErrorAction SilentlyContinue

if ($commitExit -ne 0 -and $commitExit -ne 1) {
    Write-Host ('git commit fallo, exit ' + $commitExit) -ForegroundColor Red
    exit 1
}

& git push origin claude/docs-cierre-2026-04-23
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Push fallo. Reintentar manualmente: git push origin claude/docs-cierre-2026-04-23' -ForegroundColor Red
    exit 1
}
Write-Host '  Push completado' -ForegroundColor Green

Write-Host ''
Write-Host '=== Bloque F: pasos manuales pendientes ===' -ForegroundColor Cyan
Write-Host ''
Write-Host '  Lee docs/RUNBOOK_FLAT.md Bloque F para:' -ForegroundColor White
Write-Host '    - Fase 2 datos (Bloque 2 RUNBOOK_PENDIENTE_JUAN, ~30-60 min)' -ForegroundColor White
Write-Host '    - Decision storage PDFs (~30 min discusion)' -ForegroundColor White
Write-Host '    - Cutover apps satelite (~1.5h tras decision A/B)' -ForegroundColor White
Write-Host '    - Cleanup Dashboard Supabase (~10 min)' -ForegroundColor White
Write-Host ''
Write-Host '  Bloque 1 cerrado. Siguientes bloques son manuales.' -ForegroundColor Green
Write-Host ''
exit 0
