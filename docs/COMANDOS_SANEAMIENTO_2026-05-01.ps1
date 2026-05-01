# =====================================================================
# VALERE — Saneamiento + commit Sprint A + regenerar tipos
# Generado por Cowork 1 mayo 2026
#
# INSTRUCCIONES DE USO
#   1. Abre PowerShell.
#   2. Pega cada BLOQUE por separado.
#   3. Lee el output antes de pasar al siguiente.
#   4. Si algo da error, NO sigas — pega el error en Cowork.
#
# Tiempo estimado total: 3-4 horas (incluye TSC manual del sprint Potencias).
# =====================================================================


# ════════════════════════════════════════════════════════════════════
# BLOQUE 0 — Diagnóstico inicial (5 min)
# ════════════════════════════════════════════════════════════════════

cd C:\Users\joliv\valere-v2

# Ver dónde estamos
git branch --show-current
git status
git log --oneline -5

# Verificar archivos modificados / nuevos del Sprint A
git status --short | Measure-Object -Line


# ════════════════════════════════════════════════════════════════════
# BLOQUE 1 — Instalar dependencias nuevas (Sentry) (3 min)
# ════════════════════════════════════════════════════════════════════

npm install
# Espera a que termine. Verás "@sentry/react@10.x.x" entre las nuevas dependencias.


# ════════════════════════════════════════════════════════════════════
# BLOQUE 2 — Ver el estado real del TSC (2 min)
# ════════════════════════════════════════════════════════════════════

# Captura todos los errores TSC a un archivo
npx tsc --noEmit *> tsc-errors-actuales.txt

# Cuántos errores hay
$errorCount = (Get-Content tsc-errors-actuales.txt | Select-String "error TS").Count
Write-Host "Errores TSC: $errorCount"

# Ver los primeros 50
Get-Content tsc-errors-actuales.txt | Select-Object -First 50

# Si $errorCount es 0  → BLOQUE 4 (saltar BLOQUE 3)
# Si $errorCount es ~60 → BLOQUE 3 (cerrar manualmente con Code)


# ════════════════════════════════════════════════════════════════════
# BLOQUE 3 — Cerrar TSC manualmente (~2.5 horas)
# ════════════════════════════════════════════════════════════════════
#
# Este bloque NO es automático. Sigue estas opciones:
#
# OPCIÓN A — Delegar a Claude Code CLI:
#
#     claude "Lee docs/SPRINT3_TSC_PENDIENTE.md y aplica las Fases A-E para llevar TSC a 0 errores. No hagas commit, solo deja el código corregido en working tree."
#
# OPCIÓN B — Manual con plan:
#
#     code docs/SPRINT3_TSC_PENDIENTE.md
#     # Sigue Fases A → B → C → D → E del documento.
#
# Verificar progresivamente:
#     npx tsc --noEmit | Measure-Object -Line
#
# Cuando llegues a 0 errores, ir al BLOQUE 4.


# ════════════════════════════════════════════════════════════════════
# BLOQUE 4 — Verificación post-TSC (10 min)
# ════════════════════════════════════════════════════════════════════

# 4.1 TSC final — debe ser 0 errores
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ TSC SIGUE ROTO — volver al BLOQUE 3" -ForegroundColor Red
    return
}
Write-Host "✓ TSC verde" -ForegroundColor Green

# 4.2 Tests — deben pasar todos
npm test -- --run *> tests-output.txt
Get-Content tests-output.txt | Select-Object -Last 20

# 4.3 Build — debe terminar sin errores
npm run build *> build-output.txt
Get-Content build-output.txt | Select-Object -Last 20


# ════════════════════════════════════════════════════════════════════
# BLOQUE 5 — Sanity check manual en navegador (15 min)
# ════════════════════════════════════════════════════════════════════
#
# Antes de commitear, validar visualmente las features del Sprint A.
# Sigue el checklist completo en docs/CHECKLIST_QA_SPRINT_A_2026-05-01.md
#
# Resumen rápido:

npm run dev
#
# Abre http://localhost:3000 en el navegador y valida:
#
#   1. Login funciona (sin errores en consola).
#   2. /oportunidades → Kanban muestra valor_estimado_eur y ahorro_anual_estimado.
#   3. /empresas → click "Nueva empresa" → wizard 2 pasos (empresa → contacto decisor).
#   4. /datadis → cada fila tiene botón "Asociar" con icono Link2.
#   5. DevTools → Network → NO peticiones a sentry.io (sin DSN configurado).
#
# Cuando termines, Ctrl+C para parar el dev server.


# ════════════════════════════════════════════════════════════════════
# BLOQUE 6 — Crear rama y commit Sprint A (10 min)
# ════════════════════════════════════════════════════════════════════

# 6.1 Crear rama nueva (no commitear directamente sobre claude/sprint2-lib-potencias)
git checkout -b claude/sprint-a-cowork

# 6.2 Añadir TODOS los archivos del Sprint A
git add `
  supabase/migrations/20260501_fase30_1_daily_contract_check_pgcron.sql `
  supabase/migrations/20260501_fase30_3_cerrar_etapas_legacy.sql `
  supabase/migrations/20260501_fase30_8_incidencias_cups_id_fk.sql `
  supabase/migrations/20260501_mvp_captacion_multi_rol_schema.sql `
  supabase/migrations/20260501_mvp_captacion_fixes_post_audit_chatgpt.sql `
  src/main.tsx `
  src/core/hooks/useAuth.ts `
  src/core/utils/logger.ts `
  src/core/utils/sentry.ts `
  src/core/types/entities.ts `
  src/features/oportunidades/components/KanbanCard.tsx `
  src/features/oportunidades/components/KanbanColumn.tsx `
  src/features/oportunidades/components/OportunidadForm.tsx `
  src/features/empresas/EmpresasPage.tsx `
  src/features/datadis/api.ts `
  src/features/datadis/DatadisPage.tsx `
  src/features/datadis/components/AsociarEmpresaDialog.tsx `
  package.json `
  package-lock.json `
  .env.example `
  docs/AUDIT_2026-05-01_MEJORAS_CRM.md `
  docs/AUDIT_2026-05-01_PROFESIONAL_SECTOR.md `
  docs/COMPARATIVA_COWORK_VS_CHATGPT_2026-05-01.md `
  docs/PLAN_CAROLINA_ENGINE_2026-05-01.md `
  docs/PLAN_CAPTACION_PROFESIONAL_2026-05-01.md `
  docs/PLAN_DEPURACION_2026-05-01.md `
  docs/RELEASE_1_CAPTACION_2026-05-01.md `
  docs/REENFOQUE_USO_REAL_2026-05-01.md `
  docs/FLUJO_REAL_CAPTACION_VALERE_2026-05-01.md `
  docs/SCHEMA_MVP_CAPTACION_FINAL_2026-05-01.md `
  docs/CHECKLIST_QA_SPRINT_A_2026-05-01.md `
  docs/INDICE_2026-05-01.md `
  docs/INDEX_PROYECTO_VALERE.md `
  docs/ESTADO_TECNICO_ACTUAL.md `
  docs/ROADMAP_VIGENTE.md `
  docs/DEUDA_TECNICA_PRIORIZADA.md `
  docs/HANDOFF_CHATGPT_AUDITOR_VALERE_2026-05-01.md `
  docs/CONFIG_AGENTE_AUDITOR_CHATGPT_2026-05-01.md `
  docs/PROMPT_CHATGPT_SECOND_OPINION_2026-05-01.md `
  docs/COMANDOS_SANEAMIENTO_2026-05-01.ps1 `
  docs/ROADMAP_FUSION.md `
  docs/ESTADO.md `
  docs/SESIONES/2026-05-01-resumen.md `
  docs/SESIONES/2026-05-01-tarde-sprint-a-autonomo.md `
  .cowork/outbox/2026-05-01-audit-mejoras-crm-handoff.md `
  .cowork/outbox/2026-05-01-sprint-a-autonomo-aplicado.md

# OPCIONAL: añadir el ZIP del paquete auditor (1.5 MB).
# Recomendación: NO commitear (es un artefacto puntual, no fuente).
# Si lo quieres en repo, descomenta:
# git add valere-crm-audit-pack-2026-05-01.zip

# 6.3 Verificar qué se va a commitear
git status

# 6.4 Commit con mensaje descriptivo
git commit -m "feat(fase30+mvp-captacion): sprint A autonomo + schema multi-rol + auditorias

BD prod (vias MCP):
- run_daily_contract_check() + cron 04:00 UTC (FASE 30.1)
- Etapas legacy migradas (FASE 30.3)
- incidencias.cups_id uuid FK (FASE 30.8)
- Schema MVP captacion multi-rol: oportunidades.responsable_actual_id,
  oportunidad_handoffs, oportunidad_emails, v_mis_oportunidades,
  user_profiles.funciones
- Fixes post-audit ChatGPT: FK to_user_id RESTRICT, security_invoker,
  motivo_perdida_enum

Frontend:
- Kanban muestra importes (FASE 30.4)
- Wizard contacto decisor en alta empresa (FASE 30.5)
- Asociar Datadis-Empresa modal (FASE 30.6)
- Sentry SDK lazy con DSN opcional (FASE 30.10)

Docs:
- Audits tecnico + profesional sector + comparativas ChatGPT (3 rondas)
- Plan ejecutable Release 1 captacion
- Reenfoque pre-producto + flujo real multi-rol descubierto
- Schema MVP final + paquete handoff auditor + script saneamiento
"

# 6.5 Push
git push -u origin claude/sprint-a-cowork

# 6.6 Verificar
git log --oneline -3
git rev-parse HEAD


# ════════════════════════════════════════════════════════════════════
# BLOQUE 7 — Regenerar tipos Supabase (10 min)
# ════════════════════════════════════════════════════════════════════

# 7.1 Verificar Supabase CLI instalado
supabase --version
# Si NO aparece versión: npm install -g supabase
# (después: cerrar y reabrir PowerShell)

# 7.2 Login (solo primera vez de la máquina)
supabase login
# Sigue las instrucciones del navegador. Genera token y pégalo.

# 7.3 Regenerar tipos del proyecto
supabase gen types typescript --project-id gtphkowfcuiqbvfkwjxb > src/core/types/database.ts

# 7.4 Verificar que aparecen los tipos nuevos del schema MVP captación
Write-Host "`n--- Tablas nuevas detectadas en database.ts: ---"
Select-String -Path src/core/types/database.ts -Pattern "oportunidad_handoffs|oportunidad_emails|v_mis_oportunidades|motivo_perdida_enum|funciones" | Select-Object -First 10

# 7.5 TSC tras regenerar — debe seguir verde
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ TSC ROTO tras regenerar tipos. Revisar." -ForegroundColor Red
    return
}
Write-Host "✓ TSC verde tras regenerar tipos" -ForegroundColor Green

# 7.6 Commit los tipos regenerados
git add src/core/types/database.ts
git commit -m "chore: regenerar tipos Supabase tras schema MVP captacion multi-rol"
git push


# ════════════════════════════════════════════════════════════════════
# BLOQUE 8 — REPORTE FINAL para Cowork
# ════════════════════════════════════════════════════════════════════
#
# Pega TODO el output de este bloque en Cowork para confirmar repo verde.

Write-Host "`n═══════════════ REPORTE FINAL VALERE ═══════════════`n"

Write-Host "── 1. TSC ────────────────────────────────────────────"
$tscOut = npx tsc --noEmit 2>&1
$tscErrors = ($tscOut | Select-String "error TS").Count
Write-Host "Errores TSC: $tscErrors"
if ($tscErrors -gt 0) { Write-Host $tscOut } else { Write-Host "✓ 0 errores" }

Write-Host "`n── 2. TESTS ──────────────────────────────────────────"
npm test -- --run 2>&1 | Select-Object -Last 15

Write-Host "`n── 3. BUILD ──────────────────────────────────────────"
npm run build 2>&1 | Select-Object -Last 10

Write-Host "`n── 4. GIT STATUS ─────────────────────────────────────"
git status

Write-Host "`n── 5. GIT LOG (últimos 5 commits) ────────────────────"
git log --oneline -5

Write-Host "`n── 6. COMMIT HASH ACTUAL ─────────────────────────────"
git rev-parse HEAD

Write-Host "`n── 7. RAMA ACTUAL ─────────────────────────────────────"
git branch --show-current

Write-Host "`n── 8. ARCHIVOS DEL ÚLTIMO COMMIT ──────────────────────"
git diff-tree --no-commit-id --name-only -r HEAD | Select-Object -First 30

Write-Host "`n═══════════════════════════════════════════════════════"
Write-Host "Pega lo anterior en Cowork. Si hay errores, NO sigas con UI."
Write-Host "Si todo verde, próximo paso: crear users + sembrar + UI MVP"
Write-Host "═══════════════════════════════════════════════════════"


# ════════════════════════════════════════════════════════════════════
# OPCIONAL — Limpieza (después de confirmar repo verde)
# ════════════════════════════════════════════════════════════════════

# Borrar archivos temporales de outputs
# Remove-Item tsc-errors-actuales.txt, tests-output.txt, build-output.txt -ErrorAction SilentlyContinue

# Hacer PR de claude/sprint-a-cowork → main (manual desde GitHub UI)
# https://github.com/jolivares-valere/valere-v2/compare/main...claude/sprint-a-cowork
