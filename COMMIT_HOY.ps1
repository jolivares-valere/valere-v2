Set-Location "C:\Users\joliv\valere-v2"
$lock = ".git\index.lock"
if (Test-Path $lock) { Remove-Item $lock -Force; Write-Host "Removed lock" -ForegroundColor Yellow }

# Eliminar scripts de commit anteriores ya ejecutados
foreach ($s in @("COMMIT_POTENCIAS.ps1","COMMIT_SIDEBAR.ps1","COMMIT_NORMATIVA.ps1")) {
  if (Test-Path $s) { Remove-Item $s -Force; Write-Host "Removed $s" -ForegroundColor Gray }
}

git add src/core/types/database.ts
git add src/features/empresas/EmpresaDetailPage.tsx
git add docs/ESTADO.md
git add docs/SESIONES/2026-04-29-resumen.md
git add .cowork/outbox/2026-04-29T00-00-00-integracion-potencias-completa.md

git diff --cached --stat

git commit -m "feat(fase20.1+21c): tipos Supabase reales + timeline actividades en empresa

- database.ts: 4549 lineas de tipos reales generados desde Supabase (sustituye Database=any)
- EmpresaDetailPage: RecentActivityCard sidebar con ultimas 5 actividades de la empresa
  iconos por tipo (llamada/email/reunion/tarea), badge estado, link 'ver todas'
- FASE 20.9 RLS hardening: verificado activo en prod (ya aplicado sesion anterior)
- FASE 20.8 Gemini: verificado server-side (chat-consultor + ask-crm-docs Edge Functions)
- FASE 21.a/b/c: verificadas ya implementadas (pipeline kanban, alertas vencimiento, timeline)"

git push origin main
Write-Host "`nDone!" -ForegroundColor Green
