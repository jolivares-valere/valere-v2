---
fecha: 2026-04-26
auditor: Cowork — sprint domingo lane 4
commit: b9eaff30a572da36ce78c4db2077c03ef645446f
autor: J Olivares <jolivares@valereconsultores.com>
fecha_commit: 2026-04-25 23:08:20 +0200
files: 48
diff: +13 453 / −428
estado_remote: SOLO LOCAL — sin remote configurado, push pendiente
---

# Auditoría exhaustiva del commit `b9eaff3`

> Pase pre-push antes de subir a `origin`. Lectura solo: ningún archivo del commit ha sido modificado en este informe.

## Resumen ejecutivo

| Severidad | Cantidad | Bloqueante para push |
|---|---:|---|
| 🔴 Crítico | **0** | No |
| 🟡 Atención | 6 | No (gestionables post-push) |
| 🟢 OK | El resto | — |

**Veredicto:** ✅ **Listo para push.** Ningún hallazgo bloquea la subida. Las 6 incidencias 🟡 son trazables, ya están reflejadas en `docs/RUNBOOK_PENDIENTE_JUAN.md` o se gestionan en sprints siguientes.

---

## Categorías auditadas

Los 48 archivos se reparten así:

| Categoría | Archivos |
|---|---:|
| DB — migrations + scripts SQL Fase 2 | 5 |
| Frontend / código TypeScript / Edge Function | 8 |
| Documentos (`docs/*`) | 28 |
| Scripts (PowerShell / shell) | 3 |
| Handoffs `.cowork/outbox/` | 8 |
| `.cowork/AGENT_PLAYBOOK.md` | 1 |
| **Total** (algunos solapan: backup.sh modo) | **48** |

---

## 1. DB — migrations + scripts Fase 2 — 🟢 OK

Archivos:

- `supabase/migrations/20260426_fase1_unificacion_renames_schema.sql`
- `supabase/migrations/_draft_rls_hardening_8_tables.sql`
- `scripts/unificacion_fase2_a_staging.sql` (292 líneas)
- `scripts/unificacion_fase2_b_dedupe_y_transform.sql` (498 líneas)
- `scripts/unificacion_fase2_c_verificacion.sql` (105 líneas)
- `scripts/unificacion_fase2_protocolo.md` (160 líneas)

### Hallazgos

**🟢 Migración Fase 1 (renames + columnas):**

- Idempotente donde toca (`add column if not exists`).
- Transacción `begin;…commit;` correcta.
- Drop de `proposals` correctamente comentado (decisión documentada en línea: «dejar tabla viva hasta sprint FE refactor»).
- `comment on table` para trazabilidad post-rename — buena práctica.
- Backfill de `tariff_type`/`rate_eur_kw_day` con `where tariff_type is null` — idempotente.
- Rollback documentado en bloque `-- Rollback:` al inicio del archivo.

**🟡 Atención — drift entre migrations en el repo y migrations aplicadas vía MCP a prod CRM:**

`docs/ESTADO.md` (líneas 80-83) menciona que se aplicaron a prod 3 migrations adicionales vía `mcp__apply_migration` que **no están como archivos** en `supabase/migrations/`:

- `fase1b_legacy_compat_views` — crea views `retailers`/`retailer_offers`/`boe_regulated_prices` apuntando a las tablas renombradas + `INSTEAD OF INSERT` triggers.
- `fase1c_compat_views_security_invoker` — corrige 4 ERRORs `security_definer_view`.
- `fix_normalizar_nombre_retailer_search_path` — `set search_path = public` en función residual del sprint 4.

Esto explica por qué `src/core/types/database.ts` (regenerado vía `mcp__generate_typescript_types`) tiene `retailers`/`retailer_offers`/`boe_regulated_prices` como **Views** y los nombres canónicos como **Tables**, pese a que la migración del repo no crea esas vistas.

**Impacto:** un dev que clone el repo y corra `supabase db push` contra una BD virgen reproducirá la Fase 1 de schema pero **no** las vistas de compatibilidad. Si nada apunta ya a los nombres legacy desde código (verificado: cero `retailer_id`, `retailers(name)`, `boe_regulated_prices` en `src/`), no rompe runtime, pero sí rompe paridad repo↔prod.

**Recomendación:** generar las 3 migraciones faltantes como archivos SQL antes del push, o documentarlas explícitamente en `docs/ESTADO.md` como “solo en prod”. **No bloquea el push** — Juan ya las tiene aplicadas en prod.

**🟡 Atención — `_draft_rls_hardening_8_tables.sql`:**

- Filename con prefijo `_draft_` (no es timestamp). Supabase CLI **probablemente lo ignora** (la convención requiere `<timestamp>_<name>.sql`), pero no está documentado en el propio archivo. Riesgo bajo: si alguien aplica `supabase db push` con un comando que sí lo recoge, las RLS draft (sin validar) se aplicarían en lugar de las actuales `USING(true)`.
- Comentario en cabecera (línea 13) instruye a aplicar vía `mcp__apply_migration` con el contenido como `query`. Eso es correcto.
- **Recomendación:** añadir cabecera explícita `-- DO NOT APPLY VIA supabase db push` o renombrar a `.sql.draft` para evitar ambigüedad.

**🟢 Scripts Fase 2 (a/b/c):**

- `_a_staging.sql`: idempotente (`drop schema if exists … cascade`).
- `_b_dedupe_y_transform.sql`: usa nombres canónicos post-rename (`comercializadoras`, `comercializadora_ofertas`, `precios_regulados_boe`). Coherente con Fase 1.
- `_c_verificacion.sql`: queries de smoke (sin efectos).
- `unificacion_fase2_protocolo.md`: pasos numerados con backups, dump, transform, rollback. Las únicas «credenciales» que aparecen son placeholders `<password CRM>` / `<password Potencias>` — explícitamente con instrucciones de origen («pedir a Juan / dashboard Supabase»).

**🟢 Sin secretos hardcodeados.** `git show b9eaff3 | grep` con patrones `eyJ…`, `sk-…`, `AIza…`, `ghp_…`, `service_role` confirma cero leaks.

---

## 2. Frontend / código — 🟡 mayormente OK, 1 atención TS

Archivos:

- `src/App.tsx` — añade 2 `<ErrorBoundary>` wrappers
- `src/main.tsx` — añade `initTelemetry()`
- `src/core/utils/telemetry.ts` — nuevo (143 líneas)
- `src/core/types/database.ts` — regenerado tras Fase 1 (3727 líneas, +2410)
- `src/core/types/database_canonical_2026-04-26.ts` — nuevo
- `src/types/database.ts` — `RetailerOffer.retailer_id` → `comercializadora_id`
- `src/features/admin/AdminPage.tsx` — 5 cambios string + 1 rename de campo
- `src/features/analisis/AnalisisPage.tsx` — 4 cambios string
- `supabase/functions/_shared/ai-adapter.ts` — modelo Gemini actualizado

### Hallazgos

**🟢 `src/App.tsx` + `ErrorBoundary`:**

- `import { ErrorBoundary } from './core/components/ErrorBoundary'` — el archivo **existe** (`src/core/components/ErrorBoundary.tsx`).
- Dos boundaries: uno para `<Suspense>{children}` y otro para `<AsistentePanel>`. Aislado correctamente: caída del asistente RAG no tira la página.

**🟢 `src/core/utils/telemetry.ts`:**

- `import { logError } from './logger'` — `src/core/utils/logger.ts` exporta `logError` ✅.
- `window.__valereTelemetry` declarado vía `declare global` correctamente tipado.
- `initTelemetry` idempotente (`if (initialized) return`).
- Buffer limitado a 200 eventos.
- El comentario indica que la ingestión a prod (tabla `crm_telemetry`) está pendiente — diseño «buffer-only» honesto.

**🟡 Atención — `src/core/types/database_canonical_2026-04-26.ts` duplicado de `database.ts`:**

`diff -q` confirma: ambos archivos son **byte-a-byte idénticos** (115 KB / 3727 líneas). El archivo canonical ya está señalado para `git rm` en:

- `docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md` línea 275
- `docs/RUNBOOK_PENDIENTE_JUAN.md` línea 74

**Impacto:** ninguno funcional (nadie lo importa fuera de la propia copia). Sólo +115 KB innecesarios en el blob del commit.

**Recomendación:** dejar para sprint siguiente (ya planificado). **No bloquea el push.**

**🟢 `src/types/database.ts` — `RetailerOffer.retailer_id` → `comercializadora_id`:**

Cambio coherente con la migración. La interfaz `RetailerOfferWithName` también pasa de `retailers: Pick<…>` a `comercializadoras: Pick<…>`. **Ambos consumidores** (`AdminPage.tsx`, `AnalisisPage.tsx`) están migrados en este mismo commit.

**🟢 AdminPage / AnalisisPage:**

- 9 cambios totales, todos consistentes:
  - `useSupabaseMutation('retailers')` → `'comercializadoras'`
  - `useSupabaseMutation('retailer_offers')` → `'comercializadora_ofertas'`
  - `from('boe_regulated_prices')` → `'precios_regulados_boe'`
  - `select '*, retailers(name)'` → `'*, comercializadoras(name)'`
  - `o.retailers?.name` → `o.comercializadoras?.name`
  - `form.retailer_id` → `form.comercializadora_id`
- Cero residuos de los nombres legacy en `src/` (verificado con `grep -rn "retailer_id\|retailers(name)\|from('retailer\|from('boe_regulated"`). Solo aparecen en `src/core/types/database.ts` dentro de bloques `Views:` y `Relationships`, lo cual es correcto.
- `useSupabaseQuery` / `useSupabaseMutation` reciben `table: string` sin tipo paramétrico — TSC **no** valida que el nombre exista en `Database['public']['Tables']`. Por tanto el rename no genera errores de tipo, pero tampoco da garantía estática. Riesgo runtime si Fase 1 no se aplica en una BD destino — pero está aplicada en prod CRM, que es el único entorno relevante.

**🟢 `supabase/functions/_shared/ai-adapter.ts`:**

- `text-embedding-004` → `gemini-embedding-001` con `outputDimensionality: 768` (coincide con la columna `crm_help_embeddings.embedding vector(768)` y con `scripts/generate-help-embeddings.mjs`).
- `gemini-2.0-flash` → `gemini-2.5-flash`. Comentario explica deprecación de los modelos viejos para cuentas nuevas en abril 2026.
- Defensa contra cambios de shape de respuesta (`embeddings?.[0]?.values ?? embedding?.values`).

### Riesgos para `npx tsc --noEmit`

Sandbox no ejecuta TSC, pero con lectura estática de los tipos canónicos:

| Símbolo importado | Origen | Riesgo |
|---|---|---|
| `RetailerOfferWithName` (AnalisisPage:16) | `src/types/database.ts` (interface preservada, alias join renombrado) | 🟢 OK |
| `BoeRegulatedPrice` (AnalisisPage:16) | `src/types/database.ts` | 🟢 OK — campos `tariff`/`period`/`price` siguen existiendo en la tabla renombrada (la migración añade cols, no las elimina) |
| `Retailer` (AdminPage:16) | `src/types/database.ts` (interface intacta — solo el nombre de tabla cambia) | 🟢 OK |
| `useSupabaseQuery<Retailer>({ table: 'comercializadoras' })` | hook `table: string` sin checking | 🟢 OK |
| `o.comercializadoras?.name` (AdminPage:401) | tipo `OfferWithRetailer` definido en el archivo: `comercializadoras: Pick<Retailer, 'name'> \| null` | 🟢 OK |

**Expectativa razonable cuando Juan corra `npx tsc --noEmit` post-push:** 0 errores derivados de este commit. Si hay errores, vendrán de:

1. Otros lanes en paralelo (deletes de migrations en staged, no parte de b9eaff3).
2. Estado pre-existente del repo previo a b9eaff3 (no investigado en este lane).
3. Imports rotos no detectados en lectura estática (riesgo bajo dado el volumen de matches grep).

---

## 3. Documentos `docs/*` — 🟢 mayormente OK, 1 atención formato

Archivos: 24 nuevos + 1 modificado (`docs/ESTADO.md`).

### Hallazgos

**🟢 Help docs (`docs/help/*`):**

3 archivos nuevos para el asistente RAG:

- `docs/help/actividades/configurar-recordatorio.md` (88 líneas)
- `docs/help/empresas/anadir-contacto-a-empresa.md` (65 líneas)
- `docs/help/oportunidades/estados-y-etapas.md` (68 líneas)

Frontmatter completo (`title`, `section`, `audience`, `keywords`, `related`). **Todos los `related:` apuntan a archivos existentes** en `docs/help/` (verificado 9/9). El pipeline `regenerate-help-embeddings.yml` los recogerá en el próximo run.

**🟢 Plans + dry runs Supabase:**

- `docs/SUPABASE_FASE4_DRY_RUN_2026-04-25.md`, `…FASE5…`, `…RLS_HARDENING_VALIDACION…`, `…AUDITORIA_ADVISORS…`, `…BUCKET_STORAGE_POTENCIAS…` — informes de dry-run + planning, todos con fecha y sprint origen.
- `docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md` (337 líneas) — Fases 4 y 5 (deploy + cutover + congelar Potencias).
- `docs/REFACTOR_FE_FASE3_2026-04-26.md` — checklist FE refactor (8 archivos mapeados, 4 tocados).
- `docs/PATCH_ASISTENTE_RAG_2026-04-25.md` (196 líneas).
- `docs/AUDITORIA_FE_2026-04-25_SPRINT_PARALELO_B.md` (216 líneas).
- `docs/INVENTARIO_GEMINI_2026-04-25.md` — inventario keys Gemini (server-side only en valere-v2; pendiente confirmar apps satélite).
- `docs/INVENTARIO_APPS_SATELITE_TEMPLATE.md` (222 líneas) — template a rellenar por Juan via PowerShell.
- `docs/COMUNICADO_UNIFICACION_DRAFT.md`, `docs/COMUNICADO_VENTANA_CORTE_DOMINGO.md` — borradores de comunicación al equipo.
- `docs/PROMPT_AGENTE_BROWSER_SABADO.md` — prompt para Claude in Chrome.

**🟡 Atención — `RUNBOOK_FLAT.md` y `RUNBOOK_PENDIENTE_JUAN.md` contienen rutas hardcodeadas Windows:**

`C:\Users\joliv\valere-v2\…` aparece varias veces en estos docs (y en RUNBOOK*.ps1, ver §4). **Es intencional**: son guías para el ordenador concreto de Juan, no para CI. Aun así:

- Cualquier dev que clone el repo en otra máquina ve esa ruta como ejemplo no-portable.
- **Recomendación:** añadir nota al inicio de cada RUNBOOK con `> Rutas asumen $HOME=C:\Users\joliv. Ajustar si tu user difiere.`. **No bloqueante.**

**🟢 `docs/ESTADO.md` (modificado, +236 líneas):**

Refleja el estado real al 2026-04-26: sprints 5-9 + paralelos A/B/C cerrados, Fase 1 aplicada, Fase 2 pendiente Juan, Fase 3 FE aplicada, RLS draft preparado. Es el documento canónico — fuente de verdad usada por este informe.

**🟢 Frontmatter / metadata:** todos los docs nuevos llevan título y fecha clara. Sin TODO/FIXME crítico (`grep` confirmado).

---

## 4. Scripts (PowerShell / shell) — 🟡 RUNBOOK.ps1 corrupto en working copy

Archivos:

- `RUNBOOK.ps1` (raíz, 30 líneas de contenido + null-byte tail)
- `RUNBOOK_FLAT.ps1` (raíz, 240 líneas)
- `scripts/inventario_apps_satelite.ps1` (404 líneas)
- `scripts/backup.sh` — solo cambio de modo

### Hallazgos

**🟡 Atención — `RUNBOOK.ps1` working copy corrupto con null bytes:**

- Working copy: 34 643 bytes, ~1 300 de los cuales son contenido real; el resto son **bytes 0x00**. `xxd` confirma `tail -c 100` es 100 bytes nulos.
- **El blob commiteado (`git show b9eaff3:RUNBOOK.ps1`) son 1 292 bytes limpios** — el padding nulo NO viajó al commit. ✅
- Causa probable: residuo de la corrupción `.git/` mencionada en `RUNBOOK_FLAT.ps1` (que cleanea null bytes solo de archivos críticos de `.git/`, no del working tree).
- **Impacto en push:** ninguno. El blob es limpio.
- **Impacto en working copy de Juan:** `grep` lo trata como binario. Cualquier herramienta que escanee ASCII fallará.
- **Recomendación post-push:** `git checkout -- RUNBOOK.ps1` para restaurar el blob limpio sobre el working copy.

**🟢 `RUNBOOK_FLAT.ps1`:**

- ASCII puro, validado con PSScriptAnalyzer según comentario en cabecera.
- Lógica idempotente: backup de `.git/index.lock` antes de mover, detección de remote, validación de rama, lista hardcodeada de 28 archivos a `git add` (coincide con los 26 entregables + outboxes mencionados en outbox 9).
- Block F corre `npx tsc --noEmit` y `npm test --run` antes de commit; **falla silenciosa** si tests rompen — comportamiento correcto.

**🟢 `scripts/inventario_apps_satelite.ps1`:**

- Parámetros configurables al inicio (rutas de repos satélite con default `$HOME\<repo>`).
- Output a `$HOME\valere-backups\` (no toca el repo).
- Sin credenciales, sin URLs sensibles.

**🟡 Atención — `scripts/backup.sh` solo cambio de modo:**

- `old mode 100755 / new mode 100644` — perdió el bit ejecutable. El archivo está vacío (0 líneas) — placeholder histórico.
- **Impacto:** quien ejecutara `./scripts/backup.sh` post-clone recibirá `Permission denied`. Pero el archivo es vacío y nadie lo invoca. **No bloqueante.**

---

## 5. Handoffs `.cowork/outbox/` — 🟢 OK

8 archivos nuevos, todos siguiendo la convención `YYYY-MM-DDTHH-MM-SS-descripcion.md`:

| Archivo | Líneas | Sprint origen |
|---|---:|---|
| `…sprint-autonomo-5-rag-verificado-y-sync.md` | 159 | 5 |
| `…sprint-autonomo-6-unificacion-fase1-fase2-listas.md` | 162 | 6 |
| `…sprint-autonomo-7-fase1-aplicada-fe-refactor-y-fase2-pendiente-juan.md` | 203 | 7 |
| `…sprint-autonomo-8-validacion-plan-fases-4-5-rls-draft.md` | 212 | 8 |
| `…sprint-paralelo-B-frontend-asistente-observabilidad.md` | 125 | B |
| `…sprint-autonomo-9-runbook-ps1-maestro.md` | 138 | 9 |
| `…sprint-paralelo-C-coordinacion.md` | 161 | C |
| `…sprint-paralelo-A-backend.md` | 74 | A |

**🟢 Cruce con archivos commiteados:** los handoffs prometen entregables que **están todos en el commit**. Spot-checks:

- Outbox 7 menciona «AdminPage.tsx + AnalisisPage.tsx: 9 cambios string + retailer_id->comercializadora_id» y «src/core/types/database.ts regenerado (3727 lineas, post-rename)». Coincide con el diff (verificado: 3727 líneas confirmadas).
- Outbox B menciona ErrorBoundary + telemetría — ambos archivos en el commit.
- Outbox 9 menciona RUNBOOK_FLAT.ps1 con lista hardcodeada — coincide.

**🟢 Sin credenciales** en outboxes.

---

## 6. `.cowork/AGENT_PLAYBOOK.md` — 🟢 OK

316 líneas. Manual condensado de convenciones para futuros agentes Claude. Sin TODOs críticos. Refiere correctamente a `docs/ESTADO.md`, `docs/RUNBOOK_PENDIENTE_JUAN.md`, `scripts/unificacion_fase2_protocolo.md`. Cero rutas absolutas Windows.

---

## Recomendaciones pre-push (ordenadas por urgencia)

1. **Ninguna acción bloqueante.** El commit es seguro de subir tal cual.
2. **Post-push, working copy:** `git checkout -- RUNBOOK.ps1` para limpiar los null bytes del WT (no afecta al commit ni al remote).
3. **Backlog corto (sprint siguiente):**
   - Persistir como archivos SQL las 3 migraciones aplicadas vía MCP (`fase1b_legacy_compat_views`, `fase1c_compat_views_security_invoker`, `fix_normalizar_nombre_retailer_search_path`) o documentarlas como “solo prod”.
   - `git rm src/core/types/database_canonical_2026-04-26.ts` (ya planificado).
   - Restaurar bit ejecutable de `scripts/backup.sh` o eliminarlo si nadie lo usa.
   - Renombrar `_draft_rls_hardening_8_tables.sql` o añadir cabecera `-- DO NOT APPLY`.
4. **Smoke tests post-push (en máquina de Juan):**
   - `npx tsc --noEmit` — esperado 0 errores derivados de b9eaff3.
   - `npm test -- --run` — esperado 39/39.
   - `npm run dev` (puerto 3000) — login + dashboard + un análisis comparativo.

---

## Cierre

Commit auditado **48/48 archivos**. **0 hallazgos 🔴**. **6 hallazgos 🟡**, todos rastreables y no bloqueantes. **Push autorizado.**
