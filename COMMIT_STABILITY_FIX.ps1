Set-Location "$env:USERPROFILE\valere-v2"

# Liberar lock residual si existe
Remove-Item ".git\index.lock" -Force -ErrorAction SilentlyContinue

# Mostrar rama actual
$rama = git branch --show-current
Write-Host "Rama actual: $rama" -ForegroundColor Cyan

# Añadir archivos corregidos
git add src/features/seguimiento-fv/api.ts
git add src/App.tsx
git add src/components/layout/Sidebar.tsx
git add src/core/demo/fixtures.ts
git add src/features/seguimiento-fv/components/PlantasTab.tsx
git add src/features/seguimiento-fv/components/ProduccionTab.tsx

# Verificar staged
git status --short

# Commit
git commit -m "fix: reparar truncaciones y estabilizar modulo FV

Archivos reparados:
- api.ts: eliminar fragmento duplicado useAsignarPlantaEmpresa + casts any para columnas post-migracion
- App.tsx: completar truncacion en cartera-senior route
- Sidebar.tsx: completar truncacion en cierre del componente
- fixtures.ts: recuperar 221 lineas perdidas (FV_ALARMAS, CUPS, DATADIS, CAPTACION, FIXTURES)
- PlantasTab.tsx: title->aria-label en icono Battery + completar truncacion
- ProduccionTab.tsx: formatter recharts tipado + completar truncacion

Estado: TSC 0 errores, dev server OK, modulo FV cargando"

# Push a la rama actual (NO main)
git push origin $rama

Write-Host "`n✅ Commit de estabilidad completado en rama '$rama'" -ForegroundColor Green
