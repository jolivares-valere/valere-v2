@echo off
REM ============================================================
REM  Renovador de sesion FusionSolar - Valere CRM
REM  Doble clic para renovar las cookies de una credencial FV.
REM ============================================================
cd /d "%~dp0"
echo Iniciando renovador de sesion FusionSolar...
python renovar_sesion_fv.py
if errorlevel 1 (
  echo.
  echo Hubo un problema. Si es la primera vez, ejecuta antes INSTALAR_RENOVADOR.ps1
  pause
)
