# ============================================================================
# INSTALAR_RENOVADOR.ps1  -  Setup del Renovador FusionSolar (una vez por PC).
# ASCII puro. Instala lo que el renovador necesita: Playwright + Chromium.
# NO guarda ninguna clave secreta en el PC.
# ============================================================================

function Write-Step($m) { Write-Host ""; Write-Host ("==> " + $m) -ForegroundColor Cyan }
function Fail($m)       { Write-Host ("ERROR: " + $m) -ForegroundColor Red; Read-Host "Pulsa Enter para salir"; exit 1 }

Write-Step "Comprobando Python"
$py = (Get-Command python -ErrorAction SilentlyContinue)
if (-not $py) { Fail "Python no esta instalado. Instalalo desde https://www.python.org/downloads/ (marca 'Add to PATH')." }
python --version

Write-Step "Instalando librerias (playwright)"
python -m pip install --upgrade pip 2>&1 | Out-Host
python -m pip install playwright 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) { Fail "No se pudo instalar playwright." }

Write-Step "Descargando navegador Chromium para Playwright"
python -m playwright install chromium 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) { Fail "No se pudo instalar Chromium." }

Write-Host ""
Write-Host "LISTO. El Renovador esta preparado en este PC." -ForegroundColor Green
Write-Host "Para renovar una sesion: doble clic en RENOVAR_SESION_FV.bat"
Read-Host "Pulsa Enter para salir"
