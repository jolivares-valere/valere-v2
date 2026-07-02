# REPARAR_GIT_CLAUD_2026-06-14.ps1
# Repara el repo valere-v2: HEAD quedo apuntando a la rama fantasma 'claud' (vacia) + lock colgado.
# main esta INTACTO (74c6f76). Este script NO toca main; solo devuelve HEAD a main y limpia el lock.
# Leccion aplicada: NO usar $ErrorActionPreference='Stop' global (git escribe por stderr).
#                    Controlar con $LASTEXITCODE. Backup de .git antes de tocar nada.

$repo = "C:\Users\joliv\valere-v2"
Set-Location $repo

Write-Host "== 1. Estado actual ==" -ForegroundColor Cyan
Get-Content .git\HEAD
git status 2>&1 | Select-Object -First 5

Write-Host "`n== 2. Backup de .git ==" -ForegroundColor Cyan
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backup = ".git_backup_$stamp"
Copy-Item -Path ".git" -Destination $backup -Recurse -Force
Write-Host "Backup creado en: $backup"

Write-Host "`n== 3. Borrar lock colgado ==" -ForegroundColor Cyan
if (Test-Path ".git\next-index-3.lock") { Remove-Item ".git\next-index-3.lock" -Force; Write-Host "lock borrado" }
if (Test-Path ".git\index.lock")        { Remove-Item ".git\index.lock" -Force; Write-Host "index.lock borrado" }

Write-Host "`n== 4. Verificar que main existe y es 74c6f76 ==" -ForegroundColor Cyan
$mainRef = (Get-Content .git\refs\heads\main).Trim()
Write-Host "main = $mainRef"
if ($mainRef -notlike "74c6f76*") {
    Write-Host "AVISO: main no es 74c6f76. Revisar antes de continuar. Abortando por seguridad." -ForegroundColor Yellow
    Write-Host "(El backup esta en $backup; nada se ha perdido.)"
    return
}

Write-Host "`n== 5. Devolver HEAD a main (preservando los .md nuevos del working tree) ==" -ForegroundColor Cyan
# 'checkout -f' NO, para no perder los docs nuevos. Usamos symbolic-ref + reset --mixed (no toca ficheros).
git symbolic-ref HEAD refs/heads/main
git reset --mixed 2>&1 | Out-Null
Write-Host "HEAD -> main, index reseteado (ficheros del working tree intactos)"

Write-Host "`n== 6. Limpiar la rama fantasma 'claud' si quedo creada ==" -ForegroundColor Cyan
git branch -D claud 2>&1 | Out-Null
if (Test-Path ".git\refs\heads\claud") { Remove-Item ".git\refs\heads\claud" -Force }

Write-Host "`n== 7. Estado final ==" -ForegroundColor Cyan
Get-Content .git\HEAD
git status 2>&1 | Select-Object -First 12

Write-Host "`nOK. Repo en 'main'. Los 6 .md de docs/ (y este .ps1) deberian aparecer como 'untracked'." -ForegroundColor Green
Write-Host "Siguiente: git add docs/*2026-06-14*.md + commit en rama claude/docs-diseno-2026-06-14 + PR." -ForegroundColor Green
Write-Host "Si algo fue mal, el backup completo de .git esta en: $backup" -ForegroundColor Green
