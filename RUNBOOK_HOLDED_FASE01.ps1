# =============================================================================
# RUNBOOK_HOLDED_FASE01.ps1
# Sprint: Holded Fase 0 + Fase 1
# Autor: Cowork
# Fecha: 2026-04-27
# Target: Windows PowerShell 5.1 (NO pwsh 7+ syntax)
# =============================================================================
#
# Idempotente. Re-ejecutable sin romper nada.
#
# QUE HACE
#   1. Verifica estado del repo (rama, archivos esperados).
#   2. Ejecuta TSC y tests (si Node esta disponible).
#   3. Hace stage de los archivos del sprint y ofrece commit + push.
#   4. NO mergea el PR. NO ejecuta migrations en prod.
#
# QUE NO HACE
#   - Reparar git index si esta corrupto: usa RUNBOOK.ps1 -OnlyRepair primero.
#   - Aplicar migrations en Supabase: hazlo desde Cowork con MCP o desde
#     Dashboard SQL Editor.
#   - Deploy Edge Functions: hazlo con `npx supabase functions deploy ...`.
#   - Crear HOLDED_CRON_SECRET: lo haces tu manualmente en Vault + Edge
#     Function Secrets (ver outbox handoff).
#
# FLAGS
#   -DryRun           Muestra lo que haria, sin tocar nada.
#   -SkipTests        Salta TSC + Vitest (utilizar solo si node_modules roto).
#   -SkipPush         Hace commit pero no push.
#   -YesToAll         No pregunta confirmaciones.
# =============================================================================

[CmdletBinding()]
param(
  [switch]$DryRun,
  [switch]$SkipTests,
  [switch]$SkipPush,
  [switch]$YesToAll
)

$ErrorActionPreference = 'Stop'
$RepoRoot = 'C:\Users\joliv\valere-v2'
$Branch = 'claude/holded-integration'
$CommitMsg = 'feat(holded-fase01): infraestructura + auditoria datos pre-Holded'

function Write-Step {
  param([string]$msg)
  Write-Host ''
  Write-Host '==>' $msg -ForegroundColor Cyan
}

function Write-Ok {
  param([string]$msg)
  Write-Host '   OK' $msg -ForegroundColor Green
}

function Write-Warn2 {
  param([string]$msg)
  Write-Host '   WARN' $msg -ForegroundColor Yellow
}

function Write-Err {
  param([string]$msg)
  Write-Host '   ERR' $msg -ForegroundColor Red
}

function Confirm-Action {
  param([string]$prompt)
  if ($YesToAll) { return $true }
  $answer = Read-Host ($prompt + ' [y/N]')
  return ($answer -eq 'y' -or $answer -eq 'Y')
}

function Invoke-Cmd {
  param([string]$cmd, [string]$desc)
  if ($DryRun) {
    Write-Host '   DRY' $desc -ForegroundColor DarkGray
    Write-Host '       cmd:' $cmd -ForegroundColor DarkGray
    return 0
  }
  Write-Host '   RUN' $desc -ForegroundColor DarkGray
  $output = & cmd /c $cmd 2>&1
  $code = $LASTEXITCODE
  $output | ForEach-Object { Write-Host '       ' $_ }
  return $code
}

# -----------------------------------------------------------------------------
# 0. Sanity
# -----------------------------------------------------------------------------
Write-Step 'Sanity check del repo'
if (-not (Test-Path $RepoRoot)) {
  Write-Err ('No existe ' + $RepoRoot)
  exit 1
}
Set-Location $RepoRoot
Write-Ok ('cwd = ' + (Get-Location).Path)

# Verifica que git no este roto
Write-Step 'Verificando que git index funciona'
$gitStatus = & git status -s 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Err 'git status fallo. .git/index probablemente corrupto.'
  Write-Err 'Ejecuta primero: powershell -File RUNBOOK.ps1 -OnlyRepair'
  exit 2
}
Write-Ok 'git index OK'

# -----------------------------------------------------------------------------
# 1. Branch
# -----------------------------------------------------------------------------
Write-Step ('Creando/cambiando a rama ' + $Branch)
$currentBranch = & git rev-parse --abbrev-ref HEAD 2>$null
Write-Host '   branch actual:' $currentBranch
if ($currentBranch -ne $Branch) {
  $branchExists = & git branch --list $Branch 2>$null
  if ([string]::IsNullOrWhiteSpace($branchExists)) {
    if (Confirm-Action ('Crear nueva rama ' + $Branch + ' desde main?')) {
      Invoke-Cmd 'git checkout main' 'switch main'
      Invoke-Cmd 'git pull origin main' 'pull main'
      Invoke-Cmd ('git checkout -b ' + $Branch) ('crear rama ' + $Branch)
    } else {
      Write-Warn2 'Cancelado por usuario.'
      exit 0
    }
  } else {
    Invoke-Cmd ('git checkout ' + $Branch) ('switch a ' + $Branch)
  }
} else {
  Write-Ok ('ya estamos en ' + $Branch)
}

# -----------------------------------------------------------------------------
# 2. Archivos esperados
# -----------------------------------------------------------------------------
Write-Step 'Verificando archivos del sprint presentes'
$expected = @(
  'docs\AUDIT_DATOS_VALERE_PRE_HOLDED_2026-04-27.md',
  'docs\SESIONES\2026-04-27-holded-fase0-fase1.md',
  'src\core\integrations\holded\validators.test.ts',
  'src\core\integrations\holded\validators.ts',
  'src\features\admin\components\HoldedTab.tsx',
  'supabase\functions\_shared\holded-client.ts',
  'supabase\functions\holded-worker\index.ts',
  'supabase\functions\notify-integration-error\index.ts',
  'supabase\migrations\20260427_holded_data_audit.sql',
  'supabase\migrations\20260427_holded_infrastructure.sql'
)
$missing = @()
foreach ($f in $expected) {
  if (-not (Test-Path (Join-Path $RepoRoot $f))) {
    $missing += $f
  }
}
if ($missing.Count -gt 0) {
  Write-Err 'Faltan archivos esperados:'
  $missing | ForEach-Object { Write-Err ('  ' + $_) }
  exit 3
}
Write-Ok ('Todos los archivos presentes (' + $expected.Count + ')')

# -----------------------------------------------------------------------------
# 3. TSC + tests
# -----------------------------------------------------------------------------
if ($SkipTests) {
  Write-Warn2 'SkipTests activado, no ejecuto TSC ni Vitest.'
} else {
  Write-Step 'Type-check con npx tsc'
  $tscCode = Invoke-Cmd 'npx tsc --noEmit' 'tsc --noEmit'
  if ($tscCode -ne 0 -and -not $DryRun) {
    Write-Err 'TSC fallo. Arregla los errores antes de commitear.'
    exit 4
  }
  Write-Ok 'TSC 0 errores'

  Write-Step 'Tests Vitest'
  $testCode = Invoke-Cmd 'npm test -- --run' 'npm test -- --run'
  if ($testCode -ne 0 -and -not $DryRun) {
    Write-Err 'Tests fallaron.'
    exit 5
  }
  Write-Ok 'Tests pasaron'
}

# -----------------------------------------------------------------------------
# 4. Stage + commit
# -----------------------------------------------------------------------------
Write-Step 'git status antes del stage'
$status = & git status -s 2>&1
$status | ForEach-Object { Write-Host '       ' $_ }

if (Confirm-Action 'Stage de los 10 archivos nuevos + AdminPage.tsx + ESTADO.md?') {
  Invoke-Cmd 'git add docs/AUDIT_DATOS_VALERE_PRE_HOLDED_2026-04-27.md' 'add audit datos'
  Invoke-Cmd 'git add docs/SESIONES/2026-04-27-holded-fase0-fase1.md' 'add sesion'
  Invoke-Cmd 'git add docs/ESTADO.md' 'add ESTADO.md'
  Invoke-Cmd 'git add src/core/integrations/holded/' 'add validators'
  Invoke-Cmd 'git add src/features/admin/components/HoldedTab.tsx' 'add HoldedTab'
  Invoke-Cmd 'git add src/features/admin/AdminPage.tsx' 'add AdminPage diff'
  Invoke-Cmd 'git add supabase/functions/_shared/holded-client.ts' 'add holded-client'
  Invoke-Cmd 'git add supabase/functions/holded-worker/' 'add worker'
  Invoke-Cmd 'git add supabase/functions/notify-integration-error/' 'add notify'
  Invoke-Cmd 'git add supabase/migrations/20260427_holded_data_audit.sql' 'add migration audit'
  Invoke-Cmd 'git add supabase/migrations/20260427_holded_infrastructure.sql' 'add migration infra'
  Invoke-Cmd 'git add .cowork/outbox/2026-04-27T13-30-00-holded-fase01-handoff.md' 'add outbox'
  Invoke-Cmd 'git add RUNBOOK_HOLDED_FASE01.ps1' 'add este runbook'
} else {
  Write-Warn2 'Stage cancelado.'
  exit 0
}

Write-Step 'git status despues del stage'
$status2 = & git status -s 2>&1
$status2 | ForEach-Object { Write-Host '       ' $_ }

if (Confirm-Action ('Commit con mensaje "' + $CommitMsg + '"?')) {
  Invoke-Cmd ('git commit -m "' + $CommitMsg + '"') 'commit'
} else {
  Write-Warn2 'Commit cancelado. Stage queda preparado.'
  exit 0
}

# -----------------------------------------------------------------------------
# 5. Push
# -----------------------------------------------------------------------------
if ($SkipPush) {
  Write-Warn2 'SkipPush activado. Commit local listo, no se hace push.'
} else {
  if (Confirm-Action ('Push a origin/' + $Branch + '?')) {
    Invoke-Cmd ('git push -u origin ' + $Branch) ('push ' + $Branch)
  } else {
    Write-Warn2 'Push cancelado.'
  }
}

# -----------------------------------------------------------------------------
# 6. Resumen
# -----------------------------------------------------------------------------
Write-Step 'Resumen'
Write-Host '   Sprint Holded Fase 0 + Fase 1 commiteado en ' $Branch
Write-Host '   Pendiente:'
Write-Host '     1. Crear PR en GitHub (NO mergear todavia)'
Write-Host '     2. Aplicar 20260427_holded_data_audit.sql via MCP apply_migration'
Write-Host '     3. Generar HOLDED_CRON_SECRET y meterlo en Vault + Edge Function Secrets'
Write-Host '     4. Aplicar 20260427_holded_infrastructure.sql'
Write-Host '     5. Deploy Edge Functions: holded-worker (verify_jwt=false) + notify-integration-error'
Write-Host '     6. Smoke test en /admin?tab=holded'
Write-Host '   Detalle completo en .cowork/outbox/2026-04-27T13-30-00-holded-fase01-handoff.md'
Write-Host ''
Write-Ok 'RUNBOOK completado.'
