# Outbox 2026-06-15 — FV credenciales Fase 1 desplegada

Para la próxima sesión:

## Hecho y EN PRODUCCIÓN
- Bug guardado credenciales FV RESUELTO. PR #17 mergeado (684d7d1).
- Migración `20260615_fv_credenciales_fix_constraint.sql` APLICADA en Supabase (constraint UNIQUE eliminada, region_url normalizada, índice nuevo).
- EF `fv-create-credential` DESPLEGADA v6 ACTIVE (normaliza region_url, dup→409, error real).
- Verificado en BD: constraint fuera, índice dentro, region_url EU5 en ambas credenciales.

## Pendiente
- **Fase 3 — FusionSolar/cookies**: el sync sigue caído (login headless EU5, WAF). Ver `docs/PLAN_FIX_FV_CREDENCIALES.md` §4 Fase 3. Es el siguiente trabajo del módulo FV.
- **Fase 2 — UX**: validación duplicado en cliente.

## Atención git
- El repo local volvió a la rama fantasma `claud` + `.git/index.lock` huérfano. Limpiar con el PS1 de cierre antes de seguir. El sandbox de Cowork no puede escribir en .git.
