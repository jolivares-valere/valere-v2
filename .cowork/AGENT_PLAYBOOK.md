# Agent Playbook — Sprints autónomos en Valere v2

> **Audiencia**: agentes Claude (Cowork, Code, Plan) que retoman un sprint autónomo en este repo sin contexto previo.
> **Objetivo**: condensar las convenciones, workarounds y patrones aprendidos en los ~10 sprints autónomos previos para que el siguiente arranque a velocidad y evite los errores ya cometidos.
> **Última actualización**: 2026-04-25 (sprint paralelo C).

---

## 1. Lo primero — lee esto, en este orden

```bash
cat CLAUDE.md
cat docs/ESTADO.md
ls .cowork/outbox/   # los handoffs son tu "qué estaba haciendo"
ls .cowork/inbox/    # mensajes de otros agentes para ti
git log --oneline -10
```

Después de leer, dile al usuario en 2-3 líneas dónde estamos. **No empieces a trabajar sin esto** — el repo cambia rápido entre sesiones y el contexto en `MEMORY.md` puede estar parcialmente obsoleto.

---

## 2. Restricciones del sandbox (esto NO funciona)

### `.git/` writes fallan con null bytes

El sandbox Cowork sobre el mount Windows (`C:\Users\joliv\valere-v2`) **no puede escribir consistentemente a `.git/`**. Síntomas:

- `git switch`, `git checkout` corrompen `config` (null bytes al final).
- `git commit` puede fallar a mitad dejando lock huérfano.
- `git rebase` deja el repo en estado intermedio difícil de salir.

**Patrón establecido**: Cowork prepara los cambios en archivos. Juan ejecuta los commits desde su PowerShell.

```
Sandbox Cowork (lee y escribe archivos)  →  PowerShell Juan (git ops + tests)
```

Esto es un hecho operativo, no un bug a resolver. Diseña los sprints asumiendo este reparto.

### `rm` en el mount Windows falla

`rm` y `Remove-Item` desde sandbox sobre archivos del mount Windows fallan con `Operation not permitted`. Tres workarounds:

- **Workaround 1: rename en lugar de delete**. Si necesitas "borrar" un archivo problemático (p.ej. un lock), `mv archivo archivo.bak`. Para git, los locks se llaman `.lock`; renombrar a `_lock.bak` saca al fichero del set que git busca.
- **Workaround 2: delegar a Juan**. El script PowerShell de cierre incluye `git rm` para los archivos a borrar. Juan los ejecuta tras el push.
- **Workaround 3: `git rm --cached`**. Funciona desde sandbox porque solo modifica el index, no toca el filesystem. Útil para dejar de trackear un archivo que sigue existiendo localmente.

### MCP no expone `delete_edge_function`

El MCP Supabase tiene `deploy_edge_function` y `get_edge_function` pero **no expone delete**. Si una Edge Function queda huérfana (caso `chat-consultor` en sprint 5), hay que borrarla manualmente desde el Dashboard. Documentar el delete pendiente en el handoff.

### `WebFetch` está restringido a allowlist

Si necesitas fetchear contenido externo y el dominio no está en la allowlist, **NO intentes con bash/curl/python** — está prohibido por las reglas del cliente. Reporta al usuario que la página no es accesible y ofrece alternativas (que el usuario pegue el contenido, etc.).

### Cross-project bridge MCP no escala

Para mover datos entre 2 proyectos Supabase desde el MCP (sin Pro plan, sin postgres_fdw), el patrón `row_to_json` + `jsonb_populate_recordset` funciona técnicamente pero **se queda sin contexto a partir de ~100 filas**. A 500 filas es token-prohibitivo.

**Patrón establecido**: para data migrations grandes, delega a Juan con `pg_dump --data-only` + `psql`. Cowork prepara los scripts SQL con dedupe + transform en una transacción única (`BEGIN…COMMIT`) y Juan ejecuta. Ver `scripts/unificacion_fase2_*` como referencia.

---

## 3. Cosas que SÍ funcionan bien

### MCP `apply_migration` para DDL

Atómico (transacción implícita), idempotente, queda en historial de migrations. Úsalo para todo DDL: renames, alters, creates de tabla/view/policy. Reemplaza la necesidad de branches Pro para validación inicial.

### `BEGIN…ROLLBACK` como dry-run

Para validar DDL antes de aplicar, ejecuta el SQL completo dentro de `BEGIN; … ROLLBACK;` vía MCP `execute_sql`. Permite verificar inline (`SELECT count(*)`, `\d+ tabla`) antes de comprometer. Sustituto válido de Supabase branches para cuentas free.

### MCP `execute_sql` para inspección/validación

NO queda en historial de migrations (a diferencia de `apply_migration`). Útil para `SELECT`, validaciones post-migración, debugging. Mezclar `apply_migration` para DDL + `execute_sql` para SELECT en el mismo sprint da auditoría limpia.

### Compat views como red de seguridad para renames

Cuando renombras una tabla o columna, crea una view con el nombre viejo apuntando a la nueva. El FE no migrado sigue funcionando. Patrón:

```sql
CREATE OR REPLACE VIEW public.<nombre_viejo> AS
SELECT col1, col2, col_renombrada AS col_vieja, ... FROM public.<nombre_nuevo>;

ALTER VIEW public.<nombre_viejo> SET (security_invoker = on);
-- ↑ obligatorio: por defecto Postgres crea con SECURITY DEFINER → ERROR del advisor
```

Para INSERT/UPDATE que renombran columnas, añadir trigger `INSTEAD OF INSERT` que mapea explícitamente. Para SELECT/UPDATE/DELETE simples, Postgres lo maneja con auto-updatable views (no necesitan trigger).

Drop las views tras 1-2 sprints estables y refactor FE completo.

### Prefijo `_draft_` en migrations no aplicadas

Si dejas un SQL preparado pero no quieres que se aplique automáticamente por orden alfabético/cronológico, prefíjalo con `_draft_`:

```
supabase/migrations/_draft_rls_hardening_8_tables.sql   ← no aplicado
supabase/migrations/20260427_rls_hardening_8_tables.sql ← aplicado tras rename
```

El order applier toma fechas `yyyymmdd_`. Cualquier prefijo no-fecha queda fuera.

### Postgres views auto-updatables

Simple views (single base table, no DISTINCT/GROUP/HAVING) permiten `UPDATE` y `DELETE` sin necesidad de `INSTEAD OF` triggers. **Solo `INSERT` necesita trigger explícito si hay column alias o transformaciones**. Esto simplifica el patrón de compat views drásticamente.

---

## 4. Patrón de handoff (cómo cerrar un sprint)

Todo handoff vive en `.cowork/outbox/YYYY-MM-DDTHH-MM-SS-<descripcion>.md` y sigue esta estructura:

```markdown
# Handoff <sprint> → próxima sesión

**Fecha:** ...
**Tema:** ...

## Resumen ejecutivo
(2-3 párrafos: qué se hizo, qué queda)

## Logros / Acciones
(detalle por categoría — DB, FE, docs, validación)

## Cosas que NO hizo este sprint (y por qué)
(transparencia: bloqueos, decisiones diferidas, scope cuts)

## Bloqueos / decisiones requeridas Juan
(lista accionable)

## Script PowerShell de cierre
(commits + git rm + push, ejecutable copy-paste)

## Mensaje al retomar
(1 párrafo para que próxima sesión Cowork copie en el chat al usuario)

## Reglas aprendidas
(añadir aquí descubrimientos para que el playbook se actualice)
```

Cuando termines un sprint:
1. Crea el handoff en `.cowork/outbox/`.
2. Actualiza `docs/ESTADO.md` con sección "Sesión <fecha> — Sprint X".
3. NO hagas commits desde sandbox. Deja el script PowerShell preparado en el handoff.
4. Si descubriste algo útil para futuros agentes, **añádelo a este playbook** en la sección 3 (cosas que funcionan) o 2 (cosas que no).

---

## 5. Convenciones de código y arquitectura

### Idioma
- **Identificadores de dominio**: español (`empresas`, `contratos`, `comercial_id`).
- **Primitivos técnicos**: inglés (`isLoading`, `onSubmit`, `useState`).
- **UI texto**: español (castellano).
- **Commits**: español, prefijo conventional commits (`feat:`, `fix:`, `chore:`, `docs:`).

### Estructura
- `src/features/<dominio>/` — page + api.ts + components/.
- `src/core/` — transversal: hooks, supabase client, types, utils, stores.
- `src/components/ui/` — shadcn/ui.
- **No tocar**: `src/modules/` ya no existe (purgado en FASE 20.5-20.6).

### Tipos Supabase
- `src/core/types/database.ts` — generado por `mcp__generate_typescript_types`. **Regenerar tras cualquier rename de tabla o columna**.
- `src/types/database.ts` — tipos calculator-internos (NO viven en BD: `SupplyPoint`, `Powers`, `InvoiceData`). NO borrar.
- Cuando `Database = any` (estado actual en `src/core/supabase/client.ts`), las mutaciones requieren `as never` en algunos sitios. **No parchear con más `as never` cuando aparezcan errores nuevos** — regenerar los tipos.

### Mutaciones / queries
- `useSupabaseQuery` para SELECT con cache + paginación.
- `useSupabaseMutation` para INSERT/UPDATE/DELETE con toasts.
- Paginación: `paginate<T>` devuelve `PaginatedResult<T>`. Acceder con `.data`.
- Confirmaciones destructivas: `ConfirmDialog` de `src/core/components/`.
- Skeletons durante `isLoading`, no spinners.

### Tests
- Vitest. 39 tests deben pasar siempre antes de commit.
- TSC `0 errores` antes de commit. **No commitees con errores TSC** salvo emergencia documentada en el commit body.

---

## 6. Patrones específicos del proyecto

### Sistema de agentes
4 roles definidos en `CLAUDE.md` y `docs/AGENTES_Y_SPRINTS.md`:

1. **Cowork** (este agente) — coordinador, planificación, features backend, docs.
2. **Claude Code CLI** — implementación + QA + tests + commits desde la terminal de Juan.
3. **Claude Design** — diseño visual, tokens CSS, screenshots análisis.
4. **valere-auditor** — subagente de QA pre-merge.

Cuando trabajes en algo que no es de tu capa, considera delegar (mensaje en `.cowork/outbox/` con instrucciones para el agente correspondiente).

### Bus de mensajes
- `.cowork/inbox/` — mensajes que recibes de otros agentes/sesiones.
- `.cowork/outbox/` — mensajes que dejas para otros.
- Formato: `YYYY-MM-DDTHH-MM-SS-descripcion.md`.

### Sprints paralelos
Cuando hay múltiples áreas de trabajo no-bloqueantes entre sí, lanzar sprints paralelos (A backend, B frontend, C coordinación, etc.) con restricciones explícitas de scope:

- "NO toques `supabase/`" — sprint backend lo lleva.
- "NO toques `src/`" — sprint frontend lo lleva.
- "NO `git commit`" — sandbox prepara, Juan ejecuta.

Cierra el sprint paralelo con un handoff prefijado (`sprint-paralelo-X-...`) para que sea fácil identificar quién hizo qué.

### Pendientes de Juan
Son acciones que **solo Juan puede hacer**:
- Connection strings de Postgres (passwords).
- `git commit + push` (sandbox no escribe a `.git`).
- `npm test`, `npx tsc --noEmit` (sandbox sin Node corriendo).
- Decisiones de producto (Opción A vs B, etc.).
- Acciones manuales en Dashboards (Supabase, Cloudflare, GitHub, Google Cloud).
- Cualquier cosa que requiera el filesystem real (apps satélite no mounted).

Documenta cada uno explícitamente en el handoff con instrucciones copy-paste.

---

## 7. Modelos Gemini en este proyecto

**Producción actual** (Edge Function `ask-crm-docs` v9):
- Embeddings: `gemini-embedding-001` con `outputDimensionality=768`.
- Generación: `gemini-2.5-flash`.

Los modelos antiguos (`text-embedding-004`, `gemini-2.0-flash`, `gemini-1.5-flash`) están **deprecados para cuentas nuevas desde abril 2026**. Si encuentras código que los usa, actualizarlo (ver `supabase/functions/_shared/ai-adapter.ts`).

**No bajar** la `outputDimensionality` por debajo de 768 — el índice pgvector de `crm_help_embeddings` está dimensionado para esa cifra.

---

## 8. Decisiones arquitectónicas vivas

### `Database = any` temporal
`src/core/supabase/client.ts` tiene `Database = any` para evitar romper imports durante refactors. Plan: regenerar tipos cuando el schema esté estable post-Fase 2 unificación. Mientras tanto, las mutaciones requieren algunos `as never` puntuales — **regenerar antes de añadir más**.

### Tabla `proposals` viva (no dropear)
Aunque la tabla canónica es `propuestas`, `proposals` sigue viva por decisión Juan (3 features del FE la usan: `AnalisisPage`, `TrackingPage`, `PropuestasEnergiaPage`). Drop solo en sprint dedicado que consolide las 3 features bajo `propuestas`.

### Compat views legacy (Sprint 7)
`retailers`, `retailer_offers`, `boe_regulated_prices` son views apuntando a `comercializadoras`, `comercializadora_ofertas`, `precios_regulados_boe`. Drop tras refactor FE completo (sprint 8 confirmó 0 refs legacy en `src/`, solo queda dependencia hipotética de apps satélite — pendiente confirmación con Bloque 4 del runbook).

### RLS USING(true) heredado
8 tablas Potencias-side están con `USING(true)` (`expedientes`, `ciclos`, `solicitudes_potencia`, `savings_calculations`, `comunicaciones_cliente`, `comercializadora_docs`, `excel_import_templates`, `alertas`). Hardening preparado en `supabase/migrations/_draft_rls_hardening_8_tables.sql` — aplicar tras Fase 2 datos completa (Bloque 7 del runbook).

### Apps satélite (Opción A vs B)
Decisión pendiente Juan (`docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md` §4.D). A = apps separadas con compat views, B = absorber features en CRM. Recomendación Cowork: A para transición + B largo plazo.

### Storage bucket PDFs
Riesgo identificado en sprint 8: `client_documents.storage_path` apunta al bucket del proyecto Potencias. Si se pausa Potencias, las URLs rompen. Decisión pendiente Juan (Bloque 6 del runbook).

---

## 9. Anti-patrones y errores ya cometidos

### "Asumir que está deployado/configurado"
Sprint 5 descubrió que el asistente RAG ya estaba operativo en producción cuando los sprints anteriores lo daban como "listo para deploy". **Verifica con MCP** (`get_edge_function`, `list_edge_functions`, `execute_sql` para counts) **antes de planificar deploy**.

### Drift repo↔deployed silencioso
El código en `supabase/functions/` puede divergir de la versión deployada (cada redeploy es una mini-regresión potencial). Mantén `ai-adapter.ts` y similares al día con producción **como parte del sprint, no como afterthought**.

### Parchar con `as never`
Cuando TSC se queja de tipos por `Database = any`, la tentación es añadir `as never`. **No**. Regenera los tipos vía MCP (`generate_typescript_types`).

### Refactor "completo" sin grep
Tras renombrar una tabla, **grep exhaustivo** en `src/` para detectar refs legacy escondidos en strings/literales. Sprint 8 encontró 2 últimas refs legacy en `src/types/database.ts` (interfaces que se asumían 100% migradas).

### Documentar planes en `MEMORY.md` o handoffs en `docs/`
- `MEMORY.md` es para hechos persistentes cross-sesión, no para planes de sprint.
- `docs/` es para docs vivas del proyecto, no para handoffs efímeros.
- Handoffs van en `.cowork/outbox/`.
- Planes de implementación van en `docs/PLAN_*` o como TodoList del momento.

### Asumir que `npm install` o `npm test` funcionan en sandbox
No corren. Cualquier verificación con Node se delega a Juan (PowerShell). El handoff debe incluir `npx tsc --noEmit` y `npm test -- --run` como pasos del script PowerShell.

---

## 10. Cuando estás bloqueado

Antes de pararte y avisar a Juan, intenta:

1. **¿Hay un sprint paralelo que pueda avanzar?** Lee otros handoffs recientes — quizás el bloqueo en tu lane no impide trabajo en otro.
2. **¿Es un bloqueo técnico o de decisión?** Si es técnico (passwords, MCP no expone función X), documéntalo y sigue. Si es de decisión de producto, formula la pregunta concreta y resúmela en 1 párrafo para próxima sesión.
3. **¿Puedes preparar el trabajo en archivos sin ejecutar?** Casi siempre sí. Cowork puede dejar un script SQL preparado para que Juan ejecute, o un patch para que aplique. El bloqueo de "no puedo ejecutar" rara vez impide "puedo preparar".

Solo escala al usuario cuando:
- El bloqueo requiere input que no está en `CLAUDE.md` ni en docs ni en código.
- Una decisión arquitectónica afecta múltiples sprints futuros.
- Un fallo está rompiendo producción o riesgo de.

---

## 11. Mantén este playbook vivo

Cada sprint autónomo nuevo:
- ¿Aprendiste algo nuevo? Añádelo a §3 o §9.
- ¿Cambió una restricción del sandbox? Actualiza §2.
- ¿Una decisión arquitectónica cambió? Refleja en §8.
- ¿Un patrón se quedó obsoleto? Bórralo o márcalo deprecated.

Este documento es una **memoria operativa compartida**. Las primeras versiones del proyecto perdieron días por no tener esto. Mantenerlo es trabajo barato comparado con redescubrir las mismas cosas en cada sesión.

---

## Referencias rápidas

- `CLAUDE.md` — contexto persistente del repo.
- `docs/ESTADO.md` — estado en tiempo real (qué se hizo, qué falta).
- `docs/AGENTES_Y_SPRINTS.md` — sistema de 4 agentes.
- `docs/RUNBOOK_PENDIENTE_JUAN.md` — runbook consolidado de bloques pendientes.
- `docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md` — plan vivo de unificación.
- `.cowork/outbox/` — handoffs (los últimos 3-4 son los relevantes).
