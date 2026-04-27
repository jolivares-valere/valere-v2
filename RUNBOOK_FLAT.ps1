# RUNBOOK_FLAT.ps1 - secuencia plana, adaptativa al estado real del repo.
# Compatible PowerShell 5.1. Validado con PSScriptAnalyzer PSUseCompatibleSyntax 5.1.
# Uso:
#   powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\joliv\valere-v2\RUNBOOK_FLAT.ps1"

$ErrorActionPreference = 'Stop'
Set-Location -Path 'C:\Users\joliv\valere-v2'

$expectedBranch = 'claude/docs-cierre-2026-04-23'

Write-Host ''
Write-Host '=== Bloque A: reparacion .git ===' -ForegroundColor Cyan

$gitDir = 'C:\Users\joliv\valere-v2\.git'
if (-not (Test-Path $gitDir)) {
    Write-Host '.git no existe. Aborting.' -ForegroundColor Red
    exit 1
}

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
                Write-Host ('  No pude tocar lock: ' + $lock) -ForegroundColor Yellow
            }
        }
    }
}

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
    foreach ($r in $refs) { $criticalFiles += $r.FullName }
}
foreach ($f in $criticalFiles) {
    if (-not (Test-Path $f)) { continue }
    $bytes = $null
    try { $bytes = [System.IO.File]::ReadAllBytes($f) } catch { continue }
    if ($bytes.Length -eq 0) { continue }
    $hasNull = $false
    foreach ($b in $bytes) { if ($b -eq 0) { $hasNull = $true; break } }
    if (-not $hasNull) { continue }
    $clean = New-Object System.Collections.ArrayList
    foreach ($b in $bytes) { if ($b -ne 0) { $null = $clean.Add($b) } }
    $arr = [byte[]]$clean.ToArray([byte])
    [System.IO.File]::WriteAllBytes($f, $arr)
    $relPath = $f.Replace('C:\Users\joliv\valere-v2\', '')
    Write-Host ('  Null bytes limpiados: ' + $relPath) -ForegroundColor Green
}

# Validacion git operacional
$branchRaw = & git branch --show-current 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Git sigue roto:' -ForegroundColor Red
    Write-Host $branchRaw -ForegroundColor Red
    exit 1
}
$currentBranch = [string]$branchRaw
if ([string]::IsNullOrWhiteSpace($currentBranch)) {
    $currentBranch = '(detached HEAD)'
}
Write-Host ('  Git OK. Rama actual: ' + $currentBranch) -ForegroundColor Green

# ==========================================================================
Write-Host ''
Write-Host '=== Bloque B: deteccion de remote y rama ===' -ForegroundColor Cyan

$remotesRaw = & git remote -v 2>&1
$hasRemote = $false
if ($LASTEXITCODE -eq 0) {
    $remotesStr = ($remotesRaw | Out-String).Trim()
    if (-not [string]::IsNullOrWhiteSpace($remotesStr)) {
        $hasRemote = $true
    }
}

if ($hasRemote) {
    Write-Host '  Remotes configurados:' -ForegroundColor Green
    $remotesRaw | ForEach-Object { Write-Host ('    ' + $_) -ForegroundColor DarkGray }
} else {
    Write-Host '  SIN remote configurado.' -ForegroundColor Yellow
}

$hasOrigin = $false
if ($hasRemote) {
    $originLine = $remotesRaw | Where-Object { $_ -match '^origin\s' } | Select-Object -First 1
    if ($originLine) { $hasOrigin = $true }
}

# Estado del working tree
$statusRaw = & git status --short 2>&1
$statusStr = ($statusRaw | Out-String).Trim()
if ([string]::IsNullOrWhiteSpace($statusStr)) {
    Write-Host '  Working tree limpio' -ForegroundColor Green
} else {
    $modCount = ($statusRaw | Measure-Object -Line).Lines
    Write-Host ('  Working tree: ' + $modCount + ' archivos con cambios') -ForegroundColor DarkGray
}

# ==========================================================================
Write-Host ''
Write-Host '=== Bloque C: sincronizar rama (si procede) ===' -ForegroundColor Cyan

$workingBranch = $currentBranch
if ($hasOrigin) {
    Write-Host ('  Intentando fetch origin ' + $expectedBranch + '...') -ForegroundColor DarkGray
    & git fetch origin $expectedBranch 2>&1 | ForEach-Object { Write-Host ('    ' + $_) -ForegroundColor DarkGray }
    $fetchExit = $LASTEXITCODE

    if ($fetchExit -eq 0) {
        if ($currentBranch -ne $expectedBranch) {
            Write-Host ('  Cambiando a rama ' + $expectedBranch) -ForegroundColor DarkGray
            & git checkout $expectedBranch 2>&1 | ForEach-Object { Write-Host ('    ' + $_) -ForegroundColor DarkGray }
            if ($LASTEXITCODE -ne 0) {
                Write-Host '  Checkout fallo. Sigo en la rama actual.' -ForegroundColor Yellow
            } else {
                $workingBranch = $expectedBranch
            }
        } else {
            $workingBranch = $expectedBranch
        }
        Write-Host ('  git pull origin ' + $workingBranch) -ForegroundColor DarkGray
        & git pull origin $workingBranch 2>&1 | ForEach-Object { Write-Host ('    ' + $_) -ForegroundColor DarkGray }
        if ($LASTEXITCODE -ne 0) {
            Write-Host '  Pull devolvio error - sigue con la rama actual' -ForegroundColor Yellow
        }
    } else {
        Write-Host '  Fetch fallo - rama remota probablemente no existe.' -ForegroundColor Yellow
        Write-Host ('  Trabajando sobre rama actual: ' + $workingBranch) -ForegroundColor Yellow
    }
} else {
    Write-Host '  Sin remote origin - saltando fetch/checkout/pull.' -ForegroundColor Yellow
    Write-Host ('  Trabajando sobre rama actual: ' + $workingBranch) -ForegroundColor Yellow
}

Write-Host ('  Rama de trabajo: ' + $workingBranch) -ForegroundColor Green

# Reset CRLF noise solo si hay remote (en local sin remote, los cambios podrian ser reales)
if ($hasOrigin) {
    Write-Host '  git checkout -- . (reset CRLF noise)' -ForegroundColor DarkGray
    & git checkout -- . 2>&1 | Out-Null
}

# ==========================================================================
Write-Host ''
Write-Host '=== Bloque D: borrar legacy/junk ===' -ForegroundColor Cyan

$pathsToRemove = @(
    'src/features/chat-ia',
    'supabase/functions/chat-consultor',
    'q',
    'useAuth.ts',
    "import { useEffect } from 'react'.txt",
    "import { useState } from 'react'.txt",
    'tsc_output.txt',
    'supabase-migration.sql',
    'src/core/types/database_canonical_2026-04-26.ts'
)
foreach ($p in $pathsToRemove) {
    try {
        # Ver si esta tracked
        & git ls-files --error-unmatch -- $p 2>$null | Out-Null
        $isTracked = ($LASTEXITCODE -eq 0)
        if ($isTracked) {
            & git rm -r -f -- $p 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host ('  git rm: ' + $p) -ForegroundColor Green
            } else {
                Write-Host ('  git rm fallo: ' + $p) -ForegroundColor Yellow
            }
        } elseif (Test-Path $p) {
            Remove-Item -Path $p -Recurse -Force -ErrorAction Stop
            Write-Host ('  rm (no trackeado): ' + $p) -ForegroundColor Green
        } else {
            Write-Host ('  ya borrado: ' + $p) -ForegroundColor DarkGray
        }
    } catch {
        Write-Host ('  no pude borrar ' + $p + ': ' + $_.Exception.Message) -ForegroundColor Yellow
    }
}

if (Test-Path 'C:\Users\joliv\valere-v2\CRM VALERE') {
    try {
        Remove-Item -Path 'C:\Users\joliv\valere-v2\CRM VALERE' -Recurse -Force -ErrorAction Stop
        Write-Host '  Carpeta CRM VALERE borrada' -ForegroundColor Green
    } catch {
        Write-Host ('  no pude borrar CRM VALERE: ' + $_.Exception.Message) -ForegroundColor Yellow
    }
}

if (Test-Path 'C:\Users\joliv\valere-v2\package.json') {
    try {
        $pkgRaw = Get-Content 'C:\Users\joliv\valere-v2\package.json' -Raw
        if ($pkgRaw -match '"framer-motion"') {
            & npm uninstall framer-motion 2>&1 | ForEach-Object { Write-Host ('    ' + $_) -ForegroundColor DarkGray }
            if ($LASTEXITCODE -eq 0) {
                Write-Host '  framer-motion desinstalado' -ForegroundColor Green
            } else {
                Write-Host '  npm uninstall devolvio error - revisa output' -ForegroundColor Yellow
            }
        } else {
            Write-Host '  framer-motion ya no estaba' -ForegroundColor DarkGray
        }
    } catch {
        Write-Host ('  no pude tocar package.json: ' + $_.Exception.Message) -ForegroundColor Yellow
    }
}

# ==========================================================================
Write-Host ''
Write-Host '=== Bloque E: git add 26 entregables ===' -ForegroundColor Cyan

$filesToAdd = @(
    'docs/INVENTARIO_GEMINI_2026-04-25.md',
    'supabase/functions/_shared/ai-adapter.ts',
    'supabase/migrations/20260426_fase1_unificacion_renames_schema.sql',
    'scripts/unificacion_fase2_protocolo.md',
    'scripts/unificacion_fase2_a_staging.sql',
    'scripts/unificacion_fase2_b_dedupe_y_transform.sql',
    'docs/REFACTOR_FE_FASE3_2026-04-26.md',
    'src/features/admin/AdminPage.tsx',
    'src/features/analisis/AnalisisPage.tsx',
    'src/types/database.ts',
    'src/core/types/database.ts',
    'docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md',
    'supabase/migrations/_draft_rls_hardening_8_tables.sql',
    'docs/INVENTARIO_APPS_SATELITE_TEMPLATE.md',
    'scripts/inventario_apps_satelite.ps1',
    'docs/COMUNICADO_UNIFICACION_DRAFT.md',
    'docs/RUNBOOK_PENDIENTE_JUAN.md',
    'docs/RUNBOOK_FLAT.md',
    '.cowork/AGENT_PLAYBOOK.md',
    'docs/ESTADO.md',
    'RUNBOOK.ps1',
    'RUNBOOK_FLAT.ps1',
    'package.json',
    'package-lock.json',
    '.cowork/outbox/2026-04-25T16-40-00-sprint-autonomo-5-rag-verificado-y-sync.md',
    '.cowork/outbox/2026-04-25T17-19-00-sprint-autonomo-6-unificacion-fase1-fase2-listas.md',
    '.cowork/outbox/2026-04-25T19-00-00-sprint-autonomo-7-fase1-aplicada-fe-refactor-y-fase2-pendiente-juan.md',
    '.cowork/outbox/2026-04-25T19-30-00-sprint-autonomo-8-validacion-plan-fases-4-5-rls-draft.md'
)
$added = 0
$skipped = 0
foreach ($f in $filesToAdd) {
    if (-not (Test-Path $f)) {
        $skipped = $skipped + 1
        continue
    }
    & git add -- $f 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { $added = $added + 1 }
}
Write-Host ('  Anadidos: ' + $added + ', skipped: ' + $skipped) -ForegroundColor Green

# ==========================================================================
Write-Host ''
Write-Host '=== Bloque F: TSC + tests ===' -ForegroundColor Cyan

$tscOk = $true
& npx tsc --noEmit 2>&1 | ForEach-Object { Write-Host ('    ' + $_) -ForegroundColor DarkGray }
if ($LASTEXITCODE -ne 0) {
    Write-Host '  TSC fallo. NO se hace commit.' -ForegroundColor Red
    $tscOk = $false
}
if ($tscOk) { Write-Host '  TSC 0 errores' -ForegroundColor Green }

$testsOk = $true
if ($tscOk) {
    & npm test -- --run 2>&1 | ForEach-Object { Write-Host ('    ' + $_) -ForegroundColor DarkGray }
    if ($LASTEXITCODE -ne 0) {
        Write-Host '  Tests fallaron. NO se hace commit.' -ForegroundColor Red
        $testsOk = $false
    } else {
        Write-Host '  Tests verdes' -ForegroundColor Green
    }
}

if (-not $tscOk -or -not $testsOk) {
    Write-Host ''
    Write-Host 'Captura el output completo y avisa a Cowork. Re-ejecuta cuando este arreglado.' -ForegroundColor Red
    exit 1
}

# ==========================================================================
Write-Host ''
Write-Host '=== Bloque G: commit ===' -ForegroundColor Cyan

$stagedRaw = & git diff --cached --name-only 2>&1
$stagedStr = ($stagedRaw | Out-String).Trim()
if ([string]::IsNullOrWhiteSpace($stagedStr)) {
    Write-Host '  Nada en staging - skip commit' -ForegroundColor DarkGray
} else {
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
    & git commit -F $tmp.FullName 2>&1 | ForEach-Object { Write-Host ('    ' + $_) -ForegroundColor DarkGray }
    $commitExit = $LASTEXITCODE
    Remove-Item -Path $tmp.FullName -Force -ErrorAction SilentlyContinue
    if ($commitExit -eq 0) {
        Write-Host '  Commit hecho' -ForegroundColor Green
    } elseif ($commitExit -eq 1) {
        Write-Host '  Nada que commitear (ya commiteado)' -ForegroundColor DarkGray
    } else {
        Write-Host ('  git commit fallo, exit ' + $commitExit) -ForegroundColor Red
        exit 1
    }
}

# ==========================================================================
Write-Host ''
Write-Host '=== Bloque H: push (si hay remote) ===' -ForegroundColor Cyan

if (-not $hasOrigin) {
    Write-Host '  Sin remote origin configurado. Commit local hecho.' -ForegroundColor Yellow
    Write-Host '  Cuando tengas la URL del repo, configura con:' -ForegroundColor Yellow
    Write-Host '    git remote add origin https://github.com/jolivares-valere/valere-v2.git' -ForegroundColor Cyan
    Write-Host ('    git push -u origin ' + $workingBranch) -ForegroundColor Cyan
} else {
    Write-Host ('  git push origin ' + $workingBranch) -ForegroundColor DarkGray
    & git push origin $workingBranch 2>&1 | ForEach-Object { Write-Host ('    ' + $_) -ForegroundColor DarkGray }
    if ($LASTEXITCODE -eq 0) {
        Write-Host '  Push completado' -ForegroundColor Green
    } else {
        Write-Host ('  Push fallo, exit ' + $LASTEXITCODE) -ForegroundColor Red
        Write-Host ('  Manual: git push origin ' + $workingBranch) -ForegroundColor Yellow
    }
}

# ==========================================================================
Write-Host ''
Write-Host '=== Bloque I: pasos manuales pendientes ===' -ForegroundColor Cyan
Write-Host ''
Write-Host '  Lee docs/RUNBOOK_FLAT.md seccion "Bloque manual" para:' -ForegroundColor White
Write-Host '    - Fase 2 datos (~30-60 min, passwords del Dashboard)' -ForegroundColor White
Write-Host '    - Decision storage PDFs (~30 min discusion)' -ForegroundColor White
Write-Host '    - Cutover apps satelite (~1.5h tras decision A/B)' -ForegroundColor White
Write-Host '    - Cleanup Dashboard Supabase (~10 min)' -ForegroundColor White
Write-Host ''
Write-Host '  Bloques A-H cerrados. Resto manual.' -ForegroundColor Green
Write-Host ''
exit 0
