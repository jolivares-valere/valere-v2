# Handoff sprint domingo lane 3 (docs/proceso) → próxima sesión

**Fecha**: 2026-04-26 (domingo mañana)
**Lane**: 3 — Documentación, planificación y mejora de proceso
**Restricciones cumplidas**: NO commits, NO toques `src/`, NO toques `supabase/migrations/`, NO toques áreas de los lanes 1-2-4.

---

## Resumen ejecutivo

Sprint dedicado a documentación + auditoría sin tocar código ni schema. 4 entregables nuevos en `docs/` y 1 actualización de playbook. Sin bloqueos. Listos para cuando se cierren Fases 4 y 5 (otros lanes / Juan).

---

## Entregables

### 1. `docs/PLAN_UNIFICACION_FASE_6_2026-04-26.md`

Continuación de Fases 1-5. Cubre el cutover real + decommissioning gradual de proyectos satélite. 8 subfases (6.A pre-cutover/comunicación, 6.B cutover, 6.C vigilancia 72h, 6.D decommissioning, 6.E storage, 6.F limpieza+tag+post-mortem, 6.G rollback express, plus checklist final). Mismo nivel de detalle que las anteriores: SQL preparado, dry-run, rollback express por tipo de fallo, riesgos con probabilidad/impacto/mitigación, estimación.

Decisiones documentadas:
- Cutover en ventana viernes-tarde / sábado-mañana.
- Backup definitivo Potencias **antes** de pausar, política ≥7 años en cold storage externo.
- Borrado proyecto Potencias solo tras 2 semanas pausa + 0 referencias en logs + storage resuelto.
- Tag `v2.0.0-unificacion-completa` al cerrar.
- Storage Opción A recomendada (script de copia bucket Potencias→CRM, 1-2h).

### 2. `docs/CHECKLIST_RELEASE_CUTOVER.md`

Documento operativo imprimible para Juan el día del cutover. 9 secciones:
1. Preparación T-24h.
2. Go/no-go criteria T-1h (counts, integridad FK, build+tests, RAG, apps satélite, equipo). 7 sub-checklists con SQL específico ejecutable.
3. Cutover T=0 (DNS, switch, marcador en logs).
4. Smoke post-cutover (5 tests con un comercial real, no Juan).
5. Vigilancia 72h con thresholds y plantilla de incidencia.
6. Rollback express en 7 variantes según qué se rompa (DNS, Cloudflare Pages, Edge Function, datos, RLS, apps satélite, total).
7. Plantillas de comunicación al equipo (pre, durante, post, rollback).
8. Post-cutover housekeeping a 4 semanas.
9. Checklist final del día.

### 3. `.cowork/AGENT_PLAYBOOK.md` actualizado

Añadida sección §8.bis "PowerShell 5.1 — el lenguaje real de los scripts entregados a Juan" con TODAS las lecciones de la noche del 25-26:
- Validar contra PS 5.1 (`Invoke-ScriptAnalyzer ... TargetVersions=@('5.1')`), no contra pwsh 7.
- Patrón `Funcion (expr)` con espacio → usar `"$()"` o variable preconstruida.
- `[DRY-RUN]` literal al inicio interpretado como `[type]` → usar paréntesis o `:`.
- `??` y `??=` solo en pwsh 7 → `if ([string]::IsNullOrWhiteSpace(...))`.
- `&&`/`||` solo en pwsh 7 → bloque `if ($LASTEXITCODE -eq 0)`.
- Inventario completo de locks de git huérfanos: además de `index.lock`, `config.lock`, `HEAD.lock`, `ORIG_HEAD.lock`, también `FETCH_HEAD.lock`, `packed-refs.lock`, y todos los `refs/heads/<rama>.lock` y `refs/remotes/<remote>/<rama>.lock`.
- Verificar `git remote -v` y `git branch --show-current` antes de generar scripts que los usen — NO asumir.
- Validación en 4-5 capas antes de entregar `.ps1`: parser puro, PSScriptAnalyzer compat 5.1, PSScriptAnalyzer severity Error, dry-run con flag, hash MD5/SHA256 que Juan puede verificar.
- Patrón fallback: acompañar `.ps1` con secuencia plana de comandos copy-paste.
- Encoding/BOM consideraciones para caracteres no-ASCII.

Plus en §9 (anti-patrones): "Asumir que existe remote `origin` o que la rama actual es la del PR", "Entregar `.ps1` sin validar contra PS 5.1", "`[PREFIJO]` literal al inicio".

Plus en §11 (Referencias rápidas): añadidas las 4 nuevas docs.

### 4. `docs/AUDIT_RLS_DEBIL_2026-04-26.md`

Auditoría RLS sondeada vía MCP (`pg_class` + `pg_policies`) sobre el proyecto CRM (`gtphkowfcuiqbvfkwjxb`). Hallazgos:

- **36 tablas en public, todas con RLS habilitado**. 0 tablas sin RLS.
- **8 tablas ya cubiertas** por `_draft_rls_hardening_8_tables.sql` (sprint 8).
- **3 tablas nuevas detectadas** que el draft no cubre y requieren hardening:
  - `documentos`: tiene policies granulares válidas (`doc_read`, `doc_write`) PERO también `documentos_all_authenticated` con `auth.role()='authenticated'` ALL — al ser PERMISSIVE los policies se OR-juntan, así que la weak ANULA las granulares. Fix: `DROP POLICY documentos_all_authenticated`.
  - `incidencias`: solo `incidencias_all_authenticated` ALL — requiere hardening completo (4 policies granulares con patrón usuario_creador + asignado_a + rol manager). SQL preparado en el doc, pendiente verificar columnas reales antes de aplicar.
  - `renovaciones`: idem `incidencias`. SQL preparado en el doc.
- **6 duplicados SELECT** redundantes (no inseguros pero ensucian auditoría): `comercializadoras`, `comercializadora_ofertas`, `precios_regulados_boe`, `facturas`, `global_config`, `proposals`. Cada uno tiene 2 policies con `qual=true`. Migration de limpieza incluida (6 `DROP POLICY`).
- **9 lecturas amplias intencionales** (catálogos, embeddings RAG, schema custom fields, perfil propio, etc.) que NO deben endurecerse pero sí registrarse en `docs/SEGURIDAD.md` para evitar que futuras auditorías las re-flaguee.

Recomendación: sprint dedicado de hardening RLS combinado en una sola migration (`_draft_rls_hardening_completo_2026-04-27.sql`) que cubra los 5 bloques (8 tablas Potencias + documentos + incidencias + renovaciones + limpieza duplicados). Aplicar tras Fase 2 datos completa para poder testear con roles reales.

---

## Cosas que NO hizo este sprint (y por qué)

- ❌ **Aplicar el hardening RLS** — restricciones del lane prohíben tocar `supabase/migrations/`. Solo audit. La migration combinada que se propone debe ser implementada por otro lane o en sprint dedicado.
- ❌ **Aplicar la limpieza de duplicados RLS** — idem.
- ❌ **Tocar código** — restricción del lane.
- ❌ **Hacer commits** — restricción del lane.
- ❌ **Probar la propuesta de Fase 6 contra producción** — es plan, no ejecución. El cutover real requiere coordinación con Juan + Fases 2/4/5 cerradas primero.
- ❌ **Crear plantilla de incidencias separada** (`docs/PLANTILLA_INCIDENCIA_CUTOVER.md`) — referenciada en CHECKLIST §5.C pero solo como sugerencia opcional, no entregable obligatorio del lane.

---

## Bloqueos / decisiones requeridas Juan

Ninguno desde este lane. Los bloqueos heredados (Fase 2 datos, storage Opción A/B, apps satélite Opción A/B) ya están documentados en planes existentes y la Fase 6 los toma como inputs.

---

## Comandos para verificar el trabajo (sin commits)

```powershell
# Confirmar los 4 entregables existen:
ls docs\PLAN_UNIFICACION_FASE_6_2026-04-26.md
ls docs\CHECKLIST_RELEASE_CUTOVER.md
ls docs\AUDIT_RLS_DEBIL_2026-04-26.md
ls .cowork\AGENT_PLAYBOOK.md   # actualizado

# Confirmar que NO se ha tocado nada de los lanes ajenos:
git status -- supabase/ src/ docs/SUPABASE_* docs/AUDITORIA_FE_* docs/PROD_APPLY_* docs/REFACTOR_TIPADO_* docs/CHANGELOG_* docs/AUDIT_COMMIT_*
# Esperado: nada modificado en esas rutas.

# Confirmar lo que sí se tocó:
git status -- docs/PLAN_UNIFICACION_FASE_6_*.md docs/CHECKLIST_RELEASE_CUTOVER.md docs/AUDIT_RLS_DEBIL_*.md .cowork/AGENT_PLAYBOOK.md docs/ESTADO.md .cowork/outbox/2026-04-26*sprint-domingo-lane-3-docs-proceso*.md
# Esperado: 5 archivos modificados / nuevos.
```

---

## Mensaje al retomar

"Sprint domingo lane 3 hecho. 4 entregables docs/proceso:
1. Plan Fase 6 unificación (cutover + decommissioning).
2. Checklist release/rollback cutover.
3. Auditoría RLS con 3 tablas extra fuera del draft 8-tables.
4. AGENT_PLAYBOOK actualizado con todas las lecciones PS 5.1 / git locks / asunciones remote.

Cuando se cierre Fase 5 y se aproxime cutover, leer `docs/CHECKLIST_RELEASE_CUTOVER.md` el día anterior. Cuando se decida hacer hardening RLS, leer `docs/AUDIT_RLS_DEBIL_2026-04-26.md` y combinar el draft 8-tables con los 3 hallazgos extra."

---

## Reglas aprendidas (para próxima iteración del playbook)

(Ya incorporadas a §8.bis y §9 del AGENT_PLAYBOOK.md, listadas aquí para tracking):

1. PS 5.1 ≠ pwsh 7 — validar siempre contra el target real (Windows de Juan).
2. `[CualquierCosa]` al inicio de string PS 5.1 = `[type]`. Usar `(...)` o `:`.
3. `Funcion (expr)` con espacio antes de paréntesis — preferir expansión `"$()"`.
4. Inventario locks git: `index.lock`, `config.lock`, `HEAD.lock`, `ORIG_HEAD.lock`, `FETCH_HEAD.lock`, `packed-refs.lock`, `refs/heads/<rama>.lock`, `refs/remotes/<remote>/<rama>.lock`.
5. Antes de scripts que usan `git remote`/`git branch`: detectar primero, NO asumir.
6. 5 capas de validación pre-entrega `.ps1`: parser + PSScriptAnalyzer compat 5.1 + severity Error + dry-run + hash MD5.
7. Acompañar siempre `.ps1` con la secuencia plana de comandos como fallback.
8. Auditoría RLS tiene que sondear pg_policies completo, no fiarse del inventario sprint-anterior — sprint domingo encontró 3 tablas adicionales fuera del listado de 8.

---

> Sprint domingo lane 3, cierre. NO commits ejecutados. Sandbox solo escribió a docs/ + .cowork/.
