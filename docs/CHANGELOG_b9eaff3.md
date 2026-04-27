---
commit: b9eaff30a572da36ce78c4db2077c03ef645446f
fecha: 2026-04-25 23:08:20 +0200
autor: J Olivares <jolivares@valereconsultores.com>
mensaje: "feat(unificacion): sprints 5+6+7+8 + paralelos A/B/C - cierre acumulado"
files: 48
diff: +13 453 / −428
sprints_incluidos: [5, 6, 7, 8, 9, A, B, C]
auditoria: docs/AUDIT_COMMIT_b9eaff3.md
---

# Changelog — `b9eaff3`

> Cierre acumulado de los sprints autónomos 5-9 + sprints paralelos A/B/C ejecutados durante el sábado 2026-04-25 sobre el repo `valere-v2`. Listo para push y para usar como descripción del PR.

## Resumen

Este commit cierra el bloque «Unificación Supabase» (renames de schema en CRM canónico + scripts cross-proyecto para importar datos de Potencias) junto con mejoras de robustez en frontend (ErrorBoundary, telemetría) y el upgrade del adapter de IA del asistente RAG a los modelos Gemini vigentes en abril 2026.

---

## Added

### Backend / DB
- **Migración Fase 1 unificación** (`supabase/migrations/20260426_fase1_unificacion_renames_schema.sql`): renombrado de tablas catálogo a nomenclatura castellana — `retailers` → `comercializadoras`, `retailer_offers` → `comercializadora_ofertas`, `boe_regulated_prices` → `precios_regulados_boe`. Rename de FK `retailer_id` → `comercializadora_id`. 7 columnas nuevas en `precios_regulados_boe` (`tariff_type`, `rate_eur_kw_day`, `valid_from`, `valid_to`, `updated_by`, `updated_at`, `legacy_potencia_id`) con backfill 29/29 filas. Drop de `proposals` desactivado por decisión Juan (queda viva hasta sprint FE refactor consolide AnalisisPage/TrackingPage/PropuestasEnergiaPage). Validada con dry-run `BEGIN…ROLLBACK` contra prod. Rollback documentado en cabecera. Ya aplicada en prod CRM. Plan completo en `docs/PLAN_UNIFICACION_SUPABASE.md`.
- **Draft RLS hardening 8 tablas** (`supabase/migrations/_draft_rls_hardening_8_tables.sql`): plantilla de policies para `expedientes`, `ciclos`, `solicitudes_potencia`, `savings_calculations`, `alertas`, `comunicaciones_cliente`, `comercializadora_docs`, `excel_import_templates`. Sustituye las `USING(true)` actuales por SELECT abierto a authed + INSERT/UPDATE solo creador o `is_manager_or_above()`. **No aplicada todavía** — espera a Fase 2 completa y revisión Juan.
- **Scripts Fase 2 cross-proyecto** (`scripts/unificacion_fase2_*`): protocolo `pg_dump` + `psql` para importar ~408 filas de `valere-gestion-potencias` (`alesfvxqtwlrwlmkoosg`, eu-central-1) al CRM canónico (`gtphkowfcuiqbvfkwjxb`, eu-west-1). 3 SQL (staging → dedupe+transform → verificación) + protocolo paso-a-paso con backups, rollback y mapping legacy→canonical. Dedupe por CIF normalizado (clients), CUPS normalizado (supplies), email (profiles).
- **Asistente RAG — modelos Gemini actualizados** (`supabase/functions/_shared/ai-adapter.ts`): `text-embedding-004` → `gemini-embedding-001` con `outputDimensionality: 768`. `gemini-2.0-flash` → `gemini-2.5-flash`. Necesario tras la deprecación de los modelos antiguos para cuentas nuevas en abril 2026.

### Frontend
- **`ErrorBoundary` doble en App** (`src/App.tsx`): wrapper alrededor de las rutas y wrapper independiente alrededor de `<AsistentePanel>` para que un fallo del asistente RAG (Edge Function caída, respuesta malformada) no tire la página entera.
- **Telemetría ligera** (`src/core/utils/telemetry.ts`): captura sin SDK externo de `window.error`, `unhandledrejection`, web vitals (LCP/FCP/TTFB) y route changes. Buffer en memoria (`window.__valereTelemetry`, máx 200 eventos) con punto de extensión para enviar a futura Edge Function `track-event` cuando exista la tabla `crm_telemetry`. Inicializada desde `src/main.tsx`.

### Tipos TypeScript
- **`src/core/types/database.ts` regenerado** post-Fase 1: 3 727 líneas (+2 410). Las tablas renombradas aparecen como **Tables** (`comercializadoras`, `comercializadora_ofertas`, `precios_regulados_boe`) y los nombres legacy aparecen como **Views** (creadas por la migración complementaria `fase1b_legacy_compat_views` aplicada vía MCP — ver nota en auditoría).
- **Snapshot canónico** (`src/core/types/database_canonical_2026-04-26.ts`): copia byte-a-byte de `database.ts` para trazabilidad histórica. Marcado para `git rm` en sprint siguiente (ver `docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md` línea 275).

### Documentación

#### Help docs (asistente RAG)
- `docs/help/actividades/configurar-recordatorio.md`
- `docs/help/empresas/anadir-contacto-a-empresa.md`
- `docs/help/oportunidades/estados-y-etapas.md`

Cada uno con frontmatter completo (`title`, `section`, `audience`, `keywords`, `related`). El pipeline `regenerate-help-embeddings.yml` los recogerá tras el push.

#### Plans + dry runs Supabase
- `docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md` — Fases 4 (deploy + cutover) y 5 (congelar Potencias).
- `docs/REFACTOR_FE_FASE3_2026-04-26.md` — checklist FE refactor (8 archivos mapeados).
- `docs/SUPABASE_FASE4_DRY_RUN_2026-04-25.md` y `…FASE5…` — dry runs.
- `docs/SUPABASE_RLS_HARDENING_VALIDACION_2026-04-25.md` — validación del draft RLS.
- `docs/SUPABASE_AUDITORIA_ADVISORS_2026-04-25.md` — informe `pg_advisor`.
- `docs/SUPABASE_BUCKET_STORAGE_POTENCIAS_2026-04-25.md` — análisis bucket Storage.

#### Asistente / observabilidad
- `docs/PATCH_ASISTENTE_RAG_2026-04-25.md` — patch con verificación end-to-end del asistente.
- `docs/AUDITORIA_FE_2026-04-25_SPRINT_PARALELO_B.md` — auditoría FE.

#### Apps satélite + comunicación
- `docs/INVENTARIO_GEMINI_2026-04-25.md` — inventario keys Gemini.
- `docs/INVENTARIO_APPS_SATELITE_TEMPLATE.md` — template a rellenar por Juan vía PowerShell.
- `docs/COMUNICADO_UNIFICACION_DRAFT.md` — borrador equipo.
- `docs/COMUNICADO_VENTANA_CORTE_DOMINGO.md` — comunicado ventana de corte.
- `docs/PROMPT_AGENTE_BROWSER_SABADO.md` — prompt para Claude in Chrome.

#### Runbooks
- `docs/RUNBOOK_PENDIENTE_JUAN.md` (483 líneas) — bloques A-F con instrucciones paso-a-paso.
- `docs/RUNBOOK_FLAT.md` (332 líneas) — versión copy/paste manual.

### Scripts
- `RUNBOOK.ps1` (raíz) — wrapper deprecation-only (delega en `RUNBOOK_FLAT.ps1`).
- `RUNBOOK_FLAT.ps1` (raíz) — secuencia ejecutable validada con PSScriptAnalyzer 5.1.
- `scripts/inventario_apps_satelite.ps1` — inventario detallado de apps satélite Valere para preparar Fase 4.

### Coordinación inter-agentes
- `.cowork/AGENT_PLAYBOOK.md` — manual condensado de convenciones, workarounds y patrones para los siguientes agentes Claude.
- 8 handoffs en `.cowork/outbox/` documentando cierre de sprints 5-9 + paralelos A/B/C.

---

## Changed

- **`src/features/admin/AdminPage.tsx`**: 5 cambios. `RetailersTab` y `OffersTab` ahora apuntan a `comercializadoras` / `comercializadora_ofertas`. Form state migra `retailer_id` → `comercializadora_id`. Nested select `retailers(name)` → `comercializadoras(name)`. Display `o.retailers?.name` → `o.comercializadoras?.name`.
- **`src/features/analisis/AnalisisPage.tsx`**: 4 cambios paralelos. `from('retailer_offers')` → `from('comercializadora_ofertas')`, `select '*, retailers(name)'` → `'*, comercializadoras(name)'`, `from('boe_regulated_prices')` → `from('precios_regulados_boe')`, `offer.retailers?.name` → `offer.comercializadoras?.name`.
- **`src/types/database.ts`**: `RetailerOffer.retailer_id` → `comercializadora_id`. `RetailerOfferWithName` cambia el alias del join de `retailers` a `comercializadoras`. Las interfaces `Retailer`, `BoeRegulatedPrice`, etc. se mantienen por nombre TS (las tablas SQL son lo que cambia).
- **`src/main.tsx`**: añade `import { initTelemetry }` + llamada antes del `QueryClient`.
- **`docs/ESTADO.md`**: actualización exhaustiva (+236 líneas) reflejando sprints 5-9 + A/B/C cerrados, Fase 1 aplicada, Fase 2 pendiente Juan, Fase 3 FE aplicada, RLS draft preparado.

---

## Removed

- Nada eliminado. El drop de `proposals` previsto en la Fase 1 quedó **comentado** (decisión Juan: dejar viva hasta consolidación FE).

---

## Fixed

- **Robustez frontend**: caída del asistente RAG ya no tira la página completa (gracias a los nuevos `ErrorBoundary`).
- **Adapter Gemini compatible con cuentas nuevas**: `text-embedding-004` y `gemini-2.0-flash` están deprecados para cuentas nuevas desde abril 2026; el upgrade evita futuros 404 cuando Anthropic/Google rote.
- **Defensa contra cambios de shape de respuesta** Gemini SDK: `embeddings?.[0]?.values ?? embedding?.values ?? null` con validación explícita de longitud 768.

---

## Docs

Listado consolidado de documentos creados/modificados — ver secciones Added / Changed.

| Doc | Sprint | Propósito |
|---|---|---|
| `PLAN_UNIFICACION_FASES_4_5_2026-04-26.md` | 8 | Plan Fases 4 + 5 |
| `REFACTOR_FE_FASE3_2026-04-26.md` | 7 | Checklist refactor FE |
| `SUPABASE_FASE4_DRY_RUN_2026-04-25.md` | 8 | Dry run Fase 4 |
| `SUPABASE_FASE5_DRY_RUN_2026-04-25.md` | 8 | Dry run Fase 5 |
| `SUPABASE_RLS_HARDENING_VALIDACION_2026-04-25.md` | 8 | Validación RLS draft |
| `SUPABASE_AUDITORIA_ADVISORS_2026-04-25.md` | 5 | Informe `pg_advisor` |
| `SUPABASE_BUCKET_STORAGE_POTENCIAS_2026-04-25.md` | 5 | Análisis Storage |
| `PATCH_ASISTENTE_RAG_2026-04-25.md` | 5 | Patch + verificación RAG |
| `AUDITORIA_FE_2026-04-25_SPRINT_PARALELO_B.md` | B | Auditoría FE |
| `INVENTARIO_GEMINI_2026-04-25.md` | 5 | Keys Gemini |
| `INVENTARIO_APPS_SATELITE_TEMPLATE.md` | 9 | Template apps satélite |
| `COMUNICADO_UNIFICACION_DRAFT.md` | 8 | Borrador equipo |
| `COMUNICADO_VENTANA_CORTE_DOMINGO.md` | 9 | Ventana de corte |
| `PROMPT_AGENTE_BROWSER_SABADO.md` | C | Prompt Claude in Chrome |
| `RUNBOOK_PENDIENTE_JUAN.md` | 9 | Bloques A-F |
| `RUNBOOK_FLAT.md` | 9 | Versión copy/paste |
| `help/actividades/configurar-recordatorio.md` | B | Help RAG |
| `help/empresas/anadir-contacto-a-empresa.md` | B | Help RAG |
| `help/oportunidades/estados-y-etapas.md` | B | Help RAG |

---

## Notas para el PR

**Auditoría pre-push:** ver `docs/AUDIT_COMMIT_b9eaff3.md`.

**Hallazgos 🟡 conocidos (no bloqueantes):**
1. Drift entre 3 migrations aplicadas vía MCP a prod (`fase1b_legacy_compat_views`, `fase1c_compat_views_security_invoker`, `fix_normalizar_nombre_retailer_search_path`) y archivos en `supabase/migrations/`. **Solución**: persistirlas como archivos SQL en sprint siguiente.
2. `src/core/types/database_canonical_2026-04-26.ts` es duplicado byte-exacto de `database.ts`. **Marcado para `git rm`** en `docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md`.
3. Working copy de `RUNBOOK.ps1` con cola de null bytes (blob commiteado limpio). **Solución post-push**: `git checkout -- RUNBOOK.ps1`.
4. `_draft_rls_hardening_8_tables.sql` con prefijo no-timestamp; debería renombrarse a `.sql.draft` o llevar cabecera `-- DO NOT APPLY VIA db push`.
5. `scripts/backup.sh` perdió bit ejecutable y está vacío — basura histórica.
6. Rutas Windows hardcodeadas en `RUNBOOK*.{ps1,md}` (intencional, scripts para máquina de Juan).

---

## Smoke tests post-push (en máquina de Juan)

```powershell
cd C:\Users\joliv\valere-v2
npx tsc --noEmit          # esperado: 0 errores
npm test -- --run         # esperado: 39/39
npm run dev               # http://localhost:3000 — login, dashboard, análisis comparativo
```

---

## Cómo hacer el push (cuando tengas la URL del repo GitHub)

> Estado actual: el commit `b9eaff3` **solo existe en disco local** (`git remote -v` vacío). Sustituir `<URL_REPO>` por la URL real cuando esté creada en GitHub (probablemente algo tipo `https://github.com/jolivares-valere/valere-v2.git`).

```powershell
cd C:\Users\joliv\valere-v2

# 1. Verificar estado limpio del commit
git log --oneline -1                          # debe mostrar "b9eaff3 feat(unificacion)..."
git status                                    # solo debería listar staged unrelated (otros lanes)

# 2. Limpiar working copy de RUNBOOK.ps1 (null bytes locales, no afecta al commit)
git checkout -- RUNBOOK.ps1

# 3. Configurar el remote
git remote add origin <URL_REPO>
git remote -v                                 # confirma fetch + push apuntan a <URL_REPO>

# 4. Push inicial con upstream tracking
git push -u origin main

# 5. (Opcional) Crear PR vía GitHub CLI si está instalado
gh pr create --base main --head main `
  --title "feat(unificacion): sprints 5-9 + paralelos A/B/C - cierre acumulado" `
  --body-file docs/CHANGELOG_b9eaff3.md
```

**Si `git push` pide credenciales:** usar token GitHub con scope `repo`. Si tienes 2FA activo, **usa PAT (Personal Access Token)**, no la contraseña de cuenta.

**Si el repo en GitHub ya tiene commits previos** (poco probable si recién creado): `git push -u origin main --force-with-lease` después de `git pull --rebase origin main` para integrar.

**Si quieres abrir como PR contra una rama de protección** (en lugar de push directo a `main`): cambiar el comando 4 a:

```powershell
git checkout -b sprint-acumulado-2026-04-26
git push -u origin sprint-acumulado-2026-04-26
gh pr create --base main --head sprint-acumulado-2026-04-26 --title "..." --body-file docs/CHANGELOG_b9eaff3.md
```

---

## Sprints incluidos en este commit

| Sprint | Rol | Output principal |
|---|---|---|
| 5 | Cowork autónomo | RAG verificado + sync, advisors Supabase, bucket storage Potencias, inventario Gemini |
| 6 | Cowork autónomo | Unificación Fase 1 lista + scripts Fase 2 cross-proyecto |
| 7 | Cowork autónomo | Fase 1 aplicada, FE refactor 8 archivos, Fase 2 pendiente Juan |
| 8 | Cowork autónomo | Validación + plan Fases 4-5, draft RLS hardening 8 tablas |
| 9 | Cowork autónomo | RUNBOOK.ps1 maestro + RUNBOOK_FLAT.ps1 ejecutable |
| A | Backend paralelo | Coordinación backend Supabase |
| B | Frontend paralelo | ErrorBoundary + telemetría + 3 help docs RAG |
| C | Coordinación paralelo | Prompt agent browser, comunicación equipo |

Cada sprint tiene su propio handoff en `.cowork/outbox/`.
