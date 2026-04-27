# Handoff — sprint domingo lane W (housekeeping)

**Fecha:** 2026-04-26 (sprint paralelo, lanes disjuntas)
**Lane:** W — repo housekeeping
**Agente:** Cowork autónomo
**Status:** ✅ COMPLETADO sin bloqueos

## Trabajo realizado

### 1. Drift fix — 3 migrations importadas al repo

Se han creado los 3 archivos `.sql` en `supabase/migrations/` con el patrón canónico `YYYYMMDDHHMMSS_<name>.sql` que Supabase CLI requiere. SQL extraído de `supabase_migrations.schema_migrations.statements` vía MCP (byte-equivalente a lo aplicado en prod):

- `supabase/migrations/20260425175055_fase1b_legacy_compat_views.sql` (3 379 B)
- `supabase/migrations/20260425182732_fase1c_compat_views_security_invoker.sql` (664 B)
- `supabase/migrations/20260425185929_fix_normalizar_nombre_retailer_search_path.sql` (93 B)

**Riesgo cubierto:** un futuro `supabase db reset` o redeploy desde repo ya NO regresará las vistas legacy de compat ni el endurecimiento `security_invoker` ni el `search_path` de `normalizar_nombre_retailer`.

### 2. RUNBOOK.ps1 — null-byte tail eliminado

Working copy estaba a 34 643 bytes (real content + cola de `0x00`). El blob commiteado en HEAD (`b9eaff3:RUNBOOK.ps1`) está limpio (1 292 bytes, MD5 `68200135946089eebdd3b40013c73a1a`).

Fix aplicado: `git show b9eaff3:RUNBOOK.ps1 → /tmp → cp sobre RUNBOOK.ps1`. Verificado:
- Tamaño post: 1 292 B ✓
- MD5 post: `68200135946089eebdd3b40013c73a1a` ✓ (idéntico al blob)
- Tail: termina en `\nexit 0\n`, sin `0x00` ✓
- `diff` vs blob: empty (sólo cambia el bit `+x` por copia desde Linux mount; benigno en NTFS)

### 3. Documentación

`docs/DRIFT_FIX_2026-04-26.md` — informe completo (síntoma, riesgo cubierto, procedimiento, verificación, drift adicional fuera de scope, próximos pasos).

## ⚠️ Drift adicional detectado (NO arreglado — fuera de scope)

Hay 8 migrations más en prod que no están en repo, pero pertenecen a otras lanes en curso. **Listadas para conocimiento del coordinador**:

- `20260423081311 fase28_7a_views_security_invoker` (drift histórico)
- `20260423081506 fase28_7b_rls_policies_tightening` (drift histórico)
- `20260423082705 fase28_7c_functions_search_path` (drift histórico)
- `20260425105833 match_crm_help_section_boost` (lane RAG)
- `20260425175417 fase2a_staging_schema` (lane unificación Fase 2)
- `20260426090650 drop_redundant_authenticated_select_policies_2026_04_26` (lane RLS)
- `20260426091815 convert_all_policies_to_granular_2026_04_26` (lane RLS)
- `20260426091911 initplan_optimization_remaining_2026_04_26` (lane RLS)

Las 3 últimas (2026-04-26) parecen ser la materialización de `_pending_rls_hardening_8_tables.sql` — verificar / consolidar al cerrar la lane RLS.

## ✅ Para Juan — commit pendiente (NO ejecutado por Cowork)

Política de sprint: lane W no commitea. Cuando cierres el sprint domingo:

```powershell
cd C:\Users\joliv\valere-v2

# (Opcional) normalizar bit ejecutable de RUNBOOK.ps1
git update-index --chmod=-x RUNBOOK.ps1

git add supabase/migrations/20260425175055_fase1b_legacy_compat_views.sql `
        supabase/migrations/20260425182732_fase1c_compat_views_security_invoker.sql `
        supabase/migrations/20260425185929_fix_normalizar_nombre_retailer_search_path.sql `
        RUNBOOK.ps1 `
        docs/DRIFT_FIX_2026-04-26.md `
        .cowork/outbox/2026-04-26T09-43-27-sprint-domingo-lane-W-housekeeping.md

git commit -m "chore(migrations): import drift fase1b/1c + fix retailer search_path + RUNBOOK.ps1 null-byte cleanup"
git push origin main
```

## Restricciones respetadas

- ✅ NO commits ejecutados.
- ✅ NO se han tocado `src/`, `docs/help/`, `scripts/unificacion_fase2_*`, `docs/SUPABASE_FASE2_*`.
- ✅ NO se han tocado migrations existentes (sólo se han añadido 3 nuevas).
- ✅ Sin input humano requerido durante la ejecución.

## Recomendación de mejora (nice-to-have)

Añadir un workflow GitHub Actions que ejecute `supabase migration list` (o consulta MCP equivalente) y compare con `ls supabase/migrations/`. Falla si hay drift. Evita repetir este housekeeping manual.
