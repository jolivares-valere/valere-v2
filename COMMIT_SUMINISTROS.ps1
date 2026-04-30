Set-Location "C:\Users\joliv\valere-v2"
$lock = ".git\index.lock"
if (Test-Path $lock) { Remove-Item $lock -Force; Write-Host "Removed lock" -ForegroundColor Yellow }

git add src/features/potencias/SuministrosPotenciasPage.tsx
git add src/features/potencias/components/NuevoExpedienteModal.tsx
git add src/App.tsx
git add src/components/layout/Sidebar.tsx
git add src/core/types/entities.ts
git add src/features/datos/DatosPage.tsx
git add docs/ESTADO.md
git add docs/SESIONES/2026-04-29-resumen-tarde.md

git diff --cached --stat

git commit -m "feat(potencias): pagina Suministros dedicada + tipos Cups completos

- SuministrosPotenciasPage.tsx: tabla directa de 73 CUPS sin necesidad
  de seleccionar empresa primero (fix: antes mostraba pagina vacia)
  Busqueda CUPS/empresa/ciudad, filtro empresa, badges P1/P2/P3,
  columna Exptes activos (badge naranja), columna Datadis
- App.tsx: ruta /potencias/suministros registrada
- Sidebar: Suministros -> /potencias/suministros (era /datos)
- entities.ts Cups: anyadidos p1_kw..p6_kw, legacy_potencia_id,
  denominacion, tension_kv, potencia_maxima_disponible, channel,
  ciudad_suministro (estaban en DB pero no en el tipo)
- NuevoExpedienteModal: usa Pick<Cups,...> en lugar de interface local
- DatosPage: lee location.state {empresaId,cupsId} para pre-seleccionar"

git push origin main
Write-Host "`nDone!" -ForegroundColor Green
