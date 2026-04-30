Set-Location "C:\Users\joliv\valere-v2"
$lock = ".git\index.lock"
if (Test-Path $lock) { Remove-Item $lock -Force; Write-Host "Removed lock" -ForegroundColor Yellow }

git add src/features/potencias/ExpedienteDetailPage.tsx
git add src/core/hooks/useSupabaseQuery.ts
git add src/App.tsx
git add src/components/layout/Sidebar.tsx
git add src/features/empresas/EmpresaDetailPage.tsx
git add src/features/seguimiento-fv/api.ts
git add src/features/seguimiento-fv/components/PlantaFVTab.tsx
git add supabase/functions/ask-crm-docs/index.ts
git add supabase/functions/_shared/ai-adapter.ts

git diff --cached --stat

git commit -m "fix: dashboard 0-clientes + asistente 500 + ExpedienteDetail mejoras

- useSupabaseQuery: usar .is(col,null) en lugar de .filter(col,'eq',null)
  (PostgREST no hace IS NULL con eq, devuelvia 0 filas en Dashboard Potencias)
- ExpedienteDetailPage: edicion inline solicitud (ref,fechas,notas) +
  boton Nuevo ciclo cuando ultimo ciclo esta completado
- App.tsx / Sidebar.tsx / EmpresaDetailPage.tsx: restaurar desde git
  (archivos truncados por bug NTFS del sandbox Linux)
- ask-crm-docs v18: ai-adapter.ts extrae texto de candidates[0].content.parts
  cuando gemini-2.5-flash lanza en result.text (thinking model);
  catch devuelve 200 en lugar de 500 para que el SDK entregue el mensaje
- seguimiento-fv/api.ts: cast (supabase as any) en tablas fv_* (no en database.ts)
- PlantaFVTab: formatter recharts acepta ValueType|undefined"

git push origin main
Write-Host "`nDone!" -ForegroundColor Green
