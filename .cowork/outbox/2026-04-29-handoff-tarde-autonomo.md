# Handoff 2026-04-29 (tarde Cowork autónomo) → siguiente sesión

## Estado al cierre

Cowork ejecutó autónomamente sobre el CRM (`gtphkowfcuiqbvfkwjxb`):
- Sprint seguridad en proyecto potencias (`alesfvxqtwlrwlmkoosg`): 3 → 1 advisor.
- Unificación etapas oportunidades: cero filas legacy en BD.
- Tipos TS del CRM regenerados (5012 líneas).
- Hallazgo crítico documentado en `docs/ARQUITECTURA_PROYECTOS.md` §1: el CRM tiene 56 tablas, no 22. Hay 5 módulos no documentados (Potencias integrado, FV, Holded, RAG, Audit log).

Ver detalle completo: `docs/SESIONES/2026-04-29-cowork-autonomo-tarde.md`.

## Prioridades para la próxima sesión

### 🔴 Urgente
1. **Decidir el destino del proyecto Supabase `alesfvxqtwlrwlmkoosg`** (valere-gestion-potencias). La migración aditiva al CRM del 25 abril ya copió los 41 expedientes, 30 clients, etc. Mantener vivo o archivar.
2. **Regenerar RESEND_API_KEY del proyecto potencias** — la actual quedó expuesta en chat hoy (versión anterior de la sesión).

### 🟡 Importante
3. Commitear los cambios de Cowork al CRM (rama `claude/audit-real-state-2026-04-29`):
   - `src/core/types/database.ts` regenerado
   - `docs/ARQUITECTURA_PROYECTOS.md` actualizado
   - `docs/SESIONES/2026-04-29-cowork-autonomo-tarde.md` nuevo
4. Actualizar `CLAUDE.md` raíz con los módulos reales (FV, Holded, RAG, Potencias integrado).
5. Limpiar cast `(supabase as any)` en `src/features/seguimiento-fv/api.ts` (ya no necesario, tipos disponibles).

### 🟢 No urgente
6. Aplicar `supabase/migrations/_draft_rls_hardening_8_tables.sql` o descartarlo.
7. Verificar si `src/core/types/database_canonical_2026-04-26.ts` se sigue usando o se puede eliminar.

## Cosas que NO hacer
- NO subir `musing-kalam` a GitHub otra vez — ya se hizo en la mañana del 29 (PR #1 mergeado, auto-deploy activo).
- NO archivar `valere-gestion-potencias` en Vercel sin antes decidir su destino (punto 1).
- NO push directo a main.
