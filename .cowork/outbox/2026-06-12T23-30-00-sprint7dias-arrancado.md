# Sprint 7 días arrancado — handoff para la siguiente sesión

**Plan que manda:** `docs/PLAN_SPRINT_7DIAS_2026-06-12.md` (aprobado por Juan 12/06).

## Hecho hoy (12/06 tarde/noche)
- Auditoría global multi-LLM + plan 7 días aprobado.
- Backfill Visalia REAL ejecutado: 43 tarifas en `tariff_staging` (pendiente_revision).
- Pipeline reparado: EF `tariffs-ingest-email` v4 (gemini-2.5-flash), 2 migrations en `tariff_extractions` (aplicadas en prod + registradas en repo).

## Decisiones Juan
- Tabla canónica: **`propuestas`** (migrar las 3 features que usan `proposals`, luego drop — Fase 2 PPTX escribirá en `propuestas`).
- NO borrar `_migration_*` ni `*_backup_20260511`.
- Backfill: hecho. Alcance sprint: completo, por orden.

## Siguiente acción (Día 1, en orden)
1. Juan ejecuta `C:\Users\joliv\.claude\COMMIT_DIA1_SPRINT_2026-06-12.ps1` (Fase 1 + fix EF + plan) → PR → merge → verificar deploy Cloudflare en navegador (incl. re-test alta incidencias C3).
2. Cowork: unificación `proposals`→`propuestas` (AnalisisPage + 2 features más escriben en proposals — inventariar con grep antes), `.gitattributes` (`* text=auto eol=lf`), borrar `features/chat-ia` y `src/core/types/database_canonical_2026-04-26.ts` + `src/types/database.ts` (mover 205 tipos a core), CLAUDE.md al día (141 tests, Gemini ya en Edge, puerto 3000 OK).
3. Después: Día 2-3 Fase 2 PPTX según plan.

## Avisos
- OJO al commitear: working tree tiene ~21.9k líneas de churn CRLF en 60 archivos — usar `git add` selectivo SIEMPRE (el PS1 ya lo hace).
- `crm_help_embeddings` = 0 filas: el RAG nunca se pobló (Día 4-5).
- Telemedida: Telegest, Linkener, CGNET (confirmado doc ChatGPT 12/06).
