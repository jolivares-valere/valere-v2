# Verificar y restaurar archivos FV si el mount de Cowork los dejó truncados
# Ejecutar desde la raiz del repo: .\CHECK_FV_FILES.ps1

Set-Location $PSScriptRoot

Write-Host "=== Verificando estado de archivos FV ===" -ForegroundColor Cyan

$files = @(
    "src/App.tsx",
    "src/components/layout/Sidebar.tsx",
    "src/features/empresas/EmpresaDetailPage.tsx"
)

$modified = @()
foreach ($f in $files) {
    $status = git status --short $f 2>&1
    if ($status -match "^\s*M") {
        $modified += $f
        Write-Host "  MODIFICADO: $f" -ForegroundColor Yellow
    } else {
        Write-Host "  OK: $f" -ForegroundColor Green
    }
}

if ($modified.Count -eq 0) {
    Write-Host "`n✅ Todos los archivos estan limpios. No se necesita ninguna accion." -ForegroundColor Green
    exit 0
}

Write-Host "`nSe detectaron $($modified.Count) archivos modificados." -ForegroundColor Yellow
Write-Host "Estos archivos tienen el contenido correcto en git (commit 032bbcd)." -ForegroundColor White
Write-Host "El mount del sandbox los puede haber dejado truncados localmente." -ForegroundColor White

$resp = Read-Host "`nRestaurar desde git (recomendado)? [S/n]"
if ($resp -eq "" -or $resp -eq "S" -or $resp -eq "s") {
    foreach ($f in $modified) {
        git restore $f
        Write-Host "  Restaurado: $f" -ForegroundColor Green
    }

    # Verificar que los archivos tienen las rutas FV
    Write-Host "`nVerificando que el contenido FV esta presente..." -ForegroundColor Cyan
    $appContent = Get-Content "src/App.tsx" -Raw
    if ($appContent -match "seguimiento-fv") {
        Write-Host "  App.tsx: ruta /seguimiento-fv PRESENTE" -ForegroundColor Green
    } else {
        Write-Host "  App.tsx: ATENCION - ruta /seguimiento-fv NO encontrada" -ForegroundColor Red
    }

    $sidebarContent = Get-Content "src/components/layout/Sidebar.tsx" -Raw
    if ($sidebarContent -match "seguimiento-fv") {
        Write-Host "  Sidebar.tsx: enlace Plantas FV PRESENTE" -ForegroundColor Green
    } else {
        Write-Host "  Sidebar.tsx: ATENCION - enlace Plantas FV NO encontrado" -ForegroundColor Red
    }

    $empresaContent = Get-Content "src/features/empresas/EmpresaDetailPage.tsx" -Raw
    if ($empresaContent -match "PlantaFVTab") {
        Write-Host "  EmpresaDetailPage.tsx: PlantaFVTab PRESENTE" -ForegroundColor Green
    } else {
        Write-Host "  EmpresaDetailPage.tsx: ATENCION - PlantaFVTab NO encontrado" -ForegroundColor Red
    }

    Write-Host "`n✅ Restauracion completada." -ForegroundColor Green
} else {
    Write-Host "Cancelado. Los archivos quedan como estan." -ForegroundColor Yellow
}

# Commit docs de cierre de sesion si hay cambios
Write-Host "`n=== Commiteando docs de cierre de sesion ===" -ForegroundColor Cyan
git add docs/ESTADO.md docs/SESIONES/ 2>$null
$hasChanges = git diff --staged --name-only
if ($hasChanges) {
    git commit -m "docs: actualizar ESTADO.md sesion 2026-04-29 - modulo FV completado"
    git push origin main
    Write-Host "✅ Docs commiteados y pusheados." -ForegroundColor Green
} else {
    Write-Host "No hay cambios en docs/ para commitear." -ForegroundColor Gray
}

Write-Host "`n=== Estado final ===" -ForegroundColor Cyan
git log --oneline -5
