# Sprint paralelo A — Backend / Supabase / Migraciones

> **Fecha**: 2026-04-25 noche.
> **Owner**: Cowork.
> **Lane**: backend (no toca `src/` ni docs fuera de `docs/PLAN_*` o `docs/SUPABASE_*`).
> **Estado**: completado sin bloqueos. Sin commits, sin pg_dump, sin escrituras a `.git`.

---

## Lo que entrega

5 documentos nuevos en `docs/`, todos verificados contra prod (`gtphkowfcuiqbvfkwjxb`) vía MCP Supabase con dry-runs `BEGIN…ROLLBACK`:

| Documento | Qué hay dentro |
|---|---|
| `docs/SUPABASE_FASE4_DRY_RUN_2026-04-25.md` | Diseño detallado de las 10 vistas de compatibilidad para apps satélite. Identifica 3 desviaciones del plan original (`empresas` no tiene `nombre_fiscal`/`cif`/etc., `cups` no tiene `notas`/`created_by`, `user_profiles` no tiene `activo`). SQL final ya verificado. |
| `docs/SUPABASE_FASE5_DRY_RUN_2026-04-25.md` | Drop sequence completo (compat views CRM + satélite + tabla `proposals`). 0 dependencias terceras detectadas. SQL idempotente listo para `_draft_fase5_drop_legacy.sql`. Pre-condiciones explícitas. |
| `docs/SUPABASE_RLS_HARDENING_VALIDACION_2026-04-25.md` | 15 tests funcionales del draft RLS — **15 pass**. Detecta una observación crítica de configuración: el rol de los comerciales reales tras Fase 2 importa para que el hardening funcione. Versión v2 propuesta con `(select auth.uid())` para cerrar también 4 advisors `auth_rls_initplan`. |
| `docs/SUPABASE_AUDITORIA_ADVISORS_2026-04-25.md` | Inventario completo: 9 security WARN + 144 performance lints. Tres migrations propuestas que reducen total de 153 → 86 advisors (44 % menos, todos INFO). Plan en 2 etapas para índices: post-Fase-2 (~11 índices), luego post-tráfico real. |
| `docs/SUPABASE_BUCKET_STORAGE_POTENCIAS_2026-04-25.md` | 100 objetos físicos (~15 MB) viven en bucket Potencias y serán huérfanos tras Fase 5.C. 3 opciones evaluadas, **Opción A (copia 1:1)** recomendada. Script TypeScript esquemático + verificación SQL. Desbloquea Fase 5.C. |

## Hallazgos clave

1. **El plan Fase 4 tiene 3 errores de columnas** (`empresas.nombre_fiscal` no existe, etc.). Las 10 vistas compiladas en este sprint ya están corregidas.
2. **El RLS hardening draft funciona** — 15 tests con master/client confirman 0 fugas. Pero requiere decisión Juan sobre rol nominal de comerciales (`manager` vs `comercial`) antes de aplicar. Si entran como `client`, perderán INSERT en `alertas`/`comercializadora_docs`/`excel_import_templates`.
3. **23 policies usan `auth.uid()` directo** → re-eval por fila, fix trivial: envolver en `(select auth.uid())`. Recomiendo aplicarlo en bloque junto al hardening.
4. **35 advisors `multiple_permissive_policies`** son policies duplicadas heredadas de migraciones tempranas. Migration de saneamiento propuesta (`_draft_dedupe_permissive_policies.sql`) los lleva a 0 sin cambios semánticos.
5. **Storage Potencias**: solo 100 objetos / 15 MB. Copia 1:1 al CRM en 1-2 h (vía SDK Supabase con dos clientes service-role). Desbloquea pausar/borrar Potencias. Cero motivo para CDN/proxy/dual-read.

## Decisiones para Juan

- [ ] **Rol nominal de comerciales** tras Fase 2: `manager`, `comercial` o `client`. Decide antes del hardening RLS.
- [ ] **Activar `leaked_password_protection`** en Supabase Dashboard → Authentication (1 click, free tier).
- [ ] **Aprobar Opción A para storage**: copia 1:1 los 100 objetos de Potencias→CRM tras Fase 2.
- [ ] **Aprobar las migrations draft** (no aplicadas):
  - `_draft_fase4_compat_views_apps_satelite.sql` (cuando empiece Fase 4)
  - `_draft_rls_hardening_8_tables_v2.sql` (post-Fase-2 + decisión rol)
  - `_draft_dedupe_permissive_policies.sql` (sprint de saneamiento)
  - `_draft_initplan_optimization_remaining.sql` (mismo sprint)
  - `_draft_indexes_post_fase2.sql` (semana después de Fase 2 si hay queries lentas)
  - `_draft_fase5_drop_legacy.sql` (1 semana post-Fase-4 estable)

## Cómo aplicar (prompt para próxima sesión Cowork o Code)

```
Lee `docs/SUPABASE_FASE4_DRY_RUN_2026-04-25.md`,
`docs/SUPABASE_FASE5_DRY_RUN_2026-04-25.md`,
`docs/SUPABASE_RLS_HARDENING_VALIDACION_2026-04-25.md`,
`docs/SUPABASE_AUDITORIA_ADVISORS_2026-04-25.md`,
`docs/SUPABASE_BUCKET_STORAGE_POTENCIAS_2026-04-25.md`.

Genera los archivos `_draft_*.sql` correspondientes en `supabase/migrations/`
con el contenido SQL de cada documento. Sin aplicar nada — Juan revisa y
aplica con `mcp__apply_migration` cuando esté listo.
```

## Lo que NO se hizo (intencional)

- ❌ No se modificó `src/` ni `docs/ESTADO.md` ni `docs/SESIONES/` (lane backend puro, según restricciones del sprint paralelo).
- ❌ No se aplicó nada en prod — solo dry-runs `BEGIN…ROLLBACK`.
- ❌ No se hicieron commits ni `pg_dump`.
- ❌ No se generaron los `_draft_*.sql` en `supabase/migrations/` (eso queda para la sesión de aplicación, donde Juan da el OK).

## Métricas del sprint

| Cosa | Número |
|---|---|
| Documentos nuevos | 5 |
| Líneas SQL validadas | ~600 |
| Dry-runs ejecutados contra prod | 4 (views Fase 4, drops Fase 5, RLS hardening, dedupe policies) |
| Tests RLS hardening | 15 (15 pass) |
| Advisors auditados | 153 (9 security + 144 performance) |
| Objetos storage analizados | 100 (15 MB) |
| Tiempo estimado para aplicar todas las migrations propuestas | ~2-3 h dispersas en 2 sprints |
