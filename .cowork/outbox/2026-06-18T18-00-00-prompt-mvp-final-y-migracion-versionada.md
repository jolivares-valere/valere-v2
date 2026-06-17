# FV MVP -- prompt v2 final + migracion versionada (2026-06-18b)

## Hecho
- Prompt MVP v2 FINAL para Desktop: docs/PROMPT_MVP_FV_para_Desktop.md (commit d9401af).
  Anclado a esquema real, 4 correcciones verificadas (badges reales, frescura <6h/6-24h/>24h,
  mapeo alarma->incidencia con enums reales, regla incidencias FV vs comerciales).
- HALLAZGO: tipo_incidencia sin valor FV; incidencias sin origen ni FK a alarmas.
  -> tipo='otro', empty state + proponer migracion origen='fv'/fv_alarma_id.
- Versionada migracion fv_planta_nota: supabase/migrations/20260618_fv_mvp_notas_rls.sql.

## IMPORTANTE
fv_planta_nota YA en prod (no reaplicar). El .sql solo versiona.

## Pendiente proxima sesion
- Mergear PR (claude/fv-mvp-prompt-y-migracion). Lanzar prompt en Desktop (fase 1). energy-balance 500 en paralelo.
