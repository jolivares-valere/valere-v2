# ═══════════════════════════════════════════════════════════════════════════
# RUNBOOK_FASE2.ps1 — Fase 2 Unificación Supabase: Potencias → CRM canónico
# ═══════════════════════════════════════════════════════════════════════════
# Generado: 2026-04-26 por sprint-domingo-lane-X-fase2-prep
# Dry-run validado contra prod CRM (BEGIN…ROLLBACK) con 30 empresas,
# 75 CUPS, 41 expedientes/ciclos/solicitudes/savings, 31 comunicaciones,
# 98 documentos, 1 com_doc, 91 status_log, 2 email_templates.
#
# Resultado dry-run: counts cuadran, 0 orphans, 0 duplicados, 0 incoherencias.
#
# REQUISITOS PREVIOS:
#   • Fase 1 ya aplicada en CRM (renames + columnas legacy_potencia_id).
#   • Connection strings de los 2 proyectos en Dashboard Supabase →
#     Database → Connection pooling → Session mode.
#   • pg_dump + psql instalados (Postgres 17.x cliente).
#   • PowerShell 5.1+ (Windows nativo) o 7.x.
#
# USO:
#   powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\joliv\valere-v2\RUNBOOK_FASE2.ps1"
#
# Compatible PSScriptAnalyzer 5.1 (sin helpers custom, solo cmdlets nativos).
# ═══════════════════════════════════════════════════════════════════════════

[CmdletBinding()]
param(
    [string]$BackupDir = "$env:USERPROFILE\valere-backups",
    [string]$ScriptsDir = "$PSScriptRoot\scripts"
)

$ErrorActionPreference = 'Stop'

# ────────── Constantes ──────────
$crmHost  = 'aws-0-eu-west-1.pooler.supabase.com'
$potHost  = 'aws-0-eu-central-1.pooler.supabase.com'
$crmUser  = 'postgres.gtphkowfcuiqbvfkwjxb'
$potUser  = 'postgres.alesfvxqtwlrwlmkoosg'
$port     = 5432
$db       = 'postgres'

$timestamp = Get-Date -Format 'yyyyMMdd_HHmm'

# ────────── Pausa con instrucción ──────────
function Wait-Confirm {
    param([string]$Message)
    Write-Host ''
    Write-Host '─────────────────────────────────────────────────────────' -ForegroundColor Yellow
    Write-Host $Message -ForegroundColor Yellow
    Write-Host '─────────────────────────────────────────────────────────' -ForegroundColor Yellow
    $null = Read-Host 'Pulsa ENTER para continuar (Ctrl+C para abortar)'
}

# ────────── PASO 0: Verificación entorno ──────────
Write-Host ''
Write-Host '════════════════════════════════════════════════════════════' -ForegroundColor Cyan
Write-Host ' FASE 2 — Migración Potencias → CRM' -ForegroundColor Cyan
Write-Host ('  Timestamp: {0}' -f $timestamp) -ForegroundColor Cyan
Write-Host '════════════════════════════════════════════════════════════' -ForegroundColor Cyan
Write-Host ''

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
    throw 'pg_dump no encontrado en PATH. Instala Postgres client tools 17.x.'
}
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    throw 'psql no encontrado en PATH.'
}
if (-not (Test-Path $ScriptsDir)) {
    throw ('No se encuentra el directorio scripts: {0}' -f $ScriptsDir)
}
foreach ($f in 'unificacion_fase2_a_staging.sql','unificacion_fase2_b_dedupe_y_transform.sql','unificacion_fase2_c_verificacion.sql') {
    $p = Join-Path $ScriptsDir $f
    if (-not (Test-Path $p)) { throw ('Script faltante: {0}' -f $p) }
}

Write-Host '✓ pg_dump, psql, scripts/ verificados.' -ForegroundColor Green

# ────────── PASO 1: Solicitar passwords ──────────
Write-Host ''
Write-Host 'Necesitas las contraseñas de pooler de los 2 proyectos.' -ForegroundColor Yellow
Write-Host '  CRM:       https://supabase.com/dashboard/project/gtphkowfcuiqbvfkwjxb/settings/database' -ForegroundColor Yellow
Write-Host '  Potencias: https://supabase.com/dashboard/project/alesfvxqtwlrwlmkoosg/settings/database' -ForegroundColor Yellow
Write-Host ''
$crmPwdSecure = Read-Host -AsSecureString 'Password CRM (postgres.gtphkowfcuiqbvfkwjxb)'
$potPwdSecure = Read-Host -AsSecureString 'Password Potencias (postgres.alesfvxqtwlrwlmkoosg)'

$crmPwd = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($crmPwdSecure))
$potPwd = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($potPwdSecure))

$crmConn = ('postgresql://{0}:{1}@{2}:{3}/{4}' -f $crmUser, $crmPwd, $crmHost, $port, $db)
$potConn = ('postgresql://{0}:{1}@{2}:{3}/{4}' -f $potUser, $potPwd, $potHost, $port, $db)

# ────────── PASO 2: Verificar conexiones ──────────
Write-Host ''
Write-Host '── Paso 2: Verificando conexiones ──' -ForegroundColor Cyan
Write-Host 'CRM…' -NoNewline
& psql $crmConn -c 'SELECT 1' -t -A | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'No se pudo conectar al CRM. Revisa password.' }
Write-Host ' OK' -ForegroundColor Green

Write-Host 'Potencias…' -NoNewline
& psql $potConn -c 'SELECT 1' -t -A | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'No se pudo conectar a Potencias. Revisa password.' }
Write-Host ' OK' -ForegroundColor Green

# ────────── PASO 3: Backups ──────────
Write-Host ''
Write-Host '── Paso 3: Backups previos ──' -ForegroundColor Cyan

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$crmBackup = Join-Path $BackupDir ('crm_pre_fase2_{0}.sql' -f $timestamp)
$potBackup = Join-Path $BackupDir ('potencias_pre_fase2_{0}.sql' -f $timestamp)

Write-Host ('Backup CRM → {0}' -f $crmBackup)
& pg_dump $crmConn --no-owner --no-acl --schema=public --file=$crmBackup
if ($LASTEXITCODE -ne 0) { throw 'pg_dump CRM falló.' }
Write-Host ('  Tamaño: {0:N0} bytes' -f (Get-Item $crmBackup).Length) -ForegroundColor Green

Write-Host ('Backup Potencias → {0}' -f $potBackup)
& pg_dump $potConn --no-owner --no-acl --schema=public --file=$potBackup
if ($LASTEXITCODE -ne 0) { throw 'pg_dump Potencias falló.' }
Write-Host ('  Tamaño: {0:N0} bytes' -f (Get-Item $potBackup).Length) -ForegroundColor Green

Wait-Confirm 'Verifica que los 2 backups tienen tamaño razonable (>50KB CRM, >100KB Potencias).'

# ────────── PASO 4: Crear schema staging ──────────
Write-Host ''
Write-Host '── Paso 4: Crear schema _potencia_staging en CRM ──' -ForegroundColor Cyan
$stagingSql = Join-Path $ScriptsDir 'unificacion_fase2_a_staging.sql'
& psql $crmConn -v ON_ERROR_STOP=1 -f $stagingSql
if ($LASTEXITCODE -ne 0) { throw 'Crear schema staging falló.' }
Write-Host '✓ Schema _potencia_staging creado.' -ForegroundColor Green

Wait-Confirm "Verifica con: psql `"$crmConn`" -c '\dt _potencia_staging.*' que existen 19 tablas."

# ────────── PASO 5: Dump data-only de Potencias ──────────
Write-Host ''
Write-Host '── Paso 5: Dump data-only de Potencias ──' -ForegroundColor Cyan
$potDataDump = Join-Path $BackupDir ('potencias_data_only_{0}.sql' -f $timestamp)

$tablesToDump = @(
    'public.profiles', 'public.clients', 'public.supplies',
    'public.comercializadoras', 'public.regulated_rates', 'public.email_templates',
    'public.expedientes', 'public.ciclos', 'public.power_requests',
    'public.savings_calculations', 'public.client_communications',
    'public.client_documents', 'public.expediente_documents',
    'public.comercializadora_docs', 'public.documentacion', 'public.status_log'
)
$tArgs = @()
foreach ($t in $tablesToDump) { $tArgs += '-t'; $tArgs += $t }

& pg_dump $potConn --data-only --column-inserts --no-owner --no-acl --schema=public @tArgs --file=$potDataDump
if ($LASTEXITCODE -ne 0) { throw 'pg_dump data-only falló.' }
Write-Host ('✓ Data-only dump → {0} ({1:N0} bytes)' -f $potDataDump, (Get-Item $potDataDump).Length) -ForegroundColor Green

Wait-Confirm 'Verifica el tamaño del dump (debería ser >50KB para ~408 filas).'

# ────────── PASO 6: Reescribir public. → _potencia_staging. ──────────
Write-Host ''
Write-Host '── Paso 6: Reescribir public. → _potencia_staging. ──' -ForegroundColor Cyan
$potDataStaged = Join-Path $BackupDir ('potencias_data_staged_{0}.sql' -f $timestamp)

$content = Get-Content -Raw -Path $potDataDump
$contentStaged = $content -replace 'public\.', '_potencia_staging.'
Set-Content -Path $potDataStaged -Value $contentStaged -Encoding UTF8
Write-Host ('✓ Reescrito → {0}' -f $potDataStaged) -ForegroundColor Green

Wait-Confirm 'Inspecciona el inicio del archivo para confirmar que los INSERTs apuntan a _potencia_staging.'

# ────────── PASO 7: Cargar dump en staging ──────────
Write-Host ''
Write-Host '── Paso 7: Cargar dump en staging del CRM ──' -ForegroundColor Cyan
& psql $crmConn -v ON_ERROR_STOP=1 -f $potDataStaged
if ($LASTEXITCODE -ne 0) { throw 'Carga de dump en staging falló.' }
Write-Host '✓ Datos cargados en _potencia_staging.' -ForegroundColor Green

Wait-Confirm "Verifica counts: psql `"$crmConn`" -c 'SELECT count(*) FROM _potencia_staging.clients;' debería dar ~30."

# ────────── PASO 8: DRY-RUN del transform (ROLLBACK) ──────────
Write-Host ''
Write-Host '── Paso 8: DRY-RUN del transform (BEGIN…ROLLBACK) ──' -ForegroundColor Cyan
Write-Host '  Esto ejecuta el transform completo y luego rollback automático.' -ForegroundColor Yellow

$transformSql = Join-Path $ScriptsDir 'unificacion_fase2_b_dedupe_y_transform.sql'
$dryRunSql = Join-Path $BackupDir ('fase2b_dryrun_{0}.sql' -f $timestamp)

# Truco: leer el script y reemplazar el `commit;` final por `rollback;`
$bContent = Get-Content -Raw -Path $transformSql
$bDryRun  = $bContent -replace '(?im)^commit;', 'rollback;'
Set-Content -Path $dryRunSql -Value $bDryRun -Encoding UTF8

& psql $crmConn -v ON_ERROR_STOP=1 -f $dryRunSql
if ($LASTEXITCODE -ne 0) {
    Write-Host '  DRY-RUN FALLÓ — ROLLBACK ejecutado, prod intacta.' -ForegroundColor Red
    throw 'Dry-run falló. Revisa el output de psql arriba.'
}
Write-Host '✓ Dry-run completó sin errores. Datos rolled back.' -ForegroundColor Green

# ────────── PASO 9: Verificación dry-run ──────────
Write-Host ''
Write-Host '── Paso 9: Repetir dry-run y correr verificación ──' -ForegroundColor Cyan
Write-Host '  Para ver counts intermedios, ejecuta el transform con BEGIN…verificación…ROLLBACK.'

$dryRunVerifySql = Join-Path $BackupDir ('fase2b_dryrun_verify_{0}.sql' -f $timestamp)
$verifyContent = Get-Content -Raw -Path (Join-Path $ScriptsDir 'unificacion_fase2_c_verificacion.sql')
$combined = $bDryRun -replace '(?im)^rollback;\s*$', "`n$verifyContent`nrollback;"
Set-Content -Path $dryRunVerifySql -Value $combined -Encoding UTF8

Write-Host ('Output de verificación dry-run guardado en: {0}' -f $dryRunVerifySql) -ForegroundColor Yellow
& psql $crmConn -v ON_ERROR_STOP=1 -f $dryRunVerifySql

Wait-Confirm @"
REVISA EL OUTPUT ARRIBA:
  • Todos los counts deben cuadrar con lo esperado (empresas +22, cups +72, etc.)
  • Todos los orphan checks deben ser 0
  • Todos los duplicate checks deben ser 0
  • Todos los coherence checks deben ser 0

Si algo no cuadra → ABORTA con Ctrl+C. Prod intacta.
"@

# ────────── PASO 10: Confirmación FINAL antes de COMMIT ──────────
Write-Host ''
Write-Host '════════════════════════════════════════════════════════════' -ForegroundColor Red
Write-Host '  ⚠  Paso 10: COMMIT REAL — ESCRIBE EN PROD CRM' -ForegroundColor Red
Write-Host '════════════════════════════════════════════════════════════' -ForegroundColor Red
Write-Host ''
Write-Host 'A continuación se ejecutará el transform CON COMMIT.' -ForegroundColor Yellow
Write-Host 'Si necesitas abortar, hazlo AHORA (Ctrl+C).' -ForegroundColor Yellow
Write-Host ''
$confirm = Read-Host 'Escribe "COMMIT" para confirmar y continuar'
if ($confirm -ne 'COMMIT') {
    Write-Host 'Abortado por usuario. Prod intacta. Staging schema sigue cargado (puedes borrarlo con DROP SCHEMA _potencia_staging CASCADE;).' -ForegroundColor Yellow
    exit 0
}

Write-Host ''
Write-Host '── Aplicando transform definitivo (COMMIT) ──' -ForegroundColor Cyan
& psql $crmConn -v ON_ERROR_STOP=1 -f $transformSql
if ($LASTEXITCODE -ne 0) {
    Write-Host '  COMMIT FALLÓ. Si la transacción abortó limpiamente, prod intacta.' -ForegroundColor Red
    Write-Host '  Si quedó parcial, restaura desde backup:' -ForegroundColor Red
    Write-Host ('    psql "{0}" -f "{1}"' -f $crmConn, $crmBackup) -ForegroundColor Red
    throw 'Transform definitivo falló.'
}
Write-Host '✓ Transform aplicado y commiteado.' -ForegroundColor Green

# ────────── PASO 11: Verificación final ──────────
Write-Host ''
Write-Host '── Paso 11: Verificación final post-COMMIT ──' -ForegroundColor Cyan
& psql $crmConn -f (Join-Path $ScriptsDir 'unificacion_fase2_c_verificacion.sql')

Wait-Confirm 'Revisa que los counts sean los esperados y orphans = 0.'

# ────────── PASO 12: Resumen ──────────
Write-Host ''
Write-Host '════════════════════════════════════════════════════════════' -ForegroundColor Green
Write-Host '  ✓ FASE 2 COMPLETADA' -ForegroundColor Green
Write-Host '════════════════════════════════════════════════════════════' -ForegroundColor Green
Write-Host ''
Write-Host 'Backups disponibles en:'
Write-Host ('  CRM pre-Fase2:    {0}' -f $crmBackup)
Write-Host ('  Potencias pre-Fase2: {0}' -f $potBackup)
Write-Host ('  Data-only Pot:    {0}' -f $potDataDump)
Write-Host ''
Write-Host 'Próximos pasos (Fase 3+):'
Write-Host '  1. Apuntar apps satélite (Potencias FE) al CRM via env vars.'
Write-Host '  2. Tras 1 semana estable, DROP SCHEMA _potencia_staging CASCADE en CRM.'
Write-Host '  3. Pausar el proyecto Potencias en Supabase Dashboard.'
Write-Host ''

# ────────── ROLLBACK DE EMERGENCIA (referencia, NO se ejecuta) ──────────
Write-Host 'ROLLBACK DE EMERGENCIA (si descubres problema en horas/días siguientes):' -ForegroundColor Yellow
Write-Host ('  psql "{0}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"' -f $crmConn) -ForegroundColor Yellow
Write-Host ('  psql "{0}" -f "{1}"' -f $crmConn, $crmBackup) -ForegroundColor Yellow
Write-Host '' -ForegroundColor Yellow
