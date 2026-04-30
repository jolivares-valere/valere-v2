# Commit del modulo Seguimiento Planta FV
# Ejecutar desde la raiz del repo: .\COMMIT_FV.ps1

Set-Location $PSScriptRoot

# Añadir todos los archivos del modulo FV
git add src/features/seguimiento-fv/
git add src/components/layout/Sidebar.tsx
git add src/App.tsx
git add src/features/empresas/EmpresaDetailPage.tsx
git add supabase/migrations/20260429_seguimiento_fv.sql
git add scripts/fv-sync/
git add .github/workflows/fv-sync.yml

git commit -m "feat(fv): modulo Seguimiento Planta FV - FusionSolar + GitHub Actions sync

- SQL: 7 tablas fv_* con RLS granular (credenciales, planta, dispositivo,
  kpi_realtime, kpi_diario, alarma, sync_log)
- Python: conector FusionSolar (WebAuth + Northbound stub), cifrado AES-256-GCM,
  sync_job.py con upsert idempotente, scripts/fv-sync/
- GitHub Actions: cron diario 02:00 ES, manual dispatch con dry-run
- Frontend: SeguimientoFVPage (vista global todas las plantas),
  PlantaFVTab (tab en ficha empresa con KPIs, grafico produccion,
  alarmas, dispositivos), api.ts con todos los hooks React Query
- Sidebar: enlace Plantas FV en menu CRM
- Ruta /seguimiento-fv en App.tsx
- Tab Plantas FV en EmpresaDetailPage"

git push origin main

Write-Host "✅ Commit FV completado y push a main" -ForegroundColor Green
Write-Host ""
Write-Host "PROXIMOS PASOS OBLIGATORIOS:" -ForegroundColor Yellow
Write-Host "1. Ejecutar la migracion SQL en Supabase Dashboard:" -ForegroundColor White
Write-Host "   supabase/migrations/20260429_seguimiento_fv.sql" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Generar la clave de cifrado FV:" -ForegroundColor White
Write-Host "   cd scripts\fv-sync && python -m venv .venv && .venv\Scripts\activate" -ForegroundColor Cyan
Write-Host "   pip install -r requirements.txt" -ForegroundColor Cyan
Write-Host "   python crypto.py generate" -ForegroundColor Cyan
Write-Host "   # Guarda la clave en 1Password!" -ForegroundColor Red
Write-Host ""
Write-Host "3. Configurar secrets en GitHub Actions:" -ForegroundColor White
Write-Host "   https://github.com/jolivares-valere/valere-v2/settings/secrets/actions" -ForegroundColor Cyan
Write-Host "   - SUPABASE_URL = https://gtphkowfcuiqbvfkwjxb.supabase.co" -ForegroundColor White
Write-Host "   - SUPABASE_SERVICE_KEY = (Service Role Key de Supabase)" -ForegroundColor White
Write-Host "   - FV_ENCRYPTION_KEY = (la clave generada en paso 2)" -ForegroundColor White
Write-Host ""
Write-Host "4. Añadir primera credencial FV de un cliente (ver scripts/fv-sync/README.md)" -ForegroundColor White
