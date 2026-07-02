Set-Location "$env:USERPROFILE\valere-v2"

# 1. Liberar lock residual si existe
Remove-Item ".git\index.lock" -Force -ErrorAction SilentlyContinue

# 2. Crear rama feature si no existe, o moverse a ella
$rama = "feature/fv-operational-redesign"
git fetch origin
$existe = git branch --list $rama
if (-not $existe) {
    git checkout -b $rama main
} else {
    git checkout $rama
}

# 3. Traer lo último de main como base
git merge origin/main --no-edit

# 4. Frontend — módulo seguimiento-fv
git add src/features/seguimiento-fv/api.ts
git add src/features/seguimiento-fv/fixtures.ts
git add src/features/seguimiento-fv/SeguimientoFVPage.tsx
git add src/features/seguimiento-fv/components/ResumenTab.tsx
git add src/features/seguimiento-fv/components/PlantasTab.tsx
git add src/features/seguimiento-fv/components/ProduccionTab.tsx
git add src/features/seguimiento-fv/components/ExcedentesTab.tsx
git add src/features/seguimiento-fv/components/IncidenciasTab.tsx
git add src/features/seguimiento-fv/components/CredencialesTab.tsx
git add src/features/seguimiento-fv/components/SinAsignarTab.tsx
git add src/features/seguimiento-fv/components/InformesTab.tsx
git add src/features/seguimiento-fv/components/CredencialFormModal.tsx
git add src/features/seguimiento-fv/components/AsignarPlantaModal.tsx

# 5. Supabase — migración SQL (NO ejecutar hasta ventana controlada)
git add supabase/migrations/20260510_fv_alta_manual_credenciales.sql

# 6. Supabase — Edge Function cifrado server-side (NO deployar hasta ventana controlada)
git add supabase/functions/fv-create-credential/index.ts

# 7. Scripts Python — sync + cookies (NO ejecutar contra producción hasta ventana controlada)
git add scripts/fv-sync/sync_job.py
git add scripts/fv-sync/extract_cookies.py

# 8. Commit
$msg = @"
feat(fv-module): alta manual credenciales con cifrado server-side + split-table security + Python adaptado a fv_credenciales_secret

Cambio coordinado - aplicar siempre juntos:
  1. Migracion SQL: fv_credenciales_secret (secretos fuera de tabla publica)
  2. Edge Function fv-create-credential: cifrado AES-256-GCM server-side
  3. Frontend: formulario alta manual + asignacion planta a empresa+CUPS
  4. sync_job.py: lee secretos via JOIN a fv_credenciales_secret
  5. extract_cookies.py: escribe cookies en fv_credenciales_secret

Orden de despliegue:
  backup > FV_ENCRYPTION_KEY > deploy EF > migracion SQL > Python > check-secrets > dry-run > validar

PENDIENTE antes de produccion:
  Configurar FV_ENCRYPTION_KEY en Supabase Secrets
  Deploy: supabase functions deploy fv-create-credential
  Aplicar: 20260510_fv_alta_manual_credenciales.sql
  Validar: python sync_job.py --check-secrets
"@
git commit -m $msg

# 9. Push rama (sin tocar main)
git push origin $rama

Write-Host "`n✅ Rama '$rama' actualizada en GitHub" -ForegroundColor Green
Write-Host "" -ForegroundColor White
Write-Host "   PENDIENTE antes de producción:" -ForegroundColor Yellow
Write-Host "   1. Backup tablas FV en Supabase Dashboard" -ForegroundColor Yellow
Write-Host "   2. Configurar FV_ENCRYPTION_KEY en Supabase Secrets" -ForegroundColor Yellow
Write-Host "   3. supabase functions deploy fv-create-credential --project-ref gtphkowfcuiqbvfkwjxb" -ForegroundColor Yellow
Write-Host "   4. Aplicar 20260510_fv_alta_manual_credenciales.sql en SQL Editor" -ForegroundColor Yellow
Write-Host "   5. python sync_job.py --check-secrets" -ForegroundColor Yellow
Write-Host "   6. python sync_job.py --dry-run" -ForegroundColor Yellow
Write-Host "" -ForegroundColor White
Write-Host "   Abre PR cuando FV + /hoy + captacion + permisos esten auditados juntos." -ForegroundColor Cyan
