# Commit de docs de la sesión 2026-06-13 (análisis plataformas + roadmap).
# Repara el índice git corrupto antes de commitear. Ejecutar desde la raíz del repo valere-v2.
$ErrorActionPreference = "Stop"
if (Test-Path ".git/index") { Remove-Item ".git/index" -Force }
git reset
git add docs/ESTADO.md docs/SESIONES/2026-06-13-resumen.md .cowork/outbox/2026-06-13T01-00-00-analisis-plataformas-zoco.md
git commit -m "docs: analisis plataformas (Zoco) + roadmap por fases - sesion 2026-06-13"
git push origin (git branch --show-current)
Write-Host "Hecho. Revisa que el push fue a la rama correcta."
