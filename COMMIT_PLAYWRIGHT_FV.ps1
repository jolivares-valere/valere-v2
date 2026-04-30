Set-Location $PSScriptRoot

# Liberar lock si existe
Remove-Item .git\index.lock -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300

# Commit: reescritura Playwright + alarmas + semanal/mensual
git add scripts/fv-sync/fusionsolar_client.py
git add scripts/fv-sync/sync_job.py
git add scripts/fv-sync/requirements.txt
git add .github/workflows/fv-sync.yml
git add docs/SESIONES/2026-04-29-seguimiento-fv.md 2>$null

git commit -m "feat(fv-sync): reescribir con Playwright + alarmas email + semanal/mensual

- fusionsolar_client.py: login via Playwright (Chromium headless)
  abandona httpx+RSA (error 406 persistente), usa page.evaluate(fetch)
  con cookies HttpOnly automaticas del browser
- sync_job.py: soporte empresa_id nullable (credencial multi-cliente),
  alarmas por email via Resend, resumen semanal, borrador informe mensual
- requirements.txt: agrega playwright==1.44.0
- fv-sync.yml: cron horario, paso install Playwright + Chromium"

git push origin main

Write-Host ""
Write-Host "Commit y push completados." -ForegroundColor Green
Write-Host ""
Write-Host "Verifica el run en:" -ForegroundColor Yellow
Write-Host "https://github.com/jolivares-valere/valere-v2/actions/workflows/fv-sync.yml" -ForegroundColor Cyan
Write-Host ""
Write-Host "PENDIENTE: anadir RESEND_API_KEY como secret de GitHub Actions si no esta." -ForegroundColor Yellow
Write-Host "https://github.com/jolivares-valere/valere-v2/settings/secrets/actions" -ForegroundColor Cyan
