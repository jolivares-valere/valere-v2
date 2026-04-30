# ============================================================
# Sync Potencias lib + componentes desde repo musing-kalam -> CRM
# ============================================================
# Copia los archivos del repo `valere-gestion-potencias` (clonado
# en H:\Mi unidad\...\musing-kalam) al CRM `valere-v2`, en la
# estructura del CRM (src/core/pdf, src/core/email, etc.).
#
# Solo copia archivos que NO existen ya en el destino (idempotente).
# Si quieres forzar sobrescribir, anade -Force.
#
# Uso:
#   cd C:\Users\joliv\valere-v2
#   ./scripts/sync_potencias_lib_from_musing_kalam.ps1
# ============================================================

$ErrorActionPreference = 'Stop'

$dst = $PSScriptRoot | Split-Path  # raiz del CRM

# Buscar musing-kalam: prioridad 1 = Drive Desktop (mas actualizado).
# Prioridad 2 = clone temporal desde GitHub (fallback si Drive no esta montado).
# Sintaxis compatible con PowerShell 5.1+.

$src = $null

# Opcion A: Drive Desktop (mas actualizado, fuente de verdad)
$base = "H:\Mi unidad\06_IA_Y_AUTOMATIZACION\CLAUDE"
if (Test-Path $base) {
    $candidates = Get-ChildItem -Path $base -ErrorAction SilentlyContinue |
                  Where-Object { $_.PSIsContainer -and $_.Name -like "valere-consultores*" }
    foreach ($c in $candidates) {
        $maybe = Join-Path $c.FullName "musing-kalam"
        if (Test-Path "$maybe\src\lib") {
            $src = $maybe
            Write-Host "Encontrado origen (Drive Desktop): $src"
            break
        }
    }
}

# Opcion B: clone temporal desde GitHub (fallback)
if (-not $src) {
    $tempClone = Join-Path $env:TEMP "musing-kalam-temp"
    if (Test-Path "$tempClone\src\lib") {
        $src = $tempClone
        Write-Host "Encontrado origen (clone temporal, fallback): $src"
        Write-Warning "OJO: el clone temporal puede estar desactualizado. Drive Desktop es la fuente de verdad."
    }
}

if (-not $src) {
    Write-Host ""
    Write-Host "No se encontro musing-kalam. Clona el repo primero:" -ForegroundColor Yellow
    Write-Host "  cd `$env:TEMP" -ForegroundColor Yellow
    Write-Host "  git clone https://github.com/jolivares-valere/valere-gestion-potencias musing-kalam-temp" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "O abre Google Drive Desktop para que monte la unidad H:\." -ForegroundColor Yellow
    exit 1
}

# Crear carpetas destino
$dirs = @(
    'src\core\pdf',
    'src\core\email',
    'src\core\excel',
    'src\features\potencias\lib',
    'src\features\potencias\components\shared',
    'api'
)
foreach ($d in $dirs) {
    $full = Join-Path $dst $d
    if (-not (Test-Path $full)) {
        New-Item -ItemType Directory -Force -Path $full | Out-Null
        Write-Host "  + dir $d"
    }
}

# Mapping origen -> destino
$mappings = @{
    # PDF generation (3)
    "$src\src\lib\pdf-fill.ts"                 = "$dst\src\core\pdf\pdf-fill.ts"
    "$src\src\lib\autorizacion-valere-pdf.tsx" = "$dst\src\core\pdf\autorizacion-valere-pdf.tsx"
    "$src\src\lib\presentacion-pdf.tsx"        = "$dst\src\core\pdf\presentacion-pdf.tsx"

    # Email (3) - email-sender.ts ya copiado por Cowork
    "$src\src\lib\email-templates.ts"          = "$dst\src\core\email\email-templates.ts"
    "$src\src\lib\email-signatures.ts"         = "$dst\src\core\email\email-signatures.ts"

    # Excel (1)
    "$src\src\lib\excel-import.ts"             = "$dst\src\core\excel\excel-import.ts"

    # Potencias-specific lib (2)
    "$src\src\lib\client-docs.ts"              = "$dst\src\features\potencias\lib\client-docs.ts"
    "$src\src\lib\presentacion.ts"             = "$dst\src\features\potencias\lib\presentacion.ts"

    # Componentes shared (8) -> src/features/potencias/components/shared/
    "$src\src\components\shared\GenerateAuthorizationDialog.tsx"     = "$dst\src\features\potencias\components\shared\GenerateAuthorizationDialog.tsx"
    "$src\src\components\shared\GenerateGroupAuthValereDialog.tsx"   = "$dst\src\features\potencias\components\shared\GenerateGroupAuthValereDialog.tsx"
    "$src\src\components\shared\MultiSupplyImportDialog.tsx"         = "$dst\src\features\potencias\components\shared\MultiSupplyImportDialog.tsx"
    "$src\src\components\shared\SendPresentationDialog.tsx"          = "$dst\src\features\potencias\components\shared\SendPresentationDialog.tsx"
    "$src\src\components\shared\TemplateMappingDialog.tsx"           = "$dst\src\features\potencias\components\shared\TemplateMappingDialog.tsx"
    "$src\src\components\shared\UploadSignedAuthDialog.tsx"          = "$dst\src\features\potencias\components\shared\UploadSignedAuthDialog.tsx"
    "$src\src\components\shared\ClientDocuments.tsx"                 = "$dst\src\features\potencias\components\shared\ClientDocuments.tsx"
    "$src\src\components\shared\HelpPanel.tsx"                       = "$dst\src\features\potencias\components\shared\HelpPanel.tsx"
}

$copied = 0
$skipped = 0
$missing = 0

foreach ($pair in $mappings.GetEnumerator()) {
    $from = $pair.Key
    $to = $pair.Value

    if (-not (Test-Path $from)) {
        Write-Warning "  ! falta origen: $from"
        $missing++
        continue
    }

    if (Test-Path $to) {
        Write-Host "  = ya existe: $($to.Substring($dst.Length+1))"
        $skipped++
        continue
    }

    Copy-Item -Path $from -Destination $to -Force
    $size = (Get-Item $to).Length
    Write-Host "  + $($to.Substring($dst.Length+1)) ($size bytes)"
    $copied++
}

Write-Host ""
Write-Host "=== Resumen ==="
Write-Host "  Copiados: $copied"
Write-Host "  Existian: $skipped"
Write-Host "  Faltantes en origen: $missing"
Write-Host ""
Write-Host "ATENCION - Ajustes manuales pendientes en imports tras la copia:"
Write-Host "  1. Cambiar imports de '@/types' a '@/core/types/database' o equivalente"
Write-Host "  2. Cambiar imports de './supabase' a '@/core/supabase/client'"
Write-Host "  3. Cambiar imports de './alerts' (formatFecha) a '@/core/utils/dates' o equivalente"
Write-Host "  4. Mappear nombres de tablas:"
Write-Host "     - clients -> empresas"
Write-Host "     - supplies -> cups"
Write-Host "     - power_requests -> solicitudes_potencia"
Write-Host "     - client_communications -> comunicaciones_cliente"
Write-Host "     - profiles -> user_profiles"
Write-Host "  5. Verificar TSC: npx tsc --noEmit"
