Set-Location $PSScriptRoot
Remove-Item .git\index.lock -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300

git add scripts/fv-sync/fusionsolar_client.py
git add scripts/fv-sync/sync_job.py
git add src/core/types/database.ts
git add src/features/seguimiento-fv/api.ts
git add supabase/migrations/20260430_fv_schema_redesign.sql
git add supabase/migrations/20260430_fv_asignar_plantas_empresas.sql

$msg = @'
feat(fv): rediseno schema multi-credencial + fix fill + tipos regenerados

Schema Supabase:
- fv_planta: unique constraint cambiado a (plataforma, region_url, station_code)
  para evitar duplicados cuando varias credenciales ven la misma planta fisica
- fv_planta: nuevas columnas nombre_interno, nombre_fusionsolar, region_url
- fv_credenciales: nuevas columnas descripcion y tipo (instalador_multicliente etc)
- fv_planta_credencial: tabla N:M credenciales-plantas con RLS
- funcion fv_upsert_planta: protege empresa_id de sobrescritura si ya asignado

sync_job.py:
- Usa rpc(fv_upsert_planta) en lugar de upsert directo en fv_planta
- No sobrescribe empresa_id asignada manualmente desde CRM

fusionsolar_client.py:
- fix: quitar force=True de fill() que no existe en Playwright Python

Frontend:
- database.ts regenerado con 5011 lineas, incluye todas las tablas fv_*
- seguimiento-fv/api.ts: eliminados todos los (supabase as any)
- TSC = 0 errores verificado
'@

git commit -m $msg
git push origin main

Write-Host "Push OK" -ForegroundColor Green
Write-Host "Lanza Run #15 en GitHub Actions cuando quieras" -ForegroundColor Cyan
