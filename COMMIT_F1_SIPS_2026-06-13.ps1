# ─────────────────────────────────────────────────────────────────────
# F1 — capa SIPS/Datadis por CUPS. Repara el checkout corrupto, crea rama
# limpia desde origin/main, reaplica los archivos F1, verifica y commitea.
# Ejecutar desde la raíz del repo valere-v2 en PowerShell.
# ─────────────────────────────────────────────────────────────────────
$ErrorActionPreference = "Stop"
$ANALISIS = "$env:USERPROFILE\.claude\analisis_plataformas_telemedida\f1_sips"

# 1. Reparar índice y traer origin
if (Test-Path .git/index) { Remove-Item .git/index -Force }
git fetch origin
git checkout -B claude/f1-sips-cups origin/main

# 2. Reaplicar los archivos F1 desde el backup de Cowork
New-Item -ItemType Directory -Force -Path "supabase/functions/resolver-sips-cups" | Out-Null
New-Item -ItemType Directory -Force -Path "src/features/sips" | Out-Null
Copy-Item "$ANALISIS\resolver-sips-cups__index.ts"        "supabase/functions/resolver-sips-cups/index.ts" -Force
Copy-Item "$ANALISIS\features_sips__api.ts"               "src/features/sips/api.ts" -Force
Copy-Item "$ANALISIS\features_sips__BuscadorCupsPage.tsx" "src/features/sips/BuscadorCupsPage.tsx" -Force

Write-Host "ATENCION: vuelve a anadir manualmente la ruta /buscador-cups en src/App.tsx"
Write-Host "y el item de menu 'Buscador CUPS' en src/components/layout/Sidebar.tsx"
Write-Host "(ver F1_ENTREGA_SIPS_LEEME.md). Luego:"
Write-Host ""
Write-Host "  npx tsc --noEmit       # debe dar 0"
Write-Host "  npm test -- --run      # 39/39"
Write-Host "  npx supabase functions deploy resolver-sips-cups --project-ref gtphkowfcuiqbvfkwjxb"
Write-Host "  git add supabase/functions/resolver-sips-cups src/features/sips src/App.tsx src/components/layout/Sidebar.tsx"
Write-Host "  git commit -m 'feat(f1): capa SIPS/Datadis por CUPS - resolver-sips-cups + Buscador de CUPS'"
Write-Host "  git push origin claude/f1-sips-cups   # abrir PR a main"
