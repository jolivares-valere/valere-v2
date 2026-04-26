<#
.SYNOPSIS
  RUNBOOK v3 del sprint signup-aprobacion-manual (2026-04-26).
  Compatible con PowerShell 5.1.
  Repara .git/config si esta vacio + add selectivo solo de archivos del sprint
  (no -A, para no mezclar con acumulado de sprints 5-8).

.PARAMETER DryRun
  Muestra todo lo que haria sin ejecutar git/npm.

.PARAMETER SkipTests
  Salta npx tsc y npm test.

.PARAMETER SkipBuild
  Salta npm run build.

.PARAMETER SkipPush
  Hace commit pero no push.

.PARAMETER YesToAll
  No pregunta confirmacion interactiva.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\joliv\valere-v2\RUNBOOK_SIGNUP.ps1" -DryRun

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\joliv\valere-v2\RUNBOOK_SIGNUP.ps1"
#>

[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$SkipTests,
    [switch]$SkipBuild,
    [switch]$SkipPush,
    [switch]$YesToAll
)

$ErrorActionPreference = 'Stop'
$RepoPath = 'C:\Users\joliv\valere-v2'
$BranchName = 'claude/signup-aprobacion-manual'
$BaseBranch = 'main'

# Lista BLANCA explicita de archivos del sprint signup. NO se anade nada mas.
$SprintFiles = @(
    'supabase/migrations/20260426_signup_aprobacion_manual.sql',
    'supabase/functions/notify-admin-pending-user/index.ts',
    'supabase/functions/notify-user-approval-decision/index.ts',
    'src/App.tsx',
    'src/features/auth/SignupPage.tsx',
    'src/features/auth/PendingApprovalPage.tsx',
    'src/features/auth/LoginPage.tsx',
    'src/features/admin/AdminPage.tsx',
    'CLAUDE.md',
    'docs/ESTADO.md',
    'docs/SESIONES/2026-04-26-signup-aprobacion.md',
    'docs/COMUNICADO_NUEVO_SIGNUP.md',
    'docs/help/AUTH-SIGNUP-Y-APROBACION.md',
    '.cowork/outbox/2026-04-26T15-18-22-signup-aprobacion-manual-handoff.md',
    '.cowork/outbox/2026-04-26T16-02-37-trabajo-autonomo-tarde.md',
    'RUNBOOK_SIGNUP.ps1'
)

function Write-Step    { param([string]$Msg); Write-Host ''; Write-Host "=== $Msg ===" -ForegroundColor Cyan }
function Write-Ok      { param([string]$Msg); Write-Host "OK   $Msg" -ForegroundColor Green }
function Write-WarnMsg { param([string]$Msg); Write-Host "WARN $Msg" -ForegroundColor Yellow }
function Write-ErrMsg  { param([string]$Msg); Write-Host "ERR  $Msg" -ForegroundColor Red }

function Run-Cmd {
    param(
        [string]$Description,
        [scriptblock]$Cmd,
        [bool]$AllowFail = $false
    )
    Write-Host "-> $Description" -ForegroundColor Gray
    if ($DryRun) {
        $cmdText = $Cmd.ToString().Trim()
        Write-Host "[DRY-RUN] Would run: $cmdText" -ForegroundColor DarkYellow
        return $true
    }
    try {
        & $Cmd
        if ($LASTEXITCODE -ne 0 -and -not $AllowFail) {
            throw "Command exited with code $LASTEXITCODE"
        }
        return $true
    } catch {
        if ($AllowFail) {
            $errMsg = $_.Exception.Message
            Write-WarnMsg "Command failed (allowed): $errMsg"
            return $false
        }
        $errMsg = $_.Exception.Message
        Write-ErrMsg "Command failed: $errMsg"
        throw
    }
}

function Confirm-Step {
    param([string]$Question)
    if ($YesToAll -or $DryRun) { return $true }
    $reply = Read-Host "$Question [y/N]"
    return ($reply -eq 'y' -or $reply -eq 'Y')
}

# -----------------------------------------------------------------------------
# 0. Pre-flight
# -----------------------------------------------------------------------------
Write-Step '0. Pre-flight'
if (-not (Test-Path $RepoPath)) { Write-ErrMsg "Repo no encontrado en $RepoPath"; exit 1 }
Set-Location $RepoPath
$cwd = (Get-Location).Path
Write-Ok "cwd = $cwd"

if ($DryRun) { Write-WarnMsg 'Modo DRY-RUN activo. No se ejecuta nada destructivo.' }

# -----------------------------------------------------------------------------
# 0.5 Reparar .git/config si esta vacio
# -----------------------------------------------------------------------------
Write-Step '0.5 Verificar .git/config'
$gitConfigPath = Join-Path $RepoPath '.git\config'
$gitConfigBakPath = Join-Path $RepoPath '.git\config.bak'

if (-not (Test-Path $gitConfigPath)) {
    Write-ErrMsg '.git/config no existe. Repo posiblemente roto. Aborto.'
    exit 1
}

$configSize = (Get-Item $gitConfigPath).Length
if ($configSize -eq 0) {
    Write-WarnMsg '.git/config esta VACIO. Restaurando desde .git/config.bak ...'
    if (-not (Test-Path $gitConfigBakPath)) {
        Write-ErrMsg '.git/config.bak no existe. Restaura manualmente:'
        Write-Host '  git remote add origin https://github.com/jolivares-valere/valere-v2.git' -ForegroundColor Yellow
        exit 1
    }
    if ($DryRun) {
        Write-Host '[DRY-RUN] Would copy .git/config.bak -> .git/config' -ForegroundColor DarkYellow
    } else {
        Copy-Item $gitConfigBakPath $gitConfigPath -Force
        Write-Ok '.git/config restaurado desde config.bak'
    }
} else {
    Write-Ok ".git/config OK [$configSize bytes]"
}

# Verificar remoto
$remotesOutput = (& git remote -v 2>&1) -join "`n"
if ($remotesOutput -notmatch 'origin') {
    Write-WarnMsg 'origin no aparece. Anadiendo...'
    if (-not $DryRun) {
        & git remote remove origin 2>$null
        & git remote add origin 'https://github.com/jolivares-valere/valere-v2.git'
    }
}

Write-Host ''
Write-Host 'git remote -v:'
& git remote -v

# -----------------------------------------------------------------------------
# 1. Lista de archivos del sprint
# -----------------------------------------------------------------------------
Write-Step '1. Archivos del sprint que se anadiran (lista blanca)'
foreach ($f in $SprintFiles) {
    if (Test-Path $f) {
        Write-Host "  OK   $f" -ForegroundColor Green
    } else {
        Write-Host "  miss $f" -ForegroundColor Yellow
    }
}

Write-Host ''
Write-Host 'NOTA: cualquier archivo modificado FUERA de esta lista NO se commitea.' -ForegroundColor Cyan
Write-Host 'Para subir el acumulado sprints 5-8 ejecuta despues el RUNBOOK.ps1 original.' -ForegroundColor Cyan

if (-not (Confirm-Step 'Continuar?')) { exit 0 }

# -----------------------------------------------------------------------------
# 2. fetch + main + pull
# -----------------------------------------------------------------------------
Write-Step '2. git fetch + checkout main + pull'
Run-Cmd 'git fetch origin'    { & git fetch origin }    -AllowFail $true | Out-Null
Run-Cmd 'git checkout main'   { & git checkout main }   -AllowFail $true | Out-Null
Run-Cmd 'git pull origin main'{ & git pull origin main } -AllowFail $true | Out-Null

# -----------------------------------------------------------------------------
# 3. Crear/cambiar a rama
# -----------------------------------------------------------------------------
Write-Step "3. Crear/cambiar a rama $BranchName"
$branchExists = & git branch --list $BranchName
if ($branchExists) {
    Write-Ok "Rama $BranchName ya existe — checkout"
    Run-Cmd 'git checkout' { & git checkout $BranchName } | Out-Null
} else {
    Run-Cmd "git checkout -b $BranchName" { & git checkout -b $BranchName } | Out-Null
}

# -----------------------------------------------------------------------------
# 4. TSC + tests + build
# -----------------------------------------------------------------------------
if (-not $SkipTests) {
    Write-Step '4. Validacion: TSC + tests'
    $tscOk = Run-Cmd 'npx tsc --noEmit' { & npx tsc --noEmit } -AllowFail $true
    if (-not $tscOk -and -not $DryRun) {
        Write-ErrMsg 'TSC fallo.'
        if (-not (Confirm-Step 'Continuar pese a errores TSC?')) { exit 1 }
    }
    $testOk = Run-Cmd 'npm test' { & npm test -- --run } -AllowFail $true
    if (-not $testOk -and -not $DryRun) {
        Write-ErrMsg 'Tests fallaron.'
        if (-not (Confirm-Step 'Continuar pese a tests fallidos?')) { exit 1 }
    }
} else {
    Write-WarnMsg 'Saltando TSC + tests (-SkipTests)'
}

if (-not $SkipBuild) {
    Write-Step '5. npm run build'
    $buildOk = Run-Cmd 'npm run build' { & npm run build } -AllowFail $true
    if (-not $buildOk -and -not $DryRun) {
        Write-ErrMsg 'Build fallo.'
        if (-not (Confirm-Step 'Continuar pese a build fallido?')) { exit 1 }
    }
} else {
    Write-WarnMsg 'Saltando build (-SkipBuild)'
}

# -----------------------------------------------------------------------------
# 6. git add SELECTIVO
# -----------------------------------------------------------------------------
Write-Step '6. git add (selectivo) + commit'
foreach ($f in $SprintFiles) {
    if (Test-Path $f) {
        Run-Cmd "git add $f" { & git add $f } -AllowFail $true | Out-Null
    }
}

$pending = & git diff --cached --name-only
if (-not $pending) {
    Write-WarnMsg 'No hay cambios staged. Saltando commit.'
} else {
    Write-Host ''
    Write-Host 'Archivos staged para commit:'
    Write-Host $pending
    Write-Host ''
    if (-not (Confirm-Step 'Hacer commit de estos archivos?')) {
        Write-WarnMsg 'Commit cancelado por usuario.'
        exit 0
    }

    $commitMsg = "feat(auth): signup publico con aprobacion manual + emails Resend`n`nBackend (aplicado en prod via MCP):`n- Migration handle_new_user con nombre/apellidos + status pendiente`n- Funciones admin_reject_user, cleanup_pending_users_older_than_7_days, is_approved`n- Extension pg_cron + cron diario 03:00 UTC`n- Edge Function notify-admin-pending-user (v1, ACTIVE)`n- Edge Function notify-user-approval-decision (v1, ACTIVE)`n`nFrontend:`n- SignupPage publica /signup con zod`n- PendingApprovalPage para usuarios no aprobados`n- AuthGuard bloquea approved=false a /pending-approval`n- Tab Pendientes en AdminPage (aprobar con rol + rechazar)`n- LoginPage con link a /signup`n`nDocs:`n- docs/help/AUTH-SIGNUP-Y-APROBACION.md (asistente RAG)`n- docs/COMUNICADO_NUEVO_SIGNUP.md (email equipo)`n- CLAUDE.md seccion Auth & Signup`n- docs/SESIONES/2026-04-26-signup-aprobacion.md`n- docs/ESTADO.md actualizado`n`nResend dominio valereconsultores.com (verified, plan Free 100/dia 3000/mes).`nSecret RESEND_API_KEY configurado en Supabase."

    Run-Cmd 'git commit' { & git commit -m $commitMsg } | Out-Null
    Write-Ok 'Commit creado'
}

# -----------------------------------------------------------------------------
# 7. push + PR
# -----------------------------------------------------------------------------
if (-not $SkipPush) {
    Write-Step '7. git push'
    Run-Cmd "git push -u origin $BranchName" { & git push -u origin $BranchName } | Out-Null
    Write-Ok 'Push completado'

    Write-Step '8. Abrir PR'
    $ghOk = Get-Command gh -ErrorAction SilentlyContinue
    if ($ghOk) {
        Write-Host '-> gh pr create' -ForegroundColor Gray
        if (-not $DryRun) {
            $prBody = 'Sprint signup-aprobacion-manual. Detalle en docs/SESIONES/2026-04-26-signup-aprobacion.md y .cowork/outbox/2026-04-26T15-18-22-signup-aprobacion-manual-handoff.md.'
            & gh pr create --title 'feat(auth): signup publico con aprobacion manual' --body $prBody --base $BaseBranch --head $BranchName
        }
    } else {
        Write-WarnMsg 'gh CLI no instalado. Abre PR manualmente:'
        $prUrl = "https://github.com/jolivares-valere/valere-v2/compare/$BaseBranch...$BranchName" + '?expand=1'
        Write-Host "   $prUrl" -ForegroundColor Cyan
    }
} else {
    Write-WarnMsg 'Saltando push (-SkipPush)'
}

Write-Step 'COMPLETADO'
Write-Host 'Siguiente paso manual:'
Write-Host '  1. Mergear el PR a main desde GitHub.'
Write-Host '  2. Esperar 3-5 min al deploy de Cloudflare Pages.'
Write-Host '  3. Smoke test en https://valere-v2.pages.dev/signup'
Write-Host '  4. Ejecutar el RUNBOOK.ps1 original para subir acumulado sprints 5-8.'
