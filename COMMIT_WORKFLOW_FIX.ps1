Set-Location "$env:USERPROFILE\valere-v2"
Remove-Item ".git\index.lock" -Force -ErrorAction SilentlyContinue

$rama = git branch --show-current
Write-Host "Rama actual: $rama" -ForegroundColor Cyan

# El workflow roto está en main -- hacer cherry-pick o commit directo según rama
# Si estamos en feature/demo-audit-mode, hacer el fix aquí y luego lo portamos a main

git add .github/workflows/fv-sync.yml
git status --short

git commit -m "fix(fv-sync): completar step truncado 'Ejecutar sincronizacion'

El archivo fv-sync.yml estaba truncado desde commit cda9a24.
La linea 63 cortaba en 'Ejecutar sincronizac' sin el body del step.
GitHub Actions interpretaba el step como invalido (sin run/uses/etc)
y rechazaba el workflow antes de ejecutar ningun job.

Completado:
  - working-directory: scripts/fv-sync
  - env: SUPABASE_URL, SUPABASE_SERVICE_KEY, FV_ENCRYPTION_KEY, RESEND_API_KEY
  - run: python sync_job.py con flags --empresa y --dry-run opcionales"

git push origin $rama
Write-Host "`n✅ Workflow fix commiteado en '$rama'" -ForegroundColor Green
Write-Host "Si la rama no es main, portarlo tambien a main antes del proximo cron." -ForegroundColor Yellow
