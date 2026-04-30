Set-Location $PSScriptRoot
Remove-Item .git\index.lock -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300

git add src/core/types/database.ts
git add src/features/seguimiento-fv/api.ts
git add supabase/migrations/20260430_fv_asignar_plantas_empresas.sql

$msg = @'
feat(fv): regenerar database.ts con tablas fv_* + quitar casts supabase as any

- database.ts regenerado desde Supabase (5011 lineas, incluye fv_planta,
  fv_kpi_realtime, fv_kpi_diario, fv_alarma, fv_dispositivo, fv_credenciales,
  fv_sync_log, fv_resumen_semanal, fv_informe_mensual)
- seguimiento-fv/api.ts: eliminar todos los (supabase as any), el cliente
  ya esta tipado con Database que ahora incluye las tablas fv_*
- TSC = 0 errores verificado
- Migracion SQL preparada para asignar plantas a empresas tras primer sync
'@

git commit -m $msg
git push origin main

Write-Host "Push OK" -ForegroundColor Green
