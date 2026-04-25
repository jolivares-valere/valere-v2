# =====================================================================
# DEPRECATED 2026-04-25 sprint 11
# =====================================================================
# Este script con helpers custom rompía en PowerShell 5.1 por dos veces
# consecutivas (problemas de parser con `Funcion (...)`, strings que
# empiezan con `[`, here-strings sutiles).
#
# Usa en su lugar:
#
#   docs/RUNBOOK_FLAT.md   (bloques A-F copy/paste manuales)
#   RUNBOOK_FLAT.ps1       (versión ejecutable validada con PSScriptAnalyzer)
#
# One-liner:
#   powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\joliv\valere-v2\RUNBOOK_FLAT.ps1"
#
# Para evitar accidentes este archivo no hace nada.
# =====================================================================

Write-Host ''
Write-Host 'RUNBOOK.ps1 esta DEPRECATED.' -ForegroundColor Yellow
Write-Host ''
Write-Host 'Usa en su lugar:' -ForegroundColor White
Write-Host '  docs/RUNBOOK_FLAT.md  (bloques manuales)' -ForegroundColor Cyan
Write-Host '  RUNBOOK_FLAT.ps1      (script validado PS 5.1)' -ForegroundColor Cyan
Write-Host ''
Write-Host 'One-liner:' -ForegroundColor White
Write-Host '  powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\joliv\valere-v2\RUNBOOK_FLAT.ps1"' -ForegroundColor Cyan
Write-Host ''
exit 0
